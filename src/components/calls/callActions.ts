import { useSyncExternalStore } from 'react';
import type { User } from 'firebase/auth';
import type { SchoolClass } from '../../hooks/useClasses';
import { ADMIN_NAME, DirectThread, isStaffSide, notePrivateCall, otherOf } from '../../hooks/useDirectChat';
import { CallInfo, CallKind, endChatCall, endClassCall, giveUpAfter, joinCall, ringClass, watchEnd } from '../../utils/callSession';
import { notifyRing } from '../../utils/groupPush';

// Starting, answering and leaving the school's calls (utils/callSession.ts), the same from every button.

const ms = (v: unknown) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = v as any;
  return t?.toMillis ? t.toMillis() : t?.toDate ? t.toDate().getTime() : 0;
};

/** who may start a call in a private chat: either side of a teacher's or classmates' chat; in the administration's
 *  chat only an admin answering it (the member answers, never rings — the user's rule, 2026-11-06) */
export const mayStartChatCall = (t: DirectThread, uid: string) => (t.kind === 'admin' ? isStaffSide(t, uid) : t.members.includes(uid));

export const chatCallInfo = (t: DirectThread, user: User): CallInfo => {
  const staff = isStaffSide(t, user.uid);
  return {
    base: `dms/${t.id}`,
    title: t.kind === 'admin' && !staff ? ADMIN_NAME : otherOf(t, user.uid).name || 'ზარი',
    oneToOne: true,
    // every private call may be by video (the administration's since 2026-11-06 — the member sees the admin's face)
    canVideo: true,
    anonStaff: t.kind === 'admin' && !staff,
    me: { uid: user.uid, name: t.names[user.uid] || user.displayName || '', photoURL: t.photos[user.uid] || user.photoURL || '', staff },
  };
};

export const classCallInfo = (c: SchoolClass, user: User): CallInfo => {
  const p = c.members.find(m => m.uid === user.uid) || c.teachers.find(m => m.uid === user.uid);
  return {
    base: `classes/${c.id}`,
    title: c.name,
    oneToOne: false,
    canVideo: true,
    anonStaff: false,
    me: { uid: user.uid, name: p?.name || user.displayName || '', photoURL: p?.photoURL || user.photoURL || '', staff: false },
    leaders: c.teacherIds,
  };
};

// the other side declined or hung up: callEnd came after callAt
const chatEnded = (d: Record<string, unknown>) => ms(d.callEnd) > 0 && ms(d.callEnd) >= ms(d.callAt);

/** One side calls (see mayStartChatCall): rings the other side at once and joins the chat's call meanwhile (joining
 *  can take seconds: the microphone's question, the connection); a call that could not start stops the ring.
 *  Gives up after 45 s. */
export const startChatCall = async (t: DirectThread, user: User, kind: CallKind) => {
  const info = chatCallInfo(t, user);
  // the call card speaks as the teacher (the staff) only when this side is one
  const teacher = (t.kind === 'teach' && t.teacherUid === user.uid) || info.me.staff;
  const rang = await notePrivateCall(t, { uid: user.uid, name: info.me.name, photoURL: info.me.photoURL, teacher }, kind)
    .then(() => true, e => { console.warn('call ring: ', e?.code || e); return false; });
  // the other side's phone rings even with the app closed (worker/reminders /ring)
  if (rang) void notifyRing(info.base);
  if (!(await joinCall(info, kind))) { endChatCall(t.id).catch(() => {}); if (rang) void notifyRing(info.base, true); return; }
  watchEnd(info.base, chatEnded, info.base);
  giveUpAfter(45_000, () => { endChatCall(t.id).catch(() => {}); void notifyRing(info.base, true); });
};

/** Answering (or joining) a private chat's call. */
export const answerChatCall = async (t: DirectThread, user: User) => {
  const info = chatCallInfo(t, user);
  if (await joinCall(info, t.callKind)) watchEnd(info.base, chatEnded, info.base);
};

export const declineChatCall = (t: DirectThread) => endChatCall(t.id).catch(e => console.warn('call: ', e?.code || e));

/** A class's call: a teacher or an admin starts it (the class sees „ზარი მიმდინარეობს“ at once, while the teacher
 *  is still joining); anyone joins it. A call that could not start is taken back. */
export const startClassCall = async (c: SchoolClass, user: User, kind: CallKind) => {
  const info = classCallInfo(c, user);
  const rang = await ringClass(c.id, { uid: user.uid, name: info.me.name }, kind)
    .then(() => true, e => { console.warn('call ring: ', e?.code || e); return false; });
  if (rang) void notifyRing(info.base);
  if (!(await joinCall(info, kind))) { endClassCall(c.id).catch(() => {}); if (rang) void notifyRing(info.base, true); }
};

export const joinClassCall = (c: SchoolClass, user: User, kind: CallKind) => joinCall(classCallInfo(c, user), kind);

/** A game room's own call („სამშვილდის ღამე“ online): its players and its host, nobody rings — they are in the game
 *  already; the host's video is always received. */
export const gameCallInfo = (base: string, title: string, me: { uid: string; name: string; photoURL: string }, host: string): CallInfo => ({
  base, title, oneToOne: false, canVideo: true, anonStaff: false, me: { ...me, staff: false }, leaders: [host],
});

/** After leaving: a private call is over for both; a class's call ends when the last one leaves (a game's has no ring).
 *  `unanswered`: the one who rang hung up before anybody came — the phones still ringing say „გამოტოვებული ზარი“ (the
 *  Worker sends it only for the caller's own call of the last two minutes). */
export const afterLeave = (info: CallInfo, othersLeft: number, unanswered = false) => {
  const parts = info.base.split('/');
  if (parts.length !== 2) return;
  const [kind, id] = parts;
  if (kind === 'dms') endChatCall(id).catch(() => {});
  else if (othersLeft === 0) endClassCall(id).catch(() => {});
  if (unanswered && (kind === 'dms' || kind === 'classes')) void notifyRing(info.base, true);
};

// ---- answering from the phone's ring (2026-11-05) -------------------------------------------------------------
// A tap on the ring the phone showed with the app closed (or its „პასუხი“) opens the app at /?open=call&b=<base>
// (App.tsx): the call is answered as soon as the app sees it ringing — within a minute, else the wish is forgotten.
let wanted: { base: string; until: number } | null = null;
const wantedSubs = new Set<() => void>();
const wantedSub = (f: () => void) => { wantedSubs.add(f); return () => { wantedSubs.delete(f); }; };

export const wantAnswer = (base: string) => {
  wanted = { base, until: Date.now() + 60_000 };
  wantedSubs.forEach(f => f());
};

/** the wish to answer `base`, taken once (true) — or none */
export const takeAnswer = (base: string) => {
  if (!wanted || wanted.base !== base || Date.now() > wanted.until) return false;
  wanted = null;
  wantedSubs.forEach(f => f());
  return true;
};

export const useAnswerWanted = () => useSyncExternalStore(wantedSub, () => wanted);
