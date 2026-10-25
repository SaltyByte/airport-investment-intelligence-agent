// BTS T-100 Segment: scraped TranStats form download and per-airport / per-route aggregation.
import { readFileSync } from 'node:fs';
import { parse as parseCsv } from 'csv-parse/sync';
import { unzipSync } from 'fflate';
import type { ClassGroup, RouteRow } from '../../snapshot/schema';
import { btsCode, num, type Row, requireColumns } from '../columns';
import { cached } from '../download';
import { formatMonth } from '../period';

export const T100_URL =
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

type TrafficSums = { departures: number; seats: number; passengers: number };
export type Traffic = Record<ClassGroup, TrafficSums>;

const fetchT100Form = async (): Promise<{ html: string; cookie: string }> => {
  const res = await fetch(T100_URL, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`form page HTTP ${res.status}`);
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
  return { html: await res.text(), cookie };
};

export const latestT100Month = async (): Promise<string> => {
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

/** Downloads (cached) every month of the period and aggregates it. */
export const loadT100 = async (months: string[]) => {
  const paths: string[] = [];
  // Sequential: one form POST per month keeps the TranStats session happy.
  for (const month of months) {
    paths.push(await downloadT100Month(month));
    console.log(`T-100 ${month} ready`);
  }
  return aggregateT100(t100Rows(paths), months);
};

const CLASS_GROUP: Record<string, ClassGroup> = {
  F: 'passenger',
  L: 'passenger',
  G: 'cargo',
  P: 'cargo',
};

/** T-100 segment rows → per-origin traffic sums and route × month × class-group rows within the period. */
export const aggregateT100 = (
  rows: Iterable<Row>,
  months: string[],
): { traffic: Map<string, Traffic>; routes: RouteRow[] } => {
  const inPeriod = new Set(months);
  const traffic = new Map<string, Traffic>();
  const routes = new Map<string, RouteRow>();
  for (const row of rows) {
    const classGroup = CLASS_GROUP[row.CLASS ?? ''];
    if (!classGroup)
      throw new Error(`Unknown T-100 service class "${row.CLASS}"`);
    const month = formatMonth(num(row.YEAR), num(row.MONTH));
    const departures = num(row.DEPARTURES_PERFORMED);
    const seats = num(row.SEATS);
    const passengers = num(row.PASSENGERS);
    if (!inPeriod.has(month) || departures + seats + passengers === 0) continue;
    const origin = btsCode(row.ORIGIN as string);
    const dest = btsCode(row.DEST as string);

    let airport = traffic.get(origin);
    if (!airport) {
      airport = {
        passenger: { departures: 0, seats: 0, passengers: 0 },
        cargo: { departures: 0, seats: 0, passengers: 0 },
      };
      traffic.set(origin, airport);
    }
    const sums = airport[classGroup];
    sums.departures += departures;
    sums.seats += seats;
    sums.passengers += passengers;

    const key = `${origin}|${dest}|${month}|${classGroup}`;
    const route = routes.get(key);
    if (route) {
      route.departures += departures;
      route.seats += seats;
      route.passengers += passengers;
      route.distance ||= num(row.DISTANCE);
    } else {
      routes.set(key, {
        origin,
        dest,
        month,
        classGroup,
        departures,
        seats,
        passengers,
        distance: num(row.DISTANCE),
      });
    }
  }
  return { traffic, routes: [...routes.values()] };
};
