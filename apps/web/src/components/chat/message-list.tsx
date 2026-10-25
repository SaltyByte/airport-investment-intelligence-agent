import type { AppUIMessage } from '@app/shared';
import { type ChatStatus, isToolUIPart } from 'ai';
import type { ReactNode } from 'react';
import {
  FollowUps,
  isFollowUpsPart,
  latestFollowUps,
} from '@/components/chat/follow-ups';
import { Markdown } from '@/components/markdown';
import { ResultCard } from '@/components/result-card';

export const textOf = (message: AppUIMessage) =>
  message.parts.flatMap((p) => (p.type === 'text' ? [p.text] : [])).join('\n');

function Message({
  message,
  children,
}: {
  message: AppUIMessage;
  children?: ReactNode;
}) {
  if (message.role === 'user') {
    return (
      <div className="ml-auto max-w-[85%] rounded-xl bg-secondary px-4 py-2.5 whitespace-pre-wrap wrap-anywhere motion-safe:animate-enter">
        {textOf(message)}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 motion-safe:animate-enter">
      {message.parts.map((part, i) => {
        const key = `${message.id}-${i}`;
        if (part.type === 'text') {
          return <Markdown key={key} text={part.text} />;
        }
        if (isFollowUpsPart(part)) return null;
        if (isToolUIPart(part)) {
          return <ResultCard key={key} part={part} />;
        }
        return null;
      })}
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
  return messages.map((m, i) => (
    <Message key={m.id} message={m}>
      {i === messages.length - 1 && (
        <FollowUps questions={questions} onSelect={onFollowUp} />
      )}
    </Message>
  ));
}
