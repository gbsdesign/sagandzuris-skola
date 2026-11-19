import React, { Suspense, useState } from 'react';
import { useAuth, useModal, useNavigation } from '../../../context';
import { useAccess } from '../../../hooks/useAccess';
import { openPathPanel } from '../../../components/views/pathPanelOpen';
import { askSignIn } from '../../../components/access/SignInPrompt';
import { Toast } from '../../../components/ui/Toast';
import { BirthdaysSoon } from '../../../components/home/BirthdaysSoon';
import { ShortcutShelf } from '../../../components/home/ShortcutShelf';
import { SAYINGS_ABOVE } from '../../../data/sayings';
import { HomeV2View, SPOTS, type SpotId, type VineLabel } from './HomeV2View';
import { useNextStep } from './useNextStep';
import { useSayingSlot } from './useSayingSlot';

// The home page in the new look (redesign stage 4, boards x-mtavari + x-ultra-gaagrdzele): the app draws the home bar above
// it and the bottom menu under it. Every vine label keeps the old GrapeNav's behaviour — the admin's switches through
// useAccess().section (hidden: not drawn; „მალე“: says so; locked: asks to sign in) and where it goes.

const LearnOpen = React.lazy(() => import('./LearnOpen'));

/** the labels in the boards' order */
const ORDER: SpotId[] = ['simghera', 'chvevebi', 'eklesiebi', 'galoba', 'biblioteka', 'tamashebi'];

export const HomeV2: React.FC = () => {
  const { user } = useAuth();
  const access = useAccess();
  const { navigateTo, openMapItem } = useNavigation();
  const { openModal } = useModal();
  const slot = useSayingSlot();
  const saying = SAYINGS_ABOVE[slot % SAYINGS_ABOVE.length];
  const next = useNextStep();
  const [soon, setSoon] = useState<string | null>(null);

  const states = ORDER.map(id => ({ id, state: access.section(id) })).filter(s => s.state !== 'hidden');
  const labels: VineLabel[] = states.map(s => ({ id: s.id, soon: s.state === 'soon' }));
  const abituri = states.some(s => s.id === 'galoba' && s.state === 'open') && access.on('abituri');

  const go: Record<SpotId, () => void> = {
    simghera: () => navigateTo('simghera'),
    galoba: () => navigateTo('galoba'),
    // the prayer book in one step: the library opened on its „ლოცვანი“
    biblioteka: () => { navigateTo('biblioteka'); openMapItem('prayers'); },
    // signed in: the habits fold open on the path page; a guest gets the sign-in prompt
    chvevebi: () => (user ? (openPathPanel('habits'), navigateTo('gz')) : openModal('chvevebi')),
    eklesiebi: () => navigateTo('churches'),
    tamashebi: () => navigateTo('games'),
  };

  const onLabel = (id: SpotId) => {
    const state = states.find(s => s.id === id)?.state;
    const name = SPOTS[id].label;
    // a closed part opens its own page, which says what a member gets there (board x-dakhuruli, gatsnoba/LockedV2);
    // the habits live on the path page, so they still ask straight away
    if (state === 'locked') { if (id === 'chvevebi') askSignIn(name); else go[id](); }
    else if (state === 'soon') setSoon(`„${name}“ ჯერ მზადდება — მალე დაემატება`);
    else go[id]();
  };

  return (
    <>
      <HomeV2View
        saying={saying}
        labels={labels}
        abituri={abituri}
        onLabel={onLabel}
        onAbituri={() => navigateTo('abituri')}
        next={next.step}
        onNext={next.go}
      >
        {/* birthdays: within five days for teachers and admins, today's for members */}
        {access.on('birthdays') && <BirthdaysSoon />}
        {/* „ჩემი ღილაკები“: the member's own buttons, led by „ჩემი კანონი“ for a psalter-group member */}
        <ShortcutShelf />
      </HomeV2View>
      {next.learnPiece && (
        <Suspense fallback={null}>
          <LearnOpen key={next.learnPiece} piece={next.learnPiece} onDone={next.learnDone} />
        </Suspense>
      )}
      <Toast message={soon || ''} type="info" isVisible={!!soon} onClose={() => setSoon(null)} />
    </>
  );
};
