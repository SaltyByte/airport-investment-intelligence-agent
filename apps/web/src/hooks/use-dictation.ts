import { useCallback, useEffect, useRef, useState } from 'react';

export interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult:
    | ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
    | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

const BLOCKED =
  'Microphone access is blocked. Allow it in the browser to dictate.';
const STOPPED = 'Dictation stopped. Try again.';
const UNAVAILABLE =
  "Voice input isn't available in this browser. Try Chrome or Safari.";

export function startRecognition(
  Ctor: RecognitionCtor,
  base: string,
  handlers: {
    onText: (text: string) => void;
    onError: (message: string, unavailable: boolean) => void;
    onEnd: () => void;
  },
): Recognition {
  const rec = new Ctor();
  rec.lang = 'en-US';
  rec.interimResults = true;
  rec.continuous = false;
  const prefix = base && !/\s$/.test(base) ? `${base} ` : base;
  rec.onresult = (e) =>
    handlers.onText(
      prefix +
        Array.from(e.results, (r) => r[0]?.transcript ?? '')
          .join('')
          .trim(),
    );
  rec.onerror = (e) => {
    if (e.error === 'no-speech' || e.error === 'aborted') return;
    if (e.error === 'network') return handlers.onError(UNAVAILABLE, true);
    handlers.onError(
      e.error === 'not-allowed' || e.error === 'service-not-allowed'
        ? BLOCKED
        : STOPPED,
      false,
    );
  };
  rec.onend = handlers.onEnd;
  rec.start();
  return rec;
}

function recognitionCtor(): RecognitionCtor | undefined {
  const w = window as unknown as Record<string, RecognitionCtor | undefined>;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function useDictation(onText: (text: string) => void) {
  const [Ctor] = useState(recognitionCtor);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  });

  const cancel = useCallback(() => {
    setError(null);
    const rec = recRef.current;
    if (!rec) return;
    rec.onresult = rec.onerror = rec.onend = null;
    rec.abort();
    recRef.current = null;
    setListening(false);
  }, []);
  useEffect(() => cancel, [cancel]);

  const toggle = (draft: string) => {
    if (recRef.current) {
      recRef.current.stop();
      return;
    }
    if (!Ctor) return;
    setError(null);
    try {
      recRef.current = startRecognition(Ctor, draft, {
        onText: (text) => onTextRef.current(text),
        onError: (message, isUnavailable) => {
          setError(message);
          if (isUnavailable) setUnavailable(true);
        },
        onEnd: () => {
          recRef.current = null;
          setListening(false);
        },
      });
      setListening(true);
    } catch {
      setError(STOPPED);
    }
  };

  return {
    supported: Boolean(Ctor) && !unavailable,
    listening,
    error,
    toggle,
    cancel,
  };
}
