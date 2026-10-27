import React, { useEffect } from 'react';
import { ArrowLeft, Video, Loader2, ShieldCheck, Phone } from 'lucide-react';
import { useAuth } from '../context';
import { useChat, ChatAuthor } from '../hooks/useClassChat';
import type { SchoolClass } from '../hooks/useClasses';
import {
  useThread, dmBase, otherOf, isUnread, isStaffSide, seenByOther, markRead, noteSent, ADMIN_NAME,
} from '../hooks/useDirectChat';
import { useCall, useLivePeers, setCallSmall } from '../utils/callSession';
import { startChatCall, answerChatCall } from '../components/calls/callActions';
import { ChatPanel, Avatar } from '../components/classes/ChatPanel';

/** The call buttons over a chat: start (📞 📹), join a call that is on, or back to one's own call. */
export const CallButtons: React.FC<{
  base: string; canStart: boolean; canVideo: boolean; onStart: (kind: 'audio' | 'video') => void; onJoin: () => void;
}> = ({ base, canStart, canVideo, onStart, onJoin }) => {
  const call = useCall();
  const live = useLivePeers(base).length > 0;
  const mine = call.info?.base === base && call.status !== 'idle' && call.status !== 'ended';
  const icon = 'w-11 h-11 shrink-0 rounded-full bg-[#7a2028]/[0.07] ring-1 ring-[#7a2028]/20 text-[#7a2028] inline-flex items-center justify-center cursor-pointer hover:bg-[#7a2028]/[0.11] active:scale-95 transition';
  if (mine) {
    return (
      <button type="button" onClick={() => setCallSmall(false)}
        className="h-11 px-4 shrink-0 rounded-full bg-emerald-600 text-white text-sm font-bold inline-flex items-center gap-2 cursor-pointer active:scale-95">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> ზარში
      </button>
    );
  }
  if (live) {
    return (
      <button type="button" onClick={onJoin}
        className="h-11 px-4 shrink-0 rounded-full bg-emerald-500 text-white text-sm font-bold inline-flex items-center gap-2 cursor-pointer hover:bg-emerald-600 active:scale-95">
        <Phone className="w-[18px] h-[18px]" /> შესვლა
      </button>
    );
  }
  if (!canStart) return null;
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button type="button" onClick={() => onStart('audio')} aria-label="ზარი" title="ზარი" className={icon}>
        <Phone className="w-[18px] h-[18px]" />
      </button>
      {canVideo && (
        <button type="button" onClick={() => onStart('video')} aria-label="ვიდეოზარი" title="ვიდეოზარი" className={icon}>
          <Video className="w-[18px] h-[18px]" />
        </button>
      )}
    </div>
  );
};

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
  const livePeers = useLivePeers(thread && canWrite ? dmBase(thread.id) : null);

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
    : staff ? 'ადმინისტრაციის ჩათი'
    : thread.kind === 'admin' ? 'სკოლის ადმინისტრაცია'
    : thread.kind === 'peer' ? `კლასელი${inClass}`
    : iTeach ? `მოსწავლე${inClass}` : `მასწავლებელი${inClass}`;
  const face = canWrite && thread.kind === 'admin' && !staff
    ? <AdminAvatar logoUrl={logoUrl} />
    : <Avatar name={canWrite ? other.name : title} photoURL={canWrite ? other.photoURL : thread.photos[thread.members[thread.members.length - 1]]} className="w-10 h-10 text-base" />;

  // the teacher calls (by voice or video); an admin answering the administration's chat, by voice only
  const canStart = iTeach || staff;
  const joinCall = () => answerChatCall(thread, user);

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
      callTitle={thread.callKind === 'video' ? 'ვიდეოზარი' : 'ზარი'}
      onJoinCall={joinCall}
      callLive={livePeers.length > 0}
      canDelete={m => m.uid === uid}
      onSent={(kind, text) => noteSent(thread, uid, kind === 'voice' ? VOICE_PREVIEW : text).catch(e => console.warn('dm: ', e?.code || e))}
      header={
        <div className="flex items-center gap-2 px-3 sm:px-4 py-3">
          <PaneTitle face={face} title={title} sub={sub} onBack={onBack} />
          {canWrite && (
            <CallButtons
              base={dmBase(thread.id)}
              canStart={canStart}
              canVideo={thread.kind === 'teach'}
              onStart={kind => startChatCall(thread, user, kind)}
              onJoin={joinCall}
            />
          )}
        </div>
      }
    />
  );
};
