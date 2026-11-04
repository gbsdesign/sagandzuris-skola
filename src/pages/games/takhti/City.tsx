import React from 'react';
import { CARDS, type Res } from '../../../data/takhtiCards';
import { CAPITALS, RES_IDS, SIDES, countOf, flexOf, prodOf, scoreOf, symbolsOf, tradePrice, type TakhtiGame } from '../../../utils/oriTakhti';
import { Sheet } from '../../../components/ui/kit';
import { CardFace, CoinMark, LaurelMark, ResMark, SciMark, TokenDisc, TokenTile, TypeMark, WonderMark, WonderTile } from './look';
import { RES_INFO, SCI_NAMES, SCI_ORDER, SIDE_COLOR, TYPE_INFO, TYPE_ORDER } from './words';

// A kingdom of „ორი ტახტი“: a small panel (coins, points, what it makes, its wisdoms, its cards by colour, its monuments and
// tokens) that opens the whole kingdom in a window — every card by name, the bank's prices for it, the points so far.

const Head: React.FC<{ g: TakhtiGame; who: number; me: number }> = ({ g, who, me }) => {
  const c = g.cities[who];
  return (
    <div className="flex items-start gap-1.5">
      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SIDE_COLOR[who] }} />
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-bold leading-tight text-[#2b1e14] [overflow-wrap:anywhere]">{g.names[who]}{who === me && <span className="text-[#a0703c]"> · შენ</span>}</span>
        <span className="block text-[11.5px] leading-tight text-[#75685a]">{SIDES[who]} · {CAPITALS[who]}</span>
      </span>
      <span className="shrink-0 flex flex-col items-end gap-0.5">
        <span className="flex items-center gap-0.5 text-[14px] font-bold tabular-nums text-[#4a3010]"><CoinMark n="" size={17} />{c.coins}</span>
        <span className="flex items-center gap-0.5 text-[13px] font-bold tabular-nums text-[#2f4f22]"><LaurelMark n="" size={17} />{scoreOf(g, who).total}</span>
      </span>
    </div>
  );
};

/** a kingdom's small panel */
export const CityPanel: React.FC<{ g: TakhtiGame; who: number; me: number; active: boolean; onOpen: () => void }> = ({ g, who, me, active, onOpen }) => {
  const c = g.cities[who], prod = prodOf(c), flex = flexOf(c), sym = new Set(symbolsOf(c));
  return (
    <button type="button" onClick={onOpen} className={`min-w-0 w-full rounded-2xl bg-white px-2.5 py-2.5 text-left cursor-pointer ${active ? 'ring-2 ring-[#c9a24b]' : 'ring-1 ring-[#e8dcc8]'}`} aria-label={`${g.names[who]} — სამეფოს ნახვა`}>
      <Head g={g} who={who} me={me} />
      <span className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {RES_IDS.map(r => (
          <span key={r} className={`flex items-center gap-0.5 text-[12px] font-bold tabular-nums ${prod[r] ? 'text-[#2b1e14]' : 'text-[#c2b6a6]'}`}><ResMark r={r} size={16} faint={!prod[r]} />{prod[r]}</span>
        ))}
        {flex.map((f, i) => (
          <span key={i} className="flex items-center gap-px rounded-md bg-[#f3ecdd] px-0.5 py-px">{[...f].map(r => <ResMark key={r} r={r as Res} size={12} />)}</span>
        ))}
      </span>
      <span className="mt-1.5 flex flex-wrap items-center gap-0.5">
        {SCI_ORDER.map(s => <SciMark key={s} s={s} size={17} faint={!sym.has(s)} />)}
      </span>
      <span className="mt-1.5 flex flex-wrap items-center gap-1">
        {TYPE_ORDER.map(t => {
          const n = countOf(c, t);
          return <span key={t} className={`flex items-center gap-px text-[12px] font-bold tabular-nums ${n ? 'text-[#2b1e14]' : 'text-[#c2b6a6] opacity-60'}`}><TypeMark t={t} size={14} />{n}</span>;
        })}
      </span>
      <span className="mt-2 flex items-center gap-1">
        {c.wonders.map(w => (
          <span key={w.w} className={`flex h-[22px] w-[22px] items-center justify-center rounded-md ${w.under >= 0 ? 'bg-[#2b1e14]' : w.out ? 'bg-[#efe7d8] opacity-40' : 'bg-[#f6efe0] border border-dashed border-[#c9a24b]/80'}`}>
            <WonderMark size={15} className={w.under >= 0 ? '' : 'opacity-35'} />
          </span>
        ))}
        {c.tokens.map(t => <TokenDisc key={t} t={t} size={20} />)}
      </span>
    </button>
  );
};

/** the points by kind, the two kingdoms side by side */
export const ScoreTable: React.FC<{ g: TakhtiGame; me: number }> = ({ g, me }) => {
  const s = [scoreOf(g, 0), scoreOf(g, 1)];
  const rows: [string, keyof typeof s[0]][] = [
    ['ლურჯი ბარათები', 'blue'], ['მწვანე ბარათები', 'green'], ['ყვითელი ბარათები', 'yellow'], ['ამქრები', 'guild'], ['ძეგლები', 'wonder'],
    ['ცოდნის ნიშნები', 'token'], ['თეთრი: 3-ზე 1', 'coins'], ['ლაშქარი', 'army'],
  ];
  return (
    <table className="w-full text-[13px] leading-snug text-[#2b1e14]">
      <thead>
        <tr className="text-[12px] text-[#75685a]"><th className="py-1 text-left font-bold" />
          {[0, 1].map(i => <th key={i} className="py-1 text-right font-bold [overflow-wrap:anywhere]" style={{ color: SIDE_COLOR[i] }}>{i === me ? 'შენ' : g.names[i]}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, k]) => (
          <tr key={k} className="border-t border-[#efe4d2]"><td className="py-1">{label}</td>{[0, 1].map(i => <td key={i} className="py-1 text-right tabular-nums">{s[i][k]}</td>)}</tr>
        ))}
        <tr className="border-t-2 border-[#d9c8ac] font-bold"><td className="py-1.5">ჯამი</td>{[0, 1].map(i => <td key={i} className="py-1.5 text-right text-[15px] tabular-nums">{s[i].total}</td>)}</tr>
      </tbody>
    </table>
  );
};

/** the whole kingdom in a window */
export const CitySheet: React.FC<{ g: TakhtiGame; who: number | null; me: number; onClose: () => void }> = ({ g, who, me, onClose }) => {
  if (who === null) return null;
  const c = g.cities[who], prod = prodOf(c), flex = flexOf(c);
  const makes = RES_IDS.filter(r => prod[r]).map(r => `${RES_INFO[r].name} ${prod[r]}`).join(', ');
  return (
    <Sheet open onClose={onClose} title={<>{g.names[who]}{who === me ? ' · შენ' : ''} <span className="text-[13px] font-normal text-[#75685a]">· {SIDES[who]}</span></>} wide>
      <div className="space-y-4 text-[13px] leading-snug text-[#2b1e14]">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1 font-bold"><CoinMark n="" size={18} />{c.coins} თეთრი</span>
          <span className="flex items-center gap-1 font-bold"><LaurelMark n={scoreOf(g, who).total} size={22} />ქულა ახლა</span>
        </p>
        <section>
          <p className="text-[12.5px] font-bold text-[#75685a]">აწარმოებს ყოველ სვლაზე</p>
          <p className="mt-0.5">{makes || 'ჯერ არაფერს'}{flex.length > 0 && <> · ერთი: {flex.map(f => [...f].map(r => RES_INFO[r as Res].name).join(' ან ')).join('; ')}</>}</p>
          <p className="mt-1.5 text-[12.5px] font-bold text-[#75685a]">ბანკიდან ყიდულობს</p>
          <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1">{RES_IDS.map(r => <span key={r} className="flex items-center gap-1"><ResMark r={r} size={15} />{tradePrice(g, who, r)} თეთრად</span>)}</p>
        </section>
        <section>
          <p className="text-[12.5px] font-bold text-[#75685a]">სიბრძნე</p>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1">{symbolsOf(c).length ? symbolsOf(c).map(s => <span key={s} className="flex items-center gap-1"><SciMark s={s} size={18} />{SCI_NAMES[s]}</span>) : 'ჯერ არცერთი'}</p>
        </section>
        {TYPE_ORDER.filter(t => countOf(c, t)).map(t => (
          <section key={t}>
            <p className="text-[12.5px] font-bold" style={{ color: TYPE_INFO[t].color }}>{TYPE_INFO[t].name} · {countOf(c, t)}</p>
            <ul className="mt-1 flex flex-wrap gap-2">
              {c.cards.filter(id => CARDS[id].t === t).map(id => (
                <li key={id} className="flex w-[148px] items-center gap-2"><CardFace id={id} w={44} /><span className="min-w-0 text-[12.5px] font-bold leading-tight [overflow-wrap:anywhere]">{CARDS[id].n}</span></li>
              ))}
            </ul>
          </section>
        ))}
        <section className="space-y-2">
          <p className="text-[12.5px] font-bold text-[#75685a]">ძეგლები</p>
          {c.wonders.map(w => <WonderTile key={w.w} w={w.w} built={w.under >= 0} out={w.out} />)}
        </section>
        {c.tokens.length > 0 && (
          <section className="space-y-2">
            <p className="text-[12.5px] font-bold text-[#75685a]">ცოდნის ნიშნები</p>
            {c.tokens.map(t => <TokenTile key={t} t={t} />)}
          </section>
        )}
      </div>
    </Sheet>
  );
};
