import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpDown, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, GraduationCap, Shirt, Sparkles } from 'lucide-react';
import { useAuth } from '../../context';
import { triggerHaptic } from '../../utils/haptics';
import { moveItem, ordered, usePathOrder } from '../../utils/pathOrder';
import { PathTab, PATH_TAB_EVENT, PATH_TAB_KEY } from './IndependentWorkCard';

const TABS: { id: PathTab; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'learn', label: 'სწავლა', Icon: GraduationCap },
  { id: 'spirit', label: 'ჩვევები', Icon: Sparkles },
  { id: 'samosi', label: 'სამოსი', Icon: Shirt },
];
const TAB_IDS = TABS.map(t => t.id);

/** One card of a tab: `label` names it in the "რიგის შეცვლა" list. */
export type PathCard = { id: string; label: string; node: React.ReactNode };

const readTab = (): PathTab => {
  try {
    const t = localStorage.getItem(PATH_TAB_KEY);
    if (TABS.some(x => x.id === t)) return t as PathTab;
  } catch { /* storage off: start on the first tab */ }
  return 'learn';
};

const stepBtn = 'w-9 h-9 shrink-0 rounded-full flex items-center justify-center ring-1 ring-[#e8dcc8] bg-white text-[#7a2028] transition-colors cursor-pointer hover:bg-[#7a2028]/[0.06] active:scale-95 disabled:opacity-30 disabled:cursor-default disabled:hover:bg-white';

// "საგანძურის გზა" in three tabs, so the page is not one long column: study, spiritual life, my outfit.
// The last tab is remembered on this device; openPathPanel() switches to the tab holding its panel.
// The member may reorder the tabs and each tab's cards ("რიგის შეცვლა"); the order follows their account.
export const PathTabs: React.FC<{ panels: Record<PathTab, PathCard[]> }> = ({ panels }) => {
  const { user } = useAuth();
  const { order, save } = usePathOrder(user?.uid);
  const [tab, setTab] = useState<PathTab>(readTab);
  const [editing, setEditing] = useState(false);
  const buttons = useRef<Partial<Record<PathTab, HTMLButtonElement | null>>>({});

  const tabOrder = ordered(TAB_IDS, order.tabs);
  const tabs = tabOrder.map(id => TABS.find(t => t.id === id)!);
  const cardIds = ordered(panels[tab].map(c => c.id), order[tab]);
  const cards = cardIds.map(id => panels[tab].find(c => c.id === id)!);
  const tabIndex = tabOrder.indexOf(tab);

  useEffect(() => {
    const onTab = (e: Event) => setTab((e as CustomEvent).detail);
    window.addEventListener(PATH_TAB_EVENT, onTab);
    return () => window.removeEventListener(PATH_TAB_EVENT, onTab);
  }, []);

  const choose = (t: PathTab) => {
    if (t === tab) return;
    triggerHaptic(8);
    setTab(t);
    try { localStorage.setItem(PATH_TAB_KEY, t); } catch { /* just not remembered */ }
  };

  // arrow keys move between the tabs, as in any tab list
  const onKey = (e: React.KeyboardEvent) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = tabOrder[(tabIndex + dir + tabOrder.length) % tabOrder.length];
    choose(next);
    buttons.current[next]?.focus();
  };

  const moveTab = (dir: -1 | 1) => { triggerHaptic(8); save('tabs', moveItem(tabOrder, tab, dir)); };
  const moveCard = (id: string, dir: -1 | 1) => { triggerHaptic(8); save(tab, moveItem(cardIds, id, dir)); };
  const tabLabel = TABS.find(t => t.id === tab)!.label;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => { triggerHaptic(8); setEditing(v => !v); }}
            aria-pressed={editing}
            className={`h-9 px-3.5 rounded-full flex items-center gap-1.5 text-[13px] font-bold ring-1 transition-colors cursor-pointer active:scale-95 ${
              editing ? 'bg-[#7a2028] text-[#fbf6ec] ring-[#7a2028]' : 'bg-white/85 text-[#75685a] ring-[#e8dcc8] hover:text-[#7a2028]'
            }`}
          >
            {editing ? <Check className="w-4 h-4" /> : <ArrowUpDown className="w-4 h-4" />}
            {editing ? 'მზადაა' : 'რიგი'}
          </button>
        </div>
        <div
          role="tablist"
          aria-label="საგანძურის გზა"
          onKeyDown={onKey}
          className="grid grid-cols-3 gap-1 p-1 rounded-full bg-white/85 ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)]"
        >
          {tabs.map(({ id, label, Icon }) => {
            const on = id === tab;
            return (
              <button
                key={id}
                ref={el => { buttons.current[id] = el; }}
                type="button"
                role="tab"
                id={`path-tab-${id}`}
                aria-selected={on}
                aria-controls="path-tab-panel"
                tabIndex={on ? 0 : -1}
                onClick={() => choose(id)}
                className={`h-11 min-w-0 px-2 rounded-full flex items-center justify-center gap-1.5 text-sm font-bold transition-colors cursor-pointer active:scale-[0.97] ${
                  on ? 'bg-[#7a2028] text-[#fbf6ec] shadow-[0_4px_12px_-6px_rgba(122,32,40,0.7)]' : 'text-[#75685a] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.05]'
                }`}
              >
                {/* very narrow phones keep the word whole and drop the icon */}
                <Icon className="hidden min-[380px]:block w-4 h-4 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {editing && (
        <section aria-label="რიგის შეცვლა" className="rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] px-3 py-3 sm:px-4 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="flex-1 min-w-0 text-sm font-bold text-[#2a2017]">ჩანართი „{tabLabel}“</span>
            <button type="button" className={stepBtn} disabled={tabIndex === 0} onClick={() => moveTab(-1)} aria-label="მარცხნივ" title="მარცხნივ">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button type="button" className={stepBtn} disabled={tabIndex === tabOrder.length - 1} onClick={() => moveTab(1)} aria-label="მარჯვნივ" title="მარჯვნივ">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          {cards.length > 1 && (
            <ol className="border-t border-[#e8dcc8] pt-3 space-y-2">
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

      <div key={tab} role="tabpanel" id="path-tab-panel" aria-labelledby={`path-tab-${tab}`} className="space-y-4 animate-in fade-in duration-200">
        {cards.map(c => <React.Fragment key={c.id}>{c.node}</React.Fragment>)}
      </div>
    </div>
  );
};
