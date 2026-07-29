// Project Zomboid Steam Workshop mods (per-server backend `/project-zomboid/mods`).

// A single internal mod id inside a Workshop item, individually toggleable/orderable.
export interface ProjectZomboidModId {
  id: string;
  enabled: boolean;
}

export interface ProjectZomboidMod {
  workshopId: string;
  modIds: ProjectZomboidModId[];
  enabled: boolean;
  title?: string;
  previewUrl?: string;
  description?: string;
  tags?: string[];
}

// Steam card metadata returned by the workshop preview endpoint.
export interface ProjectZomboidWorkshopPreview {
  workshopId: string;
  title?: string;
  previewUrl?: string;
  description?: string;
  tags?: string[];
}
