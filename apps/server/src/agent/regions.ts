import type { AppError, Region } from '@app/shared';
import { err, ok, type Result } from 'neverthrow';
import type { AirportKpis } from '../kpis/national';

// Glossary: New England is six states plus Albany as a catchment airport; the LA basin is five airports.
const NEW_ENGLAND = ['ME', 'NH', 'VT', 'MA', 'RI', 'CT'];
const NEW_ENGLAND_CATCHMENT = ['ALB'];
const LA_BASIN = ['LAX', 'BUR', 'LGB', 'ONT', 'SNA'];

export type RegionAirport = { iata: string; catchment: boolean };

/** Airports in the snapshot that make up a region; catchment airports are flagged. */
export const resolveRegion = (
  region: Region,
  kpis: Map<string, AirportKpis>,
): RegionAirport[] => {
  const all = [...kpis.values()];
  const core =
    region === 'LA basin'
      ? all.filter((a) => LA_BASIN.includes(a.iata))
      : all.filter((a) =>
          region === 'New England'
            ? NEW_ENGLAND.includes(a.state)
            : a.state === region,
        );
  const catchment =
    region === 'New England'
      ? all.filter((a) => NEW_ENGLAND_CATCHMENT.includes(a.iata))
      : [];
  return [
    ...core.map((a) => ({ iata: a.iata, catchment: false })),
    ...catchment.map((a) => ({ iata: a.iata, catchment: true })),
  ];
};

/** KPIs for the given codes in order; NotFound names every code missing from the snapshot. */
export const resolveAirports = (
  iatas: string[],
  kpis: Map<string, AirportKpis>,
): Result<AirportKpis[], AppError> => {
  const unknown = iatas.filter((iata) => !kpis.has(iata));
  return unknown.length > 0
    ? err({
        kind: 'NotFound',
        message: `No data for airport codes: ${unknown.join(', ')}.`,
      })
    : ok(iatas.map((iata) => kpis.get(iata) as AirportKpis));
};
