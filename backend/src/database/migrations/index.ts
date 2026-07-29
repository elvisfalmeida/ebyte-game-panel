import type { DatabaseMigration } from './types.js';
import { migration as fileTransferJobsAddExtractKind } from './0001_file_transfer_jobs_add_extract_kind.js';

export const DATABASE_MIGRATIONS: DatabaseMigration[] = [
  fileTransferJobsAddExtractKind,
];
