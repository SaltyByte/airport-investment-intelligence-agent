import type { AirportKpis } from '../../kpis/airport-kpis';
import type { Snapshot } from '../../snapshot/schema';
import { createCompareCongestionTool } from './compare-congestion';
import { createEstimateUnmetDemandTool } from './estimate-unmet-demand';
import { createGetLongHaulShareTool } from './get-long-haul-share';
import { createRankExpansionCandidatesTool } from './rank-expansion-candidates';
import { suggestFollowUpsTool } from './suggest-follow-ups';

/** Data every tool reads; built once at server boot. */
export type ToolContext = {
  snapshot: Snapshot;
  kpis: Map<string, AirportKpis>;
};

// Tool registry: every tool the agent may call is registered here, one line each.
export const createTools = (ctx: ToolContext) => ({
  getLongHaulShare: createGetLongHaulShareTool(ctx),
  compareCongestion: createCompareCongestionTool(ctx),
  rankExpansionCandidates: createRankExpansionCandidatesTool(ctx),
  estimateUnmetDemand: createEstimateUnmetDemandTool(ctx),
  suggestFollowUps: suggestFollowUpsTool,
});
