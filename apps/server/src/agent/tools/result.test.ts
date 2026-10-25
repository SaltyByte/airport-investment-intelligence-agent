import { ToolResult } from '@app/shared';
import { describe, expect, it } from 'vitest';
import { snapshot } from '../../test/fixtures';
import { gapNote, roundResult, snapshotFooter } from './result';

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

describe('gapNote', () => {
  const lead = (points: string) => `BGR leads BOS by ${points} points`;

  it('lists signed parts largest first to 1 decimal', () => {
    expect(
      gapNote(12.9, lead, 'tied', [
        ['Growth', 19.2],
        ['Pressure', -1.16],
        ['Scale', -5.14],
      ]),
    ).toBe(
      'BGR leads BOS by 12.9 points: Growth +19.2, Scale −5.1, Pressure −1.2.',
    );
  });

  it('signs by the displayed value, so tiny negatives show as +0.0', () => {
    expect(
      gapNote(0.1, lead, 'tied', [
        ['A', 0.14],
        ['B', -0.04],
      ]),
    ).toBe('BGR leads BOS by 0.1 points: A +0.1, B +0.0.');
  });

  it('uses the tie wording when the gap shows as 0.0', () => {
    expect(
      gapNote(
        0.0001,
        lead,
        'BGR and BOS are tied at 50.0; BGR ranks first on Scale',
        [
          ['Scale', 2],
          ['Growth', -2],
        ],
      ),
    ).toBe(
      'BGR and BOS are tied at 50.0; BGR ranks first on Scale: Scale +2.0, Growth −2.0.',
    );
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

  it('keeps the new answer fields, rounds the headline and parses as a ToolResult', () => {
    const r = roundResult({
      ok: true,
      title: 't',
      headline: {
        iata: 'BGR',
        name: 'Bangor International Airport',
        label: 'Expansion score',
        value: 80.2666,
        unit: 'score',
        context: 'Ranked 1 of 14, 10 not ranked',
        drivers: [
          { label: 'Growth', value: 83.04 },
          { label: 'Pressure', value: null },
        ],
      },
      metrics: [
        { label: 'Seat gap', value: 12.6, unit: 'seats', estimate: true },
      ],
      table: {
        columns: [
          { key: 'iata', label: 'Code' },
          { key: 'gap', label: 'Seats short', unit: 'seats', estimate: true },
        ],
        rows: [{ iata: 'SFO', gap: 1.4 }],
        keyColumns: ['iata', 'gap'],
      },
      caveatBadge: 'Profitability proxy, not ROI',
      ...footer,
    });
    expect(ToolResult.parse(r)).toEqual(r);
    if (!r.ok) throw new Error('expected ok');
    expect(r.headline).toMatchObject({
      value: 80.3,
      drivers: [
        { label: 'Growth', value: 83 },
        { label: 'Pressure', value: null },
      ],
    });
    expect(r.metrics[0]).toEqual({
      label: 'Seat gap',
      value: 13,
      unit: 'seats',
      estimate: true,
    });
    expect(r.table?.keyColumns).toEqual(['iata', 'gap']);
    expect(r.caveatBadge).toBe('Profitability proxy, not ROI');
  });

  it('passes errors through', () => {
    const e: ToolResult = {
      ok: false,
      error: { kind: 'NotFound', message: 'x' },
    };
    expect(roundResult(e)).toBe(e);
  });
});
