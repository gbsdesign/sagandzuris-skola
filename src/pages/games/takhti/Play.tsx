import React, { useEffect, useState } from 'react';
import { Check, Crown, Hammer, LogOut, RotateCcw, Swords } from 'lucide-react';
import { CARDS, WONDERS } from '../../../data/takhtiCards';
import { CAPITALS, ROMAN, freeSlots, leftInAge, playPick, type TakhtiGame, type Why } from '../../../utils/oriTakhti';
import { TableScreen } from '../../../components/games/TableScreen';
import { Btn } from '../../../components/ui/kit';
import { triggerHaptic } from '../../../utils/haptics';
import { BoardTokens, Pyramid, Track, useCardW, useTwoCols } from './Board';
import { CardSheet, TokenSheet } from './CardSheet';
import { CityPanel, CitySheet, ScoreTable } from './City';
import { CardFace, TokenTile, WonderMark, WonderTile } from './look';
import { AGE_INFO, SIDE_COLOR, TYPE_INFO, effText, lineText } from './words';

// „ორი ტახტი“ being played, online and on one phone alike: the story of the step, „ლიხის გზა“, the age's cards (a tap opens a
// card: build it, sell it, tuck it under a monument), the two kingdoms, the chronicle. The draft, a token, a ruin, a card out
// of the discard and who begins an age are chosen in the panel and confirmed below; the end names the winner and the points.

export interface TakhtiActs {
  /** a move of the player on turn as one number (`applyPick`); missing: not mine to move now */
  pick?: (n: number) => void;
  again?: () => void;
  close?: () => void;
  leave?: () => void;
}

const WHY: Record<Why, string> = { army: 'ლაშქრის გამარჯვება', science: 'სიბრძნის გამარჯვება', civil: 'დიდების ქულები' };
const IN_CAPITAL = ['ქუთაისში', 'თბილისში'] as const;

/** cards to choose from (a ruin, the discard): the face and its name */
const CardPick: React.FC<{ ids: number[]; sel: number | null; onPick?: (id: number) => void }> = ({ ids, sel, onPick }) => (
  <ul className="grid grid-cols-3 sm:grid-cols-4 gap-x-2 gap-y-3">
    {ids.map(id => (
      <li key={id} className="flex flex-col items-center gap-1 text-center">
        <CardFace id={id} w={66} selected={sel === id} onClick={onPick ? () => onPick(id) : undefined} />
        <span className="text-[12px] font-bold leading-tight text-[#2b1e14] [overflow-wrap:anywhere]">{CARDS[id].n}</span>
      </li>
    ))}
  </ul>
);

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
  const two = useTwoCols();
  const w = useCardW(g.age, two);
  const [slot, setSlot] = useState<number | null>(null);
  const [city, setCity] = useState<number | null>(null);
  const [tok, setTok] = useState<number | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  useEffect(() => { setSlot(null); setSel(null); }, [g.step]);
  const myTurn = ph.k !== 'end' && (one || me === g.turn);
  const mine = myTurn && !!acts.pick && !sent;
  const focus = me >= 0 ? me : g.turn;
  const nm = (i: number) => (i === me ? 'შენ' : g.names[i]);
  const who = g.names[g.turn];
  const last = g.log.length ? g.log[g.log.length - 1] : null;
  const lastText = last ? lineText(last, g.names, me) : '';
  const send = (n: number | null) => {
    if (n === null || !acts.pick) return;
    triggerHaptic(15);
    acts.pick(n);
    setSel(null);
    setSlot(null);
  };
  const choose = (id: number) => { triggerHaptic(5); setSel(s => (s === id ? null : id)); };

  // ---------- the story ----------
  const held = g.cities[0].wonders.length + g.cities[1].wonders.length;
  const A = AGE_INFO[g.age];
  let over: React.ReactNode, head: React.ReactNode, sub: React.ReactNode = lastText;
  if (ph.k === 'draft') {
    over = <>ძეგლების არჩევა · {held} / 8</>;
    head = myTurn ? (one ? <>ძეგლს ირჩევს: {who}</> : 'აირჩიე ძეგლი') : <>{who} ირჩევს ძეგლს</>;
    if (myTurn) sub = ph.offer.length === 4 ? 'ერთს აიღებ, დანარჩენი სამიდან მეტოქე ორს — ბოლო შენ დაგრჩება.' : ph.offer.length === 3 ? 'ორს აიღებ ზედიზედ — ბოლო მეტოქეს დარჩება.' : 'კიდევ ერთი — ბოლო მეტოქეს დარჩება.';
    else if (!lastText) sub = 'ორივე ტახტი ოთხ-ოთხ ძეგლს აიღებს.';
  } else if (ph.k === 'end') {
    const wn = ph.winners;
    over = WHY[ph.why];
    head = wn.length > 1 ? 'ორივე ტახტი თანაბარია!' : wn[0] === me ? 'შენ გაიმარჯვე!' : <>{g.names[wn[0]]} იმარჯვებს!</>;
    sub = ph.why === 'army' ? `მხედარი ${IN_CAPITAL[1 - wn[0]]} შევიდა.` : ph.why === 'science' ? 'ექვსი სხვადასხვა სიბრძნე შეიკრიბა.'
      : wn.length > 1 ? 'ქულებიც და ლურჯი ბარათების ქულებიც თანაბარია.' : 'მესამე ეპოქა დასრულდა — იმარჯვებს, ვისაც მეტი დიდების ქულა აქვს.';
  } else {
    over = (
      <>
        <span className="mr-1.5 inline-flex h-5 min-w-[22px] items-center justify-center rounded-md px-1 align-[-3px] text-[11.5px] font-black" style={{ background: A.bg, color: A.fg }}>{ROMAN[g.age]}</span>
        ეპოქა · {A.era} · {leftInAge(g)} ბარათი დარჩა
      </>
    );
    if (ph.k === 'play') {
      head = myTurn ? (one ? <>სვლაა: {who}</> : 'შენი სვლაა') : <>{who} ირჩევს ბარათს</>;
      if (!lastText && myTurn) sub = 'შეეხე ამოწეულ ბარათს: ააშენე, გაყიდე ან ძეგლის ქვეშ შედე.';
    } else if (ph.k === 'token') {
      head = myTurn ? (one ? <>ცოდნის ნიშანს იღებს: {who}</> : 'აირჩიე ცოდნის ნიშანი') : <>{who} ირჩევს ცოდნის ნიშანს</>;
      sub = ph.lib ? 'ფაზისის აკადემია: ყუთიდან სამი ნიშანი — ერთი აირჩიე, დანარჩენი ბრუნდება.' : 'ორი ერთნაირი სიბრძნე — დაფიდან ერთი ცოდნის ნიშანი.';
    } else if (ph.k === 'ruin') {
      head = myTurn ? (one ? <>ანგრევს: {who}</> : 'დაანგრიე მეტოქის ბარათი') : <>{who} ანგრევს ბარათს</>;
      sub = `${1 - g.turn === me ? 'შენი' : 'მეტოქის'} ერთი ${TYPE_INFO[ph.type].adj} ბარათი გადაგდებულში მიდის.`;
    } else if (ph.k === 'revive') {
      head = myTurn ? (one ? <>გადაგდებულიდან ირჩევს: {who}</> : 'ააშენე გადაგდებულიდან') : <>{who} ირჩევს გადაგდებულიდან</>;
      sub = 'ბირთვისი: ერთი გადაგდებული ბარათი უფასოდ აშენდება.';
    } else {
      head = myTurn && !one ? 'ვინ დაიწყოს ეპოქა?' : <>{who} ირჩევს, ვინ დაიწყოს</>;
      sub = `${ROMAN[g.age]} ეპოქის ბარათები გაიშალა (${A.when}). ირჩევს ის, ვისი დედაქალაქისკენაც დგას მხედარი; თუ შუაშია — ვინც ბოლო ბარათი აიღო.`;
    }
  }
  const story = (
    <section className="rounded-3xl bg-gradient-to-br from-[#3b2a1c] to-[#2b1e14] text-[#fbf6ec] px-4 py-3.5 shadow-[0_14px_30px_-20px_rgba(43,30,20,0.9)]" aria-live="polite">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold leading-snug text-[#e2c27a]">{over}</p>
          <p className="mt-1 font-serif-ge text-[19px] font-bold leading-snug [overflow-wrap:anywhere]">{head}</p>
          {sub && <p className="mt-1 text-[13px] leading-snug text-[#fbf6ec]/85">{sub}</p>}
        </div>
        {clock}
      </div>
    </section>
  );

  // ---------- what is chosen now ----------
  let main: React.ReactNode = null;
  if (ph.k === 'draft') {
    main = (
      <section className="space-y-2.5">
        <div className="grid gap-2 sm:grid-cols-2">
          {ph.offer.map(id => <WonderTile key={id} w={id} selected={sel === id} onClick={mine ? () => choose(id) : undefined} />)}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[0, 1].map(i => (
            <div key={i} className="min-w-0 rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3 py-2">
              <p className="text-[12px] font-bold leading-tight [overflow-wrap:anywhere]" style={{ color: SIDE_COLOR[i] }}>{CAPITALS[i]} · {nm(i)}</p>
              <ul className="mt-1.5 space-y-1">
                {g.cities[i].wonders.length ? g.cities[i].wonders.map(x => (
                  <li key={x.w} className="flex items-center gap-1.5 text-[12.5px] font-bold leading-tight text-[#2b1e14]">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#2b1e14]"><WonderMark size={14} /></span>
                    <span className="min-w-0 [overflow-wrap:anywhere]">{WONDERS[x.w].n}</span>
                  </li>
                )) : <li className="text-[12px] text-[#9a8b7b]">ჯერ არცერთი</li>}
              </ul>
            </div>
          ))}
        </div>
      </section>
    );
  } else if (ph.k === 'play' || ph.k === 'start') {
    main = (
      <section className="space-y-3">
        <Pyramid g={g} w={w} focus={focus} sel={slot} onCard={s => { triggerHaptic(5); setSlot(s); }} />
        <BoardTokens g={g} onInfo={setTok} />
      </section>
    );
  } else if (ph.k === 'token') {
    main = (
      <section className="space-y-2">
        {ph.from.map(t => <TokenTile key={t} t={t} selected={sel === t} onClick={mine ? () => choose(t) : undefined} />)}
      </section>
    );
  } else if (ph.k === 'ruin' || ph.k === 'revive') {
    const ids = ph.k === 'ruin' ? g.cities[1 - g.turn].cards.filter(id => CARDS[id].t === ph.type) : [...g.discard].reverse();
    const d = sel !== null ? CARDS[sel] : null;
    main = (
      <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3 py-3 space-y-3">
        <p className="text-[12.5px] font-bold text-[#75685a]">{ph.k === 'ruin' ? <>{nm(1 - g.turn)} · {TYPE_INFO[ph.type].adj} ბარათები</> : <>გადაგდებული · {ids.length}</>}</p>
        <CardPick ids={ids} sel={sel} onPick={mine ? choose : undefined} />
        {d && <p className="rounded-xl bg-[#f6efe0] px-3 py-2 text-[12.5px] leading-snug text-[#2b1e14]"><b>{d.n}</b> · {TYPE_INFO[d.t].name} · {effText(d.eff)}</p>}
      </section>
    );
  } else {
    main = (
      <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3.5 py-3">
        <p className="mb-1 text-[13px] font-bold text-[#4a3426]">ქულები</p>
        <ScoreTable g={g} me={me} />
      </section>
    );
  }

  const cities = (
    <div className="grid grid-cols-2 gap-2">
      {[0, 1].map(i => <CityPanel key={i} g={g} who={i} me={me} active={ph.k !== 'end' && g.turn === i} onOpen={() => setCity(i)} />)}
    </div>
  );
  const chronicle = g.log.length > 1 && (
    <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3.5 py-3">
      <p className="text-[12.5px] font-bold text-[#75685a]">მატიანე</p>
      <ul className="mt-1 space-y-1">
        {g.log.slice(-5).reverse().map((l, i) => (
          <li key={`${l.n}-${i}`} className="flex items-start gap-1.5 text-[12.5px] leading-snug text-[#4a3426]">
            <span className="mt-[5px] h-2 w-2 shrink-0 rounded-full" style={{ background: SIDE_COLOR[l.who] }} />
            <span className="min-w-0">{lineText(l, g.names, me)}</span>
          </li>
        ))}
      </ul>
    </section>
  );

  // ---------- the footer ----------
  let footer: React.ReactNode = null;
  if (mine && ph.k === 'start') {
    const order = [g.turn, 1 - g.turn];
    footer = (
      <div className="grid grid-cols-2 gap-2">
        {order.map((i, k) => (
          <Btn key={i} kind={k ? 'ghost' : 'primary'} size="lg" onClick={() => send(i)} className="!h-14 !px-3 min-w-0">
            <span className="truncate">{i === me ? 'მე ვიწყებ' : `${g.names[i]} იწყებს`}</span>
          </Btn>
        ))}
      </div>
    );
  } else if (mine && ph.k !== 'play') {
    const label = sel === null
      ? ph.k === 'draft' ? 'აირჩიე ძეგლი' : ph.k === 'token' ? 'აირჩიე ნიშანი' : 'აირჩიე ბარათი'
      : ph.k === 'ruin' ? 'დავანგრევ' : ph.k === 'revive' ? 'ავაშენებ' : 'ავიღებ';
    const icon = ph.k === 'ruin' ? <Swords /> : ph.k === 'revive' ? <Hammer /> : <Check />;
    footer = <Btn size="lg" full disabled={sel === null} onClick={() => send(sel)} icon={icon} className="!h-14 !text-[16px]">{label}</Btn>;
  } else if (myTurn && sent) {
    footer = <p className="text-center text-[13px] font-bold text-[#75685a]">გაგზავნილია…</p>;
  } else if (ph.k === 'end') {
    footer = acts.again ? (
      <div className="grid grid-cols-2 gap-2">
        <Btn kind="ghost" size="lg" onClick={acts.close} className="!h-14 !px-3 whitespace-nowrap">{one ? 'დახურვა' : 'ოთახის დახურვა'}</Btn>
        <Btn size="lg" onClick={acts.again} icon={<RotateCcw />} className="!h-14 !px-3 whitespace-nowrap">კიდევ ერთხელ</Btn>
      </div>
    ) : acts.leave ? <Btn kind="ghost" size="lg" full onClick={acts.leave} icon={<LogOut />} className="!h-14">დახურვა</Btn> : null;
  }

  const playable = mine && ph.k === 'play' && slot !== null && freeSlots(g).includes(slot);
  const winner = ph.k === 'end' && ph.winners.length === 1 && (
    <p className="flex items-center justify-center gap-2 text-[14px] font-bold" style={{ color: SIDE_COLOR[ph.winners[0]] }}>
      <Crown className="w-5 h-5" />{CAPITALS[ph.winners[0]]} · {nm(ph.winners[0])}
    </p>
  );
  return (
    <TableScreen title="ორი ტახტი" right={right} onClose={onHide} footer={footer}>
      <div className={`py-2 w-full mx-auto ${two ? 'max-w-[1100px] grid grid-cols-2 gap-4 items-start' : 'max-w-[672px] space-y-3.5'}`}>
        {two ? (
          <>
            <div className="min-w-0 space-y-3.5">{story}{note}{winner}<Track g={g} me={me} />{cities}{chronicle}</div>
            <div className="min-w-0 space-y-3.5">{main}</div>
          </>
        ) : (
          <>{story}{note}{winner}<Track g={g} me={me} />{main}{cities}{chronicle}</>
        )}
      </div>
      <CardSheet
        g={g}
        slot={slot}
        who={focus}
        me={me}
        act={playable && slot !== null ? {
          build: () => send(playPick(slot, 'build')),
          discard: () => send(playPick(slot, 'discard')),
          wonder: i => send(playPick(slot, 'wonder', i)),
        } : undefined}
        onClose={() => setSlot(null)}
      />
      <CitySheet g={g} who={city} me={me} onClose={() => setCity(null)} />
      <TokenSheet t={tok} onClose={() => setTok(null)} />
    </TableScreen>
  );
};
