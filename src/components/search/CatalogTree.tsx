import React, { useState } from 'react';
import { Check, ChevronRight, Loader2, Plus } from 'lucide-react';
import { CatalogNode } from '../../data/catalog';
import { triggerHaptic } from '../../utils/haptics';
import { shortcutIcon } from '../home/ShortcutShelf';

// The catalog (data/catalog) as rows to unfold: a row with more under it opens with ›, anything that can be a
// button has its own ＋ (✓ once chosen). Books' chapters load when their row is first opened.

type Loaded = CatalogNode[] | 'loading' | 'error';

export const CatalogTree: React.FC<{
  nodes: CatalogNode[];
  isOn: (id: string) => boolean;
  /** nothing more can be added (a chosen one can still be taken off) */
  full?: boolean;
  onPick: (n: CatalogNode) => void;
  /** what a lazily loaded book may show */
  prune: (nodes: CatalogNode[]) => CatalogNode[];
}> = ({ nodes, isOn, full, onPick, prune }) => {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState<Record<string, Loaded>>({});

  const toggle = (n: CatalogNode) => {
    triggerHaptic(8);
    const next = new Set(open);
    if (next.has(n.key)) next.delete(n.key);
    else {
      next.add(n.key);
      if (n.load && !Array.isArray(loaded[n.key]) && loaded[n.key] !== 'loading') {
        setLoaded(l => ({ ...l, [n.key]: 'loading' }));
        n.load()
          .then(list => setLoaded(l => ({ ...l, [n.key]: prune(list) })))
          .catch(() => setLoaded(l => ({ ...l, [n.key]: 'error' })));
      }
    }
    setOpen(next);
  };

  const childrenOf = (n: CatalogNode): Loaded | undefined => (n.load ? loaded[n.key] : n.children);

  const row = (n: CatalogNode, depth: number): React.ReactNode => {
    const kids = n.load || n.children?.length;
    const expanded = open.has(n.key);
    const on = !!n.id && isOn(n.id);
    const blocked = !!n.id && !on && !!full;
    const top = depth === 0;
    const list = expanded ? childrenOf(n) : undefined;
    return (
      <li key={n.key}>
        <div className={`flex items-center gap-1 rounded-2xl transition-colors ${on ? 'bg-[#7a2028]/[0.06]' : 'hover:bg-[#7a2028]/[0.04]'}`}>
          <button
            type="button"
            onClick={() => (kids ? toggle(n) : n.id && !blocked && onPick(n))}
            aria-expanded={kids ? expanded : undefined}
            disabled={!kids && blocked}
            className={`flex-1 min-w-0 flex items-center gap-2.5 text-left cursor-pointer disabled:cursor-default disabled:opacity-45 ${
              top ? 'min-h-14 px-2 py-2' : 'min-h-11 pl-1 pr-1.5 py-1.5'
            }`}
          >
            {top ? (
              <span className="w-10 h-10 shrink-0 rounded-xl bg-[#7a2028]/[0.07] text-[#7a2028] flex items-center justify-center [&>svg]:w-[18px] [&>svg]:h-[18px]">
                {shortcutIcon(n.icon || n.id || '')}
              </span>
            ) : (
              <span className="w-6 h-6 shrink-0 flex items-center justify-center text-[#b9a68c]">
                {kids ? (
                  <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-90 text-[#7a2028]' : ''}`} />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d9c8ac]" aria-hidden />
                )}
              </span>
            )}
            <span className="flex-1 min-w-0">
              <span className={`block leading-snug text-[#2a2017] ${top ? 'font-serif-ge text-[15px] font-bold' : kids ? 'text-[14.5px] font-semibold' : 'text-[14.5px]'}`}>
                {n.title}
              </span>
              {n.sub && <span className="block mt-0.5 text-[12px] leading-snug text-[#8a7a6a] truncate">{n.sub}</span>}
            </span>
            {top && kids && (
              <ChevronRight className={`w-5 h-5 shrink-0 text-[#b9a68c] transition-transform duration-200 ${expanded ? 'rotate-90 text-[#7a2028]' : ''}`} />
            )}
          </button>
          {n.id && (
            <button
              type="button"
              onClick={() => onPick(n)}
              disabled={blocked}
              aria-pressed={on}
              aria-label={`${n.title} — ${on ? 'არჩეულია' : 'არჩევა'}`}
              title={on ? 'არჩეულია' : 'არჩევა'}
              className={`w-9 h-9 mr-1 shrink-0 rounded-full flex items-center justify-center cursor-pointer transition active:scale-90 disabled:opacity-35 disabled:cursor-default ${
                on ? 'bg-[#7a2028] text-[#fbf6ec] shadow-[0_3px_8px_-4px_rgba(122,32,40,0.8)]' : 'ring-1 ring-[#d9c8ac] text-[#7a2028] hover:ring-[#7a2028]/45 hover:bg-white'
              }`}
            >
              {on ? <Check className="w-[18px] h-[18px] stroke-[3]" /> : <Plus className="w-[18px] h-[18px]" />}
            </button>
          )}
        </div>
        {expanded && (
          <div className={`${top ? 'ml-7' : 'ml-3.5'} pl-2 border-l border-[#e8dcc8] animate-in fade-in slide-in-from-top-1 duration-150`}>
            {list === 'loading' || list === undefined ? (
              <p className="flex items-center gap-2 min-h-11 px-2 text-[13px] text-[#8a7a6a]">
                <Loader2 className="w-4 h-4 animate-spin" /> იტვირთება…
              </p>
            ) : list === 'error' ? (
              <p className="min-h-11 px-2 py-3 text-[13px] text-[#8a7a6a]">ვერ ჩაიტვირთა — შეამოწმე ინტერნეტი და თავიდან გახსენი.</p>
            ) : (
              <ul>{list.map(c => row(c, depth + 1))}</ul>
            )}
          </div>
        )}
      </li>
    );
  };

  return <ul className="space-y-0.5">{nodes.map(n => row(n, 0))}</ul>;
};
