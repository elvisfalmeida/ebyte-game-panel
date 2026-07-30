import { nowIso } from '../../utils/time.js';
import { BaseRepository } from './base.js';

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';
export type AuditOutcome = 'success' | 'failure';
export type AuditSource = 'gui' | 'api' | 'scheduler' | 'system';

export interface CreateAuditEvent {
  actorUserId?: number | null;
  actorUsername?: string;
  source?: AuditSource;
  category: string;
  action: string;
  outcome: AuditOutcome;
  severity: AuditSeverity;
  serverId?: number | null;
  resourceType?: string | null;
  resourceId?: string | null;
  ipAddress?: string | null;
  requestId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
}

export interface AuditFilters {
  limit: number;
  offset: number;
  actor?: string;
  category?: string;
  outcome?: AuditOutcome;
  severity?: AuditSeverity;
  serverId?: number;
}

export class AuditRepository extends BaseRepository {
  async create(event: CreateAuditEvent): Promise<number> {
    const db = await this.ensureDb();
    const result = await db.run(
      `INSERT INTO audit_events (
        timestamp, actor_user_id, actor_username, source, category, action, outcome,
        severity, server_id, resource_type, resource_id, ip_address, request_id,
        summary, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nowIso(),
        event.actorUserId ?? null,
        event.actorUsername || 'system',
        event.source || 'system',
        event.category,
        event.action,
        event.outcome,
        event.severity,
        event.serverId ?? null,
        event.resourceType ?? null,
        event.resourceId ?? null,
        event.ipAddress ?? null,
        event.requestId ?? null,
        event.summary,
        JSON.stringify(event.metadata ?? {}),
      ]
    );
    return result.lastID as number;
  }

  async list(filters: AuditFilters) {
    const where: string[] = [];
    const values: unknown[] = [];
    if (filters.actor) {
      where.push('actor_username LIKE ?');
      values.push(`%${filters.actor}%`);
    }
    if (filters.category) {
      where.push('category = ?');
      values.push(filters.category);
    }
    if (filters.outcome) {
      where.push('outcome = ?');
      values.push(filters.outcome);
    }
    if (filters.severity) {
      where.push('severity = ?');
      values.push(filters.severity);
    }
    if (filters.serverId) {
      where.push('server_id = ?');
      values.push(filters.serverId);
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await (await this.ensureDb()).all(
      `SELECT * FROM audit_events ${clause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...values, filters.limit, filters.offset]
    );
    return rows.map((row: any) => ({
      ...row,
      metadata: safeParseObject(row.metadata_json),
      metadata_json: undefined,
    }));
  }
}

function safeParseObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
