import { bus } from '../../realtime/bus.js';
import type { ServerActionRow } from '../../types/database.js';
import { nowIso } from '../../utils/time.js';
import { BaseRepository } from './base.js';
import { recordAuditEvent } from '../../services/notifications.js';
import { logError } from '../../utils/logger.js';

export class ServerActionsRepository extends BaseRepository {
  async create(serverId: number, level: string, message: string, actorUsername: string) {
    const db = await this.ensureDb();
    const timestamp = nowIso();
    const result = await db.run(
      'INSERT INTO server_actions (server_id, timestamp, level, message, actor_username) VALUES (?, ?, ?, ?, ?)',
      [serverId, timestamp, level, message, actorUsername]
    );
    const id = result.lastID as number;

    const keepCount = 100;
    await db.run(
      `
      DELETE FROM server_actions
      WHERE server_id = ?
        AND id NOT IN (
          SELECT id
          FROM server_actions
          WHERE server_id = ?
          ORDER BY id DESC
          LIMIT ?
        )
      `,
      [serverId, serverId, keepCount]
    );

    bus.emit('server.action', {
      serverId,
      level,
      message,
      actorUsername,
      actionId: id,
      timestamp,
    });

    const normalizedLevel = level === 'warn' ? 'warning' : level;
    const severity =
      normalizedLevel === 'error'
        ? 'error'
        : normalizedLevel === 'warning'
          ? 'warning'
          : 'info';
    await recordAuditEvent({
      actorUsername: actorUsername || 'system',
      source: actorUsername === 'scheduler' ? 'scheduler' : 'system',
      category: 'server',
      action: 'server.action',
      outcome: severity === 'error' ? 'failure' : 'success',
      severity,
      serverId,
      resourceType: 'game-server',
      resourceId: String(serverId),
      summary: message,
      metadata: { level },
    }, {
      notify: severity === 'warning' || severity === 'error',
      notificationTitle: severity === 'error' ? 'Falha no servidor' : 'Atenção no servidor',
    }).catch((error) => {
      logError('SERVER_ACTIONS:AUDIT', error, { serverId, level });
    });

    return id;
  }

  async getRecent(serverId: number, limit = 100): Promise<ServerActionRow[]> {
    const db = await this.ensureDb();
    return db.all<ServerActionRow[]>(
      'SELECT * FROM server_actions WHERE server_id = ? ORDER BY timestamp DESC LIMIT ?',
      [serverId, limit]
    );
  }

}
