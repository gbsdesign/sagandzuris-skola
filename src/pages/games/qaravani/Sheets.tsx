import React from 'react';
import { ChevronRight, Home, Mountain, Ship } from 'lucide-react';
import {
  CITY_TRACKS, GUEST, INN_COST, INN_PTS, INN_WEIGHT, START_MAX, TRACKS, canTake, diceFor, hasPair, hasSix, holdersOf, innSpots, joins,
  netOf, scoreOf, sumsOf, weightIn, type QGame,
} from '../../../utils/qaravani';
import { Q_CITIES, Q_CITY_INFO, Q_GOODS, Q_PASS } from '../../../data/qaravaniMap';
import { Btn, Sheet } from '../../../components/ui/kit';
import { Animal, Coin, GoodBadge, InnMark, RoadCells, cargoOf, cityName, roadName, worthOf } from './look';

// „ქარავანი“'s two windows: a road (its cells, the dice it wants — a mountain road a pair, a water road a six —, the other lane of
// a double road, its owner, and on turn the road to take or why not) and a city (its worth and cargo, who leads there now, its
// caravanserais, its old name and story, the roads out of it, and on turn the caravanserai to build or why not).

const Line: React.FC<{ icon?: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <p className="flex items-start gap-2 text-[13px] leading-snug text-[#4a3426]">{icon && <span className="mt-0.5 shrink-0 text-[#7a2028] [&>svg]:w-4 [&>svg]:h-4">{icon}</span>}<span className="min-w-0">{children}</span></p>
);
const Warn: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-3.5 py-2.5 text-[13px] font-bold leading-snug text-amber-800">{children}</p>
);

/** what my points would be now with this road or this caravanserai, less what they are */
export const gainWith = (g: QGame, p: number, road?: number, inn?: number) => {
  const n = g.players.length, before = scoreOf(g.owner, g.inn, n)[p].total;
  const owner = road === undefined ? g.owner : g.owner.map((o, t) => (t === road ? p : o));
  const inns = inn === undefined ? g.inn : g.inn.map((m, x) => (x === inn ? m | (1 << p) : m));
  return scoreOf(owner, inns, n)[p].total - before;
};
export const gainText = (d: number) => (d > 0 ? `+${d}` : d < 0 ? `${d}` : '±0');

/** the dice a road takes, as „5 + 3“ */
export const diceText = (dice: readonly number[], n: number) => {
  const idx = diceFor(dice, n) ?? [];
  return `${idx.length > 1 ? 'კამათლები' : 'კამათელი'} ${idx.map(i => dice[i]).join(' + ')}`;
};

/** why house `p` can not take road `t` now (null: it can, or it is taken) */
const whyNot = (g: QGame, p: number, t: number): string | null => {
  const tr = TRACKS[t], pl = g.players[p], n = g.players.length;
  if (g.owner[t] >= 0 || canTake(g, p, t)) return null;
  if (tr.twin >= 0 && g.owner[tr.twin] === p) return 'ორმაგი გზის მეორე ზოლი უკვე შენია — ორივეს ვერ დაიკავებ.';
  if (tr.twin >= 0 && n <= 3 && g.owner[tr.twin] !== -1) return '2–3 მოთამაშით ორმაგი გზის მხოლოდ ერთი ზოლი გამოიყენება.';
  if (pl.carts < tr.n) return `ურმები არ გყოფნის: ${tr.n} სჭირდება, დაგრჩა ${pl.carts}.`;
  if (!joins(g.owner, g.inn, pl.carts, n, p, t)) return 'ეს გზა შენს ქარავანს არ ეხება: გზა შენი გზების ბოლოებიდან ან შენი ქარვასლის ქალაქიდან უნდა გავიდეს.';
  if (!sumsOf(g.dice).includes(tr.n)) return `კამათლებით ${tr.n} არ იკრიბება (${g.dice.join(' · ')}). კამათელი აბაზით ერთით შეცვალე — ან ივაჭრე.`;
  if (tr.mountain && !hasPair(g.dice)) return 'მთის გზას კამათლებში წყვილი სჭირდება — უღელტეხილზე ამინდი ცუდია.';
  if (tr.water && !hasSix(g.dice)) return 'ზღვის გზას კამათლებში ექვსიანი სჭირდება — ზღვა ღელავს.';
  return 'ახლა ამ გზას ვერ დაიკავებ.';
};

export const RoadSheet: React.FC<{
  t: number | null; g: QGame;
  /** the house this phone moves for, and whether it may take a road now */
  p: number; act: boolean; me: number;
  onTake: (t: number) => void; onCity: (x: number) => void; onClose: () => void;
}> = ({ t, g, p, act, me, onTake, onCity, onClose }) => {
  if (t === null) return null;
  const tr = TRACKS[t], owner = g.owner[t], n = g.players.length;
  const twin = tr.twin >= 0 ? tr.twin : -1;
  const pass = Q_PASS[tr.route];
  const ok = act && canTake(g, p, t);
  const why = act ? whyNot(g, p, t) : null;
  const gain = ok ? gainWith(g, p, t) : 0;
  return (
    <Sheet open onClose={onClose} title={roadName(t)}>
      <div className="space-y-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <RoadCells t={t} owner={owner} cell={26} />
          <span className="rounded-full bg-[#e2c27a]/30 px-2.5 py-1 text-[13px] font-black tabular-nums text-[#6b4a1f]">{tr.n} უჯრა · {tr.n} ურემი</span>
        </div>
        <div className="space-y-2">
          <Line>გზის გასახსნელად ერთი, ორი ან სამი კამათლის ჯამი <b>{tr.n}</b> უნდა იყოს.</Line>
          {tr.mountain && <Line icon={<Mountain />}><b>მთის გზა</b>{pass ? ` · უღელტეხილი ${pass}` : ''}: კამათლებში წყვილიც უნდა იყოს — კარგი ამინდი.</Line>}
          {tr.water && <Line icon={<Ship />}><b>ზღვის გზა</b>: კამათლებში ექვსიანიც უნდა იყოს — წყნარი ზღვა.</Line>}
          {twin >= 0 && (
            <Line>
              <b>ორმაგი გზა</b> — მეორე ზოლი:{' '}
              {g.owner[twin] >= 0 ? `უკავია — ${g.owner[twin] === me ? 'შენ' : g.players[g.owner[twin]].name}` : n <= 3 && owner >= 0 ? 'დაიკეტა (2–3 მოთამაშით ერთი ზოლია)' : 'თავისუფალია'}.
            </Line>
          )}
        </div>
        {owner >= 0 && (
          <p className="flex items-center gap-2.5 rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3 py-2.5 text-[14px] font-bold text-[#2b1e14]">
            <Animal p={owner} size={30} />{owner === me ? 'ეს გზა შენია' : <>გზა უკავია: {g.players[owner].name}</>}
          </p>
        )}
        {ok && (
          <div className="space-y-1.5">
            <Btn full size="lg" onClick={() => onTake(t)} className="!h-14 !text-[15.5px]">დაკავება · {diceText(g.dice, tr.n)}</Btn>
            <p className="text-center text-[12.5px] font-bold text-[#75685a]">ქულა ახლა: {gainText(gain)} · სვლა დასრულდება</p>
          </div>
        )}
        {why && <Warn>{why}</Warn>}
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

/** why house `p` can not put a caravanserai in city `x` now (null: it can) */
const innWhy = (g: QGame, p: number, x: number): string | null => {
  if (innSpots(g, p).includes(x)) return null;
  const pl = g.players[p], mine = (g.inn[x] & (1 << p)) !== 0;
  if (g.phase.k === 'start') {
    if (g.inn[x]) return 'აქ უკვე დგას ქარვასლა.';
    if (worthOf(x) > START_MAX) return `დიდი ქალაქია: პირველი ქარვასლა ${START_MAX}-მდე ღირსების ქალაქში დგება.`;
    return 'მეზობელ ქალაქში უკვე დგას ქარვასლა — პირველი ქარვასლები ერთმანეთს არ ესაზღვრება.';
  }
  if (pl.inns <= 0) return 'ქარვასლები აღარ დაგრჩა.';
  if (mine) return 'აქ უკვე გაქვს ქარვასლა.';
  if (!netOf(g.owner, g.inn, p).has(x)) return 'ქარვასლა მხოლოდ შენი ქარავნის ქალაქში შენდება — ჯერ გზა მოიყვანე აქამდე.';
  if (pl.coins < INN_COST) return `${INN_COST} აბაზი სჭირდება, გაქვს ${pl.coins}.`;
  return null;
};

export const CitySheet: React.FC<{
  x: number | null; g: QGame;
  /** the house this phone moves for, whether it may build now, and this phone's own house (−1: none) */
  p: number; act: boolean; me: number;
  onInn: (x: number) => void; onRoad: (t: number) => void; onClose: () => void;
}> = ({ x, g, p, act, me, onInn, onRoad, onClose }) => {
  if (x === null) return null;
  const c = Q_CITIES[x], [old, note] = Q_CITY_INFO[x] ?? ['', ''], n = g.players.length;
  const w = worthOf(x), cargo = cargoOf(x), good = cargo >= 0 ? Q_GOODS[cargo] : null;
  const weights = weightIn(g.owner, g.inn, n, x), lead = holdersOf(g.owner, g.inn, n, x);
  const here = weights.map((v, q) => ({ q, v })).filter(o => o.v > 0).sort((a, b) => b.v - a.v);
  const nm = (q: number) => (q === me ? 'შენ' : g.players[q].name);
  const start = g.phase.k === 'start';
  const can = act && innSpots(g, p).includes(x);
  // why not: at the start for any city; later only for my caravan's cities (elsewhere nobody could build anyway)
  const why = act && !can && (start || (g.phase.k === 'turn' && netOf(g.owner, g.inn, p).has(x))) ? innWhy(g, p, x) : null;
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
        <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3.5 py-3 space-y-2.5">
          <div className="flex items-start gap-3">
            <span className="inline-flex w-11 h-11 shrink-0 items-center justify-center rounded-full font-serif-ge text-[20px] font-black text-[#7a2028] ring-2 ring-[#7a2028]" style={{ background: w >= 3 ? '#efd896' : '#fbf6ec' }}>{w}</span>
            <p className="min-w-0 text-[13px] leading-snug text-[#4a3426]">
              <b>ღირსება {w}</b>: ბოლოს ქალაქს ის იღებს, ვისაც აქ მეტი გზა შედის (ქარვასლა {INN_WEIGHT} გზად ითვლება); ტოლობისას ღირსება იყოფა.
            </p>
          </div>
          {good && (
            <div className="flex items-start gap-3">
              <GoodBadge k={cargo} size={44} />
              <p className="min-w-0 text-[13px] leading-snug text-[#4a3426]"><b>ტვირთი: {good.name}</b> — {good.from}. ქალაქი შენს ქარავანში რომ მოხვდება, ეს ტვირთიც შენია.</p>
            </div>
          )}
          <div className="space-y-1.5 border-t border-[#efe5d3] pt-2.5">
            {here.length ? here.map(({ q, v }) => (
              <p key={q} className="flex items-center gap-2 text-[13px] text-[#2b1e14]">
                <Animal p={q} size={24} />
                <span className="min-w-0 flex-1 font-bold truncate">{nm(q)}</span>
                {(g.inn[x] & (1 << q)) !== 0 && <InnMark p={q} size={18} />}
                <span className="tabular-nums font-bold">{v}</span>
                {lead.includes(q) && <span className="rounded-full bg-[#e2c27a]/35 px-2 py-0.5 text-[11.5px] font-bold text-[#6b4a1f]">{lead.length > 1 ? 'ტოლია' : 'წინაა'}</span>}
              </p>
            )) : <p className="flex items-center gap-2 text-[13px] text-[#75685a]"><Home className="w-4 h-4" />აქ ჯერ არავინ შემოსულა.</p>}
          </div>
        </section>
        {can && (
          <div className="space-y-1.5">
            <Btn full size="lg" onClick={() => onInn(x)} icon={<InnMark p={p} size={22} />} className="!h-14 !text-[15.5px]">
              {start ? 'პირველი ქარვასლა აქ' : `ქარვასლის აშენება · ${INN_COST} აბაზი`}
            </Btn>
            <p className="text-center text-[12.5px] font-bold text-[#75685a]">
              {start ? 'აქედან დაიწყება შენი ქარავანი' : <>ქულა ახლა: {gainText(gainWith(g, p, undefined, x))} · სხვისი გზა აქ <span className="inline-flex items-center gap-0.5 align-middle">+{GUEST} <Coin size={14} /></span> · ბოლოს +{INN_PTS}</>}
            </p>
          </div>
        )}
        {why && <Warn>{why}</Warn>}
        <section className="space-y-1.5">
          <p className="text-[12.5px] font-bold text-[#75685a]">გზები აქედან · {roads.length}</p>
          <ul className="divide-y divide-[#efe5d3] rounded-2xl bg-white ring-1 ring-[#e8dcc8]">
            {roads.map(t => {
              const tr = TRACKS[t], other = tr.a === x ? tr.b : tr.a, o = g.owner[t];
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
