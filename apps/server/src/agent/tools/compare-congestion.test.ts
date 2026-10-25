import { describe, expect, it } from 'vitest';
import { buildNationalKpis } from '../../kpis/airport-kpis';
import { airport, delays, snapshot } from '../../test/fixtures';
import {
  compareCongestion,
  createCompareCongestionTool,
} from './compare-congestion';
import { DELAY_CAVEATS } from './result';

const snap = snapshot([
  airport('LAX', {
    delays: delays({ depDelayed15: 40, depDelayMinutes: 2000 }),
  }),
  airport('SNA'),
  airport('BUR', { delays: null }),
  airport('ONT', {
    delays: delays({
      depDelayed15: 5,
      depDelayMinutes: 100,
      taxiOutMinutes: 500,
      causeMinutes: {
        carrier: 0,
        weather: 0,
        nas: 0,
        security: 0,
        lateAircraft: 0,
      },
    }),
  }),
  airport('BOS', { state: 'MA' }),
  airport('ALB', { state: 'NY' }),
]);
const ctx = { snapshot: snap, kpis: buildNationalKpis(snap) };

describe('compareCongestion', () => {
  it('orders by congestion index, airports without delay data last', () => {
    const r = compareCongestion(ctx, { airports: ['BUR', 'ONT', 'LAX'] });
    if (!r.ok) throw new Error(r.error.message);
    expect(r.table?.rows.map((row) => row.iata)).toEqual(['LAX', 'ONT', 'BUR']);
    expect(r.metrics.map((m) => m.label)).toEqual([
      'Congestion index — LAX',
      'Congestion index — ONT',
      'Congestion index — BUR',
    ]);
    expect(r.notes).toContain(
      'BUR: no on-time data: no US reporting carrier operates there.',
    );
    expect(r.notes).toContain('LAX is the most congested by congestion index.');
    expect(r.caveats).toContain(
      'Cause minutes are recorded only for delayed arrivals.',
    );
    expect(r.caveats).toEqual([
      ...DELAY_CAVEATS,
      'Cause minutes are recorded only for delayed arrivals.',
    ]);
    expect(r.source).toBe('BTS On-Time Reporting Carrier');
    expect(r.period).toBe('Delays Jul 2026');
    const lax = ctx.kpis.get('LAX');
    const ont = ctx.kpis.get('ONT');
    const r1 = (n: number | null | undefined) => Math.round((n ?? 0) * 10) / 10;
    expect(r.headline).toEqual({
      iata: 'LAX',
      name: 'LAX Airport',
      label: 'Congestion index',
      value: lax?.congestionIndex,
      unit: 'score',
      // Indices to one fixed decimal, as on the card.
      context: `Most congested of 2, 1 without data; ${(r1(lax?.congestionIndex) - r1(ont?.congestionIndex)).toFixed(1)} points above ONT (${r1(ont?.congestionIndex).toFixed(1)})`,
      drivers: [
        { label: 'Delayed 15+ min', value: lax?.percentiles.delayed15Share },
        { label: 'Mean departure delay', value: lax?.percentiles.meanDepDelay },
        { label: 'Mean taxi-out', value: lax?.percentiles.meanTaxiOut },
      ],
    });
    expect(r.caveatBadge).toBe('One month of domestic delays');
    expect(r.table?.columns.slice(0, 2)).toEqual([
      { key: 'iata', label: 'Code' },
      { key: 'name', label: 'Airport' },
    ]);
    expect(r.table?.keyColumns).toEqual([
      'iata',
      'name',
      'congestionIndex',
      'delayed15SharePct',
      'meanDepDelayPct',
      'meanTaxiOutPct',
    ]);
    const keys = r.table?.columns.map((c) => c.key) ?? [];
    for (const k of r.table?.keyColumns ?? []) expect(keys).toContain(k);
  });

  it('drops the runner-up clause when only one airport has an index', () => {
    const r = compareCongestion(ctx, { airports: ['BUR', 'LAX'] });
    if (!r.ok) throw new Error(r.error.message);
    expect(r.headline?.context).toBe('Most congested of 1, 1 without data');
    expect(r.notes).toEqual([
      'BUR: no on-time data: no US reporting carrier operates there.',
      'LAX is the most congested by congestion index.',
    ]);
  });

  it('explains the gap between the two most congested in component points', () => {
    const r = compareCongestion(ctx, { airports: ['ONT', 'LAX'] });
    if (!r.ok) throw new Error(r.error.message);
    const lax = ctx.kpis.get('LAX');
    const ont = ctx.kpis.get('ONT');
    if (!lax || !ont) throw new Error('fixture');
    const r1 = (n: number | null) => Math.round((n ?? 0) * 10) / 10;
    const signed = (n: number) =>
      `${Math.round(n * 10) < 0 ? '−' : '+'}${Math.abs(n).toFixed(1)}`;
    const part = (k: keyof typeof lax.percentiles) =>
      ((lax.percentiles[k] ?? 0) - (ont.percentiles[k] ?? 0)) / 3;
    const parts: [string, number][] = [
      ['delayed 15+ min share', part('delayed15Share')],
      ['mean departure delay', part('meanDepDelay')],
      ['mean taxi-out', part('meanTaxiOut')],
    ];
    parts.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    expect(r.notes).toEqual([
      'LAX is the most congested by congestion index.',
      `LAX's congestion index is ${(r1(lax.congestionIndex) - r1(ont.congestionIndex)).toFixed(1)} points above ONT's: ${parts.map(([l, v]) => `${l} ${signed(v)}`).join(', ')}.`,
    ]);
  });

  it('names the tie-break when the two most congested have the same index', () => {
    const s = snapshot([airport('SNA'), airport('LAX')]);
    const r = compareCongestion(
      { snapshot: s, kpis: buildNationalKpis(s) },
      { airports: ['SNA', 'LAX'] },
    );
    if (!r.ok) throw new Error(r.error.message);
    expect(r.notes?.[1]).toMatch(
      /^LAX and SNA have the same congestion index \(\d+\.\d\); LAX is listed first by airport code: /,
    );
  });

  it('counts only airports with an index and omits "without data" when all have one', () => {
    const r = compareCongestion(ctx, { airports: ['LAX', 'ONT'] });
    if (!r.ok) throw new Error(r.error.message);
    expect(r.headline?.context).toMatch(
      /^Most congested of 2; \d+\.\d points above ONT \(\d+\.\d\)$/,
    );
  });

  it('has no headline when no airport has an index', () => {
    const s = snapshot([
      airport('BUR', { delays: null }),
      airport('LGB', { delays: null }),
    ]);
    const r = compareCongestion(
      { snapshot: s, kpis: buildNationalKpis(s) },
      { airports: ['BUR', 'LGB'] },
    );
    if (!r.ok) throw new Error(r.error.message);
    expect(r.headline).toBeUndefined();
  });

  it('shows cause shares and nulls when no cause minutes were reported', () => {
    const r = compareCongestion(ctx, { airports: ['LAX', 'ONT'] });
    if (!r.ok) throw new Error(r.error.message);
    const [lax, ont] = r.table?.rows ?? [];
    expect(lax).toMatchObject({
      carrier: 40,
      weather: 10,
      nas: 20,
      lateAircraft: 30,
      security: 0,
    });
    expect(ont).toMatchObject({
      carrier: null,
      nas: null,
      cancelRate: 2,
      flights: 100,
    });
  });

  it('resolves a region', () => {
    const r = compareCongestion(ctx, { region: 'LA basin' });
    if (!r.ok) throw new Error(r.error.message);
    expect(r.table?.rows).toHaveLength(4);
    expect(r.assumptions).toContain('LA basin = LAX, BUR, LGB, ONT and SNA.');
  });

  it('flags New England catchment airports and states the definition', () => {
    const r = compareCongestion(ctx, { region: 'New England' });
    if (!r.ok) throw new Error(r.error.message);
    const names = Object.fromEntries(
      (r.table?.rows ?? []).map((row) => [row.iata, row.name]),
    );
    expect(names).toEqual({
      BOS: 'BOS Airport',
      ALB: 'ALB Airport (New England catchment)',
    });
    expect(r.assumptions).toContain(
      'New England = airports in ME, NH, VT, MA, RI and CT, plus Albany (ALB) as a catchment airport.',
    );
  });

  it('rejects both or neither input, and names unknown codes', () => {
    expect(compareCongestion(ctx, {})).toMatchObject({
      ok: false,
      error: { kind: 'InvalidInput' },
    });
    expect(
      compareCongestion(ctx, { airports: ['LAX', 'SNA'], region: 'CA' }),
    ).toMatchObject({ ok: false, error: { kind: 'InvalidInput' } });
    expect(compareCongestion(ctx, { airports: ['LAX', 'XXX'] })).toMatchObject({
      ok: false,
      error: { kind: 'NotFound', message: expect.stringContaining('XXX') },
    });
    expect(compareCongestion(ctx, { region: 'TX' })).toMatchObject({
      ok: false,
      error: { kind: 'NotFound' },
    });
  });

  it('rejects fewer than 2 or more than 10 airports at the schema', () => {
    const schema = createCompareCongestionTool(ctx).inputSchema as {
      safeParse: (v: unknown) => { success: boolean };
    };
    expect(schema.safeParse({ airports: ['LAX'] }).success).toBe(false);
    expect(schema.safeParse({ airports: Array(11).fill('LAX') }).success).toBe(
      false,
    );
    expect(schema.safeParse({ airports: ['LAX', 'SNA'] }).success).toBe(true);
    // The national scope is for expansion rankings only.
    expect(schema.safeParse({ region: 'US' }).success).toBe(false);
  });
});
