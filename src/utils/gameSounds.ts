// The small sounds of the live games (games hub, 2026-10-28): the bell at the end of a minute („ამიხსენი“, „ცხელი
// ჩურჩხელა“) and the tick of a counting beat („გათვლა“). A phone lets Web Audio sound only on a context made or resumed
// by a touch, so a game opens its context in the tap that starts the round (openAudio) and keeps it in a ref until it
// unmounts (closeAudio). Every sound fails silently: the vibration and the screen say it too.

const Ctx = () => window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

export type AudioRef = { current: AudioContext | null };

/** makes (or wakes) the context — call it inside a tap */
export const openAudio = (ref: AudioRef) => {
  try {
    if (!ref.current) ref.current = new (Ctx())();
    if (ref.current.state === 'suspended') ref.current.resume().catch(() => { /* stays silent */ });
  } catch { /* no Web Audio */ }
  return ref.current;
};

export const closeAudio = (ref: AudioRef) => {
  ref.current?.close().catch(() => { /* gone */ });
  ref.current = null;
};

const tone = (ctx: AudioContext, at: number, freq: number, len: number, peak: number, type: OscillatorType) => {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.connect(g);
  g.connect(ctx.destination);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  o.start(at);
  o.stop(at + len + 0.02);
};

const wake = (ctx: AudioContext | null) => {
  if (!ctx) return null;
  if (ctx.state === 'suspended') ctx.resume().catch(() => { /* stays silent */ });
  return ctx;
};

/** three short tones — the minute is over, the music stopped */
export const bell = (ctx: AudioContext | null) => {
  try {
    const c = wake(ctx);
    if (!c) return;
    const now = c.currentTime;
    [0, 0.2, 0.4].forEach((t, i) => tone(c, now + t, i === 2 ? 1046.5 : 784, 0.18, 0.35, 'sine'));
  } catch { /* no audio */ }
};

/** one short click of a counting beat; the accent (the last beat) is higher and louder */
export const tick = (ctx: AudioContext | null, accent = false) => {
  try {
    const c = wake(ctx);
    if (!c) return;
    tone(c, c.currentTime, accent ? 1320 : 880, accent ? 0.12 : 0.05, accent ? 0.4 : 0.2, 'triangle');
  } catch { /* no audio */ }
};
