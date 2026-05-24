import { initializeApp, getApps } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = getApps().length === 0 && firebaseConfig.apiKey
  ? initializeApp(firebaseConfig) 
  : (getApps().length > 0 ? getApps()[0] : null);

export const db = (app ? initializeFirestore(app, { 
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()}),
  ignoreUndefinedProperties: true,
  experimentalForceLongPolling: true
}) : null) as unknown as ReturnType<typeof initializeFirestore>;


export const auth = (app ? getAuth(app) : null) as unknown as ReturnType<typeof getAuth>;
export const googleProvider = new GoogleAuthProvider();
export const storage = (app ? getStorage(app) : null) as unknown as ReturnType<typeof getStorage>;

