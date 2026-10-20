import React, { useEffect } from 'react';
import { ArrowLeft, Video, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context';
import { useChat, ChatAuthor } from '../hooks/useClassChat';
import type { SchoolClass } from '../hooks/useClasses';
import {
  useThread, dmBase, otherOf, isUnread, isStaffSide, seenByOther, markRead, noteSent, notePrivateCall, ADMIN_NAME,
} from '../hooks/useDirectChat';
import { privateCallUrl } from '../utils/classCall';
import { ChatPanel, Avatar } from '../components/classes/ChatPanel';

const VOICE_PREVIEW = '🎤 ხმოვანი შეტყობინება';

/** the administration's face: the school's logo */
export const AdminAvatar: React.FC<{ logoUrl?: string; className?: string }> = ({ logoUrl, className = 'w-10 h-10' }) => (
  <span className={`${className} shrink-0 rounded-full bg-[#fbf6ec] ring-1 ring-[#e8dcc8] flex items-center justify-center overflow-hidden`}>
    {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-cover" /> : <ShieldCheck className="w-1/2 h-1/2 text-[#7a2028]" />}
  </span>
);

/** The bar over an open chat: back (phones only, where the chat takes the whole page), face, name and what links us. */
export const PaneTitle: React.FC<{ face: React.ReactNode; title: string; sub: string; onBack: () => void }> = ({ face, title, sub, onBack }) => (
  <div className="flex items-center gap-2.5 min-w-0 flex-1">
    <button
      type="button"
      onClick={onBack}
      aria-label="უკან"
      className="lg:hidden w-10 h-10 -ml-1 shrink-0 rounded-full flex items-center justify-center text-[#4a3426] hover:bg-[#7a2028]/[0.06] cursor-pointer active:scale-95"
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
    {face}
    <div className="min-w-0">
      <h2 className="text-[15px] sm:text-base font-bold text-[#2a2017] truncate leading-tight">{title}</h2>
      <p className="text-xs text-[#8a7a6a] truncate mt-0.5">{sub}</p>
    </div>
  </div>
);

// One open private chat on the messages page: a teacher and their student, two classmates, or a member and the
// administration (any admin answers; the member sees only „ადმინისტრაცია“). The superadmin may open anyone's, read only.
export const DirectChat: React.FC<{ id: string; classes: SchoolClass[]; logoUrl?: string; onBack: () => void }> = ({ id, classes, logoUrl, onBack }) => {
  const { user, isAdmin } = useAuth();
  const { thread, loading: threadLoading } = useThread(user ? id : null);
  const { messages, loading, error } = useChat(thread ? dmBase(thread.id) : null);
  const uid = user?.uid || '';
  const staff = !!thread && isAdmin && isStaffSide(thread, uid);
  const member = !!thread && thread.members.includes(uid);
  const canWrite = member || staff;

  // opened, or a new message came in while open: mark it read
  useEffect(() => {
    if (thread && canWrite && isUnread(thread, uid)) markRead(thread, uid).catch(e => console.warn('dm: ', e?.code || e));
  }, [thread?.id, thread?.lastAt?.getTime(), canWrite]);

  if (!user) return null;
  if (!thread) {
    return (
      <section className="h-full min-h-[320px] rounded-3xl bg-white/70 ring-1 ring-[#e8dcc8] flex flex-col">
        <div className="p-3 lg:hidden">
          <button type="button" onClick={onBack} aria-label="უკან" className="w-10 h-10 rounded-full flex items-center justify-center text-[#4a3426] hover:bg-[#7a2028]/[0.06] cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-sm text-[#8a7a6a]">
          {threadLoading ? <Loader2 className="w-6 h-6 animate-spin text-[#b3a594]" /> : 'ჩათი ვერ მოიძებნა.'}
        </div>
      </section>
    );
  }

  const cls = classes.find(c => c.id === thread.classId);
  const inClass = cls ? ` · ${cls.name}` : '';
  const iTeach = thread.kind === 'teach' && thread.teacherUid === uid;
  const other = otherOf(thread, uid);
  const myName = thread.names[uid] || user.displayName || '';
  const author: ChatAuthor = {
    uid, name: myName, photoURL: thread.photos[uid] || user.photoURL || '', teacher: iTeach || staff,
  };

  // the superadmin looking at others' chat sees both names
  const pair = thread.members.map(m => thread.names[m] || '').filter(Boolean).join(' — ');
  const title = canWrite ? other.name || 'უსახელო' : thread.kind === 'admin' ? `${ADMIN_NAME} — ${pair}` : pair;
  const sub = !canWrite ? 'მხოლოდ სანახავად'
    : staff ? 'ადმინისტრაციის ჩათი · პასუხობს ნებისმიერი ადმინი'
    : thread.kind === 'admin' ? 'სკოლის ადმინისტრაცია'
    : thread.kind === 'peer' ? `კლასელი${inClass}`
    : iTeach ? `მოსწავლე${inClass}` : `მასწავლებელი${inClass}`;
  const face = canWrite && thread.kind === 'admin' && !staff
    ? <AdminAvatar logoUrl={logoUrl} />
    : <Avatar name={canWrite ? other.name : title} photoURL={canWrite ? other.photoURL : thread.photos[thread.members[thread.members.length - 1]]} className="w-10 h-10 text-base" />;

  const callTitle = `${thread.names[thread.teacherUid] || 'მასწავლებელი'} — ${thread.names[thread.studentUid] || 'მოსწავლე'}`;
  const joinCall = () => window.open(privateCallUrl(thread.room, callTitle, myName || 'სტუმარი'), '_blank', 'noopener');
  const startCall = () => {
    joinCall();
    notePrivateCall(thread.id, author).catch(e => console.warn('dm call: ', e?.code || e));
  };

  return (
    <ChatPanel
      base={dmBase(thread.id)}
      author={author}
      messages={messages}
      loading={loading}
      error={error}
      fill
      readOnly={!canWrite}
      // several admins answer an administration chat: the other admins' names are shown to them
      showNames={!canWrite || (staff && (m => m.teacher))}
      staffLabel={thread.kind === 'admin' ? 'ადმინი' : 'მასწავლებელი'}
      seenAt={canWrite ? seenByOther(thread, uid) : null}
      isCall={m => m.kind === 'call'}
      callTitle="ვიდეო ზარი დაიწყო"
      onJoinCall={joinCall}
      canDelete={m => m.uid === uid}
      onSent={(kind, text) => noteSent(thread, uid, kind === 'voice' ? VOICE_PREVIEW : text).catch(e => console.warn('dm: ', e?.code || e))}
      header={
        <div className="flex items-center gap-2 px-3 sm:px-4 py-3">
          <PaneTitle face={face} title={title} sub={sub} onBack={onBack} />
          {iTeach && (
            <button
              type="button"
              onClick={startCall}
              aria-label="ვიდეო ზარი"
              title="ვიდეო ზარი"
              className="h-11 w-11 sm:w-auto sm:px-4 shrink-0 rounded-full bg-[#7a2028]/[0.07] ring-1 ring-[#7a2028]/20 text-[#7a2028] text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer hover:bg-[#7a2028]/[0.11] active:scale-95 transition"
            >
              <Video className="w-[18px] h-[18px]" /> <span className="hidden sm:inline">ზარი</span>
            </button>
          )}
        </div>
      }
    />
  );
};
