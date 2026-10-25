// OurAirports airports.csv: coordinates, names and IATA codes for the FAA peer set.
import { readFile } from 'node:fs/promises';
import { parse as parseCsv } from 'csv-parse/sync';
import type { Row } from '../columns';
import { cached } from '../download';

export const OUR_AIRPORTS_URL =
  'https://davidmegginson.github.io/ourairports-data/airports.csv';

/** Downloads (cached) and parses OurAirports airports.csv. */
export const loadOurAirports = async (): Promise<Row[]> => {
  const path = await cached('ourairports-airports.csv', () =>
    fetch(OUR_AIRPORTS_URL, { signal: AbortSignal.timeout(300_000) }),
  );
  return parseCsv(await readFile(path), { columns: true }) as Record<
    string,
    string
  >[];
};
