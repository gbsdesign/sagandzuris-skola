import React, { useEffect, useState } from 'react';
import { ChevronDown, MessageCircle, Mic, MicOff, Phone, PhoneOff, ScreenShare, ScreenShareOff, SwitchCamera, Video, VideoOff, X } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context';
import { useNotes } from '../../context/NotesContext';
import { useNavigation } from '../../context/NavigationContext';
import { useMyClasses, useTeachingClasses } from '../../hooks/useClasses';
import type { SchoolClass } from '../../hooks/useClasses';
import { useInbox, isRinging, ADMIN_SHOWN, otherOf, DirectThread } from '../../hooks/useDirectChat';
import {
  useCall, useLivePeers, leaveCall, dismissCall, toggleMic, toggleCam, toggleScreen, flipCamera, setCallSmall, canShareScreen,
  RemotePeer, RING_MS,
} from '../../utils/callSession';
import { afterLeave, answerChatCall, declineChatCall, joinClassCall, takeAnswer, useAnswerWanted } from './callActions';
import { clock, useSeconds, Face, MediaVideo, MediaAudio, ScreenTile, Tile, RoundBtn } from './CallParts';
import { useBackToClose } from '../../utils/backToClose';

// The call on top of the app (new look): the full call screen (or a small bar while one reads the chat), and the incoming
// call — a private one rings, a class's shows „ზარი მიმდინარეობს“. Nothing sounds while the notes, the liturgy
// program or church mode is open: the choir reads the notes during the service.

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

  // the phone's back makes the full call screen small (the call goes on), or closes the „ended“ note
  const big = !!call.info && call.status !== 'idle' && !(call.small && call.status !== 'ended');
  useBackToClose(big, () => { if (call.status === 'ended') dismissCall(); else setCallSmall(true); });

  const info = call.info;
  if (!info || call.status === 'idle') return null;

  const label = (p: RemotePeer) => (info.anonStaff && p.staff ? { name: ADMIN_SHOWN, photoURL: logoUrl } : { name: p.name || 'უსახელო', photoURL: p.photoURL });
  const hang = async () => {
    const others = call.peers.length;
    // still „ირეკება…“ / alone: nobody came (the Worker only tells the phones of a call this one started)
    const unanswered = call.status === 'waiting' || call.status === 'connecting';
    await leaveCall();
    afterLeave(info, others, unanswered);
  };
  const one = info.oneToOne;
  const other = call.peers[0];
  const video = call.cam || !!other?.cam;
  const isClass = info.base.startsWith('classes/');
  const n = call.peers.length + 1;
  const status = call.status === 'connecting' ? 'ერთდება…'
    : call.status === 'ended' ? call.note || 'ზარი დასრულდა.'
    : call.status === 'waiting' ? (one ? 'ირეკება…' : `მარტო ხართ · ${clock(secs)}`)
    : one ? `${video ? 'ვიდეოზარი' : 'ზარი'} · ${clock(secs)}`
    : isClass ? `${info.title} · ${n} ადამიანი · ${clock(secs)}`
    : `${n} მონაწილე · ${clock(secs)}`;
  const heading = !one && isClass ? 'კლასის ზარი' : info.title;

  // remote voices keep playing while the screen is small
  const voices = call.peers.filter(p => p.stream).map(p => <MediaAudio key={p.uid} stream={p.stream!} />);

  if (call.small && call.status !== 'ended') {
    return (
      <>
        {voices}
        <div className="fixed z-[90] left-1/2 -translate-x-1/2 top-[calc(env(safe-area-inset-top)+10px)] w-[min(440px,calc(100%-24px))] rounded-full bg-wine text-night-ink shadow-float flex items-center gap-2 pl-4 pr-1.5 py-1.5">
          <span className="w-2.5 h-2.5 shrink-0 rounded-full bg-gold animate-pulse" />
          <button type="button" onClick={() => setCallSmall(false)} className="flex-1 min-w-0 text-left cursor-pointer min-h-tap">
            <span className="block truncate text-body font-bold">{heading}</span>
            <span className="block truncate text-cap text-night-ink/70 tabular-nums">{call.status === 'live' ? `ზარი მიდის · ${clock(secs)}` : status}</span>
          </button>
          <button type="button" onClick={() => setCallSmall(false)} aria-label="ზარის გაშლა"
            className="px-3.5 h-tap shrink-0 rounded-full bg-night-ink/15 flex items-center justify-center cursor-pointer text-body font-bold">
            გაშლა
          </button>
          <button type="button" onClick={toggleMic} aria-label={call.mic ? 'მიკროფონის გამორთვა' : 'მიკროფონის ჩართვა'}
            className={`w-tap h-tap shrink-0 rounded-full flex items-center justify-center cursor-pointer ${call.mic ? 'bg-night-ink/15' : 'bg-night-ink text-ink'}`}>
            {call.mic ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>
          <button type="button" onClick={hang} aria-label="გათიშვა" className="w-tap h-tap shrink-0 rounded-full bg-danger flex items-center justify-center cursor-pointer">
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </>
    );
  }

  const me = {
    name: 'შენ', photoURL: info.me.photoURL, stream: call.local, cam: call.cam, mic: call.mic,
    speaking: false, mirror: call.facing === 'user',
  };
  // a shared screen takes the room when someone else shares; my own share is the strip „შენი ეკრანი ჩანს ყველასთვის“
  const sharing = call.peers.find(p => p.screen);
  const screen = sharing ? { name: label(sharing).name, stream: sharing.screenStream, mine: false } : null;
  const otherLabel = other ? label(other) : { name: info.title, photoURL: info.anonStaff ? logoUrl : undefined };
  const showVideo = !!(other?.stream && other.cam && other.stream.getVideoTracks().length > 0);
  const roundBtn = 'w-tap h-tap shrink-0 rounded-full bg-night-surf flex items-center justify-center cursor-pointer active:scale-95';

  return (
    <div className={`fixed inset-0 z-[90] ${one && video ? 'bg-gradient-to-b from-night-surf to-ink' : 'bg-ink'} text-night-ink flex flex-col safe-top safe-bottom safe-x`} role="dialog" aria-label={`ზარი: ${info.title}`}>
      {voices}
      {one && showVideo && <div className="absolute inset-0"><MediaVideo stream={other!.stream!} /></div>}
      <div className="relative shrink-0 flex items-center gap-2 px-4 pt-3 pb-2">
        <button type="button" onClick={() => setCallSmall(true)} aria-label="ზარის დაპატარავება (ჩათის სანახავად)" title="დაპატარავება" className={roundBtn}>
          <ChevronDown className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <h2 className="truncate text-lead font-bold">{heading}</h2>
          <p className="truncate text-meta text-night-ink/70 tabular-nums">{status}</p>
        </div>
        {call.cam ? (
          <button type="button" onClick={flipCamera} aria-label="კამერის შებრუნება" title="კამერის შებრუნება" className={roundBtn}>
            <SwitchCamera className="w-5 h-5" />
          </button>
        ) : <span className="w-tap shrink-0" />}
      </div>

      <div className="relative flex-1 min-h-0 px-4 pb-3">
        {screen ? (
          <div className="h-full flex flex-col gap-2">
            <div className="flex-1 min-h-0">
              <ScreenTile {...screen} />
            </div>
            <div className="shrink-0 flex gap-2 overflow-x-auto pb-1">
              <Tile {...me} small className="w-24 h-24 sm:w-32 sm:h-32 shrink-0" />
              {call.peers.map(p => (
                <Tile key={p.uid} {...label(p)} small stream={p.stream} cam={p.cam} mic={p.mic} speaking={call.speaking.includes(p.uid)}
                  className="w-24 h-24 sm:w-32 sm:h-32 shrink-0" />
              ))}
            </div>
          </div>
        ) : one ? (
          <div className="relative h-full">
            {!showVideo && (
              <div className="h-full flex flex-col items-center justify-start pt-[8vh] text-center gap-4">
                <span className={`rounded-full ${call.status === 'waiting' ? 'animate-pulse' : ''}`}>
                  <Face name={otherLabel.name} photoURL={otherLabel.photoURL} className="w-32 h-32 text-hero" />
                </span>
                <p className="text-title font-bold max-w-full truncate">{otherLabel.name}</p>
              </div>
            )}
            {call.cam && call.local && (
              <div className="absolute right-0 top-0 w-24 h-36 rounded-tile shadow-lift">
                <Tile {...me} className="h-full" />
              </div>
            )}
          </div>
        ) : (
          <div className={`h-full grid gap-2.5 ${n === 1 ? 'grid-cols-1' : n <= 4 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'} p-1 overflow-y-auto content-start auto-rows-[minmax(132px,1fr)]`}>
            {call.peers.map(p => (
              <Tile key={p.uid} {...label(p)} stream={p.stream} cam={p.cam} mic={p.mic} speaking={call.speaking.includes(p.uid)}
                className="min-h-[132px]" />
            ))}
            <Tile {...me} className="min-h-[132px]" />
          </div>
        )}
      </div>

      {call.status === 'ended' ? (
        <div className="relative shrink-0 pb-6 flex justify-center">
          <button type="button" onClick={dismissCall} className="h-tap-lg px-6 rounded-full bg-night-surf text-body font-bold cursor-pointer">დახურვა</button>
        </div>
      ) : (
        <>
        {call.hint && (
          <p className="relative shrink-0 mx-auto mb-3 max-w-md px-4 py-2.5 rounded-field bg-night-surf text-center text-body" role="status">{call.hint}</p>
        )}
        {call.screen && (
          <div className="relative shrink-0 mx-4 mb-3 flex items-center gap-3 rounded-tile bg-night-surf px-4 py-2.5">
            <ScreenShare className="w-5 h-5 shrink-0" />
            <p className="flex-1 min-w-0 text-body font-semibold">შენი ეკრანი ჩანს ყველასთვის</p>
            <button type="button" onClick={toggleScreen} className="h-icon px-4 shrink-0 rounded-full bg-night-ink text-ink text-body font-bold cursor-pointer active:scale-95">შეწყვეტა</button>
          </div>
        )}
        <div className="relative shrink-0 pb-5 pt-1 flex items-center justify-center gap-3 sm:gap-4">
          <RoundBtn label={call.mic ? 'მიკროფონის გამორთვა' : 'მიკროფონის ჩართვა'} onClick={toggleMic} tone={call.mic ? 'plain' : 'off'}>
            {call.mic ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </RoundBtn>
          {info.canVideo && (
            <RoundBtn label={call.cam ? 'კამერის გამორთვა' : 'კამერის ჩართვა'} onClick={toggleCam} tone="plain">
              {call.cam ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </RoundBtn>
          )}
          <RoundBtn label="გათიშვა" onClick={hang} tone="red" big>
            <PhoneOff className="w-8 h-8" />
          </RoundBtn>
          {canShareScreen() && (
            <RoundBtn label={call.screen ? 'ეკრანის გაზიარების შეწყვეტა' : 'ეკრანის გაზიარება'} onClick={toggleScreen} tone={call.screen ? 'live' : 'plain'}>
              {call.screen ? <ScreenShareOff className="w-6 h-6" /> : <ScreenShare className="w-6 h-6" />}
            </RoundBtn>
          )}
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

// Android lets a page make a sound only after a tap: the bell's AudioContext is made and woken by the first touch or
// key anywhere in the app, so an incoming call later rings out loud (a context made at ring time stays silent there).
let bellCtx: AudioContext | null = null;
if (typeof window !== 'undefined') {
  const unlock = () => {
    try {
      bellCtx ??= new AudioContext();
      void bellCtx.resume();
      if (bellCtx.state === 'running') ['pointerdown', 'keydown', 'touchend'].forEach(e => window.removeEventListener(e, unlock, true));
    } catch { /* no sound on this browser */ }
  };
  ['pointerdown', 'keydown', 'touchend'].forEach(e => window.addEventListener(e, unlock, true));
}

// a soft two-note bell, every 2.5 s (and the phone vibrates with it)
const useRingTone = (on: boolean) => {
  useEffect(() => {
    if (!on) return;
    let ctx: AudioContext | null = bellCtx;
    const own = !ctx;
    if (!ctx) { try { ctx = new AudioContext(); } catch { return; } }
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
    return () => { clearInterval(t); if (own) ctx?.close().catch(() => {}); try { navigator.vibrate?.(0); } catch { /* none */ } };
  }, [on]);
};

const Incoming: React.FC<{ logoUrl?: string }> = ({ logoUrl }) => {
  const { user, isAdmin, isTeacher } = useAuth();
  const { notes, programOpen, church } = useNotes();
  const call = useCall();
  const { openDm } = useNavigation();
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
  const candidate = classCalls.find(c =>
    c.by !== uid && inCall !== `classes/${c.cls.id}` && Date.now() - c.at < 3 * 3600_000 && !gone.includes(`${c.cls.id}:${c.at}`));
  // a class's call shows only while someone is in it (a phone that started it and fell off never says „ended“)
  const inClassCall = useLivePeers(candidate ? `classes/${candidate.cls.id}` : null);
  const classCall = candidate && (Date.now() - candidate.at < RING_MS || inClassCall.length > 0) ? candidate : undefined;
  const quiet = notes || programOpen || church || call.status !== 'idle';
  useRingTone(!quiet && (!!ringing || (!!classCall && Date.now() - classCall.at < RING_MS)));

  // „პასუხი“ on the phone's ring opened the app: answered here as soon as the call is seen
  const wanted = useAnswerWanted();
  useEffect(() => {
    if (!user || !wanted) return;
    if (ringing && takeAnswer(`dms/${ringing.id}`)) {
      setGone(g => [...g, `${ringing.id}:${ringing.callAt?.getTime()}`]);
      answerChatCall(ringing, user);
    } else if (classCall && takeAnswer(`classes/${classCall.cls.id}`)) {
      setGone(g => [...g, `${classCall.cls.id}:${classCall.at}`]);
      joinClassCall(classCall.cls, user, 'audio');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, wanted, ringing?.id, classCall?.cls.id]);

  if (!user || (!ringing && !classCall)) return null;
  const hide = (k: string) => setGone(g => [...g, k]);

  const box = 'fixed z-[95] left-1/2 -translate-x-1/2 top-[calc(env(safe-area-inset-top)+12px)] w-[min(440px,calc(100%-24px))] rounded-card bg-ink text-night-ink shadow-float p-3 flex items-center gap-3';
  const small = 'w-tap h-tap shrink-0 rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition';

  if (ringing) {
    const fromAdmin = ringing.kind === 'admin';
    const o = otherOf(ringing, uid);
    const name = fromAdmin ? ADMIN_SHOWN : ringing.names[ringing.callBy] || o.name || 'ზარი';
    const k = `${ringing.id}:${ringing.callAt?.getTime()}`;
    const decline = () => { hide(k); declineChatCall(ringing); };
    const answer = () => { hide(k); answerChatCall(ringing, user); };
    // „ვერ ვპასუხობ — მივწერ“: the ring is declined and the chat opens
    const writeBack = () => { decline(); openDm(ringing.id); };
    const video = ringing.callKind === 'video';
    // like a phone: the whole screen (only a small silent bar over the notes during a service)
    if (!(notes || programOpen || church)) {
      return (
        <div className="fixed inset-0 z-[95] bg-ink text-night-ink flex flex-col items-center justify-between pl-[calc(1.5rem+env(safe-area-inset-left,0px))] pr-[calc(1.5rem+env(safe-area-inset-right,0px))] pt-[calc(12vh+env(safe-area-inset-top,0px))] pb-[calc(2rem+env(safe-area-inset-bottom,0px))]"
          role="alertdialog" aria-label={`${name} გირეკავთ`}>
          <div className="flex flex-col items-center gap-3 text-center max-w-full">
            <span className="relative">
              <span className="absolute -inset-3 rounded-full bg-leaf/25 animate-ping" />
              <Face name={name} photoURL={fromAdmin ? logoUrl : ringing.photos[ringing.callBy]} className="relative w-32 h-32 text-hero" />
            </span>
            <p className="mt-4 text-title font-bold max-w-full truncate">{name}</p>
            <p className="text-body text-night-ink/70">{video ? 'გირეკავს · ვიდეოზარი' : 'გირეკავს · ხმოვანი ზარი'}</p>
          </div>
          <div className="flex flex-col items-center gap-8 w-full">
            <button type="button" onClick={writeBack}
              className="h-tap px-5 rounded-full bg-night-surf text-body font-bold flex items-center gap-2 cursor-pointer active:scale-95 transition">
              <MessageCircle className="w-4 h-4 shrink-0" />
              ვერ ვპასუხობ — მივწერ
            </button>
            <div className="flex items-start gap-20">
              <span className="flex flex-col items-center gap-2 text-meta text-night-ink/80">
                <button type="button" aria-label="უარი" onClick={decline}
                  className="w-[68px] h-[68px] rounded-full bg-danger text-night-ink flex items-center justify-center cursor-pointer active:scale-95 transition">
                  <PhoneOff className="w-7 h-7" />
                </button>
                უარი
              </span>
              <span className="flex flex-col items-center gap-2 text-meta text-night-ink/80">
                <button type="button" aria-label="პასუხი" onClick={answer}
                  className="w-[68px] h-[68px] rounded-full bg-leaf text-night-ink flex items-center justify-center cursor-pointer active:scale-95 transition">
                  {video ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
                </button>
                პასუხი
              </span>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className={box} role="alertdialog" aria-label={`${name} გირეკავთ`}>
        <Face name={name} photoURL={fromAdmin ? logoUrl : ringing.photos[ringing.callBy]} className="w-12 h-12 text-head" />
        <div className="flex-1 min-w-0">
          <p className="truncate font-bold">{name}</p>
          <p className="text-cap text-night-ink/70">{ringing.callKind === 'video' ? 'ვიდეოზარი…' : 'გირეკავთ…'}</p>
        </div>
        <button type="button" aria-label="უარი" title="უარი" onClick={decline} className={`${small} bg-danger`}>
          <PhoneOff className="w-5 h-5" />
        </button>
        <button type="button" aria-label="პასუხი" title="პასუხი" onClick={answer} className={`${small} bg-leaf`}>
          {video ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
        </button>
      </div>
    );
  }

  const c = classCall!;
  const k = `${c.cls.id}:${c.at}`;
  return (
    <div className={box} role="alertdialog" aria-label={`${c.cls.name}: ზარი მიმდინარეობს`}>
      <span className="relative w-12 h-12 shrink-0 rounded-full bg-wine flex items-center justify-center">
        <Video className="w-5 h-5" />
        <span className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-gold ring-2 ring-ink animate-pulse" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="truncate font-bold">{c.cls.name}</p>
        <p className="truncate text-cap text-night-ink/70">კლასის ზარი{c.name ? ` · ${c.name}` : ''}</p>
      </div>
      <button type="button" aria-label="დამალვა" title="დამალვა" onClick={() => hide(k)} className={`${small} bg-night-surf`}>
        <X className="w-5 h-5" />
      </button>
      <button type="button" onClick={() => { hide(k); joinClassCall(c.cls, user, 'audio'); }}
        className="h-tap px-4 shrink-0 rounded-full bg-leaf text-night-ink font-bold text-body cursor-pointer active:scale-95">
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
