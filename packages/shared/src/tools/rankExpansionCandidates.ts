import { z } from 'zod';
import { AirportList, Region } from '../tool-inputs';

// 'US' ranks every airport; only rankings take it (a national congestion table is not useful).
const RankRegion = z.enum([...Region.options, 'US']);

export const RankExpansionCandidatesInput = z
  .object({
    region: RankRegion.optional().describe(
      "Region whose airports to rank, or 'US' for every US airport; omit when airports is given.",
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
