import type {
  ClassGroup,
  DelaySums,
  RouteRow,
  SnapshotAirport,
} from './snapshot-schema';

type Row = Record<string, string>;
type TrafficSums = { departures: number; seats: number; passengers: number };
export type Traffic = Record<ClassGroup, TrafficSums>;
export type Period = { start: string; end: string; months: string[] };

export const formatMonth = (year: number, month: number): string =>
  `${year}-${String(month).padStart(2, '0')}`;

const addMonths = (month: string, n: number): string => {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const total = y * 12 + (m - 1) + n;
  return formatMonth(Math.floor(total / 12), (total % 12) + 1);
};

/** Trailing 12 months ending at the latest month both BTS sources cover. */
export const selectPeriod = (
  latestT100: string,
  latestOnTime: string,
): Period => {
  const end = latestT100 < latestOnTime ? latestT100 : latestOnTime;
  const months = Array.from({ length: 12 }, (_, i) => addMonths(end, i - 11));
  return { start: months[0] as string, end, months };
};

const CLASS_GROUP: Record<string, ClassGroup> = {
  F: 'passenger',
  L: 'passenger',
  G: 'cargo',
  P: 'cargo',
};

const num = (value: string | undefined): number => Number(value || 0);
// shortcut: hand-maintained code aliases, replace with a BTS airport-ID join if more appear.
// BTS still reports these airports under their old/FAA codes; values are the peer-set IATA.
const BTS_CODE_ALIASES: Record<string, string> = {
  PBI: 'DJT', // West Palm Beach, renamed 2025
  '1G4': 'GCW', // Grand Canyon West: BTS uses the FAA id
};

const btsCode = (code: string): string => BTS_CODE_ALIASES[code] ?? code;

/** Throws naming the source and every required column the header lacks. */
export const requireColumns = (
  source: string,
  header: string[],
  required: Iterable<string>,
): void => {
  const present = new Set(header);
  const missing = [...required].filter((c) => !present.has(c));
  if (missing.length > 0)
    throw new Error(`${source}: missing columns ${missing.join(', ')}`);
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

const decodeXml = (text: string): string =>
  text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&');

/** FAA commercial-service enplanements sheet XML (+ sharedStrings) → ranked airport rows. */
export const parseFaaSheet = (
  sheetXml: string,
  sharedStringsXml: string,
): FaaAirport[] => {
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
        enplanements: Number(get(row, 'CY 25 Enplanements')),
        priorEnplanements: Number(get(row, 'CY 24 Enplanements')),
      };
    });
};

// OurAirports files US territories under their own country codes.
const US_COUNTRIES = new Set(['US', 'PR', 'GU', 'VI', 'AS', 'MP']);

/** FAA peer set joined to OurAirports by IATA (else FAA location id = local_code), with T-100 and on-time sums attached. */
export const buildAirports = (
  faa: FaaAirport[],
  ourAirports: Iterable<Row>,
  traffic: Map<string, Traffic>,
  delays: Map<string, DelaySums>,
): SnapshotAirport[] => {
  const byIata = new Map<string, Row>();
  const byLocal = new Map<string, Row>();
  for (const row of ourAirports) {
    if (!US_COUNTRIES.has(row.iso_country ?? '')) continue;
    if (row.iata_code) byIata.set(row.iata_code, row);
    if (row.local_code) byLocal.set(row.local_code, row);
  }
  return faa.map(({ locid, ...f }) => {
    const oa = byIata.get(locid) ?? byLocal.get(locid);
    // BTS keys airports by IATA, which differs from the FAA id at some airports (IWA → AZA).
    const iata = oa?.iata_code || locid;
    const region = oa?.iso_region ?? '';
    return {
      iata,
      name: oa?.name || f.name,
      city: oa?.municipality || f.city,
      state: region.startsWith('US-') ? region.slice(3) : f.state,
      faaRegion: f.faaRegion,
      serviceLevel: f.serviceLevel,
      hub: f.hub,
      enplanements: f.enplanements,
      priorEnplanements: f.priorEnplanements,
      latitude: oa ? Number(oa.latitude_deg) : null,
      longitude: oa ? Number(oa.longitude_deg) : null,
      traffic: traffic.get(iata) ?? null,
      delays: delays.get(iata) ?? null,
    };
  });
};
