import type { AppUIMessage } from '@app/shared';
import type { ChatStatus } from 'ai';
import { Button } from '@/components/ui/button';

type Part = AppUIMessage['parts'][number];

// Typed parts plus the dynamic-tool shape an input that failed validation arrives as.
export const isFollowUpsPart = (part: Part) =>
  part.type === 'tool-suggestFollowUps' ||
  (part.type === 'dynamic-tool' && part.toolName === 'suggestFollowUps');

/** Questions to offer: only from the last message, only once it is a settled assistant answer. */
export function latestFollowUps(
  messages: AppUIMessage[],
  status: ChatStatus,
): string[] {
  const last = messages.at(-1);
  if (status !== 'ready' || last?.role !== 'assistant') return [];
  for (const part of last.parts.toReversed()) {
    if (
      part.type === 'tool-suggestFollowUps' &&
      part.state === 'output-available'
    )
      return part.output.questions;
  }
  return [];
}

export function FollowUps({
  questions,
  onSelect,
}: {
  questions: string[];
  onSelect: (question: string) => void;
}) {
  if (questions.length === 0) return null;
  return (
    <ul
      aria-label="Follow-up questions"
      className="flex flex-col gap-2 motion-safe:animate-fade-in md:flex-row md:flex-wrap"
    >
      {questions.map((q) => (
        <li key={q} className="min-w-0">
          <Button
            variant="outline"
            className="h-auto min-h-11 w-full justify-start bg-card py-2.5 text-left text-sm whitespace-normal motion-safe:active:scale-[0.99] md:w-auto"
            onClick={() => onSelect(q)}
          >
            {q}
          </Button>
        </li>
      ))}
    </ul>
  );
}
