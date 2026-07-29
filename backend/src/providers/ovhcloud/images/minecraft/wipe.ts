import type { GameServerRow } from '../../../../types/gameServer.js';
import { readMinecraftLevelName } from './settings.js';

export async function resolveMinecraftSoftWipeTargets(server: GameServerRow): Promise<string[]> {
    const levelName = await readMinecraftLevelName(server);
    return [
        `/${levelName}`,
        `/${levelName}_nether`,
        `/${levelName}_the_end`,
        `/worlds/${levelName}`,
    ];
}
