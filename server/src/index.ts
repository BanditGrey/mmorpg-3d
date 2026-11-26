import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { WebSocketServer, type WebSocket } from 'ws';
import type { ClientMessage } from '@mmorpg/shared';
import { WorldManager } from './WorldManager.js';
import { handleAdminApi } from './AdminRouter.js';
import type { ServerPlayer } from './types.js';

const PORT = Number(process.env.PORT ?? 8080);
const TICK_MS = 50; // 20 Hz authoritative loop

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.glb': 'model/gltf-binary',
};

const CLIENT_DIST_CANDIDATES = [
  path.resolve(process.cwd(), 'client', 'dist'),
  path.resolve(process.cwd(), '..', 'client', 'dist'),
];
const clientDistDir = CLIENT_DIST_CANDIDATES.find((d) => fs.existsSync(path.join(d, 'index.html'))) ?? null;

const world = new WorldManager();

function isClientMessage(value: unknown): value is ClientMessage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const message = value as Record<string, unknown>;
  if (typeof message.type !== 'string') return false;
  const str = (key: string, max = 128) => typeof message[key] === 'string' &&
    (message[key] as string).length > 0 && (message[key] as string).length <= max;
  const number = (key: string) => typeof message[key] === 'number' && Number.isFinite(message[key]);
  const optionalStr = (key: string, max = 128) => message[key] === undefined || str(key, max);
  const slots = ['weapon', 'armor', 'helm', 'gloves', 'boots', 'cloak', 'amulet', 'ring', 'ring2', 'mount'];
  const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
  switch (message.type) {
    case 'join': return str('name', 32) && ['warrior', 'mage', 'archer', 'assassin', 'paladin'].includes(String(message.heroClass)) &&
      optionalStr('username', 32) && optionalStr('password', 128);
    case 'move': return number('seq') && Number.isSafeInteger(message.seq) && number('targetX') && number('targetY');
    case 'cast': return str('skillId', 64) && optionalStr('targetId', 128);
    case 'use_potion': return message.kind === 'hp' || message.kind === 'mp';
    case 'pickup': return str('dropId');
    case 'equip': case 'use_item': return str('itemUid');
    case 'recycle': return Array.isArray(message.rarities) && message.rarities.length <= rarities.length &&
      message.rarities.every((v) => typeof v === 'string' && rarities.includes(v));
    case 'allocate_stat': return ['str', 'agi', 'vit', 'int'].includes(String(message.stat));
    case 'chat': return ['map', 'party', 'global'].includes(String(message.channel)) && str('text', 140);
    case 'party_action': return ['create', 'join', 'leave'].includes(String(message.action)) && optionalStr('partyId');
    case 'quest_claim': return str('questId', 64);
    case 'buy_item': return str('templateId', 64) &&
      (message.quantity === undefined || (number('quantity') && Number.isSafeInteger(message.quantity) && Number(message.quantity) >= 1 && Number(message.quantity) <= 99));
    case 'return_safe': case 'rebirth': case 'reset_build': case 'request_leaderboard':
    case 'toggle_pet': case 'start_wave_dungeon': return true;
    case 'change_map': return ['vale_eldoria', 'floresta_sombria', 'acampamento_orc', 'ruinas_antigas', 'deserto_escaravelho', 'santuario_golem', 'pico_gelido', 'abismo_eterno', 'cidadela_celestial', 'torre_eterna'].includes(String(message.mapId));
    case 'upgrade_item': case 'reroll_affixes': return typeof message.slot === 'string' && slots.includes(message.slot);
    case 'unlock_passive': return str('passiveId', 64);
    case 'unlock_paragon': return str('nodeId', 64);
    case 'select_title': return str('titleId', 64);
    case 'craft_item': return str('recipeId', 64);
    default: return false;
  }
}

const server = http.createServer(async (req, res) => {
  const urlPath = (req.url ?? '/').split('?')[0];
  if (urlPath === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        players: world.players.size,
        monsters: world.monsters.size,
        maintenanceMode: world.settings.maintenanceMode,
        uptimeSec: Math.floor(process.uptime()),
      })
    );
    return;
  }

  if (await handleAdminApi(req, res, urlPath, world)) {
    return;
  }

  if (clientDistDir) {
    const reqTarget = urlPath === '/' ? 'index.html' : urlPath === '/admin' ? 'admin.html' : urlPath;
    const safeRel = path.normalize(reqTarget).replace(/^(\.\.(\/|\\|$))+/, '');
    let filePath = path.join(clientDistDir, safeRel);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(clientDistDir, 'index.html');
    }
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }

  res.writeHead(404);
  res.end('Not found');
});

interface AliveSocket extends WebSocket {
  isAlive?: boolean;
}

const wss = new WebSocketServer({ server, maxPayload: 8192 });

wss.on('connection', (ws: AliveSocket) => {
  let player: ServerPlayer | null = null;
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (raw) => {
    try {
      const parsed: unknown = JSON.parse(raw.toString());
      if (!isClientMessage(parsed)) return;
      const msg = parsed;
      if (msg.type === 'join' && !player) {
        player = world.addPlayer(ws, msg);
        return;
      }
      if (player) {
        world.handleMessage(player, msg);
      }
    } catch {
      // Ignore malformed packets
    }
  });

  ws.on('close', () => {
    if (player) {
      world.removePlayer(player.id);
      player = null;
    }
  });
});

// Heartbeat every 15s to drop zombie connections
const heartbeatTimer = setInterval(() => {
  for (const client of wss.clients) {
    const sock = client as AliveSocket;
    if (sock.isAlive === false) {
      sock.terminate();
      continue;
    }
    sock.isAlive = false;
    sock.ping();
  }
}, 15000);

const tickTimer = setInterval(() => {
  world.tick(TICK_MS / 1000);
}, TICK_MS);

function gracefulShutdown(signal: string, exitCode = 0) {
  console.log(`[MMORPG Server] ${signal} received, flushing database...`);
  clearInterval(heartbeatTimer);
  clearInterval(tickTimer);
  for (const p of world.players.values()) {
    world.db.savePlayer(p);
  }
  world.db.close();
  wss.close(() => {
    server.close(() => process.exit(exitCode));
  });
  setTimeout(() => process.exit(exitCode), 1500).unref();
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
let shuttingDown = false;
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException] Fatal server error; shutting down.', err);
  if (!shuttingDown) {
    shuttingDown = true;
    gracefulShutdown('uncaughtException', 1);
  }
});
process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection] Fatal server error; shutting down.', err);
  if (!shuttingDown) {
    shuttingDown = true;
    gracefulShutdown('unhandledRejection', 1);
  }
});

server.listen(PORT, () => {
  console.log(
    `[MMORPG Server] Listening on http://localhost:${PORT} (WS + ${clientDistDir ? 'Static Client' : 'API Only'}, 20 Hz)`
  );
});
