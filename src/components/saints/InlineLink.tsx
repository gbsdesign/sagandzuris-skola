import React from 'react';

// Words in running text that open something: a span, not a button — a button is laid out as a box of its
// own, so a long name in it pushes the following words onto a new line.
export const InlineLink: React.FC<{ onOpen: () => void; className?: string; children: React.ReactNode }> = ({ onOpen, className = '', children }) => (
  <span
    role="link"
    tabIndex={0}
    onClick={onOpen}
    onKeyDown={e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onOpen();
      }
    }}
    className={`underline decoration-[#d2a04a] decoration-1 underline-offset-[3px] hover:decoration-[#7a2028] cursor-pointer rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[#7a2028]/30 ${className}`}
  >
    {children}
  </span>
);
