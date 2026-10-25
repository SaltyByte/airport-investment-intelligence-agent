// The parts every tool result shares: source footer, standard caveats and display rounding.
import type { ToolResult, ToolSuccess, ToolUnit } from '@app/shared';
import type { Snapshot } from '../../snapshot/schema';

export const DELAY_CAVEATS = [
  'Delay figures cover domestic flights of US reporting carriers only; international and regional-only flights are not included.',
  'Delay figures cover a single month, so seasonal effects are not averaged out.',
];
export const GROWTH_CAVEAT =
  'Growth compares calendar-year FAA passenger enplanements, not the latest 12 months of traffic.';

/** Snapshot data sources a tool can draw on. */
export type FooterSource = 'traffic' | 'delays' | 'growth';

// Footer order and how each source is found in snapshot.meta.sources.
const SOURCES: { key: FooterSource; label: string; name: RegExp }[] = [
  { key: 'traffic', label: 'Traffic', name: /T-100/ },
  { key: 'delays', label: 'delays', name: /On-Time/ },
  { key: 'growth', label: 'growth', name: /FAA/ },
];

// "2026-07" -> "Jul 2026"; strings that are not a month (e.g. "CY2025 vs CY2024") pass through.
const words = (period: string) =>
  period.replace(/\d{4}-\d{2}/g, (m) =>
    new Date(`${m}-01T00:00:00Z`).toLocaleString('en-US', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }),
  );

/** Source names, per-source periods and generation time for the sources a tool uses. */
export const snapshotFooter = (
  snapshot: Snapshot,
  used: FooterSource[],
): Pick<ToolSuccess, 'source' | 'period' | 'generatedAt'> => {
  const { generatedAt, period, sources } = snapshot.meta;
  const parts = SOURCES.filter((s) => used.includes(s.key)).map((s) => {
    const meta = sources.find((m) => s.name.test(m.name));
    const text =
      s.key === 'traffic'
        ? `${words(period.start)}–${words(period.end)}`
        : words(meta?.period ?? 'unknown');
    return { name: meta?.name ?? s.label, text: `${s.label} ${text}` };
  });
  const periodText = parts.map((p) => p.text).join('; ');
  return {
    source: parts.map((p) => p.name).join('; '),
    period: periodText.charAt(0).toUpperCase() + periodText.slice(1),
    generatedAt,
  };
};

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

export const round = <T>(value: T, unit: ToolUnit | undefined): T => {
  if (typeof value !== 'number' || unit === undefined) return value;
  const f = 10 ** DECIMALS[unit];
  return (Math.round(value * f) / f) as T;
};

/** Rounds metric values, percentiles, table cells and the headline by unit so the model quotes display-ready numbers. */
export const roundResult = (result: ToolResult): ToolResult => {
  if (!result.ok) return result;
  const units = new Map(result.table?.columns.map((c) => [c.key, c.unit]));
  return {
    ...result,
    ...(result.headline && {
      headline: {
        ...result.headline,
        value: round(result.headline.value, result.headline.unit),
        ...(result.headline.drivers && {
          drivers: result.headline.drivers.map((d) => ({
            ...d,
            value: round(d.value, 'percentile'),
          })),
        }),
      },
    }),
    metrics: result.metrics.map((m) => ({
      ...m,
      value: round(m.value, m.unit),
      ...(m.percentile === undefined
        ? {}
        : { percentile: round(m.percentile, 'percentile') }),
    })),
    ...(result.table && {
      table: {
        ...result.table,
        rows: result.table.rows.map((row) =>
          Object.fromEntries(
            Object.entries(row).map(([k, v]) => [k, round(v, units.get(k))]),
          ),
        ),
      },
    }),
  };
};
