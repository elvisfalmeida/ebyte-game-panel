import { useState } from 'react';
import { apiClient } from '../../utils/api';
import { GameSettingsSection } from './GameSettingsSection';
import { ServerEnvFieldsCard, type EnvFieldDef } from './ServerEnvFieldsCard';
import { GameWipeTab } from './GameWipeTab';
import { buildWipeModes } from './wipeModes';

const ENV_FIELDS: EnvFieldDef[] = [
  {
    key: 'PALWORLD_ADMIN_PASSWORD',
    label: 'Admin Password',
    type: 'password',
    description: "Used for in-game admin actions and the server's REST API.",
  },
  {
    key: 'PALWORLD_UPDATE_ON_START',
    label: 'Update on start',
    type: 'toggle',
    defaultValue: 'false',
    description: 'When enabled, the server checks for and installs game updates via SteamCMD each time it starts.',
  },
];

export interface PalworldSectionsProps {
  serverId: number;
  serverStatus?: string | null;
  canReadSettings: boolean;
  canWriteSettings: boolean;
  canWipeSoft?: boolean;
  canWipeHard?: boolean;
  onReinstallStarted?: () => void;
  canManageEnv?: boolean;
  canEditContainerConfig?: boolean;
  containerConfigSaveCount?: number;
  advancedLinksNode?: React.ReactNode;
  borderColor: string;
  contentBg: string;
  textPrimary: string;
  textSecondary: string;
}

// ── PalworldSections (horizontal sub-tabs) ────────────────────────────────

type PalworldSubTab = 'settings' | 'wipe';

export function PalworldSections({
  serverId,
  serverStatus,
  canReadSettings,
  canWriteSettings,
  canWipeSoft,
  canWipeHard,
  onReinstallStarted,
  canManageEnv,
  canEditContainerConfig,
  containerConfigSaveCount,
  advancedLinksNode,
  borderColor,
  contentBg,
  textPrimary,
  textSecondary,
}: PalworldSectionsProps) {
  const showSettingsTab = canReadSettings || Boolean(canManageEnv);
  const showWipeTab = buildWipeModes('palworld', {
    canSoft: Boolean(canWipeSoft),
    canHard: Boolean(canWipeHard),
  }).length > 0;

  const tabs: { id: PalworldSubTab; label: string }[] = [
    showSettingsTab && { id: 'settings', label: 'Server Settings' },
    showWipeTab     && { id: 'wipe',     label: 'Wipe' },
  ].filter(Boolean) as { id: PalworldSubTab; label: string }[];

  const firstTab = tabs[0]?.id ?? 'settings';
  const [activeTab, setActiveTab] = useState<PalworldSubTab>(firstTab);
  const [visited, setVisited] = useState<Set<PalworldSubTab>>(() => new Set([firstTab]));

  const switchTab = (id: PalworldSubTab) => {
    setActiveTab(id);
    setVisited((prev) => new Set([...prev, id]));
  };

  if (tabs.length === 0) return null;

  return (
    <div>
      {/* Horizontal tab bar — only shown when there are multiple tabs */}
      {tabs.length > 1 && (
        <div className={`flex flex-wrap border-b ${borderColor} mb-3 gap-0`}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => switchTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'border-[var(--color-cyan-400)] text-white'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {visited.has('settings') && showSettingsTab && (
        <div className={`space-y-4 ${activeTab !== 'settings' ? 'hidden' : ''}`}>
          {canReadSettings && (
            <GameSettingsSection
              serverId={serverId}
              serverStatus={serverStatus}
              canRead={canReadSettings}
              canWrite={canWriteSettings}
              load={(id) => apiClient.getPalworldSettings(id)}
              save={(id, changed) => apiClient.patchPalworldSettings(id, changed)}
              borderColor={borderColor}
              contentBg={contentBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />
          )}
          {canManageEnv && (
            <ServerEnvFieldsCard
              serverId={serverId}
              serverStatus={serverStatus}
              fields={ENV_FIELDS}
              canEdit={Boolean(canManageEnv && canEditContainerConfig)}
              containerConfigSaveCount={containerConfigSaveCount}
              borderColor={borderColor}
              contentBg={contentBg}
              textPrimary={textPrimary}
            />
          )}
          {advancedLinksNode && <div>{advancedLinksNode}</div>}
        </div>
      )}

      {visited.has('wipe') && showWipeTab && (
        <div className={activeTab !== 'wipe' ? 'hidden' : ''}>
          <GameWipeTab
            family="palworld"
            serverId={serverId}
            serverStatus={serverStatus}
            canWipeSoft={Boolean(canWipeSoft)}
            canWipeHard={Boolean(canWipeHard)}
            onReinstallStarted={onReinstallStarted}
            borderColor={borderColor}
            contentBg={contentBg}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
          />
        </div>
      )}
    </div>
  );
}
