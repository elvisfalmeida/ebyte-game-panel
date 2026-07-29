import { promises as fs } from 'node:fs';
import path from 'node:path';
import { resolveServerPath } from '../../../../services/fileExplorer.js';

export const PALWORLD_SAVEGAMES_API_PATH = '/server/Pal/Saved/SaveGames/0';
const GAME_USER_SETTINGS_API_PATH = '/server/Pal/Saved/Config/LinuxServer/GameUserSettings.ini';

async function readDedicatedServerName(serverId: number): Promise<string | null> {
    try {
        const resolved = await resolveServerPath({ serverId, root: 'data', path: GAME_USER_SETTINGS_API_PATH });
        const content = await fs.readFile(resolved.absPath, 'utf8');
        const match = content.match(/^\s*DedicatedServerName\s*=\s*(.+?)\s*$/m);
        const name = match?.[1]?.trim();
        if (!name || name.includes('/') || name.includes('\\') || name === '.' || name === '..') return null;
        return name;
    } catch {
        return null;
    }
}

export async function resolvePalworldWorldGuid(serverId: number): Promise<string | null> {
    const resolved = await resolveServerPath({ serverId, root: 'data', path: PALWORLD_SAVEGAMES_API_PATH });

    const named = await readDedicatedServerName(serverId);
    if (named) {
        try {
            const stat = await fs.stat(path.join(resolved.absPath, named));
            if (stat.isDirectory()) return named;
        } catch {
            // The named world folder does not exist (yet) — fall back below.
        }
    }

    try {
        const entries = await fs.readdir(resolved.absPath, { withFileTypes: true });
        const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
        return dirs[0] ?? null;
    } catch {
        return null;
    }
}
