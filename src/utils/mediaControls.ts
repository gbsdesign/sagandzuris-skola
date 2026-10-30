// The phone's media controls — ▶/⏸ in the notification shade and on the lock screen — and sound that goes on while the
// app is in the background (the user's wish, 2026-10-30: a recording must not stop when they leave the app, and they
// stop it from the pull-down panel instead).
//
// Android's browser shows its media notification, and keeps a page sounding in the background, only for a playing
// <audio>/<video> element. The recording player (ChantPlayer) sends its sound through Web Audio (voices, pitch,
// waveform), which the browser does not count as media, so `keepAlive` plays a silent looping element beside it.
// The plain <audio> players (albums, a list's quick listen) are media already: `showInControls` only names them.
//
// Every player keeps `navigator.mediaSession.playbackState` true to what it does: main.tsx reads it, so a newer version
// of the site does not restart the page while a recording sounds in the background.

const ART = [{ src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' }];
const SCHOOL = 'საგანძურის სკოლა';

const session = (): MediaSession | null => (typeof navigator !== 'undefined' && 'mediaSession' in navigator ? navigator.mediaSession : null);

export const setPlaybackState = (state: MediaSessionPlaybackState) => {
  const ms = session();
  if (ms) ms.playbackState = state;
};

/** Is any recording of the site sounding now (also in the background)? */
export const recordingSounds = () => session()?.playbackState === 'playing';

// ---- the silent companion of the Web Audio player ------------------------------------------------------------------

let silentUrl = '';
// ten seconds of 8-bit mono silence (the browser names only media longer than five seconds), made once in the browser
const silence = () => {
  if (silentUrl) return silentUrl;
  const rate = 8000, n = rate * 10;
  const buf = new ArrayBuffer(44 + n);
  const v = new DataView(buf);
  const text = (at: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(at + i, s.charCodeAt(i)); };
  text(0, 'RIFF'); v.setUint32(4, 36 + n, true); text(8, 'WAVE');
  text(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  text(36, 'data'); v.setUint32(40, n, true);
  new Uint8Array(buf, 44).fill(128); // 8-bit samples: 128 is silence
  return (silentUrl = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })));
};

let keeper: HTMLAudioElement | null = null;
let owner: object | null = null;
let onStopped: (() => void) | null = null;
let pausing = false; // a pause asked for here, not by the phone

export const keepAlive = {
  /** Start beside a playing Web Audio player. `stopped` runs when the phone itself stops the sound (a call, another app). */
  start(who: object, stopped: () => void) {
    if (!keeper) {
      const a = new Audio();
      a.loop = true;
      a.onpause = () => {
        const mine = pausing;
        pausing = false;
        if (!mine) onStopped?.();
      };
      keeper = a;
    }
    owner = who;
    onStopped = stopped;
    if (!keeper.src) keeper.src = silence();
    if (keeper.paused) void keeper.play().catch(() => {});
  },
  /** Stop with its player (only the player that started it can) */
  stop(who: object) {
    if (owner !== who) return;
    owner = null;
    onStopped = null;
    if (keeper && !keeper.paused) { pausing = true; keeper.pause(); }
  },
};

// ---- the plain <audio> players -------------------------------------------------------------------------------------

let shown: HTMLAudioElement | null = null;

/** Name a plain <audio> player in the phone's controls and let them pause, play and seek it */
export const showInControls = (a: HTMLAudioElement, title: string, artist?: string) => {
  const ms = session();
  if (!ms) return;
  shown = a;
  try {
    ms.metadata = new MediaMetadata({ title, artist: artist || SCHOOL, album: SCHOOL, artwork: ART });
    ms.setActionHandler('play', () => { void a.play().catch(() => {}); });
    ms.setActionHandler('pause', () => a.pause());
    ms.setActionHandler('seekto', d => { if (d.seekTime != null) a.currentTime = d.seekTime; });
    ms.setActionHandler('seekbackward', d => { a.currentTime = Math.max(0, a.currentTime - (d.seekOffset || 10)); });
    ms.setActionHandler('seekforward', d => { a.currentTime = a.currentTime + (d.seekOffset || 10); });
  } catch { /* an older browser: the controls stay plain */ }
};

/** Take a plain player out of the controls (it stopped for good) */
export const hideFromControls = (a: HTMLAudioElement) => {
  const ms = session();
  if (!ms || shown !== a) return;
  shown = null;
  try {
    (['play', 'pause', 'seekto', 'seekbackward', 'seekforward'] as MediaSessionAction[]).forEach(k => ms.setActionHandler(k, null));
    ms.metadata = null;
    ms.playbackState = 'none';
  } catch { /* nothing to clear */ }
};

/** Keep the controls' ▶/⏸ and the „sounds now“ state true to a plain player */
export const followElement = (a: HTMLAudioElement) => {
  a.addEventListener('playing', () => { if (shown === a) setPlaybackState('playing'); });
  a.addEventListener('pause', () => { if (shown === a) setPlaybackState('paused'); });
  a.addEventListener('ended', () => { if (shown === a) setPlaybackState('paused'); });
};
