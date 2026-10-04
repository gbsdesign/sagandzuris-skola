import React, { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Check } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

// A column of cards the student can put in their own order ("რიგის შეცვლა" → arrows on each card).
// The order is remembered on this device; cards added later go to the end.
export const ReorderStack: React.FC<{
  storageKey: string;
  items: { id: string; label: string; node: React.ReactNode }[];
}> = ({ storageKey, items }) => {
  const [order, setOrder] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { return []; }
  });
  const [editing, setEditing] = useState(false);

  const ids = items.map(i => i.id);
  const sorted = [...order.filter(id => ids.includes(id)), ...ids.filter(id => !order.includes(id))];

  const move = (id: string, dir: -1 | 1) => {
    const next = [...sorted];
    const i = next.indexOf(id), j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    triggerHaptic(10);
    setOrder(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* order just isn't kept */ }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => { triggerHaptic(8); setEditing(e => !e); }}
          className={`h-8 px-3 rounded-full text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 ${
            editing ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white/80 ring-1 ring-[#e8dcc8] text-[#75685a] hover:text-[#7a2028] hover:ring-[#7a2028]/40'
          }`}
        >
          {editing ? <Check className="w-3.5 h-3.5" /> : <ArrowUpDown className="w-3.5 h-3.5" />}
          {editing ? 'მზადაა' : 'რიგის შეცვლა'}
        </button>
      </div>

      {sorted.map((id, i) => {
        const item = items.find(it => it.id === id)!;
        return (
          <div key={id} className={editing ? 'rounded-3xl border-2 border-dashed border-[#7a2028]/25 p-1.5 space-y-1.5 bg-[#7a2028]/[0.02]' : ''}>
            {editing && (
              <div className="flex items-center gap-2 px-2">
                <span className="flex-1 text-xs font-bold text-[#7a2028]">{i + 1}. {item.label}</span>
                <button type="button" onClick={() => move(id, -1)} disabled={i === 0} aria-label={`${item.label} — ზემოთ`} className="w-8 h-8 rounded-full bg-white ring-1 ring-[#e8dcc8] text-[#7a2028] disabled:opacity-30 flex items-center justify-center cursor-pointer active:scale-95">
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => move(id, 1)} disabled={i === sorted.length - 1} aria-label={`${item.label} — ქვემოთ`} className="w-8 h-8 rounded-full bg-white ring-1 ring-[#e8dcc8] text-[#7a2028] disabled:opacity-30 flex items-center justify-center cursor-pointer active:scale-95">
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
            )}
            {item.node}
          </div>
        );
      })}
    </div>
  );
};
