import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
} from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { triggerHaptic } from '../utils/haptics';

export const SUPER_ADMIN_EMAIL = 'mr.gabunia@gmail.com';

// Who may do what (firestore.rules mirrors this):
// • owner — the school's founder (SUPER_ADMIN_EMAIL): everything, and only they name superadmins;
// • superadmin — up to three trusted people: everything, including naming admins;
// • admin — runs the school: every class and group, users, naming teachers, content;
// • teacher — leads their own classes and psalter groups only (also the "დღევანდელი წირვა" program);
// • member — a signed-in student or parishioner; guest — not signed in.
// Staff roles live in admins/{email} { role }; old documents without a role are admins.
export type Role = 'superadmin' | 'admin' | 'teacher' | 'member' | 'guest';
export type StaffRole = 'superadmin' | 'admin' | 'teacher';
export const MAX_EXTRA_SUPERADMINS = 3;

export const ROLE_LABEL: Record<Role, string> = {
  superadmin: 'სუპერადმინი',
  admin: 'ადმინი',
  teacher: 'მასწავლებელი',
  member: 'წევრი',
  guest: 'სტუმარი',
};

export interface AuthContextType {
  user: User | null;
  role: Role;
  isOwner: boolean;
  isAdmin: boolean;      // admin, superadmin or owner
  isSuperAdmin: boolean; // superadmin or owner
  isTeacher: boolean;    // teacher, or any admin
  loading: boolean;
  signingIn: boolean;
  accessToken: string | null;
  errorMessage: string | null;
  signInWithGoogle: () => Promise<string | null>;
  signOutUser: () => Promise<void>;
  getOrPromptDriveToken: () => Promise<string | null>;
  clearErrorMessage: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [staffRole, setStaffRole] = useState<StaffRole | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [signingIn, setSigningIn] = useState<boolean>(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isOwner = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  const role: Role = !user ? 'guest' : isOwner ? 'superadmin' : staffRole ?? 'member';
  const isSuperAdmin = role === 'superadmin';
  const isAdmin = isSuperAdmin || role === 'admin';
  const isTeacher = isAdmin || role === 'teacher';

  // the signed-in person's staff document, live: a role given or taken away applies at once
  useEffect(() => {
    const email = user?.email?.toLowerCase();
    if (!email || isOwner) { setStaffRole(null); return; }
    return onSnapshot(
      doc(db, 'admins', email),
      snap => {
        const r = snap.exists() ? (snap.data().role || 'admin') : null;
        setStaffRole(r === 'superadmin' || r === 'admin' || r === 'teacher' ? r : null);
      },
      () => setStaffRole(null)
    );
  }, [user, isOwner]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (!currentUser) {
        setAccessToken(null);
        return;
      }

      const email = currentUser.email?.toLowerCase() || '';

      // Automatically register/update student in Firestore so registered user list always reflects active users
      try {
        const studentRef = doc(db, 'students', currentUser.uid);
        await setDoc(
          studentRef,
          {
            userId: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || '',
            photoURL: currentUser.photoURL || '',
            lastActiveAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('Student sync error:', e);
      }

      // the owner's own staff document, so the admin lists show them
      if (email === SUPER_ADMIN_EMAIL.toLowerCase()) {
        setDoc(
          doc(db, 'admins', email),
          { email, role: 'superadmin', userId: currentUser.uid, name: currentUser.displayName || '', addedBy: 'system' },
          { merge: true }
        ).catch(() => {});
      }
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<string | null> => {
    triggerHaptic(20);
    try {
      setSigningIn(true);
      setErrorMessage(null);
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || null;
      if (token) {
        setAccessToken(token);
      }
      return token;
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        setErrorMessage('ავტორიზაციის ფანჯარა დაიხურა.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        // Ignored
      } else {
        setErrorMessage('ავტორიზაციისას დაფიქსირდა შეცდომა. გთხოვთ, სცადოთ ხელახლა.');
      }
      return null;
    } finally {
      setSigningIn(false);
    }
  };

  const getOrPromptDriveToken = useCallback(async (): Promise<string | null> => {
    if (accessToken) return accessToken;
    return await signInWithGoogle();
  }, [accessToken]);

  const signOutUser = async () => {
    triggerHaptic(20);
    try {
      await signOut(auth);
      setAccessToken(null);
    } catch {
      setErrorMessage('სისტემიდან გამოსვლისას დაფიქსირდა შეცდომა.');
    }
  };

  const clearErrorMessage = () => setErrorMessage(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isOwner,
        isAdmin,
        isSuperAdmin,
        isTeacher,
        loading,
        signingIn,
        accessToken,
        errorMessage,
        signInWithGoogle,
        signOutUser,
        getOrPromptDriveToken,
        clearErrorMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
