import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Square, Mic, Music, Sparkles, Headphones } from 'lucide-react';
import { Sheet, Btn, Pill } from '../ui/kit';
import { findVersion } from '../../data/chantLookup';
import { BookScore, loadBookScore, playLessonNotes, stopLessonNotes } from '../../utils/chantSynth';
import { phraseOf, PearlRecord, PearlShine, pearlState, VOICE_NAMES, noteName } from '../../utils/pearls';
import { POLISH_SHARE, notesFromFrames, scoreSinging } from '../../utils/pitch';
import { startSinging, singingSupported, SingSession } from '../../utils/singCapture';
import { savePearl, saveTake } from '../../hooks/usePearls';
import { askAiTeacher, aiTriesLeft, AiTeacherError, AI_PROBLEM_TEXT } from '../../utils/aiTeacher';
import { useNotes } from '../../context/NotesContext';
import { triggerHaptic } from '../../utils/haptics';
import { PearlIcon } from './PearlIcon';
import type { Voice } from '../../utils/pathItems';

// One pearl: hear the first phrase of my voice, sing it back (any key), and see on a mirror how my voice followed the
// melody. A take of 80% polishes the pearl; the best take is kept for my teachers, who make it shine. The AI teacher
// listens to a take and answers in a few words.

type Phase = 'idle' | 'listening' | 'singing' | 'scoring' | 'done';
interface Result { pct: number; hits: boolean[]; offset: number; mp3: Blob | null }

export const STATE_TEXT = { new: 'ახალი', tried: 'დაწყებული', polished: 'გაპრიალებული', shining: 'ბრწყინავს' } as const;
const VOICES: Voice[] = ['1', '2', '3'];
const W = 320;
const H = 128;
const PAD = 10;

export const chantName = (title: string) => title.replace(/[\s;:,.]+$/, '');

export const PearlSheet: React.FC<{
  id: string;
  uid: string | null;
  rec?: PearlRecord;
  shine?: PearlShine;
  voice: Voice;
  unlimited: boolean;
  onClose: () => void;
}> = ({ id, uid, rec, shine, voice: firstVoice, unlimited, onClose }) => {
  const info = findVersion(id);
  const { openNotes } = useNotes();
  const [voice, setVoice] = useState<Voice>(firstVoice);
  const [score, setScore] = useState<BookScore | null>(null);
  const [failed, setFailed] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [head, setHead] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [ai, setAi] = useState<{ busy: boolean; text: string; problem: string }>({ busy: false, text: '', problem: '' });
  const [, setTick] = useState(0);
  const trace = useRef<{ t: number; midi: number | null }[]>([]);
  const offset = useRef<number | null>(null);
  const session = useRef<SingSession | null>(null);
  const raf = useRef(0);
  const takeAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const v = info?.variant;
    if (!v?.bookNums?.length) { setFailed(true); return; }
    loadBookScore(v.bookNums[0], v.book || 'book').then(setScore, () => setFailed(true));
  }, [id]);

  const voiceIndex = score ? Math.min(Number(voice) - 1, score.voices.length - 1) : 0;
  const phrase = useMemo(() => (score ? phraseOf(score, voiceIndex) : null), [score, voiceIndex]);
  // which melody note each phrase note belongs to (repeated pitches are one)
  const melodyIndex = useMemo(() => {
    let k = -1;
    return (phrase?.notes || []).map(([, , m], i, all) => (i === 0 || all[i - 1][2] !== m ? ++k : k));
  }, [phrase]);

  const stopAll = () => {
    cancelAnimationFrame(raf.current);
    stopLessonNotes();
    session.current?.cancel();
    session.current = null;
    takeAudio.current?.pause();
  };
  useEffect(() => stopAll, []);
  // another voice: the old take does not belong to it
  useEffect(() => { setResult(null); setAi({ busy: false, text: '', problem: '' }); trace.current = []; setPhase('idle'); }, [voice]);

  const listen = async () => {
    if (!phrase) return;
    stopAll();
    triggerHaptic(10);
    setPhase('listening');
    await playLessonNotes(phrase.notes);
    const t0 = performance.now();
    const step = () => {
      const s = (performance.now() - t0) / 1000;
      setHead(s);
      if (s < phrase.seconds + 0.3) raf.current = requestAnimationFrame(step);
      else setPhase(p => (p === 'listening' ? 'idle' : p));
    };
    raf.current = requestAnimationFrame(step);
  };

  const finish = async () => {
    const s = session.current;
    if (!s || !phrase) return;
    session.current = null;
    setPhase('scoring');
    const take = await s.stop();
    const r = scoreSinging(phrase.target, notesFromFrames(take.frames));
    const pct = Math.round(r.share * 100);
    offset.current = r.offset;
    setResult({ pct, hits: r.hits, offset: r.offset, mp3: take.mp3 });
    setPhase('done');
    triggerHaptic(pct >= POLISH_SHARE * 100 ? 30 : 12);
    if (!uid) return;
    const best = rec?.best ?? -1;
    if (pct >= best) {
      savePearl(uid, id, { best: pct, voice, at: new Date().toISOString() }).catch(e => console.warn('pearl save:', e?.code || e));
      if (take.mp3 && pct > 0) saveTake(uid, id, take.mp3, pct, voice).catch(e => console.warn('pearl take save:', e?.code || e));
    }
  };

  const sing = async () => {
    if (phase === 'singing') { finish(); return; }
    if (!phrase) return;
    stopAll();
    setError('');
    setResult(null);
    setAi({ busy: false, text: '', problem: '' });
    trace.current = [];
    offset.current = null;
    const limit = Math.max(phrase.seconds * 2, phrase.seconds + 8) * 1000;
    let lastVoiced = 0;
    let voiced = 0;
    try {
      triggerHaptic(12);
      session.current = await startSinging((midi, t) => {
        const tr = trace.current;
        const prev = tr[tr.length - 1];
        tr.push({ t, midi });
        if (midi != null) {
          if (prev?.midi != null) voiced += t - prev.t;
          lastVoiced = t;
          // the key: from the first steady note (four readings within a quarter tone)
          if (offset.current == null && tr.length >= 4) {
            const last = tr.slice(-4).map(f => f.midi);
            if (last.every(m => m != null && Math.abs(m - midi) < 0.5)) offset.current = midi - phrase.target[0];
          }
        }
        setTick(n => n + 1);
        // stops by itself at the time limit, or after a pause once something was sung
        if (t > limit || (voiced > 1200 && t - lastVoiced > 2500)) finish();
      });
      setPhase('singing');
    } catch (e) {
      console.warn('mic:', e);
      setError('მიკროფონი ვერ ჩაირთო — ბრაუზერს მიკროფონის ნება მიეცი და კიდევ სცადე.');
      setPhase('idle');
    }
  };

  const playTake = () => {
    if (!result?.mp3) return;
    takeAudio.current?.pause();
    const url = URL.createObjectURL(result.mp3);
    const a = new Audio(url);
    a.onended = () => URL.revokeObjectURL(url);
    takeAudio.current = a;
    a.play().catch(() => undefined);
  };

  const askAi = async () => {
    if (!result?.mp3 || !phrase || !uid || !info) return;
    setAi({ busy: true, text: '', problem: '' });
    try {
      const text = await askAiTeacher(uid, result.mp3, {
        title: chantName(info.chant.title),
        voice: VOICE_NAMES[voice],
        notes: phrase.target.map(noteName),
        hit: result.hits.filter(Boolean).length,
      }, unlimited);
      setAi({ busy: false, text, problem: '' });
    } catch (e) {
      setAi({ busy: false, text: '', problem: AI_PROBLEM_TEXT[e instanceof AiTeacherError ? e.kind : 'failed'] });
    }
  };

  if (!info) return null;
  const state = pearlState(rec, shine);
  const num = info.variant.bookNums?.[0];

  // the mirror: the phrase's notes as bars, my voice as a line over them (moved into the phrase's key)
  const span = phrase ? Math.max(4, Math.max(...phrase.target) - Math.min(...phrase.target) + 4) : 8;
  const top = phrase ? Math.max(...phrase.target) + (span - (Math.max(...phrase.target) - Math.min(...phrase.target))) / 2 : 0;
  const y = (m: number) => Math.min(H - 3, Math.max(3, PAD + ((top - m) / span) * (H - 2 * PAD)));
  const lastT = trace.current.length ? trace.current[trace.current.length - 1].t / 1000 : 0;
  const domain = phrase ? Math.max(phrase.seconds * 1.15, phase === 'singing' || result ? lastT + 0.6 : 0) : 1;
  const x = (s: number) => (s / domain) * W;
  let line = '';
  if (offset.current != null) {
    let pen = false;
    for (const f of trace.current) {
      if (f.midi == null) { pen = false; continue; }
      line += `${pen ? 'L' : 'M'}${x(f.t / 1000).toFixed(1)} ${y(f.midi - offset.current).toFixed(1)}`;
      pen = true;
    }
  }
  const live = phase === 'singing' ? trace.current[trace.current.length - 1] : undefined;
  const polishedNow = result && result.pct >= POLISH_SHARE * 100;
  const left = uid ? aiTriesLeft(uid, unlimited) : 0;

  return (
    <Sheet open onClose={() => { stopAll(); onClose(); }} title={chantName(info.chant.title)}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <PearlIcon state={state} size={52} className="shrink-0" />
          <div className="min-w-0">
            <p className="text-[13px] text-[#75685a]">{num ? `№${num} · ` : ''}გელათის სკოლა, IX ტომი</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Pill tone={state === 'shining' ? 'amber' : state === 'polished' ? 'green' : 'muted'}>{STATE_TEXT[state]}</Pill>
              {rec && <Pill tone="muted">საუკეთესო {rec.best}% · {VOICE_NAMES[rec.voice]}</Pill>}
            </div>
          </div>
        </div>

        <div role="radiogroup" aria-label="ხმა" className="flex gap-2">
          {VOICES.slice(0, Math.max(1, Math.min(3, score?.voices.length ?? 3))).map(v => (
            <button key={v} type="button" role="radio" aria-checked={voice === v} disabled={phase === 'singing'}
              onClick={() => { triggerHaptic(8); setVoice(v); }}
              className={`h-10 flex-1 rounded-full text-sm font-bold cursor-pointer transition-colors disabled:opacity-50 ${
                voice === v ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/40'}`}>
              {VOICE_NAMES[v]}
            </button>
          ))}
        </div>

        <div className="rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] px-2 py-2">
          {failed ? (
            <p className="py-10 text-center text-sm text-[#8a7a6a]">ნოტები ვერ ჩაიტვირთა — ინტერნეტი შეამოწმე.</p>
          ) : !phrase ? (
            <p className="py-10 text-center text-sm text-[#8a7a6a]">იტვირთება…</p>
          ) : (
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32" role="img" aria-label="ფრაზის ნოტები და შენი ხმა">
              {phrase.notes.map(([at, len, m], i) => {
                const k = melodyIndex[i];
                const scored = result && phase !== 'singing' && phase !== 'scoring';
                const fill = scored && result.hits[k] ? '#c9962a' : '#7a2028';
                const opacity = phase === 'listening' && at <= head ? 0.65 : scored ? (result.hits[k] ? 0.9 : 0.25) : 0.22;
                return <rect key={i} x={x(at) + 1} y={y(m) - 4} width={Math.max(4, x(len) - 2)} height={8} rx={4} fill={fill} opacity={opacity} />;
              })}
              {phase === 'listening' && <line x1={x(head)} x2={x(head)} y1={4} y2={H - 4} stroke="#7a2028" strokeWidth={1.5} opacity={0.5} />}
              {line && <path d={line} fill="none" stroke="#4a3426" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />}
              {live?.midi != null && offset.current != null && (
                <circle cx={x(live.t / 1000)} cy={y(live.midi - offset.current)} r={5} fill="#7a2028" />
              )}
            </svg>
          )}
          <p className="px-1 pt-1 min-h-5 text-[13px] text-[#75685a] text-center" aria-live="polite">
            {phase === 'listening' ? 'ისმის ფრაზა…'
              : phase === 'singing' ? (offset.current == null ? 'გისმენ — იმღერე შენს ტონალობაში' : 'გისმენ…')
              : phase === 'scoring' ? 'ვითვლი…'
              : phrase ? `${phrase.target.length} ნოტი · დაახლოებით ${Math.round(phrase.seconds)} წამი` : ''}
          </p>
        </div>

        <div className="grid grid-cols-3 items-start gap-2">
          <button type="button" onClick={listen} disabled={!phrase || phase === 'singing' || phase === 'scoring'}
            className="flex flex-col items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-default">
            <span className="w-12 h-12 rounded-full bg-white ring-1 ring-[#e8dcc8] text-[#7a2028] flex items-center justify-center">
              <Play className="w-5 h-5 ml-0.5" />
            </span>
            <span className="text-[13px] font-bold text-[#4a3426]">მოსმენა</span>
          </button>
          <button type="button" onClick={sing} disabled={!phrase || phase === 'scoring' || !singingSupported()}
            className="flex flex-col items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-default">
            <span className="relative w-16 h-16 rounded-full bg-[#7a2028] text-[#fbf6ec] flex items-center justify-center shadow-[0_6px_16px_-8px_rgba(122,32,40,0.8)]">
              {/* while listening to me: a wave goes out from the button (the button itself stays solid) */}
              {phase === 'singing' && <span className="absolute inset-0 rounded-full bg-[#7a2028]/35 animate-ping motion-reduce:hidden" aria-hidden />}
              {phase === 'singing' ? <Square className="relative w-6 h-6" fill="currentColor" /> : <Mic className="relative w-7 h-7" />}
            </span>
            <span className="text-[13px] font-bold text-[#4a3426]">{phase === 'singing' ? 'გაჩერება' : 'იმღერე'}</span>
          </button>
          <button type="button" onClick={() => { stopAll(); onClose(); openNotes(id, 'bookmark'); }}
            className="flex flex-col items-center gap-1.5 cursor-pointer">
            <span className="w-12 h-12 rounded-full bg-white ring-1 ring-[#e8dcc8] text-[#7a2028] flex items-center justify-center">
              <Music className="w-5 h-5" />
            </span>
            <span className="text-[13px] font-bold text-[#4a3426]">ნოტები</span>
          </button>
        </div>

        {!singingSupported() && !error && (
          <p className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-3.5 py-2.5 text-[13px] text-amber-900">ამ ბრაუზერში მიკროფონი ვერ ჩაირთვება — სცადე Chrome ან Safari.</p>
        )}
        {error && <p className="rounded-2xl bg-red-50 ring-1 ring-red-200 px-3.5 py-2.5 text-[13px] text-red-800">{error}</p>}

        {result && phase !== 'singing' && phase !== 'scoring' && (
          <div className="space-y-3">
            <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] p-3.5 flex items-center gap-3">
              <PearlIcon state={polishedNow ? 'polished' : 'tried'} size={48} className="shrink-0" />
              <div className="min-w-0">
                <p className="font-serif-ge text-2xl font-bold text-[#4a3426] leading-none">{result.pct}%</p>
                <p className="mt-1 text-[13px] text-[#75685a]">
                  {result.hits.filter(Boolean).length} ნოტი {result.hits.length}-დან · {polishedNow ? 'მარგალიტი გაპრიალდა!' : 'გაპრიალდება 80%-ზე'}
                </p>
              </div>
            </div>
            {result.mp3 && (
              <div className="grid gap-2 min-[480px]:grid-cols-2">
                <Btn kind="ghost" icon={<Headphones />} onClick={playTake}>მომისმინე</Btn>
                {uid && (
                  <Btn kind="soft" icon={<Sparkles />} onClick={askAi} disabled={ai.busy || left <= 0}>
                    {ai.busy ? 'უსმენს…' : 'AI მასწავლებელი'}{Number.isFinite(left) && !ai.busy ? ` · ${left}` : ''}
                  </Btn>
                )}
              </div>
            )}
            {(ai.text || ai.problem) && (
              <div className={`rounded-2xl p-3.5 ${ai.problem ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-white ring-1 ring-[#e8dcc8]'}`}>
                {ai.text && <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold text-[#7a2028]"><Sparkles className="w-4 h-4" />AI მასწავლებელი</p>}
                <p className="text-[14px] leading-relaxed text-[#4a3426] whitespace-pre-line">{ai.text || ai.problem}</p>
              </div>
            )}
          </div>
        )}

        {shine && <p className="text-center text-[13px] font-bold text-[#8a6a1e]">მასწავლებელმა ჩაგითვალა · {VOICE_NAMES[shine.voice]}</p>}
        {state === 'polished' && !shine && phase !== 'singing' && (
          <p className="text-center text-[13px] text-[#75685a]">შენი საუკეთესო ჩანაწერი მასწავლებელს ესმის — ჩათვლის შემდეგ მარგალიტი აბრწყინდება.</p>
        )}
      </div>
    </Sheet>
  );
};
