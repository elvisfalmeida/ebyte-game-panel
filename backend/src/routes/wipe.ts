import { Router, type Response } from 'express';
import { type AuthenticatedRequest, requireServerPermission, userHasServerPermission } from '../middleware/auth.js';
import { getServerOrThrow } from '../services/servers.js';
import { getServerWipeModes, hardWipeServer, wipeServer } from '../services/serverWipe.js';
import { actionsRepository } from '../database/index.js';
import { sendRouteError } from '../utils/routeErrors.js';
import { requirePositiveInt } from '../utils/httpValidation.js';
import { PERMISSIONS } from '../permissions.js';

const router = Router({ mergeParams: true });

// GET /api/servers/:id/wipe — allowed to anyone who can perform at least one wipe mode.
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const serverId = requirePositiveInt(req.params.id, 'Invalid server id');
        const canWipe = (await userHasServerPermission(req.user, serverId, PERMISSIONS.server.wipe.soft))
            || (await userHasServerPermission(req.user, serverId, PERMISSIONS.server.wipe.hard));
        if (!canWipe) {
            return res.status(403).json({ error: 'Insufficient server permissions' });
        }

        const server = await getServerOrThrow(serverId);
        return res.json({ modes: getServerWipeModes(server) });
    } catch (error) {
        return sendRouteError(res, error, {
            route: 'ROUTE:WIPE:MODES',
            fallbackMessage: 'Failed to read wipe modes',
            logContext: { serverId: req.params.id },
        });
    }
});

// POST /api/servers/:id/wipe/soft
router.post('/soft', requireServerPermission(PERMISSIONS.server.wipe.soft), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const serverId = requirePositiveInt(req.params.id, 'Invalid server id');
        const server = await getServerOrThrow(serverId);
        if (!server.docker_container_id) {
            throw Object.assign(new Error('Server has no container'), { statusCode: 400 });
        }

        const result = await wipeServer(server as typeof server & { docker_container_id: string }, 'soft');
        await actionsRepository.create(serverId, 'success', 'Server soft wipe', req.user?.username || '');
        return res.json(result);
    } catch (error) {
        return sendRouteError(res, error, {
            route: 'ROUTE:WIPE:SOFT',
            fallbackMessage: 'Failed to wipe server',
            logContext: { serverId: req.params.id },
        });
    }
});

// POST /api/servers/:id/wipe/hard
router.post('/hard', requireServerPermission(PERMISSIONS.server.wipe.hard), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const serverId = requirePositiveInt(req.params.id, 'Invalid server id');
        const server = await getServerOrThrow(serverId);

        const result = await hardWipeServer(server, req.user?.username || '');
        await actionsRepository.create(serverId, 'success', 'Server hard wipe (reinstall)', req.user?.username || '');
        return res.json(result);
    } catch (error) {
        return sendRouteError(res, error, {
            route: 'ROUTE:WIPE:HARD',
            fallbackMessage: 'Failed to hard wipe server',
            logContext: { serverId: req.params.id },
        });
    }
});

export default router;
