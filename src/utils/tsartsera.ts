// „ხუცური წარწერა“ (2026-11-01, the plan's Georgian game №6, like Cryptogram): a line of poetry, a holy father's word or a
// proverb is written in asomtavruli or nuskhuri — the cipher is the old alphabet itself. Under every old letter an empty box:
// the player tells which of today's letters it is, and the guess fills every box of that letter at once. Familiar words open
// the key; at the end the whole line reads and its author shows.
//
// A line's letters stand for themselves: the cipher letter of „ა“ is „ა“ drawn in the old script, so the board keeps the
// player's guesses by the true letter (`Guesses`: true letter → guess). Two ways to play: „საიდუმლო“ — no key, a letter or
// three given, a wrong guess allowed until the board is full; „გასაღებით“ — the alphabet's key under the board and a wrong
// letter is refused at once (learning). A hint opens one letter for good.

import { hangiStats, hash32, pickOfDay, type HangiDay } from './hangi';
import { mulberry32 } from './otkheuli';
import { SCRIPT_BY, isScript, type Script } from './oldScripts';

export type TsKind = 'rustaveli' | 'poetry' | 'fathers' | 'proverb';
export interface TsLine { id: string; text: string; by: string; from?: string; kind: TsKind }

/** what the board says before the end: the kind of line, never its author */
export const KIND_LABEL: Record<TsKind, string> = {
  rustaveli: 'ვეფხისტყაოსანი',
  poetry: 'ქართული ლექსი',
  fathers: 'წმიდა მამათა სიტყვა',
  proverb: 'ანდაზა',
};

export type TsMode = 'secret' | 'key';
export const TS_MODES: TsMode[] = ['secret', 'key'];
export const MODE_LABEL: Record<TsMode, string> = { secret: 'საიდუმლო', key: 'გასაღებით' };
export const isMode = (v: unknown): v is TsMode => TS_MODES.includes(v as TsMode);
/** the old scripts only: a line in today's letters would hide nothing */
export const TS_SCRIPTS: Script[] = ['asomtavruli', 'nuskhuri'];

export const isLetter = (ch: string) => ch >= 'ა' && ch <= 'ჰ';
/** the line's letters, each once, in the order they first come */
export const lettersOf = (text: string): string[] => [...new Set([...text].filter(isLetter))];
export const letterCount = (text: string) => [...text].filter(isLetter).length;
export const countsOf = (text: string): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const ch of text) if (isLetter(ch)) out[ch] = (out[ch] ?? 0) + 1;
  return out;
};
/** the longest run without a space or a line's end — the board's row must hold it */
export const longestWord = (text: string) => Math.max(1, ...text.split(/[\s]+/).map(w => [...w].length));

export type Guesses = Record<string, string>;

/** the letters open from the start in „საიდუმლო“: the most frequent one, then others of the line at random — more for a long line */
export const givenLetters = (text: string, rnd: () => number): string[] => {
  const counts = countsOf(text);
  const all = lettersOf(text);
  const n = letterCount(text);
  const want = Math.min(all.length - 1, n < 30 ? 1 : n < 70 ? 2 : 3);
  if (want <= 0) return [];
  const byCount = [...all].sort((a, b) => counts[b] - counts[a] || all.indexOf(a) - all.indexOf(b));
  const out = [byCount[0]];
  const rest = byCount.slice(1).filter(c => counts[c] >= 2);
  const pool = rest.length >= want - 1 ? rest : byCount.slice(1);
  while (out.length < want && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
};

/** `guess` under the old letter of `c`; a guess already standing under another letter moves here */
export const assign = (guesses: Guesses, c: string, guess: string): Guesses => {
  const next: Guesses = {};
  for (const [k, v] of Object.entries(guesses)) if (v !== guess && k !== c) next[k] = v;
  next[c] = guess;
  return next;
};
export const clearGuess = (guesses: Guesses, c: string): Guesses => {
  const next = { ...guesses };
  delete next[c];
  return next;
};

/** what a box shows: an open (given or hinted) letter, else the guess */
export const shownOf = (c: string, guesses: Guesses, open: string[]) => (open.includes(c) ? c : guesses[c] ?? '');
export const isFull = (text: string, guesses: Guesses, open: string[]) => lettersOf(text).every(c => !!shownOf(c, guesses, open));
export const isSolved = (text: string, guesses: Guesses, open: string[]) => lettersOf(text).every(c => shownOf(c, guesses, open) === c);
/** the letters guessed wrong (the board's „შეცდომების ჩვენება“) */
export const wrongOf = (text: string, guesses: Guesses, open: string[]) => lettersOf(text).filter(c => !open.includes(c) && !!guesses[c] && guesses[c] !== c);

/** a hint: the letter asked when it isn't right yet, else the most frequent letter not yet right */
export const hintFor = (text: string, guesses: Guesses, open: string[], asked?: string | null): string | null => {
  const wrongOrEmpty = (c: string) => shownOf(c, guesses, open) !== c;
  if (asked && lettersOf(text).includes(asked) && !open.includes(asked) && wrongOrEmpty(asked)) return asked;
  const counts = countsOf(text);
  const all = lettersOf(text);
  const left = all.filter(c => !open.includes(c) && wrongOrEmpty(c));
  if (!left.length) return null;
  return left.sort((a, b) => counts[b] - counts[a] || all.indexOf(a) - all.indexOf(b))[0];
};

/** the next letter to fill in reading order after `from` (round to the start): one without a guess, else null */
export const nextOpen = (text: string, guesses: Guesses, open: string[], from?: string | null): string | null => {
  const order = lettersOf(text);
  const start = from ? order.indexOf(from) : -1;
  for (let k = 1; k <= order.length; k++) {
    const c = order[(start + k + order.length) % order.length];
    if (!shownOf(c, guesses, open)) return c;
  }
  return null;
};

// ---------- the day's line, more lines ----------

/** a line fit for the board: today's letters only, not too short */
export const usable = (l: TsLine) => letterCount(l.text) >= 12 && ![...l.text].some(c => c >= 'ჱ' && c <= 'ჿ');

export const lineOfDay = (lines: TsLine[], iso: string) => pickOfDay(lines.filter(usable), iso);
export const randomLine = (lines: TsLine[], seed: number, avoid: string[] = []): TsLine | undefined => {
  const pool = lines.filter(l => usable(l) && !avoid.includes(l.id));
  const from = pool.length ? pool : lines.filter(usable);
  return from.length ? from[Math.floor(mulberry32(seed)() * from.length)] : undefined;
};
/** the letters a day's board opens: the same for the whole school */
export const givenOfDay = (line: TsLine, iso: string) => givenLetters(line.text, mulberry32(hash32(`tsartsera|${iso}|${line.id}`)));

// ---------- the day's record ----------
// HangiDay.guesses holds only marks: `t:<seconds>`, `h:<hints>`, `s:<script>`, `m:<mode>`; the board on the way stays on the device.

const mark = (d: HangiDay, k: string) => d.guesses.find(g => g.startsWith(`${k}:`))?.slice(k.length + 1);
export const timeOf = (d: HangiDay) => Math.max(0, Number(mark(d, 't')) || 0);
export const hintsOf = (d: HangiDay) => Math.max(0, Number(mark(d, 'h')) || 0);
export const scriptOf = (d: HangiDay): Script => { const s = mark(d, 's'); return isScript(s) && s !== 'mkhedruli' ? s : 'asomtavruli'; };
export const modeOf = (d: HangiDay): TsMode => { const m = mark(d, 'm'); return isMode(m) ? m : 'secret'; };

export const dayId = (iso: string, line: TsLine) => `${iso}|${line.id}`;
/** the day ends: solved (or not, „პასუხის ჩვენება“) with its time, hints, script and way */
export const finished = (id: string, won: boolean, secs: number, hints: number, script: Script, mode: TsMode): HangiDay => ({
  id, won, done: true, guesses: [`t:${Math.round(secs)}`, `h:${hints}`, `s:${script}`, `m:${mode}`],
});

/** 2:05 */
export const clock = (secs: number) => `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;

export interface TsStats { played: number; won: number; streak: number; best: number; fastest: number | null; clean: number }
export const tsStats = (days: Record<string, HangiDay>, today: string): TsStats => {
  const { played, won, streak, best } = hangiStats(days, today);
  let fastest: number | null = null;
  let clean = 0;
  for (const d of Object.values(days)) {
    if (!d.done || !d.won) continue;
    const t = timeOf(d);
    if (t > 0 && (fastest === null || t < fastest)) fastest = t;
    if (!hintsOf(d) && modeOf(d) === 'secret') clean++;
  }
  return { played, won, streak, best, fastest, clean };
};

const hintsWord = (n: number) => (n ? `მინიშნება ${n}` : 'მინიშნების გარეშე');
/** the result for the clipboard or the share sheet, without the line */
export const tsShareText = (n: number, day: HangiDay, site = 'sagandzureli.ge') => {
  const head = `ხუცური წარწერა №${n} · ${SCRIPT_BY[scriptOf(day)]}${modeOf(day) === 'key' ? ', გასაღებით' : ''}`;
  const line = day.won ? `✅ ${clock(timeOf(day))} · ${hintsWord(hintsOf(day))}` : '📜 ამოუხსნელი';
  return [head, line, `საგანძურის სკოლა · ${site}`].join('\n');
};

/** one line for the games hub's row: today's result, or the streak while today is still open */
export const tsMeta = (days: Record<string, HangiDay>, today: string): string | undefined => {
  const d = days[today];
  if (d?.done) return d.won ? `დღეს ამოხსენი · ${clock(timeOf(d))}` : 'დღეს ვერ ამოხსენი';
  const { streak } = hangiStats(days, today);
  return streak ? `სერია: ${streak} დღე` : undefined;
};

// ---------- the old letters a player has learnt (this device) ----------

export type Known = Partial<Record<Script, string[]>>;
/** after a solved board: the letters the player found themself join the script's learnt ones */
export const withKnown = (known: Known, script: Script, letters: string[]): Known => {
  const had = known[script] ?? [];
  return { ...known, [script]: [...new Set([...had, ...letters.filter(isLetter)])] };
};
export const readKnown = (raw: unknown): Known => {
  const out: Known = {};
  if (raw && typeof raw === 'object') {
    for (const s of TS_SCRIPTS) {
      const v = (raw as Record<string, unknown>)[s];
      if (Array.isArray(v)) out[s] = [...new Set(v.filter((x): x is string => typeof x === 'string' && x.length === 1 && isLetter(x)))];
    }
  }
  return out;
};
