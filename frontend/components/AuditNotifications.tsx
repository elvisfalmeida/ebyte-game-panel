import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  AlertCircle,
  Clock3,
  Filter,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  X,
} from 'lucide-react';
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
type Feedback = { tone: 'success' | 'critical'; text: string };

const severityOptions = [
  { value: 'info', label: 'Informativo' },
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
  const [message, setMessage] = useState<Feedback | null>(null);
  const [actorInput, setActorInput] = useState('');
  const [severityInput, setSeverityInput] = useState('');
  const [filters, setFilters] = useState({ actor: '', severity: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [auditData, notificationData, settingsData] = await Promise.all([
        apiClient.getAuditEvents({
          limit: 100,
          actor: filters.actor || undefined,
          severity: filters.severity || undefined,
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
  }, [filters, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale === 'pt-BR' ? 'pt-BR' : 'en-US', {
      dateStyle: 'short',
      timeStyle: 'medium',
      timeZone: 'America/Sao_Paulo',
    }).format(new Date(value));

  const markRead = async (id: number) => {
    await apiClient.markNotificationRead(id);
    setNotifications((current) =>
      current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item)
    );
    setUnreadCount((count) => Math.max(0, count - 1));
  };

  const markAllRead = async () => {
    setBusy(true);
    try {
      await apiClient.markAllNotificationsRead();
      setNotifications((current) =>
        current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() }))
      );
      setUnreadCount(0);
    } finally {
      setBusy(false);
    }
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

  return (
    <div className="gp-audit-panel mx-auto w-full max-w-[1440px] space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-cyan-500">
            <ShieldCheck className="h-4 w-4" />
            {t('audit.administration', 'Administration')}
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t('audit.title', 'Audit and notifications')}
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            {t('audit.description', 'Track administrative actions and receive operational alerts.')}
          </p>
        </div>
        <AppButton
          onClick={() => void load()}
          disabled={loading}
          className="w-full gap-2 px-4 sm:w-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? t('audit.loading', 'Loading…') : t('audit.refresh', 'Refresh')}
        </AppButton>
      </header>

      {message && <AppAlert tone={message.tone}>{message.text}</AppAlert>}

      <nav
        className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.025] p-2 sm:grid-cols-3"
        aria-label={t('audit.sections', 'Audit sections')}
      >
        <TabButton active={view === 'notifications'} onClick={() => setView('notifications')}>
          <Bell className="h-4 w-4" />
          <span>{t('audit.notifications', 'Notifications')}</span>
          {unreadCount > 0 && (
            <span className="ml-auto min-w-6 rounded-full bg-red-500 px-2 py-0.5 text-center text-xs text-white">
              {unreadCount}
            </span>
          )}
        </TabButton>
        <TabButton active={view === 'audit'} onClick={() => setView('audit')}>
          <ShieldCheck className="h-4 w-4" />
          <span>{t('audit.events', 'Audit log')}</span>
        </TabButton>
        <TabButton active={view === 'settings'} onClick={() => setView('settings')}>
          <Settings2 className="h-4 w-4" />
          <span>{t('audit.settings', 'Settings')}</span>
        </TabButton>
      </nav>

      {view === 'notifications' && (
        <section className="space-y-4">
          <SectionHeader
            title={t('audit.notificationInbox', 'Notification inbox')}
            description={t('audit.notificationInboxDescription', 'Operational warnings and events that require your attention.')}
            action={
              <AppButton
                onClick={() => void markAllRead()}
                disabled={!unreadCount || busy}
                className="w-full gap-2 px-4 sm:w-auto"
              >
                <CheckCheck className="h-4 w-4" />
                {t('audit.markAllRead', 'Mark all as read')}
              </AppButton>
            }
          />

          {!loading && notifications.length === 0 && (
            <EmptyState
              icon={<Bell className="h-7 w-7" />}
              title={t('audit.noNotifications', 'No notifications yet.')}
              description={t('audit.noNotificationsHint', 'Warnings and operational failures will appear here.')}
            />
          )}

          <div className="space-y-3">
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                formattedDate={formatDate(notification.timestamp)}
                onMarkRead={() => void markRead(notification.id)}
                markReadLabel={t('audit.markRead', 'Mark as read')}
              />
            ))}
          </div>
        </section>
      )}

      {view === 'audit' && (
        <section className="space-y-4">
          <SectionHeader
            title={t('audit.eventHistory', 'Event history')}
            description={t('audit.eventHistoryDescription', 'Review who performed each action, its result, origin and time.')}
          />

          <AppCard className="p-5">
            <div className="grid items-end gap-4 lg:grid-cols-[minmax(240px,1fr)_minmax(220px,0.65fr)_auto]">
              <Field label={t('audit.filterActor', 'Filter by user')} icon={<Search className="h-4 w-4" />}>
                <AppInput
                  className="w-full"
                  value={actorInput}
                  onChange={(event) => setActorInput(event.target.value)}
                  placeholder={t('audit.filterActorPlaceholder', 'Name of the user or system actor')}
                />
              </Field>
              <Field label={t('audit.severity', 'Severity')} icon={<Filter className="h-4 w-4" />}>
                <AppSelect
                  className="w-full"
                  value={severityInput}
                  onChange={setSeverityInput}
                  options={[
                    { value: '', label: t('audit.allSeverities', 'All severities') },
                    ...localizedSeverityOptions(t),
                  ]}
                />
              </Field>
              <div className="flex flex-col gap-2 sm:flex-row">
                <AppButton
                  tone="primary"
                  className="w-full gap-2 px-5 sm:w-auto"
                  onClick={() => setFilters({ actor: actorInput.trim(), severity: severityInput })}
                >
                  <Search className="h-4 w-4" />
                  {t('audit.applyFilters', 'Apply filters')}
                </AppButton>
                {(filters.actor || filters.severity || actorInput || severityInput) && (
                  <AppButton
                    className="w-full gap-2 px-4 sm:w-auto"
                    onClick={() => {
                      setActorInput('');
                      setSeverityInput('');
                      setFilters({ actor: '', severity: '' });
                    }}
                  >
                    <X className="h-4 w-4" />
                    {t('audit.clearFilters', 'Clear')}
                  </AppButton>
                )}
              </div>
            </div>
          </AppCard>

          <AppCard className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px] text-left text-sm">
                <thead className="border-b border-white/10 bg-white/[0.035] text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-5 py-4 font-semibold">{t('audit.date', 'Date')}</th>
                    <th className="px-5 py-4 font-semibold">{t('audit.user', 'User')}</th>
                    <th className="px-5 py-4 font-semibold">{t('audit.category', 'Category')}</th>
                    <th className="px-5 py-4 font-semibold">{t('audit.action', 'Action')}</th>
                    <th className="px-5 py-4 font-semibold">{t('audit.result', 'Result')}</th>
                    <th className="px-5 py-4 font-semibold">{t('audit.details', 'Details')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {events.map((event) => (
                    <tr key={event.id} className="align-top transition-colors hover:bg-white/[0.025]">
                      <td className="whitespace-nowrap px-5 py-4 text-gray-400">{formatDate(event.timestamp)}</td>
                      <td className="px-5 py-4 font-medium">{event.actor_username}</td>
                      <td className="px-5 py-4"><CategoryBadge value={event.category} /></td>
                      <td className="px-5 py-4"><code className="rounded bg-black/20 px-2 py-1 text-xs">{event.action}</code></td>
                      <td className="px-5 py-4"><OutcomeBadge outcome={event.outcome} t={t} /></td>
                      <td className="max-w-lg px-5 py-4">
                        <p className="leading-5">{event.summary}</p>
                        {event.ip_address && <p className="mt-1.5 text-xs text-gray-500">IP: {event.ip_address}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!loading && events.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-400">{t('audit.noEvents', 'No audit events found.')}</div>
            )}
          </AppCard>
        </section>
      )}

      {view === 'settings' && settings && (
        <section className="space-y-4">
          <SectionHeader
            title={t('audit.deliverySettings', 'Delivery settings')}
            description={t('audit.deliverySettingsDescription', 'Configure where alerts are delivered and which severity should trigger each channel.')}
          />

          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <AppCard className="space-y-6 p-5 sm:p-6">
              <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="rounded-lg bg-sky-500/10 p-2.5 text-sky-400"><Send className="h-5 w-5" /></span>
                  <div>
                    <h2 className="font-semibold">{t('audit.telegramTitle', 'Telegram integration')}</h2>
                    <p className="mt-1 text-sm leading-5 text-gray-400">
                      {t('audit.telegramDescription', 'Send important operational alerts to a Telegram chat. Credentials are encrypted at rest.')}
                    </p>
                  </div>
                </div>
                <StatusPill active={settings.telegramEnabled} t={t} />
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                <AppToggle
                  checked={settings.telegramEnabled}
                  onChange={(checked) => setSettings({ ...settings, telegramEnabled: checked })}
                  label={t('audit.telegramEnable', 'Enable Telegram notifications')}
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label={t('audit.botToken', 'Bot token')}
                  hint={settings.telegramConfigured ? t('audit.secretKeepHint', 'Leave blank to keep the current value.') : t('audit.botTokenHint', 'Token generated by @BotFather.')}
                >
                  <AppInput
                    className="w-full"
                    type="password"
                    autoComplete="new-password"
                    value={botToken}
                    onChange={(event) => setBotToken(event.target.value)}
                    placeholder={settings.telegramConfigured ? '••••••••••••••••' : '123456:ABC...'}
                  />
                </Field>
                <Field
                  label={t('audit.chatId', 'Chat ID')}
                  hint={settings.telegramConfigured ? t('audit.secretKeepHint', 'Leave blank to keep the current value.') : t('audit.chatIdHint', 'Private chat or group destination ID.')}
                >
                  <AppInput
                    className="w-full"
                    type="password"
                    autoComplete="new-password"
                    value={chatId}
                    onChange={(event) => setChatId(event.target.value)}
                    placeholder={settings.telegramConfigured ? '••••••••' : '-1001234567890'}
                  />
                </Field>
                <Field
                  label={t('audit.telegramMinimum', 'Minimum severity for Telegram')}
                  hint={t('audit.telegramMinimumHint', 'Only alerts at or above this level are sent.')}
                >
                  <AppSelect
                    className="w-full"
                    value={settings.telegramMinSeverity}
                    onChange={(value) => setSettings({ ...settings, telegramMinSeverity: value as AuditSeverity })}
                    options={localizedSeverityOptions(t)}
                  />
                </Field>
                <Field
                  label={t('audit.panelMinimum', 'Minimum severity in the panel')}
                  hint={t('audit.panelMinimumHint', 'Controls which events become inbox notifications.')}
                >
                  <AppSelect
                    className="w-full"
                    value={settings.panelMinSeverity}
                    onChange={(value) => setSettings({ ...settings, panelMinSeverity: value as AuditSeverity })}
                    options={localizedSeverityOptions(t)}
                  />
                </Field>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-end">
                <AppButton
                  className="w-full gap-2 px-5 sm:w-auto"
                  onClick={() => void testTelegram()}
                  disabled={busy || !settings.telegramConfigured}
                >
                  <Send className="h-4 w-4" />
                  {t('audit.testTelegram', 'Send test')}
                </AppButton>
                <AppButton
                  tone="primary"
                  className="w-full gap-2 px-5 sm:w-auto"
                  onClick={() => void saveSettings()}
                  disabled={busy}
                >
                  <Save className="h-4 w-4" />
                  {busy ? t('audit.saving', 'Saving…') : t('audit.save', 'Save settings')}
                </AppButton>
              </div>
            </AppCard>

            <div className="space-y-4">
              <AppCard className="space-y-4 p-5">
                <h3 className="font-semibold">{t('audit.channelStatus', 'Channel status')}</h3>
                <InfoRow
                  icon={settings.telegramConfigured ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  label={t('audit.credentials', 'Credentials')}
                  value={settings.telegramConfigured ? t('audit.configured', 'Configured') : t('audit.notConfigured', 'Not configured')}
                  positive={settings.telegramConfigured}
                />
                <InfoRow
                  icon={<Bell className="h-4 w-4" />}
                  label={t('audit.delivery', 'Delivery')}
                  value={settings.telegramEnabled ? t('audit.enabled', 'Enabled') : t('audit.disabled', 'Disabled')}
                  positive={settings.telegramEnabled}
                />
                {settings.updatedAt && (
                  <InfoRow
                    icon={<Clock3 className="h-4 w-4" />}
                    label={t('audit.lastUpdate', 'Last update')}
                    value={formatDate(settings.updatedAt)}
                  />
                )}
              </AppCard>
              <AppAlert tone="info">
                <span className="block leading-6">
                  {t('audit.telegramHelp', 'Create a bot with @BotFather, send a message to it or add it to your group, then provide the bot token and destination chat ID.')}
                </span>
              </AppAlert>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm leading-5 text-gray-400">{description}</p>
      </div>
      {action}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? 'bg-[var(--color-cyan-400)] text-[#00185a] shadow-sm'
          : 'text-gray-400 hover:bg-white/[0.05] hover:text-current'
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, hint, icon, children }: { label: string; hint?: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <span className="flex items-center gap-2 text-sm font-semibold">{icon}{label}</span>
      {children}
      {hint && <span className="text-xs leading-5 text-gray-500">{hint}</span>}
    </label>
  );
}

function NotificationCard({
  notification,
  formattedDate,
  onMarkRead,
  markReadLabel,
}: {
  notification: PanelNotification;
  formattedDate: string;
  onMarkRead: () => void;
  markReadLabel: string;
}) {
  const unread = !notification.read_at;
  return (
    <AppCard className={`overflow-hidden p-0 transition ${unread ? 'ring-1 ring-cyan-500/30' : 'opacity-75'}`}>
      <div className="flex">
        <span className={`w-1 shrink-0 ${unread ? 'bg-cyan-500' : 'bg-transparent'}`} />
        <div className="flex min-w-0 flex-1 flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <SeverityBadge severity={notification.severity} />
              <h3 className="font-semibold">{notification.title}</h3>
              <TelegramBadge notification={notification} />
            </div>
            <p className="mt-3 break-words text-sm leading-6 text-gray-400">{notification.message}</p>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
              <Clock3 className="h-3.5 w-3.5" />{formattedDate}
            </p>
          </div>
          {unread && (
            <AppButton onClick={onMarkRead} className="w-full shrink-0 gap-2 px-4 sm:w-auto">
              <Check className="h-4 w-4" />{markReadLabel}
            </AppButton>
          )}
        </div>
      </div>
    </AppCard>
  );
}

function TelegramBadge({ notification }: { notification: PanelNotification }) {
  if (notification.telegram_status === 'sent') {
    return <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">Telegram ✓</span>;
  }
  if (notification.telegram_status === 'failed') {
    return <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400" title={notification.telegram_error || ''}>Telegram ✕</span>;
  }
  return null;
}

function SeverityBadge({ severity }: { severity: AuditSeverity }) {
  const colors = {
    info: 'bg-blue-500/10 text-blue-400',
    warning: 'bg-amber-500/10 text-amber-400',
    error: 'bg-red-500/10 text-red-400',
    critical: 'bg-fuchsia-500/10 text-fuchsia-400',
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${colors[severity]}`}>{severity}</span>;
}

function CategoryBadge({ value }: { value: string }) {
  return <span className="inline-flex rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-medium">{value}</span>;
}

function OutcomeBadge({ outcome, t }: { outcome: AuditEvent['outcome']; t: (key: string, fallback?: string) => string }) {
  const success = outcome === 'success';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
      {success ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      {success ? t('audit.success', 'Success') : t('audit.failure', 'Failure')}
    </span>
  );
}

function StatusPill({ active, t }: { active: boolean; t: (key: string, fallback?: string) => string }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-2 self-start rounded-full px-3 py-1.5 text-xs font-semibold ${active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>
      <span className={`h-2 w-2 rounded-full ${active ? 'bg-emerald-400' : 'bg-gray-500'}`} />
      {active ? t('audit.enabled', 'Enabled') : t('audit.disabled', 'Disabled')}
    </span>
  );
}

function InfoRow({ icon, label, value, positive }: { icon: ReactNode; label: string; value: string; positive?: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/10 p-3">
      <span className={positive ? 'text-emerald-400' : 'text-gray-400'}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="mt-0.5 break-words text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <AppCard className="flex flex-col items-center p-10 text-center">
      <span className="rounded-full bg-white/[0.05] p-4 text-gray-400">{icon}</span>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-gray-500">{description}</p>
    </AppCard>
  );
}

function localizedSeverityOptions(t: (key: string, fallback?: string) => string) {
  return severityOptions.map((option) => ({
    ...option,
    label: t(`audit.severity.${option.value}`, option.label),
  }));
}
