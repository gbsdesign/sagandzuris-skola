import React, { Suspense } from 'react';
import { useAccess } from '../../../hooks/useAccess';
import { BirthdaysSoon } from '../../../components/home/BirthdaysSoon';
import { ShortcutShelf } from '../../../components/home/ShortcutShelf';
import { SAYINGS_ABOVE } from '../../../data/sayings';
import { HomeV2View } from './HomeV2View';
import { useNextStep } from './useNextStep';
import { useSayingSlot } from './useSayingSlot';
import { HomeClasses } from './HomeClasses';
import { useNavPlaces } from '../../../components/shell/BottomNav';

// The home page in the new look (redesign stage 4, boards x-mtavari + x-ultra-gaagrdzele): the app draws the home bar above
// it (with 👤 and 🔍 since 2026-11-21 — phones have no bottom menu any more; „წერილები“ is the vine's grape bunch). Since 2026-11-21 the vine has no labels (the user: „მთავარ გვერდზე ყველა ღილაკი
// მოიხსნას“) — the sections live in the home bar's menu (components/shell/SectionsMenu), the habits in the shelf's
// „ჩვევები“ window.

const LearnOpen = React.lazy(() => import('./LearnOpen'));

export const HomeV2: React.FC = () => {
  const access = useAccess();
  const slot = useSayingSlot();
  const saying = SAYINGS_ABOVE[slot % SAYINGS_ABOVE.length];
  const next = useNextStep();
  // the day lesson is „ავტო გაკვეთილი“ beside the chat's path strip (2026-11-21) — the qvevri never shows it (useNextStep)
  const step = next.step;
  // „წერილები“ = the vine's grape bunch (the phone's bottom menu is gone since 2026-11-21): the same tap as the menu's was
  const places = useNavPlaces();
  const lettersItem = places.shown.find(it => it.id === 'messages');

  return (
    <>
      <HomeV2View
        saying={saying}
        labels={[]}
        abituri={false}
        onLabel={() => {}}
        onAbituri={() => {}}
        next={step}
        onNext={next.go}
        letters={lettersItem ? { unread: places.unread, onOpen: () => places.go(lettersItem) } : undefined}
      >
        {/* birthdays: within five days for teachers and admins, today's for members */}
        {access.on('birthdays') && <BirthdaysSoon />}
        {/* my class (a member) or the classes I lead (teachers, admins) — compact */}
        <HomeClasses />
        {/* the kanon of a psalter-group member, „ჩვევები“ (a window) and the member's own buttons — no heading */}
        <ShortcutShelf habits />
      </HomeV2View>
      {next.learnPiece && (
        <Suspense fallback={null}>
          <LearnOpen key={next.learnPiece} piece={next.learnPiece} onDone={next.learnDone} />
        </Suspense>
      )}
    </>
  );
};
