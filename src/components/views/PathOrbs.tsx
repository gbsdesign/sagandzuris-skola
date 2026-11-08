import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { Check, ChevronDown, ChevronRight, GraduationCap, Lock, Pencil, Sparkles, X } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth, useChants } from '../../context';
import { PathItem, usesVoices, voicesOf } from '../../utils/pathItems';
import { usePathMarks } from '../../hooks/usePathMarks';
import { usePathItemOpener } from '../../hooks/usePathItemOpener';
import { triggerHaptic } from '../../utils/haptics';
import { useSamosiSrc } from '../../utils/samosiDye';
import { SAMOSI_COLORS, SAMOSI_DEFAULT_COLOR, SAMOSI_PARTS, SAMOSI_TOTAL, samosiDone, samosiThumb } from '../../data/samosiData';
import { IconBtn } from '../ui/kit';
import { OrbBadge, OrbPercent, PathOrb } from './PathOrb';
import { ChemiSamosi } from './ChemiSamosi';
import { FirstStep, usePathStats } from './PathSummary';
import { MyClassWork, useNewWork } from '../teacher/MyClassWork';
import { triggerFireworks } from './StudentBookmarkView';
import { useMasteryPath } from '../mastery/useMasteryPath';
import { MasteryContent } from '../mastery/MasteryContent';
import { useIndependentWork, usePanelWish } from './IndependentWorkCard';
import { useHabitsAverage } from '../habits/useHabits';
import { PEARL_WORDS, PearlIcon } from '../pearls/PearlIcon';
import { LearnChests } from '../pearls/LearnChests';
import { TokenIcon } from '../pearls/Tokens';
import { pearlCounts, pearlOf } from '../../utils/pathPearls';
import { clearTried, useTried } from '../../utils/samosiTry';

type OrbId = 'samosi' | 'learn' | 'manera' | 'work';

/** The round buttons as the "რიგი" list names them; the member's order of these ids comes in `order`. */
export const PATH_ORBS: { id: OrbId; label: string }[] = [
  { id: 'samosi', label: 'სამოსი' },
  { id: 'learn', label: 'ნასწავლი' },
  { id: 'manera', label: 'ოსტატობა' },
  // the id stays „work“ (the member's saved order, the admin's switch); since 2026-11-08 it is „ჩვევები“
  { id: 'work', label: 'ჩვევები' },
];

const SAMOSI_IDS = new Set(SAMOSI_PARTS.map(p => p.id));

// the chokha for its round button: its colour and how many parts it has — `real` = the photographed ones, which stay
// (students/{uid}.samosiReal), `count` = with the parts tried on now too, so the ring fills while the chokha is put
// together and goes back once the page is left (utils/samosiTry.ts)
export const useSamosiSummary = () => {
  const { user } = useAuth();
  const [state, setState] = useState<{ real: string[]; color: string }>({ real: [], color: SAMOSI_DEFAULT_COLOR });
  const tried = useTried(user?.uid, 'chokha');
  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'students', user.uid), snap => {
      const d = snap.data();
      setState({
        real: Array.isArray(d?.samosiReal) ? d.samosiReal.filter((id: unknown): id is string => typeof id === 'string' && SAMOSI_IDS.has(id)) : [],
        color: typeof d?.samosiColor === 'string' ? d.samosiColor : SAMOSI_DEFAULT_COLOR,
      });
    });
  }, [user]);
  // the extra hats count once, whichever of them (samosiDone)
  const real = samosiDone(state.real);
  const count = samosiDone([...state.real, ...tried.filter(id => !state.real.includes(id))]);
  return { real, count, tried: count - real, color: state.color };
};

// "სამოსი": the chokha, dyed in its chosen colour, inside a ring that fills as its parts are collected
const SamosiOrb: React.FC<{ count: number; color: string; open: boolean; onClick: () => void; index: number }> = ({ count, color, open, onClick, index }) => {
  const hex = color !== SAMOSI_DEFAULT_COLOR ? SAMOSI_COLORS.find(c => c.id === color)?.hex ?? null : null;
  const src = useSamosiSrc(samosiThumb('chokha'), hex);
  const size = 'w-10 h-10 min-[400px]:w-11 min-[400px]:h-11 sm:w-12 sm:h-12';
  return (
    <PathOrb label="სამოსი" title="ჩემი სამოსი" percent={(100 * count) / SAMOSI_TOTAL} hue="gold" open={open} onClick={onClick} index={index}>
      {src
        ? <img src={src} alt="" aria-hidden draggable={false} className={`${size} drop-shadow-[0_2px_3px_rgba(42,32,23,0.25)]`} />
        : <span aria-hidden className={size} />}
    </PathOrb>
  );
};


// The top of "საგანძურის გზა": four round buttons in a row — სამოსი, ნასწავლი, ოსტატობა, სამუშაო — each a ring of its
// progress with only its name under it. A tap opens its card under the row (one at a time); a second tap or ✕ folds
// it. "ნასწავლი" also holds the pearls, their chests and the teacher's assignments, and carries the number of new ones
// (the pearls game's own fifth button was removed 2026-11-05). Other places open "მანერა" or "სამუშაო" with
// openPathPanel().
// The member sets their order under "რიგი" (PathTabs), which hands it over as `order`.
export const PathOrbs: React.FC<{ order?: string[] }> = ({ order = PATH_ORBS.map(o => o.id) }) => {
  const [open, setOpen] = useState<OrbId | null>(null);
  // "ნასწავლი": ✎ in the card's head swaps the marks for ✕ (LearnPanel); folding the card ends it
  const [editing, setEditing] = useState(false);
  const stats = usePathStats();
  const mastery = useMasteryPath().summary;
  const work = useIndependentWork();
  const samosi = useSamosiSummary();
  const newWork = useNewWork();
  // the parts only tried on come off once the path page is left
  useEffect(() => () => clearTried(), []);

  // the number on "ნასწავლი" goes once its window shows the new assignments (also ones coming while it is open)
  useEffect(() => {
    if (open === 'learn') newWork.markSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, newWork.count]);

  const habits = useHabitsAverage();
  // „ჩვევები“ opens no card: the habits stand under the buttons, so a tap takes the page down to them (as an old
  // openPathPanel('work') does — the independent work is one of the habits now)
  const toHabits = () => {
    triggerHaptic(10);
    setOpen(null);
    window.setTimeout(() => document.getElementById('path-habits')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  };
  usePanelWish(['learn', 'manera', 'work'], id => (id === 'work' ? toHabits() : setOpen(id as OrbId)));
  const toggle = (id: OrbId) => {
    if (id === 'work') { toHabits(); return; }
    triggerHaptic(10); setEditing(false); setOpen(o => (o === id ? null : id));
  };
  const close = () => { setEditing(false); setOpen(null); };

  // today's planned hours on the "სამუშაო" button: how many are left, a green ✓ once all are done
  const todayLeft = work.today.filter(s => !s.done).length;
  const workBadge = work.today.length > 0 ? (
    <OrbBadge done={!todayLeft}>{todayLeft || <Check className="w-3 h-3 stroke-[3.5]" />}</OrbBadge>
  ) : undefined;

  // in the member's order
  const ids = order.filter((id): id is OrbId => PATH_ORBS.some(o => o.id === id));
  const orb = (id: OrbId, index: number) => {
    switch (id) {
      case 'samosi':
        return <SamosiOrb key={id} count={samosi.count} color={samosi.color} open={open === id} onClick={() => toggle(id)} index={index} />;
      case 'learn':
        return (
          <PathOrb
            key={id} label="ნასწავლი" title={newWork.count ? `ნასწავლი, ${newWork.count} ახალი დავალება` : 'ნასწავლი'} percent={stats.percent} hue="wine"
            open={open === id} onClick={() => toggle(id)} index={index} badge={newWork.count ? <OrbBadge>{newWork.count}</OrbBadge> : undefined}
          >
            {/* a cap while the path is empty, instead of 0% */}
            {stats.total ? <OrbPercent value={stats.percent} /> : <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 text-[#7a2028]" strokeWidth={1.8} />}
          </PathOrb>
        );
      case 'manera':
        // „ოსტატობის გზა“ (2026-11-07): the level in the middle, its exercises passed as the ring
        return (
          <PathOrb key={id} label="ოსტატობა" title={`ოსტატობა · დონე ${mastery.level} · ${mastery.pct}%`} percent={mastery.pct} hue="wine" open={open === id} onClick={() => toggle(id)} index={index}>
            <span className="flex flex-col items-center leading-none">
              <span className="text-[10px] sm:text-[11px] font-bold text-[#8a7a6a]">დონე</span>
              <span className="text-[22px] sm:text-[26px] font-black tabular-nums text-[#7a2028]">{mastery.level}</span>
            </span>
          </PathOrb>
        );
      case 'work':
        // „ჩვევები“: the daily habits' share over the last 30 days; the badge = today's planned hours of the independent work
        return (
          <PathOrb
            key={id} label="ჩვევები" title={habits != null ? `ჩვევები · საშუალოდ ${habits}%` : 'ჩვევები'} percent={habits ?? 0} hue="blue"
            open={false} onClick={() => toggle(id)} index={index} badge={workBadge}
          >
            {habits != null ? <OrbPercent value={habits} /> : <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-[#1e2f5a]" strokeWidth={1.8} />}
          </PathOrb>
        );
    }
  };
  const orbs = ids.map(orb);

  const cards: Record<Exclude<OrbId, 'work'>, { title: string; sub: React.ReactNode; aside?: React.ReactNode; action?: React.ReactNode; body: React.ReactNode }> = {
    samosi: {
      title: 'ჩემი სამოსი',
      sub: samosi.real === SAMOSI_TOTAL
        ? 'ჩოხა სრულადაა — ყველა ნაწილი ნამდვილია'
        : `ნამდვილი ${samosi.real} / ${SAMOSI_TOTAL}${samosi.tried ? ` · მოსინჯული ${samosi.tried}` : ''}`,
      body: <ChemiSamosi bare />,
    },
    learn: {
      title: 'ნასწავლი',
      sub: stats.total ? <LearnLine s={stats} /> : 'გზა ჯერ ცარიელია',
      action: stats.total ? (
        <IconBtn label={editing ? 'მზადაა' : 'სიის შეცვლა'} tone={editing ? 'wine' : 'plain'} aria-pressed={editing} onClick={() => setEditing(v => !v)}>
          {editing ? <Check className="stroke-[3]" /> : <Pencil />}
        </IconBtn>
      ) : undefined,
      body: <LearnPanel s={stats} editing={editing} />,
    },
    manera: { title: 'ოსტატობა', sub: 'გზა დონეებით — 0-დან ოსტატამდე', body: <MasteryContent /> },
  };
  const card = open && open !== 'work' ? cards[open] : null;

  return (
    <div className="w-full space-y-3">
      {orbs.length > 4 ? (
        // five don't fit one phone row (the names would be cut): three over two there, one row from `sm`
        <div className="mx-auto max-w-lg grid grid-cols-6 gap-x-1 gap-y-3 pt-1 [&>*]:col-span-2 [&>*:nth-child(4)]:col-start-2 sm:grid-cols-5 sm:gap-y-1 sm:[&>*]:col-span-1 sm:[&>*:nth-child(4)]:col-start-auto">
          {orbs}
        </div>
      ) : (
        <div className="mx-auto max-w-lg grid gap-1 pt-1" style={{ gridTemplateColumns: `repeat(${orbs.length}, minmax(0, 1fr))` }}>
          {orbs}
        </div>
      )}
      {card && (
        // same card look as the other tiles of "საგანძურის გზა" (PATH_TILE), without the hover lift
        <section
          key={open}
          id="path-orb-panel"
          className="sg-up w-full rounded-2xl bg-white ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_10px_28px_-18px_rgba(42,32,23,0.35)] overflow-hidden"
        >
          <header className="flex items-center gap-3 pl-4 pr-2 py-2.5 border-b border-[#efe5d4]">
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-2">
                <span className="text-[15px] sm:text-base font-black leading-tight text-[#2a2017]">{card.title}</span>
                {card.aside}
              </span>
              <span className="block mt-0.5 text-xs font-semibold text-[#8a7a6a]">{card.sub}</span>
            </span>
            <span className="shrink-0 flex items-center gap-1">
              {card.action}
              <IconBtn label="დაკეცვა" onClick={close}><X /></IconBtn>
            </span>
          </header>
          <div className="px-3 py-4 sm:p-4">{card.body}</div>
        </section>
      )}
    </div>
  );
};

const SHOWN = 8;

/** The path's progress under the "ნასწავლი" title: a bar, then learned / total and the voices (as on the class page). */
// the round button's ring already shows the share: the card's head says it in numbers only
const LearnLine: React.FC<{ s: ReturnType<typeof usePathStats> }> = ({ s }) => (
  <span className="tabular-nums">{s.learned}/{s.total}{s.voiceSlots ? ` · ${s.voices}/${s.voiceSlots} ხმა` : ''}</span>
);

// what tapping an item's name does lives in hooks/usePathItemOpener (kept importable from here too)
export { usePathItemOpener };

// "ნასწავლი" opened: the three chests on top (LearnChests: one opens on every ten polished pearls), the teacher's
// assignments and lessons (MyClassWork), then the learned items, one slim line each with its pearl in front (matte, polished
// once marked, shining once a teacher confirmed it — utils/pathPearls) (under a heading per kind — გალობა, სიმღერა, მთქმელი, საკრავები — when the path has more than one), and
// the ones still to learn folded under "სასწავლი". The whole path's progress is the bar in the card's head. The
// student marks what they know right here (a voice, or a whole poem or instrument) unless a teacher has locked
// marking; a voice the teacher confirmed is green and only the teacher takes it back. `editing` (✎ in the card's
// head) swaps the marks for ✕ to take items off the path (open even while marking is locked). A chant's name opens
// its notes, a song's its place on the map. An empty path shows its first step instead.
const LearnPanel: React.FC<{ s: ReturnType<typeof usePathStats>; editing: boolean }> = ({ s, editing }) => {
  const openerOf = usePathItemOpener();
  const { selectedChantVariants, saveVariantsToFirestoreAndStorage } = useChants();
  const { locked, confirmed, toggle } = usePathMarks(triggerFireworks);
  const [all, setAll] = useState<Record<string, boolean>>({});
  const [showTodo, setShowTodo] = useState(false);
  const several = s.categories.length > 1;
  const todo = s.categories.filter(c => c.todo.length);
  const todoCount = todo.reduce((a, c) => a + c.todo.length, 0);
  const counts = pearlCounts(Object.fromEntries(s.categories.flatMap(c => [...c.done, ...c.todo]).map(it => [it.variantId, it])), confirmed);

  const opener = (it: PathItem) => openerOf(it.variantId);

  const remove = (id: string) => {
    triggerHaptic(10);
    const next = { ...selectedChantVariants };
    delete next[id];
    saveVariantsToFirestoreAndStorage(next);
  };

  // one line: the name (opening it, when it can), then the marks — I, II, III for chants and songs, one ✓ otherwise
  const row = (it: PathItem, kind: string) => {
    const id = it.variantId;
    const go = opener(it);
    const voiced = usesVoices(id);
    const have = voicesOf(it, id);
    const ok = confirmed[id] || [];
    const name = (
      <>
        {/* the code under the name: two versions of one chant differ only by it */}
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] leading-tight font-semibold text-[#2a2017]">{it.chantName}</span>
          {kind === 'galoba' && it.code && <span className="block truncate text-[11.5px] leading-tight text-[#a4927c]">{it.code}</span>}
        </span>
        {go && <ChevronRight className="w-4 h-4 shrink-0 text-[#c4b49c] group-hover:text-[#7a2028]" />}
      </>
    );
    const nameCls = 'group flex-1 min-w-0 min-h-10 flex items-center gap-1 px-1 text-left';
    const pearl = pearlOf(it, ok);
    return (
      <li key={id} className="flex items-center gap-1.5 py-0.5">
        {/* its token — a chant's pearl, a song's or instrument's bunch of white grapes, a poem's scroll (2026-11-08): faded
            while new, plain once marked, shining once a teacher confirmed it */}
        {kind === 'galoba'
          ? <PearlIcon state={pearl} size={34} seed={id} label={PEARL_WORDS[pearl]} className="shrink-0" />
          : <TokenIcon kind={kind === 'mtkmeli' ? 'scroll' : 'grape'} state={pearl} size={34} label={PEARL_WORDS[pearl]} className="shrink-0" />}
        {go ? (
          <button type="button" onClick={go} className={`${nameCls} rounded-lg cursor-pointer transition-colors hover:bg-[#fbf6ec]`}>{name}</button>
        ) : (
          <div className={nameCls}>{name}</div>
        )}
        {editing ? (
          <button
            type="button"
            onClick={() => remove(id)}
            aria-label={`${it.chantName} — სიიდან ამოშლა`}
            title="სიიდან ამოშლა"
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-[#a3323d]/[0.08] text-[#a3323d] hover:bg-[#a3323d] hover:text-white transition-colors cursor-pointer active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <span className="flex gap-1.5 shrink-0">
            {(voiced ? (['1', '2', '3'] as const) : (['1'] as const)).map(v => {
              const confirmedOne = ok.includes(v);
              const on = confirmedOne || have.includes(v);
              return (
                <button
                  key={v}
                  type="button"
                  disabled={locked || confirmedOne}
                  onClick={() => { triggerHaptic(on ? 8 : 15); toggle(id, v); }}
                  aria-pressed={on}
                  aria-label={voiced ? `${it.chantName} — ${v} ხმა` : `${it.chantName} — ნასწავლი`}
                  title={confirmedOne ? 'მასწავლებელმა ჩათვალა' : locked ? 'მონიშვნას მასწავლებელი აკეთებს' : on ? 'ნასწავლია — შეეხე მოსახსნელად' : 'შეეხე, როცა ისწავლი'}
                  className={`w-9 h-9 rounded-full text-[13px] font-bold tabular-nums flex items-center justify-center transition active:scale-90 disabled:active:scale-100 ${
                    confirmedOne ? 'bg-emerald-600 text-white'
                      : on ? 'bg-[#7a2028] text-white shadow-[0_2px_6px_-2px_rgba(122,32,40,0.6)]'
                      : 'ring-1 ring-[#e3d6c1] text-[#a4927c] enabled:hover:ring-[#7a2028]/50 enabled:hover:text-[#7a2028]'
                  } ${locked && !confirmedOne ? 'opacity-60' : ''} ${locked || confirmedOne ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  {voiced ? v : <Check className="w-4 h-4 stroke-[3]" />}
                </button>
              );
            })}
          </span>
        )}
      </li>
    );
  };

  if (!s.total) {
    return (
      <div className="space-y-4">
        <MyClassWork bare />
        <FirstStep />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <LearnChests polished={counts.polished} shining={counts.shining} />

      <MyClassWork bare />

      {locked && !editing && (
        <p className="flex items-center gap-1.5 px-1 text-[12px] font-semibold text-[#8a7a6a]">
          <Lock className="w-3.5 h-3.5 shrink-0" /> მონიშვნას ახლა მასწავლებელი აკეთებს
        </p>
      )}

      {s.learned === 0 ? (
        <p className="px-1 text-[13px] text-[#8a7a6a]">ჯერ არაფერია ნასწავლი.</p>
      ) : (
        s.categories.filter(c => c.done.length).map(c => {
          const open = all[c.id];
          const list = open ? c.done : c.done.slice(0, SHOWN);
          return (
            <section key={c.id}>
              {several && <h4 className="px-1 mb-0.5 text-[12px] font-bold text-[#a4927c] tabular-nums">{c.label} · {c.done.length}/{c.total}</h4>}
              <ul className="divide-y divide-[#f3ebdd]">{list.map(it => row(it, c.id))}</ul>
              {c.done.length > SHOWN && (
                <button
                  type="button"
                  onClick={() => setAll(a => ({ ...a, [c.id]: !open }))}
                  className="mt-1 h-9 px-1 text-[13px] font-bold text-[#7a2028] cursor-pointer hover:underline underline-offset-4"
                >
                  {open ? 'ნაკლები' : `კიდევ ${c.done.length - SHOWN}`}
                </button>
              )}
            </section>
          );
        })
      )}

      {/* the rest of the path, folded */}
      {todoCount > 0 && (
        <div>
          <button
            type="button"
            onClick={() => { triggerHaptic(8); setShowTodo(o => !o); }}
            aria-expanded={showTodo}
            className="w-full h-10 px-3 rounded-xl flex items-center gap-2 bg-[#faf6ef] hover:bg-[#f5eee2] text-left cursor-pointer transition-colors"
          >
            <span className="flex-1 text-[13.5px] font-bold text-[#4a3426]">სასწავლი</span>
            <span className="text-[12.5px] font-bold text-[#a4927c] tabular-nums">{todoCount}</span>
            <ChevronDown className={`w-4 h-4 text-[#a4927c] transition-transform ${showTodo ? 'rotate-180' : ''}`} />
          </button>
          {showTodo && (
            <div className="mt-2 space-y-3 sg-in">
              {todo.map(c => (
                <section key={c.id}>
                  {todo.length > 1 && <h4 className="px-1 mb-0.5 text-[12px] font-bold text-[#a4927c]">{c.label} · {c.todo.length}</h4>}
                  <ul className="divide-y divide-[#f3ebdd]">{c.todo.map(it => row(it, c.id))}</ul>
                </section>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
