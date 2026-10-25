import { z } from 'zod';

export const Iata = z
  .string()
  .regex(/^[A-Z]{3}$/, 'Use a 3-letter uppercase IATA airport code, e.g. SFO.');

// biome-ignore format: rows of ten codes are easier to check
export const STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR',
] as const;

export const Region = z.enum([...STATE_CODES, 'New England', 'LA basin']);
export type Region = z.infer<typeof Region>;

export const AirportList = z.array(Iata).min(1).max(10);
