import { describe, expect, it } from 'vitest';
import { csv, SHARED, SHEET } from '../test/ingest-fixtures';
import { buildAirports } from './airports';
import { parseFaaSheet } from './sources/faa';

describe('buildAirports', () => {
  it('joins OurAirports by IATA and keeps FAA fields when absent', () => {
    const faa = parseFaaSheet(SHEET, SHARED, 2025);
    const ourAirports =
      csv(`type,name,latitude_deg,longitude_deg,iso_country,iso_region,municipality,iata_code,local_code
large_airport,Logan International Airport,42.36,-71.01,US,US-MA,Boston,BOS,BOS
small_airport,Elsewhere,1,2,AR,AR-Z,X,IAN,`);
    const airports = buildAirports(faa, ourAirports, new Map(), new Map());
    expect(airports[0]).toMatchObject({
      iata: 'BOS',
      name: 'Logan International Airport',
      city: 'Boston',
      state: 'MA',
      latitude: 42.36,
      longitude: -71.01,
      traffic: null,
      delays: null,
    });
    expect(airports[1]).toMatchObject({
      iata: 'IAN',
      name: 'Bob Baker Memorial',
      city: 'Kiana',
      state: 'AK',
      latitude: null,
    });
  });

  it('maps an FAA location id to its IATA code via OurAirports local_code', () => {
    const faa = parseFaaSheet(SHEET, SHARED, 2025);
    const ourAirports =
      csv(`type,name,latitude_deg,longitude_deg,iso_country,iso_region,municipality,iata_code,local_code
small_airport,Kiana Airport,66.97,-160.43,US,US-AK,Kiana,KIA,IAN`);
    const traffic = new Map([
      [
        'KIA',
        {
          passenger: { departures: 1, seats: 9, passengers: 5 },
          cargo: { departures: 0, seats: 0, passengers: 0 },
        },
      ],
    ]);
    expect(
      buildAirports(faa, ourAirports, traffic, new Map())[1],
    ).toMatchObject({
      iata: 'KIA',
      name: 'Kiana Airport',
      traffic: { passenger: { departures: 1 } },
    });
  });
});
