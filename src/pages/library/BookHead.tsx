import React from 'react';
import { ArrowLeft } from 'lucide-react';

// The head of an open book: its small cover, the title and a line under it, and one action at the
// right (the search in the lives). And the "← სარჩევი" step back from a part of a book.

export const BookHead: React.FC<{ cover: React.ReactNode; title: string; sub?: React.ReactNode; action?: React.ReactNode }> = ({
  cover, title, sub, action,
}) => (
  <header className="flex items-center gap-3.5 pb-4 border-b border-[#e8dcc8]/80">
    {cover}
    <div className="flex-1 min-w-0">
      <h2 className="font-serif-ge text-[19px] sm:text-[22px] font-bold leading-tight text-[#2a2017] text-balance">{title}</h2>
      {sub && <p className="mt-1 text-[12.5px] leading-snug text-[#8a7a6a]">{sub}</p>}
    </div>
    {action}
  </header>
);

export const ToContents: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/35 text-[13px] font-bold text-[#4a3426] hover:text-[#7a2028] cursor-pointer active:scale-95 transition-all"
  >
    <ArrowLeft className="w-4 h-4" /> სარჩევი
  </button>
);

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
