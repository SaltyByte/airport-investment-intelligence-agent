import type { AppUIMessage } from '@app/shared';
import { isToolUIPart } from 'ai';

// Versioned: a future shape change bumps the key's version and old data is dropped, not parsed.
export const SESSION_KEY = 'aii.chat.v1';
const VERSION = 1;

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const isMessage = (m: unknown) =>
  typeof m === 'object' &&
  m !== null &&
  typeof (m as AppUIMessage).id === 'string' &&
  ['user', 'assistant', 'system'].includes((m as AppUIMessage).role) &&
  Array.isArray((m as AppUIMessage).parts);

/** The conversation saved in this browser tab, or [] when there is none or it can't be read. */
export function loadSession(store?: Store): AppUIMessage[] {
  try {
    // Inside the try: reading window.sessionStorage itself throws when storage is blocked.
    const raw = (store ?? sessionStorage).getItem(SESSION_KEY);
    const saved = JSON.parse(raw ?? 'null');
    return saved?.v === VERSION &&
      Array.isArray(saved.messages) &&
      saved.messages.every(isMessage)
      ? saved.messages
      : [];
  } catch {
    return [];
  }
}

// A tool call stopped before its result would reload as a permanent loading block and go back to
// the model unanswered; it is dropped, and so is an answer left with nothing to show.
const settled = (message: AppUIMessage): AppUIMessage | null => {
  if (message.role !== 'assistant') return message;
  const parts = message.parts.filter(
    (p) =>
      !isToolUIPart(p) ||
      p.state === 'output-available' ||
      p.state === 'output-error' ||
      p.state === 'output-denied',
  );
  return parts.some((p) => p.type !== 'step-start')
    ? { ...message, parts }
    : null;
};

/** Saves the conversation; an empty one (New chat) removes it. */
export function saveSession(messages: AppUIMessage[], store?: Store) {
  try {
    const target = store ?? sessionStorage;
    if (messages.length === 0) target.removeItem(SESSION_KEY);
    else
      target.setItem(
        SESSION_KEY,
        JSON.stringify({
          v: VERSION,
          messages: messages.flatMap((m) => settled(m) ?? []),
        }),
      );
  } catch {
    // Storage full or blocked (private mode): the chat still works, it just won't survive a reload.
  }
}
