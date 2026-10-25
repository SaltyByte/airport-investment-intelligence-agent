import type { AppUIMessage } from '@app/shared';
import { type ChatStatus, isToolUIPart } from 'ai';
import type { ReactNode } from 'react';
import { AnswerSheet } from '@/components/answer-sheet';
import {
  FollowUps,
  isFollowUpsPart,
  latestFollowUps,
} from '@/components/chat/follow-ups';

// Separate text parts (e.g. the model's preamble and its answer) stay separate paragraphs.
export const textOf = (message: AppUIMessage) =>
  message.parts
    .flatMap((p) => (p.type === 'text' ? [p.text] : []))
    .join('\n\n');

function Message({
  message,
  pending,
  children,
}: {
  message: AppUIMessage;
  pending: boolean;
  children?: ReactNode;
}) {
  if (message.role === 'user') {
    return (
      <div className="ml-auto max-w-[85%] rounded-lg bg-secondary px-4 py-2.5 whitespace-pre-wrap wrap-anywhere motion-safe:animate-enter">
        {textOf(message)}
      </div>
    );
  }
  // Text before evidence: the prose fills Why; tool parts drive the title blocks and the tabs.
  const tools = message.parts.flatMap((p) =>
    isToolUIPart(p) && !isFollowUpsPart(p) ? [p] : [],
  );
  return (
    <div className="flex flex-col gap-3 motion-safe:animate-enter">
      <AnswerSheet text={textOf(message)} parts={tools} pending={pending} />
      {children}
    </div>
  );
}

export function MessageList({
  messages,
  status,
  onFollowUp,
}: {
  messages: AppUIMessage[];
  status: ChatStatus;
  onFollowUp: (question: string) => void;
}) {
  const questions = latestFollowUps(messages, status);
  const busy = status === 'submitted' || status === 'streaming';
  return messages.map((m, i) => {
    const last = i === messages.length - 1;
    return (
      <Message key={m.id} message={m} pending={last && busy}>
        {last && <FollowUps questions={questions} onSelect={onFollowUp} />}
      </Message>
    );
  });
}
