import React from 'react';
import { ListMusic, MapPin } from 'lucide-react';
import { gagrdzeleSongs } from '../../../data/gagrdzelePool';
import { GAGRDZELE_CLIP, GAGRDZELE_MARKS, drawGagrdzele, gagrdzeleSongOf, type GagrdzeleQ } from '../../../utils/gagrdzele';
import { OTKHI_LETTERS } from '../../../utils/otkhi';
import type { PublicQ } from '../../../utils/roundGames';
import { openQ, type RoundFace } from '../rounds/face';
import { FourPick, FourReveal, OptionList, fourConfirm, fourName } from '../rounds/four';
import { readSeen, rememberAsked } from './store';

// „გააგრძელე!“ (2026-11-01, like Don't Forget the Lyrics!) over the quick games' screens: the song's title and the lines before
// the gap, then four lines to pick from (rounds/four.tsx) — on one phone none: the teams sing or write the next line from
// memory and the reveal shows the true one. Rules utils/gagrdzele.ts, songs data/gagrdzelePool.ts.

const q$ = (q: PublicQ) => openQ<GagrdzeleQ>(q);

const Song: React.FC<{ o: Partial<GagrdzeleQ> }> = ({ o }) => (
  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
    <p className="min-w-0 font-serif-ge text-[17px] font-bold leading-snug text-[#7a2028] [overflow-wrap:anywhere]">„{o.song}“</p>
    {o.where && <p className="inline-flex items-center gap-1 text-[13px] font-bold text-[#75685a]"><MapPin className="w-3.5 h-3.5" />{o.where}</p>}
  </div>
);

/** the song and its lines up to the gap; the host's screen in a room also lists the four lines to read out */
const Ask: NonNullable<RoundFace['Ask']> = ({ q, who }) => {
  const o = q$(q);
  const lines = o.lines ?? [];
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)] px-4 py-4 sm:px-5">
      <Song o={o} />
      <div className="mt-3 space-y-1.5 border-l-4 border-[#c9a227]/60 pl-3.5">
        {lines.map((l, i) => (
          <p
            key={i}
            className={i === lines.length - 1
              ? 'font-serif-ge text-[19px] sm:text-[21px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]'
              : 'text-[15px] leading-snug text-[#75685a] [overflow-wrap:anywhere]'}
          >
            {l}
          </p>
        ))}
        <p className="flex items-center gap-2 pt-1" aria-label="შემდეგი სტრიქონი">
          <span className="h-0 flex-1 border-b-2 border-dashed border-[#c9a227]" />
          <span className="font-serif-ge text-[20px] font-bold text-[#a0703c]">?</span>
        </p>
      </div>
      {who === 'host' && <OptionList q={q} className="mt-4" />}
    </section>
  );
};

/** the true line in its place, and the line after it */
const Answer: RoundFace['Answer'] = ({ q }) => {
  const o = q$(q);
  if (o.right === undefined || !o.options) return null;
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5">
      <Song o={o} />
      <div className="mt-2.5 space-y-1.5">
        {(o.lines ?? []).map((l, i) => <p key={i} className="text-[14.5px] leading-snug text-[#75685a] [overflow-wrap:anywhere]">{l}</p>)}
        <p className="rounded-2xl bg-[#2f7d4f]/10 px-3 py-2 font-serif-ge text-[17.5px] font-bold leading-snug text-[#1e4d31] [overflow-wrap:anywhere]">{o.options[o.right]}</p>
        {o.after && <p className="text-[14.5px] leading-snug text-[#75685a] [overflow-wrap:anywhere]">{o.after}</p>}
      </div>
    </section>
  );
};

/** online and alone: the four lines, the right one green; on one phone nothing more (the answer's card holds the line) */
const Reveal: RoundFace['Reveal'] = ({ q, picks, mine }) =>
  (picks === undefined && mine === undefined ? null : <FourReveal q={q} picks={picks} mine={mine} />);

export const GAGRDZELE_FACE: RoundFace = {
  game: 'gagrdzele',
  title: 'გააგრძელე!',
  Icon: ListMusic,
  intro: 'ეკრანზე ხალხური სიმღერის სახელი და ერთი-ორი სტრიქონია, მერე — გაწყვეტა: რომელი სტრიქონი მოდის შემდეგ? ჩანაწერები თუ გაქვს, ჯერ სიმღერის დასაწყისი ჟღერს და უეცრად ჩერდება. სწორი სტრიქონი მაშინვე 1000 ქულაა, ბოლო წამს — 500. სიმღერები ყველა კუთხიდანაა, ტექსტები — სიმღერების გვერდებიდან.',
  online: 'ონლაინ: წამყვანი ოთახს ხსნის და კლასს იწვევს, თვითონ არ თამაშობს. სტრიქონები და ოთხი პასუხი ყველას თავის ტელეფონზე უჩანს — სახლიდანაც; ვინც სწორს უფრო მალე მონიშნავს, მეტ ქულას იღებს.',
  hybrid: 'ჰიბრიდული: ერთი ტელეფონი წამყვანს უჭირავს, კლასი გუნდებადაა. ტელეფონი სიმღერის დასაწყისს უკრავს და ჩუმდება, ეკრანზე ბოლო სტრიქონი ჩანს — გუნდები შემდეგ სტრიქონს ზეპირად მღერიან ან ფურცელზე წერენ (ვარიანტები არ ჩანს). მერე ტელეფონი ნამდვილ სტრიქონს აჩენს და წამყვანი თითო გუნდს მონიშნავს: ზუსტად — 2, თითქმის — 1.',
  draw: count => drawGagrdzele({ songs: gagrdzeleSongs(), count, seen: readSeen() }),
  remember: rounds => rememberAsked(rounds.flatMap(r => (r.kind === 'gagrdzele' ? [gagrdzeleSongOf(r)] : []))),
  askHost: 'მოთამაშეები შემდეგ სტრიქონს თავის ტელეფონზე ნიშნავენ.',
  askPlayer: 'რომელი სტრიქონი მოდის შემდეგ?',
  askTeams: 'გააგრძელეთ! შემდეგი სტრიქონი იმღერეთ ან დაწერეთ.',
  clip: q => { const o = q$(q); return o.url ? { url: o.url, from: 0, seconds: GAGRDZELE_CLIP } : null; },
  clipSeconds: GAGRDZELE_CLIP,
  Ask,
  Pick: FourPick,
  pickName: fourName,
  confirm: fourConfirm,
  Reveal,
  Answer,
  verdict: (q, pick) => {
    const o = q$(q);
    if (pick === null || o.right === undefined) return { tone: 'none', text: 'პასუხი ვერ მოასწარი' };
    if (pick === o.right) return { tone: 'right', text: 'სწორია!' };
    return { tone: 'wrong', text: `არა — სწორი იყო ${OTKHI_LETTERS[o.right]}` };
  },
  marks: GAGRDZELE_MARKS,
  empty: 'სიმღერის ტექსტები ვერ მოიძებნა.',
  callHint: 'ზარში ერთმანეთს ხედავთ და გესმით. პასუხს ხმამაღლა ნუ იტყვით — ყველა თავისას ნიშნავს.',
};
