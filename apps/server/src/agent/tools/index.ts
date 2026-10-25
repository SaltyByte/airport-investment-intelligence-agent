import type { ToolResult } from '@app/shared';
import type { Tool } from 'ai';
import type { AirportKpis } from '../../kpis/airport-kpis';
import type { Snapshot } from '../../snapshot/schema';
import { createCompareCongestionTool } from './compare-congestion';
import { createEstimateUnmetDemandTool } from './estimate-unmet-demand';
import { createGetLongHaulShareTool } from './get-long-haul-share';
import { createRankExpansionCandidatesTool } from './rank-expansion-candidates';
import { staleNotice } from './result';
import { suggestFollowUpsTool } from './suggest-follow-ups';

/** Data every tool reads; built once at server boot. */
export type ToolContext = {
  snapshot: Snapshot;
  kpis: Map<string, AirportKpis>;
};

/** Appends `notice` to the caveats of the tool's successful results; returns the tool unchanged when null. */
const withCaveat = <I>(
  t: Tool<I, ToolResult>,
  notice: string | null,
): Tool<I, ToolResult> => {
  const { execute } = t;
  if (!notice || !execute) return t;
  return {
    ...t,
    execute: async (input, options) => {
      // Data tools return a promise, never a stream.
      const r = (await execute(input, options)) as ToolResult;
      return r.ok ? { ...r, caveats: [...r.caveats, notice] } : r;
    },
  };
};

// Tool registry: every tool the agent may call is registered here, one line each.
export const createTools = (ctx: ToolContext, now = new Date()) => {
  const stale = staleNotice(ctx.snapshot.meta, now);
  return {
    getLongHaulShare: withCaveat(createGetLongHaulShareTool(ctx), stale),
    compareCongestion: withCaveat(createCompareCongestionTool(ctx), stale),
    rankExpansionCandidates: withCaveat(
      createRankExpansionCandidatesTool(ctx),
      stale,
    ),
    estimateUnmetDemand: withCaveat(createEstimateUnmetDemandTool(ctx), stale),
    suggestFollowUps: suggestFollowUpsTool,
  };
};
