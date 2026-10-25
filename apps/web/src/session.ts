import type { AppUIMessage } from '@app/shared';
import { isToolUIPart } from 'ai';

export const SESSION_KEY = 'aii.chat.v1';
const VERSION = 1;

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const isMessage = (m: unknown) =>
  typeof m === 'object' &&
  m !== null &&
  typeof (m as AppUIMessage).id === 'string' &&
  ['user', 'assistant', 'system'].includes((m as AppUIMessage).role) &&
  Array.isArray((m as AppUIMessage).parts);

export function loadSession(store?: Store): AppUIMessage[] {
  try {
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
