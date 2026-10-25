import type { Snapshot } from '../ingest/snapshot-schema';
import type { AirportKpis } from '../kpis/national';
import { compareCongestionTool } from './tools/compareCongestion';
import { estimateUnmetDemandTool } from './tools/estimateUnmetDemand';
import { getLongHaulShare } from './tools/getLongHaulShare';
import { rankExpansionCandidates } from './tools/rankExpansionCandidates';

/** Data every tool reads; built once at server boot. */
export type ToolContext = {
  snapshot: Snapshot;
  kpis: Map<string, AirportKpis>;
};

// Tool registry: every tool the agent may call is registered here, one line each.
export const createTools = (ctx: ToolContext) => ({
  getLongHaulShare: getLongHaulShare(ctx.snapshot, ctx.kpis),
  compareCongestion: compareCongestionTool(ctx),
  rankExpansionCandidates: rankExpansionCandidates(ctx),
  estimateUnmetDemand: estimateUnmetDemandTool(ctx),
});
