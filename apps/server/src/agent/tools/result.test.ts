import type { ToolResult } from '@app/shared';
import { describe, expect, it } from 'vitest';
import { snapshot } from '../../test/fixtures';
import { roundResult, snapshotFooter } from './result';

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

const footer = {
  source: 's',
  period: 'p',
  generatedAt: 'g',
  assumptions: [],
  caveats: [],
};

describe('roundResult', () => {
  it('rounds metric values and percentiles by unit like the result card', () => {
    const r = roundResult({
      ok: true,
      title: 't',
      metrics: [
        { label: 'a', value: 16.111311813332765, unit: 'percent' },
        {
          label: 'b',
          value: 79.6537,
          unit: 'percent',
          percentile: 92.66,
        },
        { label: 'c', value: 12.34, unit: 'minutes' },
        { label: 'd', value: 70.85, unit: 'score' },
        { label: 'e', value: 49.99, unit: 'percentile' },
        { label: 'f', value: 1234.6, unit: 'count' },
        { label: 'g', value: 99.5, unit: 'seats' },
        { label: 'h', value: 2999.4, unit: 'miles' },
        { label: 'i', value: null, unit: 'percent', percentile: null },
      ],
      ...footer,
    });
    if (!r.ok) throw new Error('expected ok');
    expect(r.metrics.map((m) => m.value)).toEqual([
      16.1,
      79.7,
      12.3,
      70.9,
      50,
      1235,
      100,
      2999,
      null,
    ]);
    expect(r.metrics[1]?.percentile).toBe(92.7);
    expect(r.metrics[8]?.percentile).toBeNull();
  });

  it('rounds numeric table cells by column unit and leaves the rest', () => {
    const r = roundResult({
      ok: true,
      title: 't',
      metrics: [],
      table: {
        columns: [
          { key: 'iata', label: 'Code' },
          { key: 'rank', label: 'Rank' },
          { key: 'share', label: 'Share', unit: 'percent' },
          { key: 'lf', label: 'LF', unit: 'percent' },
        ],
        rows: [{ iata: 'SFO', rank: 1, share: 23.914916850857804, lf: null }],
      },
      ...footer,
    });
    if (!r.ok) throw new Error('expected ok');
    expect(r.table?.rows).toEqual([
      { iata: 'SFO', rank: 1, share: 23.9, lf: null },
    ]);
  });

  it('passes errors through', () => {
    const e: ToolResult = {
      ok: false,
      error: { kind: 'NotFound', message: 'x' },
    };
    expect(roundResult(e)).toBe(e);
  });
});
