import type { ChantSource, DzebnaPools, HuntWord, PlaceSource, QuizSource, YearSource } from '../utils/dzebna';
import { OTKHI_QUESTIONS } from './otkhiQuestions';
import { RUKA_PLACES } from './rukaPlaces';
import { KHAZI_CARDS } from './khaziCards';
import { anbaniWords } from './anbaniWords';
import { knownChants } from './chantGamePool';
import { PLAIN_OPENINGS } from './lotoKit';
import { ANSWER_BANK } from './sitqvaAnswers';
import { OTKHEULI_GROUPS } from './otkheuliGroups';
import { KIND_HINT } from '../utils/sitqva';
import { KUTKHE_REGIONS } from '../utils/kutkhe';
import { HANGEBI_WORDS } from '../utils/hangebi';
import { hash32 } from '../utils/hangi';
import { mulberry32, shuffle } from '../utils/otkheuli';

// What „საგანძურის ძებნა“'s stations ask (2026-11-04): the app's own banks, nothing new written for it — „ოთხიდან ერთი“'s
// written questions (its own and the broad Georgian bank), „რუკის ვიქტორინა“'s places on the songs map's regions, „დროის
// ხაზი“'s dated cards (history, people's births, culture; three of them a task), „სამი დამწერლობა“'s words to read in old
// letters and the chant games' well-known chants (their openings on the synthesizer; the ones on a reciting tone left out, as
// in „საგალობლო ლოტო“). The words to find are „დღის სიტყვა“'s answers (4–6 letters) and „ოთხეული“'s single words (the longer
// ones), with what kind of word it is as the hint. Made once, on first use.

const YEAR_GAP = 10;

/** the dated cards three by three, in one fixed order: three different decades a task, so „which came first“ is fair */
const yearTriples = (): YearSource[] => {
  const rest: YearSource[] = shuffle(
    KHAZI_CARDS.filter(c => c.deck !== 'tsirva').map(c => ({ id: c.id, text: c.text, when: c.when, label: c.label })),
    mulberry32(hash32('dzebna-years')),
  );
  const out: YearSource[] = [];
  const apart = (a: YearSource, b: YearSource) => Math.abs(a.when - b.when) >= YEAR_GAP;
  while (rest.length >= 3) {
    const a = rest.shift()!;
    const b = rest.findIndex(x => apart(x, a));
    if (b < 0) continue;
    const c = rest.findIndex((x, i) => i !== b && apart(x, a) && apart(x, rest[b]));
    if (c < 0) continue;
    const [first, second] = b < c ? [c, b] : [b, c];
    const picked = [rest[b], rest[c]];
    rest.splice(first, 1);
    rest.splice(second, 1);
    out.push(a, ...picked);
  }
  return out;
};

// the songs map's regions as „ოთხი ჰანგი“ names them (its first words, in KUTKHE_REGIONS' order; songsData would pull the
// store in), ქალაქური being Tbilisi as on „რუკის ვიქტორინა“'s map
const regionNames = () => KUTKHE_REGIONS.map((id, i) => (id === 'kalakuri' ? 'თბილისი' : HANGEBI_WORDS[i]));

let pools: DzebnaPools | null = null;
export const dzebnaPools = (): DzebnaPools => {
  if (pools) return pools;
  const quiz: QuizSource[] = OTKHI_QUESTIONS.filter(q => !q.url && q.a.length >= 4).map(q => ({ id: q.id, q: q.q, a: q.a, note: q.note }));
  const places: PlaceSource[] = RUKA_PLACES.flatMap(p => {
    const region = KUTKHE_REGIONS.indexOf(p.region);
    return region >= 0 ? [{ id: p.name, topic: p.topic, name: p.name, region, note: p.note }] : [];
  });
  const old = anbaniWords().filter(w => { const n = [...w].length; return n >= 3 && n <= 7; });
  const chant: ChantSource[] = knownChants().filter(c => !PLAIN_OPENINGS.has(c.id))
    .map(c => ({ id: c.id, title: c.title, service: c.service, book: c.book, num: c.num }));
  pools = { quiz, places, regionNames: regionNames(), year: yearTriples(), old, chant };
  return pools;
};

const GEO = /^[ა-ჰ]+$/;

let bank: HuntWord[] | null = null;
/** the treasure's words: 4–6 letters from „დღის სიტყვა“'s answers, 7–8 from „ოთხეული“'s groups (a single word each; the songs'
 *  and chants' titles left out); a word once */
export const huntBank = (): HuntWord[] => {
  if (bank) return bank;
  const out: HuntWord[] = [];
  const seen = new Set<string>();
  const add = (word: string, hint: string) => {
    const w = word.trim();
    const n = [...w].length;
    if (!GEO.test(w) || n < 4 || n > 8 || seen.has(w)) return;
    seen.add(w);
    out.push({ word: w, hint });
  };
  ANSWER_BANK.forEach(c => { if (c.kind !== 'feast' && c.kind !== 'saint') add(c.word, KIND_HINT[c.kind]); });
  OTKHEULI_GROUPS.filter(g => g.family !== 'songs' && g.family !== 'chants')
    .forEach(g => g.words.forEach(w => { if ([...w.trim()].length >= 7) add(w, g.label); }));
  bank = out;
  return bank;
};
