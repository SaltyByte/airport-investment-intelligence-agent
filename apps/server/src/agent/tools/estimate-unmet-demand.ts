import { EstimateUnmetDemandInput, type ToolResult } from '@app/shared';
import { tool } from 'ai';
import type { AirportKpis } from '../../kpis/airport-kpis';
import { seatGap, TARGET_LOAD_FACTOR } from '../../kpis/formulas';
import type { RouteRow } from '../../snapshot/schema';
import type { ToolContext } from './index';
import { resolveAirports } from './regions';
import {
  DELAY_CAVEATS,
  GROWTH_CAVEAT,
  roundResult,
  snapshotFooter,
} from './result';

const DRIVER_PERCENTILE = 75;
const NAS_SHARE = 25;

export const UNMET_GAP_METHOD =
  'Gap is computed per route × month on passenger flights departing the airport (all carriers and aircraft summed), rounded to whole seats, then summed over the period.';

type RouteGap = {
  dest: string;
  monthsAbove: number;
  seatsShort: number;
  extraDepartures: number;
};

/** Seat gap at the target load factor per route × month (carriers summed), totalled over the period; also as departures at each route-month's average seats per departure. */
export const routeGaps = (routes: RouteRow[], iata: string) => {
  const months = new Map<
    string,
    { dest: string; departures: number; seats: number; passengers: number }
  >();
  for (const r of routes) {
    if (r.origin !== iata || r.classGroup !== 'passenger') continue;
    const key = `${r.dest}|${r.month}`;
    const m = months.get(key) ?? {
      dest: r.dest,
      departures: 0,
      seats: 0,
      passengers: 0,
    };
    m.departures += r.departures;
    m.seats += r.seats;
    m.passengers += r.passengers;
    months.set(key, m);
  }
  const byDest = new Map<string, RouteGap>();
  let gap = 0;
  let extraDepartures = 0;
  let monthsAbove = 0;
  for (const { dest, departures, seats, passengers } of months.values()) {
    const short = seatGap(passengers, seats);
    // No aircraft size without departures and seats: the month adds seats but no departures.
    const extra =
      departures > 0 && seats > 0 ? short / (seats / departures) : 0;
    const above = passengers > seats * TARGET_LOAD_FACTOR ? 1 : 0;
    gap += short;
    extraDepartures += extra;
    monthsAbove += above;
    const d = byDest.get(dest) ?? {
      dest,
      monthsAbove: 0,
      seatsShort: 0,
      extraDepartures: 0,
    };
    d.monthsAbove += above;
    d.seatsShort += short;
    d.extraDepartures += extra;
    byDest.set(dest, d);
  }
  const top = [...byDest.values()]
    .filter((d) => d.seatsShort > 0)
    .sort((a, b) => b.seatsShort - a.seatsShort)
    .slice(0, 5);
  return { gap, extraDepartures, monthsAbove, routeMonths: months.size, top };
};

export type DriverEvidence = {
  monthsAbove: number;
  routeMonths: number;
  loadFactorPercentile: number | null;
  congestionIndex: number | null;
  nasShare: number | null;
  growth: number | null;
};

const f1 = (n: number) => n.toFixed(1);
const fmt = (n: number) => n.toLocaleString('en-US');

// Whole-number ordinal, matching the result card: 92.6 -> "93rd".
const ordinal = (p: number) => {
  const n = Math.round(p);
  const suffix =
    n % 100 >= 11 && n % 100 <= 13
      ? 'th'
      : (({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ??
        'th');
  return `${n}${suffix}`;
};

/** One sentence per capacity-constraint rule that fires, each with its evidence number. */
export const demandDrivers = (e: DriverEvidence): string[] => {
  const notes: string[] = [];
  if (e.monthsAbove > 0)
    notes.push(
      `${fmt(e.monthsAbove)} of ${fmt(e.routeMonths)} route-months (${f1((e.monthsAbove / e.routeMonths) * 100)}%) ran above the 80% target load factor.`,
    );
  if (
    e.loadFactorPercentile !== null &&
    e.loadFactorPercentile >= DRIVER_PERCENTILE
  )
    notes.push(
      `Load factor is at the ${ordinal(e.loadFactorPercentile)} percentile of US airports (threshold ${DRIVER_PERCENTILE}).`,
    );
  if (e.congestionIndex !== null && e.congestionIndex >= DRIVER_PERCENTILE)
    notes.push(
      `Congestion index is ${f1(e.congestionIndex)} of 100 (threshold ${DRIVER_PERCENTILE}).`,
    );
  if (e.nasShare !== null && e.nasShare >= NAS_SHARE)
    notes.push(
      `National airspace system (NAS) delays cause ${f1(e.nasShare)}% of delay-cause minutes (threshold ${NAS_SHARE}%).`,
    );
  if (e.growth !== null && e.growth > 0)
    notes.push(
      `Passenger enplanements grew ${f1(e.growth)}% in CY2025 vs CY2024.`,
    );
  if (notes.length > 0) return notes;
  const checks = [
    ['load factor', e.loadFactorPercentile, 'no load-factor data'],
    ['congestion', e.congestionIndex, 'no delay data'],
    ['NAS delays', e.nasShare, 'no delay-cause data'],
    ['growth', e.growth, 'no prior-year enplanements'],
  ] as const;
  const below = checks.filter(([, v]) => v !== null).map(([name]) => name);
  const missing = checks.filter(([, v]) => v === null).map(([, , why]) => why);
  if (missing.length === 0)
    return [
      'No capacity-constraint driver was found: no route-month ran above 80%, and load factor, congestion, NAS delays and growth are all below their thresholds.',
    ];
  const notAssessed = `not assessed: ${missing.join(', ')}.`;
  if (below.length === 0)
    return [
      `No capacity-constraint driver could be established from the available data: no route-month ran above 80%; ${notAssessed}`,
    ];
  const names =
    below.length === 1
      ? `${below[0]} is below its threshold`
      : `${below.slice(0, -1).join(', ')} and ${below.at(-1)} are below their thresholds`;
  return [
    `No capacity-constraint driver was found: no route-month ran above 80%, and ${names}; ${notAssessed}`,
  ];
};

export const estimateUnmetDemand = (
  { snapshot, kpis }: ToolContext,
  { iata }: EstimateUnmetDemandInput,
): ToolResult => {
  const found = resolveAirports([iata], kpis);
  if (found.isErr()) return { ok: false, error: found.error };
  const [a] = found.value as [AirportKpis];
  const g = routeGaps(snapshot.routes, iata);
  if (g.routeMonths === 0)
    return {
      ok: false,
      error: {
        kind: 'NotFound',
        message: `${iata} has no passenger routes in the data period, so unmet demand cannot be estimated.`,
      },
    };
  const nasShare = a.causeShares?.nas ?? null;
  const extraDepartures = Math.round(g.extraDepartures);
  return {
    ok: true,
    title: `Unmet demand at ${a.iata} (${a.name})`,
    headline: {
      iata: a.iata,
      name: a.name,
      label: 'Seat gap',
      value: g.gap,
      unit: 'seats',
      estimate: true,
      context: `${fmt(extraDepartures)} extra departures needed`,
    },
    metrics: [
      { label: 'Seat gap', value: g.gap, unit: 'seats', estimate: true },
      {
        label: 'Extra departures needed',
        value: extraDepartures,
        unit: 'count',
        estimate: true,
      },
      { label: 'Route-months above 80%', value: g.monthsAbove, unit: 'count' },
      {
        label: 'Share of route-months above 80%',
        value: (g.monthsAbove / g.routeMonths) * 100,
        unit: 'percent',
      },
      {
        label: 'Load factor',
        value: a.loadFactor === null ? null : a.loadFactor * 100,
        unit: 'percent',
        percentile: a.percentiles.loadFactor,
      },
      { label: 'Congestion index', value: a.congestionIndex, unit: 'score' },
      {
        label: 'NAS share of delay-cause minutes',
        value: nasShare,
        unit: 'percent',
      },
      {
        label: 'Passenger growth CY2025 vs CY2024',
        value: a.growth,
        unit: 'percent',
        percentile: a.percentiles.growth,
      },
    ],
    table: {
      columns: [
        { key: 'iata', label: 'Code' },
        { key: 'monthsAbove', label: 'Months above 80%', unit: 'count' },
        {
          key: 'seatsShort',
          label: 'Seats short',
          unit: 'seats',
          estimate: true,
        },
        {
          key: 'extraDepartures',
          label: 'Extra departures',
          unit: 'count',
          estimate: true,
        },
      ],
      rows: g.top.map((d) => ({
        iata: d.dest,
        monthsAbove: d.monthsAbove,
        seatsShort: d.seatsShort,
        extraDepartures: Math.round(d.extraDepartures),
      })),
      keyColumns: ['iata', 'seatsShort', 'extraDepartures'],
    },
    notes: demandDrivers({
      monthsAbove: g.monthsAbove,
      routeMonths: g.routeMonths,
      loadFactorPercentile: a.percentiles.loadFactor,
      congestionIndex: a.congestionIndex,
      nasShare,
      growth: a.growth,
    }),
    ...snapshotFooter(snapshot, ['traffic', 'delays', 'growth']),
    assumptions: [
      'Target load factor is 80%: seats needed = passengers ÷ 0.8.',
      UNMET_GAP_METHOD,
      "Extra departures = each route-month's seat gap ÷ its average seats per departure, summed and rounded to whole departures; route-months without departures or seats are left out.",
      'The seat gap is an estimate: demand turned away by full flights is never observed.',
      'Drivers fire at: any route-month above 80%; load-factor percentile ≥ 75; congestion index ≥ 75; NAS share of delay-cause minutes ≥ 25%; growth > 0%.',
    ],
    caveatBadge: 'Estimate, not observed demand',
    caveats: [...DELAY_CAVEATS, GROWTH_CAVEAT],
  };
};

export const createEstimateUnmetDemandTool = (ctx: ToolContext) =>
  tool({
    description:
      "Returns the estimated seat gap at one airport, also as extra departures at each route's average aircraft size, its most under-served routes and the capacity-constraint drivers behind it. Use for questions about unmet or excess demand at an airport and why.",
    inputSchema: EstimateUnmetDemandInput,
    execute: (input) => roundResult(estimateUnmetDemand(ctx, input)),
  });
