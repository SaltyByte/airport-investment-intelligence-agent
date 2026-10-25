import { GetAirportOutput } from '@app/shared';
import { describe, expect, it } from 'vitest';
import { getAirportOutput } from './tools';

describe('getAirportOutput', () => {
  it('returns ok:true with the airport for a fixture code', () => {
    const output = getAirportOutput({ iata: 'LAX' });
    expect(GetAirportOutput.parse(output)).toEqual(output);
    expect(output).toMatchObject({ ok: true, airport: { iata: 'LAX' } });
  });

  it('returns the structured ok:false shape to the model for an Err', () => {
    const output = getAirportOutput({ iata: 'ZZZ' });
    expect(GetAirportOutput.parse(output)).toEqual(output);
    expect(output).toEqual({
      ok: false,
      error: { kind: 'NotFound', message: expect.stringContaining('ZZZ') },
    });
  });
});
