import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Mic, Paperclip, Send, Square, X, Trash2, Play, Pause, Loader2, Clock, Phone, CheckCheck } from 'lucide-react';
import {
  sendTextMessage, sendVoiceMessage, deleteMessage, loadVoiceUrl, ChatMessage, ChatAuthor,
} from '../../hooks/useClassChat';
import {
  startVoiceRecording, voiceRecordingSupported, VOICE_MAX_SECONDS, WAVE_BARS, VoiceRecording, VoiceTake,
} from '../../utils/voiceRecorder';
import { triggerHaptic } from '../../utils/haptics';
import { askConfirm } from '../ui/kit';
import { MONTHS_GE } from '../../utils/dateNames';
import { ROOM_GAME_INFO, parseChatRoomRef } from '../../data/roomGames';
import { ROOM_GAME_ICON } from '../games/roomGameIcons';
import { DrawRiddle } from './DrawRiddle';
import { Button, RoundButton } from '../ui2';

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
export const dayLabel = (d: Date) => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'დღეს';
  if (d.toDateString() === yesterday.toDateString()) return 'გუშინ';
  return `${d.getDate()} ${MONTHS_GE[d.getMonth()]}${d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : ''}`;
};

// links in a message (e.g. a lesson's call link) open in a new tab
const URL_RE = /(https?:\/\/[^\s]+)/g;
const Linkified: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(URL_RE).map((part, i) =>
      i % 2 ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline break-all" onClick={e => e.stopPropagation()}>{part}</a> : part
    )}
  </>
);

// iOS only lets an <audio> play from a tap; playing this silence first, inside the tap,
// unlocks the element so the real message can start once it has downloaded
const SILENCE = 'data:audio/mpeg;base64,//NAxAAAAANIAAAAAExBTUUDAAkIAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/80LEAAAAA0gAAAAATEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';

// only one voice message plays at a time
let nowPlaying: HTMLAudioElement | null = null;

const VoicePlayer: React.FC<{ seconds: number; wave: string; getUrl: () => Promise<string>; onDark?: boolean; meta?: React.ReactNode }> = ({ seconds, wave, getUrl, onDark, meta }) => {
  const audio = useRef<HTMLAudioElement | null>(null);
  const ready = useRef(false);
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'paused' | 'error'>('idle');
  const [pos, setPos] = useState(0);

  useEffect(() => () => { audio.current?.pause(); }, []);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    let a = audio.current;
    if (a && ready.current) {
      if (!a.paused) { a.pause(); return; }
      if (nowPlaying && nowPlaying !== a) nowPlaying.pause();
      nowPlaying = a;
      a.play().catch(() => setState('error'));
      return;
    }
    if (state === 'loading') return;
    if (!a) {
      a = new Audio(SILENCE);
      a.play().catch(() => {});
      audio.current = a;
    }
    setState('loading');
    try {
      const url = await getUrl();
      a.pause();
      a.ontimeupdate = () => setPos(a!.currentTime);
      a.onplay = () => setState('playing');
      a.onpause = () => setState(s => (s === 'playing' ? 'paused' : s));
      a.onended = () => { setState('idle'); setPos(0); };
      a.src = url;
      ready.current = true;
      if (nowPlaying && nowPlaying !== a) nowPlaying.pause();
      nowPlaying = a;
      await a.play();
    } catch (err) {
      console.warn('voice: ', err);
      setState('error');
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const a = audio.current;
    if (!a || !ready.current || !seconds) return;
    const r = e.currentTarget.getBoundingClientRect();
    a.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * seconds;
    setPos(a.currentTime);
  };

  const levels = (wave.length === WAVE_BARS ? wave : '4'.repeat(WAVE_BARS)).split('').map(Number);
  const done = seconds ? pos / seconds : 0;
  const active = state === 'playing' || state === 'paused';

  return (
    <div className="flex items-center gap-2.5 w-[232px] max-w-full" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        onClick={toggle}
        aria-label={state === 'playing' ? 'პაუზა' : 'მოსმენა'}
        className={`size-tap shrink-0 rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition ${
          onDark ? 'bg-surf text-wine' : 'bg-wine text-white'
        }`}
      >
        {state === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" />
          : state === 'playing' ? <Pause className="w-5 h-5" fill="currentColor" />
          : <Play className="w-5 h-5 translate-x-px" fill="currentColor" />}
      </button>
      <div className="flex-1 min-w-0">
        <div onClick={seek} className="h-7 flex items-center gap-[2px] cursor-pointer" aria-hidden="true">
          {levels.map((v, i) => (
            <span
              key={i}
              className={`flex-1 rounded-full ${
                (i + 0.5) / levels.length <= done
                  ? (onDark ? 'bg-white' : 'bg-wine')
                  : (onDark ? 'bg-white/40' : 'bg-wine/25')
              }`}
              style={{ height: `${18 + v * 9}%` }}
            />
          ))}
        </div>
        <p className={`flex justify-between items-center gap-2 text-cap tabular-nums leading-none mt-0.5 ${onDark ? 'text-white/80' : 'text-mut'}`}>
          <span>{state === 'error' ? 'ვერ ჩაიტვირთა' : active ? `${clock(pos)} / ${clock(seconds)}` : clock(seconds)}</span>
          {meta}
        </p>
      </div>
    </div>
  );
};

// when a message was sent, or a clock while it is still on its way
/** a game invitation's line: the room's game (an old card names only its room: „სამშვილდის ღამე“) */
const GameCardTitle: React.FC<{ room?: string; mine: boolean }> = ({ room, mine }) => {
  const game = parseChatRoomRef(room ?? '')?.game ?? 'samshvilde';
  const Ic = ROOM_GAME_ICON[game];
  return (
    <p className="flex items-center gap-2 font-semibold text-body">
      <Ic className={`w-5 h-5 shrink-0 ${mine ? 'text-white' : 'text-wine'}`} /> „{ROOM_GAME_INFO[game].title}“ — ონლაინ თამაში
    </p>
  );
};

/** an invitation into a game room leads in this long */
const GAME_INVITE_MS = 3 * 3600_000;

export const sentAt = (m: ChatMessage) => (
  <span className="inline-flex items-center tabular-nums">{m.pending ? <Clock className="w-3 h-3" /> : m.at && hhmm(m.at)}</span>
);

export const Avatar: React.FC<{ name: string; photoURL?: string; className?: string }> = ({ name, photoURL, className = 'w-8 h-8 text-sm' }) =>
  photoURL ? (
    <img src={photoURL} alt="" className={`${className} shrink-0 rounded-full object-cover`} referrerPolicy="no-referrer" />
  ) : (
    <span className={`${className} shrink-0 rounded-full bg-soft text-ink font-bold flex items-center justify-center`}>
      {name.charAt(0) || '?'}
    </span>
  );

type Mode =
  | { k: 'idle' }
  | { k: 'recording'; started: number }
  | { k: 'encoding' }
  | { k: 'preview'; take: VoiceTake; url: string }
  | { k: 'sending' };

export interface ChatPanelProps {
  /** where the chat lives: classes/{id} or dms/{id} */
  base: string;
  author: ChatAuthor;
  messages: ChatMessage[];
  loading: boolean;
  error: boolean;
  /** the bar above the messages */
  header: React.ReactNode;
  /** messages shown as a call card with a button into the call (a private chat's calls) */
  isCall?: (m: ChatMessage) => boolean;
  callTitle?: string;
  onJoinCall?: () => void;
  /** the call is still on (otherwise its card is only a note, without the button) */
  callLive?: boolean;
  /** a class's chat: an invitation into a game room leads into it (for a few hours) */
  onOpenGame?: (m: ChatMessage) => void;
  canDelete: (m: ChatMessage) => boolean;
  /** a class: avatars and names over the others' messages; a private chat has only two people (or: whose messages) */
  showNames?: boolean | ((m: ChatMessage) => boolean);
  /** the other person last opened this chat (a private chat): "ნანახია" under my last message */
  seenAt?: Date | null;
  onSent?: (kind: 'text' | 'voice', text: string) => void;
  /** height of the message list */
  listClassName?: string;
  /** someone else's chat, shown to the superadmin: messages only, no writing */
  readOnly?: boolean;
  /** the badge beside a teacher's (or an admin's) name when names are shown */
  staffLabel?: string;
  /** fill the parent's height (the messages page); the list takes what the header and the field leave */
  fill?: boolean;
  /** at the list's top or bottom a swipe goes on to the page (the class page, where the chat sits in a page that scrolls) */
  chain?: boolean;
  /** over the messages, inside the list (the class page's way to the earlier ones) */
  listTop?: React.ReactNode;
  /** a message drawn as a card of its own instead of a bubble (a teacher's card for one member); null = a bubble */
  renderCard?: (m: ChatMessage, mine: boolean) => React.ReactNode | null;
  /** a teacher's (an admin's) 📎 beside the field: a comment or an assignment for one member */
  onAttach?: () => void;
  /** how a message is deleted, when not among the chat's own messages (a class's pins) */
  onDelete?: (m: ChatMessage) => Promise<void>;
  /** a teacher's (an admin's) tap on a member's photo or name: their own page (null = not a member's message) */
  personOpener?: (m: ChatMessage) => (() => void) | null;
}

/** A computer's quiet 🗑 beside a message one may delete; it shows when the pointer is over the message. */
const HoverDelete: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button type="button" onClick={onClick} aria-label="შეტყობინების წაშლა" title="წაშლა"
    className="self-center w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-faint hover:text-danger hover:bg-soft opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition cursor-pointer [@media(hover:none)]:hidden">
    <Trash2 className="w-4 h-4" />
  </button>
);

/** the default of `isCall`: one function for every render, so the drawn messages are kept (see listBody) */
const NEVER = () => false;

/** the first name of a sender, as the line above a run of messages shows it */
const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

// A chat: text and voice messages (a class's chat, or a teacher's private chat with a student).
export const ChatPanel: React.FC<ChatPanelProps> = ({
  base, author, messages, loading, error, header, isCall = NEVER, callTitle, onJoinCall, callLive = true, onOpenGame, canDelete,
  showNames = false, seenAt = null, onSent, listClassName = 'h-[56vh] min-h-[300px] max-h-[560px]', readOnly = false,
  staffLabel = 'მასწავლებელი', fill = false, chain = false, listTop, renderCard, onAttach, onDelete, personOpener,
}) => {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<Mode>({ k: 'idle' });
  const [elapsed, setElapsed] = useState(0);
  const [err, setErr] = useState('');
  const [active, setActive] = useState<string | null>(null);
  // a long press (half a second, the finger kept still) or a right click picks a message; a tap on the picked one lets
  // it go; a press on its play button or a link does not count
  const hold = useRef<number | null>(null);
  const stopHold = () => { if (hold.current) window.clearTimeout(hold.current); hold.current = null; };
  const holdToPick = (id: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse' || (e.target as HTMLElement).closest('button, a, input')) return;
      stopHold();
      hold.current = window.setTimeout(() => { hold.current = null; triggerHaptic(20); setActive(id); }, 500);
    },
    onPointerUp: stopHold,
    onPointerLeave: stopHold,
    onPointerCancel: stopHold,
    onContextMenu: (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('a, input')) return;
      e.preventDefault();
      stopHold();
      setActive(id);
    },
    onClick: (e: React.MouseEvent) => {
      if (active === id && !(e.target as HTMLElement).closest('button, a')) setActive(null);
    },
  });
  const rec = useRef<VoiceRecording | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const field = useRef<HTMLTextAreaElement>(null);
  const canRecord = voiceRecordingSupported();

  // keep the newest message in view while the reader is at the bottom, and after one's own message
  // (scrolls the chat box only, never the page)
  useLayoutEffect(() => {
    const el = list.current;
    const last = messages[messages.length - 1];
    if (el && (stick.current || (last?.uid === author.uid && last.pending))) el.scrollTop = el.scrollHeight;
  }, [messages.length, loading]);

  // recording clock; stops by itself at the length limit
  useEffect(() => {
    if (mode.k !== 'recording') return;
    const t = setInterval(() => {
      const s = (Date.now() - mode.started) / 1000;
      setElapsed(s);
      if (s >= VOICE_MAX_SECONDS) finishRecording();
    }, 250);
    return () => clearInterval(t);
  }, [mode]);

  useEffect(() => () => { rec.current?.cancel(); }, []);

  const sendText = async () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    setErr('');
    stick.current = true;
    if (field.current) field.current.style.height = '';
    try {
      await sendTextMessage(base, author, t);
      onSent?.('text', t);
    } catch (e) {
      console.warn('chat: ', e);
      setErr('შეტყობინება ვერ გაიგზავნა. სცადეთ თავიდან.');
      setText(t);
    }
  };

  const startRecording = async () => {
    setErr('');
    try {
      rec.current = await startVoiceRecording();
      setElapsed(0);
      setMode({ k: 'recording', started: Date.now() });
      triggerHaptic(20);
    } catch (e: any) {
      setErr(e?.name === 'NotAllowedError'
        ? 'მიკროფონზე წვდომა არ არის. ნება დართეთ ბრაუზერის პარამეტრებში.'
        : 'მიკროფონი ვერ ჩაირთო.');
    }
  };

  function finishRecording() {
    const r = rec.current;
    rec.current = null;
    if (!r) return;
    setMode({ k: 'encoding' });
    r.stop().then(
      take => {
        if (take.seconds < 0.7) { setErr('ჩანაწერი ძალიან მოკლეა.'); setMode({ k: 'idle' }); return; }
        setMode({ k: 'preview', take, url: URL.createObjectURL(take.mp3) });
      },
      e => { console.warn('voice: ', e); setErr('ჩანაწერი ვერ დამუშავდა.'); setMode({ k: 'idle' }); }
    );
  }

  const cancelRecording = () => {
    rec.current?.cancel();
    rec.current = null;
    setMode({ k: 'idle' });
  };

  const discardTake = () => {
    if (mode.k === 'preview') URL.revokeObjectURL(mode.url);
    setMode({ k: 'idle' });
  };

  const sendTake = async () => {
    if (mode.k !== 'preview') return;
    const { take, url } = mode;
    setMode({ k: 'sending' });
    setErr('');
    stick.current = true;
    try {
      await sendVoiceMessage(base, author, take);
      onSent?.('voice', '');
      URL.revokeObjectURL(url);
      setMode({ k: 'idle' });
      triggerHaptic(20);
    } catch (e) {
      console.warn('voice: ', e);
      setErr('ხმოვანი შეტყობინება ვერ გაიგზავნა. სცადეთ თავიდან.');
      setMode({ k: 'preview', take, url });
    }
  };

  // a computer's 🗑 beside the message (shown on hover) asks first; a phone's „წაშლა“ under it was already a second tap
  const askRemove = async (m: ChatMessage) => {
    if (await askConfirm({ title: 'წავშალო შეტყობინება?', ok: 'წაშლა', danger: true })) remove(m);
  };

  const remove = async (m: ChatMessage) => {
    setActive(null);
    try {
      await (onDelete ? onDelete(m) : deleteMessage(base, m));
    } catch (e) {
      console.warn('chat: ', e);
      setErr('შეტყობინება ვერ წაიშალა.');
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends on a computer; on a phone it makes a new line and the button sends
    if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(pointer: fine)').matches) {
      e.preventDefault();
      sendText();
    }
  };

  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = '';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  };

  // only the newest call card leads into the call
  const lastCallId = [...messages].reverse().find(m => isCall(m))?.id;

  // my newest message gets "ნანახია" once the other person has opened the chat after it
  const lastMine = [...messages].reverse().find(m => m.uid === author.uid);
  const seenId = seenAt && lastMine?.at && !lastMine.pending && seenAt >= lastMine.at ? lastMine.id : null;

  
  // The messages are drawn apart from the field: typing, the recording clock or a voice message playing elsewhere
  // no longer redraw every message (with 150 of them a phone stuttered at each letter — 2026-11-05).
  const listBody = useMemo(() => (loading ? (
      <div className="h-full flex items-center justify-center text-faint"><Loader2 className="w-6 h-6 animate-spin" /></div>
    ) : error ? (
      <p className="h-full flex items-center justify-center text-center text-body text-mut px-6">ჩათი ახლა ვერ ჩაიტვირთა.</p>
    ) : messages.length === 0 ? (
      <div className="h-full flex flex-col items-center justify-center text-center gap-2 px-6 text-mut">
        <MessageCircle className="w-9 h-9 text-dim" />
        <p className="text-body">ჯერ შეტყობინება არ არის.</p>
      </div>
    ) : (
      <>
      {listTop}
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const mine = m.uid === author.uid;
        const newDay = !!m.at && (!prev?.at || prev.at.toDateString() !== m.at.toDateString());
        const first = newDay || prev?.uid !== m.uid || (!!prev && isCall(prev) !== isCall(m));
        const canDel = !readOnly && canDelete(m);
        const named = typeof showNames === 'function' ? showNames(m) : showNames;
        const card = renderCard?.(m, mine) ?? null;
        const openPerson = named && !mine && first ? personOpener?.(m) ?? null : null;
        const dayLine = newDay && (
          <p className="my-3 text-center text-cap font-bold text-mut">{dayLabel(m.at!)}</p>
        );
        const removeBtn = active === m.id && (
          <button
            type="button"
            onClick={() => remove(m)}
            className="mt-1.5 h-icon px-3.5 rounded-full bg-surf shadow-lift text-meta font-semibold text-danger inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Trash2 className="w-4 h-4" /> წაშლა
          </button>
        );
        // a call in a private chat: a quiet line in the middle; the newest live one leads into the call
        if (isCall(m)) {
          const live = callLive && m.id === lastCallId;
          return (
            <React.Fragment key={m.id}>
              {dayLine}
              <div className="mt-2 flex flex-col items-center">
                <div
                  {...(canDel ? holdToPick(m.id) : {})}
                  className={`${live ? 'w-full max-w-[360px] rounded-card bg-tint px-4 py-3 flex items-center gap-3' : 'inline-flex max-w-full items-center gap-2 rounded-full bg-soft px-3.5 py-2 text-meta text-mut'} ${canDel ? '[-webkit-touch-callout:none]' : ''}`}
                >
                  <Phone className={`size-[18px] shrink-0 ${live ? 'text-wine' : ''}`} aria-hidden="true" />
                  {live ? (
                    <>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-lead font-bold text-ink">{callTitle}</span>
                        <span className="block text-meta text-mut">{sentAt(m)}</span>
                      </span>
                      <Button size="md" onClick={() => onJoinCall?.()}>შესვლა ზარში</Button>
                    </>
                  ) : (
                    <span className="min-w-0 truncate">{callTitle} · {sentAt(m)}</span>
                  )}
                </div>
                {removeBtn}
              </div>
            </React.Fragment>
          );
        }
        const stamp = `text-cap leading-none ${mine ? 'text-white/80' : 'text-mut'}`;
        return (
          <React.Fragment key={m.id}>
            {dayLine}
            <div className={`group flex items-end gap-1 ${mine ? 'justify-end' : 'justify-start'} ${first ? 'mt-3' : 'mt-1'}`}>
              {mine && canDel && <HoverDelete onClick={() => askRemove(m)} />}
              <div className={`${card ? 'w-[88%] max-w-[360px]' : 'max-w-[82%]'} flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                {named && first && !mine && (
                  <p className="text-cap font-bold text-mut mb-1 px-1 flex items-center gap-1.5">
                    {openPerson
                      ? <button type="button" onClick={openPerson} aria-label={`${m.name} — გზა და პროფილი`} className="cursor-pointer hover:underline underline-offset-2">{m.teacher ? staffLabel : firstName(m.name)}</button>
                      : (m.teacher ? staffLabel : firstName(m.name))}
                  </p>
                )}
                {card ? (
                  <div {...(canDel ? holdToPick(m.id) : {})} className={`w-full ${canDel ? '[-webkit-touch-callout:none]' : ''}`}>{card}</div>
                ) : (
                <div
                  // a long press on the message (as in any messenger; a right click on a computer) shows „წაშლა“ under
                  // it; a plain tap does nothing, so playing a voice message or opening a link never shows it
                  {...(canDel ? holdToPick(m.id) : {})}
                  className={`rounded-tile px-3.5 py-2 ${canDel ? '[-webkit-touch-callout:none]' : ''} ${
                    mine
                      ? `bg-wine text-white ${first ? 'rounded-tr-chip' : ''}`
                      : `bg-surf text-ink ${first ? 'rounded-tl-chip' : ''}`
                  }`}
                >
                  {m.kind === 'game' ? (
                    <div className="py-1 flex flex-col gap-2.5">
                      <GameCardTitle room={m.room} mine={mine} />
                      <div className="flex items-center justify-between gap-4">
                        {onOpenGame && m.room && m.at && Date.now() - m.at.getTime() < GAME_INVITE_MS ? (
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); triggerHaptic(10); onOpenGame(m); }}
                            className={`h-icon px-4 rounded-full text-meta font-bold cursor-pointer active:scale-95 transition ${
                              mine ? 'bg-surf text-wine' : 'bg-wine text-white'
                            }`}
                          >
                            {mine ? 'ოთახში დაბრუნება' : 'შესვლა'}
                          </button>
                        ) : <span className={`text-cap ${mine ? 'text-white/80' : 'text-mut'}`}>თამაში დასრულდა</span>}
                        <span className={stamp}>{sentAt(m)}</span>
                      </div>
                    </div>
                  ) : m.kind === 'draw' ? (
                    <DrawRiddle
                      m={m}
                      mine={mine}
                      meta={<p className={`flex justify-end ${stamp}`}>{sentAt(m)}</p>}
                    />
                  ) : m.kind === 'voice' ? (
                    <div className="py-1">
                      <VoicePlayer seconds={m.seconds} wave={m.wave} onDark={mine} getUrl={() => loadVoiceUrl(base, m)} meta={sentAt(m)} />
                    </div>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap break-words text-body"><Linkified text={m.text} /></p>
                      <p className={`flex justify-end mt-1 ${stamp}`}>{sentAt(m)}</p>
                    </>
                  )}
                </div>
                )}
                {seenId === m.id && (
                  <p className="mt-1 px-1 flex items-center gap-1 text-cap font-semibold text-mut">
                    <CheckCheck className="w-3.5 h-3.5 text-wine" /> ნანახია
                  </p>
                )}
                {removeBtn}
              </div>
              {!mine && canDel && <HoverDelete onClick={() => askRemove(m)} />}
            </div>
          </React.Fragment>
        );
      })}
      </>
  )), [messages, loading, error, listTop, active, seenId, lastCallId, callLive, callTitle, readOnly, showNames, staffLabel,
    author.uid, base, isCall, canDelete, renderCard, personOpener, onOpenGame, onJoinCall, onDelete]); // eslint-disable-line react-hooks/exhaustive-deps

  const pill = 'min-h-tap-lg rounded-full bg-surf flex items-center';

  return (
    <section className={`bg-page text-ink ${fill ? 'h-full flex flex-col' : 'rounded-card overflow-hidden'}`}>
      {header}

      <div
        ref={list}
        onScroll={e => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className={`${fill ? 'flex-1 min-h-0' : listClassName} overflow-y-auto ${chain ? '' : 'overscroll-contain'} px-3 sm:px-5 py-3 bg-page`}
      >
        {listBody}
      </div>

      {err && <p className="px-5 pt-3 text-meta text-danger">{err}</p>}

      {readOnly ? (
        <p className="px-5 py-4 text-center text-meta text-mut">მხოლოდ სანახავად</p>
      ) : (
      <div className="p-3 sm:px-4 flex items-end gap-2">
        {mode.k === 'idle' && (
          <>
            {onAttach && (
              <RoundButton size={48} label="მოსწავლისთვის კომენტარი ან დავალება" onClick={onAttach}>
                <Paperclip />
              </RoundButton>
            )}
            <textarea
              ref={field}
              rows={1}
              value={text}
              onChange={e => { setText(e.target.value); grow(e.target); }}
              onKeyDown={onKeyDown}
              maxLength={2000}
              placeholder="შეტყობინება"
              aria-label="შეტყობინება"
              className="flex-1 min-w-0 resize-none rounded-full bg-surf px-4 py-3 min-h-tap-lg text-lead text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-wine/35"
            />
            {text.trim() || !canRecord ? (
              <RoundButton size={48} tone="wine" label="გაგზავნა" onClick={sendText} disabled={!text.trim()}><Send /></RoundButton>
            ) : (
              <RoundButton size={48} tone="wine" label="ხმოვანი შეტყობინების ჩაწერა" onClick={startRecording}><Mic /></RoundButton>
            )}
          </>
        )}

        {mode.k === 'recording' && (
          <>
            <RoundButton size={48} label="გაუქმება" onClick={cancelRecording}><X /></RoundButton>
            <div className={`${pill} flex-1 min-w-0 gap-2.5 px-4`}>
              <span className="size-2.5 shrink-0 rounded-full bg-danger animate-pulse" />
              <span className="font-semibold tabular-nums text-wine whitespace-nowrap">{clock(elapsed)} <span className="font-medium text-mut">/ {clock(VOICE_MAX_SECONDS)}</span></span>
              <span className="text-meta text-mut truncate">იწერება…</span>
            </div>
            <RoundButton size={48} tone="wine" label="დასრულება" onClick={finishRecording}><Square fill="currentColor" /></RoundButton>
          </>
        )}

        {(mode.k === 'encoding' || mode.k === 'sending') && (
          <div className={`${pill} flex-1 justify-center gap-2 text-meta text-mut`}>
            <Loader2 className="w-4 h-4 animate-spin" /> {mode.k === 'encoding' ? 'მზადდება…' : 'იგზავნება…'}
          </div>
        )}

        {mode.k === 'preview' && (
          <>
            <RoundButton size={48} label="წაშლა" onClick={discardTake} className="text-danger"><Trash2 /></RoundButton>
            <div className={`${pill} flex-1 min-w-0 px-1`}>
              <VoicePlayer seconds={mode.take.seconds} wave={mode.take.wave} getUrl={() => Promise.resolve(mode.url)} />
            </div>
            <RoundButton size={48} tone="wine" label="გაგზავნა" onClick={sendTake}><Send /></RoundButton>
          </>
        )}
      </div>
      )}
    </section>
  );
};
