import { useChat } from '@ai-sdk/react';
import type { AppUIMessage } from '@app/shared';
import { ArrowUp, RotateCcw, Square } from 'lucide-react';
import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { AirportCard } from '@/components/airport-card';
import { Markdown } from '@/components/markdown';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const EXAMPLES = [
  'Which airports in New England are strong candidates for terminal expansion?',
  'Compare LA and Santa Ana airport congestion levels.',
  'What is the percentage of long haul flights out of Anchorage airport?',
  'What is the unmet flight demand in SFO airport and why?',
];

const textOf = (message: AppUIMessage) =>
  message.parts.flatMap((p) => (p.type === 'text' ? [p.text] : [])).join('\n');

// Network failures (browser) and proxy failures (Vite 5xx with empty body) get one plain message;
// HTTP error bodies (JSON) are never shown raw. Model/stream errors arrive as readable text.
function errorCopy(message: string) {
  if (
    message === '' ||
    message === 'Failed to fetch' ||
    message === 'Failed to fetch the chat response.'
  )
    return 'Could not reach the server. Check that it is running, then retry.';
  if (message.trimStart().startsWith('{'))
    return 'The server could not process this request.';
  return message;
}

function Message({ message }: { message: AppUIMessage }) {
  if (message.role === 'user') {
    return (
      <div className="ml-auto max-w-[85%] rounded-xl bg-secondary px-4 py-2.5 whitespace-pre-wrap wrap-anywhere">
        {textOf(message)}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {message.parts.map((part, i) => {
        const key = `${message.id}-${i}`;
        if (part.type === 'text') {
          return <Markdown key={key} text={part.text} />;
        }
        if (part.type === 'tool-getAirport') {
          return <AirportCard key={key} part={part} />;
        }
        return null;
      })}
    </div>
  );
}

export function App() {
  const [announcement, setAnnouncement] = useState('');
  const { messages, sendMessage, status, error, regenerate, stop } =
    useChat<AppUIMessage>({
      // Announce each finished reply once (works for buffered streams too); errors are announced by the alert.
      onFinish: ({ message, isError, isAbort }) => {
        if (isError) setAnnouncement('');
        else if (isAbort) setAnnouncement('Response stopped');
        else if (message.role === 'assistant')
          // shortcut: strips common markdown marks only; good enough for a spoken summary.
          setAnnouncement(textOf(message).replace(/:?-{3,}:?|[*_#`|]/g, ''));
      },
    });
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLElement>(null);
  const stickToBottom = useRef(true);
  const lastScrollTop = useRef(0);
  const busy = status === 'submitted' || status === 'streaming';

  // Any upward scroll (wheel, touch, scrollbar drag, track click, keys) away from the bottom
  // detaches auto-follow; returning to the bottom re-attaches it. Content growth never moves
  // scrollTop, so it is not mistaken for the reader scrolling.
  const updateFollow = (el: HTMLElement) => {
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distance < 48) stickToBottom.current = true;
    else if (el.scrollTop < lastScrollTop.current)
      stickToBottom.current = false;
    lastScrollTop.current = el.scrollTop;
  };

  // Follow new output before paint. Re-check direction first: a commit can land before the
  // scroll event of a scroll the reader just made, and must not snap it back.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run whenever content changes
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateFollow(el);
    if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
      lastScrollTop.current = el.scrollTop;
    }
  }, [messages, status, error]);

  // When a reply ends React reuses this same <button> as the Send button and detaches the ref.
  // Send is disabled while the input is empty, which would drop focus to <body>, so the ref
  // cleanup hands focus to the input if the button held it.
  const stopButtonRef = useCallback((node: HTMLButtonElement | null) => {
    return () => {
      if (node && document.activeElement === node) inputRef.current?.focus();
    };
  }, []);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    stickToBottom.current = true;
    setAnnouncement('');
    sendMessage({ text: trimmed });
    setInput('');
    inputRef.current?.focus();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="flex h-dvh flex-col">
      <header className="shrink-0 border-b">
        <div className="mx-auto flex h-14 max-w-[800px] items-center px-4">
          <h1 className="font-semibold">Airport Investment Intelligence</h1>
        </div>
      </header>

      <main
        ref={scrollRef}
        onScroll={(e) => updateFollow(e.currentTarget)}
        className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable_both-edges]"
      >
        <div className="mx-auto flex max-w-[800px] flex-col gap-6 px-4 py-6">
          {messages.length === 0 ? (
            <section
              aria-labelledby="empty-title"
              className="flex flex-col gap-4 pt-[8vh]"
            >
              <h2
                id="empty-title"
                className="text-balance font-semibold text-xl"
              >
                Ask about US airport investment opportunities
              </h2>
              <ul className="flex flex-col gap-2">
                {EXAMPLES.map((q) => (
                  <li key={q}>
                    <Button
                      variant="outline"
                      className="h-auto min-h-11 w-full justify-start py-2.5 text-left whitespace-normal"
                      onClick={() => send(q)}
                    >
                      {q}
                    </Button>
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground text-sm">
                Covers US airports using public data. Figures are estimates,
                each shown with its as-of date.
              </p>
            </section>
          ) : (
            messages.map((m) => <Message key={m.id} message={m} />)
          )}

          {busy && (
            <p className="flex items-center gap-2 text-muted-foreground text-sm">
              <span
                aria-hidden
                className="size-2 animate-pulse rounded-full bg-foreground motion-reduce:animate-none"
              />
              Working on it
            </p>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTitle>No reply received</AlertTitle>
              {/* Full foreground: shadcn's destructive/90 text falls just under 4.5:1. */}
              <AlertDescription className="text-foreground!">
                <p className="wrap-anywhere">{errorCopy(error.message)}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1 h-11 text-foreground"
                  onClick={() => {
                    stickToBottom.current = true;
                    setAnnouncement('');
                    regenerate();
                    inputRef.current?.focus();
                  }}
                >
                  <RotateCcw aria-hidden />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </main>

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
            value={input}
            onChange={(e) => setInput(e.target.value)}
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
                stop();
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
              disabled={!input.trim()}
            >
              <ArrowUp aria-hidden />
            </Button>
          )}
        </form>
      </footer>

      <div role="status" aria-live="polite" className="sr-only">
        {busy ? 'Assistant is responding' : announcement}
      </div>
    </div>
  );
}
