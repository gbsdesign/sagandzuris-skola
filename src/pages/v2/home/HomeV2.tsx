import React, { Suspense, useState } from 'react';
import { ShortcutShelf } from '../../../components/home/ShortcutShelf';
import { SAYINGS_ABOVE } from '../../../data/sayings';
import { HomeV2View, type HomeTile } from './HomeV2View';
import { HOME_MAIN_SECTIONS, useSections } from '../../../components/shell/SectionsMenu';
import { Toast } from '../../../components/ui/Toast';
import { useNextStep } from './useNextStep';
import { useSayingSlot } from './useSayingSlot';
import { useNavPlaces } from '../../../components/shell/BottomNav';

// The home page in the new look (redesign stage 4, boards x-mtavari + x-ultra-gaagrdzele): the app draws the home bar above
// it (with 👤 and 🔍 since 2026-11-21 — phones have no bottom menu any more). Since 2026-11-22 the vine and its grapes are gone
// (the user: „ყურძენი და ხე მოაცილო, თანამედროვე ღილაკები დახატო“): „მიმდინარე გაკვეთილი“ first (the letters' old tap),
// then გალობა · სიმღერა · ლოცვანი as three tiles, then the other sections as small buttons — each obeys the admin's switches.

const LearnOpen = React.lazy(() => import('./LearnOpen'));

export const HomeV2: React.FC = () => {
  const slot = useSayingSlot();
  const saying = SAYINGS_ABOVE[slot % SAYINGS_ABOVE.length];
  const next = useNextStep();
  // „მიმდინარე გაკვეთილი“ = the vine's old „გაკვეთილი“ bunch: the same tap as the old bottom menu's „წერილები“ (a student with one
  // teacher — the teacher's chat, everyone else the list)
  const places = useNavPlaces();
  const lettersItem = places.shown.find(it => it.id === 'messages');
  const [soon, setSoon] = useState<string | null>(null);
  const sections = useSections(setSoon);
  const tiles = sections.rows.map(({ it, state }): HomeTile & { main: boolean } => ({
    id: it.id, word: it.label, Icon: it.Icon, tone: it.tone, soon: state === 'soon', onOpen: () => sections.pick(it, state),
    main: HOME_MAIN_SECTIONS.includes(it.id),
  }));

  return (
    <>
      <HomeV2View
        saying={saying}
        lesson={lettersItem ? { unread: places.unread, onOpen: () => places.go(lettersItem) } : undefined}
        main={tiles.filter(t => t.main)}
        more={tiles.filter(t => !t.main)}
      >
        {/* the classes left the home (2026-11-22, the user: „აქედან მოხსენი … თითოეული კლასის ჩათი … სიის თავში“): each class's
            chat stands first in „წერილები“, its members' coming birthdays over it */}
        {/* the kanon of a psalter-group member, „ჩვევები“ (a window) and the member's own buttons — no heading */}
        <ShortcutShelf habits />
      </HomeV2View>
      <Toast message={soon || ''} type="info" isVisible={!!soon} onClose={() => setSoon(null)} />
      {next.learnPiece && (
        <Suspense fallback={null}>
          <LearnOpen key={next.learnPiece} piece={next.learnPiece} onDone={next.learnDone} />
        </Suspense>
      )}
    </>
  );
};
