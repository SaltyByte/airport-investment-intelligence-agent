import { SuggestFollowUpsInput } from '@app/shared';
import { describe, expect, it } from 'vitest';

const ok = (questions: string[]) =>
  SuggestFollowUpsInput.safeParse({ questions }).success;

describe('SuggestFollowUpsInput', () => {
  it('accepts 2 or 3 non-empty questions and trims them', () => {
    expect(ok(['A?', 'B?'])).toBe(true);
    expect(ok(['A?', 'B?', 'C?'])).toBe(true);
    expect(SuggestFollowUpsInput.parse({ questions: [' A? ', 'B?'] })).toEqual({
      questions: ['A?', 'B?'],
    });
  });

  it('rejects 1 or 4 questions, empty strings and over-long questions', () => {
    expect(ok(['A?'])).toBe(false);
    expect(ok(['A?', 'B?', 'C?', 'D?'])).toBe(false);
    expect(ok(['A?', ''])).toBe(false);
    expect(ok(['A?', '   '])).toBe(false);
    expect(ok(['A?', 'x'.repeat(121)])).toBe(false);
  });
});
