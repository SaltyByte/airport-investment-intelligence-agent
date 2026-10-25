import type {
  AppError,
  ToolHeadline,
  ToolSuccess,
  ToolUnit,
} from '@app/shared';

const fixed = (n: number, digits: number) =>
  n.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

// `text` is what the eye reads; `spoken` spells out abbreviated units for screen readers.
export function formatValue(
  value: string | number | null,
  unit: ToolUnit | undefined,
): { text: string; spoken: string } {
  if (value === null) return { text: '—', spoken: 'not available' };
  if (typeof value === 'string') return { text: value, spoken: value };
  switch (unit) {
    case 'seats':
      return { text: fixed(value, 0), spoken: `${fixed(value, 0)} seats` };
    case 'percent':
      return {
        text: `${fixed(value, 1)}%`,
        spoken: `${fixed(value, 1)} percent`,
      };
    case 'minutes':
      return {
        text: `${fixed(value, 1)} min`,
        spoken: `${fixed(value, 1)} minutes`,
      };
    case 'miles':
      return {
        text: `${fixed(value, 0)} mi`,
        spoken: `${fixed(value, 0)} miles`,
      };
    case 'score':
    case 'percentile':
      return same(fixed(value, 1));
    case 'count':
      return same(fixed(value, 0));
    default:
      return same(value.toLocaleString('en-US'));
  }
}

const same = (text: string) => ({ text, spoken: text });

export function ordinalPct(p: number) {
  const n = Math.round(p);
  const suffix =
    n % 100 >= 11 && n % 100 <= 13
      ? 'th'
      : (({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ??
        'th');
  return `${n}${suffix} percentile nationally`;
}

const ERROR_COPY: Record<AppError['kind'], string> = {
  RateLimited: 'The data service is busy right now. Try again in a minute.',
  UpstreamUnavailable:
    'The data source could not be reached. Try again shortly.',
  NotFound: 'No data was found for that airport or area.',
  InvalidInput:
    'That request could not be answered as asked. Try rephrasing the question.',
};

export const errorCopy = (kind: AppError['kind']) => ERROR_COPY[kind];

// Units that live on a fixed 0–100 scale, so a bar can be drawn to true length.
export const onScale = (unit: ToolUnit | undefined) =>
  unit === 'score' || unit === 'percentile' || unit === 'percent';

type Table = NonNullable<ToolSuccess['table']>;
export type SheetColumn =
  // `nameKey` set: the code sign and the airport name share one cell.
  | { kind: 'airport'; key: string; label: string; nameKey?: string }
  | {
      kind: 'value';
      key: string;
      label: string;
      unit: ToolUnit | undefined;
      estimate: boolean;
      numeric: boolean;
    };

function sheetColumns(cols: Table['columns'], rows: Table['rows']) {
  const isText = (key: string) =>
    rows.every((r) => r[key] == null || typeof r[key] === 'string');
  const out: SheetColumn[] = [];
  let merged: string | undefined;
  for (const [i, col] of cols.entries()) {
    if (col.key === merged) continue;
    const next = cols[i + 1];
    if (col.key === 'iata') {
      const merge = next && !next.unit && isText(next.key);
      merged = merge ? next.key : undefined;
      out.push(
        merge
          ? {
              kind: 'airport',
              key: col.key,
              label: 'Airport',
              nameKey: next.key,
            }
          : { kind: 'airport', key: col.key, label: col.label },
      );
      continue;
    }
    out.push({
      kind: 'value',
      key: col.key,
      label: col.label,
      unit: col.unit,
      estimate: col.estimate ?? false,
      numeric: col.unit !== undefined || !isText(col.key),
    });
  }
  return out;
}

export type Sheet = {
  headline: (ToolHeadline & { estimate: boolean; bar: boolean }) | null;
  caveatBadge: string | null;
  table: {
    key: SheetColumn[];
    all: SheetColumn[];
    hasMore: boolean;
    rows: Table['rows'];
  } | null;
  tab: 'Ranking' | 'Data';
};

/** The verdict sheet's view of one tool result; every new contract field is optional. */
export function toSheet(r: ToolSuccess): Sheet {
  const t = r.table;
  let table: Sheet['table'] = null;
  if (t && t.rows.length > 0) {
    const keyed = t.keyColumns
      ? t.keyColumns.flatMap((k) => t.columns.filter((c) => c.key === k))
      : t.columns;
    table = {
      key: sheetColumns(keyed, t.rows),
      // Key columns keep their order under All metrics; the rest follow.
      all: sheetColumns(
        [...keyed, ...t.columns.filter((c) => !keyed.includes(c))],
        t.rows,
      ),
      hasMore: keyed.length < t.columns.length,
      rows: t.rows,
    };
  }
  // Drivers are national percentiles. They take the label of the matching 0–100 table column,
  // so labels never rename between tabs, and otherwise say "percentile" outright.
  const scaled = new Set(
    t?.columns.filter((c) => onScale(c.unit)).map((c) => c.label),
  );
  const driverLabel = (l: string) =>
    !scaled.has(`${l} percentile`) && scaled.has(l) ? l : `${l} percentile`;
  return {
    headline: r.headline
      ? {
          ...r.headline,
          drivers: r.headline.drivers?.map((d) => ({
            ...d,
            label: driverLabel(d.label),
          })),
          estimate: r.headline.estimate ?? false,
          bar: onScale(r.headline.unit),
        }
      : null,
    caveatBadge: r.caveatBadge ?? null,
    table,
    tab: t?.columns.some((c) => c.key === 'rank') ? 'Ranking' : 'Data',
  };
}
