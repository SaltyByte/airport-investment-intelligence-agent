// Download cache and streaming helpers shared by the ingest sources.
import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import { rename } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { Unzip, UnzipInflate } from 'fflate';

export const CACHE_DIR = fileURLToPath(
  new URL('../../.ingest-cache/', import.meta.url),
);
// faa.gov drops non-browser user agents.
export const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

/** Runs one source's work, prefixing any failure with the source name. */
export const fromSource = async <T>(
  name: string,
  work: () => Promise<T>,
): Promise<T> => {
  try {
    return await work();
  } catch (e) {
    throw new Error(`${name}: ${(e as Error).message}`, { cause: e });
  }
};

/** Returns the cached file, downloading it via `request` (to a temp file, then rename) when missing. */
export const cached = async (
  file: string,
  request: () => Promise<Response>,
): Promise<string> => {
  const path = join(CACHE_DIR, file);
  if (existsSync(path)) return path;
  const res = await request();
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} for ${file}`);
  await pipeline(
    Readable.fromWeb(res.body as never),
    createWriteStream(`${path}.part`),
  );
  await rename(`${path}.part`, path);
  return path;
};

/** Streams the CSV inside a cached PREZIP without holding it in memory. */
export async function* unzippedCsv(zipPath: string) {
  const queue: Uint8Array[] = [];
  let failure: Error | null = null;
  let found = false;
  const unzip = new Unzip((file) => {
    if (!file.name.endsWith('.csv')) return;
    found = true;
    file.ondata = (e, data) => {
      if (e) failure = e;
      else queue.push(data);
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  for await (const chunk of createReadStream(zipPath)) {
    unzip.push(chunk as Uint8Array);
    if (failure) throw failure;
    yield* queue.splice(0);
  }
  unzip.push(new Uint8Array(0), true);
  if (failure) throw failure;
  yield* queue.splice(0);
  if (!found) throw new Error(`${zipPath}: no CSV in ZIP`);
}
