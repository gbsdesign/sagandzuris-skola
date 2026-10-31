import React from 'react';
import { MapPin, MapPinned, Mic2 } from 'lucide-react';
import { kutkhePool } from '../../../data/kutkhePool';
import { KUTKHE_CLIP, KUTKHE_MARKS, KUTKHE_REGIONS, drawKutkhe, isNear, kutkheSongOf, type KutkheQ } from '../../../utils/kutkhe';
import type { PublicQ, RoundQ } from '../../../utils/roundGames';
import { openQ, type RoundFace } from '../rounds/face';
import { KutkheMap, MapKey, RegionChips, regionName } from './KutkheMap';

// „საიდანაა სიმღერა?“ (2026-10-31) over the quick games' screens: a piece of a folk song, the map to answer on, the song's
// card at the reveal. Rules utils/kutkhe.ts, recordings data/kutkhePool.ts.

const SEEN = 'sg-kutkhe-seen';
const readSeen = (): string[] => {
  try { const v = JSON.parse(localStorage.getItem(SEEN) || '[]'); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []; } catch { return []; }
};

const q$ = (q: PublicQ) => openQ<KutkheQ>(q);

const Pick: RoundFace['Pick'] = ({ pick, onPick }) => (
  <div className="space-y-3">
    <KutkheMap mode="pick" pick={pick} onPick={onPick} />
    <RegionChips pick={pick} onPick={onPick} />
  </div>
);

const Reveal: RoundFace['Reveal'] = ({ q, picks, mine }) => {
  const k = q$(q);
  if (k.region === undefined) return null;
  const counts = picks ? picks.reduce<number[]>((c, p) => { if (p !== null && p >= 0 && p < c.length) c[p] += 1; return c; }, KUTKHE_REGIONS.map(() => 0)) : null;
  return (
    <div className="space-y-2">
      <KutkheMap mode="reveal" right={k.region} mine={mine} counts={counts} />
      <MapKey mine={mine !== undefined && mine !== null && mine !== k.region} />
    </div>
  );
};

const Answer: RoundFace['Answer'] = ({ q }) => {
  const k = q$(q);
  if (k.region === undefined) return null;
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5">
      <p className="flex items-center gap-1.5 text-[13px] font-bold text-[#2f7d4f]">
        <MapPin className="w-4 h-4 shrink-0" />{regionName(k.region)}{k.place ? <span className="font-bold text-[#75685a]"> · {k.place}</span> : null}
      </p>
      <p className="mt-1 font-serif-ge text-[20px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]">„{k.song}“</p>
      {k.who && <p className="mt-1 flex items-start gap-1.5 text-[13px] leading-snug text-[#75685a]"><Mic2 className="w-4 h-4 shrink-0 mt-px" />{k.who}</p>}
    </section>
  );
};

export const KUTKHE_FACE: RoundFace = {
  game: 'kutkhe',
  title: 'საიდანაა სიმღერა?',
  Icon: MapPinned,
  intro: 'სკოლის არქივის ხალხური სიმღერის ნაწყვეტი ჟღერს და ყველამ უნდა გამოიცნოს, საქართველოს რომელი კუთხისაა. სწორი კუთხე ყველაზე მეტ ქულას იძლევა, მისი მეზობელი — ნაწილს; რაც უფრო მალე, მით მეტი.',
  online: 'ონლაინ: წამყვანი ოთახს ხსნის და კლასს იწვევს, თვითონ არ თამაშობს. ყველა ნაწყვეტს თავის ტელეფონზე ისმენს და კუთხეს რუკაზე ნიშნავს — სახლიდანაც. ერთ ოთახში თუ ხართ, ნაწყვეტი მხოლოდ წამყვანის ტელეფონზე ჟღერს.',
  hybrid: 'ჰიბრიდული: ერთი ტელეფონი წამყვანს უჭირავს, კლასი გუნდებადაა. ნაწყვეტი ჟღერს, გუნდები ბჭობენ და კუთხეს ფურცელზე წერენ, მერე ტელეფონი რუკაზე სწორ პასუხს აჩენს და წამყვანი მონიშნავს, რომელმა გუნდმა გამოიცნო. ქულებს ტელეფონი ითვლის.',
  draw: count => drawKutkhe(kutkhePool(), count, readSeen()),
  remember: (rounds: RoundQ[]) => {
    const ids = rounds.map(r => kutkheSongOf(r as KutkheQ));
    try { localStorage.setItem(SEEN, JSON.stringify([...readSeen().filter(x => !ids.includes(x)), ...ids].slice(-120))); } catch { /* private mode */ }
  },
  askHost: 'საიდანაა ეს სიმღერა? მოთამაშეები კუთხეს რუკაზე ნიშნავენ.',
  askPlayer: 'მოისმინე და მონიშნე, საქართველოს რომელი კუთხისაა.',
  askTeams: 'საიდანაა ეს სიმღერა? გუნდები ბჭობენ და კუთხეს ფურცელზე წერენ.',
  clip: q => (q.url ? { url: q.url, from: typeof q.from === 'number' ? q.from : 0.2 } : null),
  clipSeconds: KUTKHE_CLIP,
  Pick,
  pickName: (_, pick) => regionName(pick),
  confirm: (_, pick) => (pick === null ? 'მონიშნე კუთხე' : `ეს კუთხეა · ${regionName(pick)}`),
  Reveal,
  Answer,
  verdict: (q, pick) => {
    const k = q$(q);
    if (pick === null || k.region === undefined) return { tone: 'none', text: 'პასუხი ვერ მოასწარი' };
    if (pick === k.region) return { tone: 'right', text: 'სწორია!' };
    if (isNear(k.region, pick)) return { tone: 'near', text: `ახლოა — ${regionName(pick)} მეზობელი კუთხეა` };
    return { tone: 'wrong', text: `არა — შენ მონიშნე ${regionName(pick)}` };
  },
  marks: KUTKHE_MARKS,
  empty: 'ამ თამაშისთვის სკოლის ჩანაწერებია საჭირო, ისინი კი შენთვის ჯერ არ არის გახსნილი.',
  callHint: 'ზარში ერთმანეთს ხედავთ და გესმით. პასუხს ხმამაღლა ნუ იტყვით — ყველა თავისას ნიშნავს.',
};
