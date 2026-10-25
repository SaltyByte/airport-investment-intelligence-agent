import { z } from 'zod';
import { Iata } from '../tool-inputs';

export const EstimateUnmetDemandInput = z.object({ iata: Iata });
export type EstimateUnmetDemandInput = z.infer<typeof EstimateUnmetDemandInput>;
