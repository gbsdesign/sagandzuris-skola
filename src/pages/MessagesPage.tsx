import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CheckCheck, ChevronDown, ChevronRight, Eye, EyeOff, Loader2, MessageCircle, Pin, Search, ShieldCheck, X } from 'lucide-react';
import { useAuth, useNavigation } from '../context';
import { useMyClasses, useTeachingClasses, useAllClasses } from '../hooks/useClasses';
import type { SchoolClass } from '../hooks/useClasses';
import { useKidsMode } from '../hooks/useAccess';
import {
  useInbox, useAllThreads, useTeacherCards, useKidsFlags, syncKidsFlag, contactGroups, bestContacts, threadIdFor,
  openThread, openPeerThread, openAdminThread, otherOf, isUnread, isStaffSide, adminId, ADMIN_NAME,
  readSince, lastIsMine, seenByOther, markRead, dmBase,
  Contact, DirectThread, Person,
} from '../hooks/useDirectChat';
import { useClassLasts, useChatSeen, isClassUnread, markChatSeen, classChatBase } from '../hooks/useClassChat';
import { useChatListPrefs, isHidden, PIN_MAX } from '../hooks/useChatListPrefs';
import { useUnreadCounts, CountAsk } from '../hooks/useUnreadCounts';
import { useLongPress } from '../hooks/useLongPress';
import { SwipeRow, SwipeSide } from '../components/ui/SwipeRow';
import { ClassPicker, ChatMenu, ListTip, Tick, NewCount } from './messages/ListParts';
import { Avatar, hhmm, dayLabel } from '../components/classes/ChatPanel';
import { PageBar, offerUndo } from '../components/ui/kit';
import { ClassLogo } from '../components/classes/ClassLogo';
import { ClassChat } from '../components/classes/ClassChat';
import { DirectChat, AdminAvatar, PaneTitle } from './DirectChatPage';

// today: the time; earlier: the day
const when = (d: Date | null) => (!d ? '' : d.toDateString() === new Date().toDateString() ? hhmm(d) : dayLabel(d));
const CLASS_PREFIX = 'class:';
// in „ყველა“, each class shows this many people; the rest are a tap away (the class's own filter)
const FEW = 6;

// on a computer the page fills the screen below the header: the list and the chat scroll inside it, the page itself does not.
// On a phone the list is part of the page and the page scrolls (an open chat still fills the screen).
const useFitHeight = (ref: React.RefObject<HTMLElement | null>, dep: unknown) => {
  const [h, setH] = useState(560);
  useLayoutEffect(() => {
    const fit = () => {
      const el = ref.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      setH(Math.max(420, Math.round(window.innerHeight - top - 16)));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [dep]);
  return h;
};

// ---- one row of the list ------------------------------------------------------------------------------------

const Row: React.FC<{
  face: React.ReactNode; name: React.ReactNode; sub: React.ReactNode; time?: string;
  unread?: boolean; active?: boolean; busy?: boolean; onClick: () => void;
  /** how many new messages wait (a dot while not counted) */
  count?: number;
  /** my last message: ✓ sent, ✓✓ seen */
  tick?: React.ReactNode;
  pinned?: boolean;
  /** a long press or a right click: the chat's menu */
  onMenu?: () => void;
  /** what a swipe aside does */
  left?: SwipeSide; right?: SwipeSide;
}> = ({ face, name, sub, time, unread, active, busy, onClick, count, tick, pinned, onMenu, left, right }) => {
  const press = useLongPress(() => onMenu?.());
  const button = (
    <button
      type="button"
      {...(onMenu ? press : {})}
      onClick={onClick}
      disabled={busy}
      aria-current={active || undefined}
      className={`w-full min-h-[60px] flex items-center gap-3 px-2.5 py-2 rounded-2xl text-left cursor-pointer transition active:scale-[0.99] disabled:opacity-60 select-none [-webkit-touch-callout:none] ${
        active ? 'bg-[#7a2028]/[0.08]' : 'hover:bg-[#7a2028]/[0.04]'
      }`}
    >
      {face}
      <span className="flex-1 min-w-0">
        <span className="flex items-baseline justify-between gap-2">
          <span className={`min-w-0 truncate text-[15px] text-[#2a2017] ${unread ? 'font-bold' : 'font-semibold'}`}>{name}</span>
          <span className="shrink-0 inline-flex items-center gap-1">
            {pinned && <Pin className="w-3.5 h-3.5 rotate-45 text-[#a89886]" aria-label="მიმაგრებული" />}
            {time && <span className={`text-xs tabular-nums ${unread ? 'font-bold text-[#7a2028]' : 'text-[#a89886]'}`}>{time}</span>}
          </span>
        </span>
        <span className="flex items-center justify-between gap-2 mt-0.5">
          <span className="min-w-0 inline-flex items-center gap-1">
            {tick}
            <span className={`truncate text-[13px] ${unread ? 'text-[#4a3426] font-semibold' : 'text-[#8a7a6a]'}`}>{sub}</span>
          </span>
          {busy ? <Loader2 className="w-4 h-4 shrink-0 animate-spin text-[#a89886]" /> : unread && <NewCount n={count} />}
        </span>
      </span>
    </button>
  );
  return <li>{left || right ? <SwipeRow left={left} right={right} faceBg="bg-[#fffdf9]">{button}</SwipeRow> : button}</li>;
};

const Heading: React.FC<{ children: React.ReactNode; action?: React.ReactNode }> = ({ children, action }) => (
  <div className="flex items-center justify-between gap-2 px-2.5 pt-4 pb-1">
    <h3 className="text-xs font-bold text-[#a89886] truncate">{children}</h3>
    {action}
  </div>
);

// Private messages, like a messenger: on the left one's chats (the classes' chats among them) and whom one may start
// writing to, by class; on the right the open chat (on a phone the chat takes the whole page). A student writes to their
// teachers, their classmates and the administration; a teacher to their classes; an admin to everyone in every class
// (through the administration). The superadmin may also look through every chat in the school (read only).
export const MessagesPage: React.FC<{ logoUrl?: string }> = ({ logoUrl }) => {
  const { user, isAdmin, isSuperAdmin, isTeacher } = useAuth();
  const { currentPage, selectedDmId, openDm, handleGoBack } = useNavigation();
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
  // when I last read each class chat (on any of my devices); the chat marks itself read while it is open
  const seen = useChatSeen(uid);

  // the member's own kids' mode, copied where classmates' lists can see it (the rules accept only the truth)
  const kidsOn = !!kidsMode;
  const flagged = kids.has(uid);
  useEffect(() => {
    if (uid && !isTeacher && kidsOn !== flagged) syncKidsFlag(uid, kidsOn);
  }, [uid, isTeacher, kidsOn, flagged]);

  // class chats in the list: one's own classes, and the class an admin picked above
  const classRows = known.filter(c => mine.some(m => m.id === c.id) || chip === c.id);
  const lasts = useClassLasts(classRows.map(c => c.id));
  const openClassId = open?.startsWith(CLASS_PREFIX) ? open.slice(CLASS_PREFIX.length) : null;

  const shell = useRef<HTMLDivElement>(null);
  const fit = useFitHeight(shell, open);

  // the list's own order, the same on every device of mine: pinned on top, some taken off (back on a new message)
  const { prefs, pin, unpin, hide, unhide } = useChatListPrefs(uid);
  const [menuKey, setMenuKey] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  // how many new messages wait in each unread chat
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
      go(await run());
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

  // ---- the chats -----------------------------------------------------------------------------------------
  const fresh = (p: Person): Person => (cards[p.uid] ? { ...p, name: cards[p.uid].name || p.name, photoURL: cards[p.uid].photoURL || p.photoURL } : p);
  const classOf = (t: DirectThread) => known.find(c => c.id === t.classId);
  const threadInChip = (t: DirectThread) =>
    chip === 'all' || (t.kind === 'admin' ? personIn(known.find(c => c.id === chip), t.members[0]) : t.classId === chip);

  // ---- what the menu and the swipes do ---------------------------------------------------------------------
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
  const hideSide = (key: string, lastMs: number): SwipeSide => ({
    label: 'დამალვა', icon: <EyeOff className="w-5 h-5" />, tone: 'bg-[#6b5a4a] text-white', leave: true, run: () => hideIt(key, lastMs),
  });
  const readSide = (key: string): SwipeSide => ({
    label: 'წაკითხულად', icon: <CheckCheck className="w-5 h-5" />, tone: 'bg-[#2e7d5b] text-white', run: () => readIt(key),
  });

  // one chat of the list. `empty`: nobody wrote there yet — such chats go under the ones with messages
  type Item = {
    key: string; name: string; at: number; lastMs: number; empty: boolean;
    pinned: boolean; hidden: boolean; unread: boolean; node: React.ReactNode;
  };
  const items: Item[] = [];
  const rowProps = (key: string, lastMs: number, pinned: boolean, hidden: boolean, unread: boolean) => ({
    pinned,
    unread,
    count: counts[key],
    active: open === key,
    onClick: () => { if (hidden) unhide(key); go(key); },
    onMenu: () => setMenuKey(key),
    left: hidden ? undefined : hideSide(key, lastMs),
    right: unread ? readSide(key) : undefined,
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
        key: id, name: c.name, at: lastMs, lastMs, empty: !last, pinned, hidden, unread,
        node: (
          <Row
            key={id}
            face={<ClassLogo name={c.name} logo={c.logo} className="w-11 h-11 text-base" />}
            name={c.name}
            sub={last ? `${last.uid === uid ? 'შენ: ' : ''}${last.text}` : `კლასის ჩათი · ${c.members.length} წევრი`}
            time={when(last?.at ?? null)}
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
      const who = t.lastBy === uid ? 'შენ: ' : staff && t.lastBy && t.lastBy !== t.members[0] ? 'ადმინი: ' : '';
      const lastMs = t.lastAt?.getTime() ?? 0;
      const unread = dmUnread(t);
      const pinned = prefs.pins.includes(t.id);
      const hidden = isHidden(prefs, t.id, lastMs);
      const seenAt = seenByOther(t, uid);
      items.push({
        key: t.id, name, at: (t.lastAt || t.createdAt)?.getTime() ?? 0, lastMs, empty: !t.lastText, pinned, hidden, unread,
        node: (
          <Row
            key={t.id}
            face={t.kind === 'admin' && !staff ? <AdminAvatar logoUrl={logoUrl} className="w-11 h-11" /> : <Avatar name={name} photoURL={o.photoURL} className="w-11 h-11 text-base" />}
            name={staff ? <span className="inline-flex items-center gap-1.5 max-w-full"><ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[#7a2028]" aria-label="ადმინისტრაცია" /><span className="truncate">{name}</span></span> : name}
            sub={t.lastText ? `${who}${t.lastText}` : 'ჯერ შეტყობინება არ არის'}
            time={when(t.lastAt)}
            tick={t.lastText && lastIsMine(t, uid) ? <Tick seen={!!seenAt && !!t.lastAt && seenAt >= t.lastAt} /> : null}
            {...rowProps(t.id, lastMs, pinned, hidden, unread)}
          />
        ),
      });
    }
    // pinned first (the newest pin on top), then the chats with messages, newest first, then the empty ones
    const pinRank = (i: Item) => (i.pinned ? prefs.pins.indexOf(i.key) : PIN_MAX);
    items.sort((a, b) => pinRank(a) - pinRank(b) || Number(a.empty) - Number(b.empty) || b.at - a.at);
  }
  // a hidden chat stays out of the list (a search still finds it); they wait in a fold at the bottom
  const shownItems = items.filter(i => !i.hidden || needle);
  const hiddenItems = needle ? [] : items.filter(i => i.hidden);
  const menuItem = menuKey ? items.find(i => i.key === menuKey) ?? null : null;
  // unread chats a class, for the class picker
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
        <Row
          key={t.id}
          face={<Avatar name={pair} photoURL={t.photos[t.members[t.members.length - 1]] || ''} className="w-11 h-11 text-base" />}
          name={name}
          sub={`${kindName}${classOf(t) ? ` · ${classOf(t)!.name}` : ''}${t.lastText ? ` · ${t.lastText}` : ''}`}
          time={when(t.lastAt)}
          active={open === t.id}
          onClick={() => go(t.id)}
        />
      )];
    })
    : [];

  // ---- whom one may start writing to -----------------------------------------------------------------------
  const have = new Set([...threads.map(t => t.id)]);
  const groups = contactGroups(known, uid, { isAdmin, kidsMe: kidsOn && !isTeacher, kids });
  const best = bestContacts(groups);
  const showAdminRow = !isAdmin && !have.has(adminId(uid)) && matches(ADMIN_NAME, 'ადმინი');
  const contactRows = overview ? [] : groups.filter(g => inChip(g.cls.id)).map(g => {
    const list = g.contacts.filter(c => {
      if (have.has(threadIdFor(c, uid))) return false;
      // in „ყველა“ each person once, in the class with the closest link
      if (chip === 'all') { const b = best.get(c.uid); if (b && (b.classId !== c.classId || b.rel !== c.rel)) return false; }
      return matches(fresh(c).name);
    });
    const cut = chip === 'all' && !needle && list.length > FEW + 1;
    return { cls: g.cls, list: cut ? list.slice(0, FEW) : list, more: cut ? list.length - FEW : 0, total: list.length };
  }).filter(g => g.list.length > 0);
  // many classes (an admin, a teacher of several): in „ყველა“ each class is one line that opens its people;
  // a search still finds anyone
  const folded = chip === 'all' && !needle && contactRows.length > 2;

  const relLabel = (c: Contact, cls: SchoolClass) =>
    c.rel === 'peer' ? 'კლასელი' : c.rel === 'teacher' || cls.teacherIds.includes(c.uid) ? 'მასწავლებელი' : 'მოსწავლე';

  const chips = known.length > 1 ? known : [];
  const busyList = overview ? all.loading : loading;
  const nothing = !busyList && items.length === 0 && overviewRows.length === 0 && contactRows.length === 0 && !showAdminRow;

  // ---- the open chat ---------------------------------------------------------------------------------------
  const openCls = openClassId ? known.find(c => c.id === openClassId) : null;
  const pane = !open ? (
    <div className="h-full rounded-3xl bg-white/50 ring-1 ring-[#e8dcc8] flex flex-col items-center justify-center text-center gap-3 px-8">
      <span className="w-16 h-16 rounded-full bg-[#7a2028]/[0.06] flex items-center justify-center">
        <MessageCircle className="w-8 h-8 text-[#7a2028]/70" />
      </span>
      <p className="font-serif-ge text-lg font-bold text-[#4a3426]">აირჩიეთ ჩათი</p>
    </div>
  ) : openClassId ? (
    openCls ? (
      <ClassChat
        key={openCls.id}
        cls={openCls}
        fill
        title={<PaneTitle face={<ClassLogo name={openCls.name} logo={openCls.logo} className="w-10 h-10 text-base" />} title={openCls.name} sub={`კლასის ჩათი · ${openCls.members.length} წევრი`} onBack={handleGoBack} />}
      />
    ) : (
      <div className="h-full rounded-3xl bg-white/70 ring-1 ring-[#e8dcc8] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#b3a594]" /></div>
    )
  ) : (
    <DirectChat key={open} id={open} classes={known} logoUrl={logoUrl} onBack={handleGoBack} />
  );

  return (
    <div className="w-full max-w-5xl mx-auto px-1 py-3 sm:py-5 text-[#2a2017]">
      {/* the school's one page bar; on a phone with a chat open the chat's own head takes its place */}
      <div className={`${open ? 'hidden lg:block' : ''} mb-3`}>
        <PageBar
          title="წერილები"
          onBack={handleGoBack}
          right={isSuperAdmin && (
            <button
              type="button"
              onClick={() => setOverview(v => !v)}
              aria-pressed={overview}
              title="სკოლის ყველა პირადი ჩათი — მხოლოდ სანახავად"
              aria-label="ყველა ჩათი"
              className={`h-9 min-w-9 px-0 min-[380px]:px-3.5 shrink-0 rounded-full text-sm font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition ${
                overview ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white/80 ring-1 ring-[#e8dcc8] text-[#7a2028] hover:bg-white'
              }`}
            >
              <Eye className="w-4 h-4" /> <span className="hidden min-[380px]:inline">ყველა ჩათი</span>
            </button>
          )}
        />
      </div>

      <div
        ref={shell}
        style={{ '--fit': `${fit}px` } as React.CSSProperties}
        className="lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-4 lg:h-[var(--fit)]"
      >
        <aside className={`${open ? 'hidden lg:flex' : 'flex'} flex-col min-h-0 rounded-3xl bg-white/70 ring-1 ring-[#e8dcc8] overflow-hidden`}>
          <div className="shrink-0 p-3 space-y-2.5 border-b border-[#efe5d4]">
            <label className="relative block">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a89886] pointer-events-none" />
              <input
                type="search"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="ძებნა სახელით…"
                aria-label="ძებნა"
                className="w-full h-11 rounded-full bg-[#fbf6ec] ring-1 ring-[#e8dcc8] pl-10 pr-10 text-base text-[#2a2017] placeholder:text-[#b3a594] focus:outline-none focus:ring-2 focus:ring-[#7a2028]/35 [&::-webkit-search-cancel-button]:hidden"
              />
              {q && (
                <button type="button" onClick={() => setQ('')} aria-label="გასუფთავება" className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-[#a89886] hover:text-[#4a3426] cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              )}
            </label>
            {chips.length > 0 && <ClassPicker classes={chips} chip={chip} onPick={setChip} unreadIn={unreadIn} />}
          </div>

          {/* scrolls inside only on a computer: on a phone a box that does not scroll but holds the page's scroll
              (overscroll-contain) stops the finger — newer Chrome (144+) does that, and the list „got stuck“ */}
          <div className="flex-1 min-h-0 lg:overflow-y-auto lg:overscroll-contain px-1.5 pb-3">
            {err && <p className="px-2.5 pt-3 text-sm text-[#a02c2c]">{err}</p>}
            {busyList && items.length === 0 && overviewRows.length === 0 ? (
              <div className="py-10 flex justify-center text-[#b3a594]"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : overview ? (
              <>
                <Heading>სკოლის ყველა პირადი ჩათი · მხოლოდ სანახავად</Heading>
                {overviewRows.length ? <ul className="space-y-0.5">{overviewRows}</ul> : <p className="px-2.5 py-6 text-center text-sm text-[#8a7a6a]">ჩათი ვერ მოიძებნა.</p>}
              </>
            ) : (
              <>
                {shownItems.length > 0 && (
                  <>
                    <Heading>ჩათები</Heading>
                    <ListTip />
                    <ul className="space-y-0.5 mt-1">{shownItems.map(i => i.node)}</ul>
                  </>
                )}
                {(showAdminRow || contactRows.length > 0) && (
                  <Heading>{shownItems.length > 0 ? 'ახალი საუბარი' : 'ვის მისწეროთ?'}</Heading>
                )}
                {showAdminRow && (
                  <ul>
                    <Row
                      face={<AdminAvatar logoUrl={logoUrl} className="w-11 h-11" />}
                      name={ADMIN_NAME}
                      sub="კითხვა ან თხოვნა სკოლას"
                      busy={opening === 'admin'}
                      onClick={() => start('admin', () => openAdminThread(me()))}
                    />
                  </ul>
                )}
                {folded ? (
                  <ul className="space-y-0.5">
                    {contactRows.map(g => (
                      <Row
                        key={g.cls.id}
                        face={<ClassLogo name={g.cls.name} logo={g.cls.logo} className="w-11 h-11 text-base" />}
                        name={g.cls.name}
                        sub={<span className="inline-flex items-center gap-1">{g.total} ადამიანი <ChevronRight className="w-3.5 h-3.5" /></span>}
                        onClick={() => setChip(g.cls.id)}
                      />
                    ))}
                  </ul>
                ) : contactRows.map(g => (
                  <section key={g.cls.id}>
                    {(chip === 'all' && (contactRows.length > 1 || showAdminRow)) && (
                      <h4 className="flex items-center gap-2 px-2.5 pt-3 pb-1 text-[13px] font-bold text-[#4a3426] min-w-0">
                        <ClassLogo name={g.cls.name} logo={g.cls.logo} className="w-5 h-5 text-[11px]" />
                        <span className="truncate">{g.cls.name}</span>
                      </h4>
                    )}
                    <ul className="space-y-0.5">
                      {g.list.map(c => {
                        const p = fresh(c);
                        return (
                          <Row
                            key={`${g.cls.id}:${c.uid}`}
                            face={<Avatar name={p.name} photoURL={p.photoURL} className="w-11 h-11 text-base" />}
                            name={p.name || 'უსახელო'}
                            sub={relLabel(c, g.cls)}
                            busy={opening === c.uid}
                            onClick={() => startWith(c)}
                          />
                        );
                      })}
                    </ul>
                    {g.more > 0 && (
                      <button
                        type="button"
                        onClick={() => setChip(g.cls.id)}
                        className="ml-2.5 mt-1 h-9 px-3.5 rounded-full text-sm font-semibold text-[#7a2028] hover:bg-[#7a2028]/[0.06] cursor-pointer active:scale-95"
                      >
                        კიდევ {g.more} · {g.cls.name}
                      </button>
                    )}
                  </section>
                ))}
                {hiddenItems.length > 0 && (
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={() => setShowHidden(v => !v)}
                      aria-expanded={showHidden}
                      className="ml-1 h-9 px-3 rounded-full text-sm font-semibold text-[#8a7a6a] hover:bg-[#7a2028]/[0.05] inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <EyeOff className="w-4 h-4" /> დამალული ჩათები · {hiddenItems.length}
                      <ChevronDown className={`w-4 h-4 transition-transform ${showHidden ? 'rotate-180' : ''}`} />
                    </button>
                    {showHidden && <ul className="space-y-0.5 mt-1">{hiddenItems.map(i => i.node)}</ul>}
                  </div>
                )}
                {nothing && (
                  <p className="px-4 py-10 text-center text-sm text-[#8a7a6a]">
                    {needle ? 'ვერავინ მოიძებნა.' : 'ჯერ არცერთ კლასში არ ხართ. როცა მასწავლებელი კლასში დაგამატებთ, აქ გამოჩნდებიან.'}
                  </p>
                )}
              </>
            )}
          </div>
        </aside>

        <main className={`${open ? 'block' : 'hidden lg:block'} min-w-0 h-[var(--fit)] lg:h-full`}>
          {pane}
        </main>
      </div>

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
