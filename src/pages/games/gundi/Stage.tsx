import React, { useEffect, useRef } from 'react';
import { ROLES, ROLE_NAMES, type Role } from '../../../utils/gundi';
import { triggerHaptic } from '../../../utils/haptics';

// „ჩემი გუნდი“'s stage: a little theatre — a wine curtain, a vine garland, a wooden floor — with three singers standing at
// the back (მთქმელი and ბანი in a chokha, მოძახილი in a kaba) and three players sitting in front (ტაში and ფანდური in a
// kaba, დოლი in a chokha). One who is out stands grey; one who is in has their colours and a light on them. The figures
// move by the music: a singer's mouth opens on their notes (a ♪ rises at each new one), hands clap, the drummer's hands hit,
// the panduri's hand strums, and everyone in sways a little on the beat. The picture moves without React (the frame loop
// sets attributes on its parts); a transparent button over each figure lets it in or out.

export interface StageProbe {
  beat: number;
  busy: Record<Role, boolean>;
  /** the drum's last stroke, for which hand */
  stroke?: 'dum' | 'tek';
}

interface Look { coat: string; dark: string; trim: string; hat: string }
export const LOOK: Record<Role, Look> = {
  mtqmeli: { coat: '#7a2028', dark: '#5c161d', trim: '#e2c27a', hat: '#2a1d16' },
  modzakhili: { coat: '#2b5f8a', dark: '#1f4769', trim: '#e2c27a', hat: '#3a2440' },
  bani: { coat: '#3b2a20', dark: '#291c15', trim: '#cdbb99', hat: '#6e6157' },
  tashi: { coat: '#2f7d4f', dark: '#22603c', trim: '#e2c27a', hat: '#5b2140' },
  doli: { coat: '#8a5a2b', dark: '#6b431e', trim: '#e9dcc4', hat: '#2a1d16' },
  panduri: { coat: '#a8452f', dark: '#863522', trim: '#e2c27a', hat: '#24394f' },
};
const GREY: Look = { coat: '#d6cdc1', dark: '#c4baad', trim: '#ebe4d9', hat: '#b9afa3' };
const SKIN = '#f0cfae', SKIN_OFF = '#e6dccf', HAIR = '#4a3022', HAIR_OFF = '#bfb3a6', BOOT = '#2a1d16', BOOT_OFF = '#b3a99c';

const MAN: Role[] = ['mtqmeli', 'bani', 'doli'];

/** where each one stands (x of the feet's middle, y of the feet, scale) */
const PLACE: Record<Role, { x: number; y: number; s: number; seated: boolean }> = {
  mtqmeli: { x: 75, y: 178, s: 0.9, seated: false },
  modzakhili: { x: 180, y: 176, s: 0.9, seated: false },
  bani: { x: 285, y: 178, s: 0.9, seated: false },
  tashi: { x: 72, y: 236, s: 0.95, seated: true },
  doli: { x: 180, y: 238, s: 0.95, seated: true },
  panduri: { x: 288, y: 236, s: 0.95, seated: true },
};

interface Parts { body: SVGGElement | null; mouth: SVGEllipseElement | null; handL: SVGGElement | null; handR: SVGGElement | null; notes: SVGGElement | null }

/** the head: a man with a papakhi and a moustache, a woman with braids, a headband and a white veil (drawn behind) */
const Head: React.FC<{ man: boolean; look: Look; on: boolean; y: number; mouth: (el: SVGEllipseElement | null) => void }> = ({ man, look, on, y, mouth }) => {
  const skin = on ? SKIN : SKIN_OFF, hair = on ? HAIR : HAIR_OFF;
  return (
    <g>
      <rect x={-4} y={y + 9} width={8} height={9} fill={skin} />
      {!man && <path d={`M-12 ${y - 6} C -20 ${y + 12}, -22 ${y + 30}, -21 ${y + 40} L 21 ${y + 40} C 22 ${y + 30}, 20 ${y + 12}, 12 ${y - 6} Z`} fill={on ? '#fbf8f2' : '#efe9df'} opacity={0.92} />}
      <circle cx={-11.5} cy={y + 1} r={2.6} fill={skin} />
      <circle cx={11.5} cy={y + 1} r={2.6} fill={skin} />
      <circle cx={0} cy={y} r={11.5} fill={skin} />
      {man ? (
        <>
          {/* papakhi: a tall fur hat, its curls along the bottom */}
          <path d={`M-12.5 ${y - 7} L -13 ${y - 22} Q 0 ${y - 27} 13 ${y - 22} L 12.5 ${y - 7} Z`} fill={look.hat} />
          <path d={`M-13 ${y - 7} q 2.2 2.6 4.4 0 q 2.2 2.6 4.4 0 q 2.2 2.6 4.4 0 q 2.2 2.6 4.4 0 q 2.2 2.6 4.4 0 q 2.2 2.6 4.4 0`} fill={look.hat} />
          <path d={`M-9 ${y - 18} q 2 -1.5 4 0 M-1 ${y - 20} q 2 -1.5 4 0 M6 ${y - 17} q 2 -1.5 4 0 M-6 ${y - 12} q 2 -1.5 4 0 M3 ${y - 12} q 2 -1.5 4 0`} stroke={on ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.3)'} strokeWidth={1} fill="none" />
          <path d={`M-6.5 ${y + 5.2} Q -3 ${y + 3.2} 0 ${y + 4.6} Q 3 ${y + 3.2} 6.5 ${y + 5.2} Q 3.5 ${y + 6.4} 0 ${y + 5.8} Q -3.5 ${y + 6.4} -6.5 ${y + 5.2} Z`} fill={hair} />
        </>
      ) : (
        <>
          <path d={`M-11.6 ${y + 1} Q -12 ${y - 12} 0 ${y - 12} Q 12 ${y - 12} 11.6 ${y + 1} Q 9 ${y - 6} 0 ${y - 7} Q -9 ${y - 6} -11.6 ${y + 1} Z`} fill={hair} />
          {/* the braids over the shoulders */}
          <path d={`M-9.5 ${y + 6} Q -12 ${y + 22} -10 ${y + 40}`} stroke={hair} strokeWidth={3.4} strokeLinecap="round" fill="none" />
          <path d={`M9.5 ${y + 6} Q 12 ${y + 22} 10 ${y + 40}`} stroke={hair} strokeWidth={3.4} strokeLinecap="round" fill="none" />
          <circle cx={-10} cy={y + 40} r={1.6} fill={look.trim} />
          <circle cx={10} cy={y + 40} r={1.6} fill={look.trim} />
          {/* the headband (ჩიხტი) and its beads */}
          <rect x={-11.5} y={y - 14.5} width={23} height={5.5} rx={2.2} fill={look.hat} />
          {[-7.5, -2.5, 2.5, 7.5].map(x => <circle key={x} cx={x} cy={y - 11.8} r={0.9} fill={look.trim} />)}
        </>
      )}
      {/* brows, eyes, cheeks and the mouth that sings */}
      <path d={`M-6.6 ${y - 3.6} q 2.2 -1.4 4.2 0 M2.4 ${y - 3.6} q 2.2 -1.4 4.2 0`} stroke={hair} strokeWidth={1.1} fill="none" strokeLinecap="round" />
      <ellipse cx={-4.4} cy={y - 0.6} rx={1.25} ry={1.5} fill="#2a1d16" />
      <ellipse cx={4.4} cy={y - 0.6} rx={1.25} ry={1.5} fill="#2a1d16" />
      <circle cx={-7} cy={y + 3.5} r={2.2} fill="#e8987e" opacity={on ? 0.35 : 0} />
      <circle cx={7} cy={y + 3.5} r={2.2} fill="#e8987e" opacity={on ? 0.35 : 0} />
      <ellipse ref={mouth} cx={0} cy={y + 7.6} rx={2.4} ry={0.8} fill={on ? '#7c2e26' : '#a99d90'} />
    </g>
  );
};

/** a sleeve and its hand; the hand is its own group so it can move */
const Arm: React.FC<{ d: string; hand: [number, number]; look: Look; on: boolean; refHand?: (el: SVGGElement | null) => void }> = ({ d, hand, look, on, refHand }) => (
  <g>
    <path d={d} fill={look.coat} stroke={look.dark} strokeWidth={0.8} strokeLinejoin="round" />
    <g ref={refHand}><circle cx={hand[0]} cy={hand[1]} r={3.6} fill={on ? SKIN : SKIN_OFF} /></g>
  </g>
);

/** the coat's upper part from the shoulders (y = w - 34) to the waist (y = w): a chokha with its gazyri, or a kaba's bodice */
const Torso: React.FC<{ man: boolean; look: Look; on: boolean; w: number }> = ({ man, look, on, w }) => (
  <g>
    <path d={`M-19 ${w - 32} Q -20 ${w - 35} -15 ${w - 35} L 15 ${w - 35} Q 20 ${w - 35} 19 ${w - 32} L ${man ? 16 : 13} ${w} L ${man ? -16 : -13} ${w} Z`} fill={look.coat} />
    {man ? (
      <>
        <path d={`M-8 ${w - 35} L 0 ${w - 10} L 8 ${w - 35} Z`} fill={on ? '#efe4cf' : '#e6dfd4'} />
        <path d={`M-8 ${w - 35} L 0 ${w - 10} L 8 ${w - 35}`} fill="none" stroke={look.dark} strokeWidth={0.8} />
        {[0, 1, 2, 3, 4].map(i => (
          <g key={i}>
            <rect x={9.6 + i * 1.9} y={w - 30 + i * 0.4} width={1.3} height={9} rx={0.6} fill={on ? '#efe6d4' : '#ece6dc'} />
            <rect x={-10.9 - i * 1.9} y={w - 30 + i * 0.4} width={1.3} height={9} rx={0.6} fill={on ? '#efe6d4' : '#ece6dc'} />
          </g>
        ))}
        <rect x={-16.5} y={w - 2.5} width={33} height={4.5} rx={1} fill={on ? '#241812' : '#bdb3a7'} />
        <rect x={-3} y={w - 3} width={6} height={5.5} rx={1} fill={on ? '#cfc8b8' : '#dcd5ca'} />
      </>
    ) : (
      <>
        <path d={`M-6.5 ${w - 34} L 6.5 ${w - 34} L 5 ${w - 3} L -5 ${w - 3} Z`} fill={look.trim} opacity={on ? 0.32 : 0.5} />
        {[0, 1, 2, 3, 4, 5].map(i => (
          <g key={i}>
            <circle cx={-2.6} cy={w - 30 + i * 4.6} r={0.95} fill={on ? look.trim : '#e7e0d6'} />
            <circle cx={2.6} cy={w - 30 + i * 4.6} r={0.95} fill={on ? look.trim : '#e7e0d6'} />
          </g>
        ))}
        <rect x={-13.5} y={w - 3} width={27} height={4} rx={1.5} fill={on ? look.trim : '#e2dbd0'} />
      </>
    )}
  </g>
);

/** below the waist: a standing chokha's skirt and boots, a kaba to the floor, or sitting on a bench */
const Lower: React.FC<{ man: boolean; look: Look; on: boolean; seated: boolean; w: number }> = ({ man, look, on, seated, w }) => {
  const boot = on ? BOOT : BOOT_OFF;
  if (seated) {
    return (
      <g>
        <rect x={-24} y={w + 10} width={48} height={6} rx={2} fill={on ? '#8a5a2b' : '#cbbfae'} />
        <rect x={-21} y={w + 16} width={4} height={30} fill={on ? '#6b431e' : '#bcb09f'} />
        <rect x={17} y={w + 16} width={4} height={30} fill={on ? '#6b431e' : '#bcb09f'} />
        {man ? (
          <>
            <rect x={-12} y={w + 18} width={8.5} height={30} rx={2} fill={boot} />
            <rect x={3.5} y={w + 18} width={8.5} height={30} rx={2} fill={boot} />
            <path d={`M-16 ${w} L 16 ${w} L 23 ${w + 22} Q 0 ${w + 27} -23 ${w + 22} Z`} fill={look.coat} />
            <path d={`M0 ${w + 2} L 0 ${w + 24}`} stroke={look.dark} strokeWidth={0.8} />
          </>
        ) : (
          <>
            <path d={`M-13 ${w} L 13 ${w} L 26 ${w + 46} Q 0 ${w + 50} -26 ${w + 46} Z`} fill={look.coat} />
            <path d={`M-25.4 ${w + 44} Q 0 ${w + 48.6} 25.4 ${w + 44}`} stroke={look.trim} strokeWidth={1.6} fill="none" opacity={on ? 1 : 0.6} />
          </>
        )}
      </g>
    );
  }
  return man ? (
    <g>
      <rect x={-12} y={w + 48} width={9} height={30} rx={2} fill={boot} />
      <rect x={3} y={w + 48} width={9} height={30} rx={2} fill={boot} />
      <path d={`M-16 ${w} L 16 ${w} L 25 ${w + 58} Q 0 ${w + 62} -25 ${w + 58} Z`} fill={look.coat} />
      <path d={`M0 ${w + 2} L 0 ${w + 59}`} stroke={look.dark} strokeWidth={0.9} />
      <path d={`M-24.4 ${w + 56} Q 0 ${w + 60.4} 24.4 ${w + 56}`} stroke={look.trim} strokeWidth={1.2} fill="none" opacity={on ? 0.8 : 0.5} />
    </g>
  ) : (
    <g>
      <path d={`M-13 ${w} L 13 ${w} L 27 ${w + 75} Q 0 ${w + 80} -27 ${w + 75} Z`} fill={look.coat} />
      <path d={`M-26.2 ${w + 72} Q 0 ${w + 77} 26.2 ${w + 72}`} stroke={look.trim} strokeWidth={1.8} fill="none" opacity={on ? 1 : 0.6} />
      {/* the sash's ends down the front */}
      <path d={`M-2 ${w + 1} L -4.5 ${w + 34} M2 ${w + 1} L 4.5 ${w + 30}`} stroke={on ? look.trim : '#e2dbd0'} strokeWidth={2} strokeLinecap="round" />
    </g>
  );
};

/** the drum on the lap: a cylinder across, its laces in a zigzag */
const Doli: React.FC<{ on: boolean; w: number }> = ({ on, w }) => (
  <g>
    <rect x={-19} y={w + 1} width={38} height={17} rx={2} fill={on ? '#c98a3e' : '#d8cdbd'} />
    <path d={`M-19 ${w + 1} ${[...Array(8)].map((_, i) => `L ${-19 + (i + 0.5) * 4.75} ${w + (i % 2 ? 1 : 18)}`).join(' ')} L 19 ${w + 1}`} stroke={on ? '#f5e6c8' : '#ece4d6'} strokeWidth={0.9} fill="none" />
    <ellipse cx={-19} cy={w + 9.5} rx={3.6} ry={8.6} fill={on ? '#f3e3c3' : '#ece4d6'} stroke={on ? '#8a5a2b' : '#c9bfb1'} strokeWidth={1} />
    <ellipse cx={19} cy={w + 9.5} rx={3.6} ry={8.6} fill={on ? '#f3e3c3' : '#ece4d6'} stroke={on ? '#8a5a2b' : '#c9bfb1'} strokeWidth={1} />
  </g>
);

/** the panduri across the body: its pear-shaped body at the right hip, the neck to the left shoulder */
const Panduri: React.FC<{ on: boolean; w: number }> = ({ on, w }) => (
  <g transform={`rotate(36 10 ${w + 4})`}>
    <rect x={-40} y={w + 1.9} width={44} height={4.2} rx={1.2} fill={on ? '#6b431e' : '#cbbfae'} />
    <path d={`M-47 ${w + 1} L -39 ${w + 1.6} L -39 ${w + 6.4} L -47 ${w + 7} Z`} fill={on ? '#4a2e17' : '#bdb2a3'} />
    {[-45, -42].map(x => <g key={x}><circle cx={x} cy={w - 0.2} r={1.1} fill={on ? '#e2c27a' : '#ddd5c9'} /><circle cx={x} cy={w + 8.2} r={1.1} fill={on ? '#e2c27a' : '#ddd5c9'} /></g>)}
    <path d={`M0 ${w + 4} C 2 ${w - 7}, 22 ${w - 8}, 25 ${w + 4} C 22 ${w + 16}, 2 ${w + 15}, 0 ${w + 4} Z`} fill={on ? '#b8732f' : '#d9cebf'} stroke={on ? '#7b4a1d' : '#c4b9aa'} strokeWidth={1} />
    <circle cx={9} cy={w + 4} r={2.6} fill={on ? '#4a2e17' : '#bdb2a3'} />
    <rect x={18} y={w + 1} width={2} height={6} rx={0.8} fill={on ? '#4a2e17' : '#bdb2a3'} />
    {[-1.2, 0, 1.2].map(dy => <path key={dy} d={`M-40 ${w + 4 + dy * 0.7} L 19 ${w + 4 + dy}`} stroke={on ? '#f5e6c8' : '#efe8dd'} strokeWidth={0.45} />)}
  </g>
);

/** one performer, drawn in their own place */
const Figure: React.FC<{ role: Role; on: boolean; parts: (p: Partial<Parts>) => void }> = ({ role, on, parts }) => {
  const { x, y, s, seated } = PLACE[role];
  const man = MAN.includes(role);
  const look = on ? LOOK[role] : GREY;
  const w = seated ? -48 : -78; // the waist
  const sh = w - 33;            // the shoulders
  const hy = w - 50;            // the head's middle
  let arms: React.ReactNode;
  if (role === 'tashi') {
    // forearms up, the hands before the chest ready to clap
    arms = (
      <>
        <Arm d={`M-18 ${sh} Q -25 ${sh + 14} -21 ${sh + 26} L -9 ${sh + 16} L -12 ${sh + 12} L -15 ${sh + 17} Q -17 ${sh + 9} -12 ${sh} Z`} hand={[-8.5, sh + 13]} look={look} on={on} refHand={el => parts({ handL: el })} />
        <Arm d={`M18 ${sh} Q 25 ${sh + 14} 21 ${sh + 26} L 9 ${sh + 16} L 12 ${sh + 12} L 15 ${sh + 17} Q 17 ${sh + 9} 12 ${sh} Z`} hand={[8.5, sh + 13]} look={look} on={on} refHand={el => parts({ handR: el })} />
      </>
    );
  } else if (role === 'doli') {
    arms = (
      <>
        <Arm d={`M-18 ${sh} Q -27 ${sh + 14} -24 ${sh + 30} L -18 ${sh + 30} Q -18 ${sh + 14} -12 ${sh} Z`} hand={[-20.5, w - 1]} look={look} on={on} refHand={el => parts({ handL: el })} />
        <Arm d={`M18 ${sh} Q 27 ${sh + 14} 24 ${sh + 30} L 18 ${sh + 30} Q 18 ${sh + 14} 12 ${sh} Z`} hand={[20.5, w - 1]} look={look} on={on} refHand={el => parts({ handR: el })} />
      </>
    );
  } else if (role === 'panduri') {
    // the left hand on the neck, the right one strums at the body
    arms = (
      <>
        <Arm d={`M-18 ${sh} Q -24 ${sh + 8} -22 ${sh + 15} L -16 ${sh + 17} Q -17 ${sh + 9} -12 ${sh} Z`} hand={[-19, sh + 15]} look={look} on={on} refHand={el => parts({ handL: el })} />
        <Arm d={`M18 ${sh} Q 26 ${sh + 16} 19 ${sh + 33} L 13 ${sh + 31} Q 18 ${sh + 15} 12 ${sh} Z`} hand={[14.5, sh + 34]} look={look} on={on} refHand={el => parts({ handR: el })} />
      </>
    );
  } else {
    arms = (
      <>
        <Arm d={`M-18.5 ${sh} Q -25 ${sh + 14} -25.5 ${sh + 30} L -19 ${sh + 31} Q -19 ${sh + 14} -12 ${sh} Z`} hand={[-22.3, sh + 33]} look={look} on={on} />
        <Arm d={`M18.5 ${sh} Q 25 ${sh + 14} 25.5 ${sh + 30} L 19 ${sh + 31} Q 19 ${sh + 14} 12 ${sh} Z`} hand={[22.3, sh + 33]} look={look} on={on} />
      </>
    );
  }
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {on && <ellipse cx={0} cy={-2} rx={34} ry={7} fill="url(#gundi-spot)" />}
      <g ref={el => parts({ body: el })}>
        <Lower man={man} look={look} on={on} seated={seated} w={w} />
        <Torso man={man} look={look} on={on} w={w} />
        <Head man={man} look={look} on={on} y={hy} mouth={el => parts({ mouth: el })} />
        {role === 'doli' && <Doli on={on} w={w} />}
        {role === 'panduri' && <Panduri on={on} w={w} />}
        {arms}
      </g>
      <g ref={el => parts({ notes: el })} />
    </g>
  );
};

/** one performer alone, in their colours on their light (`on`) or grey: the print kit's cards draw it (src/print/games/chemi-gundi.js) */
export const FigureCard: React.FC<{ role: Role; on?: boolean }> = ({ role, on = true }) => {
  const { x, y, seated } = PLACE[role];
  const h = seated ? 128 : 150;
  return (
    <svg viewBox={`${x - 48} ${y + 8 - h} 96 ${h}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="gundi-spot">
          <stop offset="0" stopColor="#fff4c8" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff4c8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <Figure role={role} on={on} parts={() => undefined} />
    </svg>
  );
};

/** the curtain, the garland and the floor */
const Scenery: React.FC = () => (
  <g>
    <defs>
      <linearGradient id="gundi-wall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fbf3e2" />
        <stop offset="1" stopColor="#f1e1c4" />
      </linearGradient>
      <linearGradient id="gundi-floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#d2a873" />
        <stop offset="1" stopColor="#b8864f" />
      </linearGradient>
      <radialGradient id="gundi-spot">
        <stop offset="0" stopColor="#fff4c8" stopOpacity="0.95" />
        <stop offset="1" stopColor="#fff4c8" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="gundi-velvet" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#5c161d" />
        <stop offset="0.5" stopColor="#8a2731" />
        <stop offset="1" stopColor="#5c161d" />
      </linearGradient>
    </defs>
    <rect width={360} height={260} fill="url(#gundi-wall)" />
    <rect y={170} width={360} height={90} fill="url(#gundi-floor)" />
    {[180, 192, 207, 225, 246].map(y => <path key={y} d={`M0 ${y} L 360 ${y}`} stroke="#a3743f" strokeWidth={0.8} opacity={0.55} />)}
    {[40, 110, 180, 250, 320].map(x => <path key={x} d={`M${180 + (x - 180) * 0.62} 170 L ${x} 260`} stroke="#a3743f" strokeWidth={0.6} opacity={0.35} />)}
    <path d="M0 170 L 360 170" stroke="#8f6232" strokeWidth={1.4} />
    {/* the vine across the wall */}
    <path d="M24 33 C 70 18, 110 42, 150 28 S 230 20, 270 32 S 320 40, 338 27" stroke="#7a5a3a" strokeWidth={1.8} fill="none" />
    {[[48, 26, -20], [92, 31, 25], [134, 31, -15], [178, 25, 20], [222, 25, -25], [262, 31, 15], [306, 34, -20]].map(([x, y, r]) => (
      <g key={x} transform={`translate(${x} ${y}) rotate(${r})`}>
        <path d="M0 0 C -6 -2, -9 -8, -6 -12 C -3 -9, 0 -12, 0 -12 C 0 -12, 3 -9, 6 -12 C 9 -8, 6 -2, 0 0 Z" fill="#6f8f3f" />
        <path d="M0 0 L 0 -10" stroke="#55702c" strokeWidth={0.6} />
      </g>
    ))}
    {[[70, 30], [158, 31], [244, 28], [328, 33]].map(([x, y]) => (
      <g key={x} fill="#6a2c4e">
        {[[0, 0], [3.2, 0], [-3.2, 0], [1.6, 2.8], [-1.6, 2.8], [0, 5.6]].map(([dx, dy], i) => <circle key={i} cx={x + dx} cy={y + 3 + dy} r={1.9} />)}
      </g>
    ))}
    {/* the curtain's valance and its sides */}
    <path d="M0 0 L 360 0 L 360 12 Q 345 20 330 12 Q 315 20 300 12 Q 285 20 270 12 Q 255 20 240 12 Q 225 20 210 12 Q 195 20 180 12 Q 165 20 150 12 Q 135 20 120 12 Q 105 20 90 12 Q 75 20 60 12 Q 45 20 30 12 Q 15 20 0 12 Z" fill="#7a2028" />
    <path d="M0 12 Q 15 20 30 12 Q 45 20 60 12 Q 75 20 90 12 Q 105 20 120 12 Q 135 20 150 12 Q 165 20 180 12 Q 195 20 210 12 Q 225 20 240 12 Q 255 20 270 12 Q 285 20 300 12 Q 315 20 330 12 Q 345 20 360 12" stroke="#c9a24b" strokeWidth={1.4} fill="none" />
    <path d="M0 0 L 24 0 Q 18 70 26 150 Q 14 158 0 176 Z" fill="url(#gundi-velvet)" />
    <path d="M360 0 L 336 0 Q 342 70 334 150 Q 346 158 360 176 Z" fill="url(#gundi-velvet)" />
    <circle cx={22} cy={150} r={3.2} fill="#c9a24b" />
    <circle cx={338} cy={150} r={3.2} fill="#c9a24b" />
  </g>
);

const NS = 'http://www.w3.org/2000/svg';

export const StageView: React.FC<{
  on: Record<Role, boolean>;
  labels: Partial<Record<Role, string>>;
  probe: () => StageProbe | null;
  onTap?: (role: Role) => void;
  /** a performer the class does live: a gold label */
  live?: Partial<Record<Role, boolean>>;
  /** the class comes in at the next pass: a gold ring round the label */
  coming?: Partial<Record<Role, boolean>>;
  /** a small sign before the name (who does the part: 📱 or the class) */
  badges?: Partial<Record<Role, React.ReactNode>>;
}> = ({ on, labels, probe, onTap, live, coming, badges }) => {
  const parts = useRef<Record<string, Partial<Parts>>>({});
  const probeRef = useRef(probe);
  probeRef.current = probe;
  const onRef = useRef(on);
  onRef.current = on;

  useEffect(() => {
    let raf = 0;
    const last: Partial<Record<Role, boolean>> = {};
    const lastNote: Partial<Record<Role, number>> = {};
    const frame = () => {
      const p = probeRef.current();
      const beatPhase = p ? p.beat % 1 : 0;
      const sway = p ? Math.max(0, 1 - beatPhase * 4) : 0;
      for (const role of ROLES) {
        const el = parts.current[role];
        if (!el) continue;
        const isOn = onRef.current[role];
        const busy = !!(p && isOn && p.busy[role]);
        el.body?.setAttribute('transform', isOn && p ? `translate(0 ${(-1.6 * sway).toFixed(2)})` : '');
        if (el.mouth) el.mouth.setAttribute('ry', busy && MOUTH_SINGS.includes(role) ? '2.5' : '0.8');
        if (role === 'tashi') {
          el.handL?.setAttribute('transform', busy ? 'translate(4.2 0)' : '');
          el.handR?.setAttribute('transform', busy ? 'translate(-4.2 0)' : '');
        } else if (role === 'doli') {
          const hand = p?.stroke === 'tek' ? el.handL : el.handR;
          const other = p?.stroke === 'tek' ? el.handR : el.handL;
          hand?.setAttribute('transform', busy ? 'translate(0 3.4)' : 'translate(0 -2)');
          other?.setAttribute('transform', 'translate(0 -2)');
        } else if (role === 'panduri') {
          el.handR?.setAttribute('transform', busy ? 'translate(1.5 3.2)' : '');
        }
        // a ♪ rises from a singer at each new note
        if (MOUTH_SINGS.includes(role) && el.notes) {
          if (busy && !last[role] && (lastNote[role] ?? 0) < performance.now() - 280) {
            lastNote[role] = performance.now();
            const t = document.createElementNS(NS, 'text');
            t.textContent = '♪';
            t.setAttribute('x', String(10 + Math.random() * 6));
            t.setAttribute('y', String(PLACE[role].seated ? -98 : -128));
            t.setAttribute('class', 'gundi-note');
            t.setAttribute('fill', LOOK[role].coat);
            el.notes.appendChild(t);
            window.setTimeout(() => t.remove(), 1300);
          }
        }
        last[role] = busy;
      }
      raf = window.requestAnimationFrame(frame);
    };
    raf = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const set = (role: Role) => (p: Partial<Parts>) => { parts.current[role] = { ...parts.current[role], ...p }; };

  return (
    <div className="relative w-full overflow-hidden rounded-3xl ring-1 ring-[#e0cfb2] shadow-[0_2px_10px_rgba(74,52,38,0.12)] select-none" style={{ aspectRatio: '360 / 260' }}>
      <svg viewBox="0 0 360 260" className="absolute inset-0 w-full h-full" aria-hidden="true">
        <Scenery />
        {(['mtqmeli', 'modzakhili', 'bani', 'tashi', 'doli', 'panduri'] as Role[]).map(role => (
          <Figure key={`${role}-${on[role] ? 1 : 0}`} role={role} on={on[role]} parts={set(role)} />
        ))}
      </svg>
      {ROLES.map(role => {
        const back = !PLACE[role].seated;
        const col = ['mtqmeli', 'tashi'].includes(role) ? 0 : ['modzakhili', 'doli'].includes(role) ? 1 : 2;
        const label = labels[role] ?? ROLE_NAMES[role];
        const isLive = !!live?.[role];
        const isComing = !!coming?.[role];
        return (
          <button
            key={role}
            type="button"
            disabled={!onTap}
            aria-pressed={on[role]}
            aria-label={`${ROLE_NAMES[role]} — ${on[role] ? 'გაჩუმება' : 'შემოყვანა'}`}
            onClick={() => { triggerHaptic(8); onTap?.(role); }}
            className={`absolute flex ${back ? 'items-start pt-[6.5%]' : 'items-end pb-[1.5%]'} justify-center rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7a2028]/60 ${onTap ? 'cursor-pointer' : 'cursor-default'}`}
            style={{ left: `${col * 33.333}%`, width: '33.333%', top: back ? '0%' : '56%', height: back ? '56%' : '44%' }}
          >
            <span className={`max-w-[94%] inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-bold leading-tight shadow-sm ${
              isComing ? 'bg-[#fbf6ec] text-[#7a5a18] ring-2 ring-[#c9a24b] animate-pulse'
                : isLive ? 'bg-[#c9a24b] text-[#3b2a20] ring-2 ring-[#fbf6ec]'
                : on[role] ? 'bg-[#fbf6ec]/95 text-[#4a3426]' : 'bg-white/70 text-[#8a7d70]'}`}>
              {badges?.[role] && <span className="shrink-0 flex" aria-hidden="true">{badges[role]}</span>}
              <span className="truncate">{label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
};

/** the ones whose mouth opens (the players keep theirs shut) */
const MOUTH_SINGS: Role[] = ['mtqmeli', 'modzakhili', 'bani'];
