import { GetLongHaulShareInput, type ToolResult } from '@app/shared';
import { tool } from 'ai';
import { LONG_HAUL_MILES, longHaulShare } from '../../kpis/formulas';
import type { RouteRow } from '../../snapshot/schema';
import type { ToolContext } from './index';
import { resolveAirports } from './regions';
import { roundResult, snapshotFooter } from './result';

const fmt = (n: number) => n.toLocaleString('en-US');

const shareMetric = (label: string, rows: RouteRow[]) => {
  const { longHaul, total, share } = longHaulShare(rows);
  return {
    label,
    value: share === null ? null : Math.round(share * 1000) / 10,
    unit: 'percent' as const,
    note:
      total === 0
        ? 'no flights'
        : `${fmt(longHaul)} of ${fmt(total)} departures`,
  };
};

/** Long-haul share of an airport's departures (all / passenger / cargo) plus its top long-haul destinations. */
export const getLongHaulShare = (
  { snapshot, kpis }: ToolContext,
  { iata }: GetLongHaulShareInput,
): ToolResult =>
  resolveAirports([iata], kpis).match(
    ([airport]): ToolResult => {
      const rows = snapshot.routes.filter((r) => r.origin === iata);
      const byRoute = new Map<
        string,
        { iata: string; distance: number; departures: number; service: string }
      >();
      for (const r of rows) {
        if (r.distance < LONG_HAUL_MILES) continue;
        const key = `${r.dest}|${r.classGroup}`;
        const route = byRoute.get(key) ?? {
          iata: r.dest,
          distance: r.distance,
          departures: 0,
          service: r.classGroup,
        };
        route.departures += r.departures;
        byRoute.set(key, route);
      }
      const top = [...byRoute.values()]
        .filter((r) => r.departures > 0)
        .sort((a, b) => b.departures - a.departures)
        .slice(0, 5);
      const all = shareMetric('Long-haul share — all flights', rows);
      return {
        ok: true,
        title: `Long-haul share of departures — ${airport?.name ?? iata} (${iata})`,
        headline: {
          iata,
          name: airport?.name ?? iata,
          label: 'Long-haul share, all flights',
          value: all.value,
          unit: all.unit,
          context: all.note,
        },
        metrics: [
          all,
          shareMetric(
            'Long-haul share — passenger flights',
            rows.filter((r) => r.classGroup === 'passenger'),
          ),
          shareMetric(
            'Long-haul share — cargo flights',
            rows.filter((r) => r.classGroup === 'cargo'),
          ),
        ],
        ...(top.length > 0
          ? {
              table: {
                columns: [
                  { key: 'iata', label: 'Code' },
                  { key: 'distance', label: 'Distance', unit: 'miles' },
                  { key: 'departures', label: 'Departures', unit: 'count' },
                  { key: 'service', label: 'Service' },
                ],
                rows: top,
                keyColumns: ['iata', 'distance', 'departures', 'service'],
              },
            }
          : {
              notes: [
                `No departures of ${fmt(LONG_HAUL_MILES)} miles or more in the period.`,
              ],
            }),
        ...snapshotFooter(snapshot, ['traffic']),
        assumptions: [
          `Long-haul flight = segment distance of at least ${fmt(LONG_HAUL_MILES)} statute miles.`,
          'Share = long-haul departures performed ÷ all departures performed from the airport.',
          'Passenger flights = scheduled and charter passenger service; cargo flights = all-cargo service.',
        ],
        caveatBadge: 'Snapshot period only',
        caveats: [
          'Only BTS T-100 route traffic is used (all carriers reporting to BTS, domestic and international segments); delay and growth data are not involved.',
          'Distance is the nonstop segment flown, not the passenger’s full trip, and the 12-month total averages out seasonal patterns.',
        ],
      };
    },
    (error): ToolResult => ({ ok: false, error }),
  );

export const createGetLongHaulShareTool = (ctx: ToolContext) =>
  tool({
    description:
      'Returns the long-haul share of departures from one airport for all, passenger and cargo flights, with its top long-haul destinations. Use for questions about long-haul flights out of an airport.',
    inputSchema: GetLongHaulShareInput,
    execute: async (input) => roundResult(getLongHaulShare(ctx, input)),
  });
