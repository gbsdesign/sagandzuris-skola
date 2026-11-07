import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Headphones, Mic, Minus, Play, Plus, Repeat, RotateCcw, Send, Snail, Sparkles, Square, Users, X } from 'lucide-react';
import { BookScore, ChantSynth, countIn, makeTimeMap } from '../../utils/chantSynth';
import { LEARNED_SHARE, LearnPart, LearnRecord, PartState, chunksOfPart, learnTakeId, melodyGroups, melodyIn, partState, timelineIn } from '../../utils/learn';
import { noteName } from '../../utils/pearls';
import { singingSupported } from '../../utils/singCapture';
import { saveTake } from '../../hooks/usePearls';
import { askAiTeacher, aiTriesLeft, AiTeacherError, AI_PROBLEM_TEXT } from '../../utils/aiTeacher';
import { triggerHaptic } from '../../utils/haptics';
import type { Voice } from '../../utils/pathItems';
import { PartPicture } from './PartPicture';
import { LearnMirror } from './LearnMirror';
import { Choice, LOOPS_PER_STEP, SPEEDS, SettingsFold, useSinging } from './LearnShared';

// The learning mode of a chant: one way for everybody (2026-11-05, the user: „მეორე გვერდის ფუნქციები აქ გადმოიტანე და ერთი
// კარგი სასწავლო თემა შექმენი“). A phrase (a part) is learned in steps, one big button always saying what to do:
// • small pieces of my voice (chunksOfPart: 3–7 notes): hear one (golden on the notes), sing it back (70%), the next;
// • „ერთად“ (two voices or more): the others sound, I sing my voice along — my first note and two taps lead in, the phrase
//   goes round with a breath between, after three times round the path moves on (practice, nothing is checked);
// • „მარტო“: I sing the whole phrase, 80% learns it (students.learning). The notes then show green / red, the mirror
//   and the AI teacher are under it, the take can go to the teacher.
// A learned phrase (a review) opens on „მარტო“; all phrases learned → „ნასწავლი ფრაზები ერთად“ (practice, not saved).
// Speed, key, what sounds and the earphones are under „მორგება“; speed, key and earphones are kept on the device.

/** A piece is sung right enough with this share of its notes (the whole phrase needs LEARNED_SHARE). */
const PIECE_PASS = 70;
/** A phone held upright — where the big notes halve their lines. */
const UPRIGHT = '(orientation: portrait) and (max-width: 639px)';
/** The others' level while „ჩემი ხმა წინ“. */
const LEAD_OTHERS = 0.35;
/** Seconds of silence between the rounds of „ერთად“ — a breath. */
const BREATH = 1.5;

const SPEED_KEY = 'sg-learn-speed';
const TONE_KEY = 'sg-learn-tone';
const PHONES_KEY = 'sg-learn-phones';
const remember = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* the choice still holds here */ } };
const readSpeed = () => {
  try {
    const v = Number(localStorage.getItem(SPEED_KEY));
    if (SPEEDS.some(s => s.value === v)) return v;
    return localStorage.getItem('sg-learn-slow') === '1' ? 0.5 : 0.75; // the old „ნელა“ switch
  } catch { return 0.75; }
};
const readTone = () => { try { const v = Number(localStorage.getItem(TONE_KEY)); return Number.isInteger(v) && Math.abs(v) <= 7 ? v : 0; } catch { return 0; } };
const readPhones = () => { try { return localStorage.getItem(PHONES_KEY) === '1'; } catch { return false; } };

/** The phrase dots' colours by state, and their words under the dots. */
const DOT_COLOR: Record<PartState, string> = { new: '#efe6d6', learning: '#efd6a6', due: '#d79aa0', learned: '#c9962a', kept: '#c9962a' };
const DOT_LEGEND: [PartState[], string][] = [[['new'], 'ახალი'], [['learning'], 'ვსწავლობ'], [['due'], 'დღეს გასამეორებელი'], [['learned', 'kept'], 'ნასწავლი']];

type Stage = number | 'together' | 'whole';
type Mix = 'mine' | 'lead' | 'all' | 'others';
const MIX_LABEL: Record<Mix, string> = { mine: 'ჩემი ხმა', lead: 'ჩემი ხმა წინ', all: 'ყველა', others: 'ჩემ გარეშე' };
const ordinal = (n: number) => (n === 1 ? 'პირველი' : `მე-${n}`);
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

export const LearnEasy: React.FC<{
  vid: string;
  score: BookScore;
  parts: LearnPart[];
  rec: LearnRecord;
  today: string;
  loaded: boolean;
  current: number | 'all';
  onPick: (part: number | 'all') => void;
  voice: Voice;
  voiceName: string;
  title: string;
  uid: string | null;
  unlimited: boolean;
  approved: (sendId: string) => boolean;
  onTry: (part: number, pct: number, ok: boolean) => void;
}> = ({ vid, score, parts, rec, today, loaded, current, onPick, voice, voiceName, title, uid, unlimited, approved, onTry }) => {
  const vi = Number(voice) - 1;
  const many = score.voices.length > 1;
  const joined = current === 'all';
  const at = joined ? 0 : Math.max(0, Math.min(parts.length - 1, current));
  // the phrases learned from the first on, joined („ნასწავლი ფრაზები ერთად“)
  const run = (() => { let k = 0; while (k < parts.length && (rec[k]?.level ?? 0) >= 1) k++; return k; })();
  const part: LearnPart = useMemo(() => {
    if (!joined) return parts[at] ?? parts[0];
    const last = parts[Math.max(0, run - 1)];
    return { b0: parts[0].b0, b1: last.b1, s0: parts[0].s0, s1: last.s1, sys: parts.slice(0, Math.max(1, run)).flatMap(p => p.sys) };
  }, [parts, at, joined, run]);
  const pieces = useMemo(() => (joined ? [] : chunksOfPart(score, vi, part)), [score, vi, part, joined]);
  const steps: Stage[] = useMemo(() => [
    ...(pieces.length > 1 ? pieces.map((_, i) => i) : []),
    ...(many ? ['together' as const] : []),
    'whole' as const,
  ], [pieces.length, many]);

  const [stage, setStage] = useState<Stage>('whole');
  const [heard, setHeard] = useState(false);
  const [passed, setPassed] = useState<boolean[]>([]);
  const [togetherDone, setTogetherDone] = useState(false);
  const [loops, setLoops] = useState(0);
  const [speed, setSpeedState] = useState(readSpeed);
  const [tone, setToneState] = useState(readTone);
  const [phones, setPhonesState] = useState(readPhones);
  const [mix, setMix] = useState<Mix>('mine');
  const [playing, setPlaying] = useState(false);
  const [counting, setCounting] = useState(false);
  const [beat, setBeat] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const [sent, setSent] = useState<'no' | 'busy' | 'yes' | 'failed'>('no');
  const [selfCheck, setSelfCheck] = useState(false);
  const [mirror, setMirror] = useState(false);
  const [ai, setAi] = useState<{ busy: boolean; text: string; problem: string }>({ busy: false, text: '', problem: '' });
  // the notes big (BigNotes): a history step of its own, so the phone's back closes only it
  const [big, setBig] = useState(false);
  const openBig = () => {
    triggerHaptic(8);
    try { window.history.pushState({ ...(window.history.state || {}), sgLearnBig: 1 }, ''); } catch { /* still opens */ }
    setBig(true);
  };
  const closeBig = () => { if (window.history.state?.sgLearnBig) window.history.back(); else setBig(false); };
  // a phone held upright: the big notes halve each line, so they come out twice as large
  const [upright, setUpright] = useState(() => window.matchMedia(UPRIGHT).matches);
  useEffect(() => {
    const mq = window.matchMedia(UPRIGHT);
    const change = () => setUpright(mq.matches);
    mq.addEventListener('change', change);
    return () => mq.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    if (!big) return;
    const onPop = (e: PopStateEvent) => { if (!e.state?.sgLearnBig) setBig(false); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [big]);
  const synth = useMemo(() => new ChantSynth(score), [score]);
  const time = useMemo(() => makeTimeMap(score.tempos), [score]);
  const raf = useRef(0);
  const countTimer = useRef(0);
  const toastTimer = useRef(0);
  const stageRef = useRef<Stage>(stage);
  stageRef.current = stage;
  const loopsRef = useRef(0);
  const lastPos = useRef(0);

  const whole = stage === 'whole';
  const together = stage === 'together';
  const range = typeof stage === 'number' && pieces[stage] ? pieces[stage] : part;
  const target = useMemo(() => melodyIn(score, vi, range.b0, range.b1), [score, vi, range.b0, range.b1]);
  const learnedHere = !joined && (rec[at]?.level ?? 0) >= 1;

  const setSpeed = (v: number) => { setSpeedState(v); remember(SPEED_KEY, String(v)); };
  const setTone = (v: number) => { const n = Math.max(-7, Math.min(7, v)); setToneState(n); remember(TONE_KEY, String(n)); };
  const setPhones = (v: boolean) => { setPhonesState(v); remember(PHONES_KEY, v ? '1' : '0'); };

  // a new phrase or voice: its first step — a learned phrase (a review) goes straight to singing it alone
  const startedFor = useRef('');
  useEffect(() => {
    if (!loaded) return;
    const key = `${current}|${voice}`;
    if (startedFor.current === key) return;
    startedFor.current = key;
    setPassed([]);
    setTogetherDone(false);
    goStage(joined ? (many ? 'together' : 'whole') : learnedHere ? 'whole' : steps[0]);
  }, [current, voice, loaded, steps]);

  // what sounds: the step's choice, „ჩემი ხმა წინ“ = the others quieter; earphones: me left, the others right
  useEffect(() => {
    score.voices.forEach((_, i) => {
      const me = i === vi;
      synth.setMuted(i, mix === 'mine' ? !me : mix === 'others' ? me : false);
      synth.setVolume(i, mix === 'lead' && !me ? LEAD_OTHERS : 1);
      synth.setPan(i, phones && (mix === 'all' || mix === 'lead') ? (me ? -1 : 1) : 0);
    });
  }, [synth, mix, vi, score, phones]);
  useEffect(() => { synth.setSpeed(speed); }, [synth, speed]);
  useEffect(() => { synth.setTranspose(tone); }, [synth, tone]);
  // listening plays once; „ერთად“ goes round with a breath
  useEffect(() => { synth.once = !together; synth.loopGap = together ? BREATH : 0; }, [synth, together]);
  useEffect(() => {
    synth.setLoop(range.s0, range.s1);
    synth.seek(range.s0);
    setBeat(null);
    lastPos.current = range.s0;
  }, [synth, range.s0, range.s1]);
  useEffect(() => {
    synth.onEnd = () => { setPlaying(false); setBeat(null); setHeard(true); };
    return () => {
      cancelAnimationFrame(raf.current);
      window.clearTimeout(countTimer.current);
      window.clearTimeout(toastTimer.current);
      synth.onEnd = undefined;
      synth.dispose();
    };
  }, [synth]);

  const say3 = (text: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = window.setTimeout(() => setToast(''), 3000);
  };

  const follow = () => {
    const pos = synth.position();
    // back at the phrase's start: once more round; after three the path moves on to singing alone
    if (stageRef.current === 'together' && pos < lastPos.current - 0.2) {
      loopsRef.current += 1;
      setLoops(loopsRef.current);
      if (loopsRef.current >= LOOPS_PER_STEP) {
        triggerHaptic(30);
        say3(`${LOOPS_PER_STEP} წრე მორჩა — ახლა: მარტო`);
        endTogether();
        return;
      }
    }
    lastPos.current = pos;
    setBeat(time.toBeat(pos));
    if (synth.playing) raf.current = requestAnimationFrame(follow);
    else setBeat(null);
  };
  const startFollow = () => { cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(follow); };

  function stop() {
    synth.pause();
    window.clearTimeout(countTimer.current);
    cancelAnimationFrame(raf.current);
    setCounting(false);
    setPlaying(false);
    setBeat(null);
  }
  const listen = async () => {
    triggerHaptic(10);
    if (synth.playing || counting) { stop(); return; }
    await synth.play(range.s0);
    setPlaying(true);
    startFollow();
  };
  // „ერთად“: my first note and two taps at the phrase's pace, then the phrase goes round
  const singAlong = async () => {
    triggerHaptic(10);
    if (synth.playing || counting) { stop(); return; }
    setCounting(true);
    const beatSec = (time.toSec(range.b0 + 1) - time.toSec(range.b0)) / speed;
    const wait = await countIn(target[0] ?? null, beatSec, tone).catch(() => 0);
    countTimer.current = window.setTimeout(async () => {
      setCounting(false);
      lastPos.current = range.s0;
      await synth.play(range.s0);
      setPlaying(true);
      startFollow();
    }, Math.max(0, wait - 50));
  };
  function endTogether() {
    setTogetherDone(true);
    goStage('whole', true);
  }

  function goStage(s: Stage, alreadyHeard = false) {
    stop();
    setStage(s);
    setHeard(alreadyHeard);
    setSent('no');
    setSelfCheck(false);
    setMirror(false);
    setAi({ busy: false, text: '', problem: '' });
    setMix(s === 'together' ? (many ? 'others' : 'all') : 'mine');
    loopsRef.current = 0;
    setLoops(0);
  }

  const singing = useSinging({
    target, cue: target[0] ?? null, seconds: range.s1 - range.s0, resetKey: `${current}|${voice}|${stage}`, onBeforeSing: stop,
    transpose: tone,
    onScored: pct => {
      if (whole) {
        if (!joined) onTry(at, pct, pct >= LEARNED_SHARE);
        triggerHaptic(pct >= LEARNED_SHARE ? 30 : 12);
        return;
      }
      if (pct >= PIECE_PASS) setPassed(p => { const n = [...p]; n[stage as number] = true; return n; });
      triggerHaptic(pct >= PIECE_PASS ? 24 : 12);
    },
  });
  const { phase, result, live, error, busy } = singing;
  const canSing = singingSupported() && !error;
  const pass = whole ? LEARNED_SHARE : PIECE_PASS;
  const ok = result != null && result.pct >= pass;
  const hit = result ? result.hits.filter(Boolean).length : 0;

  // after singing: my notes on the picture, green or red — where the lines' staves were read; else the dots
  const groups = useMemo(() => melodyGroups(score, vi, range.b0, range.b1), [score, vi, range.b0, range.b1]);
  const markable = part.sys.every(k => score.ny?.[k]?.[vi] && score.nx?.[k]);
  const marks = result && !busy && result.pct >= 0 && result.hits.length === groups.length && markable
    ? groups.flatMap((beats, i) => beats.map(b => ({ beat: b, ok: result.hits[i] })))
    : null;

  const nextPiece = () => {
    const s = stage as number;
    if (s + 1 < pieces.length) goStage(s + 1);
    else goStage(many ? 'together' : 'whole');
  };
  // where to go after this phrase: the next one still to learn or review today — after it, else from the start
  const open = (i: number) => i !== at && ['new', 'learning', 'due'].includes(partState(rec[i], today));
  const nextPart = (() => {
    if (joined) return -1;
    for (let i = at + 1; i < parts.length; i++) if (open(i)) return i;
    for (let i = 0; i < at; i++) if (open(i)) return i;
    return -1;
  })();
  const pick = (p: number | 'all') => { triggerHaptic(10); onPick(p); };

  // what to do now: one sentence and one big button
  let say: React.ReactNode;
  let main: { label: string; icon: React.ReactNode; run: () => void; disabled?: boolean };
  if (together) {
    if (counting) {
      say = 'ჯერ შენი პირველი ნოტი, მერე ორი დაკვრა — და დაიწყე.';
      main = { label: 'გაჩერება', icon: <Square fill="currentColor" />, run: singAlong };
    } else if (playing) {
      say = many ? 'იმღერე შენი ხმა დანარჩენებთან ერთად. მიჰყევი ნიშანს ნოტებზე.' : 'იმღერე ერთად. მიჰყევი ნიშანს ნოტებზე.';
      main = { label: 'გაჩერება', icon: <Square fill="currentColor" />, run: singAlong };
    } else {
      say = 'ახლა ერთად: დანარჩენი ხმები ჟღერს, შენ შენს ხმას მღერი. სამი წრის მერე — მარტო.';
      main = { label: loops > 0 ? 'გააგრძელე ერთად' : 'დაიწყე ერთად', icon: <Users />, run: singAlong };
    }
  } else if (playing) {
    say = whole ? 'ისმის მთლიანი ფრაზა — შენი ხმა.' : 'ისმის ნაწყვეტი — მიჰყევი ოქროსფერ ადგილს ნოტებზე.';
    main = { label: 'გაჩერება', icon: <Square fill="currentColor" />, run: listen };
  } else if (phase === 'cue') {
    say = 'ისმის პირველი ნოტი…';
    main = { label: 'გაუქმება', icon: <Square fill="currentColor" />, run: singing.sing };
  } else if (phase === 'singing') {
    say = <>გისმენ{live != null ? <> · <b className="text-[#7a2028]">{noteName(live)}</b></> : '…'} <span className="text-[#8c7c6b]">გაჩუმდები — თვითონ გაჩერდება.</span></>;
    main = { label: 'დავამთავრე', icon: <Square fill="currentColor" />, run: singing.sing };
  } else if (phase === 'scoring') {
    say = 'ვამოწმებ…';
    main = { label: 'ვამოწმებ…', icon: <Mic />, run: () => undefined, disabled: true };
  } else if (selfCheck || (result && ok)) {
    // done with this bit (sung right, or said so without a microphone)
    if (!whole) {
      say = result && ok ? <><b className="text-[#2f6b43]">კარგია!</b> {hit} ნოტი {result.hits.length}-დან.</> : 'კარგია! გადავიდეთ შემდეგზე.';
      const last = (stage as number) + 1 >= pieces.length;
      main = { label: last ? (many ? 'ახლა ერთად' : 'ახლა მთლიანი ფრაზა') : 'შემდეგი ნაწყვეტი', icon: <ChevronRight />, run: nextPiece };
    } else if (joined) {
      say = <><b className="text-[#2f6b43]">ყოჩაღ!</b> ნასწავლი ფრაზები ერთად გამოგივიდა.</>;
      main = { label: 'კიდევ ერთხელ', icon: <RotateCcw />, run: () => goStage(many ? 'together' : 'whole') };
    } else {
      say = <><b className="text-[#2f6b43]">ყოჩაღ! ეს ფრაზა ნასწავლია.</b> გამეორებას აპი შეგახსენებს.</>;
      main = nextPart >= 0
        ? { label: nextPart > at ? 'შემდეგი ფრაზა' : `ფრაზა ${nextPart + 1}`, icon: <ChevronRight />, run: () => pick(nextPart) }
        : parts.length > 1
          ? { label: 'ყველა ფრაზა ერთად', icon: <ChevronRight />, run: () => pick('all') }
          : { label: 'კიდევ ერთხელ', icon: <RotateCcw />, run: () => goStage(steps[0]) };
    }
  } else if (result) {
    say = <>{hit} ნოტი {result.hits.length}-დან. {whole ? (joined ? 'კიდევ სცადე!' : `ნასწავლად ჩაითვლება ${LEARNED_SHARE}%-ზე.`) : 'კიდევ მოისმინე და სცადე — გამოგივა!'}</>;
    main = { label: 'კიდევ ვცდი', icon: <Mic />, run: singing.sing };
  } else if (!heard) {
    say = whole
      ? (joined ? 'მოისმინე ნასწავლი ფრაზები ერთად — შენი ხმა.' : learnedHere ? 'გამეორება: ჯერ მოისმინე მთლიანი ფრაზა.' : 'მოისმინე მთლიანი ფრაზა — შენი ხმა.')
      : 'მოისმინე ეს პატარა ნაწყვეტი — ნოტებზე ოქროსფრად ჩანს.';
    main = { label: whole ? 'მოისმინე ფრაზა' : 'მოისმინე', icon: <Play fill="currentColor" />, run: listen };
  } else if (!canSing) {
    say = whole ? 'ახლა იმღერე მთლიანი ფრაზა ხმამაღლა.' : 'ახლა იმღერე იგივე ხმამაღლა. გამოგივიდა?';
    main = { label: whole ? 'ვიცი' : 'გამომივიდა', icon: <Check />, run: () => { triggerHaptic(20); setSelfCheck(true); if (whole && !joined) onTry(at, -1, true); } };
  } else {
    say = whole ? 'ახლა მარტო: იმღერე მთლიანი ფრაზა. ჯერ პირველ ნოტს გაიგებ.' : 'ახლა შენ: იმღერე იგივე. ჯერ პირველ ნოტს გაიგებ.';
    main = { label: 'ახლა შენ — იმღერე', icon: <Mic />, run: singing.sing };
  }

  const sendId = learnTakeId(vid, joined ? 'all' : at);
  const partName = joined ? 'ნასწავლი ფრაზები ერთად' : `${ordinal(at + 1)} ფრაზა`;
  const send = async () => {
    if (!result?.mp3 || !uid) return;
    setSent('busy');
    try { await saveTake(uid, sendId, result.mp3, Math.max(0, result.pct), voice); setSent('yes'); triggerHaptic(20); }
    catch (e) { console.warn('learn take send:', (e as { code?: string })?.code || e); setSent('failed'); }
  };
  const askAi = async () => {
    if (!result?.mp3 || !uid) return;
    setAi({ busy: true, text: '', problem: '' });
    try {
      const text = await askAiTeacher(uid, result.mp3, { title, voice: voiceName, what: partName, notes: target.map(noteName), hit }, unlimited);
      setAi({ busy: false, text, problem: '' });
    } catch (e) {
      setAi({ busy: false, text: '', problem: AI_PROBLEM_TEXT[e instanceof AiTeacherError ? e.kind : 'failed'] });
    }
  };
  const aiLeft = uid ? aiTriesLeft(uid, unlimited) : 0;

  const learned = parts.filter((_, i) => (rec[i]?.level ?? 0) >= 1).length;
  const due = parts.filter((_, i) => partState(rec[i], today) === 'due').length;
  // where I am on the phrase's path: „ნაბიჯი 2 / 4“ (the pills beside it name the steps)
  const stepAt = steps.indexOf(stage);
  const stepLabel = stepAt >= 0 ? `ნაბიჯი ${stepAt + 1} / ${steps.length}` : together ? 'ერთად' : 'მარტო';
  const doneOf = (s: Stage) => (s === 'whole' ? (joined ? false : learnedHere) : s === 'together' ? togetherDone : passed[s as number]);
  const timeline = useMemo(() => (whole ? timelineIn(score, vi, range.b0, range.b1) : []), [whole, score, vi, range.b0, range.b1]);
  const summary = `${Math.round(speed * 100)}%${many ? ` · ${MIX_LABEL[mix]}` : ''}${tone ? ` · ტონი ${signed(tone)}` : ''}${many && phones ? ' · ყურსასმენი' : ''}`;

  return (
    <>
      {/* where I am: the phrase, the arrows, how many are learned */}
      <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] p-2 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => pick(joined ? 0 : at - 1)} disabled={!joined && at <= 0} aria-label="წინა ფრაზა"
            className="w-11 h-11 shrink-0 rounded-full grid place-items-center text-[#574739] hover:bg-[#f6efe3] disabled:opacity-30 cursor-pointer disabled:cursor-default">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0 text-center">
            {joined ? (
              <p className="text-[16px] font-extrabold text-[#2a2017] leading-tight">ფრაზები 1–{Math.max(1, run)} ერთად</p>
            ) : (
              <p className="text-[16px] font-extrabold text-[#2a2017] leading-tight">ფრაზა {at + 1} <span className="text-[#a0907c] font-bold">/ {parts.length}</span></p>
            )}
            <p className="text-[12.5px] font-semibold text-[#8c7c6b] leading-tight mt-0.5">
              {joined ? 'ვარჯიში — ფრაზებს თავისი ჩანაწერი რჩება' : learnedHere ? (partState(rec[at], today) === 'due' ? 'დღეს გასამეორებელია' : 'ნასწავლია ✓') : 'ახალი'}
              {' · '}ნასწავლი {learned}/{parts.length}{due > 0 && !learnedHere && !joined ? ` · გასამეორებელი ${due}` : ''}
            </p>
          </div>
          <button type="button" onClick={() => pick(joined ? parts.length - 1 : at + 1)} disabled={joined || at >= parts.length - 1} aria-label="შემდეგი ფრაზა"
            className="w-11 h-11 shrink-0 rounded-full grid place-items-center text-[#574739] hover:bg-[#f6efe3] disabled:opacity-30 cursor-pointer disabled:cursor-default">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="flex gap-1 h-2 px-1" aria-hidden>
          {parts.map((_, i) => {
            const s = partState(rec[i], today);
            const here = joined ? i < Math.max(1, run) : i === at;
            return <span key={i} className={`flex-1 rounded-full ${here ? 'outline outline-2 outline-offset-1 outline-[#7a2028]/60' : ''}`}
              style={{ background: DOT_COLOR[s] }} />;
          })}
        </div>
        {/* what the colours mean — only the states this chant has */}
        <p className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 px-1 text-[12px] font-semibold text-[#8c7c6b]" aria-hidden>
          {DOT_LEGEND.filter(([ss]) => parts.some((_, i) => ss.includes(partState(rec[i], today)))).map(([ss, word]) => (
            <span key={word} className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full ring-1 ring-[#d9cdb9]" style={{ background: DOT_COLOR[ss[0]] }} />{word}
            </span>
          ))}
        </p>
        {run >= 2 && !joined && (
          <button type="button" onClick={() => pick('all')}
            className="self-center h-9 px-3.5 rounded-full bg-[#fbf6ec] ring-1 ring-[#e8dcc8] text-[12.5px] font-bold text-[#4a3426] inline-flex items-center gap-1.5 cursor-pointer hover:ring-[#7a2028]/40">
            <Users className="w-4 h-4" />ნასწავლი ფრაზები ერთად (1–{run})
          </button>
        )}
      </section>

      <section className="rounded-2xl bg-white ring-2 ring-[#7a2028]/80 shadow-[0_10px_24px_-18px_rgba(122,32,40,0.7)] p-3.5 flex flex-col gap-3">
        {/* the steps of this phrase: pieces, together, alone — done ones golden; a tap goes to one */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-bold text-[#8c7c6b]">{stepLabel}</span>
          <div role="radiogroup" aria-label="ნაბიჯები" className="flex flex-wrap items-center gap-y-1.5 gap-x-1">
            {steps.map((s, i) => {
              const on = stage === s;
              const done = doneOf(s);
              const word = s === 'together' ? 'ერთად' : s === 'whole' ? 'მარტო' : on ? `ნაწყვეტი ${(s as number) + 1}` : null;
              return (
                // the arrow stays with its pill, so a wrapped row never ends on a loose „›“
                <span key={String(s)} className="inline-flex items-center gap-1">
                  {i > 0 && <ChevronRight className="w-3.5 h-3.5 shrink-0 text-[#c9bca6]" aria-hidden />}
                  <button type="button" role="radio" aria-checked={on} onClick={() => { triggerHaptic(8); goStage(s, s === 'whole' && togetherDone); }}
                    aria-label={typeof s === 'number' ? `ნაწყვეტი ${s + 1}` : word ?? ''}
                    className={`h-8 rounded-full text-[12.5px] font-bold cursor-pointer transition inline-flex items-center justify-center gap-1 ${word ? 'px-3' : 'w-8'} ${
                      on ? 'bg-[#7a2028] text-[#fbf6ec]' : done ? 'bg-[#c9962a] text-white' : 'bg-[#f6efe3] text-[#75685a] ring-1 ring-[#e8dcc8]'}`}>
                    {done && !on ? <Check className="w-4 h-4" /> : null}
                    {word ?? (done && !on ? null : (s as number) + 1)}
                  </button>
                </span>
              );
            })}
          </div>
        </div>

        {toast && (
          <p role="status" className="rounded-xl bg-[#fbf3df] ring-1 ring-[#e9cf8f] px-3 py-2 text-[13.5px] font-bold text-[#8a6a1e] text-center">{toast}</p>
        )}

        <PartPicture score={score} sys={part.sys} beat={beat} span={typeof stage === 'number' ? [range.b0, range.b1] : null} marks={marks} voice={vi}
          focus={many} onOpen={openBig} />

        <div className="flex items-start gap-2">
          <p className="flex-1 min-h-[2.75rem] text-[15px] leading-snug font-semibold text-[#2a2017]" aria-live="polite">{say}</p>
          {together && (
            <span className="shrink-0 mt-0.5 inline-flex items-center gap-1.5 text-[13px] font-bold text-[#8c7c6b] tabular-nums"
              title="ფრაზა წრეზე ჟღერს; სამის მერე აპი „მარტოზე“ გადაგიყვანს" aria-label={`წრე ${Math.min(loops, LOOPS_PER_STEP)} / ${LOOPS_PER_STEP}`}>
              <Repeat className="w-4 h-4" aria-hidden />{Math.min(loops, LOOPS_PER_STEP)}/{LOOPS_PER_STEP}
            </span>
          )}
        </div>

        {result && !busy && result.hits.length > 0 && !marks && (
          <div className="flex flex-wrap gap-1" aria-hidden>
            {result.hits.map((h, i) => <span key={i} className={`w-3.5 h-3.5 rounded-full ${h ? 'bg-[#c9962a]' : 'bg-[#e8dcc8]'}`} />)}
          </div>
        )}
        {marks && (
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] font-semibold text-[#75685a]" aria-hidden>
            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#2f8a4f]/25 ring-[1.5px] ring-[#2f8a4f]/70" />გამოგივიდა</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#c0392b]/20 ring-[1.5px] ring-[#c0392b]/70" />ჯერ არა</span>
          </p>
        )}

        <button type="button" onClick={main.run} disabled={main.disabled}
          className="relative w-full min-h-14 rounded-2xl bg-[#7a2028] text-[#fbf6ec] inline-flex items-center justify-center gap-2.5 text-[16px] font-bold cursor-pointer active:scale-[0.985] transition shadow-[0_10px_20px_-12px_rgba(122,32,40,0.9)] disabled:opacity-60 disabled:cursor-default [&_svg]:w-5 [&_svg]:h-5">
          {(phase === 'singing' || counting) && <span className="absolute inset-0 rounded-2xl bg-[#7a2028]/40 animate-pulse motion-reduce:hidden" aria-hidden />}
          <span className="relative inline-flex items-center gap-2.5">{main.icon}{main.label}</span>
        </button>

        {/* the quieter choices */}
        <div className="flex flex-wrap items-center gap-2">
          {heard && !playing && !busy && !together && (
            <SmallBtn onClick={listen} icon={<RotateCcw className="w-4 h-4" />}>კიდევ მოისმინე</SmallBtn>
          )}
          <button type="button" role="switch" aria-checked={speed === 0.5}
            onClick={() => { triggerHaptic(8); setSpeed(speed === 0.5 ? 0.75 : 0.5); }}
            className={`h-10 px-3.5 rounded-full text-[13px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
              speed === 0.5 ? 'bg-[#fbf3df] text-[#8a6a1e] ring-1 ring-[#e9cf8f]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/40'}`}>
            <Snail className="w-4 h-4" />ნელა{speed === 0.5 && <Check className="w-3.5 h-3.5" />}
          </button>
          {together && !counting && (
            <SmallBtn onClick={() => { triggerHaptic(8); endTogether(); }} icon={<ChevronRight className="w-4 h-4" />}>მზად ვარ — მარტო</SmallBtn>
          )}
          {whole && pieces.length > 1 && !busy && !playing && (
            <SmallBtn onClick={() => { triggerHaptic(8); goStage(0); }}>ნაწყვეტებით</SmallBtn>
          )}
          {!whole && !together && result && !ok && !busy && (
            <button type="button" onClick={() => { triggerHaptic(8); nextPiece(); }}
              className="h-10 px-3.5 rounded-full text-[13px] font-bold text-[#8c7c6b] cursor-pointer hover:text-[#4a3426]">
              გამოტოვება
            </button>
          )}
        </div>

        {error && <p className="rounded-xl bg-amber-50 ring-1 ring-amber-200 px-3 py-2 text-[13px] text-amber-900">{error} ან უბრალოდ იმღერე ხმამაღლა.</p>}
        {!singingSupported() && <p className="rounded-xl bg-amber-50 ring-1 ring-amber-200 px-3 py-2 text-[13px] text-amber-900">ამ ბრაუზერში მიკროფონი ვერ ჩაირთვება, ამიტომ აპი ვერ შეგიმოწმებს — იმღერე ხმამაღლა და თავად მონიშნე.</p>}

        {/* the whole phrase sung: hear myself, the mirror, the AI teacher, send it to the teacher */}
        {whole && result?.mp3 && !busy && (
          <div className="flex flex-col gap-2">
            <div className={`grid gap-2 ${uid ? 'grid-cols-2' : ''}`}>
              <SmallBtn wide onClick={singing.playTake} icon={<Headphones className="w-4 h-4" />}>მომისმინე</SmallBtn>
              {uid && (
                <SmallBtn wide onClick={askAi} disabled={ai.busy || aiLeft <= 0} icon={<Sparkles className="w-4 h-4" />}>
                  {ai.busy ? 'უსმენს…' : 'AI მასწავლებელი'}{Number.isFinite(aiLeft) && !ai.busy ? ` · ${aiLeft}` : ''}
                </SmallBtn>
              )}
            </div>
            {(ai.text || ai.problem) && (
              <div className={`rounded-xl p-3.5 ${ai.problem ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-[#fbf6ec] ring-1 ring-[#e8dcc8]'}`}>
                {ai.text && <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold text-[#7a2028]"><Sparkles className="w-4 h-4" />AI მასწავლებელი</p>}
                <p className="text-[14px] leading-relaxed text-[#4a3426] whitespace-pre-line">{ai.text || ai.problem}</p>
              </div>
            )}
            {uid && (sent === 'yes'
              ? <p className="min-h-11 flex items-center justify-center gap-1.5 text-[13px] font-bold text-[#8a6a1e]"><Check className="w-4 h-4" />გაეგზავნა მასწავლებელს</p>
              : <SmallBtn wide onClick={send} disabled={sent === 'busy'} icon={<Send className="w-4 h-4" />}>{sent === 'busy' ? 'იგზავნება…' : 'გაუგზავნე მასწავლებელს'}</SmallBtn>)}
            {sent === 'failed' && <p className="text-[13px] text-red-700 text-center">ვერ გაიგზავნა — ინტერნეტი შეამოწმე და კიდევ სცადე.</p>}
            {!uid && <p className="text-[13px] text-[#8c7c6b] text-center">მასწავლებლისთვის გასაგზავნად შედი შენი ანგარიშით.</p>}
          </div>
        )}
        {whole && result && !busy && timeline.length > 0 && (
          <div className="rounded-xl bg-[#fbf6ec] ring-1 ring-[#efe5d4]">
            <button type="button" onClick={() => { triggerHaptic(8); setMirror(o => !o); }} aria-expanded={mirror}
              className="w-full min-h-11 px-3 flex items-center gap-2 text-left cursor-pointer">
              <span className="flex-1 text-[13px] font-bold text-[#4a3426]">დეტალურად</span>
              <span className="text-[12px] text-[#8c7c6b]">ნოტები და შენი ხმა</span>
              <ChevronDown className={`w-4 h-4 shrink-0 text-[#8c7c6b] transition-transform ${mirror ? 'rotate-180' : ''}`} />
            </button>
            {mirror && (
              <div className="px-3 pb-3">
                <LearnMirror notes={timeline} seconds={range.s1 - range.s0} frames={singing.frames.current} offset={singing.offset.current}
                  hits={result.pct >= 0 ? result.hits : null} live={false} />
              </div>
            )}
          </div>
        )}
        {whole && !joined && approved(sendId) && (
          <p className="flex items-center justify-center gap-1.5 text-[13px] font-bold text-[#8a6a1e]"><Check className="w-4 h-4" />მასწავლებელმა ჩაგითვალა</p>
        )}

        <SettingsFold summary={summary}>
          <Choice<number> label="სისწრაფე" value={speed} onChange={setSpeed} options={SPEEDS} />
          {many && (
            <Choice<Mix> label="რა ისმის" value={mix} onChange={setMix}
              options={(['mine', 'lead', 'all', 'others'] as Mix[]).map(m => ({ value: m, label: MIX_LABEL[m] }))} />
          )}
          <div className="flex flex-col gap-1.5">
            <span className="px-0.5 text-[12px] font-bold text-[#8c7c6b]">ტონი</span>
            <div className="flex items-center gap-2">
              <RoundBtn label="დაბლა" onClick={() => setTone(tone - 1)} disabled={tone <= -7}><Minus className="w-4 h-4" /></RoundBtn>
              <span className="min-w-[3.5rem] text-center text-[15px] font-bold text-[#4a3426] tabular-nums">{tone ? signed(tone) : '0'}</span>
              <RoundBtn label="მაღლა" onClick={() => setTone(tone + 1)} disabled={tone >= 7}><Plus className="w-4 h-4" /></RoundBtn>
              {tone !== 0 && (
                <button type="button" onClick={() => { triggerHaptic(8); setTone(0); }}
                  className="h-10 px-3 rounded-full text-[13px] font-bold text-[#8c7c6b] cursor-pointer hover:text-[#4a3426]">ნოტებისაზე</button>
              )}
            </div>
          </div>
          {many && (
            <div className="flex items-center gap-2.5">
              <Headphones className="w-4 h-4 shrink-0 text-[#8c7c6b]" />
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-bold text-[#4a3426]">ყურსასმენი</span>
                <span className="block text-[12px] leading-snug text-[#8c7c6b]">შენი ხმა მარცხენა ყურში, დანარჩენები — მარჯვენაში („ყველა“ და „ჩემი ხმა წინ“)</span>
              </span>
              <button type="button" role="switch" aria-checked={phones} aria-label="ყურსასმენი" onClick={() => { triggerHaptic(8); setPhones(!phones); }}
                className={`relative w-12 h-7 shrink-0 rounded-full transition-colors cursor-pointer ${phones ? 'bg-[#7a2028]' : 'bg-[#d9cdb9]'}`}>
                <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-[left] ${phones ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
          )}
          {many && <p className="text-[12.5px] leading-snug text-[#8c7c6b]">„რა ისმის“-ს ყოველი ნაბიჯი თავად ირჩევს — აქ მაშინ შეცვალე, თუ სხვანაირად გინდა.</p>}
        </SettingsFold>
      </section>

      {big && (
        <BigNotes title={joined ? `ფრაზები 1–${Math.max(1, run)} ერთად` : `ფრაზა ${at + 1} / ${parts.length}`} step={stepLabel} onClose={closeBig}
          say={say} main={main} pulse={phase === 'singing' || counting}>
          <PartPicture score={score} sys={part.sys} beat={beat} span={typeof stage === 'number' ? [range.b0, range.b1] : null} marks={marks} voice={vi} focus={many}
            split={upright} />
        </BigNotes>
      )}
    </>
  );
};

/** The notes big, over the whole screen (2026-11-07, stage 2 of the plan): the phrase's lines as wide as the screen — on an
 *  upright phone each line in two halves, on its side the words and the button stand beside them —, the mark still follows the sound, and the same one
 *  big button, so the phrase can be learned from here. The phone's back closes it (its own history step, inside the frame's). */
const BigNotes: React.FC<{
  title: string; step: string; onClose: () => void; say: React.ReactNode;
  main: { label: string; icon: React.ReactNode; run: () => void; disabled?: boolean }; pulse: boolean; children: React.ReactNode;
}> = ({ title, step, onClose, say, main, pulse, children }) => createPortal(
  <div className="fixed inset-0 z-[95] flex flex-col bg-[#faf6ef]" role="dialog" aria-modal="true" aria-label={`ნოტები დიდად · ${title}`}>
    <div className="safe-top safe-x shrink-0 border-b border-[#e4d8c4]">
      <div className="h-14 [@media(max-height:500px)]:h-12 px-3 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-[#2a2017] leading-tight">{title}</p>
          <p className="truncate text-[12px] font-semibold text-[#8c7c6b] leading-tight">{step}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="დახურვა" title="დახურვა"
          className="w-11 h-11 shrink-0 rounded-full grid place-items-center text-[#574739] hover:bg-[#f1e9dc] active:scale-95 transition cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
    <div className="flex-1 min-h-0 flex flex-col [@media(max-height:500px)]:flex-row safe-x">
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 flex flex-col gap-2">
        {children}
      </div>
      <div className="shrink-0 safe-bottom border-t border-[#e4d8c4] [@media(max-height:500px)]:border-t-0 [@media(max-height:500px)]:border-l [@media(max-height:500px)]:w-60 px-3 pt-2.5 pb-3 flex flex-col justify-center gap-2.5 bg-white/60">
        <p className="text-[14.5px] leading-snug font-semibold text-[#2a2017]" aria-live="polite">{say}</p>
        <button type="button" onClick={main.run} disabled={main.disabled}
          className="relative w-full min-h-14 rounded-2xl bg-[#7a2028] text-[#fbf6ec] inline-flex items-center justify-center gap-2.5 text-[16px] font-bold cursor-pointer active:scale-[0.985] transition shadow-[0_10px_20px_-12px_rgba(122,32,40,0.9)] disabled:opacity-60 disabled:cursor-default [&_svg]:w-5 [&_svg]:h-5">
          {pulse && <span className="absolute inset-0 rounded-2xl bg-[#7a2028]/40 animate-pulse motion-reduce:hidden" aria-hidden />}
          <span className="relative inline-flex items-center gap-2.5">{main.icon}{main.label}</span>
        </button>
      </div>
    </div>
  </div>,
  document.body,
);

const SmallBtn: React.FC<{ onClick: () => void; icon?: React.ReactNode; disabled?: boolean; wide?: boolean; children: React.ReactNode }> = ({ onClick, icon, disabled, wide, children }) => (
  <button type="button" onClick={onClick} disabled={disabled}
    className={`${wide ? 'w-full min-h-11 justify-center px-3' : 'h-10 px-3.5'} rounded-full bg-white ring-1 ring-[#e8dcc8] text-[13px] font-bold text-[#4a3426] inline-flex items-center gap-1.5 cursor-pointer hover:ring-[#7a2028]/40 disabled:opacity-50 disabled:cursor-default`}>
    {icon}{children}
  </button>
);

const RoundBtn: React.FC<{ label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }> = ({ label, onClick, disabled, children }) => (
  <button type="button" aria-label={label} title={label} onClick={() => { triggerHaptic(8); onClick(); }} disabled={disabled}
    className="w-10 h-10 rounded-full bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] grid place-items-center cursor-pointer hover:ring-[#7a2028]/40 disabled:opacity-35 disabled:cursor-default">
    {children}
  </button>
);
