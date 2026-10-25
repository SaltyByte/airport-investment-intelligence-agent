import { z } from 'zod';
import { AirportList, Region } from '../tool-inputs';

export const RankExpansionCandidatesInput = z
  .object({
    region: Region.optional().describe(
      'Region whose airports to rank; omit when airports is given.',
    ),
    airports: AirportList.optional().describe(
      '1-10 airport codes to rank; omit when region is given.',
    ),
  })
  .refine((v) => (v.region === undefined) !== (v.airports === undefined), {
    message: 'Give exactly one of region or airports.',
  });
export type RankExpansionCandidatesInput = z.infer<
  typeof RankExpansionCandidatesInput
>;
