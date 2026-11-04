import React, { useEffect, useState } from 'react';
import { pitchName } from '../../../utils/eqo';
import { playLessonNotes } from '../../../utils/chantSynth';
import { triggerHaptic } from '../../../utils/haptics';
import { useSounding } from '../rounds/useSnippet';

// „ექო“'s keyboard: a bar a pitch of the melody, low to high and long to short like a xylophone's, each its own colour and
// named დო რე მი. A tap sounds its note; while the phrase sounds on this phone the keys rest, and at the first level each one
// lights up as its note sounds (useLit, from the screen's piece — rounds/useSnippet.ts `useSounding`).

export const KEY_TINT = ['#b23a48', '#cf7428', '#b08a12', '#4f8a3c', '#24827e', '#2b5f8a', '#5b3f8c', '#8a3a78'];

/** a key's own note, short, on the lesson synthesizer */
export const sound = (midi: number) => { void playLessonNotes([[0, 0.42, midi]]); };

/** the phrase sounding on this phone: whether it is on, and the note sounding this moment (MIDI) */
export const useLit = () => {
  const s = useSounding();
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (!s) return;
    let raf = 0;
    const loop = () => { setNow(performance.now()); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [s]);
  if (!s) return { on: false, midi: null as number | null };
  const t = (now - s.t0) / 1000;
  const n = s.notes.find(([at, len]) => t >= at && t < at + len);
  return { on: true, midi: n ? n[2] : null };
};

export const Keys: React.FC<{
  keys: readonly number[];
  /** the key lit now */
  lit?: number;
  /** a tap's answer, a moment on its key: right or wrong (`n` tells two taps of one key apart) */
  flash?: { key: number; ok: boolean; n: number } | null;
  disabled?: boolean;
  onTap?: (i: number) => void;
  size?: 'md' | 'sm';
}> = ({ keys, lit = -1, flash = null, disabled, onTap, size = 'md' }) => {
  const tall = size === 'md' ? 156 : 104;
  const short = size === 'md' ? 104 : 70;
  const step = keys.length > 1 ? (tall - short) / (keys.length - 1) : 0;
  return (
    <div className="flex items-end justify-center gap-1.5" role="group" aria-label="კლავიშები">
      {keys.map((m, i) => {
        const on = lit === i;
        const f = flash && flash.key === i ? flash : null;
        const style: React.CSSProperties = {
          height: `${Math.round(tall - step * i)}px`,
          background: KEY_TINT[i % KEY_TINT.length],
          boxShadow: on
            ? `0 0 0 4px ${KEY_TINT[i % KEY_TINT.length]}55, 0 6px 18px ${KEY_TINT[i % KEY_TINT.length]}aa`
            : f ? `0 0 0 4px ${f.ok ? '#2f7d4f' : '#d97706'}` : '0 3px 0 rgba(0,0,0,0.22)',
          filter: on ? 'brightness(1.35) saturate(1.1)' : undefined,
          transform: on ? 'translateY(-4px) scale(1.04)' : undefined,
        };
        const body = (
          <>
            <span className="absolute top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/45" aria-hidden="true" />
            <span className={`absolute ${size === 'md' ? 'bottom-2.5' : 'bottom-1.5'} inset-x-0 text-center font-serif-ge ${size === 'md' ? 'text-[14px]' : 'text-[12px]'} font-bold leading-none text-white`}>
              {pitchName(m)}
            </span>
          </>
        );
        const cls = `relative flex-1 min-w-0 ${size === 'md' ? 'max-w-[4.5rem]' : 'max-w-[3rem]'} rounded-2xl transition-[transform,filter,box-shadow] duration-100`;
        if (!onTap) return <span key={m} style={style} className={cls} aria-label={pitchName(m)}>{body}</span>;
        return (
          <button
            key={m}
            type="button"
            disabled={disabled}
            onPointerDown={e => { if (disabled || e.button > 0) return; e.preventDefault(); triggerHaptic(6); sound(m); onTap(i); }}
            onKeyDown={e => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); sound(m); onTap(i); } }}
            aria-label={pitchName(m)}
            style={style}
            className={`${cls} cursor-pointer active:translate-y-[2px] disabled:cursor-default disabled:opacity-60`}
          >
            {body}
          </button>
        );
      })}
    </div>
  );
};

/** the taps so far, a dot a note of the phrase: filled in its key's colour and name, the rest waiting */
export const Taps: React.FC<{ keys: readonly number[]; taps: readonly number[]; length: number; wrongFrom?: number }> = ({ keys, taps, length, wrongFrom = -1 }) => (
  <ol className="flex flex-wrap justify-center gap-1" aria-label={`${taps.length} / ${length}`}>
    {Array.from({ length }, (_, i) => {
      const k = taps[i];
      const bad = wrongFrom >= 0 && i >= wrongFrom && k !== undefined;
      return k === undefined ? (
        <li key={i} className="w-9 h-9 rounded-full border border-dashed border-[#cdb998] bg-[#f6efe2]" />
      ) : (
        <li
          key={i}
          className={`w-9 h-9 rounded-full flex items-center justify-center font-serif-ge text-[12px] font-bold text-white ${bad ? 'ring-2 ring-amber-500 ring-offset-1' : ''}`}
          style={{ background: KEY_TINT[k % KEY_TINT.length] }}
        >
          {pitchName(keys[k])}
        </li>
      );
    })}
  </ol>
);
