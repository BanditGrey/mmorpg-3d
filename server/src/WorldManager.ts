import {
  AOI_CHUNK_SIZE,
  CLASS_DEFS,
  ITEM_TEMPLATES,
  MAPS,
  MAP_SIZE,
  MONSTER_TEMPLATES,
  QUEST_TEMPLATES,
  SAFE_SPAWN,
  clamp,
  distance,
  getActiveWorldEvent,
  getParagonPointsAvailable,
  getSkillPointsAvailable,
  rollItemAffixes,
  xpForNextLevel,
  type ClientMessage,
  type DropSnapshot,
  type MapId,
  type MonsterSnapshot,
  type PlayerSnapshot,
  type SelfVitals,
  type ServerMessage,
} from '@mmorpg/shared';
import type { WebSocket } from 'ws';
import {
  computePlayerDerived,
  grantXpAndLevel,
  handleBuyItem,
  handleCastSkill,
  handleCraftItem,
  handleEquipItem,
  handlePickupDrop,
  handleRebirth,
  handleRecycleItems,
  handleRerollAffixes,
  handleResetBuild,
  handleUnlockParagon,
  handleUnlockPassive,
  handleUpgradeItem,
  handleUseItem,
  handleUsePotion,
  syncInventory,
  unlockAchievement,
  type WorldCallbacks,
} from './CombatSystem.js';
import { GameDatabase, type ServerSettings } from './db/Database.js';
import type { ServerDrop, ServerMonster, ServerParty, ServerPlayer } from './types.js';

export class WorldManager {
  public players = new Map<string, ServerPlayer>();
  public monsters = new Map<string, ServerMonster>();
  public drops = new Map<string, ServerDrop>();
  public parties = new Map<string, ServerParty>();
  public db = new GameDatabase();
  public settings: ServerSettings;

  private tickCount = 0;
  private idCounter = 1;
  private callbacks: WorldCallbacks;
  private waveRuns = new Map<string, { wave: number; maxWaves: number; monsterIds: string[] }>();

  constructor() {
    this.settings = this.db.getSettings();
    this.callbacks = {
      send: (player, msg) => this.send(player.ws, msg),
      broadcastAOI: (mapId, x, y, msg) => this.broadcastAOI(mapId, x, y, msg),
    };
    this.spawnInitialMonsters();
  }

  private nextId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${this.idCounter++}`;

  private spawnInitialMonsters() {
    const zones: Array<{ mapId: MapId; tpl: string; cx: number; cy: number; count: number; spread: number }> = [
      { mapId: 'vale_eldoria', tpl: 'slime', cx: 14, cy: 14, count: 10, spread: 6 },
      { mapId: 'vale_eldoria', tpl: 'wolf', cx: 34, cy: 15, count: 8, spread: 6 },
      { mapId: 'vale_eldoria', tpl: 'bandit', cx: 14, cy: 34, count: 6, spread: 5 },
      { mapId: 'floresta_sombria', tpl: 'spider', cx: 14, cy: 15, count: 10, spread: 6 },
      { mapId: 'floresta_sombria', tpl: 'treant', cx: 24, cy: 12, count: 6, spread: 5 },
      { mapId: 'floresta_sombria', tpl: 'wraith', cx: 34, cy: 16, count: 8, spread: 6 },
      { mapId: 'acampamento_orc', tpl: 'orc', cx: 20, cy: 16, count: 12, spread: 7 },
      { mapId: 'acampamento_orc', tpl: 'orc_shaman', cx: 33, cy: 15, count: 6, spread: 5 },
      { mapId: 'ruinas_antigas', tpl: 'skeleton_knight', cx: 18, cy: 18, count: 10, spread: 6 },
      { mapId: 'ruinas_antigas', tpl: 'ancient_lich', cx: 24, cy: 13, count: 1, spread: 1 },
      { mapId: 'deserto_escaravelho', tpl: 'scarab', cx: 18, cy: 18, count: 10, spread: 6 },
      { mapId: 'deserto_escaravelho', tpl: 'sand_golem', cx: 24, cy: 13, count: 1, spread: 1 },
      { mapId: 'santuario_golem', tpl: 'magma_elem', cx: 15, cy: 18, count: 8, spread: 5 },
      { mapId: 'santuario_golem', tpl: 'boss_golem', cx: 24, cy: 13, count: 1, spread: 1 },
      { mapId: 'pico_gelido', tpl: 'frost_yeti', cx: 18, cy: 18, count: 10, spread: 6 },
      { mapId: 'pico_gelido', tpl: 'ice_dragon', cx: 24, cy: 13, count: 1, spread: 1 },
      { mapId: 'abismo_eterno', tpl: 'abyss_fiend', cx: 18, cy: 17, count: 9, spread: 5 },
      { mapId: 'abismo_eterno', tpl: 'abyss_lord', cx: 24, cy: 13, count: 1, spread: 1 },
      { mapId: 'cidadela_celestial', tpl: 'seraph_fallen', cx: 18, cy: 17, count: 9, spread: 5 },
      { mapId: 'cidadela_celestial', tpl: 'celestial_warden', cx: 24, cy: 13, count: 1, spread: 1 },
      { mapId: 'torre_eterna', tpl: 'void_stalker', cx: 18, cy: 17, count: 9, spread: 5 },
      { mapId: 'torre_eterna', tpl: 'eternal_emperor', cx: 24, cy: 13, count: 1, spread: 1 },
    ];

    for (const z of zones) {
      const tpl = MONSTER_TEMPLATES[z.tpl];
      for (let i = 0; i < z.count; i++) {
        const sx = clamp(z.cx + (Math.random() - 0.5) * z.spread * 2, 3, MAP_SIZE - 4);
        const sy = clamp(z.cy + (Math.random() - 0.5) * z.spread * 2, 3, MAP_SIZE - 4);
        const id = this.nextId('mob');
        this.monsters.set(id, {
          id,
          mapId: z.mapId,
          templateId: z.tpl,
          spawnX: sx,
          spawnY: sy,
          x: sx,
          y: sy,
          hp: tpl.maxHp,
          maxHp: tpl.maxHp,
          alive: true,
          respawnAt: 0,
          lastAttackAt: 0,
          targetPlayerId: null,
        });
      }
    }
  }

  public addPlayer(ws: WebSocket, msg: Extract<ClientMessage, { type: 'join' }>): ServerPlayer | null {
    const id = this.nextId('p');
    const heroClass = msg.heroClass in CLASS_DEFS ? msg.heroClass : 'warrior';
    const cleanName = (msg.name || 'Aventureiro').trim().slice(0, 16) || 'Aventureiro';
    const username = (msg.username || cleanName).trim().slice(0, 20);
    const password = msg.password || 'guest1234';

    const auth = this.db.registerOrLogin(username, password);
    if (!auth.ok) {
      this.send(ws, { type: 'toast', text: auth.error, color: '#f87171' });
      ws.close(4001, auth.error);
      return null;
    }

    if (this.settings.maintenanceMode && auth.account.role !== 'admin') {
      this.send(ws, { type: 'toast', text: 'Servidor em manutenção. Tente em instantes.', color: '#f59e0b' });
      ws.close(4002, 'Manutenção');
      return null;
    }

    // Replace stale online session with the same character name
    for (const [existingId, existing] of this.players.entries()) {
      if (existing.name.toLowerCase() === cleanName.toLowerCase()) {
        this.removePlayer(existingId);
        try {
          existing.ws.close(1000, 'Sessão substituída');
        } catch {
          // Ignore close error
        }
      }
    }

    const charRec = this.db.getOrCreateCharacter(auth.account.id, cleanName, heroClass);

    const player: ServerPlayer = {
      id,
      accountId: auth.account.id,
      characterId: charRec.id,
      mapId: 'vale_eldoria',
      ws,
      name: charRec.name,
      heroClass: charRec.heroClass,
      level: charRec.level,
      rebirths: charRec.rebirths,
      xp: charRec.xp,
      x: charRec.x,
      y: charRec.y,
      targetX: charRec.x,
      targetY: charRec.y,
      hp: 100,
      mp: 100,
      statPoints: charRec.statPoints,
      stats: { ...charRec.stats },
      gold: charRec.gold,
      dust: charRec.dust,
      inventory: charRec.inventory,
      equipment: charRec.equipment,
      quests: charRec.quests,
      passives: charRec.passives ?? {},
      paragon: charRec.paragon?.length ? charRec.paragon : ['2_2'],
      achievements: charRec.achievements ?? [],
      activeTitle: charRec.activeTitle ?? '',
      petActive: charRec.petActive ?? false,
      partyId: null,
      lastAckSeq: 0,
      skillCooldowns: {},
      lastPotionAt: 0,
    };

    const derived = computePlayerDerived(player);
    player.hp = derived.maxHp;
    player.mp = derived.maxMp;
    this.players.set(id, player);

    const ev = getActiveWorldEvent();
    this.send(ws, {
      type: 'welcome',
      playerId: id,
      mapId: player.mapId,
      mapName: MAPS[player.mapId].name,
      channel: 'CH 1',
      vitals: this.buildVitals(player),
      inventory: player.inventory,
      equipment: player.equipment,
      quests: player.quests,
      x: player.x,
      y: player.y,
      worldEvent: { name: ev.name, desc: ev.desc },
    });

    this.send(ws, {
      type: 'chat_msg',
      id: this.nextId('chat'),
      channel: 'system',
      senderName: 'Evento',
      text: `${ev.name}: ${ev.desc} | ${this.settings.motd}`,
      timestamp: Date.now(),
    });
    this.broadcastChat('system', 'Sistema', `${player.name} entrou no Vale de Eldoria.`);
    return player;
  }

  public removePlayer(playerId: string) {
    const player = this.players.get(playerId);
    if (!player) return;
    this.db.savePlayer(player);
    if (player.partyId) {
      this.leaveParty(player);
    }
    this.players.delete(playerId);
  }

  public handleMessage(player: ServerPlayer, msg: ClientMessage) {
    switch (msg.type) {
      case 'move':
        if (!Number.isFinite(msg.targetX) || !Number.isFinite(msg.targetY)) break;
        player.targetX = clamp(msg.targetX, 1, MAP_SIZE - 2);
        player.targetY = clamp(msg.targetY, 1, MAP_SIZE - 2);
        player.lastAckSeq = Number.isFinite(msg.seq) ? msg.seq : player.lastAckSeq;
        break;
      case 'cast':
        handleCastSkill(
          player,
          msg.skillId,
          msg.targetId,
          this.monsters,
          this.drops,
          this.players,
          this.callbacks,
          this.nextId,
          this.settings.xpRate,
          this.settings.dropRate
        );
        break;
      case 'use_potion':
        handleUsePotion(player, msg.kind, this.callbacks);
        break;
      case 'pickup':
        handlePickupDrop(player, msg.dropId, this.drops, this.callbacks, this.nextId);
        break;
      case 'equip':
        handleEquipItem(player, msg.itemUid, this.callbacks);
        break;
      case 'recycle':
        if (Array.isArray(msg.rarities)) {
          handleRecycleItems(player, msg.rarities, this.callbacks);
        }
        break;
      case 'allocate_stat':
        if (player.statPoints > 0 && ['str', 'agi', 'vit', 'int'].includes(msg.stat)) {
          player.stats[msg.stat] += 1;
          player.statPoints -= 1;
        }
        break;
      case 'buy_item':
        handleBuyItem(player, msg.templateId, msg.quantity ?? 1, this.callbacks, this.nextId);
        break;
      case 'upgrade_item':
        handleUpgradeItem(player, msg.slot, this.callbacks);
        break;
      case 'return_safe':
        player.mapId = 'vale_eldoria';
        player.x = SAFE_SPAWN.x;
        player.y = SAFE_SPAWN.y;
        player.targetX = SAFE_SPAWN.x;
        player.targetY = SAFE_SPAWN.y;
        this.send(player.ws, {
          type: 'map_changed',
          mapId: 'vale_eldoria',
          mapName: MAPS.vale_eldoria.name,
          x: player.x,
          y: player.y,
        });
        this.send(player.ws, { type: 'toast', text: 'Retornou à Praça Segura!', color: '#60a5fa' });
        break;
      case 'change_map': {
        const dest = MAPS[msg.mapId];
        if (!dest) break;
        player.mapId = dest.id;
        player.x = dest.spawn.x;
        player.y = dest.spawn.y;
        player.targetX = dest.spawn.x;
        player.targetY = dest.spawn.y;
        this.send(player.ws, {
          type: 'map_changed',
          mapId: dest.id,
          mapName: dest.name,
          x: player.x,
          y: player.y,
        });
        this.send(player.ws, { type: 'toast', text: `Viajou para ${dest.name} (${dest.recommendedLv})`, color: dest.themeColor });
        break;
      }
      case 'chat': {
        const now = Date.now();
        if (player.lastChatAt && now - player.lastChatAt < 550) break;
        player.lastChatAt = now;
        const text = typeof msg.text === 'string' ? msg.text.trim().slice(0, 140) : '';
        if (!text) break;
        if (msg.channel === 'party' && player.partyId) {
          const party = this.parties.get(player.partyId);
          if (party) {
            for (const mid of party.memberIds) {
              const mp = this.players.get(mid);
              if (mp) {
                this.send(mp.ws, {
                  type: 'chat_msg',
                  id: this.nextId('chat'),
                  channel: 'party',
                  senderName: player.name,
                  text,
                  timestamp: Date.now(),
                });
              }
            }
          }
        } else {
          this.broadcastChat(msg.channel === 'global' ? 'global' : 'map', player.name, text);
        }
        break;
      }
      case 'party_action':
        this.handlePartyAction(player, msg.action, msg.partyId);
        break;
      case 'quest_claim':
        this.handleQuestClaim(player, msg.questId);
        break;
      case 'rebirth':
        handleRebirth(player, this.callbacks);
        break;
      case 'unlock_passive':
        handleUnlockPassive(player, msg.passiveId, this.callbacks);
        break;
      case 'unlock_paragon':
        handleUnlockParagon(player, msg.nodeId, this.callbacks);
        break;
      case 'reset_build':
        handleResetBuild(player, this.callbacks);
        break;
      case 'reroll_affixes':
        handleRerollAffixes(player, msg.slot, this.callbacks);
        break;
      case 'request_leaderboard': {
        const rows = this.db.getLeaderboard(20);
        const entries = rows.map((r) => {
          const online = [...this.players.values()].find((pl) => pl.name === r.name);
          const cp = online
            ? computePlayerDerived(online).cp
            : Math.floor((200 + r.level * 30 + r.vit * 14 + r.str * 12 + r.agi * 8 + r.int_stat * 6) * (1 + r.rebirths * 0.15));
          return { name: r.name, heroClass: r.hero_class, level: r.level, rebirths: r.rebirths, cp };
        });
        entries.sort((a, b) => b.cp - a.cp || b.rebirths - a.rebirths || b.level - a.level);
        this.send(player.ws, { type: 'leaderboard_data', entries });
        break;
      }
      case 'select_title':
        player.activeTitle = msg.titleId;
        this.send(player.ws, { type: 'toast', text: msg.titleId ? `Título equipado: ${msg.titleId}` : 'Título removido.', color: '#fbbf24' });
        break;
      case 'toggle_pet':
        player.petActive = !player.petActive;
        this.send(player.ws, {
          type: 'toast',
          text: player.petActive ? 'Mascote Auto-Loot ativado (+5% Vel & +5% Ouro)!' : 'Mascote recolhido.',
          color: player.petActive ? '#4ade80' : '#94a3b8',
        });
        break;
      case 'start_wave_dungeon':
        this.startWaveDungeon(player);
        break;
      case 'craft_item':
        handleCraftItem(player, msg.recipeId, this.callbacks, this.nextId);
        break;
      case 'use_item':
        handleUseItem(player, msg.itemUid, this.callbacks);
        break;
    }
  }

  private handleQuestClaim(player: ServerPlayer, questId: string) {
    const qp = player.quests.find((q) => q.questId === questId);
    const tpl = QUEST_TEMPLATES.find((q) => q.id === questId);
    if (!qp || !tpl || qp.claimed || qp.progress < tpl.requiredCount) return;

    if (tpl.repeatable) {
      qp.progress = 0;
      qp.claimed = false;
    } else {
      qp.claimed = true;
    }
    player.gold += tpl.goldReward;
    grantXpAndLevel(player, tpl.xpReward, this.callbacks);
    syncInventory(player, this.callbacks);
    this.send(player.ws, { type: 'quest_sync', quests: player.quests });
    this.send(player.ws, {
      type: 'toast',
      text: `Recompensa coletada: +${tpl.xpReward} XP e +${tpl.goldReward} Ouro!`,
      color: '#fbbf24',
    });
  }

  private handlePartyAction(player: ServerPlayer, action: 'create' | 'join' | 'leave', partyId?: string) {
    if (action === 'leave') {
      this.leaveParty(player);
      return;
    }
    if (action === 'create') {
      if (player.partyId) this.leaveParty(player);
      const id = this.nextId('party');
      const party: ServerParty = { id, leaderId: player.id, memberIds: new Set([player.id]) };
      this.parties.set(id, party);
      player.partyId = id;
      this.syncParty(party);
      return;
    }
    if (action === 'join' && partyId) {
      const party = this.parties.get(partyId);
      if (!party || party.memberIds.size >= 5) return;
      if (player.partyId) this.leaveParty(player);
      party.memberIds.add(player.id);
      player.partyId = party.id;
      this.syncParty(party);
    }
  }

  private leaveParty(player: ServerPlayer) {
    if (!player.partyId) return;
    const party = this.parties.get(player.partyId);
    player.partyId = null;
    this.send(player.ws, { type: 'party_sync', party: null });
    if (!party) return;

    party.memberIds.delete(player.id);
    if (party.memberIds.size === 0) {
      this.parties.delete(party.id);
      return;
    }
    if (party.leaderId === player.id) {
      party.leaderId = [...party.memberIds][0];
    }
    this.syncParty(party);
  }

  private syncParty(party: ServerParty) {
    const members = [...party.memberIds]
      .map((id) => this.players.get(id))
      .filter((p): p is ServerPlayer => Boolean(p))
      .map((p) => ({
        id: p.id,
        name: p.name,
        level: p.level,
        hp: p.hp,
        maxHp: computePlayerDerived(p).maxHp,
      }));

    const payload: ServerMessage = {
      type: 'party_sync',
      party: { id: party.id, leaderId: party.leaderId, members },
    };
    for (const id of party.memberIds) {
      const p = this.players.get(id);
      if (p) this.send(p.ws, payload);
    }
  }

  public tick(dtSec: number) {
    this.tickCount += 1;
    const now = Date.now();

    // Update players movement & passive regen
    for (const p of this.players.values()) {
      const cls = CLASS_DEFS[p.heroClass];
      const derived = computePlayerDerived(p);
      const d = distance(p, { x: p.targetX, y: p.targetY });
      if (d > 0.05) {
        const step = Math.min(d, cls.moveSpeed * (1 + derived.speedBonus) * dtSec);
        p.x += ((p.targetX - p.x) / d) * step;
        p.y += ((p.targetY - p.y) / d) * step;
      }

      if (this.tickCount % 20 === 0) {
        p.hp = clamp(p.hp + Math.ceil(derived.maxHp * 0.015), 1, derived.maxHp);
        p.mp = clamp(p.mp + Math.ceil(derived.maxMp * 0.03), 0, derived.maxMp);
      }
      if (p.petActive && this.tickCount % 6 === 0) {
        for (const [did, drop] of this.drops.entries()) {
          if (drop.mapId === p.mapId && distance(p, drop) <= 6.5) {
            handlePickupDrop(p, did, this.drops, this.callbacks, this.nextId);
          }
        }
      }
      if (this.tickCount % 100 === 0) {
        this.db.savePlayer(p);
      }
    }

    // Check Wave Dungeon progression
    for (const [pid, run] of this.waveRuns.entries()) {
      const p = this.players.get(pid);
      if (!p) {
        for (const mid of run.monsterIds) this.monsters.delete(mid);
        this.waveRuns.delete(pid);
        continue;
      }
      const aliveCount = run.monsterIds.filter((mid) => this.monsters.get(mid)?.alive).length;
      if (aliveCount === 0) {
        for (const mid of run.monsterIds) this.monsters.delete(mid);
        if (run.wave >= run.maxWaves) {
          this.waveRuns.delete(pid);
          p.gold += 300;
          p.dust += 15;
          const rewardPool = ['staff_astral', 'armor_astral', 'ring_legend', 'cloak_seraph', 'mount_lava', 'amulet_magma'];
          const rId = rewardPool[Math.floor(Math.random() * rewardPool.length)];
          const rTpl = ITEM_TEMPLATES[rId];
          let rewardMsg = '';
          if (rTpl) {
            if (p.inventory.length < 36) {
              p.inventory.push({ uid: this.nextId('item'), templateId: rId, quantity: 1, affixes: rollItemAffixes(rTpl) });
              rewardMsg = ` + ${rTpl.name}!`;
            } else {
              const dropId = this.nextId('drop');
              this.drops.set(dropId, { id: dropId, mapId: p.mapId, templateId: rId, x: p.x, y: p.y, rarity: rTpl.rarity, expiresAt: Date.now() + 60000 });
              rewardMsg = ` + ${rTpl.name} (no chão)!`;
            }
          }
          unlockAchievement(p, 'wave_conqueror', this.callbacks);
          syncInventory(p, this.callbacks);
          this.send(p.ws, { type: 'wave_state', wave: { active: false, wave: run.maxWaves, maxWaves: run.maxWaves, remaining: 0 } });
          this.send(p.ws, { type: 'toast', text: `Masmorra Concluída! +300g, +15p${rewardMsg}`, color: '#fbbf24' });
        } else {
          run.wave += 1;
          run.monsterIds = this.spawnWaveMonsters(p, run.wave);
          this.send(p.ws, { type: 'wave_state', wave: { active: true, wave: run.wave, maxWaves: run.maxWaves, remaining: run.monsterIds.length } });
          this.send(p.ws, { type: 'toast', text: `Onda ${run.wave}/${run.maxWaves} iniciada!`, color: '#60a5fa' });
        }
      } else if (this.tickCount % 5 === 0) {
        this.send(p.ws, { type: 'wave_state', wave: { active: true, wave: run.wave, maxWaves: run.maxWaves, remaining: aliveCount } });
      }
    }

    // Update monsters AI
    for (const m of this.monsters.values()) {
      const tpl = MONSTER_TEMPLATES[m.templateId];
      if (!m.alive) {
        if (now >= m.respawnAt) {
          m.alive = true;
          m.hp = m.maxHp;
          m.x = m.spawnX;
          m.y = m.spawnY;
          m.targetPlayerId = null;
        }
        continue;
      }

      // Find or validate aggro target
      let target = m.targetPlayerId ? this.players.get(m.targetPlayerId) : undefined;
      if (
        target &&
        (target.mapId !== m.mapId ||
          distance(target, m) > tpl.aggroRange * 2.2 ||
          distance(target, MAPS[target.mapId].spawn) < 4.5)
      ) {
        target = undefined;
        m.targetPlayerId = null;
      }

      if (!target) {
        let bestDist = tpl.aggroRange;
        for (const p of this.players.values()) {
          if (p.mapId !== m.mapId) continue;
          if (distance(p, MAPS[p.mapId].spawn) < 4.5) continue;
          const d = distance(p, m);
          if (d <= bestDist) {
            bestDist = d;
            target = p;
          }
        }
        m.targetPlayerId = target?.id ?? null;
      }

      if (target) {
        const d = distance(m, target);
        if (d > 1.35) {
          const step = Math.min(d - 1.2, tpl.speed * dtSec);
          if (step > 0) {
            m.x += ((target.x - m.x) / d) * step;
            m.y += ((target.y - m.y) / d) * step;
          }
        } else if (now - m.lastAttackAt >= 1350) {
          m.lastAttackAt = now;
          const derived = computePlayerDerived(target);
          const dmg = Math.max(2, Math.floor(tpl.atk - derived.def * 0.45));
          target.hp -= dmg;
          if (derived.thornsPct > 0 && m.alive) {
            const refl = Math.max(2, Math.floor(dmg * derived.thornsPct));
            m.hp = Math.max(1, m.hp - refl);
          }
          if (target.hp <= 0) {
            target.hp = derived.maxHp;
            target.mp = derived.maxMp;
            target.x = SAFE_SPAWN.x;
            target.y = SAFE_SPAWN.y;
            target.targetX = SAFE_SPAWN.x;
            target.targetY = SAFE_SPAWN.y;
            m.targetPlayerId = null;
            this.send(target.ws, {
              type: 'toast',
              text: 'Você caiu em combate e retornou ao ponto seguro!',
              color: '#f87171',
            });
          }
        }
      } else {
        // Return smoothly to spawn if drifted
        const dSpawn = distance(m, { x: m.spawnX, y: m.spawnY });
        if (dSpawn > 0.3) {
          const step = Math.min(dSpawn, tpl.speed * 0.6 * dtSec);
          m.x += ((m.spawnX - m.x) / dSpawn) * step;
          m.y += ((m.spawnY - m.y) / dSpawn) * step;
        }
      }
    }

    // Expire old drops
    for (const [id, d] of this.drops.entries()) {
      if (now >= d.expiresAt) this.drops.delete(id);
    }

    // Broadcast AOI snapshots
    for (const p of this.players.values()) {
      this.sendAOISnapshot(p);
    }
  }

  private isInAOI(ax: number, ay: number, bx: number, by: number): boolean {
    const cxA = Math.floor(ax / AOI_CHUNK_SIZE);
    const cyA = Math.floor(ay / AOI_CHUNK_SIZE);
    const cxB = Math.floor(bx / AOI_CHUNK_SIZE);
    const cyB = Math.floor(by / AOI_CHUNK_SIZE);
    return Math.abs(cxA - cxB) <= 1 && Math.abs(cyA - cyB) <= 1;
  }

  private sendAOISnapshot(viewer: ServerPlayer) {
    const players: PlayerSnapshot[] = [];
    for (const p of this.players.values()) {
      if (p.mapId !== viewer.mapId || !this.isInAOI(viewer.x, viewer.y, p.x, p.y)) continue;
      players.push({
        id: p.id,
        name: p.name,
        heroClass: p.heroClass,
        level: p.level,
        x: Number(p.x.toFixed(2)),
        y: Number(p.y.toFixed(2)),
        hp: p.hp,
        maxHp: computePlayerDerived(p).maxHp,
        partyId: p.partyId,
        rebirths: p.rebirths,
      });
    }

    const monsters: MonsterSnapshot[] = [];
    for (const m of this.monsters.values()) {
      if (m.mapId !== viewer.mapId || !m.alive || !this.isInAOI(viewer.x, viewer.y, m.x, m.y)) continue;
      const tpl = MONSTER_TEMPLATES[m.templateId];
      monsters.push({
        id: m.id,
        templateId: m.templateId,
        name: tpl.name,
        level: tpl.level,
        x: Number(m.x.toFixed(2)),
        y: Number(m.y.toFixed(2)),
        hp: m.hp,
        maxHp: m.maxHp,
        isBoss: tpl.isBoss,
      });
    }

    const drops: DropSnapshot[] = [];
    for (const d of this.drops.values()) {
      if (d.mapId !== viewer.mapId || !this.isInAOI(viewer.x, viewer.y, d.x, d.y)) continue;
      drops.push({
        id: d.id,
        templateId: d.templateId,
        x: Number(d.x.toFixed(2)),
        y: Number(d.y.toFixed(2)),
        rarity: d.rarity,
        goldAmount: d.goldAmount,
      });
    }

    this.send(viewer.ws, {
      type: 'snapshot',
      tick: this.tickCount,
      players,
      monsters,
      drops,
      vitals: this.buildVitals(viewer),
    });
  }

  private buildVitals(p: ServerPlayer): SelfVitals {
    const d = computePlayerDerived(p);
    return {
      level: p.level,
      rebirths: p.rebirths,
      xp: p.xp,
      xpNext: xpForNextLevel(p.level),
      hp: p.hp,
      maxHp: d.maxHp,
      mp: p.mp,
      maxMp: d.maxMp,
      atk: d.atk,
      def: d.def,
      cp: d.cp,
      statPoints: p.statPoints,
      stats: { ...p.stats },
      gold: p.gold,
      dust: p.dust,
      lastAckSeq: p.lastAckSeq,
      passives: p.passives,
      paragon: p.paragon,
      skillPoints: getSkillPointsAvailable(p.level, p.passives),
      paragonPoints: getParagonPointsAvailable(p.level, p.rebirths, p.paragon),
      advStats: {
        critChance: Number((0.14 + p.stats.agi * 0.005 + d.critBonus).toFixed(3)),
        critDmg: Number(d.critDmg.toFixed(2)),
        lifesteal: Number(d.lifesteal.toFixed(3)),
        cdr: Number(d.cdr.toFixed(3)),
        bossDmg: Number(d.bossDmg.toFixed(3)),
        speedBonus: Number(d.speedBonus.toFixed(3)),
        thornsPct: Number(d.thornsPct.toFixed(3)),
        xpBonus: Number(d.xpBonus.toFixed(3)),
        goldBonus: Number(d.goldBonus.toFixed(3)),
      },
      achievements: p.achievements ?? [],
      activeTitle: p.activeTitle ?? '',
      petActive: p.petActive ?? false,
      buffs: (p.buffs ?? []).filter((b) => b.expiresAt > Date.now()),
    };
  }

  private startWaveDungeon(player: ServerPlayer) {
    if (this.waveRuns.has(player.id)) {
      this.send(player.ws, { type: 'toast', text: 'Você já está em uma Masmorra de Ondas!', color: '#f59e0b' });
      return;
    }
    const maxWaves = 5;
    const monsterIds = this.spawnWaveMonsters(player, 1);
    this.waveRuns.set(player.id, { wave: 1, maxWaves, monsterIds });
    this.send(player.ws, { type: 'wave_state', wave: { active: true, wave: 1, maxWaves, remaining: monsterIds.length } });
    this.send(player.ws, { type: 'toast', text: 'Masmorra de Ondas iniciada! Onda 1/5!', color: '#60a5fa' });
  }

  private spawnWaveMonsters(player: ServerPlayer, wave: number): string[] {
    const ids: string[] = [];
    const count = wave === 5 ? 1 : 2 + wave;
    const tplId = wave === 5 ? (player.level >= 40 ? 'boss_golem' : 'ancient_lich') : player.level >= 25 ? 'orc_shaman' : player.level >= 10 ? 'orc' : 'wolf';
    const tpl = MONSTER_TEMPLATES[tplId] ?? MONSTER_TEMPLATES.wolf;
    for (let i = 0; i < count; i++) {
      const ang = (i / Math.max(1, count)) * Math.PI * 2;
      const sx = clamp(player.x + Math.cos(ang) * 4.5, 2, MAP_SIZE - 2);
      const sy = clamp(player.y + Math.sin(ang) * 4.5, 2, MAP_SIZE - 2);
      const id = this.nextId('wave');
      this.monsters.set(id, {
        id,
        mapId: player.mapId,
        templateId: tplId,
        spawnX: sx,
        spawnY: sy,
        x: sx,
        y: sy,
        hp: tpl.maxHp,
        maxHp: tpl.maxHp,
        alive: true,
        respawnAt: Number.MAX_SAFE_INTEGER,
        lastAttackAt: 0,
        targetPlayerId: player.id,
      });
      ids.push(id);
    }
    return ids;
  }

  private broadcastAOI(mapId: MapId, x: number, y: number, msg: ServerMessage) {
    for (const p of this.players.values()) {
      if (p.mapId === mapId && this.isInAOI(x, y, p.x, p.y)) {
        this.send(p.ws, msg);
      }
    }
  }

  private broadcastChat(channel: 'map' | 'party' | 'global' | 'system', senderName: string, text: string) {
    const msg: ServerMessage = {
      type: 'chat_msg',
      id: this.nextId('chat'),
      channel,
      senderName,
      text,
      timestamp: Date.now(),
    };
    for (const p of this.players.values()) {
      this.send(p.ws, msg);
    }
  }

  private send(ws: WebSocket, msg: ServerMessage) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  // ===== ADMIN OPERATIONS =====
  public adminUpdateSettings(partial: Partial<ServerSettings>, actor: string) {
    this.db.updateSettings(partial, actor);
    this.settings = this.db.getSettings();
    this.broadcastChat(
      'system',
      'Admin',
      `Configuração atualizada: XP ${this.settings.xpRate}x | Drop ${this.settings.dropRate}x${this.settings.maintenanceMode ? ' | MANUTENÇÃO ATIVA' : ''}`
    );
  }

  public adminBroadcast(text: string, actor: string) {
    const clean = text.trim().slice(0, 140);
    if (!clean) return;
    this.db.logAudit(actor, 'broadcast', 'global', clean);
    this.broadcastChat('global', '[ANÚNCIO]', clean);
    for (const p of this.players.values()) {
      this.send(p.ws, { type: 'toast', text: `[ANÚNCIO] ${clean}`, color: '#fbbf24' });
    }
  }

  public adminGiveReward(charName: string, gold: number, xp: number, actor: string): boolean {
    const target = [...this.players.values()].find((p) => p.name.toLowerCase() === charName.toLowerCase());
    if (!target) return false;
    if (gold > 0) target.gold += gold;
    if (xp > 0) grantXpAndLevel(target, xp, this.callbacks);
    syncInventory(target, this.callbacks);
    this.db.savePlayer(target);
    this.db.logAudit(actor, 'give_reward', target.name, `+${gold} Ouro, +${xp} XP`);
    this.send(target.ws, { type: 'toast', text: `Admin enviou: +${gold} Ouro, +${xp} XP!`, color: '#4ade80' });
    return true;
  }

  public adminKickPlayer(playerId: string, actor: string): boolean {
    const target = this.players.get(playerId);
    if (!target) return false;
    this.db.logAudit(actor, 'kick', target.name, 'Desconectado pelo Admin');
    this.send(target.ws, { type: 'toast', text: 'Você foi desconectado pelo Administrador.', color: '#f87171' });
    target.ws.close(4003, 'Kicked by admin');
    return true;
  }

  public adminRespawnBoss(actor: string) {
    for (const m of this.monsters.values()) {
      if (MONSTER_TEMPLATES[m.templateId]?.isBoss) {
        m.alive = true;
        m.hp = m.maxHp;
        m.x = m.spawnX;
        m.y = m.spawnY;
        m.targetPlayerId = null;
      }
    }
    this.db.logAudit(actor, 'respawn_boss', 'boss_golem', 'Respawn forçado');
    this.broadcastChat('system', 'Evento', 'O Golem Ancestral despertou na Arena!');
  }

  public adminSaveAll(actor: string) {
    for (const p of this.players.values()) {
      this.db.savePlayer(p);
    }
    this.db.logAudit(actor, 'save_all', 'world', `${this.players.size} jogadores salvos`);
  }
}
