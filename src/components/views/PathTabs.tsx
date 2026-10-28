import React, { useRef, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { useAuth } from '../../context';
import { triggerHaptic } from '../../utils/haptics';
import { moveItem, ordered, usePathOrder } from '../../utils/pathOrder';

/** One card of the page: `label` names it in the "რიგის შეცვლა" list. */
export type PathCard = { id: string; label: string; node: React.ReactNode };

const stepBtn = 'w-9 h-9 shrink-0 rounded-full flex items-center justify-center ring-1 ring-[#e8dcc8] bg-white text-[#7a2028] transition-colors cursor-pointer hover:bg-[#7a2028]/[0.06] active:scale-95 disabled:opacity-30 disabled:cursor-default disabled:hover:bg-white';

// "საგანძურის გზა": `orbs` (the round buttons, PathOrbs) at the top, drawn in the member's order, and the page's
// cards under them. Until 2026-10-19 the cards were in two tabs, „სწავლა“ and „ჩვევები“; now study lives in the round
// buttons (the teacher's assignments in "ნასწავლი") and the page keeps one card, "ჩვევები".
// The member may reorder the round buttons (a long press on them, or a right click) and, once there are several, the
// cards; the order follows their account. No „რიგი“ button hangs between them any more (2026-10-28).
export const PathTabs: React.FC<{
  cards: PathCard[];
  orbs?: { labels: { id: string; label: string }[]; render: (order: string[]) => React.ReactNode };
}> = ({ cards: list, orbs }) => {
  const { user } = useAuth();
  const { order, save } = usePathOrder(user?.uid);
  const [editing, setEditing] = useState(false);

  const cardIds = ordered(list.map(c => c.id), order.cards);
  const cards = cardIds.map(id => list.find(c => c.id === id)!);
  const orbOrder = orbs ? ordered(orbs.labels.map(o => o.id), order.orbs) : [];

  const moveOrb = (id: string, dir: -1 | 1) => { triggerHaptic(8); save('orbs', moveItem(orbOrder, id, dir)); };
  const moveCard = (id: string, dir: -1 | 1) => { triggerHaptic(8); save('cards', moveItem(cardIds, id, dir)); };

  // a long press on the round buttons opens their order; the click that ends it does not open a button
  const press = useRef<number | null>(null);
  const swallow = useRef(false);
  const cancel = () => { if (press.current) window.clearTimeout(press.current); press.current = null; };
  const openOrder = () => { triggerHaptic(20); swallow.current = true; setEditing(true); };

  return (
    <div className="space-y-5">
      <div
        onPointerDown={() => { cancel(); press.current = window.setTimeout(openOrder, 600); }}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={e => { e.preventDefault(); cancel(); openOrder(); }}
        onClickCapture={e => { if (swallow.current) { swallow.current = false; e.stopPropagation(); e.preventDefault(); } }}
        className="[-webkit-touch-callout:none]"
      >
        {orbs?.render(orbOrder)}
      </div>

      {editing && (
        <section aria-label="რიგის შეცვლა" className="rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] px-3 py-3 sm:px-4 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <p className="flex-1 font-serif-ge text-[16px] font-bold text-[#4a3426]">რიგის შეცვლა</p>
            <button
              type="button"
              onClick={() => { triggerHaptic(8); setEditing(false); }}
              className="h-9 px-3.5 rounded-full flex items-center gap-1.5 text-[13px] font-bold bg-[#7a2028] text-[#fbf6ec] cursor-pointer active:scale-95 transition"
            >
              <Check className="w-4 h-4" /> მზადაა
            </button>
          </div>
          {orbs && (
            <div className={`space-y-2 ${cards.length > 1 ? 'pb-3 border-b border-[#e8dcc8]' : ''}`}>
              <ol className="space-y-2">
                {orbOrder.map((id, i) => {
                  const label = orbs.labels.find(o => o.id === id)?.label || id;
                  return (
                    <li key={id} className="flex items-center gap-2">
                      <span className="w-5 shrink-0 text-center text-xs font-bold text-[#a4927c]">{i + 1}</span>
                      <span className="flex-1 min-w-0 text-sm font-semibold text-[#4a3426]">{label}</span>
                      <button type="button" className={stepBtn} disabled={i === 0} onClick={() => moveOrb(id, -1)} aria-label={`${label} — მარცხნივ`} title="მარცხნივ">
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button type="button" className={stepBtn} disabled={i === orbOrder.length - 1} onClick={() => moveOrb(id, 1)} aria-label={`${label} — მარჯვნივ`} title="მარჯვნივ">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
          {cards.length > 1 && (
            <ol className="space-y-2">
              {cards.map((c, i) => (
                <li key={c.id} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-center text-xs font-bold text-[#a4927c]">{i + 1}</span>
                  <span className="flex-1 min-w-0 text-sm font-semibold text-[#4a3426]">{c.label}</span>
                  <button type="button" className={stepBtn} disabled={i === 0} onClick={() => moveCard(c.id, -1)} aria-label={`${c.label} — ზემოთ`} title="ზემოთ">
                    <ChevronUp className="w-5 h-5" />
                  </button>
                  <button type="button" className={stepBtn} disabled={i === cards.length - 1} onClick={() => moveCard(c.id, 1)} aria-label={`${c.label} — ქვემოთ`} title="ქვემოთ">
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      <div className="space-y-4">
        {cards.map(c => <React.Fragment key={c.id}>{c.node}</React.Fragment>)}
      </div>
    </div>
  );
};
