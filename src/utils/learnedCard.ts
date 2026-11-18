// „ვისწავლე“ — the share card of a learned chant (2026-11-18, boards x-idea-barati-0 / -barati / -barati-2). Pure parts: which
// items of the member's path count as learned, which of them are new to this device, and what the card says. Tested in
// tests/learnedCard.test.ts. The card never carries a score or a percentage, and the member's name only when they add it.

export type VoiceId = '1' | '2' | '3';
const ROMAN: Record<VoiceId, string> = { '1': 'I', '2': 'II', '3': 'III' };

type Marks = { voices?: unknown; isLearned?: boolean } | null | undefined;

const voiceList = (raw: unknown): VoiceId[] => {
  const arr = Array.isArray(raw) ? raw.map(String) : typeof raw === 'string' ? raw.split(',').map(s => s.trim()) : [];
  return (['1', '2', '3'] as const).filter(v => arr.includes(v));
};

/** The voices a member marked on an item (a poem / instrument: '1' once learned). */
export const markedVoices = (item: Marks, voiced: boolean): VoiceId[] =>
  !item ? [] : voiced ? voiceList(item.voices) : item.isLearned ? ['1'] : [];

/** The voices a teacher confirmed when ALL the marked voices are confirmed (and at least one is), else null.
 *  A teacher's confirmation of an item the member never marked counts as well. */
export const learnedVoices = (item: Marks, confirmed: unknown, voiced: boolean): VoiceId[] | null => {
  const ok = voiceList(confirmed);
  if (!ok.length) return null;
  return markedVoices(item, voiced).every(v => ok.includes(v)) ? ok : null;
};

/** id → the confirmed voices, for every item of the path that is learned. */
export const learnedMap = (
  path: Record<string, Marks> | null | undefined,
  confirmed: Record<string, unknown> | null | undefined,
  voicedOf: (id: string) => boolean,
): Record<string, VoiceId[]> => {
  const out: Record<string, VoiceId[]> = {};
  for (const [id, item] of Object.entries(path || {})) {
    const v = learnedVoices(item, confirmed?.[id], voicedOf(id));
    if (v) out[id] = v;
  }
  return out;
};

/** What is new on this device: `seen` null = the very first run (everything learned already counts as seen). */
export const pickFresh = (learned: readonly string[], seen: readonly string[] | null): { fresh: string[]; seen: string[] } => {
  if (seen === null) return { fresh: [], seen: [...learned] };
  const had = new Set(seen);
  const fresh = learned.filter(id => !had.has(id));
  return { fresh, seen: fresh.length ? [...seen, ...fresh] : [...seen] };
};

export const seenKey = (uid: string) => `sg-learned-seen:${uid}`;

export const readSeen = (uid: string): string[] | null => {
  try {
    const raw = localStorage.getItem(seenKey(uid));
    if (raw === null) return null;
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : null;
  } catch { return null; }
};
export const writeSeen = (uid: string, ids: readonly string[]) => {
  try { localStorage.setItem(seenKey(uid), JSON.stringify(ids)); } catch { /* private window */ }
};

/** „II ხმა“, „I · II ხმა“, „I · II · III ხმა“; nothing for a poem or an instrument. */
export const voiceWord = (voices: readonly string[], voiced: boolean): string => {
  const list = voiceList(voices);
  return voiced && list.length ? `${list.map(v => ROMAN[v]).join(' · ')} ხმა` : '';
};

/** The moment screen's second line — says only what is true. */
export const momentLine = (voices: readonly string[], voiced: boolean): string => {
  const list = voiceList(voices);
  if (!voiced) return 'მასწავლებელმა ჩათვალა. შენს საგანძურშია.';
  if (list.length === 3) return 'სამივე ხმა ჩათვლილია. მარგალიტი შენს საგანძურშია.';
  const named = list.length === 2 ? `${ROMAN[list[0]]} და ${ROMAN[list[1]]} ხმა` : `${ROMAN[list[0]] ?? ''} ხმა`;
  return `${named} ჩათვლილია. მარგალიტი შენს საგანძურშია.`;
};

export const momentTitle = (name: string) => `„${name}“ ნასწავლია`;

const MONTHS = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'];
export const dateText = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

/** „ნინო ბერიძე“ → „ნინო ბ.“ */
export const shortName = (full: string | null | undefined): string => {
  const parts = (full || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] || '';
  return `${parts[0]} ${Array.from(parts[1])[0]}.`;
};

export interface CardChoices { name: boolean; voice: boolean; school: boolean }
export const DEFAULT_CHOICES: CardChoices = { name: false, voice: true, school: true };
export const CHOICES_KEY = 'sg-share-card';

export const readChoices = (): CardChoices => {
  try {
    const v = JSON.parse(localStorage.getItem(CHOICES_KEY) || 'null');
    if (!v || typeof v !== 'object') return DEFAULT_CHOICES;
    return {
      name: typeof v.name === 'boolean' ? v.name : DEFAULT_CHOICES.name,
      voice: typeof v.voice === 'boolean' ? v.voice : DEFAULT_CHOICES.voice,
      school: typeof v.school === 'boolean' ? v.school : DEFAULT_CHOICES.school,
    };
  } catch { return DEFAULT_CHOICES; }
};
export const writeChoices = (c: CardChoices) => {
  try { localStorage.setItem(CHOICES_KEY, JSON.stringify(c)); } catch { /* private window */ }
};

export interface CardInput {
  name: string;
  /** the version as the path names it (a chant: „გელათის სკოლა“; a song, a poem…: what it is) */
  label: string;
  voices: readonly string[];
  voiced: boolean;
  person: string;
  date: Date;
}
export interface CardText { kicker: string; title: string; line: string; person: string; footer: string }

/** Everything written on the card. The chant's name and its version always; the rest by the member's choices. */
export const cardText = (c: CardInput, choices: CardChoices): CardText => ({
  kicker: 'ვისწავლე',
  title: c.name,
  line: [choices.voice ? voiceWord(c.voices, c.voiced) : '', c.label].filter(Boolean).join(' · '),
  person: choices.name ? shortName(c.person) : '',
  footer: [choices.school ? 'საგანძურის სკოლა' : '', dateText(c.date)].filter(Boolean).join(' · '),
});
