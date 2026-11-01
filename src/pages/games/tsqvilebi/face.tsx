import React, { useEffect, useRef, useState } from 'react';
import { Check, Grid2x2Check, Trophy } from 'lucide-react';
import { tsqGroups } from '../../../data/tsqvilebiPool';
import {
  TSQ_MARKS, decodeResult, drawTsqvilebi, encodeResult, isClear, newBoard, type TsqBoard, type TsqvilebiQ,
} from '../../../utils/tsqvilebi';
import type { PublicQ } from '../../../utils/roundGames';
import { openQ, type RoundFace } from '../rounds/face';
import { Board, useBoardPlay } from './Board';
import { PairsList } from './Pairs';
import { TsqvilebiOptions } from './Options';
import { modes, readSeen, rememberAsked, sizes, whats } from './store';

// „ხმის წყვილები“ (2026-11-01, the plan's №3, like Memory) over the quick games' screens: a class's room plays three boards,
// the same board on every phone against the clock; each player turns its cards on their own phone, the sounds sound there.
// A cleared board goes in by itself, else the pairs found so far go in as the time runs out (`autoSend`, `sendLate`). Alone
// and the teams on one phone are Solo.tsx and Teams.tsx; the rules utils/tsqvilebi.ts.

const q$ = (q: PublicQ) => openQ<TsqvilebiQ>(q);
const whole = (q: PublicQ) => q$(q).items?.length ?? 0;

/** how a pair goes, in a line */
export const modeLine = (mode: TsqvilebiQ['mode'] | undefined) => (mode === 'same'
  ? 'იპოვე ორი ბარათი, რომლებიც ერთსა და იმავეს უკრავს.'
  : 'იპოვე ხმა და მისი სახელი: ჯერ მოუსმინე, მერე სახელიანი ბარათი მოძებნე.');

/** the board's count of pairs and moves, over it */
export const BoardLine: React.FC<{ board: TsqBoard; pairs: number; children?: React.ReactNode }> = ({ board, pairs, children }) => (
  <div className="flex items-center justify-between gap-3 text-[13px] font-bold tabular-nums">
    <span className="text-[#2f7d4f]">წყვილი {board.pairs} / {pairs}</span>
    {children}
    <span className="text-[#a0703c]">სვლა {board.moves}</span>
  </div>
);

const Ask: NonNullable<RoundFace['Ask']> = ({ q, who }) => {
  const o = q$(q);
  if (!o.items) return null;
  return (
    <p className="flex items-start gap-2 rounded-2xl bg-[#7a2028]/[0.06] px-3.5 py-2.5 text-[13.5px] font-bold leading-snug text-[#4a3426]">
      <Grid2x2Check className="w-4.5 h-4.5 shrink-0 mt-px text-[#7a2028]" />
      {who === 'player' ? modeLine(o.mode) : `${o.items.length * 2} ბარათი · ${o.mode === 'same' ? 'ორი ერთნაირი ხმა' : 'ხმა და სახელი'}. მოთამაშეები დაფას თავის ტელეფონზე ხსნიან.`}
    </p>
  );
};

const Playing: React.FC<{ q: TsqvilebiQ; onPick: (p: number | null) => void }> = ({ q, onPick }) => {
  const [board, setBoard] = useState(() => newBoard(q.cards.length));
  const play = useBoardPlay({ items: q.items, cards: q.cards, mode: q.mode, board, apply: b => setBoard(b) });
  const sent = useRef<number | null>(null);
  useEffect(() => {
    const p = board.pairs > 0 ? encodeResult(board.pairs, board.moves) : null;
    if (p !== sent.current) { sent.current = p; onPick(p); }
  }, [board.pairs, board.moves, onPick]);
  return (
    <div className="space-y-2.5">
      <BoardLine board={board} pairs={q.items.length} />
      <Board items={q.items} cards={q.cards} mode={q.mode} board={board} play={play} />
      {isClear(board) && <p className="text-center text-[14px] font-bold text-[#2f7d4f]" role="status">მთელი დაფა! პასუხი იგზავნება…</p>}
    </div>
  );
};

const Pick: RoundFace['Pick'] = ({ q, onPick }) => {
  const o = q$(q);
  if (!o.items || !o.cards || !o.mode) return null;
  return <Playing key={o.id} q={o as TsqvilebiQ} onPick={onPick} />;
};

const Answer: RoundFace['Answer'] = ({ q }) => {
  const o = q$(q);
  return o.items ? <PairsList items={o.items} /> : null;
};

/** online: how many cleared the board, the fewest moves; mine */
const Reveal: RoundFace['Reveal'] = ({ q, picks, mine }) => {
  const all = whole(q);
  if (!all) return null;
  const results = (picks ?? []).flatMap(p => (p === null ? [] : [decodeResult(p)]));
  const cleared = results.filter(r => r.pairs === all);
  const fewest = cleared.length ? Math.min(...cleared.map(r => r.moves)) : null;
  const my = mine === undefined || mine === null ? null : decodeResult(mine);
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5 space-y-2">
      {picks && (
        <p className="flex items-center gap-2 text-[14.5px] font-bold text-[#24603d]"><Check className="w-5 h-5 shrink-0" />მთელი დაფა: {cleared.length} / {picks.length}</p>
      )}
      {fewest !== null && <p className="flex items-center gap-2 text-[14px] font-bold text-[#8a6d12]"><Trophy className="w-4.5 h-4.5 shrink-0" />ყველაზე ცოტა სვლა: {fewest}</p>}
      {my && <p className="text-[13.5px] font-bold text-[#4a3426]">შენ: {my.pairs} / {all} წყვილი · {my.moves} სვლა</p>}
    </section>
  );
};

export const TSQ_FACE: RoundFace = {
  game: 'tsqvilebi',
  title: 'ხმის წყვილები',
  Icon: Grid2x2Check,
  intro: 'ბარათები პირქვე აწყვია. ზოგი ხმას მალავს — ცნობილი საგალობლის ან ხალხური სიმღერის დასაწყისს, — ზოგი მის სახელს. ორ ბარათს ხსნი: თუ ხმა და მისი სახელია, წყვილი შენია, თუ არა — ბარათები ისევ იხურება. დაიმახსოვრე, სად რა იყო! ადვილი ვარიანტი: ორი ერთნაირი ხმა.',
  online: 'ონლაინ: წამყვანი ოთახს ხსნის და კლასს იწვევს, თვითონ არ თამაშობს. სამი დაფაა, ყველას ერთი და იგივე, თავის ტელეფონზე — დროზე. ყოველი წყვილი 100 ქულაა; ვინც მთელ დაფას გაასუფთავებს, 600-მდე ქულას იღებს დამატებით — მით მეტს, რაც ნაკლები სვლით.',
  hybrid: 'ჰიბრიდული: ერთი ტელეფონი მაგიდაზე, 2–6 გუნდი რიგრიგობით ხსნის ორ-ორ ბარათს. ვინც წყვილს იპოვის, კიდევ ხსნის; ვერა — და ჯერი შემდეგ გუნდზეა. ბოლოს ყველაზე მეტი წყვილის გუნდი იგებს.',
  draw: count => drawTsqvilebi({ groups: tsqGroups(whats.read()), count, pairs: sizes.read() / 2, mode: modes.read(), seen: readSeen() }),
  remember: rounds => rememberAsked([...new Set(rounds.flatMap(r => (r.kind === 'tsqvilebi' ? r.items.map(it => it.id) : [])))]),
  askHost: 'მოთამაშეები დაფას თავის ტელეფონზე ხსნიან.',
  askPlayer: 'იპოვე წყვილები.',
  askTeams: 'იპოვეთ წყვილები.',
  clipSeconds: 6,
  fixedRounds: 3,
  autoSend: (q, pick) => decodeResult(pick).pairs >= whole(q),
  sendLate: true,
  Ask,
  Options: TsqvilebiOptions,
  Pick,
  pickName: (q, pick) => { const r = decodeResult(pick); return `${r.pairs} / ${whole(q)} წყვილი · ${r.moves} სვლა`; },
  confirm: (q, pick) => (pick === null ? 'იპოვე ერთი წყვილი მაინც' : `გაგზავნა · ${decodeResult(pick).pairs} / ${whole(q)} წყვილი`),
  Reveal,
  Answer,
  verdict: (q, pick) => {
    if (pick === null) return { tone: 'none', text: 'წყვილი ვერ იპოვე' };
    const r = decodeResult(pick);
    if (r.pairs >= whole(q)) return { tone: 'right', text: `მთელი დაფა ${r.moves} სვლით!` };
    return { tone: 'near', text: `${r.pairs} / ${whole(q)} წყვილი` };
  },
  marks: TSQ_MARKS,
  empty: 'ხმები ვერ მოიძებნა.',
  callHint: 'ზარში ერთმანეთს ხედავთ და გესმით. დაფის დროს მიკროფონი გამორთეთ — ბარათები ყველას თავის ტელეფონზე ჟღერს.',
};
