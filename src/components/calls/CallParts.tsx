import React, { useEffect, useRef, useState } from 'react';
import { MicOff, ScreenShare } from 'lucide-react';

// The call screens' small parts in the new look: dark ground (`bg-ink`), light words (`text-night-ink`), tiles on
// `bg-night-surf`, the hang-up in `bg-danger`, the speaker's ring in `ring-gold`. Only the design tokens.

export const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export const useSeconds = (since: number, on: boolean) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [on]);
  return Math.max(0, (now - since) / 1000);
};

const GROUNDS = ['bg-sea', 'bg-leaf', 'bg-plum', 'bg-clay', 'bg-wine'];
const groundOf = (name: string) => GROUNDS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % GROUNDS.length];

export const Face: React.FC<{ name: string; photoURL?: string; className: string }> = ({ name, photoURL, className }) =>
  photoURL ? (
    <img src={photoURL} alt="" referrerPolicy="no-referrer" className={`${className} shrink-0 rounded-full object-cover`} />
  ) : (
    <span className={`${className} ${groundOf(name)} shrink-0 rounded-full text-night-ink font-bold flex items-center justify-center`}>{name.charAt(0) || '?'}</span>
  );

// a stream on its element, playing; back in the app (a phone may have stopped it meanwhile) it plays again —
// a picture is given its stream anew, since play() alone can leave iOS on a black frame
const usePlaying = (ref: React.RefObject<HTMLMediaElement | null>, stream: MediaStream, picture: boolean) => {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) { el.srcObject = stream; el.play().catch(() => {}); }
    const back = () => {
      if (document.visibilityState !== 'visible') return;
      if (picture) { el.srcObject = null; el.srcObject = stream; }
      el.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', back);
    return () => document.removeEventListener('visibilitychange', back);
  }, [ref, stream, picture]);
};

export const MediaVideo: React.FC<{ stream: MediaStream; mirror?: boolean; whole?: boolean }> = ({ stream, mirror, whole }) => {
  const ref = useRef<HTMLVideoElement>(null);
  usePlaying(ref, stream, true);
  return <video ref={ref} autoPlay playsInline muted className={`absolute inset-0 w-full h-full ${whole ? 'object-contain' : 'object-cover'} ${mirror ? '-scale-x-100' : ''}`} />;
};

export const MediaAudio: React.FC<{ stream: MediaStream }> = ({ stream }) => {
  const ref = useRef<HTMLAudioElement>(null);
  usePlaying(ref, stream, false);
  return <audio ref={ref} autoPlay />;
};

/** a shared screen, whole (never cut), with whose it is */
export const ScreenTile: React.FC<{ name: string; stream: MediaStream | null; mine?: boolean }> = ({ name, stream, mine }) => (
  <div className="relative h-full overflow-hidden rounded-tile bg-ink ring-1 ring-night-surf">
    {stream ? (
      <MediaVideo stream={stream} whole />
    ) : (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-night-ink/70">
        <ScreenShare className="w-10 h-10" />
        <p className="text-body font-semibold">{mine ? 'თქვენი ეკრანი ჩანს ყველასთვის' : 'ეკრანი იტვირთება…'}</p>
      </div>
    )}
    <span className="absolute left-2 bottom-2 max-w-[calc(100%-16px)] inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-ink/70 text-meta font-semibold text-night-ink">
      <ScreenShare className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{mine ? 'ჩემი ეკრანი' : `${name} — ეკრანი`}</span>
    </span>
  </div>
);

/** a person's tile: the camera, else the round avatar; the speaker is ringed in gold, a muted one carries a mark */
export const Tile: React.FC<{
  name: string; photoURL?: string; stream: MediaStream | null; cam: boolean; mic: boolean; speaking: boolean; mirror?: boolean; className?: string; small?: boolean;
}> = ({ name, photoURL, stream, cam, mic, speaking, mirror, className = '', small }) => (
  <div className={`relative overflow-hidden rounded-tile bg-night-surf transition-shadow ${speaking ? 'ring-[3px] ring-gold' : ''} ${className}`}>
    {stream && cam && stream.getVideoTracks().length > 0 ? (
      <MediaVideo stream={stream} mirror={mirror} />
    ) : (
      <div className="absolute inset-0 flex items-center justify-center">
        <Face name={name} photoURL={photoURL} className={small ? 'w-12 h-12 text-head' : 'w-20 h-20 sm:w-24 sm:h-24 text-hero'} />
      </div>
    )}
    <span className="absolute left-2 bottom-2 max-w-[calc(100%-16px)] inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-ink/60 text-cap font-semibold text-night-ink">
      <span className="truncate">{name}</span>
    </span>
    {!mic && (
      <span className="absolute right-2 bottom-2 w-7 h-7 rounded-full bg-ink/60 flex items-center justify-center text-blush" aria-label="მიკროფონი გამორთულია">
        <MicOff className="w-3.5 h-3.5" />
      </span>
    )}
  </div>
);

/** the round buttons at the bottom: `off` = switched off (light), `red` = hang up, `green` = on / answer */
export const RoundBtn: React.FC<{ label: string; onClick: () => void; tone?: 'plain' | 'off' | 'red' | 'green' | 'live'; big?: boolean; children: React.ReactNode }> = ({
  label, onClick, tone = 'plain', big, children,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`${big ? 'w-[76px] h-[76px]' : 'w-14 h-14'} shrink-0 rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition ${
      tone === 'red' ? 'bg-danger text-night-ink'
        : tone === 'green' ? 'bg-leaf text-night-ink'
        : tone === 'live' || tone === 'off' ? 'bg-night-ink text-ink'
        : 'bg-night-surf text-night-ink'
    }`}
  >
    {children}
  </button>
);
