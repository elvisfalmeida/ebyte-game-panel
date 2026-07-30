import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { usePanelContentActions } from '../contexts/PanelContentContext';
import { apiClient, type EditablePanelContent } from '../utils/api';
import { AppAlert, AppButton, AppCard, AppInput, AppToggle } from '../src/ui/components';

const inputClass = 'w-full';
const emptyContent: EditablePanelContent = {
  news: { enabled: true, source: 'local', rotationSeconds: 15, items: [] },
  social: { enabled: true, title: '', links: [] },
  resources: { source: 'local', items: [] },
};

export function PanelContentEditor() {
  const { t } = useLanguage();
  const { reload } = usePanelContentActions();
  const [content, setContent] = useState<EditablePanelContent>(emptyContent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'critical'; text: string } | null>(null);

  useEffect(() => {
    apiClient.getPanelContent()
      .then(setContent)
      .catch(() => setMessage({ tone: 'critical', text: t('content.loadError', 'Unable to load panel content.') }))
      .finally(() => setLoading(false));
  }, [t]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const result = await apiClient.updatePanelContent(content);
      setContent(result.content);
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

  if (loading) return <div className="p-6 text-sm text-gray-400">{t('content.loading', 'Loading content…')}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('content.title', 'Panel content')}</h1>
          <p className="mt-1 text-sm text-gray-400">
            {t('content.description', 'Publish news, sidebar links, resources and tutorials without editing JSON files.')}
          </p>
        </div>
        <AppButton onClick={save} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? t('common.saving', 'Saving…') : t('content.save', 'Save and publish')}
        </AppButton>
      </div>

      {message && <AppAlert tone={message.tone}>{message.text}</AppAlert>}

      <EditorCard title={t('content.news', 'News banner')}>
        <div className="grid gap-4 md:grid-cols-3">
          <ToggleField label={t('content.enabled', 'Enabled')}>
            <AppToggle checked={content.news.enabled} onChange={(enabled) => setContent({ ...content, news: { ...content.news, enabled } })} />
          </ToggleField>
          <SelectField label={t('content.source', 'Content source')} value={content.news.source}
            onChange={(source) => setContent({ ...content, news: { ...content.news, source: source as 'local' | 'remote' } })} />
          <Field label={t('content.rotation', 'Rotation interval (seconds)')}>
            <AppInput type="number" min={5} value={content.news.rotationSeconds}
              onChange={(event) => setContent({ ...content, news: { ...content.news, rotationSeconds: Number(event.target.value) } })} />
          </Field>
        </div>
        {content.news.source === 'remote' && (
          <Field label={t('content.remoteUrl', 'Remote source URL')}>
            <AppInput className={inputClass} value={content.news.remoteUrl || ''}
              onChange={(event) => setContent({ ...content, news: { ...content.news, remoteUrl: event.target.value } })} />
          </Field>
        )}
        {content.news.source === 'local' && (
          <ItemList
            addLabel={t('content.addNews', 'Add news')}
            onAdd={() => setContent({ ...content, news: { ...content.news, items: [...content.news.items, {
              id: Date.now(), title: '', description: '', date: Date.now(), type: 'announcement', iconKey: 'news', position: content.news.items.length + 1,
            }] } })}
          >
            {content.news.items.map((item, index) => (
              <ItemCard key={`${item.id}-${index}`} onDelete={() => setContent({ ...content, news: { ...content.news, items: content.news.items.filter((_, i) => i !== index) } })}>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label={t('content.itemTitle', 'Title')}><AppInput value={item.title} onChange={(e) => updateNews(index, { title: e.target.value })} /></Field>
                  <Field label={t('content.itemType', 'Type')}><AppInput value={item.type || ''} onChange={(e) => updateNews(index, { type: e.target.value })} /></Field>
                </div>
                <Field label={t('content.itemDescription', 'Description')}><textarea className="gp-native-textarea" value={item.description} onChange={(e) => updateNews(index, { description: e.target.value })} /></Field>
              </ItemCard>
            ))}
          </ItemList>
        )}
      </EditorCard>

      <EditorCard title={t('content.social', 'Sidebar links')}>
        <div className="grid gap-4 md:grid-cols-2">
          <ToggleField label={t('content.enabled', 'Enabled')}>
            <AppToggle checked={content.social.enabled} onChange={(enabled) => setContent({ ...content, social: { ...content.social, enabled } })} />
          </ToggleField>
          <Field label={t('content.sectionTitle', 'Section title')}>
            <AppInput value={content.social.title || ''} onChange={(e) => setContent({ ...content, social: { ...content.social, title: e.target.value } })} />
          </Field>
        </div>
        <ItemList addLabel={t('content.addLink', 'Add link')} onAdd={() => setContent({ ...content, social: { ...content.social, links: [...content.social.links, { label: '', url: '', icon: 'website' }] } })}>
          {content.social.links.map((link, index) => (
            <ItemCard key={index} onDelete={() => setContent({ ...content, social: { ...content.social, links: content.social.links.filter((_, i) => i !== index) } })}>
              <div className="grid gap-3 md:grid-cols-3">
                <Field label={t('content.linkLabel', 'Label')}><AppInput value={link.label} onChange={(e) => updateSocial(index, { label: e.target.value })} /></Field>
                <Field label={t('content.url', 'URL')}><AppInput value={link.url} onChange={(e) => updateSocial(index, { url: e.target.value })} /></Field>
                <Field label={t('content.icon', 'Icon')}>
                  <select className="gp-native-select" value={link.icon || 'website'} onChange={(e) => updateSocial(index, { icon: e.target.value })}>
                    {['github', 'discord', 'youtube', 'instagram', 'linkedin', 'website'].map((icon) => <option key={icon}>{icon}</option>)}
                  </select>
                </Field>
              </div>
            </ItemCard>
          ))}
        </ItemList>
      </EditorCard>

      <EditorCard title={t('content.resources', 'Resources and tutorials')}>
        <SelectField label={t('content.source', 'Content source')} value={content.resources.source}
          onChange={(source) => setContent({ ...content, resources: { ...content.resources, source: source as 'local' | 'remote' } })} />
        {content.resources.source === 'remote' ? (
          <Field label={t('content.remoteUrl', 'Remote source URL')}>
            <AppInput value={content.resources.remoteUrl || ''} onChange={(e) => setContent({ ...content, resources: { ...content.resources, remoteUrl: e.target.value } })} />
          </Field>
        ) : (
          <ItemList addLabel={t('content.addResource', 'Add resource')} onAdd={() => setContent({ ...content, resources: { ...content.resources, items: [...content.resources.items, {
            id: Date.now(), title: '', description: '', url: '', category: '', mediaType: 'article', gameKey: null,
          }] } })}>
            {content.resources.items.map((item, index) => (
              <ItemCard key={`${item.id}-${index}`} onDelete={() => setContent({ ...content, resources: { ...content.resources, items: content.resources.items.filter((_, i) => i !== index) } })}>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label={t('content.itemTitle', 'Title')}><AppInput value={item.title} onChange={(e) => updateResource(index, { title: e.target.value })} /></Field>
                  <Field label={t('content.category', 'Category')}><AppInput value={item.category} onChange={(e) => updateResource(index, { category: e.target.value })} /></Field>
                </div>
                <Field label={t('content.itemDescription', 'Description')}><textarea className="gp-native-textarea" value={item.description} onChange={(e) => updateResource(index, { description: e.target.value })} /></Field>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label={t('content.url', 'URL')}><AppInput value={item.url} onChange={(e) => updateResource(index, { url: e.target.value })} /></Field>
                  <Field label={t('content.gameKey', 'Game key (optional)')}><AppInput value={item.gameKey || ''} onChange={(e) => updateResource(index, { gameKey: e.target.value || null })} /></Field>
                </div>
              </ItemCard>
            ))}
          </ItemList>
        )}
      </EditorCard>
    </div>
  );

  function updateNews(index: number, patch: Partial<EditablePanelContent['news']['items'][number]>) {
    const items = content.news.items.map((item, i) => i === index ? { ...item, ...patch } : item);
    setContent({ ...content, news: { ...content.news, items } });
  }
  function updateSocial(index: number, patch: Partial<EditablePanelContent['social']['links'][number]>) {
    const links = content.social.links.map((item, i) => i === index ? { ...item, ...patch } : item);
    setContent({ ...content, social: { ...content.social, links } });
  }
  function updateResource(index: number, patch: Partial<EditablePanelContent['resources']['items'][number]>) {
    const items = content.resources.items.map((item, i) => i === index ? { ...item, ...patch } : item);
    setContent({ ...content, resources: { ...content.resources, items } });
  }
}

function EditorCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <AppCard className="space-y-5 p-5"><h2 className="text-lg font-semibold">{title}</h2>{children}</AppCard>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-2 text-sm font-medium"><span>{label}</span>{children}</label>;
}
function ToggleField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-4 py-3 text-sm font-medium"><span>{label}</span>{children}</div>;
}
function SelectField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <Field label={label}><select className="gp-native-select" value={value} onChange={(event) => onChange(event.target.value)}><option value="local">Local</option><option value="remote">URL remota</option></select></Field>;
}
function ItemList({ addLabel, onAdd, children }: { addLabel: string; onAdd: () => void; children: React.ReactNode }) {
  return <div className="space-y-3"><div className="flex justify-end"><AppButton tone="secondary" onClick={onAdd} className="gap-2"><Plus className="h-4 w-4" />{addLabel}</AppButton></div>{children}</div>;
}
function ItemCard({ onDelete, children }: { onDelete: () => void; children: React.ReactNode }) {
  return <div className="space-y-3 rounded-lg border border-white/10 p-4"><div className="flex justify-end"><AppButton tone="critical" onClick={onDelete} aria-label="Remover"><Trash2 className="h-4 w-4" /></AppButton></div>{children}</div>;
}
