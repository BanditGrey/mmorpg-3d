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
      const msg = JSON.parse(raw.toString()) as ClientMessage;
      if (!msg || typeof msg.type !== 'string') return;
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

function gracefulShutdown(signal: string) {
  console.log(`[MMORPG Server] ${signal} received, flushing database...`);
  clearInterval(heartbeatTimer);
  clearInterval(tickTimer);
  for (const p of world.players.values()) {
    world.db.savePlayer(p);
  }
  world.db.close();
  wss.close(() => {
    server.close(() => process.exit(0));
  });
  setTimeout(() => process.exit(0), 1500).unref();
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('uncaughtException', (err) => console.error('[uncaughtException]', err));
process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));

server.listen(PORT, () => {
  console.log(
    `[MMORPG Server] Listening on http://localhost:${PORT} (WS + ${clientDistDir ? 'Static Client' : 'API Only'}, 20 Hz)`
  );
});
