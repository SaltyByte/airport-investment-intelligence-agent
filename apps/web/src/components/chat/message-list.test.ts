import type { AppUIMessage } from '@app/shared';
import { describe, expect, it } from 'vitest';
import { verdictOf } from './message-list';

const answer = (...texts: string[]): AppUIMessage => ({
  id: 'a',
  role: 'assistant',
  parts: texts.map((text) => ({ type: 'text', text })),
});

describe('verdictOf', () => {
  it('announces only the first paragraph, without markdown marks', () => {
    expect(
      verdictOf(
        answer(
          '**Bangor** leads New England.\n\n## Why\n\nGrowth is strong.\n\n| a | b |',
        ),
      ),
    ).toBe('Bangor leads New England.');
  });

  it('skips a preamble sent before the tool call', () => {
    expect(
      verdictOf(
        answer('Let me look that up.', 'LAX is more congested than SNA.'),
      ),
    ).toBe('LAX is more congested than SNA.');
  });

  it('is empty when the answer has no text', () => {
    expect(verdictOf(answer())).toBe('');
  });
});
