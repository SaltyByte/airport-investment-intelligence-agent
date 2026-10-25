import { describe, expect, it, vi } from 'vitest';
import { buildNationalKpis } from '../kpis/airport-kpis';
import type * as Formulas from '../kpis/formulas';
import {
  EXPANSION_WEIGHTS,
  LONG_HAUL_MILES,
  TARGET_LOAD_FACTOR,
} from '../kpis/formulas';
import { airport, snapshot } from '../test/fixtures';
import { buildInstructions } from './instructions';
import { snapshotFooter, staleNotice } from './tools/result';

// Off-default thresholds, so a hand-copied "3,000" or "80%" in the prompt fails the test.
vi.mock('../kpis/formulas', async (original) => ({
  ...(await original<typeof Formulas>()),
  LONG_HAUL_MILES: 4500,
  TARGET_LOAD_FACTOR: 0.85,
}));

const fixture = snapshot([airport('SFO'), airport('OAK')]);
const ctx = { snapshot: fixture, kpis: buildNationalKpis(fixture) };
const prompt = buildInstructions(ctx, new Date('2026-10-25T00:00:00Z'));
const pct = (w: number) => `${Math.round(w * 100)}%`;

describe('buildInstructions', () => {
  it('states the expansion weights from EXPANSION_WEIGHTS', () => {
    for (const w of Object.values(EXPANSION_WEIGHTS))
      expect(prompt).toContain(pct(w));
  });

  it('states the long-haul and target load-factor thresholds from their constants', () => {
    expect(prompt).toContain(
      `${LONG_HAUL_MILES.toLocaleString('en-US')} statute miles`,
    );
    expect(prompt).toContain(`${pct(TARGET_LOAD_FACTOR)} target load factor`);
  });

  it("states each snapshot source's period", () => {
    const { period } = snapshotFooter(fixture, ['traffic', 'delays', 'growth']);
    for (const p of period.split('; ')) expect(prompt).toContain(p);
  });

  it('states the stale-data notice in the Limits line only when the snapshot is stale', () => {
    const stale = new Date('2027-02-01T00:00:00Z');
    const notice = staleNotice(fixture.meta, stale) as string;
    expect(buildInstructions(ctx, stale)).toMatch(
      new RegExp(`- Limits: .*${notice.replace(/[.;]/g, '\\$&')}`),
    );
    expect(prompt).not.toContain('pnpm ingest');
  });
});
