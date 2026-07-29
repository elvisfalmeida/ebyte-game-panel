import type { GameServerRow } from '../../../../types/gameServer.js';
import { resolveServerName } from './settings.js';

export function resolveProjectZomboidSoftWipeTargets(server: GameServerRow): string[] {
    return [`/zomboid/Saves/Multiplayer/${resolveServerName(server)}`];
}
