import { describe, expect, it } from 'vitest';
import { requireColumns } from './columns';

describe('requireColumns', () => {
  it('passes when every required column is present', () => {
    expect(() =>
      requireColumns('BTS T-100', ['A', 'B', 'C'], ['A', 'C']),
    ).not.toThrow();
  });

  it('throws naming the source and every missing column', () => {
    expect(() =>
      requireColumns(
        'BTS On-Time PREZIP',
        ['Origin'],
        ['Origin', 'TaxiOut', 'DepDel15'],
      ),
    ).toThrow('BTS On-Time PREZIP: missing columns TaxiOut, DepDel15');
  });
});
