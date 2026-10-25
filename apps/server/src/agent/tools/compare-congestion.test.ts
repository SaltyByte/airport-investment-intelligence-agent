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
  });
});
