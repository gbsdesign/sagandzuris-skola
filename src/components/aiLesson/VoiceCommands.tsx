import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Mic } from 'lucide-react';
import { Card, SectionLabel, cx } from '../ui2';
import { VOICE_COMMANDS, commandSay, matchCommand, type VoiceCommandId } from '../../utils/voiceCommands';
import { onTeacherTalking, teacherTalking } from '../../utils/teacherVoice';

// „ხმით მართვა“ (board x-ai-brdzaneba): the browser's own speech recognition in Georgian listens for five commands —
// „კიდევ ერთხელ“, „ნელა“, „შემდეგი“, „მომასმენინე“, „შეჩერდი“ — only in a pause: never while something plays, a take
// records or the teacher talks (so it never mixes into the singing), never in church mode or a call (the lesson decides
// `on`). It starts again after each result and stops when the lesson closes. The switch is kept on the device.
// The same recogniser, once, fills „ჰკითხე“'s field (`useSpeechOnce`).

interface Alternative { transcript: string }
interface RecognitionLike {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start: () => void; stop: () => void; abort: () => void;
  onresult: ((e: { resultIndex?: number; results: ArrayLike<ArrayLike<Alternative> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => RecognitionLike;

const ctorOf = (): RecognitionCtor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
export const speechSupported = () => ctorOf() !== null;

const quiet = (r: RecognitionLike | null) => {
  if (!r) return;
  r.onresult = null; r.onerror = null; r.onend = null;
  try { r.abort(); } catch { /* already over */ }
};

const errorWord = (code: string) =>
  code === 'not-allowed' || code === 'service-not-allowed' ? 'მიკროფონს ნება არ აქვს — ხმით მართვა ვერ ჩაირთო.'
    : code === 'audio-capture' ? 'მიკროფონი ვერ ვიპოვე.'
      : 'ხმის ამოცნობას ინტერნეტი სჭირდება.';

// ---- the switch (the device) -----------------------------------------------------------------------------------------

const KEY = 'sg-ai-voice-cmd';
let cmdOn = (() => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } })();
const cmdListeners = new Set<() => void>();
const subCmd = (l: () => void) => { cmdListeners.add(l); return () => { cmdListeners.delete(l); }; };
export const setVoiceCommandsOn = (on: boolean) => {
  cmdOn = on;
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* for this visit */ }
  cmdListeners.forEach(l => l());
};
export const useVoiceCommandsOn = () => useSyncExternalStore(subCmd, () => cmdOn);

// ---- listening for commands ----------------------------------------------------------------------------------------

export interface Heard { id: VoiceCommandId; effect: string; at: number }
export type ListenState = 'off' | 'listening' | 'waiting' | 'error';

/**
 * Listens while `on` and nothing is `busy`; a heard command runs `run`, whose answer is the effect line shown under
 * „გავიგე“. `heard` stays 3.5 seconds.
 */
export const useVoiceCommands = ({ on, busy, run }: { on: boolean; busy: boolean; run: (id: VoiceCommandId) => string }) => {
  const talking = useSyncExternalStore(onTeacherTalking, teacherTalking);
  const [heard, setHeard] = useState<Heard | null>(null);
  const [state, setState] = useState<ListenState>('off');
  const [error, setError] = useState('');
  const runRef = useRef(run);
  runRef.current = run;
  const blocked = useRef(false);
  const active = on && !busy && !talking && speechSupported();

  useEffect(() => {
    if (!on) { blocked.current = false; setError(''); }
  }, [on]);

  useEffect(() => {
    if (!active || blocked.current) { setState(on ? (blocked.current ? 'error' : 'waiting') : 'off'); return; }
    let alive = true;
    let rec: RecognitionLike | null = null;
    let timer = 0;
    let misses = 0;
    const again = (ms: number) => { window.clearTimeout(timer); timer = window.setTimeout(begin, ms); };
    function begin() {
      if (!alive) return;
      const Ctor = ctorOf();
      if (!Ctor) return;
      const r = new Ctor();
      rec = r;
      r.lang = 'ka-GE';
      r.continuous = true;
      r.interimResults = false;
      r.maxAlternatives = 3;
      r.onresult = e => {
        for (let i = e.resultIndex ?? 0; i < e.results.length; i++) {
          const res = e.results[i];
          if (!res.isFinal) continue;
          for (let j = 0; j < res.length; j++) {
            const id = matchCommand(res[j]?.transcript ?? '');
            if (!id) continue;
            misses = 0;
            const effect = runRef.current(id);
            setHeard({ id, effect, at: Date.now() });
            return;
          }
        }
      };
      r.onerror = ev => {
        if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed' || ev.error === 'audio-capture') {
          blocked.current = true;
          alive = false;
          setError(errorWord(ev.error));
          setState('error');
        } else if (ev.error === 'network') {
          misses += 3;
          if (misses >= 9) { blocked.current = true; alive = false; setError(errorWord('network')); setState('error'); }
        }
      };
      r.onend = () => {
        rec = null;
        if (!alive) return;
        misses += 1;
        // a quiet room ends the session every few seconds: start again, slower when it keeps ending
        again(misses > 6 ? 1500 : 350);
      };
      try { r.start(); setState('listening'); } catch { again(1000); }
    }
    begin();
    return () => { alive = false; window.clearTimeout(timer); quiet(rec); };
  }, [active, on]);

  useEffect(() => {
    if (!heard) return;
    const t = window.setTimeout(() => setHeard(null), 3500);
    return () => window.clearTimeout(t);
  }, [heard]);

  return { heard, state, error };
};

// ---- one question said aloud („ჰკითხე“'s field) ----------------------------------------------------------------------

export const useSpeechOnce = (onFinal: (text: string) => void) => {
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const rec = useRef<RecognitionLike | null>(null);
  const final = useRef(onFinal);
  final.current = onFinal;
  const stop = useCallback(() => { quiet(rec.current); rec.current = null; setListening(false); }, []);
  const start = useCallback(() => {
    const Ctor = ctorOf();
    if (!Ctor) return;
    stop();
    const r = new Ctor();
    r.lang = 'ka-GE'; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
    let got = '', done = false;
    const end = () => { if (done) return; done = true; rec.current = null; setListening(false); if (got) final.current(got); };
    r.onresult = e => {
      let text = '', fin = false;
      for (let i = 0; i < e.results.length; i++) { text += e.results[i][0]?.transcript ?? ''; if (e.results[i].isFinal) fin = true; }
      got = text.trim();
      setHeard(got);
      if (fin) end();
    };
    r.onerror = () => end();
    r.onend = end;
    rec.current = r;
    setHeard('');
    setListening(true);
    try { r.start(); } catch { setListening(false); }
  }, [stop]);
  useEffect(() => () => quiet(rec.current), []);
  return { listening, heard, start, stop };
};

// ---- what shows -----------------------------------------------------------------------------------------------------

/** „გავიგე: „ნელა““ — a white card with the mic in its rings and what the command did, then the commands to say. */
export const VoiceHeardCard: React.FC<{ heard: Heard }> = ({ heard }) => (
  <>
    <Card className="flex flex-col items-center gap-1 text-center" aria-live="polite">
      <span aria-hidden="true" className="flex size-[104px] items-center justify-center rounded-full bg-wine/10">
        <span className="flex size-[84px] items-center justify-center rounded-full bg-wine/15">
          <span className="flex size-[62px] items-center justify-center rounded-full bg-wine text-white [&_svg]:size-6"><Mic /></span>
        </span>
      </span>
      <div className="mt-2.5 text-title font-bold leading-tight wrap-break-word">გავიგე: „{commandSay(heard.id)}“</div>
      {heard.effect && <div className="text-body text-mut wrap-break-word">{heard.effect}</div>}
    </Card>
    <CommandList on={heard.id} />
  </>
);

/** „შეგიძლია თქვა“ and the five commands as pills; the one just heard is wine. */
export const CommandList: React.FC<{ on?: VoiceCommandId }> = ({ on }) => (
  <div className="flex shrink-0 flex-col gap-2">
    <SectionLabel label="შეგიძლია თქვა" />
    <ul className="flex flex-wrap gap-2">
      {VOICE_COMMANDS.map(c => (
        <li key={c.id} className={cx('flex h-10 items-center rounded-full px-4 text-body font-bold',
          c.id === on ? 'bg-wine text-white' : 'bg-surf text-ink')}>„{c.say}“</li>
      ))}
    </ul>
  </div>
);

/** A quiet line while the commands are on: listening now, waiting for the pause, or why it cannot. */
export const VoiceListenLine: React.FC<{ state: ListenState; error: string }> = ({ state, error }) => {
  if (state === 'off') return null;
  return (
    <p className={cx('flex shrink-0 items-center gap-1.5 px-1.5 text-meta leading-normal [&_svg]:size-3.5 [&_svg]:shrink-0',
      state === 'error' ? 'text-gold-ink' : 'text-mut')} aria-live="polite">
      <Mic aria-hidden="true" className={cx(state === 'listening' && 'animate-pulse text-wine')} />
      <span className="min-w-0 wrap-break-word">
        {state === 'error' ? error
          : state === 'listening' ? 'გისმენ: „კიდევ ერთხელ“, „ნელა“, „შემდეგი“…'
            : 'ხმით მართვა — პაუზაში გისმენ'}
      </span>
    </p>
  );
};
