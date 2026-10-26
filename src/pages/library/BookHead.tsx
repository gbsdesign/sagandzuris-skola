import React from 'react';

// The head of an open book. Since 2026-10-25 the book's name (and its small cover) live in the page's one title bar
// (AppRouter shows the open book's name), so here stays only the line under it and the book's one action at the
// right (the search in the lives); nothing at all when it has neither. "← სარჩევი" is the bar's „←“ now.

export const BookHead: React.FC<{ cover?: React.ReactNode; title?: string; sub?: React.ReactNode; action?: React.ReactNode }> = ({ sub, action }) =>
  sub || action ? (
    <header className="flex items-center gap-3 pb-3 border-b border-[#e8dcc8]/80">
      <p className="flex-1 min-w-0 text-[13px] leading-snug text-[#8a7a6a]">{sub}</p>
      {action}
    </header>
  ) : null;

export const ToContents: React.FC<{ onClick: () => void }> = () => null;

export const SectionTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <h3 className={`flex items-center gap-3 px-1 font-serif-ge text-[14px] font-bold text-[#7a5a3e] ${className}`}>
    {children}
    <span className="h-px flex-1 bg-gradient-to-r from-[#dcc8a8] to-transparent" aria-hidden />
  </h3>
);

/** How a book moves: open a part of it (a new step, or turning in place), or go back up to its contents. */
export interface BookNav {
  part: string | null;
  go: (part: string | null, replace?: boolean) => void;
  up: () => void;
}
