import type {
  DelaySums,
  Snapshot,
  SnapshotAirport,
} from './ingest/snapshot-schema';

// Test-only builders for small snapshots.

export const delays = (overrides: Partial<DelaySums> = {}): DelaySums => ({
  flights: 100,
  cancelled: 2,
  depDelayCount: 98,
  depDelayed15: 20,
  depDelayMinutes: 980,
  taxiOutMinutes: 1470,
  taxiOutCount: 98,
  causeMinutes: {
    carrier: 400,
    weather: 100,
    nas: 200,
    security: 0,
    lateAircraft: 300,
  },
  ...overrides,
});

export const airport = (
  iata: string,
  overrides: Partial<SnapshotAirport> = {},
): SnapshotAirport => ({
  iata,
  name: `${iata} Airport`,
  city: `${iata} City`,
  state: 'CA',
  faaRegion: 'WP',
  serviceLevel: 'P',
  hub: 'M',
  enplanements: 1100,
  priorEnplanements: 1000,
  latitude: null,
  longitude: null,
  traffic: {
    passenger: { departures: 10, seats: 1000, passengers: 800 },
    cargo: { departures: 0, seats: 0, passengers: 0 },
  },
  delays: delays(),
  ...overrides,
});

export const snapshot = (airports: SnapshotAirport[]): Snapshot => ({
  meta: {
    generatedAt: '2026-10-25T10:00:00.000Z',
    period: { start: '2025-08', end: '2026-07' },
    sources: [
      { name: 'BTS T-100 Segment', url: 'u1', period: '2025-08 to 2026-07' },
      { name: 'BTS On-Time Reporting Carrier', url: 'u2', period: '2026-07' },
      { name: 'FAA enplanements', url: 'u3', period: 'CY2025 vs CY2024' },
    ],
  },
  airports,
  routes: [],
});
