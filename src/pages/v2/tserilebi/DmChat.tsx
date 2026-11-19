import React, { useEffect, useState } from 'react';
import { Phone, Video } from 'lucide-react';
import { Waiting } from '../../../components/shell/PageSkeleton';
import { useAuth, useNavigation } from '../../../context';
import { useChat, type ChatAuthor } from '../../../hooks/useClassChat';
import type { SchoolClass } from '../../../hooks/useClasses';
import {
  useThread, dmBase, otherOf, isUnread, isStaffSide, seenByOther, markRead, noteSent, ADMIN_NAME,
} from '../../../hooks/useDirectChat';
import { useCall, useLivePeers, setCallSmall } from '../../../utils/callSession';
import { startChatCall, answerChatCall, mayStartChatCall } from '../../../components/calls/callActions';
import { ChatPanel } from '../../../components/classes/ChatPanel';
import { PinCard } from '../../../components/classes/PinCard';
import { PinSheet } from '../../../components/classes/PinSheet';
import { pinPreview, sendDmPin } from '../../../hooks/useChatPins';
import { Press, RoundButton, Row, Rows, Sheet, TopBar, Dot, cx } from '../../../components/ui2';

const green = 'flex h-tap shrink-0 cursor-pointer items-center gap-2 rounded-full bg-leaf px-4 text-body font-bold text-white transition active:scale-95';
const VOICE_PREVIEW = '🎤 ხმოვანი შეტყობინება';

/** The one round phone of a private chat: a tap asks voice or video; a call that is on shows „ზარში“ / „შესვლა“. */
export const CallButton: React.FC<{
  base: string; canStart: boolean; canVideo: boolean; onStart: (kind: 'audio' | 'video') => void; onJoin: () => void;
}> = ({ base, canStart, canVideo, onStart, onJoin }) => {
  const call = useCall();
  const live = useLivePeers(base).length > 0;
  const mine = call.info?.base === base && call.status !== 'idle' && call.status !== 'ended';
  const [asking, setAsking] = useState(false);
  if (mine) {
    return <Press onClick={() => setCallSmall(false)} className={green}>ზარში</Press>;
  }
  if (live) {
    return <Press onClick={onJoin} className={green}><Phone aria-hidden="true" className="size-[18px]" />შესვლა</Press>;
  }
  if (!canStart) return null;
  const go = (kind: 'audio' | 'video') => { setAsking(false); onStart(kind); };
  return (
    <>
      <RoundButton label="ზარი" onClick={() => (canVideo ? setAsking(true) : go('audio'))}><Phone aria-hidden="true" /></RoundButton>
      <Sheet open={asking} onClose={() => setAsking(false)} title="როგორი ზარი?">
        <Rows>
          <Row lead={<Dot icon={<Phone />} />} title="ხმოვანი ზარი" onClick={() => go('audio')} />
          <Row lead={<Dot icon={<Video />} />} title="ვიდეოზარი" onClick={() => go('video')} />
        </Rows>
      </Sheet>
    </>
  );
};

/** The head of an open chat: the round „უკან“ (only where the chat takes the whole page), the name, a grey line, the call. */
export const ChatHead: React.FC<{
  title: string; sub: string; onBack: () => void; wide: boolean; right?: React.ReactNode; onOpen?: () => void;
}> = ({ title, sub, onBack, wide, right, onOpen }) => (
  <div className="px-3.5">
    <TopBar
      title={onOpen
        ? <Press onClick={onOpen} className={cx('max-w-full cursor-pointer truncate text-left font-bold')}>{title}</Press>
        : title}
      sub={sub}
      onBack={wide ? undefined : onBack}
      right={right}
    />
  </div>
);

/** One open private chat (the old DirectChat of pages/DirectChatPage.tsx, the same rules): a teacher and their student, two
 *  classmates, or a member and the administration. The superadmin may open anyone's, read only. */
export const DmChat: React.FC<{ id: string; classes: SchoolClass[]; wide: boolean; onBack: () => void }> = ({ id, classes, wide, onBack }) => {
  const { user, isAdmin } = useAuth();
  const { openStudent } = useNavigation();
  const { thread, loading: threadLoading } = useThread(user ? id : null);
  const { messages, loading, error } = useChat(thread ? dmBase(thread.id) : null);
  const uid = user?.uid || '';
  const staff = !!thread && isAdmin && isStaffSide(thread, uid);
  const member = !!thread && thread.members.includes(uid);
  const canWrite = member || staff;
  const livePeers = useLivePeers(thread && canWrite ? dmBase(thread.id) : null);
  const [pinning, setPinning] = useState(false);

  useEffect(() => {
    if (thread && canWrite && isUnread(thread, uid)) markRead(thread, uid).catch(e => console.warn('dm: ', e?.code || e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread?.id, thread?.lastAt?.getTime(), canWrite]);

  if (!user) return null;
  if (!thread) {
    return (
      <section className="flex h-full min-h-[320px] flex-col rounded-card bg-surf">
        <ChatHead title="" sub="" onBack={onBack} wide={wide} />
        <div className="flex flex-1 items-center justify-center text-body text-mut">
          {threadLoading ? <Waiting field={false} rows={4} quiet className="px-3" /> : 'ჩათი ვერ მოიძებნა.'}
        </div>
      </section>
    );
  }

  const cls = classes.find(c => c.id === thread.classId);
  const iTeach = thread.kind === 'teach' && thread.teacherUid === uid;
  const other = otherOf(thread, uid);
  const myName = thread.names[uid] || user.displayName || '';
  const author: ChatAuthor = { uid, name: myName, photoURL: thread.photos[uid] || user.photoURL || '', teacher: iTeach || staff };

  const pair = thread.members.map(m => thread.names[m] || '').filter(Boolean).join(' — ');
  const title = canWrite ? other.name || 'უსახელო' : thread.kind === 'admin' ? `${ADMIN_NAME} — ${pair}` : pair;
  // the board's grey line is the class; without one, how the person is linked to me
  const sub = !canWrite ? 'მხოლოდ სანახავად'
    : staff ? 'ადმინისტრაციის ჩათი'
    : cls ? cls.name
    : thread.kind === 'admin' ? 'სკოლის ადმინისტრაცია'
    : thread.kind === 'peer' ? 'კლასელი'
    : iTeach ? 'მოსწავლე' : 'მასწავლებელი';

  const canStart = mayStartChatCall(thread, uid);
  const joinCall = () => answerChatCall(thread, user);

  const student = thread.kind === 'teach' ? thread.studentUid : thread.kind === 'admin' ? thread.members[0] : '';
  const canPin = canWrite && (iTeach || staff) && !!student;
  const pinClasses = iTeach ? classes.filter(c => c.teacherIds.includes(uid)) : classes;

  return (
    <ChatPanel
      base={dmBase(thread.id)}
      author={author}
      messages={messages}
      loading={loading}
      error={error}
      fill
      readOnly={!canWrite}
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
      onSent={(kind, text) => noteSent(thread, uid, kind === 'voice' ? VOICE_PREVIEW : text).catch(e => console.warn('dm: ', e?.code || e))}
      header={
        <>
          <ChatHead
            title={title}
            sub={sub}
            onBack={onBack}
            wide={wide}
            onOpen={canPin ? () => openStudent(student, thread.classId || '') : undefined}
            right={canWrite ? (
              <CallButton
                base={dmBase(thread.id)}
                canStart={canStart}
                canVideo
                onStart={kind => startChatCall(thread, user, kind)}
                onJoin={joinCall}
              />
            ) : undefined}
          />
          {canPin && (
            <PinSheet open={pinning} onClose={() => setPinning(false)} inClass={false} classes={pinClasses}
              people={[{ uid: student, name: thread.names[student] || other.name || 'მოსწავლე', photoURL: thread.photos[student] || '' }]}
              onSend={async p => {
                await sendDmPin(dmBase(thread.id), author, p);
                noteSent(thread, uid, pinPreview(p)).catch(e => console.warn('dm: ', e?.code || e));
              }} />
          )}
        </>
      }
    />
  );
};
