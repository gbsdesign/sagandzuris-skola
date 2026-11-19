import { weakLeap, type AiNote } from './aiPlan';
import { allLearned, assignedProgress, reviewsDue, type LearnRecord } from './learn';
import type { Voice } from './pathItems';

// „კვირის ანგარიში“ — the AI teacher's last seven days for each member of a class, from their students/{uid} record:
// aiLesson.days {[day]: {min, learned, reviews}} and aiNote (takes, misses). Pure.

export type WeekStatus = 'good' | 'help' | 'skip';
export interface MemberWeek { uid: string; name: string; lessons: number; minutes: number; newPhrases: number; status: WeekStatus; line: string }
export interface WeekTotals { members: number; lessons: number; minutes: number; practice: string }
export interface WeekInput { uid: string; name: string; data?: Record<string, any> | null }

const shift = (iso: string, days: number) => {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** „40 წთ“ / „5 სთ“ / „1,5 სთ“ */
export const practiceLabel = (minutes: number) => {
  if (minutes < 60) return `${Math.round(minutes)} წთ`;
  const h = Math.round(minutes / 6) / 10;
  return `${String(h).replace('.', ',')} სთ`;
};

export const statusWord = (s: WeekStatus) => (s === 'good' ? 'კარგად' : s === 'help' ? 'დასახმარი' : 'გამოტოვა');

export const memberWeek = (m: WeekInput, today: string): MemberWeek => {
  const from = shift(today, -6);
  const inWeek = (d: string) => d >= from && d <= today;
  let lessons = 0, minutes = 0, newPhrases = 0;
  const days = m.data?.aiLesson?.days;
  if (days && typeof days === 'object') {
    for (const [day, v] of Object.entries<any>(days)) {
      if (!inWeek(day) || !v) continue;
      lessons += 1;
      minutes += Number(v.min) || 0;
      newPhrases += Number(v.learned) || 0;
    }
  }
  const note: AiNote | undefined = m.data?.aiNote;
  const takes = (note?.takes ?? []).filter(t => inWeek(t.d) && t.n > 0);
  const low = takes.filter(t => t.h / t.n < 0.5).length;
  // the teacher's „AI შეცდა“ on this week's „stuck“ (students.aiErred, the week's last day) takes it off here too
  const stuck = aiErredWeek(m.data) !== today && (!!weakLeap(note?.misses, today) || (takes.length >= 3 && low * 2 > takes.length));
  const status: WeekStatus = lessons === 0 ? 'skip' : stuck ? 'help' : 'good';
  const line = status === 'skip' ? 'ამ კვირაში არ უვარჯიშია'
    : status === 'help' ? `${lessons} გაკვეთილი · გაიჭედა`
    : `${lessons} გაკვეთილი · ${newPhrases} ახალი ფრაზა`;
  return { uid: m.uid, name: m.name, lessons, minutes, newPhrases, status, line };
};

export const weekReport = (members: WeekInput[], today: string): { rows: MemberWeek[]; totals: WeekTotals } => {
  const rows = members.map(m => memberWeek(m, today));
  const lessons = rows.reduce((s, r) => s + r.lessons, 0);
  const minutes = rows.reduce((s, r) => s + r.minutes, 0);
  return { rows, totals: { members: rows.length, lessons, minutes, practice: practiceLabel(minutes) } };
};

// ---- „კვირის შეჯამება“ (boards x-idea-kvira-0 · x-idea-kvira · x-idea-kvira-2) -------------------------------------------
// The teacher's whole class on one screen, with or without the AI teacher: who practised, the lessons' attendance, the
// assignments done; two groups — „ყურადღება“ (did not practise / practised once, missed lessons, an assignment's deadline
// passed undone, and with the AI teacher on: stuck on a phrase) and „კარგად მიდის“ —, and a ready letter for each member.
// The week = the seven whole days before today (on Monday morning: Monday to Sunday). Pure: counted from the members'
// students/{uid} records, the class's attendance lists and its assignments. The reminders Worker counts the same
// „ივარჯიშა“ and „ყურადღება“ for its Monday notice (worker/reminders/reminders.js `weekCountOf`; tests/weekReport.test.ts
// keeps the two in step). The teacher's „AI შეცდა“ on a „stuck“ is students/{uid}.aiErred, for that week only.

export interface WeekRange { from: string; to: string }
/** the seven whole days before `today` */
export const weekRange = (today: string): WeekRange => ({ from: shift(today, -7), to: shift(today, -1) });

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const asObj = (v: unknown): Record<string, any> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, any> : {});
/** a day as the records keep it: a plain day stays, a moment (ISO time) becomes its Tbilisi day */
export const dayOfMoment = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  if (ISO.test(v)) return v;
  if (!/^\d{4}-\d{2}-\d{2}T/.test(v)) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t + 4 * 3_600_000).toISOString().slice(0, 10) : null;
};

/** Every day a member practised singing, from their record: the AI teacher's lessons, the learning mode (each part's last
 *  try), the exercises („შევასრულე“'s last day) and the independent work's ticked hours („YYYY-MM-DD_HH“). */
export const practiceDays = (data: Record<string, any> | null | undefined): Set<string> => {
  const out = new Set<string>();
  const add = (v: unknown) => { const d = dayOfMoment(v); if (d) out.add(d); };
  const d = asObj(data);
  for (const [day, v] of Object.entries(asObj(asObj(d.aiLesson).days))) if (v) add(day);
  for (const piece of Object.values(asObj(d.learning))) for (const part of Object.values(asObj(piece))) add(asObj(part).at);
  for (const day of Object.values(asObj(d.drillDone))) add(day);
  for (const [key, on] of Object.entries(asObj(d.completedSessions))) if (on) add(key.slice(0, 10));
  return out;
};

/** An assignment as the report needs it (hooks/useTeaching `Assignment`). */
export interface WeekAssignment {
  id: string; title: string; variantId?: string; exercise?: string; voices: string[]; due: string; studentIds: string[]; createdAt?: string;
}

/** The voices a member marked on their path for an item ('1' for a poem or an instrument marked learned). */
const markedVoices = (item: unknown): string[] => {
  const it = asObj(item);
  const v = it.voices;
  const arr = Array.isArray(v) ? v.map(String) : typeof v === 'string' ? v.split(',').map(s => s.trim()) : [];
  const voices = arr.filter(x => x === '1' || x === '2' || x === '3');
  return voices.length ? voices : it.isLearned ? ['1'] : [];
};

/** Done, as the teacher's assignment card counts it (components/teacher/AssignmentsPanel `progressOf`): an exercise pressed
 *  „შევასრულე“ since it was given; a chant or song learned whole in the learning mode or its voices marked on the path. */
export const assignmentDone = (a: WeekAssignment, data: Record<string, any> | null | undefined): boolean => {
  const d = asObj(data);
  if (a.exercise) return String(asObj(d.drillDone)[a.exercise] || '') >= (a.createdAt || '').slice(0, 10);
  if (!a.variantId) return false;
  if (allLearned(assignedProgress(a.variantId, d.learning, d.learnParts))) return true;
  const item = asObj(d.selectedChantVariants)[a.variantId];
  if (!item) return false;
  const marked = markedVoices(item);
  return a.voices.length ? a.voices.every(v => marked.includes(v)) : marked.length > 0;
};

export type Concern = 'idle' | 'little' | 'missed' | 'behind' | 'stuck';
export interface AiPassSeen { variantId: string; voice: Voice; at: string }

export interface WeekRow {
  uid: string;
  name: string;
  /** „ლუკა გ.“ */
  short: string;
  first: string;
  /** days practised this week */
  days: number;
  /** the last day practised ever (null: never) */
  last: string | null;
  /** the week's lessons and how many of them they came to */
  lessons: number;
  came: number;
  /** this week's assignments for them (deadline not before the week) and how many are done */
  work: number;
  workDone: number;
  /** titles of the ones whose deadline passed this week undone */
  late: string[];
  /** the AI teacher's: stuck on a phrase this week (null: not, or the teacher said the AI erred) */
  stuck: { piece: string; part: number | null } | null;
  /** the AI's „stuck“ the teacher marked „AI შეცდა“ for this week (it no longer counts) */
  erred: { piece: string; part: number | null } | null;
  /** the AI teacher's passes this week */
  passes: AiPassSeen[];
  /** a piece to go back to: reviews waiting first, else the one practised last */
  repeat: string | null;
  concerns: Concern[];
  group: 'attention' | 'good';
  line: string;
}

export interface ClassWeek extends WeekRange {
  rows: WeekRow[];
  attention: WeekRow[];
  good: WeekRow[];
  members: number;
  practised: number;
  /** % of the week's lessons attended; null when no lesson was marked this week */
  attendance: number | null;
  /** assignments done this week (member × assignment); null when the week had none */
  workDone: number | null;
}

export interface ClassWeekInput {
  members: WeekInput[];
  attendance: { date: string; present: string[] }[];
  assignments: WeekAssignment[];
  today: string;
  /** the AI teacher's lines (stuck, passes) — only while its switch is on */
  ai: boolean;
}

/** The week whose „stuck“ the teacher marked „AI შეცდა“ (students/{uid}.aiErred = { week: its last day, by, at }), or null. */
export const aiErredWeek = (data: Record<string, any> | null | undefined): string | null => {
  const w = asObj(asObj(data).aiErred).week;
  return typeof w === 'string' && ISO.test(w) ? w : null;
};

/** „ლუკა გიორგაძე“ → „ლუკა გ.“ */
export const shortName = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return words[0] || 'მოსწავლე';
  return `${words[0]} ${Array.from(words[words.length - 1])[0]}.`;
};

const NUM_WORDS: Record<number, string> = { 2: 'ორი', 3: 'სამი', 4: 'ოთხი' };
/** „ორივე“, „სამივე“… for a whole set; null for one or many */
const ALL_OF: Record<number, string> = { 2: 'ორივე', 3: 'სამივე', 4: 'ოთხივე', 5: 'ხუთივე' };

/** how long without practice: „ორი კვირაა არ უვარჯიშია“ */
const idleLine = (last: string | null, today: string) => {
  if (!last) return 'ჯერ არ უვარჯიშია';
  const weeks = Math.floor((Date.parse(today + 'T12:00:00Z') - Date.parse(last + 'T12:00:00Z')) / (7 * 86_400_000));
  if (weeks >= 2) return `${NUM_WORDS[weeks] ?? weeks} კვირაა არ უვარჯიშია`;
  return 'ამ კვირაში არ უვარჯიშია';
};

const workWords = (done: number, all: number) =>
  done === 1 && all === 1 ? 'დავალება' : done === all && ALL_OF[all] ? `${ALL_OF[all]} დავალება` : `${done} დავალება`;

/** the AI's „stuck“: a leap missed three times this week, else most of the week's whole tries under half right */
export const aiStuck = (note: AiNote | undefined, range: WeekRange): WeekRow['stuck'] => {
  const split = (p?: string) => {
    if (!p) return null;
    const i = p.lastIndexOf('~');
    const part = i > 0 ? Number(p.slice(i + 1)) : NaN;
    return { piece: i > 0 ? p.slice(0, i) : p, part: Number.isInteger(part) && part >= 0 ? part : null };
  };
  const leap = weakLeap(note?.misses, range.to);
  if (leap) return split(leap.piece) ?? { piece: '', part: null };
  const takes = (note?.takes ?? []).filter(t => t.d >= range.from && t.d <= range.to && t.n > 0);
  const low = takes.filter(t => t.h / t.n < 0.5);
  if (takes.length < 3 || low.length * 2 <= takes.length) return null;
  const count = new Map<string, number>();
  for (const t of low) count.set(t.p, (count.get(t.p) ?? 0) + 1);
  const p = [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return split(p) ?? { piece: '', part: null };
};

/** „მე-3 ფრაზაზე ჩერდება“ */
export const stuckLine = (s: NonNullable<WeekRow['stuck']>) => (s.part !== null ? `მე-${s.part + 1} ფრაზაზე ჩერდება` : 'ერთ ადგილას ჩერდება');

const missedLine = (lessons: number, came: number) => {
  const missed = lessons - came;
  return missed === 1 ? 'გაკვეთილი გააცდინა' : `${missed} გაკვეთილი გააცდინა`;
};

/** a piece to go back to: the one with most reviews waiting, else the one practised last in the learning mode */
const repeatOf = (data: Record<string, any> | null | undefined, today: string): string | null => {
  const learning = asObj(asObj(data).learning) as Record<string, LearnRecord>;
  const due = reviewsDue(learning, today)[0];
  if (due) return due.piece;
  let best: { piece: string; at: string } | null = null;
  for (const [piece, rec] of Object.entries(learning)) {
    for (const r of Object.values(asObj(rec))) {
      const at = dayOfMoment(asObj(r).at) || '';
      if (at && (!best || at > best.at)) best = { piece, at };
    }
  }
  return best?.piece ?? null;
};

const passesIn = (data: Record<string, any> | null | undefined, range: WeekRange): AiPassSeen[] => {
  const out: AiPassSeen[] = [];
  for (const [variantId, voices] of Object.entries(asObj(asObj(data).aiPass))) {
    for (const [voice, e] of Object.entries(asObj(voices))) {
      if (voice !== '1' && voice !== '2' && voice !== '3') continue;
      const at = dayOfMoment(asObj(e).at);
      if (at && at >= range.from && at <= range.to) out.push({ variantId, voice, at });
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
};

const CONCERN_ORDER: Concern[] = ['idle', 'missed', 'behind', 'stuck', 'little'];

export const classWeek = (input: ClassWeekInput): ClassWeek => {
  const range = weekRange(input.today);
  const inWeek = (d: string) => d >= range.from && d <= range.to;
  const ids = new Set(input.members.map(m => m.uid));
  const lessonDays = input.attendance.filter(d => inWeek(d.date));
  const weekWork = input.assignments.filter(a => a.due >= range.from && (!a.createdAt || a.createdAt.slice(0, 10) <= range.to));

  const rows = input.members.map((m): WeekRow => {
    const days = practiceDays(m.data);
    const week = [...days].filter(inWeek);
    const last = [...days].filter(d => d <= range.to).sort().pop() ?? null;
    const lessons = lessonDays.length;
    const came = lessonDays.filter(d => d.present.includes(m.uid)).length;
    const mine = weekWork.filter(a => !a.studentIds.length || a.studentIds.includes(m.uid));
    const done = mine.filter(a => assignmentDone(a, m.data));
    const late = mine.filter(a => a.due <= range.to && !done.includes(a)).map(a => a.title);
    const judged = input.ai ? aiStuck(m.data?.aiNote, range) : null;
    const erred = judged && aiErredWeek(m.data) === range.to ? judged : null;
    const stuck = erred ? null : judged;
    const passes = input.ai ? passesIn(m.data, range) : [];

    const concerns: Concern[] = [];
    if (week.length === 0) concerns.push('idle');
    else if (week.length === 1) concerns.push('little');
    if (lessons > 0 && came * 2 < lessons) concerns.push('missed');
    if (late.length) concerns.push('behind');
    if (stuck) concerns.push('stuck');
    concerns.sort((a, b) => CONCERN_ORDER.indexOf(a) - CONCERN_ORDER.indexOf(b));

    const say: Record<Concern, () => string> = {
      idle: () => idleLine(last, input.today),
      little: () => 'კვირაში ერთხელ ივარჯიშა',
      missed: () => missedLine(lessons, came),
      behind: () => (late.length === 1 ? 'დავალება ვადაში არ შეასრულა' : `${late.length} დავალება ვადაში არ შეასრულა`),
      stuck: () => stuckLine(stuck!),
    };
    const good: string[] = [`${week.length} დღე ივარჯიშა`];
    if (done.length) good.push(`${workWords(done.length, mine.length)} შეასრულა`);
    else if (passes.length) good.push(passes.length === 1 ? 'AI-ს ერთი ხმა ჩააბარა' : `AI-ს ${passes.length} ხმა ჩააბარა`);
    const line = concerns.length ? concerns.slice(0, 2).map(c => say[c]()).join(' · ') : good.join(' · ');

    return {
      uid: m.uid, name: m.name, short: shortName(m.name), first: m.name.trim().split(/\s+/)[0] || 'მოსწავლე',
      days: week.length, last, lessons, came, work: mine.length, workDone: done.length, late, stuck, erred, passes,
      repeat: repeatOf(m.data, input.today), concerns, group: concerns.length ? 'attention' : 'good', line,
    };
  });

  // the most pressing first: by the first concern, then the longest without practice
  const attention = rows.filter(r => r.group === 'attention').sort((a, b) =>
    CONCERN_ORDER.indexOf(a.concerns[0]) - CONCERN_ORDER.indexOf(b.concerns[0])
    || (a.last ?? '').localeCompare(b.last ?? '')
    || a.name.localeCompare(b.name, 'ka'));
  const good = rows.filter(r => r.group === 'good').sort((a, b) => b.days - a.days || b.workDone - a.workDone || a.name.localeCompare(b.name, 'ka'));
  const came = lessonDays.reduce((n, d) => n + d.present.filter(u => ids.has(u)).length, 0);
  return {
    ...range,
    rows, attention, good,
    members: rows.length,
    practised: rows.filter(r => r.days > 0).length,
    attendance: lessonDays.length && rows.length ? Math.round((came / (lessonDays.length * rows.length)) * 100) : null,
    workDone: weekWork.length ? rows.reduce((n, r) => n + r.workDone, 0) : null,
  };
};

const MONTHS_LONG = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'];
/** „1 ნოემბერი“ */
export const longDay = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS_LONG[Number(iso.slice(5, 7)) - 1] ?? ''}`.trim();
/** „9–15 ნოემბერი“, „28 ოქტომბერი – 3 ნოემბერი“ */
export const rangeLabel = ({ from, to }: WeekRange) =>
  from.slice(0, 7) === to.slice(0, 7) ? `${Number(from.slice(8, 10))}–${longDay(to)}` : `${longDay(from)} – ${longDay(to)}`;

/** The names a letter may mention (the screen resolves the pieces' names; the util stays free of the books). */
export interface LetterNames { repeat?: string | null; stuck?: string | null }

/** A ready, kind letter from the teacher, built from the member's week (never sent by itself). */
export const readyLetter = (r: WeekRow, names: LetterNames = {}): string => {
  const hi = r.first;
  const piece = names.repeat ? ` დაიწყე ამით: „${names.repeat}“.` : '';
  switch (r.concerns[0]) {
    case 'idle':
      return `${hi}, ეს კვირა როგორ მიდის? დღეში 10 წუთიც საკმარისია.${piece}`;
    case 'little':
      return `${hi}, ამ კვირაში ერთხელ ივარჯიშე — კარგი დასაწყისია! სცადე დღეში 10 წუთი.${piece}`;
    case 'missed':
      return `${hi}, გაკვეთილზე გვაკლდი. ყველაფერი რიგზეა? თუ რამე გამოგრჩა, მომწერე — დაგეხმარები.`;
    case 'behind':
      return `${hi}, დავალება${r.late.length === 1 ? ` „${r.late[0]}“` : 'ები'} ჯერ არ დასრულებულა. თუ რამე გიჭირს, მომწერე — ერთად გავარჩევთ.`;
    case 'stuck': {
      const where = names.stuck ? ` („${names.stuck}“${r.stuck?.part !== null && r.stuck?.part !== undefined ? `, მე-${r.stuck.part + 1} ფრაზა` : ''})` : '';
      return `${hi}, ვხედავ, ერთი ადგილი ცოტა გიჭირს${where}. ნელა გაიმეორე, ფრაზა-ფრაზა — გამოგივა!`;
    }
    default: {
      const work = r.workDone ? ` და ${workWords(r.workDone, r.work)} შეასრულე` : '';
      return `${hi}, ყოჩაღ! ამ კვირაში ${r.days} დღე ივარჯიშე${work}. ასე გააგრძელე!`;
    }
  }
};
