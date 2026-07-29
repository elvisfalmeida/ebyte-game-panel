import crypto from 'node:crypto';

export function checksumSql(sql: string): string {
  return crypto.createHash('sha256').update(sql).digest('hex');
}
