import React, { useId } from 'react';
import { POLISH_PCT, VOICE_IDS, VOICE_NAMES, voiceBests } from '../../utils/pearls';
import type { PearlRecord, PearlState } from '../../utils/pearls';

// One pearl, drawn: matte and grey while new, lighter once tried, white with a rainbow lustre when polished, and
// with a gold glow and two sparks when a teacher has approved it. `golden`: polished in all three voices — a gold
// pearl (as the South Sea ones are).
const BODY: Record<PearlState, [string, string, string]> = {
  new: ['#ece5da', '#cdc1af', '#a99a85'],
  tried: ['#f6f1e9', '#e0d4c2', '#bba98f'],
  polished: ['#ffffff', '#f3eee9', '#cbbdb3'],
  shining: ['#ffffff', '#f8f1e7', '#d2bea2'],
};
const GOLD: [string, string, string] = ['#fff7e0', '#ecc96f', '#b07f2a'];

const Spark: React.FC<{ x: number; y: number; r: number }> = ({ x, y, r }) => (
  <path d={`M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`} fill="#e6b84a" />
);

export const PearlIcon: React.FC<{ state: PearlState; golden?: boolean; size?: number; className?: string }> = ({ state, golden, size = 56, className }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [hi, mid, lo] = golden ? GOLD : BODY[state];
  const lustre = state === 'polished' || state === 'shining' || golden;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <defs>
        <radialGradient id={`b${id}`} cx="38%" cy="32%" r="72%">
          <stop offset="0" stopColor={hi} />
          <stop offset="0.55" stopColor={mid} />
          <stop offset="1" stopColor={lo} />
        </radialGradient>
        <radialGradient id={`i${id}`} cx="66%" cy="72%" r="48%">
          <stop offset="0" stopColor="#f6c9d6" stopOpacity="0.85" />
          <stop offset="0.5" stopColor="#c9dcf2" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`g${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0.55" stopColor="#f3d27a" stopOpacity="0.75" />
          <stop offset="1" stopColor="#f3d27a" stopOpacity="0" />
        </radialGradient>
      </defs>
      {state === 'shining' && <circle cx="32" cy="32" r="31" fill={`url(#g${id})`} />}
      <ellipse cx="32" cy="55" rx="15" ry="3" fill="#4a3426" opacity={state === 'new' ? 0.08 : 0.12} />
      <circle cx="32" cy="31" r="21" fill={`url(#b${id})`} />
      {lustre && <circle cx="32" cy="31" r="21" fill={`url(#i${id})`} />}
      <ellipse cx="24.5" cy="22.5" rx="7" ry="4.2" transform="rotate(-32 24.5 22.5)" fill="#fff" opacity={state === 'new' ? 0.3 : 0.9} />
      {state === 'shining' && (
        <>
          <Spark x={52} y={11} r={5} />
          <Spark x={11} y={47} r={3.5} />
        </>
      )}
    </svg>
  );
};

/** Three dots under a pearl, one per voice: filled once polished in it, a ring once tried, pale until then (gold on a
 *  golden pearl). */
export const VoiceDots: React.FC<{ rec?: PearlRecord; golden?: boolean; className?: string }> = ({ rec, golden, className = 'mt-1' }) => {
  const b = voiceBests(rec);
  const title = VOICE_IDS.map(v => `${VOICE_NAMES[v]}: ${b[v] != null ? `${b[v]}%` : '—'}`).join(' · ');
  return (
    <span className={`flex items-center gap-[3px] ${className}`} title={title} aria-label={title}>
      {VOICE_IDS.map(v => {
        const n = b[v];
        const cls = golden ? 'bg-[#c9962a]'
          : n == null ? 'bg-[#e3d6c1]'
          : n >= POLISH_PCT ? 'bg-[#7a2028]'
          : 'bg-white ring-[1.5px] ring-inset ring-[#7a2028]/70';
        return <span key={v} className={`w-[7px] h-[7px] rounded-full ${cls}`} />;
      })}
    </span>
  );
};
