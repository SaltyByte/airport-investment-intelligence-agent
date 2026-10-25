import type { UIDataTypes, UIMessage } from 'ai';
import type { ToolResult } from './tool-result';
import type { CompareCongestionInput } from './tools/compareCongestion';
import type { EstimateUnmetDemandInput } from './tools/estimateUnmetDemand';
import type { GetLongHaulShareInput } from './tools/getLongHaulShare';
import type { RankExpansionCandidatesInput } from './tools/rankExpansionCandidates';

// AppError is defined in tool-result.ts: importing it back from this file would be an ESM cycle.
export * from './tool-inputs';
export * from './tool-result';
export * from './tools/compareCongestion';
export * from './tools/estimateUnmetDemand';
export * from './tools/getLongHaulShare';
export * from './tools/rankExpansionCandidates';

export type AppUIMessage = UIMessage<
  unknown,
  UIDataTypes,
  // Tool entries are added here as tools land.
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
  }
>;
