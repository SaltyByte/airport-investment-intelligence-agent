import { z } from 'zod';

// Snapshot written by `pnpm ingest` (gzipped when large) and loaded by the server at boot.
export const SNAPSHOT_FILE = 'snapshot.json';
export const SNAPSHOT_GZ_FILE = 'snapshot.json.gz';

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const count = z.number().nonnegative();
const classGroup = z.enum(['passenger', 'cargo']);

const trafficSums = z.object({
  departures: count,
  seats: count,
  passengers: count,
});

export const routeRowSchema = z.object({
  origin: z.string(),
  dest: z.string(),
  month,
  classGroup,
  departures: count,
  seats: count,
  passengers: count,
  distance: count,
});

export const delaySumsSchema = z.object({
  flights: count,
  cancelled: count,
  // Flights with a departure-delay value; denominator for the ≥15 share and mean delay.
  depDelayCount: count,
  depDelayed15: count,
  // DepDelayMinutes: early departures count as 0.
  depDelayMinutes: count,
  taxiOutMinutes: count,
  taxiOutCount: count,
  causeMinutes: z.object({
    carrier: count,
    weather: count,
    nas: count,
    security: count,
    lateAircraft: count,
  }),
});

export const snapshotAirportSchema = z.object({
  iata: z.string(),
  name: z.string(),
  city: z.string(),
  state: z.string(),
  faaRegion: z.string(),
  serviceLevel: z.enum(['P', 'CS']),
  hub: z.enum(['L', 'M', 'S', 'N']).nullable(),
  enplanements: count,
  priorEnplanements: count,
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  // T-100 sums over meta.period; null when the airport has no T-100 departures.
  traffic: z.object({ passenger: trafficSums, cargo: trafficSums }).nullable(),
  // On-time sums over the on-time source period; null when no reporting-carrier flights.
  delays: delaySumsSchema.nullable(),
});

const monthRange = z.object({ start: month, end: month });

export const snapshotSchema = z.object({
  meta: z.object({
    generatedAt: z.iso.datetime(),
    period: monthRange,
    sources: z.array(
      z.object({ name: z.string(), url: z.string(), period: z.string() }),
    ),
  }),
  airports: z.array(snapshotAirportSchema),
  routes: z.array(routeRowSchema),
});

export type Snapshot = z.infer<typeof snapshotSchema>;
export type SnapshotAirport = z.infer<typeof snapshotAirportSchema>;
export type RouteRow = z.infer<typeof routeRowSchema>;
export type DelaySums = z.infer<typeof delaySumsSchema>;
export type ClassGroup = z.infer<typeof classGroup>;
