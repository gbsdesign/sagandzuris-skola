import { useEffect, useState } from 'react';
import { collection, doc, getDocs, onSnapshot, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { writeDirectory } from './directory';

// A member's name as the group sees it and prays for it: in Georgian letters, from the profile
// (students/{uid}.profile.firstName / lastName, and churchName — the name given at baptism, for the
// commemoration lists; when empty the first name is used). Google names are often Latin or carry
// a surname, so groups ask for these instead.

const GEORGIAN = /^[ა-ჿᲐ-Ჿ]+(?:[\s-][ა-ჿᲐ-Ჿ]+)*$/;
export const isGeorgian = (s: string | undefined) => !!s && GEORGIAN.test(s.trim());

export interface ProfileName {
  firstName: string;
  lastName: string;
  churchName: string;
}

export const fullName = (p: Partial<ProfileName> | undefined) => [p?.firstName, p?.lastName].map(x => (x || '').trim()).filter(Boolean).join(' ');
export const prayerName = (p: Partial<ProfileName> | undefined) => (p?.churchName || p?.firstName || '').trim();
export const hasGeorgianName = (p: Partial<ProfileName> | undefined) => isGeorgian(p?.firstName) && isGeorgian(p?.lastName);

/** The signed-in person's profile name (live). `null` while loading. */
export const useProfileName = (uid?: string | null) => {
  const [name, setName] = useState<ProfileName | null>(null);
  useEffect(() => {
    if (!uid) { setName(null); return; }
    return onSnapshot(
      doc(db, 'students', uid),
      snap => {
        const p = snap.data()?.profile || {};
        setName({ firstName: p.firstName || '', lastName: p.lastName || '', churchName: p.churchName || '' });
      },
      () => setName({ firstName: '', lastName: '', churchName: '' })
    );
  }, [uid]);
  return name;
};

/** Saves the Georgian name into the profile and into the member lists of my psalter groups. */
export const saveProfileName = async (uid: string, name: ProfileName, photoURL = '') => {
  const clean = { firstName: name.firstName.trim(), lastName: name.lastName.trim(), churchName: name.churchName.trim() };
  await setDoc(doc(db, 'students', uid), { profile: clean, updatedAt: new Date().toISOString() }, { merge: true });
  void writeDirectory(uid, clean);
  await renameInGroups(uid, fullName(clean), prayerName(clean), photoURL);
};

export const renameInGroups = async (uid: string, display: string, prayer: string, photoURL = '') => {
  if (!display) return;
  try {
    const snap = await getDocs(query(collection(db, 'psalterGroups'), where('memberIds', 'array-contains', uid)));
    await Promise.all(
      snap.docs.map(d => {
        const members: { uid: string; name: string; prayer?: string; photoURL?: string }[] = d.data().members || [];
        if (!members.some(m => m.uid === uid && (m.name !== display || m.prayer !== prayer))) return null;
        return updateDoc(d.ref, {
          members: members.map(m => (m.uid === uid ? { ...m, name: display, prayer, photoURL: m.photoURL || photoURL } : m)),
          updatedAt: new Date().toISOString(),
        });
      })
    );
  } catch (e) {
    console.warn('group rename:', e);
  }
};
