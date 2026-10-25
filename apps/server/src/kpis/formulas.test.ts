import { describe, expect, it } from 'vitest';
import {
  congestionIndex,
  expansionScore,
  longHaulShare,
  peerPercentiles,
  percentileRank,
  seatGap,
} from './formulas';

describe('percentileRank', () => {
  it('uses the mid-rank so ties share a percentile', () => {
    expect(percentileRank(2, [1, 2, 2, 3])).toBe(50);
    expect(percentileRank(1, [1, 2, 2, 3])).toBe(12.5);
    expect(percentileRank(3, [1, 2, 2, 3])).toBe(87.5);
  });

  it('rounds to one decimal', () => {
    expect(percentileRank(1, [1, 2, 3])).toBe(16.7);
  });

  it('puts a single-airport peer set at 50', () => {
    expect(percentileRank(7, [7])).toBe(50);
  });

  it('returns null for a null value or empty peers', () => {
    expect(percentileRank(null, [1, 2])).toBeNull();
    expect(percentileRank(1, [])).toBeNull();
  });
});

describe('peerPercentiles', () => {
  it('ranks each airport against non-null peers and keeps nulls null', () => {
    const result = peerPercentiles(
      new Map([
        ['AAA', 10],
        ['BBB', 20],
        ['CCC', null],
        ['DDD', 20],
      ]),
    );
    expect(Object.fromEntries(result)).toEqual({
      AAA: 16.7,
      BBB: 66.7,
      CCC: null,
      DDD: 66.7,
    });
  });

  it('gives a lone airport 50', () => {
    expect(peerPercentiles(new Map([['AAA', 3]])).get('AAA')).toBe(50);
  });
});

describe('congestionIndex', () => {
  it('averages the three percentiles', () => {
    expect(congestionIndex(30, 60, 90)).toBe(60);
  });

  it('is null when any input is null', () => {
    expect(congestionIndex(30, null, 90)).toBeNull();
  });
});

describe('expansionScore', () => {
  it('weights growth, pressure and scale 0.4/0.4/0.2', () => {
    expect(
      expansionScore({
        growthPct: 80,
        loadFactorPct: 60,
        congestionIdx: 40,
        scalePct: 25,
      }),
    ).toEqual({ score: 57, growth: 80, pressure: 50, scale: 25, missing: [] });
  });

  it('lists missing KPIs and nulls the score', () => {
    expect(
      expansionScore({
        growthPct: 80,
        loadFactorPct: null,
        congestionIdx: 40,
        scalePct: null,
      }),
    ).toEqual({
      score: null,
      growth: 80,
      pressure: null,
      scale: null,
      missing: ['loadFactorPct', 'scalePct'],
    });
  });
});

describe('seatGap', () => {
  it('is zero at exactly 80% load factor', () => {
    expect(seatGap(800, 1000)).toBe(0);
  });

  it('returns the seats needed to reach the target', () => {
    expect(seatGap(900, 1000)).toBe(125);
    expect(seatGap(1, 0)).toBe(1);
  });

  it('is zero for zero passengers and zero seats', () => {
    expect(seatGap(0, 0)).toBe(0);
  });
});

describe('longHaulShare', () => {
  it('counts departures at or above 3000 miles', () => {
    expect(
      longHaulShare([
        { distance: 2999, departures: 3 },
        { distance: 3000, departures: 1 },
        { distance: 5000, departures: 4 },
      ]),
    ).toEqual({ longHaul: 5, total: 8, share: 0.625 });
  });

  it('has a null share when there are no departures', () => {
    expect(longHaulShare([])).toEqual({ longHaul: 0, total: 0, share: null });
  });
});
