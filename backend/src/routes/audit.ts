import { Router, type Response } from 'express';
import { rootOnly, type AuthenticatedRequest } from '../middleware/auth.js';
import {
  auditRepository,
  notificationRepository,
  notificationSettingsRepository,
} from '../database/index.js';
import type { AuditOutcome, AuditSeverity } from '../database/repositories/auditRepository.js';
import {
  decryptNotificationSecret,
  encryptNotificationSecret,
} from '../services/notificationSecrets.js';
import { recordAuditEvent, sendTelegramTest } from '../services/notifications.js';
import { sendRouteError } from '../utils/routeErrors.js';

const router = Router();
router.use(rootOnly);

const SEVERITIES = new Set<AuditSeverity>(['info', 'warning', 'error', 'critical']);
const OUTCOMES = new Set<AuditOutcome>(['success', 'failure']);

router.get('/audit', async (req: AuthenticatedRequest, res: Response) => {
  const limit = boundedInt(req.query.limit, 50, 1, 200);
  const offset = boundedInt(req.query.offset, 0, 0, 100_000);
  const severity = asString(req.query.severity) as AuditSeverity | undefined;
  const outcome = asString(req.query.outcome) as AuditOutcome | undefined;
  const serverId = boundedInt(req.query.serverId, 0, 1, Number.MAX_SAFE_INTEGER) || undefined;
  const events = await auditRepository.list({
    limit,
    offset,
    actor: asString(req.query.actor),
    category: asString(req.query.category),
    severity: severity && SEVERITIES.has(severity) ? severity : undefined,
    outcome: outcome && OUTCOMES.has(outcome) ? outcome : undefined,
    serverId,
  });
  res.json({ events, limit, offset });
});

router.get('/notifications', async (req: AuthenticatedRequest, res: Response) => {
  const limit = boundedInt(req.query.limit, 50, 1, 200);
  const offset = boundedInt(req.query.offset, 0, 0, 100_000);
  const unreadOnly = String(req.query.unreadOnly || '') === 'true';
  const [notifications, unreadCount] = await Promise.all([
    notificationRepository.list(limit, offset, unreadOnly),
    notificationRepository.unreadCount(),
  ]);
  res.json({ notifications, unreadCount, limit, offset });
});

router.post('/notifications/:id/read', async (req: AuthenticatedRequest, res: Response) => {
  const id = boundedInt(req.params.id, 0, 1, Number.MAX_SAFE_INTEGER);
  if (!id) return res.status(400).json({ error: 'Invalid notification id' });
  if (!(await notificationRepository.markRead(id))) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  return res.json({ success: true });
});

router.post('/notifications/read-all', async (_req: AuthenticatedRequest, res: Response) => {
  await notificationRepository.markAllRead();
  res.json({ success: true });
});

router.get('/notification-settings', async (_req: AuthenticatedRequest, res: Response) => {
  const settings = await notificationSettingsRepository.get();
  res.json(publicSettings(settings));
});

router.put('/notification-settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const current = await notificationSettingsRepository.get();
    const telegramEnabled = Boolean(req.body?.telegramEnabled);
    const telegramMinSeverity = validSeverity(req.body?.telegramMinSeverity, 'error');
    const panelMinSeverity = validSeverity(req.body?.panelMinSeverity, 'warning');
    const tokenInput = cleanSecret(req.body?.telegramBotToken);
    const chatInput = cleanSecret(req.body?.telegramChatId);
    const encryptedBotToken = tokenInput
      ? encryptNotificationSecret(tokenInput)
      : current.telegram_bot_token_encrypted;
    const encryptedChatId = chatInput
      ? encryptNotificationSecret(chatInput)
      : current.telegram_chat_id_encrypted;

    if (telegramEnabled && (!encryptedBotToken || !encryptedChatId)) {
      return res.status(400).json({ error: 'Bot token and chat id are required to enable Telegram' });
    }

    await notificationSettingsRepository.update({
      telegramEnabled,
      encryptedBotToken,
      encryptedChatId,
      telegramMinSeverity,
      panelMinSeverity,
      updatedBy: req.user?.username || 'system',
    });
    await recordAuditEvent({
      actorUserId: req.user?.userId,
      actorUsername: req.user?.username,
      source: 'gui',
      category: 'notifications',
      action: 'notification.settings.update',
      outcome: 'success',
      severity: 'info',
      resourceType: 'notification-settings',
      resourceId: '1',
      ipAddress: req.ip,
      summary: 'Configurações de notificações atualizadas',
      metadata: { telegramEnabled, telegramMinSeverity, panelMinSeverity },
    });
    return res.json(publicSettings(await notificationSettingsRepository.get()));
  } catch (error) {
    return sendRouteError(res, error, {
      route: 'ROUTE:NOTIFICATION_SETTINGS:UPDATE',
      fallbackMessage: 'Failed to update notification settings',
    });
  }
});

router.post('/notification-settings/telegram/test', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await sendTelegramTest();
    await recordAuditEvent({
      actorUserId: req.user?.userId,
      actorUsername: req.user?.username,
      source: 'gui',
      category: 'notifications',
      action: 'telegram.test',
      outcome: 'success',
      severity: 'info',
      resourceType: 'telegram',
      summary: 'Mensagem de teste enviada ao Telegram',
    });
    return res.json({ success: true });
  } catch (error) {
    return sendRouteError(res, error, {
      route: 'ROUTE:NOTIFICATION_SETTINGS:TELEGRAM_TEST',
      fallbackMessage: 'Failed to send Telegram test',
    });
  }
});

function publicSettings(settings: Awaited<ReturnType<typeof notificationSettingsRepository.get>>) {
  return {
    telegramEnabled: Boolean(settings.telegram_enabled),
    telegramConfigured: hasConfiguredTelegram(settings),
    telegramMinSeverity: settings.telegram_min_severity,
    panelMinSeverity: settings.notify_in_panel_min_severity,
    updatedBy: settings.updated_by,
    updatedAt: settings.updated_at,
  };
}

function hasConfiguredTelegram(settings: Awaited<ReturnType<typeof notificationSettingsRepository.get>>): boolean {
  try {
    return Boolean(
      decryptNotificationSecret(settings.telegram_bot_token_encrypted) &&
      decryptNotificationSecret(settings.telegram_chat_id_encrypted)
    );
  } catch {
    return false;
  }
}

function validSeverity(value: unknown, fallback: AuditSeverity): AuditSeverity {
  return typeof value === 'string' && SEVERITIES.has(value as AuditSeverity)
    ? value as AuditSeverity
    : fallback;
}

function cleanSecret(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function boundedInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

export default router;
