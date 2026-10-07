import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { SEARCH_EVENT, openSearch } from '../../utils/searchOpen';
import { triggerHaptic } from '../../utils/haptics';

// The search window (loads when first opened). It is a history entry { sgFind }, so the phone's back
// gesture closes it; a picked result first closes it (back), then opens, so "back" from there returns to
// the page the search was opened on.
const SearchPanel = lazy(() => import('./SearchPanel').then(m => ({ default: m.SearchPanel })));

const inHistory = () => {
  try { return Boolean(window.history.state?.sgFind); } catch { return false; }
};

export const GlobalSearch: React.FC = () => {
  const [open, setOpen] = useState(inHistory);
  const afterClose = useRef<(() => void) | null>(null);

  useEffect(() => {
    const onOpen = () => {
      if (inHistory()) return;
      try { window.history.pushState({ ...(window.history.state || {}), sgFind: true }, ''); } catch { /* still opens */ }
      setOpen(true);
    };
    const onPop = () => {
      if (inHistory()) return;
      setOpen(false);
      const run = afterClose.current;
      afterClose.current = null;
      // after the app's own back handling of this same step
      if (run) window.setTimeout(run, 0);
    };
    // "/" or Ctrl/⌘+K on a keyboard; never over the notes page, the program or a saint's life
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
      const k = (e.key === 'k' || e.key === 'K' || e.key === 'ქ') && (e.ctrlKey || e.metaKey);
      if (!k && (e.key !== '/' || typing || e.ctrlKey || e.metaKey || e.altKey)) return;
      const st = window.history.state || {};
      if (st.sgNotes || st.sgProg || st.sgLife || st.sgSong) return;
      e.preventDefault();
      openSearch();
    };
    window.addEventListener(SEARCH_EVENT, onOpen);
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener(SEARCH_EVENT, onOpen);
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  // the page underneath stays where it was
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => { html.style.overflow = prev; window.removeEventListener('keydown', onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = (then?: () => void) => {
    afterClose.current = then ?? null;
    if (inHistory()) { window.history.back(); return; }
    setOpen(false);
    afterClose.current = null;
    then?.();
  };

  if (!open) return null;
  return (
    <Suspense fallback={<div className="fixed inset-0 z-[88] bg-[#2a2017]/45" />}>
      <SearchPanel onClose={() => close()} onChoose={action => close(action)} />
    </Suspense>
  );
};

/** The header's search button. */
export const SearchButton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <button
    type="button"
    onClick={() => { triggerHaptic(10); openSearch(); }}
    className={`w-9 h-9 shrink-0 rounded-xl bg-white/80 hover:bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40 text-[#7a2028] flex items-center justify-center transition-all cursor-pointer active:scale-95 ${className}`}
    title="ძიება (/)"
    aria-label="ძიება"
  >
    <Search className="w-4 h-4" />
  </button>
);

/** The home page's search field (a button that opens the search). */
export const HomeSearchField: React.FC = () => (
  <button
    type="button"
    onClick={() => { triggerHaptic(10); openSearch(); }}
    className="group w-full max-w-sm h-12 flex items-center gap-3 pl-4 pr-2 rounded-full bg-white/85 hover:bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/35 shadow-[0_8px_22px_-18px_rgba(74,52,38,0.6)] text-left cursor-pointer transition-all active:scale-[0.99]"
    aria-label="ძიება: საგალობელი, ლოცვა, სიმღერა"
  >
    <Search className="w-[18px] h-[18px] shrink-0 text-[#7a2028]" />
    {/* as many words as the width holds, never cut */}
    <span className="flex-1 min-w-0 truncate text-[14.5px] text-[#8a7a6a]">
      <span className="min-[380px]:hidden">რას ეძებ?</span>
      <span className="hidden min-[380px]:inline sm:hidden">საგალობელი, ლოცვა…</span>
      <span className="hidden sm:inline">საგალობელი, ლოცვა, სიმღერა…</span>
    </span>
    <span className="h-8 px-3 shrink-0 rounded-full bg-[#7a2028] text-[#fbf6ec] text-[12.5px] font-bold flex items-center group-hover:bg-[#5e1820] transition-colors">ძიება</span>
  </button>
);
