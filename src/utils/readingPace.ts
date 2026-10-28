// The pace of one's reading aloud (the reader's course, pages/medavitneoba/parts.tsx): the text's syllables over the
// seconds the voice took, the silence before the first word and after the last one left out, the pauses between
// the verses kept in — that is the pace a listener in church hears.

// Georgian: a syllable a vowel, the old letters ჱ (e), ჳ (vi), ჵ (o) too; ჲ is not one. Old spelling writes [v] as „უ“
// between a consonant and ა/ე (ჩუენ, თქუენ, სიტყუა), so that „უ“ is not a syllable; before ი, ო, უ it is a real [u]
// (ალილუია, ნუუკუე — old spelling writes [vi] as ჳ).
const VOWELS = 'აეიოუჱჳჵ';
const isLetter = (c: string | undefined) => c !== undefined && c >= 'ა' && c <= 'ჺ';
const isVowel = (c: string | undefined) => c !== undefined && VOWELS.includes(c);

export const syllableCount = (text: string) => {
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (!isVowel(c)) continue;
    if (c === 'უ' && isLetter(text[i - 1]) && !isVowel(text[i - 1]) && text[i - 1] !== 'ჲ' && (text[i + 1] === 'ა' || text[i + 1] === 'ე')) continue;
    n++;
  }
  return n;
};

/** a lesson's line as said: „… (3-ჯერ).“ / „(3-გზის)“ is said three times, and the mark itself is not read */
export const lineSyllables = (line: string) => {
  const times = /\((\d+)-(?:ჯერ|გზის)\)/.exec(line);
  return syllableCount(line.replace(/\([^)]*\)/g, ' ')) * (times ? Number(times[1]) : 1);
};

/** a page's text as read aloud: no tags, and no verse numbers (<sup>), headings or marks (data-skip) */
export const readableText = (html: string) => html
  .replace(/<sup[^>]*>[\s\S]*?<\/sup>/g, ' ')
  .replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/g, ' ')
  .replace(/<(\w+)[^>]*\sdata-skip[^>]*>[\s\S]*?<\/\1>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ');

/**
 * Where the voice starts and ends in a take, in seconds: 20 ms frames, a frame is voice when it stands well above the
 * take's quietest tenth (the room). The voice's level is the middle of the frames clearly above the room, so a short
 * reading in a long take still counts. A take with no clear voice (all noise, or a silent mic) gives null.
 */
export const speechSpan = (samples: Float32Array, rate: number): { start: number; end: number } | null => {
  const size = Math.max(1, Math.round(rate * 0.02));
  const frames = Math.floor(samples.length / size);
  if (frames < 5) return null;
  const db = new Float64Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    for (let i = f * size; i < (f + 1) * size; i++) sum += samples[i] * samples[i];
    db[f] = 10 * Math.log10(sum / size + 1e-12);
  }
  const sorted = Array.from(db).sort((a, b) => a - b);
  const room = sorted[Math.floor(frames * 0.1)];
  const above = sorted.filter(d => d > room + 12 && d > -70);
  // no voice above the room, or the mic gave nothing
  if (above.length < 3) return null;
  const loud = above[Math.floor(above.length / 2)];
  const line = room + Math.max(8, (loud - room) * 0.3);
  // the voice: a run of at least 3 frames (60 ms) above the line, so a click doesn't count
  const voiced = (f: number) => db[f] > line && db[f + 1] > line && db[f + 2] > line;
  let first = -1;
  for (let f = 0; f + 2 < frames; f++) if (voiced(f)) { first = f; break; }
  if (first < 0) return null;
  let last = first;
  for (let f = frames - 3; f >= first; f--) if (voiced(f)) { last = f + 2; break; }
  const seconds = samples.length / rate;
  // a breath of margin on both sides: the first consonant starts before it gets loud
  return { start: Math.max(0, first * size / rate - 0.1), end: Math.min(seconds, (last + 1) * size / rate + 0.1) };
};

export type PaceZone = 'slow' | 'even' | 'fast';
/** syllables a second, the pauses between verses included */
export const PACE = { slow: 3, fast: 5, unreal: 8 };

export interface Pace { rate: number; zone: PaceZone; partial: boolean }

export const paceZone = (rate: number): PaceZone => (rate < PACE.slow ? 'slow' : rate > PACE.fast ? 'fast' : 'even');

/** the pace of reading `syllables` in `seconds`; null when the take is too short to tell */
export const paceOf = (syllables: number, seconds: number): Pace | null => {
  if (syllables < 20 || seconds < 4) return null;
  // rounded once, so the number shown, its zone and the score the teacher gets (×10) all agree
  const rate = Math.round((syllables / seconds) * 10) / 10;
  // faster than any voice reads: the text was not read to the end
  return { rate, zone: paceZone(rate), partial: rate > PACE.unreal };
};

/** the seconds of a take the pace counts: from the first word to the last one; 0 when no voice was heard (null) */
export const voicedSeconds = (take: { seconds: number; speech?: { start: number; end: number } | null }) =>
  take.speech ? take.speech.end - take.speech.start : take.speech === null ? 0 : take.seconds;

export const PACE_NAMES: Record<PaceZone, string> = { slow: 'ნელი', even: 'ზომიერი', fast: 'სწრაფი' };

/** „3,6“: one decimal, a Georgian comma */
export const paceNumber = (rate: number) => rate.toFixed(1).replace('.', ',');
