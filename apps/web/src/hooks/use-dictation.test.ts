import { describe, expect, it, vi } from 'vitest';
import { type Recognition, startRecognition } from './use-dictation';

class FakeRecognition implements Recognition {
  static last: FakeRecognition;
  lang = '';
  interimResults = false;
  continuous = true;
  onresult: Recognition['onresult'] = null;
  onerror: Recognition['onerror'] = null;
  onend: Recognition['onend'] = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
  constructor() {
    FakeRecognition.last = this;
  }
  // Mirrors the browser: event.results holds every result of the session so far.
  emit(...results: [string, boolean][]) {
    this.onresult?.({
      results: results.map(([transcript, isFinal]) =>
        Object.assign([{ transcript }], { isFinal }),
      ),
    });
  }
}

function setup(base: string) {
  const onText = vi.fn();
  const onError = vi.fn();
  const onEnd = vi.fn();
  startRecognition(FakeRecognition, base, { onText, onError, onEnd });
  return { rec: FakeRecognition.last, onText, onError, onEnd };
}

describe('startRecognition', () => {
  it('starts one-shot en-US recognition with interim results', () => {
    const { rec } = setup('');
    expect(rec).toMatchObject({
      lang: 'en-US',
      interimResults: true,
      continuous: false,
    });
    expect(rec.start).toHaveBeenCalledOnce();
  });

  it('appends interim text live, then replaces it with the final transcript', () => {
    const { rec, onText } = setup('Compare LAX');
    rec.emit(['and santa', false]);
    expect(onText).toHaveBeenLastCalledWith('Compare LAX and santa');
    rec.emit(['and Santa Ana', true]);
    expect(onText).toHaveBeenLastCalledWith('Compare LAX and Santa Ana');
  });

  it('adds no extra space to an empty or space-ended draft', () => {
    const empty = setup('');
    empty.rec.emit([' long haul at ANC', true]);
    expect(empty.onText).toHaveBeenLastCalledWith('long haul at ANC');
    const spaced = setup('Show ');
    spaced.rec.emit(['SFO', false]);
    expect(spaced.onText).toHaveBeenLastCalledWith('Show SFO');
  });

  it.each([
    [
      'not-allowed',
      'Microphone access is blocked. Allow it in the browser to dictate.',
      false,
    ],
    [
      'service-not-allowed',
      'Microphone access is blocked. Allow it in the browser to dictate.',
      false,
    ],
    [
      'network',
      "Voice input isn't available in this browser. Try Chrome or Safari.",
      true,
    ],
    ['audio-capture', 'Dictation stopped. Try again.', false],
  ])('maps %s to its message', (error, message, unavailable) => {
    const { rec, onError } = setup('');
    rec.onerror?.({ error });
    expect(onError).toHaveBeenCalledWith(message, unavailable);
  });

  it.each(['no-speech', 'aborted'])('ignores %s silently', (error) => {
    const { rec, onError } = setup('');
    rec.onerror?.({ error });
    expect(onError).not.toHaveBeenCalled();
  });

  it('reports the end of the session', () => {
    const { rec, onEnd } = setup('');
    rec.onend?.();
    expect(onEnd).toHaveBeenCalledOnce();
  });
});
