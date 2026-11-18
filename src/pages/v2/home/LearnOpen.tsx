import React, { useEffect, useRef } from 'react';
import { useOpenLearning } from '../../../components/learn/openLearning';

// Loaded only when the home's „გააგრძელე“ opens a chant or a song in its learning mode (HomeV2 `React.lazy`): the learning
// opener brings the chant books and the songs with it, so the home's first load stays small. It opens the piece once —
// exactly as the old home's review line did (components/home/LearnDue) — and tells the home it is done.

const LearnOpen: React.FC<{ piece: string; onDone: () => void }> = ({ piece, onDone }) => {
  const open = useOpenLearning();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    open(piece);
    onDone();
    // once, for the piece it was mounted with
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};

export default LearnOpen;
