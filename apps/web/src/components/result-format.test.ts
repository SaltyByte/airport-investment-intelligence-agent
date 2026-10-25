import type { ToolSuccess } from '@app/shared';
import { describe, expect, it } from 'vitest';
import { errorCopy, formatValue, ordinalPct, toSheet } from './result-format';

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
    [1, '1st percentile nationally'],
    [2.4, '2nd percentile nationally'],
    [3, '3rd percentile nationally'],
    [11, '11th percentile nationally'],
    [12.2, '12th percentile nationally'],
    [13, '13th percentile nationally'],
    [21, '21st percentile nationally'],
    [87.6, '88th percentile nationally'],
    [100, '100th percentile nationally'],
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

const base: ToolSuccess = {
  title: 'Terminal expansion candidates: New England',
  metrics: [],
  source: 'BTS T-100',
  period: 'Aug 2025–Jul 2026',
  generatedAt: '2026-10-25T00:00:00Z',
  assumptions: [],
  caveats: [],
};

const ranking: ToolSuccess = {
  ...base,
  table: {
    columns: [
      { key: 'iata', label: 'Code' },
      { key: 'airport', label: 'Airport' },
      { key: 'rank', label: 'Rank' },
      { key: 'score', label: 'Expansion score', unit: 'score' },
      { key: 'growthScore', label: 'Growth', unit: 'score' },
      { key: 'passengers', label: 'Passengers', unit: 'count' },
    ],
    rows: [
      {
        iata: 'BGR',
        airport: 'Bangor International Airport',
        rank: 1,
        score: 80.3,
        growthScore: 83,
        passengers: 476522,
      },
    ],
    keyColumns: ['rank', 'iata', 'airport', 'score', 'growthScore'],
  },
};

const keysOf = (cols: { key: string }[]) => cols.map((c) => c.key);

describe('toSheet', () => {
  it('shows key columns in keyColumns order by default, and all columns as key columns first then the rest', () => {
    const t = toSheet(ranking).table;
    expect(keysOf(t?.key ?? [])).toEqual([
      'rank',
      'iata',
      'score',
      'growthScore',
    ]);
    expect(keysOf(t?.all ?? [])).toEqual([
      'rank',
      'iata',
      'score',
      'growthScore',
      'passengers',
    ]);
    expect(t?.hasMore).toBe(true);
  });

  it('labels drivers as the matching table column does, else as a percentile', () => {
    const headline = {
      iata: 'LAX',
      name: 'Los Angeles International Airport',
      label: 'Congestion index',
      value: 57.6,
      unit: 'score' as const,
      context: 'Most congested of 2',
      drivers: [
        { label: 'Growth', value: 83 },
        { label: 'Mean taxi-out', value: 78.8 },
        { label: 'Scale', value: null },
      ],
    };
    const s = toSheet({
      ...base,
      headline,
      table: {
        columns: [
          { key: 'growthScore', label: 'Growth', unit: 'score' },
          { key: 'meanTaxiOut', label: 'Mean taxi-out', unit: 'minutes' },
          {
            key: 'meanTaxiOutPct',
            label: 'Mean taxi-out percentile',
            unit: 'percentile',
          },
        ],
        rows: [{ growthScore: 83, meanTaxiOut: 18.8, meanTaxiOutPct: 78.8 }],
      },
    });
    expect(s.headline?.drivers).toEqual([
      { label: 'Growth', value: 83 },
      { label: 'Mean taxi-out percentile', value: 78.8 },
      { label: 'Scale percentile', value: null },
    ]);
  });

  it('merges an iata column followed by a text column into one Airport cell', () => {
    expect(toSheet(ranking).table?.all[1]).toEqual({
      kind: 'airport',
      key: 'iata',
      label: 'Airport',
      nameKey: 'airport',
    });
  });

  it('keeps a lone iata column as a code cell and unitless numbers as values', () => {
    const t = toSheet({
      ...base,
      table: {
        columns: [
          { key: 'iata', label: 'Destination' },
          { key: 'rank', label: 'Rank' },
        ],
        rows: [{ iata: 'JFK', rank: 2 }],
      },
    }).table;
    expect(t?.all).toEqual([
      { kind: 'airport', key: 'iata', label: 'Destination' },
      {
        kind: 'value',
        key: 'rank',
        label: 'Rank',
        unit: undefined,
        estimate: false,
        numeric: true,
      },
    ]);
  });

  it('carries estimate flags on columns and the headline', () => {
    const s = toSheet({
      ...base,
      headline: {
        iata: 'SFO',
        name: 'San Francisco International Airport',
        label: 'Seat gap',
        value: 120000,
        unit: 'seats',
        estimate: true,
        context: '≈ 800 extra departures needed',
      },
      table: {
        columns: [
          { key: 'iata', label: 'Destination' },
          {
            key: 'seatsShort',
            label: 'Seats short',
            unit: 'seats',
            estimate: true,
          },
        ],
        rows: [{ iata: 'LAX', seatsShort: 4000 }],
      },
    });
    expect(s.headline).toMatchObject({ estimate: true, bar: false });
    expect(s.table?.all[1]).toMatchObject({
      key: 'seatsShort',
      estimate: true,
    });
  });

  it('draws a true-scale bar only for score, percentile and percent headlines', () => {
    const s = toSheet({
      ...base,
      headline: {
        iata: 'BGR',
        name: 'Bangor International Airport',
        label: 'Expansion score',
        value: 80.3,
        unit: 'score',
        context: 'Ranked 1 of 14, 10 not ranked',
      },
    });
    expect(s.headline).toMatchObject({ estimate: false, bar: true });
  });

  it('renders without headline, caveat badge or keyColumns, and without a table', () => {
    const { keyColumns: _, ...table } = ranking.table ?? {
      columns: [],
      rows: [],
    };
    const s = toSheet({ ...base, table });
    expect(s.headline).toBeNull();
    expect(s.caveatBadge).toBeNull();
    expect(s.table?.key).toEqual(s.table?.all);
    expect(s.table?.hasMore).toBe(false);
    expect(toSheet(base).table).toBeNull();
  });

  it('names the evidence tab Ranking when the table has a rank column, else Data', () => {
    expect(toSheet(ranking).tab).toBe('Ranking');
    expect(toSheet(base).tab).toBe('Data');
  });
});
