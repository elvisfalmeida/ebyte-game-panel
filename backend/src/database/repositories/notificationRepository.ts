import { nowIso } from '../../utils/time.js';
import type { AuditSeverity } from './auditRepository.js';
import { BaseRepository } from './base.js';

export class NotificationRepository extends BaseRepository {
  async create(input: {
    auditEventId?: number | null;
    severity: AuditSeverity;
    title: string;
    message: string;
    serverId?: number | null;
    telegramStatus?: 'not_requested' | 'pending';
  }): Promise<number> {
    const result = await (await this.ensureDb()).run(
      `INSERT INTO notifications (
        audit_event_id, timestamp, severity, title, message, server_id, telegram_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.auditEventId ?? null,
        nowIso(),
        input.severity,
        input.title,
        input.message,
        input.serverId ?? null,
        input.telegramStatus ?? 'not_requested',
      ]
    );
    return result.lastID as number;
  }

  async list(limit: number, offset: number, unreadOnly: boolean) {
    return (await this.ensureDb()).all(
      `SELECT * FROM notifications
       ${unreadOnly ? 'WHERE read_at IS NULL' : ''}
       ORDER BY id DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  }

  async unreadCount(): Promise<number> {
    const row = await (await this.ensureDb()).get<{ count: number }>(
      'SELECT COUNT(*) AS count FROM notifications WHERE read_at IS NULL'
    );
    return row?.count ?? 0;
  }

  async markRead(id: number): Promise<boolean> {
    const result = await (await this.ensureDb()).run(
      'UPDATE notifications SET read_at = COALESCE(read_at, ?) WHERE id = ?',
      [nowIso(), id]
    );
    return (result.changes ?? 0) > 0;
  }

  async markAllRead(): Promise<void> {
    await (await this.ensureDb()).run(
      'UPDATE notifications SET read_at = ? WHERE read_at IS NULL',
      [nowIso()]
    );
  }

  async setTelegramResult(id: number, status: 'sent' | 'failed', error?: string): Promise<void> {
    await (await this.ensureDb()).run(
      'UPDATE notifications SET telegram_status = ?, telegram_error = ? WHERE id = ?',
      [status, error?.slice(0, 500) ?? null, id]
    );
  }
}
