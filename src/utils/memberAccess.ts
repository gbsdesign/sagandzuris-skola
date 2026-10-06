import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, getDoc, increment, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import type { SectionId } from '../data/sections';

// A new member waits for a superadmin before anything for members opens:
// • memberAccess/{uid} { status: 'pending' | 'approved' | 'rejected', features: 'all' | FeatureId[], requestedAt,
//   attempts, lastAttemptAt, decidedAt } — the member reads it (the app needs to know what to show), only
//   superadmins change it; the member may only count their own visits.
// • accessDecisions/{uid} { by, at, status, features } — who decided: superadmins only, the member never sees it.
// While pending a member sees what guests see and „მიმდინარეობს დამატება“; a refused member is signed out with
// „დამატება შეფერხებულია“ every time, and their data stays. Features not given are simply not shown.
// Members from before this (a students document but no memberAccess) keep everything; staff never wait.

export type FeatureId = SectionId | 'recordings' | 'classes' | 'messages' | 'search' | 'calendar';
export type MemberStatus = 'pending' | 'approved' | 'rejected';

export interface FeatureDef { id: FeatureId; label: string; text: string }

/** Everything a superadmin may give a member, in the order the panel shows it. */
export const FEATURE_GROUPS: { title: string; items: FeatureDef[] }[] = [
  {
    title: 'სწავლა და მუსიკა',
    items: [
      { id: 'galoba', label: 'გალობა', text: 'საგალობლების წიგნები, ნოტების გვერდი, სინთეზატორი, ეკლესიის რეჟიმი და „დღევანდელი წირვა“' },
      { id: 'recordings', label: 'გალობის ჩანაწერები', text: 'საგალობლების აუდიოჩანაწერების მოსმენა ნოტებთან და სიებში' },
      { id: 'simghera', label: 'სიმღერა', text: 'ხალხური სიმღერების რუკა: ჩანაწერები, შემსრულებლები, ავტორები, სიები' },
      { id: 'sakravebi', label: 'საკრავები', text: 'ქართული ხალხური საკრავები: აღწერა და ჟღერადობა' },
      { id: 'mtkmeli', label: 'მთქმელი', text: 'ავტორების რუკა, მათი ნაწარმოებები და სრული ტექსტები' },
      { id: 'tamashebi', label: 'თამაშები', text: 'ჯერ მზადდება — გაიხსნება, როცა მზად იქნება' },
    ],
  },
  {
    title: 'სულიერი ცხოვრება',
    items: [
      { id: 'medavitneoba', label: 'მედავითნეობა', text: 'ფსალმუნთა ჯგუფი: კათისმების განაწილება და მოსახსენებელი სახელები' },
      { id: 'chvevebi', label: 'ჩვევები', text: 'ყოველდღიური ჩვევების მონიშვნა, 7 დღის ზოლი და ლოცვების შეხსენებები' },
      { id: 'gza', label: 'საგანძურის გზა', text: 'პირადი სასწავლო გზა: ჩანიშნული საგალობლები, მანერა, დამოუკიდებელი მუშაობა' },
      { id: 'biblioteka', label: 'ბიბლიოთეკა', text: 'საღმრთო ისტორია, დღესასწაულები და წმიდანთა ცხოვრება' },
      { id: 'tsinaprebi', label: 'გაიცანი წინაპრები', text: 'წინაპრების ბიოგრაფიები' },
    ],
  },
  {
    title: 'სკოლა და ურთიერთობა',
    items: [
      { id: 'classes', label: 'კლასი და კლასის ჩატი', text: 'კლასის გვერდი, დავალებები, ხმოვანი შეტყობინებები და ვიდეოზარი' },
      { id: 'messages', label: 'პირადი მიმოწერა', text: 'წერილები მასწავლებელთან ერთი-ერთზე' },
    ],
  },
  {
    title: 'ხელსაწყოები',
    items: [
      { id: 'search', label: 'ძიება', text: 'ერთი ძიება მთელ აპში: საგალობლები, ლოცვები, ბიბლია, ფსალმუნი, სიმღერები, დღესასწაულები' },
      { id: 'calendar', label: 'საეკლესიო კალენდარი', text: 'კალენდარი გვერდის ბოლოს და დღის წმიდანების ბარათი' },
    ],
  },
];

export const ALL_FEATURES: FeatureId[] = FEATURE_GROUPS.flatMap(g => g.items.map(i => i.id));
/** Open to everyone, signed in or not — not part of the choice. */
export const ALWAYS_OPEN = 'ლოცვანი, ფსალმუნი, აკათისტოები და ბიბლია ყველასთვის ღიაა.';

const accessRef = (uid: string) => doc(db, 'memberAccess', uid);

/**
 * On every sign-in, before the students document is written: a person without one (a brand-new member) gets a
 * waiting request; one who waits or was refused has the visit counted. Throws when the request could not be made,
 * so the caller does not write a students document that would make the newcomer look like an old member.
 */
export const ensureMembership = async (user: User) => {
  const now = new Date().toISOString();
  const snap = await getDoc(accessRef(user.uid));
  if (snap.exists()) {
    if (snap.data().status !== 'approved') {
      await updateDoc(accessRef(user.uid), { attempts: increment(1), lastAttemptAt: now }).catch(() => {});
    }
    return;
  }
  const student = await getDoc(doc(db, 'students', user.uid));
  if (student.exists()) return; // a member from before approvals: keeps everything
  await setDoc(accessRef(user.uid), { status: 'pending', features: [], requestedAt: now, attempts: 1, lastAttemptAt: now });
};

// ---- the signed-in person's access, live (one listener pair for the whole app) ----------------------------------
type Live = { uid: string | null; status: MemberStatus | 'legacy' | 'loading'; features: 'all' | FeatureId[] };
let live: Live = { uid: null, status: 'loading', features: [] };
const listeners = new Set<() => void>();
let off: (() => void) | null = null;
const emit = (next: Live) => { live = next; listeners.forEach(l => l()); };

const watch = (uid: string | null) => {
  if (live.uid === uid && (off || !uid)) return;
  off?.();
  off = null;
  emit({ uid, status: 'loading', features: [] });
  if (!uid) return;
  let access: { exists: boolean; status?: MemberStatus; features?: 'all' | FeatureId[] } | null = null;
  let studentExists: boolean | null = null;
  const decide = () => {
    if (!access) return;
    if (access.exists) {
      emit({ uid, status: access.status || 'pending', features: access.features || [] });
    } else if (studentExists !== null) {
      // no request: an old member (students document) keeps everything, a newcomer is waiting for theirs
      emit(studentExists ? { uid, status: 'legacy', features: 'all' } : { uid, status: 'pending', features: [] });
    }
  };
  const off1 = onSnapshot(accessRef(uid), snap => {
    const d = snap.data();
    const f = d?.features;
    access = snap.exists()
      ? { exists: true, status: d?.status, features: f === 'all' ? 'all' : Array.isArray(f) ? f : [] }
      : { exists: false };
    decide();
  }, err => {
    // the rules are not published yet (or another refusal): nobody is locked out by mistake
    console.warn('memberAccess: ', err?.code || err);
    emit({ uid, status: 'legacy', features: 'all' });
  });
  const off2 = onSnapshot(doc(db, 'students', uid), snap => { studentExists = snap.exists(); decide(); }, () => {});
  off = () => { off1(); off2(); };
};

export interface Membership {
  /** 'staff' — teachers and admins never wait; 'guest' — not signed in */
  status: MemberStatus | 'legacy' | 'loading' | 'staff' | 'guest';
  /** a full member: staff, an old member, or one a superadmin let in */
  isMember: boolean;
  can: (f: FeatureId) => boolean;
}

export const useMembership = (): Membership => {
  const { user, isTeacher } = useAuth();
  const [, setTick] = useState(0);
  useEffect(() => {
    watch(user?.uid ?? null);
    const l = () => setTick(t => t + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, [user?.uid]);
  if (!user) return { status: 'guest', isMember: false, can: () => false };
  if (isTeacher) return { status: 'staff', isMember: true, can: () => true };
  const mine = live.uid === user.uid ? live : { status: 'loading' as const, features: [] as FeatureId[] };
  const isMember = mine.status === 'legacy' || mine.status === 'approved';
  return {
    status: mine.status,
    isMember,
    can: f => isMember && (mine.features === 'all' || mine.features.includes(f)),
  };
};
