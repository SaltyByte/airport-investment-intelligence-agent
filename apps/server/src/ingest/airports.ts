// Snapshot airports: the FAA peer set joined to OurAirports locations plus BTS sums.
import type { DelaySums, SnapshotAirport } from '../snapshot/schema';
import type { Row } from './columns';
import type { FaaAirport } from './sources/faa';
import type { Traffic } from './sources/t100';

// OurAirports files US territories under their own country codes.
const US_COUNTRIES = new Set(['US', 'PR', 'GU', 'VI', 'AS', 'MP']);

/** FAA peer set joined to OurAirports by IATA (else FAA location id = local_code), with T-100 and on-time sums attached. */
export const buildAirports = (
  faa: FaaAirport[],
  ourAirports: Iterable<Row>,
  traffic: Map<string, Traffic>,
  delays: Map<string, DelaySums>,
): SnapshotAirport[] => {
  const byIata = new Map<string, Row>();
  const byLocal = new Map<string, Row>();
  for (const row of ourAirports) {
    if (!US_COUNTRIES.has(row.iso_country ?? '')) continue;
    if (row.iata_code) byIata.set(row.iata_code, row);
    if (row.local_code) byLocal.set(row.local_code, row);
  }
  return faa.map(({ locid, ...f }) => {
    const oa = byIata.get(locid) ?? byLocal.get(locid);
    // BTS keys airports by IATA, which differs from the FAA id at some airports (IWA → AZA).
    const iata = oa?.iata_code || locid;
    const region = oa?.iso_region ?? '';
    return {
      iata,
      name: oa?.name || f.name,
      city: oa?.municipality || f.city,
      state: region.startsWith('US-') ? region.slice(3) : f.state,
      faaRegion: f.faaRegion,
      serviceLevel: f.serviceLevel,
      hub: f.hub,
      enplanements: f.enplanements,
      priorEnplanements: f.priorEnplanements,
      latitude: oa ? Number(oa.latitude_deg) : null,
      longitude: oa ? Number(oa.longitude_deg) : null,
      traffic: traffic.get(iata) ?? null,
      delays: delays.get(iata) ?? null,
    };
  });
};
