import React, { useEffect, useState } from 'react';
import { Video, Loader2, ShieldCheck, Phone } from 'lucide-react';
import { Button, Dot, RoundButton, Row, Rows, Sheet } from '../components/ui2';
import { BackBtn } from '../components/ui/kit';
import { useAuth, useNavigation } from '../context';
import { useChat, ChatAuthor } from '../hooks/useClassChat';
import type { SchoolClass } from '../hooks/useClasses';
import {
  useThread, dmBase, otherOf, isUnread, isStaffSide, seenByOther, markRead, noteSent, ADMIN_NAME,
} from '../hooks/useDirectChat';
import { useCall, useLivePeers, setCallSmall } from '../utils/callSession';
import { startChatCall, answerChatCall, mayStartChatCall } from '../components/calls/callActions';
import { ChatPanel, Avatar } from '../components/classes/ChatPanel';
import { PinCard } from '../components/classes/PinCard';
import { PinSheet } from '../components/classes/PinSheet';
import { pinPreview, sendDmPin } from '../hooks/useChatPins';
import { kaName } from '../utils/georgianName';

/** The call button over a chat: one round button — a tap asks „ხმოვანი ზარი“ or „ვიდეოზარი“ —, or join a call that is on,
 *  or back to one's own call. */
export const CallButtons: React.FC<{
  base: string; canStart: boolean; canVideo: boolean; onStart: (kind: 'audio' | 'video') => void; onJoin: () => void;
  /** the word on the button that joins a call already on (the class chat: „შეერთება“) */
  joinLabel?: string;
}> = ({ base, canStart, canVideo, onStart, onJoin, joinLabel = 'შესვლა' }) => {
  const call = useCall();
  const live = useLivePeers(base).length > 0;
  const [asking, setAsking] = useState(false);
  const mine = call.info?.base === base && call.status !== 'idle' && call.status !== 'ended';
  if (mine) {
    return (
      <Button size="md" onClick={() => setCallSmall(false)}>
        <span className="size-2 rounded-full bg-white animate-pulse" /> ზარში
      </Button>
    );
  }
  if (live) {
    return <Button size="md" icon={<Phone />} onClick={onJoin}>{joinLabel}</Button>;
  }
  if (!canStart) return null;
  const start = (kind: 'audio' | 'video') => { setAsking(false); onStart(kind); };
  return (
    <>
      <RoundButton label="ზარი" onClick={() => (canVideo ? setAsking(true) : onStart('audio'))}><Phone /></RoundButton>
      <Sheet open={asking} onClose={() => setAsking(false)} title="ზარი">
        <Rows>
          <Row lead={<Dot icon={<Phone />} size={40} />} title="ხმოვანი ზარი" onClick={() => start('audio')} />
          <Row lead={<Dot icon={<Video />} size={40} />} title="ვიდეოზარი" onClick={() => start('video')} />
        </Rows>
      </Sheet>
    </>
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
export const PaneTitle: React.FC<{ face: React.ReactNode; title: string; sub: string; onBack: () => void; onOpen?: () => void }> = ({ face, title, sub, onBack, onOpen }) => {
  const who = (
    <>
      {face}
      <span className="min-w-0 block">
        <span className="block text-[15px] sm:text-base font-bold text-[#2a2017] truncate leading-tight">{title}</span>
        <span className="block text-xs text-[#8a7a6a] truncate mt-0.5">{sub}</span>
      </span>
    </>
  );
  return (
    <div className="flex items-center gap-2.5 min-w-0 flex-1">
      <BackBtn onClick={onBack} className="lg:hidden" />
      {/* a teacher's (an admin's) tap on the student: their own page (pages/StudentPage.tsx) */}
      {onOpen ? (
        <button type="button" onClick={onOpen} title={`${title} — გზა და პროფილი`} className="min-w-0 flex items-center gap-2.5 text-left cursor-pointer rounded-xl hover:bg-[#fbf6ec] -m-1 p-1 transition-colors">{who}</button>
      ) : (
        <div className="min-w-0 flex items-center gap-2.5">{who}</div>
      )}
    </div>
  );
};

// One open private chat on the messages page: a teacher and their student, two classmates, or a member and the
// administration (any admin answers; the member sees only „ადმინისტრაცია“). The superadmin may open anyone's, read only.
export const DirectChat: React.FC<{ id: string; classes: SchoolClass[]; logoUrl?: string; onBack: () => void }> = ({ id, classes, logoUrl, onBack }) => {
  const { user, isAdmin } = useAuth();
  const { openStudent } = useNavigation();
  const { thread, loading: threadLoading } = useThread(user ? id : null);
  const { messages, loading, error } = useChat(thread ? dmBase(thread.id) : null);
  const uid = user?.uid || '';
  const staff = !!thread && isAdmin && isStaffSide(thread, uid);
  // an old classmates' chat only shows (closed 2026-11-21)
  const member = !!thread && thread.kind !== 'peer' && thread.members.includes(uid);
  const canWrite = member || staff;
  const livePeers = useLivePeers(thread && canWrite ? dmBase(thread.id) : null);
  const [pinning, setPinning] = useState(false);

  // opened, or a new message came in while open: mark it read
  useEffect(() => {
    if (thread && canWrite && isUnread(thread, uid)) markRead(thread, uid).catch(e => console.warn('dm: ', e?.code || e));
  }, [thread?.id, thread?.lastAt?.getTime(), canWrite]);

  if (!user) return null;
  if (!thread) {
    return (
      <section className="h-full min-h-[320px] rounded-3xl bg-white/70 ring-1 ring-[#e8dcc8] flex flex-col">
        <div className="p-3 lg:hidden">
          <BackBtn onClick={onBack} />
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
  const myName = thread.names[uid] || kaName(user.displayName) || '';
  const author: ChatAuthor = {
    uid, name: myName, photoURL: thread.photos[uid] || user.photoURL || '', teacher: iTeach || staff,
  };

  // the superadmin looking at others' chat sees both names
  const pair = thread.members.map(m => thread.names[m] || '').filter(Boolean).join(' — ');
  const title = canWrite ? other.name || 'უსახელო' : thread.kind === 'admin' ? `${ADMIN_NAME} — ${pair}` : pair;
  const sub = !canWrite ? 'მხოლოდ სანახავად'
    : staff ? 'სკოლის ჩათი'
    : thread.kind === 'admin' ? 'სკოლის დამფუძნებელი'
    : thread.kind === 'peer' ? `კლასელი${inClass}`
    : iTeach ? `მოსწავლე${inClass}` : `მასწავლებელი${inClass}`;
  const face = canWrite && thread.kind === 'admin' && !staff
    ? <AdminAvatar logoUrl={logoUrl} />
    : <Avatar name={canWrite ? other.name : title} photoURL={canWrite ? other.photoURL : thread.photos[thread.members[thread.members.length - 1]]} className="w-10 h-10 text-base" />;

  // either side calls, by voice or video; in the administration's chat only the admin (the member answers)
  const canStart = mayStartChatCall(thread, uid);
  const joinCall = () => answerChatCall(thread, user);

  // the teacher (or an admin answering the administration's chat) pins a comment or an assignment for the student
  // (hooks/useChatPins.ts); an assignment is made in a class of theirs that the student is in
  const student = thread.kind === 'teach' ? thread.studentUid : thread.kind === 'admin' ? thread.members[0] : '';
  const canPin = canWrite && (iTeach || staff) && !!student;
  const pinClasses = iTeach ? classes.filter(c => c.teacherIds.includes(uid)) : classes;

  return (
    <ChatPanel
      base={dmBase(thread.id)}
      author={author}
      canPin={canWrite}
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
      renderCard={m => (m.kind === 'note' || m.kind === 'work' ? <PinCard m={m} forMe={m.to === uid} /> : null)}
      onAttach={canPin ? () => setPinning(true) : undefined}
      onSent={(kind, text) => noteSent(thread, uid, kind === 'voice' ? (text ? `🎤 ${text}` : VOICE_PREVIEW) : text).catch(e => console.warn('dm: ', e?.code || e))}
      header={
        <div className="flex items-center gap-2 px-3 sm:px-4 py-3">
          <PaneTitle face={face} title={title} sub={sub} onBack={onBack} onOpen={canPin ? () => openStudent(student, thread.classId || '') : undefined} />
          {canWrite && (
            <CallButtons
              base={dmBase(thread.id)}
              canStart={canStart}
              canVideo
              onStart={kind => startChatCall(thread, user, kind)}
              onJoin={joinCall}
            />
          )}
          {canPin && (
            <PinSheet open={pinning} onClose={() => setPinning(false)} inClass={false} classes={pinClasses}
              people={[{ uid: student, name: thread.names[student] || other.name || 'მოსწავლე', photoURL: thread.photos[student] || '' }]}
              onSend={async p => {
                await sendDmPin(dmBase(thread.id), author, p);
                noteSent(thread, uid, pinPreview(p)).catch(e => console.warn('dm: ', e?.code || e));
              }} />
          )}
        </div>
      }
    />
  );
};
