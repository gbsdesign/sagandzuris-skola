// "ფსალმუნთა ჯგუფი": a group reads the whole Psalter — twenty kathismas, one per reader — in every
// cycle of one or two days. Pure date and rotation rules live here (tests: tests/psalter.test.ts).
//
// • Dates are Georgian calendar days (Asia/Tbilisi is UTC+4 all year, no daylight saving), never the
//   phone's own clock zone.
// • The year is cut into half-months: the 1st–14th and the 15th–end. Cycles start afresh on the 1st
//   and the 15th; a day left over at the end of a half-month joins its last cycle (so with two-day
//   cycles one cycle may last three days).
// • On the 1st and the 15th everyone moves one kathisma on (7 → 8, 20 → 1), so in ten months each
//   reader goes through all twenty. The kathisma is worked out from the date: nobody switches anything.
// • A group stores its distribution (kathisma → readers) for one half-month, `baseHalf`; other
//   half-months are that distribution turned by the number of half-months in between.

export const KATHISMA_COUNT = 20;
const TBILISI_OFFSET_MS = 4 * 3600_000;
const DAY_MS = 86400_000;

export type Iso = string; // YYYY-MM-DD

const pad = (n: number) => String(n).padStart(2, '0');
export const isoOf = (y: number, m: number, d: number): Iso => `${y}-${pad(m)}-${pad(d)}`;
export const parseIso = (iso: Iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
};
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Today's date in Georgia. */
export const georgiaToday = (now: Date = new Date()): Iso => new Date(now.getTime() + TBILISI_OFFSET_MS).toISOString().slice(0, 10);

/** The moment a Georgian day begins (00:00 in Tbilisi). */
export const georgiaMidnight = (iso: Iso): number => {
  const { y, m, d } = parseIso(iso);
  return Date.UTC(y, m - 1, d) - TBILISI_OFFSET_MS;
};

export const addDays = (iso: Iso, n: number): Iso => {
  const { y, m, d } = parseIso(iso);
  return new Date(Date.UTC(y, m - 1, d) + n * DAY_MS).toISOString().slice(0, 10);
};

/** Half-month number: two per month, counted from year 0. */
export const halfIndex = (iso: Iso) => {
  const { y, m, d } = parseIso(iso);
  return (y * 12 + (m - 1)) * 2 + (d >= 15 ? 1 : 0);
};

export interface Cycle {
  id: Iso;      // the first day; also the Firestore document id
  start: Iso;
  end: Iso;     // the last day (inclusive)
  half: number; // half-month of the cycle (decides who reads which kathisma)
  days: number;
}

/** The cycle that a day belongs to. */
export const cycleOf = (iso: Iso, cycleDays: number): Cycle => {
  const len = cycleDays === 1 ? 1 : 2;
  const { y, m, d } = parseIso(iso);
  const first = d >= 15 ? 15 : 1;
  const last = d >= 15 ? daysInMonth(y, m) : 14;
  const count = Math.max(1, Math.floor((last - first + 1) / len));
  const idx = Math.min(Math.floor((d - first) / len), count - 1);
  const startDay = first + idx * len;
  const endDay = idx === count - 1 ? last : startDay + len - 1;
  const start = isoOf(y, m, startDay);
  return { id: start, start, end: isoOf(y, m, endDay), half: halfIndex(start), days: endDay - startDay + 1 };
};

export const previousCycle = (c: Cycle, cycleDays: number) => cycleOf(addDays(c.start, -1), cycleDays);
export const nextCycle = (c: Cycle, cycleDays: number) => cycleOf(addDays(c.end, 1), cycleDays);

/** Milliseconds until the cycle ends (midnight after its last day, Georgian time). */
export const msLeft = (c: Cycle, now: Date = new Date()) => georgiaMidnight(addDays(c.end, 1)) - now.getTime();

export const wrap = (k: number) => ((((k - 1) % KATHISMA_COUNT) + KATHISMA_COUNT) % KATHISMA_COUNT) + 1;

export type Assignment = Record<string, string[]>; // "1".."20" → reader uids

/** Who reads each kathisma in the given half-month. */
export const ownersIn = (assignment: Assignment, baseHalf: number, half: number): Record<number, string[]> => {
  const shift = half - baseHalf;
  const out: Record<number, string[]> = {};
  for (let k = 1; k <= KATHISMA_COUNT; k++) out[k] = [...(assignment[String(wrap(k - shift))] || [])];
  return out;
};

/** The same distribution written for another half-month (when the teacher edits it "as of now"). */
export const rebase = (owners: Record<number, string[]>): Assignment =>
  Object.fromEntries(Array.from({ length: KATHISMA_COUNT }, (_, i) => [String(i + 1), [...(owners[i + 1] || [])]]));

export const kathismasOf = (owners: Record<number, string[]>, uid: string) =>
  Object.entries(owners).filter(([, list]) => list.includes(uid)).map(([k]) => Number(k));

/** Round-robin distribution: with fewer than twenty readers some get two; with more, the rest wait in reserve. */
export const autoDistribute = (memberIds: string[]): Record<number, string[]> => {
  const out: Record<number, string[]> = {};
  for (let k = 1; k <= KATHISMA_COUNT; k++) out[k] = memberIds.length ? [memberIds[(k - 1) % memberIds.length]] : [];
  return out;
};

// ---- one cycle's marks ------------------------------------------------------------------------

export interface Slot {
  readBy?: string;
  readAt?: string;
  takenBy?: string;
  takenAt?: string;
  help?: { by: string; at: string };
}
export type Slots = Record<string, Slot>;

export type SlotState = 'read' | 'taken' | 'unread' | 'free' | 'skipped';

/** The state of a kathisma in a cycle; once the cycle is over, anything unread was skipped. */
export const slotState = (slot: Slot | undefined, owners: string[], over: boolean): SlotState => {
  if (slot?.readBy) return 'read';
  if (over) return 'skipped';
  if (slot?.takenBy) return 'taken';
  return owners.length ? 'unread' : 'free';
};

/** Who answers for a kathisma now: whoever took it, otherwise its readers. */
export const responsible = (slot: Slot | undefined, owners: string[]) => (slot?.takenBy ? [slot.takenBy] : owners);

export const readCount = (slots: Slots | undefined) =>
  Object.entries(slots || {}).filter(([k, s]) => Number(k) >= 1 && Number(k) <= KATHISMA_COUNT && s?.readBy).length;

export const KATHISMA_PSALMS = ['1–8', '9–16', '17–23', '24–31', '32–36', '37–45', '46–54', '55–63', '64–69', '70–76', '77–84', '85–90', '91–100', '101–104', '105–108', '109–117', '118', '119–133', '134–142', '143–150'];

/** "1 დღე 5 სთ", "3 სთ 20 წთ", "15 წთ". */
export const formatLeft = (ms: number) => {
  if (ms <= 0) return 'დასრულდა';
  const min = Math.floor(ms / 60_000);
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const mm = min % 60;
  if (d > 0) return `${d} დღე${h ? ` ${h} სთ` : ''}`;
  if (h > 0) return `${h} სთ${mm ? ` ${mm} წთ` : ''}`;
  return `${Math.max(1, mm)} წთ`;
};

const MONTHS_GEN = ['იანვრის', 'თებერვლის', 'მარტის', 'აპრილის', 'მაისის', 'ივნისის', 'ივლისის', 'აგვისტოს', 'სექტემბრის', 'ოქტომბრის', 'ნოემბრის', 'დეკემბრის'];
const MONTHS = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'];

/** "6–7 ოქტომბერი", "31 ოქტომბერი – 1 ნოემბერი", "15 ოქტომბერი". */
export const formatRange = (c: Pick<Cycle, 'start' | 'end'>) => {
  const a = parseIso(c.start), b = parseIso(c.end);
  if (c.start === c.end) return `${a.d} ${MONTHS[a.m - 1]}`;
  if (a.m === b.m) return `${a.d}–${b.d} ${MONTHS[a.m - 1]}`;
  return `${a.d} ${MONTHS[a.m - 1]} – ${b.d} ${MONTHS[b.m - 1]}`;
};

/** When the next shift of kathismas happens: { label: "15 ოქტომბრის", from: "15 ოქტომბრიდან" }. */
export const nextShiftDate = (iso: Iso) => {
  const { y, m, d } = parseIso(iso);
  const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1;
  const [day, month, at] = d < 15 ? [15, m, isoOf(y, m, 15)] : [1, nm, isoOf(ny, nm, 1)];
  const gen = MONTHS_GEN[month - 1];
  return { iso: at, label: `${day} ${gen}`, from: `${day} ${gen.replace(/ს$/, 'დან')}` };
};
