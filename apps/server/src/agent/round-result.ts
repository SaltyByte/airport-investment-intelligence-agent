import type { ToolResult, ToolUnit } from '@app/shared';

// Decimals per unit, matching the web result card's display.
const DECIMALS: Record<ToolUnit, number> = {
  percent: 1,
  minutes: 1,
  score: 1,
  percentile: 1,
  count: 0,
  seats: 0,
  miles: 0,
};

const round = <T>(value: T, unit: ToolUnit | undefined): T => {
  if (typeof value !== 'number' || unit === undefined) return value;
  const f = 10 ** DECIMALS[unit];
  return (Math.round(value * f) / f) as T;
};

/** Rounds metric values, percentiles and table cells by unit so the model quotes display-ready numbers. */
export const roundResult = (result: ToolResult): ToolResult => {
  if (!result.ok) return result;
  const units = new Map(result.table?.columns.map((c) => [c.key, c.unit]));
  return {
    ...result,
    metrics: result.metrics.map((m) => ({
      ...m,
      value: round(m.value, m.unit),
      ...(m.percentile === undefined
        ? {}
        : { percentile: round(m.percentile, 'percentile') }),
    })),
    ...(result.table && {
      table: {
        columns: result.table.columns,
        rows: result.table.rows.map((row) =>
          Object.fromEntries(
            Object.entries(row).map(([k, v]) => [k, round(v, units.get(k))]),
          ),
        ),
      },
    }),
  };
};
