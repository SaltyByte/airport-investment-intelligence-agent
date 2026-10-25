import type { AppUIMessage } from '@app/shared';
import { type ChatStatus, isToolUIPart } from 'ai';
import { type ReactNode, useId } from 'react';
import { AnswerSheet } from '@/components/answer-sheet';
import {
  FollowUps,
  isFollowUpsPart,
  latestFollowUps,
} from '@/components/chat/follow-ups';

const textsOf = (message: AppUIMessage) =>
  message.parts.flatMap((p) => (p.type === 'text' ? [p.text] : []));

// Separate text parts (e.g. the model's preamble and its answer) stay separate paragraphs.
const textOf = (message: AppUIMessage) => textsOf(message).join('\n\n');

/**
 * The spoken summary of an answer: the verdict, i.e. the first paragraph of the last text part
 * (a preamble before a tool call is its own earlier part), without markdown marks.
 */
export function verdictOf(message: AppUIMessage) {
  const text = textsOf(message).findLast((t) => t.trim()) ?? '';
  const first = text
    .split(/\n\s*\n/)
    .find((block) => block.trim() && !/^\s*[#|]/.test(block));
  // shortcut: strips common markdown marks only; good enough for a spoken summary.
  return (first ?? '').replace(/:?-{3,}:?|[*_#`|]/g, '').trim();
}

function Answer({
  message,
  pending,
}: {
  message: AppUIMessage;
  pending: boolean;
}) {
  // Text before evidence: the prose fills Why; tool parts drive the title blocks and the tabs.
  const tools = message.parts.flatMap((p) =>
    isToolUIPart(p) && !isFollowUpsPart(p) ? [p] : [],
  );
  return (
    <div className="motion-safe:animate-enter">
      <AnswerSheet text={textOf(message)} parts={tools} pending={pending} />
    </div>
  );
}

type Turn = { id: string; question?: AppUIMessage; answers: AppUIMessage[] };

/** One question and its answers; the question is the h2 and sticks while its answer is in view. */
function TurnArticle({ turn, children }: { turn: Turn; children: ReactNode }) {
  const id = useId();
  const question = turn.question && textOf(turn.question);
  return (
    // The latest turn fills the scroll area, so its question can scroll to the top.
    <article
      aria-labelledby={question ? id : undefined}
      className="flex flex-col gap-3 last:min-h-[100cqh]"
    >
      {question && (
        <h2
          id={id}
          className="sticky top-0 z-10 flex gap-3 bg-background pt-3 pb-2 font-normal text-muted-foreground"
        >
          <span aria-hidden className="font-semibold text-foreground">
            Q
          </span>
          <span className="min-w-0 whitespace-pre-wrap wrap-anywhere">
            {question}
          </span>
        </h2>
      )}
      {children}
    </article>
  );
}

export function MessageList({
  messages,
  status,
  onFollowUp,
  tail,
}: {
  messages: AppUIMessage[];
  status: ChatStatus;
  onFollowUp: (question: string) => void;
  /** Rendered at the end of the latest turn: the typing indicator and the error. */
  tail: ReactNode;
}) {
  const questions = latestFollowUps(messages, status);
  const busy = status === 'submitted' || status === 'streaming';
  const turns: Turn[] = [];
  for (const m of messages) {
    const current = turns.at(-1);
    if (m.role !== 'user' && current) current.answers.push(m);
    else
      turns.push(
        m.role === 'user'
          ? { id: m.id, question: m, answers: [] }
          : { id: m.id, answers: [m] },
      );
  }
  return turns.map((turn, i) => {
    const last = i === turns.length - 1;
    return (
      <TurnArticle key={turn.id} turn={turn}>
        {turn.answers.map((m) => (
          <Answer
            key={m.id}
            message={m}
            pending={busy && m === messages.at(-1)}
          />
        ))}
        {last && (
          <>
            <FollowUps questions={questions} onSelect={onFollowUp} />
            {tail}
          </>
        )}
      </TurnArticle>
    );
  });
}
