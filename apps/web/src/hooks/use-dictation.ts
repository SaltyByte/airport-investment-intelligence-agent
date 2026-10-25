import { useCallback, useEffect, useRef, useState } from 'react';

// The subset of the Web Speech API we use; TypeScript's DOM lib does not ship these types.
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

/** Starts one utterance; every result reports the draft `base` plus everything heard so far. */
export function startRecognition(
  Ctor: RecognitionCtor,
  base: string,
  handlers: {
    onText: (text: string) => void;
    onError: (message: string) => void;
    onEnd: () => void;
  },
): Recognition {
  const rec = new Ctor();
  rec.lang = 'en-US';
  rec.interimResults = true;
  rec.continuous = false;
  const prefix = base && !/\s$/.test(base) ? `${base} ` : base;
  // Results accumulate per session, so re-joining them replaces interim text with the final one.
  rec.onresult = (e) =>
    handlers.onText(
      prefix +
        Array.from(e.results, (r) => r[0]?.transcript ?? '')
          .join('')
          .trim(),
    );
  rec.onerror = (e) => {
    if (e.error === 'no-speech' || e.error === 'aborted') return;
    handlers.onError(
      e.error === 'not-allowed' || e.error === 'service-not-allowed'
        ? BLOCKED
        : STOPPED,
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

/** Browser speech-to-text into a draft. `toggle(draft)` starts or stops; `cancel` drops the session. */
export function useDictation(onText: (text: string) => void) {
  const [Ctor] = useState(recognitionCtor);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      recRef.current.stop(); // delivers the final transcript, then ends
      return;
    }
    if (!Ctor) return;
    setError(null);
    try {
      recRef.current = startRecognition(Ctor, draft, {
        onText: (text) => onTextRef.current(text),
        onError: setError,
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

  return { supported: Boolean(Ctor), listening, error, toggle, cancel };
}
