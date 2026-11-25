import {
  ITEM_TEMPLATES,
  RARITY_META,
  SKILLS,
  distance,
  type MonsterSnapshot,
  type Rarity,
} from '@mmorpg/shared';
import type { GameClient } from '../net/GameClient.js';

export type AnchorRadiusMode = 'short' | 'medium' | 'unlimited';

export interface AutoConfig {
  enabled: boolean;
  anchorMode: AnchorRadiusMode;
  hpThreshold: number;
  mpThreshold: number;
  lootRarities: Set<Rarity>;
  autoRecycleCommon: boolean;
  pauseOnBagFull: boolean;
  enabledSkills: Set<string>;
}

export class AutoBattleController {
  public config: AutoConfig;
  public anchorX = 24;
  public anchorY = 24;
  public currentTargetId: string | null = null;
  public manualOverrideUntil = 0;

  private lastThinkAt = 0;
  private lastPotCheckAt = 0;

  constructor(private client: GameClient) {
    this.config = {
      enabled: false,
      anchorMode: 'medium',
      hpThreshold: 55,
      mpThreshold: 25,
      lootRarities: new Set<Rarity>(['common', 'uncommon', 'rare', 'epic', 'legendary']),
      autoRecycleCommon: false,
      pauseOnBagFull: false,
      enabledSkills: new Set(SKILLS.map((s) => s.id)),
    };
  }

  public toggle(): boolean {
    this.config.enabled = !this.config.enabled;
    if (this.config.enabled) {
      this.anchorX = this.client.localX;
      this.anchorY = this.client.localY;
      this.manualOverrideUntil = 0;
    } else {
      this.currentTargetId = null;
    }
    return this.config.enabled;
  }

  public triggerManualOverride(durationMs = 2400) {
    if (this.config.enabled) {
      this.manualOverrideUntil = Date.now() + durationMs;
    }
  }

  public isManualHolding(): boolean {
    return this.config.enabled && Date.now() < this.manualOverrideUntil;
  }

  public update() {
    if (!this.config.enabled) return;
    const now = Date.now();
    if (now - this.lastThinkAt < 220) return;
    this.lastThinkAt = now;

    const vitals = this.client.vitals;
    if (!vitals) return;

    // 1. Survival Safety Valve (Potions)
    if (now - this.lastPotCheckAt >= 1000) {
      const hpPct = (vitals.hp / Math.max(1, vitals.maxHp)) * 100;
      const mpPct = (vitals.mp / Math.max(1, vitals.maxMp)) * 100;
      if (hpPct < this.config.hpThreshold) {
        this.client.send({ type: 'use_potion', kind: 'hp' });
        this.lastPotCheckAt = now;
      } else if (mpPct < this.config.mpThreshold) {
        this.client.send({ type: 'use_potion', kind: 'mp' });
        this.lastPotCheckAt = now;
      }
    }

    if (this.isManualHolding()) return;

    // Auto-recycle commons if bag is nearly full
    if (this.config.autoRecycleCommon && this.client.inventory.length >= 30) {
      this.client.send({ type: 'recycle', rarities: ['common'] });
    }

    // 2. Auto-Loot Check
    const bagFull = this.client.inventory.length >= 36;
    if (bagFull && this.config.pauseOnBagFull) {
      this.config.enabled = false;
      this.client.onToast?.('Auto pausado: Bolsa cheia!', '#f87171');
      return;
    }

    if (!bagFull) {
      const validDrop = this.client.drops.find((d) => {
        if (d.templateId === 'gold') return true;
        const tpl = ITEM_TEMPLATES[d.templateId];
        if (!tpl) return false;
        return this.config.lootRarities.has(tpl.rarity) && distance({ x: this.client.localX, y: this.client.localY }, d) <= 7;
      });
      if (validDrop) {
        const dist = distance({ x: this.client.localX, y: this.client.localY }, validDrop);
        if (dist <= 1.8) {
          this.client.send({ type: 'pickup', dropId: validDrop.id });
        } else {
          this.client.sendMove(validDrop.x, validDrop.y);
        }
        return;
      }
    }

    // 3. Target Selection within Anchor Radius
    const maxRadius =
      this.config.anchorMode === 'short' ? 4.5 : this.config.anchorMode === 'medium' ? 11 : 99;

    let target: MonsterSnapshot | undefined = this.client.monsters.find((m) => m.id === this.currentTargetId);
    if (!target) {
      let bestDist = Infinity;
      for (const m of this.client.monsters) {
        const dAnchor = distance({ x: this.anchorX, y: this.anchorY }, m);
        if (dAnchor > maxRadius) continue;
        const dPlayer = distance({ x: this.client.localX, y: this.client.localY }, m);
        if (dPlayer < bestDist) {
          bestDist = dPlayer;
          target = m;
        }
      }
      this.currentTargetId = target?.id ?? null;
    }

    if (!target) {
      // Return to anchor if drifted
      if (distance({ x: this.client.localX, y: this.client.localY }, { x: this.anchorX, y: this.anchorY }) > 2.2) {
        this.client.sendMove(this.anchorX, this.anchorY);
      }
      return;
    }

    // 4. Pick highest-priority ready skill for this class
    const classSkills = SKILLS.filter(
      (s) => s.heroClass === this.client.heroClass && this.config.enabledSkills.has(s.id)
    ).reverse(); // Ultimate -> AoE -> Basic

    const readySkill =
      classSkills.find(
        (s) => (this.client.skillCooldowns[s.id] ?? 0) <= now && vitals.mp >= s.mpCost
      ) ?? SKILLS.find((s) => s.heroClass === this.client.heroClass && s.mpCost === 0);

    if (!readySkill) return;

    const distToTarget = distance({ x: this.client.localX, y: this.client.localY }, target);
    if (distToTarget > readySkill.range - 0.15) {
      this.client.sendMove(target.x, target.y);
    } else {
      this.client.sendCast(readySkill.id, target.id, readySkill.cooldownMs);
    }
  }
}

export function getRarityColor(r: Rarity): string {
  return RARITY_META[r].color;
}
