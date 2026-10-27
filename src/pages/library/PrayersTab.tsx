import React from 'react';
import { ScrollText } from 'lucide-react';
import { useNavigation } from '../../context';
import { PrayerBook } from '../../components/views/HabitPrayerMenu';
import { NAME_LISTS, nameCount as countOf, useCommemoration } from '../../utils/commemoration';
import { BookHead } from './BookHead';
import { MiniCover } from './Shelf';

// "ლოცვანი" on the library shelf: the same prayers the habits open, all in one book.
// The small button at the right of the title opens მოსახსენებელი, the names read in these prayers.
export const PrayersTab: React.FC<{ at?: string | null }> = ({ at }) => {
  const { openPrayer, openCommemoration } = useNavigation();
  const { lists } = useCommemoration();
  const nameCount = NAME_LISTS.reduce((n, l) => n + countOf(lists, l.id), 0);
  const label = `მოსახსენებელი · ${nameCount ? `${nameCount} სახელი` : 'ჩაწერე სახელები'}`;
  return (
    <div className="space-y-4">
      <BookHead
        cover={<MiniCover id="prayers" className="w-11 h-[60px]" />}
        title="ლოცვანი"
        action={
          <button
            type="button"
            onClick={openCommemoration}
            aria-label={label}
            title={label}
            className="self-start shrink-0 h-10 min-w-10 px-3 rounded-full inline-flex items-center justify-center gap-1.5 bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/35 hover:bg-[#7a2028]/[0.04] text-[13px] font-bold tabular-nums text-[#7a2028] cursor-pointer active:scale-95 transition-all"
          >
            <ScrollText className="w-[18px] h-[18px] shrink-0" />
            მოსახსენებელი
            {nameCount > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-[#7a2028] text-[#fbf6ec] text-[11px] font-black inline-flex items-center justify-center">{nameCount}</span>}
          </button>
        }
      />
      <PrayerBook onOpen={openPrayer} at={at} />
    </div>
  );
};
