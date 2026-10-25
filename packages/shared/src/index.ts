import type { UIDataTypes, UIMessage } from 'ai';
import type { ToolResult } from './tool-result';
import type { CompareCongestionInput } from './tools/compareCongestion';
import type { EstimateUnmetDemandInput } from './tools/estimateUnmetDemand';
import type { GetLongHaulShareInput } from './tools/getLongHaulShare';
import type { RankExpansionCandidatesInput } from './tools/rankExpansionCandidates';
import type { SuggestFollowUpsInput } from './tools/suggestFollowUps';

export * from './tool-inputs';
export * from './tool-result';
export * from './tools/compareCongestion';
export * from './tools/estimateUnmetDemand';
export * from './tools/getLongHaulShare';
export * from './tools/rankExpansionCandidates';
export * from './tools/suggestFollowUps';

export type AppUIMessage = UIMessage<
  unknown,
  UIDataTypes,
  {
    rankExpansionCandidates: {
      input: RankExpansionCandidatesInput;
      output: ToolResult;
    };
    getLongHaulShare: { input: GetLongHaulShareInput; output: ToolResult };
    compareCongestion: { input: CompareCongestionInput; output: ToolResult };
    estimateUnmetDemand: {
      input: EstimateUnmetDemandInput;
      output: ToolResult;
    };
    suggestFollowUps: {
      input: SuggestFollowUpsInput;
      output: SuggestFollowUpsInput;
    };
  }
>;
