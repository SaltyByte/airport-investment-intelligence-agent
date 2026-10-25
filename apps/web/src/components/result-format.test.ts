import { describe, expect, it } from 'vitest';
import { errorCopy, formatValue, ordinalPct } from './result-format';

describe('formatValue', () => {
  it.each([
    [1234567, 'count', '1,234,567', '1,234,567'],
    [98765.4, 'seats', '98,765', '98,765 seats'],
    [12.345, 'percent', '12.3%', '12.3 percent'],
    [14.06, 'minutes', '14.1 min', '14.1 minutes'],
    [3012.6, 'miles', '3,013 mi', '3,013 miles'],
    [87.25, 'score', '87.3', '87.3'],
    [50, 'percentile', '50.0', '50.0'],
  ] as const)('%s %s → %s', (value, unit, text, spoken) => {
    expect(formatValue(value, unit)).toEqual({ text, spoken });
  });

  it('shows null as a dash read as "not available"', () => {
    expect(formatValue(null, 'percent')).toEqual({
      text: '—',
      spoken: 'not available',
    });
  });

  it('passes strings through and groups unitless numbers', () => {
    expect(formatValue('Boston Logan', undefined)).toEqual({
      text: 'Boston Logan',
      spoken: 'Boston Logan',
    });
    expect(formatValue(4200, undefined).text).toBe('4,200');
  });
});

describe('ordinalPct', () => {
  it.each([
    [1, '1st pct'],
    [2.4, '2nd pct'],
    [3, '3rd pct'],
    [11, '11th pct'],
    [12.2, '12th pct'],
    [13, '13th pct'],
    [21, '21st pct'],
    [87.6, '88th pct'],
    [100, '100th pct'],
  ])('%s → %s', (p, out) => {
    expect(ordinalPct(p)).toBe(out);
  });
});

describe('errorCopy', () => {
  it('maps every error kind to plain words without the code', () => {
    for (const kind of [
      'RateLimited',
      'UpstreamUnavailable',
      'NotFound',
      'InvalidInput',
    ] as const) {
      const copy = errorCopy(kind);
      expect(copy).not.toContain(kind);
      expect(copy.length).toBeGreaterThan(10);
    }
  });
});
