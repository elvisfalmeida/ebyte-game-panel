import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  BookOpen,
  Check,
  ExternalLink,
  LayoutPanelTop,
  Link2,
  Megaphone,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { usePanelContentActions } from '../contexts/PanelContentContext';
import { apiClient, type EditablePanelContent } from '../utils/api';
import {
  AppAlert,
  AppButton,
  AppCard,
  AppInput,
  AppSelect,
  AppToggle,
} from '../src/ui/components';

type EditorSection = 'news' | 'social' | 'resources';
type Feedback = { tone: 'success' | 'critical'; text: string };

const emptyContent: EditablePanelContent = {
  news: { enabled: true, source: 'local', rotationSeconds: 15, items: [] },
  social: { enabled: true, title: '', links: [] },
  resources: { source: 'local', items: [] },
};

export function PanelContentEditor() {
  const { t } = useLanguage();
  const { reload } = usePanelContentActions();
  const [activeSection, setActiveSection] = useState<EditorSection>('news');
  const [content, setContent] = useState<EditablePanelContent>(emptyContent);
  const [savedSnapshot, setSavedSnapshot] = useState(JSON.stringify(emptyContent));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Feedback | null>(null);

  useEffect(() => {
    apiClient.getPanelContent()
      .then((loaded) => {
        setContent(loaded);
        setSavedSnapshot(JSON.stringify(loaded));
      })
      .catch(() => setMessage({
        tone: 'critical',
        text: t('content.loadError', 'Unable to load panel content.'),
      }))
      .finally(() => setLoading(false));
  }, [t]);

  const isDirty = useMemo(() => JSON.stringify(content) !== savedSnapshot, [content, savedSnapshot]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const result = await apiClient.updatePanelContent(content);
      setContent(result.content);
      setSavedSnapshot(JSON.stringify(result.content));
      await reload();
      setMessage({ tone: 'success', text: t('content.saved', 'Content saved and published.') });
    } catch (error: any) {
      setMessage({
        tone: 'critical',
        text: error?.response?.data?.error || t('content.saveError', 'Unable to save panel content.'),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppCard className="mx-auto flex min-h-48 max-w-[1440px] items-center justify-center p-8">
        <span className="text-sm text-gray-400">{t('content.loading', 'Loading content…')}</span>
      </AppCard>
    );
  }

  return (
    <div className="gp-content-editor mx-auto w-full max-w-[1440px] space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-cyan-500">
            <LayoutPanelTop className="h-4 w-4" />
            {t('content.administration', 'Administration')}
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t('content.title', 'Panel content')}
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            {t('content.description', 'Publish news, sidebar links, resources and tutorials without editing JSON files.')}
          </p>
        </div>
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
          <AppButton
            tone="primary"
            onClick={() => void save()}
            disabled={saving || !isDirty}
            className="w-full gap-2 px-5 sm:w-auto"
          >
            {isDirty ? <Save className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {saving
              ? t('common.saving', 'Saving…')
              : isDirty
                ? t('content.save', 'Save and publish')
                : t('content.upToDate', 'Published content is up to date')}
          </AppButton>
          {isDirty && (
            <span className="text-xs font-medium text-amber-400">
              {t('content.unsavedChanges', 'There are unpublished changes.')}
            </span>
          )}
        </div>
      </header>

      {message && <AppAlert tone={message.tone}>{message.text}</AppAlert>}

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={<Megaphone className="h-5 w-5" />}
          label={t('content.news', 'News banner')}
          value={content.news.source === 'local'
            ? t('content.itemCount', '{count} items', { count: content.news.items.length })
            : t('content.remoteSource', 'Remote source')}
          active={content.news.enabled}
        />
        <SummaryCard
          icon={<Link2 className="h-5 w-5" />}
          label={t('content.social', 'Sidebar links')}
          value={t('content.linkCount', '{count} links', { count: content.social.links.length })}
          active={content.social.enabled}
        />
        <SummaryCard
          icon={<BookOpen className="h-5 w-5" />}
          label={t('content.resources', 'Resources and tutorials')}
          value={content.resources.source === 'local'
            ? t('content.resourceCount', '{count} resources', { count: content.resources.items.length })
            : t('content.remoteSource', 'Remote source')}
          active
        />
      </div>

      <nav
        className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.025] p-2 sm:grid-cols-3"
        aria-label={t('content.sections', 'Content sections')}
      >
        <SectionTab
          active={activeSection === 'news'}
          icon={<Megaphone className="h-4 w-4" />}
          label={t('content.news', 'News banner')}
          count={content.news.source === 'local' ? content.news.items.length : undefined}
          onClick={() => setActiveSection('news')}
        />
        <SectionTab
          active={activeSection === 'social'}
          icon={<Link2 className="h-4 w-4" />}
          label={t('content.social', 'Sidebar links')}
          count={content.social.links.length}
          onClick={() => setActiveSection('social')}
        />
        <SectionTab
          active={activeSection === 'resources'}
          icon={<BookOpen className="h-4 w-4" />}
          label={t('content.resources', 'Resources and tutorials')}
          count={content.resources.source === 'local' ? content.resources.items.length : undefined}
          onClick={() => setActiveSection('resources')}
        />
      </nav>

      {activeSection === 'news' && (
        <EditorSectionCard
          icon={<Megaphone className="h-5 w-5" />}
          title={t('content.news', 'News banner')}
          description={t('content.newsDescription', 'Configure the rotating banner shown above the game server list.')}
          action={content.news.source === 'local' ? (
            <AddButton label={t('content.addNews', 'Add news')} onClick={() => {
              const timestamp = Date.now();
              setContent({
                ...content,
                news: {
                  ...content.news,
                  items: [...content.news.items, {
                    id: timestamp,
                    title: '',
                    description: '',
                    date: timestamp,
                    type: 'announcement',
                    iconKey: 'news',
                    position: content.news.items.length + 1,
                  }],
                },
              });
            }} />
          ) : undefined}
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <TogglePanel
              label={t('content.bannerEnabled', 'Display news banner')}
              description={t('content.bannerEnabledHint', 'Shows or hides the banner without deleting its content.')}
              checked={content.news.enabled}
              onChange={(enabled) => setContent({ ...content, news: { ...content.news, enabled } })}
            />
            <Field label={t('content.source', 'Content source')} hint={t('content.sourceHint', 'Use locally managed items or a remote catalog.')}>
              <SourceSelect
                value={content.news.source}
                onChange={(source) => setContent({ ...content, news: { ...content.news, source } })}
                t={t}
              />
            </Field>
            <Field label={t('content.rotation', 'Rotation interval (seconds)')} hint={t('content.rotationHint', 'Minimum of 5 seconds between items.')}>
              <AppInput
                className="w-full"
                type="number"
                min={5}
                value={content.news.rotationSeconds}
                onChange={(event) => setContent({
                  ...content,
                  news: { ...content.news, rotationSeconds: Number(event.target.value) },
                })}
              />
            </Field>
          </div>

          {content.news.source === 'remote' ? (
            <RemoteSourceField
              value={content.news.remoteUrl || ''}
              onChange={(remoteUrl) => setContent({ ...content, news: { ...content.news, remoteUrl } })}
              t={t}
            />
          ) : (
            <ItemCollection
              empty={content.news.items.length === 0}
              emptyTitle={t('content.noNews', 'No news items configured.')}
              emptyDescription={t('content.noNewsHint', 'Add the first item to start using the local news banner.')}
            >
              {content.news.items.map((item, index) => (
                <EditableItemCard
                  key={`${item.id}-${index}`}
                  index={index}
                  title={item.title || t('content.untitledNews', 'Untitled news item')}
                  kind={t('content.newsItem', 'News')}
                  deleteLabel={t('content.removeNews', 'Remove news item')}
                  onDelete={() => setContent({
                    ...content,
                    news: { ...content.news, items: content.news.items.filter((_, i) => i !== index) },
                  })}
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label={t('content.itemTitle', 'Title')}>
                      <AppInput className="w-full" value={item.title} onChange={(event) => updateNews(index, { title: event.target.value })} />
                    </Field>
                    <Field label={t('content.itemType', 'Type')}>
                      <AppInput className="w-full" value={item.type || ''} onChange={(event) => updateNews(index, { type: event.target.value })} />
                    </Field>
                  </div>
                  <Field label={t('content.itemDescription', 'Description')}>
                    <textarea
                      className="gp-native-textarea min-h-24 w-full resize-y"
                      value={item.description}
                      onChange={(event) => updateNews(index, { description: event.target.value })}
                    />
                  </Field>
                </EditableItemCard>
              ))}
            </ItemCollection>
          )}
        </EditorSectionCard>
      )}

      {activeSection === 'social' && (
        <EditorSectionCard
          icon={<Link2 className="h-5 w-5" />}
          title={t('content.social', 'Sidebar links')}
          description={t('content.socialDescription', 'Manage the follow-us section and external links displayed in the sidebar.')}
          action={<AddButton label={t('content.addLink', 'Add link')} onClick={() => setContent({
            ...content,
            social: {
              ...content.social,
              links: [...content.social.links, { label: '', url: '', icon: 'website' }],
            },
          })} />}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <TogglePanel
              label={t('content.sidebarEnabled', 'Display sidebar links')}
              description={t('content.sidebarEnabledHint', 'Shows or hides the complete follow-us section.')}
              checked={content.social.enabled}
              onChange={(enabled) => setContent({ ...content, social: { ...content.social, enabled } })}
            />
            <Field label={t('content.sectionTitle', 'Section title')} hint={t('content.sectionTitleHint', 'Title displayed above the links.')}>
              <AppInput
                className="w-full"
                value={content.social.title || ''}
                onChange={(event) => setContent({
                  ...content,
                  social: { ...content.social, title: event.target.value },
                })}
              />
            </Field>
          </div>

          <ItemCollection
            empty={content.social.links.length === 0}
            emptyTitle={t('content.noLinks', 'No sidebar links configured.')}
            emptyDescription={t('content.noLinksHint', 'Add a link to a community or project channel.')}
          >
            {content.social.links.map((link, index) => (
              <EditableItemCard
                key={index}
                index={index}
                title={link.label || t('content.untitledLink', 'Untitled link')}
                kind={t('content.sidebarLink', 'Sidebar link')}
                deleteLabel={t('content.removeLink', 'Remove link')}
                onDelete={() => setContent({
                  ...content,
                  social: { ...content.social, links: content.social.links.filter((_, i) => i !== index) },
                })}
              >
                <div className="grid gap-4 lg:grid-cols-[minmax(180px,0.7fr)_minmax(280px,1.5fr)_minmax(160px,0.5fr)]">
                  <Field label={t('content.linkLabel', 'Label')}>
                    <AppInput className="w-full" value={link.label} onChange={(event) => updateSocial(index, { label: event.target.value })} />
                  </Field>
                  <Field label={t('content.url', 'URL')}>
                    <AppInput className="w-full" value={link.url} onChange={(event) => updateSocial(index, { url: event.target.value })} />
                  </Field>
                  <Field label={t('content.icon', 'Icon')}>
                    <AppSelect
                      className="w-full"
                      value={link.icon || 'website'}
                      onChange={(icon) => updateSocial(index, { icon })}
                      options={['github', 'discord', 'youtube', 'instagram', 'linkedin', 'website'].map((icon) => ({
                        value: icon,
                        label: icon.charAt(0).toUpperCase() + icon.slice(1),
                      }))}
                    />
                  </Field>
                </div>
              </EditableItemCard>
            ))}
          </ItemCollection>
        </EditorSectionCard>
      )}

      {activeSection === 'resources' && (
        <EditorSectionCard
          icon={<BookOpen className="h-5 w-5" />}
          title={t('content.resources', 'Resources and tutorials')}
          description={t('content.resourcesDescription', 'Publish documentation, guides and useful links in the Resources screen.')}
          action={content.resources.source === 'local' ? (
            <AddButton label={t('content.addResource', 'Add resource')} onClick={() => setContent({
              ...content,
              resources: {
                ...content.resources,
                items: [...content.resources.items, {
                  id: Date.now(),
                  title: '',
                  description: '',
                  url: '',
                  category: '',
                  mediaType: 'article',
                  gameKey: null,
                }],
              },
            })} />
          ) : undefined}
        >
          <div className="max-w-xl">
            <Field label={t('content.source', 'Content source')} hint={t('content.resourceSourceHint', 'Choose local items or a remote resources endpoint.')}>
              <SourceSelect
                value={content.resources.source}
                onChange={(source) => setContent({
                  ...content,
                  resources: { ...content.resources, source },
                })}
                t={t}
              />
            </Field>
          </div>

          {content.resources.source === 'remote' ? (
            <RemoteSourceField
              value={content.resources.remoteUrl || ''}
              onChange={(remoteUrl) => setContent({
                ...content,
                resources: { ...content.resources, remoteUrl },
              })}
              t={t}
            />
          ) : (
            <ItemCollection
              empty={content.resources.items.length === 0}
              emptyTitle={t('content.noResources', 'No resources configured.')}
              emptyDescription={t('content.noResourcesHint', 'Add a guide, tutorial or useful external link.')}
            >
              {content.resources.items.map((item, index) => (
                <EditableItemCard
                  key={`${item.id}-${index}`}
                  index={index}
                  title={item.title || t('content.untitledResource', 'Untitled resource')}
                  kind={item.category || t('content.resource', 'Resource')}
                  deleteLabel={t('content.removeResource', 'Remove resource')}
                  onDelete={() => setContent({
                    ...content,
                    resources: {
                      ...content.resources,
                      items: content.resources.items.filter((_, i) => i !== index),
                    },
                  })}
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label={t('content.itemTitle', 'Title')}>
                      <AppInput className="w-full" value={item.title} onChange={(event) => updateResource(index, { title: event.target.value })} />
                    </Field>
                    <Field label={t('content.category', 'Category')}>
                      <AppInput className="w-full" value={item.category} onChange={(event) => updateResource(index, { category: event.target.value })} />
                    </Field>
                  </div>
                  <Field label={t('content.itemDescription', 'Description')}>
                    <textarea
                      className="gp-native-textarea min-h-24 w-full resize-y"
                      value={item.description}
                      onChange={(event) => updateResource(index, { description: event.target.value })}
                    />
                  </Field>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label={t('content.url', 'URL')}>
                      <AppInput className="w-full" value={item.url} onChange={(event) => updateResource(index, { url: event.target.value })} />
                    </Field>
                    <Field label={t('content.gameKey', 'Game key (optional)')}>
                      <AppInput className="w-full" value={item.gameKey || ''} onChange={(event) => updateResource(index, { gameKey: event.target.value || null })} />
                    </Field>
                  </div>
                </EditableItemCard>
              ))}
            </ItemCollection>
          )}
        </EditorSectionCard>
      )}
    </div>
  );

  function updateNews(index: number, patch: Partial<EditablePanelContent['news']['items'][number]>) {
    setContent({
      ...content,
      news: {
        ...content.news,
        items: content.news.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
      },
    });
  }

  function updateSocial(index: number, patch: Partial<EditablePanelContent['social']['links'][number]>) {
    setContent({
      ...content,
      social: {
        ...content.social,
        links: content.social.links.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
      },
    });
  }

  function updateResource(index: number, patch: Partial<EditablePanelContent['resources']['items'][number]>) {
    setContent({
      ...content,
      resources: {
        ...content.resources,
        items: content.resources.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
      },
    });
  }
}

function EditorSectionCard({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <AppCard className="overflow-hidden p-0">
      <div className="flex flex-col gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-cyan-500/10 p-2.5 text-cyan-400">{icon}</span>
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm leading-5 text-gray-400">{description}</p>
          </div>
        </div>
        {action}
      </div>
      <div className="space-y-5 p-5 sm:p-6">{children}</div>
    </AppCard>
  );
}

function SummaryCard({ icon, label, value, active }: { icon: ReactNode; label: string; value: string; active: boolean }) {
  return (
    <AppCard className="flex items-center gap-3 p-4">
      <span className="rounded-lg bg-white/[0.05] p-2.5 text-cyan-400">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-gray-500">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold">{value}</p>
      </div>
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${active ? 'bg-emerald-400' : 'bg-gray-500'}`} />
    </AppCard>
  );
}

function SectionTab({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  count?: number;
  onClick: () => void;
}) {
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
      {icon}
      <span className="truncate">{label}</span>
      {count !== undefined && (
        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${active ? 'bg-black/10' : 'bg-white/[0.06]'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="text-xs leading-5 text-gray-500">{hint}</span>}
    </label>
  );
}

function TogglePanel({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-[92px] items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
      </div>
      <AppToggle checked={checked} onChange={onChange} />
    </div>
  );
}

function SourceSelect({
  value,
  onChange,
  t,
}: {
  value: 'local' | 'remote';
  onChange: (source: 'local' | 'remote') => void;
  t: (key: string, fallback?: string) => string;
}) {
  return (
    <AppSelect
      className="w-full"
      value={value}
      onChange={(next) => onChange(next as 'local' | 'remote')}
      options={[
        { value: 'local', label: t('content.localSource', 'Managed in the panel') },
        { value: 'remote', label: t('content.remoteUrlSource', 'Remote URL') },
      ]}
    />
  );
}

function RemoteSourceField({
  value,
  onChange,
  t,
}: {
  value: string;
  onChange: (value: string) => void;
  t: (key: string, fallback?: string) => string;
}) {
  const canOpen = /^https?:\/\//i.test(value.trim());
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <Field label={t('content.remoteUrl', 'Remote source URL')} hint={t('content.remoteUrlHint', 'The panel will request content from this endpoint.')}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <AppInput className="w-full" value={value} onChange={(event) => onChange(event.target.value)} placeholder="https://…" />
          {canOpen && (
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-white/10 px-4 text-sm font-semibold transition hover:bg-white/[0.05]"
            >
              <ExternalLink className="h-4 w-4" />
              {t('content.openUrl', 'Open URL')}
            </a>
          )}
        </div>
      </Field>
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <AppButton tone="secondary" onClick={onClick} className="w-full shrink-0 gap-2 px-4 sm:w-auto">
      <Plus className="h-4 w-4" />{label}
    </AppButton>
  );
}

function ItemCollection({
  empty,
  emptyTitle,
  emptyDescription,
  children,
}: {
  empty: boolean;
  emptyTitle: string;
  emptyDescription: string;
  children: ReactNode;
}) {
  if (empty) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 px-6 py-10 text-center">
        <p className="font-semibold">{emptyTitle}</p>
        <p className="mt-1 text-sm text-gray-500">{emptyDescription}</p>
      </div>
    );
  }
  return <div className="space-y-4">{children}</div>;
}

function EditableItemCard({
  index,
  title,
  kind,
  deleteLabel,
  onDelete,
  children,
}: {
  index: number;
  title: string;
  kind: string;
  deleteLabel: string;
  onDelete: () => void;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-white/10">
      <header className="flex items-center gap-3 border-b border-white/10 bg-white/[0.025] px-4 py-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-xs font-bold text-cyan-400">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{title}</h3>
          <p className="text-xs text-gray-500">{kind}</p>
        </div>
        <AppButton
          tone="critical"
          onClick={onDelete}
          aria-label={deleteLabel}
          title={deleteLabel}
          className="h-9 min-h-9 w-9 shrink-0 p-0"
        >
          <Trash2 className="h-4 w-4" />
        </AppButton>
      </header>
      <div className="space-y-4 p-4 sm:p-5">{children}</div>
    </section>
  );
}
