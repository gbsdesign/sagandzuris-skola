import { useEffect, useState } from 'react';
import { deleteField, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { writeDirectory } from '../utils/directory';

// A member's own profile photo (2026-11-06): a picture cut round on the phone (components/views/PhotoCrop.tsx), kept as a
// small JPEG data URL in `students.photo` (≤ 192 px) and, smaller, in `directory.photoURL` (≤ 96 px — the teachers' people
// lists). Where nothing of mine is kept, the account's own photo (Google's) shows as before. Class member lists and chat
// messages keep the account's photo (they are copied at joining; a member may not rewrite the class).

/** My own photo as kept, '' while none, null until read. */
export const useMyPhoto = (uid?: string | null) => {
  const [photo, setPhoto] = useState<string | null>(null);
  useEffect(() => {
    if (!uid) { setPhoto(''); return; }
    return onSnapshot(doc(db, 'students', uid), snap => {
      const v = snap.data()?.photo;
      setPhoto(typeof v === 'string' ? v : '');
    }, () => setPhoto(''));
  }, [uid]);
  return photo;
};

/** The photo to show for the signed-in person: their own when kept, else the account's. */
export const useShownPhoto = (uid?: string | null, accountPhoto?: string | null) => {
  const mine = useMyPhoto(uid);
  return mine || accountPhoto || '';
};

/** A smaller copy of a data URL picture (for the directory). */
const shrink = (dataUrl: string, size: number) => new Promise<string>(resolve => {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    if (!ctx) return resolve(dataUrl);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, size, size);
    resolve(c.toDataURL('image/jpeg', 0.8));
  };
  img.onerror = () => resolve(dataUrl);
  img.src = dataUrl;
});

/** Keeps a new own photo (a data URL) — or, with null, takes it off and the account's photo returns. */
export const saveMyPhoto = async (uid: string, dataUrl: string | null, accountPhoto: string) => {
  if (dataUrl) {
    await setDoc(doc(db, 'students', uid), { photo: dataUrl }, { mergeFields: ['photo'] });
    void writeDirectory(uid, { photoURL: await shrink(dataUrl, 96) });
  } else {
    await setDoc(doc(db, 'students', uid), { photo: deleteField() }, { mergeFields: ['photo'] });
    void writeDirectory(uid, { photoURL: accountPhoto });
  }
};
