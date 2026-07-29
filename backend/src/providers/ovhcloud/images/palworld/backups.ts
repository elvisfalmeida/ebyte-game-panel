import { getOvhcloudPalworldMetadata } from '../../../serverMetadata.js';
import type { GameServerRow } from '../../../../types/gameServer.js';
import * as dockerUtils from '../../../../utils/docker.js';
import { ensureServerMountDirs } from '../../../../utils/storage.js';
import { getBasenameFromApiPath } from '../../../../utils/fsBrowser.js';
import { getRuntimeOwnership, parseStoredMounts } from '../../../runtimeConfig.js';
import { OVHCLOUD_DOCKER_STOP_TIMEOUT_SECONDS } from '../../adapters/common.js';
import { PALWORLD_SAVEGAMES_API_PATH, resolvePalworldWorldGuid } from './world.js';
import type {
    OvhcloudBackupCreateResult,
    OvhcloudBackupLocation,
    OvhcloudBackupRestoreInput,
    OvhcloudBackupRestoreResult,
} from '../../adapters/types.js';

export async function resolvePalworldBackupLocation(server: GameServerRow): Promise<OvhcloudBackupLocation> {
    const guid = await resolvePalworldWorldGuid(server.id);
    const basePath = guid
        ? `${PALWORLD_SAVEGAMES_API_PATH}/${guid}/backup/world`
        : `${PALWORLD_SAVEGAMES_API_PATH}/backup/world`;

    return { root: 'data', basePath, containerPrefix: '/data' };
}

export async function createPalworldBackup(
    server: GameServerRow & { docker_container_id: string },
    _options: Record<string, unknown> = {}
): Promise<OvhcloudBackupCreateResult> {
    getOvhcloudPalworldMetadata(server);

    const status = await dockerUtils.checkContainerStatus(server.docker_container_id);
    if (status !== 'running') {
        throw Object.assign(
            new Error('Palworld backups can only be created while the server is running'),
            { statusCode: 409 }
        );
    }

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

export async function restorePalworldBackup(
    server: GameServerRow & { docker_container_id: string },
    input: OvhcloudBackupRestoreInput
): Promise<OvhcloudBackupRestoreResult> {
    getOvhcloudPalworldMetadata(server);

    const status = await dockerUtils.checkContainerStatus(server.docker_container_id);
    if (status !== 'running' && status !== 'created' && status !== 'exited' && status !== 'dead') {
        throw Object.assign(new Error(`Cannot restore while container status is ${status}`), { statusCode: 409 });
    }

    const shouldRestart = status === 'running';
    if (shouldRestart) {
        await dockerUtils.stopContainer(server.docker_container_id, OVHCLOUD_DOCKER_STOP_TIMEOUT_SECONDS);
    }

    const backupName = getBasenameFromApiPath(input.resolvedApiPath);
    const mounts = parseStoredMounts(server);
    const resolvedMounts = await ensureServerMountDirs(server.id, mounts, getRuntimeOwnership(server));

    const result = await dockerUtils.runOneShotContainer({
        image: server.docker_image_digest?.trim() || server.docker_image,
        namePrefix: `gamepanel-palworld-restore-${server.id}`,
        cmd: ['/app/restore.sh', backupName],
        mounts: resolvedMounts,
        user: 'gameserver',
        workdir: '/app',
        labels: {
            'gamepanel.serverId': String(server.id),
            'gamepanel.job': 'palworld-restore',
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
