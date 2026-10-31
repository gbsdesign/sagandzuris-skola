import React from 'react';
import { MicVocal } from 'lucide-react';
import { knownChants } from '../../../data/chantGamePool';
import { BOOK_NAMES } from '../../../data/chantLookup';
import { TURNIRI_ROUNDS, drawTurniri, type TurniriQ } from '../../../utils/turniri';
import { rememberChants } from '../../../utils/chantRounds';
import type { PublicQ, RoundQ } from '../../../utils/roundGames';
import { Pill } from '../../../components/ui/kit';
import { openQ, type RoundFace } from '../rounds/face';
import { Sing, pctTone } from './Sing';

// „ხმების ტურნირი“ (2026-10-31, like SingStar) over the quick games' screens: a round is a well-known chant's first phrase,
// every singer sings it in their own voice and the share of its notes sung right is their points; three rounds, one table.
// Online each sings on their own phone (Sing.tsx) and sends the take's share; on one phone the phone is passed hand to hand
// (`turns`). Rules utils/turniri.ts, the chants data/chantGamePool.ts.

const q$ = (q: PublicQ) => openQ<TurniriQ>(q);
const SEEN = 'sg-turniri-seen';
const readSeen = (): string[] => {
  try { const v = JSON.parse(localStorage.getItem(SEEN) || '[]'); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []; } catch { return []; }
};

/** the phrase everybody sings this round */
const Ask: NonNullable<RoundFace['Ask']> = ({ q }) => {
  const o = q$(q);
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)] px-4 py-4 sm:px-5">
      {o.service && <Pill>{o.service}</Pill>}
      <p className="mt-2.5 font-serif-ge text-[21px] sm:text-[22px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]">{o.title}</p>
      <p className="mt-1 text-[13px] leading-snug text-[#75685a]">პირველი ფრაზა — ყველა მღერის, თითო თავისი ხმით</p>
    </section>
  );
};

/** the chant sung, and where its notes are */
const Answer: RoundFace['Answer'] = ({ q }) => {
  const o = q$(q);
  if (!o.title) return null;
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5">
      {o.service && <Pill>{o.service}</Pill>}
      <p className="mt-2 font-serif-ge text-[19px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]">{o.title}</p>
      {o.book && o.num && <p className="mt-1 text-[13px] leading-snug text-[#75685a]">{BOOK_NAMES[o.book] ?? o.book} · №{o.num}</p>}
    </section>
  );
};

const Stat: React.FC<{ label: string; pct: number }> = ({ label, pct }) => (
  <div className="min-w-0 rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-2 py-2.5 text-center">
    <p className={`font-serif-ge text-[24px] font-bold leading-none tabular-nums ${pctTone(pct)}`}>{pct}%</p>
    <p className="mt-1 text-[12px] font-bold text-[#75685a]">{label}</p>
  </div>
);

/** the round in three numbers: the best take, the average, mine */
const Reveal: RoundFace['Reveal'] = ({ picks, mine }) => {
  const list = (picks ?? []).filter((p): p is number => typeof p === 'number');
  if (!list.length) return <p className="text-center text-[13.5px] font-bold text-[#75685a]">ამ რაუნდში არავინ იმღერა.</p>;
  const best = Math.max(...list);
  const avg = Math.round(list.reduce((a, b) => a + b, 0) / list.length);
  return (
    <div className={`grid gap-2 ${typeof mine === 'number' ? 'grid-cols-3' : 'grid-cols-2'}`}>
      <Stat label="საუკეთესო" pct={best} />
      <Stat label="საშუალო" pct={avg} />
      {typeof mine === 'number' && <Stat label="შენი" pct={mine} />}
    </div>
  );
};

export const TURNIRI_FACE: RoundFace = {
  game: 'turniri',
  title: 'ხმების ტურნირი',
  Icon: MicVocal,
  intro: 'სიმღერის შეჯიბრი: ყველა ერთსა და იმავე ფრაზას მღერის — ცნობილი საგალობლის დასაწყისს, თითო თავისი ხმით (I, II ან III). ჯერ ფრაზას მოისმენ წიგნის ნოტებით, მერე ტელეფონში იმღერებ; ტელეფონი ითვლის, ნოტების რა წილი იმღერე სწორად — ეს შენი ქულაა. სამი რაუნდი, სამი საგალობელი, ქულები ჯამდება.',
  online: 'ონლაინ: წამყვანი ოთახს ხსნის და კლასს იწვევს, თვითონ არ მღერის. ყველა თავის ტელეფონზე უსმენს და მღერის — სახლიდანაც; შედეგს თვითონ აგზავნის, გაგზავნამდე თავიდან ცდაც შეიძლება.',
  hybrid: 'ჰიბრიდული: ერთი ტელეფონი ხელიდან ხელში გადადის. მომღერალი ფრაზას უსმენს და ტელეფონში მღერის, ტელეფონი შედეგს ინახავს და მას შემდეგს გადასცემს. როცა ყველამ იმღერა, რაუნდის ცხრილი ჩანს.',
  draw: (count, program) => drawTurniri(knownChants(program), count, readSeen()),
  remember: (rounds: RoundQ[]) => {
    const ids = rounds.filter((r): r is TurniriQ => r.kind === 'turniri').map(r => r.id);
    try { localStorage.setItem(SEEN, JSON.stringify(rememberChants(readSeen(), ids))); } catch { /* private mode */ }
  },
  askHost: 'მოთამაშეები თავის ტელეფონზე მღერიან.',
  askPlayer: 'მოისმინე და იმღერე.',
  askTeams: 'ტელეფონი გადაეცი მომღერალს.',
  clipSeconds: 20,
  fixedRounds: TURNIRI_ROUNDS,
  turns: true,
  sides: { many: 'მომღერლები', one: 'მომღერალი' },
  Ask,
  Pick: ({ q, onPick }) => <Sing q={q} onScore={onPick} />,
  pickName: (_, pick) => `${pick}%`,
  confirm: (_, pick) => (pick === null ? 'ჯერ იმღერე' : `გაგზავნა · ${pick}%`),
  Reveal,
  Answer,
  verdict: (_, pick) => {
    if (pick === null) return { tone: 'none', text: 'ამ რაუნდში არ იმღერე' };
    if (pick >= 80) return { tone: 'right', text: `ბრწყინვალედ! ${pick}%` };
    if (pick >= 50) return { tone: 'near', text: `კარგია! ${pick}%` };
    return { tone: 'wrong', text: `${pick}% — შემდეგ ჯერზე უკეთ` };
  },
  marks: [],
  empty: 'საგალობლები ვერ მოიძებნა.',
  callHint: 'ზარში ერთმანეთს ხედავთ და გესმით. სიმღერისას ზარის ხმა დაუწიე, რომ ტელეფონმა მხოლოდ შენი ხმა გაიგოს.',
};
