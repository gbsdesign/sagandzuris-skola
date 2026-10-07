import { hasGeorgianName } from './georgianName';
import { INSTRUMENTS_LIST } from '../data/instrumentsData';

// The member's profile fields that "პირველი გაცნობა" requires (students/{uid}.profile) and the profile card edits:
// name, birth date, region and town or village, phone, abilities and interests ("შესაძლებლობები და ინტერესები")
// and voices. Kept in one place so both agree on what counts as filled in.

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

// What a member can do (profile.abilities) and what interests them (profile.interests). „დაკვრა“ asks which
// instruments (profile.instruments: ids from the საკრავები list), „გალობა“ asks where they chant
// (profile.chantPlace), „სხვა“ is written by hand (profile.abilityOther / profile.interestOther).
// 'beginner' stands alone: nothing yet.
export type AbilityId = 'galoba' | 'simghera' | 'leksi' | 'dakvra' | 'skhva' | 'beginner';
export type InterestId = 'galoba' | 'simghera' | 'sakravebi' | 'leksebi' | 'skhva';

export const ABILITY_OPTIONS: { id: AbilityId; title: string; sub: string }[] = [
  { id: 'galoba', title: 'გალობა', sub: 'საეკლესიო გალობა' },
  { id: 'simghera', title: 'სიმღერა', sub: 'ხალხური სიმღერა' },
  { id: 'leksi', title: 'ლექსის თქმა', sub: 'ლექსის ზეპირად თქმა' },
  { id: 'dakvra', title: 'დაკვრა', sub: 'აირჩიეთ საკრავები' },
  { id: 'skhva', title: 'სხვა', sub: 'ჩაწერეთ თავად' },
  { id: 'beginner', title: 'ჯერ ვიწყებ', sub: 'ჯერ არცერთი არ შემიძლია' },
];

export const INTEREST_OPTIONS: { id: InterestId; title: string; sub: string }[] = [
  { id: 'galoba', title: 'გალობა', sub: 'საეკლესიო გალობა' },
  { id: 'simghera', title: 'სიმღერა', sub: 'ხალხური სიმღერა' },
  { id: 'sakravebi', title: 'საკრავები', sub: 'ქართული და სხვა საკრავები' },
  { id: 'leksebi', title: 'ლექსები', sub: 'ქართული პოეზია' },
  { id: 'skhva', title: 'სხვა', sub: 'ჩაწერეთ თავად' },
];

const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const filled = (v: unknown) => typeof v === 'string' && v.trim().length >= 2;

/** Abilities answered in full: each chosen one with its follow-up question. */
export const abilitiesDone = (p: Record<string, any>) => {
  const a = list(p.abilities);
  return a.length > 0
    && (!a.includes('dakvra') || list(p.instruments).length > 0)
    && (!a.includes('galoba') || filled(p.chantPlace))
    && (!a.includes('skhva') || filled(p.abilityOther));
};

export const interestsDone = (p: Record<string, any>) => {
  const i = list(p.interests);
  return i.length > 0 && (!i.includes('skhva') || filled(p.interestOther));
};

// the old „სტატუსი“ answers, as abilities (for one who answered before abilities existed)
const FROM_STATUS: Record<string, AbilityId> = { 'ვგალობ': 'galoba', 'ვმღერი': 'simghera', 'ვუკრავ': 'dakvra', 'დამწყები': 'beginner' };
export const abilitiesOf = (p: Record<string, any>): AbilityId[] =>
  (Array.isArray(p.abilities) ? list(p.abilities) : statusList(p.experienceLevel).map(s => FROM_STATUS[s] || ''))
    .filter((x): x is AbilityId => ABILITY_OPTIONS.some(o => o.id === x));

const instrumentName = (id: string) => INSTRUMENTS_LIST.find(x => x.id === id)?.nameGe || id;

/** "გალობა (სამების ტაძარი), დაკვრა: ჩონგური, გიტარა" — for the teacher's and admin's lists. */
export const abilitiesText = (p: Record<string, any>) => {
  const a = list(p.abilities);
  if (!a.length) return statusList(p.experienceLevel).join(', '); // answered before abilities existed
  return a.map(id => {
    if (id === 'galoba') return filled(p.chantPlace) ? `გალობა (${p.chantPlace.trim()})` : 'გალობა';
    if (id === 'dakvra') return list(p.instruments).length ? `დაკვრა: ${list(p.instruments).map(instrumentName).join(', ')}` : 'დაკვრა';
    if (id === 'skhva') return filled(p.abilityOther) ? p.abilityOther.trim() : 'სხვა';
    return ABILITY_OPTIONS.find(o => o.id === id)?.title || id;
  }).join('; ');
};

export const interestsText = (p: Record<string, any>) =>
  list(p.interests).map(id => (id === 'skhva' && filled(p.interestOther) ? p.interestOther.trim() : INTEREST_OPTIONS.find(o => o.id === id)?.title || id)).join(', ');

/** profile.experienceLevel (the old „სტატუსი“) was once a single string; then a list. */
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
    // abilities and interests; one who chose the old „სტატუსი“ before they existed is not asked again
    && ((abilitiesDone(p) && interestsDone(p)) || (!Array.isArray(p.abilities) && statusList(p.experienceLevel).length > 0))
    && (voices || met?.voiceUnknown === true);
};
