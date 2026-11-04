import React, { useEffect, useState } from 'react';
import { Check, Crown, House, LogOut, Minus, Plus, RotateCcw, UtensilsCrossed } from 'lucide-react';
import {
  BUILD_PICK, ESTATES, ESTATE_PTS, FEAST_PICK, GOODS, GOOD_NAMES, PASS_PICK, REGION_GOOD, REGION_IN, REGION_NAMES, TBILISI, WORKS,
  canBuild, canFeast, feastPts, giveMax, givePick, givePts, guestsOf, openHere, reach, ridePick, yieldAt,
  type Good, type OkrosGame,
} from '../../../utils/okrosKhana';
import { TableScreen } from '../../../components/games/TableScreen';
import { Btn } from '../../../components/ui/kit';
import { triggerHaptic } from '../../../utils/haptics';
import { useTwoCols } from '../takhti/Board';
import { OkrosBoard } from './Board';
import { GOLD, GOOD_LOOK, GoodDot, GoodsLine, HOUSES, HouseMark, MarketMark, RiderMark, WORK_ICON, WorkCard, goodsText, lineText } from './look';

// „ოქროს ხანა“ being played, online and on one phone alike: the year's story (where the king is, whose ride), the map, and for
// the house on turn its two steps — the ride (a region on the map or its chip; Tbilisi's market asks for two goods) and the deed
// there (a share of the work, an estate, a feast, or the end of the turn). Then the house's goods, the open works, every house,
// the chronicle; at the end the order.

export interface OkrosActs {
  /** a move of the house on turn as one number (`applyPick`); missing: not mine to move now */
  pick?: (n: number) => void;
  again?: () => void;
  close?: () => void;
  leave?: () => void;
}

const Stepper: React.FC<{ k: Good; value: number; max: number; onChange: (v: number) => void }> = ({ k, value, max, onChange }) => (
  <div className="flex items-center gap-2 rounded-2xl bg-white ring-1 ring-[#e8dcc8] pl-2.5 pr-1 py-1">
    <GoodDot k={k} size={24} />
    <span className="min-w-0 flex-1 text-[13.5px] font-bold text-[#4a3426]">{GOOD_NAMES[k]}</span>
    <button type="button" onClick={() => { triggerHaptic(5); onChange(Math.max(0, value - 1)); }} disabled={value <= 0} aria-label={`${GOOD_NAMES[k]}: ერთით ნაკლები`} className="w-11 h-11 rounded-full flex items-center justify-center text-[#7a2028] hover:bg-[#7a2028]/[0.07] disabled:opacity-30 cursor-pointer disabled:cursor-default"><Minus className="w-5 h-5" /></button>
    <span className="w-6 text-center text-[17px] font-bold tabular-nums text-[#2b1e14]" aria-live="polite">{value}</span>
    <button type="button" onClick={() => { triggerHaptic(5); onChange(Math.min(max, value + 1)); }} disabled={value >= max} aria-label={`${GOOD_NAMES[k]}: ერთით მეტი`} className="w-11 h-11 rounded-full flex items-center justify-center text-[#7a2028] hover:bg-[#7a2028]/[0.07] disabled:opacity-30 cursor-pointer disabled:cursor-default"><Plus className="w-5 h-5" /></button>
  </div>
);

/** a deed's card: a mark, what it costs and brings, its button */
const Deed: React.FC<{ icon: React.ReactNode; title: string; text: React.ReactNode; children?: React.ReactNode }> = ({ icon, title, text, children }) => (
  <section className="rounded-2xl bg-[#fffaf0] ring-2 ring-[#e2c27a] px-3.5 py-3 space-y-2.5">
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 inline-flex w-9 h-9 shrink-0 items-center justify-center rounded-xl bg-[#3a2415] text-[#f7e9ad]">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] font-bold leading-tight text-[#2b1e14]">{title}</p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">{text}</p>
      </div>
    </div>
    {children}
  </section>
);

export const OkrosPlay: React.FC<{
  g: OkrosGame;
  /** my house online (−1: I watch); on one phone −1 — the house on turn is the one shown */
  me: number;
  one?: boolean;
  /** my move is on its way to the host */
  sent?: boolean;
  clock?: React.ReactNode;
  acts: OkrosActs;
  right?: React.ReactNode;
  note?: React.ReactNode;
  onHide: () => void;
}> = ({ g, me, one, sent, clock, acts, right, note, onHide }) => {
  const ph = g.phase;
  const two = useTwoCols();
  const [dest, setDest] = useState<number | null>(null);
  const [market, setMarket] = useState<Good[]>([]);
  const max = ph.k === 'act' ? giveMax(g) : [0, 0, 0, 0, 0];
  const [give, setGive] = useState<number[]>(max);
  useEffect(() => { setDest(null); setMarket([]); setGive(ph.k === 'act' ? giveMax(g) : [0, 0, 0, 0, 0]); }, [g.step]); // eslint-disable-line react-hooks/exhaustive-deps
  const focus = me >= 0 ? me : ph.k !== 'end' ? g.turn : -1;
  const mine = ph.k !== 'end' && !!acts.pick && !sent && focus === g.turn;
  const P = focus >= 0 ? g.players[focus] : null;
  const nm = (i: number) => (i === me ? 'შენ' : g.players[i].name);
  const send = (n: number) => { if (!acts.pick) return; triggerHaptic(15); acts.pick(n); };

  // ---------- the ride: where to, what it brings ----------
  const can = mine && ph.k === 'move' ? reach(g) : [];
  const ridePreview = (r: number) => yieldAt(g, g.turn, r, market.length === 2 ? market : [market[0] ?? 0, market[0] ?? 0]);
  const pickDest = (r: number) => { triggerHaptic(6); setDest(d => (d === r ? null : r)); if (r !== TBILISI) setMarket([]); };
  const toggleMarket = (k: Good) => {
    triggerHaptic(5);
    setMarket(m => (m.length < 2 ? [...m, k] : [k]));
  };
  const destReady = dest !== null && (dest !== TBILISI || market.length === 2);
  const rideNow = () => { if (dest === null || !destReady) return; send(dest === TBILISI ? ridePick(TBILISI, market[0], market[1]) : ridePick(dest)); };

  // ---------- the story ----------
  const kingLine = <><Crown className="inline w-3.5 h-3.5 -mt-0.5 mr-1" />წელი {Math.min(g.year, g.years)} / {g.years} · მეფე {REGION_IN[g.king]}ა</>;
  let head: React.ReactNode, sub: React.ReactNode = null;
  const lastLine = g.log[g.log.length - 1];
  const last = !lastLine ? '' : lastLine.k === 'year' ? 'ახალი წელი დაიწყო.' : lineText(lastLine, g.players.map(p => p.name), me);
  if (ph.k === 'move') {
    head = mine ? (one ? <>სვლაა: {g.players[g.turn].name}</> : 'შენი სვლაა') : <>{g.players[g.turn].name} მიდის…</>;
    sub = mine ? 'იარე ორ კუთხემდე (ან დარჩი): კუთხე თავის ნივთს ორს მოგცემს, შენი მამულით +1, მეფესთან +1.' : last;
  } else if (ph.k === 'act') {
    head = mine ? <>{REGION_IN[g.players[g.turn].at]} ხარ: რას გააკეთებ?</> : <>{g.players[g.turn].name} {REGION_IN[g.players[g.turn].at]}ა — ფიქრობს…</>;
    sub = mine ? (ph.got.some(c => c) ? <>მიიღე: {goodsText(ph.got)}. ერთი საქმე — ან სვლის დასრულება.</> : 'ხელი სავსეა: ათზე მეტს ვერ წაიღებ. ერთი საქმე — ან სვლის დასრულება.') : last;
  } else {
    const w = ph.winners;
    head = w.length > 1 ? <>{w.map(i => nm(i)).join(' და ')} — ტოლია!</> : w[0] === me ? 'შენ გაიმარჯვე!' : <>{g.players[w[0]].name} იმარჯვებს!</>;
    sub = 'ოქროს ხანა დასრულდა: ყველაზე მეტი ქულა — მამულებით, დიდი საქმეებით და სუფრებით.';
  }
  const story = (
    <section className="rounded-3xl text-[#fbf6ec] px-4 py-3.5 shadow-[0_14px_30px_-20px_rgba(58,36,21,0.9)] bg-gradient-to-br from-[#4a2e1a] to-[#2b1a0e]" aria-live="polite">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold" style={{ color: '#f0d9a8' }}>{kingLine}</p>
          <p className="mt-0.5 font-serif-ge text-[19px] font-bold leading-snug [overflow-wrap:anywhere]">{head}</p>
          {sub && <p className="mt-1 text-[13px] leading-snug text-[#fbf6ec]/85">{sub}</p>}
        </div>
        {clock}
      </div>
    </section>
  );

  // ---------- the ride's chips ----------
  const rideBox = mine && ph.k === 'move' && (
    <section className="space-y-2">
      <p className="text-[13px] font-bold text-[#4a3426]">სად წახვალ?</p>
      <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="სად წახვალ">
        {can.map(r => {
          const on = r === dest;
          const good = REGION_GOOD[r];
          const y = yieldAt(g, g.turn, r);
          const n = good !== -1 ? y[good] : 2;
          const stay = r === g.players[g.turn].at;
          const work = g.open.some(o => WORKS[o.id].region === r);
          return (
            <button
              key={r}
              type="button"
              onClick={() => pickDest(r)}
              aria-pressed={on}
              className={`flex items-center gap-2 min-h-12 rounded-2xl px-2.5 py-1.5 text-left ring-1 transition cursor-pointer active:scale-[0.98] ${on ? 'bg-[#7a2028] text-[#fbf6ec] ring-[#7a2028]' : 'bg-white text-[#4a3426] ring-[#e8dcc8] hover:ring-[#7a2028]/40'}`}
            >
              {good !== -1 ? <GoodDot k={good} size={26} /> : <MarketMark size={26} />}
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold leading-tight [overflow-wrap:anywhere]">{REGION_NAMES[r]}{stay && <span className={on ? 'text-[#f0d9a8]' : 'text-[#a0703c]'}> · აქ ხარ</span>}</span>
                <span className={`block text-[12px] font-bold leading-tight ${on ? 'text-[#fbf6ec]/85' : 'text-[#75685a]'}`}>
                  {good !== -1 ? `+${n} ${GOOD_NAMES[good]}` : '+2 რაც გინდა'}
                  {g.king === r && ' · მეფე'}{work && ' · საქმე'}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {dest === TBILISI && (
        <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3 py-2.5 space-y-2" role="group" aria-label="ბაზარი">
          <p className="text-[13px] font-bold text-[#4a3426]">თბილისის ბაზარი: აირჩიე ორი ნივთი {market.length > 0 && <span className="text-[#75685a]">· {market.map(k => GOOD_NAMES[k]).join(' + ')}</span>}</p>
          <div className="flex flex-wrap gap-1.5">
            {GOODS.map(k => {
              const c = market.filter(x => x === k).length;
              return (
                <button key={k} type="button" onClick={() => toggleMarket(k)} aria-pressed={c > 0} className={`inline-flex items-center gap-1.5 h-11 pl-1.5 pr-3 rounded-full text-[13px] font-bold ring-1 cursor-pointer ${c ? 'bg-[#fffaf0] ring-2 ring-[#7a2028] text-[#2b1e14]' : 'bg-white ring-[#e8dcc8] text-[#4a3426]'}`}>
                  <GoodDot k={k} size={28} />{GOOD_NAMES[k]}{c > 0 && <span className="tabular-nums text-[#7a2028]">×{c}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );

  // ---------- the deed ----------
  const o = mine && ph.k === 'act' ? openHere(g) : null;
  const giving = give.reduce((a, b) => a + b, 0);
  const finishes = !!o && o.got.every((c, k) => c + give[k] >= WORKS[o.id].need[k]);
  const deeds = mine && ph.k === 'act' && (
    <div className="space-y-2.5">
      {o && max.some(c => c > 0) && (
        <Deed icon={<WORK_ICON className="w-5 h-5" />} title={`წვლილი: ${WORKS[o.id].name}`} text={<>ყოველი ნივთი +{givePts(g)} ქულა{g.king === WORKS[o.id].region ? ' (მეფე აქაა)' : ''}; ვინც დაასრულებს, ბარათს იღებს: +{WORKS[o.id].bonus}.</>}>
          <ul className="space-y-1.5">
            <WorkCard o={o} king={g.king} />
          </ul>
          <div className="space-y-1.5">
            {GOODS.filter(k => max[k] > 0).map(k => <Stepper key={k} k={k} value={give[k]} max={max[k]} onChange={v => setGive(x => x.map((c, j) => (j === k ? v : c)))} />)}
          </div>
          <Btn full size="lg" disabled={!giving} onClick={() => send(givePick(give))} icon={<Check />} className="!h-12">
            {giving ? `გაღება: +${giving * givePts(g) + (finishes ? WORKS[o.id].bonus : 0)} ქულა${finishes ? ' · დასრულება!' : ''}` : 'აირჩიე ნივთები'}
          </Btn>
        </Deed>
      )}
      {canBuild(g) && (
        <Deed icon={<House className="w-5 h-5" />} title={`მამული ${REGION_IN[g.players[g.turn].at]}`} text={<>ხე + ქვა + პური → +{ESTATE_PTS} ქულა; აქ ყოველ სვლაზე ერთი {GOOD_NAMES[REGION_GOOD[g.players[g.turn].at] as Good]} მეტი. დაგრჩა {g.players[g.turn].left}.</>}>
          <Btn full size="lg" onClick={() => send(BUILD_PICK)} icon={<House />} className="!h-12">მამულის აშენება</Btn>
        </Deed>
      )}
      {canFeast(g) && (() => {
        const guests = guestsOf(g);
        return (
          <Deed icon={<UtensilsCrossed className="w-5 h-5" />} title="სუფრა შენს მამულში" text={<>ღვინო + პური → +{feastPts(g)} ქულა{g.king === g.players[g.turn].at ? ' (მეფეც სტუმრადაა)' : ''}{guests.length ? `; სტუმრები (+1): ${guests.map(nm).join(', ')}` : ''}.</>}>
            <Btn full size="lg" onClick={() => send(FEAST_PICK)} icon={<UtensilsCrossed />} className="!h-12">სუფრის გაშლა</Btn>
          </Deed>
        );
      })()}
    </div>
  );

  // ---------- my house (the one on turn on one phone) ----------
  const houseBox = P && (
    <section className={`rounded-2xl bg-white px-3.5 py-3 space-y-2 ${mine ? 'ring-2 ring-[#e2c27a]' : 'ring-1 ring-[#e8dcc8]'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 flex items-center gap-2 text-[14px] font-bold text-[#4a3426] [overflow-wrap:anywhere]"><RiderMark i={focus} size={20} />{focus === me ? 'შენი სახლი' : P.name}</p>
        <p className="shrink-0 text-[13px] font-bold text-[#3a2415]">ქულა <span className="text-[18px] tabular-nums">{P.pts}</span></p>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {GOODS.map(k => (
          <div key={k} className="flex flex-col items-center gap-0.5 rounded-xl py-1.5" style={{ background: GOOD_LOOK[k].tint }}>
            <GoodDot k={k} size={24} />
            <span className="text-[16px] font-bold tabular-nums leading-none" style={{ color: GOOD_LOOK[k].ink }}>{P.goods[k]}</span>
            <span className="text-[11px] font-bold leading-none" style={{ color: GOOD_LOOK[k].ink }}>{GOOD_NAMES[k]}</span>
          </div>
        ))}
      </div>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] font-bold text-[#75685a]">
        <span className="inline-flex items-center gap-1">{REGION_IN[P.at]}ა</span>
        <span className="inline-flex items-center gap-1"><HouseMark i={focus} size={15} />მამული {ESTATES - P.left}/{ESTATES}</span>
        <span className="inline-flex items-center gap-1"><WORK_ICON className="w-3.5 h-3.5" />საქმე {P.works.length}</span>
      </p>
    </section>
  );

  // ---------- the works, the houses, the chronicle ----------
  const worksBox = g.open.length > 0 && ph.k !== 'end' && (
    <section className="space-y-2">
      <p className="text-[13px] font-bold text-[#4a3426]">მეფის დიდი საქმეები · ღიაა {g.open.length}{g.deck.length ? `, რიგში ${g.deck.length}` : ''}</p>
      <ul className={`grid gap-2 ${two ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
        {g.open.map(x => <WorkCard key={x.id} o={x} king={g.king} here={!!P && WORKS[x.id].region === P.at} note />)}
      </ul>
    </section>
  );
  const ordered = ph.k === 'end' ? ph.order : g.players.map((_, i) => i);
  const players = (
    <section className="space-y-2">
      {ph.k === 'end' && <p className="text-[13px] font-bold text-[#4a3426]">შედეგები</p>}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ordered.map(i => {
          const p = g.players[i];
          const turn = ph.k !== 'end' && g.turn === i;
          const won = ph.k === 'end' && ph.winners.includes(i);
          return (
            <li key={i} className={`min-w-0 rounded-2xl px-2.5 py-2 ${turn || won ? 'bg-[#fffaf0] ring-2 ring-[#e2c27a]' : 'bg-white ring-1 ring-[#e8dcc8]'}`}>
              <p className="flex items-center justify-between gap-1.5">
                <span className="min-w-0 flex items-center gap-1.5 text-[13px] font-bold leading-tight text-[#4a3426] [overflow-wrap:anywhere]">
                  {won ? <Crown className="w-4 h-4 shrink-0" style={{ color: GOLD }} /> : <RiderMark i={i} size={16} />}{p.name}{i === me && <span className="text-[11.5px] text-[#a0703c]"> · შენ</span>}
                </span>
                <span className="shrink-0 text-[15px] font-bold tabular-nums text-[#3a2415]">{p.pts}</span>
              </p>
              <p className="mt-1 text-[11.5px] font-bold leading-tight text-[#75685a]">{REGION_NAMES[p.at]}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] font-bold text-[#75685a]">
                <span className="inline-flex items-center gap-0.5"><HouseMark i={i} size={13} />{ESTATES - p.left}</span>
                <span className="inline-flex items-center gap-0.5"><WORK_ICON className="w-3 h-3" />{p.works.length}</span>
                <GoodsLine counts={p.goods} size={13} empty="" className="text-[11.5px]" />
              </p>
              {turn && <p className="mt-1 text-[11.5px] font-bold text-[#8a5a1c]">{ph.k === 'move' ? 'მიდის…' : 'საქმეს აკეთებს…'}</p>}
            </li>
          );
        })}
      </ul>
      {ph.k === 'end' && (
        <ul className="space-y-1">
          {ph.order.map(i => {
            const p = g.players[i];
            return <li key={i} className="text-[12.5px] leading-snug text-[#75685a]"><b className="text-[#4a3426]">{nm(i)}</b>: {p.works.length ? p.works.map(w => WORKS[w].name).join(', ') : 'საქმე არ დაუსრულებია'} · მამული {ESTATES - p.left}</li>;
          })}
        </ul>
      )}
    </section>
  );
  const chronicle = g.log.length > 1 && (
    <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3.5 py-3">
      <p className="text-[12.5px] font-bold text-[#75685a]">მატიანე</p>
      <ul className="mt-1 space-y-0.5">
        {g.log.slice(-6).reverse().map((l, k) => <li key={`${g.step}-${k}`} className="text-[12.5px] leading-snug text-[#4a3426]">{lineText(l, g.players.map(p => p.name), me)}</li>)}
      </ul>
    </section>
  );

  // ---------- the footer ----------
  let footer: React.ReactNode = null;
  if (mine && ph.k === 'move') {
    footer = (
      <Btn size="lg" full disabled={!destReady} onClick={rideNow} icon={<Check />} className="!h-14 !text-[16px]">
        {dest === null ? 'აირჩიე კუთხე' : dest === TBILISI && market.length < 2 ? 'აირჩიე ორი ნივთი' : `წასვლა: ${REGION_NAMES[dest]} · +${goodsText(ridePreview(dest))}`}
      </Btn>
    );
  } else if (mine && ph.k === 'act') {
    footer = <Btn kind="ghost" size="lg" full onClick={() => send(PASS_PICK)} className="!h-14 !text-[16px]">სვლის დასრულება</Btn>;
  } else if (ph.k !== 'end' && sent) {
    footer = <p className="text-center text-[13px] font-bold text-[#75685a]">გაგზავნილია…</p>;
  } else if (ph.k === 'end') {
    footer = acts.again ? (
      <div className="grid grid-cols-2 gap-2">
        <Btn kind="ghost" size="lg" onClick={acts.close} className="!h-14 !px-3 whitespace-nowrap">{one ? 'დახურვა' : 'ოთახის დახურვა'}</Btn>
        <Btn size="lg" onClick={acts.again} icon={<RotateCcw />} className="!h-14 !px-3 whitespace-nowrap">კიდევ ერთხელ</Btn>
      </div>
    ) : acts.leave ? <Btn kind="ghost" size="lg" full onClick={acts.leave} icon={<LogOut />} className="!h-14">დახურვა</Btn> : null;
  }

  const map = <OkrosBoard g={g} reach={mine && ph.k === 'move' ? can : undefined} sel={dest} onPick={pickDest} />;
  return (
    <TableScreen title="ოქროს ხანა" right={right} onClose={onHide} footer={footer}>
      <div className={`py-2 w-full mx-auto ${two ? 'max-w-[1200px] grid grid-cols-2 lg:grid-cols-[3fr_2fr] gap-4 items-start' : 'max-w-[672px] space-y-3.5'}`}>
        {two ? (
          <>
            <div className="min-w-0 sticky top-0 space-y-3">{map}</div>
            <div className="min-w-0 space-y-3.5">{story}{note}{rideBox}{deeds}{ph.k === 'end' ? <>{players}{houseBox}</> : <>{houseBox}{players}</>}{worksBox}{chronicle}</div>
          </>
        ) : ph.k === 'end' ? (
          <>{story}{note}{players}{map}{houseBox}{chronicle}</>
        ) : ph.k === 'act' ? (
          <>{story}{note}{deeds}{map}{houseBox}{players}{worksBox}{chronicle}</>
        ) : (
          <>{story}{note}{map}{rideBox}{houseBox}{players}{worksBox}{chronicle}</>
        )}
      </div>
    </TableScreen>
  );
};
