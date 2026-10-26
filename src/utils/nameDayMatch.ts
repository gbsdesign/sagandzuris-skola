import type { CalendarDay } from '../data/churchCalendar';

// „ანგელოზის დღე“: which days of the church calendar name a saint of a given name. A name stands there in many
// cases („გიორგი“, „გიორგისა“, „მარიამისა“, „ნინოსი“). Pure (tests/nameDays.test.ts); the records are in nameDays.ts.

// the case endings a name takes in the calendar's lines (genitive „-ისა“, „-სი“…), after its stem
const ENDINGS = new Set(['', 'ი', 'ის', 'ისა', 'ისი', 'ისასი', 'ს', 'სა', 'სი', 'სასი', 'მა', 'ისთა']);

/** the name's stem: a consonant-stem name loses its nominative „ი“ (გიორგი → გიორგ); a vowel-stem keeps it (ნინო) */
export const nameStem = (name: string) => {
  const n = name.trim().split(/\s+/)[0] || '';
  return n.length > 3 && n.endsWith('ი') ? n.slice(0, -1) : n;
};

/** where in the calendar's line a saint of this name stands (-1: nowhere) */
const nameAt = (text: string, name: string) => {
  const stem = nameStem(name);
  if (stem.length < 2) return -1;
  for (const m of text.matchAll(/[ა-ჰ]+/g)) if (m[0].startsWith(stem) && ENDINGS.has(m[0].slice(stem.length))) return m.index ?? 0;
  return -1;
};

/** does the calendar's line name a saint of this name? */
export const mentionsName = (text: string, name: string) => nameAt(text, name) >= 0;

/** a long line (a whole company of martyrs) cut down to the words around the name */
export const nameExcerpt = (text: string, name: string, max = 90) => {
  if (text.length <= max) return text;
  const at = Math.max(0, nameAt(text, name));
  let start = Math.max(0, at - 30);
  if (start > 0) start = text.indexOf(' ', start) + 1 || start;
  let end = Math.min(text.length, start + max);
  if (end < text.length) end = text.lastIndexOf(' ', end) > start ? text.lastIndexOf(' ', end) : end;
  return `${start > 0 ? '… ' : ''}${text.slice(start, end).replace(/[\s,:;–-]+$/, '')}${end < text.length ? ' …' : ''}`;
};

export interface NameDayChoice { iso: string; month: number; day: number; saint: string; feast: boolean }

/** the days of the church year that name a saint of this name, in calendar order */
export const nameDayCandidates = (days: Record<string, CalendarDay>, name: string): NameDayChoice[] => {
  const out: NameDayChoice[] = [];
  for (const iso of Object.keys(days).sort()) {
    for (const s of days[iso].s || []) {
      if (!mentionsName(s.n, name)) continue;
      const [, m, d] = iso.split('-').map(Number);
      out.push({ iso, month: m, day: d, saint: nameExcerpt(s.n.replace(/\s+/g, ' ').trim(), name), feast: s.b === 1 });
    }
  }
  return out;
};
