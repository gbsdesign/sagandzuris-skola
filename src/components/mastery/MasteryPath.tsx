import React, { useState } from 'react';
import { BookOpen, Check, ChevronDown, ChevronRight, ClipboardList, Lock, MessageSquareText, Play, Sparkles } from 'lucide-react';
import { Bar, Btn } from '../ui/kit';
import { LESSON_LIBRARY, LINES, MASTERY_LEVELS, EXTRA_DRILL_IDS, type Line, type PathItem } from '../../data/masteryPath';
import { findDrill } from '../../data/vocalDrills';
import { MANERA_ITEMS } from '../../data/habitsAndManera';
import { PASS, isScored, itemPassed, lineMarks, type LevelState, type LineMark, type PathRecord, type PlanItem } from '../../utils/masteryPath';
import { triggerHaptic } from '../../utils/haptics';
import { ManeraScore, useManera } from '../views/ManeraPanel';

// „ოსტატობის გზა“'s screen (plan https://claude.ai/artifact/BNanxAMNuUZMjHNuhx7oo5, section 6): one question a card —
// where am I (the level's card), what today (the day's plan with one button), the path (six levels, the open one
// listing its exercises by the four lines), the lessons to read, and the old groups' extra drills. Every card opens a
// drill in the one sheet `MasteryContent` keeps (`onOpen`).

export type OpenDrill = (id: string, tab?: 'lesson' | 'exercise') => void;

const LINE_NAME: Record<Line, string> = Object.fromEntries(LINES.map(l => [l.id, l.name])) as Record<Line, string>;

/** a line's state: whole, half (some passed) or empty */
const LineDot: React.FC<{ mark: LineMark }> = ({ mark }) => (
  <svg viewBox="0 0 12 12" className="w-3 h-3 shrink-0" aria-hidden>
    <circle cx={6} cy={6} r={5} fill={mark === 'all' ? '#059669' : 'white'} stroke={mark === 'all' ? '#059669' : '#7a2028'} strokeWidth={1.4} />
    {mark === 'some' && <path d="M6 1 A5 5 0 0 0 6 11 Z" fill="#7a2028" />}
  </svg>
);

const markWord: Record<LineMark, string> = { all: 'გავლილია', some: 'მიმდინარეობს', none: 'დასაწყები' };

// ——— where am I ———

export const LevelCard: React.FC<{ record: PathRecord; state: LevelState; tested: boolean; onTest: () => void }> = ({ record, state, tested, onTest }) => {
  const level = MASTERY_LEVELS[state.n];
  const marks = lineMarks(level, record);
  const left = Math.max(0, state.need - state.passed);
  const last = state.n === MASTERY_LEVELS.length - 1;
  return (
    <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5" aria-label="ჩემი დონე">
      <div className="flex items-center gap-3">
        <span className="w-12 h-12 shrink-0 rounded-full bg-[#7a2028] text-[#fbf6ec] flex flex-col items-center justify-center leading-none">
          <span className="text-[10px] font-bold opacity-75">დონე</span>
          <span className="text-[20px] font-black tabular-nums">{state.n}</span>
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-serif-ge text-[18px] font-bold leading-tight text-[#4a3426]">{level.name}</p>
          <p className="text-[12.5px] text-[#8a7a6a]">{level.span}</p>
        </div>
        <span className="shrink-0 text-[16px] font-black tabular-nums text-[#7a2028]">{state.passed}<span className="text-[#b3a594]">/{state.total}</span></span>
      </div>
      <div className="mt-3"><Bar value={state.passed} max={state.total} tone={state.complete ? 'green' : 'wine'} /></div>
      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="ხაზები">
        {marks.map(m => (
          <li key={m.line} title={`${m.name}: ${markWord[m.mark]} · ${m.passed}/${m.total}`}
            className="h-7 pl-2 pr-2.5 rounded-full bg-[#fbf6ec] ring-1 ring-[#efe5d4] inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#4a3426]">
            <LineDot mark={m.mark} />{m.name}
          </li>
        ))}
      </ul>
      <p className="mt-2.5 text-[13px] leading-snug text-[#8a7a6a]">
        {last && state.complete ? 'გზა გავლილია — ოსტატი ✓. აქედან: გამეორება და სწავლება.'
          : left ? <>კიდევ <b className="text-[#4a3426] tabular-nums">{left}</b> სავარჯიშო — და შემდეგი დონე გაიხსნება.</>
          : 'დონე გავლილია ✓'}
      </p>
      {!tested && state.n === 0 && (
        <button type="button" onClick={() => { triggerHaptic(8); onTest(); }}
          className="mt-3 w-full min-h-11 px-3 rounded-xl bg-[#7a2028]/[0.07] text-[#7a2028] text-[13.5px] font-bold flex items-center gap-2 cursor-pointer hover:bg-[#7a2028]/[0.12] transition">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">საწყისი ტესტი · 5 წთ — საიდან დავიწყო?</span>
          <ChevronRight className="w-4 h-4 shrink-0" />
        </button>
      )}
    </section>
  );
};

// ——— what today ———

const WHY: Record<PlanItem['why'], string> = { teacher: 'მასწავლებლის დავალება', warmup: 'გახურება', weak: '', chant: 'გალობა', next: 'შემდეგი' };

export const DayPlan: React.FC<{ plan: PlanItem[]; doneToday: (id: string) => boolean; onOpen: OpenDrill }> = ({ plan, doneToday, onOpen }) => {
  const items = plan.map(p => ({ p, d: findDrill(p.id) })).filter(x => x.d);
  if (!items.length) return null;
  const minutes = items.reduce((m, x) => m + (x.d!.exercise.minutes || 0), 0);
  const done = items.filter(x => doneToday(x.p.id)).length;
  const next = items.find(x => !doneToday(x.p.id));
  const lineOf = (id: string) => MASTERY_LEVELS.flatMap(l => l.items).find(x => x.id === id)?.line;
  return (
    <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] overflow-hidden" aria-label="დღის გეგმა">
      <div className="px-4 pt-3.5 pb-1 flex items-baseline gap-2">
        <h3 className="flex-1 font-serif-ge text-[17px] font-bold text-[#4a3426]">დღეს</h3>
        <span className="text-[12.5px] font-bold text-[#8a7a6a] tabular-nums">~{minutes} წთ · {done}/{items.length}</span>
      </div>
      <ul className="px-2">
        {items.map(({ p, d }) => {
          const ok = doneToday(p.id);
          const line = lineOf(p.id);
          const why = p.why === 'weak' && line ? `${LINE_NAME[line]} — ყველაზე სუსტი` : WHY[p.why];
          return (
            <li key={p.id}>
              <button type="button" onClick={() => onOpen(p.id, 'exercise')}
                className="w-full min-h-12 flex items-center gap-3 px-2 py-2 rounded-xl text-left cursor-pointer hover:bg-[#fbf6ec] transition-colors">
                <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center ${ok ? 'bg-emerald-600 text-white' : 'ring-[1.5px] ring-[#d9c8ac]'}`}>
                  {ok ? <Check className="w-3.5 h-3.5" /> : p.why === 'teacher' ? <ClipboardList className="w-3.5 h-3.5 text-[#7a2028]" /> : null}
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-[14px] font-bold leading-snug ${ok ? 'text-[#8a7a6a] line-through decoration-[#b3a594]/60' : 'text-[#2a2017]'}`}>{d!.title}</span>
                  {why && <span className="block text-[12px] text-[#8a7a6a]">{why}</span>}
                </span>
                <span className="shrink-0 text-[12.5px] font-semibold text-[#8a7a6a] tabular-nums">{d!.exercise.minutes} წთ</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="px-4 pb-4 pt-2">
        {next
          ? <Btn full size="lg" icon={<Play />} onClick={() => onOpen(next.p.id, 'exercise')}>{done ? 'გაგრძელება' : 'დაწყება'}</Btn>
          : <p className="h-12 rounded-full bg-emerald-50 ring-1 ring-emerald-200 text-emerald-800 text-[14px] font-bold flex items-center justify-center gap-1.5"><Check className="w-4 h-4" /> დღის გეგმა შესრულდა</p>}
      </div>
    </section>
  );
};

// ——— the path ———

type Filter = 'all' | Line;

const ItemRow: React.FC<{ it: PathItem; record: PathRecord; today: boolean; onOpen: OpenDrill }> = ({ it, record, today, onOpen }) => {
  const d = findDrill(it.id);
  if (!d) return null;
  const passed = itemPassed(it, record);
  const score = record.scores[it.id];
  return (
    <li>
      <button type="button" onClick={() => onOpen(it.id)}
        className="w-full min-h-12 flex items-center gap-2.5 px-2 py-2 rounded-xl text-left cursor-pointer hover:bg-[#fbf6ec] transition-colors">
        <span className={`w-[22px] h-[22px] shrink-0 rounded-full flex items-center justify-center ${passed ? 'bg-emerald-600 text-white' : today ? 'ring-2 ring-emerald-500' : 'ring-[1.5px] ring-[#d9c8ac]'}`}>
          {passed && <Check className="w-3.5 h-3.5" />}
        </span>
        <span className="w-8 shrink-0 text-[12px] font-semibold tabular-nums text-[#b3a594]">{it.no}</span>
        <span className="flex-1 min-w-0 text-[14px] font-semibold leading-snug text-[#2a2017]">{d.title}</span>
        {isScored(it.check) && score !== undefined
          ? <ManeraScore v={score} />
          : !passed && <span className="shrink-0 text-[12px] font-semibold tabular-nums text-[#8a7a6a]">{d.exercise.minutes} წთ</span>}
      </button>
    </li>
  );
};

export const PathLevels: React.FC<{ record: PathRecord; levels: LevelState[]; current: number; doneToday: (id: string) => boolean; onOpen: OpenDrill }> = ({ record, levels, current, doneToday, onOpen }) => {
  const [open, setOpen] = useState<number | null>(current);
  const [filter, setFilter] = useState<Filter>('all');
  return (
    <section aria-label="გზა">
      <h3 className="mb-2 px-1 font-serif-ge text-[17px] font-bold text-[#4a3426]">გზა</h3>
      <ol className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] py-1.5">
        {MASTERY_LEVELS.map((l, i) => {
          const s = levels[i];
          const isOpen = open === l.n;
          const future = l.n > current;
          const shown = l.items.filter(x => filter === 'all' || x.line === filter);
          return (
            <li key={l.n} className="relative">
              {i < MASTERY_LEVELS.length - 1 && <span className="absolute left-[33px] top-[46px] bottom-0 w-0.5 bg-[#efe5d4]" aria-hidden />}
              <button type="button" aria-expanded={isOpen}
                onClick={() => { triggerHaptic(8); setOpen(isOpen ? null : l.n); setFilter('all'); }}
                className="relative w-full min-h-14 flex items-center gap-3 px-3 py-2 text-left cursor-pointer">
                <span className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-[16px] font-black tabular-nums ${
                  s.complete ? 'bg-emerald-600 text-white' : l.n === current ? 'bg-[#7a2028] text-[#fbf6ec] ring-4 ring-[#7a2028]/15' : 'bg-white text-[#b3a594] ring-[1.5px] ring-[#d9c8ac]'}`}>
                  {s.complete ? <Check className="w-5 h-5" /> : l.n}
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-[15px] font-bold leading-snug ${future ? 'text-[#8a7a6a]' : 'text-[#2a2017]'}`}>{l.name}</span>
                  <span className="block text-[12px] text-[#8a7a6a]">{s.skipped ? 'ტესტით გავლილი' : `${s.passed}/${s.total}`} · {l.span}</span>
                </span>
                {future && !isOpen && <Lock className="w-4 h-4 shrink-0 text-[#cbbca6]" aria-label="ჯერ წინა დონე" />}
                <ChevronDown className={`w-4 h-4 shrink-0 text-[#b3a594] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="relative pl-[58px] pr-2 pb-3 sg-in">
                  <p className="pr-2 text-[13px] leading-snug text-[#4a3426]">{l.goal}</p>
                  {future && <p className="mt-1 pr-2 text-[12.5px] text-[#8a7a6a]">ჯერ წინა დონე — მაგრამ შეგიძლია ნახო და სცადო.</p>}
                  <div className="mt-2.5 -ml-1 flex flex-wrap gap-1.5" role="radiogroup" aria-label="ხაზი">
                    {(['all', ...LINES.map(x => x.id)] as Filter[]).filter(f => f === 'all' || l.items.some(x => x.line === f)).map(f => (
                      <button key={f} type="button" role="radio" aria-checked={filter === f} onClick={() => { triggerHaptic(6); setFilter(f); }}
                        className={`h-8 shrink-0 px-3 rounded-full text-[12.5px] font-bold cursor-pointer transition-colors ${filter === f ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#fbf6ec] ring-1 ring-[#efe5d4] text-[#4a3426]'}`}>
                        {f === 'all' ? 'ყველა' : LINE_NAME[f]}
                      </button>
                    ))}
                  </div>
                  <ul className="mt-1">
                    {shown.map(it => <ItemRow key={it.id} it={it} record={record} today={doneToday(it.id)} onOpen={onOpen} />)}
                  </ul>
                  <p className="mt-1 px-2 text-[11.5px] text-[#b3a594]">✓ — {PASS}% და მეტი, ან შესრულებული. დონე იხურება {s.need}/{s.total}-ზე.</p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
};

// ——— lessons to read ———

const Fold: React.FC<{ title: string; count: number; children: React.ReactNode }> = ({ title, count, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] overflow-hidden">
      <button type="button" aria-expanded={open} onClick={() => { triggerHaptic(8); setOpen(o => !o); }}
        className="w-full min-h-14 flex items-center gap-3 px-4 py-3 text-left cursor-pointer hover:bg-[#fbf6ec]/70 transition-colors">
        <span className="flex-1 font-serif-ge text-[16px] font-bold text-[#4a3426]">{title}</span>
        <span className="text-[13px] font-bold tabular-nums text-[#8a7a6a]">{count}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-[#b3a594] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="border-t border-[#f1e8d9] sg-in">{children}</div>}
    </section>
  );
};

export const LessonLibrary: React.FC<{ onOpen: OpenDrill }> = ({ onOpen }) => {
  const { marks } = useManera();
  const markOf = (id: string) => {
    if (!id.startsWith('tip-')) return null;
    const i = MANERA_ITEMS.findIndex(t => `tip-${t.num}` === id);
    return i >= 0 ? marks[i] : null;
  };
  const count = LESSON_LIBRARY.reduce((n, g) => n + g.ids.length, 0);
  return (
    <Fold title="გაკვეთილები" count={count}>
      {LESSON_LIBRARY.map(g => (
        <div key={g.level} className="px-2 pb-1.5">
          <p className="px-2 pt-3 pb-1 text-[11.5px] font-bold uppercase tracking-wide text-[#a0703c]">დონე {g.level} · {MASTERY_LEVELS[g.level].name}</p>
          <ul>
            {g.ids.map(id => {
              const d = findDrill(id);
              if (!d) return null;
              const m = markOf(id);
              return (
                <li key={id}>
                  <button type="button" onClick={() => onOpen(id, 'lesson')}
                    className="w-full min-h-12 flex items-center gap-3 px-2 py-2 rounded-xl text-left cursor-pointer hover:bg-[#fbf6ec] transition-colors">
                    <BookOpen className="w-4 h-4 shrink-0 text-[#7a2028]" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[14px] font-semibold leading-snug text-[#2a2017]">{d.title}</span>
                      {m?.note && <span className="flex items-center gap-1 text-[12px] text-[#8a7a6a] truncate"><MessageSquareText className="w-3 h-3 shrink-0" />{m.note}</span>}
                    </span>
                    {m && <ManeraScore v={m.v} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </Fold>
  );
};

// ——— the old groups' drills the path left out ———

export const ExtraDrills: React.FC<{ record: PathRecord; onOpen: OpenDrill }> = ({ record, onOpen }) => (
  <Fold title="დამატებითი სავარჯიშოები" count={EXTRA_DRILL_IDS.length}>
    <ul className="px-2 py-1.5">
      {EXTRA_DRILL_IDS.map(id => {
        const d = findDrill(id);
        if (!d) return null;
        const score = record.scores[id];
        return (
          <li key={id}>
            <button type="button" onClick={() => onOpen(id)}
              className="w-full min-h-12 flex items-center gap-3 px-2 py-2 rounded-xl text-left cursor-pointer hover:bg-[#fbf6ec] transition-colors">
              <span className="flex-1 min-w-0 text-[14px] font-semibold leading-snug text-[#2a2017]">{d.title}</span>
              {score !== undefined ? <ManeraScore v={score} /> : <span className="shrink-0 text-[12px] font-semibold text-[#8a7a6a] tabular-nums">{d.exercise.minutes} წთ</span>}
            </button>
          </li>
        );
      })}
    </ul>
  </Fold>
);
