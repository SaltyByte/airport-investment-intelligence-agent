import { z } from 'zod';
import { Iata } from '../tool-inputs';

export const GetLongHaulShareInput = z.object({ iata: Iata });
export type GetLongHaulShareInput = z.infer<typeof GetLongHaulShareInput>;
