import React, { useEffect, useMemo, useState } from 'react';
import { Check, Crown, Handshake, LogOut, RotateCcw, Scale } from 'lucide-react';
import { CARDS, KINDS, type TKind } from '../../../data/takhtiCards';
import {
  CAPITALS, ROUNDS, chooserOf, dividerOf, isEnvoy, keyOf, scoreOf, shareOf, validSplit, type TScore, type TakhtiGame,
} from '../../../utils/oriTakhti';
import { TableScreen } from '../../../components/games/TableScreen';
import { Btn } from '../../../components/ui/kit';
import { triggerHaptic } from '../../../utils/haptics';
import { useTwoCols } from '../../../components/games/useTwoCols';
import { CardChip, CardTile, ThroneMark } from './look';
import { IN_CAPITAL, KIND_INFO, SIDE_COLOR, lineText } from './words';

// „ორი ტახტი“ being played, online and on one phone alike: the story of the meeting (who divides, who chooses), the five gifts
// (the divider taps a card to move it into the other share; the chooser taps a share; an envoy's king taps the card to take),
// what each share would give each king if the courts were counted now, the two courts kind by kind, the chronicle; at the end
// the count and the throne's city.

export interface TakhtiActs {
  /** a move of the king on turn as one number (`applyPick`); missing: not mine to move now */
  pick?: (n: number) => void;
  again?: () => void;
  close?: () => void;
  leave?: () => void;
}

/** what each king's points would grow by if `ch` took `mine` and the other `rest` (the envoys not counted) */
const gainsIf = (courts: number[][], ch: number, mine: number[], rest: number[]) => {
  const before = [scoreOf(courts, 0).total, scoreOf(courts, 1).total];
  const after = courts.map(c => c.slice());
  after[ch].push(...mine);
  after[1 - ch].push(...rest);
  return [0, 1].map(i => scoreOf(after, i).total - before[i]);
};
const plus = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

const Title: React.FC<{ children: React.ReactNode; right?: React.ReactNode }> = ({ children, right }) => (
  <div className="flex items-baseline justify-between gap-2">
    <p className="text-[13.5px] font-bold text-[#4a3426]">{children}</p>
    {right !== undefined && <span className="text-[12.5px] font-bold text-[#75685a] tabular-nums">{right}</span>}
  </div>
);

/** a share of the meeting: its cards and what it would give each king */
const ShareBox: React.FC<{
  label: string;
  cards: number[];
  /** what the share gives, as „name +n“ pairs */
  worth?: { side: number; name: string; n: number }[];
  on?: boolean;
  onPick?: () => void;
  card?: { sel: number | null; onCard: (id: number) => void; can?: (id: number) => boolean; hint: string };
  empty: string;
  /** no envoy line (while the envoys already take) */
  quiet?: boolean;
}> = ({ label, cards, worth, on, onPick, card, empty, quiet }) => {
  const envoys = quiet ? 0 : cards.filter(isEnvoy).length;
  const inner = (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[13px] font-bold text-[#4a3426]">{label}</p>
        {worth && (
          <p className="flex flex-wrap justify-end gap-x-2.5 text-[12.5px] font-bold tabular-nums">
            {worth.map(w => <span key={w.side} style={{ color: SIDE_COLOR[w.side] }}>{w.name} {plus(w.n)}</span>)}
          </p>
        )}
      </div>
      {cards.length ? (
        <div className="mt-2 grid grid-cols-1 min-[360px]:grid-cols-2 gap-1.5">
          {cards.map(id => {
            const can = card ? (card.can ? card.can(id) : true) : false;
            return (
              <CardTile
                key={id}
                id={id}
                on={card?.sel === id}
                dim={!!card && !can}
                hint={card?.hint}
                onClick={card && can ? () => { triggerHaptic(6); card.onCard(id); } : undefined}
              />
            );
          })}
        </div>
      ) : <p className="mt-2 rounded-xl border border-dashed border-[#d8c9ad] px-3 py-4 text-center text-[12.5px] text-[#9a8b7b]">{empty}</p>}
      {envoys > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-[12.5px] font-bold leading-snug text-[#8a5a12]">
          <Handshake className="w-4 h-4 shrink-0" />{envoys > 1 ? `${envoys} ელჩი: მეორე წილიდან ${envoys} ბარათს გადმოიბირებს` : 'ელჩი: მეორე წილიდან ერთ ბარათს გადმოიბირებს'}
        </p>
      )}
    </>
  );
  const cls = `rounded-2xl px-3 py-2.5 ring-1 transition ${on ? 'bg-[#e2c27a]/[0.22] ring-2 ring-[#c9a24b]' : 'bg-white ring-[#e8dcc8]'}`;
  if (!onPick) return <section className={cls}>{inner}</section>;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={on}
      onClick={() => { triggerHaptic(8); onPick(); }}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(); } }}
      className={`${cls} block w-full text-left cursor-pointer hover:ring-[#c9a24b]/70`}
    >
      {inner}
    </div>
  );
};

const ROW_POINTS = (k: TKind, s: TScore) =>
  k === 'tsikhe' ? `${s.castle} ქულა`
    : k === 'lashkari' ? `ძალა ${s.strength} · ${s.army} ქულა`
      : k === 'ghvino' ? `${s.pairs} ღვინო · ${s.wine} ქულა`
        : k === 'tsigni' ? `${s.books} × ${s.perBook} = ${s.bookPts} ქულა`
          : '0 ქულა';

/** a king's court kind by kind, with its count now */
const Court: React.FC<{ g: TakhtiGame; side: number; me: number; active: boolean }> = ({ g, side, me, active }) => {
  const s = scoreOf(g.courts, side);
  const court = g.courts[side];
  return (
    <section className={`rounded-2xl px-3.5 py-3 ring-1 ${active ? 'bg-white ring-2' : 'bg-white ring-[#e8dcc8]'}`} style={active ? { boxShadow: `0 0 0 2px ${SIDE_COLOR[side]}` } : undefined}>
      <div className="flex items-center gap-2.5">
        <ThroneMark side={side} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-tight text-[#2b1e14] truncate">{side === me ? 'შენ' : g.names[side]}</p>
          <p className="text-[12px] font-bold leading-tight" style={{ color: SIDE_COLOR[side] }}>{CAPITALS[side]}</p>
        </div>
        <p className="shrink-0 text-right">
          <span className="block text-[22px] font-black leading-none tabular-nums text-[#2b1e14]">{s.total}</span>
          <span className="block mt-0.5 text-[11.5px] font-bold text-[#75685a]">ქულა</span>
        </p>
      </div>
      {court.length ? (
        <div className="mt-2.5 space-y-2">
          {KINDS.map(k => {
            const ids = court.filter(id => CARDS[id].k === k);
            if (!ids.length) return null;
            return (
              <div key={k}>
                <p className="flex items-baseline justify-between gap-2 text-[12.5px] font-bold">
                  <span style={{ color: KIND_INFO[k].color }}>{KIND_INFO[k].name}</span>
                  <span className="tabular-nums text-[#4a3426]">{ROW_POINTS(k, s)}</span>
                </p>
                <div className="mt-1 flex flex-wrap gap-1">{ids.map(id => <CardChip key={id} id={id} />)}</div>
              </div>
            );
          })}
        </div>
      ) : <p className="mt-2 text-[12.5px] text-[#9a8b7b]">კარი ჯერ ცარიელია.</p>}
    </section>
  );
};

export const TakhtiPlay: React.FC<{
  g: TakhtiGame;
  /** my throne online (0 west, 1 east; −1: I watch); on one phone −1 */
  me: number;
  one?: boolean;
  /** my move is on its way to the host */
  sent?: boolean;
  clock?: React.ReactNode;
  acts: TakhtiActs;
  right?: React.ReactNode;
  /** under the story: a watcher's line, the host's room button */
  note?: React.ReactNode;
  onHide: () => void;
}> = ({ g, me, one, sent, clock, acts, right, note, onHide }) => {
  const ph = g.phase;
  const wide = useTwoCols();
  const key = keyOf(g);
  const [mask, setMask] = useState(0);
  const [share, setShare] = useState<number | null>(null);
  const [card, setCard] = useState<number | null>(null);
  useEffect(() => { setMask(0); setShare(null); setCard(null); }, [key]);
  const actor = g.turn;
  const mine = ph.k !== 'end' && !!acts.pick && !sent && (!!one || me === actor);
  const nm = (i: number) => (i === me ? 'შენ' : g.names[i]);
  const dv = dividerOf(g), ch = chooserOf(g);
  const send = (n: number) => { if (!acts.pick) return; triggerHaptic(15); acts.pick(n); };
  const result = useMemo(() => (ph.k === 'end' ? [scoreOf(g.courts, 0), scoreOf(g.courts, 1)] : null), [g.courts, ph.k]);

  // ---------- the story ----------
  const lastLine = g.log[g.log.length - 1];
  const last = lastLine ? lineText(lastLine, g.names, me) : '';
  let head: React.ReactNode = '', sub: React.ReactNode = null;
  if (ph.k === 'split') {
    head = mine ? (one ? `ყოფს: ${g.names[dv]}` : 'შენ ყოფ ძღვენს') : `${g.names[dv]} ყოფს ძღვენს…`;
    sub = mine
      ? `შეეხე ბარათს — ის მეორე წილში გადავა. ${one ? g.names[ch] : nm(ch)} წილს აირჩევს, დანარჩენი გამყოფს დარჩება.`
      : last || 'ხუთი ძღვენი ორ წილად იყოფა: ერთი ყოფს, მეორე ირჩევს.';
  } else if (ph.k === 'choose') {
    head = mine ? (one ? `ირჩევს: ${g.names[ch]}` : 'აირჩიე წილი') : `${g.names[ch]} ირჩევს წილს…`;
    sub = mine ? 'შეეხე წილს, რომელიც გინდა. მეორე წილი გამყოფს დარჩება.' : last;
  } else if (ph.k === 'steal') {
    head = mine ? (one ? `ელჩი: ${g.names[actor]}` : 'შენი ელჩი') : `${g.names[actor]} ელჩით იბირებს…`;
    sub = mine
      ? `მეორე წილიდან ერთი ბარათი აირჩიე — ელჩი მას შენს კარზე გადმოიბირებს (ელჩს ვერ წაიყვანს).${ph.n > 1 ? ` კიდევ ${ph.n} ბარათი.` : ''}`
      : last;
  } else if (result) {
    const w = ph.winners;
    head = w.length > 1 ? 'ტოლია — ორი ტახტი ერთად დგას!' : `ტახტი ${IN_CAPITAL[w[0]]} დადგა!`;
    sub = w.length > 1 ? 'ქულა, ლაშქარიც და ციხეებიც ტოლია.' : `${w[0] === me ? 'შენ გაიმარჯვე' : `${g.names[w[0]]} იმარჯვებს`} — ერთიანი საქართველოს დედაქალაქი ${CAPITALS[w[0]]} ხდება.`;
  }
  const dots = (
    <span className="flex items-center gap-1" aria-hidden>
      {Array.from({ length: ROUNDS }, (_, r) => (
        <span key={r} className={`h-2 w-2 rounded-full ${r < g.round ? 'bg-[#e2c27a]' : r === g.round ? 'bg-[#fbf6ec]' : 'bg-[#fbf6ec]/25'}`} />
      ))}
    </span>
  );
  const story = (
    <section className="rounded-3xl text-[#fbf6ec] px-4 py-3.5 shadow-[0_14px_30px_-20px_rgba(43,30,20,0.9)] bg-gradient-to-br from-[#3b2a1c] to-[#2b1e14]" aria-live="polite">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-bold text-[#e2c27a]">
            <Scale className="w-3.5 h-3.5 shrink-0" />
            {ph.k === 'end' ? 'რვა შეხვედრა დასრულდა' : `შეხვედრა ${g.round + 1} / ${ROUNDS}`}
            {ph.k !== 'end' && dots}
          </p>
          <p className="mt-0.5 flex items-center gap-2 font-serif-ge text-[19px] font-bold leading-snug [overflow-wrap:anywhere]">
            {ph.k !== 'end' ? <ThroneMark side={actor} size={26} /> : ph.winners.length === 1 && <ThroneMark side={ph.winners[0]} size={26} />}
            <span className="min-w-0">{head}</span>
          </p>
          {sub && <p className="mt-1 text-[13px] leading-snug text-[#fbf6ec]/85">{sub}</p>}
        </div>
        {clock}
      </div>
    </section>
  );

  // ---------- the meeting ----------
  let meeting: React.ReactNode = null;
  if (ph.k === 'split') {
    if (mine) {
      const a = shareOf(g.offer, mask, 0), b = shareOf(g.offer, mask, 1);
      const worth = (s: number) => {
        const mineS = s === 0 ? a : b, rest = s === 0 ? b : a;
        const gc = gainsIf(g.courts, ch, mineS, rest);
        const gd = gainsIf(g.courts, ch, rest, mineS);
        return [{ side: ch, name: nm(ch), n: gc[ch] }, { side: dv, name: one ? g.names[dv] : nm(dv), n: gd[dv] }];
      };
      const flip = (id: number) => { const i = g.offer.indexOf(id); if (i >= 0) setMask(m => m ^ (1 << i)); };
      meeting = (
        <section className="space-y-2">
          <Title right="ახლა რომ დაითვალოს">გაყოფა</Title>
          <ShareBox label="პირველი წილი" cards={a} worth={worth(0)} card={{ sel: null, onCard: flip, hint: 'მეორე წილში გადატანა' }} empty="ცარიელია — აქ ერთი ბარათი მაინც დატოვე" />
          <ShareBox label="მეორე წილი" cards={b} worth={worth(1)} card={{ sel: null, onCard: flip, hint: 'პირველ წილში დაბრუნება' }} empty="შეეხე ზემოთ ბარათს — აქ გადმოვა" />
        </section>
      );
    } else {
      meeting = (
        <section className="space-y-2">
          <Title>ძღვენი</Title>
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-1.5">{g.offer.map(id => <CardTile key={id} id={id} />)}</div>
        </section>
      );
    }
  } else if (ph.k === 'choose') {
    const a = shareOf(g.offer, g.split, 0), b = shareOf(g.offer, g.split, 1);
    const worth = (s: number) => {
      const gs = gainsIf(g.courts, ch, s === 0 ? a : b, s === 0 ? b : a);
      return [{ side: ch, name: one ? g.names[ch] : nm(ch), n: gs[ch] }, { side: dv, name: nm(dv), n: gs[dv] }];
    };
    meeting = (
      <section className="space-y-2">
        <Title right="ახლა რომ დაითვალოს">{mine ? 'რომელ წილს აიღებ?' : 'ორი წილი'}</Title>
        {[a, b].map((cards, s) => (
          <ShareBox key={s} label={s === 0 ? 'პირველი წილი' : 'მეორე წილი'} cards={cards} worth={worth(s)} on={share === s} onPick={mine ? () => setShare(s) : undefined} empty="" />
        ))}
      </section>
    );
  } else if (ph.k === 'steal') {
    const other = 1 - actor;
    meeting = (
      <section className="space-y-2">
        <Title>{mine ? 'რომელ ბარათს გადმოიბირებს ელჩი?' : 'ელჩი იბირებს'}</Title>
        <ShareBox
          label={`${one ? g.names[other] : nm(other)} — მისი წილი`}
          cards={g.take[other]}
          card={mine ? { sel: card, onCard: id => setCard(c => (c === id ? null : id)), can: id => !isEnvoy(id), hint: 'ელჩი გადმოიბირებს' } : undefined}
          empty="აღარაფერი დარჩა"
          quiet
        />
        <ShareBox label={`${one ? g.names[actor] : nm(actor)} — ${actor === me ? 'შენი' : 'მისი'} წილი`} cards={g.take[actor]} empty="" quiet />
        {ph.next > 0 && (
          <p className="flex items-center gap-1.5 px-1 text-[12.5px] font-bold leading-snug text-[#8a5a12]">
            <Handshake className="w-4 h-4 shrink-0" />
            {ph.next > 1 ? `მერე გამყოფის ${ph.next} ელჩიც ${ph.next} ბარათს გადმოიბირებს.` : 'მერე გამყოფის ელჩიც ერთ ბარათს გადმოიბირებს.'}
          </p>
        )}
      </section>
    );
  }

  // ---------- the end ----------
  const results = result && ph.k === 'end' && (
    <section className="space-y-2">
      <Title>დათვლა</Title>
      <div className={`grid gap-2 ${wide ? '' : 'sm:grid-cols-2'}`}>
        {[0, 1].map(i => {
          const r = result[i], won = ph.winners.length === 1 && ph.winners[0] === i;
          return (
            <div key={i} className={`rounded-2xl px-3.5 py-3 ring-1 ${won ? 'bg-[#e2c27a]/[0.18] ring-[#c9a24b]' : 'bg-white ring-[#e8dcc8]'}`}>
              <p className="flex items-center gap-2.5">
                <ThroneMark side={i} size={32} />
                <span className="min-w-0 flex-1 text-[15px] font-bold text-[#2b1e14] truncate">{nm(i)}</span>
                {won && <Crown className="w-5 h-5 shrink-0 text-[#a67c2e]" />}
                <span className="shrink-0 text-[22px] font-black tabular-nums text-[#2b1e14]">{r.total}</span>
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[12.5px] text-[#4a3426]">
                <div className="flex justify-between gap-2"><dt>ციხეები</dt><dd className="font-bold tabular-nums">{r.castle}</dd></div>
                <div className="flex justify-between gap-2"><dt>ლაშქარი ({r.strength})</dt><dd className="font-bold tabular-nums">{r.army}</dd></div>
                <div className="flex justify-between gap-2"><dt>ღვინო ({r.pairs})</dt><dd className="font-bold tabular-nums">{r.wine}</dd></div>
                <div className="flex justify-between gap-2"><dt>წიგნები ({r.books}×{r.perBook})</dt><dd className="font-bold tabular-nums">{r.bookPts}</dd></div>
              </dl>
            </div>
          );
        })}
      </div>
      <p className="text-[12px] leading-snug text-[#9a8b7b]">ტოლობისას იგებს უფრო ძლიერი ლაშქარი, მერე — ციხეების მეტი ქულა. ორი ბარათი ყუთში დარჩა და არ გამოჩენილა.</p>
    </section>
  );

  const courts = (
    <section className="space-y-2">
      <Title>ორი კარი</Title>
      <div className={`grid gap-2 ${wide ? '' : 'sm:grid-cols-2'}`}>
        {[0, 1].map(i => <Court key={i} g={g} side={i} me={me} active={ph.k !== 'end' && i === actor} />)}
      </div>
    </section>
  );
  const chronicle = g.log.length > 0 && (
    <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3.5 py-3">
      <p className="text-[12.5px] font-bold text-[#75685a]">მატიანე</p>
      <ul className="mt-1 space-y-1">
        {g.log.slice(-6).reverse().map((l, i) => (
          <li key={`${g.step}-${i}`} className="flex items-start gap-1.5 text-[12.5px] leading-snug text-[#4a3426]">
            <span className="mt-[4px] h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SIDE_COLOR[l.who] }} />
            <span className="min-w-0">{lineText(l, g.names, me)}</span>
          </li>
        ))}
      </ul>
    </section>
  );

  // ---------- the footer ----------
  let footer: React.ReactNode = null;
  if (mine && ph.k === 'split') {
    const ok = validSplit(g.offer.length, mask);
    const n = shareOf(g.offer, mask, 1).length;
    footer = (
      <Btn size="lg" full disabled={!ok} onClick={() => send(mask)} icon={<Scale />} className="!h-14 !text-[16px]">
        {ok ? `გაყოფა · ${g.offer.length - n} და ${n}` : 'ორივე წილში ერთი ბარათი მაინც'}
      </Btn>
    );
  } else if (mine && ph.k === 'choose') {
    footer = (
      <Btn size="lg" full disabled={share === null} onClick={() => share !== null && send(share)} icon={<Check />} className="!h-14 !text-[16px]">
        {share === null ? 'შეეხე წილს' : share === 0 ? 'პირველ წილს ავიღებ' : 'მეორე წილს ავიღებ'}
      </Btn>
    );
  } else if (mine && ph.k === 'steal') {
    footer = (
      <Btn size="lg" full disabled={card === null} onClick={() => card !== null && send(card)} icon={<Handshake />} className="!h-14 !text-[16px]">
        {card === null ? 'შეეხე ბარათს' : `გადმოვიბირებ: ${CARDS[card].n}`}
      </Btn>
    );
  } else if (sent && ph.k !== 'end') {
    footer = <p className="text-center text-[13px] font-bold text-[#75685a]">გაგზავნილია…</p>;
  } else if (ph.k === 'end') {
    footer = acts.again ? (
      <div className="grid grid-cols-2 gap-2">
        <Btn kind="ghost" size="lg" onClick={acts.close} className="!h-14 !px-3 whitespace-nowrap">{one ? 'დახურვა' : 'ოთახის დახურვა'}</Btn>
        <Btn size="lg" onClick={acts.again} icon={<RotateCcw />} className="!h-14 !px-3 whitespace-nowrap">კიდევ ერთხელ</Btn>
      </div>
    ) : acts.leave ? <Btn kind="ghost" size="lg" full onClick={acts.leave} icon={<LogOut />} className="!h-14">დახურვა</Btn> : null;
  }

  return (
    <TableScreen title="ორი ტახტი" right={right} onClose={onHide} footer={footer}>
      <div className={`py-2 w-full mx-auto ${wide ? 'max-w-[1200px] grid grid-cols-2 gap-4 items-start' : 'max-w-[672px] space-y-3.5'}`}>
        {wide ? (
          <>
            <div className="min-w-0 space-y-3.5">{story}{note}{results}{meeting}</div>
            <div className="min-w-0 space-y-3.5">{courts}{chronicle}</div>
          </>
        ) : <>{story}{note}{results}{meeting}{courts}{chronicle}</>}
      </div>
    </TableScreen>
  );
};
