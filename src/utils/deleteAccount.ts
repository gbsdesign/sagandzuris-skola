import { auth } from '../firebase';

// „ანგარიშის წაშლა“ (the profile's bottom, components/views/ProfileActions.tsx): the App Store asks that an app with
// accounts lets a person delete theirs from inside it. The reminders Worker (worker/reminders /delete-account) does it
// with the school's own key: the person's records (profile, path, takes, birthday, rights…), their place in the classes
// and psalter groups, this person's phones and browsers in its own list, and last the sign-in itself. Messages written in
// chats stay for the others to read. The Firebase ID token proves who asks.

const SERVER = 'https://sagandzuri-reminders.mr-gabunia.workers.dev';

/** Deletes the signed-in person's account. Returns '' when done, else why not (in plain Georgian). */
export const deleteMyAccount = async (): Promise<string> => {
  const user = auth.currentUser;
  if (!user) return 'ჯერ შედი ანგარიშში.';
  try {
    const res = await fetch(`${SERVER}/delete-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: await user.getIdToken(true) }),
    });
    if (!res.ok) return 'ანგარიში ვერ წაიშალა — სცადე მოგვიანებით.';
    return '';
  } catch {
    return 'სერვერთან კავშირი ვერ მოხერხდა — შეამოწმე ინტერნეტი და სცადე თავიდან.';
  }
};
