import { ArrowUp, Square } from 'lucide-react';
import {
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
  useCallback,
} from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function Composer({
  inputRef,
  value,
  onChange,
  onSend,
  busy,
  onStop,
}: {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  onSend: (text: string) => void;
  busy: boolean;
  onStop: () => void;
}) {
  // When a reply ends React reuses this same <button> as the Send button and detaches the ref.
  // Send is disabled while the input is empty, which would drop focus to <body>, so the ref
  // cleanup hands focus to the input if the button held it.
  const stopButtonRef = useCallback(
    (node: HTMLButtonElement | null) => {
      return () => {
        if (node && document.activeElement === node) inputRef.current?.focus();
      };
    },
    [inputRef],
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSend(value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onSend(value);
    }
  };

  return (
    <footer className="shrink-0 border-t bg-background pb-[env(safe-area-inset-bottom)]">
      <form
        onSubmit={onSubmit}
        className="mx-auto flex max-w-[800px] items-end gap-2 px-4 py-3"
      >
        <label htmlFor="chat-input" className="sr-only">
          Ask a question about US airports
        </label>
        <Textarea
          id="chat-input"
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about a US airport"
          rows={1}
          className="max-h-40 min-h-11 resize-none"
          autoFocus
        />
        {busy ? (
          <Button
            ref={stopButtonRef}
            type="button"
            size="icon"
            className="size-11"
            aria-label="Stop response"
            onClick={() => {
              onStop();
              inputRef.current?.focus();
            }}
          >
            <Square aria-hidden className="fill-current" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            className="size-11"
            aria-label="Send message"
            disabled={!value.trim()}
          >
            <ArrowUp aria-hidden />
          </Button>
        )}
      </form>
    </footer>
  );
}
