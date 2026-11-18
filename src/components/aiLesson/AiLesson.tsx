import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, ChevronRight, Play, SkipForward, Square } from 'lucide-react';
import { MANERA_BASE } from '../../data/maneraLessons';
import { WEEKDAYS_GE } from '../../utils/dateNames';
import { singingSupported } from '../../utils/singCapture';
import {
  PART_MINUTES, closingLine, dayGap, leftWord, minutesWord, openingLine, MISSED_DAYS, type Candidate, type LessonLength, type LessonPartId,
} from '../../utils/aiLesson';
import { Button, Helper, Num, RoundButton, Row, Rows, Seg, Sheet } from '../ui2';
import { LessonTop, TeacherSays, Bottom } from './parts';
import { PhraseStep } from './PhraseStep';
import { RestStep, SingStep, SummaryStep, WarmStep } from './steps';
import { findFresh, loadReview, openPhrase, saveLessonDay, useLessonData, type Phrase } from './useLessonData';
import { melodyIn } from '../../utils/learn';
import { currentLevel } from '../../utils/masteryPath';
import {
  FIRST_PIECE, FIRST_WEEK, dayWord, fitShift, goalLabel, inFirstWeek, leapLabel, paceLine, planOf, weakLeap, weekDoneToday, weekStepNow,
  type AiNote, type AiVoice, type Before, type Goal, type Minutes,
} from '../../utils/aiPlan';
import { usePathMarks } from '../../hooks/usePathMarks';
import type { Voice } from '../../utils/pathItems';
import { useMasteryPath } from '../mastery/useMasteryPath';
import { saveAiNote, useAiNote } from './useAiNote';
import { Intro } from './Intro';
import { VoiceCheck } from './VoiceCheck';
import { PlanView } from './Plan';
import { FirstWeekView } from './FirstWeek';
import { WeakSpot } from './WeakSpot';
import { openMyVoice } from './open';
import { SundayLink } from './TodayLesson';

const DrillSheet = React.lazy(() => import('../mastery/ManeraLessonSheet').then(m => ({ default: m.DrillSheet })));
const EntryTest = React.lazy(() => import('../mastery/EntryTest').then(m => ({ default: m.EntryTest })));

// „დღის გაკვეთილი“ with the AI teacher (2026-11-18, the AI teacher's step 1; the canvas's p19 road 2 and road 3):
// one button „დაიწყე“, then five parts in one frame — გახურება · გამეორება · ახალი ფრაზა · გალობა · შეჯამება — each
// with its minutes; the top always shows the part and the minutes left. The words come from ready rules
// (utils/aiLesson.ts): no AI is asked, so the lesson works without the internet and in the kids' mode alike.
// The lesson day is kept in students/{uid}.aiLesson (useLessonData).
// AI step 2 (the same day): the first time the teacher asks three questions (Intro), listens two minutes (VoiceCheck) and
// shows the plan (Plan); a beginner then goes through the first seven days (FirstWeek: one level-0 exercise a day, day 6 the
// first phrase „ალილუია“, day 7 its pearl on the path). What it remembers is students/{uid}.aiNote (useAiNote): a leap missed
// three times this week turns the review part into the weak-spot drill (WeakSpot), and each phrase is moved into the
// measured voice unless „ნოტები ჩემს ხმაზე“ is off.

type Stage = 'start' | 'intro' | 'check' | 'plan' | 'week' | LessonPartId | 'rest';

/** where a visit begins: the questions, the check, the first week or the day lesson */
const firstStage = (note: AiNote): Stage =>
  !note.intro ? 'intro' : !note.voice && !note.skip ? 'check' : inFirstWeek(note) ? 'week' : 'start';
const ORDER: LessonPartId[] = ['warm', 'review', 'new', 'sing', 'sum'];
const LENGTH_KEY = 'sg-ai-lesson-length';
/** practising longer than this offers a rest */
const REST_AFTER_MS = 15 * 60_000;

const readLength = (): LessonLength => { try { return localStorage.getItem(LENGTH_KEY) === '5' ? 5 : 10; } catch { return 10; } };
const readBase = () => { try { return localStorage.getItem('sg-manera-voice') === 'high' ? MANERA_BASE.high : MANERA_BASE.low; } catch { return MANERA_BASE.low; } };

export const AiLesson: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const data = useLessonData();
  const ai = useAiNote();
  const mastery = useMasteryPath();
  const marks = usePathMarks();
  const note = ai.note;
  const [length, setLength] = useState<LessonLength>(readLength);
  const [stage, setStage] = useState<Stage>('start');
  const decided = useRef(false);
  const [drill, setDrill] = useState<string | null>(null);
  const [fullTest, setFullTest] = useState(false);
  const [pearl, setPearl] = useState(false);
  const [menu, setMenu] = useState(false);
  const [slow, setSlow] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const started = useRef(0);
  const partStart = useRef(0);
  const extra = useRef(0); // minutes added by „კიდევ 3 წუთი“
  const restOffered = useRef(false);

  useEffect(() => {
    if (decided.current || !note) return;
    decided.current = true;
    const first = firstStage(note);
    if (first !== 'start') setStage(first);
    // kept for the whole visit, so finishing the day's step does not change the lesson under the member's hands
    const step = FIRST_WEEK[weekStepNow(note)];
    setFirstPhraseDay(inFirstWeek(note) && !weekDoneToday(note, ai.today) && (step?.kind === 'phrase' || step?.kind === 'pearl'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note]);

  // the first week: today's step, and whether it is already done
  const weekAt = weekStepNow(note ?? undefined);
  const weekStep = FIRST_WEEK[weekAt];
  const weekToday = weekDoneToday(note ?? undefined, ai.today);
  const inWeek = !!note && inFirstWeek(note);
  const markWeek = (id: string) => {
    if (!ai.uid || note?.week1?.[id]) return;
    void saveAiNote(ai.uid, { week1: { ...(note?.week1 ?? {}), [id]: ai.today } });
  };
  // an exercise of the week counts once it was done today (it writes drillDone itself)
  useEffect(() => {
    if (!inWeek || weekToday || !weekStep?.drill) return;
    if (ai.drillDone[weekStep.drill] === ai.today) markWeek(weekStep.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ai.drillDone, inWeek, weekToday, weekStep?.id]);
  /** day 6 and 7 of the first week learn „ალილუია“ in the day lesson (decided as the visit begins) */
  const [firstPhraseDay, setFirstPhraseDay] = useState(false);

  // the weak spot: a leap missed three times this week takes the review's place (once a lesson)
  const weak = useMemo(() => weakLeap(note?.misses, ai.today), [note?.misses, ai.today]);
  const [weakPhrase, setWeakPhrase] = useState<Phrase | null>(null);
  const [weakDone, setWeakDone] = useState(false);
  const weakKey = weak?.key ?? '';
  useEffect(() => {
    if (!weak?.piece || !data.ready) { setWeakPhrase(null); return; }
    const [piece, part] = weak.piece.split('~');
    let alive = true;
    void loadReview(piece, Number(part), data.voice).then(p => alive && setWeakPhrase(p));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weakKey, data.ready]);
  const weakNow = !!weak && !weakDone;

  /** a phrase moved into the measured voice („ნოტები ჩემს ხმაზე“) */
  const shiftOf = (p: Phrase | null | undefined) => {
    const v = note?.voice;
    if (!p || !v || note?.fit === false) return 0;
    const part = p.parts[p.part];
    return part ? fitShift(v.low, v.high, melodyIn(p.score, p.vi, part.b0, part.b1)) : 0;
  };

  // what today holds: the reviews' notes and the new phrase's, loaded once the record is in
  const [reviews, setReviews] = useState<Phrase[] | null>(null);
  const [reviewAt, setReviewAt] = useState(0);
  const [fresh, setFresh] = useState<Phrase | null | undefined>(undefined);
  const [tally, setTally] = useState({ learned: 0, reviews: 0, shares: [] as number[], learnedParts: [] as number[] });
  const loadedFor = useRef('');
  useEffect(() => {
    if (!data.ready || !note) return;
    const key = `${length}|${firstPhraseDay}`;
    if (loadedFor.current === key) return;
    loadedFor.current = key;
    let alive = true;
    const picks = length === 10 ? data.plan.reviews10 : data.plan.reviews5;
    Promise.all(picks.map(r => loadReview(r.piece, r.part, data.voice))).then(list => alive && setReviews(list.filter(Boolean) as Phrase[]));
    const cands: Candidate[] = firstPhraseDay ? [{ piece: FIRST_PIECE, voice: data.voice, from: 'start' }, ...data.plan.candidates] : data.plan.candidates;
    findFresh(cands, data.learning, data.voice).then(p => alive && setFresh(p));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.ready, length, !!note, firstPhraseDay]);

  // the clock: the minutes left on top move on their own
  useEffect(() => {
    if (stage === 'start') return;
    const t = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(t);
  }, [stage]);

  const minutes = PART_MINUTES[length];
  const total = Object.values(minutes).reduce((a, b) => a + b, 0) + extra.current;
  const left = Math.max(0, total * 60_000 - (now - started.current));
  const partIndex = stage === 'rest' ? 2 : Math.max(0, ORDER.indexOf(stage as LessonPartId));
  const timeUp = () => {
    const id = stage as LessonPartId;
    const budget = (minutes[id] ?? 1) + (id === 'new' ? extra.current : 0);
    return Date.now() - partStart.current > budget * 60_000;
  };

  const go = (s: Stage) => {
    // a long practice: a rest is offered once, between parts
    if (s !== 'sum' && s !== 'rest' && started.current && !restOffered.current && Date.now() - started.current > REST_AFTER_MS) {
      restOffered.current = true;
      setStage('rest');
      return;
    }
    partStart.current = Date.now();
    setNow(Date.now());
    setStage(s);
  };
  const next = () => {
    const i = ORDER.indexOf(stage as LessonPartId);
    let n = ORDER[i + 1] ?? 'sum';
    if (n === 'review' && !reviews?.length && !weakNow) n = 'new';
    if (n === 'new' && !fresh) n = 'sing';
    if (n === 'sing' && !singPhrase) n = 'sum';
    go(n);
  };
  const begin = () => {
    try { localStorage.setItem(LENGTH_KEY, String(length)); } catch { /* the choice still holds now */ }
    started.current = Date.now();
    go('warm');
  };

  // the new phrase moves on to the piece's next phrase while time is left
  const moveFresh = (again: boolean) => {
    if (again && fresh && !timeUp()) {
      const k = openPhrase(fresh.score, fresh.vi, fresh.parts, data.learning[fresh.piece], tally.learnedParts);
      if (k >= 0) { setFresh({ ...fresh, part: k }); return; }
    }
    next();
  };

  // „გალობა“: the new piece's known phrases (with today's), else the review's phrase
  const known = useMemo(() => {
    if (!fresh) return [] as number[];
    const rec = data.learning[fresh.piece] || {};
    return [...Object.keys(rec).filter(k => rec[k].level >= 1).map(Number), ...tally.learnedParts].filter(k => k < fresh.parts.length);
  }, [fresh, data.learning, tally.learnedParts]);
  const singPhrase: Phrase | null = known.length ? fresh! : reviews?.[0] ?? null;
  const singKnown = known.length ? known : reviews?.[0] ? [reviews[0].part] : [];

  // the summary's numbers and words
  const freshKnown = fresh ? new Set(known).size : 0;
  const nextPhrase = fresh ? (() => {
    const k = openPhrase(fresh.score, fresh.vi, fresh.parts, data.learning[fresh.piece], tally.learnedParts);
    return k >= 0 ? k + 1 : null;
  })() : null;
  const improved = tally.shares.length >= 2 && tally.shares[tally.shares.length - 1] > tally.shares[0];
  const savedDay = useRef(false);
  useEffect(() => {
    if (stage !== 'sum' || savedDay.current || !data.uid) return;
    savedDay.current = true;
    void saveLessonDay(data.uid, data.today, { min: Math.max(1, Math.round((Date.now() - started.current) / 60_000)), learned: tally.learned, reviews: tally.reviews });
    // the first week's day 6 and 7 are done with the lesson; day 7 puts „ალილუია“ on the path with my voice — the first pearl
    if (firstPhraseDay && weekStep) {
      markWeek(weekStep.id);
      const knows = (fresh?.piece === FIRST_PIECE && tally.learned > 0) || Object.values(data.learning[FIRST_PIECE] || {}).some(r => r.level >= 1);
      if (weekStep.kind === 'pearl' && knows && marks.markAll(FIRST_PIECE, [data.voice as Voice])) setPearl(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const back = dayGap(data.record.last, data.today) >= MISSED_DAYS;
  const intro = note?.intro;
  const startLevel = Math.max(note?.voice?.level ?? 0, currentLevel(mastery.record));
  const saveIntro = (a: { before: Before; minutes: Minutes; goal: Goal }) => {
    if (ai.uid) void saveAiNote(ai.uid, { intro: { ...a, days: intro?.days ?? 5, at: intro?.at ?? ai.today } });
    try { localStorage.setItem(LENGTH_KEY, a.minutes === 5 ? '5' : '10'); } catch { /* the length still follows below */ }
    setLength(a.minutes === 5 ? 5 : 10);
    setStage(note?.voice || note?.skip ? 'plan' : 'check');
  };
  const saveVoice = (v: Omit<AiVoice, 'at'>) => { if (ai.uid) void saveAiNote(ai.uid, { voice: { ...v, at: ai.today }, skip: undefined }); };
  const afterPlan = () => setStage(note && inFirstWeek(note) ? 'week' : 'start');
  const canSing = singingSupported();
  const weekday = WEEKDAYS_GE[new Date(`${data.today}T12:00:00Z`).getUTCDay()];

  // ——— the first meeting: three questions, the voice, the plan ———
  if (stage === 'intro') {
    return (
      <Frame>
        <Intro start={intro ? { before: intro.before, minutes: intro.minutes, goal: intro.goal } : undefined}
          onBack={() => (intro ? setStage('plan') : onClose())} onDone={saveIntro} />
      </Frame>
    );
  }
  if (stage === 'check') {
    return (
      <Frame>
        <VoiceCheck onBack={onClose}
          onDone={v => { saveVoice(v); setStage('plan'); }}
          onFull={v => { if (v) saveVoice(v); setFullTest(true); }}
          onSkip={() => { if (ai.uid) void saveAiNote(ai.uid, { skip: true }); setStage('plan'); }} />
        {fullTest && (
          <React.Suspense fallback={null}>
            <EntryTest open onClose={() => { setFullTest(false); setStage('plan'); }} />
          </React.Suspense>
        )}
      </Frame>
    );
  }
  if (stage === 'plan' && intro) {
    return (
      <Frame>
        <PlanView goal={goalLabel(intro.goal)} pace={paceLine(intro)} rows={planOf(intro, startLevel)}
          onBack={onClose} onChange={() => setStage('intro')} onStart={afterPlan} />
      </Frame>
    );
  }
  if (stage === 'week') {
    const next = FIRST_WEEK[weekAt + (weekToday ? 0 : 1)];
    const steps = FIRST_WEEK.map((st, i) => {
      const done = !!note?.week1?.[st.id];
      const today = !done && i === weekAt && !weekToday;
      return {
        title: st.title,
        sub: done ? `${dayWord(i)} · გავლილია` : today && st.minutes ? `${dayWord(i)} · ${minutesWord(st.minutes)}` : dayWord(i),
        state: (done ? 'done' : today ? 'today' : 'later') as 'done' | 'today' | 'later',
      };
    });
    const startStep = () => {
      if (!weekStep) return;
      if (weekStep.kind === 'drill' && weekStep.drill) { setDrill(weekStep.drill); return; }
      setStage('start');
    };
    return (
      <Frame>
        <FirstWeekView sub="დონე 0 · საფუძველი" steps={steps}
          say={weekToday ? (next ? `დღევანდელი გავლილია. ხვალ — „${next.title}“.` : 'პირველი კვირა გავლილია!') : undefined}
          button={weekToday ? 'ხვალამდე' : 'დღევანდელი გაკვეთილი'}
          onBack={onClose} onStart={weekToday ? onClose : startStep} />
        {drill && (
          <React.Suspense fallback={null}>
            <DrillSheet drillId={drill} onClose={() => setDrill(null)} />
          </React.Suspense>
        )}
      </Frame>
    );
  }

  // ——— the start ———
  if (stage === 'start' || stage === 'plan') {
    const loading = !data.ready || !note || reviews === null || fresh === undefined;
    const review = reviews?.[0];
    const rowsOf: [string, string][] = [
      ['გახურება', minutesWord(minutes.warm)],
      ['გამეორება', weakNow && weak ? `${minutesWord(minutes.review)} · ნახტომი ${leapLabel(weak.key)}`
        : review ? `${minutesWord(minutes.review)} · „${review.title}“` : 'დღეს გასამეორებელი არაფერია'],
      ['ახალი ფრაზა', fresh ? `${minutesWord(minutes.new)} · „${fresh.title}“` : loading ? '…' : 'ახალი ფრაზა ვერ ჩაიტვირთა'],
      ['გალობა', `${minutesWord(minutes.sing)} · რაც უკვე იცი`],
      ['შეჯამება', minutesWord(minutes.sum)],
    ];
    const say = openingLine({ review: !!review || weakNow, fresh: !!fresh, back });
    return (
      <Frame>
        <StartScreen weekday={weekday} length={length} setLength={setLength} say={loading ? '' : say} rows={rowsOf}
          canSing={canSing} onBack={inWeek ? () => setStage('week') : onClose} onStart={begin} onVoice={() => openMyVoice('diary')} onLeave={onClose} />
      </Frame>
    );
  }

  const sub = stage === 'sum' ? `${Math.max(1, Math.round((now - started.current) / 60_000))} წუთი გავიდა`
    : stage === 'rest' ? `${Math.round((now - started.current) / 60_000)} წუთია ვარჯიშობ` : leftWord(left);

  let body: React.ReactNode;
  if (stage === 'rest') {
    body = <RestStep why="დიდხანს ივარჯიშე. ხმასაც დასვენება უნდა. ხვალ აქედან გავაგრძელებთ." onStop={() => go('sum')} onMore={() => { partStart.current = Date.now(); setStage('new'); }} />;
  } else if (stage === 'warm') {
    body = <WarmStep base={readBase()} onDone={next} />;
  } else if (stage === 'review' && weakNow && weak) {
    body = (
      <WeakSpot key={weak.key} leap={weak.key} n={weak.n} phrase={weakPhrase} rec={weakPhrase ? data.learning[weakPhrase.piece] : undefined}
        uid={data.uid} today={data.today} timeUp={timeUp}
        onTry={s => setTally(t => ({ ...t, shares: [...t.shares, s] }))}
        onDone={() => {
          setWeakDone(true);
          // drilled: the leap's count starts again
          if (ai.uid && note?.misses) { const m = { ...note.misses }; delete m[weak.key]; void saveAiNote(ai.uid, { misses: m }); }
          setTally(t => ({ ...t, reviews: t.reviews + 1 }));
          next();
        }} />
    );
  } else if (stage === 'review' && reviews?.[reviewAt]) {
    const r = reviews[reviewAt];
    body = (
      <PhraseStep key={`r${reviewAt}`} phrase={r} mode="review" rec={data.learning[r.piece]} uid={data.uid} today={data.today}
        timeUp={timeUp} slow={false} setSlow={() => undefined} shift={shiftOf(r)}
        onTry={s => setTally(t => ({ ...t, shares: [...t.shares, s] }))}
        onLearned={() => undefined}
        onDone={() => {
          setTally(t => ({ ...t, reviews: t.reviews + 1 }));
          if (reviewAt + 1 < reviews.length && !timeUp()) setReviewAt(reviewAt + 1); else next();
        }} />
    );
  } else if (stage === 'new' && fresh) {
    body = (
      <PhraseStep key={`n${fresh.piece}${fresh.part}`} phrase={fresh} mode="new" rec={data.learning[fresh.piece]} uid={data.uid} today={data.today}
        timeUp={timeUp} slow={slow} setSlow={setSlow} shift={shiftOf(fresh)}
        onTry={s => setTally(t => ({ ...t, shares: [...t.shares, s] }))}
        onLearned={() => setTally(t => (t.learnedParts.includes(fresh.part) ? t : { ...t, learned: t.learned + 1, learnedParts: [...t.learnedParts, fresh.part] }))}
        onDone={moveFresh} />
    );
  } else if (stage === 'sing' && singPhrase) {
    body = <SingStep phrase={singPhrase} known={singKnown} fresh={fresh && known.length ? fresh.part : null} shift={shiftOf(singPhrase)} onDone={() => go('sum')} />;
  } else if (stage === 'sum') {
    const tomorrow = nextPhrase ? `ფრაზა ${nextPhrase} და მოკლე გამეორება` : fresh ? 'ახალი საგალობელი და მოკლე გამეორება' : 'მოკლე გამეორება';
    body = (
      <SummaryStep learned={tally.learned} reviews={tally.reviews} known={freshKnown} total={fresh?.parts.length ?? 0} length={length}
        say={pearl ? 'პირველი მარგალიტი შენია! „ალილუია“ „ნასწავლში“ ჩაიწერა — შენი ხმით.' : closingLine({ learned: tally.learned, improved, nextPhrase })} tomorrow={tomorrow}
        onFinish={onClose}
        onMore={() => { extra.current += 3; if (fresh) { partStart.current = Date.now(); setStage('new'); } else onClose(); }} />
    );
  } else {
    body = (
      <div className="flex flex-1 flex-col">
        <div className="px-4"><TeacherSays>ეს ნაწილი დღეს გამოვტოვოთ.</TeacherSays></div>
        <Bottom><Button full icon={<ChevronRight />} onClick={next}>გავაგრძელოთ</Button></Bottom>
      </div>
    );
  }

  return (
    <Frame>
      <LessonTop at={partIndex} sub={sub} onClose={onClose} onMore={() => setMenu(true)} />
      {body}
      <Sheet open={menu} title="გაკვეთილი" onClose={() => setMenu(false)}>
        {stage === 'new' && (
          <Seg label="ტემპი" items={[{ id: 'slow', label: 'ნელა' }, { id: 'real', label: 'ნამდვილი ტემპი' }]}
            value={slow ? 'slow' : 'real'} onChange={v => setSlow(v === 'slow')} />
        )}
        <Rows>
          {stage !== 'sum' && <Row lead={<SkipForward />} title="ამ ნაწილის გამოტოვება" onClick={() => { setMenu(false); if (stage === 'rest') go('sum'); else next(); }} right={null} />}
          {stage !== 'sum' && <Row lead={<Square />} title="გაკვეთილის დასრულება" sub="ნასწავლი შენახულია" onClick={() => { setMenu(false); go('sum'); }} right={null} />}
          <Row lead={<ArrowLeft />} title="გასვლა" sub="მერე თავიდან დაიწყება" onClick={() => { setMenu(false); onClose(); }} right={null} />
        </Rows>
      </Sheet>
    </Frame>
  );
};

/** „დღის გაკვეთილი“: 5 or 10 minutes, what today holds, one button. `say` empty = still being prepared. */
export const StartScreen: React.FC<{
  weekday: string; length: LessonLength; setLength: (l: LessonLength) => void; say: string; rows: [string, string][];
  canSing: boolean; onBack: () => void; onStart: () => void; onVoice?: () => void;
  /** „კვირის წირვა“ line: closes the lesson, then opens its page */
  onLeave?: () => void;
}> = ({ weekday, length, setLength, say, rows, canSing, onBack, onStart, onVoice, onLeave }) => (
  <>
    <header className="flex shrink-0 items-center gap-2.5 px-4 pt-3.5 pb-2.5">
      <RoundButton label="უკან" onClick={onBack}><ArrowLeft /></RoundButton>
      <div className="min-w-0 flex-1 pl-0.5">
        <h1 className="truncate text-title font-bold leading-tight tracking-tight">დღის გაკვეთილი</h1>
        <div className="text-meta text-mut">{weekday} · AI მასწავლებელი</div>
      </div>
      {onVoice && <RoundButton label="ჩემი ხმა" onClick={onVoice}><BookOpen /></RoundButton>}
    </header>
    <div className="flex flex-col gap-3 px-4 pb-4">
      <Seg label="გაკვეთილის სიგრძე" items={[{ id: '5', label: '5 წუთი' }, { id: '10', label: '10 წუთი' }]}
        value={String(length) as '5' | '10'} onChange={v => setLength(v === '5' ? 5 : 10)} />
      <TeacherSays text={say || undefined} sub="AI მასწავლებელი პროგრამაა, არა ადამიანი">{say || 'გაკვეთილს ვამზადებ…'}</TeacherSays>
      <Rows>
        {rows.map(([title, sub], i) => <Row key={title} lead={<Num n={i + 1} on={i === 0} />} title={title} sub={sub} right={null} />)}
      </Rows>
      {onLeave && <SundayLink before={onLeave} />}
      {!canSing && <Helper>ამ ბრაუზერში მიკროფონი არ მუშაობს. გაკვეთილისთვის გახსენი Chrome-ში ან აპში.</Helper>}
    </div>
    <Bottom>
      <Button full icon={<Play fill="currentColor" />} disabled={!say || !canSing} onClick={onStart}>დაიწყე</Button>
    </Bottom>
  </>
);

/** The lesson over the whole screen, the page's own colour, clear of the notch. */
export const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fixed inset-0 z-[70] flex flex-col overflow-y-auto overscroll-contain bg-page pt-[env(safe-area-inset-top)] text-ink safe-x">
    <div className="mx-auto flex min-h-full w-full max-w-[560px] flex-col">{children}</div>
  </div>
);
