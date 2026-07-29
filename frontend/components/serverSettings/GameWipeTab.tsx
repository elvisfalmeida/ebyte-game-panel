import { apiClient } from '../../utils/api';
import { WipeSection } from './WipeSection';
import { buildWipeModes } from './wipeModes';

export interface GameWipeTabProps {
  family: string;
  serverId: number;
  serverStatus?: string | null;
  canWipeSoft: boolean;
  canWipeHard: boolean;
  // Close the settings modal so the reinstall shows via the normal install UI.
  onReinstallStarted?: () => void;
  borderColor: string;
  contentBg: string;
  textPrimary: string;
  textSecondary: string;
}

// Renders the generic WipeSection for a specific game, wiring the shared
// POST /api/servers/:id/wipe/:mode route. Modes are hardcoded per game (see wipeModes).
export function GameWipeTab({
  family,
  serverId,
  serverStatus,
  canWipeSoft,
  canWipeHard,
  onReinstallStarted,
  borderColor,
  contentBg,
  textPrimary,
  textSecondary,
}: GameWipeTabProps) {
  const modes = buildWipeModes(family, { canSoft: canWipeSoft, canHard: canWipeHard });
  return (
    <WipeSection
      serverStatus={serverStatus}
      canWrite={modes.length > 0}
      modes={modes}
      onWipe={(mode) => apiClient.wipeServer(serverId, mode)}
      onReinstallStarted={onReinstallStarted}
      borderColor={borderColor}
      contentBg={contentBg}
      textPrimary={textPrimary}
      textSecondary={textSecondary}
    />
  );
}
