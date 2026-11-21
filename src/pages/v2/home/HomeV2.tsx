import React, { Suspense, useState } from 'react';
import { ShortcutShelf } from '../../../components/home/ShortcutShelf';
import { SAYINGS_ABOVE } from '../../../data/sayings';
import { HomeV2View, type BunchId } from './HomeV2View';
import { VINE_SECTIONS, useSections } from '../../../components/shell/SectionsMenu';
import { Toast } from '../../../components/ui/Toast';
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
  const slot = useSayingSlot();
  const saying = SAYINGS_ABOVE[slot % SAYINGS_ABOVE.length];
  const next = useNextStep();
  // the day lesson is „ავტო გაკვეთილი“ beside the chat's path strip (2026-11-21) — the qvevri never shows it (useNextStep)
  // the qvevri's card („დღეს გასამეორებელი“ …) is gone since 2026-11-22 (the user: „მაგ ადგილას არაფერი არ დავინახო, მოხსენი“)
  const step = null;
  // „წერილები“ = the vine's grape bunch (the phone's bottom menu is gone since 2026-11-21): the same tap as the menu's was
  const places = useNavPlaces();
  const lettersItem = places.shown.find(it => it.id === 'messages');
  // „გალობა“, „სიმღერა“, „ლოცვანი“ = the vine's other bunches (they left the home bar's menu); each obeys the admin's switches
  const [soon, setSoon] = useState<string | null>(null);
  const sections = useSections(setSoon);
  const bunches = sections.rows.filter(r => VINE_SECTIONS.includes(r.it.id))
    .map(r => ({ id: r.it.id as BunchId, word: r.it.label, onOpen: () => sections.pick(r.it, r.state) }));

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
        bunches={bunches}
        letters={lettersItem ? { unread: places.unread, onOpen: () => places.go(lettersItem) } : undefined}
      >
        {/* my class (a member) or the classes I lead (teachers, admins) — compact; staff see the coming birthdays as the
            classes card's first row (BirthdaysSoon row) */}
        <HomeClasses />
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
