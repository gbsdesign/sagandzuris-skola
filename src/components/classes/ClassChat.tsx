import React from 'react';
import { MessageCircle, Video } from 'lucide-react';
import { useAuth } from '../../context';
import type { SchoolClass } from '../../hooks/useClasses';
import { useChat, sendTextMessage, classChatBase, ChatAuthor } from '../../hooks/useClassChat';
import { classCallLink, classCallUrl } from '../../utils/classCall';
import { ChatPanel } from './ChatPanel';

const CALL_NOTICE = '📹 ვიდეო ზარი დაიწყო — შემოგვიერთდით:';

// The class's chat: text and voice messages between members and teachers. On the messages page it fills its pane
// and shows the class itself (title) where the class page says „კლასის ჩათი“.
export const ClassChat: React.FC<{ cls: SchoolClass; title?: React.ReactNode; fill?: boolean }> = ({ cls, title, fill }) => {
  const { user, isAdmin: isSchoolAdmin } = useAuth();
  // this class's teachers (and the school's admins) speak as teachers here
  const isAdmin = isSchoolAdmin || (!!user && cls.teacherIds.includes(user.uid));
  const base = classChatBase(cls.id);
  const { messages, loading, error } = useChat(base);
  if (!user) return null;

  const me = cls.members.find(m => m.uid === user.uid) || cls.teachers.find(m => m.uid === user.uid);
  const author: ChatAuthor = {
    uid: user.uid, name: me?.name || user.displayName || 'მასწავლებელი', photoURL: me?.photoURL || user.photoURL || '', teacher: isAdmin,
  };

  // the class's video call opens in a new window; a teacher starting it also tells the class here,
  // unless a call notice was already posted in the last few hours
  const callLink = classCallLink(cls.id);
  const openCall = () => window.open(classCallUrl(cls.id, cls.name, author.name), '_blank', 'noopener');
  const startCall = () => {
    openCall();
    const recent = messages.some(m => m.text.includes(callLink) && m.at && Date.now() - m.at.getTime() < 3 * 3600_000);
    if (isAdmin && !recent) sendTextMessage(base, author, `${CALL_NOTICE}\n${callLink}`).catch(e => console.warn('chat: ', e));
  };

  return (
    <ChatPanel
      base={base}
      author={author}
      messages={messages}
      loading={loading}
      error={error}
      showNames
      isCall={m => m.kind === 'text' && m.text.includes(callLink)}
      callTitle="ვიდეო ზარი დაიწყო"
      onJoinCall={openCall}
      canDelete={m => m.uid === user.uid || isAdmin}
      fill={fill}
      header={
        <div className={`flex items-center justify-between gap-3 ${title ? 'px-3 sm:px-4 py-3' : 'px-5 sm:px-6 pt-4 pb-3'}`}>
          {title || (
            <h2 className="flex items-center gap-2 font-serif-ge text-lg font-bold text-[#4a3426]">
              <MessageCircle className="w-5 h-5 text-[#7a2028]" /> კლასის ჩათი
            </h2>
          )}
          <button
            type="button"
            onClick={startCall}
            aria-label="ვიდეო ზარი"
            title="ვიდეო ზარი"
            className={`h-11 shrink-0 rounded-full bg-[#7a2028]/[0.07] ring-1 ring-[#7a2028]/20 text-[#7a2028] text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer hover:bg-[#7a2028]/[0.11] active:scale-95 transition ${title ? 'w-11 sm:w-auto sm:px-4' : 'px-4'}`}
          >
            <Video className="w-[18px] h-[18px]" /> <span className={title ? 'hidden sm:inline' : ''}>ვიდეო ზარი</span>
          </button>
        </div>
      }
    />
  );
};
