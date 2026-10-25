import {
  type AppError,
  RankExpansionCandidatesInput,
  type ToolResult,
} from '@app/shared';
import { tool } from 'ai';
import { err, ok, type Result } from 'neverthrow';
import type { AirportKpis } from '../../kpis/airport-kpis';
import { EXPANSION_WEIGHTS } from '../../kpis/formulas';
import type { ToolContext } from './index';
import { resolveAirports, resolveRegion } from './regions';
import {
  DELAY_CAVEATS,
  GROWTH_CAVEAT,
  roundResult,
  snapshotFooter,
} from './result';

// Plain words for the KPI names in expansion.missing.
const MISSING_WORDS: Record<string, string> = {
  growthPct: 'no growth data',
  loadFactorPct: 'no traffic data',
  scalePct: 'no traffic data',
  congestionIdx: 'no delay data',
};

type Member = { kpi: AirportKpis; catchment: boolean };

// The national ranking shows only the top rows; the rest are counted in the metrics.
const US_TOP = 20;

const members = (
  input: RankExpansionCandidatesInput,
  kpis: Map<string, AirportKpis>,
): Result<Member[], AppError> =>
  input.region === 'US'
    ? ok([...kpis.values()].map((kpi) => ({ kpi, catchment: false })))
    : input.region
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

export const pct = (w: number) => `${Math.round(w * 100)}%`;

/** How the expansion score is built; shared by the tool card and the system prompt. */
export const expansionMethod = (peers: number): string[] => [
  `Expansion score = ${pct(EXPANSION_WEIGHTS.growth)} Growth + ${pct(EXPANSION_WEIGHTS.pressure)} Pressure + ${pct(EXPANSION_WEIGHTS.scale)} Scale, each 0-100.`,
  'Growth = national percentile of FAA enplanement growth; Pressure = mean of the load-factor percentile and the congestion index (mean percentile of share delayed 15+ min, mean departure delay and mean taxi-out); Scale = national percentile of passengers.',
  `Percentiles rank each airport against the national peer set of ${peers} US commercial-service airports.`,
  'Airports missing any input KPI are not scored.',
  'Expansion score is a demand and capacity-pressure proxy for where added terminal capacity would be used; it does not model revenue, costs or financing, so it ranks likely profitability, not return on investment.',
];

const assumptions = (
  input: RankExpansionCandidatesInput,
  peers: number,
): string[] => [
  ...expansionMethod(peers),
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
export const rankExpansionCandidates = (
  { snapshot, kpis }: ToolContext,
  input: RankExpansionCandidatesInput,
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
      const us = input.region === 'US';
      const shown = us ? scored.slice(0, US_TOP) : scored;
      const first = scored[0]?.kpi;
      // One note per reason: "2 not ranked (no delay data): EWB, EWC".
      const byReason = new Map<string, string[]>();
      for (const { kpi } of excluded) {
        const reason = [
          ...new Set(kpi.expansion.missing.map((k) => MISSING_WORDS[k] ?? k)),
        ].join(', ');
        byReason.set(reason, [...(byReason.get(reason) ?? []), kpi.iata]);
      }
      return {
        ok: true,
        title: `Terminal expansion candidates${us ? `: US (top ${US_TOP})` : input.region ? `: ${input.region}` : ''}`,
        ...(first && {
          headline: {
            iata: first.iata,
            name: first.name,
            label: 'Expansion score',
            value: first.expansion.score,
            unit: 'score' as const,
            context: `Ranked 1 of ${scored.length}${excluded.length > 0 ? `, ${excluded.length} not ranked` : ''}`,
            drivers: [
              { label: 'Growth', value: first.expansion.growth },
              { label: 'Pressure', value: first.expansion.pressure },
              { label: 'Scale', value: first.expansion.scale },
            ],
          },
        }),
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
            { key: 'iata', label: 'Code' },
            { key: 'airport', label: 'Airport' },
            { key: 'rank', label: 'Rank' },
            { key: 'score', label: 'Expansion score', unit: 'score' },
            { key: 'growthScore', label: 'Growth', unit: 'score' },
            { key: 'pressureScore', label: 'Pressure', unit: 'score' },
            { key: 'scaleScore', label: 'Scale', unit: 'score' },
            { key: 'passengers', label: 'Passengers', unit: 'count' },
            { key: 'growth', label: 'YoY growth', unit: 'percent' },
            { key: 'loadFactor', label: 'Load factor', unit: 'percent' },
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
          keyColumns: [
            'rank',
            'iata',
            'airport',
            'score',
            'growthScore',
            'pressureScore',
            'scaleScore',
          ],
          rows: shown.map(({ kpi, catchment }, i) => ({
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
            loadFactor: kpi.loadFactor === null ? null : kpi.loadFactor * 100,
            congestion: kpi.congestionIndex,
            delayed15Share: kpi.delayed15Share,
            meanDepDelay: kpi.meanDepDelay,
            meanTaxiOut: kpi.meanTaxiOut,
          })),
        },
        notes: us
          ? [
              `The table shows the top ${shown.length} of ${scored.length} scored airports.`,
              `${excluded.length} airports are not ranked for lack of data.`,
            ]
          : [
              ...(list.length === 0
                ? [`No airports in ${input.region} are in the data.`]
                : []),
              ...[...byReason].map(
                ([reason, codes]) =>
                  `${codes.length} not ranked (${reason}): ${codes.join(', ')}`,
              ),
            ],
        ...snapshotFooter(snapshot, ['traffic', 'delays', 'growth']),
        assumptions: assumptions(input, kpis.size),
        caveatBadge: 'Profitability proxy, not ROI',
        caveats: [...DELAY_CAVEATS, GROWTH_CAVEAT],
      };
    },
    (error): ToolResult => ({ ok: false, error }),
  );

export const createRankExpansionCandidatesTool = (ctx: ToolContext) =>
  tool({
    description:
      "Returns airports in a region or a list ranked by Expansion Score with its Growth, Pressure and Scale pillars, plus airports lacking data; region 'US' ranks every US airport and returns the top 20 with counts of scored and unscored airports. Use for questions about which airports most need terminal expansion.",
    inputSchema: RankExpansionCandidatesInput,
    execute: async (input) => roundResult(rankExpansionCandidates(ctx, input)),
  });
