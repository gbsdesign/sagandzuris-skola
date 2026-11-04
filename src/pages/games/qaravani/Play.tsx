import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Crown, Layers, LogOut, Mail, RotateCcw, SkipForward } from 'lucide-react';
import {
  DECK_PICK, FACE_PICK, LOCO, PASS_PICK, QUIT_PICK, TICKETS, TICKETS_PICK, TRACKS, doneBy, keepPick, tunnelOptions, tunnelPick,
} from '../../../utils/qaravani';
import { canMove, roadPays, type QSeat, type QView } from '../../../utils/qaravaniRoom';
import { Q_TICKET_TEXT } from '../../../data/qaravaniMap';
import { TableScreen } from '../../../components/games/TableScreen';
import { Btn } from '../../../components/ui/kit';
import { triggerHaptic } from '../../../utils/haptics';
import { QaravaniMap, type MapRing } from './Map';
import { CitySheet, RoadSheet } from './Sheets';
import { Animal, CardBack, CardFace, CartMark, Envelope, InnMark, KIND, PayChips, RoadCells, cityName, lineText, pointsOf, roadName } from './look';

// „ქარავანი“ being played, online and on one phone alike: the story of the step, the map (a tap opens a road or a city: take
// the road, build an inn), the five open cards, the deck and the letters' pile (chosen, then confirmed below), my cards and my
// letters with what is done, the roads I can take now, the caravans and the chronicle; at the end every letter and the score.

export interface QActs {
  /** a move of this phone's player as one number (`applyPick`); missing: nothing to move now */
  pick?: (n: number) => void;
  again?: () => void;
  close?: () => void;
  leave?: () => void;
}

/** two columns: a phone on its side, a computer */
const useTwoCols = () => {
  const read = () => window.innerHeight <= 500 || window.innerWidth >= 1024;
  const [two, setTwo] = useState(read);
  useEffect(() => {
    const on = () => setTwo(read());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return two;
};
const useWidth = () => {
  const ref = useRef<HTMLElement>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const on = () => setW(el.clientWidth);
    on();
    const ro = new ResizeObserver(on);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
};

type Pick = { k: 'face'; i: number } | { k: 'deck' } | { k: 'tickets' } | null;
const bitsOf = (m: number) => { let k = 0; for (let x = m; x; x &= x - 1) k++; return k; };

const Title: React.FC<{ children: React.ReactNode; right?: React.ReactNode }> = ({ children, right }) => (
  <div className="flex items-baseline justify-between gap-2">
    <p className="text-[13.5px] font-bold text-[#4a3426]">{children}</p>
    {right && <span className="text-[12.5px] font-bold text-[#75685a] tabular-nums">{right}</span>}
  </div>
);

/** a letter: its two cities, the points, its story; ✓ once its cities are joined */
const Letter: React.FC<{ id: number; done?: boolean; lost?: boolean; on?: boolean; check?: boolean; onClick?: () => void }> = ({ id, done, lost, on, check, onClick }) => {
  const T = TICKETS[id];
  const body = (
    <>
      <span className="mt-0.5 shrink-0"><Envelope size={22} /></span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-[14px] font-bold leading-snug text-[#2b1e14]">{cityName(T.a)} — {cityName(T.b)}</span>
          {T.long && <span className="rounded-full bg-[#2b1e14] px-2 py-0.5 text-[11px] font-bold text-[#f0d9a0]">დიდი მოგზაურობა</span>}
        </span>
        <span className="mt-0.5 block text-[12px] leading-snug text-[#75685a]">{Q_TICKET_TEXT[id]}</span>
      </span>
      <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 h-7 text-[13px] font-black tabular-nums ${done ? 'bg-[#2f7d4f] text-white' : lost ? 'bg-[#b3261e]/10 text-[#b3261e]' : 'bg-[#e2c27a]/30 text-[#6b4a1f]'}`}>
        {done && <Check className="w-3.5 h-3.5" />}{lost ? '−' : done ? '+' : ''}{T.v}
      </span>
      {check !== undefined && (
        <span className={`mt-0.5 shrink-0 w-6 h-6 rounded-md flex items-center justify-center ring-2 ${check ? 'bg-[#7a2028] ring-[#7a2028] text-white' : 'bg-white ring-[#d9c9ad]'}`}>{check && <Check className="w-4 h-4" />}</span>
      )}
    </>
  );
  const cls = `w-full flex items-start gap-2.5 rounded-2xl px-3 py-2.5 text-left ring-1 transition ${on ? 'bg-[#7a2028]/[0.06] ring-[#7a2028]/50' : 'bg-white ring-[#e8dcc8]'}`;
  return onClick ? <button type="button" onClick={onClick} aria-pressed={check ?? on} className={`${cls} cursor-pointer active:scale-[0.99]`}>{body}</button> : <div className={cls}>{body}</div>;
};

export const QaravaniPlay: React.FC<{
  v: QView;
  seat: QSeat | null;
  /** this phone's player (−1: watching); on one phone the one holding it */
  me: number;
  one?: boolean;
  sent?: boolean;
  clock?: React.ReactNode;
  acts: QActs;
  right?: React.ReactNode;
  note?: React.ReactNode;
  onHide: () => void;
}> = ({ v, seat, me, one, sent, clock, acts, right, note, onHide }) => {
  const ph = v.phase;
  const two = useTwoCols();
  const [marketRef, marketW] = useWidth();
  const cardW = Math.max(46, Math.min(74, Math.floor((marketW - 4 * 6) / 5)));
  const [sel, setSel] = useState<Pick>(null);
  const [keep, setKeep] = useState(0);
  const [road, setRoad] = useState<number | null>(null);
  const [city, setCity] = useState<number | null>(null);
  const [letter, setLetter] = useState<number | null>(null);
  const [focus, setFocus] = useState<{ key: string; cities: number[] } | null>(null);
  const [can, setCan] = useState(false);
  const [endP, setEndP] = useState<number | null>(null);
  useEffect(() => { setSel(null); setKeep(0); }, [v.key]);

  const hand = seat && me >= 0 ? seat.hand : null;
  const mine = !!acts.pick && !sent && me >= 0;
  const myTurn = ph.k !== 'end' && ph.k !== 'start' && v.turn === me;
  const act = mine && myTurn;
  const dealing = ph.k === 'start' && mine && !ph.kept[me] && !!seat?.offer.length;
  const choosing = ph.k === 'tickets' && act && !!seat?.offer.length;
  const offer = dealing || choosing ? seat!.offer : [];
  const minKeep = dealing ? 2 : 1;
  const nm = (i: number) => (i === me ? 'შენ' : v.names[i]);
  const who = v.names[v.turn];
  const last = v.log.length ? v.log[v.log.length - 1] : null;
  const lastText = last ? lineText(last, v.names, me) : '';
  const send = (n: number) => {
    if (!acts.pick) return;
    triggerHaptic(15);
    acts.pick(n);
    setSel(null);
    setRoad(null);
    setCity(null);
  };
  const look = (id: number) => {
    triggerHaptic(5);
    const T = TICKETS[id];
    if (letter === id) { setLetter(null); setFocus({ key: `all-${Date.now()}`, cities: [] }); return; }
    setLetter(id);
    setFocus({ key: `l${id}-${Date.now()}`, cities: [T.a, T.b] });
  };

  // ---------- the cities ringed on the map ----------
  const letters = seat && me >= 0 ? seat.tickets : [];
  const endLetters = ph.k === 'end' && v.end && endP !== null ? v.end.letters[endP] ?? [] : [];
  const ringKey = (offer.length ? offer : ph.k === 'end' ? endLetters : letters).join(',');
  const rings = useMemo<MapRing[]>(() => {
    const out = new Map<number, MapRing['tone']>();
    for (const id of ringKey ? ringKey.split(',').map(Number) : []) for (const x of [TICKETS[id].a, TICKETS[id].b]) if (!out.has(x)) out.set(x, 'gold');
    if (letter !== null && TICKETS[letter]) for (const x of [TICKETS[letter].a, TICKETS[letter].b]) out.set(x, 'wine');
    return [...out].map(([x, tone]) => ({ x, tone }));
  }, [ringKey, letter]);
  const ringCities = useMemo(() => rings.map(r => r.x), [rings]);

  // the roads I may take now
  const claimable = useMemo(() => (act && ph.k === 'turn' && hand
    ? TRACKS.map((_, t) => t).filter(t => roadPays(v, hand, me, t).length > 0).sort((a, b) => pointsOf(b) - pointsOf(a))
    : []), [act, ph.k, hand, v, me]);
  const stuck = act && ph.k === 'turn' && !!hand && !canMove(v, hand, me);

  // ---------- the story ----------
  let over: React.ReactNode, head: React.ReactNode, sub: React.ReactNode = lastText;
  if (ph.k === 'end') {
    const w = v.end?.result.winners ?? [];
    over = 'თამაში დასრულდა';
    head = w.length > 1 ? `თანაბარია: ${w.map(nm).join(', ')}` : w[0] === me ? 'შენ გაიმარჯვე!' : w.length ? `${v.names[w[0]]} იმარჯვებს!` : 'ქულები';
    sub = 'ყველა წერილი გაიხსნა: შესრულებული ქულას მატებს, შეუსრულებელი აკლებს. უხმარი ქარვასლა +4, ყველაზე გრძელი გზა +10.';
  } else {
    over = v.left >= 0 ? <>ბოლო წრე · კიდევ {v.left} სვლა</> : <>დასტაში {v.deck} ბარათი · წერილები {v.tdeck}</>;
    if (ph.k === 'start') {
      const waiting = v.waiting.filter(i => i !== me).map(i => v.names[i]);
      head = dealing ? (one ? <>წერილებს ირჩევს: {v.names[me]}</> : 'აირჩიე წერილები') : 'წერილების არჩევა';
      sub = dealing ? 'ოთხიდან 2 მაინც დაიტოვე — შეგიძლია მეტიც. რომელსაც არ დაიტოვებ, ყუთში ჩავა.'
        : waiting.length ? `ელოდება: ${waiting.join(', ')}` : lastText;
    } else if (ph.k === 'turn') {
      head = myTurn ? (one ? <>სვლაა: {who}</> : 'შენი სვლაა') : <>{who} ფიქრობს სვლაზე</>;
      if (myTurn && !lastText) sub = 'აიღე 2 ბარათი, დაიკავე გზა, აიღე წერილები ან ააშენე ქარვასლა.';
    } else if (ph.k === 'second') {
      head = myTurn ? 'კიდევ ერთი ბარათი' : <>{who} მეორე ბარათს იღებს</>;
      if (myTurn) sub = v.face.includes(LOCO) ? 'ღია ორთქლმავალს ახლა ვეღარ აიღებ — მხოლოდ სხვა ბარათს ან დასტიდან.' : 'ღიადან ან დასტიდან.';
    } else if (ph.k === 'tickets') {
      head = myTurn ? (one ? <>წერილებს ირჩევს: {who}</> : 'რომელ წერილებს იტოვებ?') : <>{who} წერილებს ირჩევს</>;
      if (myTurn) sub = 'ერთი მაინც დაიტოვე. რომელსაც არ დაიტოვებ, დასტის ბოლოში ჩავა.';
    } else {
      head = myTurn ? 'ამინდი მთაში' : <>{who} მთის გზაზეა</>;
      sub = `${roadName(ph.t)}: დასტიდან 3 ბარათი გაიხსნა${ph.extra ? ` — კიდევ ${ph.extra} ბარათი სჭირდება` : ''}.`;
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

  // ---------- the letters offered (the deal, new letters) ----------
  const offerBox = offer.length > 0 && (
    <section className="space-y-2">
      <Title right={`${bitsOf(keep)} / ${offer.length}`}>{dealing ? 'შენი წერილები — დაიტოვე 2 მაინც' : 'ახალი წერილები — დაიტოვე 1 მაინც'}</Title>
      {offer.map((id, i) => (
        <Letter
          key={id}
          id={id}
          check={!!(keep & (1 << i))}
          on={letter === id}
          onClick={() => { setKeep(m => m ^ (1 << i)); look(id); }}
        />
      ))}
    </section>
  );

  // ---------- a mountain road's weather ----------
  const tunnel = ph.k === 'tunnel' && (() => {
    const opts = act && hand ? tunnelOptions(ph, hand) : [];
    const what = ph.c === LOCO ? 'მხოლოდ ორთქლმავალი' : `${KIND[ph.c].name} ან ორთქლმავალი`;
    return (
      <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3.5 py-3 space-y-3">
        <Title>ამინდი მთაში · {roadName(ph.t)}</Title>
        <div className="flex gap-2">{ph.drawn.map((c, i) => <CardFace key={i} k={c} w={56} name />)}</div>
        <p className="text-[13.5px] font-bold leading-snug text-[#2b1e14]">
          {ph.extra} ემთხვევა — კიდევ {ph.extra} ბარათი სჭირდება: {what}.
        </p>
        {act && (opts.length ? (
          <div className="space-y-2">
            {opts.map(l => (
              <button key={l} type="button" onClick={() => send(tunnelPick(l))} className="w-full min-h-14 rounded-2xl bg-[#7a2028] px-3.5 py-2 flex items-center gap-3 text-left text-white cursor-pointer active:scale-[0.99] transition">
                <span className="min-w-0 flex-1"><PayChips c={ph.c} l={l} n={ph.extra} dark /></span>
                <span className="shrink-0 text-[14px] font-bold">დამატება</span>
              </button>
            ))}
          </div>
        ) : <p className="text-[13px] font-bold text-[#9a6a10]">ამდენი ბარათი არ გაქვს — გზა ამჯერად ვერ დაიკავე.</p>)}
      </section>
    );
  })();

  // ---------- the market ----------
  const drawing = act && (ph.k === 'turn' || ph.k === 'second');
  const choose = (p: Pick) => { triggerHaptic(5); setSel(s => (JSON.stringify(s) === JSON.stringify(p) ? null : p)); };
  const market = ph.k !== 'end' && ph.k !== 'start' && (
    <section ref={marketRef} className="space-y-2.5">
      <Title right={v.pile ? `გადაყრილი ${v.pile}` : undefined}>ღია ბარათები</Title>
      <div className="flex justify-between gap-1.5">
        {v.face.map((c, i) => (c >= 0 ? (
          <CardFace
            key={`${i}-${c}`}
            k={c}
            w={cardW}
            name
            sel={sel?.k === 'face' && sel.i === i}
            off={drawing && ph.k === 'second' && c === LOCO}
            onClick={drawing ? () => choose({ k: 'face', i }) : undefined}
          />
        ) : <span key={i} className="shrink-0 rounded-[9px] border-2 border-dashed border-[#d9c9ad]" style={{ width: cardW, height: Math.round(cardW * 1.36) }} />))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!drawing || v.deck + v.pile === 0}
          onClick={() => choose({ k: 'deck' })}
          aria-pressed={sel?.k === 'deck'}
          className={`min-h-14 rounded-2xl px-3 py-2 flex items-center gap-2.5 text-left ring-1 transition ${sel?.k === 'deck' ? 'bg-[#7a2028]/[0.07] ring-2 ring-[#7a2028]' : 'bg-white ring-[#e8dcc8]'} enabled:cursor-pointer enabled:active:scale-[0.99] disabled:cursor-default`}
        >
          <CardBack w={28} />
          <span className="min-w-0"><span className="block text-[13.5px] font-bold text-[#2b1e14]">დასტა</span><span className="block text-[12px] text-[#75685a] tabular-nums">{v.deck} ბარათი</span></span>
        </button>
        <button
          type="button"
          disabled={!act || ph.k !== 'turn' || v.tdeck === 0}
          onClick={() => choose({ k: 'tickets' })}
          aria-pressed={sel?.k === 'tickets'}
          className={`min-h-14 rounded-2xl px-3 py-2 flex items-center gap-2.5 text-left ring-1 transition ${sel?.k === 'tickets' ? 'bg-[#7a2028]/[0.07] ring-2 ring-[#7a2028]' : 'bg-white ring-[#e8dcc8]'} enabled:cursor-pointer enabled:active:scale-[0.99] disabled:cursor-default`}
        >
          <Envelope size={30} />
          <span className="min-w-0"><span className="block text-[13.5px] font-bold text-[#2b1e14]">წერილები</span><span className="block text-[12px] text-[#75685a] tabular-nums">{v.tdeck} დასტაში</span></span>
        </button>
      </div>
    </section>
  );

  // ---------- my cards, my letters, what I may take ----------
  const total = hand ? hand.reduce((a, b) => a + b, 0) : 0;
  const handBox = hand && ph.k !== 'end' && (
    <section className="space-y-2.5">
      <Title right={`${total} ბარათი`}>შენი ბარათები</Title>
      {total ? (
        <div className="flex flex-wrap gap-x-2.5 gap-y-3 pt-1.5">
          {hand.map((n, k) => (n ? <CardFace key={k} k={k} w={46} count={n} label={`${KIND[k].name}: ${n}`} /> : null))}
        </div>
      ) : <p className="text-[12.5px] text-[#9a8b7b]">ხელში ბარათი არ გაქვს.</p>}
    </section>
  );
  const lettersBox = letters.length > 0 && ph.k !== 'end' && (
    <section className="space-y-2">
      <Title right={`${letters.filter(id => doneBy(v.owner, me, id)).length} / ${letters.length} შესრულდა`}>შენი წერილები</Title>
      {letters.map(id => <Letter key={id} id={id} done={doneBy(v.owner, me, id)} on={letter === id} onClick={() => look(id)} />)}
      {v.inns[me] < 3 && <p className="text-[12px] leading-snug text-[#9a8b7b]">ქარვასლის სესხი თამაშის ბოლოს ჩაითვლება.</p>}
    </section>
  );
  const canBox = act && ph.k === 'turn' && (
    <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8]">
      <button type="button" onClick={() => { triggerHaptic(5); setCan(o => !o); }} aria-expanded={can} className="w-full min-h-12 px-3.5 flex items-center justify-between gap-2 text-[13.5px] font-bold text-[#4a3426] cursor-pointer">
        <span>რომელი გზის დაკავება შეგიძლია · {claimable.length}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-[#7a2028] transition-transform ${can ? 'rotate-180' : ''}`} />
      </button>
      {can && (claimable.length ? (
        <ul className="border-t border-[#efe5d3] divide-y divide-[#efe5d3]">
          {claimable.map(t => (
            <li key={t}>
              <button type="button" onClick={() => setRoad(t)} className="w-full min-h-12 px-3.5 py-2 flex items-center gap-2.5 text-left cursor-pointer hover:bg-[#7a2028]/[0.04]">
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-bold text-[#2b1e14]">{roadName(t)}</span>
                  <span className="mt-1 block"><RoadCells t={t} cell={13} /></span>
                </span>
                <span className="shrink-0 rounded-full bg-[#e2c27a]/30 px-2 py-0.5 text-[12.5px] font-black tabular-nums text-[#6b4a1f]">+{pointsOf(t)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="border-t border-[#efe5d3] px-3.5 py-3 text-[12.5px] text-[#75685a]">ახლა ვერცერთს — ჯერ ბარათები შეაგროვე.</p>)}
    </section>
  );

  // ---------- the caravans ----------
  const players = ph.k !== 'end' && (
    <section className="space-y-2">
      <Title>ქარავნები</Title>
      <ul className="space-y-1.5">
        {v.names.map((n, i) => {
          const on = ph.k === 'start' ? v.waiting.includes(i) : v.turn === i;
          return (
            <li key={i} className={`flex items-center gap-2.5 rounded-2xl px-3 py-2 ring-1 ${on ? 'bg-[#7a2028]/[0.06] ring-[#7a2028]/40' : 'bg-white ring-[#e8dcc8]'}`}>
              <Animal p={i} size={32} />
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-[14px] font-bold text-[#2b1e14]">{n}{i === me && !one ? ' · შენ' : ''}</span>
                  <span className="shrink-0 text-[15px] font-black tabular-nums text-[#2b1e14]">{v.pts[i]}</span>
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] font-bold tabular-nums text-[#75685a]">
                  <span className="inline-flex items-center gap-1" title="ურმები"><CartMark p={i} />{v.carts[i]}</span>
                  <span className="inline-flex items-center gap-1" title="ბარათები"><Layers className="w-3.5 h-3.5" />{v.cards[i]}</span>
                  <span className="inline-flex items-center gap-1" title="წერილები"><Mail className="w-3.5 h-3.5" />{v.tickets[i]}</span>
                  <span className="inline-flex items-center gap-1" title="ქარვასლები"><InnMark p={i} size={15} />{v.inns[i]}</span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
  const chronicle = v.log.length > 1 && (
    <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3.5 py-3">
      <p className="text-[12.5px] font-bold text-[#75685a]">მატიანე</p>
      <ul className="mt-1 space-y-1">
        {v.log.slice(-6).reverse().map((l, i) => (
          <li key={`${v.key}-${i}`} className="flex items-start gap-1.5 text-[12.5px] leading-snug text-[#4a3426]">
            {'p' in l ? <span className="mt-[2px] shrink-0"><Animal p={l.p} size={15} /></span> : <span className="mt-[5px] h-2 w-2 shrink-0 rounded-full bg-[#c9a24b]" />}
            <span className="min-w-0">{lineText(l, v.names, me)}</span>
          </li>
        ))}
      </ul>
    </section>
  );

  // ---------- the end ----------
  const results = ph.k === 'end' && v.end && (
    <section className="space-y-2">
      <Title>ქულები</Title>
      {v.end.result.order.map(i => {
        const r = v.end!.result.rows[i], won = v.end!.result.winners.includes(i);
        return (
          <div key={i} className={`rounded-2xl px-3.5 py-3 ring-1 ${won ? 'bg-[#e2c27a]/[0.18] ring-[#c9a24b]' : 'bg-white ring-[#e8dcc8]'}`}>
            <button type="button" onClick={() => { triggerHaptic(5); setEndP(p => (p === i ? null : i)); setLetter(null); }} className="w-full flex items-center gap-2.5 text-left cursor-pointer" aria-expanded={endP === i}>
              <Animal p={i} size={34} />
              <span className="min-w-0 flex-1 text-[15px] font-bold text-[#2b1e14] truncate">{nm(i)}</span>
              {won && <Crown className="w-5 h-5 shrink-0 text-[#a67c2e]" />}
              <span className="shrink-0 text-[22px] font-black tabular-nums text-[#2b1e14]">{r.total}</span>
            </button>
            <p className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[12.5px] text-[#4a3426]">
              <span>გზები: <b className="tabular-nums">{r.roads}</b></span>
              <span>წერილები: <b className="tabular-nums">{r.ticketPts > 0 ? '+' : ''}{r.ticketPts}</b> ({r.done}/{r.tickets.length})</span>
              <span>ქარვასლები: <b className="tabular-nums">+{r.innPts}</b></span>
              <span>გრძელი გზა: <b className="tabular-nums">{r.bonus ? '+10' : '0'}</b> ({r.longest})</span>
            </p>
            {endP === i && (
              <div className="mt-2.5 space-y-1.5">
                {r.tickets.map(t => <Letter key={t.id} id={t.id} done={t.done} lost={!t.done} on={letter === t.id} onClick={() => look(t.id)} />)}
                {r.borrowed.length > 0 && <p className="text-[12px] leading-snug text-[#75685a]">ქარვასლამ ისესხა: {r.borrowed.map(roadName).join('; ')}</p>}
              </div>
            )}
          </div>
        );
      })}
      <p className="text-[12px] leading-snug text-[#9a8b7b]">შეეხე ქარავანს — მისი წერილები რუკაზე გამოჩნდება.</p>
    </section>
  );

  // ---------- the footer ----------
  let footer: React.ReactNode = null;
  if (dealing || choosing) {
    const n = bitsOf(keep);
    footer = <Btn size="lg" full disabled={n < minKeep} onClick={() => send(keepPick(keep))} icon={<Check />} className="!h-14 !text-[16px]">დატოვება · {n}/{offer.length}</Btn>;
  } else if (act && ph.k === 'tunnel') {
    footer = <Btn kind="ghost" size="lg" full onClick={() => send(QUIT_PICK)} className="!h-14 !text-[15px]">უარი — ბარათები ხელში დამრჩება</Btn>;
  } else if (drawing && sel) {
    const label = sel.k === 'face' ? <>ავიღებ: {KIND[v.face[sel.i]]?.name}</> : sel.k === 'deck' ? 'დასტიდან ავიღებ' : 'ავიღებ 3 წერილს';
    const pick = sel.k === 'face' ? FACE_PICK + sel.i : sel.k === 'deck' ? DECK_PICK : TICKETS_PICK;
    footer = <Btn size="lg" full onClick={() => send(pick)} icon={sel.k === 'tickets' ? <Mail /> : <Layers />} className="!h-14 !text-[16px]">{label}</Btn>;
  } else if (stuck) {
    footer = <Btn kind="ghost" size="lg" full onClick={() => send(PASS_PICK)} icon={<SkipForward />} className="!h-14">ვერაფერს ვაკეთებ — სვლის გამოტოვება</Btn>;
  } else if (drawing) {
    footer = <p className="text-center text-[13px] font-bold leading-snug text-[#75685a]">{ph.k === 'second' ? 'აირჩიე მეორე ბარათი' : 'აირჩიე ბარათი ან წერილები — ან შეეხე გზას რუკაზე'}</p>;
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

  const map = (
    <QaravaniMap
      owner={v.owner}
      inn={v.inn}
      players={v.names.length}
      rings={rings}
      first={ringCities}
      hot={can ? claimable : []}
      sel={road}
      focus={focus}
      onRoad={t => setRoad(t)}
      onCity={x => setCity(x)}
    />
  );
  const sheets = (
    <>
      <RoadSheet t={road} v={v} me={me} hand={hand} canClaim={act && ph.k === 'turn'} onClaim={send} onCity={x => { setRoad(null); setCity(x); }} onClose={() => setRoad(null)} />
      <CitySheet x={city} v={v} me={me} hand={hand} canBuild={act && ph.k === 'turn'} letters={letters} onInn={send} onRoad={t => { setCity(null); setRoad(t); }} onClose={() => setCity(null)} />
    </>
  );
  return (
    <TableScreen title="ქარავანი" right={right} onClose={onHide} footer={footer}>
      <div className={`py-2 w-full mx-auto ${two ? 'max-w-[1200px] grid grid-cols-2 lg:grid-cols-[3fr_2fr] gap-4 items-start' : 'max-w-[672px] space-y-3.5'}`}>
        {two ? (
          <>
            <div className="min-w-0 sticky top-0 space-y-3">{map}</div>
            <div className="min-w-0 space-y-3.5">{story}{note}{results}{offerBox}{tunnel}{market}{handBox}{lettersBox}{canBox}{players}{chronicle}</div>
          </>
        ) : (
          <>{story}{note}{results}{offerBox}{tunnel}{map}{market}{handBox}{lettersBox}{canBox}{players}{chronicle}</>
        )}
      </div>
      {sheets}
    </TableScreen>
  );
};
