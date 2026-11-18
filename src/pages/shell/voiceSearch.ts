import { useCallback, useEffect, useRef, useState } from 'react';

// Speech for the search field (board x-idea-khmit): the browser's own recognition in Georgian, words shown as they come,
// the final result handed to the page. Where the browser has none, `voiceSupported()` is false and the mic is not drawn.

interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => RecognitionLike;

const ctorOf = (): RecognitionCtor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export const voiceSupported = () => ctorOf() !== null;

export type VoiceState = 'idle' | 'listening' | 'error';

/** a short Georgian line for a recognition error code */
export const voiceErrorText = (code: string): string => {
  if (code === 'not-allowed' || code === 'service-not-allowed') return 'მიკროფონი არ არის დაშვებული. ჩართე ბრაუზერის პარამეტრებში.';
  if (code === 'audio-capture') return 'მიკროფონი ვერ ვიპოვე.';
  if (code === 'network') return 'ამოცნობა ვერ მოხერხდა. შეამოწმე ინტერნეტი.';
  return 'ვერაფერი გავიგე. სცადე უფრო ხმამაღლა.';
};

export const useVoiceSearch = (onFinal: (text: string) => void) => {
  const [state, setState] = useState<VoiceState>('idle');
  const [heard, setHeard] = useState('');
  const [error, setError] = useState('');
  const rec = useRef<RecognitionLike | null>(null);
  const final = useRef(onFinal);
  final.current = onFinal;

  const stop = useCallback(() => {
    const r = rec.current;
    rec.current = null;
    if (r) { r.onresult = null; r.onerror = null; r.onend = null; try { r.abort(); } catch { /* already over */ } }
    setState('idle');
  }, []);

  const start = useCallback(() => {
    const Ctor = ctorOf();
    if (!Ctor) return;
    stop();
    const r = new Ctor();
    r.lang = 'ka-GE';
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;
    let got = '';
    let done = false;
    setHeard('');
    setError('');
    setState('listening');
    r.onresult = e => {
      let text = '';
      let isFinal = false;
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0]?.transcript ?? '';
        if (e.results[i].isFinal) isFinal = true;
      }
      got = text.trim();
      setHeard(got);
      if (isFinal && got && !done) { done = true; rec.current = null; setState('idle'); final.current(got); }
    };
    r.onerror = e => {
      if (done || e.error === 'aborted') return;
      done = true;
      rec.current = null;
      setError(voiceErrorText(e.error));
      setState('error');
    };
    r.onend = () => {
      if (done) return;
      done = true;
      rec.current = null;
      // it ended with words not yet called final: take them; with none, say so
      if (got) { setState('idle'); final.current(got); } else { setError(voiceErrorText('no-speech')); setState('error'); }
    };
    rec.current = r;
    try { r.start(); } catch { setError(voiceErrorText('audio-capture')); setState('error'); }
  }, [stop]);

  useEffect(() => () => { const r = rec.current; if (r) { r.onresult = null; r.onerror = null; r.onend = null; try { r.abort(); } catch { /* gone */ } } }, []);

  return { state, heard, error, start, stop };
};
