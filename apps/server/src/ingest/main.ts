// `pnpm ingest`: downloads BTS/FAA/OurAirports data (cached) and writes the aggregated snapshot.
import {
  createReadStream,
  createWriteStream,
  existsSync,
  readFileSync,
} from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { parse as parseCsvStream } from 'csv-parse';
import { parse as parseCsv } from 'csv-parse/sync';
import { Unzip, UnzipInflate, unzipSync } from 'fflate';
import { DATA_DIR } from './load-snapshot';
import {
  aggregateOnTime,
  aggregateT100,
  buildAirports,
  formatMonth,
  parseFaaSheet,
  requireColumns,
  selectPeriod,
} from './parse';
import {
  SNAPSHOT_FILE,
  SNAPSHOT_GZ_FILE,
  type Snapshot,
  snapshotSchema,
} from './snapshot-schema';

const CACHE_DIR = fileURLToPath(
  new URL('../../.ingest-cache/', import.meta.url),
);
const T100_URL =
  'https://www.transtats.bts.gov/DL_SelectFields.aspx?gnoyr_VQ=FMG&QO_fu146_anzr=Nv4%20Pn44vr45';
const T100_FIELDS = [
  'YEAR',
  'MONTH',
  'ORIGIN',
  'DEST',
  'CLASS',
  'DEPARTURES_PERFORMED',
  'SEATS',
  'PASSENGERS',
  'DISTANCE',
];
const ON_TIME_URL = (month: string): string => {
  const [y, m] = month.split('-');
  return `https://www.transtats.bts.gov/PREZIP/On_Time_Reporting_Carrier_On_Time_Performance_1987_present_${y}_${Number(m)}.zip`;
};
const ON_TIME_FIELDS = new Set([
  'Origin',
  'Cancelled',
  'DepDelayMinutes',
  'DepDel15',
  'TaxiOut',
  'CarrierDelay',
  'WeatherDelay',
  'NASDelay',
  'SecurityDelay',
  'LateAircraftDelay',
]);
// shortcut: FAA publishes one calendar year per file, bump when CY2026 lands (Aug 2027).
const FAA_URL =
  'https://www.faa.gov/airports/planning_capacity/passenger_allcargo_stats/passenger/arp-cy2025-commercial-service-enplanements.xlsx';
const OUR_AIRPORTS_URL =
  'https://davidmegginson.github.io/ourairports-data/airports.csv';
// faa.gov drops non-browser user agents.
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const SNAPSHOT_GZIP_THRESHOLD = 10 * 1024 * 1024;
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Runs one source's work, prefixing any failure with the source name. */
const fromSource = async <T>(
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
const cached = async (
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

const fetchT100Form = async (): Promise<{ html: string; cookie: string }> => {
  const res = await fetch(T100_URL, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`form page HTTP ${res.status}`);
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
  return { html: await res.text(), cookie };
};

const latestT100Month = async (): Promise<string> => {
  const { html } = await fetchT100Form();
  const match = html.match(/Latest Available Data: (\w+) (\d{4})/);
  const month = MONTHS.indexOf(match?.[1] ?? '') + 1;
  if (!match || month === 0)
    throw new Error('"Latest Available Data" not found on form page');
  return formatMonth(Number(match[2]), month);
};

const downloadT100Month = (month: string): Promise<string> =>
  cached(`t100-${month}.zip`, async () => {
    const { html, cookie } = await fetchT100Form();
    const hidden = (name: string): string => {
      const value = html.match(
        new RegExp(`name="${name}"[^>]*value="([^"]*)"`),
      )?.[1];
      if (value === undefined) throw new Error(`form field ${name} not found`);
      return value;
    };
    const [year, m] = month.split('-');
    const body = new URLSearchParams({
      __VIEWSTATE: hidden('__VIEWSTATE'),
      __VIEWSTATEGENERATOR: hidden('__VIEWSTATEGENERATOR'),
      __EVENTVALIDATION: hidden('__EVENTVALIDATION'),
      cboGeography: 'All',
      cboYear: year as string,
      cboPeriod: String(Number(m)),
      chkDownloadZip: 'on',
      btnDownload: 'Download',
      ...Object.fromEntries(T100_FIELDS.map((f) => [f, 'on'])),
    });
    const res = await fetch(T100_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        cookie,
      },
      body,
      signal: AbortSignal.timeout(300_000),
    });
    if (res.ok && !res.headers.get('content-type')?.includes('zip'))
      throw new Error(
        `${month}: expected a ZIP, got ${res.headers.get('content-type')} (form changed?)`,
      );
    return res;
  });

function* t100Rows(zipPaths: string[]) {
  for (const path of zipPaths) {
    const zip = unzipSync(readFileSync(path));
    const csv = Object.entries(zip).find(([name]) => name.startsWith('T_T100'));
    if (!csv) throw new Error(`${path}: T-100 CSV missing from ZIP`);
    yield* parseCsv(Buffer.from(csv[1]), {
      columns: (header: string[]) => {
        requireColumns(csv[0], header, T100_FIELDS);
        return header;
      },
      bom: true,
    }) as Record<string, string>[];
  }
}

/** Latest PREZIP month, probing back from the current month until a file exists. */
const latestOnTimeMonth = async (): Promise<string> => {
  const now = new Date();
  for (let back = 0; back < 12; back++) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back),
    );
    const month = formatMonth(d.getUTCFullYear(), d.getUTCMonth() + 1);
    const res = await fetch(ON_TIME_URL(month), {
      method: 'HEAD',
      signal: AbortSignal.timeout(60_000),
    });
    if (res.ok) return month;
    if (res.status !== 404)
      throw new Error(`HTTP ${res.status} probing ${month}`);
  }
  throw new Error('no PREZIP file in the last 12 months');
};

/** Streams the CSV inside a cached PREZIP without holding it in memory. */
async function* unzippedCsv(zipPath: string) {
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

const run = async (): Promise<void> => {
  await mkdir(CACHE_DIR, { recursive: true });
  const [latestT100, latestOnTime] = await Promise.all([
    fromSource('BTS T-100', latestT100Month),
    fromSource('BTS On-Time PREZIP', latestOnTimeMonth),
  ]);
  const period = selectPeriod(latestT100, latestOnTime);
  console.log(
    `Data period ${period.start}..${period.end} (T-100 latest ${latestT100}, on-time latest ${latestOnTime})`,
  );

  const [t100, delays, faa, ourAirports] = await Promise.all([
    fromSource('BTS T-100', async () => {
      const paths: string[] = [];
      // Sequential: one form POST per month keeps the TranStats session happy.
      for (const month of period.months) {
        paths.push(await downloadT100Month(month));
        console.log(`T-100 ${month} ready`);
      }
      return aggregateT100(t100Rows(paths), period.months);
    }),
    fromSource('BTS On-Time PREZIP', async () => {
      const path = await cached(`ontime-${period.end}.zip`, () =>
        fetch(ON_TIME_URL(period.end), {
          signal: AbortSignal.timeout(3_600_000),
        }),
      );
      console.log(`On-time ${period.end} downloaded, aggregating`);
      const parser = Readable.from(unzippedCsv(path)).pipe(
        parseCsvStream({
          bom: true,
          columns: (header: string[]) => {
            requireColumns(`ontime-${period.end}.zip`, header, ON_TIME_FIELDS);
            return header.map((h) => (ON_TIME_FIELDS.has(h) ? h : false));
          },
          relax_column_count: true,
        }),
      );
      return aggregateOnTime(parser);
    }),
    fromSource('FAA enplanements', async () => {
      const path = await cached('faa-cy2025-commercial-service.xlsx', () =>
        fetch(FAA_URL, {
          headers: { 'user-agent': BROWSER_UA },
          signal: AbortSignal.timeout(120_000),
        }),
      );
      const zip = unzipSync(await readFile(path));
      const text = (name: string): string => {
        const bytes = zip[name];
        if (!bytes) throw new Error(`${name} missing from xlsx`);
        return new TextDecoder().decode(bytes);
      };
      const rows = parseFaaSheet(
        text('xl/worksheets/sheet1.xml'),
        text('xl/sharedStrings.xml'),
      );
      if (rows.length === 0) throw new Error('no airport rows in xlsx');
      return rows;
    }),
    fromSource('OurAirports', async () => {
      const path = await cached('ourairports-airports.csv', () =>
        fetch(OUR_AIRPORTS_URL, { signal: AbortSignal.timeout(300_000) }),
      );
      return parseCsv(await readFile(path), { columns: true }) as Record<
        string,
        string
      >[];
    }),
  ]);

  const airports = buildAirports(faa, ourAirports, t100.traffic, delays);
  const peerSet = new Set(airports.map((a) => a.iata));
  const snapshot: Snapshot = snapshotSchema.parse({
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
    `Wrote ${target}: ${airports.length} airports, ${snapshot.routes.length} route rows`,
  );
};

run().catch((e: Error) => {
  console.error(`Ingest failed, snapshot left untouched. ${e.message}`);
  process.exitCode = 1;
});
