import { sfx } from '../audio/SoundFX.js';
import {
  SKILLS,
  type ClientMessage,
  type DropSnapshot,
  type EquipmentSlots,
  type HeroClass,
  type InventoryItem,
  type LeaderboardEntry,
  type MapId,
  type MonsterSnapshot,
  type PartyInfo,
  type PlayerSnapshot,
  type QuestProgress,
  type SelfVitals,
  type ServerMessage,
  type WaveState,
} from '@mmorpg/shared';

export interface CombatTextEvent {
  x: number;
  y: number;
  text: string;
  color: string;
  createdAt: number;
  isCrit?: boolean;
}

export interface SkillFxEvent {
  x: number;
  y: number;
  color: number;
  radius: number;
  createdAt: number;
  attackerId?: string;
  targetId?: string;
  skillId?: string;
  triggered?: boolean;
}

export class GameClient {
  private ws: WebSocket | null = null;
  private seq = 0;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private lastName = '';
  private lastUsername = '';
  private lastPassword = '';

  public playerId = '';
  public heroClass: HeroClass = 'warrior';
  public mapId: MapId = 'vale_eldoria';
  public mapName = 'Vale de Eldoria';
  public channel = 'CH 1';

  public vitals: SelfVitals | null = null;
  public inventory: InventoryItem[] = [];
  public equipment: EquipmentSlots = {};
  public quests: QuestProgress[] = [];
  public party: PartyInfo | null = null;

  public players: PlayerSnapshot[] = [];
  public monsters: MonsterSnapshot[] = [];
  public drops: DropSnapshot[] = [];
  public chatLog: Array<{ channel: string; senderName: string; text: string }> = [];
  public combatTexts: CombatTextEvent[] = [];
  public skillEffects: SkillFxEvent[] = [];
  public leaderboard: LeaderboardEntry[] = [];
  public waveState: WaveState | null = null;

  public localX = 24;
  public localY = 24;
  public localTargetX = 24;
  public localTargetY = 24;
  public skillCooldowns: Record<string, number> = {};

  public onWelcome?: () => void;
  public onMapChanged?: (mapId: MapId) => void;
  public onUpdate?: () => void;
  public onToast?: (text: string, color?: string) => void;

  public connect(name: string, heroClass: HeroClass, username?: string, password?: string) {
    this.lastName = name;
    this.heroClass = heroClass;
    this.lastUsername = username ?? name;
    this.lastPassword = password ?? 'guest1234';
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl =
      location.port === '5173'
        ? `${proto}://${location.host}/ws`
        : `${proto}://${location.host}`;

    this.ws = new WebSocket(wsUrl);
    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.send({
        type: 'join',
        name: this.lastName,
        heroClass: this.heroClass,
        username: this.lastUsername,
        password: this.lastPassword,
      });
    };
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data as string) as ServerMessage;
      this.handleMessage(msg);
    };
    this.ws.onclose = (ev) => {
      if (ev.code === 1000 || ev.code === 4001 || ev.code === 4002 || ev.code === 4003) {
        this.onToast?.(ev.reason || 'Conexão encerrada.', '#f87171');
        return;
      }
      this.reconnectAttempts += 1;
      const delay = Math.min(5000, 800 * this.reconnectAttempts);
      this.onToast?.(`Conexão perdida. Reconectando em ${(delay / 1000).toFixed(1)}s...`, '#f87171');
      this.reconnectTimer = window.setTimeout(() => {
        if (this.lastName) this.connect(this.lastName, this.heroClass, this.lastUsername, this.lastPassword);
      }, delay);
    };
  }

  public send(msg: ClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  public sendMove(targetX: number, targetY: number) {
    this.seq += 1;
    this.localTargetX = targetX;
    this.localTargetY = targetY;
    this.send({ type: 'move', seq: this.seq, targetX, targetY });
  }

  public sendCast(skillId: string, targetId?: string, cooldownMs = 800) {
    const now = Date.now();
    if ((this.skillCooldowns[skillId] ?? 0) > now) return false;
    this.skillCooldowns[skillId] = now + cooldownMs;
    this.send({ type: 'cast', skillId, targetId });
    return true;
  }

  public getSelfPlayer(): PlayerSnapshot | undefined {
    return this.players.find((p) => p.id === this.playerId);
  }

  private handleMessage(msg: ServerMessage) {
    switch (msg.type) {
      case 'welcome':
        this.playerId = msg.playerId;
        this.mapId = msg.mapId;
        this.mapName = msg.mapName;
        this.channel = msg.channel;
        this.vitals = msg.vitals;
        this.inventory = msg.inventory;
        this.equipment = msg.equipment;
        this.quests = msg.quests;
        this.localX = msg.x;
        this.localY = msg.y;
        this.localTargetX = msg.x;
        this.localTargetY = msg.y;
        this.onWelcome?.();
        this.onMapChanged?.(msg.mapId);
        this.onUpdate?.();
        break;
      case 'map_changed':
        this.mapId = msg.mapId;
        this.mapName = msg.mapName;
        this.localX = msg.x;
        this.localY = msg.y;
        this.localTargetX = msg.x;
        this.localTargetY = msg.y;
        this.combatTexts = [];
        this.skillEffects = [];
        this.onMapChanged?.(msg.mapId);
        this.onUpdate?.();
        break;
      case 'snapshot':
        this.players = msg.players;
        this.monsters = msg.monsters;
        this.drops = msg.drops;
        this.vitals = msg.vitals;
        const me = this.getSelfPlayer();
        if (me) {
          // Gentle server reconciliation
          const drift = Math.hypot(me.x - this.localX, me.y - this.localY);
          if (drift > 1.8) {
            this.localX = me.x;
            this.localY = me.y;
          } else {
            this.localX += (me.x - this.localX) * 0.25;
            this.localY += (me.y - this.localY) * 0.25;
          }
        }
        this.onUpdate?.();
        break;
      case 'combat_event': {
        if (msg.attackerId === this.playerId) sfx.hit(msg.isCrit);
        this.combatTexts.push({
          x: msg.targetX,
          y: msg.targetY,
          text: msg.isCrit ? `${msg.damage}!` : `${msg.damage}`,
          color: msg.isCrit ? '#fbbf24' : '#ffffff',
          createdAt: Date.now(),
          isCrit: msg.isCrit,
        });
        const sk = SKILLS.find((s) => s.id === msg.skillId);
        this.skillEffects.push({
          x: msg.targetX,
          y: msg.targetY,
          color: sk ? Number(sk.color.replace('#', '0x')) : 0xfbbf24,
          radius: sk && sk.aoeRadius > 0 ? sk.aoeRadius * 18 : 22,
          createdAt: Date.now(),
          attackerId: msg.attackerId,
          targetId: msg.targetId,
          skillId: msg.skillId,
        });
        break;
      }
      case 'chat_msg':
        this.chatLog.push({
          channel: msg.channel,
          senderName: msg.senderName,
          text: msg.text,
        });
        if (this.chatLog.length > 50) this.chatLog.shift();
        this.onUpdate?.();
        break;
      case 'inventory_sync':
        this.inventory = msg.inventory;
        this.equipment = msg.equipment;
        if (this.vitals) {
          this.vitals.gold = msg.gold;
          this.vitals.dust = msg.dust;
        }
        this.onUpdate?.();
        break;
      case 'quest_sync':
        this.quests = msg.quests;
        this.onUpdate?.();
        break;
      case 'party_sync':
        this.party = msg.party;
        this.onUpdate?.();
        break;
      case 'toast':
        this.onToast?.(msg.text, msg.color);
        break;
      case 'leaderboard_data':
        this.leaderboard = msg.entries;
        this.onUpdate?.();
        break;
      case 'wave_state':
        this.waveState = msg.wave;
        this.onUpdate?.();
        break;
    }
  }
}
