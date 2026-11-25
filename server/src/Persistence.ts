import fs from 'node:fs';
import path from 'node:path';
import type {
  EquipmentSlots,
  HeroClass,
  InventoryItem,
  QuestProgress,
  StatAllocation,
} from '@mmorpg/shared';
import type { ServerPlayer } from './types.js';

export interface SavedCharacter {
  name: string;
  heroClass: HeroClass;
  level: number;
  xp: number;
  x: number;
  y: number;
  statPoints: number;
  stats: StatAllocation;
  gold: number;
  dust: number;
  inventory: InventoryItem[];
  equipment: EquipmentSlots;
  quests: QuestProgress[];
  updatedAt: number;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'characters.json');

export class Persistence {
  private cache = new Map<string, SavedCharacter>();

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (!fs.existsSync(DB_FILE)) return;
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, SavedCharacter>;
      for (const [key, val] of Object.entries(parsed)) {
        this.cache.set(key.toLowerCase(), val);
      }
    } catch {
      // Start fresh if file is unreadable
    }
  }

  public getCharacter(name: string): SavedCharacter | undefined {
    return this.cache.get(name.trim().toLowerCase());
  }

  public savePlayer(player: ServerPlayer) {
    const key = player.name.trim().toLowerCase();
    this.cache.set(key, {
      name: player.name,
      heroClass: player.heroClass,
      level: player.level,
      xp: player.xp,
      x: Number(player.x.toFixed(2)),
      y: Number(player.y.toFixed(2)),
      statPoints: player.statPoints,
      stats: { ...player.stats },
      gold: player.gold,
      dust: player.dust,
      inventory: player.inventory,
      equipment: player.equipment,
      quests: player.quests,
      updatedAt: Date.now(),
    });
  }

  public flushToDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const obj: Record<string, SavedCharacter> = {};
      for (const [k, v] of this.cache.entries()) {
        obj[k] = v;
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Persistence] Failed to flush:', err);
    }
  }
}
