import React, { useEffect, useState } from 'react';
import { useAuth, useViewing } from '../../../context';
import { useNotes } from '../../../context/NotesContext';
import { useCall } from '../../../utils/callSession';
import { useBackToClose } from '../../../utils/backToClose';
import { Layer, MomentView, ShareView } from './ShareView';
import { useLearned, type LearnedItem } from './useLearned';

/** „ვისწავლე“: the first time this device sees an item whose marked voices a teacher all confirmed, one full-screen moment
 *  (board x-idea-barati-0) → „გაზიარე“ opens the card page. Mount it once, anywhere under the providers (App's late layers). */
export const LearnedMoment: React.FC = () => {
  const { user } = useAuth();
  const viewing = useViewing();
  const { notes, programOpen, church } = useNotes();
  const call = useCall();
  const uid = user && !user.isAnonymous && !viewing ? user.uid : null;
  const { items, fresh, dismiss } = useLearned(uid);
  const [shown, setShown] = useState<LearnedItem | null>(null);
  const [card, setCard] = useState(false);

  // waits while the notes, the program, church mode or a call is open; one moment, the rest of the batch is not shown
  const busy = notes || programOpen || church || call.status !== 'idle';
  useEffect(() => {
    if (!shown && fresh.length && !busy) { setShown(items[fresh[0]] ?? null); dismiss(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, fresh, busy, items]);

  useEffect(() => {
    if (!shown) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[aria-labelledby]')) { setShown(null); setCard(false); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [shown]);

  const close = () => { setShown(null); setCard(false); };
  // the phone's back: the card goes back to the moment, then the moment closes
  useBackToClose(!!uid && !!shown, close);
  useBackToClose(!!uid && !!shown && card, () => setCard(false));
  if (!uid || !shown) return null;
  return (
    <Layer>
      {card
        ? <ShareView item={shown} person={user?.displayName || ''} onBack={() => setCard(false)} />
        : <MomentView item={shown} onShare={() => setCard(true)} onClose={close} />}
    </Layer>
  );
};
