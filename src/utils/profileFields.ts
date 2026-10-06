import { hasGeorgianName } from './georgianName';

// The member's profile fields that "პირველი გაცნობა" requires (students/{uid}.profile) and the profile card edits:
// name, birth date, region and town or village, phone, status ("სტატუსი") and voices. Kept in one place so both
// agree on what counts as filled in.

export const GEORGIAN_REGIONS = [
  'თბილისი',
  'აფხაზეთი',
  'აჭარა',
  'გურია',
  'იმერეთი',
  'კახეთი',
  'მცხეთა-მთიანეთი',
  'რაჭა-ლეჩხუმი და ქვემო სვანეთი',
  'სამეგრელო-ზემო სვანეთი',
  'სამცხე-ჯავახეთი',
  'ქვემო ქართლი',
  'შიდა ქართლი',
  'საზღვარგარეთ',
];

// ids are what the profile card has always stored in profile.experienceLevel
export const STATUS_OPTIONS = [
  { id: 'დამწყები', title: 'დამწყები', sub: 'ახლა ვიწყებ სწავლას' },
  { id: 'ვგალობ', title: 'ვგალობ', sub: 'საეკლესიო გალობა' },
  { id: 'ვმღერი', title: 'ვმღერი', sub: 'ხალხური სიმღერა' },
  { id: 'ვუკრავ', title: 'ვუკრავ', sub: 'ქართული საკრავები' },
];

/** profile.experienceLevel was once a single string; now a list. */
export const statusList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : typeof v === 'string' && v.trim() ? [v] : [];

/** A phone as typed → "+9955XXXXXXXX" (nine Georgian digits) or "+<code><number>"; null when it isn't one. */
export const normalizePhone = (raw: string | undefined): string | null => {
  const t = (raw || '').trim();
  let d = t.replace(/\D/g, '');
  const international = t.startsWith('+') || d.startsWith('00');
  if (d.startsWith('00')) d = d.slice(2);
  if (!international && d.length === 10 && d.startsWith('0')) d = d.slice(1); // "0 599 …"
  if (!international && d.length === 9) return `+995${d}`;
  if (d.length === 12 && d.startsWith('995')) return `+${d}`;
  if (international && d.length >= 8 && d.length <= 15) return `+${d}`;
  return null;
};

/** "+995599123456" → "+995 599 12 34 56"; foreign numbers as stored. */
export const showPhone = (p: string | undefined) => {
  const m = /^\+995(\d{3})(\d{2})(\d{2})(\d{2})$/.exec(p || '');
  return m ? `+995 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : p || '';
};

export interface BirthDate { year: number; month: number; day: number }

export const daysInMonth = (year: number, month: number) => new Date(year || 2000, month, 0).getDate();

export const validBirth = (b: Partial<BirthDate> | undefined) => {
  if (!b?.year || !b.month || !b.day) return false;
  const now = new Date();
  if (b.year < 1900 || b.year > now.getFullYear() || b.month < 1 || b.month > 12) return false;
  if (b.day < 1 || b.day > daysInMonth(b.year, b.month)) return false;
  return new Date(b.year, b.month - 1, b.day) <= now;
};

/** The profile card's old starting value, saved by many without choosing it. */
export const isPlaceholderBirth = (b: Partial<BirthDate> | undefined) => b?.year === 2000 && b.month === 1 && b.day === 1;

/** Has the member filled in everything "პირველი გაცნობა" asks for? (`data` = students/{uid}) */
export const profileComplete = (data: Record<string, any> | null | undefined) => {
  const p = data?.profile || {};
  const met = data?.firstMeeting;
  const voices = Array.isArray(p.voices) && p.voices.length > 0;
  return hasGeorgianName(p)
    && validBirth(p.birthDate) && (!!met || !isPlaceholderBirth(p.birthDate))
    && GEORGIAN_REGIONS.includes(p.region)
    && (p.city || '').trim().length >= 2
    && !!normalizePhone(p.phone)
    && statusList(p.experienceLevel).length > 0
    && (voices || met?.voiceUnknown === true);
};
