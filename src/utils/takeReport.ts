// What the phone measured in one pearls take, as short Georgian lines for „AI მასწავლებელი“'s prompt: each melody
// note's intonation in cents (against the singer's own key), whether the key sank or rose over the phrase, and the
// pace. Pure, tested in tests/takeReport.test.ts.
import type { Phrase } from './pearls';
import { noteName } from './pearls';
import type { Scoring, SungNote } from './pitch';

/** Deviations smaller than this (cents) are „ზუსტად“: the ear and the phone both wobble that much. */
export const EXACT_CENTS = 15;
/** The key moving this much (cents) from the first notes to the last is told as sinking or rising. */
export const DRIFT_CENTS = 20;

const round5 = (c: number) => Math.round(c / 5) * 5;
const secs = (s: number) => (Math.round(s * 10) / 10).toString();
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** How long each melody note lasts in the phrase (seconds): repeated pitches together, as `target` takes them. */
export const targetSeconds = (notes: Phrase['notes']): number[] => {
  const out: number[] = [];
  notes.forEach(([, len, midi], i) => {
    if (i > 0 && notes[i - 1][2] === midi) out[out.length - 1] += len;
    else out.push(len);
  });
  return out;
};

const lengthNote = (sung: SungNote, want: number | undefined) => {
  if (want == null) return '';
  const got = (sung.end - sung.start) / 1000;
  if (Math.abs(got - want) < 0.4) return '';
  if (got < want * 0.5) return `, მოკლედ (${secs(got)} წმ, ფრაზაში ${secs(want)} წმ)`;
  if (got > want * 1.8) return `, გრძლად (${secs(got)} წმ, ფრაზაში ${secs(want)} წმ)`;
  return '';
};

/**
 * The lines: one per melody note, then the drift of the key, then the pace. `sung` is every note the phone heard
 * (for the take's length), `phrase` the pearl's phrase.
 */
export const takeReport = (phrase: Pick<Phrase, 'notes' | 'target' | 'seconds'>, scoring: Pick<Scoring, 'matched'>, sung: SungNote[]): string[] => {
  const { target } = phrase;
  const { matched } = scoring;
  const want = targetSeconds(phrase.notes);
  const found = target.map((t, i) => (matched[i] ? { i, raw: matched[i]!.midi - t } : null)).filter(x => x !== null);
  const lines: string[] = [];
  if (!found.length) {
    lines.push('ტელეფონმა ფრაზის ნოტები ვერ გაარჩია.');
  } else {
    // the singer's key: the middle shift of the notes found, so one off note does not move it
    const key = median(found.map(f => f.raw));
    target.forEach((t, i) => {
      const m = matched[i];
      const head = `ნოტი ${i + 1} (${noteName(t)})`;
      if (!m) { lines.push(`${head}: ვერ გაისმა`); return; }
      const cents = round5((m.midi - t - key) * 100);
      const pitch = Math.abs(cents) < EXACT_CENTS ? 'ზუსტად' : cents > 0 ? `+${cents} ცენტი (მაღლა)` : `−${-cents} ცენტი (დაბლა)`;
      lines.push(`${head}: ${pitch}${lengthNote(m, want[i])}`);
    });
    // drift: the first notes' key against the last notes' key (two of each, when there are enough)
    if (found.length >= 4) {
      const k = found.length >= 6 ? 2 : 1;
      const avg = (fs: typeof found) => fs.reduce((s, f) => s + f.raw, 0) / fs.length;
      const drift = round5((avg(found.slice(-k)) - avg(found.slice(0, k))) * 100);
      lines.push(Math.abs(drift) < DRIFT_CENTS
        ? 'ტონალობა: ფრაზის ბოლომდე შეინარჩუნა.'
        : drift < 0
          ? `ტონალობა: ბოლოსკენ დაიწია, დაახლოებით ${-drift} ცენტით.`
          : `ტონალობა: ბოლოსკენ აიწია, დაახლოებით ${drift} ცენტით.`);
    }
  }
  // pace: from the first sung note to the last, against the phrase as it was played
  if (sung.length && phrase.seconds > 0) {
    const took = (sung[sung.length - 1].end - sung[0].start) / 1000;
    const ratio = took / phrase.seconds;
    const pace = ratio < 0.8 ? 'უფრო სწრაფად, ვიდრე ფრაზა' : ratio > 1.25 ? 'უფრო ნელა, ვიდრე ფრაზა' : 'ფრაზის ტემპში';
    lines.push(`ტემპი: იმღერა ${secs(took)} წამში, ფრაზა დაახლოებით ${secs(phrase.seconds)} წამია — ${pace}.`);
  }
  return lines;
};
