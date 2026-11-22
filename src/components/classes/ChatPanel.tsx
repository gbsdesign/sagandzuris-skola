import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useBackToClose } from '../../utils/backToClose';
import { useNotes } from '../../context/NotesContext';
import { MessageCircle, Music2, Mic, Paperclip, Send, Smile, Square, X, Trash2, Play, Pause, Loader2, Clock, Phone, CheckCheck, Plus, Camera, Image as ImageIcon, ChevronRight, ClipboardList, Pin, PinOff, Forward, ChevronDown } from 'lucide-react';
import { useLongPress } from '../../hooks/useLongPress';
import { FileBubble, PhotoBubble, QuickSheet, useQuickEmoji } from './ChatMedia';
import {
  sendTextMessage, sendVoiceMessage, sendPhotoMessage, sendFileMessage, FILE_MAX, deleteMessage, loadVoiceUrl, toggleHeart, ChatMessage, ChatAuthor,
  useTopPins, setTopPin, TOP_PINS_MAX, VOICE_TITLE_MAX,
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
import { Button, Press, RoundButton, Sheet } from '../ui2';

// a voice message sent on into other chats (lazy: it lists my classes and private chats only when opened)
const ForwardSheet = React.lazy(() => import('./ChatForward').then(m => ({ default: m.ForwardSheet })));

// Messenger's ways (2026-11-22, the user: „როგორც მესენჯერს აქვს … სმს-ებზე დაგულების ფუნქცია … ემოჯის გაგზავნის ფუნქცია“; answers
// „მხოლოდ გული ❤️ · დაჭერა + ორჯერ შეხება · პანელი + დიდი ❤️“): a ❤️ on a message (held long → „❤️“ under it, or two taps), the
// hearts' count under the bubble (a tap names who), an emoji panel from the field's 😊, one tap sends a big ❤️, and a message of
// one to three emoji is drawn big without its bubble
const EMOJIS = [
  '😀', '😂', '🥰', '😍', '😊', '😉', '😎', '🤗', '🥳', '😇', '🙂', '😅', '🤔', '😮', '😢', '😭',
  '😡', '👍', '👏', '🙏', '💪', '🙌', '👋', '🤝', '👌', '💯', '✅', '✨', '🔥', '🎉', '🎶', '🎵',
  '🎤', '❤️', '🧡', '💛', '💚', '💙', '💜', '🤍', '🌹', '🌸', '☀️', '🌙', '⭐', '🍇', '☕', '📖',
];
const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier}|\u200D\p{Extended_Pictographic}\uFE0F?)*\s*){1,3}$/u;
const emojiCount = (t: string) => (EMOJI_ONLY.test(t.trim()) ? [...t.trim().matchAll(/\p{Extended_Pictographic}/gu)].length : 0);
/** a message that is only emoji (1–3) is drawn big */
export const bigEmoji = (t: string) => {
  const n = emojiCount(t);
  return n === 1 ? 'text-[52px] leading-[1.1]' : n > 1 ? 'text-[40px] leading-[1.15]' : '';
};

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

// links in a message (e.g. a lesson's call link) open in a new tab; a chant's notes link of this site (a teacher's „გაგზავნა“ from
// the notes' „მეტი“, 2026-11-21) is a button that opens those notes here, in the app
const URL_RE = /(https?:\/\/[^\s]+)/g;
const notesVid = (link: string): string | null => {
  try {
    const u = new URL(link);
    const v = u.searchParams.get('v');
    return v && u.searchParams.get('c') && (u.origin === window.location.origin || /sagandzur/.test(u.hostname)) ? v : null;
  } catch { return null; }
};
const Linkified: React.FC<{ text: string; mine?: boolean }> = ({ text, mine }) => {
  const { openNotes } = useNotes();
  return (
    <>
      {text.split(URL_RE).map((part, i) => {
        if (!(i % 2)) return part;
        const vid = notesVid(part);
        if (vid) {
          return (
            <button
              key={i}
              type="button"
              onClick={e => { e.stopPropagation(); openNotes(vid, 'bookmark'); }}
              className={`mt-1 inline-flex min-h-tap cursor-pointer items-center gap-1.5 rounded-full px-4 font-bold transition active:scale-95 ${mine ? 'bg-surf text-wine' : 'bg-wine text-white'}`}
            >
              <Music2 aria-hidden="true" className="size-[18px]" />ნოტების გახსნა
            </button>
          );
        }
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline break-all" onClick={e => e.stopPropagation()}>{part}</a>;
      })}
    </>
  );
};

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

/** a call's length in words: „12 წუთი“, „40 წამი“, „1 საათი 5 წუთი“ */
export const callLength = (seconds: number) => {
  const s = Math.max(1, Math.round(seconds));
  if (s < 60) return `${s} წამი`;
  const min = Math.round(s / 60);
  return min < 60 ? `${min} წუთი` : `${Math.floor(min / 60)} საათი${min % 60 ? ` ${min % 60} წუთი` : ''}`;
};

/** the calls whose end is told: each call message without `end` closed by the first end message after it */
const closedCalls = (messages: ChatMessage[], isCall: (m: ChatMessage) => boolean) => {
  const out = new Set<string>();
  let open: string | null = null;
  for (const m of messages) {
    if (!isCall(m)) continue;
    if (!m.end) open = m.id;
    else if (open) { out.add(open); open = null; }
  }
  return out;
};

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
  /** „დაურეკე“ on a call the other side rang and nobody answered (board x-zari-chatshi) */
  onCallBack?: () => void;
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
  /** one more small sign after the microphone (the class chat's „ავტომატური პროგრამა“ cog for its leaders, 2026-11-22) */
  extraTool?: { label: string; icon: React.ReactNode; onClick: () => void };
  /** how a message is deleted, when not among the chat's own messages (a class's pins) */
  onDelete?: (m: ChatMessage) => Promise<void>;
  /** a teacher's (an admin's) tap on a member's photo or name: their own page (null = not a member's message) */
  personOpener?: (m: ChatMessage) => (() => void) | null;
  /** may pin messages on top of the chat (2026-11-22: a class's teachers and admins; either side of a private chat) */
  canPin?: boolean;
}

/** A computer's quiet 🗑 beside a message one may delete; it shows when the pointer is over the message. */
const HoverDelete: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button type="button" onClick={onClick} aria-label="შეტყობინების წაშლა" title="წაშლა"
    className="self-center w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-faint hover:text-danger hover:bg-soft opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition cursor-pointer [@media(hover:none)]:hidden">
    <Trash2 className="w-4 h-4" />
  </button>
);

/** a small sign of the field's row: 32px, its finger area 36×44 (2026-11-22, the user: „უფრო კომპაქტური და დახვეწილი“) */
// The finger never takes the focus from the field on the way down (2026-11-22 evening, the user: „კბილანაზე დაჭერისას არაფერი
// ხდება“): with the keyboard up, a press used to close it at once, the row slid down under the finger and the tap was lost. Now
// the press keeps the field (and the keyboard) until the tap has landed; then the field lets go — all but the ›, which keeps it.
const ToolSign: React.FC<{ label: string; onClick: () => void; children: React.ReactNode; keepFocus?: boolean }> = ({ label, onClick, children, keepFocus }) => (
  <button type="button" aria-label={label} title={label}
    onClick={() => {
      triggerHaptic(8);
      if (!keepFocus) (document.activeElement as HTMLElement | null)?.blur?.();
      onClick();
    }}
    onPointerDown={e => e.preventDefault()}
    className="relative flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-wine transition before:absolute before:-inset-x-0.5 before:-inset-y-1.5 active:scale-95 active:bg-ink/5 focus-visible:outline-2 focus-visible:outline-wine/60 [&_svg]:size-[21px]">
    {children}
  </button>
);

/** the default of `isCall`: one function for every render, so the drawn messages are kept (see listBody) */
const NEVER = () => false;

/** the first name of a sender, as the line above a run of messages shows it */
export const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

/** a pinned message in one short line */
const pinPreview = (m: ChatMessage) =>
  m.kind === 'voice' ? `🎤 ${m.text || `ხმოვანი · ${Math.round(m.seconds)} წმ`}`
  : m.kind === 'photo' ? '📷 ფოტო'
  : m.kind === 'file' ? `📎 ${m.fileName || 'ფაილი'}`
  : m.kind === 'draw' ? '🎨 ნახატი'
  : m.text || '…';
/** the whole name over a run of messages — the surname after the name (2026-11-22, the user: „გვარის ეწეროს სახელის მერე ჩათში“) */
const senderName = (name: string) => name.trim().replace(/\s+/g, ' ') || name;
/** a teacher's or an admin's line over their message: „გიორგი ბერიძე (ადმინი)“ (2026-11-21, the user: „სახელი ჩანდეს“) */
const staffName = (name: string | undefined, label: string) => (name?.trim() ? `${senderName(name)} (${label})` : label);

// A chat: text and voice messages (a class's chat, or a teacher's private chat with a student).
export const ChatPanel: React.FC<ChatPanelProps> = ({
  base, author, messages, loading, error, header, isCall = NEVER, callTitle, onJoinCall, callLive = true, onCallBack, onOpenGame, canDelete,
  showNames = false, seenAt = null, onSent, listClassName = 'h-[56vh] min-h-[300px] max-h-[560px]', readOnly = false,
  staffLabel = 'მასწავლებელი', fill = false, chain = false, listTop, renderCard, onAttach, extraTool, onDelete, personOpener,
  canPin = false,
}) => {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<Mode>({ k: 'idle' });
  const [elapsed, setElapsed] = useState(0);
  const [err, setErr] = useState('');
  const [active, setActive] = useState<string | null>(null);
  // a picked message (its „წაშლა“ showing): the phone's back lets it go instead of leaving the chat
  useBackToClose(!!active, () => setActive(null));
  const [emojiOpen, setEmojiOpen] = useState(false);
  useBackToClose(emojiOpen, () => setEmojiOpen(false));
  // the messages pinned on top (≤ 7, one compact line; a tap goes to the next one), my voice message being sent on, a voice take's title
  const top = useTopPins(readOnly ? null : base);
  const [pinAt, setPinAt] = useState(0);
  const [pinsOpen, setPinsOpen] = useState(false);
  const [forwarding, setForwarding] = useState<ChatMessage | null>(null);
  const [note, setNote] = useState('');
  const [voiceTitle, setVoiceTitle] = useState('');
  const [lit, setLit] = useState<string | null>(null);
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(''), 2600);
    return () => clearTimeout(t);
  }, [note]);
  const pinIds = top.ids;
  const togglePin = (m: ChatMessage) => {
    setActive(null);
    const on = !pinIds.includes(m.id);
    if (on && pinIds.length >= TOP_PINS_MAX) { setErr(`მიმაგრება ${TOP_PINS_MAX}-ზე მეტი არ შეიძლება — ჯერ ერთი მოხსენი.`); return; }
    triggerHaptic(15);
    setPinAt(0);
    setTopPin(base, m.id, on).catch(e => { console.warn('pin: ', e?.code || e); setErr(on ? 'ვერ მიმაგრდა.' : 'ვერ მოიხსნა.'); });
  };
  // a pin's tap: the message in the list (lit a moment), else the list of pins; then the line shows the next pin
  const goToPin = (m: ChatMessage) => {
    const el = list.current?.querySelector<HTMLElement>(`[data-mid="${m.id}"]`);
    if (el) {
      stick.current = false;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setLit(m.id);
      window.setTimeout(() => setLit(l => (l === m.id ? null : l)), 1400);
    } else setPinsOpen(true);
  };
  // Messenger's row (2026-11-22): + (a file; a teacher's card too) · camera · gallery · voice, folded to one › while typing
  const [toolsOpen, setToolsOpen] = useState(false);
  // the finger is in the field: the small signs fold to one › so the field is wide
  const [typing, setTyping] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quick, setQuick] = useQuickEmoji();
  const quickHold = useLongPress(() => setQuickOpen(true));
  const [upload, setUpload] = useState<{ label: string; pct: number } | null>(null);
  const camIn = useRef<HTMLInputElement>(null);
  const galIn = useRef<HTMLInputElement>(null);
  const fileIn = useRef<HTMLInputElement>(null);
  // whose hearts are listed (a tap on a message's ❤️ count)
  const [heartsOf, setHeartsOf] = useState<ChatMessage | null>(null);
  const lastTap = useRef<{ id: string; t: number } | null>(null);
  const caret = useRef<number | null>(null);
  const heart = (m: ChatMessage) => {
    triggerHaptic(15);
    setActive(null);
    toggleHeart(base, m, author.uid).catch(e => { console.warn('heart: ', e?.code || e); setErr('გული ვერ დაისვა.'); });
  };
  // a long press (half a second, the finger kept still) or a right click picks a message; a tap on the picked one lets
  // it go; a press on its play button or a link does not count
  const hold = useRef<number | null>(null);
  const stopHold = () => { if (hold.current) window.clearTimeout(hold.current); hold.current = null; };
  const holdToPick = (id: string, hearted: ChatMessage | null = null) => ({
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
      if ((e.target as HTMLElement).closest('button, a')) return;
      // two taps in a row put (or take back) a ❤️
      if (hearted) {
        const now = Date.now();
        if (lastTap.current?.id === id && now - lastTap.current.t < 320) { lastTap.current = null; heart(hearted); return; }
        lastTap.current = { id, t: now };
      }
      if (active === id) setActive(null);
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

  // `given`: a ready text (the big ❤️) — the field keeps what is typed
  const sendText = async (given?: string) => {
    const t = (given ?? text).trim();
    if (!t) return;
    if (given === undefined) {
      setText('');
      caret.current = null;
      if (field.current) field.current.style.height = '';
    } else triggerHaptic(15);
    setErr('');
    stick.current = true;
    try {
      await sendTextMessage(base, author, t);
      onSent?.('text', t);
    } catch (e) {
      console.warn('chat: ', e);
      setErr('შეტყობინება ვერ გაიგზავნა. სცადეთ თავიდან.');
      if (given === undefined) setText(t);
    }
  };

  // photos (the camera's one, or up to ten from the gallery) and a file ≤ 10 MB, one message each
  const sendPhotos = async (files: File[]) => {
    const list = files.filter(f => f.type.startsWith('image/') || !f.type).slice(0, 10);
    if (!list.length) return;
    setErr('');
    stick.current = true;
    for (let i = 0; i < list.length; i++) {
      setUpload({ label: list.length > 1 ? `ფოტო ${i + 1} / ${list.length}` : 'ფოტო', pct: 0 });
      try {
        await sendPhotoMessage(base, author, list[i], pct => setUpload(u => (u ? { ...u, pct } : u)));
        onSent?.('text', '📷 ფოტო');
      } catch (e) {
        console.warn('chat photo: ', e);
        setErr('ფოტო ვერ გაიგზავნა. სცადე ხელახლა.');
        break;
      }
    }
    setUpload(null);
  };
  const sendFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > FILE_MAX) { setErr('ფაილი 10 მბ-ზე დიდია — აირჩიე უფრო პატარა.'); return; }
    setErr('');
    stick.current = true;
    setUpload({ label: 'ფაილი', pct: 0 });
    try {
      await sendFileMessage(base, author, f, pct => setUpload(u => (u ? { ...u, pct } : u)));
      onSent?.('text', `📎 ${f.name}`);
    } catch (e) {
      console.warn('chat file: ', e);
      setErr('ფაილი ვერ გაიგზავნა. სცადე ხელახლა.');
    }
    setUpload(null);
  };
  const picked = (e: React.ChangeEvent<HTMLInputElement>, then: (files: File[]) => void) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length) then(files);
  };

  // an emoji from the panel goes where the cursor was
  const addEmoji = (e: string) => {
    const at = Math.min(caret.current ?? text.length, text.length);
    const next = (text.slice(0, at) + e + text.slice(at)).slice(0, 2000);
    caret.current = at + e.length;
    setText(next);
    const el = field.current;
    if (el) requestAnimationFrame(() => grow(el));
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
    setVoiceTitle('');
    setMode({ k: 'idle' });
  };
  // the phone's back while recording or listening to a take throws the take away (as its ✕) instead of leaving the chat
  useBackToClose(mode.k === 'recording' || mode.k === 'preview', () => (mode.k === 'recording' ? cancelRecording() : discardTake()));

  const sendTake = async () => {
    if (mode.k !== 'preview') return;
    const { take, url } = mode;
    setMode({ k: 'sending' });
    setErr('');
    stick.current = true;
    try {
      await sendVoiceMessage(base, author, take, voiceTitle);
      onSent?.('voice', voiceTitle.trim());
      setVoiceTitle('');
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
      {(() => {
      const closed = closedCalls(messages, isCall);
      return messages.map((m, i) => {
        const prev = messages[i - 1];
        const mine = m.uid === author.uid;
        const newDay = !!m.at && (!prev?.at || prev.at.toDateString() !== m.at.toDateString());
        const first = newDay || prev?.uid !== m.uid || (!!prev && isCall(prev) !== isCall(m));
        const canDel = !readOnly && canDelete(m);
        const heartable = !readOnly && !m.pending && !m.pinned && !isCall(m) && m.kind !== 'game';
        const pinnable = canPin && heartable;
        const isPinned = pinIds.includes(m.id);
        const forwardable = heartable && mine && m.kind === 'voice';
        const hearts = m.hearts ?? [];
        const mineHeart = hearts.includes(author.uid);
        const pick = canDel || heartable ? holdToPick(m.id, heartable ? m : null) : {};
        const named = typeof showNames === 'function' ? showNames(m) : showNames;
        const card = renderCard?.(m, mine) ?? null;
        const openPerson = named && !mine && first ? personOpener?.(m) ?? null : null;
        const dayLine = newDay && (
          <p className="my-3 text-center text-cap font-bold text-mut">{dayLabel(m.at!)}</p>
        );
        const menuPill = 'h-icon px-3 rounded-full bg-surf shadow-lift text-meta font-semibold inline-flex items-center gap-1.5 cursor-pointer active:scale-95';
        const removeBtn = active === m.id && (heartable || canDel) && (
          <div className={`mt-1.5 flex flex-wrap items-center gap-1.5 ${mine ? 'justify-end' : ''}`}>
            {heartable && (
              <button
                type="button"
                onClick={() => heart(m)}
                aria-label={mineHeart ? 'გულის მოხსნა' : 'გული'}
                className={`h-icon px-3 rounded-full bg-surf shadow-lift text-meta font-semibold inline-flex items-center gap-1.5 cursor-pointer active:scale-95 ${mineHeart ? 'text-mut ring-1 ring-wine/30' : 'text-ink'}`}
              >
                <span aria-hidden="true" className="text-lead leading-none">❤️</span>{mineHeart && 'მოხსნა'}
              </button>
            )}
            {pinnable && (
              <button type="button" onClick={() => togglePin(m)} className={`${menuPill} text-ink`}>
                {isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}{isPinned ? 'მოხსნა' : 'მიმაგრება'}
              </button>
            )}
            {forwardable && (
              <button type="button" onClick={() => { setActive(null); setForwarding(m); }} className={`${menuPill} text-ink`}>
                <Forward className="size-4" />გადაგზავნა
              </button>
            )}
            {canDel && (
              <button
                type="button"
                onClick={() => remove(m)}
                className="h-icon px-3.5 rounded-full bg-surf shadow-lift text-meta font-semibold text-danger inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Trash2 className="w-4 h-4" /> წაშლა
              </button>
            )}
          </div>
        );
        // the hearts under the bubble, on its corner: ❤️ and how many; a tap names who
        const heartPill = hearts.length > 0 && (
          <button
            type="button"
            onClick={() => setHeartsOf(m)}
            aria-label={`გული · ${hearts.length}`}
            className={`relative z-[1] -mt-2 inline-flex h-6 cursor-pointer items-center gap-0.5 rounded-full bg-surf px-1.5 text-cap font-bold text-ink shadow-lift ring-1 ring-line ${mine ? 'mr-2' : 'ml-2'}`}
          >
            <span aria-hidden="true" className="leading-none">❤️</span>
            {hearts.length > 1 && <span className="tabular-nums">{hearts.length}</span>}
          </button>
        );
        // how a call ended (board x-zari-chatshi): „ზარი დასრულდა · 12 წუთი“, or „გამოტოვებული ზარი“ with „დაურეკე“ (the one
        // who rang reads „ზარს არ უპასუხეს“); the call's own first message then steps aside
        if (isCall(m) && m.end) {
          const rang = m.uid === author.uid;
          const words = m.missed ? (rang ? 'ზარს არ უპასუხეს' : 'გამოტოვებული ზარი') : `ზარი დასრულდა · ${callLength(m.seconds)}`;
          const back = m.missed && !rang && !readOnly && onCallBack;
          return (
            <React.Fragment key={m.id}>
              {dayLine}
              <div className="mt-2 flex flex-col items-center">
                <div
                  {...(canDel ? holdToPick(m.id) : {})}
                  className={`inline-flex max-w-full items-center gap-2 rounded-full bg-soft text-meta text-mut ${back ? 'py-0.5 pr-1 pl-3.5' : 'px-3.5 py-2'} ${canDel ? '[-webkit-touch-callout:none]' : ''}`}
                >
                  <Phone className="size-[18px] shrink-0" aria-hidden="true" />
                  <span className="min-w-0 truncate">{words} · {sentAt(m)}</span>
                  {back && (
                    <Press onClick={() => back()} className="group flex h-tap shrink-0 cursor-pointer items-center rounded-full focus-visible:outline-none">
                      <span className="flex h-9 items-center rounded-full bg-surf px-3.5 font-bold text-wine transition group-active:scale-[0.97] group-focus-visible:outline-2 group-focus-visible:outline-wine/60">დაურეკე</span>
                    </Press>
                  )}
                </div>
                {removeBtn}
              </div>
            </React.Fragment>
          );
        }
        if (isCall(m) && closed.has(m.id)) return <React.Fragment key={m.id}>{dayLine}</React.Fragment>;
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
        const big = m.kind === 'text' ? bigEmoji(m.text) : '';
        const photo = m.kind === 'photo';
        return (
          <React.Fragment key={m.id}>
            {dayLine}
            <div data-mid={m.id} className={`group flex items-end gap-1 rounded-tile transition-colors duration-500 ${lit === m.id ? 'bg-gold/20' : ''} ${mine ? 'justify-end' : 'justify-start'} ${first ? 'mt-3' : 'mt-1'}`}>
              {mine && canDel && <HoverDelete onClick={() => askRemove(m)} />}
              <div className={`${card ? 'w-[88%] max-w-[360px]' : 'max-w-[82%]'} flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                {named && first && !mine && (
                  <p className="text-cap font-bold text-mut mb-1 px-1 flex items-center gap-1.5">
                    {openPerson
                      ? <button type="button" onClick={openPerson} aria-label={`${m.name} — გზა და პროფილი`} className="cursor-pointer hover:underline underline-offset-2">{m.teacher ? staffName(m.name, staffLabel) : senderName(m.name)}</button>
                      : (m.teacher ? staffName(m.name, staffLabel) : senderName(m.name))}
                  </p>
                )}
                {card ? (
                  <div {...pick} className={`w-full ${canDel || heartable ? '[-webkit-touch-callout:none] select-none' : ''}`}>{card}</div>
                ) : (
                <div
                  // a long press on the message (as in any messenger; a right click on a computer) shows „❤️“ and
                  // „წაშლა“ under it, two taps put a ❤️; playing a voice message or opening a link never does
                  {...pick}
                  className={`rounded-tile ${big ? 'px-1' : photo ? 'p-1' : 'px-3.5 py-2'} ${canDel || heartable ? '[-webkit-touch-callout:none]' : ''} ${
                    big ? '' : mine
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
                  ) : photo ? (
                    <PhotoBubble m={m} base={base} stamp="text-cap leading-none" meta={sentAt(m)} />
                  ) : m.kind === 'file' ? (
                    <FileBubble m={m} base={base} mine={mine} stamp={stamp} meta={sentAt(m)} />
                  ) : m.kind === 'voice' ? (
                    <div className="py-1">
                      {m.text && <p className={`mb-1 max-w-[260px] break-words text-meta font-bold ${mine ? 'text-white' : 'text-ink'}`}>{m.text}</p>}
                      <VoicePlayer seconds={m.seconds} wave={m.wave} onDark={mine} getUrl={() => loadVoiceUrl(base, m)} meta={sentAt(m)} />
                    </div>
                  ) : big ? (
                    <>
                      <p className={`select-none whitespace-pre-wrap ${big}`}>{m.text}</p>
                      <p className="flex justify-end text-cap leading-none text-mut">{sentAt(m)}</p>
                    </>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap break-words text-body"><Linkified text={m.text} mine={mine} /></p>
                      <p className={`flex justify-end mt-1 ${stamp}`}>{sentAt(m)}</p>
                    </>
                  )}
                </div>
                )}
                {heartPill}
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
      });
      })()}
      </>
  )), [messages, loading, error, listTop, active, seenId, lastCallId, callLive, callTitle, readOnly, showNames, staffLabel, onCallBack,
    author.uid, base, isCall, canDelete, renderCard, personOpener, onOpenGame, onJoinCall, onDelete, canPin, pinIds, lit]); // eslint-disable-line react-hooks/exhaustive-deps

  const pill = 'min-h-tap-lg rounded-full bg-surf flex items-center';

  return (
    <section className={`bg-page text-ink ${fill ? 'h-full flex flex-col' : 'rounded-card overflow-hidden'}`}>
      {header}

      {top.pinned.length > 0 && (() => {
        const i = pinAt % top.pinned.length;
        const p = top.pinned[i];
        return (
          <div className="mx-2 mt-1 flex min-h-tap items-center gap-1 rounded-field bg-surf pl-3 pr-1 shadow-lift sm:mx-4">
            <button
              type="button"
              onClick={() => { goToPin(p); setPinAt(i + 1); }}
              aria-label={`მიმაგრებული ${i + 1} / ${top.pinned.length}: ${pinPreview(p)}`}
              className="flex min-h-tap min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
            >
              <Pin className="size-4 shrink-0 text-wine" aria-hidden="true" />
              {top.pinned.length > 1 && <span className="shrink-0 text-cap font-bold tabular-nums text-wine">{i + 1}/{top.pinned.length}</span>}
              <span className="min-w-0 truncate text-meta font-semibold text-ink">{pinPreview(p)}</span>
            </button>
            <button type="button" onClick={() => setPinsOpen(true)} aria-label="ყველა მიმაგრებული"
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-mut active:scale-95">
              <ChevronDown className="size-5" />
            </button>
          </div>
        );
      })()}

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
      {note && <p role="status" className="px-5 pt-3 text-meta font-semibold text-leaf">{note}</p>}

      {emojiOpen && !readOnly && mode.k === 'idle' && (
        <div className="px-3 pt-2 sm:px-4">
          <div role="group" aria-label="ემოჯი" className="grid max-h-48 grid-cols-8 gap-0.5 overflow-y-auto overscroll-contain rounded-card bg-surf p-1.5">
            {EMOJIS.map(e => (
              <button key={e} type="button" onClick={() => addEmoji(e)} aria-label={e}
                className="flex h-11 cursor-pointer items-center justify-center rounded-field text-[26px] leading-none transition active:scale-90 active:bg-soft">
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {readOnly ? (
        <p className="px-5 py-4 text-center text-meta text-mut">მხოლოდ სანახავად</p>
      ) : (
      <div className="px-2 py-2.5 sm:px-4 flex flex-wrap items-end gap-1.5">
        {mode.k === 'idle' && upload && (
          <div className={`${pill} flex-1 min-w-0 justify-center gap-2 px-4 text-meta text-mut`}>
            <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
            <span className="truncate">იგზავნება {upload.label}… {Math.round(upload.pct * 100)}%</span>
          </div>
        )}
        {mode.k === 'idle' && !upload && (
          <>
            {/* the hidden pickers: the camera, the gallery (several photos), any file */}
            <input ref={camIn} type="file" accept="image/*" capture="environment" hidden onChange={e => picked(e, sendPhotos)} />
            <input ref={galIn} type="file" accept="image/*" multiple hidden onChange={e => picked(e, sendPhotos)} />
            <input ref={fileIn} type="file" hidden onChange={e => picked(e, f => sendFile(f[0]))} />
            {/* compact (2026-11-22, the user: „ჩათის ღილაკები უფრო კომპაქტური და დახვეწილი … წერილის დასაწერი ადგილი ვიწროა“):
                small signs side by side, and while the field is in use (typed in or the finger in it) they fold to one › */}
            {(text.trim() || typing) && !toolsOpen ? (
              <ToolSign keepFocus label="ფოტო, ფაილი, ხმა" onClick={() => setToolsOpen(true)}><ChevronRight /></ToolSign>
            ) : (
              <div className="mb-2 flex shrink-0 items-center">
                <ToolSign label={onAttach ? 'ფაილი ან ბარათი მოსწავლეს' : 'ფაილის გაგზავნა'}
                  onClick={() => (onAttach ? setPlusOpen(true) : fileIn.current?.click())}>
                  <Plus />
                </ToolSign>
                <ToolSign label="ფოტოს გადაღება" onClick={() => camIn.current?.click()}><Camera /></ToolSign>
                <ToolSign label="ფოტო გალერეიდან" onClick={() => galIn.current?.click()}><ImageIcon /></ToolSign>
                {canRecord && <ToolSign label="ხმოვანი შეტყობინების ჩაწერა" onClick={startRecording}><Mic /></ToolSign>}
                {extraTool && <ToolSign label={extraTool.label} onClick={extraTool.onClick}>{extraTool.icon}</ToolSign>}
              </div>
            )}
            <div className="relative flex-1 min-w-0">
              <textarea
                ref={field}
                rows={1}
                value={text}
                onChange={e => { setText(e.target.value); setToolsOpen(false); caret.current = e.target.selectionStart; grow(e.target); }}
                onSelect={e => { caret.current = e.currentTarget.selectionStart; }}
                onFocus={() => { setEmojiOpen(false); setTyping(true); setToolsOpen(false); }}
                onBlur={() => setTyping(false)}
                onKeyDown={onKeyDown}
                maxLength={2000}
                placeholder="წერილი"
                aria-label="წერილი"
                className="block w-full resize-none rounded-[22px] bg-surf py-2.5 pr-10 pl-3.5 min-h-tap text-lead text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-wine/35"
              />
              {/* 😊 inside the field opens the emoji panel (in place of the phone's keyboard) */}
              <button
                type="button"
                onClick={() => { triggerHaptic(8); if (!emojiOpen) field.current?.blur(); setEmojiOpen(v => !v); }}
                aria-label={emojiOpen ? 'ემოჯის დახურვა' : 'ემოჯი'}
                aria-expanded={emojiOpen}
                className={`absolute right-0.5 bottom-0.5 flex size-10 cursor-pointer items-center justify-center rounded-full transition active:scale-95 ${emojiOpen ? 'text-wine' : 'text-mut'}`}
              >
                <Smile className="size-[22px]" />
              </button>
            </div>
            {/* the quick button: the arrow sends the text; on an empty field the chosen emoji (none chosen = the arrow, which
                only puts the finger in the field). A long press chooses (2026-11-22) */}
            <RoundButton
              {...quickHold}
              size={44}
              tone={text.trim() || !quick ? 'wine' : 'surf'}
              label={text.trim() ? 'გაგზავნა' : quick ? `${quick} გაგზავნა (დიდხანს — შეცვლა)` : 'გაგზავნა (დიდხანს — სწრაფი ემოჯი)'}
              className="mb-0.5 [-webkit-touch-callout:none]"
              onClick={() => (text.trim() ? sendText() : quick ? sendText(quick) : field.current?.focus())}
            >
              {text.trim() || !quick ? <Send /> : <span aria-hidden="true" className="text-title leading-none">{quick}</span>}
            </RoundButton>
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
            {/* a title or an instruction over the voice message, before it goes (one quiet line; may stay empty) */}
            <div className="basis-full px-1 pb-1.5">
              <input
                value={voiceTitle}
                onChange={e => setVoiceTitle(e.target.value)}
                maxLength={VOICE_TITLE_MAX}
                enterKeyHint="send"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void sendTake(); } }}
                placeholder="სათაური ან მითითება (არ არის აუცილებელი)"
                aria-label="ხმოვანის სათაური"
                className="block h-10 w-full rounded-full bg-surf px-4 text-meta text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-wine/35"
              />
            </div>
            <RoundButton size={48} label="წაშლა" onClick={discardTake} className="text-danger"><Trash2 /></RoundButton>
            <div className={`${pill} flex-1 min-w-0 px-1`}>
              <VoicePlayer seconds={mode.take.seconds} wave={mode.take.wave} getUrl={() => Promise.resolve(mode.url)} />
            </div>
            <RoundButton size={48} tone="wine" label="გაგზავნა" onClick={sendTake}><Send /></RoundButton>
          </>
        )}
      </div>
      )}

      <QuickSheet open={quickOpen} quick={quick} onPick={setQuick} onClose={() => setQuickOpen(false)} />
      {/* every pinned message: a voice plays right here; a tap on the rest goes to it; ✕ takes the pin off */}
      <Sheet open={pinsOpen} onClose={() => setPinsOpen(false)} title={`მიმაგრებული · ${top.pinned.length}`}>
        <ul className="flex flex-col gap-1.5 pb-1">
          {top.pinned.map(p => (
            <li key={p.id} className="flex items-center gap-2 rounded-field bg-surf py-1.5 pl-3 pr-1">
              {p.kind === 'voice' ? (
                <div className="min-w-0 flex-1">
                  {p.text && <p className="truncate text-meta font-bold text-ink">{p.text}</p>}
                  <VoicePlayer seconds={p.seconds} wave={p.wave} getUrl={() => loadVoiceUrl(base, p)} meta={senderName(p.name)} />
                </div>
              ) : (
                <button type="button" onClick={() => { setPinsOpen(false); window.setTimeout(() => goToPin(p), 250); }}
                  className="min-h-tap min-w-0 flex-1 cursor-pointer text-left">
                  <span className="line-clamp-2 break-words text-lead text-ink">{pinPreview(p)}</span>
                  <span className="block text-cap text-mut">{senderName(p.name)}{p.at ? ` · ${sentAt(p)}` : ''}</span>
                </button>
              )}
              {canPin && (
                <button type="button" onClick={() => togglePin(p)} aria-label="მიმაგრების მოხსნა"
                  className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-mut active:scale-95">
                  <PinOff className="size-[18px]" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </Sheet>
      {forwarding && (
        <React.Suspense fallback={null}>
          <ForwardSheet m={forwarding} fromBase={base} onClose={() => setForwarding(null)}
            onDone={n => { setForwarding(null); setNote(n > 1 ? `გაიგზავნა ${n} ჩათში` : 'გაიგზავნა'); }} />
        </React.Suspense>
      )}
      {onAttach && (
        <Sheet open={plusOpen} onClose={() => setPlusOpen(false)} title="გაგზავნა">
          <div className="flex flex-col gap-2 pb-1">
            <Button full kind="ghost" icon={<Paperclip />} onClick={() => { fileIn.current?.click(); setPlusOpen(false); }}>ფაილი (10 მბ-მდე)</Button>
            <Button full kind="ghost" icon={<ClipboardList />} onClick={() => { setPlusOpen(false); onAttach(); }}>ბარათი მოსწავლეს — კომენტარი ან დავალება</Button>
          </div>
        </Sheet>
      )}
      {/* who put a ❤️ on a message */}
      <Sheet open={!!heartsOf} onClose={() => setHeartsOf(null)} title={`❤️ · ${heartsOf?.hearts?.length ?? 0}`}>
        <ul className="flex flex-col gap-1 pb-1">
          {(heartsOf?.hearts ?? []).map(h => {
            const who = h === author.uid ? 'შენ' : messages.find(x => x.uid === h)?.name || 'წევრი';
            return (
              <li key={h} className="flex min-h-tap items-center gap-2.5 rounded-field bg-surf px-3.5 text-lead">
                <span aria-hidden="true">❤️</span><span className="min-w-0 truncate">{who}</span>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </section>
  );
};
