// AI teacher step 2 — „მეხსიერება და გეგმა“ (plan doc AI tab; canvas page 19, boards ai-gacnoba · ai-testi · ai-gegma ·
// ai-shvidi · ai-rveuli · ai-susti · ai-gameoreba; ideas „ხმის დღიური“, „ხმის ზომა“). Pure rules, tested in
// tests/aiPlan.test.ts. Nothing here calls an AI: the plan, the first week, the weak spot and the notebook are made from the
// member's own answers and tries (layers 1–2 of the teacher). What is remembered is `AiNote` (students/{uid}.aiNote), and every
// line of the notebook says where it came from and can be deleted with its source.

import { noteName } from './pearls';

// ---- what is kept ---------------------------------------------------------------------------------------------------

export type Before = 'never' | 'little' | 'choir';
export type Goal = 'liturgy' | 'notes' | 'self';
export type Minutes = 5 | 10 | 20;

export interface AiIntro { before: Before; minutes: Minutes; goal: Goal; days: number; at: string }
/** the short voice check: the comfortable range (MIDI), the part that suits it, how the ear did, the level to start at */
export interface AiVoice { low: number; high: number; part: 1 | 2 | 3; hold: number; echo1: number; echo3?: number; level: number; at: string }
/** one try of a phrase in the day lesson: day, piece~part, notes right, notes in all, the hour it was sung, and each note's
 *  mark (`x`: 1 right, + high, - low, 0 not heard) */
export interface AiTake { d: string; p: string; h: number; n: number; t?: number; x?: string }
/** a missed leap: how many times, and the last day */
export interface AiMiss { n: number; last: string; p?: string }

export interface AiNote {
  intro?: AiIntro;
  voice?: AiVoice;
  /** the first week of a beginner: step id → the day it was done */
  week1?: Record<string, string>;
  /** missed leaps, key „from>to“ in MIDI */
  misses?: Record<string, AiMiss>;
  /** the last tries (≤ TAKES_KEPT) */
  takes?: AiTake[];
  /** „ნოტები ჩემს ხმაზე“: the lesson plays and asks each phrase moved into the measured range (on unless turned off) */
  fit?: boolean;
  /** the voice check was put off („ახლა არა“): the lesson does not ask again; „ჩემი ხმა“ still offers it */
  skip?: boolean;
}

export const TAKES_KEPT = 80;

// ---- the introduction (ai-gacnoba) --------------------------------------------------------------------------------------

export const BEFORE_OPTIONS: { id: Before; label: string }[] = [
  { id: 'never', label: 'არასდროს' }, { id: 'little', label: 'ცოტა' }, { id: 'choir', label: 'გუნდში ვგალობ' },
];
export const MINUTE_OPTIONS: Minutes[] = [5, 10, 20];
export const GOAL_OPTIONS: { id: Goal; label: string }[] = [
  { id: 'liturgy', label: 'წირვაზე გალობა' }, { id: 'notes', label: 'ნოტების კითხვა' }, { id: 'self', label: 'ჩემთვის ვსწავლობ' },
];
export const goalLabel = (g: Goal) => GOAL_OPTIONS.find(o => o.id === g)?.label ?? '';

// ---- the voice (ai-testi, „ხმის ზომა“) -----------------------------------------------------------------------------------

/** the part of the three a range suits: its middle high → I (მთქმელი), middle → II (მოძახილი), low → III (ბანი) */
export const partOfRange = (low: number, high: number): 1 | 2 | 3 => {
  const mid = (low + high) / 2;
  return mid >= 63 ? 1 : mid >= 57 ? 2 : 3;
};
export const PART_NAMES: Record<1 | 2 | 3, string> = { 1: 'I ხმა · მთქმელი', 2: 'II ხმა · მოძახილი', 3: 'III ხმა · ბანი' };
/** „ლა — მი“ */
export const rangeLabel = (low: number, high: number) => `${noteName(low)} — ${noteName(high)}`;
/** a word for where a range lies */
export const rangeHeight = (low: number, high: number) => {
  const mid = (low + high) / 2;
  return mid >= 63 ? 'მაღალი' : mid >= 57 ? 'საშუალო' : 'დაბალი';
};
/** the ear in one line, from the held note and the echoes (shares 0–1) */
export const earLine = (v: Pick<AiVoice, 'hold' | 'echo1' | 'echo3'>) =>
  v.echo1 >= 0.6
    ? v.echo3 === undefined ? 'ერთ ნოტს იმეორებ' : v.echo3 >= 0.5 ? 'ერთ ნოტსაც და სამსაც იმეორებ' : 'ერთ ნოტს იმეორებ; სამი ჯერ ძნელია'
    : v.hold >= 0.6 ? 'ნოტს იჭერ; გამეორება ჯერ ძნელია' : 'ჯერ ერთი ნოტის დაჭერიდან ვიწყებთ';

/** where the short check starts one: 0 unless a note is held and one note sung back; 1 when three come back too */
export const levelOfCheck = (v: Pick<AiVoice, 'hold' | 'echo1' | 'echo3'>) =>
  v.hold < 0.6 || v.echo1 < 0.6 ? 0 : (v.echo3 ?? 0) >= 0.5 ? 1 : 0;

/** the teacher's words after the check — always what is there to build on, never „bad“ */
export const checkLine = (v: Pick<AiVoice, 'hold' | 'echo1' | 'echo3'>) =>
  v.hold >= 0.6 && v.echo1 >= 0.6 && (v.echo3 ?? 0) >= 0.5 ? 'კარგი სმენა გაქვს. ნოტსაც იჭერ და გაგონილსაც იმეორებ — პირველი დონიდან დავიწყებთ.'
    : v.hold >= 0.6 ? 'კარგი დასაწყისია. ერთი ნოტი მყარად გიჭირავს — აქედან დავიწყებთ.'
      : 'დავიწყოთ ერთი ნოტით. ყოველდღე ცოტა — და ხმა თვითონ გაგყვება.';

/**
 * „ნოტები ჩემს ხმაზე“: how many semitones to move a phrase so its middle sits in the middle of the measured range.
 * Singing is checked in any octave, so the move stays within a fourth either way; under two semitones it is left alone.
 */
export const fitShift = (low: number, high: number, notes: number[]) => {
  if (!notes.length) return 0;
  const mid = (Math.min(...notes) + Math.max(...notes)) / 2;
  let d = Math.round((low + high) / 2 - mid) % 12;
  if (d > 6) d -= 12;
  if (d < -6) d += 12;
  d = Math.max(-5, Math.min(5, d));
  return Math.abs(d) < 2 ? 0 : d;
};

// ---- the plan (ai-gegma) -----------------------------------------------------------------------------------------------

export const LEVEL_NAMES = ['საფუძველი', 'ხმა და სმენა', 'მთქმელი', 'სამხმიანობა', 'რვა ხმა და სკოლები', 'ოსტატი'];
/** a level's weeks at 10 minutes, five days a week (the middle of the app's spans: 2–4 weeks, 1–2 months, 2–3 months…) */
const BASE_WEEKS = [3, 6, 10, 18, 36];
const LEVEL_WHAT = [
  'სუნთქვა, ერთი ნოტი, გამეორება', 'კვარტა, კვინტა, ზომა', 'სამი სადა საგალობელი', 'მოძახილი და ბანი, ნოტების კითხვა',
  'რვავე ხმა, სამი სკოლა',
];

/** weeks for a level at this pace: fewer minutes or days stretch it, more shorten it */
export const levelWeeks = (level: number, minutes: Minutes, days: number) => {
  const base = BASE_WEEKS[level] ?? 0;
  if (!base) return 0;
  const perWeek = minutes * Math.max(1, Math.min(7, days));
  return Math.max(1, Math.round((base * 50) / perWeek));
};

export interface PlanRow { level: number; name: string; weeks: number; what: string; last: boolean }

/** The plan from where one starts: three levels with their weeks, then one line for the rest, toward the goal. */
export const planOf = (intro: Pick<AiIntro, 'minutes' | 'days' | 'goal'>, start: number): PlanRow[] => {
  const rows: PlanRow[] = [];
  for (let l = start; l < Math.min(start + 3, 5); l++) {
    rows.push({ level: l, name: LEVEL_NAMES[l], weeks: levelWeeks(l, intro.minutes, intro.days), what: LEVEL_WHAT[l], last: false });
  }
  const next = Math.min(start + 3, 5);
  rows.push({ level: next, name: LEVEL_NAMES[next], weeks: 0, what: `მერე · ${GOAL_END[intro.goal]}`, last: true });
  return rows;
};
const GOAL_END: Record<Goal, string> = { liturgy: 'წირვა სამ ხმაში', notes: 'ფურცლიდან კითხვა', self: 'შენი ტემპით' };

/** the plan's head line: „კვირაში 5 დღე · დღეში 10 წუთი“ */
export const paceLine = (intro: Pick<AiIntro, 'minutes' | 'days'>) => `კვირაში ${intro.days} დღე · დღეში ${intro.minutes} წუთი`;

// ---- the first seven days (ai-shvidi) -----------------------------------------------------------------------------------

export interface WeekStep {
  id: string;
  title: string;
  /** a level-0 exercise of „ოსტატობის გზა“ (data/masteryPath), or the lesson's first phrase (`phrase`) / first pearl (`pearl`) */
  drill?: string;
  kind: 'drill' | 'phrase' | 'pearl';
  minutes?: number;
}

/** the first phrase of a beginner (day 6) and the first pearl (day 7): „ალილუია“ after the Apostle, tone 1 (vol. I №176) */
export const FIRST_PIECE = 'v-14-1';

export const FIRST_WEEK: WeekStep[] = [
  { id: 'w1', title: 'დგომა და სუნთქვა', drill: 'tip-10', kind: 'drill' },
  { id: 'w2', title: 'ერთი ნოტის დაჭერა', drill: 'm-hold', kind: 'drill' },
  { id: 'w3', title: 'გაგონილის გამეორება', drill: 'm-echo1', kind: 'drill', minutes: 5 },
  { id: 'w4', title: 'მაღლა თუ დაბლა?', drill: 'm-higher', kind: 'drill' },
  { id: 'w5', title: 'თანაბარი რიტმი', drill: 'rhythm-steady', kind: 'drill' },
  { id: 'w6', title: 'პირველი ფრაზა — „ალილუია“', kind: 'phrase' },
  { id: 'w7', title: 'პირველი მარგალიტი', kind: 'pearl' },
];

/** whose first week it is: a beginner who has not finished it */
export const inFirstWeek = (note: AiNote | undefined) =>
  note?.intro?.before === 'never' && FIRST_WEEK.some(s => !note.week1?.[s.id]);

/** the step for today: the first not done — a missed day only waits (nothing is lost, nothing is scolded) */
export const weekStepNow = (note: AiNote | undefined): number => {
  const i = FIRST_WEEK.findIndex(s => !note?.week1?.[s.id]);
  return i < 0 ? FIRST_WEEK.length : i;
};

/** today's step is already done (the last one done was today): the next waits for tomorrow */
export const weekDoneToday = (note: AiNote | undefined, today: string) => Object.values(note?.week1 ?? {}).includes(today);

/** a step's grey line: „1-ლი დღე · გავლილია“, „მე-3 დღე · 5 წუთი“ */
export const dayWord = (i: number) => (i === 0 ? '1-ლი დღე' : `მე-${i + 1} დღე`);

// ---- the reviews (ai-gameoreba) ------------------------------------------------------------------------------------------

/** the review steps after a phrase is learned: 1, 3, 7, 14, 30 days, then kept */
export const REVIEW_STEPS = [1, 3, 7, 14, 30];
/** a review sung this well skips a step („კარგად ნასწავლი უფრო იშვიათად ბრუნდება“) */
export const REVIEW_SKIP = 95;

// ---- the weak spot (ai-susti) and the notebook's leaps -------------------------------------------------------------------

/** a leap worth remembering: three semitones or more */
export const LEAP = 3;
export const missKey = (from: number, to: number) => `${Math.round(from)}>${Math.round(to)}`;
export const parseMiss = (key: string): [number, number] | null => {
  const m = /^(\d+)>(\d+)$/.exec(key);
  return m ? [Number(m[1]), Number(m[2])] : null;
};
/** „რე → სოლ“ */
export const leapLabel = (key: string) => { const p = parseMiss(key); return p ? `${noteName(p[0])} → ${noteName(p[1])}` : ''; };

/**
 * After one try of a phrase: the leaps sung wrong are counted (note i missed after note i−1, three semitones or more
 * apart). `target` = the phrase's notes (MIDI), `hits` = which notes were sung right.
 */
export const noteMisses = (misses: Record<string, AiMiss> | undefined, target: number[], hits: boolean[], day: string, piece?: string) => {
  const next: Record<string, AiMiss> = { ...(misses ?? {}) };
  for (let i = 1; i < target.length; i++) {
    if (hits[i] !== false || Math.abs(target[i] - target[i - 1]) < LEAP) continue;
    const k = missKey(target[i - 1], target[i]);
    const was = next[k];
    next[k] = { n: (was && dayGapOk(was.last, day) ? was.n : 0) + 1, last: day, ...(piece ? { p: piece } : {}) };
  }
  return next;
};
/** a miss older than two weeks starts its count again */
const dayGapOk = (last: string, day: string) => daysBetween(last, day) <= 14;
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86_400_000);

/** the leap missed most this week, three times or more: the day's weak-spot drill; null when none */
export const weakLeap = (misses: Record<string, AiMiss> | undefined, today: string): { key: string; n: number; piece?: string } | null => {
  let best: { key: string; n: number; piece?: string } | null = null;
  for (const [key, m] of Object.entries(misses ?? {})) {
    if (m.n < 3 || daysBetween(m.last, today) > 7) continue;
    if (!best || m.n > best.n) best = { key, n: m.n, piece: m.p };
  }
  return best;
};
/** the weak-spot teacher's words: „ამ კვირაში ნახტომი რე → სოლ ხუთჯერ აგერია. დღეს გამეორების ნაცვლად ეს ვივარჯიშოთ.“ */
export const weakLine = (key: string, n: number) =>
  `ამ კვირაში ნახტომი ${leapLabel(key)} ${TIMES[Math.min(n, 10)] ?? `${n}-ჯერ`} აგერია. დღეს გამეორების ნაცვლად ეს ვივარჯიშოთ.`;
const TIMES: Record<number, string> = { 3: 'სამჯერ', 4: 'ოთხჯერ', 5: 'ხუთჯერ', 6: 'ექვსჯერ', 7: 'შვიდჯერ', 8: 'რვაჯერ', 9: 'ცხრაჯერ', 10: 'ათჯერ' };
/** the interval of a leap in the words of the exercises: კვარტა, კვინტა… */
export const leapName = (key: string) => {
  const p = parseMiss(key);
  if (!p) return '';
  const d = Math.abs(p[1] - p[0]) % 12 || 12;
  return INTERVAL_NAMES[d] ?? 'ნახტომი';
};
const INTERVAL_NAMES: Record<number, string> = {
  3: 'მცირე ტერცია', 4: 'დიდი ტერცია', 5: 'კვარტა', 6: 'ტრიტონი', 7: 'კვინტა', 8: 'მცირე სექსტა', 9: 'დიდი სექსტა',
  10: 'მცირე სეპტიმა', 11: 'დიდი სეპტიმა', 12: 'ოქტავა',
};

// ---- the diary (idea „ხმის დღიური“) --------------------------------------------------------------------------------------

/** a take kept: the newest last, at most TAKES_KEPT */
export const keepTake = (takes: AiTake[] | undefined, t: AiTake) => [...(takes ?? []), t].slice(-TAKES_KEPT);

/** Monday of a day's week */
export const weekOf = (day: string) => {
  const d = new Date(day + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};

export interface WeekBar { week: string; label: string; share: number; tries: number }

/** the last `weeks` weeks (oldest first): how many notes in ten were right, from the takes; a week with no try has 0 tries */
export const weekBars = (takes: AiTake[] | undefined, today: string, weeks = 8): WeekBar[] => {
  const end = weekOf(today);
  const out: WeekBar[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const w = addDays(end, -7 * i);
    const of = (takes ?? []).filter(t => weekOf(t.d) === w);
    const notes = of.reduce((s, t) => s + t.n, 0);
    const right = of.reduce((s, t) => s + t.h, 0);
    const [, m, d] = w.split('-').map(Number);
    out.push({ week: w, label: `${d}.${m}`, share: notes ? right / notes : 0, tries: of.length });
  }
  return out;
};
const addDays = (iso: string, days: number) => {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** a note's mark for the diary: 1 right, + high, - low, 0 not heard */
export const markOf = (hit: boolean, dev: number | null) => (hit ? '1' : dev == null ? '0' : dev > 0 ? '+' : '-');

/** a phrase's last tries (newest last, ≤ 4) for its page in the diary (idea „ხმის დღიური“, the board with dots) */
export const phraseTries = (takes: AiTake[] | undefined, p: string, max = 4) =>
  (takes ?? []).filter(t => t.p === p).slice(-max);

/** the note sung off most often over those tries, and which way: „მე-4 ნოტი — სამ ცდაში დაბლა იყო“; null when none twice */
export const worstNote = (tries: AiTake[]): { i: number; dir: 'high' | 'low' | 'missed'; count: number } | null => {
  const n = Math.max(0, ...tries.map(t => t.x?.length ?? 0));
  let best: { i: number; dir: 'high' | 'low' | 'missed'; count: number } | null = null;
  for (let i = 0; i < n; i++) {
    const marks = tries.map(t => t.x?.[i]).filter(Boolean);
    for (const [m, dir] of [['-', 'low'], ['+', 'high'], ['0', 'missed']] as const) {
      const count = marks.filter(x => x === m).length;
      if (count >= 2 && (!best || count > best.count)) best = { i, dir, count };
    }
  }
  return best;
};
const COUNT_WORDS = ['', 'ერთ', 'ორ', 'სამ', 'ოთხ'];
/** „სამ ცდაში დაბლა იყო“ */
export const worstLine = (w: { dir: 'high' | 'low' | 'missed'; count: number }) =>
  `${COUNT_WORDS[w.count] ?? w.count} ცდაში ${w.dir === 'low' ? 'დაბლა იყო' : w.dir === 'high' ? 'მაღლა იყო' : 'არ გაისმა'}`;
/** „მე-4 ნოტი“ */
export const noteOrdinal = (i: number) => (i === 0 ? 'პირველი ნოტი' : `მე-${i + 1} ნოტი`);
/** „ოთხი ცდა“ */
export const triesWord = (n: number) => `${['', 'ერთი', 'ორი', 'სამი', 'ოთხი'][n] ?? n} ცდა`;

/** „10-დან 8“ of a share */
export const tenOf = (share: number) => Math.max(0, Math.min(10, Math.round(share * 10)));

/** the piece sung best and the phrase that needs work, over the takes of the last four weeks */
export const bestAndWorst = (takes: AiTake[] | undefined, today: string) => {
  const by = new Map<string, { h: number; n: number }>();
  for (const t of takes ?? []) {
    if (daysBetween(t.d, today) > 28) continue;
    const s = by.get(t.p) ?? { h: 0, n: 0 };
    s.h += t.h; s.n += t.n;
    by.set(t.p, s);
  }
  const list = [...by.entries()].filter(([, s]) => s.n >= 4).map(([p, s]) => ({ p, share: s.h / s.n }));
  if (!list.length) return { best: null, worst: null };
  list.sort((a, b) => b.share - a.share);
  const best = list[0];
  const worst = list.length > 1 && list[list.length - 1].share < 0.8 ? list[list.length - 1] : null;
  return { best, worst };
};

// ---- the notebook (ai-rveuli) ---------------------------------------------------------------------------------------------

/** when one practises most: morning, day or evening — from the hours of the takes */
export const usualTime = (takes: AiTake[] | undefined): string | null => {
  const n = { m: 0, d: 0, e: 0 };
  for (const t of takes ?? []) {
    if (typeof t.t !== 'number') continue;
    if (t.t >= 5 && t.t < 12) n.m++; else if (t.t >= 12 && t.t < 18) n.d++; else n.e++;
  }
  const total = n.m + n.d + n.e;
  if (total < 6) return null;
  const top = (Object.entries(n) as ['m' | 'd' | 'e', number][]).sort((a, b) => b[1] - a[1])[0];
  if (top[1] / total < 0.5) return null;
  return top[0] === 'm' ? 'დილით' : top[0] === 'd' ? 'შუადღისას' : 'საღამოს';
};

export type FactSource = 'voice' | 'misses' | 'takes';
export interface Fact { id: FactSource; title: string; sub: string }

/** everything the teacher remembers, each line with where it came from; deleting a line deletes its source */
export const factsOf = (note: AiNote | undefined, today: string): Fact[] => {
  const out: Fact[] = [];
  if (note?.voice) out.push({ id: 'voice', title: `ხმა: ${rangeLabel(note.voice.low, note.voice.high)} · ${ROMAN[note.voice.part]} ხმა`, sub: 'ხმის შემოწმებიდან' });
  const week = weakLeap(note?.misses, today);
  const weak = week ?? strongestMiss(note?.misses);
  if (weak) out.push({ id: 'misses', title: `გიჭირს: ნახტომი ${leapLabel(weak.key)}`, sub: week ? 'ბოლო კვირის ცდებიდან' : 'ბოლო ცდებიდან' });
  const time = usualTime(note?.takes);
  if (time) out.push({ id: 'takes', title: `ყველაზე ხშირად ${time} ვარჯიშობ`, sub: 'გაკვეთილების დროიდან' });
  return out;
};
const ROMAN: Record<1 | 2 | 3, string> = { 1: 'I', 2: 'II', 3: 'III' };
const strongestMiss = (misses: Record<string, AiMiss> | undefined) => {
  let best: { key: string; n: number } | null = null;
  for (const [key, m] of Object.entries(misses ?? {})) if (m.n >= 2 && (!best || m.n > best.n)) best = { key, n: m.n };
  return best;
};

/** a line of the notebook's four bars, from the share passed on „ოსტატობის გზა“ (0–1) */
export const lineWord = (share: number) => (share >= 0.66 ? 'კარგია' : share >= 0.25 ? 'იზრდება' : 'სავარჯიშოა');
