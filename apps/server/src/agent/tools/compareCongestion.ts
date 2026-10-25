import {
  CompareCongestionInput,
  type ToolResult,
  type ToolTable,
} from '@app/shared';
import { tool } from 'ai';
import type { AirportKpis } from '../../kpis/national';
import { DELAY_CAVEATS, snapshotFooter } from '../footer';
import { resolveAirports, resolveRegion } from '../regions';
import { roundResult } from '../round-result';
import type { ToolContext } from '../tools';

const COLUMNS: ToolTable['columns'] = [
  { key: 'iata', label: 'Airport' },
  { key: 'name', label: 'Name' },
  { key: 'congestionIndex', label: 'Congestion index', unit: 'score' },
  { key: 'delayed15Share', label: 'Delayed ≥15 min', unit: 'percent' },
  {
    key: 'delayed15SharePct',
    label: 'Delayed ≥15 min percentile',
    unit: 'percentile',
  },
  { key: 'meanDepDelay', label: 'Mean departure delay', unit: 'minutes' },
  {
    key: 'meanDepDelayPct',
    label: 'Mean departure delay percentile',
    unit: 'percentile',
  },
  { key: 'meanTaxiOut', label: 'Mean taxi-out', unit: 'minutes' },
  {
    key: 'meanTaxiOutPct',
    label: 'Mean taxi-out percentile',
    unit: 'percentile',
  },
  { key: 'cancelRate', label: 'Cancellations', unit: 'percent' },
  { key: 'flights', label: 'Flights', unit: 'count' },
  { key: 'nas', label: 'NAS cause share', unit: 'percent' },
  { key: 'weather', label: 'Weather cause share', unit: 'percent' },
  { key: 'carrier', label: 'Carrier cause share', unit: 'percent' },
  { key: 'lateAircraft', label: 'Late-aircraft cause share', unit: 'percent' },
  { key: 'security', label: 'Security cause share', unit: 'percent' },
];

const row = (
  a: AirportKpis,
  catchment: boolean,
): ToolTable['rows'][number] => ({
  iata: a.iata,
  name: catchment ? `${a.name} (New England catchment)` : a.name,
  congestionIndex: a.congestionIndex,
  delayed15Share: a.delayed15Share,
  delayed15SharePct: a.percentiles.delayed15Share,
  meanDepDelay: a.meanDepDelay,
  meanDepDelayPct: a.percentiles.meanDepDelay,
  meanTaxiOut: a.meanTaxiOut,
  meanTaxiOutPct: a.percentiles.meanTaxiOut,
  cancelRate: a.cancelRate,
  flights: a.flights,
  nas: a.causeShares?.nas ?? null,
  weather: a.causeShares?.weather ?? null,
  carrier: a.causeShares?.carrier ?? null,
  lateAircraft: a.causeShares?.lateAircraft ?? null,
  security: a.causeShares?.security ?? null,
});

/** Congestion comparison for 2-10 airports or a region; most congested first, no-index airports last. */
export const compareCongestion = (
  ctx: ToolContext,
  input: CompareCongestionInput,
): ToolResult => {
  if ((input.airports === undefined) === (input.region === undefined)) {
    return {
      ok: false,
      error: {
        kind: 'InvalidInput',
        message: 'Give either airports or a region, not both.',
      },
    };
  }
  const region = input.region ? resolveRegion(input.region, ctx.kpis) : [];
  const catchment = new Set(
    region.filter((r) => r.catchment).map((r) => r.iata),
  );
  const iatas = input.region
    ? region.map((r) => r.iata)
    : (input.airports ?? []);
  if (iatas.length === 0) {
    return {
      ok: false,
      error: {
        kind: 'NotFound',
        message: `No airports with data in ${input.region}.`,
      },
    };
  }
  const resolved = resolveAirports(iatas, ctx.kpis);
  if (resolved.isErr()) return { ok: false, error: resolved.error };

  const airports = [...resolved.value].sort(
    (a, b) => (b.congestionIndex ?? -1) - (a.congestionIndex ?? -1),
  );
  // Sorted, so the first airport with an index is the most congested.
  const top = airports.find((a) => a.congestionIndex !== null);
  const notes = [
    ...airports
      .filter((a) => a.flights === null)
      .map(
        (a) =>
          `${a.iata}: no on-time data: no US reporting carrier operates there.`,
      ),
    top
      ? `${top.iata} is the most congested by congestion index.`
      : 'No airport here has a congestion index.',
  ];

  return {
    ok: true,
    title: `Congestion comparison: ${input.region ?? iatas.join(', ')}`,
    metrics: airports.slice(0, 10).map((a) => ({
      label: `Congestion index — ${a.iata}`,
      value: a.congestionIndex,
      unit: 'score',
    })),
    table: {
      columns: COLUMNS,
      rows: airports.map((a) => row(a, catchment.has(a.iata))),
    },
    notes,
    ...snapshotFooter(ctx.snapshot, ['delays']),
    assumptions: [
      'Congestion index: mean national percentile of the share of departures delayed 15 minutes or more, the mean departure delay and the mean taxi-out time (0-100, higher is more congested).',
      'Cancellations and the delay-cause mix (share of cause minutes) are shown to explain congestion but are not scored.',
      ...(input.region === 'New England'
        ? [
            'New England = airports in ME, NH, VT, MA, RI and CT, plus Albany (ALB) as a catchment airport.',
          ]
        : []),
      ...(input.region === 'LA basin'
        ? ['LA basin = LAX, BUR, LGB, ONT and SNA.']
        : []),
    ],
    caveats: [
      ...DELAY_CAVEATS,
      'Cause minutes are recorded only for delayed arrivals.',
    ],
  };
};

export const compareCongestionTool = (ctx: ToolContext) =>
  tool({
    description:
      'Returns the congestion index, delay, taxi-out, cancellation and delay-cause figures for 2-10 airports or every airport in a region, most congested first. Use to compare how congested airports are.',
    inputSchema: CompareCongestionInput,
    execute: async (input) => roundResult(compareCongestion(ctx, input)),
  });
