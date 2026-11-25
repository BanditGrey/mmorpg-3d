import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync, backup } from 'node:sqlite';
import {
  CLASS_DEFS,
  ITEM_TEMPLATES,
  QUEST_TEMPLATES,
  SAFE_SPAWN,
  rollItemAffixes,
  type EquipmentSlots,
  type HeroClass,
  type InventoryItem,
  type QuestProgress,
  type StatAllocation,
} from '@mmorpg/shared';
import type { ServerPlayer } from '../types.js';
import { hashPassword, verifyPassword } from './Auth.js';

export interface AccountRow {
  id: string;
  username: string;
  role: 'player' | 'admin';
  banned_until: number;
  ban_reason: string | null;
  created_at: number;
}

export interface CharacterRecord {
  id: string;
  accountId: string;
  name: string;
  heroClass: HeroClass;
  level: number;
  rebirths: number;
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
  passives: Record<string, number>;
  paragon: string[];
  achievements: string[];
  activeTitle: string;
  petActive: boolean;
  updatedAt: number;
}

export interface ServerSettings {
  maintenanceMode: boolean;
  xpRate: number;
  dropRate: number;
  motd: string;
}

export interface AuditLogRow {
  id: number;
  actor: string;
  action: string;
  target: string;
  details: string;
  created_at: number;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'eldoria.sqlite');

export class GameDatabase {
  public db: DatabaseSync;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    this.db = new DatabaseSync(DB_PATH);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.migrate();
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'player',
        banned_until INTEGER NOT NULL DEFAULT 0,
        ban_reason TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS characters (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        name TEXT UNIQUE NOT NULL,
        hero_class TEXT NOT NULL,
        level INTEGER NOT NULL DEFAULT 1,
        xp INTEGER NOT NULL DEFAULT 0,
        x REAL NOT NULL DEFAULT 24,
        y REAL NOT NULL DEFAULT 24,
        stat_points INTEGER NOT NULL DEFAULT 2,
        str INTEGER NOT NULL DEFAULT 2,
        agi INTEGER NOT NULL DEFAULT 2,
        vit INTEGER NOT NULL DEFAULT 2,
        int_stat INTEGER NOT NULL DEFAULT 2,
        gold INTEGER NOT NULL DEFAULT 100,
        dust INTEGER NOT NULL DEFAULT 0,
        equipment_json TEXT NOT NULL DEFAULT '{}',
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS inventory_items (
        uid TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        template_id TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        upgrade_level INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS character_quests (
        character_id TEXT NOT NULL,
        quest_id TEXT NOT NULL,
        progress INTEGER NOT NULL DEFAULT 0,
        claimed INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (character_id, quest_id),
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS server_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        target TEXT NOT NULL,
        details TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_chars_account ON characters(account_id);
      CREATE INDEX IF NOT EXISTS idx_inv_char ON inventory_items(character_id);
      CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(created_at DESC);
    `);

    const defaults: Record<string, string> = {
      maintenanceMode: 'false',
      xpRate: '1',
      dropRate: '1',
      motd: 'Bem-vindo ao Vale de Eldoria!',
    };
    const insertSet = this.db.prepare('INSERT OR IGNORE INTO server_settings (key, value) VALUES (?, ?)');
    for (const [k, v] of Object.entries(defaults)) {
      insertSet.run(k, v);
    }
    try {
      this.db.exec('ALTER TABLE characters ADD COLUMN rebirths INTEGER NOT NULL DEFAULT 0');
    } catch {
      // Column already exists
    }
    try {
      this.db.exec("ALTER TABLE characters ADD COLUMN passives_json TEXT NOT NULL DEFAULT '{}'");
    } catch {
      // Column already exists
    }
    try {
      this.db.exec('ALTER TABLE characters ADD COLUMN paragon_json TEXT NOT NULL DEFAULT \'["2_2"]\'');
    } catch {
      // Column already exists
    }
    try {
      this.db.exec("ALTER TABLE inventory_items ADD COLUMN affixes_json TEXT NOT NULL DEFAULT '{}'");
    } catch {
      // Column already exists
    }
    try {
      this.db.exec("ALTER TABLE characters ADD COLUMN achievements_json TEXT NOT NULL DEFAULT '[]'");
    } catch {
      // Column already exists
    }
    try {
      this.db.exec("ALTER TABLE characters ADD COLUMN active_title TEXT NOT NULL DEFAULT ''");
    } catch {
      // Column already exists
    }
    try {
      this.db.exec('ALTER TABLE characters ADD COLUMN pet_active INTEGER NOT NULL DEFAULT 0');
    } catch {
      // Column already exists
    }
  }

  public registerOrLogin(username: string, password: string): { ok: true; account: AccountRow } | { ok: false; error: string } {
    const clean = username.trim().slice(0, 20);
    if (clean.length < 3 || password.length < 4) {
      return { ok: false, error: 'Usuário (min 3) e senha (min 4) inválidos.' };
    }
    const existing = this.db
      .prepare('SELECT id, username, password_hash, role, banned_until, ban_reason, created_at FROM accounts WHERE lower(username) = lower(?)')
      .get(clean) as (AccountRow & { password_hash: string }) | undefined;

    if (existing) {
      if (!verifyPassword(password, existing.password_hash)) {
        return { ok: false, error: 'Senha incorreta.' };
      }
      if (existing.banned_until > Date.now()) {
        return { ok: false, error: `Conta banida: ${existing.ban_reason ?? 'Violação das regras'}` };
      }
      return {
        ok: true,
        account: {
          id: existing.id,
          username: existing.username,
          role: existing.role,
          banned_until: existing.banned_until,
          ban_reason: existing.ban_reason,
          created_at: existing.created_at,
        },
      };
    }

    const id = `acc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();
    const role = clean.toLowerCase() === 'admin' ? 'admin' : 'player';
    this.db
      .prepare('INSERT INTO accounts (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, clean, hashPassword(password), role, now);

    this.logAudit(clean, 'register', id, `Conta criada (${role})`);
    return {
      ok: true,
      account: { id, username: clean, role, banned_until: 0, ban_reason: null, created_at: now },
    };
  }

  public getAccountById(id: string): AccountRow | undefined {
    return this.db
      .prepare('SELECT id, username, role, banned_until, ban_reason, created_at FROM accounts WHERE id = ?')
      .get(id) as AccountRow | undefined;
  }

  public getOrCreateCharacter(accountId: string, charName: string, heroClass: HeroClass): CharacterRecord {
    const cleanName = (charName || 'Aventureiro').trim().slice(0, 16) || 'Aventureiro';
    const row = this.db
      .prepare('SELECT * FROM characters WHERE lower(name) = lower(?)')
      .get(cleanName) as Record<string, unknown> | undefined;

    if (row) {
      return this.hydrateCharacter(row);
    }

    const id = `char_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();
    const weaponTplId = heroClass === 'mage' ? 'staff_oak' : 'sword_iron';
    const initialEquip: EquipmentSlots = {
      weapon: {
        uid: `item_${now}_w`,
        templateId: weaponTplId,
        quantity: 1,
        affixes: rollItemAffixes(ITEM_TEMPLATES[weaponTplId]),
      },
    };

    this.db.exec('BEGIN');
    try {
      this.db
        .prepare(
          `INSERT INTO characters (id, account_id, name, hero_class, level, xp, x, y, stat_points, str, agi, vit, int_stat, gold, dust, equipment_json, updated_at)
           VALUES (?, ?, ?, ?, 1, 0, ?, ?, 2, 2, 2, 2, 2, 100, 0, ?, ?)`
        )
        .run(id, accountId, cleanName, heroClass, SAFE_SPAWN.x, SAFE_SPAWN.y, JSON.stringify(initialEquip), now);

      const insInv = this.db.prepare('INSERT INTO inventory_items (uid, character_id, template_id, quantity) VALUES (?, ?, ?, ?)');
      insInv.run(`item_${now}_hp`, id, 'pot_hp_small', 10);
      insInv.run(`item_${now}_mp`, id, 'pot_mp_small', 8);

      const insQ = this.db.prepare('INSERT INTO character_quests (character_id, quest_id, progress, claimed) VALUES (?, ?, 0, 0)');
      for (const q of QUEST_TEMPLATES) {
        insQ.run(id, q.id);
      }
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }

    return this.hydrateCharacter(
      this.db.prepare('SELECT * FROM characters WHERE id = ?').get(id) as Record<string, unknown>
    );
  }

  private hydrateCharacter(row: Record<string, unknown>): CharacterRecord {
    const charId = String(row.id);
    const invRows = this.db
      .prepare('SELECT uid, template_id, quantity, upgrade_level, affixes_json FROM inventory_items WHERE character_id = ?')
      .all(charId) as Array<{ uid: string; template_id: string; quantity: number; upgrade_level: number; affixes_json?: string }>;

    const questRows = this.db
      .prepare('SELECT quest_id, progress, claimed FROM character_quests WHERE character_id = ?')
      .all(charId) as Array<{ quest_id: string; progress: number; claimed: number }>;

    return {
      id: charId,
      accountId: String(row.account_id),
      name: String(row.name),
      heroClass: (String(row.hero_class) in CLASS_DEFS ? String(row.hero_class) : 'warrior') as HeroClass,
      level: Number(row.level),
      rebirths: Number(row.rebirths ?? 0),
      xp: Number(row.xp),
      x: Number(row.x),
      y: Number(row.y),
      statPoints: Number(row.stat_points),
      stats: {
        str: Number(row.str),
        agi: Number(row.agi),
        vit: Number(row.vit),
        int: Number(row.int_stat),
      },
      gold: Number(row.gold),
      dust: Number(row.dust),
      equipment: JSON.parse(String(row.equipment_json || '{}')) as EquipmentSlots,
      inventory: invRows.map((r) => ({
        uid: r.uid,
        templateId: r.template_id,
        quantity: r.quantity,
        upgradeLevel: r.upgrade_level || 0,
        affixes: JSON.parse(String(r.affixes_json || '{}')),
      })),
      quests: QUEST_TEMPLATES.map((qt) => {
        const found = questRows.find((qr) => qr.quest_id === qt.id);
        return {
          questId: qt.id,
          progress: found?.progress ?? 0,
          claimed: Boolean(found?.claimed),
        };
      }),
      passives: JSON.parse(String(row.passives_json || '{}')) as Record<string, number>,
      paragon: JSON.parse(String(row.paragon_json || '["2_2"]')) as string[],
      achievements: JSON.parse(String(row.achievements_json || '[]')) as string[],
      activeTitle: String(row.active_title ?? ''),
      petActive: Boolean(row.pet_active),
      updatedAt: Number(row.updated_at),
    };
  }

  public savePlayer(player: ServerPlayer) {
    if (!player.characterId) return;
    this.db.exec('BEGIN');
    try {
      this.db
        .prepare(
          `UPDATE characters SET level=?, rebirths=?, xp=?, x=?, y=?, stat_points=?, str=?, agi=?, vit=?, int_stat=?, gold=?, dust=?, equipment_json=?, passives_json=?, paragon_json=?, achievements_json=?, active_title=?, pet_active=?, updated_at=?
           WHERE id=?`
        )
        .run(
          player.level,
          player.rebirths,
          player.xp,
          Number(player.x.toFixed(2)),
          Number(player.y.toFixed(2)),
          player.statPoints,
          player.stats.str,
          player.stats.agi,
          player.stats.vit,
          player.stats.int,
          player.gold,
          player.dust,
          JSON.stringify(player.equipment),
          JSON.stringify(player.passives ?? {}),
          JSON.stringify(player.paragon ?? ['2_2']),
          JSON.stringify(player.achievements ?? []),
          player.activeTitle ?? '',
          player.petActive ? 1 : 0,
          Date.now(),
          player.characterId
        );

      this.db.prepare('DELETE FROM inventory_items WHERE character_id = ?').run(player.characterId);
      const insInv = this.db.prepare(
        'INSERT OR REPLACE INTO inventory_items (uid, character_id, template_id, quantity, upgrade_level, affixes_json) VALUES (?, ?, ?, ?, ?, ?)'
      );
      for (const item of player.inventory) {
        insInv.run(
          item.uid,
          player.characterId,
          item.templateId,
          item.quantity,
          item.upgradeLevel ?? 0,
          JSON.stringify(item.affixes ?? {})
        );
      }

      const upQ = this.db.prepare(
        'INSERT INTO character_quests (character_id, quest_id, progress, claimed) VALUES (?, ?, ?, ?) ON CONFLICT(character_id, quest_id) DO UPDATE SET progress=excluded.progress, claimed=excluded.claimed'
      );
      for (const q of player.quests) {
        upQ.run(player.characterId, q.questId, q.progress, q.claimed ? 1 : 0);
      }
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      console.error('[GameDatabase] savePlayer failed:', err);
    }
  }

  public getSettings(): ServerSettings {
    const rows = this.db.prepare('SELECT key, value FROM server_settings').all() as Array<{ key: string; value: string }>;
    const map = new Map(rows.map((r) => [r.key, r.value]));
    return {
      maintenanceMode: map.get('maintenanceMode') === 'true',
      xpRate: Number(map.get('xpRate') ?? 1) || 1,
      dropRate: Number(map.get('dropRate') ?? 1) || 1,
      motd: map.get('motd') ?? 'Bem-vindo ao Vale de Eldoria!',
    };
  }

  public updateSettings(partial: Partial<ServerSettings>, actor: string) {
    const stmt = this.db.prepare('INSERT INTO server_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
    if (partial.maintenanceMode !== undefined) stmt.run('maintenanceMode', String(partial.maintenanceMode));
    if (partial.xpRate !== undefined) stmt.run('xpRate', String(partial.xpRate));
    if (partial.dropRate !== undefined) stmt.run('dropRate', String(partial.dropRate));
    if (partial.motd !== undefined) stmt.run('motd', partial.motd.slice(0, 140));
    this.logAudit(actor, 'update_settings', 'server', JSON.stringify(partial));
  }

  public banAccount(accountId: string, durationMs: number, reason: string, actor: string) {
    const until = durationMs > 0 ? Date.now() + durationMs : 0;
    this.db.prepare('UPDATE accounts SET banned_until = ?, ban_reason = ? WHERE id = ?').run(until, reason, accountId);
    this.logAudit(actor, until > 0 ? 'ban' : 'unban', accountId, reason);
  }

  public getLeaderboard(limit = 20) {
    return this.db
      .prepare(
        `SELECT name, hero_class, level, rebirths, str, agi, vit, int_stat
         FROM characters
         ORDER BY rebirths DESC, level DESC, xp DESC
         LIMIT ?`
      )
      .all(limit) as Array<{
      name: string;
      hero_class: HeroClass;
      level: number;
      rebirths: number;
      str: number;
      agi: number;
      vit: number;
      int_stat: number;
    }>;
  }

  public listAllCharacters() {
    return this.db
      .prepare(
        `SELECT c.id, c.account_id, c.name, c.hero_class, c.level, c.gold, c.dust, c.updated_at, a.username, a.banned_until
         FROM characters c JOIN accounts a ON a.id = c.account_id ORDER BY c.updated_at DESC LIMIT 100`
      )
      .all() as Array<Record<string, unknown>>;
  }

  public getTableStats() {
    const count = (t: string) => Number((this.db.prepare(`SELECT COUNT(*) as c FROM ${t}`).get() as { c: number }).c);
    return {
      accounts: count('accounts'),
      characters: count('characters'),
      inventory_items: count('inventory_items'),
      audit_logs: count('audit_logs'),
    };
  }

  public getAuditLogs(limit = 40): AuditLogRow[] {
    return this.db
      .prepare('SELECT id, actor, action, target, details, created_at FROM audit_logs ORDER BY id DESC LIMIT ?')
      .all(limit) as unknown as AuditLogRow[];
  }

  public logAudit(actor: string, action: string, target: string, details: string) {
    this.db
      .prepare('INSERT INTO audit_logs (actor, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(actor, action, target, details.slice(0, 300), Date.now());
  }

  public async createBackup(): Promise<string> {
    const backupDir = path.join(DATA_DIR, 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const file = path.join(backupDir, `eldoria_${Date.now()}.sqlite`);
    await backup(this.db, file);
    return file;
  }

  public close() {
    this.db.close();
  }
}
