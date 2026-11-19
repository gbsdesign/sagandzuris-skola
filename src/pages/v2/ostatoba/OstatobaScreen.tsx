import React, { useEffect, useState } from 'react';
import { BookOpen, Check, ChevronRight, ClipboardList, Dumbbell, Ear, Ellipsis, Play, Route, Sparkles, Target, Volume2 } from 'lucide-react';
import { Bar, Button, Card, Dot, Hero, Note, Num, Row, Rows, RoundButton, Sheet, Small, TopBar } from '../../../components/ui2';
import { useAuth, useNavigation } from '../../../context';
import { useViewing } from '../../../context/AuthContext';
import { useAccess } from '../../../hooks/useAccess';
import { useMasteryPath } from '../../../components/mastery/useMasteryPath';
import { DrillSheet, type DrillTab } from '../../../components/mastery/ManeraLessonSheet';
import { EntryTest } from '../../../components/mastery/EntryTest';
import { TodayLessonHero } from '../../../components/aiLesson/TodayLesson';
import { TeacherVoiceScreen } from '../../../components/aiLesson/TeacherVoiceScreen';
import { openMyVoice } from '../../../components/aiLesson/open';
import { useAiNote } from '../../../components/aiLesson/useAiNote';
import { tenOf, weekBars } from '../../../utils/aiPlan';
import { EXTRA_DRILL_IDS, LESSON_LIBRARY, LINES, MASTERY_LEVELS } from '../../../data/masteryPath';
import { findDrill } from '../../../data/vocalDrills';
import { shortTitle } from '../../../utils/levelsView';
import { startAiScoreQueue } from '../../../utils/aiScoreQueue';
import type { LevelState, PlanItem } from '../../../utils/masteryPath';
import { LEVELS_ITEM } from '../doneebi/nav';
import { EXTRA_ITEM, LESSONS_ITEM } from './nav';

// „ოსტატობა“ in the new look (board x-ostatoba): one thing on top — the AI teacher's day lesson while its switch allows, else
// today's exercises with one button —, my level, and five rows that each open a screen of their own: the path and its levels
// (../doneebi), the lessons, the extra exercises, the entry test and „ჩემი ხმა“. Today's whole plan and the teacher's voice
// are in „⋯“. Every drill opens its own screen (DrillSheet); the old look keeps components/mastery/MasteryContent.

export type OpenDrill = (id: string, tab?: DrillTab) => void;

const LINE_NAME = Object.fromEntries(LINES.map(l => [l.id, l.name])) as Record<string, string>;
const lineOf = (id: string) => MASTERY_LEVELS.flatMap(l => l.items).find(x => x.id === id)?.line;

/** a row's count at its end, before the chevron */
export const CountChev: React.FC<{ n: number }> = ({ n }) => (
  <span className="flex shrink-0 items-center gap-1.5">
    <Small className="tabular-nums">{n}</Small>
    <ChevronRight aria-hidden="true" className="size-[18px] shrink-0 text-mut" strokeWidth={2} />
  </span>
);

/** the day's exercises (utils/masteryPath `dayPlan`, kept for the day): the drills, the done ones, the minutes */
const usePlan = (plan: PlanItem[], doneToday: (id: string) => boolean) => {
  const items = plan.map(p => ({ p, d: findDrill(p.id)! })).filter(x => x.d);
  const minutes = items.reduce((m, x) => m + (x.d.exercise.minutes || 0), 0);
  const done = items.filter(x => doneToday(x.p.id)).length;
  const next = items.find(x => !doneToday(x.p.id)) ?? null;
  return { items, minutes, done, next };
};

/** the top card without the AI teacher: today's exercises and one button */
const PlanHero: React.FC<{ plan: ReturnType<typeof usePlan>; onOpen: OpenDrill }> = ({ plan, onOpen }) => {
  if (!plan.items.length) return null;
  const sub = plan.items.map(x => shortTitle(x.d.title)).join(' · ');
  return plan.next ? (
    <Hero kicker={`დღეს · ~${plan.minutes} წთ`} title="დღევანდელი ვარჯიში" sub={sub}
      action={{ label: plan.done ? 'გაგრძელება' : 'დაწყება', icon: <Play fill="currentColor" />, onClick: () => onOpen(plan.next!.p.id, 'exercise') }} />
  ) : (
    <Hero kicker={`დღეს · ~${plan.minutes} წთ`} title="დღის ვარჯიში შესრულდა ✓" sub={sub} />
  );
};

const WHY: Record<PlanItem['why'], string> = { teacher: 'მასწავლებლის დავალება', warmup: 'გახურება', weak: '', chant: '', next: '' };

/** today's whole plan: each exercise with its reason, a tick once done today */
const PlanSheet: React.FC<{ open: boolean; plan: ReturnType<typeof usePlan>; doneToday: (id: string) => boolean; onOpen: OpenDrill; onClose: () => void }> = ({
  open, plan, doneToday, onOpen, onClose,
}) => (
  <Sheet open={open} title="დღევანდელი ვარჯიში" onClose={onClose}>
    <Rows>
      {plan.items.map(({ p, d }, i) => {
        const ok = doneToday(p.id);
        const line = lineOf(p.id);
        const why = p.why === 'weak' && line ? `${LINE_NAME[line]} — ყველაზე სუსტი ხაზი` : WHY[p.why];
        return (
          <Row key={p.id} wrap title={d.title} sub={ok ? 'დღეს შესრულებულია' : why || undefined}
            lead={ok ? <Dot icon={<Check strokeWidth={2.5} />} color="leaf" size={30} /> : p.why === 'teacher' ? <Dot icon={<ClipboardList />} size={30} /> : <Num n={i + 1} />}
            onClick={() => { onClose(); onOpen(p.id, 'exercise'); }} />
        );
      })}
    </Rows>
    {plan.next
      ? <Button full icon={<Play fill="currentColor" />} onClick={() => { onClose(); onOpen(plan.next!.p.id, 'exercise'); }}>{plan.done ? 'გაგრძელება' : 'დაწყება'}</Button>
      : <Note>დღის ვარჯიში შესრულდა — ხვალ ახალი იქნება.</Note>}
  </Sheet>
);

/** my level: its name, how far, and what it opens */
const LevelCard: React.FC<{ state: LevelState }> = ({ state }) => {
  const level = MASTERY_LEVELS[state.n];
  const next = MASTERY_LEVELS[state.n + 1];
  const left = Math.max(0, state.need - state.passed);
  const line = !next && state.complete ? 'გზა გავლილია — ოსტატი ✓'
    : left ? `კიდევ ${left} გაკვეთილი — ${next ? `და იხსნება „${next.name}“` : 'და გზა გავლილია'}`
    : 'დონე გავლილია ✓';
  return (
    <Card aria-label="ჩემი დონე">
      <div className="mb-2.5 flex items-baseline gap-2">
        <span className="min-w-0 flex-1 text-head font-bold wrap-break-word">დონე {state.n} · {level.name}</span>
        <span className="shrink-0 text-body font-bold text-wine tabular-nums">{state.passed} / {state.total}</span>
      </div>
      <Bar value={state.total ? state.passed / state.total : 0} h={8} tone={state.complete ? 'leaf' : 'wine'} />
      <p className="mt-2 text-meta text-mut wrap-break-word">{line}</p>
    </Card>
  );
};

export const OstatobaScreen: React.FC = () => {
  const { openMapItem, handleGoBack } = useNavigation();
  const { user } = useAuth();
  const viewing = useViewing();
  const access = useAccess();
  // the AI teacher's parts: a member's own page while its switch allows (as components/aiLesson/TodayLesson)
  const aiShown = !!user && !viewing && access.on('aiTeacher');
  const ai = useAiNote();
  const path = useMasteryPath();
  const plan = usePlan(path.plan, path.doneToday);
  const [drill, setDrill] = useState<{ id: string; tab: DrillTab } | null>(null);
  const [sheet, setSheet] = useState<'more' | 'plan' | null>(null);
  const [test, setTest] = useState(false);
  const [voice, setVoice] = useState(false);
  const open: OpenDrill = (id, tab = 'lesson') => setDrill({ id, tab });
  // an AI score asked without the internet goes once it is back (utils/aiScoreQueue)
  useEffect(() => { if (user) startAiScoreQueue(); }, [user]);

  const cur = path.summary.level;
  const lessons = LESSON_LIBRARY.reduce((n, g) => n + g.ids.length, 0);
  const week = weekBars(ai.note?.takes, ai.today, 1)[0];
  const voiceSub = week?.tries ? `ამ კვირას: 10 ნოტიდან ${tenOf(week.share)} ზუსტად` : 'დღიური · ხმის ზომა · AI-ს რვეული';

  return (
    <div className="flex w-full flex-col gap-3 pb-4">
      <TopBar title="ოსტატობა" onBack={handleGoBack}
        right={<RoundButton label="მეტი" onClick={() => setSheet('more')}><Ellipsis strokeWidth={1.75} /></RoundButton>} />
      {aiShown ? <TodayLessonHero /> : <PlanHero plan={plan} onOpen={open} />}
      <LevelCard state={path.levels[cur]} />
      <Rows>
        <Row lead={<Dot icon={<Route />} />} title="გზა და ჩემი გეგმა" sub={`${MASTERY_LEVELS.length} დონე · ახლა: ${MASTERY_LEVELS[cur].name}`}
          onClick={() => openMapItem(LEVELS_ITEM)} />
        <Row lead={<Dot icon={<BookOpen />} />} title="გაკვეთილები" right={<CountChev n={lessons} />} onClick={() => openMapItem(LESSONS_ITEM)} />
        <Row lead={<Dot icon={<Target />} />} title="დამატებითი სავარჯიშოები" wrap right={<CountChev n={EXTRA_DRILL_IDS.length} />}
          onClick={() => openMapItem(EXTRA_ITEM)} />
        <Row lead={<Dot icon={<Ear />} />} title="საწყისი ტესტი" sub={path.tested ? 'გავლილია — შეგიძლია თავიდან გაიარო' : '5 წუთი — საიდან დაიწყო'}
          onClick={() => setTest(true)} />
        {aiShown && <Row lead={<Dot icon={<Sparkles />} />} title="ჩემი ხმა" sub={voiceSub} onClick={() => openMyVoice('diary')} />}
      </Rows>

      <Sheet open={sheet === 'more'} title="ოსტატობა" onClose={() => setSheet(null)}>
        <Rows>
          <Row lead={<Dot icon={<Dumbbell />} />} title="დღევანდელი ვარჯიში"
            sub={plan.items.length ? `${plan.done} / ${plan.items.length} · ~${plan.minutes} წთ` : 'დღეს გეგმა არ არის'}
            disabled={!plan.items.length} onClick={() => setSheet('plan')} />
          {aiShown && (
            <Row lead={<Dot icon={<Volume2 />} />} title="მასწავლებლის ხმა" sub="AI მასწავლებელი: ხმა და ტემპი"
              onClick={() => { setSheet(null); setVoice(true); }} />
          )}
        </Rows>
      </Sheet>
      <PlanSheet open={sheet === 'plan'} plan={plan} doneToday={path.doneToday} onOpen={open} onClose={() => setSheet(null)} />
      {voice && <TeacherVoiceScreen onBack={() => setVoice(false)} />}
      <DrillSheet drillId={drill?.id ?? null} startTab={drill?.tab} onClose={() => setDrill(null)} />
      <EntryTest open={test} onClose={() => setTest(false)} />
    </div>
  );
};
