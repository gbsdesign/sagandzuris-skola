import { useEffect, useMemo, useState } from 'react';
import {
  addDoc, collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { APP_NEWS } from '../data/appNews';
import type { SchoolClass } from './useClasses';
import { ChatMessage, toChatMessage } from './useClassChat';
import { ADMIN_NAME, DirectThread } from './useDirectChat';

// The header's 🔔 (2026-11-06, the user: „შეტყობინება აპის განახლებაზე ან სხვა ფუნქციებზე ყველა მანდ მოდიოდეს ასევე
// მასწავლებელი ან ადმინი თუ მწერს, კლასს ან ყველას წერს რამეს — მანდ მოდიოდეს, ჩამოსაშლელი იყოს“; answers: all four
// kinds). One list, newest first, of:
//  - news: what a new version of the app brings (data/appNews.ts, written with each release);
//  - all: an admin's notice for everyone (announcements/{id} { text, by, byName, at }; rules: admins write, the signed-in read);
//  - dm: a teacher's or the administration's private message to me (my dms, the last message by their side);
//  - class: a teacher's or an admin's message in a class chat of mine (the newest messages of each, `teacher` or a teacher
//    of the class), and a teacher's card for me alone (classes/{c}/pins, `to == me`).
// The bell's number = what came since I last opened it (students/{uid}.bellSeenAt in ms, the device for guests); the chats'
// own unread marks stay theirs (the 💬).

export type NoticeKind = 'news' | 'all' | 'dm' | 'class';

export interface Notice {
  id: string;
  kind: NoticeKind;
  /** ms */
  at: number;
  /** who wrote it, or the news' title */
  who: string;
  text: string;
  /** a dm's id, or `class:<id>` for a class chat — what a tap opens */
  chat?: string;
  /** the class (a class message) */
  cls?: SchoolClass;
  /** a teacher's card for me alone */
  card?: boolean;
}

/** how far back the bell looks */
const DAYS = 30;
const SHOWN = 40;
const DAY_MS = 86_400_000;

const newsAt = (date: string) => new Date(`${date}T12:00:00+04:00`).getTime();

/** A chat message as one line. */
const lineOf = (m: ChatMessage) => {
  if (m.kind === 'voice') return '🎤 ხმოვანი შეტყობინება';
  if (m.kind === 'draw') return '🎨 ნახატი — გამოიცანი';
  if (m.kind === 'game') return '🎲 თამაშში გეპატიჟება';
  if (m.kind === 'call') return '📞 ზარი';
  if (m.kind === 'work') return `📋 დავალება${m.text ? `: ${m.text}` : ''}`;
  return m.text || 'ახალი შეტყობინება';
};

// ---- an admin's notices for everyone ----------------------------------------------------------------------------

export interface Announcement { id: string; text: string; by: string; byName: string; at: number }

const useAnnouncements = (on: boolean) => {
  const [list, setList] = useState<Announcement[]>([]);
  useEffect(() => {
    if (!on) { setList([]); return; }
    return onSnapshot(
      query(collection(db, 'announcements'), orderBy('at', 'desc'), limit(20)),
      s => setList(s.docs.map(d => {
        const v = d.data({ serverTimestamps: 'estimate' });
        return { id: d.id, text: v.text || '', by: v.by || '', byName: v.byName || '', at: v.at?.toMillis?.() ?? 0 };
      })),
      err => { console.warn('announcements: ', err?.code || err); setList([]); }
    );
  }, [on]);
  return list;
};

export const sendAnnouncement = (by: string, byName: string, text: string) =>
  addDoc(collection(db, 'announcements'), { text: text.trim().slice(0, 1000), by, byName: byName.slice(0, 80), at: serverTimestamp() });

export const deleteAnnouncement = (id: string) => deleteDoc(doc(db, 'announcements', id));

// ---- teachers' messages in my class chats ----------------------------------------------------------------------

const useStaffMessages = (classes: SchoolClass[], uid: string | undefined) => {
  const [byClass, setByClass] = useState<Record<string, ChatMessage[]>>({});
  const key = uid ? classes.map(c => c.id).join(',') : '';
  useEffect(() => {
    if (!uid) { setByClass({}); return; }
    const offs = classes.flatMap(cls => {
      const staff = (m: ChatMessage) => m.uid !== uid && (m.teacher || cls.teacherIds.includes(m.uid));
      const iTeach = cls.teacherIds.includes(uid);
      const put = (part: string, list: ChatMessage[]) => setByClass(p => ({ ...p, [`${cls.id}/${part}`]: list }));
      const offs = [onSnapshot(
        // the newest messages: a teacher's among them (no index needed, unlike asking for `teacher == true`)
        query(collection(db, 'classes', cls.id, 'messages'), orderBy('createdAt', 'desc'), limit(25)),
        s => put('m', s.docs.map(d => toChatMessage(d)).filter(m => staff(m) && m.kind !== 'call').slice(0, 3)),
        err => console.warn('bell class chat: ', err?.code || err)
      )];
      // a teacher's cards for me alone (the class's teachers see them all in the chat)
      if (!iTeach) offs.push(onSnapshot(
        query(collection(db, 'classes', cls.id, 'pins'), where('to', '==', uid)),
        s => put('p', s.docs.map(d => toChatMessage(d, true)).filter(m => m.uid !== uid)),
        err => console.warn('bell class cards: ', err?.code || err)
      ));
      return offs;
    });
    return () => offs.forEach(o => o());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return byClass;
};

// ---- when I last opened the bell -----------------------------------------------------------------------------

const SEEN_KEY = 'sg-bell-seen';
const deviceSeen = () => {
  try { return Number(localStorage.getItem(SEEN_KEY)) || 0; } catch { return 0; }
};

export const useBellSeen = (uid: string | undefined) => {
  const [local, setLocal] = useState(deviceSeen);
  const [kept, setKept] = useState(0);
  useEffect(() => {
    if (!uid) { setKept(0); return; }
    return onSnapshot(doc(db, 'students', uid), snap => {
      const v = snap.data()?.bellSeenAt;
      setKept(typeof v === 'number' ? v : 0);
    }, () => setKept(0));
  }, [uid]);
  const seen = Math.max(local, kept);
  const markSeen = (at: number) => {
    if (at <= seen) return;
    setLocal(at);
    try { localStorage.setItem(SEEN_KEY, String(at)); } catch { /* private window */ }
    if (uid) setDoc(doc(db, 'students', uid), { bellSeenAt: at }, { mergeFields: ['bellSeenAt'] }).catch(() => {});
  };
  return { seen, markSeen };
};

// ---- the list --------------------------------------------------------------------------------------------------

export const useNotices = (opts: {
  uid?: string;
  /** may see the class chats and private messages */
  chats: boolean;
  classes: SchoolClass[];
  threads: DirectThread[];
}): Notice[] => {
  const { uid, chats, classes, threads } = opts;
  const all = useAnnouncements(!!uid);
  const staffMsgs = useStaffMessages(chats ? classes : [], uid);

  return useMemo(() => {
    const since = Date.now() - DAYS * DAY_MS;
    const list: Notice[] = APP_NEWS.map(n => ({ id: `n:${n.id}`, kind: 'news' as const, at: newsAt(n.date), who: n.title, text: n.text }));
    for (const a of all) list.push({ id: `a:${a.id}`, kind: 'all', at: a.at, who: ADMIN_NAME, text: a.text });
    if (uid && chats) {
      for (const t of threads) {
        if (!t.lastAt) continue;
        const fromTeacher = t.kind === 'teach' && t.studentUid === uid && t.lastBy === t.teacherUid;
        const fromAdmins = t.kind === 'admin' && t.members[0] === uid && t.lastBy !== uid;
        if (!fromTeacher && !fromAdmins) continue;
        list.push({
          id: `d:${t.id}`, kind: 'dm', at: t.lastAt.getTime(),
          who: fromAdmins ? ADMIN_NAME : t.names[t.teacherUid] || 'მასწავლებელი',
          text: t.lastText || 'ახალი შეტყობინება', chat: t.id,
        });
      }
      for (const cls of classes) {
        const msgs = [...(staffMsgs[`${cls.id}/m`] || []), ...(staffMsgs[`${cls.id}/p`] || [])];
        for (const m of msgs) {
          if (!m.at) continue;
          list.push({
            id: `c:${cls.id}:${m.id}`, kind: 'class', at: m.at.getTime(), who: m.name || 'მასწავლებელი',
            text: lineOf(m), chat: `class:${cls.id}`, cls, card: m.pinned,
          });
        }
      }
    }
    // the news never ages out; the rest shows for a month
    return list
      .filter(n => n.kind === 'news' || n.at >= since)
      .sort((a, b) => b.at - a.at)
      .slice(0, SHOWN);
  }, [all, staffMsgs, threads, classes, uid, chats]);
};
