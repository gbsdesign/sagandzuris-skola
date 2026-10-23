import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Maximize2, Mic, MicOff, Phone, PhoneOff, SwitchCamera, Video, VideoOff, X } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context';
import { useNotes } from '../../context/NotesContext';
import { useMyClasses, useTeachingClasses } from '../../hooks/useClasses';
import type { SchoolClass } from '../../hooks/useClasses';
import { useInbox, isRinging, ADMIN_NAME, otherOf, DirectThread } from '../../hooks/useDirectChat';
import {
  useCall, leaveCall, dismissCall, toggleMic, toggleCam, flipCamera, setCallSmall, RemotePeer, RING_MS,
} from '../../utils/callSession';
import { afterLeave, answerChatCall, declineChatCall, joinClassCall } from './callActions';

// The call on top of the app: the full call screen (or a small bar while one reads the chat), and the incoming
// call — a private one rings, a class's shows „ზარი მიმდინარეობს“. Nothing sounds while the notes, the liturgy
// program or church mode is open: the choir reads the notes during the service.

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const useSeconds = (since: number, on: boolean) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [on]);
  return Math.max(0, (now - since) / 1000);
};

const Face: React.FC<{ name: string; photoURL?: string; className: string }> = ({ name, photoURL, className }) =>
  photoURL ? (
    <img src={photoURL} alt="" referrerPolicy="no-referrer" className={`${className} shrink-0 rounded-full object-cover`} />
  ) : (
    <span className={`${className} shrink-0 rounded-full bg-[#7a2028] text-[#fbf6ec] font-bold flex items-center justify-center`}>{name.charAt(0) || '?'}</span>
  );

const MediaVideo: React.FC<{ stream: MediaStream; mirror?: boolean }> = ({ stream, mirror }) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (v && v.srcObject !== stream) { v.srcObject = stream; v.play().catch(() => {}); }
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted className={`absolute inset-0 w-full h-full object-cover ${mirror ? '-scale-x-100' : ''}`} />;
};

const MediaAudio: React.FC<{ stream: MediaStream }> = ({ stream }) => {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const a = ref.current;
    if (a && a.srcObject !== stream) { a.srcObject = stream; a.play().catch(() => {}); }
  }, [stream]);
  return <audio ref={ref} autoPlay />;
};

const Tile: React.FC<{
  name: string; photoURL?: string; stream: MediaStream | null; cam: boolean; mic: boolean; speaking: boolean; mirror?: boolean; className?: string;
}> = ({ name, photoURL, stream, cam, mic, speaking, mirror, className = '' }) => (
  <div className={`relative overflow-hidden rounded-3xl bg-[#2b211d] transition-shadow ${speaking ? 'ring-[3px] ring-emerald-400' : 'ring-1 ring-white/10'} ${className}`}>
    {stream && cam && stream.getVideoTracks().length > 0 ? (
      <MediaVideo stream={stream} mirror={mirror} />
    ) : (
      <div className="absolute inset-0 flex items-center justify-center">
        <Face name={name} photoURL={photoURL} className="w-20 h-20 sm:w-24 sm:h-24 text-3xl" />
      </div>
    )}
    <span className="absolute left-2 bottom-2 max-w-[calc(100%-16px)] inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-black/45 backdrop-blur text-[13px] font-semibold text-white">
      {!mic && <MicOff className="w-3.5 h-3.5 shrink-0 text-red-300" />}
      <span className="truncate">{name}</span>
    </span>
  </div>
);

const RoundBtn: React.FC<{ label: string; onClick: () => void; tone?: 'plain' | 'off' | 'red' | 'green'; big?: boolean; children: React.ReactNode }> = ({
  label, onClick, tone = 'plain', big, children,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`${big ? 'w-16 h-16' : 'w-14 h-14'} shrink-0 rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition ${
      tone === 'red' ? 'bg-[#d6402f] text-white hover:bg-[#c23426]'
        : tone === 'green' ? 'bg-emerald-500 text-white hover:bg-emerald-600'
        : tone === 'off' ? 'bg-white text-[#1c1513]'
        : 'bg-white/12 text-white hover:bg-white/20'
    }`}
  >
    {children}
  </button>
);

// ---- the call screen --------------------------------------------------------------------------------------

const CallScreen: React.FC<{ logoUrl?: string }> = ({ logoUrl }) => {
  const call = useCall();
  const live = call.status === 'live' || call.status === 'waiting';
  const secs = useSeconds(call.since, live);

  // the "ended" note goes away by itself
  useEffect(() => {
    if (call.status !== 'ended') return;
    const t = setTimeout(dismissCall, 2600);
    return () => clearTimeout(t);
  }, [call.status]);

  const info = call.info;
  if (!info || call.status === 'idle') return null;

  const label = (p: RemotePeer) => (info.anonStaff && p.staff ? { name: ADMIN_NAME, photoURL: logoUrl } : { name: p.name || 'უსახელო', photoURL: p.photoURL });
  const hang = async () => {
    const others = call.peers.length;
    await leaveCall();
    afterLeave(info, others);
  };
  const status = call.status === 'connecting' ? 'ერთდება…'
    : call.status === 'ended' ? call.note || 'ზარი დასრულდა.'
    : call.status === 'waiting' ? (info.oneToOne ? 'ირეკება…' : `მარტო ხართ · ${clock(secs)}`)
    : info.oneToOne ? clock(secs) : `${call.peers.length + 1} მონაწილე · ${clock(secs)}`;

  // remote voices keep playing while the screen is small
  const voices = call.peers.filter(p => p.stream).map(p => <MediaAudio key={p.uid} stream={p.stream!} />);

  if (call.small && call.status !== 'ended') {
    return (
      <>
        {voices}
        <div className="fixed z-[90] left-1/2 -translate-x-1/2 top-[calc(env(safe-area-inset-top)+10px)] w-[min(440px,calc(100%-24px))] rounded-full bg-[#1c1513] text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] flex items-center gap-2 pl-4 pr-1.5 py-1.5">
          <span className="w-2.5 h-2.5 shrink-0 rounded-full bg-emerald-400 animate-pulse" />
          <button type="button" onClick={() => setCallSmall(false)} className="flex-1 min-w-0 text-left cursor-pointer">
            <span className="block truncate text-sm font-bold">{info.title}</span>
            <span className="block text-xs text-white/65 tabular-nums">{status}</span>
          </button>
          <button type="button" onClick={toggleMic} aria-label={call.mic ? 'მიკროფონის გამორთვა' : 'მიკროფონის ჩართვა'}
            className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center cursor-pointer ${call.mic ? 'bg-white/12' : 'bg-white text-[#1c1513]'}`}>
            {call.mic ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>
          <button type="button" onClick={() => setCallSmall(false)} aria-label="ზარის გაშლა" className="w-11 h-11 shrink-0 rounded-full bg-white/12 flex items-center justify-center cursor-pointer">
            <Maximize2 className="w-5 h-5" />
          </button>
          <button type="button" onClick={hang} aria-label="გათიშვა" className="w-11 h-11 shrink-0 rounded-full bg-[#d6402f] flex items-center justify-center cursor-pointer">
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </>
    );
  }

  const me = {
    name: 'მე', photoURL: info.me.photoURL, stream: call.local, cam: call.cam, mic: call.mic,
    speaking: false, mirror: call.facing === 'user',
  };
  const one = info.oneToOne;
  const other = call.peers[0];
  const n = call.peers.length + 1;
  const many = n > 4;

  return (
    <div className="fixed inset-0 z-[90] bg-[#1c1513] text-white flex flex-col safe-top safe-bottom safe-x" role="dialog" aria-label={`ზარი: ${info.title}`}>
      {voices}
      <div className="shrink-0 flex items-center gap-2 px-3 sm:px-5 pt-3 pb-2">
        <button type="button" onClick={() => setCallSmall(true)} aria-label="ზარის დაპატარავება (ჩათის სანახავად)" title="დაპატარავება"
          className="w-10 h-10 shrink-0 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center cursor-pointer active:scale-95">
          <ChevronDown className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1 text-center pr-10">
          <h2 className="truncate text-base font-bold">{info.title}</h2>
          <p className="text-xs text-white/65 tabular-nums">{status}</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 px-3 sm:px-5 pb-3">
        {one ? (
          <div className="relative h-full">
            {other ? (
              <Tile {...label(other)} stream={other.stream} cam={other.cam} mic={other.mic} speaking={call.speaking.includes(other.uid)} className="h-full" />
            ) : (
              <div className="h-full flex items-center justify-center">
                <span className={`rounded-full ${call.status === 'waiting' ? 'animate-pulse' : ''}`}>
                  <Face name={info.title} photoURL={info.anonStaff ? logoUrl : undefined} className="w-28 h-28 text-5xl" />
                </span>
              </div>
            )}
            {call.cam && call.local && (
              <div className="absolute right-3 bottom-3 w-28 h-40 sm:w-40 sm:h-52 rounded-3xl shadow-2xl">
                <Tile {...me} className="h-full" />
              </div>
            )}
          </div>
        ) : (
          <div className={`h-full grid gap-2 ${n === 1 ? 'grid-cols-1' : n === 2 ? 'grid-cols-1 sm:grid-cols-2' : n <= 4 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'} ${
            many ? 'overflow-y-auto content-start' : 'auto-rows-fr'
          }`}>
            <Tile {...me} className={many ? 'aspect-[4/5] sm:aspect-video' : ''} />
            {call.peers.map(p => (
              <Tile key={p.uid} {...label(p)} stream={p.stream} cam={p.cam} mic={p.mic} speaking={call.speaking.includes(p.uid)}
                className={many ? 'aspect-[4/5] sm:aspect-video' : ''} />
            ))}
          </div>
        )}
      </div>

      {call.status === 'ended' ? (
        <div className="shrink-0 pb-6 flex justify-center">
          <button type="button" onClick={dismissCall} className="h-12 px-6 rounded-full bg-white/12 text-sm font-bold cursor-pointer">დახურვა</button>
        </div>
      ) : (
        <>
        {call.hint && (
          <p className="shrink-0 mx-auto mb-3 max-w-md px-4 py-2.5 rounded-2xl bg-white/10 text-center text-sm text-white/90" role="status">{call.hint}</p>
        )}
        <div className="shrink-0 pb-5 pt-1 flex items-center justify-center gap-3 sm:gap-4">
          <RoundBtn label={call.mic ? 'მიკროფონის გამორთვა' : 'მიკროფონის ჩართვა'} onClick={toggleMic} tone={call.mic ? 'plain' : 'off'}>
            {call.mic ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </RoundBtn>
          {info.canVideo && (
            <RoundBtn label={call.cam ? 'კამერის გამორთვა' : 'კამერის ჩართვა'} onClick={toggleCam} tone={call.cam ? 'plain' : 'off'}>
              {call.cam ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </RoundBtn>
          )}
          {call.cam && (
            <RoundBtn label="კამერის შებრუნება" onClick={flipCamera}>
              <SwitchCamera className="w-6 h-6" />
            </RoundBtn>
          )}
          <RoundBtn label="გათიშვა" onClick={hang} tone="red" big>
            <PhoneOff className="w-7 h-7" />
          </RoundBtn>
        </div>
        </>
      )}
    </div>
  );
};

// ---- the incoming call ------------------------------------------------------------------------------------

interface ClassCall { cls: SchoolClass; at: number; by: string; name: string; kind: 'audio' | 'video' }

const useClassCalls = (classes: SchoolClass[]) => {
  const [calls, setCalls] = useState<Record<string, ClassCall | null>>({});
  const key = classes.map(c => c.id).join(',');
  useEffect(() => {
    const offs = classes.map(c => onSnapshot(
      doc(db, 'classes', c.id, 'call', 'state'),
      s => {
        const d = s.data({ serverTimestamps: 'estimate' });
        const at = d?.at?.toMillis?.() ?? 0;
        const end = d?.end?.toMillis?.() ?? 0;
        setCalls(p => ({ ...p, [c.id]: d && at && end < at ? { cls: c, at, by: d.by || '', name: d.name || '', kind: d.kind === 'audio' ? 'audio' : 'video' } : null }));
      },
      () => {}
    ));
    return () => offs.forEach(o => o());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return Object.values(calls).filter((c): c is ClassCall => !!c);
};

// a soft two-note bell, every 2.5 s
const useRingTone = (on: boolean) => {
  useEffect(() => {
    if (!on) return;
    let ctx: AudioContext | null = null;
    try { ctx = new AudioContext(); } catch { return; }
    const bell = () => {
      if (!ctx) return;
      ctx.resume().catch(() => {});
      [659.25, 830.61].forEach((f, i) => {
        const o = ctx!.createOscillator();
        const g = ctx!.createGain();
        const t = ctx!.currentTime + i * 0.22;
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
        o.connect(g).connect(ctx!.destination);
        o.start(t);
        o.stop(t + 0.95);
      });
      try { navigator.vibrate?.([200, 100, 200]); } catch { /* no vibration */ }
    };
    bell();
    const t = setInterval(bell, 2500);
    return () => { clearInterval(t); ctx?.close().catch(() => {}); };
  }, [on]);
};

const Incoming: React.FC<{ logoUrl?: string }> = ({ logoUrl }) => {
  const { user, isAdmin, isTeacher } = useAuth();
  const { notes, programOpen, church } = useNotes();
  const call = useCall();
  const uid = user?.uid || '';
  const { threads } = useInbox(uid, isAdmin);
  const memberOf = useMyClasses(uid);
  const { classes: teaching } = useTeachingClasses(isTeacher ? uid : null);
  const classes = [...memberOf, ...teaching.filter(t => !memberOf.some(m => m.id === t.id))];
  const classCalls = useClassCalls(classes);
  const [gone, setGone] = useState<string[]>([]);
  const [, tick] = useState(0);
  // a ring stops by itself after 45 s
  useEffect(() => { const t = setInterval(() => tick(n => n + 1), 5000); return () => clearInterval(t); }, []);

  const inCall = call.info?.base;
  const ringing: DirectThread | undefined = user
    ? threads.find(t => isRinging(t, uid) && inCall !== `dms/${t.id}` && !gone.includes(`${t.id}:${t.callAt?.getTime()}`))
    : undefined;
  const classCall = classCalls.find(c =>
    c.by !== uid && inCall !== `classes/${c.cls.id}` && Date.now() - c.at < 3 * 3600_000 && !gone.includes(`${c.cls.id}:${c.at}`));
  const quiet = notes || programOpen || church || call.status !== 'idle';
  useRingTone(!quiet && (!!ringing || (!!classCall && Date.now() - classCall.at < RING_MS)));

  if (!user || (!ringing && !classCall)) return null;
  const hide = (k: string) => setGone(g => [...g, k]);

  const box = 'fixed z-[95] left-1/2 -translate-x-1/2 top-[calc(env(safe-area-inset-top)+12px)] w-[min(440px,calc(100%-24px))] rounded-[28px] bg-[#1c1513] text-white shadow-[0_14px_40px_rgba(0,0,0,0.4)] p-3 flex items-center gap-3';
  const small = 'w-12 h-12 shrink-0 rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition';

  if (ringing) {
    const fromAdmin = ringing.kind === 'admin';
    const o = otherOf(ringing, uid);
    const name = fromAdmin ? ADMIN_NAME : ringing.names[ringing.callBy] || o.name || 'ზარი';
    const k = `${ringing.id}:${ringing.callAt?.getTime()}`;
    const decline = () => { hide(k); declineChatCall(ringing); };
    const answer = () => { hide(k); answerChatCall(ringing, user); };
    const video = ringing.callKind === 'video';
    // like a phone: the whole screen (only a small silent bar over the notes during a service)
    if (!(notes || programOpen || church)) {
      return (
        <div className="fixed inset-0 z-[95] bg-[#1c1513]/[0.97] text-white flex flex-col items-center justify-between safe-top safe-bottom safe-x px-6 py-[12vh]"
          role="alertdialog" aria-label={`${name} გირეკავთ`}>
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="relative">
              <span className="absolute -inset-3 rounded-full bg-emerald-400/20 animate-ping" />
              <Face name={name} photoURL={fromAdmin ? logoUrl : ringing.photos[ringing.callBy]} className="relative w-32 h-32 text-5xl" />
            </span>
            <p className="mt-3 text-2xl font-bold">{name}</p>
            <p className="text-white/65">{video ? 'ვიდეოზარი…' : 'ზარი…'}</p>
          </div>
          <div className="flex items-start gap-20">
            <span className="flex flex-col items-center gap-2 text-sm text-white/80">
              <button type="button" aria-label="უარი" onClick={decline}
                className="w-[72px] h-[72px] rounded-full bg-[#d6402f] flex items-center justify-center cursor-pointer active:scale-95 transition">
                <PhoneOff className="w-8 h-8" />
              </button>
              უარი
            </span>
            <span className="flex flex-col items-center gap-2 text-sm text-white/80">
              <button type="button" aria-label="პასუხი" onClick={answer}
                className="w-[72px] h-[72px] rounded-full bg-emerald-500 flex items-center justify-center cursor-pointer active:scale-95 transition">
                {video ? <Video className="w-8 h-8" /> : <Phone className="w-8 h-8" />}
              </button>
              პასუხი
            </span>
          </div>
        </div>
      );
    }
    return (
      <div className={box} role="alertdialog" aria-label={`${name} გირეკავთ`}>
        <Face name={name} photoURL={fromAdmin ? logoUrl : ringing.photos[ringing.callBy]} className="w-12 h-12 text-lg" />
        <div className="flex-1 min-w-0">
          <p className="truncate font-bold">{name}</p>
          <p className="text-xs text-white/65">{ringing.callKind === 'video' ? 'ვიდეოზარი…' : 'გირეკავთ…'}</p>
        </div>
        <button type="button" aria-label="უარი" title="უარი" onClick={decline} className={`${small} bg-[#d6402f]`}>
          <PhoneOff className="w-5 h-5" />
        </button>
        <button type="button" aria-label="პასუხი" title="პასუხი" onClick={answer} className={`${small} bg-emerald-500`}>
          {video ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
        </button>
      </div>
    );
  }

  const c = classCall!;
  const k = `${c.cls.id}:${c.at}`;
  return (
    <div className={box} role="alertdialog" aria-label={`${c.cls.name}: ზარი მიმდინარეობს`}>
      <span className="relative w-12 h-12 shrink-0 rounded-full bg-[#7a2028] flex items-center justify-center">
        <Video className="w-5 h-5" />
        <span className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#1c1513] animate-pulse" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="truncate font-bold">{c.cls.name}</p>
        <p className="truncate text-xs text-white/65">კლასის ზარი{c.name ? ` · ${c.name}` : ''}</p>
      </div>
      <button type="button" aria-label="დამალვა" title="დამალვა" onClick={() => hide(k)} className="w-10 h-10 shrink-0 rounded-full bg-white/10 flex items-center justify-center cursor-pointer">
        <X className="w-5 h-5" />
      </button>
      <button type="button" onClick={() => { hide(k); joinClassCall(c.cls, user, 'audio'); }}
        className="h-12 px-4 shrink-0 rounded-full bg-emerald-500 font-bold text-sm cursor-pointer active:scale-95">
        შესვლა
      </button>
    </div>
  );
};

export const CallLayer: React.FC<{ logoUrl?: string }> = ({ logoUrl }) => (
  <>
    <CallScreen logoUrl={logoUrl} />
    <Incoming logoUrl={logoUrl} />
  </>
);
