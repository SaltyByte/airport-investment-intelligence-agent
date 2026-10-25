// FAA commercial-service enplanements: the xlsx that defines the airport peer set.
import { readFile } from 'node:fs/promises';
import { unzipSync } from 'fflate';
import { BROWSER_UA, cached } from '../download';

// FAA publishes one calendar-year file (with the prior year alongside) each summer.
export const FAA_URL = (year: number): string =>
  `https://www.faa.gov/airports/planning_capacity/passenger_allcargo_stats/passenger/arp-cy${year}-commercial-service-enplanements.xlsx`;

/** Snapshot source period label for one FAA file. */
export const faaPeriod = (year: number): string => `CY${year} vs CY${year - 1}`;

/** Newest published FAA calendar year, probing back from last year (404 → older). */
export const latestFaaYear = async (
  now = new Date(),
  fetchFn: typeof fetch = fetch,
): Promise<number> => {
  const last = now.getUTCFullYear() - 1;
  for (let year = last; year > last - 4; year--) {
    const res = await fetchFn(FAA_URL(year), {
      method: 'HEAD',
      headers: { 'user-agent': BROWSER_UA },
      signal: AbortSignal.timeout(60_000),
    });
    if (res.ok) return year;
    if (res.status !== 404)
      throw new Error(`HTTP ${res.status} probing CY${year}`);
  }
  throw new Error(`no FAA enplanements file for CY${last - 3}..CY${last}`);
};

export type FaaAirport = {
  locid: string;
  faaRegion: string;
  state: string;
  city: string;
  name: string;
  serviceLevel: 'P' | 'CS';
  hub: 'L' | 'M' | 'S' | 'N' | null;
  enplanements: number;
  priorEnplanements: number;
};

/** Downloads (cached) one year's FAA xlsx and parses its first sheet. */
export const loadFaa = async (year: number): Promise<FaaAirport[]> => {
  const path = await cached(`faa-cy${year}-commercial-service.xlsx`, () =>
    fetch(FAA_URL(year), {
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
    year,
  );
  if (rows.length === 0) throw new Error('no airport rows in xlsx');
  return rows;
};

const decodeXml = (text: string): string =>
  text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&');

/** FAA commercial-service enplanements sheet XML (+ sharedStrings) → ranked airport rows. Columns name the file year ("CY 25"). */
export const parseFaaSheet = (
  sheetXml: string,
  sharedStringsXml: string,
  year: number,
): FaaAirport[] => {
  const cy = (y: number) =>
    `CY ${String(y % 100).padStart(2, '0')} Enplanements`;
  const shared = [...sharedStringsXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(
    ([, si]) =>
      decodeXml(
        [...(si as string).matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
          .map(([, t]) => t)
          .join(''),
      ),
  );
  const table = [...sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map(
    ([, row]) => {
      const cells: Record<string, string> = {};
      for (const [, col, attrs, inner] of (row as string).matchAll(
        /<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g,
      )) {
        const value = inner?.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? '';
        cells[col as string] =
          attrs?.includes('t="s"') && value
            ? (shared[Number(value)] ?? '')
            : decodeXml(value);
      }
      return cells;
    },
  );
  const [header = {}, ...body] = table;
  const column = Object.fromEntries(
    Object.entries(header).map(([col, name]) => [name, col]),
  );
  const get = (row: Record<string, string>, name: string): string => {
    const col = column[name];
    if (!col) throw new Error(`FAA sheet is missing column "${name}"`);
    return row[col] ?? '';
  };
  return body
    .filter((row) => get(row, 'Rank') !== '')
    .map((row) => {
      const serviceLevel = get(row, 'S/L');
      const hub = get(row, 'Hub');
      if (serviceLevel !== 'P' && serviceLevel !== 'CS')
        throw new Error(`Unknown FAA S/L "${serviceLevel}"`);
      if (!['L', 'M', 'S', 'N', 'None'].includes(hub))
        throw new Error(`Unknown FAA hub "${hub}"`);
      return {
        locid: get(row, 'Locid'),
        faaRegion: get(row, 'RO'),
        state: get(row, 'ST'),
        city: get(row, 'City'),
        name: get(row, 'Airport Name'),
        serviceLevel,
        hub: hub === 'None' ? null : (hub as FaaAirport['hub']),
        enplanements: Number(get(row, cy(year))),
        priorEnplanements: Number(get(row, cy(year - 1))),
      };
    });
};
