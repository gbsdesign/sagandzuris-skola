import type { User } from 'firebase/auth';
import type { SchoolClass } from '../../hooks/useClasses';
import { ADMIN_NAME, DirectThread, isStaffSide, notePrivateCall, otherOf } from '../../hooks/useDirectChat';
import { CallInfo, CallKind, endChatCall, endClassCall, giveUpAfter, joinCall, ringClass, watchEnd } from '../../utils/callSession';

// Starting, answering and leaving the school's calls (utils/callSession.ts), the same from every button.

const ms = (v: unknown) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = v as any;
  return t?.toMillis ? t.toMillis() : t?.toDate ? t.toDate().getTime() : 0;
};

export const chatCallInfo = (t: DirectThread, user: User): CallInfo => {
  const staff = isStaffSide(t, user.uid);
  return {
    base: `dms/${t.id}`,
    title: t.kind === 'admin' && !staff ? ADMIN_NAME : otherOf(t, user.uid).name || 'ზარი',
    oneToOne: true,
    canVideo: t.kind === 'teach',
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

/** The teacher (or an admin) calls: joins the chat's call, then rings the other side; gives up after 45 s. */
export const startChatCall = async (t: DirectThread, user: User, kind: CallKind) => {
  const info = chatCallInfo(t, user);
  if (!(await joinCall(info, kind))) return;
  await notePrivateCall(t, { uid: user.uid, name: info.me.name, photoURL: info.me.photoURL, teacher: true }, kind)
    .catch(e => console.warn('call ring: ', e?.code || e));
  watchEnd(info.base, chatEnded, info.base);
  giveUpAfter(45_000, () => { endChatCall(t.id).catch(() => {}); });
};

/** Answering (or joining) a private chat's call. */
export const answerChatCall = async (t: DirectThread, user: User) => {
  const info = chatCallInfo(t, user);
  if (await joinCall(info, t.callKind)) watchEnd(info.base, chatEnded, info.base);
};

export const declineChatCall = (t: DirectThread) => endChatCall(t.id).catch(e => console.warn('call: ', e?.code || e));

/** A class's call: a teacher or an admin starts it (the class sees „ზარი მიმდინარეობს“); anyone joins it. */
export const startClassCall = async (c: SchoolClass, user: User, kind: CallKind) => {
  const info = classCallInfo(c, user);
  if (!(await joinCall(info, kind))) return;
  await ringClass(c.id, { uid: user.uid, name: info.me.name }, kind).catch(e => console.warn('call ring: ', e?.code || e));
};

export const joinClassCall = (c: SchoolClass, user: User, kind: CallKind) => joinCall(classCallInfo(c, user), kind);

/** After leaving: a private call is over for both; a class's call ends when the last one leaves. */
export const afterLeave = (info: CallInfo, othersLeft: number) => {
  const [kind, id] = info.base.split('/');
  if (kind === 'dms') endChatCall(id).catch(() => {});
  else if (othersLeft === 0) endClassCall(id).catch(() => {});
};
