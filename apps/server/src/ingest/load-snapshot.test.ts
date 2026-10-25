import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { loadSnapshot } from './load-snapshot';
import type { Snapshot } from './snapshot-schema';

const snapshot: Snapshot = {
  meta: {
    generatedAt: '2026-10-25T10:00:00.000Z',
    period: { start: '2025-08', end: '2026-07' },
    sources: [
      { name: 'BTS T-100', url: 'https://x', period: '2025-08 to 2026-07' },
    ],
  },
  airports: [],
  routes: [],
};
const dir = mkdtempSync(join(tmpdir(), 'snapshot-'));

describe('loadSnapshot', () => {
  it('reads and validates a gzipped snapshot', () => {
    const path = join(dir, 'snapshot.json.gz');
    writeFileSync(path, gzipSync(JSON.stringify(snapshot)));
    expect(loadSnapshot(path)._unsafeUnwrap()).toEqual(snapshot);
  });

  it('reads a plain JSON snapshot', () => {
    const path = join(dir, 'snapshot.json');
    writeFileSync(path, JSON.stringify(snapshot));
    expect(loadSnapshot(path)._unsafeUnwrap()).toEqual(snapshot);
  });

  it('returns Err(NotFound) for a missing file', () => {
    expect(
      loadSnapshot(join(dir, 'nope.json'))._unsafeUnwrapErr(),
    ).toMatchObject({
      kind: 'NotFound',
    });
  });

  it('returns an Err for a snapshot that fails the schema', () => {
    const path = join(dir, 'bad.json');
    writeFileSync(path, JSON.stringify({ meta: {} }));
    expect(loadSnapshot(path)._unsafeUnwrapErr().message).toMatch(/invalid/i);
  });
});
