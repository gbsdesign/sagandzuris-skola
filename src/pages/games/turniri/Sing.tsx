import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Mic, Play, RotateCcw, Square } from 'lucide-react';
import { loadBookScore, playLessonNotes, stopLessonNotes, type BookScore } from '../../../utils/chantSynth';
import { phraseOf } from '../../../utils/pearls';
import { notesFromFrames, scoreSinging } from '../../../utils/pitch';
import { singingSupported, startSinging, type SingSession } from '../../../utils/singCapture';
import type { PublicQ } from '../../../utils/roundGames';
import type { TurniriQ } from '../../../utils/turniri';
import { Btn } from '../../../components/ui/kit';
import { Chip } from '../../../components/games/Chip';
import { triggerHaptic } from '../../../utils/haptics';
import { hushSnippets } from '../rounds/useSnippet';

// One singer's take in „ხმების ტურნირი“ (online on their own phone, on one phone in their turn): their voice (I, II, III —
// remembered on the device), its first phrase heard from the book notes, then sung into the microphone in any key; the
// phone counts the share of its notes sung right (utils/pitch.ts, as the pearls do) and hands it on. It stops by itself
// at the time limit or after a pause once something was sung; a new take replaces the last one, another voice drops it.

const VOICES = [{ v: 0, label: 'I · მთქმელი' }, { v: 1, label: 'II · მოძახილი' }, { v: 2, label: 'III · ბანი' }] as const;
const VOICE_KEY = 'sg-turniri-voice';
const readVoice = () => { try { const v = Number(localStorage.getItem(VOICE_KEY)); return v === 1 || v === 2 ? v : 0; } catch { return 0; } };
const saveVoice = (v: number) => { try { localStorage.setItem(VOICE_KEY, String(v)); } catch { /* private mode */ } };

type State = 'load' | 'ready' | 'listen' | 'sing' | 'score' | 'done' | 'error';

/** a take's colour: polished as a pearl (80%), half way, below */
export const pctTone = (pct: number) => (pct >= 80 ? 'text-[#2f7d4f]' : pct >= 50 ? 'text-[#a0703c]' : 'text-[#7a2028]');

export const Sing: React.FC<{ q: PublicQ; onScore: (pct: number | null) => void }> = ({ q, onScore }) => {
  const o = q as Partial<TurniriQ>;
  const [voice, setVoice] = useState(readVoice);
  const [score, setScore] = useState<BookScore | null>(null);
  const [state, setState] = useState<State>('load');
  const [problem, setProblem] = useState('');
  const [result, setResult] = useState<{ pct: number; hits: boolean[] } | null>(null);
  const [heard, setHeard] = useState(false);
  const [secs, setSecs] = useState(0);
  const session = useRef<SingSession | null>(null);
  const listenEnd = useRef(0);
  // the lesson notes sounding now are this take's own (another screen's may have cut them)
  const mine = useRef(false);

  useEffect(() => {
    if (!o.book || !o.num) { setState('error'); return; }
    let live = true;
    setState('load');
    loadBookScore(o.num, o.book).then(s => { if (live) { setScore(s); setState('ready'); } }, () => { if (live) setState('error'); });
    return () => { live = false; };
  }, [o.book, o.num]);

  const phrase = useMemo(() => (score ? phraseOf(score, Math.min(voice, score.voices.length - 1)) : null), [score, voice]);

  const quiet = () => {
    window.clearTimeout(listenEnd.current);
    if (mine.current) { mine.current = false; stopLessonNotes(); }
  };
  useEffect(() => () => { quiet(); session.current?.cancel(); session.current = null; }, []);

  const back: State = result ? 'done' : 'ready';
  const pickVoice = (v: number) => {
    if (state === 'sing' || state === 'score' || v === voice) return;
    triggerHaptic(5);
    quiet();
    saveVoice(v);
    setVoice(v);
    // the take was of the other voice
    if (result) { setResult(null); onScore(null); }
    setState(s => (s === 'load' || s === 'error' ? s : 'ready'));
  };

  const listen = async () => {
    if (!phrase) return;
    if (state === 'listen') { quiet(); setState(back); return; }
    hushSnippets();
    triggerHaptic(8);
    setState('listen');
    mine.current = true;
    await playLessonNotes(phrase.notes);
    listenEnd.current = window.setTimeout(() => { mine.current = false; setState(s => (s === 'listen' ? back : s)); }, (phrase.seconds + 0.4) * 1000);
  };

  const finish = async () => {
    const s = session.current;
    if (!s || !phrase) return;
    session.current = null;
    setState('score');
    const take = await s.stop();
    const r = scoreSinging(phrase.target, notesFromFrames(take.frames));
    const pct = Math.round(r.share * 100);
    setResult({ pct, hits: r.hits });
    setState('done');
    triggerHaptic(pct >= 80 ? 30 : 12);
    onScore(pct);
  };

  const sing = async () => {
    if (state === 'sing') { void finish(); return; }
    if (!phrase || state === 'score') return;
    quiet();
    hushSnippets();
    setProblem('');
    const limit = Math.max(phrase.seconds * 2, phrase.seconds + 8) * 1000;
    let lastVoiced = 0;
    let voiced = 0;
    let prev: { t: number; on: boolean } | null = null;
    try {
      triggerHaptic(12);
      setSecs(0);
      session.current = await startSinging((midi, t) => {
        const on = midi != null;
        if (on) { if (prev?.on) voiced += t - prev.t; lastVoiced = t; }
        prev = { t, on };
        setHeard(on);
        setSecs(Math.floor(t / 1000));
        if (t > limit || (voiced > 1200 && t - lastVoiced > 2500)) void finish();
      });
      setState('sing');
    } catch (e) {
      console.warn('mic:', e);
      setProblem('მიკროფონი ვერ ჩაირთო — ბრაუზერს მიკროფონის ნება მიეცი და კიდევ სცადე.');
      setState(back);
    }
  };

  if (!singingSupported()) {
    return <p className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-4 py-3 text-[13.5px] font-bold leading-snug text-amber-900">ამ ბრაუზერში მიკროფონი არ მუშაობს — სცადე Chrome ან Safari.</p>;
  }
  const busy = state === 'sing' || state === 'score';
  const hits = result ? result.hits.filter(Boolean).length : 0;

  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)] px-4 py-4 space-y-3.5">
      <div className="space-y-2">
        <p className="text-[13px] font-bold text-[#75685a]">შენი ხმა</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="შენი ხმა">
          {VOICES.map(x => <Chip key={x.v} on={voice === x.v} onClick={() => pickVoice(x.v)}>{x.label}</Chip>)}
        </div>
      </div>

      {state === 'load' ? (
        <p className="flex items-center gap-2 text-[13.5px] font-bold text-[#75685a]"><Loader2 className="w-4 h-4 animate-spin" />ნოტები იტვირთება…</p>
      ) : state === 'error' ? (
        <p className="text-[13.5px] font-bold leading-snug text-[#b3261e]">ნოტები ვერ ჩაიტვირთა — შეამოწმე ინტერნეტი.</p>
      ) : state === 'sing' ? (
        <div className="flex items-center gap-3 rounded-2xl bg-[#c0392b]/[0.06] px-3 py-3" role="status">
          <span className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center transition-colors ${heard ? 'bg-[#c0392b] text-white' : 'bg-[#c0392b]/15 text-[#c0392b]'}`}>
            <Mic className="w-5 h-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15.5px] font-bold text-[#4a3426]">იმღერე… <span className="tabular-nums">{secs} წმ</span></p>
            <p className="text-[12.5px] leading-snug text-[#75685a]">{heard ? 'შენი ხმა ისმის' : 'ხმა არ ისმის — უფრო ხმამაღლა'}</p>
          </div>
        </div>
      ) : state === 'score' ? (
        <p className="flex items-center gap-2 text-[13.5px] font-bold text-[#75685a]"><Loader2 className="w-4 h-4 animate-spin" />ვითვლი…</p>
      ) : result ? (
        <div className="text-center" role="status">
          <p className={`font-serif-ge text-[44px] font-bold leading-none tabular-nums ${pctTone(result.pct)}`}>{result.pct}%</p>
          <p className="mt-1.5 text-[13px] font-bold text-[#75685a]">{hits} / {result.hits.length} ნოტი სწორად</p>
          <div className="mt-2 flex flex-wrap justify-center gap-1.5" aria-hidden="true">
            {result.hits.map((hit, i) => <span key={i} className={`w-3 h-3 rounded-full ${hit ? 'bg-[#2f7d4f]' : 'bg-[#e8dcc8]'}`} />)}
          </div>
        </div>
      ) : phrase && (
        <p className="text-[13px] leading-snug text-[#75685a]">
          {phrase.target.length} ნოტი · დაახლოებით {Math.max(1, Math.round(phrase.seconds))} წამი. ჯერ მოისმინე, მერე იმღერე — შენთვის მოსახერხებელ ტონში.
        </p>
      )}
      {problem && <p className="text-[13px] font-bold leading-snug text-[#b3261e]" role="alert">{problem}</p>}

      <div className="flex gap-2.5">
        <Btn kind="ghost" onClick={() => { void listen(); }} disabled={!phrase || busy} icon={state === 'listen' ? <Square /> : <Play />} className="!h-12 flex-1">
          {state === 'listen' ? 'გაჩერება' : 'მოისმინე'}
        </Btn>
        <Btn onClick={() => { void sing(); }} disabled={!phrase || state === 'score'} icon={state === 'sing' ? <Square /> : result ? <RotateCcw /> : <Mic />} className="!h-12 flex-1">
          {state === 'sing' ? 'დასრულება' : result ? 'თავიდან' : 'იმღერე'}
        </Btn>
      </div>
    </section>
  );
};
