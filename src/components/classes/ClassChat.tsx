import React, { useEffect, useRef, useState } from 'react';
import { CalendarClock, History, MessageCircle, Pencil, Plus } from 'lucide-react';
import { useAuth, useNavigation } from '../../context';
import type { SchoolClass } from '../../hooks/useClasses';
import { useChat, classChatBase, ChatAuthor, markChatSeen } from '../../hooks/useClassChat';
import { CallButtons } from '../../pages/DirectChatPage';
import { startClassCall, joinClassCall } from '../calls/callActions';
import { LessonChips, ScheduleSheet } from '../teacher/Schedule';
import { Btn, IconBtn } from '../ui/kit';
import { triggerHaptic } from '../../utils/haptics';
import { useOpenGameRoom } from '../../utils/gameRoomOpen';
import { ChatPanel } from './ChatPanel';
import { parseChatRoomRef } from '../../data/roomGames';

// The class's chat: text and voice messages between members and teachers, and the class's call (the school's own,
// components/calls): a teacher or an admin starts it, everyone in the class may join (with the camera off at first).
// On the messages page it fills its pane and shows the class itself (title) where the class page says „კლასის ჩათი“.
// The lesson timetable is one line under the title; the class's teachers change it by ✎ (the same window as on the
// class page). The class page shows it under its own title bar, so there `timetable={false}` leaves it out.
// `compact` (the class page): only the newest few messages, growing with the page instead of scrolling inside it;
// the earlier ones open on the messages page.
// The chat counts as read (for the 💬 count) while it is on screen.
const COMPACT = 3;

export const ClassChat: React.FC<{ cls: SchoolClass; title?: React.ReactNode; fill?: boolean; timetable?: boolean; compact?: boolean }> = ({ cls, title, fill, timetable = true, compact = false }) => {
  const { user, isAdmin: isSchoolAdmin } = useAuth();
  const { openDm } = useNavigation();
  // this class's teachers (and the school's admins) speak as teachers here
  const isAdmin = isSchoolAdmin || (!!user && cls.teacherIds.includes(user.uid));
  const base = classChatBase(cls.id);
  const { messages, loading, error } = useChat(base);
  const [lessons, setLessons] = useState(false);
  const openRoom = useOpenGameRoom();

  // read: the newest message, once the chat is (at least partly) in view
  const box = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const signedIn = !!user;
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, [signedIn]);
  const newest = messages[messages.length - 1];
  const newestAt = newest && !newest.pending ? newest.at?.getTime() : undefined;
  useEffect(() => {
    if (user && inView && newestAt) markChatSeen(user.uid, cls.id, newestAt);
  }, [user, inView, newestAt, cls.id]);

  if (!user) return null;

  const me = cls.members.find(m => m.uid === user.uid) || cls.teachers.find(m => m.uid === user.uid);
  const author: ChatAuthor = {
    uid: user.uid, name: me?.name || user.displayName || 'მასწავლებელი', photoURL: me?.photoURL || user.photoURL || '', teacher: isAdmin,
  };

  const shown = compact ? messages.slice(-COMPACT) : messages;

  return (
    <div ref={box} className={fill ? 'h-full' : ''}>
    <ChatPanel
      base={base}
      author={author}
      messages={shown}
      loading={loading}
      error={error}
      showNames
      canDelete={m => m.uid === user.uid || isAdmin}
      onOpenGame={m => { const r = parseChatRoomRef(m.room); if (r) openRoom(cls.id, r.roomId, r.game); }}
      fill={fill}
      listClassName={compact ? '' : undefined}
      listTop={compact && messages.length > COMPACT ? (
        <div className="flex justify-center pb-1">
          <button type="button" onClick={() => { triggerHaptic(8); openDm(`class:${cls.id}`); }}
            className="h-9 px-3.5 rounded-full bg-white/90 ring-1 ring-[#e8dcc8] text-[13px] font-bold text-[#7a2028] inline-flex items-center gap-1.5 cursor-pointer active:scale-95 hover:ring-[#7a2028]/35 transition">
            <History className="w-4 h-4" /> ადრინდელი შეტყობინებები
          </button>
        </div>
      ) : undefined}
      header={
        <div className={title ? 'px-3 sm:px-4 py-3' : 'px-4 min-[400px]:px-5 sm:px-6 pt-4 pb-3'}>
          {/* on a phone too narrow for the title and the round buttons, the buttons drop under the title */}
          <div className={`flex items-center justify-between ${title ? 'gap-3' : 'flex-wrap gap-2'}`}>
            {title || (
              <h2 className="flex items-center gap-2 whitespace-nowrap font-serif-ge text-lg font-bold text-[#4a3426]">
                <MessageCircle className="w-5 h-5 text-[#7a2028]" /> კლასის ჩათი
              </h2>
            )}
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              <CallButtons
                base={base}
                canStart={isAdmin}
                canVideo
                onStart={kind => startClassCall(cls, user, kind)}
                onJoin={() => joinClassCall(cls, user, 'audio')}
              />
            </div>
          </div>
          {/* the lesson timetable as one line under the title (as on the class page); ✎ for the class's teachers */}
          {timetable && (cls.schedule.length > 0 || isAdmin) && (
            <div className="mt-2.5 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                {cls.schedule.length > 0
                  ? <LessonChips slots={cls.schedule} lead={<CalendarClock className="w-[18px] h-[18px] shrink-0 text-[#7a2028] mr-0.5" aria-label="გაკვეთილები" />} />
                  : <Btn kind="soft" size="sm" icon={<Plus />} onClick={() => setLessons(true)}>გაკვეთილების ცხრილი</Btn>}
              </div>
              {isAdmin && cls.schedule.length > 0 && <IconBtn label="ცხრილის შეცვლა" onClick={() => setLessons(true)}><Pencil /></IconBtn>}
            </div>
          )}
          <ScheduleSheet cls={cls} open={lessons} onClose={() => setLessons(false)} />
        </div>
      }
    />
    </div>
  );
};
