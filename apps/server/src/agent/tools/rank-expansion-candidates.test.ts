import { RankExpansionCandidatesInput } from '@app/shared';
import { describe, expect, it } from 'vitest';
import { buildNationalKpis } from '../../kpis/airport-kpis';
import { airport, snapshot } from '../../test/fixtures';
import { rankExpansionCandidates } from './rank-expansion-candidates';
import { GROWTH_CAVEAT } from './result';

const snap = snapshot([
  airport('BOS', {
    state: 'MA',
    enplanements: 1500,
    traffic: {
      passenger: { departures: 10, seats: 1000, passengers: 950 },
      cargo: { departures: 0, seats: 0, passengers: 0 },
    },
  }),
  airport('PVD', { state: 'RI' }),
  airport('BDL', { state: 'CT' }),
  airport('EWB', { state: 'MA', delays: null }),
  airport('ALB', { state: 'NY', enplanements: 1300 }),
  airport('LAX'),
]);
const ctx = { snapshot: snap, kpis: buildNationalKpis(snap) };

describe('rankExpansionCandidates', () => {
  it('ranks a region by score, labels catchment rows and lists excluded airports', () => {
    const result = rankExpansionCandidates(ctx, { region: 'New England' });
    if (!result.ok) throw new Error('expected ok');
    const rows = result.table?.rows ?? [];
    expect(rows.map((r) => r.iata)).toEqual(['BOS', 'ALB', 'BDL', 'PVD']);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3, 4]);
    expect(rows[1]?.airport).toBe('ALB Airport (New England catchment)');
    expect(rows[0]?.score).toBe(ctx.kpis.get('BOS')?.expansion.score);
    expect(rows[0]).toMatchObject({
      delayed15Share: (20 / 98) * 100,
      meanDepDelay: 10,
      meanTaxiOut: 15,
    });
    expect(rows[0]?.loadFactor).toBe(
      (ctx.kpis.get('BOS')?.loadFactor ?? 0) * 100,
    );
    expect(result.table?.columns.find((c) => c.key === 'loadFactor')).toEqual({
      key: 'loadFactor',
      label: 'Load factor',
      unit: 'percent',
    });
    expect(result.table?.columns.slice(0, 3).map((c) => c.key)).toEqual([
      'iata',
      'airport',
      'rank',
    ]);
    expect(result.source).toMatch(/T-100.*On-Time.*FAA/);
    expect(result.caveats).toContain(GROWTH_CAVEAT);
    expect(result.table?.columns.slice(-3)).toEqual([
      { key: 'delayed15Share', label: 'Delayed 15+ min', unit: 'percent' },
      { key: 'meanDepDelay', label: 'Mean departure delay', unit: 'minutes' },
      { key: 'meanTaxiOut', label: 'Mean taxi-out', unit: 'minutes' },
    ]);
    expect(result.metrics.map((m) => m.value)).toEqual([4, 1]);
    expect(result.notes).toEqual(['EWB: no delay data']);
    expect(result.assumptions.join(' ')).toContain('ALB');
  });

  it('returns ok with no rows and a note for a region without airports', () => {
    const result = rankExpansionCandidates(ctx, { region: 'WY' });
    if (!result.ok) throw new Error('expected ok');
    expect(result.table?.rows).toEqual([]);
    expect(result.notes?.[0]).toMatch(/No airports/);
  });

  it('ranks the whole US: top 20 rows, total scored count and summary notes only', () => {
    const us = snapshot([
      ...Array.from({ length: 23 }, (_, i) =>
        airport(`A${String.fromCharCode(65 + i)}A`, {
          enplanements: 1000 + i * 37,
          priorEnplanements: 1000,
        }),
      ),
      airport('NDA', { delays: null }),
      airport('NDB', { delays: null }),
    ]);
    const usCtx = { snapshot: us, kpis: buildNationalKpis(us) };
    const result = rankExpansionCandidates(usCtx, { region: 'US' });
    if (!result.ok) throw new Error('expected ok');
    const rows = result.table?.rows ?? [];
    expect(rows).toHaveLength(20);
    expect(rows.map((r) => r.rank)).toEqual(
      Array.from({ length: 20 }, (_, i) => i + 1),
    );
    const scores = rows.map((r) => r.score as number);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(rows[0]?.iata).toBe('AWA');
    expect(result.title).toBe('Terminal expansion candidates: US (top 20)');
    expect(result.metrics.map((m) => m.value)).toEqual([23, 2]);
    expect(result.notes).toEqual([
      'The table shows the top 20 of 23 scored airports.',
      '2 airports are not ranked for lack of data.',
    ]);
  });

  it('states the profitability proxy on every ranking', () => {
    for (const input of [
      { region: 'New England' as const },
      { airports: ['BOS'] },
    ]) {
      const result = rankExpansionCandidates(ctx, input);
      if (!result.ok) throw new Error('expected ok');
      expect(result.assumptions.join(' ')).toMatch(
        /proxy.*does not model revenue, costs or financing/,
      );
    }
  });

  it('names unknown codes in a NotFound error', () => {
    expect(rankExpansionCandidates(ctx, { airports: ['BOS', 'ZZZ'] })).toEqual({
      ok: false,
      error: { kind: 'NotFound', message: 'No data for airport codes: ZZZ.' },
    });
  });

  it('requires exactly one of region and airports, at most 10 airports', () => {
    expect(RankExpansionCandidatesInput.safeParse({}).success).toBe(false);
    expect(
      RankExpansionCandidatesInput.safeParse({
        region: 'TX',
        airports: ['BOS'],
      }).success,
    ).toBe(false);
    expect(
      RankExpansionCandidatesInput.safeParse({
        airports: Array(11).fill('BOS'),
      }).success,
    ).toBe(false);
    for (const region of ['TX', 'US'])
      expect(RankExpansionCandidatesInput.safeParse({ region }).success).toBe(
        true,
      );
  });
});
