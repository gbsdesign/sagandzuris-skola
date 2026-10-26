import React, { useEffect, useRef, useState } from 'react';
import { arrayUnion, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { Bell, BellOff, BookOpen, Check, ChevronDown, HandHelping, LifeBuoy, Pencil, Plus, Undo2, Users } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth, useNavigation } from '../../context';
import { useAccess } from '../../hooks/useAccess';
import { SchoolClass } from '../../hooks/useClasses';
import { ALL_KATHISMAS, GroupMember, PsalterGroup, ergative, firstName, memberName, toGroup, useGroupNow } from '../../hooks/usePsalter';
import { KATHISMA_COUNT, KATHISMA_PSALMS, cycleOf, formatLeft, formatRange, georgiaToday, msLeft, readCount, rebase, responsible, slotState } from '../../utils/psalter';
import { pushSupported, setGroupPush, useGroupPush } from '../../utils/groupPush';
import { triggerHaptic } from '../../utils/haptics';
import { Bar, Btn, Flash, IconBtn, Sheet } from '../ui/kit';
import { PeoplePicker, Person } from '../people/PeoplePicker';
import { CreateGroupSheet } from '../../pages/PsalterPage';
import { GroupHistory } from './GroupHistory';
import { GroupManage } from './GroupManage';
import { useKathismaActions } from './useKathismaActions';

// „ფსალმუნი“ on the class page (redesign stage 2, 2026-10-25): the class's psalter group in one compact section
// instead of a page of its own. Its head line (count, the cycle's dates, the reminders bell, ✎ for the class's
// teachers), my kanon(s) on a wine line with a one-tap ✓, the twenty kanons as small tiles — a tap opens one sheet
// with only the actions that fit — and the history folded. No legend, no „how it works“: the tile sheet says it all.

/** The class's own group, live; undefined while loading or when it can't be read, null when the class has none. */
export const useClassGroup = (id?: string) => {
  const [group, setGroup] = useState<PsalterGroup | null | undefined>(undefined);
  useEffect(() => {
    if (!id) { setGroup(null); return; }
    setGroup(undefined);
    return onSnapshot(doc(db, 'psalterGroups', id), s => setGroup(s.exists() ? toGroup(s.id, s.data()) : null), () => setGroup(undefined));
  }, [id]);
  return group;
};

const CARD = 'bg-white/70 rounded-3xl ring-1 ring-[#e8dcc8]';
// GroupManage's cards inside the window lose their own frames (no box in a box); a thin line parts them
const FLAT = '[&>div>section]:p-0 [&>div>section]:bg-transparent [&>div>section]:ring-0 [&>div>section]:shadow-none [&>div>section]:rounded-none [&>div>section+section]:pt-4 [&>div>section+section]:border-t [&>div>section+section]:border-[#e8dcc8]';

export const ClassPsalter: React.FC<{ cls: SchoolClass; canLead: boolean; focus?: boolean }> = ({ cls, canLead, focus }) => {
  // the admin's switch for „ფსალმუნთა ჯგუფი“ (open / მალე / hidden) still holds for the members
  const open = useAccess().section('medavitneoba') === 'open';
  const group = useClassGroup(open || canLead ? cls.psalterGroupId : undefined);
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLElement>(null);
  // opened for the psalter (the home tile, a reminder, the vine): bring the section into view once it is there
  const focused = useRef(false);
  useEffect(() => {
    if (!focus || focused.current || !group || !ref.current) return;
    focused.current = true;
    ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focus, group]);

  if (!open && !canLead) return null;
  if (group === undefined) return null;
  if (!group) {
    if (!canLead) return null;
    const people = (list: SchoolClass['members']) => list.map(m => ({ uid: m.uid, name: m.name, photoURL: m.photoURL || '' }));
    return (
      <section className={`${CARD} px-4 sm:px-5 py-3 flex items-center gap-3`}>
        <BookOpen className="w-5 h-5 shrink-0 text-[#7a2028]" />
        <h2 className="flex-1 min-w-0 font-serif-ge text-lg font-bold text-[#4a3426] truncate">ფსალმუნთა ჯგუფი</h2>
        <Btn kind="soft" size="sm" icon={<Plus />} onClick={() => setCreating(true)}>შექმნა</Btn>
        <CreateGroupSheet
          open={creating}
          onClose={() => setCreating(false)}
          onCreated={async id => { await updateDoc(doc(db, 'classes', cls.id), { psalterGroupId: id, updatedAt: new Date().toISOString() }); }}
          preset={{ name: cls.name, members: people(cls.members), teachers: people(cls.teachers) }}
        />
      </section>
    );
  }
  return <GroupSection key={group.id} sectionRef={ref} cls={cls} group={group} canLead={canLead} />;
};

const GroupSection: React.FC<{ sectionRef: React.Ref<HTMLElement>; cls: SchoolClass; group: PsalterGroup; canLead: boolean }> = ({ sectionRef, cls, group, canLead }) => {
  const { user } = useAuth();
  const uid = user?.uid;
  const { now, cycle, slots, owners, mine, takenFromMe, helpWanted } = useGroupNow(group, uid);
  const actions = useKathismaActions(group, cycle);
  const [tile, setTile] = useState<number | null>(null);
  const [manage, setManage] = useState(false);
  const [history, setHistory] = useState(false);
  const isMember = !!uid && group.memberIds.includes(uid);
  if (!cycle) return null;
  const read = readCount(slots);
  const done = read >= KATHISMA_COUNT;
  const othersHelp = helpWanted.filter(h => h.by !== uid);

  return (
    <section ref={sectionRef} className={`${CARD} scroll-mt-4 px-3 sm:px-4 pt-1 pb-3`} aria-label="ფსალმუნი">
      {/* head: name · read/20 · the cycle's days · 🔔 · ✎ */}
      <div className="flex items-center gap-2 min-h-14 pl-1 sm:pl-1">
        <BookOpen className="w-5 h-5 shrink-0 text-[#7a2028]" />
        <h2 className="font-serif-ge text-lg font-bold text-[#4a3426]">ფსალმუნი</h2>
        <span className={`text-sm font-bold tabular-nums ${done ? 'text-emerald-700' : 'text-[#a4927c]'}`}>{read}/{KATHISMA_COUNT}</span>
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[#8a7a6a]">{formatRange(cycle)}</span>
        {isMember && <ReminderBell />}
        {canLead && <IconBtn label="ჯგუფის მართვა" tone="wine" onClick={() => setManage(true)}><Pencil /></IconBtn>}
      </div>
      <div className="px-1"><Bar value={read} max={KATHISMA_COUNT} tone={done ? 'green' : 'wine'} /></div>

      {/* my kanon(s) */}
      {isMember && (
        <div className="mt-3 space-y-2">
          {mine.length === 0 && takenFromMe.length === 0 && (
            <p className="px-1 text-[13px] text-[#8a7a6a]">ამ ციკლში კანონი არ გაქვს — დახმარების თხოვნისას შეგიძლია აიღო.</p>
          )}
          {mine.map(k => <MyLine key={k} group={group} k={k} uid={uid!} slots={slots} owners={owners} left={msLeft(cycle, now)} actions={actions} />)}
          {takenFromMe.map(k => (
            <p key={k} className="px-1 text-[13px] text-[#75685a]">
              შენი კანონი {k} {ergative(firstName(memberName(group, slots[k]?.takenBy)))} აიღო.
            </p>
          ))}
        </div>
      )}

      {/* someone asks for help: one line each, with „აღება“ */}
      {isMember && othersHelp.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {othersHelp.map(h => (
            <li key={h.k} className="flex items-center gap-2.5 pl-3 pr-1.5 py-1.5 rounded-2xl bg-amber-50 ring-1 ring-amber-200">
              <LifeBuoy className="w-[18px] h-[18px] shrink-0 text-amber-700" />
              <span className="flex-1 min-w-0 text-[13px] leading-snug text-amber-950">
                <b>{firstName(memberName(group, h.by))}</b> · კანონი {h.k}
              </span>
              <Btn size="sm" icon={<HandHelping />} disabled={actions.busy === h.k} onClick={() => actions.take(h.k)}>აღება</Btn>
            </li>
          ))}
        </ul>
      )}

      {/* the twenty kanons */}
      <ul className="mt-3 grid grid-cols-5 sm:grid-cols-10 gap-1.5" aria-label="ციკლის 20 კანონი">
        {ALL_KATHISMAS.map(k => (
          <Tile key={k} group={group} k={k} uid={uid} slots={slots} owners={owners} onOpen={() => { triggerHaptic(8); setTile(k); }} />
        ))}
      </ul>

      <Flash flash={actions.message} onClose={actions.clearMessage} />

      {/* the finished cycles, folded */}
      <button
        type="button"
        onClick={() => setHistory(h => !h)}
        aria-expanded={history}
        className="mt-2 w-full h-11 px-1 flex items-center gap-2 text-left text-sm font-bold text-[#4a3426] cursor-pointer"
      >
        ისტორია
        <ChevronDown className={`w-4 h-4 text-[#a4927c] transition-transform ${history ? 'rotate-180' : ''}`} />
      </button>
      {history && <div className="px-1 sg-in"><GroupHistory group={group} current={cycle} bare /></div>}

      <TileSheet group={group} cls={cls} k={tile} uid={uid} slots={slots} owners={owners} isMember={isMember} canLead={canLead} actions={actions} onClose={() => setTile(null)} />

      {canLead && (
        <Sheet open={manage} onClose={() => setManage(false)} title="ჯგუფის მართვა" wide>
          <div className={FLAT}><GroupManage group={group} onDeleted={() => setManage(false)} /></div>
        </Sheet>
      )}
    </section>
  );
};

type Actions = ReturnType<typeof useKathismaActions>;
type SlotsOf = ReturnType<typeof useGroupNow>['slots'];
type OwnersOf = ReturnType<typeof useGroupNow>['owners'];

/** One of my kanons: the number (a tap marks it read, a second tap takes my mark back), its psalms, the time left,
 *  „კითხვა“ and the lifebuoy that asks the group for help. */
const MyLine: React.FC<{ group: PsalterGroup; k: number; uid: string; slots: SlotsOf; owners: OwnersOf; left: number; actions: Actions }> = ({ k, uid, slots, owners, left, actions }) => {
  const { openPrayer } = useNavigation();
  const s = slots[k];
  const read = !!s?.readBy;
  const tookIt = s?.takenBy === uid;
  const canToggle = !read || s?.readBy === uid;
  const own = (owners[k] || []).includes(uid);
  const urgent = !read && left < 6 * 3600_000;
  return (
    <div className={`flex items-center gap-3 pl-1.5 pr-2 py-1.5 rounded-2xl ${read ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-[#7a2028]/[0.06] ring-1 ring-[#7a2028]/15'}`}>
      <button
        type="button"
        aria-pressed={read}
        disabled={!canToggle || actions.busy === k}
        aria-label={read ? `კანონი ${k} — მონიშვნის მოხსნა` : `კანონი ${k} — წავიკითხე`}
        title={read ? 'წაკითხულია' : 'წავიკითხე'}
        onClick={() => { triggerHaptic(15); if (read) void actions.unread(k); else void actions.read(k); }}
        className={`relative w-12 h-12 shrink-0 rounded-xl flex items-center justify-center font-serif-ge text-[22px] font-bold tabular-nums cursor-pointer transition active:scale-95 disabled:cursor-default ${
          read ? 'bg-emerald-600 text-white' : 'bg-[#7a2028] text-[#fbf6ec] shadow-[0_6px_14px_-8px_rgba(122,32,40,0.9)]'
        }`}
      >
        {k}
        <span className={`absolute -top-1.5 -right-1.5 w-[22px] h-[22px] rounded-full flex items-center justify-center ring-2 ${read ? 'bg-white text-emerald-700 ring-emerald-50' : 'bg-white/90 text-[#cdbba3] ring-[#f4e9e4]'}`}>
          <Check className="w-3.5 h-3.5 stroke-[3.5]" />
        </span>
      </button>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold leading-tight text-[#2a2017]">ჩემი კანონი <span className="font-semibold text-[#8a7a6a]">· ფს. {KATHISMA_PSALMS[k - 1]}</span></span>
        <span className={`block mt-0.5 text-[13px] leading-tight ${read ? 'text-emerald-700 font-semibold' : urgent ? 'text-amber-700 font-semibold' : 'text-[#8a7a6a]'}`}>
          {read ? 'წაკითხულია' : tookIt ? 'შენ აიღე ჯგუფის დასახმარებლად' : s?.help ? 'დახმარება ითხოვე' : `დარჩა ${formatLeft(left)}`}
        </span>
      </span>
      {!read && <Btn kind="primary" size="sm" icon={<BookOpen />} onClick={() => openPrayer(`kathisma-${k}`)}>კითხვა</Btn>}
      {!read && own && !tookIt && (
        <IconBtn
          label={s?.help ? 'დახმარების თხოვნის გაუქმება' : 'ვერ ვკითხულობ — დახმარება მჭირდება'}
          aria-pressed={!!s?.help}
          disabled={actions.busy === k}
          className={s?.help ? '!bg-amber-100 !text-amber-800' : ''}
          onClick={() => void (s?.help ? actions.cancelHelp(k) : actions.askHelp(k))}
        >
          <LifeBuoy />
        </IconBtn>
      )}
    </div>
  );
};

/** A small square: the number and who reads it; its look says the state. No buttons on it — a tap opens its sheet. */
const Tile: React.FC<{ group: PsalterGroup; k: number; uid?: string; slots: SlotsOf; owners: OwnersOf; onOpen: () => void }> = ({ group, k, uid, slots, owners, onOpen }) => {
  const slot = slots[k];
  const own = owners[k] || [];
  const who = responsible(slot, own);
  const state = slotState(slot, own, false);
  const mine = !!uid && who.includes(uid);
  const help = !!slot?.help && state !== 'read' && state !== 'taken';
  const name = state === 'read' ? firstName(memberName(group, slot?.readBy))
    : state === 'free' ? '—'
    : firstName(memberName(group, who[0]));
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`კანონი ${k}${state === 'read' ? ', წაკითხულია' : help ? ', დახმარებას ითხოვს' : ''}`}
        className={[
          'relative w-full h-16 rounded-xl px-1 flex flex-col items-center justify-center cursor-pointer transition active:scale-95',
          state === 'read' && 'bg-emerald-700 text-white',
          state === 'taken' && 'bg-amber-50 text-amber-900 ring-1 ring-amber-300',
          state === 'unread' && !mine && 'bg-white text-[#4a3426] ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/35',
          mine && state !== 'read' && 'bg-[#7a2028]/[0.06] text-[#4a3426] ring-2 ring-[#7a2028]',
          state === 'free' && 'text-[#a8977f] border border-dashed border-[#e3d5bd]',
          state === 'skipped' && 'bg-red-50 text-red-800 ring-1 ring-red-200',
        ].filter(Boolean).join(' ')}
      >
        <span className="font-serif-ge text-[18px] font-bold leading-none tabular-nums">{k}</span>
        <span className={`mt-1 w-full text-center text-xs leading-none truncate ${state === 'read' ? 'text-white/85' : 'opacity-80'}`}>{name}</span>
        {state === 'read' && <Check className="absolute top-1 right-1 w-3.5 h-3.5 stroke-[3] text-emerald-200" aria-hidden />}
        {help && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-amber-500" aria-hidden />}
      </button>
    </li>
  );
};

/** A kanon's sheet: who reads it and how far it got, and only the actions that fit — read it, mark it, take it,
 *  ask for help; the class's teachers also name who reads it (saved at once). */
const TileSheet: React.FC<{
  group: PsalterGroup; cls: SchoolClass; k: number | null; uid?: string; slots: SlotsOf; owners: OwnersOf;
  isMember: boolean; canLead: boolean; actions: Actions; onClose: () => void;
}> = ({ group, cls, k, uid, slots, owners, isMember, canLead, actions, onClose }) => {
  const { openPrayer } = useNavigation();
  const [picking, setPicking] = useState<number | null>(null);
  const shown = k ?? picking;
  if (shown === null) return null;
  const slot = slots[shown];
  const own = owners[shown] || [];
  const who = responsible(slot, own);
  const state = slotState(slot, own, false);
  const mine = !!uid && who.includes(uid);
  const ownerMine = !!uid && own.includes(uid);
  const help = !!slot?.help && state !== 'read' && state !== 'taken';
  const names = (list: (string | undefined)[]) => list.filter(Boolean).map(u => memberName(group, u)).join(', ');
  const status =
    state === 'read' ? `წაიკითხა: ${names([slot?.readBy])}`
      : state === 'taken' ? `${names([slot?.takenBy])} აიღო ${names(own) ? `(${names(own)}-ის ნაცვლად)` : ''}`
      : state === 'free' ? 'ჯერ არავის აბარია'
      : help ? `${names(who)} — დახმარებას ითხოვს`
      : `კითხულობს: ${names(who)}`;
  const run = (fn: () => Promise<unknown>) => { onClose(); void fn(); };

  const people: Person[] = [
    ...cls.members.map(m => ({ uid: m.uid, name: m.name, photoURL: m.photoURL })),
    ...group.members.filter(m => !cls.memberIds.includes(m.uid)).map(m => ({ uid: m.uid, name: m.name, photoURL: m.photoURL })),
  ];
  const assign = async (kk: number, uids: string[]) => {
    const added: GroupMember[] = uids.filter(u => !group.memberIds.includes(u)).map(u => {
      const m = cls.members.find(x => x.uid === u);
      return { uid: u, name: m?.name || 'წევრი', prayer: '', photoURL: m?.photoURL || '' };
    });
    try {
      await updateDoc(doc(db, 'psalterGroups', group.id), {
        assignment: rebase({ ...owners, [kk]: uids }),
        baseHalf: cycleOf(georgiaToday(), group.cycleDays, group.shiftDays).half,
        ...(added.length ? { members: arrayUnion(...added), memberIds: arrayUnion(...added.map(m => m.uid)) } : {}),
        updatedAt: new Date().toISOString(),
      });
    } catch {
      /* the tile simply keeps its old reader; the teacher sees it at once */
    }
  };

  return (
    <>
      <Sheet open={k !== null} onClose={onClose} title={`კანონი ${shown} · ფს. ${KATHISMA_PSALMS[shown - 1]}`}>
        <p className={`text-[15px] leading-snug ${state === 'read' ? 'text-emerald-800' : help ? 'text-amber-800' : 'text-[#4a3426]'}`}>{status}</p>
        <div className="mt-4 grid gap-2">
          <Btn kind="ghost" full icon={<BookOpen />} onClick={() => { onClose(); openPrayer(`kathisma-${shown}`); }}>კითხვა</Btn>
          {state !== 'read' && (mine || canLead) && <Btn full icon={<Check />} onClick={() => run(() => actions.read(shown))}>წავიკითხე</Btn>}
          {state === 'read' && (slot?.readBy === uid || canLead) && <Btn kind="ghost" full icon={<Undo2 />} onClick={() => run(() => actions.unread(shown))}>მონიშვნის გაუქმება</Btn>}
          {isMember && help && !mine && <Btn full icon={<HandHelping />} onClick={() => run(() => actions.take(shown))}>აღება — მე წავიკითხავ</Btn>}
          {state === 'taken' && slot?.takenBy === uid && <Btn kind="ghost" full icon={<Undo2 />} onClick={() => run(() => actions.giveBack(shown))}>დაბრუნება</Btn>}
          {ownerMine && state === 'unread' && (slot?.help
            ? <Btn kind="ghost" full icon={<LifeBuoy />} onClick={() => run(() => actions.cancelHelp(shown))}>დახმარების თხოვნის გაუქმება</Btn>
            : <Btn kind="ghost" full icon={<LifeBuoy />} onClick={() => run(() => actions.askHelp(shown))}>ვერ ვკითხულობ — დახმარება მჭირდება</Btn>)}
          {canLead && <Btn kind="soft" full icon={<Users />} onClick={() => { setPicking(shown); onClose(); }}>ვინ კითხულობს</Btn>}
        </div>
      </Sheet>
      {canLead && (
        <PeoplePicker
          open={picking !== null}
          onClose={() => setPicking(null)}
          title={picking ? `კანონი ${picking} — ვინ კითხულობს` : ''}
          people={people}
          selected={picking ? owners[picking] || [] : []}
          doneLabel="შენახვა"
          empty="კლასში ჯერ წევრები არ არიან."
          onDone={uids => { if (picking) void assign(picking, uids); setPicking(null); }}
        />
      )}
    </>
  );
};

/** The group's reminders on this device: a bell in the head line (on = filled). */
const ReminderBell: React.FC = () => {
  const settings = useGroupPush();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!pushSupported()) return null;
  const on = settings.psalter;
  const toggle = async () => {
    setBusy(true);
    setError(await setGroupPush({ ...settings, psalter: !on }));
    setBusy(false);
  };
  return (
    <span className="relative inline-flex">
      <IconBtn
        label={on ? 'შეხსენებები ჩართულია — გამორთვა' : 'შეხსენებების ჩართვა'}
        aria-pressed={on}
        disabled={busy}
        onClick={toggle}
        className={on ? '!bg-[#7a2028]/[0.1] !text-[#7a2028]' : ''}
      >
        {on ? <Bell /> : <BellOff />}
      </IconBtn>
      {error && <span role="status" className="absolute right-0 top-full mt-1 z-20 w-56 px-2.5 py-1.5 rounded-lg bg-[#2a2017] text-white text-xs font-semibold shadow sg-in">{error}</span>}
    </span>
  );
};
