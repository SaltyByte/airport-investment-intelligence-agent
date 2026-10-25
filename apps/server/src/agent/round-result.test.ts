import type { ToolResult } from '@app/shared';
import { describe, expect, it } from 'vitest';
import { buildNationalKpis } from '../kpis/national';
import { airport, snapshot } from '../test-fixture';
import { roundResult } from './round-result';
import { createTools } from './tools';

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
          value: 0.7965371872920992,
          unit: 'ratio',
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
      0.797,
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
          { key: 'lf', label: 'LF', unit: 'ratio' },
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

describe('createTools', () => {
  it('returns rounded results from tool execution', async () => {
    const snap = snapshot([
      airport('SFO'),
      airport('OAK', { enplanements: 1234 }),
    ]);
    const tools = createTools({
      snapshot: snap,
      kpis: buildNationalKpis(snap),
    });
    const r = (await tools.compareCongestion.execute?.(
      { airports: ['SFO', 'OAK'] },
      { toolCallId: '1', messages: [], context: {} },
    )) as ToolResult;
    if (!r.ok) throw new Error(r.error.message);
    // Fixture delayed-15 share is 20/98 = 20.408...%.
    expect(r.table?.rows[0]?.delayed15Share).toBe(20.4);
  });
});
