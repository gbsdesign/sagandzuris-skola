import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MessageCircle, Mic, Send, Square, X, Trash2, Play, Pause, Loader2, Clock, Video, CheckCheck } from 'lucide-react';
import {
  sendTextMessage, sendVoiceMessage, deleteMessage, loadVoiceUrl, ChatMessage, ChatAuthor,
} from '../../hooks/useClassChat';
import {
  startVoiceRecording, voiceRecordingSupported, VOICE_MAX_SECONDS, WAVE_BARS, VoiceRecording, VoiceTake,
} from '../../utils/voiceRecorder';
import { triggerHaptic } from '../../utils/haptics';

const MONTHS = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'];

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
export const dayLabel = (d: Date) => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'დღეს';
  if (d.toDateString() === yesterday.toDateString()) return 'გუშინ';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : ''}`;
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
        className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition ${
          onDark ? 'bg-[#fbf6ec] text-[#7a2028]' : 'bg-[#7a2028] text-[#fbf6ec]'
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
                  ? (onDark ? 'bg-[#fbf6ec]' : 'bg-[#7a2028]')
                  : (onDark ? 'bg-[#fbf6ec]/40' : 'bg-[#7a2028]/25')
              }`}
              style={{ height: `${18 + v * 9}%` }}
            />
          ))}
        </div>
        <p className={`flex justify-between items-center gap-2 text-[11px] tabular-nums leading-none mt-0.5 ${onDark ? 'text-[#fbf6ec]/75' : 'text-[#8a7a6a]'}`}>
          <span>{state === 'error' ? 'ვერ ჩაიტვირთა' : active ? `${clock(pos)} / ${clock(seconds)}` : clock(seconds)}</span>
          {meta}
        </p>
      </div>
    </div>
  );
};

// when a message was sent, or a clock while it is still on its way
const sentAt = (m: ChatMessage) => (
  <span className="inline-flex items-center tabular-nums">{m.pending ? <Clock className="w-3 h-3" /> : m.at && hhmm(m.at)}</span>
);

export const Avatar: React.FC<{ name: string; photoURL?: string; className?: string }> = ({ name, photoURL, className = 'w-8 h-8 text-sm' }) =>
  photoURL ? (
    <img src={photoURL} alt="" className={`${className} shrink-0 rounded-full object-cover`} referrerPolicy="no-referrer" />
  ) : (
    <span className={`${className} shrink-0 rounded-full bg-[#efe5d4] text-[#4a3426] font-bold flex items-center justify-center`}>
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
  /** messages shown as a call card with a button into the call */
  isCall: (m: ChatMessage) => boolean;
  callTitle: string;
  onJoinCall: () => void;
  canDelete: (m: ChatMessage) => boolean;
  /** a class: avatars and names over the others' messages; a private chat has only two people */
  showNames?: boolean;
  /** the other person last opened this chat (a private chat): "ნანახია" under my last message */
  seenAt?: Date | null;
  onSent?: (kind: 'text' | 'voice', text: string) => void;
  /** height of the message list */
  listClassName?: string;
}

// A chat: text and voice messages (a class's chat, or a teacher's private chat with a student).
export const ChatPanel: React.FC<ChatPanelProps> = ({
  base, author, messages, loading, error, header, isCall, callTitle, onJoinCall, canDelete,
  showNames = false, seenAt = null, onSent, listClassName = 'h-[56vh] min-h-[300px] max-h-[560px]',
}) => {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<Mode>({ k: 'idle' });
  const [elapsed, setElapsed] = useState(0);
  const [err, setErr] = useState('');
  const [active, setActive] = useState<string | null>(null);
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

  const remove = async (m: ChatMessage) => {
    setActive(null);
    try {
      await deleteMessage(base, m);
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

  // my newest message gets "ნანახია" once the other person has opened the chat after it
  const lastMine = [...messages].reverse().find(m => m.uid === author.uid);
  const seenId = seenAt && lastMine?.at && !lastMine.pending && seenAt >= lastMine.at ? lastMine.id : null;

  const round = 'w-12 h-12 shrink-0 rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition disabled:opacity-40 disabled:cursor-default';

  return (
    <section className="bg-white/70 rounded-3xl ring-1 ring-[#e8dcc8] overflow-hidden">
      {header}

      <div
        ref={list}
        onScroll={e => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className={`${listClassName} overflow-y-auto overscroll-contain px-3 sm:px-5 py-3 bg-[#fbf6ec]/70 border-y border-[#efe5d4]`}
      >
        {loading ? (
          <div className="h-full flex items-center justify-center text-[#b3a594]"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : error ? (
          <p className="h-full flex items-center justify-center text-center text-sm text-[#8a7a6a] px-6">ჩათი ახლა ვერ ჩაიტვირთა.</p>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-2 px-6 text-[#8a7a6a]">
            <MessageCircle className="w-9 h-9 text-[#d9c9b0]" />
            <p className="text-sm">ჯერ შეტყობინება არ არის.<br />დაწერეთ პირველი ან ჩაწერეთ ხმოვანი.</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const mine = m.uid === author.uid;
            const newDay = !!m.at && (!prev?.at || prev.at.toDateString() !== m.at.toDateString());
            const first = newDay || prev?.uid !== m.uid;
            const canDel = canDelete(m);
            return (
              <React.Fragment key={m.id}>
                {newDay && (
                  <div className="flex justify-center my-3">
                    <span className="px-3 py-1 rounded-full bg-white/90 ring-1 ring-[#e8dcc8] text-xs font-semibold text-[#8a7a6a]">{dayLabel(m.at!)}</span>
                  </div>
                )}
                <div className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'} ${first ? 'mt-3' : 'mt-1'}`}>
                  {showNames && !mine && (first ? <Avatar name={m.name} photoURL={m.photoURL} /> : <span className="w-8 shrink-0" />)}
                  <div className={`max-w-[82%] flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                    {showNames && first && !mine && (
                      <p className="text-xs font-semibold text-[#7a2028] mb-1 px-1 flex items-center gap-1.5">
                        {m.name}
                        {m.teacher && <span className="px-1.5 py-px rounded-full bg-[#7a2028]/10 text-[10px] font-bold">მასწავლებელი</span>}
                      </p>
                    )}
                    <div
                      onClick={() => canDel && setActive(active === m.id ? null : m.id)}
                      className={`rounded-[20px] px-3.5 py-2 shadow-[0_1px_1px_rgba(74,52,38,0.06)] ${canDel ? 'cursor-pointer' : ''} ${
                        mine
                          ? `bg-[#7a2028] text-[#fbf6ec] ${first ? 'rounded-tr-md' : ''}`
                          : `bg-white ring-1 ring-[#e8dcc8] text-[#2a2017] ${first ? 'rounded-tl-md' : ''}`
                      }`}
                    >
                      {isCall(m) ? (
                        <div className="py-1 flex flex-col gap-2.5">
                          <p className="flex items-center gap-2 font-semibold text-[15px]">
                            <Video className="w-5 h-5 shrink-0" /> {callTitle}
                          </p>
                          <div className="flex items-center justify-between gap-4">
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); onJoinCall(); }}
                              className={`h-10 px-4 rounded-full text-sm font-bold cursor-pointer active:scale-95 transition ${
                                mine ? 'bg-[#fbf6ec] text-[#7a2028]' : 'bg-[#7a2028] text-[#fbf6ec]'
                              }`}
                            >
                              შესვლა ზარში
                            </button>
                            <span className={`text-[11px] leading-none ${mine ? 'text-[#fbf6ec]/70' : 'text-[#a89886]'}`}>{sentAt(m)}</span>
                          </div>
                        </div>
                      ) : m.kind === 'voice' ? (
                        <div className="py-1">
                          <VoicePlayer seconds={m.seconds} wave={m.wave} onDark={mine} getUrl={() => loadVoiceUrl(base, m)} meta={sentAt(m)} />
                        </div>
                      ) : (
                        <>
                          <p className="whitespace-pre-wrap break-words text-[15px] leading-snug"><Linkified text={m.text} /></p>
                          <p className={`flex justify-end text-[11px] leading-none mt-1 ${mine ? 'text-[#fbf6ec]/70' : 'text-[#a89886]'}`}>{sentAt(m)}</p>
                        </>
                      )}
                    </div>
                    {seenId === m.id && (
                      <p className="mt-1 px-1 flex items-center gap-1 text-[11px] font-semibold text-[#8a7a6a]">
                        <CheckCheck className="w-3.5 h-3.5 text-[#7a2028]" /> ნანახია
                      </p>
                    )}
                    {active === m.id && (
                      <button
                        type="button"
                        onClick={() => remove(m)}
                        className="mt-1.5 h-9 px-3.5 rounded-full bg-white ring-1 ring-[#e8dcc8] text-sm font-semibold text-[#a02c2c] inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Trash2 className="w-4 h-4" /> წაშლა
                      </button>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>

      {err && <p className="px-5 pt-3 text-sm text-[#a02c2c]">{err}</p>}

      <div className="p-3 sm:px-4 flex items-end gap-2">
        {mode.k === 'idle' && (
          <>
            <textarea
              ref={field}
              rows={1}
              value={text}
              onChange={e => { setText(e.target.value); grow(e.target); }}
              onKeyDown={onKeyDown}
              maxLength={2000}
              placeholder="შეტყობინება…"
              className="flex-1 min-w-0 resize-none rounded-[24px] ring-1 ring-[#e8dcc8] bg-[#fbf6ec] px-4 py-3 text-[15px] leading-snug text-[#2a2017] placeholder:text-[#b3a594] focus:outline-none focus:ring-2 focus:ring-[#7a2028]/35"
            />
            {text.trim() || !canRecord ? (
              <button type="button" onClick={sendText} disabled={!text.trim()} aria-label="გაგზავნა" className={`${round} bg-[#7a2028] text-[#fbf6ec]`}>
                <Send className="w-5 h-5 -translate-x-px translate-y-px" />
              </button>
            ) : (
              <button type="button" onClick={startRecording} aria-label="ხმოვანი შეტყობინების ჩაწერა" className={`${round} bg-[#7a2028] text-[#fbf6ec]`}>
                <Mic className="w-5 h-5" />
              </button>
            )}
          </>
        )}

        {mode.k === 'recording' && (
          <>
            <button type="button" onClick={cancelRecording} aria-label="გაუქმება" className={`${round} bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]`}>
              <X className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0 h-12 rounded-full bg-[#7a2028]/[0.06] ring-1 ring-[#7a2028]/20 flex items-center gap-2.5 px-4">
              <span className="w-2.5 h-2.5 shrink-0 rounded-full bg-[#c62828] animate-pulse" />
              <span className="font-semibold tabular-nums text-[#7a2028]">{clock(elapsed)}</span>
              <span className="text-sm text-[#8a7a6a] truncate">იწერება…</span>
            </div>
            <button type="button" onClick={finishRecording} aria-label="დასრულება" className={`${round} bg-[#7a2028] text-[#fbf6ec]`}>
              <Square className="w-4 h-4" fill="currentColor" />
            </button>
          </>
        )}

        {(mode.k === 'encoding' || mode.k === 'sending') && (
          <div className="flex-1 h-12 rounded-full bg-[#fbf6ec] ring-1 ring-[#e8dcc8] flex items-center justify-center gap-2 text-sm text-[#8a7a6a]">
            <Loader2 className="w-4 h-4 animate-spin" /> {mode.k === 'encoding' ? 'მზადდება…' : 'იგზავნება…'}
          </div>
        )}

        {mode.k === 'preview' && (
          <>
            <button type="button" onClick={discardTake} aria-label="წაშლა" className={`${round} bg-white ring-1 ring-[#e8dcc8] text-[#a02c2c]`}>
              <Trash2 className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0 h-12 rounded-full bg-[#fbf6ec] ring-1 ring-[#e8dcc8] flex items-center px-1">
              <VoicePlayer seconds={mode.take.seconds} wave={mode.take.wave} getUrl={() => Promise.resolve(mode.url)} />
            </div>
            <button type="button" onClick={sendTake} aria-label="გაგზავნა" className={`${round} bg-[#7a2028] text-[#fbf6ec]`}>
              <Send className="w-5 h-5 -translate-x-px translate-y-px" />
            </button>
          </>
        )}
      </div>
      {mode.k === 'recording' && (
        <p className="px-5 -mt-1 pb-3 text-xs text-[#a89886]">მაქსიმუმ {VOICE_MAX_SECONDS / 60} წუთი. ■ — დასრულება, მერე მოისმენთ და გაგზავნით.</p>
      )}
    </section>
  );
};
