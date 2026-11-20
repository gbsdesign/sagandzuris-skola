import React, { Suspense } from 'react';
import { useAccess } from '../../../hooks/useAccess';
import { BirthdaysSoon } from '../../../components/home/BirthdaysSoon';
import { ShortcutShelf } from '../../../components/home/ShortcutShelf';
import { SAYINGS_ABOVE } from '../../../data/sayings';
import { HomeV2View } from './HomeV2View';
import { useNextStep } from './useNextStep';
import { useSayingSlot } from './useSayingSlot';
import { HomeClasses, useHomeAiShown } from './HomeClasses';

// The home page in the new look (redesign stage 4, boards x-mtavari + x-ultra-gaagrdzele): the app draws the home bar above
// it and the bottom menu under it. Since 2026-11-21 the vine has no labels (the user: „მთავარ გვერდზე ყველა ღილაკი
// მოიხსნას“) — the sections live in the home bar's menu (components/shell/SectionsMenu), the habits in the shelf's
// „ჩვევები“ window.

const LearnOpen = React.lazy(() => import('./LearnOpen'));

export const HomeV2: React.FC = () => {
  const access = useAccess();
  const slot = useSayingSlot();
  const saying = SAYINGS_ABOVE[slot % SAYINGS_ABOVE.length];
  const next = useNextStep();
  // a member's AI line stands under the vine — the qvevri does not repeat it
  const aiRow = useHomeAiShown();
  const step = aiRow && next.step?.kind === 'ai' ? null : next.step;

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
      >
        {/* birthdays: within five days for teachers and admins, today's for members */}
        {access.on('birthdays') && <BirthdaysSoon />}
        {/* my class and the AI teacher (a member) or the classes I lead (teachers, admins) */}
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
