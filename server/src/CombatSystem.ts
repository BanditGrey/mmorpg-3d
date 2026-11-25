import {
  ACHIEVEMENTS,
  CLASS_DEFS,
  CRAFT_RECIPES,
  ITEM_TEMPLATES,
  MAX_UPGRADE_LEVEL,
  MONSTER_TEMPLATES,
  PARAGON_NODES,
  PASSIVE_DEFS,
  QUEST_TEMPLATES,
  RARITY_META,
  REBIRTH_MIN_LEVEL,
  SHOP_OFFERS,
  SKILLS,
  clamp,
  distance,
  getActiveWorldEvent,
  getItemStatMult,
  getParagonPointsAvailable,
  getSkillPointsAvailable,
  isParagonNodeUnlockable,
  rollItemAffixes,
  upgradeCost,
  upgradeMultiplier,
  xpForNextLevel,
  type EquipSlot,
  type Rarity,
  type ServerMessage,
} from '@mmorpg/shared';
import type { MapId } from '@mmorpg/shared';
import type { ServerDrop, ServerMonster, ServerPlayer } from './types.js';

export interface WorldCallbacks {
  send: (player: ServerPlayer, msg: ServerMessage) => void;
  broadcastAOI: (mapId: MapId, x: number, y: number, msg: ServerMessage) => void;
}

export function computePlayerDerived(player: ServerPlayer) {
  const cls = CLASS_DEFS[player.heroClass];
  let equipAtk = 0;
  let equipDef = 0;
  let equipHp = 0;
  let equipMp = 0;
  let critBonus = 0;
  let speedBonus = 0;
  let eqLifesteal = 0;
  let eqCritDmg = 0;
  let eqCdr = 0;
  let eqBossDmg = 0;
  let thornsPct = 0;
  let procLightning = 0;
  let xpBonus = 0;
  let goldBonus = 0;

  for (const item of Object.values(player.equipment)) {
    if (!item) continue;
    const tpl = ITEM_TEMPLATES[item.templateId];
    if (!tpl) continue;
    const mult = getItemStatMult(tpl.rarity, item.upgradeLevel ?? 0);
    const af = item.affixes ?? {};
    equipAtk += Math.round((tpl.atkBonus ?? 0) * mult) + (af.atk ?? 0);
    equipDef += Math.round((tpl.defBonus ?? 0) * mult) + (af.def ?? 0);
    equipHp += Math.round((tpl.hpBonus ?? 0) * mult) + (af.hp ?? 0);
    equipMp += Math.round((tpl.mpBonus ?? 0) * mult) + (af.mp ?? 0);
    critBonus += (tpl.critBonus ?? 0) + (af.critChance ?? 0);
    speedBonus += (tpl.speedBonus ?? 0) + (af.speed ?? 0);
    eqLifesteal += (tpl.lifestealBonus ?? 0) + (af.lifesteal ?? 0);
    eqCritDmg += (tpl.critDmgBonus ?? 0) + (af.critDmg ?? 0);
    eqCdr += (tpl.cdrBonus ?? 0) + (af.cdr ?? 0);
    eqBossDmg += (tpl.bossDmgBonus ?? 0) + (af.bossDmg ?? 0);
    thornsPct += (tpl.thornsPct ?? 0) + (af.thorns ?? 0);
    xpBonus += af.xpBonus ?? 0;
    goldBonus += af.goldBonus ?? 0;
    procLightning = Math.max(procLightning, tpl.procLightning ?? 0);
  }

  const build = { atkPct: 0, defPct: 0, hpPct: 0, mpPct: 0, critChance: 0, critDmg: 0, lifesteal: 0, cdr: 0, bossDmg: 0 };
  for (const [pid, rank] of Object.entries(player.passives ?? {})) {
    if (!rank) continue;
    const def = PASSIVE_DEFS.find((d) => d.id === pid);
    if (!def) continue;
    build.atkPct += (def.perRank.atkPct ?? 0) * rank;
    build.defPct += (def.perRank.defPct ?? 0) * rank;
    build.hpPct += (def.perRank.hpPct ?? 0) * rank;
    build.mpPct += (def.perRank.mpPct ?? 0) * rank;
    build.critChance += (def.perRank.critChance ?? 0) * rank;
    build.critDmg += (def.perRank.critDmg ?? 0) * rank;
    build.lifesteal += (def.perRank.lifesteal ?? 0) * rank;
    build.cdr += (def.perRank.cdr ?? 0) * rank;
    build.bossDmg += (def.perRank.bossDmg ?? 0) * rank;
  }
  for (const nid of player.paragon ?? ['2_2']) {
    const node = PARAGON_NODES.find((n) => n.id === nid);
    if (!node) continue;
    build.atkPct += node.bonus.atkPct ?? 0;
    build.defPct += node.bonus.defPct ?? 0;
    build.hpPct += node.bonus.hpPct ?? 0;
    build.mpPct += node.bonus.mpPct ?? 0;
    build.critChance += node.bonus.critChance ?? 0;
    build.critDmg += node.bonus.critDmg ?? 0;
    build.lifesteal += node.bonus.lifesteal ?? 0;
    build.cdr += node.bonus.cdr ?? 0;
    build.bossDmg += node.bonus.bossDmg ?? 0;
  }
  for (const aid of player.achievements ?? []) {
    const ach = ACHIEVEMENTS.find((a) => a.id === aid);
    if (!ach) continue;
    build.atkPct += ach.bonus.atkPct ?? 0;
    build.defPct += ach.bonus.defPct ?? 0;
    build.hpPct += ach.bonus.hpPct ?? 0;
    build.critChance += ach.bonus.critChance ?? 0;
    build.bossDmg += ach.bonus.bossDmg ?? 0;
    xpBonus += ach.bonus.xpBonus ?? 0;
    goldBonus += ach.bonus.goldBonus ?? 0;
  }
  if (player.petActive) {
    speedBonus += 0.05;
    goldBonus += 0.05;
  }
  const now = Date.now();
  for (const b of player.buffs ?? []) {
    if (b.expiresAt <= now) continue;
    build.atkPct += b.atkPct ?? 0;
    build.critChance += b.critChance ?? 0;
    build.critDmg += b.critDmg ?? 0;
    xpBonus += b.xpBonus ?? 0;
    goldBonus += b.goldBonus ?? 0;
  }

  const rbMult = 1 + (player.rebirths ?? 0) * 0.15;
  const maxHp = Math.floor((cls.baseHp + (player.level - 1) * 26 + player.stats.vit * 14 + equipHp) * rbMult * (1 + build.hpPct));
  const maxMp = Math.floor((cls.baseMp + (player.level - 1) * 12 + player.stats.int * 10 + equipMp) * rbMult * (1 + build.mpPct));
  const atk = (cls.baseAtk + (player.level - 1) * 4 + player.stats.str * 3 + (player.heroClass === 'mage' ? player.stats.int * 3 : 0) + equipAtk) * rbMult * (1 + build.atkPct);
  const def = (cls.baseDef + (player.level - 1) * 2 + player.stats.vit * 1.5 + player.stats.agi * 1 + equipDef) * rbMult * (1 + build.defPct);
  const totalCritChance = critBonus + build.critChance;
  const totalBossDmg = build.bossDmg + eqBossDmg;
  const totalCritDmg = 1.65 + build.critDmg + eqCritDmg;
  const totalLifesteal = build.lifesteal + eqLifesteal;
  const totalCdr = Math.min(0.55, build.cdr + eqCdr);
  const cp = Math.floor(maxHp * 0.4 + maxMp * 0.2 + atk * 4.5 + def * 3.2 + totalCritChance * 500 + totalBossDmg * 400);

  return {
    maxHp,
    maxMp,
    atk: Math.floor(atk),
    def: Math.floor(def),
    cp,
    critBonus: totalCritChance,
    critDmg: totalCritDmg,
    lifesteal: totalLifesteal,
    cdr: totalCdr,
    bossDmg: totalBossDmg,
    speedBonus,
    thornsPct,
    procLightning,
    xpBonus,
    goldBonus,
  };
}

export function grantXpAndLevel(player: ServerPlayer, amount: number, cb: WorldCallbacks) {
  player.xp += amount;
  let leveled = false;
  while (player.xp >= xpForNextLevel(player.level)) {
    player.xp -= xpForNextLevel(player.level);
    player.level += 1;
    player.statPoints += 4;
    leveled = true;
  }
  if (leveled) {
    const derived = computePlayerDerived(player);
    player.hp = derived.maxHp;
    player.mp = derived.maxMp;
    cb.send(player, {
      type: 'toast',
      text: `Level Up! Você alcançou o Nível ${player.level} (+4 Pontos)`,
      color: '#fbbf24',
    });
  }
}

export function handleCastSkill(
  player: ServerPlayer,
  skillId: string,
  targetId: string | undefined,
  monsters: Map<string, ServerMonster>,
  drops: Map<string, ServerDrop>,
  players: Map<string, ServerPlayer>,
  cb: WorldCallbacks,
  nextId: (prefix: string) => string,
  xpRate = 1,
  dropRate = 1
) {
  const skill = SKILLS.find((s) => s.id === skillId && s.heroClass === player.heroClass);
  if (!skill) return;

  const now = Date.now();
  const readyAt = player.skillCooldowns[skill.id] ?? 0;
  if (now < readyAt) return;
  if (player.mp < skill.mpCost) return;

  const primary = targetId ? monsters.get(targetId) : findNearestMonster(player, monsters, skill.range);
  if (!primary || !primary.alive || primary.mapId !== player.mapId) return;

  const dist = distance(player, primary);
  if (dist > skill.range + 0.6) return;

  const derived = computePlayerDerived(player);
  player.mp -= skill.mpCost;
  player.skillCooldowns[skill.id] = now + Math.floor(skill.cooldownMs * (1 - derived.cdr));
  const targets: ServerMonster[] = [primary];

  if (skill.aoeRadius > 0) {
    for (const m of monsters.values()) {
      if (m.id === primary.id || !m.alive || m.mapId !== player.mapId) continue;
      if (distance(primary, m) <= skill.aoeRadius) {
        targets.push(m);
      }
    }
  }

  for (const m of targets) {
    const tpl = MONSTER_TEMPLATES[m.templateId];
    const isCrit = Math.random() < 0.14 + player.stats.agi * 0.005 + derived.critBonus;
    const bossMult = tpl.isBoss ? 1 + derived.bossDmg : 1.0;
    const raw = derived.atk * skill.damageMult * (isCrit ? derived.critDmg : 1.0) * bossMult - tpl.def * 0.5;
    const lightningMult = derived.procLightning > 0 && Math.random() < derived.procLightning ? 1.35 : 1.0;
    const damage = Math.max(4, Math.floor(raw * lightningMult * (0.92 + Math.random() * 0.16)));

    if (derived.lifesteal > 0) {
      player.hp = clamp(player.hp + Math.max(1, Math.floor(damage * derived.lifesteal)), 0, derived.maxHp);
    }

    m.hp = Math.max(0, m.hp - damage);
    if (!m.targetPlayerId) m.targetPlayerId = player.id;

    const killed = m.hp <= 0;
    cb.broadcastAOI(m.mapId, m.x, m.y, {
      type: 'combat_event',
      attackerId: player.id,
      targetId: m.id,
      skillId: skill.id,
      damage,
      isCrit,
      targetX: m.x,
      targetY: m.y,
      killed,
    });

    if (killed) {
      onMonsterKilled(player, m, drops, players, cb, nextId, xpRate, dropRate);
    }
  }
}

function findNearestMonster(player: ServerPlayer, monsters: Map<string, ServerMonster>, maxDist: number): ServerMonster | undefined {
  let best: ServerMonster | undefined;
  let bestD = maxDist;
  for (const m of monsters.values()) {
    if (!m.alive || m.mapId !== player.mapId) continue;
    const d = distance(player, m);
    if (d <= bestD) {
      bestD = d;
      best = m;
    }
  }
  return best;
}

export function unlockAchievement(player: ServerPlayer, achId: string, cb: WorldCallbacks) {
  player.achievements = player.achievements ?? [];
  if (player.achievements.includes(achId)) return;
  const def = ACHIEVEMENTS.find((a) => a.id === achId);
  if (!def) return;
  player.achievements.push(achId);
  if (!player.activeTitle) player.activeTitle = def.title;
  cb.send(player, {
    type: 'toast',
    text: `Conquista desbloqueada: ${def.title} (${def.bonusText})!`,
    color: '#fbbf24',
  });
}

function onMonsterKilled(
  killer: ServerPlayer,
  m: ServerMonster,
  drops: Map<string, ServerDrop>,
  players: Map<string, ServerPlayer>,
  cb: WorldCallbacks,
  nextId: (prefix: string) => string,
  xpRate = 1,
  dropRate = 1
) {
  const tpl = MONSTER_TEMPLATES[m.templateId];
  m.alive = false;
  m.targetPlayerId = null;
  m.respawnAt = Date.now() + tpl.respawnMs;
  killer.killsCount = (killer.killsCount ?? 0) + 1;
  if (killer.killsCount >= 10) unlockAchievement(killer, 'first_blood', cb);
  if (tpl.isBoss) unlockAchievement(killer, 'boss_slayer', cb);
  if (killer.gold >= 5000) unlockAchievement(killer, 'rich_hero', cb);

  const ev = getActiveWorldEvent();
  const kd = computePlayerDerived(killer);
  const baseXp = Math.max(1, Math.floor(tpl.xpReward * xpRate * ev.xpMult * (1 + kd.xpBonus)));
  // Award XP (shared if in party on same map)
  if (killer.partyId) {
    const partyMembers = [...players.values()].filter((p) => p.partyId === killer.partyId && p.mapId === killer.mapId);
    const share = Math.max(1, Math.floor((baseXp * 1.15) / partyMembers.length));
    for (const member of partyMembers) {
      grantXpAndLevel(member, share, cb);
      advanceQuest(member, m.templateId, cb);
    }
  } else {
    grantXpAndLevel(killer, baseXp, cb);
    advanceQuest(killer, m.templateId, cb);
  }

  // Spawn gold drop
  const rawGold = tpl.goldMin + Math.floor(Math.random() * (tpl.goldMax - tpl.goldMin + 1));
  const goldAmt = Math.floor(rawGold * ev.goldMult * (1 + kd.goldBonus));
  const goldId = nextId('drop');
  drops.set(goldId, {
    id: goldId,
    mapId: m.mapId,
    templateId: 'gold',
    x: m.x + (Math.random() - 0.5) * 0.7,
    y: m.y + (Math.random() - 0.5) * 0.7,
    rarity: 'common',
    goldAmount: goldAmt,
    expiresAt: Date.now() + 45000,
  });

  // Chance to drop item (scaled by server dropRate & active world event)
  const roll = Math.random();
  let dropTplId: string | null = null;
  const pool = tpl.dropPool && tpl.dropPool.length > 0 ? tpl.dropPool : ['pot_hp_small'];
  if (tpl.isBoss) {
    dropTplId = pool[Math.floor(Math.random() * pool.length)];
  } else if (roll < Math.min(0.95, 0.38 * dropRate * ev.dropMult)) {
    dropTplId = pool[Math.floor(Math.random() * pool.length)];
  }

  if (dropTplId) {
    const itemTpl = ITEM_TEMPLATES[dropTplId];
    const dId = nextId('drop');
    drops.set(dId, {
      id: dId,
      mapId: m.mapId,
      templateId: dropTplId,
      x: m.x + (Math.random() - 0.5) * 0.9,
      y: m.y + (Math.random() - 0.5) * 0.9,
      rarity: itemTpl.rarity,
      expiresAt: Date.now() + 45000,
    });
  }

  // Material drop for Crafting
  let matId: string | null = null;
  if (tpl.isBoss && tpl.level >= 50) matId = 'mat_shard';
  else if (tpl.isBoss) matId = 'mat_core';
  else if (Math.random() < 0.45) matId = tpl.level >= 4 ? 'mat_fang' : 'mat_essence';
  if (matId) {
    const mTpl = ITEM_TEMPLATES[matId];
    const mDropId = nextId('drop');
    drops.set(mDropId, {
      id: mDropId,
      mapId: m.mapId,
      templateId: matId,
      x: m.x + (Math.random() - 0.5) * 0.8,
      y: m.y + (Math.random() - 0.5) * 0.8,
      rarity: mTpl.rarity,
      expiresAt: Date.now() + 45000,
    });
  }
}

function advanceQuest(player: ServerPlayer, monsterTemplateId: string, cb: WorldCallbacks) {
  let changed = false;
  for (const qp of player.quests) {
    if (qp.claimed) continue;
    const tpl = QUEST_TEMPLATES.find((q) => q.id === qp.questId);
    if (!tpl || tpl.targetMonsterId !== monsterTemplateId) continue;
    if (qp.progress < tpl.requiredCount) {
      qp.progress += 1;
      changed = true;
      if (qp.progress === tpl.requiredCount) {
        cb.send(player, {
          type: 'toast',
          text: `Quest concluída: ${tpl.title}!`,
          color: '#4ade80',
        });
      }
    }
  }
  if (changed) {
    cb.send(player, { type: 'quest_sync', quests: player.quests });
  }
}

export function handleUsePotion(player: ServerPlayer, kind: 'hp' | 'mp', cb: WorldCallbacks) {
  const now = Date.now();
  if (now - player.lastPotionAt < 900) return;

  const order = kind === 'hp'
    ? ['pot_hp_mythic', 'pot_hp_large', 'pot_hp_med', 'pot_hp_small']
    : ['pot_mp_mythic', 'pot_mp_large', 'pot_mp_med', 'pot_mp_small'];
  let idx = -1;
  let tplId = order[order.length - 1];
  for (const id of order) {
    const found = player.inventory.findIndex((i) => i.templateId === id && i.quantity > 0);
    if (found !== -1) {
      idx = found;
      tplId = id;
      break;
    }
  }
  if (idx === -1) return;

  const derived = computePlayerDerived(player);
  const tpl = ITEM_TEMPLATES[tplId];
  const amount = tpl.restoreAmount ?? 80;

  if (kind === 'hp') {
    if (player.hp >= derived.maxHp) return;
    player.hp = clamp(player.hp + amount, 0, derived.maxHp);
  } else {
    if (player.mp >= derived.maxMp) return;
    player.mp = clamp(player.mp + amount, 0, derived.maxMp);
  }

  player.lastPotionAt = now;
  player.inventory[idx].quantity -= 1;
  if (player.inventory[idx].quantity <= 0) {
    player.inventory.splice(idx, 1);
  }

  syncInventory(player, cb);
}

export function handlePickupDrop(
  player: ServerPlayer,
  dropId: string,
  drops: Map<string, ServerDrop>,
  cb: WorldCallbacks,
  nextId: (prefix: string) => string
) {
  const drop = drops.get(dropId);
  if (!drop || drop.mapId !== player.mapId) return;
  if (distance(player, drop) > 2.4) return;

  drops.delete(dropId);

  if (drop.templateId === 'gold') {
    player.gold += drop.goldAmount ?? 10;
    syncInventory(player, cb);
    return;
  }

  const tpl = ITEM_TEMPLATES[drop.templateId];
  if (!tpl) return;

  if (tpl.kind !== 'equip') {
    const existing = player.inventory.find((i) => i.templateId === tpl.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      player.inventory.push({ uid: nextId('item'), templateId: tpl.id, quantity: 1, affixes: rollItemAffixes(tpl) });
    }
  } else {
    if (player.inventory.length >= 36) {
      cb.send(player, { type: 'toast', text: 'Bolsa cheia! Recicle itens.', color: '#f87171' });
      return;
    }
    player.inventory.push({ uid: nextId('item'), templateId: tpl.id, quantity: 1, affixes: rollItemAffixes(tpl) });
    if (RARITY_META[tpl.rarity].order >= 2) {
      cb.send(player, {
        type: 'toast',
        text: `Drop ${RARITY_META[tpl.rarity].label}: ${tpl.name}!`,
        color: RARITY_META[tpl.rarity].color,
      });
    }
  }

  syncInventory(player, cb);
}

export function handleEquipItem(player: ServerPlayer, itemUid: string, cb: WorldCallbacks) {
  const idx = player.inventory.findIndex((i) => i.uid === itemUid);
  if (idx === -1) return;
  const item = player.inventory[idx];
  const tpl = ITEM_TEMPLATES[item.templateId];
  if (!tpl || tpl.kind !== 'equip' || !tpl.slot) return;

  let targetSlot: EquipSlot = tpl.slot;
  if (targetSlot === 'ring' && player.equipment.ring && !player.equipment.ring2) {
    targetSlot = 'ring2';
  }
  const previous = player.equipment[targetSlot];
  player.inventory.splice(idx, 1);
  if (previous) {
    player.inventory.push(previous);
  }
  player.equipment[targetSlot] = item;

  const derived = computePlayerDerived(player);
  player.hp = Math.min(player.hp, derived.maxHp);
  player.mp = Math.min(player.mp, derived.maxMp);

  syncInventory(player, cb);
}

export function handleRecycleItems(player: ServerPlayer, rarities: Rarity[], cb: WorldCallbacks) {
  const set = new Set(rarities);
  let count = 0;
  let gainedGold = 0;
  let gainedDust = 0;

  player.inventory = player.inventory.filter((item) => {
    const tpl = ITEM_TEMPLATES[item.templateId];
    if (!tpl || tpl.kind !== 'equip' || !set.has(tpl.rarity)) return true;
    const mult = RARITY_META[tpl.rarity].order + 1;
    gainedGold += 12 * mult;
    gainedDust += 3 * mult;
    count += 1;
    return false;
  });

  if (count > 0) {
    player.gold += gainedGold;
    player.dust += gainedDust;
    cb.send(player, {
      type: 'toast',
      text: `Reciclados ${count} itens (+${gainedGold} Ouro, +${gainedDust} Pó)`,
      color: '#4ade80',
    });
    syncInventory(player, cb);
  }
}

export function handleBuyItem(
  player: ServerPlayer,
  templateId: string,
  quantity: number,
  cb: WorldCallbacks,
  nextId: (prefix: string) => string
) {
  const offer = SHOP_OFFERS.find((o) => o.templateId === templateId);
  const tpl = ITEM_TEMPLATES[templateId];
  if (!offer || !tpl) return;

  const qty = tpl.kind === 'equip' ? 1 : clamp(Math.floor(quantity || 1), 1, 20);
  const totalGold = offer.goldCost * qty;
  const totalDust = offer.dustCost * qty;

  if (player.gold < totalGold || player.dust < totalDust) {
    cb.send(player, { type: 'toast', text: 'Recursos insuficientes!', color: '#f87171' });
    return;
  }

  if (tpl.kind === 'equip') {
    if (player.inventory.length >= 36) {
      cb.send(player, { type: 'toast', text: 'Bolsa cheia!', color: '#f87171' });
      return;
    }
    player.inventory.push({ uid: nextId('item'), templateId: tpl.id, quantity: 1, affixes: rollItemAffixes(tpl) });
  } else {
    const existing = player.inventory.find((i) => i.templateId === tpl.id);
    if (existing) {
      existing.quantity += qty;
    } else {
      if (player.inventory.length >= 36) {
        cb.send(player, { type: 'toast', text: 'Bolsa cheia!', color: '#f87171' });
        return;
      }
      player.inventory.push({ uid: nextId('item'), templateId: tpl.id, quantity: qty });
    }
  }

  player.gold -= totalGold;
  player.dust -= totalDust;
  cb.send(player, { type: 'toast', text: `Comprado: ${tpl.name} x${qty}`, color: '#4ade80' });
  syncInventory(player, cb);
}

export function handleUpgradeItem(player: ServerPlayer, slot: EquipSlot, cb: WorldCallbacks) {
  const item = player.equipment[slot];
  if (!item) return;
  const tpl = ITEM_TEMPLATES[item.templateId];
  if (!tpl) return;

  const cur = item.upgradeLevel ?? 0;
  if (cur >= MAX_UPGRADE_LEVEL) {
    cb.send(player, { type: 'toast', text: `${tpl.name} já está no nível máximo (+${MAX_UPGRADE_LEVEL})!`, color: '#fbbf24' });
    return;
  }

  const cost = upgradeCost(cur);
  if (player.gold < cost.gold || player.dust < cost.dust) {
    cb.send(player, {
      type: 'toast',
      text: `Precisa de ${cost.gold} Ouro e ${cost.dust} Pó!`,
      color: '#f87171',
    });
    return;
  }

  player.gold -= cost.gold;
  player.dust -= cost.dust;
  item.upgradeLevel = cur + 1;
  if (item.upgradeLevel >= 10) unlockAchievement(player, 'forge_master', cb);

  cb.send(player, {
    type: 'toast',
    text: `Forja concluída! ${tpl.name} agora é +${item.upgradeLevel}!`,
    color: '#fbbf24',
  });
  syncInventory(player, cb);
}

export function handleRebirth(player: ServerPlayer, cb: WorldCallbacks) {
  if (player.level < REBIRTH_MIN_LEVEL) {
    cb.send(player, { type: 'toast', text: `Ascensão requer Nível ${REBIRTH_MIN_LEVEL}!`, color: '#f87171' });
    return;
  }
  player.rebirths = (player.rebirths ?? 0) + 1;
  unlockAchievement(player, 'ascended', cb);
  player.level = 1;
  player.xp = 0;
  player.statPoints += 10;
  const derived = computePlayerDerived(player);
  player.hp = derived.maxHp;
  player.mp = derived.maxMp;
  cb.send(player, {
    type: 'toast',
    text: `ASCENSÃO #${player.rebirths} CONCLUÍDA! +15% Atributos Permanentes & +10 Pontos!`,
    color: '#f43f5e',
  });
}

export function handleUnlockPassive(player: ServerPlayer, passiveId: string, cb: WorldCallbacks) {
  const def = PASSIVE_DEFS.find((d) => d.id === passiveId && d.heroClass === player.heroClass);
  if (!def) return;
  const avail = getSkillPointsAvailable(player.level, player.passives);
  if (avail <= 0) {
    cb.send(player, { type: 'toast', text: 'Sem Pontos de Passiva disponíveis!', color: '#f87171' });
    return;
  }
  const cur = player.passives[passiveId] ?? 0;
  if (cur >= def.maxRank) return;
  player.passives[passiveId] = cur + 1;
  const derived = computePlayerDerived(player);
  player.hp = Math.min(player.hp, derived.maxHp);
  player.mp = Math.min(player.mp, derived.maxMp);
  cb.send(player, { type: 'toast', text: `${def.name} (${cur + 1}/${def.maxRank}) ativada!`, color: '#4ade80' });
}

export function handleUnlockParagon(player: ServerPlayer, nodeId: string, cb: WorldCallbacks) {
  const avail = getParagonPointsAvailable(player.level, player.rebirths, player.paragon);
  if (avail <= 0) {
    cb.send(player, { type: 'toast', text: 'Sem Pontos Paragon disponíveis (desbloqueia Lv.20)!', color: '#f87171' });
    return;
  }
  if (!isParagonNodeUnlockable(nodeId, player.paragon)) {
    cb.send(player, { type: 'toast', text: 'Selecione um nó adjacente a um nó já ativo!', color: '#fbbf24' });
    return;
  }
  const node = PARAGON_NODES.find((n) => n.id === nodeId);
  if (!node) return;
  player.paragon.push(nodeId);
  cb.send(player, { type: 'toast', text: `Paragon: ${node.name} desbloqueado!`, color: '#f3d37a' });
}

export function handleResetBuild(player: ServerPlayer, cb: WorldCallbacks) {
  player.passives = {};
  player.paragon = ['2_2'];
  const derived = computePlayerDerived(player);
  player.hp = Math.min(player.hp, derived.maxHp);
  player.mp = Math.min(player.mp, derived.maxMp);
  cb.send(player, { type: 'toast', text: 'Build (Passivas & Paragon) resetada com sucesso!', color: '#60a5fa' });
}

export function handleRerollAffixes(player: ServerPlayer, slot: EquipSlot, cb: WorldCallbacks) {
  const item = player.equipment[slot];
  if (!item) return;
  const tpl = ITEM_TEMPLATES[item.templateId];
  if (!tpl || tpl.kind !== 'equip') return;

  const goldCost = 120;
  const dustCost = 6;
  if (player.gold < goldCost || player.dust < dustCost) {
    cb.send(player, { type: 'toast', text: `Reforjar Status precisa de ${goldCost} Ouro e ${dustCost} Pó!`, color: '#f87171' });
    return;
  }

  player.gold -= goldCost;
  player.dust -= dustCost;
  item.affixes = rollItemAffixes(tpl);
  const derived = computePlayerDerived(player);
  player.hp = Math.min(player.hp, derived.maxHp);
  player.mp = Math.min(player.mp, derived.maxMp);

  cb.send(player, { type: 'toast', text: `Status de ${tpl.name} reforjados!`, color: '#60a5fa' });
  syncInventory(player, cb);
}

export function handleCraftItem(
  player: ServerPlayer,
  recipeId: string,
  cb: WorldCallbacks,
  nextId: (prefix: string) => string
) {
  const rec = CRAFT_RECIPES.find((r) => r.id === recipeId);
  if (!rec) return;
  const tpl = ITEM_TEMPLATES[rec.resultTemplateId];
  if (!tpl) return;

  if (player.gold < rec.goldCost || player.dust < rec.dustCost) {
    cb.send(player, { type: 'toast', text: `Craft precisa de ${rec.goldCost}g e ${rec.dustCost}p!`, color: '#f87171' });
    return;
  }
  for (const ing of rec.ingredients) {
    const totalOwned = player.inventory
      .filter((i) => i.templateId === ing.templateId)
      .reduce((s, i) => s + i.quantity, 0);
    if (totalOwned < ing.qty) {
      const mName = ITEM_TEMPLATES[ing.templateId]?.name ?? ing.templateId;
      cb.send(player, { type: 'toast', text: `Falta ${mName} (${totalOwned}/${ing.qty})!`, color: '#f87171' });
      return;
    }
  }
  if (tpl.kind === 'equip' && player.inventory.length >= 36) {
    cb.send(player, { type: 'toast', text: 'Bolsa cheia!', color: '#f87171' });
    return;
  }

  player.gold -= rec.goldCost;
  player.dust -= rec.dustCost;
  for (const ing of rec.ingredients) {
    let rem = ing.qty;
    for (let idx = player.inventory.length - 1; idx >= 0 && rem > 0; idx--) {
      const slot = player.inventory[idx];
      if (slot.templateId !== ing.templateId) continue;
      const take = Math.min(slot.quantity, rem);
      slot.quantity -= take;
      rem -= take;
      if (slot.quantity <= 0) player.inventory.splice(idx, 1);
    }
  }

  if (tpl.kind === 'equip') {
    player.inventory.push({ uid: nextId('item'), templateId: tpl.id, quantity: 1, affixes: rollItemAffixes(tpl) });
  } else {
    const existing = player.inventory.find((i) => i.templateId === tpl.id);
    if (existing) existing.quantity += rec.resultQty;
    else player.inventory.push({ uid: nextId('item'), templateId: tpl.id, quantity: rec.resultQty });
  }

  cb.send(player, { type: 'toast', text: `Craftado: ${tpl.name}${rec.resultQty > 1 ? ` x${rec.resultQty}` : ''}!`, color: '#4ade80' });
  syncInventory(player, cb);
}

export function handleUseItem(player: ServerPlayer, itemUid: string, cb: WorldCallbacks) {
  const idx = player.inventory.findIndex((i) => i.uid === itemUid && i.quantity > 0);
  if (idx === -1) return;
  const item = player.inventory[idx];
  const tpl = ITEM_TEMPLATES[item.templateId];
  if (!tpl) return;

  if (tpl.kind === 'potion_hp') {
    handleUsePotion(player, 'hp', cb);
    return;
  }
  if (tpl.kind === 'potion_mp') {
    handleUsePotion(player, 'mp', cb);
    return;
  }
  if (tpl.kind === 'buff' && tpl.buffEffect) {
    item.quantity -= 1;
    if (item.quantity <= 0) player.inventory.splice(idx, 1);
    const now = Date.now();
    player.buffs = (player.buffs ?? []).filter((b) => b.expiresAt > now && b.id !== tpl.id);
    player.buffs.push({
      id: tpl.id,
      name: tpl.buffEffect.name,
      expiresAt: now + tpl.buffEffect.durationMs,
      atkPct: tpl.buffEffect.atkPct,
      xpBonus: tpl.buffEffect.xpBonus,
      goldBonus: tpl.buffEffect.goldBonus,
      critChance: tpl.buffEffect.critChance,
      critDmg: tpl.buffEffect.critDmg,
    });
    cb.send(player, { type: 'toast', text: `${tpl.name} ativado (${tpl.effectDesc})!`, color: '#c084fc' });
    syncInventory(player, cb);
  }
}

export function syncInventory(player: ServerPlayer, cb: WorldCallbacks) {
  cb.send(player, {
    type: 'inventory_sync',
    inventory: player.inventory,
    equipment: player.equipment,
    gold: player.gold,
    dust: player.dust,
  });
}
