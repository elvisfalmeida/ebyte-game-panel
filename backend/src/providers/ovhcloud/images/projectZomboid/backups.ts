import { getOvhcloudProjectZomboidMetadata } from '../../../serverMetadata.js';
import { PROJECT_ZOMBOID_DEFAULT_SERVERNAME } from '../projectZomboid.js';
import type { GameServerRow } from '../../../../types/gameServer.js';
import * as dockerUtils from '../../../../utils/docker.js';
import type { NormalizedMount } from '../../../../utils/mounts.js';
import { ensureServerMountDirs } from '../../../../utils/storage.js';
import { getBasenameFromApiPath } from '../../../../utils/fsBrowser.js';
import { getRuntimeOwnership, hasStoredMount, parseStoredEnv, parseStoredMounts } from '../../../runtimeConfig.js';
import { OVHCLOUD_DOCKER_STOP_TIMEOUT_SECONDS } from '../../adapters/common.js';
import type {
    OvhcloudBackupCreateResult,
    OvhcloudBackupRestoreInput,
    OvhcloudBackupRestoreResult,
} from '../../adapters/types.js';

export const PROJECT_ZOMBOID_BACKUP_EXTENSIONS = ['.tar.gz'];

function hasBackupsMount(mounts: NormalizedMount[]): boolean {
    return hasStoredMount(mounts, 'backup', '/backups');
}

function resolveServerImage(server: GameServerRow): string {
    return server.docker_image_digest?.trim() || server.docker_image;
}

function resolveServerName(server: GameServerRow): string {
    const prefix = 'PZ_SERVERNAME=';
    let value = PROJECT_ZOMBOID_DEFAULT_SERVERNAME;
    for (const entry of parseStoredEnv(server)) {
        if (entry.startsWith(prefix)) value = entry.slice(prefix.length);
    }
    return value || PROJECT_ZOMBOID_DEFAULT_SERVERNAME;
}

export async function createProjectZomboidBackup(
    server: GameServerRow & { docker_container_id: string },
    _options: Record<string, unknown> = {}
): Promise<OvhcloudBackupCreateResult> {
    getOvhcloudProjectZomboidMetadata(server);

    const mounts = parseStoredMounts(server);
    if (!hasBackupsMount(mounts)) {
        throw Object.assign(new Error('OVHcloud Project Zomboid backups require a backup -> /backups mount'), { statusCode: 409 });
    }

    const status = await dockerUtils.checkContainerStatus(server.docker_container_id);

    if (status === 'running') {
        const result = await dockerUtils.execInContainer(
            server.docker_container_id,
            ['/app/backup.sh'],
            { user: 'gameserver', workdir: '/app' }
        );

        return {
            ok: result.exitCode === 0,
            exitCode: result.exitCode,
            stdout: result.stdout,
            stderr: result.stderr,
            mode: 'hot',
        };
    }

    if (status !== 'created' && status !== 'exited' && status !== 'dead') {
        throw Object.assign(new Error(`Cannot run cold backup while container status is ${status}`), { statusCode: 409 });
    }

    const resolvedMounts = await ensureServerMountDirs(server.id, mounts, getRuntimeOwnership(server));
    const result = await dockerUtils.runOneShotContainer({
        image: resolveServerImage(server),
        namePrefix: `gamepanel-pz-backup-${server.id}`,
        cmd: ['/app/backup.sh'],
        env: [`PZ_SERVERNAME=${resolveServerName(server)}`],
        mounts: resolvedMounts,
        user: 'gameserver',
        workdir: '/app',
        labels: {
            'gamepanel.serverId': String(server.id),
            'gamepanel.job': 'projectzomboid-backup',
        },
    });

    return {
        ok: result.exitCode === 0,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        mode: 'cold',
    };
}

export async function restoreProjectZomboidBackup(
    server: GameServerRow & { docker_container_id: string },
    input: OvhcloudBackupRestoreInput
): Promise<OvhcloudBackupRestoreResult> {
    getOvhcloudProjectZomboidMetadata(server);

    const mounts = parseStoredMounts(server);
    if (!hasBackupsMount(mounts)) {
        throw Object.assign(new Error('OVHcloud Project Zomboid restore requires a backup -> /backups mount'), { statusCode: 409 });
    }

    const status = await dockerUtils.checkContainerStatus(server.docker_container_id);
    if (status !== 'running' && status !== 'created' && status !== 'exited' && status !== 'dead') {
        throw Object.assign(new Error(`Cannot restore while container status is ${status}`), { statusCode: 409 });
    }

    const shouldRestart = status === 'running';
    if (shouldRestart) {
        await dockerUtils.stopContainer(server.docker_container_id, OVHCLOUD_DOCKER_STOP_TIMEOUT_SECONDS);
    }

    const backupName = getBasenameFromApiPath(input.apiPath);
    const resolvedMounts = await ensureServerMountDirs(server.id, mounts, getRuntimeOwnership(server));
    const result = await dockerUtils.runOneShotContainer({
        image: resolveServerImage(server),
        namePrefix: `gamepanel-pz-restore-${server.id}`,
        cmd: ['/app/restore.sh', backupName],
        env: [`PZ_SERVERNAME=${resolveServerName(server)}`],
        mounts: resolvedMounts,
        user: 'gameserver',
        workdir: '/app',
        labels: {
            'gamepanel.serverId': String(server.id),
            'gamepanel.job': 'projectzomboid-restore',
        },
    });

    const ok = result.exitCode === 0;
    let restarted = false;
    if (ok && shouldRestart) {
        await dockerUtils.startContainer(server.docker_container_id);
        restarted = true;
    }

    return {
        ok,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        restarted,
    };
}
