import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore, setLogLevel, connectFirestoreEmulator } from 'firebase/firestore';
import config from '../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Suppress internal Firestore connection retrying noise on offline/transient drops
setLogLevel('error');

let firestoreDb;
try {
  firestoreDb = initializeFirestore(
    app,
    {
      experimentalAutoDetectLongPolling: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    },
    (config as any).firestoreDatabaseId
  );
} catch (_) {
  firestoreDb = getFirestore(app, (config as any).firestoreDatabaseId);
}
export const db = firestoreDb;

// Development only: `VITE_EMULATORS=1 npm run dev` talks to the local Firebase emulators (auth 9099,
// firestore 8085) instead of the real project, so screens can be checked with made-up people and data.
if (import.meta.env.VITE_EMULATORS === '1') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8085);
  (window as unknown as Record<string, unknown>).__sgSignIn = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errStr = error instanceof Error ? error.message : String(error);
  const errCode = (error as any)?.code || '';

  // If this is a transient offline or network connection issue, log a warning without throwing fatal error
  if (
    errCode === 'unavailable' ||
    errCode === 'failed-precondition' ||
    errStr.includes('offline') ||
    errStr.includes('network-request-failed') ||
    errStr.includes('Could not reach Cloud Firestore backend') ||
    errStr.includes('auth/network-request-failed')
  ) {
    console.warn(`Firestore transient/offline mode for [${path}]:`, errStr);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errStr,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

