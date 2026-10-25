import type { AppUIMessage } from '@app/shared';
import { describe, expect, it } from 'vitest';
import { isFollowUpsPart, latestFollowUps } from './follow-ups';

const QS = ['What about Boston?', 'How does that compare to 2019?'];

const user = (id: string, text: string): AppUIMessage => ({
  id,
  role: 'user',
  parts: [{ type: 'text', text }],
});

const answer = (
  id: string,
  suggest: AppUIMessage['parts'][number] | null,
): AppUIMessage => ({
  id,
  role: 'assistant',
  parts: [{ type: 'text', text: 'Answer.' }, ...(suggest ? [suggest] : [])],
});

const suggest = (questions: string[]) =>
  ({
    type: 'tool-suggestFollowUps',
    toolCallId: `call-${questions[0]}`,
    state: 'output-available',
    input: { questions },
    output: { questions },
  }) as AppUIMessage['parts'][number];

describe('latestFollowUps', () => {
  const convo = [
    user('u1', 'q1'),
    answer('a1', suggest(['Old one?', 'Old two?'])),
    user('u2', 'q2'),
    answer('a2', suggest(QS)),
  ];

  it('returns the latest answer questions when ready', () => {
    expect(latestFollowUps(convo, 'ready')).toEqual(QS);
  });

  it.each(['submitted', 'streaming', 'error'] as const)(
    'returns nothing while %s',
    (status) => {
      expect(latestFollowUps(convo, status)).toEqual([]);
    },
  );

  it('never falls back to an older answer', () => {
    expect(latestFollowUps([...convo, user('u3', 'q3')], 'ready')).toEqual([]);
    expect(
      latestFollowUps([...convo.slice(0, 3), answer('a2', null)], 'ready'),
    ).toEqual([]);
  });

  it('ignores suggest parts that are not output-available', () => {
    const failed = {
      type: 'tool-suggestFollowUps',
      toolCallId: 'bad',
      state: 'output-error',
      input: { questions: QS },
      errorText: 'Invalid input',
    } as AppUIMessage['parts'][number];
    expect(latestFollowUps([answer('a', failed)], 'ready')).toEqual([]);
  });
});

describe('isFollowUpsPart', () => {
  it('matches typed and dynamic suggest parts only', () => {
    expect(isFollowUpsPart(suggest(QS))).toBe(true);
    expect(
      isFollowUpsPart({
        type: 'dynamic-tool',
        toolName: 'suggestFollowUps',
        toolCallId: 'x',
        state: 'output-error',
        input: {},
        errorText: 'bad',
      }),
    ).toBe(true);
    expect(isFollowUpsPart({ type: 'text', text: 'hi' })).toBe(false);
  });
});
