import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context';
import { NOTIFY_DEFAULTS, NotifyPrefs, prefsOf } from './notifyRules';

export * from './notifyRules';

// The signed-in person's notice settings (see notifyRules.ts): their record `students/{uid}.notify` + the reminders Worker's copy.

const SERVER = 'https://sagandzuri-reminders.mr-gabunia.workers.dev';

/** The signed-in person's settings: read live from their record; `save` writes the record and tells the Worker. */
export const useNotifyPrefs = (): { prefs: NotifyPrefs; loaded: boolean; save: (next: NotifyPrefs) => Promise<void> } => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotifyPrefs>(NOTIFY_DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const uid = user?.uid;

  useEffect(() => {
    if (!uid) { setPrefs(NOTIFY_DEFAULTS); setLoaded(true); return; }
    return onSnapshot(
      doc(db, 'students', uid),
      snap => { setPrefs(prefsOf(snap.get('notify'))); setLoaded(true); },
      () => setLoaded(true),
    );
  }, [uid]);

  const save = async (next: NotifyPrefs) => {
    if (!user) return;
    const clean = prefsOf(next);
    setPrefs(clean);
    await setDoc(doc(db, 'students', user.uid), { notify: clean }, { merge: true });
    // the Worker keeps its own copy (it sends the summary and holds the quiet hours' messages); a failed call is tried
    // again on the next change — the record above stays the truth
    try {
      await fetch(`${SERVER}/notify-prefs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: await user.getIdToken(), prefs: clean }),
      });
    } catch { /* offline: the next save sends it */ }
  };

  return { prefs, loaded, save };
};
