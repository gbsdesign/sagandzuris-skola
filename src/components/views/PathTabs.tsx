import React, { useEffect, useRef, useState } from 'react';
import { GraduationCap, Shirt, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { PathTab, PATH_TAB_EVENT, PATH_TAB_KEY } from './IndependentWorkCard';

const TABS: { id: PathTab; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'learn', label: 'სწავლა', Icon: GraduationCap },
  { id: 'spirit', label: 'სულიერი', Icon: Sparkles },
  { id: 'samosi', label: 'სამოსი', Icon: Shirt },
];

const readTab = (): PathTab => {
  try {
    const t = localStorage.getItem(PATH_TAB_KEY);
    if (TABS.some(x => x.id === t)) return t as PathTab;
  } catch { /* storage off: start on the first tab */ }
  return 'learn';
};

// "საგანძურის გზა" in three tabs, so the page is not one long column: study, spiritual life, my outfit.
// The last tab is remembered on this device; openPathPanel() switches to the tab holding its panel.
export const PathTabs: React.FC<{ panels: Record<PathTab, React.ReactNode> }> = ({ panels }) => {
  const [tab, setTab] = useState<PathTab>(readTab);
  const buttons = useRef<Partial<Record<PathTab, HTMLButtonElement | null>>>({});

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
    const i = TABS.findIndex(x => x.id === tab);
    const next = TABS[(i + dir + TABS.length) % TABS.length].id;
    choose(next);
    buttons.current[next]?.focus();
  };

  return (
    <div className="space-y-5">
      <div
        role="tablist"
        aria-label="საგანძურის გზა"
        onKeyDown={onKey}
        className="grid grid-cols-3 gap-1 p-1 rounded-full bg-white/85 ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)]"
      >
        {TABS.map(({ id, label, Icon }) => {
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

      <div key={tab} role="tabpanel" id="path-tab-panel" aria-labelledby={`path-tab-${tab}`} className="space-y-4 animate-in fade-in duration-200">
        {panels[tab]}
      </div>
    </div>
  );
};
