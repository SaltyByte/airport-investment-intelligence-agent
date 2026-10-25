import {
  type AppError,
  RankExpansionCandidatesInput,
  type ToolResult,
} from '@app/shared';
import { tool } from 'ai';
import { err, ok, type Result } from 'neverthrow';
import { EXPANSION_WEIGHTS } from '../../kpis';
import type { AirportKpis } from '../../kpis/national';
import { DELAY_CAVEATS, GROWTH_CAVEAT, snapshotFooter } from '../footer';
import { resolveAirports, resolveRegion } from '../regions';
import { roundResult } from '../round-result';
import type { ToolContext } from '../tools';

// Plain words for the KPI names in expansion.missing.
const MISSING_WORDS: Record<string, string> = {
  growthPct: 'no growth data',
  loadFactorPct: 'no traffic data',
  scalePct: 'no traffic data',
  congestionIdx: 'no delay data',
};

type Member = { kpi: AirportKpis; catchment: boolean };

const members = (
  input: RankExpansionCandidatesInput,
  kpis: Map<string, AirportKpis>,
): Result<Member[], AppError> =>
  input.region
    ? ok(
        resolveRegion(input.region, kpis).map(({ iata, catchment }) => ({
          kpi: kpis.get(iata) as AirportKpis,
          catchment,
        })),
      )
    : input.airports
      ? resolveAirports(input.airports, kpis).map((list) =>
          list.map((kpi) => ({ kpi, catchment: false })),
        )
      : err({
          kind: 'InvalidInput',
          message: 'Give exactly one of region or airports.',
        });

const pct = (w: number) => `${Math.round(w * 100)}%`;

const assumptions = (
  input: RankExpansionCandidatesInput,
  peers: number,
): string[] => [
  `Expansion score = ${pct(EXPANSION_WEIGHTS.growth)} Growth + ${pct(EXPANSION_WEIGHTS.pressure)} Pressure + ${pct(EXPANSION_WEIGHTS.scale)} Scale, each 0-100.`,
  'Growth = national percentile of FAA enplanement growth; Pressure = mean of the load-factor percentile and the congestion index (mean percentile of share delayed 15+ min, mean departure delay and mean taxi-out); Scale = national percentile of passengers.',
  `Percentiles rank each airport against the national peer set of ${peers} US commercial-service airports.`,
  'Airports missing any input KPI are not scored.',
  ...(input.region === 'New England'
    ? [
        'New England = airports in ME, NH, VT, MA, RI and CT, plus Albany (ALB) as a catchment airport.',
      ]
    : []),
  ...(input.region === 'LA basin'
    ? ['LA basin = LAX, BUR, LGB, ONT and SNA.']
    : []),
];

/** Expansion-score ranking of a region or airport list; airports lacking data are listed in notes. */
export const expansionRanking = (
  input: RankExpansionCandidatesInput,
  { snapshot, kpis }: ToolContext,
): ToolResult =>
  members(input, kpis).match(
    (list): ToolResult => {
      const scored = list
        .filter((m) => m.kpi.expansion.score !== null)
        .sort(
          (a, b) =>
            (b.kpi.expansion.score ?? 0) - (a.kpi.expansion.score ?? 0) ||
            (b.kpi.percentiles.passengers ?? 0) -
              (a.kpi.percentiles.passengers ?? 0) ||
            a.kpi.iata.localeCompare(b.kpi.iata),
        );
      const excluded = list.filter((m) => m.kpi.expansion.score === null);
      return {
        ok: true,
        title: `Terminal expansion candidates${input.region ? `: ${input.region}` : ''}`,
        metrics: [
          { label: 'Airports ranked', value: scored.length, unit: 'count' },
          {
            label: 'Airports not ranked (insufficient data)',
            value: excluded.length,
            unit: 'count',
          },
        ],
        table: {
          columns: [
            { key: 'iata', label: 'Airport code' },
            { key: 'airport', label: 'Airport' },
            { key: 'rank', label: 'Rank' },
            { key: 'score', label: 'Expansion score', unit: 'score' },
            { key: 'growthScore', label: 'Growth', unit: 'score' },
            { key: 'pressureScore', label: 'Pressure', unit: 'score' },
            { key: 'scaleScore', label: 'Scale', unit: 'score' },
            { key: 'passengers', label: 'Passengers', unit: 'count' },
            { key: 'growth', label: 'YoY growth', unit: 'percent' },
            { key: 'loadFactor', label: 'Load factor', unit: 'ratio' },
            { key: 'congestion', label: 'Congestion index', unit: 'score' },
            {
              key: 'delayed15Share',
              label: 'Delayed 15+ min',
              unit: 'percent',
            },
            {
              key: 'meanDepDelay',
              label: 'Mean departure delay',
              unit: 'minutes',
            },
            { key: 'meanTaxiOut', label: 'Mean taxi-out', unit: 'minutes' },
          ],
          rows: scored.map(({ kpi, catchment }, i) => ({
            iata: kpi.iata,
            airport: catchment
              ? `${kpi.name} (New England catchment)`
              : kpi.name,
            rank: i + 1,
            score: kpi.expansion.score,
            growthScore: kpi.expansion.growth,
            pressureScore: kpi.expansion.pressure,
            scaleScore: kpi.expansion.scale,
            passengers: kpi.passengers,
            growth: kpi.growth,
            loadFactor: kpi.loadFactor,
            congestion: kpi.congestionIndex,
            delayed15Share: kpi.delayed15Share,
            meanDepDelay: kpi.meanDepDelay,
            meanTaxiOut: kpi.meanTaxiOut,
          })),
        },
        notes: [
          ...(list.length === 0
            ? [`No airports in ${input.region} are in the data.`]
            : []),
          ...excluded.map(
            ({ kpi }) =>
              `${kpi.iata}: ${[...new Set(kpi.expansion.missing.map((k) => MISSING_WORDS[k] ?? k))].join(', ')}`,
          ),
        ],
        ...snapshotFooter(snapshot, ['traffic', 'delays', 'growth']),
        assumptions: assumptions(input, kpis.size),
        caveats: [...DELAY_CAVEATS, GROWTH_CAVEAT],
      };
    },
    (error): ToolResult => ({ ok: false, error }),
  );

export const rankExpansionCandidates = (ctx: ToolContext) =>
  tool({
    description:
      'Rank airports in a region (US state code, New England or LA basin) or a list of 1-10 airports by Expansion Score (growth, capacity pressure, scale) to find terminal-expansion candidates. Use for questions about which airports most need or merit terminal expansion.',
    inputSchema: RankExpansionCandidatesInput,
    execute: async (input) => roundResult(expansionRanking(input, ctx)),
  });
