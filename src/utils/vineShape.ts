// „ჩემი ვაზი“'s picture (2026-11-01): one fixed vine on a trellis, worked out once — a trunk up a stake, two arms along the
// wire, eight canes rising from them — and its leaf places in the order the vine grows (from the root out). The app draws
// the first N of them (pages/games/vazi/VineArt.tsx) and the paper sheet draws them all as places to glue a leaf
// (src/print/games/chemi-vazi.js). Pure numbers: a box of 360×280, y down.

export interface Pt { x: number; y: number }
export interface Branch { id: string; pts: Pt[]; kind: 'trunk' | 'arm' | 'cane' }
export interface LeafSlot {
  x: number; y: number; // where its stalk meets the wood
  rot: number; // degrees, 0 = the leaf points up
  s: number; // scale of the 100-unit leaf
  branch: string;
  at: number; // index of its point on the branch
  order: number; // growth distance from the root
}
export interface BunchSlot { x: number; y: number; s: number; branch: string; at: number }

export const VINE_W = 360;
export const VINE_H = 280;
export const GROUND_Y = 258;
export const WIRE_Y = 98;
export const POSTS = [22, 338];

const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const r1 = (v: number) => Math.round(v * 10) / 10;
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
/** distance along a polyline up to each point */
const along = (pts: Pt[]) => pts.reduce<number[]>((acc, p, i) => [...acc, i ? acc[i - 1] + dist(pts[i - 1], p) : 0], []);
/** a branch's direction at a point, in degrees from up (clockwise) */
const angleAt = (pts: Pt[], i: number) => {
  const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
  return (Math.atan2(b.x - a.x, a.y - b.y) * 180) / Math.PI;
};

const rand = rng(20261101);

// the trunk: from the ground up the stake to the wire, a little crooked
const TRUNK_TOP: Pt = { x: 183, y: WIRE_Y + 4 };
const trunk: Pt[] = Array.from({ length: 21 }, (_, t) => ({
  x: r1(180 + 3.4 * Math.sin(t * 0.55) * (1 - t / 30) + t * 0.15),
  y: r1(GROUND_Y - (t * (GROUND_Y - TRUNK_TOP.y)) / 20),
}));
trunk[20] = TRUNK_TOP;

// the two arms along the wire, from the trunk's head outwards
const arm = (dir: -1 | 1): Pt[] => {
  const pts: Pt[] = [TRUNK_TOP, { x: TRUNK_TOP.x + dir * 5, y: WIRE_Y + 1.6 }, { x: TRUNK_TOP.x + dir * 12, y: WIRE_Y + 0.6 }];
  for (let x = TRUNK_TOP.x + dir * 20; dir < 0 ? x >= 32 : x <= 328; x += dir * 8) pts.push({ x, y: r1(WIRE_Y + 0.4 + 1.5 * Math.sin(x / 13)) });
  return pts;
};
const armL = arm(-1), armR = arm(1);

// eight canes rising from the arms, leaning outwards, sampled every ~6 units
const cane = (base: Pt, dir: -1 | 1, k: number): Pt[] => {
  const tip = { x: base.x + dir * (10 + rand() * 12), y: 13 + rand() * 12 + (k % 2) * 7 };
  const c = { x: base.x - dir * (3 + rand() * 4), y: (base.y + tip.y) / 2 + 4 };
  const fine = Array.from({ length: 41 }, (_, i) => {
    const t = i / 40;
    return { x: (1 - t) ** 2 * base.x + 2 * (1 - t) * t * c.x + t * t * tip.x, y: (1 - t) ** 2 * base.y + 2 * (1 - t) * t * c.y + t * t * tip.y };
  });
  const out: Pt[] = [fine[0]];
  for (const p of fine) if (dist(out[out.length - 1], p) >= 6) out.push(p);
  return out.map(p => ({ x: r1(p.x), y: r1(p.y) }));
};
const nearest = (pts: Pt[], x: number) => pts.reduce((best, p, i) => (Math.abs(p.x - x) < Math.abs(pts[best].x - x) ? i : best), 0);
const CANE_X: [number, -1 | 1][] = [[152, -1], [118, -1], [84, -1], [50, -1], [214, 1], [248, 1], [282, 1], [316, 1]];
const canes = CANE_X.map(([x, dir], k) => {
  const a = dir < 0 ? armL : armR;
  const at = nearest(a, x);
  return { id: `c${k}`, arm: dir < 0 ? 'armL' : 'armR', at, pts: cane(a[at], dir, k) };
});

export const BRANCHES: Branch[] = [
  { id: 'trunk', kind: 'trunk', pts: trunk },
  { id: 'armL', kind: 'arm', pts: armL },
  { id: 'armR', kind: 'arm', pts: armR },
  ...canes.map(c => ({ id: c.id, kind: 'cane' as const, pts: c.pts })),
];
/** where each cane starts on its arm (the arm must be drawn that far) */
export const CANE_BASE: Record<string, { arm: string; at: number }> = Object.fromEntries(canes.map(c => [c.id, { arm: c.arm, at: c.at }]));

const TRUNK_LEN = along(trunk)[20];
const slots: LeafSlot[] = [];
// the young vine's first leaves, on the trunk's upper half
[7, 10, 13, 16].forEach((i, k) => {
  const side = k % 2 ? 1 : -1;
  slots.push({ x: trunk[i].x + side * 2, y: trunk[i].y, rot: side * (48 + rand() * 14), s: 0.27 + rand() * 0.04, branch: 'trunk', at: i, order: along(trunk)[i] });
});
// along the arms, every other point, turned up-left and up-right in turn
for (const [id, pts] of [['armL', armL], ['armR', armR]] as const) {
  const d = along(pts);
  for (let i = 3, k = 0; i < pts.length; i += 2, k++) {
    const side = k % 2 ? 1 : -1;
    slots.push({ x: pts[i].x, y: pts[i].y - 1, rot: side * (28 + rand() * 30), s: 0.33 + rand() * 0.06, branch: id, at: i, order: TRUNK_LEN + d[i] });
  }
}
// along the canes, smaller towards the tip, on both sides
for (const c of canes) {
  const d = along(c.pts);
  const armD = along(c.arm === 'armL' ? armL : armR)[c.at];
  for (let i = 1, k = 0; i < c.pts.length - 1; i += 2, k++) {
    const side = k % 2 ? 1 : -1;
    const a = angleAt(c.pts, i);
    slots.push({
      x: c.pts[i].x, y: c.pts[i].y, rot: r1(a + side * (46 + rand() * 18)), s: r1(Math.max(0.25, 0.39 - k * 0.022) * 100) / 100,
      branch: c.id, at: i, order: TRUNK_LEN + armD + 10 + d[i],
    });
  }
}
/** every leaf place, in the order the vine fills them */
export const LEAF_SLOTS: LeafSlot[] = slots
  .map(s => ({ ...s, x: r1(s.x), y: r1(s.y), rot: r1(s.rot), order: r1(s.order) }))
  .sort((a, b) => a.order - b.order || a.x - b.x);

/** the bunches' places under the arms, from the trunk outwards in turn */
export const BUNCH_SLOTS: BunchSlot[] = [166, 200, 138, 228, 108, 258, 78, 290, 48, 318].map(x => {
  const id = x < TRUNK_TOP.x ? 'armL' : 'armR';
  const pts = id === 'armL' ? armL : armR;
  const at = nearest(pts, x);
  return { x: pts[at].x, y: pts[at].y + 2, s: 1, branch: id, at };
});

/** the farthest point of each branch the first `n` leaves need (a cane's arm reaches the cane, the trunk is whole once
 *  anything grows on the arms); a branch not in the map is not drawn */
export const grownTo = (n: number, bunches = 0): Record<string, number> => {
  const out: Record<string, number> = { trunk: 3 };
  const need = (id: string, at: number) => { out[id] = Math.max(out[id] ?? 0, at); };
  for (const s of LEAF_SLOTS.slice(0, n)) {
    need(s.branch, Math.min(s.at + 1, (BRANCHES.find(b => b.id === s.branch)?.pts.length ?? 1) - 1));
    if (s.branch !== 'trunk') need('trunk', 20);
    const base = CANE_BASE[s.branch];
    if (base) need(base.arm, base.at);
  }
  for (const b of BUNCH_SLOTS.slice(0, bunches)) { need('trunk', 20); need(b.branch, b.at + 1); }
  return out;
};

// a fixed spread of the places: a vine with fewer leaves than places loses them all over, not from one end
const SPREAD = LEAF_SLOTS.map((_, i) => ((i * 4507 + 1231) % 997) / 997);

/** The leaves drawn: the vine has grown its first `wood` places (its whole life) and `leaves` of them hold a leaf now (the last
 *  weeks'). While it has a leaf on every place, they come in the order it grew; a thinner vine keeps its leaves spread over
 *  all its wood. `drawn` = place indices in growth order (so they overlap the same way), `fresh` = the last `fresh` to come. */
export const leafPlaces = (wood: number, leaves: number, fresh = 0): { drawn: number[]; fresh: number[] } => {
  const grown = Math.max(0, Math.min(Math.floor(wood), LEAF_SLOTS.length));
  const n = Math.max(0, Math.min(Math.floor(leaves), grown));
  const all = Array.from({ length: grown }, (_, i) => i);
  const came = n >= grown ? all : [...all].sort((a, b) => SPREAD[a] - SPREAD[b] || a - b).slice(0, n);
  return { drawn: [...came].sort((a, b) => a - b), fresh: came.slice(came.length - Math.max(0, Math.min(fresh, came.length))) };
};

// ---- the leaf: a five-lobed vine leaf with a toothed edge, drawn on a 100-unit box; its stalk ends at LEAF_STEM ----
const LEAF_C = { x: 50, y: 52 };
const LOBES = [[0, 22, 0.36], [0.98, 19, 0.34], [-0.98, 19, 0.34], [1.95, 12, 0.32], [-1.95, 12, 0.32]] as const;
const leafR = (phi: number) => {
  let r = 22;
  for (const [at, amp, w] of LOBES) r += amp * Math.exp(-(((phi - at) / w) ** 2));
  r *= 1 - 0.6 * Math.exp(-(((Math.abs(phi) - Math.PI) / 0.42) ** 2));
  const u = (phi * 36) / (2 * Math.PI);
  return r + 1.3 * (2 * Math.abs(2 * (u - Math.floor(u + 0.5))) - 1);
};
const leafPt = (phi: number, k = 1) => ({ x: LEAF_C.x + leafR(phi) * k * Math.sin(phi), y: LEAF_C.y - leafR(phi) * k * Math.cos(phi) });
export const LEAF_PATH = `M${Array.from({ length: 144 }, (_, i) => {
  const p = leafPt(-Math.PI + (i * 2 * Math.PI) / 144);
  return `${r1(p.x)} ${r1(p.y)}`;
}).join('L')}Z`;
export const LEAF_VEINS = LOBES.map(([at]) => { const p = leafPt(at, 0.8); return `M50 58L${r1(p.x)} ${r1(p.y)}`; }).join('');
/** the stalk, from the blade to where it meets the wood */
export const LEAF_STALK = 'M50 58L50 72';
export const LEAF_STEM = { x: 50, y: 72 };
/** the SVG transform that puts the 100-unit leaf on its place */
export const leafTransform = (s: Pick<LeafSlot, 'x' | 'y' | 'rot' | 's'>, grow = 1) =>
  `translate(${s.x} ${s.y}) rotate(${s.rot}) scale(${r1(s.s * grow * 1000) / 1000}) translate(${-LEAF_STEM.x} ${-LEAF_STEM.y})`;

// ---- a bunch: rows of grapes under a short stalk, hanging from (0, 0) ----
const ROWS: number[][] = [[-9, -3, 3, 9], [-12, -6, 0, 6, 12], [-9, -3, 3, 9], [-10, -4, 2, 8], [-6, 0, 6], [-3, 3], [0]];
const grand = rng(7);
export const GRAPES: { x: number; y: number; r: number }[] = ROWS.flatMap((row, i) =>
  row.map(x => ({ x: r1(x + (grand() - 0.5) * 1.2), y: r1(10 + i * 5 + (grand() - 0.5) * 1.2), r: r1(3.3 + grand() * 0.4) })));
export const BUNCH_STALK = 'M0 0C1 3 0 6 0 8';

/** a curl at a cane's tip */
export const tendril = (pts: Pt[]): string => {
  const tip = pts[pts.length - 1];
  const a = (angleAt(pts, pts.length - 1) * Math.PI) / 180;
  const turn = (x: number, y: number) => ({ x: tip.x + x * Math.cos(a) - y * Math.sin(a), y: tip.y + x * Math.sin(a) + y * Math.cos(a) });
  const curl = Array.from({ length: 12 }, (_, k) => {
    const t = k * 0.75, rr = 6 - k * 0.42;
    return turn(rr * Math.sin(t) * (k ? 1 : 0), -k * 1.6 - rr * (1 - Math.cos(t)) * 0.6);
  });
  return `M${curl.map(p => `${r1(p.x)} ${r1(p.y)}`).join('L')}`;
};

/** a polyline as a path, its first `upto` + 1 points */
export const pathOf = (pts: Pt[], upto = pts.length - 1) => `M${pts.slice(0, upto + 1).map(p => `${p.x} ${p.y}`).join('L')}`;
