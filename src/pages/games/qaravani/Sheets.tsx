import React, { useState } from 'react';
import { ChevronRight, Home, Mountain, Ship } from 'lucide-react';
import { CITY_TRACKS, INNS, LOCO, SCORE, TICKETS, TRACKS, claimPick, innPick, type Pay } from '../../../utils/qaravani';
import { innPays, roadPays, type QView } from '../../../utils/qaravaniRoom';
import { Q_CITIES, Q_CITY_INFO, Q_PASS, Q_TICKET_TEXT } from '../../../data/qaravaniMap';
import { Btn, Sheet } from '../../../components/ui/kit';
import { Animal, Envelope, InnMark, KIND, PayChips, RoadCells, cityName, roadLook, roadName } from './look';

// „ქარავანი“'s two windows: a road (its cells, colour, mountain or ship, the other lane of a double road, its owner — and on
// turn the ways to pay for it) and a city (its old name and story, its inn, the roads out of it — and on turn the inn to build).

const NTH = ['პირველ', 'მეორე', 'მესამე'];
/** the payments in the order a player most likely wants: the fewest locomotives, then the colour held most */
const sortPays = (pays: Pay[], hand: readonly number[]) => [...pays].sort((a, b) => a.l - b.l || (hand[b.c] ?? 0) - (hand[a.c] ?? 0));

const PayList: React.FC<{ pays: Pay[]; n: number; label: string; onPay: (p: Pay) => void }> = ({ pays, n, label, onPay }) => {
  const [all, setAll] = useState(false);
  const shown = all ? pays : pays.slice(0, 4);
  return (
    <div className="space-y-2">
      {pays.length > 1 && <p className="text-[12.5px] font-bold text-[#75685a]">რით გადაიხდი?</p>}
      {shown.map(p => (
        <button
          key={`${p.c}-${p.l}`}
          type="button"
          onClick={() => onPay(p)}
          className="w-full min-h-14 rounded-2xl bg-[#7a2028] px-3.5 py-2 flex items-center gap-3 text-left text-white cursor-pointer active:scale-[0.99] transition shadow-[0_8px_18px_-12px_rgba(122,32,40,0.9)]"
        >
          <span className="min-w-0 flex-1"><PayChips c={p.c} l={p.l} n={n} dark /></span>
          <span className="shrink-0 text-[14px] font-bold">{label}</span>
        </button>
      ))}
      {pays.length > shown.length && (
        <button type="button" onClick={() => setAll(true)} className="h-10 px-3 rounded-full text-[13px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer">
          სხვა ვარიანტები · {pays.length - shown.length}
        </button>
      )}
    </div>
  );
};

const Line: React.FC<{ icon?: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <p className="flex items-start gap-2 text-[13px] leading-snug text-[#4a3426]">{icon && <span className="mt-0.5 shrink-0 text-[#7a2028] [&>svg]:w-4 [&>svg]:h-4">{icon}</span>}<span className="min-w-0">{children}</span></p>
);

/** why this road can not be taken now */
const whyNot = (v: QView, hand: readonly number[], me: number, t: number) => {
  const tr = TRACKS[t];
  if (tr.twin >= 0 && v.owner[tr.twin] === me) return 'ორმაგი გზის მეორე ზოლი უკვე შენია — ორივეს ვერ დაიკავებ.';
  if (tr.twin >= 0 && v.names.length <= 3 && v.owner[tr.twin] !== -1) return '2–3 მოთამაშით ორმაგი გზის მხოლოდ ერთი ზოლი გამოიყენება.';
  if (v.carts[me] < tr.n) return `ურმები არ გყოფნის: ${tr.n} სჭირდება, გაქვს ${v.carts[me]}.`;
  const what = tr.color === 8 ? 'ერთი ფერის' : `${roadLook(tr.color).adj} (${KIND[tr.color].name})`;
  const best = tr.color === 8 ? Math.max(...hand.slice(0, 8)) : hand[tr.color];
  return `ბარათები არ გყოფნის: სჭირდება ${tr.n} ${what} ბარათი — ორთქლმავალიც ითვლება${tr.ships ? `, ${tr.ships} ორთქლმავალი კი აუცილებელია` : ''}. გაქვს ${best} და ${hand[LOCO]} ორთქლმავალი.`;
};

export const RoadSheet: React.FC<{
  t: number | null; v: QView; me: number;
  /** my hand, and whether I may take a road now */
  hand: readonly number[] | null; canClaim: boolean;
  onClaim: (pick: number) => void; onCity: (x: number) => void; onClose: () => void;
}> = ({ t, v, me, hand, canClaim, onClaim, onCity, onClose }) => {
  if (t === null) return null;
  const tr = TRACKS[t], L = roadLook(tr.color), owner = v.owner[t];
  const pays = canClaim && hand && owner === -1 ? sortPays(roadPays(v, hand, me, t), hand) : [];
  const twin = tr.twin >= 0 ? tr.twin : -1;
  const pass = Q_PASS[tr.route];
  return (
    <Sheet open onClose={onClose} title={roadName(t)}>
      <div className="space-y-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <RoadCells t={t} owner={owner} cell={26} />
          <span className="rounded-full bg-[#e2c27a]/30 px-2.5 py-1 text-[13px] font-black tabular-nums text-[#6b4a1f]">{tr.n} უჯრა · {SCORE[tr.n]} ქულა</span>
        </div>
        <div className="space-y-2">
          <Line>{tr.color === 8 ? <><b>ქვის გზა</b> — ნებისმიერი ერთი ფერის ბარათებით</> : <><b>{L.adj} გზა</b> — ბარათი: {KIND[tr.color].name}; ორთქლმავალი ნებისმიერ ფერს ცვლის</>}</Line>
          {tr.mountain && (
            <Line icon={<Mountain />}>
              <b>მთის გზა</b>{pass ? ` · უღელტეხილი: ${pass}` : ''}. ბარათებს რომ გადადებ, დასტიდან 3 ბარათი გაიხსნება: ყოველ შენი ფერის ბარათზე და
              ორთქლმავალზე კიდევ ერთი დაგჭირდება — ან უარს იტყვი და ბარათები ხელში დაგრჩება.
            </Line>
          )}
          {tr.ships > 0 && <Line icon={<Ship />}><b>გემის გზა</b>: {tr.ships} ორთქლმავალი აუცილებელია, დანარჩენი უჯრები — ერთი ფერით ან ორთქლმავლებით.</Line>}
          {twin >= 0 && (
            <Line>
              <b>ორმაგი გზა</b> — მეორე ზოლი {roadLook(TRACKS[twin].color).adj}:{' '}
              {v.owner[twin] >= 0 ? `უკავია — ${v.names[v.owner[twin]]}` : v.names.length <= 3 && owner >= 0 ? 'დაიკეტა (2–3 მოთამაშით ერთი ზოლი)' : 'თავისუფალია'}.
            </Line>
          )}
        </div>
        {owner >= 0 && (
          <p className="flex items-center gap-2.5 rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3 py-2.5 text-[14px] font-bold text-[#2b1e14]">
            <Animal p={owner} size={30} />{owner === me ? 'ეს გზა შენია' : <>გზა უკავია: {v.names[owner]}</>}
          </p>
        )}
        {canClaim && hand && owner === -1 && (pays.length
          ? <PayList pays={pays} n={tr.n} label={tr.mountain ? 'ვცდი' : 'დაკავება'} onPay={p => onClaim(claimPick(t, p.c, p.l))} />
          : <p className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-3.5 py-2.5 text-[13px] font-bold leading-snug text-amber-800">{whyNot(v, hand, me, t)}</p>)}
        <div className="grid grid-cols-2 gap-2">
          {[tr.a, tr.b].map(x => (
            <button key={x} type="button" onClick={() => onCity(x)} className="min-h-11 rounded-full bg-white ring-1 ring-[#e8dcc8] px-3 flex items-center justify-between gap-1 text-[13.5px] font-bold text-[#4a3426] cursor-pointer hover:ring-[#7a2028]/40">
              <span className="truncate">{cityName(x)}</span><ChevronRight className="w-4 h-4 shrink-0 text-[#7a2028]" />
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
};

export const CitySheet: React.FC<{
  x: number | null; v: QView; me: number; hand: readonly number[] | null; canBuild: boolean;
  /** my letters (to name the ones of this city) */
  letters: readonly number[];
  onInn: (pick: number) => void; onRoad: (t: number) => void; onClose: () => void;
}> = ({ x, v, me, hand, canBuild, letters, onInn, onRoad, onClose }) => {
  if (x === null) return null;
  const c = Q_CITIES[x], [old, note] = Q_CITY_INFO[x] ?? ['', ''], inn = v.inn[x];
  const cost = me >= 0 ? INNS - v.inns[me] + 1 : 0;
  const pays = canBuild && hand ? sortPays(innPays(v, hand, me, x), hand) : [];
  const mine = letters.filter(id => TICKETS[id].a === x || TICKETS[id].b === x);
  const roads = [...CITY_TRACKS[x]].sort((a, b) => cityName(TRACKS[a].a === x ? TRACKS[a].b : TRACKS[a].a).localeCompare(cityName(TRACKS[b].a === x ? TRACKS[b].b : TRACKS[b].a), 'ka'));
  return (
    <Sheet open onClose={onClose} title={c.name}>
      <div className="space-y-3.5">
        {(old || note || c.sub || c.outside) && (
          <div className="space-y-1">
            {(old || c.sub) && <p className="text-[12.5px] font-bold text-[#7a2028]">{[old && `ძველად: ${old}`, c.sub].filter(Boolean).join(' · ')}</p>}
            {note && <p className="text-[13.5px] leading-snug text-[#2b1e14]">{note}</p>}
            {c.outside && <p className="text-[12px] text-[#75685a]">დღევანდელი საზღვრის გარეთ.</p>}
          </div>
        )}
        <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3.5 py-3 space-y-2">
          <p className="flex items-center gap-2 text-[14px] font-bold text-[#2b1e14]">
            {inn >= 0 ? <><InnMark p={inn} size={22} />ქარვასლა: {inn === me ? 'შენია' : v.names[inn]}</> : <><Home className="w-5 h-5 text-[#9a8b7b]" />ქარვასლა ჯერ არავის აქვს</>}
          </p>
          <p className="text-[12.5px] leading-snug text-[#75685a]">თამაშის ბოლოს ქარვასლის პატრონი ამ ქალაქიდან გამავალ სხვის ერთ გზას თავისად ჩათვლის — ყველა წერილისთვის ერთსა და იმავეს.</p>
          {canBuild && hand && inn === -1 && (v.inns[me] <= 0
            ? <p className="text-[13px] font-bold text-[#9a6a10]">ქარვასლები აღარ დაგრჩა.</p>
            : pays.length
              ? <PayList pays={pays} n={cost} label="აშენება" onPay={p => onInn(innPick(x, p.c, p.l))} />
              : <p className="text-[13px] font-bold leading-snug text-[#9a6a10]">ბარათები არ გყოფნის: {NTH[cost - 1]} ქარვასლას {cost} ერთი ფერის ბარათი სჭირდება.</p>)}
        </section>
        {mine.length > 0 && (
          <section className="space-y-1.5">
            <p className="text-[12.5px] font-bold text-[#75685a]">შენი წერილები</p>
            {mine.map(id => (
              <p key={id} className="flex items-start gap-2 text-[13px] leading-snug text-[#2b1e14]">
                <Envelope size={18} /><span><b>{cityName(TICKETS[id].a)} — {cityName(TICKETS[id].b)}</b> · {TICKETS[id].v} · <span className="text-[#75685a]">{Q_TICKET_TEXT[id]}</span></span>
              </p>
            ))}
          </section>
        )}
        <section className="space-y-1.5">
          <p className="text-[12.5px] font-bold text-[#75685a]">გზები აქედან · {roads.length}</p>
          <ul className="divide-y divide-[#efe5d3] rounded-2xl bg-white ring-1 ring-[#e8dcc8]">
            {roads.map(t => {
              const tr = TRACKS[t], other = tr.a === x ? tr.b : tr.a, o = v.owner[t];
              return (
                <li key={t}>
                  <button type="button" onClick={() => onRoad(t)} className="w-full min-h-12 px-3 py-2 flex items-center gap-2.5 text-left cursor-pointer hover:bg-[#7a2028]/[0.04]">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-bold text-[#2b1e14] truncate">{cityName(other)}</span>
                      <span className="mt-1 block"><RoadCells t={t} owner={o} cell={14} /></span>
                    </span>
                    {o >= 0 ? <Animal p={o} size={24} /> : <span className="text-[12px] font-bold text-[#9a8b7b]">{tr.n}</span>}
                    <ChevronRight className="w-4 h-4 shrink-0 text-[#7a2028]" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </Sheet>
  );
};
