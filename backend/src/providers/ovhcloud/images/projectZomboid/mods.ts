import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { GameServerRow } from '../../../../types/gameServer.js';
import { resolveServerPath } from '../../../../services/fileExplorer.js';
import * as dockerUtils from '../../../../utils/docker.js';
import { ensureServerMountDirs } from '../../../../utils/storage.js';
import { getRuntimeOwnership, parseStoredMounts } from '../../../runtimeConfig.js';
import { assertOvhcloudProjectZomboidServer } from '../projectZomboid.js';
import {
    iniFilePath,
    readConfigFile,
    resolveServerName,
    setIniRawValue,
    writeConfigFile,
} from './settings.js';

const PROJECT_ZOMBOID_WORKSHOP_APP_ID = 108600;
const SIDECAR_API_PATH = '/.gamepanel/pz-mods.json';
const STEAM_API_URL = 'https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/';
const MAX_DESCRIPTION_LENGTH = 2000;

export type PzWorkshopMetadata = {
    workshopId: string;
    title: string;
    previewUrl: string;
    description: string;
    tags: string[];
};

export type PzModEntry = {
    id: string;
    enabled: boolean;
};

export type PzMod = {
    workshopId: string;
    modIds: PzModEntry[];
    enabled: boolean;
    title: string;
    previewUrl: string;
    description: string;
    tags: string[];
};

type PzModStore = { mods: PzMod[] };

export type PzAddModsResult = {
    mods: PzMod[];
    added: string[];
    failed: string[];
    skipped: string[];
};

type WorkshopDetail = {
    workshopId: string;
    exists: boolean;
    isProjectZomboid: boolean;
    title: string;
    previewUrl: string;
    description: string;
    tags: string[];
};

function invalidInput(message: string): never {
    throw Object.assign(new Error(message), { statusCode: 400 });
}

function isValidModId(id: string): boolean {
    return id.length > 0 && !id.includes(';') && !/[\r\n\0]/.test(id);
}

function normalizeWorkshopId(value: unknown): string {
    const raw = typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '';
    if (!/^[0-9]+$/.test(raw)) invalidInput('workshopId must be a numeric Steam Workshop id');
    return raw;
}

function normalizeWorkshopIdList(value: unknown): string[] {
    let raw: unknown[];
    if (typeof value === 'string') raw = value.split(/[\s,;]+/);
    else if (Array.isArray(value)) raw = value;
    else invalidInput('workshopIds must be a string or an array of Steam Workshop ids');

    const ids: string[] = [];
    const seen = new Set<string>();
    for (const entry of raw) {
        const candidate = typeof entry === 'string' ? entry.trim() : typeof entry === 'number' ? String(entry) : '';
        if (!candidate) continue;
        if (!/^[0-9]+$/.test(candidate)) invalidInput(`Invalid Steam Workshop id: ${candidate}`);
        if (!seen.has(candidate)) {
            seen.add(candidate);
            ids.push(candidate);
        }
    }

    if (ids.length === 0) invalidInput('Provide at least one Steam Workshop id');
    return ids;
}

function normalizeModEntries(value: unknown): PzModEntry[] {
    if (!Array.isArray(value)) invalidInput('modIds must be an array of { id, enabled } entries');

    const entries: PzModEntry[] = [];
    const seen = new Set<string>();
    for (const item of value) {
        if (!item || typeof item !== 'object') invalidInput('each modIds entry must be an object { id, enabled }');
        const record = item as Record<string, unknown>;
        const id = typeof record.id === 'string' ? record.id.trim() : '';
        if (!isValidModId(id)) invalidInput(`Invalid mod id: ${id}`);
        if (record.enabled !== undefined && typeof record.enabled !== 'boolean') invalidInput('enabled must be a boolean');
        if (seen.has(id)) invalidInput(`Duplicate mod id: ${id}`);
        seen.add(id);
        entries.push({ id, enabled: record.enabled === undefined ? true : record.enabled });
    }

    if (entries.length === 0) invalidInput('modIds must contain at least one entry');
    return entries;
}

function sanitizeModEntries(value: unknown): PzModEntry[] {
    if (!Array.isArray(value)) return [];
    const entries: PzModEntry[] = [];
    const seen = new Set<string>();
    for (const item of value) {
        if (!item || typeof item !== 'object') continue;
        const record = item as Record<string, unknown>;
        const id = typeof record.id === 'string' ? record.id.trim() : '';
        if (!isValidModId(id) || seen.has(id)) continue;
        seen.add(id);
        entries.push({ id, enabled: record.enabled !== false });
    }
    return entries;
}

function sanitizeStoredMod(entry: unknown): PzMod | null {
    if (!entry || typeof entry !== 'object') return null;
    const record = entry as Record<string, unknown>;
    const workshopId = typeof record.workshopId === 'string' ? record.workshopId : '';
    if (!/^[0-9]+$/.test(workshopId)) return null;
    return {
        workshopId,
        modIds: sanitizeModEntries(record.modIds),
        enabled: record.enabled !== false,
        title: typeof record.title === 'string' ? record.title : '',
        previewUrl: typeof record.previewUrl === 'string' ? record.previewUrl : '',
        description: typeof record.description === 'string' ? record.description : '',
        tags: Array.isArray(record.tags) ? record.tags.map((value) => String(value)).filter(Boolean) : [],
    };
}

async function sidecarAbsPath(serverId: number): Promise<{ absPath: string }> {
    const resolved = await resolveServerPath({ serverId, root: 'data', path: SIDECAR_API_PATH });
    return { absPath: resolved.absPath };
}

async function readSidecar(serverId: number): Promise<PzModStore> {
    const { absPath } = await sidecarAbsPath(serverId);
    let raw: string;
    try {
        raw = await fs.readFile(absPath, 'utf8');
    } catch (error) {
        if ((error as { code?: string }).code === 'ENOENT') return { mods: [] };
        throw error;
    }

    const parsed = JSON.parse(raw) as { mods?: unknown };
    const mods = Array.isArray(parsed.mods)
        ? parsed.mods.map(sanitizeStoredMod).filter((entry): entry is PzMod => Boolean(entry))
        : [];
    return { mods };
}

async function writeSidecar(server: GameServerRow, store: PzModStore): Promise<void> {
    const { absPath } = await sidecarAbsPath(server.id);
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');

    const ownership = getRuntimeOwnership(server);
    if (ownership) {
        await fs.chown(path.dirname(absPath), ownership.uid, ownership.gid).catch(() => undefined);
        await fs.chown(absPath, ownership.uid, ownership.gid).catch(() => undefined);
    }
}

async function fetchWorkshopDetails(workshopIds: string[]): Promise<Map<string, WorkshopDetail>> {
    const body = new URLSearchParams();
    body.set('itemcount', String(workshopIds.length));
    workshopIds.forEach((id, index) => body.set(`publishedfileids[${index}]`, id));

    let response: Response;
    try {
        response = await fetch(STEAM_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
        });
    } catch {
        throw Object.assign(new Error('Unable to reach the Steam Workshop API'), { statusCode: 502 });
    }

    if (!response.ok) {
        throw Object.assign(new Error(`Steam Workshop API error (${response.status})`), { statusCode: 502 });
    }

    const json = await response.json() as {
        response?: { publishedfiledetails?: Array<Record<string, unknown>> };
    };
    const details = json.response?.publishedfiledetails ?? [];

    const map = new Map<string, WorkshopDetail>();
    for (const detail of details) {
        const workshopId = typeof detail.publishedfileid === 'string'
            ? detail.publishedfileid
            : typeof detail.publishedfileid === 'number'
                ? String(detail.publishedfileid)
                : '';
        if (!/^[0-9]+$/.test(workshopId)) continue;

        const tags = Array.isArray(detail.tags)
            ? detail.tags
                .map((tag) => (tag && typeof tag === 'object' ? String((tag as Record<string, unknown>).tag ?? '') : ''))
                .filter(Boolean)
            : [];

        map.set(workshopId, {
            workshopId,
            exists: detail.result === 1,
            isProjectZomboid: typeof detail.consumer_app_id !== 'number' || detail.consumer_app_id === PROJECT_ZOMBOID_WORKSHOP_APP_ID,
            title: typeof detail.title === 'string' ? detail.title : '',
            previewUrl: typeof detail.preview_url === 'string' ? detail.preview_url : '',
            description: typeof detail.description === 'string' ? detail.description : '',
            tags,
        });
    }
    return map;
}

export async function fetchWorkshopMetadata(rawWorkshopId: unknown): Promise<PzWorkshopMetadata> {
    const workshopId = normalizeWorkshopId(rawWorkshopId);
    const details = await fetchWorkshopDetails([workshopId]);
    const detail = details.get(workshopId);

    if (!detail || !detail.exists) {
        throw Object.assign(new Error(`Workshop item ${workshopId} was not found`), { statusCode: 404 });
    }
    if (!detail.isProjectZomboid) {
        throw Object.assign(new Error(`Workshop item ${workshopId} is not a Project Zomboid item`), { statusCode: 400 });
    }

    return {
        workshopId,
        title: detail.title,
        previewUrl: detail.previewUrl,
        description: detail.description.slice(0, MAX_DESCRIPTION_LENGTH),
        tags: detail.tags,
    };
}

function parseModIdsFromDescription(description: string, workshopId: string): string[] {
    if (!description) return [];

    const text = description.replace(/\[\/?[^\]]*\]/g, '');

    // A qualifier like "Old"/"Legacy" before the label marks a self-reference to a previous
    // release of the same mod, not another mod — skip those so they don't defeat the guard below.
    const referencedWorkshopIds = new Set<string>();
    for (const match of text.matchAll(/(?:\b(old|legacy|previous|deprecated)\s+)?workshop\s*id\s*[:=]\s*([0-9]+)/gi)) {
        if (match[1]) continue;
        referencedWorkshopIds.add(match[2]);
    }
    if (referencedWorkshopIds.size !== 1 || !referencedWorkshopIds.has(workshopId)) {
        return [];
    }

    const modIds: string[] = [];
    for (const match of text.matchAll(/(?:\b(old|legacy|previous|deprecated)\s+)?mod\s*id\s*[:=]\s*([^\r\n]+)/gi)) {
        if (match[1]) continue;
        const id = match[2].trim();
        if (isValidModId(id) && !modIds.includes(id)) modIds.push(id);
    }
    return modIds;
}

function resolveServerImage(server: GameServerRow): string {
    return server.docker_image_digest?.trim() || server.docker_image;
}

function parseResolveOutput(stdout: string): Map<string, string[]> {
    const map = new Map<string, string[]>();
    for (const rawLine of stdout.split('\n')) {
        const line = rawLine.replace(/\r$/, '');
        const tab = line.indexOf('\t');
        if (tab <= 0) continue;
        const workshopId = line.slice(0, tab);
        if (!/^[0-9]+$/.test(workshopId)) continue;
        const modId = line.slice(tab + 1).trim();
        if (!isValidModId(modId)) continue;
        const list = map.get(workshopId) ?? [];
        if (!list.includes(modId)) list.push(modId);
        map.set(workshopId, list);
    }
    return map;
}

async function resolveModIdsViaSteamCmd(
    server: GameServerRow & { docker_container_id: string },
    workshopIds: string[]
): Promise<Map<string, string[]>> {
    const mounts = parseStoredMounts(server);
    const resolvedMounts = await ensureServerMountDirs(server.id, mounts, getRuntimeOwnership(server));

    const result = await dockerUtils.runOneShotContainer({
        image: resolveServerImage(server),
        namePrefix: `gamepanel-pz-resolve-mods-${server.id}`,
        cmd: ['/app/resolve-mods.sh', ...workshopIds],
        mounts: resolvedMounts,
        user: 'gameserver',
        workdir: '/app',
        labels: {
            'gamepanel.serverId': String(server.id),
            'gamepanel.job': 'projectzomboid-resolve-mods',
        },
    });

    return parseResolveOutput(result.stdout);
}

async function assertModsEditable(server: GameServerRow & { docker_container_id: string }): Promise<void> {
    const status = await dockerUtils.checkContainerStatus(server.docker_container_id);
    if (status === 'running') {
        throw Object.assign(
            new Error('Stop the server before changing mods: Project Zomboid rewrites its config files on shutdown and would overwrite the changes.'),
            { statusCode: 409 }
        );
    }
}

async function regenerateModConfig(server: GameServerRow, store: PzModStore): Promise<void> {
    const iniPath = iniFilePath(resolveServerName(server));
    const content = await readConfigFile(server.id, iniPath, false);
    if (content === null) {
        throw Object.assign(
            new Error('Server configuration is not generated yet; start the server once before managing mods.'),
            { statusCode: 409 }
        );
    }

    const activeItems = store.mods.filter((mod) => mod.enabled && mod.modIds.some((entry) => entry.enabled));
    const workshopItems = activeItems.map((mod) => mod.workshopId).join(';');
    const mods = activeItems
        .flatMap((mod) => mod.modIds.filter((entry) => entry.enabled).map((entry) => entry.id))
        .join(';');

    let next = setIniRawValue(content, 'WorkshopItems', workshopItems);
    next = setIniRawValue(next, 'Mods', mods);
    await writeConfigFile(server.id, iniPath, next);
}

async function commit(server: GameServerRow, store: PzModStore): Promise<PzMod[]> {
    await writeSidecar(server, store);
    await regenerateModConfig(server, store);
    return store.mods;
}

export async function listProjectZomboidMods(server: GameServerRow): Promise<PzMod[]> {
    assertOvhcloudProjectZomboidServer(server);
    const store = await readSidecar(server.id);
    return store.mods;
}

export async function addProjectZomboidMods(
    server: GameServerRow & { docker_container_id: string },
    input: unknown
): Promise<PzAddModsResult> {
    assertOvhcloudProjectZomboidServer(server);
    await assertModsEditable(server);

    const requested = normalizeWorkshopIdList(input);
    const store = await readSidecar(server.id);
    const existing = new Set(store.mods.map((mod) => mod.workshopId));

    const skipped = requested.filter((id) => existing.has(id));
    const toResolve = requested.filter((id) => !existing.has(id));

    if (toResolve.length === 0) {
        return { mods: store.mods, added: [], failed: [], skipped };
    }

    const details = await fetchWorkshopDetails(toResolve);

    const failed: string[] = [];
    const added: string[] = [];
    const plan = new Map<string, { detail: WorkshopDetail; modIds: string[] }>();
    const needSteamCmd: string[] = [];

    for (const workshopId of toResolve) {
        const detail = details.get(workshopId);
        if (!detail || !detail.exists || !detail.isProjectZomboid) {
            failed.push(workshopId);
            continue;
        }

        const fromDescription = parseModIdsFromDescription(detail.description, workshopId);
        plan.set(workshopId, { detail, modIds: fromDescription });
        if (fromDescription.length === 0) needSteamCmd.push(workshopId);
    }

    if (needSteamCmd.length > 0) {
        const resolved = await resolveModIdsViaSteamCmd(server, needSteamCmd);
        for (const workshopId of needSteamCmd) {
            const entry = plan.get(workshopId);
            if (entry) entry.modIds = resolved.get(workshopId) ?? [];
        }
    }

    for (const workshopId of toResolve) {
        const entry = plan.get(workshopId);
        if (!entry) continue;
        if (entry.modIds.length === 0) {
            failed.push(workshopId);
            continue;
        }
        store.mods.push({
            workshopId,
            modIds: entry.modIds.map((id) => ({ id, enabled: true })),
            enabled: true,
            title: entry.detail.title,
            previewUrl: entry.detail.previewUrl,
            description: entry.detail.description.slice(0, MAX_DESCRIPTION_LENGTH),
            tags: entry.detail.tags,
        });
        added.push(workshopId);
    }

    const mods = added.length > 0 ? await commit(server, store) : store.mods;
    return { mods, added, failed, skipped };
}

export async function removeProjectZomboidMod(
    server: GameServerRow & { docker_container_id: string },
    rawWorkshopId: unknown
): Promise<PzMod[]> {
    assertOvhcloudProjectZomboidServer(server);
    await assertModsEditable(server);

    const workshopId = normalizeWorkshopId(rawWorkshopId);
    const store = await readSidecar(server.id);
    const next = store.mods.filter((mod) => mod.workshopId !== workshopId);
    if (next.length === store.mods.length) {
        throw Object.assign(new Error(`Workshop item ${workshopId} is not in the mod list`), { statusCode: 404 });
    }

    return commit(server, { mods: next });
}

export async function reorderProjectZomboidMods(
    server: GameServerRow & { docker_container_id: string },
    rawOrder: unknown
): Promise<PzMod[]> {
    assertOvhcloudProjectZomboidServer(server);
    await assertModsEditable(server);

    if (!Array.isArray(rawOrder)) invalidInput('order must be an array of workshop ids');
    const order = rawOrder.map((entry) => (typeof entry === 'string' ? entry.trim() : String(entry)));

    const store = await readSidecar(server.id);
    const byId = new Map(store.mods.map((mod) => [mod.workshopId, mod]));

    const ordered: PzMod[] = [];
    for (const workshopId of order) {
        const mod = byId.get(workshopId);
        if (mod) {
            ordered.push(mod);
            byId.delete(workshopId);
        }
    }

    for (const mod of store.mods) {
        if (byId.has(mod.workshopId)) ordered.push(mod);
    }

    return commit(server, { mods: ordered });
}

export async function updateProjectZomboidMod(
    server: GameServerRow & { docker_container_id: string },
    rawWorkshopId: unknown,
    updates: { enabled?: unknown; modIds?: unknown }
): Promise<PzMod[]> {
    assertOvhcloudProjectZomboidServer(server);
    await assertModsEditable(server);

    const workshopId = normalizeWorkshopId(rawWorkshopId);
    const store = await readSidecar(server.id);
    const mod = store.mods.find((entry) => entry.workshopId === workshopId);
    if (!mod) {
        throw Object.assign(new Error(`Workshop item ${workshopId} is not in the mod list`), { statusCode: 404 });
    }

    if (updates.enabled !== undefined) {
        if (typeof updates.enabled !== 'boolean') invalidInput('enabled must be a boolean');
        mod.enabled = updates.enabled;
    }

    if (updates.modIds !== undefined) {
        const entries = normalizeModEntries(updates.modIds);
        const currentIds = new Set(mod.modIds.map((entry) => entry.id));
        if (entries.length !== mod.modIds.length || entries.some((entry) => !currentIds.has(entry.id))) {
            invalidInput('modIds must list every mod id of this item exactly once (reorder / toggle only)');
        }
        mod.modIds = entries;
    }

    return commit(server, store);
}
