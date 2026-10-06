import React, { useEffect } from 'react';
import { ArrowLeft, Video, Loader2 } from 'lucide-react';
import { useAuth, useNavigation } from '../context';
import { useChat, ChatAuthor } from '../hooks/useClassChat';
import { useThread, dmBase, otherOf, isUnread, markRead, noteSent, notePrivateCall } from '../hooks/useDirectChat';
import { privateCallUrl } from '../utils/classCall';
import { ChatPanel, Avatar } from '../components/classes/ChatPanel';

const VOICE_PREVIEW = '🎤 ხმოვანი შეტყობინება';

// A teacher's private chat with one student (the 'dm' page). The superadmin may open anyone's chat, read only.
export const DirectChatPage: React.FC = () => {
  const { user } = useAuth();
  const { selectedDmId, handleGoBack } = useNavigation();
  const { thread, loading: threadLoading } = useThread(user ? selectedDmId : null);
  const base = thread ? dmBase(thread.id) : null;
  const { messages, loading, error } = useChat(base);
  const uid = user?.uid || '';
  const member = !!thread && (thread.teacherUid === uid || thread.studentUid === uid);

  // opened, or a new message came in while open: mark it read
  useEffect(() => {
    if (thread && member && isUnread(thread, uid)) markRead(thread.id, uid).catch(e => console.warn('dm: ', e?.code || e));
  }, [thread?.id, thread?.lastAt?.getTime(), member]);

  const back = (
    <button
      type="button"
      onClick={handleGoBack}
      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full ring-1 ring-[#e8dcc8] bg-white/80 hover:bg-white text-sm font-semibold text-[#4a3426] cursor-pointer active:scale-95"
    >
      <ArrowLeft className="w-4 h-4" /> უკან
    </button>
  );

  if (!user) return null;
  if (!thread) {
    return (
      <div className="w-full max-w-2xl mx-auto px-1 py-4 sm:py-8 space-y-6">
        {back}
        <div className="py-16 flex justify-center text-center text-[#8a7a6a]">
          {threadLoading ? <Loader2 className="w-6 h-6 animate-spin text-[#b3a594]" /> : 'ჩათი ვერ მოიძებნა.'}
        </div>
      </div>
    );
  }

  const isTeacher = thread.teacherUid === uid;
  const other = member ? otherOf(thread, uid) : { uid: thread.studentUid, name: thread.names[thread.studentUid] || '', photoURL: thread.photos[thread.studentUid] || '' };
  const myName = thread.names[uid] || user.displayName || '';
  const author: ChatAuthor = { uid, name: myName, photoURL: thread.photos[uid] || user.photoURL || '', teacher: isTeacher };
  const callTitle = `${thread.names[thread.teacherUid] || 'მასწავლებელი'} — ${thread.names[thread.studentUid] || 'მოსწავლე'}`;
  const joinCall = () => window.open(privateCallUrl(thread.room, callTitle, myName || 'სტუმარი'), '_blank', 'noopener');
  const startCall = () => {
    joinCall();
    notePrivateCall(thread.id, author).catch(e => console.warn('dm call: ', e?.code || e));
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-1 py-4 sm:py-8 space-y-4 text-[#2a2017]">
      {back}
      <ChatPanel
        base={dmBase(thread.id)}
        author={author}
        messages={messages}
        loading={loading}
        error={error}
        readOnly={!member}
        showNames={!member}
        seenAt={member ? thread.read[other.uid] ?? null : null}
        isCall={m => m.kind === 'call'}
        callTitle="ვიდეო ზარი დაიწყო"
        onJoinCall={joinCall}
        canDelete={m => m.uid === uid}
        onSent={(kind, text) => noteSent(thread.id, uid, kind === 'voice' ? VOICE_PREVIEW : text).catch(e => console.warn('dm: ', e?.code || e))}
        listClassName="h-[62vh] min-h-[320px] max-h-[640px]"
        header={
          <div className="flex items-center gap-3 px-4 sm:px-5 pt-4 pb-3">
            <Avatar name={other.name} photoURL={other.photoURL} className="w-11 h-11 text-base" />
            <div className="flex-1 min-w-0">
              <h1 className="font-serif-ge text-lg font-bold text-[#4a3426] truncate">{member ? other.name || 'უსახელო' : callTitle}</h1>
              <p className="text-xs text-[#8a7a6a] truncate">
                {!member ? 'პირადი ჩათი · მხოლოდ სანახავად' : isTeacher ? 'მოსწავლე · პირადი ჩათი' : 'მასწავლებელი · პირადი ჩათი'}
              </p>
            </div>
            {member && isTeacher && (
              <button
                type="button"
                onClick={startCall}
                className="h-11 px-4 shrink-0 rounded-full bg-[#7a2028]/[0.07] ring-1 ring-[#7a2028]/20 text-[#7a2028] text-sm font-bold inline-flex items-center gap-2 cursor-pointer hover:bg-[#7a2028]/[0.11] active:scale-95 transition"
              >
                <Video className="w-[18px] h-[18px]" /> ზარი
              </button>
            )}
          </div>
        }
      />
    </div>
  );
};
