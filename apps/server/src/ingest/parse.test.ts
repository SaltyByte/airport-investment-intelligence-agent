import { parse } from 'csv-parse/sync';
import { describe, expect, it } from 'vitest';
import {
  aggregateOnTime,
  aggregateT100,
  buildAirports,
  parseFaaSheet,
  requireColumns,
  selectPeriod,
} from './parse';

const csv = (text: string): Record<string, string>[] =>
  parse(text, { columns: true });

describe('selectPeriod', () => {
  it('ends at the latest month both sources cover and spans 12 months', () => {
    expect(selectPeriod('2026-07', '2026-08')).toEqual({
      start: '2025-08',
      end: '2026-07',
      months: [
        '2025-08',
        '2025-09',
        '2025-10',
        '2025-11',
        '2025-12',
        '2026-01',
        '2026-02',
        '2026-03',
        '2026-04',
        '2026-05',
        '2026-06',
        '2026-07',
      ],
    });
  });

  it('uses the T-100 month when on-time lags', () => {
    expect(selectPeriod('2026-03', '2026-01')).toMatchObject({
      start: '2025-02',
      end: '2026-01',
    });
  });
});

describe('aggregateT100', () => {
  const rows =
    csv(`YEAR,MONTH,ORIGIN,DEST,CLASS,DEPARTURES_PERFORMED,SEATS,PASSENGERS,DISTANCE
2026,7,ANC,SEA,F,10.00,1800.00,1500.00,1448.00
2026,7,ANC,SEA,L,2.00,200.00,150.00,1448.00
2026,7,ANC,SIN,G,4.00,0.00,0.00,6665.00
2026,7,ANC,ORD,P,1.00,0.00,0.00,2846.00
2026,7,ANC,SEA,F,3.00,0.00,0.00,1448.00
2026,7,CVG,CVG,P,0.00,0.00,0.00,0.00
2026,6,ANC,SEA,F,5.00,900.00,800.00,1448.00
2025,7,ANC,SEA,F,99.00,9900.00,9000.00,1448.00`);
  const months = ['2026-06', '2026-07'];

  it('groups F+L as passenger and G+P as cargo per route and month, dropping all-zero and out-of-period rows', () => {
    const { routes } = aggregateT100(rows, months);
    expect(routes).toEqual([
      {
        origin: 'ANC',
        dest: 'SEA',
        month: '2026-07',
        classGroup: 'passenger',
        departures: 15,
        seats: 2000,
        passengers: 1650,
        distance: 1448,
      },
      {
        origin: 'ANC',
        dest: 'SIN',
        month: '2026-07',
        classGroup: 'cargo',
        departures: 4,
        seats: 0,
        passengers: 0,
        distance: 6665,
      },
      {
        origin: 'ANC',
        dest: 'ORD',
        month: '2026-07',
        classGroup: 'cargo',
        departures: 1,
        seats: 0,
        passengers: 0,
        distance: 2846,
      },
      {
        origin: 'ANC',
        dest: 'SEA',
        month: '2026-06',
        classGroup: 'passenger',
        departures: 5,
        seats: 900,
        passengers: 800,
        distance: 1448,
      },
    ]);
  });

  it('sums per-airport traffic by class group over the period, keeping zero-seat departures', () => {
    const { traffic } = aggregateT100(rows, months);
    expect(traffic.get('ANC')).toEqual({
      passenger: { departures: 20, seats: 2900, passengers: 2450 },
      cargo: { departures: 5, seats: 0, passengers: 0 },
    });
    expect(traffic.has('CVG')).toBe(false);
  });

  it('rejects an unknown service class', () => {
    expect(() =>
      aggregateT100(
        csv(
          'YEAR,MONTH,ORIGIN,DEST,CLASS,DEPARTURES_PERFORMED,SEATS,PASSENGERS,DISTANCE\n2026,7,ANC,SEA,Z,1,1,1,1',
        ),
        months,
      ),
    ).toThrow(/class "Z"/);
  });
});

describe('BTS code aliases', () => {
  it('maps historical BTS codes to the peer IATA for T-100 origin and dest', () => {
    const { routes, traffic } = aggregateT100(
      csv(`YEAR,MONTH,ORIGIN,DEST,CLASS,DEPARTURES_PERFORMED,SEATS,PASSENGERS,DISTANCE
2026,7,PBI,1G4,F,2,100,80,2000
2026,7,LAX,PBI,F,1,50,40,2330`),
      ['2026-07'],
    );
    expect(routes.map((r) => `${r.origin}-${r.dest}`)).toEqual([
      'DJT-GCW',
      'LAX-DJT',
    ]);
    expect(traffic.has('DJT')).toBe(true);
    expect(traffic.has('PBI')).toBe(false);
  });

  it('maps historical BTS codes for on-time origins', async () => {
    const delays = await aggregateOnTime(
      csv('Origin,Cancelled\nPBI,0.00\nDJT,1.00'),
    );
    expect(delays.get('DJT')).toMatchObject({ flights: 2, cancelled: 1 });
    expect(delays.has('PBI')).toBe(false);
  });
});

describe('requireColumns', () => {
  it('passes when every required column is present', () => {
    expect(() =>
      requireColumns('BTS T-100', ['A', 'B', 'C'], ['A', 'C']),
    ).not.toThrow();
  });

  it('throws naming the source and every missing column', () => {
    expect(() =>
      requireColumns(
        'BTS On-Time PREZIP',
        ['Origin'],
        ['Origin', 'TaxiOut', 'DepDel15'],
      ),
    ).toThrow('BTS On-Time PREZIP: missing columns TaxiOut, DepDel15');
  });
});

describe('aggregateOnTime', () => {
  it('sums delays per origin with blank causes and cancelled flights', async () => {
    const rows =
      csv(`Origin,Cancelled,DepDelayMinutes,DepDel15,TaxiOut,CarrierDelay,WeatherDelay,NASDelay,SecurityDelay,LateAircraftDelay
SFO,0.00,0.00,0.00,20.00,,,,,
SFO,0.00,45.00,1.00,30.00,10.00,0.00,20.00,0.00,15.00
SFO,1.00,,,,,,,,
LAX,0.00,16.00,1.00,18.00,0.00,16.00,0.00,1.00,0.00`);
    const delays = await aggregateOnTime(rows);
    expect(delays.get('SFO')).toEqual({
      flights: 3,
      cancelled: 1,
      depDelayCount: 2,
      depDelayed15: 1,
      depDelayMinutes: 45,
      taxiOutMinutes: 50,
      taxiOutCount: 2,
      causeMinutes: {
        carrier: 10,
        weather: 0,
        nas: 20,
        security: 0,
        lateAircraft: 15,
      },
    });
    expect(delays.get('LAX')).toMatchObject({
      flights: 1,
      causeMinutes: { weather: 16, security: 1 },
    });
  });
});

const SHARED = `<sst><si><t>Rank</t></si><si><t>RO</t></si><si><t>ST</t></si><si><t>Locid</t></si><si><t>City</t></si><si><t>Airport Name</t></si><si><t>S/L</t></si><si><t>Hub</t></si><si><t>CY 25 Enplanements</t></si><si><t>CY 24 Enplanements</t></si><si><t>% Change</t></si><si><t>NE</t></si><si><t>MA</t></si><si><t>BOS</t></si><si><t>Boston</t></si><si><r><t>General Edward Lawrence Logan </t></r><r><t>International &amp; Co</t></r></si><si><t>P</t></si><si><t>L</t></si><si><t>Large Count</t></si><si><t>CS</t></si><si><t>None</t></si><si><t>AK</t></si><si><t>IAN</t></si><si><t>Kiana</t></si><si><t>Bob Baker Memorial</t></si><si><t>AL</t></si></sst>`;
const header = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  .map((i) => `<c r="${'ABCDEFGHIJK'[i]}1" t="s"><v>${i}</v></c>`)
  .join('');
const SHEET = `<worksheet><sheetData>
<row r="1">${header}</row>
<row r="2"><c r="A2"><v>16</v></c><c r="B2" t="s"><v>11</v></c><c r="C2" t="s"><v>12</v></c><c r="D2" t="s"><v>13</v></c><c r="E2" t="s"><v>14</v></c><c r="F2" t="s"><v>15</v></c><c r="G2" t="s"><v>16</v></c><c r="H2" t="s"><v>17</v></c><c r="I2"><v>21021153</v></c><c r="J2"><v>21090721</v></c><c r="K2"><v>-3.3E-3</v></c></row>
<row r="3"><c r="A3"><v>564</v></c><c r="B3" t="s"><v>25</v></c><c r="C3" t="s"><v>21</v></c><c r="D3" t="s"><v>22</v></c><c r="E3" t="s"><v>23</v></c><c r="F3" t="s"><v>24</v></c><c r="G3" t="s"><v>19</v></c><c r="H3" t="s"><v>20</v></c><c r="I3"><v>2509</v></c><c r="J3"><v>2555</v></c></row>
<row r="4"><c r="A4"/><c r="D4"><v>30</v></c><c r="E4" t="s"><v>18</v></c></row>
</sheetData></worksheet>`;

describe('parseFaaSheet', () => {
  it('reads ranked airport rows with shared and rich-text strings, skipping footer counts', () => {
    expect(parseFaaSheet(SHEET, SHARED)).toEqual([
      {
        locid: 'BOS',
        faaRegion: 'NE',
        state: 'MA',
        city: 'Boston',
        name: 'General Edward Lawrence Logan International & Co',
        serviceLevel: 'P',
        hub: 'L',
        enplanements: 21021153,
        priorEnplanements: 21090721,
      },
      {
        locid: 'IAN',
        faaRegion: 'AL',
        state: 'AK',
        city: 'Kiana',
        name: 'Bob Baker Memorial',
        serviceLevel: 'CS',
        hub: null,
        enplanements: 2509,
        priorEnplanements: 2555,
      },
    ]);
  });
});

describe('buildAirports', () => {
  it('joins OurAirports by IATA and keeps FAA fields when absent', () => {
    const faa = parseFaaSheet(SHEET, SHARED);
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
    const faa = parseFaaSheet(SHEET, SHARED);
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
