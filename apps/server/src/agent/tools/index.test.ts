import type { ToolResult } from '@app/shared';
import { describe, expect, it } from 'vitest';
import { buildNationalKpis } from '../../kpis/airport-kpis';
import { airport, snapshot } from '../../test/fixtures';
import { createTools } from './index';
import { staleNotice } from './result';

const STALE = new Date('2027-02-01T00:00:00Z');

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

  it('adds the stale-data caveat to every data tool result only when the snapshot is stale', async () => {
    const snap = {
      ...snapshot([airport('SFO'), airport('OAK')]),
      routes: [
        {
          origin: 'SFO',
          dest: 'OAK',
          month: '2026-07',
          classGroup: 'passenger' as const,
          departures: 10,
          seats: 1000,
          passengers: 900,
          distance: 300,
        },
      ],
    };
    const ctx = { snapshot: snap, kpis: buildNationalKpis(snap) };
    const notice = staleNotice(snap.meta, STALE);
    const options = { toolCallId: '1', messages: [], context: {} };
    const run = async (now: Date) => {
      const tools = createTools(ctx, now);
      return (await Promise.all([
        tools.getLongHaulShare.execute?.({ iata: 'SFO' }, options),
        tools.compareCongestion.execute?.(
          { airports: ['SFO', 'OAK'] },
          options,
        ),
        tools.rankExpansionCandidates.execute?.(
          { airports: ['SFO', 'OAK'] },
          options,
        ),
        tools.estimateUnmetDemand.execute?.({ iata: 'SFO' }, options),
      ])) as ToolResult[];
    };
    expect(notice).not.toBeNull();
    for (const r of await run(STALE)) {
      if (!r.ok) throw new Error(r.error.message);
      expect(r.caveats.at(-1)).toBe(notice);
    }
    for (const r of await run(new Date('2026-10-25T00:00:00Z'))) {
      if (!r.ok) throw new Error(r.error.message);
      expect(r.caveats).not.toContain(notice);
    }
  });
});
