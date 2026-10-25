export const EXPANSION_WEIGHTS = { growth: 0.4, pressure: 0.4, scale: 0.2 };
export const LONG_HAUL_MILES = 3000;
export const TARGET_LOAD_FACTOR = 0.8;

const round1 = (n: number) => Math.round(n * 10) / 10;

const mean = (values: number[]) =>
  values.reduce((sum, v) => sum + v, 0) / values.length;

/** Mid-rank percentile (0-100, 1 decimal) of value within peerValues; null if value is null or no peers. */
export const percentileRank = (
  value: number | null,
  peerValues: number[],
): number | null => {
  if (value === null || peerValues.length === 0) return null;
  const lower = peerValues.filter((v) => v < value).length;
  const equal = peerValues.filter((v) => v === value).length;
  return round1(((lower + 0.5 * equal) / peerValues.length) * 100);
};

/** Percentile of every airport against all airports with a non-null value. */
export const peerPercentiles = (
  values: Map<string, number | null>,
): Map<string, number | null> => {
  const peers = [...values.values()].filter((v): v is number => v !== null);
  return new Map(
    [...values].map(([iata, v]) => [iata, percentileRank(v, peers)]),
  );
};

/** Mean of the three delay/taxi percentiles; null if any is null. */
export const congestionIndex = (
  pctDelayed15: number | null,
  pctMeanDelay: number | null,
  pctTaxiOut: number | null,
): number | null =>
  pctDelayed15 === null || pctMeanDelay === null || pctTaxiOut === null
    ? null
    : round1(mean([pctDelayed15, pctMeanDelay, pctTaxiOut]));

export type ExpansionInputs = {
  growthPct: number | null;
  loadFactorPct: number | null;
  congestionIdx: number | null;
  scalePct: number | null;
};

export type ExpansionScore = {
  score: number | null;
  growth: number | null;
  pressure: number | null;
  scale: number | null;
  missing: string[];
};

/** Weighted Expansion Score; score is null and missing names the KPIs when any input is null. */
export const expansionScore = (inputs: ExpansionInputs): ExpansionScore => {
  const missing = Object.entries(inputs)
    .filter(([, v]) => v === null)
    .map(([name]) => name);
  const { growthPct, loadFactorPct, congestionIdx, scalePct } = inputs;
  const pressure =
    loadFactorPct === null || congestionIdx === null
      ? null
      : round1(mean([loadFactorPct, congestionIdx]));
  const score =
    growthPct === null || pressure === null || scalePct === null
      ? null
      : round1(
          EXPANSION_WEIGHTS.growth * growthPct +
            EXPANSION_WEIGHTS.pressure * pressure +
            EXPANSION_WEIGHTS.scale * scalePct,
        );
  return { score, growth: growthPct, pressure, scale: scalePct, missing };
};

/** Extra seats needed for passengers to fill seats at the target load factor; never negative. */
export const seatGap = (
  passengers: number,
  seats: number,
  target = TARGET_LOAD_FACTOR,
): number => Math.max(0, Math.round(passengers / target - seats));

/** Departures on routes of at least threshold miles, out of all departures. */
export const longHaulShare = (
  rows: { distance: number; departures: number }[],
  threshold = LONG_HAUL_MILES,
): { longHaul: number; total: number; share: number | null } => {
  let longHaul = 0;
  let total = 0;
  for (const { distance, departures } of rows) {
    total += departures;
    if (distance >= threshold) longHaul += departures;
  }
  return { longHaul, total, share: total === 0 ? null : longHaul / total };
};
