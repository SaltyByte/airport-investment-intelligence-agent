// BTS On-Time Reporting (PREZIP): one month of per-flight rows aggregated to per-airport delay sums.
import { Readable } from 'node:stream';
import { parse as parseCsvStream } from 'csv-parse';
import type { DelaySums } from '../../snapshot/schema';
import { btsCode, num, type Row, requireColumns } from '../columns';
import { cached, unzippedCsv } from '../download';
import { formatMonth } from '../period';

export const ON_TIME_URL = (month: string): string => {
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

export const latestOnTimeMonth = async (): Promise<string> => {
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

export const loadOnTime = async (month: string) => {
  const path = await cached(`ontime-${month}.zip`, () =>
    fetch(ON_TIME_URL(month), {
      signal: AbortSignal.timeout(3_600_000),
    }),
  );
  console.log(`On-time ${month} downloaded, aggregating`);
  const parser = Readable.from(unzippedCsv(path)).pipe(
    parseCsvStream({
      bom: true,
      columns: (header: string[]) => {
        requireColumns(`ontime-${month}.zip`, header, ON_TIME_FIELDS);
        return header.map((h) => (ON_TIME_FIELDS.has(h) ? h : false));
      },
      relax_column_count: true,
    }),
  );
  return aggregateOnTime(parser);
};

/** On-time per-flight rows → per-origin delay sums. Blank cause fields count as 0. */
export const aggregateOnTime = async (
  rows: AsyncIterable<Row> | Iterable<Row>,
): Promise<Map<string, DelaySums>> => {
  const delays = new Map<string, DelaySums>();
  for await (const row of rows) {
    const origin = btsCode(row.Origin as string);
    let d = delays.get(origin);
    if (!d) {
      d = {
        flights: 0,
        cancelled: 0,
        depDelayCount: 0,
        depDelayed15: 0,
        depDelayMinutes: 0,
        taxiOutMinutes: 0,
        taxiOutCount: 0,
        causeMinutes: {
          carrier: 0,
          weather: 0,
          nas: 0,
          security: 0,
          lateAircraft: 0,
        },
      };
      delays.set(origin, d);
    }
    d.flights += 1;
    d.cancelled += num(row.Cancelled);
    if (row.DepDelayMinutes) {
      d.depDelayCount += 1;
      d.depDelayed15 += num(row.DepDel15);
      d.depDelayMinutes += num(row.DepDelayMinutes);
    }
    if (row.TaxiOut) {
      d.taxiOutCount += 1;
      d.taxiOutMinutes += num(row.TaxiOut);
    }
    d.causeMinutes.carrier += num(row.CarrierDelay);
    d.causeMinutes.weather += num(row.WeatherDelay);
    d.causeMinutes.nas += num(row.NASDelay);
    d.causeMinutes.security += num(row.SecurityDelay);
    d.causeMinutes.lateAircraft += num(row.LateAircraftDelay);
  }
  return delays;
};
