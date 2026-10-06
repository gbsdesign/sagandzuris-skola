import { doc, increment, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

// Listening counts for the admin's statistics ("ყველაზე მოსმენადი საგალობლები"): each signed-in
// person's plays are kept on their own record (students/{uid}.plays.{variantId}), once per version
// per visit, whether the synthesizer or a recording was played.
const counted = new Set<string>();

export const countPlay = (variantId: string, kind: 'synth' | 'rec') => {
  const user = auth.currentUser;
  if (!user || counted.has(`${variantId}:${kind}`)) return;
  counted.add(`${variantId}:${kind}`);
  setDoc(
    doc(db, 'students', user.uid),
    { plays: { [variantId]: increment(1) }, ...(kind === 'rec' ? { recPlays: { [variantId]: increment(1) } } : {}), lastPlayAt: new Date().toISOString() },
    { merge: true }
  ).catch(() => {});
};
