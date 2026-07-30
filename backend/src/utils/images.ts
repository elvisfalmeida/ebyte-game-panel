import { getAppVersion } from './appInfo.js';

const GAMEPANEL_IMAGE_REGISTRY = 'ghcr.io/elvisfalmeida';
const GAMEPANEL_IMAGE_PREFIX = 'ebyte-game-panel-';

export function gamePanelImageTag(): string {
    return getAppVersion().replace(/^v/, '');
}

export function gamePanelImage(name: string): string {
    const independentName = name.replace(/^gamepanel-/, GAMEPANEL_IMAGE_PREFIX);
    return `${GAMEPANEL_IMAGE_REGISTRY}/${independentName}:${gamePanelImageTag()}`;
}
