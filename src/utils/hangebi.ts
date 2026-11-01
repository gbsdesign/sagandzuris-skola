import type { RoundAnswer, RoundRules } from './roundGames';

// „ოთხი ჰანგი, ერთი სიტყვა“ (2026-11-01, the plan's №12, like 4 Pics 1 Word): four clues share one word — four pieces of folk
// songs of one region (by ear, when the recordings may be heard) or four words of one kind (მტკვარი, რიონი, არაგვი, ალაზანი
// → მდინარე); the answer is built from a bank of letters, its shape shown. The right word 1000 at once, 500 at the last
// moment. A word built is sent as its place in HANGEBI_WORDS (every answer the game has), so the room needs no text. One
// round of the quick games (utils/roundGames.ts); the puzzles data/hangebiWords.ts (words) + data/hangebiPool.ts (songs), the
// screens pages/games/hangebi/. Kept free of the pool's data: this file is in the app's first bundle (the room's store).

/** every answer the game may ask, in a fixed order (a pick is its place here); the pool's keys must be among them */
export const HANGEBI_WORDS = [
  // the songs map's regions, in its order (utils/kutkhe.ts KUTKHE_REGIONS): four songs of one region, by ear or by title
  'აფხაზეთი', 'სვანეთი', 'სამეგრელო', 'რაჭა-ლეჩხუმი', 'იმერეთი', 'გურია', 'აჭარა', 'სამცხე-ჯავახეთი', 'შიდა ქართლი',
  'ქვემო ქართლი', 'მცხეთა-მთიანეთი', 'კახეთი', 'ქალაქური',
  // four words of one kind (data/hangebiWords.ts: the groups of „ოთხეული“)
  'დღესასწაული', 'შესამოსელი', 'წიგნი', 'საგალობელი', 'ღვთისმსახურება', 'ხმა', 'წირვა', 'მოციქული', 'მახარებელი',
  'წინასწარმეტყველი', 'მთავარანგელოზი', 'წმიდანი', 'მეფე', 'მწერალი', 'მდინარე', 'მთა', 'ტაძარი', 'ქალაქი', 'კუთხე',
  'ცეკვა', 'ვაზი', 'კერძი', 'ხილი', 'დამწერლობა', 'კვირა', 'სათნოება', 'სახლი', 'სუფრა', 'ნათესავი', 'მუსიკა', 'თამაში',
  'ციხე', 'სადღეგრძელო', 'ცხოველი', 'ფრინველი', 'ხე', 'ყვავილი', 'ტბა', 'გმირი', 'ბრძოლა', 'ფილმი', 'მხატვარი',
  'კომპოზიტორი', 'ვეფხისტყაოსანი', 'ზღაპარი', 'ყველი', 'ტკბილეული', 'სპორტი', 'კურორტი', 'ხელობა', 'საკრავი', 'ჩოხა',
  'კაბა',
] as const;

/** the first thirteen answers are the regions, an index of KUTKHE_REGIONS each */
export const HANGEBI_REGION_COUNT = 13;

export type HangebiLevel = 'ear' | 'word';
export const HANGEBI_LEVELS: readonly { id: HangebiLevel; label: string }[] = [
  { id: 'ear', label: 'ყურით' },
  { id: 'word', label: 'სიტყვით' },
];

export interface HangebiQ {
  kind: 'hangebi';
  /** the puzzle (`w:<group>` / `e:<region>`) and the clues chosen */
  id: string;
  level: HangebiLevel;
  /** by word: the four words */
  clues?: string[];
  /** by ear: four recordings' pieces, each from its share `from` */
  clips?: { url: string; from: number }[];
  /** the answer's shape: a „_“ a letter, its spaces and hyphens as they are */
  shape: string;
  /** the bank of letters: the answer's own and a few more, mixed */
  tiles: string;
  /** the right word, its place in HANGEBI_WORDS */
  answer: number;
  /** by ear: what the four pieces were (the songs' titles), for the reveal */
  names?: string[];
}

/** each piece by ear plays this long; the time to answer by word and by ear */
export const PIECE_SECONDS = 6;
export const WORD_SECONDS = 40;
export const EAR_SECONDS = 60;
export const hangebiSeconds = (q: Pick<HangebiQ, 'level'>) => (q.level === 'ear' ? EAR_SECONDS : WORD_SECONDS);

/** a word as letters only: its spaces and hyphens are not tiles */
export const lettersOf = (w: string) => [...w].filter(ch => /\p{L}/u.test(ch));
export const shapeOf = (w: string) => [...w].map(ch => (/\p{L}/u.test(ch) ? '_' : ch)).join('');
/** a word built from the tiles: its place in HANGEBI_WORDS (-1 — no such answer) */
export const wordIndex = (letters: string) => HANGEBI_WORDS.findIndex(w => lettersOf(w).join('') === letters);

/** the right word: 1000 at once, 500 at the last moment */
export const hangebiPoints = (q: Pick<HangebiQ, 'answer'>, a: Pick<RoundAnswer, 'pick' | 'ms'>, limitMs: number) => {
  if (a.pick !== q.answer) return 0;
  const late = limitMs > 0 ? Math.min(1, Math.max(0, a.ms / limitMs)) : 1;
  return Math.round(1000 - 500 * late);
};

const isWord = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) < HANGEBI_WORDS.length;
const text = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;

export const HANGEBI_RULES: RoundRules<HangebiQ> = {
  steps: () => 1,
  seconds: q => hangebiSeconds(q),
  ok: (_, pick) => isWord(pick),
  points: hangebiPoints,
  secret: ['answer', 'names'],
  valid: (q): q is HangebiQ => {
    const o = q as Partial<HangebiQ>;
    if (!o || o.kind !== 'hangebi' || !text(o.id, 200) || (o.level !== 'ear' && o.level !== 'word') || !isWord(o.answer)) return false;
    if (!text(o.shape, 40) || !/^[_ -]+$/.test(o.shape!) || o.shape !== shapeOf(HANGEBI_WORDS[o.answer!])) return false;
    if (!text(o.tiles, 24) || ![...o.tiles!].every(ch => /\p{L}/u.test(ch))) return false;
    const bank = [...o.tiles!];
    if (!lettersOf(HANGEBI_WORDS[o.answer!]).every(ch => { const i = bank.indexOf(ch); if (i < 0) return false; bank.splice(i, 1); return true; })) return false;
    if (o.level === 'word') return o.clips === undefined && Array.isArray(o.clues) && o.clues.length === 4 && o.clues.every(c => text(c, 40));
    return o.clues === undefined && Array.isArray(o.clips) && o.clips.length === 4
      && o.clips.every(c => !!c && text(c.url, 400) && typeof c.from === 'number' && c.from >= 0 && c.from < 1)
      && (o.names === undefined || (Array.isArray(o.names) && o.names.length === 4 && o.names.every(n => text(n, 120))));
  },
};

/** the one-phone game: the teams write the word, the host marks it */
export const HANGEBI_MARKS = [
  { points: 1, label: 'სწორი' },
  { points: 0, label: 'ვერა' },
] as const;

// ——— a game's rounds

/** a puzzle: an answer (a word of HANGEBI_WORDS) and what may be its clues — words, or songs with their takes */
export interface HangebiPuzzle {
  id: string;
  level: HangebiLevel;
  answer: string;
  words?: readonly string[];
  songs?: readonly { title: string; takes: readonly { url: string }[] }[];
}

/** the letters added to the bank: the ones Georgian words use most, so none stands out */
const EXTRA = 'აეიოუბგდვლმნრსტქშცხ';
/** a bank of at least twelve letters, four more than the answer's */
export const tilesOf = (answer: string, rnd: () => number) => {
  const own = lettersOf(answer);
  const size = Math.min(24, Math.max(12, own.length + 4));
  const more = Array.from({ length: size - own.length }, () => EXTRA[Math.floor(rnd() * EXTRA.length)]);
  return shuffled([...own, ...more], rnd).join('');
};

const shuffled = <T,>(list: readonly T[], rnd: () => number) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

/** four clues of a puzzle by word that no other answer's group holds three of, so the word is sure (the printed cards too) */
export const sureClues = (p: HangebiPuzzle, puzzles: readonly HangebiPuzzle[], rnd: () => number) => {
  const others = puzzles.filter(x => x.level === 'word' && x.answer !== p.answer).map(x => new Set(x.words));
  let clues = shuffled(p.words!, rnd).slice(0, 4);
  for (let t = 0; t < 30 && others.some(o => clues.filter(c => o.has(c)).length >= 3); t++) clues = shuffled(p.words!, rnd).slice(0, 4);
  return clues;
};

export interface HangebiDraw {
  puzzles: readonly HangebiPuzzle[];
  count: number;
  /** the levels chosen (none: both) */
  levels?: readonly HangebiLevel[];
  /** the puzzles asked lately on this phone, the oldest first: others first */
  seen?: readonly string[];
  rnd?: () => number;
}

/** a game's rounds: a different answer each, the levels in turn, the puzzles not asked lately first; four clues of each
 *  (four songs: a piece of a take of each, from a share of it between a tenth and two thirds) */
export const drawHangebi = ({ puzzles, count, levels, seen = [], rnd = Math.random }: HangebiDraw): HangebiQ[] => {
  const want = levels && levels.length ? levels : HANGEBI_LEVELS.map(l => l.id);
  const usable = puzzles.filter(p => want.includes(p.level) && wordIndexOf(p.answer) >= 0
    && (p.level === 'word' ? (p.words?.length ?? 0) >= 4 : (p.songs?.filter(s => s.takes.length).length ?? 0) >= 4));
  const at = new Map(seen.map((id, i) => [id, i]));
  const byLevel = new Map(want.map(l => {
    const mine = usable.filter(p => p.level === l);
    return [l, [...shuffled(mine.filter(p => !at.has(p.id)), rnd), ...mine.filter(p => at.has(p.id)).sort((a, b) => at.get(a.id)! - at.get(b.id)!)]];
  }));
  const used = new Set<string>();
  const out: HangebiQ[] = [];
  let order: HangebiLevel[] = [];
  while (out.length < count) {
    const open = want.filter(l => byLevel.get(l)!.some(p => !used.has(p.answer)));
    if (!open.length) break;
    if (!order.length) order = shuffled(open, rnd);
    const level = order.shift()!;
    const p = byLevel.get(level)!.find(x => !used.has(x.answer));
    if (!p) continue;
    used.add(p.answer);
    const base = { kind: 'hangebi' as const, level, shape: shapeOf(p.answer), tiles: tilesOf(p.answer, rnd), answer: wordIndexOf(p.answer) };
    if (level === 'word') {
      const clues = sureClues(p, usable, rnd);
      out.push({ ...base, id: `${p.id}|${clues.join('·')}`.slice(0, 200), clues });
    } else {
      const four = shuffled(p.songs!.filter(s => s.takes.length), rnd).slice(0, 4);
      const clips = four.map(s => ({ url: s.takes[Math.floor(rnd() * s.takes.length)].url, from: Math.round((0.1 + rnd() * 0.56) * 100) / 100 }));
      out.push({ ...base, id: p.id.slice(0, 200), clips, names: four.map(s => s.title.slice(0, 120)) });
    }
  }
  return out;
};

const wordIndexOf = (w: string) => HANGEBI_WORDS.indexOf(w as typeof HANGEBI_WORDS[number]);

/** what a clue may not hold: the answer's stem (its letters, a last vowel dropped when it is four letters or more) */
export const stemOf = (answer: string) => {
  const l = lettersOf(answer).join('');
  return l.length >= 4 ? l.replace(/[აეიოუ]$/, '') : l;
};
/** the clues a group may give: none that holds the answer (or one of `also` — a region's adjective, „გურული“ for გურია) */
export const cluesOf = (answer: string, words: readonly string[], also: readonly string[] = []) => {
  const banned = [stemOf(answer), ...also];
  return [...new Set(words)].filter(w => { const l = lettersOf(w).join(''); return !banned.some(b => l.includes(b)); });
};

/** the puzzle's id from its round (the phone remembers the puzzles it asked) */
export const hangebiPuzzleOf = (q: Pick<HangebiQ, 'id'>) => q.id.split('|')[0];
