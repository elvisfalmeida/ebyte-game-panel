import { promises as fs } from 'node:fs';
import type { GameServerRow } from '../../../../types/gameServer.js';
import { resolveServerPath } from '../../../../services/fileExplorer.js';
import { ensureIsFile } from '../../../../utils/fsBrowser.js';
import * as dockerUtils from '../../../../utils/docker.js';
import { parseStoredEnv } from '../../../runtimeConfig.js';
import { assertOvhcloudProjectZomboidServer, PROJECT_ZOMBOID_DEFAULT_SERVERNAME } from '../projectZomboid.js';

type PzSettingType = 'boolean' | 'integer' | 'float' | 'string' | 'select';
type PzSettingFile = 'ini' | 'sandbox';
type PzSelectOption = { value: number; label: string };

type PzSettingDefinition = {
    key: string;
    file: PzSettingFile;
    label: string;
    description: string;
    type: PzSettingType;
    options?: PzSelectOption[];
    min?: number;
    max?: number;
};

type PzSettingValue = string | number | boolean;

export type PzSetting = PzSettingDefinition & {
    value: PzSettingValue;
};

const MAX_STRING_SETTING_LENGTH = 4096;

function opts(labels: string[]): PzSelectOption[] {
    return labels.map((label, index) => ({ value: index + 1, label }));
}

export const PROJECT_ZOMBOID_SETTING_DEFINITIONS: PzSettingDefinition[] = [
    // --- server (servertest.ini) ---
    { key: 'PublicName', file: 'ini', label: 'Server name', description: 'Name shown in the in-game and Steam server browser.', type: 'string' },
    { key: 'PublicDescription', file: 'ini', label: 'Server description', description: 'Short description shown in the in-game server browser.', type: 'string' },
    { key: 'Public', file: 'ini', label: 'List in server browser', description: 'Show the server in the in-game public browser.', type: 'boolean' },
    { key: 'Password', file: 'ini', label: 'Server password', description: 'Password required to join. Leave empty for no password.', type: 'string' },
    { key: 'MaxPlayers', file: 'ini', label: 'Maximum players', description: 'Maximum concurrent players (excludes admins). Above 32 may cause desync.', type: 'integer', min: 1, max: 100 },
    { key: 'PVP', file: 'ini', label: 'PVP', description: 'Allow players to hurt and kill other players.', type: 'boolean' },
    { key: 'PauseEmpty', file: 'ini', label: 'Pause when empty', description: 'Game time stops when no players are online.', type: 'boolean' },
    { key: 'Open', file: 'ini', label: 'Open join', description: 'Allow clients to join without a pre-created whitelist account.', type: 'boolean' },
    { key: 'SaveWorldEveryMinutes', file: 'ini', label: 'Autosave interval (minutes)', description: 'Save loaded map parts every N real minutes. 0 disables periodic autosave.', type: 'integer', min: 0, max: 1440 },
    { key: 'ServerWelcomeMessage', file: 'ini', label: 'Welcome message', description: 'Message shown in chat on login. Use <LINE> for line breaks.', type: 'string' },
    { key: 'AllowCoop', file: 'ini', label: 'Allow co-op / splitscreen', description: 'Allow co-op / splitscreen players.', type: 'boolean' },
    { key: 'SleepAllowed', file: 'ini', label: 'Sleep allowed', description: 'Players may sleep when tired (not required).', type: 'boolean' },
    { key: 'SleepNeeded', file: 'ini', label: 'Sleep needed', description: 'Players get tired and need to sleep (ignored if sleep is not allowed).', type: 'boolean' },
    { key: 'AnnounceDeath', file: 'ini', label: 'Announce deaths', description: 'Broadcast a global chat message whenever a player dies.', type: 'boolean' },
    { key: 'VoiceEnable', file: 'ini', label: 'Voice chat (VOIP)', description: 'Enable in-game voice chat.', type: 'boolean' },
    { key: 'PingLimit', file: 'ini', label: 'Ping limit (ms)', description: 'Kick players above this ping. 0 disables.', type: 'integer', min: 0, max: 3000 },
    {
        key: 'MapRemotePlayerVisibility', file: 'ini', label: 'Players on map', type: 'select',
        description: 'Which remote players are shown on the in-game map.',
        options: opts(['Hidden', 'Friends', 'Friends and nearby', 'Everyone']),
    },

    // --- world (servertest_SandboxVars.lua) ---
    {
        key: 'Zombies', file: 'sandbox', label: 'Zombie population', type: 'select',
        description: 'Overall zombie density across the map.',
        options: opts(['Insane', 'Very High', 'High', 'Normal', 'Low', 'None']),
    },
    {
        key: 'Distribution', file: 'sandbox', label: 'Zombie distribution', type: 'select',
        description: 'How zombies are spread across the map.',
        options: opts(['Urban Focused', 'Uniform']),
    },
    {
        key: 'ZombieRespawn', file: 'sandbox', label: 'Zombie respawn', type: 'select',
        description: 'How frequently new zombies are added to the world.',
        options: opts(['High', 'Normal', 'Low', 'None']),
    },
    {
        key: 'DayLength', file: 'sandbox', label: 'Day length', type: 'select',
        description: 'Length of an in-game day.',
        options: opts([
            '15 Minutes', '30 Minutes', '1 Hour', '1 Hour 30 Minutes', '2 Hours', '3 Hours', '4 Hours',
            '5 Hours', '6 Hours', '7 Hours', '8 Hours', '9 Hours', '10 Hours', '11 Hours', '12 Hours',
            '13 Hours', '14 Hours', '15 Hours', '16 Hours', '17 Hours', '18 Hours', '19 Hours', '20 Hours',
            '21 Hours', '22 Hours', '23 Hours', 'Real-time',
        ]),
    },
    {
        key: 'StartMonth', file: 'sandbox', label: 'Start month', type: 'select',
        description: 'Month in which the game starts.',
        options: opts(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']),
    },
    {
        key: 'StartTime', file: 'sandbox', label: 'Start time', type: 'select',
        description: 'Time of day at which the game starts.',
        options: opts(['7 AM', '9 AM', '12 PM', '2 PM', '5 PM', '9 PM', '12 AM', '2 AM', '5 AM']),
    },
    {
        key: 'DayNightCycle', file: 'sandbox', label: 'Day/night cycle', type: 'select',
        description: 'Whether the time of day changes naturally.',
        options: opts(['Normal', 'Endless Day', 'Endless Night']),
    },
    {
        key: 'ClimateCycle', file: 'sandbox', label: 'Weather', type: 'select',
        description: 'Whether weather changes or stays fixed.',
        options: opts(['Normal', 'No Weather', 'Endless Rain', 'Endless Storm', 'Endless Snow', 'Endless Blizzard']),
    },
    {
        key: 'WaterShut', file: 'sandbox', label: 'Water shutoff', type: 'select',
        description: 'How long before plumbing stops being an infinite water source.',
        options: opts(['Instant', '0-30 Days', '0-2 Months', '0-6 Months', '0-1 Year', '0-5 Years', '2-6 Months', '6-12 Months', 'Disabled']),
    },
    {
        key: 'ElecShut', file: 'sandbox', label: 'Electricity shutoff', type: 'select',
        description: 'How long before the world electricity turns off for good.',
        options: opts(['Instant', '14-30 Days', '14 Days - 2 Months', '14 Days - 6 Months', '14 Days - 1 Year', '14 Days - 5 Years', '2-6 Months', '6-12 Months', 'Disabled']),
    },

    // --- zombie lore (servertest_SandboxVars.lua -> ZombieLore.*) ---
    {
        key: 'ZombieLore.Speed', file: 'sandbox', label: 'Zombie speed', type: 'select',
        description: 'How fast zombies move.',
        options: opts(['Sprinters', 'Fast Shamblers', 'Shamblers', 'Random']),
    },
    {
        key: 'ZombieLore.Strength', file: 'sandbox', label: 'Zombie strength', type: 'select',
        description: 'Damage zombies inflict per attack.',
        options: opts(['Superhuman', 'Normal', 'Weak', 'Random']),
    },
    {
        key: 'ZombieLore.Toughness', file: 'sandbox', label: 'Zombie toughness', type: 'select',
        description: 'How hard zombies are to kill.',
        options: opts(['Tough', 'Normal', 'Fragile', 'Random']),
    },
    {
        key: 'ZombieLore.Transmission', file: 'sandbox', label: 'Infection transmission', type: 'select',
        description: 'How the Knox infection spreads.',
        options: opts(['Blood and Saliva', 'Saliva Only', "Everyone's Infected", 'None']),
    },
    {
        key: 'ZombieLore.Mortality', file: 'sandbox', label: 'Infection mortality', type: 'select',
        description: 'How quickly the infection takes effect.',
        options: opts(['Instant', '0-30 Seconds', '0-1 Minutes', '0-12 Hours', '2-3 Days', '1-2 Weeks', 'Never']),
    },
    {
        key: 'ZombieLore.Reanimate', file: 'sandbox', label: 'Reanimation time', type: 'select',
        description: 'How quickly infected corpses rise as zombies.',
        options: opts(['Instant', '0-30 Seconds', '0-1 Minutes', '0-12 Hours', '2-3 Days', '1-2 Weeks']),
    },
    {
        key: 'ZombieLore.Cognition', file: 'sandbox', label: 'Zombie cognition', type: 'select',
        description: 'Zombie intelligence / navigation.',
        options: opts(['Navigate and Use Doors', 'Navigate', 'Basic Navigation', 'Random']),
    },
    {
        key: 'ZombieLore.Memory', file: 'sandbox', label: 'Zombie memory', type: 'select',
        description: 'How long zombies remember a player after seeing or hearing them.',
        options: opts(['Long', 'Normal', 'Short', 'None', 'Random', 'Random (Normal-None)']),
    },
    {
        key: 'ZombieLore.Sight', file: 'sandbox', label: 'Zombie sight', type: 'select',
        description: 'Zombie vision radius.',
        options: opts(['Eagle', 'Normal', 'Poor', 'Random', 'Random (Normal-Poor)']),
    },
    {
        key: 'ZombieLore.Hearing', file: 'sandbox', label: 'Zombie hearing', type: 'select',
        description: 'Zombie hearing radius.',
        options: opts(['Pinpoint', 'Normal', 'Poor', 'Random', 'Random (Normal-Poor)']),
    },
];

const DEFINITIONS_BY_KEY = new Map(PROJECT_ZOMBOID_SETTING_DEFINITIONS.map((d) => [d.key, d]));

function invalidInput(message: string): never {
    throw Object.assign(new Error(message), { statusCode: 400 });
}

export function resolveServerName(server: GameServerRow): string {
    const prefix = 'PZ_SERVERNAME=';
    let value = PROJECT_ZOMBOID_DEFAULT_SERVERNAME;
    for (const entry of parseStoredEnv(server)) {
        if (entry.startsWith(prefix)) value = entry.slice(prefix.length);
    }
    return value || PROJECT_ZOMBOID_DEFAULT_SERVERNAME;
}

export function iniFilePath(serverName: string): string {
    return `/zomboid/Server/${serverName}.ini`;
}

function sandboxFilePath(serverName: string): string {
    return `/zomboid/Server/${serverName}_SandboxVars.lua`;
}

export async function readConfigFile(serverId: number, filePath: string, mustExist: boolean): Promise<string | null> {
    try {
        const resolved = await resolveServerPath({ serverId, root: 'data', path: filePath });
        if (mustExist) await ensureIsFile(resolved.absPath, resolved.rootDir);
        return await fs.readFile(resolved.absPath, 'utf8');
    } catch (error) {
        if (mustExist) throw error;
        return null;
    }
}

export async function writeConfigFile(serverId: number, filePath: string, content: string): Promise<void> {
    const resolved = await resolveServerPath({ serverId, root: 'data', path: filePath });
    await ensureIsFile(resolved.absPath, resolved.rootDir);
    await fs.writeFile(resolved.absPath, content, 'utf8');
}

// --- INI (flat KEY=VALUE, one per line) ---

export function getIniRawValue(content: string, key: string): string | null {
    const match = content.match(new RegExp(`(?:^|\\n)${key}=([^\\n\\r]*)`));
    return match ? match[1] : null;
}

export function setIniRawValue(content: string, key: string, rawValue: string): string {
    const re = new RegExp(`((?:^|\\n)${key}=)[^\\n\\r]*`);
    if (re.test(content)) {
        return content.replace(re, `$1${rawValue}`);
    }
    const suffix = content.endsWith('\n') ? '' : '\n';
    return `${content}${suffix}${key}=${rawValue}\n`;
}

// --- Lua (SandboxVars table; supports top-level KEY and one-level PARENT.CHILD) ---

function sandboxSubBlockRange(content: string, parent: string): { start: number; end: number } | null {
    const open = content.match(new RegExp(`${parent}\\s*=\\s*\\{`));
    if (!open || open.index === undefined) return null;
    const bodyStart = open.index + open[0].length;
    const end = content.indexOf('}', bodyStart);
    if (end < 0) return null;
    return { start: bodyStart, end };
}

function getLuaRawValue(content: string, path: string): string | null {
    const dot = path.indexOf('.');
    if (dot >= 0) {
        const parent = path.slice(0, dot);
        const child = path.slice(dot + 1);
        const range = sandboxSubBlockRange(content, parent);
        if (!range) return null;
        const block = content.slice(range.start, range.end);
        const match = block.match(new RegExp(`(?:^|\\n)[ \\t]*${child}[ \\t]*=[ \\t]*([^,\\n\\r]*)`));
        return match ? match[1].trim() : null;
    }

    const match = content.match(new RegExp(`(?:^|\\n)[ \\t]*${path}[ \\t]*=[ \\t]*([^,\\n\\r]*)`));
    return match ? match[1].trim() : null;
}

function setLuaRawValue(content: string, path: string, rawValue: string): string | null {
    const dot = path.indexOf('.');
    if (dot >= 0) {
        const parent = path.slice(0, dot);
        const child = path.slice(dot + 1);
        const range = sandboxSubBlockRange(content, parent);
        if (!range) return null;
        const block = content.slice(range.start, range.end);
        const re = new RegExp(`((?:^|\\n)[ \\t]*${child}[ \\t]*=[ \\t]*)([^,\\n\\r]*)`);
        if (!re.test(block)) return null;
        const newBlock = block.replace(re, `$1${rawValue}`);
        return content.slice(0, range.start) + newBlock + content.slice(range.end);
    }

    const re = new RegExp(`((?:^|\\n)[ \\t]*${path}[ \\t]*=[ \\t]*)([^,\\n\\r]*)`);
    if (!re.test(content)) return null;
    return content.replace(re, `$1${rawValue}`);
}

// --- value conversion ---

function convertRawValue(definition: PzSettingDefinition, raw: string): PzSettingValue | null {
    const trimmed = raw.trim();
    switch (definition.type) {
        case 'boolean': {
            const normalized = trimmed.toLowerCase();
            if (normalized === 'true') return true;
            if (normalized === 'false') return false;
            return null;
        }
        case 'integer':
        case 'select': {
            const parsed = Number(trimmed);
            return Number.isInteger(parsed) ? parsed : null;
        }
        case 'float': {
            const parsed = Number(trimmed);
            return Number.isFinite(parsed) ? parsed : null;
        }
        case 'string': {
            if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
                return trimmed.slice(1, -1);
            }
            return raw;
        }
    }
}

function serializeValue(definition: PzSettingDefinition, value: unknown): string {
    switch (definition.type) {
        case 'boolean': {
            if (typeof value !== 'boolean') invalidInput(`${definition.key} must be a boolean`);
            return value ? 'true' : 'false';
        }
        case 'integer':
        case 'float': {
            const numeric = typeof value === 'number' ? value : Number(value);
            if (!Number.isFinite(numeric)) invalidInput(`${definition.key} must be a number`);
            if (definition.type === 'integer' && !Number.isInteger(numeric)) invalidInput(`${definition.key} must be an integer`);
            if (definition.min !== undefined && numeric < definition.min) invalidInput(`${definition.key} must be >= ${definition.min}`);
            if (definition.max !== undefined && numeric > definition.max) invalidInput(`${definition.key} must be <= ${definition.max}`);
            return String(numeric);
        }
        case 'select': {
            const numeric = typeof value === 'number' ? value : Number(value);
            if (!Number.isInteger(numeric) || !definition.options?.some((option) => option.value === numeric)) {
                invalidInput(`${definition.key} must be one of: ${definition.options?.map((o) => o.value).join(', ')}`);
            }
            return String(numeric);
        }
        case 'string': {
            if (typeof value !== 'string') invalidInput(`${definition.key} must be a string`);
            if (value.length > MAX_STRING_SETTING_LENGTH || /[\r\n\0]/.test(value)) {
                invalidInput(`${definition.key} contains invalid characters`);
            }
            return definition.file === 'sandbox' ? `"${value}"` : value;
        }
    }
}

export async function listProjectZomboidSettings(server: GameServerRow): Promise<PzSetting[]> {
    assertOvhcloudProjectZomboidServer(server);

    const serverName = resolveServerName(server);
    const iniContent = await readConfigFile(server.id, iniFilePath(serverName), false);
    const sandboxContent = await readConfigFile(server.id, sandboxFilePath(serverName), false);

    return PROJECT_ZOMBOID_SETTING_DEFINITIONS
        .map((definition) => {
            const content = definition.file === 'ini' ? iniContent : sandboxContent;
            if (content === null) return null;

            const raw = definition.file === 'ini'
                ? getIniRawValue(content, definition.key)
                : getLuaRawValue(content, definition.key);
            if (raw === null) return null;

            const value = convertRawValue(definition, raw);
            if (value === null) return null;

            return { ...definition, value };
        })
        .filter((setting): setting is PzSetting => Boolean(setting));
}

export async function patchProjectZomboidSettings(
    server: GameServerRow & { docker_container_id: string },
    updates: Record<string, unknown>
): Promise<{ updated: string[]; settings: PzSetting[] }> {
    assertOvhcloudProjectZomboidServer(server);

    const entries = Object.entries(updates);
    if (entries.length === 0) invalidInput('settings must contain at least one value');

    if (server.docker_container_id) {
        const status = await dockerUtils.checkContainerStatus(server.docker_container_id);
        if (status === 'running') {
            throw Object.assign(
                new Error('Stop the server before changing settings: Project Zomboid rewrites its config files on shutdown and would overwrite the changes.'),
                { statusCode: 409 }
            );
        }
    }

    const serverName = resolveServerName(server);
    const iniPath = iniFilePath(serverName);
    const sandboxPath = sandboxFilePath(serverName);

    let iniContent = await readConfigFile(server.id, iniPath, false);
    let sandboxContent = await readConfigFile(server.id, sandboxPath, false);
    let iniDirty = false;
    let sandboxDirty = false;

    const updated: string[] = [];

    for (const [key, value] of entries) {
        const definition = DEFINITIONS_BY_KEY.get(key);
        if (!definition) invalidInput(`Unsupported Project Zomboid setting: ${key}`);

        const rawValue = serializeValue(definition, value);

        if (definition.file === 'ini') {
            if (iniContent === null) invalidInput('Server configuration is not generated yet; start the server once before editing settings.');
            iniContent = setIniRawValue(iniContent, definition.key, rawValue);
            iniDirty = true;
        } else {
            if (sandboxContent === null) invalidInput('Server configuration is not generated yet; start the server once before editing settings.');
            const next = setLuaRawValue(sandboxContent, definition.key, rawValue);
            if (next === null) invalidInput(`Setting ${definition.key} was not found in the sandbox configuration.`);
            sandboxContent = next;
            sandboxDirty = true;
        }

        updated.push(key);
    }

    if (iniDirty && iniContent !== null) await writeConfigFile(server.id, iniPath, iniContent);
    if (sandboxDirty && sandboxContent !== null) await writeConfigFile(server.id, sandboxPath, sandboxContent);

    return {
        updated,
        settings: await listProjectZomboidSettings(server),
    };
}
