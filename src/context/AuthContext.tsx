import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { triggerHaptic } from '../utils/haptics';

export const SUPER_ADMIN_EMAIL = 'mr.gabunia@gmail.com';

export interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
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
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [signingIn, setSigningIn] = useState<boolean>(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (!currentUser) {
        setAccessToken(null);
        setIsAdmin(false);
        return;
      }

      const email = currentUser.email?.toLowerCase() || '';
      const isSuper = email === SUPER_ADMIN_EMAIL.toLowerCase();

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

      if (isSuper) {
        setIsAdmin(true);
        // Ensure superadmin doc exists in admins collection
        try {
          const adminRef = doc(db, 'admins', email);
          await setDoc(
            adminRef,
            {
              email: email,
              role: 'superadmin',
              addedBy: 'system',
              addedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (_) {}
      } else if (email) {
        try {
          const adminSnap = await getDoc(doc(db, 'admins', email));
          setIsAdmin(adminSnap.exists());
        } catch (_) {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
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
        isAdmin,
        isSuperAdmin,
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
