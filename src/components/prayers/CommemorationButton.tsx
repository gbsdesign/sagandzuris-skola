import React from 'react';
import { ScrollText } from 'lucide-react';
import { useNavigation } from '../../context';
import { NAME_LISTS, nameCount as countOf, useCommemoration } from '../../utils/commemoration';

// მოსახსენებელი on the bar, right of the 🔍 (2026-11-09, the user: „შემოკლებით დაწერე მოსახს. და ლუპის შემდეგ ჩასვი მარჯვნივ“)
export const CommemorationButton: React.FC = () => {
  const { openCommemoration } = useNavigation();
  const { lists } = useCommemoration();
  const nameCount = NAME_LISTS.reduce((n, l) => n + countOf(lists, l.id), 0);
  const label = `მოსახსენებელი · ${nameCount ? `${nameCount} სახელი` : 'ჩაწერე სახელები'}`;
  return (
    <button
      type="button"
      onClick={openCommemoration}
      aria-label={label}
      title={label}
      className="shrink-0 h-9 px-2.5 rounded-full inline-flex items-center justify-center gap-1.5 bg-white/85 ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40 text-[13px] font-bold tabular-nums text-[#7a2028] cursor-pointer active:scale-95 transition-all"
    >
      <ScrollText className="w-[17px] h-[17px] shrink-0" />
      მოსახს.
      {nameCount > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-[#7a2028] text-[#fbf6ec] text-[11px] font-black inline-flex items-center justify-center">{nameCount}</span>}
    </button>
  );
};
