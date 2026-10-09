import React from 'react';
import { ScrollText } from 'lucide-react';
import { useNavigation } from '../../context';
import { PrayerBook } from '../../components/views/HabitPrayerMenu';
import { nameCount as countOf, useCommemoration } from '../../utils/commemoration';
import { BookHead } from './BookHead';
import { MiniCover } from './Shelf';

// "ლოცვანი" on the library shelf: the same prayers the habits open, all in one book.
// The small button at the right of the title opens მოსახსენებელი, the names read in these prayers.
export const PrayersTab: React.FC = () => {
  const { openPrayer, openCommemoration } = useNavigation();
  const { lists } = useCommemoration();
  const nameCount = countOf(lists, 'living') + countOf(lists, 'deceased') + countOf(lists, 'group');
  const label = `მოსახსენებელი · ${nameCount ? `${nameCount} სახელი` : 'ჩაწერე სახელები'}`;
  return (
    <div className="space-y-4">
      <BookHead
        cover={<MiniCover id="prayers" className="w-11 h-[60px]" />}
        title="ლოცვანი"
        sub="დილისა და საღამოს ლოცვები, ფსალმუნი, სახარება, დაუჯდომლები"
        action={
          <button
            type="button"
            onClick={openCommemoration}
            aria-label={label}
            title={label}
            className="self-start shrink-0 h-10 min-w-10 px-3 rounded-full inline-flex items-center justify-center gap-1.5 bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/35 hover:bg-[#7a2028]/[0.04] text-[13px] font-bold tabular-nums text-[#7a2028] cursor-pointer active:scale-95 transition-all"
          >
            <ScrollText className="w-[18px] h-[18px] shrink-0" />
            {nameCount > 0 && nameCount}
          </button>
        }
      />
      <PrayerBook onOpen={openPrayer} />
    </div>
  );
};
