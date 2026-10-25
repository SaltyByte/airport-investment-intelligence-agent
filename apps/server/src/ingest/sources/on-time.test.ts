import { describe, expect, it } from 'vitest';
import { csv } from '../../test/ingest-fixtures';
import { aggregateOnTime } from './on-time';

describe('aggregateOnTime', () => {
  it('sums delays per origin with blank causes and cancelled flights', async () => {
    const rows =
      csv(`Origin,Cancelled,DepDelayMinutes,DepDel15,TaxiOut,CarrierDelay,WeatherDelay,NASDelay,SecurityDelay,LateAircraftDelay
SFO,0.00,0.00,0.00,20.00,,,,,
SFO,0.00,45.00,1.00,30.00,10.00,0.00,20.00,0.00,15.00
SFO,1.00,,,,,,,,
LAX,0.00,16.00,1.00,18.00,0.00,16.00,0.00,1.00,0.00`);
    const delays = await aggregateOnTime(rows);
    expect(delays.get('SFO')).toEqual({
      flights: 3,
      cancelled: 1,
      depDelayCount: 2,
      depDelayed15: 1,
      depDelayMinutes: 45,
      taxiOutMinutes: 50,
      taxiOutCount: 2,
      causeMinutes: {
        carrier: 10,
        weather: 0,
        nas: 20,
        security: 0,
        lateAircraft: 15,
      },
    });
    expect(delays.get('LAX')).toMatchObject({
      flights: 1,
      causeMinutes: { weather: 16, security: 1 },
    });
  });
});

describe('BTS code aliases', () => {
  it('maps historical BTS codes for on-time origins', async () => {
    const delays = await aggregateOnTime(
      csv('Origin,Cancelled\nPBI,0.00\nDJT,1.00'),
    );
    expect(delays.get('DJT')).toMatchObject({ flights: 2, cancelled: 1 });
    expect(delays.has('PBI')).toBe(false);
  });
});
