import { GetAirportInput, type GetAirportOutput } from '@app/shared';
import { tool } from 'ai';
import { findAirport } from '../data-sources/airport-fixture';

// Err becomes ok:false output so the model states the gap instead of failing the stream.
export const getAirportOutput = ({ iata }: GetAirportInput): GetAirportOutput =>
  findAirport(iata).match<GetAirportOutput>(
    (found) => ({ ok: true, ...found }),
    (error) => ({ ok: false, error }),
  );

export const tools = {
  getAirport: tool({
    description:
      'Look up a US airport by IATA code. Returns name, city and state with source and as-of date, or ok:false when data is unavailable.',
    inputSchema: GetAirportInput,
    execute: async (input) => getAirportOutput(input),
  }),
};
