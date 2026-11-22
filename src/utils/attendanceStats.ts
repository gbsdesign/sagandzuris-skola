// Attendance counted from a class's lesson records (2026-11-22, the user: „მარტივად კლასების მიხედვით ვნიშნავდე დასწრებას და მერე
// სტატისტიკასაც ვხედავდე“). A record with nobody in it is a cleared mark, not a lesson nobody came to — it is not counted.

export interface LessonMark { date: string; present: string[] }

export interface MemberRate {
  uid: string;
  /** lessons they came to, out of the counted ones */
  came: number;
  of: number;
  /** 0…100, null while no lesson is marked */
  pct: number | null;
  /** how many of the newest lessons in a row they missed */
  missedRow: number;
}

export interface AttendanceStats {
  lessons: { date: string; came: number }[];
  members: MemberRate[];
  /** the class's share over every counted lesson, 0…100 */
  average: number | null;
}

/** `days` newest first (as the store gives them); only today's members are counted. */
export const attendanceStats = (days: LessonMark[], memberIds: string[]): AttendanceStats => {
  const marked = days.filter(d => d.present.length > 0).sort((a, b) => b.date.localeCompare(a.date));
  const members = memberIds.map(uid => {
    const came = marked.filter(d => d.present.includes(uid)).length;
    let missedRow = 0;
    for (const d of marked) { if (d.present.includes(uid)) break; missedRow++; }
    return { uid, came, of: marked.length, pct: marked.length ? Math.round((came / marked.length) * 100) : null, missedRow };
  });
  const lessons = marked.map(d => ({ date: d.date, came: d.present.filter(u => memberIds.includes(u)).length }));
  const seats = marked.length * memberIds.length;
  const average = seats ? Math.round((lessons.reduce((s, l) => s + l.came, 0) / seats) * 100) : null;
  return { lessons, members, average };
};

const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dateOf = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };

/** The next lesson day (by the class's weekdays, 0 = Sunday) before / after `iso`, never past `today`; none found → `iso`. */
export const stepLessonDay = (weekdays: number[], iso: string, dir: 1 | -1, today: string): string => {
  const days = new Set(weekdays);
  const at = dateOf(iso);
  for (let i = 0; i < 21; i++) {
    at.setDate(at.getDate() + dir);
    const next = isoOf(at);
    if (next > today) return iso;
    if (!days.size || days.has(at.getDay())) return next;
  }
  return iso;
};

/** The newest lesson day up to `today` (today itself when it is one). */
export const latestLessonDay = (weekdays: number[], today: string): string => {
  const days = new Set(weekdays);
  if (!days.size || days.has(dateOf(today).getDay())) return today;
  return stepLessonDay(weekdays, today, -1, today);
};
