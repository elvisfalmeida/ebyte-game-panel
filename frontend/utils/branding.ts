export const PANEL_NAME = import.meta.env.VITE_PANEL_NAME?.trim() || 'Ebyte Game Panel';
export const PANEL_LOGO_URL = import.meta.env.VITE_PANEL_LOGO_URL?.trim() || '/ebyte-logo.png';

export function applyPanelBranding(): void {
  document.title = PANEL_NAME;
}
