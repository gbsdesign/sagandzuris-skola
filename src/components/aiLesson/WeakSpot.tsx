import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Check, ChevronRight, Headphones, Mic, Square } from 'lucide-react';
import { playStartNotes } from '../../utils/chantSynth';
import { leapLabel, leapName, parseMiss, weakLine } from '../../utils/aiPlan';
import { ordinal, verdictLine, type TakeRead } from '../../utils/aiLesson';
import type { LearnRecord } from '../../utils/learn';
import { noteName } from '../../utils/pearls';
import { Button, Card, Duo, FOCUS, Num, Press, Row, Rows, cx } from '../ui2';
import { Bottom, TeacherSays } from './parts';
import { PhraseStep } from './PhraseStep';
import { PlayMark } from './Plan';
import { useTake } from './useTake';
import type { Phrase } from './useLessonData';
import { findDrill } from '../../data/vocalDrills';

const DrillSheet = React.lazy(() => import('../mastery/ManeraLessonSheet').then(m => ({ default: m.DrillSheet })));

/** the „ოსტატობა“ exercise for a leap's interval: the fourth, fifth and octave have their own, the rest the general one */
export const leapDrill = (leap: string) => {
  const p = parseMiss(leap);
  const d = p ? Math.abs(p[1] - p[0]) % 12 : 0;
  return d === 5 || d === 7 || d === 0 ? 'm-iv-basic-sing' : 'm-iv-all-sing';
};

// „სუსტი ადგილი“ (board ai-susti): in the day lesson, in place of the review, the leap missed most this week (utils/aiPlan's
// weakLeap) is practised in three steps — the leap alone (its two notes sound, the member sings them back; two right tries
// or four tries move on), the same leap in its phrase (PhraseStep as a review), and the interval „ყურით და ხმით“ — the
// „ოსტატობა“ exercise for it (`leapDrill`, opened over the lesson). The lesson's own top (LessonTop) is drawn by AiLesson above this.

/** „ხუთჯერ“ — how many times, in words */
const TIMES = ['ერთხელ', 'ორჯერ', 'სამჯერ', 'ოთხჯერ', 'ხუთჯერ', 'ექვსჯერ', 'შვიდჯერ', 'რვაჯერ', 'ცხრაჯერ', 'ათჯერ'];
export const timesWord = (n: number) => TIMES[n - 1] ?? `${n}-ჯერ`;

export interface WeakSpotRow { title: string; sub: string }

/** The three steps as the board lists them (the phrase's left out when there is none). */
export const weakSpotRows = (leap: string, n: number, phrase: Pick<Phrase, 'title' | 'part'> | null): WeakSpotRow[] => [
  { title: 'მხოლოდ ნახტომი', sub: `${leapLabel(leap)} · ${timesWord(n)}` },
  ...(phrase ? [{ title: 'იგივე — ფრაზაში', sub: `„${phrase.title}“, ფრაზა ${phrase.part + 1}` }] : []),
  { title: `${leapName(leap)} ყურით და ხმით`, sub: '„ოსტატობის“ სავარჯიშო' },
];

/** The weak spot's first screen (board ai-susti): what the teacher saw, the three steps, „დავიწყოთ“. Skipping it is the
 *  lesson's own ⋯ → „ამ ნაწილის გამოტოვება“. */
export const WeakSpotView: React.FC<{ say: string; rows: WeakSpotRow[]; onStart: () => void }> = ({ say, rows, onStart }) => (
  <>
    <div className="flex flex-col gap-3 px-4 pt-0.5 pb-4">
      <TeacherSays text={say}>{say}</TeacherSays>
      <Rows aria-label="დღევანდელი ვარჯიში">
        {rows.map((r, i) => <Row key={r.title} lead={<Num n={i + 1} on={i === 0} />} title={r.title} sub={r.sub} wrap right={null} />)}
      </Rows>
    </div>
    <Bottom>
      <Button full className="min-h-[52px]" icon={<PlayMark filled />} onClick={onStart}>დავიწყოთ</Button>
    </Bottom>
  </>
);

type Stage = 'intro' | 'leap' | 'phrase' | 'drill';

/** The weak-spot drill, all three steps. `leap` = „62>67“ (MIDI from>to); `phrase` = the phrase it was missed in, if known. */
export const WeakSpot: React.FC<{
  leap: string;
  n: number;
  phrase: Phrase | null;
  rec: LearnRecord | undefined;
  uid: string | null;
  today: string;
  /** the part's minutes are over: after this try the drill ends */
  timeUp: () => boolean;
  /** each try's share (0–1), for the lesson's tally */
  onTry: (share: number) => void;
  onDone: () => void;
}> = ({ leap, n, phrase, rec, uid, today, timeUp, onTry, onDone }) => {
  const pair = parseMiss(leap);
  const [stage, setStage] = useState<Stage>('intro');
  // a key that is not a leap: nothing to practise
  useEffect(() => { if (!pair) onDone(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!pair) return null;
  const [from, to] = pair;

  const names = ['ნახტომი', ...(phrase ? ['ფრაზაში'] : []), 'ოსტატობა'];
  const otherAt = phrase ? 2 : 1;
  const pills = (on: number) => <StepPills names={names} on={on} />;

  if (stage === 'intro') {
    return <WeakSpotView say={weakLine(leap, n)} rows={weakSpotRows(leap, n, phrase)} onStart={() => setStage('leap')} />;
  }
  if (stage === 'leap') {
    return (
      <LeapStep key="leap" from={from} to={to} title="მხოლოდ ნახტომი" need={2} maxTries={4} top={pills(0)}
        intro="მოუსმინე ორ ნოტს და გაიმეორე." nextWord={phrase ? 'ახლა — ფრაზაში.' : 'ახლა — „ოსტატობის“ სავარჯიშო.'}
        timeUp={timeUp} onTry={onTry} onEnd={late => (late ? onDone() : setStage(phrase ? 'phrase' : 'drill'))} />
    );
  }
  if (stage === 'phrase' && phrase) {
    return (
      <>
        <div className="shrink-0 px-4 pt-0.5 pb-3">{pills(1)}</div>
        <PhraseStep key="phrase" phrase={phrase} mode="review" rec={rec} uid={uid} today={today} timeUp={timeUp}
          slow={false} setSlow={() => undefined} onTry={onTry} onLearned={() => undefined}
          onDone={() => (timeUp() ? onDone() : setStage('drill'))} />
      </>
    );
  }
  return <DrillStep leap={leap} top={pills(otherAt)} onDone={onDone} />;
};

/** the third step: the „ოსტატობა“ exercise of the leap's interval, opened over the lesson; closing it ends the drill */
const DrillStep: React.FC<{ leap: string; top: React.ReactNode; onDone: () => void }> = ({ leap, top, onDone }) => {
  const id = leapDrill(leap);
  const title = findDrill(id)?.title ?? '';
  const [open, setOpen] = useState(false);
  const say = `ახლა — „ოსტატობის“ სავარჯიშო: ${title}.`;
  return (
    <>
      <div className="flex flex-col gap-3 px-4 pt-0.5 pb-4">
        {top}
        <TeacherSays text={say}>{say}</TeacherSays>
      </div>
      <Bottom>
        <Duo>
          <Button kind="ghost" onClick={onDone}>დღეს არა</Button>
          <Button icon={<PlayMark filled />} onClick={() => setOpen(true)}>გავხსნათ</Button>
        </Duo>
      </Bottom>
      {open && (
        <React.Suspense fallback={null}>
          <DrillSheet drillId={id} onClose={() => { setOpen(false); onDone(); }} />
        </React.Suspense>
      )}
    </>
  );
};

/** The drill's steps as pills: the one on now filled, the ones passed ticked (like the phrase's `Way`). */
const StepPills: React.FC<{ names: string[]; on: number }> = ({ names, on }) => (
  <div aria-label="ვარჯიშის გზა" className="flex shrink-0 gap-1.5">
    {names.map((name, i) => (
      <span key={name} aria-current={i === on ? 'step' : undefined}
        className={cx('flex h-icon min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-meta font-bold [&_svg]:size-3.5 [&_svg]:shrink-0',
          i === on ? 'bg-wine text-white' : i < on ? 'bg-surf text-ink' : 'bg-surf text-mut')}>
        {i < on && <Check strokeWidth={2.5} />}<span className="truncate">{name}</span>
      </span>
    ))}
  </div>
);

const GAP = 0.7;
const LEN = 0.9;
const LENGTHS = [LEN, LEN];
const AUTO_NEXT_MS = 2200;
const SOUND_GUARD_MS = 3200;
const QUIET = 'ხმა ვერ გავიგონე. ტელეფონი ახლოს მოიტანე.';

/** one correction for the leap's two notes: the landing note first (the app's ready words) */
const fixOf = (r: TakeRead) => {
  const i = r.notes[1] && !r.notes[1].hit ? 1 : 0;
  const d = r.notes[i]?.dev;
  return d != null && Math.abs(d) >= 0.3 ? `${ordinal(i + 1)} ნოტი ცოტა ${d > 0 ? 'მაღლა' : 'დაბლა'} იყო.` : `${ordinal(i + 1)} ნოტი არ გაისმა.`;
};

type NoteLook = 'idle' | 'sound' | 'hit' | 'miss';

/** One of the leap's two notes: its name big in a round; sounding gold, sung right wine, missed pale gold (never red). */
const LeapNote: React.FC<{ name: string; look: NoteLook; word: string; lift: number }> = ({ name, look, word, lift }) => (
  <div className="flex flex-col items-center gap-1" style={{ marginBottom: lift }}>
    <span className={cx('flex size-[72px] items-center justify-center rounded-full text-title font-bold transition-colors',
      look === 'sound' ? 'bg-gold-ink text-white' : look === 'hit' ? 'bg-wine text-white' : look === 'miss' ? 'bg-gold-tint text-gold-ink' : 'bg-tint text-wine')}>
      {name}
    </span>
    <span className="h-4 text-cap leading-4 font-bold whitespace-nowrap text-gold-ink">{word}</span>
  </div>
);

/** The leap sung alone: the two notes sound, the member sings them back; `need` right tries or `maxTries` tries end it. */
export const LeapStep: React.FC<{
  from: number;
  to: number;
  title: string;
  need: number;
  maxTries: number;
  /** the teacher's words before the first try */
  intro: string;
  /** said when the step is over (the way on) */
  nextWord: string;
  top?: React.ReactNode;
  timeUp: () => boolean;
  onTry: (share: number) => void;
  /** the step is over; `late` = the part's minutes ran out */
  onEnd: (late: boolean) => void;
}> = ({ from, to, title, need, maxTries, intro, nextWord, top, timeUp, onTry, onEnd }) => {
  const target = useMemo(() => [from, to], [from, to]);
  const [sounding, setSounding] = useState<number | null>(null);
  const timers = useRef<number[]>([]);
  const clearTimers = () => { timers.current.forEach(t => window.clearTimeout(t)); timers.current = []; };
  const take = useTake({ target, lengths: LENGTHS, resetKey: `${from}>${to}`, onBefore: () => { clearTimers(); setSounding(null); } });
  const [tries, setTries] = useState(0);
  const [passes, setPasses] = useState(0);
  const [said, setSaid] = useState('');
  const [end, setEnd] = useState<null | 'next' | 'late'>(null);
  const auto = useRef(0);

  // the two notes, one after the other; each round lights while it sounds
  const hear = () => {
    clearTimers();
    setSounding(-1);
    // the buttons come back even if the sound never starts
    timers.current.push(window.setTimeout(() => setSounding(null), SOUND_GUARD_MS));
    playStartNotes(target, 0, false, GAP, LEN).then(starts => {
      starts.forEach((ms, i) => timers.current.push(window.setTimeout(() => setSounding(i), ms)));
      timers.current.push(window.setTimeout(() => setSounding(null), (starts[starts.length - 1] ?? 0) + LEN * 1000));
    }).catch(() => setSounding(null));
  };
  useEffect(() => {
    hear();
    return () => { clearTimers(); window.clearTimeout(auto.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // a take ends: count it, say it, and see whether the step is over
  const seen = useRef<unknown>(null);
  useEffect(() => {
    const r = take.result;
    if (!r || take.phase !== 'done' || seen.current === r) return;
    seen.current = r;
    if (!r.read.heard) { setSaid(QUIET); return; }
    const ok = r.read.hits === r.read.n;
    const t = tries + 1;
    const p = passes + (ok ? 1 : 0);
    setTries(t);
    setPasses(p);
    onTry(r.share);
    const late = timeUp();
    const over = late || p >= need || t >= maxTries;
    const then = over ? (late ? '' : nextWord) : ok ? 'კიდევ ერთხელ.' : '';
    setSaid([verdictLine(r.read.hits, r.read.n), ok ? '' : fixOf(r.read), then].filter(Boolean).join(' '));
    if (over) {
      setEnd(late ? 'late' : 'next');
      // a right last try moves on by itself
      if (ok) auto.current = window.setTimeout(() => onEnd(late), AUTO_NEXT_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [take.result, take.phase]);

  const phase = take.phase;
  const singing = phase === 'cue' || phase === 'singing' || phase === 'scoring';
  const read = phase === 'done' && take.result?.read.heard ? take.result.read : null;
  const lookOf = (i: number): NoteLook => {
    if (sounding === i || (phase === 'cue' && i === 0)) return 'sound';
    if (read) return read.notes[i]?.hit ? 'hit' : 'miss';
    return 'idle';
  };
  const wordOf = (i: number) => {
    if (!read || read.notes[i]?.hit) return '';
    const d = read.notes[i]?.dev;
    return d == null ? 'არ გაისმა' : d > 0 ? 'მაღლა იყო' : 'დაბლა იყო';
  };
  const up = to >= from;
  const rise = Math.min(48, Math.abs(to - from) * 6);
  const key = `${from}>${to}`;
  const caption = need > 1 ? `${title} · ზუსტად ${Math.min(passes, need)} / ${need}` : title;

  let bottom: React.ReactNode;
  if (end) {
    bottom = <Button full icon={<ChevronRight />} onClick={() => { window.clearTimeout(auto.current); onEnd(end === 'late'); }}>გავაგრძელოთ</Button>;
  } else if (singing) {
    bottom = <Button full icon={<Square fill="currentColor" />} disabled={phase === 'scoring'} onClick={take.start}>{phase === 'cue' ? 'ისმის პირველი ნოტი…' : 'დასრულება'}</Button>;
  } else {
    bottom = (
      <Duo>
        <Button kind="ghost" icon={<Headphones />} disabled={sounding != null} onClick={hear}>მოვუსმენ</Button>
        <Button icon={<Mic />} disabled={sounding != null} onClick={take.start}>{said ? 'კიდევ ვცდი' : 'ვმღერი'}</Button>
      </Duo>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 px-4 pt-0.5 pb-4">
        {top}
        <Card pad="none" className="px-4 pt-[18px] pb-4">
          <div className="text-center text-meta font-semibold text-mut">{caption}</div>
          <div aria-label={`${noteName(from)} → ${noteName(to)}`} role="img"
            className="relative mt-3.5 flex items-end justify-center gap-6" style={{ height: 72 + 20 + rise }}>
            <LeapNote name={noteName(from)} look={lookOf(0)} word={wordOf(0)} lift={up ? 0 : rise} />
            <span aria-hidden="true" className="flex text-mut [&_svg]:size-6" style={{ marginBottom: 20 + 36 - 12 + rise / 2 }}>
              {up ? <ArrowUpRight strokeWidth={1.75} /> : <ArrowDownRight strokeWidth={1.75} />}
            </span>
            <LeapNote name={noteName(to)} look={lookOf(1)} word={wordOf(1)} lift={up ? rise : 0} />
          </div>
          <div className="mt-2 text-center text-body text-mut">{leapName(key)} · {up ? 'მაღლა' : 'დაბლა'}</div>
        </Card>
        {phase === 'singing' ? (
          <div className="shrink-0 pt-2 text-center">
            <div className={cx('text-hero font-bold', take.word === 'ზუსტად' ? 'text-leaf-ink' : 'text-gold-ink')}>
              {take.word ? `${take.word}${take.word === 'ოდნავ მაღლა' ? ' ↑' : take.word === 'ოდნავ დაბლა' ? ' ↓' : ''}` : '…'}
            </div>
            <div className="mt-1 text-body text-mut">გისმენ… იმღერე ორივე ნოტი</div>
          </div>
        ) : (
          <TeacherSays text={said || intro}>{said || intro}</TeacherSays>
        )}
        {take.error && <p className="px-1.5 text-meta text-gold-ink">{take.error}</p>}
      </div>
      <Bottom>{bottom}</Bottom>
    </>
  );
};
