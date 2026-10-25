import type { Airport, AppError } from '@app/shared';
import { err, ok, type Result } from 'neverthrow';

// Placeholder data until real sources land; values are not authoritative.
const AIRPORTS: Record<string, Airport> = {
  SFO: {
    iata: 'SFO',
    name: 'San Francisco International Airport',
    city: 'San Francisco',
    state: 'CA',
  },
  LAX: {
    iata: 'LAX',
    name: 'Los Angeles International Airport',
    city: 'Los Angeles',
    state: 'CA',
  },
  SNA: {
    iata: 'SNA',
    name: 'John Wayne Airport',
    city: 'Santa Ana',
    state: 'CA',
  },
  ANC: {
    iata: 'ANC',
    name: 'Ted Stevens Anchorage International Airport',
    city: 'Anchorage',
    state: 'AK',
  },
  BOS: {
    iata: 'BOS',
    name: 'Boston Logan International Airport',
    city: 'Boston',
    state: 'MA',
  },
};

export type SourcedAirport = { airport: Airport; source: string; asOf: string };

export const findAirport = (iata: string): Result<SourcedAirport, AppError> => {
  const airport = AIRPORTS[iata];
  return airport
    ? ok({
        airport,
        source: 'static fixture (placeholder)',
        asOf: '2026-10-25',
      })
    : err({ kind: 'NotFound', message: `No data for airport ${iata}` });
};
