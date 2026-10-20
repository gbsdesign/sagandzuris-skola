import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, Eye, Loader2, MessageCircle, Search, ShieldCheck, X } from 'lucide-react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, useNavigation } from '../context';
import { useMyClasses, useTeachingClasses, useAllClasses } from '../hooks/useClasses';
import type { SchoolClass } from '../hooks/useClasses';
import { useKidsMode } from '../hooks/useAccess';
import {
  useInbox, useAllThreads, useTeacherCards, useKidsFlags, syncKidsFlag, contactGroups, bestContacts, threadIdFor,
  openThread, openPeerThread, openAdminThread, otherOf, isUnread, isStaffSide, adminId, ADMIN_NAME,
  Contact, DirectThread, Person,
} from '../hooks/useDirectChat';
import { Avatar, hhmm, dayLabel } from '../components/classes/ChatPanel';
import { ClassLogo } from '../components/classes/ClassLogo';
import { ClassChat } from '../components/classes/ClassChat';
import { DirectChat, AdminAvatar, PaneTitle } from './DirectChatPage';

// today: the time; earlier: the day
const when = (d: Date | null) => (!d ? '' : d.toDateString() === new Date().toDateString() ? hhmm(d) : dayLabel(d));
const CLASS_PREFIX = 'class:';
// in „ყველა“, each class shows this many people; the rest are a tap away (the class's own filter)
const FEW = 6;

// ---- class chats in the list: the newest message, and when this device last opened each ---------------------

interface Last { at: Date | null; uid: string; text: string }

const useClassLasts = (ids: string[]) => {
  const [last, setLast] = useState<Record<string, Last | null>>({});
  const key = ids.join(',');
  useEffect(() => {
    const offs = ids.map(id => onSnapshot(
      query(collection(db, 'classes', id, 'messages'), orderBy('createdAt', 'desc'), limit(1)),
      s => {
        const d = s.docs[0]?.data({ serverTimestamps: 'estimate' });
        setLast(p => ({
          ...p,
          [id]: d ? { at: d.createdAt?.toDate?.() || null, uid: d.uid || '', text: d.kind === 'voice' ? '🎤 ხმოვანი შეტყობინება' : d.text || '' } : null,
        }));
      },
      err => console.warn('class chat: ', err?.code || err)
    ));
    return () => offs.forEach(off => off());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return last;
};

const SEEN_KEY = 'sg-classChatSeen';
const readSeen = (): Record<string, number> => {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') || {}; } catch { return {}; }
};

// the page fills the screen below the header: the list and the chat scroll inside it, the page itself does not
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
}> = ({ face, name, sub, time, unread, active, busy, onClick }) => (
  <li>
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-current={active || undefined}
      className={`w-full min-h-[60px] flex items-center gap-3 px-2.5 py-2 rounded-2xl text-left cursor-pointer transition active:scale-[0.99] disabled:opacity-60 ${
        active ? 'bg-[#7a2028]/[0.08]' : 'hover:bg-[#7a2028]/[0.04]'
      }`}
    >
      {face}
      <span className="flex-1 min-w-0">
        <span className="flex items-baseline justify-between gap-2">
          <span className={`min-w-0 truncate text-[15px] text-[#2a2017] ${unread ? 'font-bold' : 'font-semibold'}`}>{name}</span>
          {time && <span className={`shrink-0 text-xs tabular-nums ${unread ? 'font-bold text-[#7a2028]' : 'text-[#a89886]'}`}>{time}</span>}
        </span>
        <span className="flex items-center justify-between gap-2 mt-0.5">
          <span className={`truncate text-[13px] ${unread ? 'text-[#4a3426] font-semibold' : 'text-[#8a7a6a]'}`}>{sub}</span>
          {busy ? <Loader2 className="w-4 h-4 shrink-0 animate-spin text-[#a89886]" />
            : unread && <span className="w-2.5 h-2.5 shrink-0 rounded-full bg-[#c62828]" aria-label="წაუკითხავი" />}
        </span>
      </span>
    </button>
  </li>
);

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
  const [seen, setSeen] = useState(readSeen);

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
  const openClassLast = openClassId ? lasts[openClassId]?.at?.getTime() : undefined;
  useEffect(() => {
    if (!openClassId) return;
    setSeen(s => {
      const next = { ...s, [openClassId]: Date.now() };
      try { localStorage.setItem(SEEN_KEY, JSON.stringify(next)); } catch { /* private window */ }
      return next;
    });
  }, [openClassId, openClassLast]);

  const shell = useRef<HTMLDivElement>(null);
  const fit = useFitHeight(shell, open);

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

  type Item = { key: string; at: number; node: React.ReactNode };
  const items: Item[] = [];

  if (!overview) {
    for (const c of classRows) {
      if (!inChip(c.id) || !matches(c.name)) continue;
      const last = lasts[c.id];
      const id = CLASS_PREFIX + c.id;
      const unread = !!last?.at && last.uid !== uid && (seen[c.id] ?? 0) < last.at.getTime() && open !== id;
      items.push({
        key: id,
        at: last?.at?.getTime() ?? 0,
        node: (
          <Row
            key={id}
            face={<ClassLogo name={c.name} logo={c.logo} className="w-11 h-11 text-base" />}
            name={c.name}
            sub={last ? `${last.uid === uid ? 'შენ: ' : ''}${last.text}` : `კლასის ჩათი · ${c.members.length} წევრი`}
            time={when(last?.at ?? null)}
            unread={unread}
            active={open === id}
            onClick={() => go(id)}
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
      items.push({
        key: t.id,
        at: (t.lastAt || t.createdAt)?.getTime() ?? 0,
        node: (
          <Row
            key={t.id}
            face={t.kind === 'admin' && !staff ? <AdminAvatar logoUrl={logoUrl} className="w-11 h-11" /> : <Avatar name={name} photoURL={o.photoURL} className="w-11 h-11 text-base" />}
            name={staff ? <span className="inline-flex items-center gap-1.5 max-w-full"><ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[#7a2028]" aria-label="ადმინისტრაცია" /><span className="truncate">{name}</span></span> : name}
            sub={t.lastText ? `${who}${t.lastText}` : 'ჯერ შეტყობინება არ არის'}
            time={when(t.lastAt)}
            unread={isUnread(t, uid)}
            active={open === t.id}
            onClick={() => go(t.id)}
          />
        ),
      });
    }
    items.sort((a, b) => b.at - a.at);
  }

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
    return { cls: g.cls, list: cut ? list.slice(0, FEW) : list, more: cut ? list.length - FEW : 0 };
  }).filter(g => g.list.length > 0);

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
      <p className="text-sm text-[#8a7a6a] max-w-xs">ან მარცხნივ, სიიდან დაიწყეთ ახალი საუბარი. ხმოვანი შეტყობინებაც შეგიძლიათ.</p>
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
      <div className={`${open ? 'hidden lg:flex' : 'flex'} items-center gap-2 mb-3`}>
        <button
          type="button"
          onClick={handleGoBack}
          aria-label="უკან"
          className="w-9 h-9 shrink-0 rounded-full ring-1 ring-[#e8dcc8] bg-white/80 hover:bg-white text-[#4a3426] flex items-center justify-center cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="font-serif-ge text-xl sm:text-2xl font-bold text-[#4a3426] truncate">შეტყობინებები</h1>
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setOverview(v => !v)}
            aria-pressed={overview}
            title="სკოლის ყველა პირადი ჩათი — მხოლოდ სანახავად"
            className={`ml-auto h-9 px-3.5 shrink-0 rounded-full text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer active:scale-95 transition ${
              overview ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white/80 ring-1 ring-[#e8dcc8] text-[#7a2028] hover:bg-white'
            }`}
          >
            <Eye className="w-4 h-4" /> ყველა ჩათი
          </button>
        )}
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
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="კლასი">
                {[{ id: 'all', name: 'ყველა' }, ...chips].map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setChip(c.id)}
                    aria-pressed={chip === c.id}
                    className={`h-9 max-w-full px-3.5 rounded-full text-sm font-semibold truncate cursor-pointer active:scale-95 transition ${
                      chip === c.id ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/35'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-1.5 pb-3">
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
                {items.length > 0 && (
                  <>
                    <Heading>ჩათები</Heading>
                    <ul className="space-y-0.5">{items.map(i => i.node)}</ul>
                  </>
                )}
                {(showAdminRow || contactRows.length > 0) && (
                  <Heading>{items.length > 0 ? 'ახალი საუბარი' : 'ვის მისწეროთ?'}</Heading>
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
                {contactRows.map(g => (
                  <section key={g.cls.id}>
                    {(chip === 'all' && (contactRows.length > 1 || showAdminRow)) && (
                      <h4 className="flex items-center gap-2 px-2.5 pt-3 pb-1 text-[13px] font-bold text-[#4a3426] min-w-0">
                        <ClassLogo name={g.cls.name} logo={g.cls.logo} className="w-5 h-5 text-[10px]" />
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
    </div>
  );
};
