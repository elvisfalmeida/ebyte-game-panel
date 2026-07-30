import { randomUUID } from 'crypto';
import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from './auth.js';
import { recordAuditEvent } from '../services/notifications.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function auditHttpMutation(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!MUTATING_METHODS.has(req.method)) return next();

  const requestId = randomUUID();
  const startedAt = Date.now();
  res.on('finish', () => {
    const outcome = res.statusCode < 400 ? 'success' : 'failure';
    const route = normalizePath(req.originalUrl);
    const category = route.split('/').filter(Boolean)[1] || 'system';
    const serverMatch = route.match(/^\/api\/servers\/(\d+)/);
    const resourceId = route.split('/').filter(Boolean).at(-1) || null;
    const summary = `${req.method} ${route} — HTTP ${res.statusCode}`;
    void recordAuditEvent({
      actorUserId: req.user?.userId,
      actorUsername: req.user?.username || 'unknown',
      source: 'gui',
      category,
      action: `${req.method.toLowerCase()}.${category}`,
      outcome,
      severity: outcome === 'failure' ? (res.statusCode >= 500 ? 'error' : 'warning') : 'info',
      serverId: serverMatch ? Number(serverMatch[1]) : null,
      resourceType: category,
      resourceId,
      ipAddress: requestIp(req),
      requestId,
      summary,
      metadata: {
        method: req.method,
        path: route,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
      },
    }, {
      notify: outcome === 'failure' && res.statusCode >= 500,
      notificationTitle: 'Falha em operação do painel',
    }).catch(() => {});
  });
  next();
}

function normalizePath(originalUrl: string): string {
  return originalUrl.split('?')[0].replace(/\/+/g, '/');
}

function requestIp(req: AuthenticatedRequest): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
  return value?.trim() || req.ip || null;
}
