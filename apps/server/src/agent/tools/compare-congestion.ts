import {
  CompareCongestionInput,
  type ToolResult,
  type ToolTable,
} from '@app/shared';
import { tool } from 'ai';
import type { AirportKpis } from '../../kpis/airport-kpis';
import type { ToolContext } from './index';
import { resolveAirports, resolveRegion } from './regions';
import { DELAY_CAVEATS, round, roundResult, snapshotFooter } from './result';

const COLUMNS: ToolTable['columns'] = [
  { key: 'iata', label: 'Code' },
  { key: 'name', label: 'Airport' },
  { key: 'congestionIndex', label: 'Congestion index', unit: 'score' },
  { key: 'delayed15Share', label: 'Delayed 15+ min', unit: 'percent' },
  {
    key: 'delayed15SharePct',
    label: 'Delayed 15+ min percentile',
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

export const CONGESTION_INDEX_METHOD =
  'Congestion index: mean national percentile of the share of departures delayed 15 minutes or more, the mean departure delay and the mean taxi-out time (0-100, higher is more congested).';

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
  // Sorted, so the first airport with an index is the most congested and the second the runner-up.
  const indexed = airports.filter((a) => a.congestionIndex !== null);
  const [top, next] = indexed;
  const missing = airports.length - indexed.length;
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
  // Lead over the runner-up from the displayed (rounded) indices, to one fixed decimal like the card.
  const topIdx = round(top?.congestionIndex ?? 0, 'score');
  const nextIdx = round(next?.congestionIndex ?? 0, 'score');
  const runnerUp = next
    ? `; ${(topIdx - nextIdx).toFixed(1)} points above ${next.iata} (${nextIdx.toFixed(1)})`
    : '';

  return {
    ok: true,
    title: `Congestion comparison: ${input.region ?? iatas.join(', ')}`,
    ...(top && {
      headline: {
        iata: top.iata,
        name: top.name,
        label: 'Congestion index',
        value: top.congestionIndex,
        unit: 'score' as const,
        context: `Most congested of ${indexed.length}${missing > 0 ? `, ${missing} without data` : ''}${runnerUp}`,
        drivers: [
          { label: 'Delayed 15+ min', value: top.percentiles.delayed15Share },
          {
            label: 'Mean departure delay',
            value: top.percentiles.meanDepDelay,
          },
          { label: 'Mean taxi-out', value: top.percentiles.meanTaxiOut },
        ],
      },
    }),
    metrics: airports.slice(0, 10).map((a) => ({
      label: `Congestion index — ${a.iata}`,
      value: a.congestionIndex,
      unit: 'score',
    })),
    table: {
      columns: COLUMNS,
      rows: airports.map((a) => row(a, catchment.has(a.iata))),
      keyColumns: [
        'iata',
        'name',
        'congestionIndex',
        'delayed15SharePct',
        'meanDepDelayPct',
        'meanTaxiOutPct',
      ],
    },
    notes,
    ...snapshotFooter(ctx.snapshot, ['delays']),
    assumptions: [
      CONGESTION_INDEX_METHOD,
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
    caveatBadge: 'One month of domestic delays',
    caveats: [
      ...DELAY_CAVEATS,
      'Cause minutes are recorded only for delayed arrivals.',
    ],
  };
};

export const createCompareCongestionTool = (ctx: ToolContext) =>
  tool({
    description:
      'Returns the congestion index, delay, taxi-out, cancellation and delay-cause figures for 2-10 airports or every airport in a region, most congested first. Use to compare how congested airports are.',
    inputSchema: CompareCongestionInput,
    execute: async (input) => roundResult(compareCongestion(ctx, input)),
  });
