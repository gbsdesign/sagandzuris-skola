import React from 'react';
import { Check, Crown } from 'lucide-react';
import { ACTS, ROLES, waitingOn, type Claim, type KariGame, type Line, type Phase, type Role } from '../../../utils/mepisKari';
import type { PubPhase } from '../../../utils/kariRoom';
import { ACT_DOES, CoinCount, MiniCard } from './look';

// The court on screen, online and on one phone alike: a tile a player — coins, the cards face down and turned, what they do
// now — and the story of the step on now (who claims what, who is to answer).

export interface Board {
  names: string[];
  coins: number[];
  cards: number[];
  shown: Role[][];
  turn: number;
  n: number;
  claim: Claim | null;
  phase: PubPhase | Phase;
  waiting: number[];
  log: Line[];
}
export const boardOfGame = (g: KariGame): Board => ({
  names: g.players.map(p => p.name),
  coins: g.players.map(p => p.coins),
  cards: g.players.map(p => p.hand.length),
  shown: g.players.map(p => p.shown),
  turn: g.turn,
  n: g.n,
  claim: g.claim,
  phase: g.phase,
  waiting: waitingOn(g),
  log: g.log,
});

const passedOf = (b: Board) => (b.phase.k === 'doubt' || b.phase.k === 'block' ? b.phase.passed : []);

/** a tile's word for what its player does now */
const statusOf = (b: Board, i: number): { text: string; tone: string } | null => {
  const ph = b.phase, c = b.claim;
  if (!b.cards[i]) return { text: 'კარი დატოვა', tone: 'text-[#9a8b7b]' };
  if (ph.k === 'end') return ph.winner === i ? { text: 'გაიმარჯვა', tone: 'text-[#8a5a1c]' } : null;
  if (ph.k === 'lose' && ph.who === i) return { text: 'კარგავს გავლენას', tone: 'text-[#7a2028]' };
  if (c?.block?.by === i) return { text: `ბლოკავს · ${ROLES[c.block.role].name}`, tone: 'text-[#2b5f8a]' };
  if (b.waiting.includes(i)) return { text: 'ფიქრობს…', tone: 'text-[#9a6a10]' };
  if (passedOf(b).includes(i)) return { text: 'გაუშვა', tone: 'text-[#24603d]' };
  if (c && c.target === i) return { text: 'სამიზნე', tone: 'text-[#7a2028]' };
  if (i === b.turn) return { text: ph.k === 'turn' ? 'სვლაა' : c ? ACTS[c.act].name : 'სვლაა', tone: 'text-[#8a5a1c]' };
  return null;
};

export const Court: React.FC<{
  b: Board; me: number;
  /** choosing a target: who may be chosen, the one chosen */
  pick?: { can: (i: number) => boolean; on: (i: number) => void; chosen: number };
}> = ({ b, me, pick }) => (
  <ul className={`grid gap-2 ${b.names.length > 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
    {b.names.map((name, i) => {
      const out = !b.cards[i];
      const st = statusOf(b, i);
      const turn = i === b.turn && b.phase.k !== 'end';
      const can = !!pick?.can(i);
      const chosen = pick?.chosen === i;
      const face = (
        <>
          <span className="flex items-start justify-between gap-1.5">
            <span className={`min-w-0 text-[14px] font-bold leading-tight [overflow-wrap:anywhere] ${out ? 'text-[#9a8b7b] line-through' : 'text-[#4a3426]'}`}>
              {name}{i === me && <span className="block text-[12px] font-bold text-[#a0703c]">შენ</span>}
            </span>
            {!out && <CoinCount n={b.coins[i]} />}
          </span>
          <span className="mt-1.5 flex items-center gap-1.5">
            {Array.from({ length: b.cards[i] }, (_, k) => <MiniCard key={`d${k}`} role={null} />)}
            {b.shown[i].map((r, k) => <MiniCard key={`s${k}`} role={r} />)}
            {st && <span className={`ml-1 min-w-0 text-[12px] font-bold leading-tight ${st.tone}`}>{st.text === 'გაუშვა' && <Check className="inline w-3.5 h-3.5 -mt-0.5 mr-0.5" />}{st.text === 'გაიმარჯვა' && <Crown className="inline w-3.5 h-3.5 -mt-0.5 mr-0.5" />}{st.text}</span>}
          </span>
        </>
      );
      const ring = chosen ? 'ring-[3px] ring-[#7a2028] bg-[#7a2028]/[0.05]' : turn ? 'ring-2 ring-[#e2c27a] bg-[#fffaf0]' : 'ring-1 ring-[#e8dcc8] bg-white';
      return (
        <li key={i} className="min-w-0">
          {pick ? (
            <button
              type="button"
              disabled={!can}
              onClick={() => pick.on(i)}
              aria-pressed={chosen}
              className={`w-full min-h-[72px] rounded-2xl px-3 py-2.5 text-left transition cursor-pointer disabled:cursor-default disabled:opacity-45 ${ring} ${can && !chosen ? 'hover:ring-[#7a2028]/50' : ''}`}
            >{face}</button>
          ) : <div className={`min-h-[72px] rounded-2xl px-3 py-2.5 ${ring} ${out ? 'opacity-70' : ''}`}>{face}</div>}
        </li>
      );
    })}
  </ul>
);

/** the story of the step on now: its headline, a line under it, and the question it waits on */
export const storyOf = (b: Board, me: number): { head: React.ReactNode; sub?: React.ReactNode; ask?: React.ReactNode } => {
  const nm = (i: number) => <b className="font-bold">{i === me ? 'შენ' : b.names[i]}</b>;
  /** a name and its verb: „ნინო ბლოკავს“, „შენ ბლოკავ“ */
  const says = (i: number, third: string, second: string) => <>{nm(i)} {i === me ? second : third}</>;
  const ph = b.phase, c = b.claim;
  const what = c && (
    <>{ACTS[c.act].name} · {ACT_DOES[c.act]}{c.target >= 0 && <> → {nm(c.target)}</>}</>
  );
  switch (ph.k) {
    case 'turn': return b.turn === me ? { head: 'შენი სვლაა', sub: 'აირჩიე მოქმედება — ბარათი შეიძლება არც გყავდეს.' } : { head: <>{nm(b.turn)} ფიქრობს სვლაზე</> };
    case 'doubt': {
      if (!c) return { head: '' };
      if (ph.on === 'block' && c.block) {
        return { head: <>{says(c.block.by, 'ბლოკავს', 'ბლოკავ')}: {ROLES[c.block.role].name}</>, sub: <>{nm(c.by)}: {ACTS[c.act].name}</>, ask: 'ვინმეს ეჭვი ეპარება?' };
      }
      const role = ACTS[c.act].claim;
      return { head: <>{says(c.by, 'აცხადებს', 'აცხადებ')}: {role >= 0 ? ROLES[role as Role].name : ACTS[c.act].name}</>, sub: what, ask: 'ვინმეს ეჭვი ეპარება?' };
    }
    case 'proof': {
      if (!c) return { head: '' };
      const claimer = ph.on === 'act' ? c.by : c.block!.by;
      const role = ph.on === 'act' ? (ACTS[c.act].claim as Role) : c.block!.role;
      return { head: <>{nm(ph.by)}: „არ მჯერა!“</>, sub: <>{nm(claimer)} აჩვენებს {ROLES[role].dat}?</> };
    }
    case 'block': {
      if (!c) return { head: '' };
      const a = ACTS[c.act];
      return {
        head: <>{nm(c.by)}: {a.name}{c.target >= 0 && <> → {nm(c.target)}</>}</>,
        sub: ACT_DOES[c.act],
        ask: a.anyone ? <>დაბლოკავს ვინმე? ({ROLES[a.blockers[0]].name})</> : <>{says(c.target, 'დაბლოკავს', 'დაბლოკავ')}? ({a.blockers.map(r => ROLES[r].name).join(' ან ')})</>,
      };
    }
    case 'lose':
      return { head: <>{says(ph.who, 'კარგავს', 'კარგავ')} გავლენას</>, sub: ph.who === me ? 'აირჩიე, რომელ ბარათს გადააბრუნებ.' : 'ირჩევს, რომელი ბარათი გადააბრუნოს.' };
    case 'swap':
      return { head: <>{says(b.turn, 'ცვლის', 'ცვლი')} ბარათებს</>, sub: b.turn === me ? 'აირჩიე, რომლებს დაიტოვებ — დანარჩენი დასტაში ბრუნდება.' : 'იღებს 2 ბარათს დასტიდან და 2-ს აბრუნებს.' };
    case 'end':
      return { head: <>{says(ph.winner, 'იმარჯვებს!', 'გაიმარჯვე!')}</>, sub: 'მეფის მარჯვენა ხელი — ბოლო, ვინც კარზე დარჩა.' };
  }
};

/** the story's card, with the step's clock on its right */
export const Story: React.FC<{ b: Board; me: number; clock?: React.ReactNode; children?: React.ReactNode }> = ({ b, me, clock, children }) => {
  const s = storyOf(b, me);
  return (
    <section className="rounded-3xl bg-gradient-to-br from-[#7a2028] to-[#5e1820] text-[#fbf6ec] px-4 py-3.5 shadow-[0_14px_30px_-20px_rgba(122,32,40,0.9)]" aria-live="polite">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold text-[#f0d9a8]">სვლა {b.n}</p>
          <p className="mt-0.5 font-serif-ge text-[19px] font-bold leading-snug [overflow-wrap:anywhere]">{s.head}</p>
          {s.sub && <p className="mt-1 text-[13px] leading-snug text-[#fbf6ec]/85">{s.sub}</p>}
          {s.ask && <p className="mt-1.5 text-[13.5px] font-bold leading-snug text-[#f0d9a8]">{s.ask}</p>}
        </div>
        {clock}
      </div>
      {children}
    </section>
  );
};
