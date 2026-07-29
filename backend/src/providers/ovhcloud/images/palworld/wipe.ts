import type { GameServerRow } from '../../../../types/gameServer.js';
import { PALWORLD_SAVEGAMES_API_PATH, resolvePalworldWorldGuid } from './world.js';

export async function resolvePalworldSoftWipeTargets(server: GameServerRow): Promise<string[]> {
    const guid = await resolvePalworldWorldGuid(server.id);
    if (!guid) return [];

    const base = `${PALWORLD_SAVEGAMES_API_PATH}/${guid}`;
    return [`${base}/Level.sav`, `${base}/LevelMeta.sav`, `${base}/Players`];
}
