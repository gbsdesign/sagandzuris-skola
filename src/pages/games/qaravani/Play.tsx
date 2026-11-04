import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Crown, HandCoins, LogOut, MapPin, Minus, Mountain, Package, Plus, RotateCcw, Route, Ship } from 'lucide-react';
import {
  CARGO_N, CARGO_PTS, INN_COST, INN_PTS, START_MAX, TRACKS, TRADE, TRADE_PICK, claimPick, hasPair, hasSix, innPick, innSpots, netOf,
  resultOf, roundsFor, scoreOf, sumsOf, takeable, tweakPick, type QGame,
} from '../../../utils/qaravani';
import { TableScreen } from '../../../components/games/TableScreen';
import { Btn } from '../../../components/ui/kit';
import { triggerHaptic } from '../../../utils/haptics';
import { useTwoCols } from '../../../components/games/useTwoCols';
import { QaravaniMap, type MapRing } from './Map';
import { CitySheet, RoadSheet, diceText, gainText, gainWith } from './Sheets';
import { ALL_GOODS, Animal, CartMark, Coin, Die, GoodBadge, InnMark, RoadCells, abazi, cargoOf, cityName, lineText, roadName, worthOf } from './look';

// „ქარავანი“ being played, online and on one phone alike: the story of the turn (the journey, whose turn), the dice (an abazi
// moves one — a gold mark on the button says how many new roads it would open), the map (a tap opens a road or a city), the roads
// the dice open now with what each would bring, the caravanserai to build, my caravan (its points now, the cargo it reaches),
// every house and the chronicle; at the start the town of the first caravanserai; at the end the order with every city counted.

export interface QActs {
  /** a move of this phone's house as one number (`applyPick`); missing: nothing to move now */
  pick?: (n: number) => void;
  again?: () => void;
  close?: () => void;
  leave?: () => void;
}

const Title: React.FC<{ children: React.ReactNode; right?: React.ReactNode }> = ({ children, right }) => (
  <div className="flex items-baseline justify-between gap-2">
    <p className="text-[13.5px] font-bold text-[#4a3426]">{children}</p>
    {right !== undefined && <span className="text-[12.5px] font-bold text-[#75685a] tabular-nums">{right}</span>}
  </div>
);

const Stat: React.FC<{ label: string; value: number; pts: number }> = ({ label, value, pts }) => (
  <div className="rounded-xl bg-[#fbf6ec] ring-1 ring-[#efe5d3] px-2 py-1.5 text-center">
    <p className="text-[11.5px] font-bold leading-tight text-[#75685a]">{label}</p>
    <p className="mt-0.5 text-[16px] font-black tabular-nums leading-none text-[#2b1e14]">{value}</p>
    <p className="mt-1 text-[11.5px] font-bold tabular-nums leading-none text-[#8a5a1c]">{pts} ქულა</p>
  </div>
);

const TweakBtn: React.FC<{ up: boolean; disabled: boolean; opens: number; label: string; onClick: () => void }> = ({ up, disabled, opens, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={opens ? `${label} — გაიხსნება ${opens} ახალი გზა` : label}
    className="relative w-10 h-10 rounded-full flex items-center justify-center bg-[#fbf6ec] ring-1 ring-[#e2d3b8] text-[#7a2028] cursor-pointer active:scale-95 transition disabled:opacity-30 disabled:cursor-default"
  >
    {up ? <Plus className="w-[18px] h-[18px]" /> : <Minus className="w-[18px] h-[18px]" />}
    {opens > 0 && !disabled && (
      <span className="absolute -top-1.5 -right-1.5 min-w-[19px] h-[19px] px-1 rounded-full bg-[#c9a24b] text-[11px] font-black leading-[19px] text-[#2b1e14] tabular-nums ring-2 ring-white">{opens}</span>
    )}
  </button>
);

export const QaravaniPlay: React.FC<{
  g: QGame;
  /** my house online (−1: I watch); on one phone −1 — the house on turn is the one shown */
  me: number;
  one?: boolean;
  /** my move is on its way to the host */
  sent?: boolean;
  clock?: React.ReactNode;
  acts: QActs;
  right?: React.ReactNode;
  note?: React.ReactNode;
  onHide: () => void;
}> = ({ g, me, one, sent, clock, acts, right, note, onHide }) => {
  const ph = g.phase.k, n = g.players.length;
  const two = useTwoCols();
  const [road, setRoad] = useState<number | null>(null);
  const [city, setCity] = useState<number | null>(null);
  const [pickX, setPickX] = useState<number | null>(null);
  const turnKey = `${g.round}.${g.turn}.${ph}`;
  useEffect(() => { setRoad(null); setCity(null); setPickX(null); }, [turnKey]);
  const focus = me >= 0 ? me : ph !== 'end' ? g.turn : -1;
  const mine = ph !== 'end' && !!acts.pick && !sent && focus === g.turn;
  const P = focus >= 0 ? g.players[focus] : null;
  const nm = (i: number) => (i === me ? 'შენ' : g.players[i].name);
  const send = (x: number) => { if (!acts.pick) return; triggerHaptic(15); acts.pick(x); };

  const rows = useMemo(() => scoreOf(g.owner, g.inn, n), [g.owner, g.inn, n]);
  const result = useMemo(() => (ph === 'end' ? resultOf(g) : null), [g, ph]);
  const net = useMemo(() => (focus >= 0 ? [...netOf(g.owner, g.inn, focus)] : []), [g.owner, g.inn, focus]);
  const can = useMemo(() => (mine && ph === 'turn' ? takeable(g) : []), [g, mine, ph]);
  const canSorted = useMemo(() => can.map(t => ({ t, gain: gainWith(g, g.turn, t) })).sort((a, b) => b.gain - a.gain || TRACKS[a.t].n - TRACKS[b.t].n), [can, g]);
  const spots = useMemo(() => (mine && ph === 'start' ? innSpots(g) : []), [g, mine, ph]);
  /** how many roads a die moved by one would open that the dice do not open now */
  const opens = (i: number, up: boolean) => {
    const v = g.dice[i] + (up ? 1 : -1);
    if (!mine || v < 1 || v > 6) return 0;
    const now = new Set(can);
    return takeable({ ...g, dice: g.dice.map((d, j) => (j === i ? v : d)) }).filter(t => !now.has(t)).length;
  };

  // ---------- the story ----------
  const lastLine = g.log[g.log.length - 1];
  const last = lastLine ? lineText(lastLine, g.players.map(p => p.name), me) : '';
  const top = ph === 'start' ? 'ქარვასლების დადგმა' : ph === 'turn' ? `მოგზაურობა ${g.round} / ${roundsFor(n)}` : 'ქარავნებმა გზა დაასრულეს';
  let head: React.ReactNode, sub: React.ReactNode = null;
  if (ph === 'start') {
    head = mine ? (one ? <>ქარვასლა: {g.players[g.turn].name}</> : 'სად დადგამ პირველ ქარვასლას?') : <>{g.players[g.turn].name} ირჩევს ქალაქს…</>;
    sub = mine ? `აირჩიე პატარა ქალაქი (ღირსება 1–${START_MAX}), რომელიც სხვის ქარვასლას არ ესაზღვრება. აქედან დაიწყება ქარავანი.` : last || 'ყველა სახლი თავის პირველ ქარვასლას დგამს.';
  } else if (ph === 'turn') {
    head = mine ? (one ? <>სვლაა: {g.players[g.turn].name}</> : 'შენი სვლაა') : <>{g.players[g.turn].name} ფიქრობს…</>;
    sub = mine
      ? (can.length ? `კამათლებმა ${can.length} გზა გაგიხსნა — დაიკავე ერთი, ან ივაჭრე (+${abazi(TRADE)}).` : `ამ კამათლებით გზა არ იხსნება: შეცვალე კამათელი აბაზით, ან ივაჭრე (+${abazi(TRADE)}).`)
      : last;
  } else if (result) {
    const w = result.winners;
    head = w.length > 1 ? <>{w.map(i => nm(i)).join(' და ')} — ტოლია!</> : w[0] === me ? 'შენ გაიმარჯვე!' : <>{g.players[w[0]].name} იმარჯვებს!</>;
    sub = 'დაითვალა ქალაქები (ვისაც მეტი გზა შედის), ტვირთის სახეობები და ქარვასლები.';
  }
  const story = (
    <section className="rounded-3xl text-[#fbf6ec] px-4 py-3.5 shadow-[0_14px_30px_-20px_rgba(58,36,21,0.9)] bg-gradient-to-br from-[#4a2e1a] to-[#2b1a0e]" aria-live="polite">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[12px] font-bold text-[#f0d9a8]"><Route className="w-3.5 h-3.5 shrink-0" />{top}</p>
          <p className="mt-0.5 flex items-center gap-2 font-serif-ge text-[19px] font-bold leading-snug [overflow-wrap:anywhere]">
            {ph !== 'end' && <Animal p={g.turn} size={26} />}<span className="min-w-0">{head}</span>
          </p>
          {sub && <p className="mt-1 text-[13px] leading-snug text-[#fbf6ec]/85">{sub}</p>}
        </div>
        {clock}
      </div>
    </section>
  );

  // ---------- the start: the first caravanserai's town ----------
  const startBox = mine && ph === 'start' && (
    <section className="space-y-2">
      <Title right={spots.length}>სად დადგამ?</Title>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="პირველი ქარვასლის ქალაქი">
        {[...spots].sort((a, b) => worthOf(b) - worthOf(a) || (cargoOf(b) >= 0 ? 1 : 0) - (cargoOf(a) >= 0 ? 1 : 0) || cityName(a).localeCompare(cityName(b), 'ka')).map(x => {
          const on = pickX === x;
          return (
            <button key={x} type="button" onClick={() => { triggerHaptic(6); setPickX(v => (v === x ? null : x)); }} aria-pressed={on}
              className={`inline-flex items-center gap-1.5 h-11 pl-1.5 pr-3 rounded-full text-[13px] font-bold ring-1 cursor-pointer transition active:scale-[0.98] ${on ? 'bg-[#7a2028] text-[#fbf6ec] ring-[#7a2028]' : 'bg-white text-[#4a3426] ring-[#e8dcc8] hover:ring-[#7a2028]/40'}`}>
              <span className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-[13px] font-black ring-1 ${on ? 'bg-[#fbf6ec] text-[#7a2028] ring-[#fbf6ec]' : 'bg-[#fbf6ec] text-[#7a2028] ring-[#7a2028]/50'}`}>{worthOf(x)}</span>
              {cityName(x)}
              {cargoOf(x) >= 0 && <GoodBadge k={cargoOf(x)} size={20} />}
            </button>
          );
        })}
      </div>
      <p className="text-[12px] leading-snug text-[#9a8b7b]">რიცხვი — ქალაქის ღირსება; ფერადი ნიშანი — მისი ტვირთი. ქალაქზე რუკაზეც შეგიძლია შეეხო.</p>
    </section>
  );

  // ---------- the dice ----------
  const pair = hasPair(g.dice), six = hasSix(g.dice);
  const diceBox = ph === 'turn' && g.dice.length > 0 && (
    <section className={`rounded-2xl bg-white px-3 py-3 ${mine ? 'ring-2 ring-[#e2c27a]' : 'ring-1 ring-[#e8dcc8]'}`}>
      <div className="flex items-start justify-center gap-4 sm:gap-6">
        {g.dice.map((d, i) => {
          const moved = d !== g.rolled[i];
          return (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <Die v={d} size={mine ? 56 : 46} moved={moved} label={`კამათელი ${i + 1}: ${d}${moved ? ` (იყო ${g.rolled[i]})` : ''}`} />
              {mine && P && (
                <div className="flex gap-1">
                  <TweakBtn up={false} disabled={P.coins < 1 || d <= 1} opens={opens(i, false)} label={`კამათელი ${i + 1}: ერთით ნაკლები, 1 აბაზი`} onClick={() => send(tweakPick(i, false))} />
                  <TweakBtn up disabled={P.coins < 1 || d >= 6} opens={opens(i, true)} label={`კამათელი ${i + 1}: ერთით მეტი, 1 აბაზი`} onClick={() => send(tweakPick(i, true))} />
                </div>
              )}
              {moved && <span className="text-[11px] font-bold leading-none text-[#8a5a1c]">იყო {g.rolled[i]}</span>}
            </div>
          );
        })}
      </div>
      <p className="mt-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12.5px] font-bold text-[#75685a]">
        <span className="tabular-nums">ჯამები: {sumsOf(g.dice).join(' · ')}</span>
        <span className={`inline-flex items-center gap-1 ${pair ? 'text-[#2f7d4f]' : ''}`}><Mountain className="w-3.5 h-3.5" />{pair ? 'წყვილი — მთა ღიაა' : 'წყვილი არაა'}</span>
        <span className={`inline-flex items-center gap-1 ${six ? 'text-[#2f7d4f]' : ''}`}><Ship className="w-3.5 h-3.5" />{six ? 'ექვსიანი — ზღვა ღიაა' : 'ექვსიანი არაა'}</span>
      </p>
      {mine && P && (
        <p className="mt-1.5 flex flex-wrap items-center justify-center gap-x-1.5 text-[12px] leading-snug text-[#9a8b7b]">
          <Coin size={15} /><b className="text-[#4a3426] tabular-nums">{abazi(P.coins)}</b> · კამათლის ერთით შეცვლა — 1 აბაზი{g.spent ? ` · ამ სვლაში: ${g.spent}` : ''}
        </p>
      )}
    </section>
  );

  // ---------- the roads to take, the caravanserai ----------
  const takeBox = mine && ph === 'turn' && (
    <section className="space-y-2">
      <Title right={can.length}>რომელი გზის დაკავება შეგიძლია</Title>
      {canSorted.length ? (
        <>
          <ul className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] divide-y divide-[#efe5d3]">
            {canSorted.map(({ t, gain }) => (
              <li key={t}>
                <button type="button" onClick={() => { triggerHaptic(5); setRoad(t); }} className="w-full min-h-14 px-3.5 py-2 flex items-center gap-2.5 text-left cursor-pointer hover:bg-[#7a2028]/[0.04]">
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[13.5px] font-bold text-[#2b1e14]">
                      <span className="min-w-0 [overflow-wrap:anywhere]">{roadName(t)}</span>
                      {TRACKS[t].mountain && <Mountain className="w-3.5 h-3.5 shrink-0 text-[#7a2028]" aria-label="მთის გზა" />}
                      {TRACKS[t].water && <Ship className="w-3.5 h-3.5 shrink-0 text-[#4f7d93]" aria-label="ზღვის გზა" />}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-2"><RoadCells t={t} cell={13} /><span className="text-[12px] font-bold tabular-nums text-[#75685a]">{diceText(g.dice, TRACKS[t].n)}</span></span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[12.5px] font-black tabular-nums ${gain > 0 ? 'bg-[#e2c27a]/35 text-[#6b4a1f]' : 'bg-[#4a3426]/[0.06] text-[#75685a]'}`}>{gainText(gain)}</span>
                  <ChevronRight className="w-4 h-4 shrink-0 text-[#7a2028]" />
                </button>
              </li>
            ))}
          </ul>
          <p className="text-[12px] leading-snug text-[#9a8b7b]">რიცხვი — რამდენი ქულით გაიზრდება შენი ანგარიში ახლა (ქალაქები და ტვირთი).</p>
        </>
      ) : (
        <p className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3.5 py-3 text-[12.5px] leading-snug text-[#75685a]">
          ამ კამათლებით გზა არ იხსნება. ოქროსფერი ნიშანი კამათლის ღილაკზე აჩვენებს, აბაზი რამდენ გზას გაგიხსნის — ან ივაჭრე.
        </p>
      )}
    </section>
  );
  const innTargets = useMemo(() => (focus >= 0 ? net.filter(x => !(g.inn[x] & (1 << focus))) : []), [net, g.inn, focus]);
  const innBox = mine && ph === 'turn' && P && P.inns > 0 && (
    <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3.5 py-3 space-y-2">
      <Title right={`დაგრჩა ${P.inns}`}><span className="inline-flex items-center gap-1.5"><InnMark p={g.turn} size={20} />ქარვასლა · {abazi(INN_COST)}</span></Title>
      {P.coins < INN_COST ? (
        <p className="text-[12.5px] leading-snug text-[#75685a]">{INN_COST} აბაზი სჭირდება — გაქვს {P.coins}. ვაჭრობა +{TRADE}-ს მოგცემს.</p>
      ) : innTargets.length ? (
        <div className="flex flex-wrap gap-1.5">
          {innTargets.map(x => {
            const d = gainWith(g, g.turn, undefined, x);
            return (
              <button key={x} type="button" onClick={() => { triggerHaptic(5); setCity(x); }} className="inline-flex items-center gap-1.5 h-11 px-3 rounded-full bg-white ring-1 ring-[#e8dcc8] text-[13px] font-bold text-[#4a3426] cursor-pointer hover:ring-[#7a2028]/40">
                {cityName(x)}<span className={`tabular-nums ${d > 0 ? 'text-[#8a5a1c]' : 'text-[#9a8b7b]'}`}>{gainText(d)}</span>
              </button>
            );
          })}
        </div>
      ) : <p className="text-[12.5px] leading-snug text-[#75685a]">შენი ქარავნის ყველა ქალაქში უკვე გაქვს ქარვასლა.</p>}
      <p className="text-[12px] leading-snug text-[#9a8b7b]">ქარვასლა ქალაქში ორ გზად ითვლება და ბოლოს +{INN_PTS} ქულაა; სხვისი გზა რომ შემოვა, აბაზი შენია. გზამდე შენდება.</p>
    </section>
  );

  // ---------- my caravan (the one on turn on one phone) ----------
  const row = focus >= 0 ? rows[focus] : null;
  const houseBox = P && row && ph !== 'end' && (
    <section className={`rounded-2xl bg-white px-3.5 py-3 space-y-2.5 ${mine ? 'ring-2 ring-[#e2c27a]' : 'ring-1 ring-[#e8dcc8]'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 flex items-center gap-2 text-[14px] font-bold text-[#4a3426] [overflow-wrap:anywhere]"><Animal p={focus} size={26} />{focus === me ? 'შენი ქარავანი' : P.name}</p>
        <p className="shrink-0 text-[13px] font-bold text-[#3a2415]">ახლა <span className="text-[18px] tabular-nums">{row.total}</span> ქულა</p>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <Stat label="ქალაქი" value={row.cities.length} pts={row.cityPts} />
        <Stat label="ტვირთი" value={row.cargo.length} pts={row.cargoPts} />
        <Stat label="ქარვასლა" value={row.inns} pts={row.inns * INN_PTS} />
      </div>
      <div>
        <div className="flex flex-wrap gap-1" aria-label={`ტვირთი: ${row.cargo.length} სახეობა ${CARGO_N}-დან`}>
          {ALL_GOODS.map(k => <GoodBadge key={k} k={k} size={28} off={!row.cargo.includes(k)} />)}
        </div>
        {row.cargo.length < CARGO_N && (
          <p className="mt-1 text-[12px] leading-snug text-[#75685a]">ახალი ტვირთის სახეობა +{CARGO_PTS[row.cargo.length + 1] - CARGO_PTS[row.cargo.length]} ქულაა.</p>
        )}
      </div>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] font-bold tabular-nums text-[#75685a]">
        <span className="inline-flex items-center gap-1"><Coin size={15} />{abazi(P.coins)}</span>
        <span className="inline-flex items-center gap-1"><CartMark p={focus} />{P.carts} ურემი</span>
        <span className="inline-flex items-center gap-1"><InnMark p={focus} size={16} />{P.inns} ქარვასლა დარჩა</span>
      </p>
    </section>
  );

  // ---------- the houses ----------
  const players = ph !== 'end' && (
    <section className="space-y-2">
      <Title>ქარავნები</Title>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {g.players.map((p, i) => {
          const turn = g.turn === i;
          return (
            <li key={i} className={`min-w-0 rounded-2xl px-2.5 py-2 ${turn ? 'bg-[#fffaf0] ring-2 ring-[#e2c27a]' : 'bg-white ring-1 ring-[#e8dcc8]'}`}>
              <p className="flex items-center justify-between gap-1.5">
                <span className="min-w-0 flex items-center gap-1.5 text-[13px] font-bold leading-tight text-[#4a3426] [overflow-wrap:anywhere]">
                  <Animal p={i} size={20} /><span className="min-w-0">{p.name}{i === me && <span className="text-[11.5px] text-[#a0703c]"> · შენ</span>}</span>
                </span>
                <span className="shrink-0 text-[15px] font-black tabular-nums text-[#3a2415]" title="ქულა ახლა">{rows[i].total}</span>
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] font-bold tabular-nums text-[#75685a]">
                <span className="inline-flex items-center gap-0.5" title="აბაზი"><Coin size={13} />{p.coins}</span>
                <span className="inline-flex items-center gap-1" title="ურმები"><CartMark p={i} size={12} />{p.carts}</span>
                <span className="inline-flex items-center gap-0.5" title="ქალაქები"><MapPin className="w-3 h-3" aria-label="ქალაქები" />{rows[i].cities.length}</span>
                <span className="inline-flex items-center gap-0.5" title="ტვირთის სახეობები"><Package className="w-3 h-3" aria-label="ტვირთი" />{rows[i].cargo.length}</span>
              </p>
              {turn && <p className="mt-1 text-[11.5px] font-bold text-[#8a5a1c]">{ph === 'start' ? 'ქალაქს ირჩევს…' : 'სვლაშია…'}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );

  // ---------- the end ----------
  const results = result && (
    <section className="space-y-2">
      <Title>ქულები</Title>
      {result.order.map(i => {
        const r = result.rows[i], won = result.winners.includes(i);
        return (
          <div key={i} className={`rounded-2xl px-3.5 py-3 ring-1 ${won ? 'bg-[#e2c27a]/[0.18] ring-[#c9a24b]' : 'bg-white ring-[#e8dcc8]'}`}>
            <p className="flex items-center gap-2.5">
              <Animal p={i} size={34} />
              <span className="min-w-0 flex-1 text-[15px] font-bold text-[#2b1e14] truncate">{nm(i)}</span>
              {won && <Crown className="w-5 h-5 shrink-0 text-[#a67c2e]" />}
              <span className="shrink-0 text-[22px] font-black tabular-nums text-[#2b1e14]">{r.total}</span>
            </p>
            <p className="mt-2 grid grid-cols-3 gap-x-2 text-[12.5px] text-[#4a3426]">
              <span>ქალაქები: <b className="tabular-nums">{r.cityPts}</b></span>
              <span>ტვირთი: <b className="tabular-nums">{r.cargoPts}</b></span>
              <span>ქარვასლა: <b className="tabular-nums">{r.inns * INN_PTS}</b></span>
            </p>
            {r.cities.length > 0 && (
              <p className="mt-1.5 text-[12px] leading-snug text-[#75685a]">{r.cities.map(x => `${cityName(x)} ${worthOf(x)}`).join(' · ')}</p>
            )}
            <div className="mt-1.5 flex flex-wrap gap-1">{ALL_GOODS.map(k => <GoodBadge key={k} k={k} size={20} off={!r.cargo.includes(k)} />)}</div>
          </div>
        );
      })}
      <p className="text-[12px] leading-snug text-[#9a8b7b]">ტოლობისას იგებს, ვისაც მეტი ქალაქი აქვს, მერე — ვისაც მეტი აბაზი დარჩა. ქალაქის ღირსება ტოლობისას იყოფა.</p>
    </section>
  );
  const chronicle = g.log.length > 0 && (
    <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3.5 py-3">
      <p className="text-[12.5px] font-bold text-[#75685a]">მატიანე</p>
      <ul className="mt-1 space-y-1">
        {g.log.slice(-6).reverse().map((l, i) => (
          <li key={`${g.step}-${i}`} className="flex items-start gap-1.5 text-[12.5px] leading-snug text-[#4a3426]">
            {'p' in l ? <span className="mt-[2px] shrink-0"><Animal p={l.p} size={15} /></span> : <span className="mt-[5px] h-2 w-2 shrink-0 rounded-full bg-[#c9a24b]" />}
            <span className="min-w-0">{lineText(l, g.players.map(p => p.name), me)}</span>
          </li>
        ))}
      </ul>
    </section>
  );

  // ---------- the footer ----------
  let footer: React.ReactNode = null;
  if (mine && ph === 'start') {
    footer = (
      <Btn size="lg" full disabled={pickX === null || !spots.includes(pickX)} onClick={() => pickX !== null && send(innPick(pickX))} icon={<InnMark p={g.turn} size={22} />} className="!h-14 !text-[16px]">
        {pickX === null ? 'აირჩიე ქალაქი' : `ქარვასლა აქ: ${cityName(pickX)}`}
      </Btn>
    );
  } else if (mine && ph === 'turn') {
    footer = <Btn kind="ghost" size="lg" full onClick={() => send(TRADE_PICK)} icon={<HandCoins />} className="!h-14 !text-[16px]">ვაჭრობა · +{abazi(TRADE)}</Btn>;
  } else if (sent && ph !== 'end') {
    footer = <p className="text-center text-[13px] font-bold text-[#75685a]">გაგზავნილია…</p>;
  } else if (ph === 'end') {
    footer = acts.again ? (
      <div className="grid grid-cols-2 gap-2">
        <Btn kind="ghost" size="lg" onClick={acts.close} className="!h-14 !px-3 whitespace-nowrap">{one ? 'დახურვა' : 'ოთახის დახურვა'}</Btn>
        <Btn size="lg" onClick={acts.again} icon={<RotateCcw />} className="!h-14 !px-3 whitespace-nowrap">კიდევ ერთხელ</Btn>
      </div>
    ) : acts.leave ? <Btn kind="ghost" size="lg" full onClick={acts.leave} icon={<LogOut />} className="!h-14">დახურვა</Btn> : null;
  }

  const rings: MapRing[] = [
    ...(pickX !== null ? [{ x: pickX, tone: 'wine' as const }] : []),
    ...(city !== null && city !== pickX ? [{ x: city, tone: 'wine' as const }] : []),
  ];
  const onCity = (x: number) => {
    if (mine && ph === 'start' && spots.includes(x)) { triggerHaptic(6); setPickX(v => (v === x ? null : x)); return; }
    setCity(x);
  };
  const map = (
    <QaravaniMap owner={g.owner} inn={g.inn} players={n} rings={rings} spots={spots.filter(x => x !== pickX)} first={net} hot={can} sel={road} onRoad={t => setRoad(t)} onCity={onCity} />
  );
  const actFor = focus >= 0 ? focus : g.turn;
  const sheets = (
    <>
      <RoadSheet t={road} g={g} p={actFor} act={mine && ph === 'turn'} me={me} onTake={t => { setRoad(null); send(claimPick(t)); }} onCity={x => { setRoad(null); setCity(x); }} onClose={() => setRoad(null)} />
      <CitySheet x={city} g={g} p={actFor} act={mine} me={me} onInn={x => { setCity(null); send(innPick(x)); }} onRoad={t => { setCity(null); setRoad(t); }} onClose={() => setCity(null)} />
    </>
  );
  return (
    <TableScreen title="ქარავანი" right={right} onClose={onHide} footer={footer}>
      <div className={`py-2 w-full mx-auto ${two ? 'max-w-[1200px] grid grid-cols-2 lg:grid-cols-[3fr_2fr] gap-4 items-start' : 'max-w-[672px] space-y-3.5'}`}>
        {two ? (
          <>
            <div className="min-w-0 sticky top-0 space-y-3">{map}</div>
            <div className="min-w-0 space-y-3.5">{story}{note}{results}{startBox}{diceBox}{takeBox}{innBox}{houseBox}{players}{chronicle}</div>
          </>
        ) : ph === 'end' ? (
          <>{story}{note}{results}{map}{chronicle}</>
        ) : (
          <>{story}{note}{diceBox}{map}{startBox}{takeBox}{innBox}{houseBox}{players}{chronicle}</>
        )}
      </div>
      {sheets}
    </TableScreen>
  );
};
