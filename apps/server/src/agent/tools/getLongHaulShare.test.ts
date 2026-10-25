import { describe, expect, it } from 'vitest';
import type { RouteRow } from '../../ingest/snapshot-schema';
import { buildNationalKpis } from '../../kpis/national';
import { airport, snapshot } from '../../test-fixture';
import { longHaulReport } from './getLongHaulShare';

const route = (
  dest: string,
  distance: number,
  departures: number,
  classGroup: RouteRow['classGroup'] = 'passenger',
  month = '2026-07',
): RouteRow => ({
  origin: 'ANC',
  dest,
  month,
  classGroup,
  departures,
  seats: 0,
  passengers: 0,
  distance,
});

const run = (routes: RouteRow[], iata = 'ANC') => {
  const snap = { ...snapshot([airport('ANC'), airport('SNA')]), routes };
  return longHaulReport(snap, buildNationalKpis(snap), iata);
};

describe('longHaulReport', () => {
  it('splits shares by service and counts 3,000 mi as long-haul but not 2,999', () => {
    const result = run([
      route('SEA', 2999, 6),
      route('ICN', 3000, 2, 'passenger', '2026-06'),
      route('ICN', 3000, 2),
      route('PVG', 5000, 10, 'cargo'),
      route('FAI', 260, 10, 'cargo'),
      { ...route('LAX', 4000, 3), origin: 'SNA' },
    ]);
    if (!result.ok) throw new Error('expected ok');
    expect(result.metrics.map((m) => [m.value, m.note])).toEqual([
      [46.7, '14 of 30 departures'],
      [40, '4 of 10 departures'],
      [50, '10 of 20 departures'],
    ]);
    expect(result.table?.rows).toEqual([
      { iata: 'PVG', distance: 5000, departures: 10, service: 'cargo' },
      { iata: 'ICN', distance: 3000, departures: 4, service: 'passenger' },
    ]);
    expect(result.source).toBe('BTS T-100 Segment');
    expect(result.period).toBe('Traffic Aug 2025–Jul 2026');
  });

  it('reports no flights for an empty group and 0% without a table', () => {
    const result = run([route('SEA', 1500, 8)]);
    if (!result.ok) throw new Error('expected ok');
    expect(result.metrics.map((m) => [m.value, m.note])).toEqual([
      [0, '0 of 8 departures'],
      [0, '0 of 8 departures'],
      [null, 'no flights'],
    ]);
    expect(result.table).toBeUndefined();
    expect(result.notes).toHaveLength(1);
  });

  it('returns NotFound for an unknown code', () => {
    const result = run([], 'XXX');
    expect(result.ok || result.error.kind).toBe('NotFound');
  });
});
