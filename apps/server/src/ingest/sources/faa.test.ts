import { describe, expect, it } from 'vitest';
import { SHARED, SHEET } from '../../test/ingest-fixtures';
import { parseFaaSheet } from './faa';

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
