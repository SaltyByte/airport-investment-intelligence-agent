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

/** One source's own period string from snapshot meta (e.g. "CY2025 vs CY2024" for growth). */
export const sourcePeriod = (
  snapshot: Snapshot,
  key: FooterSource,
): string | undefined => {
  const name = SOURCES.find((s) => s.key === key)?.name;
  return snapshot.meta.sources.find((m) => name?.test(m.name))?.period;
};

// ≈ 2× BTS publication lag (about 3 months), so a missed monthly refresh alone does not trigger it.
export const STALE_AFTER_MONTHS = 6;

/** Refresh notice once `now` is more than STALE_AFTER_MONTHS after the traffic period end month, else null. */
export const staleNotice = (
  meta: Snapshot['meta'],
  now: Date,
): string | null => {
  const [y, m] = meta.period.end.split('-').map(Number) as [number, number];
  // Month index m (0-based) is the month after `end`, so this is the first instant past the threshold.
  const staleFrom = Date.UTC(y, m + STALE_AFTER_MONTHS);
  return now.getTime() < staleFrom
    ? null
    : `Data ends ${words(meta.period.end)}, more than ${STALE_AFTER_MONTHS} months ago; run pnpm ingest to refresh.`;
};

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

/**
 * One note splitting the gap between the top two airports into signed parts, largest first, 1 decimal.
 * Parts are rounded for display, so their sum may differ from the gap by up to 0.2; a gap that shows as 0.0 uses `tie`.
 */
export const gapNote = (
  gap: number,
  lead: (points: string) => string,
  tie: string,
  parts: [label: string, points: number][],
): string => {
  const text = [...parts]
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .map(([label, p]) => {
      const r = round(p, 'score');
      return `${label} ${r < 0 ? '−' : '+'}${Math.abs(r).toFixed(1)}`;
    });
  return `${round(gap, 'score') === 0 ? tie : lead(gap.toFixed(1))}: ${text.join(', ')}.`;
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
