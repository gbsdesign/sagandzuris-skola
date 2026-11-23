import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Loader2, Pause, Play, Piano } from 'lucide-react';
import { Stepper } from './parts';
import {
  instrName, renderNotes, shapeMelody, soundingSeconds, stepTone, toneLabel, TONE_MAX, TONE_MIN, type Melody,
} from '../../../utils/melody';
import { playNotes, wakeSound, type Playback } from '../../../utils/melodyPlay';
import { encodeMp3, saveBlob } from '../../../utils/chantSynth';
import { WAVE_BARS } from '../../../utils/voiceRecorder';
import { SpeedPill } from './SpeedPill';

const MelodyKeys = React.lazy(() => import('./MelodyKeys'));

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * A melody from the chat's keyboard (2026-11-23): it plays from its notes on this phone, so its tone (− +) and pace move without
 * spoiling it — for the sender and the receiver alike; ⬇ saves it as an MP3 (in the tone and pace set), 🎹 opens it on the
 * keys (lit as it plays, a part looped, „მიყევი“ — the student plays it after the keys).
 */
export const MelodyBubble: React.FC<{
  mel: Melody;
  wave: string;
  onDark?: boolean;
  meta?: React.ReactNode;
  /** the stored MP3 (saved as it is when tone and pace are untouched) */
  getUrl: () => Promise<string>;
  fileName: string;
}> = ({ mel, wave, onDark, meta, getUrl, fileName }) => {
  const [tone, setTone] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [saving, setSaving] = useState(false);
  const [keysOpen, setKeysOpen] = useState(false);
  const play = useRef<Playback | null>(null);
  const prevSpeed = useRef(speed);
  const notes = useMemo(() => shapeMelody(mel, tone, speed), [mel, tone, speed]);
  const total = soundingSeconds(notes);

  const stop = () => { play.current?.stop(); play.current = null; setPlaying(false); };
  useEffect(() => () => play.current?.stop(), []);
  // a new tone or pace while it plays: it goes on from the same place in the melody
  useEffect(() => {
    const at = (pos * prevSpeed.current) / speed;
    prevSpeed.current = speed;
    setPos(p => (p ? at : 0));
    if (!play.current) return;
    play.current.stop();
    start(at);
  }, [tone, speed]); // eslint-disable-line react-hooks/exhaustive-deps

  function start(from = 0) {
    setPlaying(true);
    play.current = playNotes(notes, mel.i, {
      from,
      onFrame: t => setPos(t),
      onEnd: () => { play.current = null; setPlaying(false); setPos(0); },
      onStop: () => { play.current = null; setPlaying(false); },
    });
  }
  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    wakeSound();
    if (playing) { stop(); return; }
    start(pos >= total ? 0 : pos);
  };
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    const at = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * total;
    setPos(at);
    if (play.current) { play.current.stop(); start(at); }
  };

  const download = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (saving) return;
    setSaving(true);
    try {
      if (tone === 0 && speed === 1) {
        saveBlob(await (await fetch(await getUrl())).blob(), `${fileName}.mp3`);
      } else {
        const buf = await renderNotes(notes, mel.i);
        saveBlob(await encodeMp3(buf, undefined, 96), `${fileName} (ტონი ${toneLabel(tone)}, ${Math.round(speed * 100)}%).mp3`);
      }
    } catch (err) { console.warn('melody save: ', err); }
    setSaving(false);
  };

  const levels = (wave.length === WAVE_BARS ? wave : '4'.repeat(WAVE_BARS)).split('').map(Number);
  const done = total ? pos / total : 0;
  const small = `flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition active:scale-90 [&_svg]:size-[18px] ${
    onDark ? 'bg-white/20 text-white' : 'bg-soft text-wine'
  }`;

  return (
    <div className="w-[260px] max-w-full" onClick={e => e.stopPropagation()}>
      <p className={`mb-1 flex items-center gap-1.5 text-cap font-bold ${onDark ? 'text-white/90' : 'text-wine'}`}>
        <Piano className="size-4" aria-hidden="true" /> მელოდია · {instrName(mel.i)}
      </p>
      <div className="flex items-center gap-2.5">
        <button type="button" onClick={toggle} aria-label={playing ? 'პაუზა' : 'მოსმენა'}
          className={`flex size-tap shrink-0 cursor-pointer items-center justify-center rounded-full transition active:scale-95 ${onDark ? 'bg-surf text-wine' : 'bg-wine text-white'}`}>
          {playing ? <Pause className="size-5" fill="currentColor" /> : <Play className="size-5 translate-x-px" fill="currentColor" />}
        </button>
        <div className="min-w-0 flex-1">
          <div onClick={seek} className="flex h-7 cursor-pointer items-center gap-[2px]" aria-hidden="true">
            {levels.map((v, i) => (
              <span key={i} className={`flex-1 rounded-full ${(i + 0.5) / levels.length <= done ? (onDark ? 'bg-white' : 'bg-wine') : (onDark ? 'bg-white/40' : 'bg-wine/25')}`}
                style={{ height: `${18 + v * 9}%` }} />
            ))}
          </div>
          <p className={`mt-0.5 flex items-center justify-between gap-2 text-cap leading-none tabular-nums ${onDark ? 'text-white/80' : 'text-mut'}`}>
            <span>{playing || pos ? `${clock(pos)} / ${clock(total)}` : clock(total)}</span>
            {meta}
          </p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Stepper small dark={onDark} label="ტონი" value={toneLabel(tone)} onMinus={() => setTone(t => stepTone(t, -1))} onPlus={() => setTone(t => stepTone(t, 1))}
          minusOff={tone <= TONE_MIN} plusOff={tone >= TONE_MAX} />
        <span className="flex-1" />
        <SpeedPill value={speed} onChange={setSpeed} dark={onDark} />
        <button type="button" onClick={download} aria-label="ჩამოტვირთვა MP3" title="ჩამოტვირთვა MP3" className={small}>
          {saving ? <Loader2 className="animate-spin" /> : <Download />}
        </button>
        <button type="button" onClick={e => { e.stopPropagation(); stop(); setKeysOpen(true); }} aria-label="კლავიშებზე ნახვა" title="კლავიშებზე" className={small}>
          <Piano />
        </button>
      </div>
      {keysOpen && (
        <React.Suspense fallback={null}>
          <MelodyKeys mel={mel} tone={tone} speed={speed} onTone={setTone} onSpeed={setSpeed} onClose={() => setKeysOpen(false)} />
        </React.Suspense>
      )}
    </div>
  );
};
