import type { DatabaseMigration } from './types.js';
import { checksumSql } from './checksum.js';

const UP_SQL = `
  CREATE TABLE IF NOT EXISTS audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    actor_user_id INTEGER,
    actor_username TEXT NOT NULL DEFAULT 'system',
    source TEXT NOT NULL DEFAULT 'system' CHECK(source IN ('gui','api','scheduler','system')),
    category TEXT NOT NULL,
    action TEXT NOT NULL,
    outcome TEXT NOT NULL CHECK(outcome IN ('success','failure')),
    severity TEXT NOT NULL CHECK(severity IN ('info','warning','error','critical')),
    server_id INTEGER,
    resource_type TEXT,
    resource_id TEXT,
    ip_address TEXT,
    request_id TEXT,
    summary TEXT NOT NULL,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (server_id) REFERENCES game_servers(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    audit_event_id INTEGER,
    timestamp TEXT NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('info','warning','error','critical')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    server_id INTEGER,
    read_at TEXT,
    telegram_status TEXT NOT NULL DEFAULT 'not_requested'
      CHECK(telegram_status IN ('not_requested','pending','sent','failed')),
    telegram_error TEXT,
    FOREIGN KEY (audit_event_id) REFERENCES audit_events(id) ON DELETE SET NULL,
    FOREIGN KEY (server_id) REFERENCES game_servers(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS notification_settings (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    telegram_enabled INTEGER NOT NULL DEFAULT 0 CHECK(telegram_enabled IN (0, 1)),
    telegram_bot_token_encrypted TEXT,
    telegram_chat_id_encrypted TEXT,
    telegram_min_severity TEXT NOT NULL DEFAULT 'error'
      CHECK(telegram_min_severity IN ('info','warning','error','critical')),
    notify_in_panel_min_severity TEXT NOT NULL DEFAULT 'warning'
      CHECK(notify_in_panel_min_severity IN ('info','warning','error','critical')),
    updated_by TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp
    ON audit_events(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_audit_events_actor
    ON audit_events(actor_username, timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_audit_events_server
    ON audit_events(server_id, timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_notifications_read_time
    ON notifications(read_at, timestamp DESC);
`;

export const migration: DatabaseMigration = {
  id: '0002_audit_notifications',
  appVersion: '1.2.0',
  checksum: checksumSql(UP_SQL),
  async up(database) {
    await database.exec(UP_SQL);
  },
};
