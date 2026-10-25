import { describe, expect, it } from 'vitest';
import { snapshot } from '../test-fixture';
import { snapshotFooter } from './footer';

describe('snapshotFooter', () => {
  it("names each used source's own period in plain words", () => {
    expect(
      snapshotFooter(snapshot([]), ['traffic', 'delays', 'growth']),
    ).toEqual({
      source:
        'BTS T-100 Segment; BTS On-Time Reporting Carrier; FAA enplanements',
      period:
        'Traffic Aug 2025–Jul 2026; delays Jul 2026; growth CY2025 vs CY2024',
      generatedAt: '2026-10-25T10:00:00.000Z',
    });
  });

  it('lists only the sources a tool uses', () => {
    expect(snapshotFooter(snapshot([]), ['delays'])).toMatchObject({
      source: 'BTS On-Time Reporting Carrier',
      period: 'Delays Jul 2026',
    });
    expect(snapshotFooter(snapshot([]), ['traffic'])).toMatchObject({
      source: 'BTS T-100 Segment',
      period: 'Traffic Aug 2025–Jul 2026',
    });
  });
});
