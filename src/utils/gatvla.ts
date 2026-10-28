import { shuffle } from './otkheuli';

// „გათვლა“ (games hub, 2026-10-28, live): the one phone in the circle counts out who starts — the names light up one per
// beat of the rhyme and the last beat picks; who was already picked is skipped the next time. The same page spins the
// „ვისი ჯერია?“ wheel (the one asked least often wins, so every pupil sings as often as the others) and splits the
// class into teams. Pure; tests in tests/gatvla.test.ts; the page pages/games/GatvlaGame.tsx.

export interface Rhyme { id: string; title: string; text: string; own?: boolean }

/** the rhymes every phone has; the teacher adds their own on the device */
export const BUILT_IN_RHYMES: Rhyme[] = [
  {
    id: 'anbani',
    title: 'ანბანის სახელები',
    text: 'ანი, ბანი, განი, დონი, ენი, ვინი, ზენი, თანი, ინი, კანი, ლასი, მანი, ნარი, ონი, პარი, ჟანი, რაე, სანი, ტარი, უნი, ფარი, ქანი, ღანი, ყარი, შინი, ჩინი, ცანი, ძილი, წილი, ჭარი, ხანი, ჯანი, ჰაე',
  },
  { id: 'ritskhvebi', title: 'ერთი, ორი, სამი…', text: 'ერთი, ორი, სამი, ოთხი, ხუთი, ექვსი, შვიდი, რვა, ცხრა, ათი — შენ იწყებ!' },
  { id: 'khmebi', title: 'მთქმელი, მოძახილი, ბანი', text: 'მთქმელი, მოძახილი, ბანი — სამნი ერთად, ერთი ხმა; ვისაც ეს ლექსი შეხვდა, ის იწყებს — აბა, ჰა!' },
];

export const MAX_NAMES = 40;
export const MAX_NAME_LEN = 20;
export const TEAM_COUNTS = [2, 3, 4] as const;
export const TEAM_LABELS = ['პირველი გუნდი', 'მეორე გუნდი', 'მესამე გუნდი', 'მეოთხე გუნდი'];

export const cleanName = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LEN);

/** the beats of a rhyme: its words, punctuation dropped */
export const beatsOf = (text: string) => text.split(/[\s,.;:!?—–-]+/).filter(Boolean);

/** counting around `count` people from `start` (beat 1 lands on `start`): where the last of `beats` beats lands */
export const countOut = (count: number, beats: number, start = 0) => (count > 0 && beats > 0 ? (((start + beats - 1) % count) + count) % count : -1);

/** the circle still in play: everyone not yet picked, in the list's order */
export const stillIn = (names: string[], picked: Set<number>) => names.map((_, i) => i).filter(i => !picked.has(i));

/**
 * The beats of one counting as the indices they land on: beat 1 on the first person still in at or after `from`, round
 * and round; the last one is the pick. Empty when nobody is in.
 */
export const countingSteps = (names: string[], picked: Set<number>, beats: number, from = 0): number[] => {
  const circle = stillIn(names, picked);
  if (!circle.length || beats <= 0) return [];
  let s = circle.findIndex(i => i >= from);
  if (s < 0) s = 0;
  return Array.from({ length: beats }, (_, k) => circle[(s + k) % circle.length]);
};

/** the wheel's pick: among the names asked least often, at random — so the turns come out even */
export const wheelPick = (names: string[], counts: Record<string, number>, rnd: () => number) => {
  if (!names.length) return -1;
  const of = (i: number) => counts[names[i]] ?? 0;
  const min = Math.min(...names.map((_, i) => of(i)));
  const cands = names.map((_, i) => i).filter(i => of(i) === min);
  return cands[Math.min(cands.length - 1, Math.floor(rnd() * cands.length))];
};

/** the wheel's run: `turns` full turns from `from`, then on to the pick; the delays grow so the wheel slows to a stop */
export const wheelSteps = (count: number, from: number, pick: number, turns = 2): number[] => {
  if (count <= 0 || pick < 0) return [];
  const d = (((pick - from) % count) + count) % count;
  const total = turns * count + d;
  return Array.from({ length: total + 1 }, (_, k) => (from + k) % count);
};
export const wheelDelay = (k: number, total: number) => 70 + Math.round(430 * Math.pow(total ? k / total : 1, 3));

/** random teams of (almost) the same size */
export const splitTeams = (names: string[], teams: number, rnd: () => number): string[][] => {
  const out: string[][] = Array.from({ length: teams }, () => []);
  shuffle(names, rnd).forEach((n, i) => out[i % teams].push(n));
  return out;
};
