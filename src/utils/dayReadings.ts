import type { CalendarDay } from '../data/churchCalendar';

// The reader's „დღის წესი“ (pages/medavitneoba/DayCard.tsx): the week's tone and the day's readings, read out of the
// church calendar's text (data/calendar/<year>.json, from orthodoxy.ge), e.g.
//   „ლიტ.: გალ. 2: 16-20 (დას. 203). ლკ. 7: 11-16 (დას. 30).“
// A reading = its book, the verse ranges and the დასაბამი (zachalo) number. Apostle readings name a public/bible/ file
// so the page can show the text; Gospels are listed only (the deacon or the priest reads them).

export interface VerseRange { ch: number; from: number; to: number } // to = 999: to the chapter's end
export interface Reading {
  /** the label before it in the calendar: „მწუხრ.“, „ცისკ.“, „ლიტ.“, „რიგ.“, „ღირ.“, „მეფისა“… ('' when none) */
  label: string;
  /** the book as the calendar writes it, „გალ.“ */
  abbr: string;
  /** public/bible/<file>.json (Apostle and Gospels), '' for the Old Testament */
  file: string;
  name: string;
  apostle: boolean;
  ranges: VerseRange[];
  /** „2: 16-20“ as written, tidied */
  ref: string;
  zachalo?: number;
}

const BOOKS: [abbr: string, file: string, name: string, apostle: boolean][] = [
  ['საქმ.', 'sakme', 'მოციქულთა საქმე', true],
  ['რომ.', 'romaelta', 'რომაელთა', true],
  ['1 კორ.', '1korintelta', '1 კორინთელთა', true],
  ['2 კორ.', '2korintelta', '2 კორინთელთა', true],
  ['გალ.', 'galatelta', 'გალატელთა', true],
  ['ეფეს.', 'efeselta', 'ეფესელთა', true],
  ['ეფ.', 'efeselta', 'ეფესელთა', true],
  ['ფლპ.', 'pilipelta', 'ფილიპელთა', true],
  ['ფილ.', 'pilipelta', 'ფილიპელთა', true],
  ['კოლ.', 'kolaselta', 'კოლასელთა', true],
  ['1 თეს.', '1tesalonikelta', '1 თესალონიკელთა', true],
  ['2 თეს.', '2tesalonikelta', '2 თესალონიკელთა', true],
  ['1 ტიმ.', '1timote', '1 ტიმოთეს', true],
  ['2 ტიმ.', '2timote', '2 ტიმოთეს', true],
  ['ტიტ.', 'tite', 'ტიტეს', true],
  ['ფლმ.', 'filimoni', 'ფილიმონის', true],
  ['ებრ.', 'ebraelta', 'ებრაელთა', true],
  ['იაკ.', 'iakobi', 'იაკობის', true],
  ['1 პეტ.', '1petre', '1 პეტრეს', true],
  ['2 პეტ.', '2petre', '2 პეტრეს', true],
  ['1 ინ.', '1iovane', '1 იოანეს', true],
  ['2 ინ.', '2iovane', '2 იოანეს', true],
  ['3 ინ.', '3iovane', '3 იოანეს', true],
  ['იუდ.', 'iuda', 'იუდას', true],
  ['მთ.', 'mate', 'მათე', false],
  ['მკ.', 'markozi', 'მარკოზი', false],
  ['ლკ.', 'luka', 'ლუკა', false],
  ['ინ.', 'iovane', 'იოანე', false],
];

/** the day's whole text, paragraphs on their own lines */
export const dayText = (day: CalendarDay) => day.p.map(para => para.map(r => r[0]).join('')).join('\n');

// typos the calendar has: „I1“ for 11, „ებრ:“ for „ებრ.“, „2. პეტ.“, „დსა.“ for „დას.“
const tidy = (s: string) => s
  .replace(/I(?=\d)|(?<=\d)I/g, '1')
  .replace(/([ა-ჰ])\s*:\s*(?=\d)/g, '$1. ')
  .replace(/(\d)\.\s+(?=[ა-ჰ])/g, '$1 ')
  .replace(/დსა\./g, 'დას.')
  .replace(/([ა-ჰ]\.)(?=\d)/g, '$1 ');

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// longest first so „1 ინ.“ wins over „ინ.“
const BOOK_RE = new RegExp(
  `(^|[^ა-ჰ0-9])(${[...BOOKS].sort((a, b) => b[0].length - a[0].length).map(b => esc(b[0])).join('|')})\\s*(\\d[\\d:;,\\s\\-–—]*\\d)`,
  'g'
);

/** „5: 22-6: 2“, „1: 1 - 2, 10-12; 2: 6-10“ → ranges */
export const parseRanges = (ref: string): VerseRange[] => {
  const out: VerseRange[] = [];
  let ch = 0;
  for (const group of ref.split(';')) {
    for (const piece of group.split(',')) {
      const p = piece.replace(/[–—]/g, '-').replace(/\s+/g, '');
      if (!p) continue;
      // „ch:v-ch2:v2“ across chapters
      const cross = /^(?:(\d+):)?(\d+)-(\d+):(\d+)$/.exec(p);
      if (cross) {
        const c1 = cross[1] ? Number(cross[1]) : ch;
        out.push({ ch: c1, from: Number(cross[2]), to: 999 });
        for (let c = c1 + 1; c < Number(cross[3]); c++) out.push({ ch: c, from: 1, to: 999 });
        ch = Number(cross[3]);
        out.push({ ch, from: 1, to: Number(cross[4]) });
        continue;
      }
      const m = /^(?:(\d+):)?(\d+)(?:-(\d+))?$/.exec(p);
      if (!m) continue;
      if (m[1]) ch = Number(m[1]);
      if (!ch) continue;
      out.push({ ch, from: Number(m[2]), to: Number(m[3] ?? m[2]) });
    }
  }
  // a misprint („2: I1-6“) gives a backwards range: left out rather than guessed
  return out.filter(r => r.ch > 0 && r.from > 0 && r.to >= r.from);
};

/** every New Testament reading the day names, in the calendar's order */
export const readingsOf = (day: CalendarDay): Reading[] => {
  const out: Reading[] = [];
  for (const line of tidy(dayText(day)).split('\n')) {
    let label = '';
    BOOK_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = BOOK_RE.exec(line))) {
      // the nearest „word:“ before the reading on its line is its label (მწუხრ.: / ლიტ.: / ღირ.: / მეფისა:)
      const labels = [...line.slice(0, m.index + m[1].length).matchAll(/([ა-ჰ][ა-ჰ. ]{0,20}?)\s*:(?!\s*\d)/g)];
      if (labels.length) label = labels[labels.length - 1][1].trim().replace(/\.$/, '');
      const book = BOOKS.find(b => b[0] === m![2])!;
      const ranges = parseRanges(m[3]);
      if (!ranges.length) continue;
      const after = line.slice(BOOK_RE.lastIndex, BOOK_RE.lastIndex + 30);
      const z = /^\s*\.?\s*\(\s*დას\.\s*(\d+)/.exec(after);
      out.push({
        label, abbr: book[0], file: book[1], name: book[2], apostle: book[3], ranges,
        ref: m[3].replace(/\s+/g, ' ').replace(/\s*:\s*/g, ': ').trim(), zachalo: z ? Number(z[1]) : undefined,
      });
    }
  }
  return out;
};

const ROMAN: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };
/** „… ხმა IV.“ in the day's title → 4 */
export const toneOf = (day: CalendarDay): number | null => {
  const m = /ხმა\s+(VIII|VII|VI|IV|V|III|II|I)\b/.exec(day.t);
  return m ? ROMAN[m[1]] : null;
};
export const toneName = (n: number) => `ხმა ${['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][n]}`;

/** the id a reading's take is sent under (the pearls' store, see utils/learn.ts): read~ap~<file>~<ref>~<date> */
export const READ_PREFIX = 'read~';
export const dayTakeId = (r: Reading, iso: string) =>
  `${READ_PREFIX}ap~${r.file}~${r.ranges.map(x => `${x.ch}:${x.from}-${x.to}`).join(',')}~${iso}`;
export const lessonTakeId = (lesson: string, step: number) => `${READ_PREFIX}l~${lesson}~${step}`;
export type ReadTake = { kind: 'day'; file: string; ranges: VerseRange[]; iso: string } | { kind: 'lesson'; lesson: string; step: number };
export const parseReadTakeId = (id: string): ReadTake | null => {
  if (!id.startsWith(READ_PREFIX)) return null;
  const [kind, a, b, c] = id.slice(READ_PREFIX.length).split('~');
  if (kind === 'l' && a && b !== undefined) return { kind: 'lesson', lesson: a, step: Number(b) };
  if (kind === 'ap' && a && b && c) {
    const ranges = b.split(',').map(s => /^(\d+):(\d+)-(\d+)$/.exec(s)).filter((x): x is RegExpExecArray => Boolean(x))
      .map(x => ({ ch: Number(x[1]), from: Number(x[2]), to: Number(x[3]) }));
    return { kind: 'day', file: a, ranges, iso: c };
  }
  return null;
};
export const bookName = (file: string) => BOOKS.find(b => b[1] === file)?.[2] ?? file;
export const rangesText = (ranges: VerseRange[]) =>
  ranges.map((r, i) => `${i && ranges[i - 1].ch === r.ch ? '' : `${r.ch}: `}${r.from}${r.to === 999 ? '–' : r.to !== r.from ? `-${r.to}` : ''}`).join(', ');
