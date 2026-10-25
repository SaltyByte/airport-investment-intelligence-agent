import type { AppUIMessage } from '@app/shared';
import { isToolUIPart } from 'ai';
import { Markdown } from '@/components/markdown';
import { ResultCard } from '@/components/result-card';

export const textOf = (message: AppUIMessage) =>
  message.parts.flatMap((p) => (p.type === 'text' ? [p.text] : [])).join('\n');

function Message({ message }: { message: AppUIMessage }) {
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
        if (isToolUIPart(part)) {
          return <ResultCard key={key} part={part} />;
        }
        return null;
      })}
    </div>
  );
}

export function MessageList({ messages }: { messages: AppUIMessage[] }) {
  return messages.map((m) => <Message key={m.id} message={m} />);
}
