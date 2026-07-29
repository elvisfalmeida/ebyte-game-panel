import { CATALOG_BASE_URL } from './api/runtime';

// Steam branches for Project Zomboid, served by the central DB catalog service
// (same service as the framework catalog), not the per-server panel backend.
export interface ProjectZomboidBranch {
  name: string;
  buildId?: string;
  updatedAt?: string;
  description?: string;
}

// Non-blocking: returns [] on any failure so the install branch selector stays
// usable (it is an editable combobox — the user can still type a branch name).
export async function fetchProjectZomboidBranches(): Promise<ProjectZomboidBranch[]> {
  try {
    const res = await fetch(`${CATALOG_BASE_URL}/project-zomboid/branches`);
    if (!res.ok) return [];
    const data = (await res.json()) as { branches?: ProjectZomboidBranch[] };
    return Array.isArray(data?.branches) ? data.branches : [];
  } catch {
    return [];
  }
}
