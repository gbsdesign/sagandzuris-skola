import React, { useEffect, useState } from 'react';
import { Phone, Video } from 'lucide-react';
import { Waiting } from '../../../components/shell/PageSkeleton';
import { useAuth, useNavigation } from '../../../context';
import { useChat, type ChatAuthor } from '../../../hooks/useClassChat';
import type { SchoolClass } from '../../../hooks/useClasses';
import {
  useThread, dmBase, otherOf, isUnread, isStaffSide, seenByOther, markRead, noteSent, ADMIN_NAME, ADMIN_SHOWN,
} from '../../../hooks/useDirectChat';
import { useCall, useLivePeers, setCallSmall } from '../../../utils/callSession';
import { startChatCall, answerChatCall, mayStartChatCall } from '../../../components/calls/callActions';
import { ChatPanel } from '../../../components/classes/ChatPanel';
import type { CatalogEntry } from '../../../utils/pathItems';
import { ChatPath, PathSigns } from './ChatPath';
import { GearSpark } from '../damkhmare/GearSpark';
import { openAssistant, useAssistantAllowed } from '../damkhmare/open';
import { PinCard } from '../../../components/classes/PinCard';
import { PinSheet } from '../../../components/classes/PinSheet';
import { pinPreview, sendDmPin } from '../../../hooks/useChatPins';
import { Press, RoundButton, Row, Rows, Sheet, TopBar, Dot, cx } from '../../../components/ui2';
import { kaName } from '../../../utils/georgianName';

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
  /** a small word over the name („მასწავლებელი“) */
  kicker?: string;
}> = ({ title, sub, onBack, wide, right, onOpen, kicker }) => (
  <div className="px-3.5">
    <TopBar
      // the name and the small line each on one line (2026-11-22, the user: „სახელი მინდა სიგრძეზე ეწეროს“)
      title={<>
        {kicker && <span className="block truncate text-cap font-semibold text-wine">{kicker}</span>}
        {onOpen
          ? <Press onClick={onOpen} className={cx('block max-w-full cursor-pointer truncate text-left text-lead font-bold')}>{title}</Press>
          : <span className="block truncate text-lead">{title}</span>}
      </>}
      sub={<span className="block truncate">{sub}</span>}
      onBack={wide ? undefined : onBack}
      right={right}
      small
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
  // an old classmates' chat only shows (closed 2026-11-21)
  const member = !!thread && thread.kind !== 'peer' && thread.members.includes(uid);
  const canWrite = member || staff;
  const livePeers = useLivePeers(thread && canWrite ? dmBase(thread.id) : null);
  const [pinning, setPinning] = useState(false);
  // „დავალებად მიცემა“ from the path's fold: the 📎 window already on that chant
  const [preset, setPreset] = useState<CatalogEntry | null>(null);
  // the chat whose path is dropped under the head (the head's „გზა“; another chat opens folded)
  const [pathOpenIn, setPathOpenIn] = useState('');
  // the program's cog after the field's microphone, as in a class chat (2026-11-22, the user's mark „აი აქ“) — teachers and admins
  const assistantOn = useAssistantAllowed();

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
  const myName = thread.names[uid] || kaName(user.displayName) || '';
  const author: ChatAuthor = { uid, name: myName, photoURL: thread.photos[uid] || user.photoURL || '', teacher: iTeach || staff };

  const pair = thread.members.map(m => thread.names[m] || '').filter(Boolean).join(' — ');
  // the member's side of the administration's chat: the founder's name (`ADMIN_SHOWN`, 2026-11-24); each staff message still
  // names its writer
  const title = canWrite
    ? (thread.kind === 'admin' && !staff ? ADMIN_SHOWN : thread.kind === 'teach' && thread.teacherUid !== uid ? 'სასწავლო ჩათი' : other.name || 'უსახელო')
    : thread.kind === 'admin' ? `${ADMIN_NAME} — ${pair}` : pair;
  // the student's side of a teacher's chat: „მასწავლებელი“ over the name, „სასწავლო ჩათი“ under it; an admin's name has „ადმინი“
  // under it (2026-11-24, the user: „მაღლა მასწავლებელი დააწერე დაბლა კი სასწავლო ჩათი … ყველას ადმინი ეწეროს დაბლა სახელის ქვეშ“)
  const toTeacher = canWrite && thread.kind === 'teach' && !iTeach;
  // inside, only „სასწავლო ჩათი“ (the same evening: „შიგნით მხოლოდ სასწავლო ჩათი“)
  const kicker = undefined;
  const sub = !canWrite ? 'მხოლოდ სანახავად'
    : staff ? 'სკოლის ჩათი'
    : thread.kind === 'admin' ? 'ადმინი'
    : toTeacher ? ''
    : cls ? cls.name
    : thread.kind === 'peer' ? 'კლასელი'
    : 'მოსწავლე';

  const canStart = mayStartChatCall(thread, uid);
  const joinCall = () => answerChatCall(thread, user);

  const student = thread.kind === 'teach' ? thread.studentUid : thread.kind === 'admin' ? thread.members[0] : '';
  const canPin = canWrite && (iTeach || staff) && !!student;
  const pinClasses = iTeach ? classes.filter(c => c.teacherIds.includes(uid)) : classes;
  // „რა ისწავლა · რას სწავლობს“ over the messages: the teacher's (the administration's) side changes it, the student sees their own
  const self = !!student && student === uid && (thread.kind === 'teach' || thread.kind === 'admin');
  const pathFold = canWrite && (canPin || self);
  const pathOpen = pathFold && pathOpenIn === thread.id;

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
      showNames={!canWrite || (thread.kind === 'admin' && (m => !!m.teacher))}
      staffLabel={thread.kind === 'admin' ? 'ადმინი' : 'მასწავლებელი'}
      seenAt={canWrite ? seenByOther(thread, uid) : null}
      isCall={m => m.kind === 'call'}
      callTitle={thread.callKind === 'video' ? 'ვიდეოზარი' : 'ზარი'}
      onJoinCall={joinCall}
      callLive={livePeers.length > 0}
      onCallBack={canStart ? () => { void startChatCall(thread, user, thread.callKind); } : undefined}
      canDelete={m => m.uid === uid}
      renderCard={m => (m.kind === 'note' || m.kind === 'work' ? <PinCard m={m} forMe={m.to === uid} /> : null)}
      onAttach={canPin ? () => setPinning(true) : undefined}
      extraTool={canWrite && assistantOn
        ? { label: 'ავტომატური პროგრამა', icon: <GearSpark />, onClick: () => openAssistant({ classId: thread.classId || undefined, page: 'dm' }) }
        : undefined}
      onSent={(kind, text) => noteSent(thread, uid, kind === 'voice' ? (text ? `🎤 ${text}` : VOICE_PREVIEW) : text).catch(e => console.warn('dm: ', e?.code || e))}
      header={
        <>
          <ChatHead
            title={title}
            sub={sub}
            kicker={kicker}
            onBack={onBack}
            wide={wide}
            onOpen={canPin ? () => openStudent(student, thread.classId || '') : undefined}
            right={canWrite ? (
              <>
                {/* „გზა“ and „ავტ.პროგ.“ before the phone (2026-11-22, the user: „ყურმილის წინ ნიშნებად გადაიტანე“) */}
                {pathFold && <PathSigns open={pathOpen} onToggle={() => setPathOpenIn(pathOpen ? '' : thread.id)} />}
                <CallButton
                  base={dmBase(thread.id)}
                  canStart={canStart}
                  canVideo
                  onStart={kind => startChatCall(thread, user, kind)}
                  onJoin={joinCall}
                />
              </>
            ) : undefined}
          />
          {pathOpen && (
            <ChatPath
              key={student}
              student={student}
              studentName={thread.names[student] || (canPin ? other.name : '') || 'მოსწავლე'}
              editor={canPin}
              classId={thread.classId || ''}
              onAssign={canPin ? e => { setPreset(e); setPinning(true); } : undefined}
            />
          )}
          {canPin && (
            <PinSheet open={pinning} onClose={() => { setPinning(false); setPreset(null); }} inClass={false} classes={pinClasses} preset={preset}
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
