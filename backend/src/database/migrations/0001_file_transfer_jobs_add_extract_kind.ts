import type { DatabaseMigration } from './types.js';
import { checksumSql } from './checksum.js';

// Widens file_transfer_jobs.kind to accept 'extract' in addition to 'upload'. SQLite cannot alter
// a CHECK constraint in place, so the table is recreated. Its rows hold transient transfer state
// and are not carried over. The table definition must stay in sync with createSchema() in init.ts.
const UP_SQL = `
  DROP TABLE IF EXISTS file_transfer_jobs;

  CREATE TABLE file_transfer_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id INTEGER NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('upload','extract')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','completed','failed','cancelled')),
    root TEXT NOT NULL,
    base_path TEXT NOT NULL,
    total_bytes INTEGER NOT NULL DEFAULT 0,
    transferred_bytes INTEGER NOT NULL DEFAULT 0,
    total_files INTEGER NOT NULL DEFAULT 0,
    completed_files INTEGER NOT NULL DEFAULT 0,
    payload_json TEXT NOT NULL DEFAULT '{}',
    artifact_path TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT,
    FOREIGN KEY (server_id) REFERENCES game_servers(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_file_transfer_jobs_server_status
    ON file_transfer_jobs(server_id, status);
`;

export const migration: DatabaseMigration = {
  id: '0001_file_transfer_jobs_add_extract_kind',
  appVersion: '1.2.0',
  checksum: checksumSql(UP_SQL),
  async up(database) {
    await database.exec(UP_SQL);
  },
};
