import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Bell, Check, ChevronDown, Headphones, Lightbulb, Mic, Send, Sparkles, Square } from 'lucide-react';
import { Btn } from '../ui/kit';
import { playStartNotes } from '../../utils/chantSynth';
import { notesFromFrames, scoreSinging } from '../../utils/pitch';
import { startSinging, singingSupported, SingSession } from '../../utils/singCapture';
import { askAiTeacher, aiTriesLeft, AiTeacherError, AI_PROBLEM_TEXT, TakeAbout } from '../../utils/aiTeacher';
import { saveTake } from '../../hooks/usePearls';
import { LEARNED_SHARE, LearnRecord, PartState, partState } from '../../utils/learn';
import { noteName } from '../../utils/pearls';
import { triggerHaptic } from '../../utils/haptics';
import { LearnMirror, MirrorFrame } from './LearnMirror';
import { askNotificationPermission } from '../../utils/prayerReminders';
import { REMIND_TIMES, getRemindTime, setRemindTime } from '../../utils/learnReminder';
import type { Voice } from '../../utils/pathItems';

// Pieces shared by the learning mode of a chant (LearnMode) and of a song's recording (LearnAudio): the page frame,
// the progress bar with the parts, the singing panel (sing, hear myself, AI teacher, send to the teacher) and tips.

export const WINE = '#7a2028';
const STATE_LOOK: Record<PartState, { bg: string; fg: string; ring: string; label: string }> = {
  new: { bg: '#ffffff', fg: '#75685a', ring: '#e8dcc8', label: 'ახალი' },
  learning: { bg: '#fcf1df', fg: '#8a4b12', ring: '#efd6a6', label: 'ვსწავლობ' },
  learned: { bg: '#c9962a', fg: '#ffffff', ring: '#c9962a', label: 'ნასწავლი' },
  due: { bg: '#ffffff', fg: WINE, ring: WINE, label: 'გასამეორებელი' },
  kept: { bg: '#8a6a1e', fg: '#ffffff', ring: '#8a6a1e', label: 'დამახსოვრებული' },
};

/** The learning mode's full-screen page over the notes page or the song page; the phone's back closes it. */
export const LearnFrame: React.FC<{ title: string; subtitle: string; onClose: () => void; children: React.ReactNode }> = ({ title, subtitle, onClose, children }) => {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    try { if (!window.history.state?.sgLearn) window.history.pushState({ ...(window.history.state || {}), sgLearn: 1 }, ''); } catch { /* still opens */ }
    const onPop = (e: PopStateEvent) => { if (!e.state?.sgLearn) closeRef.current(); };
    // the page underneath (notes: space plays, arrows turn) does not hear the keys while this is open
    const onKey = (e: KeyboardEvent) => { e.stopPropagation(); if (e.key === 'Escape') back(); };
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey, true);
    return () => { window.removeEventListener('popstate', onPop); window.removeEventListener('keydown', onKey, true); };
  }, []);
  const back = () => { if (window.history.state?.sgLearn) window.history.back(); else closeRef.current(); };

  // on <body>: the notes page's pinch and swipe gestures stay out of it
  return createPortal(
    <div className="fixed inset-0 z-[90] overflow-y-auto overscroll-contain bg-[#faf6ef]" role="dialog" aria-modal="true" aria-label={`სასწავლო რეჟიმი · ${title}`}>
      <div className="sticky top-0 z-10 safe-top bg-[#faf6ef]/95 backdrop-blur border-b border-[#e4d8c4]">
        <div className="safe-x"><div className="max-w-2xl mx-auto h-14 px-3 flex items-center gap-2">
          <button type="button" onClick={back} aria-label="უკან" title="უკან"
            className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-[#574739] hover:bg-[#f1e9dc] active:scale-95 transition cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold text-[#2a2017] leading-tight">{title}</p>
            <p className="truncate text-[12px] text-[#8c7c6b] leading-tight">{subtitle}</p>
          </div>
        </div></div>
      </div>
      <div className="safe-x safe-bottom"><div className="max-w-2xl mx-auto px-4 pt-4 pb-12 flex flex-col gap-4">{children}</div></div>
    </div>,
    document.body,
  );
};

/** The progress bar (one segment per part) and the parts to pick; „ერთად“ joins the learned ones from the start. */
export const PartsBar: React.FC<{
  count: number; rec: LearnRecord; today: string; current: number | 'all'; onPick: (p: number | 'all') => void; noun: string;
}> = ({ count, rec, today, current, onPick, noun }) => {
  const states = Array.from({ length: count }, (_, i) => partState(rec[i], today));
  const learned = states.filter(s => s !== 'new' && s !== 'learning').length;
  const due = states.filter(s => s === 'due').length;
  // „together“: from the first part through the run of learned parts at the start
  let run = 0;
  while (run < count && states[run] !== 'new' && states[run] !== 'learning') run++;
  const pct = count ? Math.round((learned / count) * 100) : 0;
  return (
    <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] p-3.5 flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[14px] font-bold text-[#4a3426]">ნასწავლი {learned} / {count} {noun}</p>
        <p className="font-serif-ge text-[20px] font-bold text-[#7a2028] leading-none tabular-nums">{pct}%</p>
      </div>
      <div className="flex gap-1 h-2.5" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="პროგრესი">
        {states.map((s, i) => (
          <span key={i} className="flex-1 rounded-full transition-colors duration-500"
            style={{ background: s === 'new' ? '#efe6d6' : s === 'learning' ? '#efd6a6' : s === 'due' ? '#d79aa0' : STATE_LOOK[s].bg }} />
        ))}
      </div>
      {due > 0 && <p className="text-[13px] font-bold text-[#7a2028]">დღეს გასამეორებელია: {due}</p>}
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={noun}>
        {states.map((s, i) => {
          const look = STATE_LOOK[s];
          const on = current === i;
          return (
            <button key={i} type="button" role="radio" aria-checked={on} onClick={() => { triggerHaptic(8); onPick(i); }}
              title={`${i + 1} · ${look.label}`} aria-label={`${i + 1}, ${look.label}`}
              className={`relative w-11 h-11 rounded-full text-[15px] font-bold cursor-pointer transition active:scale-95 ${on ? 'ring-[3px] ring-offset-2 ring-offset-white' : 'ring-1'}`}
              style={{ background: look.bg, color: look.fg, ['--tw-ring-color' as string]: on ? WINE : look.ring }}>
              {i + 1}
              {s === 'due' && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#7a2028] ring-2 ring-white" aria-hidden />}
              {(s === 'learned' || s === 'kept') && <Check className="absolute -bottom-0.5 -right-0.5 w-4 h-4 p-0.5 rounded-full bg-white text-[#8a6a1e] ring-1 ring-[#e8dcc8]" aria-hidden />}
            </button>
          );
        })}
        {run >= 2 && (
          <button type="button" role="radio" aria-checked={current === 'all'} onClick={() => { triggerHaptic(8); onPick('all'); }}
            className={`h-11 px-4 rounded-full text-[13px] font-bold cursor-pointer transition active:scale-95 ${
              current === 'all' ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/40'}`}>
            {run === count ? 'მთლიანად' : `1–${run} ერთად`}
          </button>
        )}
      </div>
    </section>
  );
};

/** Round segmented choice (speed, which voices sound). */
export function Choice<T extends string | number>({ label, value, options, onChange }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="px-0.5 text-[12px] font-bold text-[#8c7c6b]">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map(o => (
          <button key={String(o.value)} type="button" role="radio" aria-checked={value === o.value}
            onClick={() => { triggerHaptic(8); onChange(o.value); }}
            className={`h-10 px-3.5 rounded-full text-[13px] font-bold cursor-pointer transition-colors ${
              value === o.value ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/40'}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export const SPEEDS = [{ value: 0.5, label: '50%' }, { value: 0.75, label: '75%' }, { value: 1, label: '100%' }];

type Phase = 'idle' | 'cue' | 'singing' | 'scoring' | 'done';
interface Result { pct: number; hits: boolean[]; mp3: Blob | null }

/**
 * Sing the part: its first note sounds as a cue, then the phone listens. With book notes the take is checked (any
 * key) and 80% learns the part; a recording's part has no notes to check, so the member says whether they know it.
 * Then: hear myself, ask the AI teacher, send the take to my teachers.
 */
export const SingPanel: React.FC<{
  target: number[] | null;      // the melody to check, or null (a recording)
  cue: number | null;           // midi of the first note
  seconds: number;              // the part's length at full speed
  uid: string | null;
  unlimited: boolean;
  voice: Voice;
  about: Omit<TakeAbout, 'hit' | 'notes'>;
  sendId: string;               // where the take goes for the teacher
  approved: boolean;            // the teacher already approved this one
  onBeforeSing: () => void;     // stop the music
  onTry: (pct: number, ok: boolean) => void;
  timeline?: [number, number, number][]; // the part's notes for the mirror (none for a recording)
  focus?: boolean;              // the path's last step („მარტო“): this card is where to go now
}> = ({ target, cue, seconds, uid, unlimited, voice, about, sendId, approved, onBeforeSing, onTry, timeline = [], focus }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<Result | null>(null);
  const [live, setLive] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [ai, setAi] = useState<{ busy: boolean; text: string; problem: string }>({ busy: false, text: '', problem: '' });
  const [sent, setSent] = useState<'no' | 'busy' | 'yes' | 'failed'>('no');
  const [marked, setMarked] = useState(false);
  const session = useRef<SingSession | null>(null);
  const cueTimer = useRef(0);
  const takeAudio = useRef<HTMLAudioElement | null>(null);
  // the mirror: what the phone heard, and my key against the notes' (from my first steady note)
  const frames = useRef<MirrorFrame[]>([]);
  const offset = useRef<number | null>(null);

  const reset = () => {
    window.clearTimeout(cueTimer.current);
    session.current?.cancel();
    session.current = null;
    takeAudio.current?.pause();
  };
  useEffect(() => reset, []);
  // another part or voice: the old take does not belong to it
  useEffect(() => {
    reset();
    setPhase('idle'); setResult(null); setLive(null); setError(''); setSent('no'); setMarked(false);
    setAi({ busy: false, text: '', problem: '' });
    frames.current = []; offset.current = null;
  }, [sendId, voice]);

  const finish = async () => {
    const s = session.current;
    if (!s) return;
    session.current = null;
    setPhase('scoring');
    const take = await s.stop();
    let pct = -1, hits: boolean[] = [];
    if (target?.length) {
      const r = scoreSinging(target, notesFromFrames(take.frames));
      pct = Math.round(r.share * 100);
      hits = r.hits;
      onTry(pct, pct >= LEARNED_SHARE);
      triggerHaptic(pct >= LEARNED_SHARE ? 30 : 12);
    }
    setResult({ pct, hits, mp3: take.mp3 });
    setPhase('done');
  };

  const sing = async () => {
    if (phase === 'singing') { finish(); return; }
    if (phase === 'cue') { reset(); setPhase('idle'); return; }
    onBeforeSing();
    reset();
    setError(''); setResult(null); setSent('no'); setMarked(false);
    setAi({ busy: false, text: '', problem: '' });
    frames.current = []; offset.current = null;
    triggerHaptic(12);
    setPhase('cue');
    if (cue != null) await playStartNotes([cue], 0, false, 0.5, 0.9).catch(() => undefined);
    cueTimer.current = window.setTimeout(async () => {
      const limit = (seconds * 2.5 + 8) * 1000;
      let lastVoiced = 0, voiced = 0, prevT = -1, prevMidi: number | null = null;
      try {
        session.current = await startSinging((midi, t) => {
          if (midi != null) {
            if (prevMidi != null) voiced += t - prevT;
            lastVoiced = t;
          }
          prevT = t; prevMidi = midi;
          const tr = frames.current;
          tr.push({ t, midi });
          // the key: from the first steady note (four readings within a quarter tone)
          if (midi != null && offset.current == null && target?.length && tr.length >= 4) {
            const last = tr.slice(-4).map(f => f.midi);
            if (last.every(m => m != null && Math.abs(m - midi) < 0.5)) offset.current = midi - target[0];
          }
          setLive(midi);
          // stops by itself at the time limit, or after a pause once something was sung
          if (t > limit || (voiced > 1200 && t - lastVoiced > 2500)) finish();
        });
        setPhase('singing');
      } catch (e) {
        console.warn('mic:', e);
        setError('მიკროფონი ვერ ჩაირთო — ბრაუზერს მიკროფონის ნება მიეცი და კიდევ სცადე.');
        setPhase('idle');
      }
    }, cue != null ? 1000 : 150);
  };

  const playTake = () => {
    if (!result?.mp3) return;
    onBeforeSing();
    takeAudio.current?.pause();
    const url = URL.createObjectURL(result.mp3);
    const a = new Audio(url);
    a.onended = () => URL.revokeObjectURL(url);
    takeAudio.current = a;
    a.play().catch(() => undefined);
  };

  const askAi = async () => {
    if (!result?.mp3 || !uid) return;
    setAi({ busy: true, text: '', problem: '' });
    try {
      const text = await askAiTeacher(uid, result.mp3, {
        ...about, notes: (target || []).map(noteName), hit: result.hits.filter(Boolean).length,
      }, unlimited);
      setAi({ busy: false, text, problem: '' });
    } catch (e) {
      setAi({ busy: false, text: '', problem: AI_PROBLEM_TEXT[e instanceof AiTeacherError ? e.kind : 'failed'] });
    }
  };

  const send = async () => {
    if (!result?.mp3 || !uid) return;
    setSent('busy');
    try {
      await saveTake(uid, sendId, result.mp3, Math.max(0, result.pct), voice);
      setSent('yes');
      triggerHaptic(20);
    } catch (e) {
      console.warn('learn take send:', (e as { code?: string })?.code || e);
      setSent('failed');
    }
  };

  const mark = (ok: boolean) => { setMarked(true); onTry(-1, ok); triggerHaptic(ok ? 30 : 10); };

  const left = uid ? aiTriesLeft(uid, unlimited) : 0;
  const busy = phase === 'cue' || phase === 'singing' || phase === 'scoring';
  const learnedNow = result && result.pct >= LEARNED_SHARE;

  return (
    <section className={`rounded-2xl bg-white p-3.5 flex flex-col gap-3 transition-shadow ${focus ? 'ring-2 ring-[#7a2028] shadow-[0_10px_24px_-16px_rgba(122,32,40,0.7)]' : 'ring-1 ring-[#e8dcc8]'}`}>
      <h2 className="text-[13px] font-extrabold text-[#7a2028]">იმღერე{target?.length ? ' · აპი შეგიმოწმებს' : ''}</h2>
      <div className="flex items-center gap-3.5">
        <button type="button" onClick={sing} disabled={phase === 'scoring' || !singingSupported()}
          aria-label={phase === 'singing' ? 'გაჩერება' : 'იმღერე'}
          className="relative w-16 h-16 shrink-0 rounded-full bg-[#7a2028] text-[#fbf6ec] flex items-center justify-center shadow-[0_6px_16px_-8px_rgba(122,32,40,0.8)] cursor-pointer disabled:opacity-40 disabled:cursor-default active:scale-95 transition">
          {phase === 'singing' && <span className="absolute inset-0 rounded-full bg-[#7a2028]/35 animate-ping motion-reduce:hidden" aria-hidden />}
          {phase === 'singing' ? <Square className="relative w-6 h-6" fill="currentColor" /> : <Mic className="relative w-7 h-7" />}
        </button>
        <p className="min-w-0 text-[14px] leading-snug text-[#4a3426]" aria-live="polite">
          {phase === 'cue' ? 'ისმის პირველი ნოტი…'
            : phase === 'singing' ? <>გისმენ{live != null ? <> · <b className="text-[#7a2028]">{noteName(live)}</b></> : '…'}<br /><span className="text-[12.5px] text-[#8c7c6b]">გაჩუმდები — თვითონ გაჩერდება</span></>
            : phase === 'scoring' ? 'ვითვლი…'
            : target?.length ? 'ჯერ პირველ ნოტს გაიგებ, მერე იმღერე შენი ხმა. ტონალობა შეგიძლია შენთვის მოსახერხებელი აირჩიო.'
            : cue != null ? 'ჯერ პირველ ნოტს გაიგებ, მერე იმღერე ეს ნაწილი შენი ხმით.'
            : 'დააჭირე და იმღერე ეს ნაწილი შენი ხმით. ბოლოს მოუსმინე საკუთარ თავს.'}
        </p>
      </div>

      {(timeline.length > 0 || frames.current.length > 0) && (
        <LearnMirror notes={timeline} seconds={seconds} frames={frames.current} offset={offset.current}
          hits={result && !busy && result.pct >= 0 ? result.hits : null} live={phase === 'singing'} />
      )}

      {!singingSupported() && <p className="rounded-xl bg-amber-50 ring-1 ring-amber-200 px-3 py-2 text-[13px] text-amber-900">ამ ბრაუზერში მიკროფონი ვერ ჩაირთვება — სცადე Chrome ან Safari.</p>}
      {error && <p className="rounded-xl bg-red-50 ring-1 ring-red-200 px-3 py-2 text-[13px] text-red-800">{error}</p>}

      {result && !busy && (
        <div className="flex flex-col gap-3">
          {result.pct >= 0 ? (
            <div className={`rounded-xl px-3.5 py-3 ${learnedNow ? 'bg-[#fbf3df] ring-1 ring-[#e9cf8f]' : 'bg-[#fbf6ec] ring-1 ring-[#e8dcc8]'}`}>
              <p className="flex items-baseline gap-2">
                <span className="font-serif-ge text-2xl font-bold text-[#4a3426] leading-none">{result.pct}%</span>
                <span className="text-[13px] text-[#75685a]">{result.hits.filter(Boolean).length} ნოტი {result.hits.length}-დან</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-1" aria-hidden>
                {result.hits.map((h, i) => <span key={i} className={`w-3 h-3 rounded-full ${h ? 'bg-[#c9962a]' : 'bg-[#e8dcc8]'}`} />)}
              </div>
              <p className="mt-2 text-[13px] font-bold text-[#4a3426]">
                {learnedNow ? 'ყოჩაღ! ეს ნაწილი ნასწავლია — გამეორებას აპი შეგახსენებს.' : `ნასწავლად ჩაითვლება ${LEARNED_SHARE}%-ზე. კიდევ მოუსმინე და სცადე.`}
              </p>
            </div>
          ) : !marked ? (
            <div className="rounded-xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] px-3.5 py-3 flex flex-col gap-2.5">
              <p className="text-[14px] font-bold text-[#4a3426]">მოუსმინე შენს ჩანაწერს. როგორ გამოგივიდა?</p>
              <div className="grid grid-cols-2 gap-2">
                <Btn kind="primary" icon={<Check />} onClick={() => mark(true)}>ვიცი</Btn>
                <Btn kind="ghost" onClick={() => mark(false)}>ჯერ ვერა</Btn>
              </div>
            </div>
          ) : null}

          {result.mp3 && (
            <div className="grid gap-2 min-[420px]:grid-cols-2">
              <Btn kind="ghost" icon={<Headphones />} onClick={playTake}>მომისმინე</Btn>
              {uid && (
                <Btn kind="soft" icon={<Sparkles />} onClick={askAi} disabled={ai.busy || left <= 0}>
                  {ai.busy ? 'უსმენს…' : 'AI მასწავლებელი'}{Number.isFinite(left) && !ai.busy ? ` · ${left}` : ''}
                </Btn>
              )}
            </div>
          )}
          {(ai.text || ai.problem) && (
            <div className={`rounded-xl p-3.5 ${ai.problem ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-[#fbf6ec] ring-1 ring-[#e8dcc8]'}`}>
              {ai.text && <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold text-[#7a2028]"><Sparkles className="w-4 h-4" />AI მასწავლებელი</p>}
              <p className="text-[14px] leading-relaxed text-[#4a3426] whitespace-pre-line">{ai.text || ai.problem}</p>
            </div>
          )}

          {result.mp3 && uid && (
            sent === 'yes'
              ? <p className="flex items-center justify-center gap-1.5 text-[13px] font-bold text-[#8a6a1e]"><Check className="w-4 h-4" />გაეგზავნა მასწავლებელს</p>
              : <Btn kind="primary" full icon={<Send />} onClick={send} disabled={sent === 'busy'}>{sent === 'busy' ? 'იგზავნება…' : 'გაუგზავნე მასწავლებელს'}</Btn>
          )}
          {sent === 'failed' && <p className="text-[13px] text-red-700 text-center">ვერ გაიგზავნა — ინტერნეტი შეამოწმე და კიდევ სცადე.</p>}
          {result.mp3 && !uid && <p className="text-[13px] text-[#8c7c6b] text-center">მასწავლებლისთვის გასაგზავნად შედი შენი ანგარიშით.</p>}
        </div>
      )}
      {approved && <p className="flex items-center justify-center gap-1.5 text-[13px] font-bold text-[#8a6a1e]"><Check className="w-4 h-4" />მასწავლებელმა ჩაგითვალა</p>}
    </section>
  );
};

/** The ways the mode teaches, in a few words, folded. */
export const LearnTips: React.FC<{ song?: boolean }> = ({ song }) => {
  const [open, setOpen] = useState(false);
  const tips = [
    ['ნაწილ-ნაწილ', 'ერთ ჯერზე ერთი პატარა ნაწილი. როცა ორი ისწავლე, „ერთად“ შეაერთებს.'],
    ['სამი ნაბიჯი', 'მოისმინე ნელა (50%) → იმღერე ერთად (75%) → მარტო (100%). სამჯერ მოსმენის მერე აპი თავად გადაგიყვანს შემდეგზე.'],
    song ? ['ხმა ცალკე', 'თუ სიმღერას ხმები ცალ-ცალკე აქვს, ჯერ მარტო შენი ხმა ისწავლე.']
      : ['ხმა ცალკე', 'ჯერ მარტო შენი ხმა მოისმინე, მერე „ჩემ გარეშე“ — დანარჩენებთან ერთად იმღერე.'],
    ['თავად იმღერე', 'მოსმენა საკმარისი არ არის: იმღერე და მოუსმინე საკუთარ თავს.'],
    ['გამეორება', 'ნასწავლ ნაწილს აპი 1, 3 და 7 დღის მერე გაგახსენებს — ასე მეხსიერებაში რჩება.'],
  ];
  return (
    <section className="rounded-2xl bg-white/70 ring-1 ring-[#e8dcc8]">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="w-full min-h-12 px-3.5 flex items-center gap-2 text-left cursor-pointer">
        <Lightbulb className="w-4 h-4 text-[#b4620e] shrink-0" />
        <span className="flex-1 text-[14px] font-bold text-[#4a3426]">როგორ ვისწავლო</span>
        <ChevronDown className={`w-4 h-4 text-[#8c7c6b] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="px-3.5 pb-3.5 flex flex-col gap-2">
          {tips.map(([h, t]) => (
            <li key={h} className="text-[13.5px] leading-snug text-[#4a3426]"><b className="text-[#7a2028]">{h}.</b> {t}</li>
          ))}
        </ul>
      )}
    </section>
  );
};

// ---- the path: three steps for each part ----------------------------------------------------------------------------

export type Step = 1 | 2 | 3;
/** Listen this many times round before the path moves on by itself. */
export const LOOPS_PER_STEP = 3;

/** მოისმინე → ერთად → მარტო: each step sets the speed and what sounds; after three times round the path moves on. */
export const StepBar: React.FC<{ step: Step; loops: number; onStep: (s: Step) => void; hints: [string, string, string] }> = ({ step, loops, onStep, hints }) => {
  const labels = ['მოისმინე', 'ერთად', 'მარტო'];
  return (
    <div className="flex flex-col gap-2">
      <div role="radiogroup" aria-label="ნაბიჯები" className="grid grid-cols-3 gap-1.5">
        {labels.map((l, i) => {
          const n = (i + 1) as Step;
          const on = step === n, done = step > n;
          return (
            <button key={l} type="button" role="radio" aria-checked={on} onClick={() => { triggerHaptic(8); onStep(n); }}
              className={`min-h-12 px-1.5 rounded-xl flex items-center justify-center gap-1.5 text-[13px] font-bold leading-tight cursor-pointer transition active:scale-[0.97] ${
                on ? 'bg-[#7a2028] text-[#fbf6ec] shadow-[0_6px_14px_-10px_rgba(122,32,40,0.9)]'
                  : done ? 'bg-[#fbf3df] text-[#8a6a1e] ring-1 ring-[#e9cf8f]' : 'bg-white text-[#4a3426] ring-1 ring-[#e8dcc8]'}`}>
              <span className={`w-5 h-5 shrink-0 rounded-full text-[11.5px] flex items-center justify-center ${on ? 'bg-[#fbf6ec]/20' : done ? 'bg-[#c9962a] text-white' : 'bg-[#efe6d6]'}`}>
                {done ? <Check className="w-3 h-3" /> : n}
              </span>
              <span className="text-left">{l}</span>
            </button>
          );
        })}
      </div>
      <p className="flex items-center gap-2 px-0.5 text-[12.5px] text-[#75685a]">
        <span className="min-w-0 flex-1">{hints[step - 1]}</span>
        {step < 3 && (
          <span className="shrink-0 flex gap-1" aria-label={`მოსმენა ${Math.min(loops, LOOPS_PER_STEP)} / ${LOOPS_PER_STEP}`}>
            {Array.from({ length: LOOPS_PER_STEP }, (_, i) => (
              <span key={i} className={`w-2 h-2 rounded-full transition-colors ${i < loops ? 'bg-[#7a2028]' : 'bg-[#e8dcc8]'}`} />
            ))}
          </span>
        )}
      </p>
    </div>
  );
};

/** A part's words for a song (shared out over the parts by order, so only near). */
export const PartWords: React.FC<{ lines: string[] }> = ({ lines }) => (
  lines.length ? (
    <div className="rounded-xl bg-[#fffdf8] ring-1 ring-[#e8dcc8] px-3.5 py-2.5">
      {lines.map((l, i) => <p key={i} className="text-[16px] leading-[1.6] text-[#2a2017]">{l}</p>)}
      <p className="mt-1 text-[11.5px] text-[#a0907c]">სიტყვები დაახლოებით — ჩანაწერს დროები არ აქვს</p>
    </div>
  ) : null
);

/** „გამეორების შეხსენება“: the hour the phone reminds of the day's reviews (members only). */
export const ReviewReminder: React.FC = () => {
  const [at, setAt] = useState(getRemindTime);
  const [note, setNote] = useState('');
  const turn = async (next: string) => {
    triggerHaptic(8);
    setNote('');
    if (next && !at) {
      const p = await askNotificationPermission();
      if (p !== 'granted') { setNote(p === 'unsupported' ? 'ამ ბრაუზერს შეხსენებები არ შეუძლია.' : 'შეხსენებისთვის ბრაუზერს შეტყობინებების ნება მიეცი.'); return; }
    }
    setAt(next);
    setRemindTime(next);
  };
  return (
    <section className="rounded-2xl bg-white/70 ring-1 ring-[#e8dcc8] p-3.5 flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5">
        <Bell className="w-4 h-4 text-[#b4620e] shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="block text-[14px] font-bold text-[#4a3426]">გამეორების შეხსენება</span>
          <span className="block text-[12px] text-[#8c7c6b]">{at ? `იმ დღეს, როცა გასამეორებელი გაქვს, ${at}-ზე` : 'ტელეფონი შეგახსენებს, როცა ნასწავლი გასამეორებელია'}</span>
        </span>
        <button type="button" role="switch" aria-checked={Boolean(at)} aria-label="გამეორების შეხსენება" onClick={() => turn(at ? '' : '19:00')}
          className={`relative w-12 h-7 shrink-0 rounded-full transition-colors cursor-pointer ${at ? 'bg-[#7a2028]' : 'bg-[#d9cdb9]'}`}>
          <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-[left] ${at ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </div>
      {at && (
        <div role="radiogroup" aria-label="საათი" className="flex flex-wrap gap-1.5">
          {REMIND_TIMES.map(t => (
            <button key={t} type="button" role="radio" aria-checked={at === t} onClick={() => turn(t)}
              className={`h-9 px-3 rounded-full text-[13px] font-bold tabular-nums cursor-pointer transition-colors ${
                at === t ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]'}`}>{t}</button>
          ))}
        </div>
      )}
      {note && <p className="text-[13px] text-amber-900">{note}</p>}
    </section>
  );
};
