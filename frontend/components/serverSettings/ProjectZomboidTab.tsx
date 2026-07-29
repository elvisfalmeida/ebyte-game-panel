import { useState } from 'react';
import { apiClient } from '../../utils/api';
import { GameSettingsSection } from './GameSettingsSection';
import { ProjectZomboidModsSection } from './ProjectZomboidModsSection';
import { ServerEnvFieldsCard, type EnvFieldDef } from './ServerEnvFieldsCard';
import { GameWipeTab } from './GameWipeTab';
import { buildWipeModes } from './wipeModes';

const ENV_FIELDS: EnvFieldDef[] = [
  {
    key: 'PZ_ADMIN_PASSWORD',
    label: 'Admin Password',
    type: 'password',
    description: 'In-game admin account password (used to run privileged console commands). This is not the server join password.',
  },
  {
    key: 'PZ_UPDATE_ON_START',
    label: 'Update on start',
    type: 'toggle',
    defaultValue: 'false',
    description: 'When enabled, the server checks for and installs game updates via SteamCMD each time it starts.',
  },
];

export interface ProjectZomboidSectionsProps {
  serverId: number;
  serverStatus?: string | null;
  canReadSettings: boolean;
  canWriteSettings: boolean;
  canReadMods: boolean;
  canWriteMods: boolean;
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

// ── ProjectZomboidSections (horizontal sub-tabs, like Hytale) ─────────────

type ProjectZomboidSubTab = 'settings' | 'mods' | 'wipe';

export function ProjectZomboidSections({
  serverId,
  serverStatus,
  canReadSettings,
  canWriteSettings,
  canReadMods,
  canWriteMods,
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
}: ProjectZomboidSectionsProps) {
  // The "Server Settings" tab holds the game settings plus the env-backed controls.
  const showSettingsTab = canReadSettings || Boolean(canManageEnv);

  const showWipeTab = buildWipeModes('project-zomboid', {
    canSoft: Boolean(canWipeSoft),
    canHard: Boolean(canWipeHard),
  }).length > 0;

  const tabs: { id: ProjectZomboidSubTab; label: string }[] = [
    showSettingsTab && { id: 'settings', label: 'Server Settings' },
    canReadMods     && { id: 'mods',     label: 'Mods' },
    showWipeTab     && { id: 'wipe',     label: 'Wipe' },
  ].filter(Boolean) as { id: ProjectZomboidSubTab; label: string }[];

  const firstTab = tabs[0]?.id ?? 'settings';
  const [activeTab, setActiveTab] = useState<ProjectZomboidSubTab>(firstTab);
  const [visited, setVisited] = useState<Set<ProjectZomboidSubTab>>(() => new Set([firstTab]));

  const switchTab = (id: ProjectZomboidSubTab) => {
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
              load={(id) => apiClient.getProjectZomboidSettings(id)}
              save={(id, changed) => apiClient.patchProjectZomboidSettings(id, changed)}
              editableOnlyWhenStopped
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

      {visited.has('mods') && canReadMods && (
        <div className={activeTab !== 'mods' ? 'hidden' : ''}>
          <ProjectZomboidModsSection
            serverId={serverId}
            serverStatus={serverStatus}
            canRead={canReadMods}
            canWrite={canWriteMods}
            borderColor={borderColor}
            contentBg={contentBg}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
          />
        </div>
      )}

      {visited.has('wipe') && showWipeTab && (
        <div className={activeTab !== 'wipe' ? 'hidden' : ''}>
          <GameWipeTab
            family="project-zomboid"
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
