import { useMemo } from 'react';
import { useAuth } from '../context';
import { useAccess } from './useAccess';
import { useMyClasses, useTeachingClasses } from './useClasses';
import { useInbox, isUnread } from './useDirectChat';
import { useClassLasts, useChatSeen, isClassUnread } from './useClassChat';
import { useBellState, useNotices } from './useNotices';

// What the new look's shell counts (redesign stage 2): my classes (member or teacher), the unread chats for the bottom
// menu's „წერილები“ and the notices for the home bar's 🔔 and the notices page. The same rules as the old header
// (layout/Header.tsx): a member a superadmin has not let in sees no class or private chats.

export const useMyAllClasses = () => {
  const { user, isTeacher } = useAuth();
  const memberOf = useMyClasses(user?.uid);
  const { classes: teaching } = useTeachingClasses(isTeacher ? user?.uid : null);
  return useMemo(() => [...memberOf, ...teaching.filter(t => !memberOf.some(m => m.id === t.id))], [memberOf, teaching]);
};

/** The unread chats: private ones (the administration's too, for admins) and class chats with a message after I last read. */
export const useUnreadChats = () => useUnreadParts().total;

/** the same count, with the private chats that wait named (the student's „წერილები“ goes straight to the teacher's chat only
 *  when nothing else waits — BottomNav) */
export const useUnreadParts = () => {
  const { user, isAdmin } = useAuth();
  const access = useAccess();
  const classes = useMyAllClasses();
  const { threads } = useInbox(user?.uid, isAdmin);
  const showChats = !!user && access.can('messages');
  const lasts = useClassLasts(showChats && access.can('classes') ? classes.map(c => c.id) : []);
  const seen = useChatSeen(showChats ? user?.uid : null);
  if (!user || !showChats) return { total: 0, threads: [] as string[] };
  const dms = threads.filter(t => isUnread(t, user.uid)).map(t => t.id);
  return { total: dms.length + classes.filter(c => isClassUnread(lasts[c.id], seen[c.id], user.uid)).length, threads: dms };
};

const MONTH = 30 * 86_400_000;

/** My notices (the 🔔's list), without the ones I swiped aside, and how many came since I last looked. */
export const useMyNotices = () => {
  const { user, isAdmin } = useAuth();
  const access = useAccess();
  const classes = useMyAllClasses();
  const { threads } = useInbox(user?.uid, isAdmin);
  const showChats = !!user && access.can('messages');
  const bell = useBellState(user?.uid);
  const all = useNotices({ uid: user?.uid, chats: showChats, classes: access.can('classes') ? classes : [], threads });
  const notices = useMemo(() => all.filter(n => !bell.hidden.has(n.id)), [all, bell.hidden]);
  const monthAgo = Date.now() - MONTH;
  const count = notices.filter(n => n.at > bell.seen && n.at > monthAgo).length;
  return { notices, count, bell };
};
