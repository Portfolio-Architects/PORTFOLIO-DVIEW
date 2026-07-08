import { initializeApp, getApps } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

declare global {
  interface Window {
    FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string;
  }
}

// Zod schemas for Firebase config and App Check config validation
export const FirebaseConfigSchema = z.object({
  apiKey: z.string().min(1, 'NEXT_PUBLIC_FIREBASE_API_KEY is missing'),
  authDomain: z.string().min(1, 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is missing'),
  projectId: z.string().min(1, 'NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing'),
  storageBucket: z.string().min(1, 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is missing'),
  messagingSenderId: z.string().min(1, 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID is missing'),
  appId: z.string().min(1, 'NEXT_PUBLIC_FIREBASE_APP_ID is missing'),
  measurementId: z.string().optional(),
});
export type FirebaseConfig = z.infer<typeof FirebaseConfigSchema>;

export const AppCheckConfigSchema = z.object({
  recaptchaKey: z.string().min(1, 'Recaptcha key is missing'),
  debugToken: z.string().optional(),
});
export type AppCheckConfig = z.infer<typeof AppCheckConfigSchema>;

const configValidation = FirebaseConfigSchema.safeParse({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
});

if (!configValidation.success && typeof window !== 'undefined') {
  logger.warn('firebaseConfig.init', 'Firebase configuration validation failed', { error: String(configValidation.error) });
}

const app = getApps().length === 0 && configValidation.success
  ? initializeApp(configValidation.data) 
  : (getApps().length > 0 ? getApps()[0] : null);

export const db = (app ? initializeFirestore(app, { 
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()}),
  ignoreUndefinedProperties: true,
  experimentalForceLongPolling: true
}) : null) as unknown as ReturnType<typeof initializeFirestore>;

export const auth = (app ? getAuth(app) : null) as unknown as ReturnType<typeof getAuth>;
export const googleProvider = new GoogleAuthProvider();
export const storage = (app ? getStorage(app) : null) as unknown as ReturnType<typeof getStorage>;

// 🔧 Firebase App Check Initialization (reCAPTCHA Enterprise for S+ security rating)
if (typeof window !== 'undefined' && app) {
  const isDev = process.env.NODE_ENV === 'development';
  const debugToken = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN;
  const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_KEY || process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  const isLocalhost = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.');

  if (isDev) {
    if (debugToken) {
      // Enable debug token for local testing in development mode
      window.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken === 'true' ? true : debugToken;
    } else {
      // By default in dev, we don't force App Check unless a debug token is configured.
      logger.info('firebaseConfig.appCheck', 'Local development: App Check token exchange skipped since NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN is not configured.');
    }
  }

  const appCheckValidation = AppCheckConfigSchema.safeParse({
    recaptchaKey,
    debugToken,
  });

  // On localhost, we only initialize App Check if a debug token is configured.
  // Otherwise, we initialize it in non-development (production) environments with a valid recaptcha key.
  const shouldInitialize = isLocalhost
    ? !!debugToken
    : ((!isDev && appCheckValidation.success) || (isDev && debugToken));

  if (shouldInitialize) {
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(
          recaptchaKey || '6Ld-test-key-for-dview'
        ),
        isTokenAutoRefreshEnabled: true
      });
    } catch (err: unknown) {
      logger.warn('firebaseConfig.appCheck', 'Failed to initialize App Check', {}, err instanceof Error ? err : new Error(String(err)));
    }
  } else {
    if (!isDev && !isLocalhost) {
      logger.warn('firebaseConfig.appCheck', 'Skipped initialization: No recaptcha key configured', { error: String(appCheckValidation.error) });
    }
  }
}
