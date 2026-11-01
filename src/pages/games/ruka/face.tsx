import React from 'react';
import { Compass, Headphones, Info, MapPin, Mic2, MousePointerClick } from 'lucide-react';
import { KUTKHE_REGIONS } from '../../../utils/kutkhe';
import { RUKA_LISTEN, RUKA_MARKS, drawRuka, rukaItemOf, rukaTopicLabel, type RukaQ } from '../../../utils/ruka';
import { rukaHears, rukaItems } from '../../../data/rukaPool';
import type { PublicQ, RoundQ } from '../../../utils/roundGames';
import { Pill } from '../../../components/ui/kit';
import { openQ, type RoundFace } from '../rounds/face';
import { KutkheMap, MapKey, RegionChips, regionName } from '../kutkhe/KutkheMap';
import { RukaOptions } from './Options';
import { readOpts, readSeen, rememberAsked } from './store';

// „რუკის ვიქტორინა“ (2026-11-01, like Seterra) over the quick games' screens: a name to place (or a song's piece), the map to
// tap, at the reveal the right region and a line on the place. Rules utils/ruka.ts, items data/rukaPool.ts.

const q$ = (q: PublicQ) => openQ<RukaQ>(q);
const TBILISI = KUTKHE_REGIONS.indexOf('kalakuri');
/** the regions as this game names them: ქალაქური is Tbilisi on its map */
export const rukaRegionName = (i: number) => (i === TBILISI ? 'თბილისი' : regionName(i));

/** what is asked: the topic, then the name in big letters (a song asked by its tune: a line to listen) */
export const RukaAsk: NonNullable<RoundFace['Ask']> = ({ q, who }) => {
  const o = q$(q);
  const song = o.topic === 'song';
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)] px-4 py-4 sm:px-5">
      {o.topic && <Pill>{rukaTopicLabel(o.topic)}</Pill>}
      {o.ask ? (
        <p className="mt-2.5 font-serif-ge text-[24px] sm:text-[26px] font-bold leading-tight text-[#4a3426] [overflow-wrap:anywhere]">{song ? `„${o.ask}“` : o.ask}</p>
      ) : (
        <p className="mt-2.5 flex items-center gap-2 font-serif-ge text-[19px] font-bold leading-snug text-[#4a3426]"><Headphones className="w-5 h-5 shrink-0" />მოისმინე — საიდანაა ეს სიმღერა?</p>
      )}
      {who === 'player' && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[13px] leading-snug text-[#75685a]">
          <MousePointerClick className="w-4 h-4 shrink-0" />მონიშნე მისი კუთხე რუკაზე ან ქვემოთ.
        </p>
      )}
    </section>
  );
};

export const RukaPick: RoundFace['Pick'] = ({ pick, onPick }) => (
  <div className="space-y-3">
    <KutkheMap mode="pick" pick={pick} onPick={onPick} nameOf={rukaRegionName} />
    <RegionChips pick={pick} onPick={onPick} nameOf={rukaRegionName} />
  </div>
);

export const RukaReveal: RoundFace['Reveal'] = ({ q, picks, mine }) => {
  const o = q$(q);
  if (o.region === undefined) return null;
  const counts = picks ? picks.reduce<number[]>((c, p) => { if (p !== null && p >= 0 && p < c.length) c[p] += 1; return c; }, KUTKHE_REGIONS.map(() => 0)) : null;
  return (
    <div className="space-y-2">
      <KutkheMap mode="reveal" right={o.region} mine={mine} counts={counts} nameOf={rukaRegionName} near={false} />
      <MapKey mine={mine !== undefined && mine !== null && mine !== o.region} near={false} />
    </div>
  );
};

/** where it is, what it is, a line on it */
export const RukaAnswer: RoundFace['Answer'] = ({ q }) => {
  const o = q$(q);
  if (o.region === undefined || !o.name) return null;
  const song = o.topic === 'song';
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5">
      <p className="flex items-center gap-1.5 text-[13px] font-bold text-[#2f7d4f]">
        <MapPin className="w-4 h-4 shrink-0" />{song && o.region === TBILISI ? 'ქალაქური სიმღერა · თბილისი' : rukaRegionName(o.region)}
      </p>
      <p className="mt-1 font-serif-ge text-[20px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]">{song ? `„${o.name}“` : o.name}</p>
      {o.note && (
        <p className="mt-1.5 flex items-start gap-1.5 text-[13px] leading-snug text-[#75685a] [overflow-wrap:anywhere]">
          <Info className="w-4 h-4 shrink-0 mt-px" />{o.note}
        </p>
      )}
      {o.who && <p className="mt-1 flex items-start gap-1.5 text-[13px] leading-snug text-[#75685a]"><Mic2 className="w-4 h-4 shrink-0 mt-px" />{o.who}</p>}
    </section>
  );
};

export const rukaVerdict: RoundFace['verdict'] = (q, pick) => {
  const o = q$(q);
  if (pick === null || o.region === undefined) return { tone: 'none', text: 'პასუხი ვერ მოასწარი' };
  if (pick === o.region) return { tone: 'right', text: 'სწორია!' };
  return { tone: 'wrong', text: `არა — შენ მონიშნე ${rukaRegionName(pick)}` };
};

/** a game's rounds by the choices kept on this phone */
export const drawRukaRounds = (count: number) => {
  const { topics, hide } = readOpts();
  const hideTitles = hide && rukaHears();
  return drawRuka({ items: rukaItems(hideTitles), topics, count, hideTitles, seen: readSeen() });
};
export const rememberRuka = (rounds: RoundQ[]) => rememberAsked(rounds.flatMap(r => (r.kind === 'ruka' ? [rukaItemOf(r)] : [])));

export const RUKA_FACE: RoundFace = {
  game: 'ruka',
  title: 'რუკის ვიქტორინა',
  Icon: Compass,
  intro: 'ქალაქი, ტბა, კერძი, ციხე, პოეტი ან ხალხური სიმღერა — სწრაფად მონიშნე საქართველოს რუკაზე, რომელი კუთხისაა. სწორი კუთხე მაშინვე 1000 ქულაა, ბოლო წამს — 500; სხვა კუთხე ქულას არ იძლევა. პასუხის მერე ერთი სტრიქონი გეტყვის, რითაა ეს ადგილი ცნობილი.',
  online: 'ონლაინ: წამყვანი ოთახს ხსნის და კლასს იწვევს, თვითონ არ თამაშობს. კითხვა ყველას თავის ტელეფონზე უჩანს და კუთხეს რუკაზე ნიშნავს — სახლიდანაც. სიმღერის ნაწყვეტი ყველა ტელეფონზე ჟღერს, ერთ ოთახში — მხოლოდ წამყვანისაზე.',
  hybrid: 'ჰიბრიდული: ერთი ტელეფონი წამყვანს უჭირავს, კლასი გუნდებადაა. წამყვანი სახელს ხმამაღლა კითხულობს (ან ნაწყვეტს რთავს), გუნდები კუთხეს ფურცელზე წერენ ან კედელზე გაკრულ რუკაზე აკრავენ ნიშანს; მერე ტელეფონი სწორ კუთხეს აჩენს და წამყვანი მონიშნავს, ვინ გამოიცნო.',
  draw: count => drawRukaRounds(count),
  remember: rememberRuka,
  askHost: 'მოთამაშეები კუთხეს რუკაზე ნიშნავენ.',
  askPlayer: 'მონიშნე მისი კუთხე რუკაზე.',
  askTeams: 'გუნდები კუთხეს ფურცელზე წერენ.',
  clip: q => { const o = q$(q); return o.url ? { url: o.url, from: typeof o.from === 'number' ? o.from : 0.2, seconds: RUKA_LISTEN } : null; },
  clipSeconds: RUKA_LISTEN,
  Ask: RukaAsk,
  Options: RukaOptions,
  Pick: RukaPick,
  pickName: (_, pick) => rukaRegionName(pick),
  confirm: (_, pick) => (pick === null ? 'მონიშნე კუთხე' : `ეს კუთხეა · ${rukaRegionName(pick)}`),
  Reveal: RukaReveal,
  Answer: RukaAnswer,
  verdict: rukaVerdict,
  marks: RUKA_MARKS,
  empty: 'ამ თემებში ჯერ კითხვა არ არის — აირჩიე სხვა თემა.',
  callHint: 'ზარში ერთმანეთს ხედავთ და გესმით. პასუხს ხმამაღლა ნუ იტყვით — ყველა თავისას ნიშნავს.',
};
