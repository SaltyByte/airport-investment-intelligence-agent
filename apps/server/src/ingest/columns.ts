// Row helpers shared by the source parsers: CSV columns, numbers and BTS airport codes.

export type Row = Record<string, string>;

export const num = (value: string | undefined): number => Number(value || 0);

/** Throws naming the source and every required column the header lacks. */
export const requireColumns = (
  source: string,
  header: string[],
  required: Iterable<string>,
): void => {
  const present = new Set(header);
  const missing = [...required].filter((c) => !present.has(c));
  if (missing.length > 0)
    throw new Error(`${source}: missing columns ${missing.join(', ')}`);
};

// shortcut: hand-maintained code aliases, replace with a BTS airport-ID join if more appear.
// BTS still reports these airports under their old/FAA codes; values are the peer-set IATA.
const BTS_CODE_ALIASES: Record<string, string> = {
  PBI: 'DJT', // West Palm Beach, renamed 2025
  '1G4': 'GCW', // Grand Canyon West: BTS uses the FAA id
};

/** Peer-set IATA for a BTS airport code (shared by both BTS sources). */
export const btsCode = (code: string): string => BTS_CODE_ALIASES[code] ?? code;
