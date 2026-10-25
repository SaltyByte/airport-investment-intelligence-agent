import { describe, expect, it } from 'vitest';
import { SHARED, SHEET } from '../../test/ingest-fixtures';
import { BROWSER_UA } from '../download';
import { FAA_URL, faaPeriod, latestFaaYear, parseFaaSheet } from './faa';

describe('parseFaaSheet', () => {
  it('reads ranked airport rows with shared and rich-text strings, skipping footer counts', () => {
    expect(parseFaaSheet(SHEET, SHARED, 2025)).toEqual([
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

  it('reads the enplanement columns named after the file year', () => {
    const shared2026 = SHARED.replace('CY 25', 'CY 26').replace(
      'CY 24',
      'CY 25',
    );
    expect(parseFaaSheet(SHEET, shared2026, 2026)[0]?.enplanements).toBe(
      21021153,
    );
    expect(() => parseFaaSheet(SHEET, SHARED, 2026)).toThrow(
      'missing column "CY 26 Enplanements"',
    );
  });
});

describe('latestFaaYear', () => {
  it('probes from last year downward with a browser UA and returns the first published year', async () => {
    const probed: string[] = [];
    const year = await latestFaaYear(
      new Date('2028-03-01T00:00:00Z'),
      async (url, init) => {
        probed.push(String(url));
        expect(init?.method).toBe('HEAD');
        expect(new Headers(init?.headers).get('user-agent')).toBe(BROWSER_UA);
        return new Response(null, {
          status: String(url).includes('cy2025') ? 200 : 404,
        });
      },
    );
    expect(year).toBe(2025);
    expect(probed).toEqual([FAA_URL(2027), FAA_URL(2026), FAA_URL(2025)]);
  });

  it('fails on a status other than 404 instead of trying older years', async () => {
    await expect(
      latestFaaYear(
        new Date('2027-10-01T00:00:00Z'),
        async () => new Response(null, { status: 503 }),
      ),
    ).rejects.toThrow('HTTP 503 probing CY2026');
  });

  it('fails when no recent year is published', async () => {
    await expect(
      latestFaaYear(
        new Date('2027-10-01T00:00:00Z'),
        async () => new Response(null, { status: 404 }),
      ),
    ).rejects.toThrow('no FAA enplanements file');
  });
});

describe('FAA_URL and faaPeriod', () => {
  it('derive the file URL and the snapshot period label from the year', () => {
    expect(FAA_URL(2027)).toMatch(
      /\/arp-cy2027-commercial-service-enplanements\.xlsx$/,
    );
    expect(faaPeriod(2027)).toBe('CY2027 vs CY2026');
  });
});
