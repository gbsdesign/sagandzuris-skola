import { tbilisiToday } from './hangi';

// „ჩემი ვაზი“ (2026-11-01, the plan's Georgian game №1, like Tamagotchi): every member's vine grows from what they did in the
// app, day by day. Nothing new is stored — it is all read from the member's own record (students/{uid}): a habit ticked, a
// daily game finished, a part practised in the learning mode, an exercise done (the old pearls game's
// polished pearls counted too until it was removed, 2026-11-05). Each deed is a leaf, at most
// LEAF_CAP a day. A month's leaves give bunches (BUNCH_AT); they ripen when the month is over. The season runs from November
// to October, so the autumn's „რთველი“ counts the whole year; on 1 November the bunches go into the qvevri. A leaf stays on
// the vine RECENT_DAYS days, the wood grows from every leaf ever: a vine cared for lately is thick with leaves, one left alone
// yellows and then stands bare — it never dies, and a deed makes it green again.

export type DeedKind = 'habits' | 'games' | 'learn' | 'drills';
export const DEED_KINDS: DeedKind[] = ['habits', 'games', 'learn', 'drills'];
export const DEED_LABEL: Record<DeedKind, string> = {
  habits: 'ჩვევები', games: 'დღის თამაშები', learn: 'სწავლის რეჟიმი', drills: 'ოსტატობის სავარჯიშოები',
};
export type DayDeeds = Partial<Record<DeedKind, number>>;
/** iso day → what was done that day */
export type Deeds = Record<string, DayDeeds>;

/** leaves a day at most, so ten habits at once do not make a jungle */
export const LEAF_CAP = 8;
/** a month's leaves for its first, second and third bunch */
export const BUNCH_AT = [12, 30, 50];
/** the season starts on this month (1–12): November, after the autumn's harvest */
export const SEASON_MONTH = 11;
/** a leaf stays on the vine this many days (today among them), then falls; the wood it grew stays */
export const RECENT_DAYS = 30;

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {});
/** a day as the records keep it: a plain day stays, a moment (ISO time) becomes its Tbilisi day */
const dayOf = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  if (ISO.test(v)) return v;
  if (!/^\d{4}-\d{2}-\d{2}T/.test(v)) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? tbilisiToday(t) : null;
};

/** What a member did, day by day, from their record (students/{uid}) — or from the device's copy of the daily games. */
export const deedsOf = (data: Record<string, unknown> | null | undefined): Deeds => {
  const out: Deeds = {};
  const add = (day: string | null, kind: DeedKind, n = 1) => {
    if (!day || n <= 0) return;
    const d = (out[day] ||= {});
    d[kind] = (d[kind] ?? 0) + n;
  };
  const d = obj(data);
  for (const [day, list] of Object.entries(obj(d.habitLog))) {
    if (ISO.test(day) && Array.isArray(list)) add(day, 'habits', new Set(list.filter(x => typeof x === 'string')).size);
  }
  for (const game of Object.values(obj(d.games))) {
    for (const [day, rec] of Object.entries(obj(obj(game).days))) if (ISO.test(day) && obj(rec).done === true) add(day, 'games');
  }
  // the learning mode keeps each part's last day of practice
  for (const piece of Object.values(obj(d.learning))) for (const part of Object.values(obj(piece))) add(dayOf(obj(part).at), 'learn');
  for (const day of Object.values(obj(d.drillDone))) add(dayOf(day), 'drills');
  return out;
};

export const deedCount = (d: DayDeeds | undefined) => DEED_KINDS.reduce((n, k) => n + (d?.[k] ?? 0), 0);
export const leavesOfDay = (d: DayDeeds | undefined) => Math.min(LEAF_CAP, deedCount(d));
export const bunchesOf = (leaves: number) => BUNCH_AT.filter(t => leaves >= t).length;
/** the month's leaves wanted for its next bunch (null when it has them all) */
export const nextBunchAt = (leaves: number) => BUNCH_AT.find(t => leaves < t) ?? null;

const monthOf = (iso: string) => iso.slice(0, 7);
/** the first month of the season `iso` falls in, 'YYYY-MM' */
export const seasonOf = (iso: string) => {
  const y = +iso.slice(0, 4), m = +iso.slice(5, 7);
  return `${m >= SEASON_MONTH ? y : y - 1}-${String(SEASON_MONTH).padStart(2, '0')}`;
};
const DAY_MS = 86_400_000;
const utc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
export const addDays = (iso: string, n: number) => new Date(utc(iso) + n * DAY_MS).toISOString().slice(0, 10);

export interface MonthBunches { key: string; leaves: number; bunches: number }
export interface Vine {
  /** every leaf so far: the wood grows from them */
  leaves: number;
  /** the leaves on the vine now: the last RECENT_DAYS days' */
  recent: number;
  /** today's deeds and leaves */
  todayDeeds: DayDeeds;
  today: number;
  /** this month: its leaves and bunches, still green */
  month: MonthBunches & { next: number | null };
  /** the season's months that are over, each with its ripe bunches (oldest first) */
  ripe: MonthBunches[];
  /** bunches on the vine this season: the ripe ones and this month's */
  seasonBunches: number;
  /** bunches of the seasons before, in the qvevri */
  cellar: number;
  /** days since the last deed (0 = today); null = nothing yet */
  idle: number | null;
  /** the last 14 days, oldest first */
  days: { iso: string; leaves: number }[];
}

export const vineOf = (deeds: Deeds, today: string): Vine => {
  const past = Object.keys(deeds).filter(iso => iso <= today).sort();
  const months = new Map<string, number>();
  let leaves = 0;
  for (const iso of past) {
    const n = leavesOfDay(deeds[iso]);
    if (!n) continue;
    leaves += n;
    months.set(monthOf(iso), (months.get(monthOf(iso)) ?? 0) + n);
  }
  const now = monthOf(today), season = seasonOf(today);
  const monthLeaves = months.get(now) ?? 0;
  const ripe: MonthBunches[] = [];
  let cellar = 0;
  for (const [key, n] of [...months].sort(([a], [b]) => a.localeCompare(b))) {
    if (key >= now) continue;
    const bunches = bunchesOf(n);
    if (key >= season) ripe.push({ key, leaves: n, bunches });
    else cellar += bunches;
  }
  const active = past.filter(iso => leavesOfDay(deeds[iso]) > 0);
  const last = active[active.length - 1];
  const month = { key: now, leaves: monthLeaves, bunches: bunchesOf(monthLeaves), next: nextBunchAt(monthLeaves) };
  const from = addDays(today, 1 - RECENT_DAYS);
  return {
    leaves,
    recent: past.filter(iso => iso >= from).reduce((n, iso) => n + leavesOfDay(deeds[iso]), 0),
    todayDeeds: deeds[today] ?? {},
    today: leavesOfDay(deeds[today]),
    month,
    ripe,
    seasonBunches: ripe.reduce((n, m) => n + m.bunches, 0) + month.bunches,
    cellar,
    idle: last ? Math.round((utc(today) - utc(last)) / DAY_MS) : null,
    days: Array.from({ length: 14 }, (_, i) => { const iso = addDays(today, i - 13); return { iso, leaves: leavesOfDay(deeds[iso]) }; }),
  };
};

/** the share of leaves gone yellow after `idle` days without a deed — it never reaches all of them */
export const yellowShare = (idle: number | null) =>
  idle === null || idle <= 2 ? 0 : idle <= 3 ? 0.15 : idle <= 4 ? 0.25 : idle <= 6 ? 0.4 : idle <= 13 ? 0.6 : 0.8;

/** the vine's mood in a line, for the card under the picture */
export const vineMood = (v: Vine): string =>
  v.idle === null ? 'ნერგი დარგულია — პირველი საქმე პირველ ფოთოლს გამოიტანს.'
    : v.idle === 0 ? (v.today >= 3 ? 'ვაზი ხარობს — დღეს კარგად მოუარე!' : 'ვაზს დღეს წყალი მიეცი — კიდევ ერთი საქმე, კიდევ ერთი ფოთოლი.')
      : v.idle <= 2 ? 'ვაზი კარგადაა, მაგრამ დღეს ჯერ არაფერი გაგიკეთებია.'
        : v.recent === 0 ? `ვაზმა ფოთოლი დაყარა — ${v.idle} დღეა არაფერი. ერთი საქმეც და ახალი ამოვა.`
          : `ვაზი ყვითლდება — ${v.idle} დღეა არაფერი. ერთი საქმეც და ისევ გამწვანდება.`;

export const MONTHS_SHORT = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];
export const monthShort = (key: string) => MONTHS_SHORT[+key.slice(5, 7) - 1] ?? key;

/** a class's harvest: every member's bunches on the vine this season, and the sum */
export const harvestOf = (vines: { uid: string; vine: Vine }[]) => ({
  total: vines.reduce((n, x) => n + x.vine.seasonBunches, 0),
  ripe: vines.reduce((n, x) => n + x.vine.ripe.reduce((a, m) => a + m.bunches, 0), 0),
});
