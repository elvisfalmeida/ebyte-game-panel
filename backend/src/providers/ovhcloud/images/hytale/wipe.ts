import type { GameServerRow } from '../../../../types/gameServer.js';

export function resolveHytaleSoftWipeTargets(_server: GameServerRow): string[] {
    return ['/game/Server/universe'];
}
