import { describe, expect, it } from 'vitest';
import {
  extractNumbers,
  groundingPromptText,
  ungroundedNumbers,
} from './grounding';

describe('extractNumbers', () => {
  it('reads separators, decimals, %, ordinals and signs as plain values', () => {
    expect(
      extractNumbers('1,234,567 seats, 46.7% share, ranked 94th, −3.2 and -8'),
    ).toEqual([1234567, 46.7, 94, 3.2, 8]);
  });

  it('reads digits inside tokens, "15+" and ranges, not trailing dots', () => {
    expect(
      extractNumbers('CY2025 data, 15+ min, Aug 2025–Jul 2026. Done 12.'),
    ).toEqual([2025, 15, 2025, 2026, 12]);
  });

  it('keeps a comma list apart and reads nothing from plain words', () => {
    expect(extractNumbers('scores 1,2 and 3')).toEqual([1, 2, 3]);
    expect(extractNumbers('no numbers here')).toEqual([]);
  });
});

describe('ungroundedNumbers', () => {
  const tool = JSON.stringify({ share: 46.7, seats: 1234567, rank: 94 });

  it('passes numbers found in any allowed text, by value', () => {
    expect(
      ungroundedNumbers('46.7% of 1,234,567 seats; 94th; 15+ min', [
        tool,
        'delays of 15 minutes or more',
      ]),
    ).toEqual([]);
  });

  it('returns each number missing from every allowed text once', () => {
    expect(ungroundedNumbers('47% then 47% and 46.7 and 12', [tool])).toEqual([
      47, 12,
    ]);
  });
});

describe('groundingPromptText', () => {
  const prompt = [
    '# Scope\nscope 7',
    '# Readings of places and terms\nlong-haul 3,000 mi',
    '# Methodology and data\n516 peers',
    '# Grounding\nwrite 1,622,026',
  ].join('\n');

  it('keeps Readings through Methodology, not the Grounding examples', () => {
    const text = groundingPromptText(prompt);
    expect(extractNumbers(text)).toEqual([3000, 516]);
  });

  it('throws when a section header is missing', () => {
    expect(() => groundingPromptText('# Grounding\n1')).toThrow(/Readings/);
    expect(() =>
      groundingPromptText('# Readings of places and terms\n1'),
    ).toThrow(/Grounding/);
  });
});
