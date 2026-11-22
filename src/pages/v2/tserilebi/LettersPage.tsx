import React, { useEffect, useState } from 'react';
import { ArrowLeft, ChevronDown, Eye, EyeOff, Loader2, MessageCircle, PenLine, Search, Users, X } from 'lucide-react';
import { Waiting } from '../../../components/shell/PageSkeleton';
import { useAuth, useNavigation } from '../../../context';
import { useMyClasses, useTeachingClasses, useAllClasses } from '../../../hooks/useClasses';
import type { SchoolClass } from '../../../hooks/useClasses';
import { useKidsMode } from '../../../hooks/useAccess';
import {
  useInbox, useAllThreads, useTeacherCards, useKidsFlags, syncKidsFlag, contactGroups, bestContacts, threadIdFor,
  openThread, openPeerThread, openAdminThread, otherOf, isUnread, isStaffSide, adminId, ADMIN_NAME,
  readSince, lastIsMine, seenByOther, markRead, dmBase,
  type Contact, type DirectThread, type Person,
} from '../../../hooks/useDirectChat';
import { useClassLasts, useChatSeen, isClassUnread, markChatSeen, classChatBase } from '../../../hooks/useClassChat';
import { useChatListPrefs, isHidden, PIN_MAX } from '../../../hooks/useChatListPrefs';
import { useUnreadCounts, type CountAsk } from '../../../hooks/useUnreadCounts';
import { hhmm } from '../../../components/classes/ChatPanel';
import { offerUndo, useWide } from '../../../components/ui/kit';
import { ClassLogo } from '../../../components/classes/ClassLogo';
import { ClassChat } from '../../../components/classes/ClassChat';
import { AdminAvatar } from '../../DirectChatPage';
import {
  Avatar, cx, Dot, Helper, PageHead, Press, RoundButton, Row, Rows, SectionLabel, Sheet,
} from '../../../components/ui2';
import { DmChat } from './DmChat';
import { BirthdaysSoon } from '../../../components/home/BirthdaysSoon';
import { ChatMenu, ChatRow, ClassChatTools, ClassPick, ClassTimes, hideSide, LastLine, NameMark, readSide, Tick } from './parts';
import { ClassMoreSheet } from '../klasi/teacher/More';
import { keepClassTab, type ClassTab } from '../klasi/nav';
import { openAssistant, useAssistantAllowed } from '../damkhmare/open';
import { useLongPress } from '../../../hooks/useLongPress';
import { TimetableSheet } from '../klasi/teacher/Timetable';

const MONTHS = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];
// today: the time; earlier: the day and a short month („10 ნოე“) — one short line at a row's end
const when = (d: Date | null) => {
  if (!d) return '';
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return hhmm(d);
  const short = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? short : `${short} ${d.getFullYear()}`;
};
const CLASS_PREFIX = 'class:';

/** a search line like the boards' (the field kit's `Field` has a name over it) */
const SearchLine: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <label className="relative block shrink-0">
    <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-mut" />
    <input
      type="search"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="ძებნა სახელით…"
      aria-label="ძებნა"
      className="h-tap-lg w-full min-w-0 rounded-full bg-surf pr-11 pl-11 text-lead text-ink outline-none placeholder:text-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine/60 [&::-webkit-search-cancel-button]:hidden"
    />
    {value && (
      <Press onClick={() => onChange('')} aria-label="გასუფთავება"
        className="absolute top-1/2 right-1 flex size-tap -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-mut">
        <X aria-hidden="true" className="size-[18px]" />
      </Press>
    )}
  </label>
);

/** x-tserilebi · x-dm · x-carieli-tserilebi — the pages `messages` and `dm` in the new look: the list of chats; on a phone an open
 *  chat takes the page, on a computer it stands beside the list. */
export const LettersPage: React.FC<{ logoUrl?: string }> = ({ logoUrl }) => {
  const { user, isAdmin, isSuperAdmin, isTeacher } = useAuth();
  const { currentPage, selectedDmId, openDm, handleGoBack, openClass, openMapItem } = useNavigation();
  const wide = useWide();
  const uid = user?.uid || '';
  const open = currentPage === 'dm' ? selectedDmId : null;

  const memberOf = useMyClasses(uid);
  const { classes: teaching } = useTeachingClasses(isTeacher ? uid : null);
  const { classes: everyClass } = useAllClasses(isAdmin);
  const mine = [...memberOf, ...teaching.filter(t => !memberOf.some(m => m.id === t.id))];
  const known = isAdmin ? [...mine, ...everyClass.filter(c => !mine.some(m => m.id === c.id))] : mine;

  const { threads, loading } = useInbox(uid, isAdmin);
  const [overview, setOverview] = useState(false);
  const all = useAllThreads(isSuperAdmin && overview);
  const cards = useTeacherCards(!!uid);
  const kidsMode = useKidsMode();
  const kids = useKidsFlags(!!uid);
  const [q, setQ] = useState('');
  const [chip, setChip] = useState('all');
  const [opening, setOpening] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [writing, setWriting] = useState(false);
  const seen = useChatSeen(uid);

  // the member's own kids' mode, copied where classmates' lists can see it (the rules accept only the truth)
  const kidsOn = !!kidsMode;
  const flagged = kids.has(uid);
  useEffect(() => {
    if (uid && !isTeacher && kidsOn !== flagged) syncKidsFlag(uid, kidsOn);
  }, [uid, isTeacher, kidsOn, flagged]);

  const classRows = known.filter(c => mine.some(m => m.id === c.id) || chip === c.id);
  const lasts = useClassLasts(classRows.map(c => c.id));
  const openClassId = open?.startsWith(CLASS_PREFIX) ? open.slice(CLASS_PREFIX.length) : null;
  const openKnown = openClassId ? known.find(c => c.id === openClassId) : undefined;
  // the class page's „მეტი“ is its teachers' and admins'
  const moreFor = openKnown && (isAdmin || openKnown.teacherIds.includes(uid)) ? openKnown.id : null;

  const { prefs, pin, unpin, hide, unhide } = useChatListPrefs(uid);
  const [menuKey, setMenuKey] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [timesOf, setTimesOf] = useState<string | null>(null);
  // the open class chat: its „მეტი“ (the name held long) and the program's cog
  const [moreOf, setMoreOf] = useState<string | null>(null);
  const autoAllowed = useAssistantAllowed();
  const nameHold = useLongPress(() => { if (moreFor) setMoreOf(moreFor); });
  const classUnread = (c: SchoolClass) => isClassUnread(lasts[c.id], seen[c.id], uid) && open !== CLASS_PREFIX + c.id;
  const dmUnread = (t: DirectThread) => isUnread(t, uid) && open !== t.id;
  const asks: CountAsk[] = overview ? [] : [
    ...classRows.flatMap(c => {
      const at = lasts[c.id]?.at;
      return classUnread(c) && at ? [{ id: CLASS_PREFIX + c.id, base: classChatBase(c.id), since: seen[c.id] ?? 0, upTo: at.getTime() }] : [];
    }),
    ...threads.flatMap(t => (dmUnread(t) && t.lastAt
      ? [{ id: t.id, base: dmBase(t.id), since: readSince(t, uid)?.getTime() ?? 0, upTo: t.lastAt.getTime() }] : [])),
  ];
  const counts = useUnreadCounts(asks);

  if (!user) return null;
  // the class page on one of its tabs (the chat's „პროგრამა“ · „წევრები“)
  const classOn = (id: string, tab: ClassTab) => { keepClassTab(id, tab); openClass(id); };

  const norm = (s: string) => s.toLocaleLowerCase('ka');
  const needle = norm(q.trim());
  const matches = (...texts: string[]) => !needle || texts.some(t => norm(t).includes(needle));
  const inChip = (classId: string) => chip === 'all' || chip === classId;
  const personIn = (c: SchoolClass | undefined, p: string) => !!c && (c.memberIds.includes(p) || c.teacherIds.includes(p));

  const me = (classId?: string): Person => {
    const c = known.find(x => x.id === classId) || mine[0];
    const p = c?.members.find(m => m.uid === uid) || c?.teachers.find(m => m.uid === uid);
    return { uid, name: p?.name || user.displayName || '', photoURL: p?.photoURL || user.photoURL || '' };
  };

  const go = (id: string) => openDm(id, currentPage === 'dm');

  const start = async (key: string, run: () => Promise<string>) => {
    setErr('');
    setOpening(key);
    try {
      const id = await run();
      setWriting(false);
      go(id);
    } catch (e) {
      console.warn('dm: ', e);
      setErr('ჩათი ვერ გაიხსნა. სცადეთ მოგვიანებით.');
    } finally {
      setOpening(null);
    }
  };

  const startWith = (c: Contact) => {
    const p: Person = { uid: c.uid, name: c.name, photoURL: c.photoURL };
    return start(c.uid, () =>
      c.rel === 'teacher' ? openThread(p, me(c.classId), c.classId)
        : c.rel === 'student' ? openThread(me(c.classId), p, c.classId)
        : c.rel === 'peer' ? openPeerThread(me(c.classId), p, c.classId)
        : openAdminThread(p));
  };

  // ---- the chats ---------------------------------------------------------------------------------------------
  const fresh = (p: Person): Person => (cards[p.uid] ? { ...p, name: cards[p.uid].name || p.name, photoURL: cards[p.uid].photoURL || p.photoURL } : p);
  const classOf = (t: DirectThread) => known.find(c => c.id === t.classId);
  const threadInChip = (t: DirectThread) =>
    chip === 'all' || (t.kind === 'admin' ? personIn(known.find(c => c.id === chip), t.members[0]) : t.classId === chip);

  const readIt = (key: string) => {
    if (key.startsWith(CLASS_PREFIX)) {
      const cid = key.slice(CLASS_PREFIX.length);
      const at = lasts[cid]?.at?.getTime();
      if (at) markChatSeen(uid, cid, at);
    } else {
      const t = threads.find(x => x.id === key);
      if (t) markRead(t, uid).catch(e => console.warn('dm read: ', e?.code || e));
    }
  };
  const hideIt = (key: string, lastMs: number) => {
    hide(key, lastMs);
    offerUndo('ჩათი დაიმალა', () => unhide(key));
  };
  const pinIt = (key: string, pinned: boolean) => {
    setErr('');
    if (pinned) unpin(key);
    else if (!pin(key)) setErr(`${PIN_MAX}-ზე მეტს ვერ მიამაგრებ — ჯერ ერთი მოხსენი.`);
  };

  const have = new Set([...threads.map(t => t.id)]);
  const groups = contactGroups(known, uid, { isAdmin, kidsMe: kidsOn && !isTeacher, kids });
  const best = bestContacts(groups);
  // a student's teachers stand first (2026-11-21, the user: „მოსწავლეს უჩანდეს მასწავლებელი“) — a teacher not written to yet too
  const plainMember = !isTeacher && !isAdmin;

  type Item = {
    key: string; name: string; at: number; lastMs: number; empty: boolean;
    pinned: boolean; hidden: boolean; unread: boolean; teacher: boolean; node: React.ReactNode;
    /** a class's chat: its members (for the birthdays row over it) */
    cls?: string[];
  };
  const items: Item[] = [];
  const rowProps = (key: string, lastMs: number, pinned: boolean, hidden: boolean, unread: boolean) => ({
    pinned,
    unread,
    count: counts[key],
    active: !!open && open === key && wide,
    onClick: () => { if (hidden) unhide(key); go(key); },
    onMenu: () => setMenuKey(key),
    left: hidden ? undefined : hideSide(() => hideIt(key, lastMs)),
    right: unread ? readSide(() => readIt(key)) : undefined,
  });

  if (!overview) {
    for (const c of classRows) {
      if (!inChip(c.id) || !matches(c.name)) continue;
      const last = lasts[c.id];
      const id = CLASS_PREFIX + c.id;
      const unread = classUnread(c);
      const lastMs = last?.at?.getTime() ?? 0;
      const pinned = prefs.pins.includes(id);
      const hidden = isHidden(prefs, id, lastMs);
      items.push({
        key: id, name: c.name, at: lastMs, lastMs, empty: !last, pinned, hidden, unread, teacher: false,
        cls: [...c.memberIds, ...c.teacherIds],
        node: (
          <ChatRow
            key={id}
            face={<ClassLogo name={c.name} logo={c.logo} className="size-12 text-title" />}
            name={(
              <span className="flex min-w-0 items-center gap-1.5">
                <Users aria-label="კლასის ჩათი" className="size-[18px] shrink-0 text-wine" strokeWidth={2} />
                <span className="min-w-0 truncate">{c.name}</span>
              </span>
            )}
            group
            last={last ? <LastLine who={last.uid === uid ? 'შენ:' : undefined} text={last.text} /> : `კლასის ჩათი · ${c.members.length} წევრი`}
            time={when(last?.at ?? null)}
            extra={<ClassTimes slots={c.schedule}
              onEdit={isAdmin || c.teacherIds.includes(uid) ? () => setTimesOf(c.id) : undefined} />}
            {...rowProps(id, lastMs, pinned, hidden, unread)}
          />
        ),
      });
    }
    for (const t of threads) {
      if (!threadInChip(t)) continue;
      const staff = isStaffSide(t, uid);
      const o = t.kind === 'teach' ? fresh(otherOf(t, uid)) : otherOf(t, uid);
      const name = o.name || 'უსახელო';
      if (!matches(name, classOf(t)?.name || '')) continue;
      const who = t.lastBy === uid ? 'შენ:' : staff && t.lastBy && t.lastBy !== t.members[0] ? 'ადმინი:' : '';
      const lastMs = t.lastAt?.getTime() ?? 0;
      const unread = dmUnread(t);
      const pinned = prefs.pins.includes(t.id);
      const hidden = isHidden(prefs, t.id, lastMs);
      const seenAt = seenByOther(t, uid);
      const mark = t.kind === 'admin' ? 'admin' : t.kind === 'teach' && t.teacherUid !== uid ? 'teacher' : undefined;
      items.push({
        key: t.id, name, at: (t.lastAt || t.createdAt)?.getTime() ?? 0, lastMs, empty: !t.lastText, pinned, hidden, unread,
        teacher: plainMember && mark === 'teacher',
        node: (
          <ChatRow
            key={t.id}
            face={t.kind === 'admin' && !staff
              ? <AdminAvatar logoUrl={logoUrl} className="size-12" />
              : <Avatar name={name} photo={o.photoURL} size={48} />}
            name={<NameMark name={name} mark={mark} />}
            last={t.lastText ? <LastLine who={who} text={t.lastText} /> : 'ჯერ შეტყობინება არ არის'}
            time={when(t.lastAt)}
            tick={t.lastText && lastIsMine(t, uid) ? <Tick seen={!!seenAt && !!t.lastAt && seenAt >= t.lastAt} /> : null}
            {...rowProps(t.id, lastMs, pinned, hidden, unread)}
          />
        ),
      });
    }
    if (plainMember) {
      const seenTeacher = new Set<string>();
      for (const g of groups) {
        for (const c of g.contacts) {
          if (c.rel !== 'teacher' || seenTeacher.has(c.uid) || have.has(threadIdFor(c, uid))) continue;
          seenTeacher.add(c.uid);
          const p = fresh(c);
          const name = p.name || 'უსახელო';
          if (!inChip(c.classId) || !matches(name, c.className)) continue;
          items.push({
            key: `t:${c.uid}`, name, at: 0, lastMs: 0, empty: true, pinned: false, hidden: false, unread: false, teacher: true,
            node: (
              <ChatRow
                key={`t:${c.uid}`}
                face={<Avatar name={name} photo={p.photoURL} size={48} />}
                name={<NameMark name={name} mark="teacher" />}
                last="მიწერე მასწავლებელს"
                busy={opening === c.uid}
                onClick={() => { void startWith(c); }}
              />
            ),
          });
        }
      }
    }
    // the classes' chats first, always, whoever wrote last (2026-11-22, the user: „თითოეული კლასის ჩათი … სიის თავში“, again: „სულ
    // თავში იყოს ყოველთვის მიუხედავად იმისა ვინ მომწერა“) — they stand in their own pale card; then pinned (the newest pin on top),
    // then a student's teachers, then the chats with messages, the newest message first („ვინც მომწერა, ზემოთ“), then the empty ones
    const pinRank = (i: Item) => (i.pinned ? prefs.pins.indexOf(i.key) : PIN_MAX);
    items.sort((a, b) => Number(!!b.cls) - Number(!!a.cls) || pinRank(a) - pinRank(b) || Number(b.teacher) - Number(a.teacher) || Number(a.empty) - Number(b.empty) || b.at - a.at);
  }
  const shownItems = items.filter(i => !i.hidden || needle);
  const classItems = shownItems.filter(i => i.cls);
  const peopleItems = shownItems.filter(i => !i.cls);
  const hiddenItems = needle ? [] : items.filter(i => i.hidden);
  const menuItem = menuKey ? items.find(i => i.key === menuKey) ?? null : null;
  const unreadIn = (cid: string) => {
    const c = known.find(x => x.id === cid);
    return (c && classRows.includes(c) && classUnread(c) ? 1 : 0) + threads.filter(t => t.classId === cid && dmUnread(t)).length;
  };

  // ---- the superadmin's look through every chat --------------------------------------------------------------
  const overviewRows = overview
    ? all.threads.filter(threadInChip).flatMap(t => {
      const pair = t.members.map(m => t.names[m] || 'უსახელო').join(' — ');
      const name = t.kind === 'admin' ? `${ADMIN_NAME} — ${pair}` : pair;
      if (!matches(name)) return [];
      const kindName = t.kind === 'admin' ? 'ადმინისტრაცია' : t.kind === 'peer' ? 'კლასელები' : 'მასწავლებელი და მოსწავლე';
      return [(
        <ChatRow
          key={t.id}
          face={<Avatar name={pair} photo={t.photos[t.members[t.members.length - 1]] || ''} size={48} />}
          name={name}
          last={`${kindName}${classOf(t) ? ` · ${classOf(t)!.name}` : ''}${t.lastText ? ` · ${t.lastText}` : ''}`}
          time={when(t.lastAt)}
          active={!!open && open === t.id && wide}
          onClick={() => go(t.id)}
        />
      )];
    })
    : [];

  // ---- whom one may start writing to ---------------------------------------------------------------------------
  const contactRows = overview ? [] : groups.map(g => {
    const list = g.contacts.filter(c => {
      if (have.has(threadIdFor(c, uid))) return false;
      // each person once, in the class with the closest link
      const b = best.get(c.uid);
      if (b && (b.classId !== c.classId || b.rel !== c.rel)) return false;
      return true;
    });
    return { cls: g.cls, list };
  }).filter(g => g.list.length > 0);
  const showAdminRow = !isAdmin && !have.has(adminId(uid));

  const relLabel = (c: Contact, cls: SchoolClass) =>
    c.rel === 'peer' ? 'კლასელი' : c.rel === 'teacher' || cls.teacherIds.includes(c.uid) ? 'მასწავლებელი' : 'მოსწავლე';

  /** the people one may write to: the administration, then the classes' people */
  const contacts = (filter = ''): React.ReactNode => {
    const f = norm(filter.trim());
    const ok = (...t: string[]) => !f || t.some(x => norm(x).includes(f));
    const people = contactRows.map(g => ({ ...g, list: g.list.filter(c => ok(fresh(c).name)) })).filter(g => g.list.length > 0);
    const admin = showAdminRow && ok(ADMIN_NAME, 'ადმინი');
    if (!admin && people.length === 0) return <p className="px-1.5 py-4 text-center text-body text-mut">ვერავინ მოიძებნა.</p>;
    return (
      <div className="flex flex-col gap-3">
        {admin && (
          <Rows>
            <Row
              lead={<AdminAvatar logoUrl={logoUrl} className="size-12" />}
              title={<NameMark name={ADMIN_NAME} mark="admin" />}
              sub="კითხვა ან თხოვნა სკოლას"
              disabled={opening === 'admin'}
              onClick={() => start('admin', () => openAdminThread(me()))}
              right={opening === 'admin' ? <Loader2 aria-hidden="true" className="size-4 animate-spin text-mut" /> : 'chev'}
            />
          </Rows>
        )}
        {people.map(g => (
          <section key={g.cls.id} className="flex flex-col gap-1.5">
            <SectionLabel label={g.cls.name} />
            <Rows>
              {g.list.map(c => {
                const p = fresh(c);
                return (
                  <Row
                    key={`${g.cls.id}:${c.uid}`}
                    lead={<Avatar name={p.name} photo={p.photoURL} size={48} />}
                    title={p.name || 'უსახელო'}
                    sub={relLabel(c, g.cls)}
                    disabled={opening === c.uid}
                    onClick={() => startWith(c)}
                    right={opening === c.uid ? <Loader2 aria-hidden="true" className="size-4 animate-spin text-mut" /> : 'chev'}
                  />
                );
              })}
            </Rows>
          </section>
        ))}
      </div>
    );
  };

  const chips = known.length > 1 ? known : [];
  const busyList = overview ? all.loading : loading;
  const empty = !busyList && items.length === 0 && overviewRows.length === 0;
  const brandNew = empty && !needle && !overview && chip === 'all';

  // ---- the open chat -------------------------------------------------------------------------------------------
  const openCls = openClassId ? known.find(c => c.id === openClassId) : null;
  const pane = !open ? (
    <div className="flex h-full flex-col items-center justify-center gap-3 rounded-card bg-surf px-8 text-center">
      <Dot icon={<MessageCircle />} size={40} />
      <p className="text-head font-bold">აირჩიეთ ჩათი</p>
    </div>
  ) : openClassId ? (
    openCls ? (
      <ClassChat
        key={openCls.id}
        cls={openCls}
        fill
        timetable={false}
        under={(
          <ClassChatTools
            auto={moreFor && autoAllowed ? () => openAssistant({ classId: openCls.id, page: 'class' }) : undefined}
            program={() => classOn(openCls.id, 'program')}
            members={moreFor ? () => classOn(openCls.id, 'people') : undefined}
          />
        )}
        title={
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {!wide && <RoundButton label="უკან" onClick={handleGoBack}><ArrowLeft aria-hidden="true" strokeWidth={1.75} /></RoundButton>}
            {/* the class page (program, members) opens from the chat's head — the home lost its classes (2026-11-22) */}
            {/* held long: the class page's „მეტი“ (the user: „მეტი ფუნქციები სახელზე დიდხანს დაჭერისას იხსნებოდეს“) */}
            <Press {...(moreFor ? nameHold : {})} onClick={() => openClass(openCls.id)} aria-label={`${openCls.name} — კლასის გვერდი`}
              title={moreFor ? 'დიდხანს დააჭირე — მეტი' : undefined}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-field text-left select-none [-webkit-touch-callout:none]">
              {/* a compact head, the whole name in view (2026-11-22, the user: „სახელი უფრო კომპაქტური … მთლიანად ეტეოდეს …
                  დააპატარავე 50%“); the lesson times moved out to the list's row */}
              <ClassLogo name={openCls.name} logo={openCls.logo} className="size-8 shrink-0 text-meta" />
              <span className="flex min-w-0 flex-col">
                <span className="line-clamp-2 text-body leading-tight font-bold break-words">{openCls.name}</span>
                <span className="truncate text-cap leading-tight text-mut">{`${openCls.members.length} წევრი · გვერდი ›`}</span>
              </span>
            </Press>
          </div>
        }
      />
    ) : (
      <Waiting field={false} rows={5} quiet />
    )
  ) : (
    <DmChat key={open} id={open} classes={known} wide={wide} onBack={handleGoBack} />
  );

  const eye = isSuperAdmin && (
    <RoundButton
      label="ყველა ჩათი — მხოლოდ სანახავად"
      tone={overview ? 'wine' : 'surf'}
      aria-pressed={overview}
      onClick={() => setOverview(v => !v)}
    >
      <Eye aria-hidden="true" />
    </RoundButton>
  );

  const list = (
    <div className="flex min-w-0 flex-col gap-3 pb-4 lg:min-h-0 lg:overflow-y-auto">
      {/* since 2026-11-21 the list has its „უკან“ (the phone's bottom menu is gone); a computer keeps its top bar */}
      {/* the page's name is „სწავლა“, as on the home's main button that opens it (2026-11-22, the user: „სწავლა დააწერე აქაც და შიგნითაც“) */}
      <PageHead
        title={wide ? 'სწავლა' : (
          <span className="flex items-center gap-2.5">
            <RoundButton label="უკან" onClick={handleGoBack}><ArrowLeft aria-hidden="true" strokeWidth={1.75} /></RoundButton>
            სწავლა
          </span>
        )}
        right={(
          <>
            {eye}
            {!overview && <RoundButton label="ახალი წერილი" tone="wine" onClick={() => setWriting(true)}><PenLine aria-hidden="true" /></RoundButton>}
          </>
        )}
      />
      {!brandNew && <SearchLine value={q} onChange={setQ} />}
      {!brandNew && chips.length > 0 && <div><ClassPick classes={chips} chip={chip} onPick={setChip} unreadIn={unreadIn} /></div>}
      {err && <p role="alert" className="px-1.5 text-body text-danger">{err}</p>}

      {busyList && items.length === 0 && overviewRows.length === 0 ? (
        <Waiting field={false} />
      ) : overview ? (
        <>
          <SectionLabel label="სკოლის ყველა პირადი ჩათი · მხოლოდ სანახავად" />
          {overviewRows.length
            ? <Rows>{overviewRows}</Rows>
            : <p className="px-1.5 py-6 text-center text-body text-mut">ჩათი ვერ მოიძებნა.</p>}
        </>
      ) : brandNew ? (
        // x-carieli-tserilebi: a new member with no chats yet
        <>
          <SearchLine value={q} onChange={setQ} />
          <div className="flex flex-col items-center gap-2 px-4 pt-5 pb-1 text-center">
            <Dot icon={<MessageCircle />} size={40} className="mb-1" />
            <h2 className="text-head font-bold">ჯერ წერილი არ გაქვს</h2>
            <p className="text-body leading-snug text-mut">კლასში რომ შეხვალ, აქ გამოჩნდება კლასის ჩატი და მასწავლებელი.</p>
          </div>
          <SectionLabel label="ვის მისწერო?" />
          {contacts()}
        </>
      ) : empty ? (
        <p className="px-4 py-10 text-center text-body text-mut">{needle ? 'ვერავინ მოიძებნა.' : 'ამ კლასში ჩათი ჯერ არ არის.'}</p>
      ) : (
        <>
          {classItems.length > 0 && (
            <>
              <SectionLabel label="კლასის ჩათები" />
              {/* the classes' chats in their own pale wine card, so they read as group chats at a glance (2026-11-22);
                  over each one its own members' coming birthdays (the teachers' look; none → nothing) */}
              <div className="flex shrink-0 flex-col divide-y divide-wine/10 overflow-hidden rounded-card bg-tint ring-1 ring-wine/15">
                {classItems.map(i => <React.Fragment key={i.key}><BirthdaysSoon row only={i.cls} />{i.node}</React.Fragment>)}
              </div>
            </>
          )}
          {peopleItems.length > 0 && (
            <>
              <SectionLabel label={classItems.length > 0 ? 'პირადი ჩათები' : 'ჩათები'} />
              <Rows>{peopleItems.map(i => i.node)}</Rows>
            </>
          )}
          {hiddenItems.length > 0 && (
            <div className="flex flex-col gap-2">
              <Press
                onClick={() => setShowHidden(v => !v)}
                aria-expanded={showHidden}
                className="flex h-tap cursor-pointer items-center gap-2 self-start rounded-full px-3 text-body font-semibold text-mut active:bg-soft"
              >
                <EyeOff aria-hidden="true" className="size-[18px]" /> დამალული ჩათები · {hiddenItems.length}
                <ChevronDown aria-hidden="true" className={cx('size-[18px] transition-transform', showHidden && 'rotate-180')} />
              </Press>
              {showHidden && <Rows>{hiddenItems.map(i => i.node)}</Rows>}
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className={cx('w-full lg:grid lg:grid-cols-[24rem_minmax(0,1fr)] lg:gap-4 lg:h-[calc(100dvh-7rem)]')}>
      <div className={cx(open ? 'hidden lg:block' : 'block', 'lg:min-h-0 lg:flex lg:flex-col')}>{list}</div>
      <div className={cx(open ? 'block' : 'hidden lg:block', 'min-w-0 h-[calc(100dvh-1rem)] lg:h-full')}>{pane}</div>

      {(() => {
        const c = moreOf ? known.find(x => x.id === moreOf) : null;
        return c ? (
          <ClassMoreSheet cls={c} open onClose={() => setMoreOf(null)}
            openItem={item => { openClass(c.id); openMapItem(item); }} />
        ) : null;
      })()}
      {(() => {
        const c = timesOf ? known.find(x => x.id === timesOf) : null;
        return c ? <TimetableSheet cls={c} open edit onClose={() => setTimesOf(null)} /> : null;
      })()}
      <Sheet open={writing} onClose={() => setWriting(false)} title="ახალი წერილი">
        <NewLetter render={contacts} />
      </Sheet>
      <ChatMenu
        chat={menuItem && { id: menuItem.key, name: menuItem.name, pinned: menuItem.pinned, unread: menuItem.unread, hidden: menuItem.hidden }}
        onClose={() => setMenuKey(null)}
        onPin={() => { if (menuItem) pinIt(menuItem.key, menuItem.pinned); setMenuKey(null); }}
        onRead={() => { if (menuItem) readIt(menuItem.key); setMenuKey(null); }}
        onHide={() => {
          if (menuItem) { if (menuItem.hidden) unhide(menuItem.key); else hideIt(menuItem.key, menuItem.lastMs); }
          setMenuKey(null);
        }}
      />
    </div>
  );
};

/** the sheet of a new letter: a search line over the people one may write to */
const NewLetter: React.FC<{ render: (filter: string) => React.ReactNode }> = ({ render }) => {
  const [f, setF] = useState('');
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <SearchLine value={f} onChange={setF} />
      <div className="min-h-0 overflow-y-auto pb-1">{render(f)}</div>
      <Helper>აირჩიე ადამიანი — ჩათი თავისით გაიხსნება.</Helper>
    </div>
  );
};

export default LettersPage;
