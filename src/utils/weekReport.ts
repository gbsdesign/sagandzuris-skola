import { weakLeap, type AiNote } from './aiPlan';

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
  const stuck = !!weakLeap(note?.misses, today) || (takes.length >= 3 && low * 2 > takes.length);
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
