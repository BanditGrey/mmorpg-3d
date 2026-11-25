import type { EquipSlot, HeroClass, MapId, Rarity } from './gameData.js';

export interface ItemAffixes {
  atk?: number;
  def?: number;
  hp?: number;
  mp?: number;
  critChance?: number;
  critDmg?: number;
  lifesteal?: number;
  cdr?: number;
  bossDmg?: number;
  speed?: number;
  thorns?: number;
  xpBonus?: number;
  goldBonus?: number;
}

export interface InventoryItem {
  uid: string;
  templateId: string;
  quantity: number;
  upgradeLevel?: number;
  affixes?: ItemAffixes;
}

export type EquipmentSlots = Partial<Record<EquipSlot, InventoryItem>>;

export interface StatAllocation {
  str: number;
  agi: number;
  vit: number;
  int: number;
}

export interface PlayerSnapshot {
  id: string;
  name: string;
  heroClass: HeroClass;
  level: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  partyId: string | null;
  rebirths?: number;
}

export interface MonsterSnapshot {
  id: string;
  templateId: string;
  name: string;
  level: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  isBoss?: boolean;
}

export interface DropSnapshot {
  id: string;
  templateId: string;
  x: number;
  y: number;
  rarity: Rarity;
  goldAmount?: number;
}

export interface SelfVitals {
  level: number;
  rebirths: number;
  xp: number;
  xpNext: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  cp: number;
  statPoints: number;
  stats: StatAllocation;
  gold: number;
  dust: number;
  lastAckSeq: number;
  passives?: Record<string, number>;
  paragon?: string[];
  skillPoints?: number;
  paragonPoints?: number;
  advStats?: {
    critChance: number;
    critDmg: number;
    lifesteal: number;
    cdr: number;
    bossDmg: number;
    speedBonus: number;
    thornsPct: number;
    xpBonus: number;
    goldBonus: number;
  };
  achievements?: string[];
  activeTitle?: string;
  petActive?: boolean;
  buffs?: ActiveBuff[];
}

export interface ActiveBuff {
  id: string;
  name: string;
  expiresAt: number;
  atkPct?: number;
  xpBonus?: number;
  goldBonus?: number;
  critChance?: number;
  critDmg?: number;
}

export interface LeaderboardEntry {
  name: string;
  heroClass: HeroClass;
  level: number;
  rebirths: number;
  cp: number;
}

export interface WaveState {
  active: boolean;
  wave: number;
  maxWaves: number;
  remaining: number;
}

export interface QuestProgress {
  questId: string;
  progress: number;
  claimed: boolean;
}

export interface PartyMemberInfo {
  id: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
}

export interface PartyInfo {
  id: string;
  leaderId: string;
  members: PartyMemberInfo[];
}

export type ClientMessage =
  | { type: 'join'; name: string; heroClass: HeroClass; username?: string; password?: string }
  | { type: 'move'; seq: number; targetX: number; targetY: number }
  | { type: 'cast'; skillId: string; targetId?: string }
  | { type: 'use_potion'; kind: 'hp' | 'mp' }
  | { type: 'pickup'; dropId: string }
  | { type: 'equip'; itemUid: string }
  | { type: 'recycle'; rarities: Rarity[] }
  | { type: 'allocate_stat'; stat: keyof StatAllocation }
  | { type: 'chat'; channel: 'map' | 'party' | 'global'; text: string }
  | { type: 'party_action'; action: 'create' | 'join' | 'leave'; partyId?: string }
  | { type: 'quest_claim'; questId: string }
  | { type: 'buy_item'; templateId: string; quantity?: number }
  | { type: 'return_safe' }
  | { type: 'change_map'; mapId: MapId }
  | { type: 'upgrade_item'; slot: EquipSlot }
  | { type: 'rebirth' }
  | { type: 'unlock_passive'; passiveId: string }
  | { type: 'unlock_paragon'; nodeId: string }
  | { type: 'reset_build' }
  | { type: 'reroll_affixes'; slot: EquipSlot }
  | { type: 'request_leaderboard' }
  | { type: 'select_title'; titleId: string }
  | { type: 'toggle_pet' }
  | { type: 'start_wave_dungeon' }
  | { type: 'craft_item'; recipeId: string }
  | { type: 'use_item'; itemUid: string };

export type ServerMessage =
  | {
      type: 'welcome';
      playerId: string;
      mapId: MapId;
      mapName: string;
      channel: string;
      vitals: SelfVitals;
      inventory: InventoryItem[];
      equipment: EquipmentSlots;
      quests: QuestProgress[];
      x: number;
      y: number;
      worldEvent?: { name: string; desc: string };
    }
  | {
      type: 'snapshot';
      tick: number;
      players: PlayerSnapshot[];
      monsters: MonsterSnapshot[];
      drops: DropSnapshot[];
      vitals: SelfVitals;
    }
  | {
      type: 'combat_event';
      attackerId: string;
      targetId: string;
      skillId: string;
      damage: number;
      isCrit: boolean;
      targetX: number;
      targetY: number;
      killed: boolean;
    }
  | {
      type: 'chat_msg';
      id: string;
      channel: 'map' | 'party' | 'global' | 'system';
      senderName: string;
      text: string;
      timestamp: number;
    }
  | {
      type: 'inventory_sync';
      inventory: InventoryItem[];
      equipment: EquipmentSlots;
      gold: number;
      dust: number;
    }
  | {
      type: 'quest_sync';
      quests: QuestProgress[];
    }
  | {
      type: 'party_sync';
      party: PartyInfo | null;
    }
  | {
      type: 'map_changed';
      mapId: MapId;
      mapName: string;
      x: number;
      y: number;
      worldEvent?: { name: string; desc: string };
    }
  | {
      type: 'toast';
      text: string;
      color?: string;
    }
  | {
      type: 'leaderboard_data';
      entries: LeaderboardEntry[];
    }
  | {
      type: 'wave_state';
      wave: WaveState;
    };
