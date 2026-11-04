import React, { useEffect, useState } from 'react';
import { Dice5, RotateCcw } from 'lucide-react';
import { GATVLA_BEAT_MS, drawGatvla, landing, shortNames, type GatvlaQ } from '../../../utils/gatvlaRounds';
import type { PublicQ } from '../../../utils/roundGames';
import { Pill } from '../../../components/ui/kit';
import { triggerHaptic } from '../../../utils/haptics';
import { Hint } from '../samshvilde/parts';
import { openQ, type RoundFace } from '../rounds/face';
import { NameTile, type TileState } from './parts';
import { allRhymes } from './store';

// „გათვლა“ online (2026-11-04) over the quick games' screens (pages/games/rounds/): „ვის შეხვდება?“ — the host reads the rhyme
// out in the room's call, every player sees the circle of the room's names and the rhyme on their own phone and marks the one
// the last word will land on; at the reveal the rhyme counts on every phone and the one it lands on starts and leaves the
// circle (utils/gatvlaRounds.ts). The one-phone tool (counting, the wheel, teams) is Table.tsx.

const q$ = (q: PublicQ) => openQ<GatvlaQ>(q);
const ready = (o: Partial<GatvlaQ>): o is GatvlaQ => !!o.names?.length && !!o.words?.length && typeof o.from === 'number';

/** the rhyme's words, the beat on now lit */
const Words: React.FC<{ words: string[]; at?: number }> = ({ words, at = -1 }) => (
  <p className="text-[16px] leading-relaxed text-[#4a3426]">
    {words.map((w, i) => (
      <span key={i} className={`inline-block rounded-md px-1 mx-px transition-colors duration-100 ${i === at ? 'bg-[#7a2028] text-[#fbf6ec] font-bold' : at >= 0 && i < at ? 'text-[#b3a594]' : ''}`}>{w}</span>
    ))}
  </p>
);

/** the first beat's mark on its tile */
const First: React.FC = () => (
  <span className="absolute -top-1.5 -left-1.5 min-w-6 h-6 px-1.5 rounded-full bg-[#c9a227] text-white text-[11px] font-bold inline-flex items-center justify-center shadow-sm" aria-label="აქედან იწყება">1</span>
);
/** how many marked this one */
const Count: React.FC<{ n: number }> = ({ n }) => (n > 0 ? (
  <span className="absolute -top-1.5 -right-1.5 min-w-6 h-6 px-1.5 rounded-full bg-[#4a3426] text-white text-[11px] font-bold tabular-nums inline-flex items-center justify-center shadow-sm" aria-label={`${n} მონიშნა`}>{n}</span>
) : null);

/** the round in words: the rhyme and where it begins */
const Ask: NonNullable<RoundFace['Ask']> = ({ q }) => {
  const o = q$(q);
  if (!ready(o)) return null;
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)] px-4 py-3.5 space-y-2">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        {o.title && <Pill>{o.title}</Pill>}
        <span className="text-[12.5px] font-bold text-[#9a6a10] tabular-nums">{o.words.length} სიტყვა · {o.names.length} მოთამაშე</span>
      </div>
      <Words words={o.words} />
      <p className="text-[12.5px] leading-snug text-[#75685a]">
        პირველი სიტყვა ეცემა: <b className="text-[#4a3426]">{o.names[o.from]}</b> (<span className="text-[#9a6a10] font-bold">1</span>), მერე — რიგრიგობით; ბოლოს შემდეგ ისევ თავიდან.
      </p>
    </section>
  );
};

/** the circle: tap the one the rhyme lands on */
const Pick: RoundFace['Pick'] = ({ q, pick, onPick, locked }) => {
  const o = q$(q);
  if (!ready(o)) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1.5" role="group" aria-label="ვის შეხვდება">
      {o.names.map((n, i) => (
        <button
          key={i}
          type="button"
          disabled={locked}
          aria-pressed={pick === i}
          onClick={() => { triggerHaptic(6); onPick(pick === i ? null : i); }}
          className="text-left cursor-pointer disabled:cursor-default active:scale-[0.98] transition-transform"
        >
          <NameTile name={n} state={pick === i ? 'chosen' : 'idle'} badge={i === o.from ? <First /> : undefined} />
        </button>
      ))}
    </div>
  );
};

/** the reveal: the rhyme counts round the circle, a beat a name, and stops on the one it lands on */
const Reveal: RoundFace['Reveal'] = ({ q, picks, mine }) => {
  const o = q$(q);
  const [at, setAt] = useState(0);
  const [run, setRun] = useState(0);
  const beats = o.words?.length ?? 0;
  useEffect(() => {
    if (!beats) return;
    setAt(0);
    const t = setInterval(() => setAt(a => {
      if (a + 1 >= beats) { clearInterval(t); triggerHaptic(60); return beats; }
      return a + 1;
    }), GATVLA_BEAT_MS);
    return () => clearInterval(t);
  }, [beats, run]);
  if (!ready(o)) return null;
  const done = at >= beats;
  const land = landing(o);
  const lit = done ? -1 : (o.from + at) % o.names.length;
  const counts = o.names.map((_, i) => (picks ?? []).filter(p => p === i).length);
  const stateOf = (i: number): TileState => (done && i === land ? 'picked' : i === lit ? 'active' : done && mine === i ? 'missed' : 'idle');
  return (
    <section className="space-y-3">
      <div className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5">
        <Words words={o.words} at={done ? -1 : at} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1.5">
        {o.names.map((n, i) => (
          <NameTile key={i} name={n} state={stateOf(i)} badge={done ? <Count n={counts[i]} /> : i === o.from ? <First /> : undefined} />
        ))}
      </div>
      {done && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Hint>რიცხვი სახელზე — რამდენმა მონიშნა.</Hint>
          <button type="button" onClick={() => setRun(r => r + 1)} className="h-10 px-3 rounded-full inline-flex items-center gap-1.5 text-[13px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer">
            <RotateCcw className="w-4 h-4" />თავიდან დათვლა
          </button>
        </div>
      )}
    </section>
  );
};

/** who starts, and the order so far */
const Answer: RoundFace['Answer'] = ({ q }) => {
  const o = q$(q);
  if (!ready(o)) return null;
  const who = o.names[landing(o)];
  const order = [...(o.before ?? []), who];
  return (
    <section className="rounded-3xl bg-[#2f7d4f]/[0.07] ring-1 ring-[#2f7d4f]/25 px-4 py-4 sm:px-5">
      <p className="text-[12px] font-bold text-[#9a8b7b]">ლექსი დაეცა — იწყებს</p>
      <p className="mt-0.5 font-serif-ge text-[28px] font-bold leading-tight text-[#2f7d4f] [overflow-wrap:anywhere]">{who}</p>
      {order.length > 1 && (
        <ol className="mt-2.5 pt-2.5 border-t border-[#2f7d4f]/15 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-[#4a3426]">
          {order.map((n, i) => <li key={i}><span className="tabular-nums text-[#9a8b7b]">{i + 1}.</span> <b>{n}</b></li>)}
        </ol>
      )}
    </section>
  );
};

/** the lobby's line: what the rounds are */
const Options: React.FC = () => (
  <Hint>
    ყოველ რაუნდს სხვა ლექსია: {allRhymes().map(r => `„${r.title}“`).join(', ')}. ვისზეც დაეცემა, ის იწყებს და წრიდან გადის — ასე ირკვევა მთელი რიგი. რაუნდი მოთამაშეებზე ერთით ნაკლები იქნება, მეტი არა (6 მოთამაშე — 5 რაუნდი).
  </Hint>
);

export const GATVLA_FACE: RoundFace = {
  game: 'gatvla',
  title: 'გათვლა',
  Icon: Dice5,
  intro: 'გათვლის ლექსით ირჩევენ, ვინ იწყებს: წრეში ყოველ სიტყვაზე შემდეგს მიუთითებ, ვისზეც ბოლო სიტყვა დაეცემა, ის იწყებს. ბორბალი იმას ირჩევს, ვინც ყველაზე ნაკლებჯერ იყო, და კლასს გუნდებადაც დაყოფს.',
  online: 'ონლაინ — „ვის შეხვდება?“: წამყვანი ოთახს ხსნის და ზარში ლექსს კითხულობს. ყველას ტელეფონზე ოთახის სახელების წრეა და ლექსი: დაითვალე და მონიშნე, ვისზე დაეცემა ბოლო სიტყვა. სწორი მაშინვე 1000 ქულაა, ბოლო წამს 500. ვისზეც დაეცა, ის იწყებს და წრიდან გადის, ასე ირკვევა მთელი რიგი.',
  hybrid: 'ჰიბრიდული: ერთი ტელეფონი წრეში. ჩაწერე სახელები ან დაამატე კლასი და აირჩიე: გათვლა (ვინ იწყებს), ბორბალი (ვისი ჯერია) ან გუნდები.',
  draw: (count, _program, players) => drawGatvla({ players: shortNames(players ?? []), rhymes: allRhymes(), count }),
  remember: () => {},
  askHost: 'წაიკითხე ლექსი ხმამაღლა, ნელა. ყველა ითვლის, ვისზე დაეცემა.',
  askPlayer: 'დაითვალე: ვისზე დაეცემა ბოლო სიტყვა?',
  askTeams: 'წაიკითხე ლექსი ხმამაღლა.',
  clipSeconds: 0,
  Ask,
  Options,
  Pick,
  pickName: (q, pick) => q$(q).names?.[pick] ?? '',
  confirm: (q, pick) => (pick === null ? 'მონიშნე, ვის შეხვდება' : `${q$(q).names?.[pick] ?? ''} — გაგზავნა`),
  Reveal,
  Answer,
  verdict: (q, pick) => {
    const o = q$(q);
    if (pick === null || !ready(o)) return { tone: 'none', text: 'ვერ მოასწარი' };
    if (pick === landing(o)) return { tone: 'right', text: 'სწორია — ზუსტად დაითვალე!' };
    return { tone: 'wrong', text: `არა — დაეცა: ${o.names[landing(o)]}` };
  },
  marks: [{ points: 1, label: 'სწორი' }, { points: 0, label: 'ვერა' }],
  empty: 'გათვლას ორი მოთამაშე მაინც უნდა: დაელოდე, სანამ კლასიდან შემოვლენ.',
  callHint: 'ზარში წამყვანს ისმენთ: ლექსს ის კითხულობს. პასუხს ხმამაღლა ნუ იტყვით — ყველა თავისას ნიშნავს.',
};
