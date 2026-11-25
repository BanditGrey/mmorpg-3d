import type http from 'node:http';
import { ADMIN_KEY } from './db/Auth.js';
import type { WorldManager } from './WorldManager.js';

function readJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 16384) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      try {
        resolve(data ? (JSON.parse(data) as Record<string, unknown>) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

export async function handleAdminApi(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  urlPath: string,
  world: WorldManager
): Promise<boolean> {
  if (!urlPath.startsWith('/api/admin')) return false;

  const key = req.headers['x-admin-key'];
  if (key !== ADMIN_KEY) {
    sendJson(res, 401, { ok: false, error: 'Chave administrativa inválida' });
    return true;
  }

  try {
    if (req.method === 'GET' && urlPath === '/api/admin/overview') {
      const online = [...world.players.values()].map((p) => ({
        id: p.id,
        accountId: p.accountId,
        name: p.name,
        heroClass: p.heroClass,
        level: p.level,
        gold: p.gold,
        x: Number(p.x.toFixed(1)),
        y: Number(p.y.toFixed(1)),
      }));
      const aliveMonsters = [...world.monsters.values()].filter((m) => m.alive).length;
      sendJson(res, 200, {
        ok: true,
        telemetry: {
          onlineCount: online.length,
          aliveMonsters,
          totalMonsters: world.monsters.size,
          dropsCount: world.drops.size,
          uptimeSec: Math.floor(process.uptime()),
          memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        },
        settings: world.settings,
        tableStats: world.db.getTableStats(),
        onlinePlayers: online,
        allCharacters: world.db.listAllCharacters(),
        auditLogs: world.db.getAuditLogs(30),
      });
      return true;
    }

    if (req.method === 'POST' && urlPath === '/api/admin/settings') {
      const body = await readJsonBody(req);
      world.adminUpdateSettings(
        {
          maintenanceMode: typeof body.maintenanceMode === 'boolean' ? body.maintenanceMode : undefined,
          xpRate: typeof body.xpRate === 'number' ? Math.max(0.5, Math.min(20, body.xpRate)) : undefined,
          dropRate: typeof body.dropRate === 'number' ? Math.max(0.5, Math.min(10, body.dropRate)) : undefined,
          motd: typeof body.motd === 'string' ? body.motd : undefined,
        },
        'admin'
      );
      sendJson(res, 200, { ok: true, settings: world.settings });
      return true;
    }

    if (req.method === 'POST' && urlPath === '/api/admin/broadcast') {
      const body = await readJsonBody(req);
      world.adminBroadcast(String(body.text ?? ''), 'admin');
      sendJson(res, 200, { ok: true });
      return true;
    }

    if (req.method === 'POST' && urlPath === '/api/admin/give') {
      const body = await readJsonBody(req);
      const ok = world.adminGiveReward(
        String(body.charName ?? ''),
        Number(body.gold ?? 0),
        Number(body.xp ?? 0),
        'admin'
      );
      sendJson(res, ok ? 200 : 404, { ok });
      return true;
    }

    if (req.method === 'POST' && urlPath === '/api/admin/kick') {
      const body = await readJsonBody(req);
      const ok = world.adminKickPlayer(String(body.playerId ?? ''), 'admin');
      sendJson(res, ok ? 200 : 404, { ok });
      return true;
    }

    if (req.method === 'POST' && urlPath === '/api/admin/ban') {
      const body = await readJsonBody(req);
      const durationHours = Number(body.hours ?? 24);
      world.db.banAccount(
        String(body.accountId ?? ''),
        durationHours > 0 ? durationHours * 3600 * 1000 : 0,
        String(body.reason ?? 'Ação administrativa'),
        'admin'
      );
      sendJson(res, 200, { ok: true });
      return true;
    }

    if (req.method === 'POST' && urlPath === '/api/admin/action') {
      const body = await readJsonBody(req);
      if (body.action === 'respawn_boss') {
        world.adminRespawnBoss('admin');
        sendJson(res, 200, { ok: true });
        return true;
      }
      if (body.action === 'save_all') {
        world.adminSaveAll('admin');
        sendJson(res, 200, { ok: true });
        return true;
      }
      if (body.action === 'backup_db') {
        const file = await world.db.createBackup();
        world.db.logAudit('admin', 'backup_db', 'sqlite', file);
        sendJson(res, 200, { ok: true, file });
        return true;
      }
    }

    sendJson(res, 404, { ok: false, error: 'Endpoint não encontrado' });
    return true;
  } catch (err) {
    sendJson(res, 400, { ok: false, error: (err as Error).message });
    return true;
  }
}
