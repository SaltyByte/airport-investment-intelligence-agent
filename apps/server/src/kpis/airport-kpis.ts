import type { Snapshot, SnapshotAirport } from '../snapshot/schema';
import {
  congestionIndex,
  type ExpansionScore,
  expansionScore,
  peerPercentiles,
} from './formulas';

const CAUSES = [
  'carrier',
  'weather',
  'nas',
  'security',
  'lateAircraft',
] as const;
type Cause = (typeof CAUSES)[number];

// Percentiles rank these raw KPIs against every airport in the snapshot.
const RANKED = [
  'loadFactor',
  'passengers',
  'growth',
  'delayed15Share',
  'meanDepDelay',
  'meanTaxiOut',
] as const;
type Ranked = (typeof RANKED)[number];

type RawKpis = {
  iata: string;
  name: string;
  city: string;
  state: string;
  hub: SnapshotAirport['hub'];
  /** Passenger-class (F+L) T-100 sums over the snapshot period. */
  passengers: number | null;
  seats: number | null;
  /** Ratio 0-1. */
  loadFactor: number | null;
  /** Percent change in FAA enplanements, latest published calendar year vs the year before. */
  growth: number | null;
  /** On-time month: flights, percents 0-100, means in minutes. */
  flights: number | null;
  delayed15Share: number | null;
  meanDepDelay: number | null;
  meanTaxiOut: number | null;
  cancelRate: number | null;
  /** Percent of cause minutes; null when no cause minutes were reported. */
  causeShares: Record<Cause, number> | null;
};

export type AirportKpis = RawKpis & {
  /** National percentiles (0-100); passengers is the Scale pillar. */
  percentiles: Record<Ranked, number | null>;
  congestionIndex: number | null;
  expansion: ExpansionScore;
};

const ratio = (num: number, den: number) => (den === 0 ? null : num / den);
const pct = (num: number, den: number) =>
  den === 0 ? null : (num / den) * 100;

const rawKpis = (a: SnapshotAirport): RawKpis => {
  const traffic = a.traffic?.passenger;
  const d = a.delays;
  const causeTotal = d
    ? CAUSES.reduce((sum, c) => sum + d.causeMinutes[c], 0)
    : 0;
  return {
    iata: a.iata,
    name: a.name,
    city: a.city,
    state: a.state,
    hub: a.hub,
    passengers: traffic?.passengers ?? null,
    seats: traffic?.seats ?? null,
    loadFactor: traffic ? ratio(traffic.passengers, traffic.seats) : null,
    growth: pct(a.enplanements - a.priorEnplanements, a.priorEnplanements),
    flights: d?.flights ?? null,
    delayed15Share: d ? pct(d.depDelayed15, d.depDelayCount) : null,
    meanDepDelay: d ? ratio(d.depDelayMinutes, d.depDelayCount) : null,
    meanTaxiOut: d ? ratio(d.taxiOutMinutes, d.taxiOutCount) : null,
    cancelRate: d ? pct(d.cancelled, d.flights) : null,
    causeShares:
      d && causeTotal > 0
        ? (Object.fromEntries(
            CAUSES.map((c) => [c, (d.causeMinutes[c] / causeTotal) * 100]),
          ) as Record<Cause, number>)
        : null,
  };
};

export const buildNationalKpis = (
  snapshot: Snapshot,
): Map<string, AirportKpis> => {
  const raw = new Map(snapshot.airports.map((a) => [a.iata, rawKpis(a)]));
  const ranks = Object.fromEntries(
    RANKED.map((k) => [
      k,
      peerPercentiles(new Map([...raw].map(([iata, r]) => [iata, r[k]]))),
    ]),
  ) as Record<Ranked, Map<string, number | null>>;

  return new Map(
    [...raw].map(([iata, r]) => {
      const percentiles = Object.fromEntries(
        RANKED.map((k) => [k, ranks[k].get(iata) ?? null]),
      ) as Record<Ranked, number | null>;
      const congestion = congestionIndex(
        percentiles.delayed15Share,
        percentiles.meanDepDelay,
        percentiles.meanTaxiOut,
      );
      return [
        iata,
        {
          ...r,
          percentiles,
          congestionIndex: congestion,
          expansion: expansionScore({
            growthPct: percentiles.growth,
            loadFactorPct: percentiles.loadFactor,
            congestionIdx: congestion,
            scalePct: percentiles.passengers,
          }),
        },
      ];
    }),
  );
};
