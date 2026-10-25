import { ArrowUp, Mic, MicOff, Square } from 'lucide-react';
import {
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
  useCallback,
  useEffect,
} from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useDictation } from '@/hooks/use-dictation';

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
  // Buttons that leave while focused would drop focus to <body>: the Stop button when a reply
  // ends (React reuses it as a disabled Send) and the mic when dictation turns out unavailable.
  // The ref cleanup hands focus to the input if the button held it.
  const focusInputOnDetach = useCallback(
    (node: HTMLButtonElement | null) => {
      return () => {
        if (node && document.activeElement === node) inputRef.current?.focus();
      };
    },
    [inputRef],
  );

  const dictation = useDictation(onChange);
  const { cancel: cancelDictation } = dictation;
  useEffect(() => {
    if (busy) cancelDictation();
  }, [busy, cancelDictation]);

  const send = () => {
    cancelDictation();
    onSend(value);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  return (
    <footer className="shrink-0 border-t bg-card pb-[env(safe-area-inset-bottom)]">
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
        {dictation.supported && (
          <Button
            ref={focusInputOnDetach}
            type="button"
            variant="outline"
            size="icon"
            className="relative size-11 aria-pressed:border-primary aria-pressed:text-primary motion-safe:active:scale-95"
            aria-label={
              dictation.listening ? 'Stop dictation' : 'Start dictation'
            }
            aria-pressed={dictation.listening}
            disabled={busy}
            onClick={() => dictation.toggle(value)}
          >
            {dictation.listening ? (
              <>
                <MicOff aria-hidden className="motion-safe:animate-swap" />
                <span
                  aria-hidden
                  className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive motion-safe:animate-pulse"
                />
              </>
            ) : (
              <Mic aria-hidden className="motion-safe:animate-swap" />
            )}
          </Button>
        )}
        {busy ? (
          <Button
            ref={focusInputOnDetach}
            type="button"
            size="icon"
            className="size-11 motion-safe:active:scale-95"
            aria-label="Stop response"
            onClick={() => {
              onStop();
              inputRef.current?.focus();
            }}
          >
            <Square
              aria-hidden
              className="fill-current motion-safe:animate-swap"
            />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            className="size-11 motion-safe:active:scale-95"
            aria-label="Send message"
            disabled={!value.trim()}
          >
            <ArrowUp aria-hidden className="motion-safe:animate-swap" />
          </Button>
        )}
      </form>
      {(dictation.supported || dictation.error) && (
        <p
          role="status"
          className="mx-auto max-w-[800px] px-4 text-sm text-muted-foreground"
        >
          {dictation.error && (
            <span className="-mt-1 block pb-3">{dictation.error}</span>
          )}
        </p>
      )}
    </footer>
  );
}
