import type { ToolResult } from '@app/shared';
import { describe, expect, it } from 'vitest';
import { buildNationalKpis } from '../../kpis/airport-kpis';
import { airport, snapshot } from '../../test/fixtures';
import { createTools } from './index';

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
