import React, { useEffect, useId, useRef, useState } from 'react';
import type { PearlState } from '../../utils/pathPearls';

// One pearl of „ნასწავლი“ (utils/pathPearls.ts), drawn (redrawn 2026-11-05, the user: „უფრო ლამაზი, მიმზიდველი და
// ეფექტური“): matte and sandy while new; white nacre with a pink-and-blue lustre, a sharp glint and a light under it once
// the member marked it (polished); champagne with a gold halo, sparks that twinkle now and then and a sheen that crosses it
// once a teacher confirmed it (shining). A pearl that has just moved up pops and a sheen sweeps over it. The motion lives in
// index.css (.sg-pearl…) and stops for „reduce motion“.

const RANK: Record<PearlState, number> = { new: 0, polished: 1, shining: 2 };

// the body, from the light side to the edge
const BODY: Record<PearlState, [string, string, string, string, string]> = {
  new: ['#ece6dc', '#ddd4c6', '#cfc4b3', '#bdb09c', '#a99b86'],
  polished: ['#ffffff', '#fbf8f6', '#e9e1df', '#cbbebd', '#a5979a'],
  shining: ['#fffef9', '#fff4dd', '#f2d9a3', '#dcb064', '#b3843a'],
};
// the pearl's body: a circle of R around (CX, CY)
const CX = 32, CY = 30, R = 24;

export const PEARL_WORDS: Record<PearlState, string> = {
  new: 'ჯერ არ არის ნასწავლი',
  polished: 'გაპრიალებული — შენ მონიშნე',
  shining: 'ბრწყინავს — მასწავლებელმა ჩათვალა',
};

/** A four-pointed spark. */
const Spark: React.FC<{ x: number; y: number; r: number; delay: number }> = ({ x, y, r, delay }) => (
  <path
    className="sg-pearl-spark"
    style={{ animationDelay: `${delay}s` }}
    d={`M${x} ${y - r}Q${x + r * 0.16} ${y - r * 0.16} ${x + r} ${y}Q${x + r * 0.16} ${y + r * 0.16} ${x} ${y + r}Q${x - r * 0.16} ${y + r * 0.16} ${x - r} ${y}Q${x - r * 0.16} ${y - r * 0.16} ${x} ${y - r}Z`}
    fill="#f2c24e"
  />
);

// a pearl's place in the list gives its twinkle its own moment, so a column of shining pearls doesn't blink as one
const delayOf = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 997;
  return (h % 40) / 10;
};

export const PearlIcon: React.FC<{
  state: PearlState;
  size?: number;
  className?: string;
  /** what gives the twinkle its own moment (the item's id); without it the pearl twinkles with the rest */
  seed?: string;
  /** a label for screen readers and the mouse; none = only a picture */
  label?: string;
}> = ({ state, size = 32, className = '', seed = '', label }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [hi, mid, low, deep, edge] = BODY[state];
  const lustre = state !== 'new';
  // a pearl that moves up while shown pops once (not on its first showing)
  const prev = useRef(state);
  const [pop, setPop] = useState(false);
  useEffect(() => {
    if (RANK[state] > RANK[prev.current]) {
      setPop(true);
      const t = window.setTimeout(() => setPop(false), 1300);
      prev.current = state;
      return () => window.clearTimeout(t);
    }
    prev.current = state;
  }, [state]);
  const delay = delayOf(seed);

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`sg-pearl ${state} ${pop ? 'is-pop' : ''} ${className}`}
      style={{ ['--sg-pearl-delay' as string]: `${delay}s` }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {label && <title>{label}</title>}
      <defs>
        <radialGradient id={`b${id}`} cx="38%" cy="32%" r="76%" fx="33%" fy="26%">
          <stop offset="0" stopColor={hi} />
          <stop offset="0.3" stopColor={mid} />
          <stop offset="0.62" stopColor={low} />
          <stop offset="0.86" stopColor={deep} />
          <stop offset="1" stopColor={edge} />
        </radialGradient>
        {/* nacre: rose to sky blue on the shadowed side, mint on the other */}
        <radialGradient id={`n${id}`} cx="72%" cy="76%" r="58%">
          <stop offset="0" stopColor={state === 'shining' ? '#ffb38a' : '#ff9cc0'} stopOpacity="0.6" />
          <stop offset="0.45" stopColor="#9cc8ff" stopOpacity="0.38" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`m${id}`} cx="18%" cy="66%" r="44%">
          <stop offset="0" stopColor={state === 'shining' ? '#fff0b0' : '#93e6cc'} stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`h${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`g${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0.42" stopColor="#ffe089" stopOpacity="0.9" />
          <stop offset="0.7" stopColor="#f6c344" stopOpacity="0.35" />
          <stop offset="1" stopColor="#f6c344" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`s${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`c${id}`}><circle cx={CX} cy={CY} r={R} /></clipPath>
      </defs>

      {state === 'shining' && <circle className="sg-pearl-halo" cx={CX} cy={CY} r="32" fill={`url(#g${id})`} />}
      <ellipse cx={CX} cy="58" rx="15" ry="3" fill="#4a3426" opacity={lustre ? 0.18 : 0.1} />
      <g opacity={lustre ? 1 : 0.9}>
        <circle cx={CX} cy={CY} r={R} fill={`url(#b${id})`} />
        {lustre && (
          <>
            <circle cx={CX} cy={CY} r={R} fill={`url(#n${id})`} />
            <circle cx={CX} cy={CY} r={R} fill={`url(#m${id})`} />
            {/* the light the pearl gives back under itself */}
            <ellipse cx="35.5" cy="46" rx="12.5" ry="4.6" fill={`url(#h${id})`} opacity="0.6" />
          </>
        )}
        {/* a fine edge, so a white pearl stands out on white */}
        <circle cx={CX} cy={CY} r={R - 0.4} fill="none" stroke={edge} strokeOpacity={lustre ? 0.45 : 0.3} strokeWidth="0.8" />
        {/* the window's light and its sharp glint */}
        <ellipse cx="23.5" cy="19.5" rx="9.5" ry="5.8" transform="rotate(-35 23.5 19.5)" fill={`url(#h${id})`} opacity={lustre ? 0.95 : 0.4} />
        <circle cx="21.2" cy="17.4" r={lustre ? 2.4 : 1.6} fill="#ffffff" opacity={lustre ? 1 : 0.5} />
      </g>
      {lustre && (
        <g clipPath={`url(#c${id})`}>
          <rect className="sg-pearl-sheen" x="-14" y="2" width="16" height="60" fill={`url(#s${id})`} />
        </g>
      )}
      {state === 'shining' && (
        <>
          <Spark x={54.5} y={8.5} r={6.5} delay={delay} />
          <Spark x={8.5} y={45} r={4.2} delay={delay + 1.3} />
          <Spark x={57} y={45.5} r={3.4} delay={delay + 2.4} />
        </>
      )}
    </svg>
  );
};
