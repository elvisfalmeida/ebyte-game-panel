import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Bell, CheckCheck, RefreshCw, Save, Send, ShieldCheck } from 'lucide-react';
import {
  apiClient,
  type AuditEvent,
  type AuditSeverity,
  type NotificationSettings,
  type PanelNotification,
} from '../utils/api';
import { useLanguage } from '../contexts/LanguageContext';
import {
  AppAlert,
  AppButton,
  AppCard,
  AppInput,
  AppSelect,
  AppToggle,
} from '../src/ui/components';

type View = 'notifications' | 'audit' | 'settings';
const severityOptions = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Atenção' },
  { value: 'error', label: 'Erro' },
  { value: 'critical', label: 'Crítico' },
];

export function AuditNotifications() {
  const { locale, t } = useLanguage();
  const [view, setView] = useState<View>('notifications');
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [notifications, setNotifications] = useState<PanelNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'critical'; text: string } | null>(null);
  const [actorFilter, setActorFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [auditData, notificationData, settingsData] = await Promise.all([
        apiClient.getAuditEvents({
          limit: 100,
          actor: actorFilter || undefined,
          severity: severityFilter || undefined,
        }),
        apiClient.getNotifications(),
        apiClient.getNotificationSettings(),
      ]);
      setEvents(auditData.events);
      setNotifications(notificationData.notifications);
      setUnreadCount(notificationData.unreadCount);
      setSettings(settingsData);
    } catch (error: any) {
      setMessage({
        tone: 'critical',
        text: error?.response?.data?.error || t('audit.loadError', 'Could not load audit data.'),
      });
    } finally {
      setLoading(false);
    }
  }, [actorFilter, severityFilter, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = async (id: number) => {
    await apiClient.markNotificationRead(id);
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? { ...notification, read_at: new Date().toISOString() }
          : notification
      )
    );
    setUnreadCount((count) => Math.max(0, count - 1));
  };

  const saveSettings = async () => {
    if (!settings) return;
    setBusy(true);
    setMessage(null);
    try {
      const updated = await apiClient.updateNotificationSettings({
        telegramEnabled: settings.telegramEnabled,
        telegramBotToken: botToken || undefined,
        telegramChatId: chatId || undefined,
        telegramMinSeverity: settings.telegramMinSeverity,
        panelMinSeverity: settings.panelMinSeverity,
      });
      setSettings(updated);
      setBotToken('');
      setChatId('');
      setMessage({ tone: 'success', text: t('audit.settingsSaved', 'Settings saved.') });
    } catch (error: any) {
      setMessage({
        tone: 'critical',
        text: error?.response?.data?.error || t('audit.settingsSaveError', 'Could not save settings.'),
      });
    } finally {
      setBusy(false);
    }
  };

  const testTelegram = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await apiClient.testTelegramNotification();
      setMessage({ tone: 'success', text: t('audit.telegramTestSent', 'Test message sent.') });
    } catch (error: any) {
      setMessage({
        tone: 'critical',
        text: error?.response?.data?.error || t('audit.telegramTestError', 'Could not send test message.'),
      });
    } finally {
      setBusy(false);
    }
  };

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale === 'pt-BR' ? 'pt-BR' : 'en-US', {
      dateStyle: 'short',
      timeStyle: 'medium',
      timeZone: 'America/Sao_Paulo',
    }).format(new Date(value));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text)]">
            {t('audit.title', 'Audit and notifications')}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {t('audit.description', 'Track administrative actions and receive operational alerts.')}
          </p>
        </div>
        <AppButton onClick={() => void load()} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('audit.refresh', 'Refresh')}
        </AppButton>
      </div>

      {message && <AppAlert tone={message.tone}>{message.text}</AppAlert>}

      <div className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-3">
        <TabButton active={view === 'notifications'} onClick={() => setView('notifications')}>
          <Bell className="h-4 w-4" />
          {t('audit.notifications', 'Notifications')}
          {unreadCount > 0 && (
            <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">{unreadCount}</span>
          )}
        </TabButton>
        <TabButton active={view === 'audit'} onClick={() => setView('audit')}>
          <ShieldCheck className="h-4 w-4" />
          {t('audit.events', 'Audit log')}
        </TabButton>
        <TabButton active={view === 'settings'} onClick={() => setView('settings')}>
          {t('audit.settings', 'Settings')}
        </TabButton>
      </div>

      {view === 'notifications' && (
        <section className="space-y-3">
          <div className="flex justify-end">
            <AppButton
              onClick={async () => {
                await apiClient.markAllNotificationsRead();
                setNotifications((current) =>
                  current.map((notification) => ({
                    ...notification,
                    read_at: notification.read_at || new Date().toISOString(),
                  }))
                );
                setUnreadCount(0);
              }}
              disabled={!unreadCount}
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              {t('audit.markAllRead', 'Mark all as read')}
            </AppButton>
          </div>
          {!loading && notifications.length === 0 && (
            <EmptyState text={t('audit.noNotifications', 'No notifications yet.')} />
          )}
          {notifications.map((notification) => (
            <AppCard
              key={notification.id}
              className={`p-4 ${notification.read_at ? 'opacity-70' : 'border-l-4 border-l-cyan-500'}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={notification.severity} />
                    <h2 className="font-semibold text-[var(--color-text)]">{notification.title}</h2>
                    {notification.telegram_status === 'sent' && (
                      <span className="text-xs text-emerald-500">Telegram ✓</span>
                    )}
                    {notification.telegram_status === 'failed' && (
                      <span className="text-xs text-red-500" title={notification.telegram_error || ''}>
                        Telegram ✕
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{notification.message}</p>
                  <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{formatDate(notification.timestamp)}</p>
                </div>
                {!notification.read_at && (
                  <AppButton onClick={() => void markRead(notification.id)}>
                    {t('audit.markRead', 'Mark as read')}
                  </AppButton>
                )}
              </div>
            </AppCard>
          ))}
        </section>
      )}

      {view === 'audit' && (
        <section className="space-y-4">
          <AppCard className="grid gap-3 p-4 sm:grid-cols-3">
            <AppInput
              value={actorFilter}
              onChange={(event) => setActorFilter(event.target.value)}
              placeholder={t('audit.filterActor', 'Filter by user')}
            />
            <AppSelect
              value={severityFilter}
              onChange={setSeverityFilter}
              options={[{ value: '', label: t('audit.allSeverities', 'All severities') }, ...localizedSeverityOptions(t)]}
            />
            <AppButton onClick={() => void load()}>{t('audit.applyFilters', 'Apply filters')}</AppButton>
          </AppCard>
          <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]">
                <tr>
                  <th className="p-3">{t('audit.date', 'Date')}</th>
                  <th className="p-3">{t('audit.user', 'User')}</th>
                  <th className="p-3">{t('audit.category', 'Category')}</th>
                  <th className="p-3">{t('audit.action', 'Action')}</th>
                  <th className="p-3">{t('audit.result', 'Result')}</th>
                  <th className="p-3">{t('audit.details', 'Details')}</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-t border-[var(--color-border)]">
                    <td className="whitespace-nowrap p-3">{formatDate(event.timestamp)}</td>
                    <td className="p-3">{event.actor_username}</td>
                    <td className="p-3">{event.category}</td>
                    <td className="p-3"><code>{event.action}</code></td>
                    <td className="p-3">
                      <span className={event.outcome === 'success' ? 'text-emerald-500' : 'text-red-500'}>
                        {event.outcome === 'success' ? t('audit.success', 'Success') : t('audit.failure', 'Failure')}
                      </span>
                    </td>
                    <td className="max-w-md p-3">
                      <p>{event.summary}</p>
                      {event.ip_address && <p className="mt-1 text-xs opacity-60">IP: {event.ip_address}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && events.length === 0 && <EmptyState text={t('audit.noEvents', 'No audit events found.')} />}
        </section>
      )}

      {view === 'settings' && settings && (
        <AppCard className="space-y-6 p-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text)]">
              {t('audit.telegramTitle', 'Telegram integration')}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {t('audit.telegramDescription', 'Send important operational alerts to a Telegram chat. Credentials are encrypted at rest.')}
            </p>
          </div>

          <AppToggle
            checked={settings.telegramEnabled}
            onChange={(checked) => setSettings({ ...settings, telegramEnabled: checked })}
            label={t('audit.telegramEnable', 'Enable Telegram notifications')}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium">{t('audit.botToken', 'Bot token')}</span>
              <AppInput
                type="password"
                value={botToken}
                onChange={(event) => setBotToken(event.target.value)}
                placeholder={settings.telegramConfigured ? '••••••••••••••••' : '123456:ABC...'}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">{t('audit.chatId', 'Chat ID')}</span>
              <AppInput
                type="password"
                value={chatId}
                onChange={(event) => setChatId(event.target.value)}
                placeholder={settings.telegramConfigured ? '••••••••' : '-1001234567890'}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">{t('audit.telegramMinimum', 'Minimum severity for Telegram')}</span>
              <AppSelect
                value={settings.telegramMinSeverity}
                onChange={(value) => setSettings({ ...settings, telegramMinSeverity: value as AuditSeverity })}
                options={localizedSeverityOptions(t)}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">{t('audit.panelMinimum', 'Minimum severity in the panel')}</span>
              <AppSelect
                value={settings.panelMinSeverity}
                onChange={(value) => setSettings({ ...settings, panelMinSeverity: value as AuditSeverity })}
                options={localizedSeverityOptions(t)}
              />
            </label>
          </div>

          <AppAlert tone="info">
            {t('audit.telegramHelp', 'Create a bot with @BotFather, send a message to it or add it to your group, then provide the bot token and destination chat ID.')}
          </AppAlert>

          <div className="flex flex-wrap gap-3">
            <AppButton tone="primary" onClick={() => void saveSettings()} disabled={busy}>
              <Save className="mr-2 h-4 w-4" />
              {busy ? t('audit.saving', 'Saving…') : t('audit.save', 'Save settings')}
            </AppButton>
            <AppButton onClick={() => void testTelegram()} disabled={busy || !settings.telegramConfigured}>
              <Send className="mr-2 h-4 w-4" />
              {t('audit.testTelegram', 'Send test')}
            </AppButton>
          </div>
        </AppCard>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
        active ? 'bg-cyan-600 text-white' : 'hover:bg-[var(--color-surface-secondary)]'
      }`}
    >
      {children}
    </button>
  );
}

function SeverityBadge({ severity }: { severity: AuditSeverity }) {
  const colors = {
    info: 'bg-blue-500/15 text-blue-500',
    warning: 'bg-amber-500/15 text-amber-500',
    error: 'bg-red-500/15 text-red-500',
    critical: 'bg-fuchsia-500/15 text-fuchsia-500',
  };
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${colors[severity]}`}>{severity}</span>;
}

function EmptyState({ text }: { text: string }) {
  return <AppCard className="p-8 text-center text-sm text-[var(--color-text-secondary)]">{text}</AppCard>;
}

function localizedSeverityOptions(t: (key: string, fallback?: string) => string) {
  return severityOptions.map((option) => ({
    ...option,
    label: t(`audit.severity.${option.value}`, option.label),
  }));
}
