import { describe, expect, it } from 'vitest';
import type { RouteRow } from '../../ingest/snapshot-schema';
import { buildNationalKpis } from '../../kpis/national';
import { airport, snapshot } from '../../test-fixture';
import { DELAY_CAVEATS, GROWTH_CAVEAT } from '../footer';
import {
  demandDrivers,
  estimateUnmetDemand,
  routeGaps,
} from './estimateUnmetDemand';

const row = (
  dest: string,
  month: string,
  seats: number,
  passengers: number,
  overrides: Partial<RouteRow> = {},
): RouteRow => ({
  origin: 'SFO',
  dest,
  month,
  classGroup: 'passenger',
  departures: 1,
  seats,
  passengers,
  distance: 300,
  ...overrides,
});

describe('routeGaps', () => {
  it('counts exactly 80% and below as no gap', () => {
    const g = routeGaps(
      [row('LAX', '2026-01', 100, 80), row('SEA', '2026-01', 100, 50)],
      'SFO',
    );
    expect(g).toMatchObject({ gap: 0, routeMonths: 2, monthsAbove: 0 });
  });

  it('sums carriers per route-month before the gap, then sums months', () => {
    const g = routeGaps(
      [
        // Same route-month split across carriers: 180 pax / 200 seats -> 225 - 200 = 25.
        row('LAX', '2026-01', 100, 100),
        row('LAX', '2026-01', 100, 80),
        row('LAX', '2026-02', 100, 90), // 112.5 - 100 -> 13
        row('LAX', '2026-03', 100, 10), // below target
      ],
      'SFO',
    );
    expect(g).toMatchObject({ gap: 38, routeMonths: 3, monthsAbove: 2 });
    expect(g.top).toEqual([{ dest: 'LAX', monthsAbove: 2, seatsShort: 38 }]);
  });

  it('treats passengers on zero seats as fully short', () => {
    expect(routeGaps([row('LAX', '2026-01', 0, 8)], 'SFO').gap).toBe(10);
  });

  it('ignores other origins and cargo rows', () => {
    const g = routeGaps(
      [
        row('LAX', '2026-01', 100, 100, { origin: 'OAK' }),
        row('LAX', '2026-01', 100, 100, { classGroup: 'cargo' }),
      ],
      'SFO',
    );
    expect(g.routeMonths).toBe(0);
  });

  it('keeps the top 5 destinations by seats short', () => {
    const dests = ['A', 'B', 'C', 'D', 'E', 'F'];
    const rows = dests.map((d, i) => row(`${d}AA`, '2026-01', 100, 81 + i * 2));
    const top = routeGaps(rows, 'SFO').top.map((r) => r.dest);
    expect(top).toEqual(['FAA', 'EAA', 'DAA', 'CAA', 'BAA']);
  });
});

describe('demandDrivers', () => {
  const evidence = {
    monthsAbove: 0,
    routeMonths: 10,
    loadFactorPercentile: 74.9,
    congestionIndex: 74.9,
    nasShare: 24.9,
    growth: 0,
  };

  it('reports no driver when every rule is just below its threshold', () => {
    expect(demandDrivers(evidence)).toEqual([
      'No capacity-constraint driver was found: no route-month ran above 80%, and load factor, congestion, NAS delays and growth are all below their thresholds.',
    ]);
  });

  it('fires every rule at its threshold', () => {
    const notes = demandDrivers({
      monthsAbove: 3,
      routeMonths: 10,
      loadFactorPercentile: 75,
      congestionIndex: 75,
      nasShare: 25,
      growth: 0.1,
    });
    expect(notes).toEqual([
      '3 of 10 route-months (30.0%) ran above the 80% target load factor.',
      'Load factor is at the 75th percentile of US airports (threshold 75).',
      'Congestion index is 75.0 of 100 (threshold 75).',
      'National airspace system (NAS) delays cause 25.0% of delay-cause minutes (threshold 25%).',
      'Passenger enplanements grew 0.1% in CY2025 vs CY2024.',
    ]);
  });

  it('uses thousands separators and whole ordinal percentiles', () => {
    expect(
      demandDrivers({
        ...evidence,
        monthsAbove: 1234,
        routeMonths: 5678,
        loadFactorPercentile: 92.6,
      }).slice(0, 2),
    ).toEqual([
      '1,234 of 5,678 route-months (21.7%) ran above the 80% target load factor.',
      'Load factor is at the 93rd percentile of US airports (threshold 75).',
    ]);
  });

  it('names unavailable evidence instead of calling it below threshold', () => {
    expect(
      demandDrivers({ ...evidence, congestionIndex: null, nasShare: null }),
    ).toEqual([
      'No capacity-constraint driver was found: no route-month ran above 80%, and load factor and growth are below their thresholds; not assessed: no delay data, no delay-cause data.',
    ]);
  });

  it('says no driver could be established when all other evidence is missing', () => {
    expect(
      demandDrivers({
        ...evidence,
        loadFactorPercentile: null,
        congestionIndex: null,
        nasShare: null,
        growth: null,
      }),
    ).toEqual([
      'No capacity-constraint driver could be established from the available data: no route-month ran above 80%; not assessed: no load-factor data, no delay data, no delay-cause data, no prior-year enplanements.',
    ]);
  });
});

describe('estimateUnmetDemand', () => {
  const snap = {
    ...snapshot([airport('SFO'), airport('OAK', { priorEnplanements: 0 })]),
    routes: [row('LAX', '2026-01', 100, 90), row('SEA', '2026-02', 100, 50)],
  };
  const ctx = { snapshot: snap, kpis: buildNationalKpis(snap) };

  it('returns the gap, top routes, drivers and footer', () => {
    const r = estimateUnmetDemand(ctx, 'SFO');
    if (!r.ok) throw new Error('expected ok');
    expect(r.metrics[0]).toEqual({
      label: 'Seat gap',
      value: 13,
      unit: 'seats',
      note: 'estimate',
    });
    expect(r.metrics.map((m) => m.label)).toEqual([
      'Seat gap',
      'Route-months above 80%',
      'Share of route-months above 80%',
      'Load factor',
      'Congestion index',
      'NAS share of delay-cause minutes',
      'Passenger growth CY2025 vs CY2024',
    ]);
    expect(r.table?.rows).toEqual([
      { iata: 'LAX', monthsAbove: 1, seatsShort: 13 },
    ]);
    expect(r.notes?.[0]).toBe(
      '1 of 2 route-months (50.0%) ran above the 80% target load factor.',
    );
    expect(r.caveats).toEqual([...DELAY_CAVEATS, GROWTH_CAVEAT]);
    expect(r.source).toContain('T-100');
    expect(r.period).toMatch(/Traffic.*delays.*growth/);
    expect(r.assumptions.join(' ')).toMatch(/80%.*route × month.*estimate/s);
  });

  it('returns NotFound for an unknown airport', () => {
    expect(estimateUnmetDemand(ctx, 'XXX')).toEqual({
      ok: false,
      error: { kind: 'NotFound', message: 'No data for airport codes: XXX.' },
    });
  });

  it('returns NotFound when the airport has no passenger routes', () => {
    const r = estimateUnmetDemand(ctx, 'OAK');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toMatch(/no passenger routes/i);
  });
});
