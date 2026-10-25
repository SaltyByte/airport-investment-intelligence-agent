import { describe, expect, it } from 'vitest';
import { buildNationalKpis } from '../kpis/national';
import { airport, snapshot } from '../test-fixture';
import { resolveAirports, resolveRegion } from './regions';

const kpis = buildNationalKpis(
  snapshot([
    airport('BOS', { state: 'MA' }),
    airport('PVD', { state: 'RI' }),
    airport('ALB', { state: 'NY' }),
    airport('JFK', { state: 'NY' }),
    airport('LAX'),
    airport('SNA'),
    airport('SFO'),
  ]),
);

describe('resolveRegion', () => {
  it('returns every airport in a state', () => {
    expect(resolveRegion('NY', kpis)).toEqual([
      { iata: 'ALB', catchment: false },
      { iata: 'JFK', catchment: false },
    ]);
  });

  it('adds ALB as catchment to the six New England states', () => {
    expect(resolveRegion('New England', kpis)).toEqual([
      { iata: 'BOS', catchment: false },
      { iata: 'PVD', catchment: false },
      { iata: 'ALB', catchment: true },
    ]);
  });

  it('maps the LA basin to its fixed airports present in the data', () => {
    expect(resolveRegion('LA basin', kpis)).toEqual([
      { iata: 'LAX', catchment: false },
      { iata: 'SNA', catchment: false },
    ]);
  });
});

describe('resolveAirports', () => {
  it('returns the KPIs of known airports in order', () => {
    const result = resolveAirports(['SFO', 'BOS'], kpis);
    expect(result._unsafeUnwrap().map((a) => a.iata)).toEqual(['SFO', 'BOS']);
  });

  it('names every unknown code in one NotFound error', () => {
    expect(
      resolveAirports(['SFO', 'XXX', 'YYY'], kpis)._unsafeUnwrapErr(),
    ).toEqual({
      kind: 'NotFound',
      message: 'No data for airport codes: XXX, YYY.',
    });
  });
});
