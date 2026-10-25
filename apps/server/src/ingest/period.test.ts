import { describe, expect, it } from 'vitest';
import { selectPeriod } from './period';

describe('selectPeriod', () => {
  it('ends at the latest month both sources cover and spans 12 months', () => {
    expect(selectPeriod('2026-07', '2026-08')).toEqual({
      start: '2025-08',
      end: '2026-07',
      months: [
        '2025-08',
        '2025-09',
        '2025-10',
        '2025-11',
        '2025-12',
        '2026-01',
        '2026-02',
        '2026-03',
        '2026-04',
        '2026-05',
        '2026-06',
        '2026-07',
      ],
    });
  });

  it('uses the T-100 month when on-time lags', () => {
    expect(selectPeriod('2026-03', '2026-01')).toMatchObject({
      start: '2025-02',
      end: '2026-01',
    });
  });
});
