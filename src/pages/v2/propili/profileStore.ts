import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc, type DocumentData } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '../../../firebase';
import { useAuth } from '../../../context';
import { saveProfileName } from '../../../utils/memberName';
import type { WorkSchedule } from '../../../components/views/WorkScheduleEditor';

// The signed-in person's own record for the new look's profile screens (boards x-propili, x-piradi-inpormatsia,
// x-galoba-interesebi, x-mushaobis-ganrigi). The same fields the old profile card (components/views/StudentProfileCard)
// edits, written the same way — but a screen saves only what it changed, at once, and never leaves the profile
// incomplete (that would bring „პირველი გაცნობა“ back over the screen).

export type ProfileFields = {
  firstName?: string;
  lastName?: string;
  churchName?: string;
  birthDate?: { year: number; month: number; day: number };
  region?: string;
  city?: string;
  phone?: string;
  abilities?: string[];
  abilityOther?: string;
  instruments?: string[];
  chantPlace?: string;
  interests?: string[];
  interestOther?: string;
  voices?: string[];
  experienceLevel?: string[] | string;
  workSchedule?: WorkSchedule;
};

/** the three voices by the names the school uses */
export const VOICE_NAMES: Record<string, string> = { '1': 'მთქმელი', '2': 'მოძახილი', '3': 'ბანი' };

export interface ProfileDoc {
  /** undefined while loading, null when there is no record yet */
  data: DocumentData | null | undefined;
  profile: ProfileFields;
  /** „პირველი გაცნობა“ was filled in (its „არ ვიცი“ for the voice is kept there) */
  met: boolean;
  voiceUnknown: boolean;
  /** my own photo (students.photo), '' when none */
  photo: string;
}

/** students/{uid} of the signed-in person, live. */
export const useProfileDoc = (): ProfileDoc => {
  const { user } = useAuth();
  const uid = user && !user.isAnonymous ? user.uid : null;
  const [data, setData] = useState<DocumentData | null | undefined>(undefined);
  useEffect(() => {
    setData(undefined);
    if (!uid) return;
    return onSnapshot(doc(db, 'students', uid), snap => {
      // a device that never saw this record answers "missing" from its cache first: wait for the server
      if (!snap.exists() && snap.metadata.fromCache) return;
      setData(snap.exists() ? snap.data() : null);
    }, () => setData(null));
  }, [uid]);
  const profile: ProfileFields = data?.profile || {};
  return {
    data,
    profile,
    met: !!data?.firstMeeting,
    voiceUnknown: !!data?.firstMeeting?.voiceUnknown,
    photo: typeof data?.photo === 'string' ? data.photo : '',
  };
};

// what the old card writes beside the profile on every own save
const accountFields = (user: User, profile: ProfileFields) => ({
  userId: user.uid,
  email: user.email || '',
  displayName: user.displayName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
  photoURL: user.photoURL || '',
  authProvider: user.providerData.some(pd => pd.providerId === 'google.com') ? 'Google' : 'email',
});

/** Writes some profile fields (merged into the record). `voiceUnknown` goes where „პირველი გაცნობა“ keeps it. */
export const saveProfileFields = async (user: User, current: ProfileFields, patch: ProfileFields, voiceUnknown?: boolean) => {
  await setDoc(doc(db, 'students', user.uid), {
    ...accountFields(user, { ...current, ...patch }),
    profile: patch,
    ...(voiceUnknown === undefined ? {} : { firstMeeting: { voiceUnknown } }),
    updatedAt: new Date().toISOString(),
  }, { merge: true });
};

/** The name: the profile, the directory and my psalter groups' lists (as „პირველი გაცნობა“ saves it). */
export const saveName = (user: User, name: { firstName: string; lastName: string; churchName: string }, photo: string) =>
  saveProfileName(user.uid, name, photo || user.photoURL || '');

/** The work timetable as a whole: a day taken off must leave the record too (a merge would keep it). */
export const saveSchedule = (user: User, schedule: WorkSchedule) =>
  setDoc(doc(db, 'students', user.uid), {
    profile: { workSchedule: schedule },
    updatedAt: new Date().toISOString(),
  }, { mergeFields: ['profile.workSchedule', 'updatedAt'] });
