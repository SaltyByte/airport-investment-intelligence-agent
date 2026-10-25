import { describe, expect, it } from 'vitest';
import { csv } from '../../test/ingest-fixtures';
import { aggregateT100 } from './t100';

describe('aggregateT100', () => {
  const rows =
    csv(`YEAR,MONTH,ORIGIN,DEST,CLASS,DEPARTURES_PERFORMED,SEATS,PASSENGERS,DISTANCE
2026,7,ANC,SEA,F,10.00,1800.00,1500.00,1448.00
2026,7,ANC,SEA,L,2.00,200.00,150.00,1448.00
2026,7,ANC,SIN,G,4.00,0.00,0.00,6665.00
2026,7,ANC,ORD,P,1.00,0.00,0.00,2846.00
2026,7,ANC,SEA,F,3.00,0.00,0.00,1448.00
2026,7,CVG,CVG,P,0.00,0.00,0.00,0.00
2026,6,ANC,SEA,F,5.00,900.00,800.00,1448.00
2025,7,ANC,SEA,F,99.00,9900.00,9000.00,1448.00`);
  const months = ['2026-06', '2026-07'];

  it('groups F+L as passenger and G+P as cargo per route and month, dropping all-zero and out-of-period rows', () => {
    const { routes } = aggregateT100(rows, months);
    expect(routes).toEqual([
      {
        origin: 'ANC',
        dest: 'SEA',
        month: '2026-07',
        classGroup: 'passenger',
        departures: 15,
        seats: 2000,
        passengers: 1650,
        distance: 1448,
      },
      {
        origin: 'ANC',
        dest: 'SIN',
        month: '2026-07',
        classGroup: 'cargo',
        departures: 4,
        seats: 0,
        passengers: 0,
        distance: 6665,
      },
      {
        origin: 'ANC',
        dest: 'ORD',
        month: '2026-07',
        classGroup: 'cargo',
        departures: 1,
        seats: 0,
        passengers: 0,
        distance: 2846,
      },
      {
        origin: 'ANC',
        dest: 'SEA',
        month: '2026-06',
        classGroup: 'passenger',
        departures: 5,
        seats: 900,
        passengers: 800,
        distance: 1448,
      },
    ]);
  });

  it('sums per-airport traffic by class group over the period, keeping zero-seat departures', () => {
    const { traffic } = aggregateT100(rows, months);
    expect(traffic.get('ANC')).toEqual({
      passenger: { departures: 20, seats: 2900, passengers: 2450 },
      cargo: { departures: 5, seats: 0, passengers: 0 },
    });
    expect(traffic.has('CVG')).toBe(false);
  });

  it('rejects an unknown service class', () => {
    expect(() =>
      aggregateT100(
        csv(
          'YEAR,MONTH,ORIGIN,DEST,CLASS,DEPARTURES_PERFORMED,SEATS,PASSENGERS,DISTANCE\n2026,7,ANC,SEA,Z,1,1,1,1',
        ),
        months,
      ),
    ).toThrow(/class "Z"/);
  });
});

describe('BTS code aliases', () => {
  it('maps historical BTS codes to the peer IATA for T-100 origin and dest', () => {
    const { routes, traffic } = aggregateT100(
      csv(`YEAR,MONTH,ORIGIN,DEST,CLASS,DEPARTURES_PERFORMED,SEATS,PASSENGERS,DISTANCE
2026,7,PBI,1G4,F,2,100,80,2000
2026,7,LAX,PBI,F,1,50,40,2330`),
      ['2026-07'],
    );
    expect(routes.map((r) => `${r.origin}-${r.dest}`)).toEqual([
      'DJT-GCW',
      'LAX-DJT',
    ]);
    expect(traffic.has('DJT')).toBe(true);
    expect(traffic.has('PBI')).toBe(false);
  });
});
