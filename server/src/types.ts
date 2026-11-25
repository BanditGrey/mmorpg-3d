import type { WebSocket } from 'ws';
import type {
  ActiveBuff,
  EquipmentSlots,
  HeroClass,
  InventoryItem,
  MapId,
  QuestProgress,
  Rarity,
  StatAllocation,
} from '@mmorpg/shared';

export interface ServerPlayer {
  id: string;
  accountId: string;
  characterId: string;
  mapId: MapId;
  ws: WebSocket;
  name: string;
  heroClass: HeroClass;
  level: number;
  rebirths: number;
  xp: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  hp: number;
  mp: number;
  statPoints: number;
  stats: StatAllocation;
  gold: number;
  dust: number;
  inventory: InventoryItem[];
  equipment: EquipmentSlots;
  quests: QuestProgress[];
  passives: Record<string, number>;
  paragon: string[];
  partyId: string | null;
  lastAckSeq: number;
  skillCooldowns: Record<string, number>;
  lastPotionAt: number;
  lastChatAt?: number;
  achievements?: string[];
  activeTitle?: string;
  petActive?: boolean;
  killsCount?: number;
  buffs?: ActiveBuff[];
}

export interface ServerMonster {
  id: string;
  mapId: MapId;
  templateId: string;
  spawnX: number;
  spawnY: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  respawnAt: number;
  lastAttackAt: number;
  targetPlayerId: string | null;
}

export interface ServerDrop {
  id: string;
  mapId: MapId;
  templateId: string;
  x: number;
  y: number;
  rarity: Rarity;
  goldAmount?: number;
  expiresAt: number;
}

export interface ServerParty {
  id: string;
  leaderId: string;
  memberIds: Set<string>;
}
