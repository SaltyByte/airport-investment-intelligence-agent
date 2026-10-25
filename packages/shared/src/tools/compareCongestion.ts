import { z } from 'zod';
import { AirportList, Region } from '../tool-inputs';

// Exactly one of airports/region is checked in the tool, so the model gets an InvalidInput result it can read.
export const CompareCongestionInput = z.object({
  airports: AirportList.min(2)
    .optional()
    .describe('2-10 airport codes to compare; omit when region is given.'),
  region: Region.optional().describe(
    'Region whose airports to compare; omit when airports is given.',
  ),
});
export type CompareCongestionInput = z.infer<typeof CompareCongestionInput>;
