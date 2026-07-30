import {
  auditRepository,
  notificationRepository,
  notificationSettingsRepository,
} from '../database/index.js';
import type {
  AuditSeverity,
  CreateAuditEvent,
} from '../database/repositories/auditRepository.js';
import { decryptNotificationSecret } from './notificationSecrets.js';
import { logError } from '../utils/logger.js';

const SEVERITY_WEIGHT: Record<AuditSeverity, number> = {
  info: 0,
  warning: 1,
  error: 2,
  critical: 3,
};

export function severityAtLeast(value: AuditSeverity, minimum: AuditSeverity): boolean {
  return SEVERITY_WEIGHT[value] >= SEVERITY_WEIGHT[minimum];
}

export async function recordAuditEvent(
  event: CreateAuditEvent,
  options: { notify?: boolean; notificationTitle?: string } = {}
): Promise<number> {
  const auditEventId = await auditRepository.create(event);
  if (!options.notify) return auditEventId;

  const settings = await notificationSettingsRepository.get();
  const createInPanel = severityAtLeast(event.severity, settings.notify_in_panel_min_severity);
  const sendTelegram =
    Boolean(settings.telegram_enabled) &&
    severityAtLeast(event.severity, settings.telegram_min_severity);

  if (!createInPanel && !sendTelegram) return auditEventId;

  const notificationId = await notificationRepository.create({
    auditEventId,
    severity: event.severity,
    title: options.notificationTitle || event.category,
    message: event.summary,
    serverId: event.serverId,
    telegramStatus: sendTelegram ? 'pending' : 'not_requested',
  });

  if (sendTelegram) {
    void sendTelegramNotification({
      notificationId,
      severity: event.severity,
      title: options.notificationTitle || event.category,
      message: event.summary,
      botTokenEncrypted: settings.telegram_bot_token_encrypted,
      chatIdEncrypted: settings.telegram_chat_id_encrypted,
    });
  }
  return auditEventId;
}

export async function sendTelegramTest(): Promise<void> {
  const settings = await notificationSettingsRepository.get();
  const token = decryptNotificationSecret(settings.telegram_bot_token_encrypted);
  const chatId = decryptNotificationSecret(settings.telegram_chat_id_encrypted);
  if (!token || !chatId) throw Object.assign(new Error('Telegram is not configured'), { statusCode: 400 });
  await callTelegram(token, chatId, '✅ <b>Ebyte Game Panel</b>\nIntegração com o Telegram configurada com sucesso.');
}

async function sendTelegramNotification(input: {
  notificationId: number;
  severity: AuditSeverity;
  title: string;
  message: string;
  botTokenEncrypted: string | null;
  chatIdEncrypted: string | null;
}): Promise<void> {
  try {
    const token = decryptNotificationSecret(input.botTokenEncrypted);
    const chatId = decryptNotificationSecret(input.chatIdEncrypted);
    if (!token || !chatId) throw new Error('Telegram credentials are missing');
    const icon = input.severity === 'critical' ? '🚨' : input.severity === 'error' ? '❌' : input.severity === 'warning' ? '⚠️' : 'ℹ️';
    await callTelegram(
      token,
      chatId,
      `${icon} <b>${escapeHtml(input.title)}</b>\n${escapeHtml(input.message)}`
    );
    await notificationRepository.setTelegramResult(input.notificationId, 'sent');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Telegram error';
    await notificationRepository.setTelegramResult(input.notificationId, 'failed', message);
    logError('NOTIFICATIONS:TELEGRAM', error);
  }
}

async function callTelegram(token: string, chatId: string, text: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });
    const result = await response.json().catch(() => ({})) as { description?: string };
    if (!response.ok) {
      throw new Error(result.description || `Telegram returned HTTP ${response.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
