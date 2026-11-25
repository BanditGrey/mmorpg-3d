import { sfx } from '../audio/SoundFX.js';
import { renderEmptySlotIconHtml, renderItemIconHtml } from './ItemIcons.js';
import {
  ACHIEVEMENTS,
  CRAFT_RECIPES,
  ITEM_TEMPLATES,
  MAPS,
  MAP_SIZE,
  MAX_UPGRADE_LEVEL,
  MONSTER_TEMPLATES,
  PARAGON_NODES,
  PARAGON_UNLOCK_LEVEL,
  PASSIVE_DEFS,
  QUEST_TEMPLATES,
  RARITY_META,
  REBIRTH_MIN_LEVEL,
  SAFE_SPAWN,
  SHOP_OFFERS,
  SKILLS,
  getActiveWorldEvent,
  getItemCombatPower,
  getItemStatMult,
  getPowerTier,
  isParagonNodeUnlockable,
  upgradeCost,
  type EquipSlot,
  type HeroClass,
  type MapId,
  type Rarity,
} from '@mmorpg/shared';
import type { AutoBattleController } from '../auto/AutoBattleController.js';
import { HeroPreview3D } from '../engine/HeroPreview3D.js';
import type { World3DView } from '../engine/World3DView.js';
import type { GameClient } from '../net/GameClient.js';

type SheetTab = 'hero' | 'bag' | 'skills' | 'social' | 'menu' | 'chat' | 'auto_cfg' | 'map' | null;

export class HudController {
  private activeSheet: SheetTab = null;
  private bagFilter: 'all' | 'equip' | 'consumable' = 'all';
  private buildTab: 'actives' | 'passives' | 'paragon' = 'actives';
  private menuTab: 'quests' | 'shop' | 'craft' | 'bestiary' | 'rank' | 'ach' | 'arena' | 'settings' = 'quests';
  private selectedEquipSlot: EquipSlot = 'weapon';
  private lastKnownLevel = 0;
  private lastPortraitSig = '';
  private heroPreview = new HeroPreview3D();
  private hudPortrait = new HeroPreview3D();

  private els: Record<string, HTMLElement> = {};

  constructor(
    private root: HTMLElement,
    private client: GameClient,
    private autoCtrl: AutoBattleController,
    private worldView: World3DView
  ) {}

  public mount() {
    this.root.innerHTML = `
      <div id="game-viewport"></div>

      <div class="hud-layer">
        <div class="hud-top">
          <div class="top-row">
            <div class="top-left-cluster">
              <div class="player-card" id="hud-player-card" title="Abrir Herói & Equipamentos [H]" style="cursor:pointer">
                <div class="avatar-badge portrait-frame" id="hud-portrait-wrap">
                  <canvas id="hud-portrait-3d" class="hud-portrait-canvas"></canvas>
                  <span class="portrait-lv-badge" id="hud-avatar">1</span>
                </div>
                <div class="vitals-bars">
                  <div class="player-name-line">
                    <span id="hud-name">Aventureiro</span>
                    <span id="hud-gold" style="color:#fbbf24">0 Ouro</span>
                  </div>
                  <div class="player-power-line">
                    <span id="hud-cp" class="cp-chip">⚔ 0 CP</span>
                    <span id="hud-tier" class="tier-chip">Aventureiro</span>
                  </div>
                  <div class="bar-track bar-with-txt"><div class="bar-fill bar-hp" id="hud-hp-bar" style="width:100%"></div><span class="bar-txt" id="hud-hp-txt"></span></div>
                  <div class="bar-track bar-with-txt"><div class="bar-fill bar-mp" id="hud-mp-bar" style="width:100%"></div><span class="bar-txt" id="hud-mp-txt"></span></div>
                </div>
              </div>
              <div id="hud-party-list" class="party-mini-list"></div>
            </div>

            <div class="quest-pill quest-top-tracker" id="quest-pill">
              <strong id="quest-title">Missão</strong>
              <span id="quest-prog">0/0</span>
            </div>
            <div class="event-pill" id="event-pill" title="Evento Global ativo (alterna a cada 30 min)">✦ Evento</div>
            <div id="buffs-strip" style="display:flex;gap:4px;align-items:center;flex-wrap:wrap"></div>

            <div class="world-pill">
              <div class="radar-wrap" id="btn-open-map" title="Abrir Mapa Mundi [M]">
                <div class="radar-grid"></div>
                <div id="radar-dots" class="radar-dots"></div>
                <div class="radar-self"></div>
                <span class="radar-label" id="hud-map">Eldoria</span>
              </div>
              <div style="display:flex;align-items:center;gap:4px">
                <span class="map-chip" id="hud-ch" style="padding:3px 7px;font-size:10px;color:#60a5fa">CH 1</span>
                <button class="icon-btn-sm" id="btn-pet-hud" title="Alternar Mascote Auto-Loot" style="font-size:10px;padding:0 6px;width:auto">Pet OFF</button>
                <button class="icon-btn-sm" id="btn-dimmer" title="Economia de Bateria">🌙</button>
                <button class="icon-btn-sm" id="btn-cfg-top" title="Configurações">⚙</button>
              </div>
            </div>
          </div>

          <div class="target-frame" id="target-frame">
            <div class="target-header">
              <span id="target-name">Alvo</span>
              <span id="target-hp-txt">0/0</span>
            </div>
            <div class="bar-track"><div class="bar-fill bar-hp" id="target-hp-bar" style="width:100%"></div></div>
          </div>

          <div class="boss-bar-wrap" id="boss-bar" style="display:none">
            <div class="boss-bar-header">
              <span id="boss-bar-name">CHEFE</span>
              <span id="boss-bar-hp-txt">0/0</span>
            </div>
            <div class="bar-track boss-track"><div class="bar-fill boss-fill" id="boss-bar-fill" style="width:100%"></div></div>
          </div>

          <div class="wave-banner" id="wave-banner" style="display:none"></div>
        </div>

        <div class="hud-bottom">
          <div class="info-strip">
            <div class="chat-ticker" id="chat-ticker">Toque para abrir o chat...</div>
          </div>

          <div class="arpg-dock" id="action-deck">
            <div class="dock-wing dock-left">
              <div class="dock-mini-row">
                <button class="nav-btn nav-mini" data-sheet="hero">[H] Herói<span class="red-dot" id="dot-hero"></span></button>
                <button class="nav-btn nav-mini" data-sheet="bag">[B] Bolsa<span class="red-dot" id="dot-bag"></span></button>
                <button class="nav-btn nav-mini" data-sheet="skills">[K] Build</button>
                <button class="nav-btn nav-mini" data-sheet="map">[M] Mapa</button>
              </div>
              <div id="skill-slots-left" class="skill-group"></div>
            </div>

            <div class="vital-orb" title="Vida (Esquerda) | Mana (Direita)">
              <div class="orb-half orb-left"><div class="orb-fill-hp" id="orb-hp-fill" style="height:100%"></div></div>
              <div class="orb-half orb-right"><div class="orb-fill-mp" id="orb-mp-fill" style="height:100%"></div></div>
              <div class="orb-divider"></div>
              <div class="orb-readout">
                <span id="orb-hp-num">240</span>
                <span class="orb-sep">|</span>
                <span id="orb-mp-num">90</span>
              </div>
            </div>

            <div class="dock-wing dock-right">
              <div class="dock-mini-row">
                <button class="auto-btn auto-mini" id="btn-auto">AUTO <span id="auto-sub">OFF</span></button>
                <button class="icon-btn-sm" id="btn-auto-gear" title="Configurar Auto" style="height:26px;min-width:26px;font-size:11px">⚙</button>
                <button class="nav-btn nav-mini" data-sheet="social">Social</button>
                <button class="nav-btn nav-mini" data-sheet="menu">Menu<span class="red-dot" id="dot-menu"></span></button>
              </div>
              <div class="skill-group">
                <div id="skill-slots-right" class="skill-group"></div>
                <button class="skill-btn pot-btn" id="btn-pot-hp" title="Poção HP [Q]">
                  <span style="color:#fca5a5">HP</span>
                  <span id="pot-hp-count" style="font-size:9px">0</span>
                </button>
                <button class="skill-btn pot-btn" id="btn-pot-mp" title="Poção MP [E]">
                  <span style="color:#93c5fd">MP</span>
                  <span id="pot-mp-count" style="font-size:9px">0</span>
                </button>
              </div>
            </div>
          </div>

          <div class="xp-ribbon">
            <div class="bar-fill bar-xp" id="hud-xp-bar" style="width:0%"></div>
            <span class="xp-ribbon-txt" id="hud-xp-txt">Nv 1 • 0.0%</span>
          </div>
        </div>
      </div>

      <div class="sheet-backdrop" id="sheet-backdrop">
        <div class="bottom-sheet" id="bottom-sheet"></div>
      </div>
      <div class="item-tooltip" id="item-tooltip"></div>
      <div class="toast-stack" id="toast-stack"></div>

      <div class="dimmer-overlay" id="dimmer-overlay">
        <div style="font-size:20px;font-weight:700;color:#fbbf24">Modo Economia Ativo</div>
        <div style="font-size:13px;color:#94a3b8">Auto-Battle continua rodando com FPS reduzido.</div>
        <button class="btn-primary" id="btn-undim">Desbloquear Tela</button>
      </div>

      <div class="login-overlay" id="login-overlay">
        <div class="login-card">
          <h2 style="margin:0;color:#fbbf24;text-align:center;font-family:var(--font-display);letter-spacing:1px">Eldoria Online</h2>
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center">MMORPG 3D • Widescreen PC & Mobile</p>
          <input class="input-field" id="login-user" placeholder="Conta (Usuário)" value="kael" maxlength="20" />
          <input class="input-field" id="login-pass" type="password" placeholder="Senha" value="1234" maxlength="32" />
          <input class="input-field" id="login-name" placeholder="Nome do Herói" value="Kael" maxlength="16" />
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px" id="class-picker">
            <button class="btn-primary cls-pick" data-cls="warrior" style="padding:9px 4px;font-size:11px">Guerreiro</button>
            <button class="btn-secondary cls-pick" data-cls="mage" style="padding:9px 4px;font-size:11px">Mago</button>
            <button class="btn-secondary cls-pick" data-cls="archer" style="padding:9px 4px;font-size:11px">Arqueiro</button>
            <button class="btn-secondary cls-pick" data-cls="assassin" style="padding:9px 4px;font-size:11px">Assassino</button>
            <button class="btn-secondary cls-pick" data-cls="paladin" style="padding:9px 4px;font-size:11px;grid-column:span 2">Paladino</button>
          </div>
          <button class="btn-primary" id="btn-enter" style="padding:12px;font-size:15px">Entrar / Criar Conta</button>
          <a href="/admin" target="_blank" style="text-align:center;font-size:12px;color:#94a3b8;text-decoration:none">Painel Administrativo (/admin)</a>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  public getViewportEl(): HTMLElement {
    return this.root.querySelector('#game-viewport')!;
  }

  public showToast(text: string, color = '#fbbf24') {
    const stack = this.root.querySelector('#toast-stack')!;
    const div = document.createElement('div');
    div.className = 'toast-item';
    div.style.color = color;
    div.textContent = text;
    stack.appendChild(div);
    setTimeout(() => div.remove(), 2650);
  }

  private bindEvents() {
    let chosenClass: HeroClass = 'warrior';
    const classBtns = this.root.querySelectorAll('.cls-pick');
    classBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        chosenClass = (btn as HTMLElement).dataset.cls as HeroClass;
        classBtns.forEach((b) => (b.className = b === btn ? 'btn-primary cls-pick' : 'btn-secondary cls-pick'));
      });
    });

    (this.root.querySelector('#btn-enter') as HTMLButtonElement).onclick = () => {
      const user = (this.root.querySelector('#login-user') as HTMLInputElement).value.trim() || 'kael';
      const pass = (this.root.querySelector('#login-pass') as HTMLInputElement).value || '1234';
      const name = (this.root.querySelector('#login-name') as HTMLInputElement).value.trim() || 'Kael';
      this.client.connect(name, chosenClass, user, pass);
    };

    this.client.onWelcome = () => {
      this.root.querySelector('#login-overlay')?.classList.add('hidden');
      this.renderSkillBar();
      this.refresh();
    };

    this.client.onMapChanged = (mapId) => {
      this.worldView.loadMap(mapId);
      this.refresh();
    };

    this.client.onUpdate = () => this.refresh();
    this.client.onToast = (t, c) => this.showToast(t, c);

    // Auto button
    (this.root.querySelector('#btn-auto') as HTMLButtonElement).onclick = () => {
      const active = this.autoCtrl.toggle();
      this.showToast(active ? 'Botão AUTO ativado!' : 'Botão AUTO desligado', active ? '#4ade80' : '#94a3b8');
      this.refreshAutoButton();
    };

    (this.root.querySelector('#btn-auto-gear') as HTMLButtonElement).onclick = () => {
      this.openSheet('auto_cfg');
    };

    (this.root.querySelector('#btn-pot-hp') as HTMLButtonElement).onclick = () => {
      sfx.click();
      this.client.send({ type: 'use_potion', kind: 'hp' });
    };
    (this.root.querySelector('#btn-pot-mp') as HTMLButtonElement).onclick = () => {
      sfx.click();
      this.client.send({ type: 'use_potion', kind: 'mp' });
    };

    // Nav tabs
    this.root.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = (btn as HTMLElement).dataset.sheet as SheetTab;
        this.openSheet(this.activeSheet === tab ? null : tab);
      });
    });

    (this.root.querySelector('#chat-ticker') as HTMLElement).onclick = () => this.openSheet('chat');
    (this.root.querySelector('#btn-cfg-top') as HTMLElement).onclick = () => this.openSheet('menu');
    (this.root.querySelector('#btn-open-map') as HTMLElement).onclick = () => this.openSheet('map');

    // Quest pill tap -> claim if done, else auto-path to quest zone
    (this.root.querySelector('#quest-pill') as HTMLElement).onclick = () => {
      const activeQ = this.getActiveQuest();
      if (!activeQ) return;
      if (activeQ.prog.progress >= activeQ.tpl.requiredCount) {
        this.client.send({ type: 'quest_claim', questId: activeQ.tpl.id });
      } else {
        this.autoCtrl.anchorX = activeQ.tpl.zoneCenter.x;
        this.autoCtrl.anchorY = activeQ.tpl.zoneCenter.y;
        this.client.sendMove(activeQ.tpl.zoneCenter.x, activeQ.tpl.zoneCenter.y);
        if (!this.autoCtrl.config.enabled) this.autoCtrl.toggle();
        this.showToast(`Indo para: ${activeQ.tpl.title}`, '#38bdf8');
        this.refreshAutoButton();
      }
    };

    // Battery dimmer
    (this.root.querySelector('#hud-player-card') as HTMLElement).onclick = () => {
      sfx.click();
      this.openSheet('hero');
    };
    (this.root.querySelector('#btn-pet-hud') as HTMLElement).onclick = () => {
      sfx.click();
      this.client.send({ type: 'toggle_pet' });
    };
    (this.root.querySelector('#btn-dimmer') as HTMLElement).onclick = () => {
      this.worldView.setBatterySaver(true);
      this.root.querySelector('#dimmer-overlay')?.classList.add('active');
    };
    (this.root.querySelector('#btn-undim') as HTMLElement).onclick = () => {
      this.worldView.setBatterySaver(false);
      this.root.querySelector('#dimmer-overlay')?.classList.remove('active');
    };

    // Close sheet on backdrop click
    (this.root.querySelector('#sheet-backdrop') as HTMLElement).onclick = (e) => {
      if (e.target === this.root.querySelector('#sheet-backdrop')) {
        this.openSheet(null);
      }
    };

    setInterval(() => this.refreshCooldowns(), 120);

    // PC Keyboard Shortcuts (1-6 skills, Q potion, A auto, M map, H hero, B bag, K skills, Esc close)
    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'Escape') {
        this.openSheet(null);
      } else if (e.key >= '1' && e.key <= '6') {
        const idx = Number(e.key) - 1;
        const btns = this.root.querySelectorAll('#skill-slots-left .skill-btn, #skill-slots-right .skill-btn');
        (btns[idx] as HTMLButtonElement | undefined)?.click();
      } else if (e.key.toLowerCase() === 'q') {
        (this.root.querySelector('#btn-pot-hp') as HTMLButtonElement)?.click();
      } else if (e.key.toLowerCase() === 'e') {
        (this.root.querySelector('#btn-pot-mp') as HTMLButtonElement)?.click();
      } else if (e.key.toLowerCase() === 'a') {
        (this.root.querySelector('#btn-auto') as HTMLButtonElement)?.click();
      } else if (e.key.toLowerCase() === 'm') {
        this.openSheet(this.activeSheet === 'map' ? null : 'map');
      } else if (e.key.toLowerCase() === 'h') {
        this.openSheet(this.activeSheet === 'hero' ? null : 'hero');
      } else if (e.key.toLowerCase() === 'b') {
        this.openSheet(this.activeSheet === 'bag' ? null : 'bag');
      } else if (e.key.toLowerCase() === 'k') {
        this.openSheet(this.activeSheet === 'skills' ? null : 'skills');
      } else if (e.key.toLowerCase() === 'l') {
        this.menuTab = 'rank';
        this.client.send({ type: 'request_leaderboard' });
        this.openSheet(this.activeSheet === 'menu' ? null : 'menu');
      } else if (e.key.toLowerCase() === 'n') {
        this.client.send({ type: 'toggle_pet' });
      }
    });
  }

  private renderSkillBar() {
    const left = this.root.querySelector('#skill-slots-left')!;
    const right = this.root.querySelector('#skill-slots-right')!;
    const classSkills = SKILLS.filter((s) => s.heroClass === this.client.heroClass);
    const makeBtn = (s: (typeof SKILLS)[number], idx: number) => `
      <button class="skill-btn" data-skill="${s.id}" style="border-color:${s.color}" title="${s.name} [${idx + 1}]">
        <span class="sk-key">${idx + 1}</span>
        <span style="max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.name.split(' ')[0]}</span>
        <span style="font-size:8px;color:#94a3b8">${s.mpCost > 0 ? s.mpCost + 'MP' : 'Livre'}</span>
        <div class="cd-overlay">0s</div>
      </button>`;

    left.innerHTML = classSkills.slice(0, 3).map((s, i) => makeBtn(s, i)).join('');
    right.innerHTML = classSkills.slice(3, 6).map((s, i) => makeBtn(s, i + 3)).join('');

    this.root.querySelectorAll('#skill-slots-left .skill-btn, #skill-slots-right .skill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sid = (btn as HTMLElement).dataset.skill!;
        const skill = SKILLS.find((s) => s.id === sid)!;
        const targetId = this.worldView.selectedMonsterId ?? this.autoCtrl.currentTargetId ?? undefined;
        this.client.sendCast(sid, targetId, skill.cooldownMs);
      });
      const tip = this.root.querySelector('#item-tooltip') as HTMLElement | null;
      btn.addEventListener('pointerenter', (ev) => {
        const sid = (btn as HTMLElement).dataset.skill!;
        const s = SKILLS.find((sk) => sk.id === sid);
        const v = this.client.vitals;
        if (!tip || !s) return;
        const cdr = v?.advStats?.cdr ?? 0;
        const effCd = ((s.cooldownMs * (1 - cdr)) / 1000).toFixed(1);
        const estDmg = v ? Math.round(v.atk * s.damageMult) : 0;
        tip.innerHTML = `
          <div style="font-weight:700;color:${s.color}">${s.name}</div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px">${s.mpCost > 0 ? `${s.mpCost} MP` : 'Sem custo'} • Recarga ${effCd}s${s.aoeRadius > 0 ? ` • Área ${s.aoeRadius}m` : ''}</div>
          ${estDmg > 0 ? `<div style="font-size:11px;color:#fbbf24">Dano estimado: ~${estDmg} (${Math.round(s.damageMult * 100)}% ATQ)</div>` : ''}
          <div style="font-size:10px;color:#cbd5e1;margin-top:2px">${s.description}</div>
        `;
        tip.style.display = 'block';
        const pe = ev as PointerEvent;
        tip.style.left = `${Math.min(window.innerWidth - 220, Math.max(8, pe.clientX - 90))}px`;
        tip.style.top = `${Math.max(8, pe.clientY - 82)}px`;
      });
      btn.addEventListener('pointerleave', () => {
        if (tip) tip.style.display = 'none';
      });
    });
  }

  private refreshCooldowns() {
    const now = Date.now();
    this.root.querySelectorAll('#skill-slots-left .skill-btn, #skill-slots-right .skill-btn').forEach((btn) => {
      const sid = (btn as HTMLElement).dataset.skill!;
      const readyAt = this.client.skillCooldowns[sid] ?? 0;
      const rem = readyAt - now;
      const ov = btn.querySelector('.cd-overlay') as HTMLElement;
      if (rem > 0) {
        btn.classList.add('on-cd');
        ov.textContent = `${(rem / 1000).toFixed(1)}s`;
      } else {
        btn.classList.remove('on-cd');
      }
    });
    this.refreshAutoButton();
  }

  private refreshAutoButton() {
    const btn = this.root.querySelector('#btn-auto');
    const sub = this.root.querySelector('#auto-sub');
    if (!btn || !sub) return;
    btn.classList.toggle('active', this.autoCtrl.config.enabled);
    btn.classList.toggle('manual-hold', this.autoCtrl.isManualHolding());
    sub.textContent = this.autoCtrl.isManualHolding()
      ? 'MANUAL'
      : this.autoCtrl.config.enabled
      ? 'ON'
      : 'OFF';
  }

  public refresh() {
    const v = this.client.vitals;
    if (!v) return;

    if (this.lastKnownLevel > 0 && v.level > this.lastKnownLevel) {
      this.client.skillEffects.push({
        x: this.client.localX,
        y: this.client.localY,
        color: 0xfbbf24,
        radius: 50,
        createdAt: Date.now(),
      });
    }
    this.lastKnownLevel = v.level;

    const petHudBtn = this.root.querySelector('#btn-pet-hud') as HTMLElement | null;
    if (petHudBtn) {
      petHudBtn.textContent = v.petActive ? 'Pet ON' : 'Pet OFF';
      petHudBtn.style.color = v.petActive ? '#4ade80' : '#94a3b8';
      petHudBtn.style.borderColor = v.petActive ? '#4ade80' : '';
    }
    const evPill = this.root.querySelector('#event-pill') as HTMLElement | null;
    if (evPill) {
      const ev = getActiveWorldEvent();
      evPill.textContent = `✦ ${ev.name}`;
      evPill.title = `${ev.name}: ${ev.desc}`;
    }
    const buffsStrip = this.root.querySelector('#buffs-strip') as HTMLElement | null;
    if (buffsStrip) {
      const now = Date.now();
      const activeBuffs = (v.buffs ?? []).filter((b) => b.expiresAt > now);
      buffsStrip.innerHTML = activeBuffs
        .map((b) => {
          const sec = Math.max(1, Math.ceil((b.expiresAt - now) / 1000));
          const m = Math.floor(sec / 60);
          const s = sec % 60;
          return `<span class="event-pill" style="border-color:#c084fc;color:#e9d5ff">⚗ ${b.name} ${m}:${String(s).padStart(2, '0')}</span>`;
        })
        .join('');
    }

    const tier = getPowerTier(v.cp);
    const portraitCanvas = this.root.querySelector('#hud-portrait-3d') as HTMLCanvasElement | null;
    if (portraitCanvas) {
      this.hudPortrait.attach(portraitCanvas, this.client.heroClass, 'portrait');
      const helm = this.client.equipment.helm;
      const helmTpl = helm ? ITEM_TEMPLATES[helm.templateId] : null;
      const helmHex = helmTpl ? Number(RARITY_META[helmTpl.rarity].color.replace('#', '0x')) : null;
      const sig = `${this.client.heroClass}:${helmHex ?? 'none'}:${tier.auraHex}`;
      if (sig !== this.lastPortraitSig) {
        this.lastPortraitSig = sig;
        this.hudPortrait.setPortraitVisuals(helmHex, tier.auraHex);
      }
    }
    const pWrap = this.root.querySelector('#hud-portrait-wrap') as HTMLElement | null;
    if (pWrap) {
      pWrap.style.borderColor = tier.color;
      pWrap.style.boxShadow = `0 0 10px ${tier.color}55, inset 0 0 8px rgba(0,0,0,0.85)`;
    }

    (this.root.querySelector('#hud-avatar') as HTMLElement).textContent = `${v.level}`;
    (this.root.querySelector('#hud-name') as HTMLElement).textContent =
      `${v.activeTitle ? `[${v.activeTitle}] ` : ''}${this.client.getSelfPlayer()?.name ?? 'Herói'}`;
    (this.root.querySelector('#hud-gold') as HTMLElement).textContent = `${v.gold}g`;
    const cpEl = this.root.querySelector('#hud-cp') as HTMLElement | null;
    if (cpEl) cpEl.textContent = `⚔ ${v.cp} CP`;
    const tierEl = this.root.querySelector('#hud-tier') as HTMLElement | null;
    if (tierEl) {
      tierEl.textContent = `${tier.title}${v.rebirths ? ` • R${v.rebirths}` : ''}`;
      tierEl.style.color = tier.color;
    }
    (this.root.querySelector('#hud-map') as HTMLElement).textContent = this.client.mapName;
    const hpPct = Math.max(0, Math.min(100, (v.hp / Math.max(1, v.maxHp)) * 100));
    const mpPct = Math.max(0, Math.min(100, (v.mp / Math.max(1, v.maxMp)) * 100));
    const xpPct = Math.max(0, Math.min(100, (v.xp / Math.max(1, v.xpNext)) * 100));
    (this.root.querySelector('#hud-hp-bar') as HTMLElement).style.width = `${hpPct}%`;
    (this.root.querySelector('#hud-mp-bar') as HTMLElement).style.width = `${mpPct}%`;
    const hpTxt = this.root.querySelector('#hud-hp-txt') as HTMLElement | null;
    if (hpTxt) hpTxt.textContent = `${v.hp}/${v.maxHp}`;
    const mpTxt = this.root.querySelector('#hud-mp-txt') as HTMLElement | null;
    if (mpTxt) mpTxt.textContent = `${v.mp}/${v.maxMp}`;
    (this.root.querySelector('#hud-xp-bar') as HTMLElement).style.width = `${xpPct}%`;
    (this.root.querySelector('#hud-xp-txt') as HTMLElement).textContent = `Nv ${v.level}${v.rebirths ? ` • R${v.rebirths}` : ''} • ${xpPct.toFixed(1)}%`;

    const orbHp = this.root.querySelector('#orb-hp-fill') as HTMLElement | null;
    const orbMp = this.root.querySelector('#orb-mp-fill') as HTMLElement | null;
    if (orbHp) orbHp.style.height = `${hpPct}%`;
    if (orbMp) orbMp.style.height = `${mpPct}%`;
    const orbHpNum = this.root.querySelector('#orb-hp-num');
    const orbMpNum = this.root.querySelector('#orb-mp-num');
    if (orbHpNum) orbHpNum.textContent = `${v.hp}`;
    if (orbMpNum) orbMpNum.textContent = `${v.mp}`;

    const hpPots = this.client.inventory
      .filter((i) => i.templateId.startsWith('pot_hp_'))
      .reduce((acc, i) => acc + i.quantity, 0);
    const mpPots = this.client.inventory
      .filter((i) => i.templateId.startsWith('pot_mp_'))
      .reduce((acc, i) => acc + i.quantity, 0);
    (this.root.querySelector('#pot-hp-count') as HTMLElement).textContent = `${hpPots}`;
    const mpPotEl = this.root.querySelector('#pot-mp-count');
    if (mpPotEl) mpPotEl.textContent = `${mpPots}`;

    // Circular Radar Minimap dots
    const radarDots = this.root.querySelector('#radar-dots');
    if (radarDots) {
      const range = 22;
      radarDots.innerHTML = this.client.monsters
        .slice(0, 24)
        .map((m) => {
          const dx = (m.x - this.client.localX) / range;
          const dy = (m.y - this.client.localY) / range;
          if (dx * dx + dy * dy > 0.92) return '';
          const lx = 50 + dx * 45;
          const ly = 50 + dy * 45;
          return `<span class="radar-dot ${m.isBoss ? 'boss' : 'mob'}" style="left:${lx}%;top:${ly}%"></span>`;
        })
        .join('');
    }

    // Party mini list
    const partyEl = this.root.querySelector('#hud-party-list');
    if (partyEl) {
      const members = this.client.party?.members ?? [];
      partyEl.innerHTML = members
        .filter((m) => m.id !== this.client.playerId)
        .slice(0, 3)
        .map(
          (m) => `<div class="party-mini-row">
            <span>${m.name} Lv.${m.level}</span>
            <div class="bar-track" style="height:4px;margin-top:2px"><div class="bar-fill bar-hp" style="width:${(m.hp / Math.max(1, m.maxHp)) * 100}%"></div></div>
          </div>`
        )
        .join('');
    }

    // Target frame
    const targetId = this.worldView.selectedMonsterId ?? this.autoCtrl.currentTargetId;
    const mob = this.client.monsters.find((m) => m.id === targetId);
    const tf = this.root.querySelector('#target-frame') as HTMLElement;
    if (mob) {
      tf.classList.add('visible');
      (this.root.querySelector('#target-name') as HTMLElement).textContent = `${mob.name} Lv.${mob.level}`;
      (this.root.querySelector('#target-hp-txt') as HTMLElement).textContent = `${mob.hp}/${mob.maxHp}`;
      (this.root.querySelector('#target-hp-bar') as HTMLElement).style.width = `${(mob.hp / mob.maxHp) * 100}%`;
    } else {
      tf.classList.remove('visible');
    }

    // Boss Bar (top-center when any boss is nearby)
    const bossBar = this.root.querySelector('#boss-bar') as HTMLElement | null;
    if (bossBar) {
      const boss = this.client.monsters.find((m) => m.hp > 0 && MONSTER_TEMPLATES[m.templateId]?.isBoss);
      if (boss) {
        bossBar.style.display = 'block';
        (this.root.querySelector('#boss-bar-name') as HTMLElement).textContent = `☠ ${boss.name} • Lv.${boss.level}`;
        (this.root.querySelector('#boss-bar-hp-txt') as HTMLElement).textContent = `${boss.hp}/${boss.maxHp} (${Math.round((boss.hp / Math.max(1, boss.maxHp)) * 100)}%)`;
        (this.root.querySelector('#boss-bar-fill') as HTMLElement).style.width = `${(boss.hp / Math.max(1, boss.maxHp)) * 100}%`;
      } else {
        bossBar.style.display = 'none';
      }
    }

    // Wave Dungeon Banner
    const waveBanner = this.root.querySelector('#wave-banner') as HTMLElement | null;
    if (waveBanner) {
      const ws = this.client.waveState;
      if (ws?.active) {
        waveBanner.style.display = 'block';
        waveBanner.textContent = `⚔ Masmorra: Onda ${ws.wave}/${ws.maxWaves} • Restam ${ws.remaining}`;
      } else {
        waveBanner.style.display = 'none';
      }
    }

    // Chat ticker
    const lastChat = this.client.chatLog[this.client.chatLog.length - 1];
    if (lastChat) {
      (this.root.querySelector('#chat-ticker') as HTMLElement).textContent =
        `[${lastChat.channel}] ${lastChat.senderName}: ${lastChat.text}`;
    }

    // Quest pill
    const activeQ = this.getActiveQuest();
    if (activeQ) {
      const done = activeQ.prog.progress >= activeQ.tpl.requiredCount;
      (this.root.querySelector('#quest-title') as HTMLElement).textContent = done
        ? `✓ ${activeQ.tpl.title}`
        : activeQ.tpl.title;
      (this.root.querySelector('#quest-prog') as HTMLElement).textContent = done
        ? 'Toque p/ Resgatar!'
        : `${activeQ.prog.progress}/${activeQ.tpl.requiredCount} (Ir)`;
    }

    // Red-Dot hierarchy (only real progression!)
    this.root.querySelector('#dot-hero')?.classList.toggle('visible', v.statPoints > 0);
    this.root.querySelector('#dot-bag')?.classList.toggle('visible', this.client.inventory.length >= 30);
    this.root.querySelector('#dot-menu')?.classList.toggle(
      'visible',
      Boolean(activeQ && activeQ.prog.progress >= activeQ.tpl.requiredCount)
    );

    if (this.activeSheet) this.renderSheetContent();
  }

  private getActiveQuest() {
    for (const tpl of QUEST_TEMPLATES) {
      const prog = this.client.quests.find((q) => q.questId === tpl.id);
      if (prog && !prog.claimed) return { tpl, prog };
    }
    return null;
  }

  private openSheet(tab: SheetTab) {
    const resolved = tab === 'bag' ? 'hero' : tab;
    this.activeSheet = resolved;
    const bd = this.root.querySelector('#sheet-backdrop') as HTMLElement;
    const sheet = this.root.querySelector('#bottom-sheet') as HTMLElement;
    bd.classList.toggle('open', resolved !== null);
    sheet.classList.toggle('wide-sheet', resolved === 'hero');
    if (resolved !== 'hero') this.heroPreview.dispose();
    if (resolved) this.renderSheetContent();
  }

  private renderSheetContent() {
    const sheet = this.root.querySelector('#bottom-sheet') as HTMLElement;
    const v = this.client.vitals;
    if (!v) return;

    const closeBtn = `<button class="btn-secondary" id="close-sheet">Fechar</button>`;

    if (this.activeSheet === 'hero') {
      const slotNamesPt: Record<EquipSlot, string> = {
        helm: 'Elmo',
        armor: 'Armadura',
        cloak: 'Capa',
        gloves: 'Luvas',
        boots: 'Botas',
        weapon: 'Arma',
        amulet: 'Amuleto',
        ring: 'Anel',
        ring2: 'Anel',
        mount: 'Montaria',
      };
      const leftSlots: EquipSlot[] = ['helm', 'armor', 'cloak', 'gloves', 'boots'];
      const rightSlots: EquipSlot[] = ['weapon', 'amulet', 'ring', 'ring2', 'mount'];
      const renderSlot = (slotId: EquipSlot) => {
        const eq = this.client.equipment[slotId];
        const tpl = eq ? ITEM_TEMPLATES[eq.templateId] : null;
        const upLv = eq?.upgradeLevel ?? 0;
        const cost = upgradeCost(upLv);
        const sel = this.selectedEquipSlot === slotId ? 'selected-slot' : '';
        return `<div class="equip-slot-square tip-source ${eq ? 'filled' : ''} ${sel}" data-slot="${slotId}" data-slot-label="${slotNamesPt[slotId]}" data-tpl="${eq ? eq.templateId : ''}" data-up="${upLv}" data-affixes="${encodeURIComponent(JSON.stringify(eq?.affixes ?? {}))}" style="border-color:${tpl ? RARITY_META[tpl.rarity].color : 'rgba(140,102,42,0.45)'}">
          ${eq ? renderItemIconHtml(eq.templateId, upLv, 34) : renderEmptySlotIconHtml(slotId, 28)}
          ${
            eq && upLv < MAX_UPGRADE_LEVEL
              ? `<button class="forge-mini-btn forge-btn" data-slot="${slotId}" title="Forjar +${upLv + 1} (${cost.gold}g / ${cost.dust}p)">+${upLv + 1}</button>`
              : ''
          }
        </div>`;
      };

      const items = this.client.inventory.filter((i) => {
        const tpl = ITEM_TEMPLATES[i.templateId];
        if (!tpl) return false;
        if (this.bagFilter === 'equip') return tpl.kind === 'equip';
        if (this.bagFilter === 'consumable') return tpl.kind !== 'equip';
        return true;
      });

      const tier = getPowerTier(v.cp);
      const adv = v.advStats;
      const statsHtml = `
        <div class="card-box">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-weight:700;color:#f3d37a">Status do Herói</span>
            <span style="font-size:10px;font-weight:700;color:${tier.color}">${tier.title}</span>
          </div>
          <div class="stat-summary-grid">
            <span>Nível: <strong>${v.level}</strong></span>
            <span>CP: <strong style="color:${tier.color}">${v.cp}</strong></span>
            <span>HP: <strong style="color:#fca5a5">${v.maxHp}</strong></span>
            <span>MP: <strong style="color:#93c5fd">${v.maxMp}</strong></span>
            <span>ATK: <strong>${v.atk}</strong></span>
            <span>DEF: <strong>${v.def}</strong></span>
          </div>
        </div>
        ${
          adv
            ? `<div class="card-box">
                <div style="font-weight:700;color:#60a5fa;margin-bottom:4px;font-size:11px">Atributos Avançados</div>
                <div class="stat-summary-grid" style="font-size:10px">
                  <span class="stat-tip" data-stiptitle="Chance Crítica" data-stipdesc="Probabilidade de causar golpe crítico (base 14% + 0.5% por AGI + equipamentos/passivas).">Crítico: <strong>${(adv.critChance * 100).toFixed(1)}%</strong></span>
                  <span class="stat-tip" data-stiptitle="Dano Crítico" data-stipdesc="Multiplicador de dano ao acertar um golpe crítico (base 165% + bônus de equipamentos e build).">Dano Crít: <strong>${Math.round(adv.critDmg * 100)}%</strong></span>
                  <span class="stat-tip" data-stiptitle="Roubo de Vida (Vida/Golpe)" data-stipdesc="Percentual do dano causado que regenera seu HP instantaneamente a cada ataque.">Vida/Golpe: <strong>${(adv.lifesteal * 100).toFixed(1)}%</strong></span>
                  <span class="stat-tip" data-stiptitle="Redução de Recarga (CDR)" data-stipdesc="Reduz o tempo de espera (cooldown) de todas as habilidades ativas (máximo de -55%).">Recarga: <strong>-${Math.round(adv.cdr * 100)}%</strong></span>
                  <span class="stat-tip" data-stiptitle="Dano contra Chefes" data-stipdesc="Dano bônus multiplicativo aplicado contra Chefes e World Bosses.">vs Chefes: <strong>+${Math.round(adv.bossDmg * 100)}%</strong></span>
                  <span class="stat-tip" data-stiptitle="Velocidade de Movimento" data-stipdesc="Aumenta sua velocidade de deslocamento pelo mapa (montarias e botas concedem grandes bônus).">Velocidade: <strong>+${Math.round(adv.speedBonus * 100)}%</strong></span>
                  <span class="stat-tip" data-stiptitle="Espinhos (Reflexão)" data-stipdesc="Reflete parte do dano recebido de volta para o atacante em combate.">Espinhos: <strong>${Math.round(adv.thornsPct * 100)}%</strong></span>
                  <span class="stat-tip" data-stiptitle="Bônus de XP / Ouro" data-stipdesc="Aumenta a Experiência e o Ouro ganhos ao derrotar monstros e chefes.">Bônus XP/Ouro: <strong>+${Math.round(adv.xpBonus * 100)}% / +${Math.round(adv.goldBonus * 100)}%</strong></span>
                </div>
              </div>`
            : ''
        }
        <div class="card-box">
          <div style="margin-bottom:6px;font-size:11px">Pontos: <strong style="color:#fbbf24">${v.statPoints}</strong></div>
          <div class="grid-2">
            ${(
              [
                {
                  key: 'str',
                  title: 'STR (Força)',
                  desc: `Aumenta o Ataque Físico (+3 ATQ por ponto). Bônus atual: +${v.stats.str * 3} ATQ.`,
                },
                {
                  key: 'agi',
                  title: 'AGI (Agilidade)',
                  desc: `Aumenta Chance Crítica (+0.5% por ponto) e Defesa (+1 DEF por ponto). Bônus atual: +${(v.stats.agi * 0.5).toFixed(1)}% Crít, +${v.stats.agi} DEF.`,
                },
                {
                  key: 'vit',
                  title: 'VIT (Vitalidade)',
                  desc: `Aumenta HP Máximo (+14 HP por ponto) e Defesa (+1.5 DEF por ponto). Bônus atual: +${v.stats.vit * 14} HP, +${Math.floor(v.stats.vit * 1.5)} DEF.`,
                },
                {
                  key: 'int',
                  title: 'INT (Inteligência)',
                  desc: `Aumenta MP Máximo (+10 MP por ponto)${this.client.heroClass === 'mage' ? ' e Ataque Mágico (+3 ATQ por ponto para Mago)' : ''}. Bônus atual: +${v.stats.int * 10} MP${this.client.heroClass === 'mage' ? `, +${v.stats.int * 3} ATQ` : ''}.`,
                },
              ] as const
            )
              .map(
                (st) => `<div style="display:flex;justify-content:space-between;align-items:center">
                  <span class="stat-tip" data-stiptitle="${st.title}" data-stipdesc="${st.desc}">${st.key.toUpperCase()}: <strong>${v.stats[st.key]}</strong></span>
                  <button class="btn-secondary alloc-btn" data-stat="${st.key}" ${v.statPoints <= 0 ? 'disabled' : ''}>+</button>
                </div>`
              )
              .join('')}
          </div>
        </div>
        <div class="card-box" style="display:flex;justify-content:space-between;align-items:center;gap:6px">
          <div>
            <div style="font-weight:700;color:#f43f5e;font-size:11px">Ascensão #${v.rebirths ?? 0}</div>
            <div style="font-size:10px;color:#cbd5e1">+${(v.rebirths ?? 0) * 15}% Atributos</div>
          </div>
          <button class="btn-primary" id="btn-rebirth" style="padding:5px 8px;font-size:10px" ${v.level < REBIRTH_MIN_LEVEL ? 'disabled' : ''}>
            ${v.level >= REBIRTH_MIN_LEVEL ? 'Ascender!' : `Lv.${REBIRTH_MIN_LEVEL}`}
          </button>
        </div>`;

      const totalSlots = 36;
      const slotsHtml = Array.from({ length: totalSlots }, (_, idx) => {
        const i = items[idx];
        if (!i) {
          return `<div class="bag-slot"></div>`;
        }
        const tpl = ITEM_TEMPLATES[i.templateId];
        const up = i.upgradeLevel ?? 0;
        const rarColor = RARITY_META[tpl.rarity].color;
        let isUpgrade = false;
        if (tpl.kind === 'equip' && tpl.slot) {
          const itemCp = getItemCombatPower(tpl, up, (i.affixes ?? {}) as Record<string, number>);
          const eq = this.client.equipment[tpl.slot];
          const eqTpl = eq ? ITEM_TEMPLATES[eq.templateId] : null;
          const eqCp = eq && eqTpl ? getItemCombatPower(eqTpl, eq.upgradeLevel ?? 0, (eq.affixes ?? {}) as Record<string, number>) : -1;
          isUpgrade = itemCp > eqCp;
        }
        return `<button class="bag-slot filled tip-source ${tpl.kind === 'equip' ? 'eq-btn' : 'use-btn'}"
          data-uid="${i.uid}"
          data-kind="${tpl.kind}"
          data-tpl="${i.templateId}"
          data-up="${up}"
          data-qty="${i.quantity}"
          data-affixes="${encodeURIComponent(JSON.stringify(i.affixes ?? {}))}"
          style="border-color:${rarColor}">
          ${renderItemIconHtml(i.templateId, up, 28)}
          ${isUpgrade ? `<span class="bag-slot-up" title="Melhor que o equipado">▲</span>` : ''}
          ${i.quantity > 1 ? `<span class="bag-slot-qty">${i.quantity}</span>` : ''}
        </button>`;
      }).join('');

      const bagHtml = `
        <div class="card-box" style="display:flex;justify-content:space-between;align-items:center">
          <strong>Bolsa (${this.client.inventory.length}/36)</strong>
          <span style="font-size:11px;color:#fbbf24">${v.gold}g • ${v.dust}p</span>
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          <button class="${this.bagFilter === 'all' ? 'btn-primary' : 'btn-secondary'} bag-f" data-f="all" style="padding:4px 7px;font-size:10px">Tudo</button>
          <button class="${this.bagFilter === 'equip' ? 'btn-primary' : 'btn-secondary'} bag-f" data-f="equip" style="padding:4px 7px;font-size:10px">Equips</button>
          <button class="${this.bagFilter === 'consumable' ? 'btn-primary' : 'btn-secondary'} bag-f" data-f="consumable" style="padding:4px 7px;font-size:10px">Poções</button>
          <button class="btn-primary" id="btn-auto-equip" style="padding:4px 7px;font-size:10px;margin-left:auto" title="Equipar automaticamente itens com mais CP da Bolsa">Melhor</button>
          <button class="btn-secondary" id="btn-recycle-common" style="padding:4px 7px;font-size:10px">Reciclar</button>
        </div>
        <div class="bag-grid">${slotsHtml}</div>`;

      const selSlot = this.selectedEquipSlot;
      const selItem = this.client.equipment[selSlot];
      const selTpl = selItem ? ITEM_TEMPLATES[selItem.templateId] : null;
      const selUp = selItem?.upgradeLevel ?? 0;
      const selCost = upgradeCost(selUp);
      const selLabel = slotNamesPt[selSlot];
      const slotActionsHtml = `
        <div class="hero-3d-caption">${v.activeTitle ? `<span style="color:#fbbf24">[${v.activeTitle}]</span> ` : ''}${this.client.getSelfPlayer()?.name ?? 'Herói'} • Lv.${v.level}</div>
        <div style="font-size:10px;color:#94a3b8;margin-top:2px">${selTpl ? `${selLabel}: ${selTpl.name}${selUp > 0 ? ` +${selUp}` : ''}` : `${selLabel}: Vazio`}</div>
        <div style="display:flex;gap:4px;margin-top:3px;flex-wrap:wrap;justify-content:center">
          <button class="btn-secondary" id="btn-forge-selected" style="padding:3px 7px;font-size:10px" ${!selItem || selUp >= MAX_UPGRADE_LEVEL ? 'disabled' : ''}>
            ${selUp >= MAX_UPGRADE_LEVEL ? 'Forja Máx' : `Forjar +${selUp + 1} (${selCost.gold}g/${selCost.dust}p)`}
          </button>
          <button class="btn-secondary" id="btn-reroll-weapon" style="padding:3px 7px;font-size:10px" ${!selItem ? 'disabled' : ''} title="Reforjar status bônus de ${selLabel} (120g / 6p)">
            Reforjar ${selLabel} (120g/6p)
          </button>
        </div>`;

      const existingRoot = sheet.querySelector('#hero-bag-root');
      if (!existingRoot) {
        sheet.innerHTML = `
          <div class="sheet-header"><h3 id="hb-title">Herói, Equipamentos & Bolsa • CP ${v.cp}</h3>${closeBtn}</div>
          <div class="hero-bag-layout" id="hero-bag-root">
            <div class="hb-col" id="hero-stats-col">${statsHtml}</div>
            <div class="hb-col paperdoll-stage">
              <div class="equip-col" id="paperdoll-left">${leftSlots.map(renderSlot).join('')}</div>
              <div class="hero-3d-frame">
                <canvas id="hero-preview-3d" class="hero-preview-canvas"></canvas>
                <div id="hero-slot-actions">${slotActionsHtml}</div>
              </div>
              <div class="equip-col" id="paperdoll-right">${rightSlots.map(renderSlot).join('')}</div>
            </div>
            <div class="hb-col" id="hero-bag-col">${bagHtml}</div>
          </div>`;
        const canvas = sheet.querySelector('#hero-preview-3d') as HTMLCanvasElement | null;
        if (canvas) {
          this.heroPreview.attach(canvas, this.client.heroClass);
          this.heroPreview.setPortraitVisuals(null, tier.auraHex);
        }
      } else {
        const titleEl = sheet.querySelector('#hb-title');
        if (titleEl) titleEl.textContent = `Herói, Equipamentos & Bolsa • CP ${v.cp}`;
        const sc = sheet.querySelector('#hero-stats-col') as HTMLElement | null;
        const pl = sheet.querySelector('#paperdoll-left') as HTMLElement | null;
        const pr = sheet.querySelector('#paperdoll-right') as HTMLElement | null;
        const bc = sheet.querySelector('#hero-bag-col') as HTMLElement | null;
        const sa = sheet.querySelector('#hero-slot-actions') as HTMLElement | null;
        if (sc && sc.dataset.lastHtml !== statsHtml) {
          sc.dataset.lastHtml = statsHtml;
          sc.innerHTML = statsHtml;
        }
        const plHtml = leftSlots.map(renderSlot).join('');
        if (pl && pl.dataset.lastHtml !== plHtml) {
          pl.dataset.lastHtml = plHtml;
          pl.innerHTML = plHtml;
        }
        const prHtml = rightSlots.map(renderSlot).join('');
        if (pr && pr.dataset.lastHtml !== prHtml) {
          pr.dataset.lastHtml = prHtml;
          pr.innerHTML = prHtml;
        }
        if (bc && bc.dataset.lastHtml !== bagHtml) {
          bc.dataset.lastHtml = bagHtml;
          bc.innerHTML = bagHtml;
        }
        if (sa && sa.dataset.lastHtml !== slotActionsHtml) {
          sa.dataset.lastHtml = slotActionsHtml;
          sa.innerHTML = slotActionsHtml;
        }
      }

      const rebirthBtn = sheet.querySelector('#btn-rebirth') as HTMLButtonElement | null;
      if (rebirthBtn) {
        rebirthBtn.onclick = () => {
          sfx.click();
          this.client.send({ type: 'rebirth' });
        };
      }
      const forgeSelBtn = sheet.querySelector('#btn-forge-selected') as HTMLButtonElement | null;
      if (forgeSelBtn) {
        forgeSelBtn.onclick = () => {
          sfx.click();
          this.client.send({ type: 'upgrade_item', slot: this.selectedEquipSlot });
        };
      }
      const rerollBtn = sheet.querySelector('#btn-reroll-weapon') as HTMLButtonElement | null;
      if (rerollBtn) {
        rerollBtn.onclick = () => {
          sfx.click();
          this.client.send({ type: 'reroll_affixes', slot: this.selectedEquipSlot });
        };
      }
      sheet.querySelectorAll('.equip-slot-square[data-slot]').forEach((el) => {
        (el as HTMLElement).onclick = (ev) => {
          if ((ev.target as HTMLElement)?.closest('.forge-mini-btn')) return;
          const s = (el as HTMLElement).dataset.slot as EquipSlot | undefined;
          if (s && s !== this.selectedEquipSlot) {
            this.selectedEquipSlot = s;
            this.renderSheetContent();
          }
        };
      });
      sheet.querySelectorAll('.forge-btn').forEach((b) => {
        b.addEventListener('click', () => {
          sfx.click();
          this.client.send({ type: 'upgrade_item', slot: (b as HTMLElement).dataset.slot as EquipSlot });
        });
      });
      sheet.querySelectorAll('.alloc-btn').forEach((b) => {
        b.addEventListener('click', () => {
          this.client.send({ type: 'allocate_stat', stat: (b as HTMLElement).dataset.stat as any });
        });
      });
      sheet.querySelectorAll('.bag-f').forEach((b) => {
        b.addEventListener('click', () => {
          this.bagFilter = (b as HTMLElement).dataset.f as any;
          this.renderSheetContent();
        });
      });
      const autoEquipBtn = sheet.querySelector('#btn-auto-equip') as HTMLButtonElement | null;
      if (autoEquipBtn) {
        autoEquipBtn.onclick = () => {
          sfx.click();
          const bestBySlot = new Map<EquipSlot, { uid: string; cp: number }>();
          for (const item of this.client.inventory) {
            const tpl = ITEM_TEMPLATES[item.templateId];
            if (!tpl || tpl.kind !== 'equip' || !tpl.slot) continue;
            const cp = getItemCombatPower(tpl, item.upgradeLevel ?? 0, (item.affixes ?? {}) as Record<string, number>);
            const cur = this.client.equipment[tpl.slot];
            const curTpl = cur ? ITEM_TEMPLATES[cur.templateId] : null;
            const curCp = cur && curTpl ? getItemCombatPower(curTpl, cur.upgradeLevel ?? 0, (cur.affixes ?? {}) as Record<string, number>) : -1;
            const prev = bestBySlot.get(tpl.slot);
            if (cp > curCp && (!prev || cp > prev.cp)) {
              bestBySlot.set(tpl.slot, { uid: item.uid, cp });
            }
          }
          if (bestBySlot.size === 0) {
            this.showToast('Nenhum item melhor na Bolsa.', '#94a3b8');
          } else {
            for (const { uid } of bestBySlot.values()) this.client.send({ type: 'equip', itemUid: uid });
          }
        };
      }
      const recycleBtn = sheet.querySelector('#btn-recycle-common') as HTMLButtonElement | null;
      if (recycleBtn) {
        recycleBtn.onclick = () => {
          this.client.send({ type: 'recycle', rarities: ['common'] });
        };
      }
      sheet.querySelectorAll('.eq-btn').forEach((b) => {
        b.addEventListener('click', () => {
          this.client.send({ type: 'equip', itemUid: (b as HTMLElement).dataset.uid! });
        });
      });
      sheet.querySelectorAll('.use-btn').forEach((b) => {
        (b as HTMLElement).onclick = () => {
          const uid = (b as HTMLElement).dataset.uid!;
          this.client.send({ type: 'use_item', itemUid: uid });
        };
      });

      // Rich hover tooltip for Bag & Paperdoll slots
      const tip = this.root.querySelector('#item-tooltip') as HTMLElement | null;
      const hideTip = () => {
        if (tip) tip.style.display = 'none';
      };
      sheet.querySelectorAll('.tip-source').forEach((el) => {
        el.addEventListener('pointerenter', (ev) => {
          const ds = (el as HTMLElement).dataset;
          const tplId = ds.tpl;
          if (!tip || !tplId) return;
          const tpl = ITEM_TEMPLATES[tplId];
          if (!tpl) return;
          const up = Number(ds.up || 0);
          const affixes = JSON.parse(decodeURIComponent(ds.affixes || '{}')) as Record<string, number>;
          const rar = RARITY_META[tpl.rarity];
          const sm = getItemStatMult(tpl.rarity, up);
          const itemCp = getItemCombatPower(tpl, up, affixes);
          const lines = [
            tpl.atkBonus ? `+${Math.round(tpl.atkBonus * sm)} ATK` : '',
            tpl.defBonus ? `+${Math.round(tpl.defBonus * sm)} DEF` : '',
            tpl.hpBonus ? `+${Math.round(tpl.hpBonus * sm)} HP` : '',
            tpl.mpBonus ? `+${Math.round(tpl.mpBonus * sm)} MP` : '',
            tpl.critBonus ? `+${Math.round(tpl.critBonus * 100)}% Crítico` : '',
            tpl.speedBonus ? `+${Math.round(tpl.speedBonus * 100)}% Velocidade` : '',
            tpl.restoreAmount ? `Restaura ${tpl.restoreAmount} ${tpl.kind === 'potion_hp' ? 'HP' : 'MP'}` : '',
          ].filter(Boolean);
          const affixLabels: Record<string, (val: number) => string> = {
            atk: (x) => `+${x} ATK`,
            def: (x) => `+${x} DEF`,
            hp: (x) => `+${x} HP`,
            mp: (x) => `+${x} MP`,
            critChance: (x) => `+${(x * 100).toFixed(1)}% Chance Crítica`,
            critDmg: (x) => `+${Math.round(x * 100)}% Dano Crítico`,
            lifesteal: (x) => `+${(x * 100).toFixed(1)}% Roubo de Vida`,
            cdr: (x) => `-${Math.round(x * 100)}% Recarga`,
            bossDmg: (x) => `+${Math.round(x * 100)}% Dano vs Chefes`,
            speed: (x) => `+${Math.round(x * 100)}% Velocidade`,
            thorns: (x) => `+${Math.round(x * 100)}% Espinhos`,
            xpBonus: (x) => `+${Math.round(x * 100)}% XP`,
            goldBonus: (x) => `+${Math.round(x * 100)}% Ouro`,
          };
          const affixLines = Object.entries(affixes)
            .filter(([, val]) => val > 0)
            .map(([k, val]) => (affixLabels[k] ? affixLabels[k](val) : ''));
          const actionHint = el.classList.contains('eq-btn')
            ? 'Clique para Equipar'
            : el.classList.contains('use-btn')
            ? 'Clique para Usar'
            : 'Equipado';
          const slotLabelPt = tpl.slot ? slotNamesPt[tpl.slot] : '';
          let compareHtml = '';
          if (el.classList.contains('eq-btn') && tpl.slot) {
            const eq = this.client.equipment[tpl.slot];
            const eqTpl = eq ? ITEM_TEMPLATES[eq.templateId] : null;
            const eqCp = eq && eqTpl ? getItemCombatPower(eqTpl, eq.upgradeLevel ?? 0, (eq.affixes ?? {}) as Record<string, number>) : 0;
            const eqSm = eq && eqTpl ? getItemStatMult(eqTpl.rarity, eq.upgradeLevel ?? 0) : 1;
            const dCp = itemCp - eqCp;
            const dAtk = Math.round((tpl.atkBonus ?? 0) * sm) + (affixes.atk ?? 0) - (eqTpl ? Math.round((eqTpl.atkBonus ?? 0) * eqSm) + (eq?.affixes?.atk ?? 0) : 0);
            const dDef = Math.round((tpl.defBonus ?? 0) * sm) + (affixes.def ?? 0) - (eqTpl ? Math.round((eqTpl.defBonus ?? 0) * eqSm) + (eq?.affixes?.def ?? 0) : 0);
            const dHp = Math.round((tpl.hpBonus ?? 0) * sm) + (affixes.hp ?? 0) - (eqTpl ? Math.round((eqTpl.hpBonus ?? 0) * eqSm) + (eq?.affixes?.hp ?? 0) : 0);
            const fmtD = (val: number, lbl: string) =>
              val === 0 ? '' : `<span class="${val > 0 ? 'tip-diff-pos' : 'tip-diff-neg'}">${val > 0 ? '+' : ''}${val} ${lbl}</span>`;
            const diffs = [fmtD(dCp, 'CP'), fmtD(dAtk, 'ATK'), fmtD(dDef, 'DEF'), fmtD(dHp, 'HP')].filter(Boolean);
            if (diffs.length) {
              compareHtml = `<div style="font-size:10px;margin-top:4px;border-top:1px solid rgba(100,116,139,0.3);padding-top:3px;display:flex;gap:6px;flex-wrap:wrap"><span style="color:#94a3b8">vs Equipado:</span>${diffs.join('')}</div>`;
            }
          }
          tip.innerHTML = `
            <div style="font-weight:700;color:${rar.color}">${tpl.name}${up > 0 ? ` +${up}` : ''}</div>
            <div style="font-size:10px;color:#94a3b8;margin-bottom:4px">${rar.label}${slotLabelPt ? ` • ${slotLabelPt}` : ''}${itemCp > 0 ? ` • ${itemCp} CP` : ''}</div>
            ${lines.map((l) => `<div style="font-size:11px;color:#e2e8f0">${l}</div>`).join('')}
            ${affixLines.length ? `<div style="font-size:10px;color:#60a5fa;margin-top:4px;border-top:1px solid rgba(100,116,139,0.3);padding-top:3px">Status Bônus (${affixLines.length}/${rar.maxAffixes}):</div>${affixLines.map((l) => `<div style="font-size:10px;color:#93c5fd">• ${l}</div>`).join('')}` : ''}
            ${compareHtml}
            ${tpl.effectDesc ? `<div style="font-size:10px;color:#f3d37a;margin-top:4px">✦ ${tpl.effectDesc}</div>` : ''}
            <div style="font-size:10px;color:#94a3b8;margin-top:4px">${actionHint}</div>
          `;
          tip.style.display = 'block';
          const pe = ev as PointerEvent;
          tip.style.left = `${Math.min(window.innerWidth - 210, pe.clientX + 14)}px`;
          tip.style.top = `${Math.min(window.innerHeight - 130, pe.clientY + 14)}px`;
        });
        el.addEventListener('pointermove', (ev) => {
          if (!tip || tip.style.display !== 'block') return;
          const pe = ev as PointerEvent;
          tip.style.left = `${Math.min(window.innerWidth - 210, pe.clientX + 14)}px`;
          tip.style.top = `${Math.min(window.innerHeight - 130, pe.clientY + 14)}px`;
        });
        el.addEventListener('pointerleave', hideTip);
      });
      sheet.querySelectorAll('.stat-tip').forEach((el) => {
        el.addEventListener('pointerenter', (ev) => {
          const ds = (el as HTMLElement).dataset;
          if (!tip || !ds.stiptitle) return;
          tip.innerHTML = `
            <div style="font-weight:700;color:#fbbf24;margin-bottom:3px">${ds.stiptitle}</div>
            <div style="font-size:11px;color:#e2e8f0;line-height:1.35">${ds.stipdesc ?? ''}</div>
          `;
          tip.style.display = 'block';
          const pe = ev as PointerEvent;
          tip.style.left = `${Math.min(window.innerWidth - 230, pe.clientX + 14)}px`;
          tip.style.top = `${Math.min(window.innerHeight - 100, pe.clientY + 14)}px`;
        });
        el.addEventListener('pointermove', (ev) => {
          if (!tip || tip.style.display !== 'block') return;
          const pe = ev as PointerEvent;
          tip.style.left = `${Math.min(window.innerWidth - 230, pe.clientX + 14)}px`;
          tip.style.top = `${Math.min(window.innerHeight - 100, pe.clientY + 14)}px`;
        });
        el.addEventListener('pointerleave', hideTip);
      });
      if (!sheet.querySelector('.tip-source:hover, .stat-tip:hover')) hideTip();
    } else if (this.activeSheet === 'skills') {
      const v = this.client.vitals;
      const classSkills = SKILLS.filter((s) => s.heroClass === this.client.heroClass);
      const classPassives = PASSIVE_DEFS.filter((p) => p.heroClass === this.client.heroClass);
      const passivesMap = v?.passives ?? {};
      const paragonList = v?.paragon ?? ['2_2'];
      const skPts = v?.skillPoints ?? 0;
      const pgPts = v?.paragonPoints ?? 0;

      let bodyHtml = '';
      if (this.buildTab === 'actives') {
        bodyHtml = classSkills
          .map((s) => {
            const on = this.autoCtrl.config.enabledSkills.has(s.id);
            return `<div class="card-box" style="display:flex;justify-content:space-between;align-items:center;gap:8px">
              <div>
                <strong style="color:${s.color}">${s.name}</strong> (${s.mpCost} MP • ${(s.cooldownMs / 1000).toFixed(1)}s)
                <div style="font-size:11px;color:#94a3b8">${s.description}</div>
              </div>
              <button class="btn-secondary toggle-sk" data-sk="${s.id}">${on ? 'AUTO: ON' : 'AUTO: OFF'}</button>
            </div>`;
          })
          .join('');
      } else if (this.buildTab === 'passives') {
        bodyHtml = `
          <div class="card-box" style="display:flex;justify-content:space-between;align-items:center">
            <span>Pontos de Passiva: <strong style="color:#4ade80">${skPts}</strong> <small style="color:#94a3b8">(+1 por Nível)</small></span>
            <button class="btn-secondary" id="btn-reset-build" style="padding:4px 8px;font-size:11px">Resetar Build</button>
          </div>
          <div class="grid-2">
            ${classPassives
              .map((p) => {
                const rank = passivesMap[p.id] ?? 0;
                const maxed = rank >= p.maxRank;
                return `<div class="card-box" style="display:flex;flex-direction:column;justify-content:space-between;gap:6px;border-color:${rank > 0 ? '#4ade80' : 'var(--border-subtle)'}">
                  <div>
                    <div style="display:flex;justify-content:space-between;align-items:center">
                      <strong style="color:#f3d37a">${p.name}</strong>
                      <span style="font-size:11px;color:#94a3b8">${rank}/${p.maxRank}</span>
                    </div>
                    <div style="font-size:11px;color:#cbd5e1;margin-top:2px">${p.desc}</div>
                  </div>
                  <button class="btn-secondary unlock-passive" data-pid="${p.id}" ${skPts <= 0 || maxed ? 'disabled' : ''}>
                    ${maxed ? 'MAX' : 'Evoluir (+1)'}
                  </button>
                </div>`;
              })
              .join('')}
          </div>`;
      } else {
        bodyHtml = `
          <div class="card-box" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
            <span>Pontos Paragon: <strong style="color:#f3d37a">${pgPts}</strong> <small style="color:#94a3b8">(Lv.${PARAGON_UNLOCK_LEVEL}+ & +4/Rebirth)</small></span>
            <button class="btn-secondary" id="btn-reset-build" style="padding:4px 8px;font-size:11px">Resetar Build</button>
          </div>
          <div class="paragon-grid">
            ${PARAGON_NODES.map((n) => {
              const active = paragonList.includes(n.id);
              const canUnlock = pgPts > 0 && isParagonNodeUnlockable(n.id, paragonList);
              return `<button class="paragon-node tier-${n.tier} ${active ? 'active' : ''} ${canUnlock ? 'unlockable' : ''}" data-nid="${n.id}" title="${n.name}: ${n.desc}">
                <span class="pn-title">${n.name}</span>
                <span class="pn-desc">${n.desc}</span>
              </button>`;
            }).join('')}
          </div>`;
      }

      sheet.innerHTML = `
        <div class="sheet-header"><h3>Build, Skills & Paragon</h3>${closeBtn}</div>
        <div style="display:flex;gap:6px">
          <button class="${this.buildTab === 'actives' ? 'btn-primary' : 'btn-secondary'} build-tab" data-bt="actives" style="flex:1">Ativas (${classSkills.length})</button>
          <button class="${this.buildTab === 'passives' ? 'btn-primary' : 'btn-secondary'} build-tab" data-bt="passives" style="flex:1">Passivas (${skPts})</button>
          <button class="${this.buildTab === 'paragon' ? 'btn-primary' : 'btn-secondary'} build-tab" data-bt="paragon" style="flex:1">Paragon (${pgPts})</button>
        </div>
        ${bodyHtml}
      `;
      sheet.querySelectorAll('.build-tab').forEach((b) => {
        b.addEventListener('click', () => {
          this.buildTab = (b as HTMLElement).dataset.bt as any;
          this.renderSheetContent();
        });
      });
      sheet.querySelector('#btn-reset-build')?.addEventListener('click', () => {
        sfx.click();
        this.client.send({ type: 'reset_build' });
      });
      sheet.querySelectorAll('.unlock-passive').forEach((b) => {
        b.addEventListener('click', () => {
          sfx.click();
          this.client.send({ type: 'unlock_passive', passiveId: (b as HTMLElement).dataset.pid! });
        });
      });
      sheet.querySelectorAll('.paragon-node').forEach((b) => {
        b.addEventListener('click', () => {
          sfx.click();
          this.client.send({ type: 'unlock_paragon', nodeId: (b as HTMLElement).dataset.nid! });
        });
      });
      sheet.querySelectorAll('.toggle-sk').forEach((b) => {
        b.addEventListener('click', () => {
          const id = (b as HTMLElement).dataset.sk!;
          if (this.autoCtrl.config.enabledSkills.has(id)) {
            this.autoCtrl.config.enabledSkills.delete(id);
          } else {
            this.autoCtrl.config.enabledSkills.add(id);
          }
          this.renderSheetContent();
        });
      });
    } else if (this.activeSheet === 'social') {
      const p = this.client.party;
      sheet.innerHTML = `
        <div class="sheet-header"><h3>Social & Party</h3>${closeBtn}</div>
        ${
          p
            ? `<div class="card-box">
                <div><strong>Party ID:</strong> ${p.id} (XP +15% compartilhado)</div>
                <div style="margin:8px 0">${p.members
                  .map((m) => `<div>• ${m.name} Lv.${m.level} (${m.hp}/${m.maxHp} HP)</div>`)
                  .join('')}</div>
                <button class="btn-secondary" id="btn-leave-party">Sair da Party</button>
              </div>`
            : `<div class="card-box" style="display:flex;flex-direction:column;gap:8px">
                <button class="btn-primary" id="btn-create-party">Criar Nova Party</button>
                <div style="display:flex;gap:6px">
                  <input class="input-field" id="party-id-in" placeholder="ID da Party (ex: party_1)" />
                  <button class="btn-secondary" id="btn-join-party">Entrar</button>
                </div>
              </div>`
        }
      `;
      sheet.querySelector('#btn-create-party')?.addEventListener('click', () => {
        this.client.send({ type: 'party_action', action: 'create' });
      });
      sheet.querySelector('#btn-leave-party')?.addEventListener('click', () => {
        this.client.send({ type: 'party_action', action: 'leave' });
      });
      sheet.querySelector('#btn-join-party')?.addEventListener('click', () => {
        const pid = (sheet.querySelector('#party-id-in') as HTMLInputElement).value.trim();
        if (pid) this.client.send({ type: 'party_action', action: 'join', partyId: pid });
      });
    } else if (this.activeSheet === 'auto_cfg') {
      const cfg = this.autoCtrl.config;
      sheet.innerHTML = `
        <div class="sheet-header"><h3>Configuração do Botão AUTO</h3>${closeBtn}</div>
        <div class="card-box">
          <div>Raio de Caça: <strong>${cfg.anchorMode.toUpperCase()}</strong></div>
          <div style="display:flex;gap:6px;margin-top:6px">
            <button class="btn-secondary r-mode" data-m="short">Curto</button>
            <button class="btn-secondary r-mode" data-m="medium">Médio</button>
            <button class="btn-secondary r-mode" data-m="unlimited">Ilimitado</button>
          </div>
        </div>
        <div class="card-box">
          <label>Auto-Poção HP abaixo de <strong>${cfg.hpThreshold}%</strong></label>
          <input type="range" min="10" max="90" value="${cfg.hpThreshold}" id="sl-hp" style="width:100%" />
          <label>Auto-Poção MP abaixo de <strong>${cfg.mpThreshold}%</strong></label>
          <input type="range" min="10" max="90" value="${cfg.mpThreshold}" id="sl-mp" style="width:100%" />
        </div>
        <div class="card-box" style="display:flex;flex-direction:column;gap:6px">
          <div><strong>Filtro de Auto-Loot (Raridade)</strong></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${(['common', 'uncommon', 'rare', 'epic', 'legendary'] as Rarity[])
              .map(
                (r) => `<label style="color:${RARITY_META[r].color};font-size:11px">
                  <input type="checkbox" class="loot-r" data-r="${r}" ${cfg.lootRarities.has(r) ? 'checked' : ''} /> ${RARITY_META[r].label}
                </label>`
              )
              .join('')}
          </div>
          <label><input type="checkbox" id="chk-rec" ${cfg.autoRecycleCommon ? 'checked' : ''} /> Auto-reciclar Comuns se bolsa >= 30</label>
          <label><input type="checkbox" id="chk-pause" ${cfg.pauseOnBagFull ? 'checked' : ''} /> Pausar Auto se bolsa cheia</label>
        </div>
      `;
      sheet.querySelectorAll('.loot-r').forEach((chk) => {
        chk.addEventListener('change', (e) => {
          const r = (chk as HTMLElement).dataset.r as Rarity;
          if ((e.target as HTMLInputElement).checked) cfg.lootRarities.add(r);
          else cfg.lootRarities.delete(r);
        });
      });
      sheet.querySelectorAll('.r-mode').forEach((b) => {
        b.addEventListener('click', () => {
          cfg.anchorMode = (b as HTMLElement).dataset.m as any;
          this.renderSheetContent();
        });
      });
      sheet.querySelector('#sl-hp')?.addEventListener('input', (e) => {
        cfg.hpThreshold = Number((e.target as HTMLInputElement).value);
        this.renderSheetContent();
      });
      sheet.querySelector('#sl-mp')?.addEventListener('input', (e) => {
        cfg.mpThreshold = Number((e.target as HTMLInputElement).value);
        this.renderSheetContent();
      });
      sheet.querySelector('#chk-rec')?.addEventListener('change', (e) => {
        cfg.autoRecycleCommon = (e.target as HTMLInputElement).checked;
      });
      sheet.querySelector('#chk-pause')?.addEventListener('change', (e) => {
        cfg.pauseOnBagFull = (e.target as HTMLInputElement).checked;
      });
    } else if (this.activeSheet === 'chat') {
      sheet.innerHTML = `
        <div class="sheet-header"><h3>Chat</h3>${closeBtn}</div>
        <div class="card-box" style="max-height:180px;overflow-y:auto;display:flex;flex-direction:column;gap:4px">
          ${this.client.chatLog
            .map((c) => `<div><strong style="color:#fbbf24">[${c.channel}] ${c.senderName}:</strong> ${c.text}</div>`)
            .join('') || 'Sem mensagens ainda.'}
        </div>
        <div style="display:flex;gap:6px">
          <input class="input-field" id="chat-in" placeholder="Digite sua mensagem..." maxlength="140" />
          <button class="btn-primary" id="chat-send">Enviar</button>
        </div>
      `;
      const sendFn = () => {
        const inp = sheet.querySelector('#chat-in') as HTMLInputElement;
        if (inp.value.trim()) {
          this.client.send({ type: 'chat', channel: 'map', text: inp.value.trim() });
          inp.value = '';
        }
      };
      sheet.querySelector('#chat-send')?.addEventListener('click', sendFn);
    } else if (this.activeSheet === 'menu') {
      let menuBody = '';
      if (this.menuTab === 'quests') {
        menuBody = QUEST_TEMPLATES.map((tpl) => {
          const p = this.client.quests.find((q) => q.questId === tpl.id);
          const prog = p?.progress ?? 0;
          const claimed = p?.claimed ?? false;
          const pct = Math.min(100, (prog / Math.max(1, tpl.requiredCount)) * 100);
          return `<div class="card-box" style="display:flex;justify-content:space-between;align-items:center;gap:10px">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px">
                <strong style="color:#f3d37a">${tpl.title}</strong>
                ${tpl.repeatable ? '<span class="tag-pill">Repetível</span>' : ''}
              </div>
              <div class="bar-track" style="height:5px;margin:4px 0"><div class="bar-fill bar-xp" style="width:${pct}%"></div></div>
              <div style="font-size:10px;color:#94a3b8">${prog}/${tpl.requiredCount} • Recompensa: +${tpl.xpReward} XP, +${tpl.goldReward} Ouro</div>
            </div>
            ${
              claimed
                ? '<span style="color:#4ade80;font-weight:700;font-size:11px">Concluída</span>'
                : prog >= tpl.requiredCount
                ? `<button class="btn-primary q-claim" data-q="${tpl.id}">Resgatar</button>`
                : `<span style="color:#64748b;font-size:11px">Em curso</span>`
            }
          </div>`;
        }).join('');
      } else if (this.menuTab === 'shop') {
        menuBody = `
          <div class="card-box" style="display:flex;justify-content:space-between;align-items:center">
            <span>Mercador da Praça</span>
            <span style="color:#fbbf24;font-weight:700">${v.gold} Ouro • ${v.dust} Pó</span>
          </div>
          <div class="grid-auto">
            ${SHOP_OFFERS.map((o) => {
              const tpl = ITEM_TEMPLATES[o.templateId];
              return `<div class="card-box" style="display:flex;gap:8px;align-items:center">
                ${renderItemIconHtml(o.templateId, 0, 36)}
                <div style="min-width:0;flex:1">
                  <div style="font-weight:700;font-size:11px;color:${RARITY_META[tpl.rarity].color};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${tpl.name}</div>
                  <div style="font-size:10px;color:#fbbf24">${o.goldCost} Ouro${o.dustCost ? ` + ${o.dustCost} Pó` : ''}</div>
                  <button class="btn-secondary buy-btn" data-tpl="${o.templateId}" style="margin-top:4px;padding:3px 6px;width:100%">Comprar</button>
                </div>
              </div>`;
            }).join('')}
          </div>`;
      } else if (this.menuTab === 'craft') {
        menuBody = `
          <div class="card-box" style="display:flex;justify-content:space-between;align-items:center">
            <span>Oficina de Craft (Materiais & Receitas)</span>
            <span style="color:#fbbf24;font-weight:700">${v.gold} Ouro • ${v.dust} Pó</span>
          </div>
          <div class="grid-auto">
            ${CRAFT_RECIPES.map((rec) => {
              const resTpl = ITEM_TEMPLATES[rec.resultTemplateId];
              if (!resTpl) return '';
              const ingHtml = rec.ingredients
                .map((ing) => {
                  const owned = this.client.inventory
                    .filter((i) => i.templateId === ing.templateId)
                    .reduce((s, i) => s + i.quantity, 0);
                  const mName = ITEM_TEMPLATES[ing.templateId]?.name ?? ing.templateId;
                  const ok = owned >= ing.qty;
                  return `<span style="font-size:10px;color:${ok ? '#4ade80' : '#f87171'}">${mName}: ${owned}/${ing.qty}</span>`;
                })
                .join(' • ');
              return `<div class="card-box" style="display:flex;gap:8px;align-items:center">
                ${renderItemIconHtml(rec.resultTemplateId, 0, 36)}
                <div style="min-width:0;flex:1">
                  <div style="font-weight:700;font-size:11px;color:${RARITY_META[resTpl.rarity].color}">${resTpl.name}${rec.resultQty > 1 ? ` x${rec.resultQty}` : ''}</div>
                  ${resTpl.effectDesc ? `<div style="font-size:9.5px;color:#cbd5e1">${resTpl.effectDesc}</div>` : ''}
                  <div style="margin-top:2px">${ingHtml}</div>
                  <div style="font-size:10px;color:#fbbf24;margin-top:2px">${rec.goldCost} Ouro + ${rec.dustCost} Pó</div>
                  <button class="btn-primary craft-btn" data-rec="${rec.id}" style="margin-top:4px;padding:3px 6px;width:100%;font-size:10px">Craftar</button>
                </div>
              </div>`;
            }).join('')}
          </div>`;
      } else if (this.menuTab === 'bestiary') {
        menuBody = `<div class="grid-auto">
          ${Object.values(MONSTER_TEMPLATES)
            .map(
              (m) => `<div class="card-box" style="border-color:${m.isBoss ? '#f59e0b' : 'var(--border-subtle)'}">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <strong style="color:${m.isBoss ? '#fbbf24' : '#f3efe6'}">${m.name}</strong>
                  ${m.isBoss ? '<span class="tag-pill boss">BOSS</span>' : ''}
                </div>
                <div style="font-size:10px;color:#94a3b8;margin-top:3px">Lv.${m.level} • HP ${m.maxHp} • ATK ${m.atk} • +${m.xpReward} XP</div>
              </div>`
            )
            .join('')}
        </div>`;
      } else if (this.menuTab === 'rank') {
        const list = this.client.leaderboard;
        menuBody = `
          <div class="card-box" style="display:flex;justify-content:space-between;align-items:center">
            <span>Ranking Global de Poder (Top 20)</span>
            <button class="btn-secondary" id="btn-refresh-rank" style="padding:3px 8px;font-size:10px">Atualizar</button>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px">
            ${
              list.length === 0
                ? '<div class="card-box" style="color:#94a3b8">Carregando ranking...</div>'
                : list
                    .map(
                      (e, idx) => `<div class="card-box" style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px">
                        <span><strong style="color:#fbbf24">#${idx + 1}</strong> ${e.name} <small style="color:#94a3b8">(${e.heroClass} • Lv.${e.level}${e.rebirths > 0 ? ` • Asc.${e.rebirths}` : ''})</small></span>
                        <strong style="color:#60a5fa">${e.cp} CP</strong>
                      </div>`
                    )
                    .join('')
            }
          </div>`;
      } else if (this.menuTab === 'ach') {
        const unlocked = v.achievements ?? [];
        menuBody = `<div class="grid-auto">
          ${ACHIEVEMENTS.map((a) => {
            const has = unlocked.includes(a.id);
            const active = v.activeTitle === a.title;
            return `<div class="card-box" style="border-color:${has ? '#fbbf24' : 'var(--border-subtle)'};opacity:${has ? 1 : 0.72}">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <strong style="color:${has ? '#fbbf24' : '#cbd5e1'}">${a.title}</strong>
                <span style="font-size:10px;color:${has ? '#4ade80' : '#94a3b8'}">${a.bonusText}</span>
              </div>
              <div style="font-size:10px;color:#94a3b8;margin:4px 0">${a.desc}</div>
              ${
                has
                  ? `<button class="${active ? 'btn-primary' : 'btn-secondary'} title-pick" data-title="${a.title}" style="padding:3px 8px;font-size:10px">${active ? 'Título Ativo' : 'Equipar Título'}</button>`
                  : `<span style="font-size:10px;color:#64748b">Bloqueado</span>`
              }
            </div>`;
          }).join('')}
        </div>`;
      } else if (this.menuTab === 'arena') {
        const ws = this.client.waveState;
        menuBody = `
          <div class="card-box" style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <div>
              <strong style="color:#fbbf24">Mascote Auto-Loot (Fada Dourada)</strong>
              <div style="font-size:10px;color:#94a3b8">Coleta ouro e itens automaticamente num raio de 6.5m e concede +5% Velocidade & +5% Ouro.</div>
            </div>
            <button class="${v.petActive ? 'btn-primary' : 'btn-secondary'}" id="btn-toggle-pet">${v.petActive ? 'ATIVO' : 'ATIVAR'}</button>
          </div>
          <div class="card-box" style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <div>
              <strong style="color:#60a5fa">Masmorra de Ondas (5 Ondas + Chefe)</strong>
              <div style="font-size:10px;color:#94a3b8">Enfrente 5 ondas crescentes com um Chefe garantido na Onda 5. Recompensa: +300 Ouro, +15 Pó & Conquista!</div>
            </div>
            <button class="btn-primary" id="btn-start-wave" ${ws?.active ? 'disabled' : ''}>${ws?.active ? `Onda ${ws.wave}/5` : 'Iniciar'}</button>
          </div>`;
      } else {
        menuBody = `
          <div class="card-box" style="display:flex;justify-content:space-between;align-items:center">
            <span>Modo Canhoto (Espelhar Barra)</span>
            <button class="btn-secondary" id="btn-left-hand">${document.body.classList.contains('left-handed') ? 'ON' : 'OFF'}</button>
          </div>
          <div class="card-box" style="display:flex;justify-content:space-between;align-items:center">
            <span>Efeitos Sonoros (SFX)</span>
            <button class="btn-secondary" id="btn-sfx-toggle">${sfx.muted ? 'OFF' : 'ON'}</button>
          </div>
          <div class="card-box" style="display:flex;justify-content:space-between;align-items:center">
            <span>Viewer 3D de Aprovação (.GLB)</span>
            <a href="/viewer.html" target="_blank" class="btn-secondary" style="text-decoration:none">Abrir Viewer</a>
          </div>
          <div class="card-box" style="display:flex;justify-content:space-between;align-items:center">
            <span>Painel Administrativo</span>
            <a href="/admin" target="_blank" class="btn-secondary" style="text-decoration:none">Abrir /admin</a>
          </div>`;
      }

      sheet.innerHTML = `
        <div class="sheet-header"><h3>Central do Aventureiro</h3>${closeBtn}</div>
        <div class="sub-tabs">
          <button class="${this.menuTab === 'quests' ? 'btn-primary' : 'btn-secondary'} menu-tab" data-mt="quests">Missões</button>
          <button class="${this.menuTab === 'shop' ? 'btn-primary' : 'btn-secondary'} menu-tab" data-mt="shop">Mercador</button>
          <button class="${this.menuTab === 'craft' ? 'btn-primary' : 'btn-secondary'} menu-tab" data-mt="craft">Craft</button>
          <button class="${this.menuTab === 'bestiary' ? 'btn-primary' : 'btn-secondary'} menu-tab" data-mt="bestiary">Bestiário</button>
          <button class="${this.menuTab === 'rank' ? 'btn-primary' : 'btn-secondary'} menu-tab" data-mt="rank">Ranking</button>
          <button class="${this.menuTab === 'ach' ? 'btn-primary' : 'btn-secondary'} menu-tab" data-mt="ach">Conquistas</button>
          <button class="${this.menuTab === 'arena' ? 'btn-primary' : 'btn-secondary'} menu-tab" data-mt="arena">Masmorra</button>
          <button class="${this.menuTab === 'settings' ? 'btn-primary' : 'btn-secondary'} menu-tab" data-mt="settings">Ajustes</button>
        </div>
        ${menuBody}
      `;
      sheet.querySelectorAll('.menu-tab').forEach((b) => {
        b.addEventListener('click', () => {
          sfx.click();
          this.menuTab = (b as HTMLElement).dataset.mt as any;
          if (this.menuTab === 'rank') this.client.send({ type: 'request_leaderboard' });
          this.renderSheetContent();
        });
      });
      sheet.querySelector('#btn-refresh-rank')?.addEventListener('click', () => {
        this.client.send({ type: 'request_leaderboard' });
      });
      sheet.querySelectorAll('.title-pick').forEach((b) => {
        b.addEventListener('click', () => {
          this.client.send({ type: 'select_title', titleId: (b as HTMLElement).dataset.title ?? '' });
        });
      });
      sheet.querySelector('#btn-toggle-pet')?.addEventListener('click', () => {
        sfx.click();
        this.client.send({ type: 'toggle_pet' });
      });
      sheet.querySelector('#btn-start-wave')?.addEventListener('click', () => {
        sfx.click();
        this.client.send({ type: 'start_wave_dungeon' });
        this.openSheet(null);
      });
      sheet.querySelectorAll('.q-claim').forEach((b) => {
        b.addEventListener('click', () => {
          this.client.send({ type: 'quest_claim', questId: (b as HTMLElement).dataset.q! });
        });
      });
      sheet.querySelector('#btn-left-hand')?.addEventListener('click', () => {
        document.body.classList.toggle('left-handed');
        this.renderSheetContent();
      });
      sheet.querySelector('#btn-sfx-toggle')?.addEventListener('click', () => {
        sfx.muted = !sfx.muted;
        sfx.click();
        this.renderSheetContent();
      });
      sheet.querySelectorAll('.buy-btn').forEach((b) => {
        b.addEventListener('click', () => {
          this.client.send({ type: 'buy_item', templateId: (b as HTMLElement).dataset.tpl!, quantity: 1 });
        });
      });
      sheet.querySelectorAll('.craft-btn').forEach((b) => {
        b.addEventListener('click', () => {
          sfx.click();
          this.client.send({ type: 'craft_item', recipeId: (b as HTMLElement).dataset.rec! });
        });
      });
    } else if (this.activeSheet === 'map') {
      const px = (this.client.localX / MAP_SIZE) * 100;
      const py = (this.client.localY / MAP_SIZE) * 100;
      sheet.innerHTML = `
        <div class="sheet-header"><h3>Mapa Mundi — ${this.client.mapName}</h3>${closeBtn}</div>
        <div id="minimap-box" style="position:relative;width:100%;height:150px;background:radial-gradient(circle at center,#121a28 0%,#080b11 100%);border:1px solid var(--border-gold);border-radius:10px;overflow:hidden">
          <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(200,155,60,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(200,155,60,0.08) 1px,transparent 1px);background-size:20% 20%"></div>
          <div style="position:absolute;left:${px}%;top:${py}%;width:12px;height:12px;border-radius:50%;background:#fbbf24;border:2px solid #fff;box-shadow:0 0 10px #fbbf24;transform:translate(-50%,-50%)"></div>
          <div style="position:absolute;left:8px;bottom:6px;padding:2px 8px;border-radius:6px;background:rgba(5,7,11,0.85);border:1px solid rgba(200,155,60,0.3);font-size:11px;color:#e2e8f0">Posição Atual (${Math.round(this.client.localX)}, ${Math.round(this.client.localY)})</div>
        </div>
        <div style="font-size:12px;font-weight:700;color:#fbbf24">Viajar entre Mapas</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:6px">
          ${Object.values(MAPS)
            .map(
              (m) => `<button class="${m.id === this.client.mapId ? 'btn-primary' : 'btn-secondary'} world-tp" data-map="${m.id}" style="display:flex;justify-content:space-between;align-items:center">
                <span>${m.name} <small style="color:#94a3b8">(${m.subtitle})</small></span>
                <strong style="color:${m.themeColor}">${m.recommendedLv}</strong>
              </button>`
            )
            .join('')}
        </div>
        <button class="btn-primary" id="btn-return-safe">Teletransportar para Praça Segura</button>
      `;
      sheet.querySelector('#btn-return-safe')?.addEventListener('click', () => {
        this.autoCtrl.anchorX = SAFE_SPAWN.x;
        this.autoCtrl.anchorY = SAFE_SPAWN.y;
        this.client.send({ type: 'return_safe' });
        this.openSheet(null);
      });
      sheet.querySelectorAll('.world-tp').forEach((b) => {
        b.addEventListener('click', () => {
          const mapId = (b as HTMLElement).dataset.map as MapId;
          this.client.send({ type: 'change_map', mapId });
          this.openSheet(null);
        });
      });
    }

    sheet.querySelector('#close-sheet')?.addEventListener('click', () => this.openSheet(null));
  }
}
