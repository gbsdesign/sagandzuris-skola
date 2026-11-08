import React, { useState } from 'react';
import { useNavigation } from '../../context';
import { PrayerBook } from '../../components/views/HabitPrayerMenu';
import { FavPrayers } from '../../components/prayers/FavPrayers';
import { PrayerSearch } from '../../components/prayers/PrayerSearch';

// "ლოცვანი" on the library shelf: the same prayers the habits open, all in one book.
// მოსახსენებელი (the names read in these prayers) opens from the bar's „მოსახს.“ (CommemorationButton). „რჩეული“ (2026-11-06) on top.
export const PrayersTab: React.FC<{ at?: string | null }> = ({ at }) => {
  const { openPrayer } = useNavigation();
  // while a search is typed the favourites and the book step aside (2026-11-06)
  const [searching, setSearching] = useState(false);
  return (
    <div className="space-y-4">
      <PrayerSearch onOpen={openPrayer} onQuery={setSearching} />
      {!searching && (
        <>
          {/* the chosen prayers first (☆ on a prayer's page) */}
          <FavPrayers onOpen={openPrayer} />
          <PrayerBook onOpen={openPrayer} at={at} />
        </>
      )}
    </div>
  );
};
