import { useChat } from '@ai-sdk/react';
import type { AppUIMessage } from '@app/shared';
import { cn } from 'cn';
import { useEffect, useRef, useState } from 'react';
import { ChatError } from '@/components/chat/chat-error';
import { ChatHeader } from '@/components/chat/chat-header';
import { column } from '@/components/chat/column';
import { Composer } from '@/components/chat/composer';
import { EmptyState } from '@/components/chat/empty-state';
import { MessageList, verdictOf } from '@/components/chat/message-list';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { useAnchorLatestQuestion } from '@/hooks/use-anchor-latest-question';
import { loadSession, saveSession } from '@/session';

export function App() {
  const [announcement, setAnnouncement] = useState('');
  const [savedMessages] = useState(() => loadSession());
  const resetting = useRef(false);
  const {
    messages,
    setMessages,
    sendMessage,
    status,
    error,
    clearError,
    regenerate,
    stop,
  } = useChat<AppUIMessage>({
    messages: savedMessages,
    onFinish: ({ message, isError, isAbort }) => {
      if (resetting.current) resetting.current = false;
      else if (isError) setAnnouncement('');
      else if (isAbort) setAnnouncement('Response stopped');
      else if (message.role === 'assistant')
        setAnnouncement(verdictOf(message));
    },
  });
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busy = status === 'submitted' || status === 'streaming';
  const scrollRef = useAnchorLatestQuestion(
    messages.filter((m) => m.role === 'user').length,
  );

  // Saved once a reply has settled cleanly (finished or stopped), not on every streamed chunk. A
  // failed send is not saved, so a reload never restores a question without its Retry.
  useEffect(() => {
    if (status === 'ready') saveSession(messages);
  }, [messages, status]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    // A New chat clicked just after the last reply settled left the flag set; this reply is new.
    resetting.current = false;
    setAnnouncement('');
    sendMessage({ text: trimmed });
    setInput('');
    inputRef.current?.focus();
  };

  const retry = () => {
    setAnnouncement('');
    regenerate();
    inputRef.current?.focus();
  };

  const newChat = () => {
    if (busy) {
      resetting.current = true;
      stop();
    }
    clearError();
    setMessages([]);
    setInput('');
    setAnnouncement('');
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-dvh flex-col">
      <ChatHeader busy={busy} onAsk={send} onNewChat={newChat} />

      <main
        ref={scrollRef}
        className="relative min-h-0 flex-1 overflow-y-auto [container-type:size] [scrollbar-gutter:stable_both-edges]"
      >
        <div className={cn(column, 'flex flex-col gap-10 pb-6')}>
          {messages.length === 0 ? (
            <EmptyState onSelect={send} />
          ) : (
            <MessageList
              messages={messages}
              status={status}
              onFollowUp={send}
              tail={
                <>
                  {busy && <TypingIndicator />}
                  {error && <ChatError onRetry={retry} />}
                </>
              }
            />
          )}
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
