import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { AppButton } from '../../src/ui/components';
import { ConfirmationModal } from '../ConfirmationModal';
import type { WipeMode, WipeModeInfo } from './wipeModes';
import { useLanguage } from '../../contexts/LanguageContext';

export type { WipeMode, WipeModeInfo } from './wipeModes';

export interface WipeSectionProps {
  serverStatus?: string | null;
  canWrite: boolean;
  modes: WipeModeInfo[];
  // Soft returns the removed paths; hard returns reinstalling:true (see onReinstallStarted).
  onWipe: (mode: WipeMode) => Promise<{ removed?: string[]; reinstalling?: boolean }>;
  // Called after a hard wipe returns: the server reinstalls, so the caller closes the
  // settings modal and lets the normal install-progress UI take over.
  onReinstallStarted?: () => void;
  borderColor: string;
  contentBg: string;
  textPrimary: string;
  textSecondary: string;
}

// Per-tone Tailwind fragments (soft = orange, hard = red).
const TONE = {
  soft: {
    card: 'border-amber-500/40 bg-amber-500/[0.06]',
    button: 'border-amber-500/50 text-amber-400 hover:bg-amber-500/10',
    confirmButton: 'bg-amber-600 hover:bg-amber-500',
  },
  hard: {
    card: 'border-red-500/40 bg-red-500/[0.06]',
    button: 'border-red-500/50 text-red-400 hover:bg-red-500/10',
    confirmButton: 'bg-red-600 hover:bg-red-500',
  },
} as const;

type Translator = (key: string, fallback?: string, values?: Record<string, string | number>) => string;

function translateWipeItem(item: string, t: Translator): string {
  if (item.startsWith('Everything on disk:')) return t('wipe.item.everything', item);
  if (item === 'All backups') return t('wipe.item.allBackups', item);
  if (item === 'World save & player data') return t('wipe.item.worldPlayers', item);
  if (item.startsWith('World(s) & player data')) return t('wipe.item.worldsPlayers', item);
  if (item.startsWith('Universe (')) return t('wipe.item.universe', item);
  if (item.startsWith('Server config:')) return t('wipe.item.serverConfig', item);
  if (item.startsWith('Server config (')) return t('wipe.item.serverSettings', item);
  if (item.includes('Whitelist') || item.includes('whitelist')) return t('wipe.item.whitelistBans', item);
  if (item.includes('Plugins / mods')) return t('wipe.item.pluginsMods', item);
  if (item === 'Mods' || item === 'Installed mods') return t('wipe.item.mods', item);
  if (item === 'Backups') return t('wipe.item.backups', item);
  return item;
}

// Generic, game-agnostic "wipe" panel. Modes are supplied pre-filtered by the caller
// (supported by the game + permitted). Every mode is destructive with no automatic
// backup, so each is gated behind a type-to-confirm modal and requires the server to
// be stopped (the backend also enforces this, returning 409 if running).
export function WipeSection({
  serverStatus,
  canWrite,
  modes,
  onWipe,
  onReinstallStarted,
  borderColor,
  contentBg,
  textPrimary,
  textSecondary,
}: WipeSectionProps) {
  const { t } = useLanguage();
  const [pending, setPending] = useState<WipeModeInfo | null>(null);
  const [result, setResult] = useState<{ mode: string; removed: string[] } | null>(null);

  const isRunning = serverStatus === 'running';
  const canMutate = canWrite && !isRunning;

  const handleConfirm = async () => {
    if (!pending) return;
    const mode = pending;
    const data = await onWipe(mode.id);
    if (data.reinstalling) {
      onReinstallStarted?.();
      return;
    }
    setResult({ mode: t(`wipe.${mode.id}`, mode.label), removed: data.removed ?? [] });
  };

  if (modes.length === 0) return null;

  return (
    <div className={`${contentBg} border ${borderColor} rounded-lg p-4 space-y-3`}>
      <h4 className={`text-base font-semibold ${textPrimary}`}>{t('wipe.title', 'Wipe')}</h4>

      {isRunning && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{t('wipe.serverRunning', 'The server must be stopped to wipe it. After a wipe the server stays stopped and regenerates on the next start.')}</span>
        </div>
      )}

      {result && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-sm text-emerald-300">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            {result.removed.length > 0
              ? t('wipe.completePaths', `${result.mode} complete (${result.removed.length} paths removed).`, { mode: result.mode, count: result.removed.length })
              : t('wipe.complete', `${result.mode} complete.`, { mode: result.mode })}{' '}
            {t('wipe.startFresh', 'The server is stopped — start it when ready to regenerate a fresh world.')}
          </span>
        </div>
      )}

      <div className="space-y-4">
        {modes.map((mode) => {
          const tone = TONE[mode.tone];
          return (
            <div key={mode.id} className={`rounded-xl border ${tone.card} p-3.5`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${textPrimary}`}>{t(`wipe.${mode.id}`, mode.label)}</p>
                  <p className={`mt-0.5 text-xs ${textSecondary}`}>{t(`wipe.${mode.id}.description`, mode.description)}</p>

                  <div className="mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                    <div>
                      <span className="font-semibold text-red-400">{t('wipe.deleted', 'Deleted')}</span>
                      <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-gray-400">
                        {mode.deleted.map((item) => <li key={item}>{translateWipeItem(item, t)}</li>)}
                      </ul>
                    </div>
                    <div>
                      <span className="font-semibold text-emerald-400">{t('wipe.kept', 'Kept')}</span>
                      <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-gray-400">
                        {mode.kept.map((item) => <li key={item}>{translateWipeItem(item, t)}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>

                {canWrite && (
                  <AppButton
                    tone="ghost"
                    onClick={() => { setResult(null); setPending(mode); }}
                    disabled={!canMutate}
                    className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${tone.button}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t(`wipe.${mode.id}`, mode.label)}
                  </AppButton>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmationModal
        isOpen={pending !== null}
        title={pending ? `${t(`wipe.${pending.id}`, pending.label)}?` : ''}
        message={pending ? t(`wipe.${pending.id}.confirm`, pending.confirmMessage) : ''}
        icon="danger"
        requiredText={pending ? t(`wipe.${pending.id}`, pending.label).toUpperCase() : undefined}
        confirmText={pending ? t(`wipe.${pending.id}`, pending.label) : t('wipe.title', 'Wipe')}
        confirmButtonClass={pending ? TONE[pending.tone].confirmButton : undefined}
        onConfirm={handleConfirm}
        onClose={() => setPending(null)}
      />
    </div>
  );
}
