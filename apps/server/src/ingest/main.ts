// `pnpm ingest`: downloads BTS/FAA/OurAirports data (cached) and writes the aggregated snapshot.
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { DATA_DIR } from '../snapshot/load';
import {
  SNAPSHOT_FILE,
  SNAPSHOT_GZ_FILE,
  type Snapshot,
  snapshotSchema,
} from '../snapshot/schema';
import { buildAirports } from './airports';
import { CACHE_DIR, fromSource } from './download';
import { type Period, selectPeriod } from './period';
import { FAA_URL, loadFaa } from './sources/faa';
import { latestOnTimeMonth, loadOnTime, ON_TIME_URL } from './sources/on-time';
import { loadOurAirports, OUR_AIRPORTS_URL } from './sources/our-airports';
import { latestT100Month, loadT100, T100_URL } from './sources/t100';

const SNAPSHOT_GZIP_THRESHOLD = 10 * 1024 * 1024;

const pickPeriod = async (): Promise<Period> => {
  const [latestT100, latestOnTime] = await Promise.all([
    fromSource('BTS T-100', latestT100Month),
    fromSource('BTS On-Time PREZIP', latestOnTimeMonth),
  ]);
  const period = selectPeriod(latestT100, latestOnTime);
  console.log(
    `Data period ${period.start}..${period.end} (T-100 latest ${latestT100}, on-time latest ${latestOnTime})`,
  );
  return period;
};

/** Runs every source in parallel, joins them into airports and validates the snapshot. */
const buildSnapshot = async (period: Period): Promise<Snapshot> => {
  const [t100, delays, faa, ourAirports] = await Promise.all([
    fromSource('BTS T-100', () => loadT100(period.months)),
    fromSource('BTS On-Time PREZIP', () => loadOnTime(period.end)),
    fromSource('FAA enplanements', loadFaa),
    fromSource('OurAirports', loadOurAirports),
  ]);
  const airports = buildAirports(faa, ourAirports, t100.traffic, delays);
  const peerSet = new Set(airports.map((a) => a.iata));
  return snapshotSchema.parse({
    meta: {
      generatedAt: new Date().toISOString(),
      period: { start: period.start, end: period.end },
      sources: [
        {
          name: 'BTS T-100 Segment (All Carriers)',
          url: T100_URL,
          period: `${period.start} to ${period.end}`,
        },
        {
          name: 'BTS On-Time Reporting Carrier (PREZIP)',
          url: ON_TIME_URL(period.end),
          period: period.end,
        },
        {
          name: 'FAA commercial-service enplanements',
          url: FAA_URL,
          period: 'CY2025 vs CY2024',
        },
        {
          name: 'OurAirports airports.csv',
          url: OUR_AIRPORTS_URL,
          period: 'current',
        },
      ],
    },
    airports,
    routes: t100.routes.filter((r) => peerSet.has(r.origin)),
  } satisfies Snapshot);
};

/** Writes the snapshot atomically, gzipped when large, and removes the other variant. */
const writeSnapshot = async (snapshot: Snapshot): Promise<void> => {
  const json = JSON.stringify(snapshot);
  const gzip = json.length > SNAPSHOT_GZIP_THRESHOLD;
  const [file, other] = gzip
    ? [SNAPSHOT_GZ_FILE, SNAPSHOT_FILE]
    : [SNAPSHOT_FILE, SNAPSHOT_GZ_FILE];
  const target = join(DATA_DIR, file);
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(`${target}.tmp`, gzip ? gzipSync(json) : json);
  await rename(`${target}.tmp`, target);
  await rm(join(DATA_DIR, other), { force: true });
  console.log(
    `Wrote ${target}: ${snapshot.airports.length} airports, ${snapshot.routes.length} route rows`,
  );
};

const run = async (): Promise<void> => {
  await mkdir(CACHE_DIR, { recursive: true });
  const period = await pickPeriod();
  await writeSnapshot(await buildSnapshot(period));
};

run().catch((e: Error) => {
  console.error(`Ingest failed, snapshot left untouched. ${e.message}`);
  process.exitCode = 1;
});
