import { GetLongHaulShareInput, type ToolResult } from '@app/shared';
import { tool } from 'ai';
import type { RouteRow, Snapshot } from '../../ingest/snapshot-schema';
import { LONG_HAUL_MILES, longHaulShare } from '../../kpis';
import type { AirportKpis } from '../../kpis/national';
import { snapshotFooter } from '../footer';
import { resolveAirports } from '../regions';
import { roundResult } from '../round-result';

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
export const longHaulReport = (
  snapshot: Snapshot,
  kpis: Map<string, AirportKpis>,
  iata: string,
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
      return {
        ok: true,
        title: `Long-haul share of departures — ${airport?.name ?? iata} (${iata})`,
        metrics: [
          shareMetric('Long-haul share — all flights', rows),
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
                  { key: 'iata', label: 'Destination' },
                  { key: 'distance', label: 'Distance', unit: 'miles' },
                  { key: 'departures', label: 'Departures', unit: 'count' },
                  { key: 'service', label: 'Service' },
                ],
                rows: top,
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
        caveats: [
          'Only BTS T-100 route traffic is used (all carriers reporting to BTS, domestic and international segments); delay and growth data are not involved.',
          'Distance is the nonstop segment flown, not the passenger’s full trip, and the 12-month total averages out seasonal patterns.',
        ],
      };
    },
    (error): ToolResult => ({ ok: false, error }),
  );

export const getLongHaulShare = (
  snapshot: Snapshot,
  kpis: Map<string, AirportKpis>,
) =>
  tool({
    description:
      'Long-haul share (segment ≥ 3,000 miles) of departures from one airport over the 12-month traffic period, for all, passenger and cargo flights, with top long-haul destinations. Use for questions about long-haul or long-distance flights out of an airport.',
    inputSchema: GetLongHaulShareInput,
    execute: async ({ iata }) =>
      roundResult(longHaulReport(snapshot, kpis, iata)),
  });
