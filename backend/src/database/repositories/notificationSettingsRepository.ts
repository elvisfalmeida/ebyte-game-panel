import { nowIso } from '../../utils/time.js';
import type { AuditSeverity } from './auditRepository.js';
import { BaseRepository } from './base.js';

export interface StoredNotificationSettings {
  telegram_enabled: number;
  telegram_bot_token_encrypted: string | null;
  telegram_chat_id_encrypted: string | null;
  telegram_min_severity: AuditSeverity;
  notify_in_panel_min_severity: AuditSeverity;
  updated_by: string | null;
  updated_at: string;
}

export class NotificationSettingsRepository extends BaseRepository {
  async get(): Promise<StoredNotificationSettings> {
    const db = await this.ensureDb();
    const existing = await db.get<StoredNotificationSettings>(
      'SELECT * FROM notification_settings WHERE id = 1'
    );
    if (existing) return existing;
    const timestamp = nowIso();
    await db.run(
      `INSERT INTO notification_settings (
        id, telegram_enabled, telegram_min_severity, notify_in_panel_min_severity, updated_at
      ) VALUES (1, 0, 'error', 'warning', ?)`,
      [timestamp]
    );
    return (await db.get<StoredNotificationSettings>(
      'SELECT * FROM notification_settings WHERE id = 1'
    ))!;
  }

  async update(input: {
    telegramEnabled: boolean;
    encryptedBotToken: string | null;
    encryptedChatId: string | null;
    telegramMinSeverity: AuditSeverity;
    panelMinSeverity: AuditSeverity;
    updatedBy: string;
  }): Promise<void> {
    await this.get();
    await (await this.ensureDb()).run(
      `UPDATE notification_settings SET
        telegram_enabled = ?, telegram_bot_token_encrypted = ?,
        telegram_chat_id_encrypted = ?, telegram_min_severity = ?,
        notify_in_panel_min_severity = ?, updated_by = ?, updated_at = ?
       WHERE id = 1`,
      [
        input.telegramEnabled ? 1 : 0,
        input.encryptedBotToken,
        input.encryptedChatId,
        input.telegramMinSeverity,
        input.panelMinSeverity,
        input.updatedBy,
        nowIso(),
      ]
    );
  }
}
