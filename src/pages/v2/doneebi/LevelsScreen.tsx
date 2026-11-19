import React, { useEffect, useState } from 'react';
import { Award, Check, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { Chips, Dot, FOCUS_IN, Note, Num, Press, RoundButton, Rows, Small, TopBar, cx } from '../../../components/ui2';
import { LINES, MASTERY_LEVELS, type Line, type MasteryLevel, type PathItem } from '../../../data/masteryPath';
import { findDrill } from '../../../data/vocalDrills';
import { PASS, isScored, itemPassed, type LevelState, type PathRecord } from '../../../utils/masteryPath';
import { remainingLine, timeLeft } from '../../../utils/levelsView';
import { DrillSheet } from '../../../components/mastery/ManeraLessonSheet';
import { useNavigation } from '../../../context';
import { ScoreTag } from '../ostatoba/parts';
import { Strip } from './Strip';
import { drillName, useFreshCert, useLevels } from './useLevels';
import { certItem } from './nav';

// „ოსტატობის გზა“ (boards x-ostatoba-gza + x-ai-sapekhurebi): the line chips ყველა · ხმა · სმენა · რიტმი · გალობა, then the six
// levels in order — the open one (the current level at first) in a card of its own, unfolded with its exercises (four, then
// „კიდევ N გაკვეთილი“); the others closed: a finished level with its certificate, a later one with its lock (it still
// unfolds — one may look and try). Under them what the current level still wants and the rule of ✓.

type Filter = 'all' | Line;
const SHOWN = 4;

type State = 'cert' | 'skipped' | 'now' | 'later';
const stateOf = (s: LevelState, cur: number): State => (s.complete ? (s.skipped ? 'skipped' : 'cert') : s.n === cur ? 'now' : 'later');

/** a level's line under its name */
const subOf = (l: MasteryLevel, s: LevelState, st: State) =>
  st === 'cert' ? 'დასრულდა · მოწმობა გაქვს'
  : st === 'skipped' ? 'გავლილია ტესტით'
  : `${s.passed} / ${s.total} · ${(st === 'now' && timeLeft(l.span, s.passed, s.total)) || l.span}`;

/** a level's head: its mark, name and line, pressed to unfold or fold it; a certificate's own round button beside it */
const LevelHead: React.FC<{
  l: MasteryLevel; s: LevelState; st: State; open: boolean; onToggle: () => void; onCert: () => void;
}> = ({ l, s, st, open, onToggle, onCert }) => (
  <div className="flex items-center pr-3">
    <Press aria-expanded={open} onClick={onToggle}
      className={cx('flex min-h-[60px] min-w-0 flex-1 cursor-pointer items-center gap-2.5 py-2 pl-4 text-left text-ink transition-colors active:bg-soft', FOCUS_IN)}>
      {st === 'cert' || st === 'skipped'
        ? <Dot color="wine" size={30} icon={<Check strokeWidth={2.5} />} />
        : <Num n={l.n} on={st === 'now'} />}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-lead font-bold wrap-break-word">{l.name}</span>
        <span className="sg-fit truncate text-meta text-mut">{subOf(l, s, st)}</span>
      </span>
      {st === 'now' && !open && <Small tone="wine">ახლა</Small>}
      {open
        ? <ChevronUp aria-hidden="true" className="size-[18px] shrink-0 text-mut" strokeWidth={1.75} />
        : st === 'later'
          ? <Lock aria-label="ჯერ წინა დონე" className="size-[18px] shrink-0 text-mut" strokeWidth={1.75} />
          : st !== 'cert' && <ChevronDown aria-hidden="true" className="size-[18px] shrink-0 text-mut" strokeWidth={1.75} />}
    </Press>
    {st === 'cert' && (
      <RoundButton label="მოწმობა" size={36} tone="plain" onClick={onCert} className="ml-1 text-gold-ink">
        <Award strokeWidth={1.75} />
      </RoundButton>
    )}
  </div>
);

/** one exercise of the open level: its number (a tick once passed), its name, its score or minutes */
const ItemRow: React.FC<{ it: PathItem; record: PathRecord; today: boolean; onOpen: (id: string) => void }> = ({ it, record, today, onOpen }) => {
  const d = findDrill(it.id);
  if (!d) return null;
  const passed = itemPassed(it, record);
  const score = record.scores[it.id];
  const n = it.no.split('.')[1] ?? it.no;
  return (
    <Press onClick={() => onOpen(it.id)} aria-label={`№ ${it.no} · ${d.title}`}
      className={cx('flex min-h-[46px] w-full cursor-pointer items-center gap-2.5 py-2 pr-3 pl-4 text-left text-ink transition-colors active:bg-soft', FOCUS_IN)}>
      {passed
        ? <Dot color="leaf" size={30} icon={<Check strokeWidth={2.5} />} />
        : <span aria-hidden="true" className={cx('w-[30px] shrink-0 text-center text-meta font-bold tabular-nums', today ? 'text-leaf-ink' : 'text-mut')}>{n}</span>}
      <span className="min-w-0 flex-1 text-body leading-snug font-semibold wrap-break-word">{d.title}</span>
      {isScored(it.check) && score !== undefined
        ? <ScoreTag v={score} />
        : !passed && <Small bold={false} className="tabular-nums">{d.exercise.minutes} წთ</Small>}
    </Press>
  );
};

export const LevelsScreen: React.FC = () => {
  const { openMapItem, handleGoBack } = useNavigation();
  const p = useLevels();
  const cur = p.summary.level;
  // the current level is open until another is picked (the record may arrive after the first drawing)
  const [picked, setPicked] = useState<number | null | undefined>(undefined);
  const open = picked === undefined ? cur : picked;
  const [filter, setFilter] = useState<Filter>('all');
  const [all, setAll] = useState(false);
  const [drill, setDrill] = useState<string | null>(null);
  const fresh = useFreshCert(p.uid, p.closed, p.loaded, p.viewing);
  useEffect(() => { if (fresh !== null) openMapItem(certItem(fresh)); }, [fresh]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (n: number) => { setPicked(open === n ? null : n); setAll(false); };
  const head = (l: MasteryLevel) => {
    const s = p.levels[l.n];
    return <LevelHead key={l.n} l={l} s={s} st={stateOf(s, cur)} open={open === l.n} onToggle={() => toggle(l.n)} onCert={() => openMapItem(certItem(l.n))} />;
  };

  const before = open === null ? MASTERY_LEVELS : MASTERY_LEVELS.slice(0, open);
  const after = open === null ? [] : MASTERY_LEVELS.slice(open + 1);
  const lvl = open === null ? null : MASTERY_LEVELS[open];
  const shown = lvl ? lvl.items.filter(x => filter === 'all' || x.line === filter) : [];
  const more = shown.length - SHOWN;
  const listed = all || more <= 0 ? shown : shown.slice(0, SHOWN);
  const rule = p.levels[lvl?.n ?? cur];
  const strip = remainingLine(MASTERY_LEVELS[cur], p.record, drillName);

  return (
    <div className="flex w-full flex-col gap-3 pb-4">
      <TopBar title="ოსტატობის გზა" sub="ნულიდან ოსტატამდე" onBack={handleGoBack} />
      <Chips<Filter> label="ხაზი" value={filter} onChange={f => { setFilter(f); setAll(false); }}
        items={[{ id: 'all', label: 'ყველა' }, ...LINES.map(l => ({ id: l.id, label: l.name }))]} />
      {before.length > 0 && <Rows aria-label="დონეები">{before.map(head)}</Rows>}
      {lvl && (
        <Rows aria-label={`დონე ${lvl.n} · ${lvl.name}`}>
          {head(lvl)}
          {lvl.n !== cur && (
            <p className="px-4 py-2.5 text-meta leading-snug text-mut wrap-break-word">
              {lvl.goal}{lvl.n > cur ? ' ჯერ წინა დონეა — მაგრამ შეგიძლია ნახო და სცადო.' : ''}
            </p>
          )}
          {listed.map(it => <ItemRow key={it.id} it={it} record={p.record} today={p.doneToday(it.id)} onOpen={setDrill} />)}
          {!shown.length && <p className="px-4 py-3 text-meta text-mut">ამ დონეში ამ ხაზის სავარჯიშო არ არის.</p>}
          {more > 0 && (
            <Press aria-expanded={all} onClick={() => setAll(a => !a)}
              className={cx('flex min-h-[52px] w-full cursor-pointer items-center gap-2.5 py-2 pr-3 pl-4 text-left text-body font-bold text-wine transition-colors active:bg-soft', FOCUS_IN)}>
              <span className="min-w-0 flex-1">{all ? 'ნაკლების ჩვენება' : `კიდევ ${more} გაკვეთილი`}</span>
              {all
                ? <ChevronUp aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={1.75} />
                : <ChevronDown aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={1.75} />}
            </Press>
          )}
        </Rows>
      )}
      {after.length > 0 && <Rows aria-label="შემდეგი დონეები">{after.map(head)}</Rows>}
      {strip && <Strip>{strip}</Strip>}
      <Note>✓ — {PASS}% და მეტი ან შესრულებული. შემდეგი დონე იხსნება {rule.need}/{rule.total}-ზე.</Note>
      <DrillSheet drillId={drill} onClose={() => setDrill(null)} />
    </div>
  );
};
