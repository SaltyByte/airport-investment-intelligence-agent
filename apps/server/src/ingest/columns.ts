export type Row = Record<string, string>;

export const num = (value: string | undefined): number => Number(value || 0);

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

const BTS_CODE_ALIASES: Record<string, string> = {
  PBI: 'DJT',
  '1G4': 'GCW',
};

export const btsCode = (code: string): string => BTS_CODE_ALIASES[code] ?? code;
