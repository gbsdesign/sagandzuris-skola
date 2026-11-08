import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { Check, ChevronDown, ChevronRight, GraduationCap, Lock, Pencil, Sparkles, Users, X } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth, useChants, useNavigation } from '../../context';
import { PathItem, usesVoices, voicesOf } from '../../utils/pathItems';
import { usePathMarks } from '../../hooks/usePathMarks';
import { usePathItemOpener } from '../../hooks/usePathItemOpener';
import { triggerHaptic } from '../../utils/haptics';
import { useSamosiSrc } from '../../utils/samosiDye';
import { SAMOSI_COLORS, SAMOSI_DEFAULT_COLOR, SAMOSI_PARTS, SAMOSI_TOTAL, samosiDone, samosiThumb } from '../../data/samosiData';
import { IconBtn } from '../ui/kit';
import { OrbBadge, OrbCount, PathOrb } from './PathOrb';
import { ChemiSamosi } from './ChemiSamosi';
import { FirstStep, usePathStats } from './PathSummary';
import { MyClassWork, useNewWork } from '../teacher/MyClassWork';
import { triggerFireworks } from './StudentBookmarkView';
import { useMasteryPath } from '../mastery/useMasteryPath';
import { MasteryContent } from '../mastery/MasteryContent';
import { useIndependentWork, usePanelWish } from './IndependentWorkCard';
import { useHabitsToday } from '../habits/useHabits';
import { PEARL_WORDS, PearlIcon } from '../pearls/PearlIcon';
import { PearlFlight, type Flight } from '../pearls/PearlFlight';
import { chestIdOf } from '../pearls/LearnChests';
import { LearnChests } from '../pearls/LearnChests';
import { TokenIcon } from '../pearls/Tokens';
import { pearlCounts, pearlOf } from '../../utils/pathPearls';
import { clearTried, useTried } from '../../utils/samosiTry';
import { useLibraryProgress } from '../../hooks/useBooksRead';
import { useAccess } from '../../hooks/useAccess';
import { askSignIn } from '../access/SignInPrompt';
import { ClassPickerSheet, useAllMyClasses } from '../classes/ClassPicker';
import { ClassLogo } from '../classes/ClassLogo';
import { useMyAttendance, useTeachingAttendance } from '../../hooks/useAttendanceShare';
import { useConfirmations } from '../../hooks/useConfirmations';
import { ownVoices } from '../../hooks/useClassMarks';

type OrbId = 'samosi' | 'learn' | 'manera' | 'work' | 'library' | 'klasi';

/** The round buttons as the "რიგი" list names them; the member's order of these ids comes in `order`. */
export const PATH_ORBS: { id: OrbId; label: string }[] = [
  { id: 'samosi', label: 'სამოსი' },
  { id: 'learn', label: 'ნასწავლი' },
  { id: 'manera', label: 'ოსტატობა' },
  // the id stays „work“ (the member's saved order, the admin's switch); since 2026-11-08 it is „ჩვევები“
  { id: 'work', label: 'ჩვევები' },
  // since 2026-11-09 (the header's 📚 moved here): opens the library; the ring = its books and lives read
  { id: 'library', label: 'ბიბლიოთეკა' },
  // since 2026-11-09 (the header's „კლასი“ moved here): opens my class (several: their window); the ring = attendance
  { id: 'klasi', label: 'კლასი' },
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
// `habits` (the habits' card) opens only by its own „ჩვევები“ button, like the others' cards (the user, 2026-11-08: „ჩვევების
// ჩანართი მარტო ჩვევებზე დაჭერისას იხსნებოდეს“); without it the button only takes the page down to the habits.
export const PathOrbs: React.FC<{ order?: string[]; habits?: React.ReactNode }> = ({ order = PATH_ORBS.map(o => o.id), habits: habitsCard }) => {
  const [open, setOpen] = useState<OrbId | null>(null);
  // "ნასწავლი": ✎ in the card's head swaps the marks for ✕ (LearnPanel); folding the card ends it
  const [editing, setEditing] = useState(false);
  const stats = usePathStats();
  const mastery = useMasteryPath().summary;
  const work = useIndependentWork();
  const samosi = useSamosiSummary();
  const newWork = useNewWork();
  const library = useLibraryProgress();
  const libraryAccess = useAccess().section('biblioteka');
  const { navigateTo, openClass } = useNavigation();
  // „კლასი“: a member sees their own attendance, a teacher their classes' average
  const { user } = useAuth();
  const myClasses = useAllMyClasses();
  const teaching = myClasses.filter(c => !!user && c.teacherIds.includes(user.uid));
  const ownShare = useMyAttendance(user?.uid, myClasses.filter(c => !teaching.includes(c)).map(c => c.id));
  const classShare = useTeachingAttendance(teaching);
  const attendance = teaching.length ? classShare : ownShare;
  const [picking, setPicking] = useState(false);
  // „ნასწავლი“'s count (2026-11-09, the user: „ნასწავლი/სასწავლი … და პროგრამაში შემავალი რაც იქნება ჯამში“): the path's items
  // and the programs of the classes I learn in, each once; learned = a voice of it known (mine or a teacher's „ჩათვლა“)
  const { selectedChantVariants = {} } = useChants();
  const confirmed = useConfirmations(user?.uid);
  const learnCount = useMemo(() => {
    const ids = new Set(stats.categories.flatMap(c => [...c.done, ...c.todo].map(it => it.variantId)));
    const extra = new Set<string>();
    for (const c of myClasses) {
      if (teaching.includes(c)) continue;
      for (const p of c.program) if (p.id && !ids.has(p.id)) extra.add(p.id);
    }
    const extraLearned = [...extra].filter(id => ownVoices(selectedChantVariants, confirmed, id).known.length > 0).length;
    return { learned: stats.learned + extraLearned, total: stats.total + extra.size };
  }, [stats, myClasses, teaching, selectedChantVariants, confirmed]);
  // the parts only tried on come off once the path page is left
  useEffect(() => () => clearTried(), []);

  // the number on "ნასწავლი" goes once its window shows the new assignments (also ones coming while it is open)
  useEffect(() => {
    if (open === 'learn') newWork.markSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, newWork.count]);

  const habits = useHabitsToday();
  // „ჩვევები“ opens no card: the habits stand under the buttons, so a tap takes the page down to them (as an old
  // openPathPanel('work') does — the independent work is one of the habits now)
  const toHabits = () => {
    triggerHaptic(10);
    setEditing(false);
    setOpen(habitsCard ? 'work' : null);
    window.setTimeout(() => document.getElementById('path-habits')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  };
  usePanelWish(['learn', 'manera', 'work'], id => (id === 'work' ? toHabits() : setOpen(id as OrbId)));
  const toggle = (id: OrbId) => {
    if (id === 'library') {
      triggerHaptic(10);
      if (libraryAccess === 'locked') askSignIn('ბიბლიოთეკა');
      else navigateTo('biblioteka');
      return;
    }
    if (id === 'klasi') {
      triggerHaptic(10);
      if (myClasses.length === 1) openClass(myClasses[0].id);
      else setPicking(true);
      return;
    }
    if (id === 'work' && (!habitsCard || open !== 'work')) { toHabits(); return; }
    triggerHaptic(10); setEditing(false); setOpen(o => (o === id ? null : id));
  };
  const close = () => { setEditing(false); setOpen(null); };

  // today's planned hours on the "სამუშაო" button: how many are left, a green ✓ once all are done
  const todayLeft = work.today.filter(s => !s.done).length;
  const workBadge = work.today.length > 0 ? (
    <OrbBadge done={!todayLeft}>{todayLeft || <Check className="w-3 h-3 stroke-[3.5]" />}</OrbBadge>
  ) : undefined;

  // in the member's order
  const ids = order.filter((id): id is OrbId => PATH_ORBS.some(o => o.id === id) && (id !== 'klasi' || myClasses.length > 0));
  const orb = (id: OrbId, index: number) => {
    switch (id) {
      case 'samosi':
        return <SamosiOrb key={id} count={samosi.count} color={samosi.color} open={open === id} onClick={() => toggle(id)} index={index} />;
      case 'learn':
        return (
          <PathOrb
            key={id} label="ნასწავლი"
            title={`ნასწავლი · ${learnCount.learned} / ${learnCount.total}${newWork.count ? `, ${newWork.count} ახალი დავალება` : ''}`}
            percent={learnCount.total ? (100 * learnCount.learned) / learnCount.total : 0} hue="wine"
            open={open === id} onClick={() => toggle(id)} index={index} badge={newWork.count ? <OrbBadge>{newWork.count}</OrbBadge> : undefined}
          >
            {/* a cap while there is nothing to learn yet, instead of 0 / 0 */}
            {learnCount.total ? <OrbCount value={learnCount.learned} of={learnCount.total} color="#7a2028" /> : <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 text-[#7a2028]" strokeWidth={1.8} />}
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
        // „ჩვევები“: today's daily habits — done / still left; the badge = today's planned hours of the independent work
        return (
          <PathOrb
            key={id} label="ჩვევები" title={`ჩვევები · დღეს შესრულებული ${habits.done}, დარჩენილი ${habits.left}`}
            percent={habits.done + habits.left ? (100 * habits.done) / (habits.done + habits.left) : 0} hue="blue"
            open={!!habitsCard && open === id} onClick={() => toggle(id)} index={index} badge={workBadge}
          >
            {habits.done + habits.left ? <OrbCount value={habits.done} of={habits.left} color="#1e2f5a" /> : <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-[#1e2f5a]" strokeWidth={1.8} />}
          </PathOrb>
        );
      case 'library': {
        // the books and saints' lives marked „წავიკითხე“ — only that number (2026-11-09), the ring = its share of all
        const pct = library.total ? (100 * library.done) / library.total : 0;
        return (
          <PathOrb
            key={id} label="ბიბლიოთეკა" title={`ბიბლიოთეკა · ${library.done}${library.total ? ` / ${library.total}` : ''} წიგნიდან წაკითხული`}
            percent={pct} hue="teal" open={false} onClick={() => toggle(id)} index={index}
          >
            <OrbCount value={library.done} color="#1f5c55" />
          </PathOrb>
        );
      }
      case 'klasi':
        // the attendance: a member's lessons came to of the latest ones, a teacher's members at the last lesson (2026-11-09:
        // numbers, not per cent); the class's logo (or the people) before any lesson is marked
        return (
          <PathOrb
            key={id} label="კლასი"
            title={attendance
              ? (teaching.length ? `კლასი · ბოლო გაკვეთილზე მოვიდა ${attendance.came} / ${attendance.of}` : `კლასი · დაესწარი ${attendance.came} / ${attendance.of} გაკვეთილს`)
              : 'კლასი'}
            percent={attendance ? (100 * attendance.came) / attendance.of : 0} hue="amber" open={picking} onClick={() => toggle(id)} index={index}
          >
            {attendance
              ? <OrbCount value={attendance.came} of={attendance.of} color="#c2410c" />
              : myClasses.length === 1
                ? <ClassLogo name={myClasses[0].name} logo={myClasses[0].logo} className="w-10 h-10 sm:w-11 sm:h-11 text-sm" />
                : <Users className="w-6 h-6 sm:w-7 sm:h-7 text-[#c2410c]" strokeWidth={1.8} />}
          </PathOrb>
        );
    }
  };
  const orbs = ids.map(orb);

  const cards: Record<Exclude<OrbId, 'work' | 'library' | 'klasi'>, { title: string; sub: React.ReactNode; aside?: React.ReactNode; action?: React.ReactNode; body: React.ReactNode }> = {
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
  const card = open && open !== 'work' && open !== 'library' && open !== 'klasi' ? cards[open] : null;

  return (
    <div className="w-full space-y-3">
      <ClassPickerSheet
        open={picking} onClose={() => setPicking(false)} classes={myClasses}
        onPick={cid => { setPicking(false); openClass(cid); }}
      />
      {orbs.length === 6 ? (
        // six: three over three on a phone, one row from `sm`
        <div className="mx-auto max-w-xl grid grid-cols-3 gap-x-1 gap-y-3 pt-1 sm:grid-cols-6 sm:gap-y-1">
          {orbs}
        </div>
      ) : orbs.length > 4 ? (
        // five don't fit one phone row (the names would be cut): three over two there, one row from `sm`
        <div className="mx-auto max-w-lg grid grid-cols-6 gap-x-1 gap-y-3 pt-1 [&>*]:col-span-2 [&>*:nth-child(4)]:col-start-2 sm:grid-cols-5 sm:gap-y-1 sm:[&>*]:col-span-1 sm:[&>*:nth-child(4)]:col-start-auto">
          {orbs}
        </div>
      ) : (
        <div className="mx-auto max-w-lg grid gap-1 pt-1" style={{ gridTemplateColumns: `repeat(${orbs.length}, minmax(0, 1fr))` }}>
          {orbs}
        </div>
      )}
      {open === 'work' && habitsCard && (
        <section key="work" id="path-habits" className="sg-up w-full scroll-mt-4 rounded-2xl bg-white ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_10px_28px_-18px_rgba(42,32,23,0.35)] px-3 py-3.5 sm:p-4">
          {habitsCard}
        </section>
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
  // a voice just marked: its token flies up, shines and drops into its chest (PearlFlight)
  const [flight, setFlight] = useState<Flight | null>(null);
  const endFlight = useCallback(() => setFlight(null), []);
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
        <span data-token={id} className="shrink-0 inline-flex">
          {kind === 'galoba'
            ? <PearlIcon state={pearl} size={34} seed={id} label={PEARL_WORDS[pearl]} />
            : <TokenIcon kind={kind === 'mtkmeli' ? 'scroll' : 'grape'} state={pearl} size={34} label={PEARL_WORDS[pearl]} />}
        </span>
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
                  onClick={e => {
                    triggerHaptic(on ? 8 : 15);
                    toggle(id, v);
                    const el = !on && e.currentTarget.closest('li')?.querySelector<HTMLElement>('[data-token]');
                    if (el) setFlight({ n: Date.now(), id, from: el.getBoundingClientRect(), chestId: chestIdOf(id), token: kind === 'galoba' ? 'pearl' : kind === 'mtkmeli' ? 'scroll' : 'grape', state: pearl === 'shining' ? 'shining' : 'polished' });
                  }}
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
      <PearlFlight flight={flight} onDone={endFlight} />

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
