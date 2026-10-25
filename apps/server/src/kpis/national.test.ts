import { describe, expect, it } from 'vitest';
import { airport, delays, snapshot } from '../test-fixture';
import { buildNationalKpis } from './national';

describe('buildNationalKpis', () => {
  const kpis = buildNationalKpis(
    snapshot([
      airport('AAA'),
      airport('BBB', {
        enplanements: 1500,
        traffic: {
          passenger: { departures: 10, seats: 1000, passengers: 900 },
          cargo: { departures: 0, seats: 0, passengers: 0 },
        },
        delays: delays({ depDelayed15: 49, taxiOutMinutes: 1960 }),
      }),
      airport('NUL', {
        priorEnplanements: 0,
        traffic: null,
        delays: null,
      }),
    ]),
  );

  it('derives raw KPIs from the snapshot sums', () => {
    expect(kpis.get('AAA')).toMatchObject({
      name: 'AAA Airport',
      city: 'AAA City',
      state: 'CA',
      hub: 'M',
      passengers: 800,
      seats: 1000,
      loadFactor: 0.8,
      growth: 10,
      flights: 100,
      delayed15Share: (20 / 98) * 100,
      meanDepDelay: 10,
      meanTaxiOut: 15,
      cancelRate: 2,
      causeShares: {
        carrier: 40,
        weather: 10,
        nas: 20,
        security: 0,
        lateAircraft: 30,
      },
    });
  });

  it('ranks percentiles nationally and scores expansion', () => {
    const bbb = kpis.get('BBB');
    expect(bbb?.percentiles).toEqual({
      loadFactor: 75,
      passengers: 75,
      growth: 75,
      delayed15Share: 75,
      meanDepDelay: 50,
      meanTaxiOut: 75,
    });
    expect(bbb?.congestionIndex).toBe(66.7);
    expect(bbb?.expansion).toEqual({
      score: 73.4,
      growth: 75,
      pressure: 70.9,
      scale: 75,
      missing: [],
    });
  });

  it('keeps missing data null and names it in expansion.missing', () => {
    const nul = kpis.get('NUL');
    expect(nul).toMatchObject({
      passengers: null,
      seats: null,
      loadFactor: null,
      growth: null,
      flights: null,
      delayed15Share: null,
      causeShares: null,
      congestionIndex: null,
    });
    expect(nul?.percentiles.growth).toBeNull();
    expect(nul?.expansion.score).toBeNull();
    expect(nul?.expansion.missing).toEqual([
      'growthPct',
      'loadFactorPct',
      'congestionIdx',
      'scalePct',
    ]);
  });

  it('nulls cause shares when there are no cause minutes', () => {
    const none = {
      carrier: 0,
      weather: 0,
      nas: 0,
      security: 0,
      lateAircraft: 0,
    };
    const k = buildNationalKpis(
      snapshot([airport('AAA', { delays: delays({ causeMinutes: none }) })]),
    );
    expect(k.get('AAA')?.causeShares).toBeNull();
  });
});
