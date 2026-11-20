import { addDays } from '../data/churchFeasts';
import { buildServices, hymnsOf, oldMD, patronDay, type DayInput } from './dayService';
import { octoechos, type TextSrc } from './serviceTexts';
import { triodionSrc } from './triodion';

// Which files a day's services read their texts from — so the reader's page can ask for them all once, while there is
// internet, and the service worker keeps them (vite.config.ts: /wignebi and /bible are kept once fetched). Pure: the page
// (pages/medavitneoba/DayService.tsx) does the fetching.

/** the month files of ჟამნი: September = 13 … August = 24 */
export const monthFile = (month: number) => ((month - 9 + 12) % 12) + 13;
/** ჟამნი's „ტროპარნი და კონდაკნი მსგეფსისანი“ */
export const WEEKDAY_FILE = 28;

/** a book file's address (public/wignebi; „დამატებითი წიგნები“ — collection x — live in their own folder) */
export const bookUrl = (coll: string, n: number) =>
  coll === 'x' ? `/wignebi-x/${String(n).padStart(2, '0')}.json` : `/wignebi/${coll}/${String(n).padStart(2, '0')}.json`;
export const bibleUrl = (book: string) => `/bible/${book}.json`;

type At = 'vespers' | 'matins' | 'hours' | 'liturgy';

/** every file the day's four services need: the reader's and the priest's texts, the psalter's kanons, the troparia and
 *  kontakia (the saint's month, the weekday's, a movable day's, the temple's, the tone's) and the Apostle's books */
export const dayFiles = (inp: DayInput): string[] => {
  const out = new Set<string>();
  const src = (s: TextSrc | null | undefined) => { if (s) out.add(bookUrl(s.coll, s.n)); };
  const month = (iso: string) => out.add(bookUrl('jamni', monthFile(oldMD(iso).month)));
  const hymns = (at: At, prev?: boolean) => {
    // the ninth hour still belongs to the day before (useTroparia)
    const day: DayInput = prev ? { ...inp, iso: addDays(inp.iso, -1), day: null } : inp;
    const { troparia, kontakia } = hymnsOf(day, at);
    for (const h of [...troparia, ...kontakia]) {
      if (h.e !== undefined) src(triodionSrc(h.e));
      else if (h.md) out.add(bookUrl('jamni', monthFile(Number(h.md.slice(0, 2)))));
    }
    src(octoechos(day.tone, 6, 'troparion'));
    month(day.iso);
    out.add(bookUrl('jamni', WEEKDAY_FILE));
    if (day.patron?.md) month(patronDay(day.patron, day.iso));
  };
  for (const service of buildServices(inp)) {
    for (const step of service.steps) {
      for (const r of step.read ?? []) {
        if ('src' in r) src(r.src);
        else if ('kathisma' in r) out.add(bookUrl('davitni', r.kathisma));
        else if ('hymns' in r) hymns(r.hymns, r.prev);
      }
      for (const s of step.pt ?? []) src(s);
      for (const x of step.extras ?? []) {
        if (x.kind === 'text') src(x.src);
        else if (x.kind === 'troparia') hymns(x.at);
        else if (x.kind === 'readings') for (const r of x.items) if (r.apostle) out.add(bibleUrl(r.file));
      }
    }
  }
  return [...out].sort();
};

/** what the saved texts depend on: another rank, tone, temple or order of the same day reads other files */
export const daySignature = (inp: DayInput) =>
  [inp.iso, inp.rank, inp.tone ?? 0, inp.patron?.name ?? '', inp.order ? `${inp.order.sat}-${inp.order.weekday}` : ''].join('|');
