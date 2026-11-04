import React from 'react';
import { Coins, Hammer, Lock } from 'lucide-react';
import { CARDS, TOKENS, WONDERS } from '../../../data/takhtiCards';
import { MAX_WONDERS, ROMAN, cardPrice, sellValue, wonderOk, wonderPrice, wondersBuilt, type Price, type TakhtiGame } from '../../../utils/oriTakhti';
import { Btn, Sheet } from '../../../components/ui/kit';
import { CardFace, ChainMark, PricePill, TokenTile, WonderMark } from './look';
import { CHAIN_NAMES, RES_INFO, TYPE_INFO, chainSource, chainTargets, costText, effText } from './words';

// A card of „ორი ტახტი“ in a window: what it gives, what it costs and what it costs the player on turn (made at home, bought
// from the bank, free by the master's mark); on turn its three uses — build, throw away for coins, tuck under a monument.

const priceLines = (p: Price, coins: number, none: boolean) => {
  if (p.chain) return 'უფასოა — ოსტატის ნიშანი უკვე გაქვს.';
  if (none) return 'ამ ბარათს ფასი არ აქვს.';
  if (!p.total) return 'რაც სჭირდება, ყველაფერი შენთან კეთდება — უფასოა.';
  const parts = [p.coins ? `${p.coins} თეთრი ფასი` : '', ...p.buy.map(b => `${RES_INFO[b.r].name} ×${b.n} ბანკიდან · ${b.n * b.each} თეთრი`)].filter(Boolean);
  return `${parts.join('; ')}. სულ ${p.total} თეთრი${p.ok ? '' : ` — გაქვს ${coins}`}.`;
};

export const CardSheet: React.FC<{
  g: TakhtiGame; slot: number | null; who: number; me: number;
  /** the moves, when the card is free and the player on turn may use it */
  act?: { build: () => void; discard: () => void; wonder: (i: number) => void };
  onClose: () => void;
}> = ({ g, slot, who, me, act, onClose }) => {
  if (slot === null) return null;
  const id = g.slots[slot];
  if (id === undefined || id < 0) return null;
  const d = CARDS[id], T = TYPE_INFO[d.t], c = g.cities[who];
  const p = cardPrice(g, who, id);
  const you = who === me || me < 0;
  const sell = sellValue(c);
  const full = wondersBuilt(g) >= MAX_WONDERS;
  const wonders = c.wonders.map((w, i) => ({ w, i })).filter(x => x.w.under < 0 && !x.w.out);
  return (
    <Sheet
      open
      onClose={onClose}
      title={d.n}
      footer={act && (
        <div className="grid grid-cols-2 gap-2">
          <Btn size="lg" disabled={!p.ok} onClick={act.build} icon={p.ok ? <Hammer /> : <Lock />} className="!h-14 !px-3 whitespace-nowrap">
            {p.ok ? (p.chain || !p.total ? 'უფასოდ აშენება' : `აშენება · ${p.total}`) : `${p.total - c.coins} თეთრი გაკლია`}
          </Btn>
          <Btn kind="ghost" size="lg" onClick={act.discard} icon={<Coins />} className="!h-14 !px-3 whitespace-nowrap">გაყიდვა · +{sell}</Btn>
        </div>
      )}
    >
      <div className="space-y-3.5 text-[13px] leading-snug text-[#2b1e14]">
        <div className="flex items-start gap-3">
          <CardFace id={id} w={92} />
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-[12.5px] font-bold" style={{ color: T.color }}>{T.name} · {ROMAN[d.age]} ეპოქა</p>
            <p className="text-[14px] font-bold leading-snug">{effText(d.eff)}</p>
            <p className="text-[12.5px] text-[#5b4a3c]">ფასი: {costText(d.cost)}</p>
            {d.from && <p className="flex items-start gap-1.5 text-[12.5px] text-[#5b4a3c]"><ChainMark c={d.from} size={18} /><span>უფასოა, თუ გაქვს „{CHAIN_NAMES[d.from]}“ ({chainSource(d.from)})</span></p>}
            {d.to && <p className="flex items-start gap-1.5 text-[12.5px] text-[#5b4a3c]"><ChainMark c={d.to} size={18} /><span>„{CHAIN_NAMES[d.to]}“ — მერე უფასოდ: {chainTargets(d.to).join(', ')}</span></p>}
          </div>
        </div>
        <section className="rounded-2xl bg-[#f6efe0] px-3 py-2.5">
          <p className="flex items-center justify-between gap-2 text-[12.5px] font-bold text-[#75685a]">
            {you ? 'შენთვის' : `${g.names[who]}-სთვის`}<PricePill p={p} size="md" />
          </p>
          <p className="mt-1">{priceLines(p, c.coins, !d.cost)}</p>
        </section>
        {act && (
          <section className="space-y-2">
            <p className="text-[12.5px] font-bold text-[#75685a]">ან ძეგლის ქვეშ შედება{full ? ' — 7 ძეგლი უკვე აშენდა' : ''}</p>
            {wonders.length ? wonders.map(({ w, i }) => {
              const wp = wonderPrice(g, who, w.w), ok = wonderOk(g, who, i);
              return (
                <button key={w.w} type="button" disabled={!ok} onClick={() => act.wonder(i)} className={`flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left ring-1 ${ok ? 'bg-[#fffaf0] ring-[#c9a24b] cursor-pointer hover:bg-[#fbf3df]' : 'bg-[#f3eee6] ring-[#e3d5bd] opacity-60'}`}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2b1e14]"><WonderMark size={22} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-bold leading-tight">{WONDERS[w.w].n}</span>
                    <span className="block text-[12px] leading-snug text-[#5b4a3c]">{WONDERS[w.w].text}</span>
                  </span>
                  <PricePill p={wp} />
                </button>
              );
            }) : <p className="text-[12.5px] text-[#9a8b7b]">ასაშენებელი ძეგლი აღარ გაქვს.</p>}
          </section>
        )}
      </div>
    </Sheet>
  );
};

export const TokenSheet: React.FC<{ t: number | null; onClose: () => void }> = ({ t, onClose }) => (t === null ? null : (
  <Sheet open onClose={onClose} title={TOKENS[t].n}>
    <TokenTile t={t} />
    <p className="mt-3 text-[12.5px] leading-snug text-[#75685a]">ორი ერთნაირი სიბრძნე — და დაფიდან ერთი ცოდნის ნიშანი შენია.</p>
  </Sheet>
));
