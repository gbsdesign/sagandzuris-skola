// „მოსმენის შემოწმება“ (AI teacher 2.0, stage 1; the page is components/aiLesson/EarTest.tsx): a member holds a note three
// times — low, middle, high — and both ears listen to the same sound: the new one (utils/ear.ts) and the first one
// (utils/earOld.ts). Here: what each made of a take, in numbers a singer can read. Pure (tests/earTrial.test.ts).
import { earReport } from './ear';

/** how long one note is held, seconds */
export const TRIAL_SECONDS = 4;
/** fewer looks with a voice than this (≈ a second) and the take was not heard at all */
const HEARD_LOOKS = 25;

export const TRIAL_TAKES = [
  { id: 'low', name: 'დაბალი ნოტი', hint: 'ყველაზე დაბალი, რომელიც არ გიჭირს' },
  { id: 'mid', name: 'შუა ნოტი', hint: 'სადაც ყველაზე თავისუფლად მღერი' },
  { id: 'high', name: 'მაღალი ნოტი', hint: 'მაღალი, ყვირილის გარეშე' },
] as const;
export type TrialId = typeof TRIAL_TAKES[number]['id'];

/** one ear on one take: the share of the voice it heard (0–1), how often the line broke, how many looks slipped away */
export interface TrialSide { heard: number; breaks: number; slips: number }
export interface TrialResult {
  /** the voice was too quiet to judge: sing again, nearer the phone */
  quiet: boolean;
  /** the note held, as the new ear heard it (MIDI) */
  note: number | null;
  /** looks with a voice */
  looks: number;
  now: TrialSide;
  was: TrialSide;
}

/** which looks had a voice in them: loud against the take's own loudest part, and never mere room noise */
export const soundingOf = (rms: number[]): boolean[] => {
  if (!rms.length) return [];
  const sorted = [...rms].sort((a, b) => a - b);
  const loud = sorted[Math.floor(sorted.length * 0.9)];
  const floor = Math.max(0.006, loud * 0.3);
  return rms.map(v => v >= floor);
};

const sideOf = (r: { looks: number; voiced: number; breaks: number; slips: number }): TrialSide => ({
  heard: r.looks ? (r.voiced - r.slips) / r.looks : 0, breaks: r.breaks, slips: r.slips,
});

/** What both ears made of one held note: `frames` = the take as the app keeps it (the new ear), `was` = the first ear's
 *  reading of each of the same looks. */
export const trialResult = (frames: { t: number; midi: number | null; rms: number }[], was: (number | null)[]): TrialResult => {
  const sounding = soundingOf(frames.map(f => f.rms));
  const a = earReport(frames, sounding);
  const b = earReport(frames.map((f, i) => ({ t: f.t, midi: was[i] ?? null })), sounding);
  return { quiet: a.looks < HEARD_LOOKS, note: a.middle, looks: a.looks, now: sideOf(a), was: sideOf(b) };
};

/** every take together: each ear's share of all the looks, its slips and breaks */
export const trialTotal = (results: TrialResult[]): { now: TrialSide; was: TrialSide } | null => {
  const good = results.filter(r => !r.quiet);
  const looks = good.reduce((n, r) => n + r.looks, 0);
  if (!looks) return null;
  const sum = (pick: (r: TrialResult) => TrialSide): TrialSide => ({
    heard: good.reduce((n, r) => n + pick(r).heard * r.looks, 0) / looks,
    breaks: good.reduce((n, r) => n + pick(r).breaks, 0),
    slips: good.reduce((n, r) => n + pick(r).slips, 0),
  });
  return { now: sum(r => r.now), was: sum(r => r.was) };
};

/** „97%“ */
export const percent = (share: number) => `${Math.round(Math.max(0, Math.min(1, share)) * 100)}%`;

const NAMES = ['დო', 'დო♯', 'რე', 'მი♭', 'მი', 'ფა', 'ფა♯', 'სოლ', 'სოლ♯', 'ლა', 'სი♭', 'სი'];
const OCTAVES = ['კონტრ', 'დიდი', 'მცირე', 'პირველი', 'მეორე', 'მესამე'];
/** „მცირე ოქტავის ლა“ — the note with its octave, as singers name it */
export const octaveNote = (midi: number): string => {
  const m = Math.round(midi);
  const octave = OCTAVES[Math.floor(m / 12) - 2];
  const name = NAMES[((m % 12) + 12) % 12];
  return octave ? `${octave} ოქტავის ${name}` : name;
};

/** one ear's mistakes in words: „არ შეშლია“ · „შეეშალა 3-ჯერ“ · „გაუწყდა 2-ჯერ“ */
export const sideLine = (s: TrialSide): string => {
  const parts = [s.slips ? `შეეშალა ${s.slips}-ჯერ` : '', s.breaks ? `გაუწყდა ${s.breaks}-ჯერ` : ''].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'არ შეშლია';
};

/** the last word on the new ear, from every take together */
export const trialVerdict = (total: { now: TrialSide; was: TrialSide }): { good: boolean; text: string } => {
  const { now, was } = total;
  if (now.heard >= 0.93) {
    return { good: true, text: now.heard - was.heard >= 0.03
      ? 'აპს შენი ხმა ახლა კარგად ესმის — ძველზე უკეთ.'
      : 'აპს შენი ხმა კარგად ესმის.' };
  }
  if (now.heard >= was.heard + 0.03) return { good: false, text: 'ახალი მოსმენა ძველზე უკეთესია, მაგრამ ჯერ ყველაფერს ვერ იგებს. სცადე წყნარ ოთახში, ტელეფონი ახლოს.' };
  return { good: false, text: 'შენი ხმა ჯერ კარგად არ ესმის. სცადე წყნარ ოთახში, ტელეფონი ახლოს — და თუ არ შეიცვალა, მოგვწერე.' };
};
