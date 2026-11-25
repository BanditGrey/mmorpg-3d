import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACHIEVEMENTS,
  CRAFT_RECIPES,
  MAPS,
  MONSTER_TEMPLATES,
  ITEM_TEMPLATES,
  QUEST_TEMPLATES,
  SKILLS,
  PASSIVE_DEFS,
  PARAGON_NODES,
  MAX_UPGRADE_LEVEL,
  REBIRTH_MIN_LEVEL,
  getActiveWorldEvent,
  rollItemAffixes,
  upgradeCost,
  upgradeMultiplier,
} from '../../shared/dist/index.js';
import {
  computePlayerDerived,
  handleCraftItem,
  handleEquipItem,
  handleRebirth,
  handleRerollAffixes,
  handleResetBuild,
  handleUnlockParagon,
  handleUnlockPassive,
  handleUpgradeItem,
  handleUseItem,
  unlockAchievement,
} from '../dist/CombatSystem.js';

function makePlayer(overrides = {}) {
  return {
    id: 'p1',
    accountId: 'acc1',
    characterId: 'char1',
    mapId: 'vale_eldoria',
    ws: {},
    name: 'TestHero',
    heroClass: 'warrior',
    level: 1,
    rebirths: 0,
    xp: 0,
    x: 24,
    y: 24,
    targetX: 24,
    targetY: 24,
    hp: 240,
    mp: 90,
    statPoints: 2,
    stats: { str: 2, agi: 2, vit: 2, int: 2 },
    gold: 100000,
    dust: 10000,
    inventory: [],
    equipment: {
      weapon: { uid: 'w1', templateId: 'sword_iron', quantity: 1, upgradeLevel: 0 },
    },
    quests: [],
    partyId: null,
    lastAckSeq: 0,
    skillCooldowns: {},
    lastPotionAt: 0,
    ...overrides,
  };
}

test('Expanded content counts: 10 maps, 22 monsters, 60 items, 30 skills, 12 quests', () => {
  assert.equal(Object.keys(MAPS).length, 10);
  assert.equal(Object.keys(MONSTER_TEMPLATES).length, 22);
  assert.ok(Object.keys(ITEM_TEMPLATES).length >= 60);
  assert.equal(SKILLS.length, 30);
  assert.equal(QUEST_TEMPLATES.length, 12);
  assert.ok(QUEST_TEMPLATES.some((q) => q.repeatable === true));
});

test('Rebirth requires Lv.50 and grants permanent +15% stats & +10 stat points', () => {
  const sent = [];
  const cb = { send: (_p, msg) => sent.push(msg), broadcastAOI: () => {} };

  const low = makePlayer({ level: 10 });
  handleRebirth(low, cb);
  assert.equal(low.rebirths, 0);

  const ready = makePlayer({ level: REBIRTH_MIN_LEVEL, rebirths: 0 });
  const before = computePlayerDerived({ ...ready, level: 1 });
  handleRebirth(ready, cb);
  assert.equal(ready.rebirths, 1);
  assert.equal(ready.level, 1);
  assert.equal(ready.statPoints, 12);
  const after = computePlayerDerived(ready);
  assert.ok(after.atk > before.atk);
  assert.ok(after.maxHp > before.maxHp);
});

test('Forge upgrades up to MAX_UPGRADE_LEVEL (20)', () => {
  const cb = { send: () => {}, broadcastAOI: () => {} };
  const p = makePlayer();
  for (let i = 0; i < MAX_UPGRADE_LEVEL + 2; i++) {
    handleUpgradeItem(p, 'weapon', cb);
  }
  assert.equal(p.equipment.weapon.upgradeLevel, MAX_UPGRADE_LEVEL);
  assert.ok(upgradeMultiplier(MAX_UPGRADE_LEVEL) > 3.5);
  assert.equal(upgradeCost(0).gold, 60);
});

test('Rotating world events cycle deterministically', () => {
  const ev0 = getActiveWorldEvent(0);
  const ev1 = getActiveWorldEvent(30 * 60 * 1000);
  assert.notEqual(ev0.id, ev1.id);
});

test('Diablo 4 Build System: 30 passives, 25 paragon nodes, adjacency & reset', () => {
  assert.equal(PASSIVE_DEFS.length, 30);
  assert.equal(PARAGON_NODES.length, 25);

  const cb = { send: () => {}, broadcastAOI: () => {} };
  const p = makePlayer({ level: 25, rebirths: 1, passives: {}, paragon: ['2_2'] });
  const base = computePlayerDerived(p);

  handleUnlockPassive(p, 'wp_brutal', cb);
  assert.equal(p.passives.wp_brutal, 1);

  // Non-adjacent paragon node (0_0) must not unlock directly
  handleUnlockParagon(p, '0_0', cb);
  assert.ok(!p.paragon.includes('0_0'));

  // Adjacent node (2_1) unlocks cleanly
  handleUnlockParagon(p, '2_1', cb);
  assert.ok(p.paragon.includes('2_1'));

  const boosted = computePlayerDerived(p);
  assert.ok(boosted.atk > base.atk);

  handleResetBuild(p, cb);
  assert.deepEqual(p.passives, {});
  assert.deepEqual(p.paragon, ['2_2']);
});

test('10 Equip slots: mount speedBonus, cloak, amulet, and ring2 auto-equip', () => {
  assert.ok(Object.keys(ITEM_TEMPLATES).length >= 75);
  const cb = { send: () => {}, broadcastAOI: () => {} };
  const p = makePlayer({
    inventory: [
      { uid: 'r1', templateId: 'ring_jade', quantity: 1 },
      { uid: 'r2', templateId: 'ring_ember', quantity: 1 },
      { uid: 'm1', templateId: 'mount_horse', quantity: 1 },
      { uid: 'c1', templateId: 'cloak_traveler', quantity: 1 },
      { uid: 'a1', templateId: 'amulet_jade', quantity: 1 },
    ],
  });
  handleEquipItem(p, 'r1', cb);
  handleEquipItem(p, 'r2', cb);
  handleEquipItem(p, 'm1', cb);
  handleEquipItem(p, 'c1', cb);
  handleEquipItem(p, 'a1', cb);
  assert.equal(p.equipment.ring?.templateId, 'ring_jade');
  assert.equal(p.equipment.ring2?.templateId, 'ring_ember');
  assert.equal(p.equipment.mount?.templateId, 'mount_horse');
  assert.equal(p.equipment.cloak?.templateId, 'cloak_traveler');
  assert.equal(p.equipment.amulet?.templateId, 'amulet_jade');
  const d = computePlayerDerived(p);
  assert.ok(d.speedBonus >= 0.2);
  assert.ok(d.critDmg > 1.65);
});

test('Item affixes scale strictly by rarity (2 -> 7 status)', () => {
  assert.equal(Object.keys(rollItemAffixes(ITEM_TEMPLATES.sword_iron)).length, 2);
  assert.equal(Object.keys(rollItemAffixes(ITEM_TEMPLATES.sword_steel)).length, 3);
  assert.equal(Object.keys(rollItemAffixes(ITEM_TEMPLATES.sword_runic)).length, 4);
  assert.equal(Object.keys(rollItemAffixes(ITEM_TEMPLATES.staff_astral)).length, 5);
  assert.equal(Object.keys(rollItemAffixes(ITEM_TEMPLATES.ring_legend)).length, 6);
  assert.equal(Object.keys(rollItemAffixes(ITEM_TEMPLATES.sword_abyss)).length, 7);

  const p = makePlayer({
    gold: 500,
    dust: 20,
    equipment: {
      weapon: { uid: 'w1', templateId: 'sword_abyss', quantity: 1, affixes: { xpBonus: 0.25, goldBonus: 0.3 } },
    },
  });
  const d = computePlayerDerived(p);
  assert.equal(d.xpBonus, 0.25);
  assert.equal(d.goldBonus, 0.3);

  const cb = { send: () => {}, broadcastAOI: () => {} };
  handleRerollAffixes(p, 'weapon', cb);
  assert.equal(Object.keys(p.equipment.weapon.affixes).length, 7);
  assert.equal(p.gold, 380);
  assert.equal(p.dust, 14);
});

test('Achievements grant permanent bonuses and Pet grants +5% speed & gold', () => {
  assert.equal(ACHIEVEMENTS.length, 6);
  const p = makePlayer({ petActive: true });
  const cb = { send: () => {}, broadcastAOI: () => {} };
  unlockAchievement(p, 'boss_slayer', cb);
  assert.ok(p.achievements.includes('boss_slayer'));
  assert.equal(p.activeTitle, 'Matador de Chefes');
  const d = computePlayerDerived(p);
  assert.ok(d.bossDmg >= 0.08);
  assert.ok(d.speedBonus >= 0.05);
  assert.ok(d.goldBonus >= 0.05);
});

test('Crafting consumes materials & gold/dust, and Elixir buff boosts ATK by +25%', () => {
  assert.equal(CRAFT_RECIPES.length, 10);
  for (const r of CRAFT_RECIPES) assert.ok(ITEM_TEMPLATES[r.resultTemplateId], `Missing recipe result ${r.resultTemplateId}`);
  const p = makePlayer({
    gold: 200,
    dust: 10,
    inventory: [{ uid: 'm1', templateId: 'mat_essence', quantity: 5 }],
  });
  const cb = { send: () => {}, broadcastAOI: () => {} };
  let cid = 1;
  const baseAtk = computePlayerDerived(p).atk;

  handleCraftItem(p, 'cr_elixir_fury', cb, (pre) => `${pre}_${cid++}`);
  assert.equal(p.gold, 140);
  assert.equal(p.dust, 8);
  assert.equal(p.inventory.find((i) => i.templateId === 'mat_essence').quantity, 2);
  const elixir = p.inventory.find((i) => i.templateId === 'elixir_fury');
  assert.ok(elixir);

  handleUseItem(p, elixir.uid, cb);
  assert.equal(p.buffs.length, 1);
  assert.ok(computePlayerDerived(p).atk > baseAtk);
});
