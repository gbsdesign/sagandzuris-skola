import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '../../context';
import type { SchoolClass } from '../../hooks/useClasses';
import { useChat, classChatBase, ChatAuthor } from '../../hooks/useClassChat';
import { CallButtons } from '../../pages/DirectChatPage';
import { startClassCall, joinClassCall } from '../calls/callActions';
import { ChatPanel } from './ChatPanel';

// The class's chat: text and voice messages between members and teachers, and the class's call (the school's own,
// components/calls): a teacher or an admin starts it, everyone in the class may join (with the camera off at first).
// On the messages page it fills its pane and shows the class itself (title) where the class page says „კლასის ჩათი“.
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

  return (
    <ChatPanel
      base={base}
      author={author}
      messages={messages}
      loading={loading}
      error={error}
      showNames
      // the old Jitsi call notices (meet.jit.si links asked phones to install an app): a plain note now
      isCall={m => m.kind === 'text' && m.text.includes('meet.jit.si')}
      callTitle="ძველი ვიდეოზარი"
      callLive={false}
      onJoinCall={() => {}}
      canDelete={m => m.uid === user.uid || isAdmin}
      fill={fill}
      header={
        <div className={`flex items-center justify-between gap-3 ${title ? 'px-3 sm:px-4 py-3' : 'px-5 sm:px-6 pt-4 pb-3'}`}>
          {title || (
            <h2 className="flex items-center gap-2 font-serif-ge text-lg font-bold text-[#4a3426]">
              <MessageCircle className="w-5 h-5 text-[#7a2028]" /> კლასის ჩათი
            </h2>
          )}
          <CallButtons
            base={base}
            canStart={isAdmin}
            canVideo
            onStart={kind => startClassCall(cls, user, kind)}
            onJoin={() => joinClassCall(cls, user, 'audio')}
          />
        </div>
      }
    />
  );
};
