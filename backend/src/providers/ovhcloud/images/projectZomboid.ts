import { randomBytes } from 'node:crypto';
import type { GameServerRow } from '../../../types/gameServer.js';
import { getOvhcloudProjectZomboidMetadata } from '../../serverMetadata.js';
import { normalizeEnvPayload } from '../../installPayload.js';

export const PROJECT_ZOMBOID_IMAGE_ID = 'project-zomboid';

export const PROJECT_ZOMBOID_DEFAULT_SERVERNAME = 'servertest';

export type OvhcloudProjectZomboidImage = {
    imageId: typeof PROJECT_ZOMBOID_IMAGE_ID;
};

export function getOvhcloudProjectZomboidImage(imageId: string): OvhcloudProjectZomboidImage | null {
    return imageId === PROJECT_ZOMBOID_IMAGE_ID
        ? { imageId: PROJECT_ZOMBOID_IMAGE_ID }
        : null;
}

function generateAdminPassword(): string {
    return randomBytes(32).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 24);
}

export function normalizeProjectZomboidEnv(payload: unknown): string[] {
    let env = normalizeEnvPayload(payload);

    if (!env.some((entry) => /^PZ_ADMIN_PASSWORD=.+/.test(entry))) {
        env = env.filter((entry) => !entry.startsWith('PZ_ADMIN_PASSWORD='));
        env.push(`PZ_ADMIN_PASSWORD=${generateAdminPassword()}`);
    }

    if (!env.some((entry) => /^PZ_SERVERNAME=.+/.test(entry))) {
        env = env.filter((entry) => !entry.startsWith('PZ_SERVERNAME='));
        env.push(`PZ_SERVERNAME=${PROJECT_ZOMBOID_DEFAULT_SERVERNAME}`);
    }

    return env;
}

export function buildProjectZomboidProviderMetadata(
    image: OvhcloudProjectZomboidImage
): Record<string, unknown> {
    return {
        imageId: image.imageId,
        family: 'project-zomboid',
        serverType: 'project-zomboid',
        capabilities: {
            backup: {
                type: 'archive',
                script: '/app/backup.sh',
            },
            restore: {
                type: 'script',
                script: '/app/restore.sh',
            },
            consoleCommand: {
                type: 'script',
                script: '/app/send-command.sh',
            },
            mods: {
                type: 'steam-workshop',
            },
        },
    };
}

export function assertOvhcloudProjectZomboidServer(server: GameServerRow): void {
    getOvhcloudProjectZomboidMetadata(server);
}
