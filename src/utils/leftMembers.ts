import { useEffect, useState } from 'react';
import { arrayRemove, arrayUnion, deleteField, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

// „გასული“ (admin panel, stage IV, 2026-10-28): a member who finished the school or left it. They keep using the app as
// before — nothing is refused; the school's numbers and lists, the birthdays and the name days leave them out.
// settings/leftMembers { uids: [...], since: { uid: ISO time } } — admins write it (the settings rule), everyone may read
// it (only ids, no names), so the birthdays page can leave them out too.

/** `loaded`: the list has come (or could not), so counts may leave them out */
export interface LeftMembers { uids: ReadonlySet<string>; since: Record<string, string>; loaded?: boolean }
const NONE: LeftMembers = { uids: new Set(), since: {} };
const ref = () => doc(db, 'settings', 'leftMembers');

export const useLeftMembers = (enabled = true): LeftMembers => {
  const [v, setV] = useState<LeftMembers>(NONE);
  useEffect(() => {
    if (!enabled) { setV(NONE); return; }
    return onSnapshot(ref(), s => {
      const d = s.data() || {};
      setV({ uids: new Set(Array.isArray(d.uids) ? d.uids.map(String) : []), since: d.since && typeof d.since === 'object' ? d.since : {}, loaded: true });
    }, () => setV({ ...NONE, loaded: true }));
  }, [enabled]);
  return v;
};

/** Marks a member as left (on) or back in the school (off). */
export const setLeft = (uid: string, on: boolean) =>
  setDoc(ref(), {
    uids: on ? arrayUnion(uid) : arrayRemove(uid),
    since: { [uid]: on ? new Date().toISOString() : deleteField() },
    updatedAt: new Date().toISOString(),
  }, { merge: true });
