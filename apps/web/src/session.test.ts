import type { AppUIMessage } from '@app/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadSession, SESSION_KEY, saveSession } from './session';

class MemoryStorage {
  items = new Map<string, string>();
  getItem = (k: string) => this.items.get(k) ?? null;
  setItem = (k: string, v: string) => void this.items.set(k, v);
  removeItem = (k: string) => void this.items.delete(k);
}

const conversation: AppUIMessage[] = [
  {
    id: 'u1',
    role: 'user',
    parts: [{ type: 'text', text: 'Rank New England' }],
  },
  {
    id: 'a1',
    role: 'assistant',
    parts: [{ type: 'text', text: 'Bangor leads.' }],
  },
];

let storage: MemoryStorage;
beforeEach(() => {
  storage = new MemoryStorage();
});

describe('session', () => {
  it('round-trips a conversation', () => {
    saveSession(conversation, storage);
    expect(loadSession(storage)).toEqual(conversation);
  });

  it('starts empty when nothing is stored', () => {
    expect(loadSession(storage)).toEqual([]);
  });

  it('starts empty on corrupt JSON', () => {
    storage.setItem(SESSION_KEY, '{not json');
    expect(loadSession(storage)).toEqual([]);
  });

  it('starts empty on another version', () => {
    storage.setItem(
      SESSION_KEY,
      JSON.stringify({ v: 0, messages: conversation }),
    );
    expect(loadSession(storage)).toEqual([]);
  });

  it('starts empty when the messages are not message-shaped', () => {
    storage.setItem(
      SESSION_KEY,
      JSON.stringify({ v: 1, messages: [{ id: 'x', role: 'user' }] }),
    );
    expect(loadSession(storage)).toEqual([]);
  });

  it('New chat (an empty conversation) clears the stored one', () => {
    saveSession(conversation, storage);
    saveSession([], storage);
    expect(storage.getItem(SESSION_KEY)).toBeNull();
    expect(loadSession(storage)).toEqual([]);
  });

  it('drops tool calls that never finished, and an answer left with nothing', () => {
    type Part = AppUIMessage['parts'][number];
    const unfinished = (toolCallId: string): Part => ({
      type: 'tool-compareCongestion',
      toolCallId,
      state: 'input-available',
      input: { airports: ['LAX', 'SNA'] },
    });
    const finished: Part = {
      type: 'tool-compareCongestion',
      toolCallId: 't0',
      state: 'output-error',
      input: { airports: ['LAX', 'SNA'] },
      errorText: 'boom',
    };
    const question: AppUIMessage = {
      id: 'u2',
      role: 'user',
      parts: [{ type: 'text', text: 'Compare LAX and SNA' }],
    };
    const stopped: AppUIMessage = {
      id: 'a2',
      role: 'assistant',
      parts: [{ type: 'step-start' }, unfinished('t1')],
    };
    const mixed: AppUIMessage = {
      id: 'a3',
      role: 'assistant',
      parts: [finished, unfinished('t2')],
    };
    saveSession([...conversation, question, stopped, mixed], storage);
    expect(loadSession(storage)).toEqual([
      ...conversation,
      question,
      { ...mixed, parts: [finished] },
    ]);
  });
});

describe('session with blocked storage', () => {
  // Cookies blocked or a sandboxed iframe: touching window.sessionStorage throws.
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'sessionStorage');
  });

  it('loads an empty chat and saves without throwing', () => {
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      get() {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    });
    expect(loadSession()).toEqual([]);
    expect(() => saveSession(conversation)).not.toThrow();
  });
});
