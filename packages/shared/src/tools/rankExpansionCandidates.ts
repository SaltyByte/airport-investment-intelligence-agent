import { z } from 'zod';
import { AirportList, Region } from '../tool-inputs';

export const RankExpansionCandidatesInput = z
  .object({
    region: Region.optional(),
    airports: AirportList.optional().describe(
      '1-10 IATA codes to rank instead of a region.',
    ),
  })
  .refine((v) => (v.region === undefined) !== (v.airports === undefined), {
    message: 'Give exactly one of region or airports.',
  });
export type RankExpansionCandidatesInput = z.infer<
  typeof RankExpansionCandidatesInput
>;
