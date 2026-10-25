import { useChat } from '@ai-sdk/react';
import type { AppUIMessage } from '@app/shared';
import { useRef, useState } from 'react';
import { ChatError } from '@/components/chat/chat-error';
import { ChatHeader } from '@/components/chat/chat-header';
import { Composer } from '@/components/chat/composer';
import { EmptyState } from '@/components/chat/empty-state';
import { MessageList, textOf } from '@/components/chat/message-list';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { useStickToBottom } from '@/hooks/use-stick-to-bottom';

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
  const { scrollRef, onScroll, reattach } = useStickToBottom(
    messages,
    status,
    error,
  );
  const busy = status === 'submitted' || status === 'streaming';

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    reattach();
    setAnnouncement('');
    sendMessage({ text: trimmed });
    setInput('');
    inputRef.current?.focus();
  };

  const retry = () => {
    reattach();
    setAnnouncement('');
    regenerate();
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-dvh flex-col">
      <ChatHeader />

      <main
        ref={scrollRef}
        onScroll={onScroll}
        className="relative min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable_both-edges]"
      >
        <div className="mx-auto flex max-w-[1040px] flex-col gap-6 px-4 py-6">
          {messages.length === 0 ? (
            <EmptyState onSelect={send} />
          ) : (
            <MessageList
              messages={messages}
              status={status}
              onFollowUp={send}
            />
          )}
          {busy && <TypingIndicator />}
          {error && <ChatError message={error.message} onRetry={retry} />}
        </div>
      </main>

      <Composer
        inputRef={inputRef}
        value={input}
        onChange={setInput}
        onSend={send}
        busy={busy}
        onStop={stop}
      />

      <div role="status" aria-live="polite" className="sr-only">
        {busy ? 'Assistant is responding' : announcement}
      </div>
    </div>
  );
}
