import { describe, expect, it } from 'vitest';
import { findAirport } from './airport-fixture';

describe('findAirport', () => {
  it('returns Ok with source and as-of date for a fixture code', () => {
    const found = findAirport('SFO')._unsafeUnwrap();
    expect(found.airport).toMatchObject({ iata: 'SFO', state: 'CA' });
    expect(found.source).toBe('static fixture (placeholder)');
    expect(found.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns Err(NotFound) for an unknown code', () => {
    expect(findAirport('XXX')._unsafeUnwrapErr()).toMatchObject({
      kind: 'NotFound',
    });
  });
});
