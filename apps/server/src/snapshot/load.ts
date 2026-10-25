import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import type { AppError } from '@app/shared';
import { err, ok, type Result } from 'neverthrow';
import {
  SNAPSHOT_FILE,
  SNAPSHOT_GZ_FILE,
  type Snapshot,
  snapshotSchema,
} from './schema';

export const DATA_DIR = fileURLToPath(new URL('../../data/', import.meta.url));

const defaultPath = (): string => {
  const gz = `${DATA_DIR}${SNAPSHOT_GZ_FILE}`;
  return existsSync(gz) ? gz : `${DATA_DIR}${SNAPSHOT_FILE}`;
};

export const loadSnapshot = (
  path = defaultPath(),
): Result<Snapshot, AppError> => {
  let text: string;
  try {
    const bytes = readFileSync(path);
    text = (path.endsWith('.gz') ? gunzipSync(bytes) : bytes).toString('utf8');
  } catch (e) {
    return err({
      kind: 'NotFound',
      message: `Snapshot not readable at ${path}: ${(e as Error).message}`,
    });
  }
  try {
    const parsed = snapshotSchema.safeParse(JSON.parse(text));
    return parsed.success
      ? ok(parsed.data)
      : err({
          kind: 'UpstreamUnavailable',
          message: `Snapshot invalid: ${parsed.error.message}`,
        });
  } catch (e) {
    return err({
      kind: 'UpstreamUnavailable',
      message: `Snapshot invalid JSON: ${(e as Error).message}`,
    });
  }
};
