'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebaseConfig';
import { dashboardFacade } from '@/lib/DashboardFacade';
import { isAdmin } from '@/lib/config/admin.config';
import * as UserRepo from '@/lib/repositories/user.repository';
import { DEFAULT_AVATARS, type UserProfile } from '@/lib/types/user.types';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

export interface AnonProfile {
  nickname: string;
  frontName?: string;
  photoURL?: string;
}

export const AnonProfileSchema = z.object({
  nickname: z.string(),
  frontName: z.string().optional(),
  photoURL: z.string().optional().nullable(),
});

export const UserProfileSchema = z.object({
  nickname: z.string().min(1, 'Nickname cannot be empty'),
  hasSetNickname: z.boolean().optional(),
  photoURL: z.string().nullable().optional(),
  verifiedApartment: z.string().optional(),
  verificationLevel: z.enum(['none', 'self_declared', 'registry_verified']).optional(),
  uploaderPoints: z.number().int().optional(),
  uploaderTier: z.string().optional(),
}).passthrough();

interface E2EMockAuth {
  onAuthStateChanged: (callback: (user: User | null) => void) => () => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  anonProfile: AnonProfile | null;
  isLoading: boolean;
  handleLogin: () => Promise<void>;
  handleLogout: () => Promise<void>;
  updateLocalAnonProfile: (profile: AnonProfile) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = React.memo(function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [anonProfile, setAnonProfile] = useState<AnonProfile | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    // 🚀 Playwright E2E Integration / Mock Auth Bridge
    if (typeof window !== 'undefined' && (window as Window & { __E2E_MOCK_AUTH__?: E2EMockAuth }).__E2E_MOCK_AUTH__) {
      const mockAuth = (window as Window & { __E2E_MOCK_AUTH__?: E2EMockAuth }).__E2E_MOCK_AUTH__!;
      const unsubscribeMock = mockAuth.onAuthStateChanged(async (currentUser: User | null) => {
        if (!mounted) return;
        setUser(currentUser);
        if (currentUser) {
          // Playwright E2E Mocking: Bypass actual network session cookie fetch to avoid server-side Firebase SDK validation crash
          const cookiePromise = Promise.resolve();

          const dataPromise = Promise.resolve().then(() => {
            if (!mounted) return;
            const mockProfile = {
              nickname: currentUser.displayName || '테스터',
              photoURL: currentUser.photoURL || undefined
            };
            setAnonProfile(mockProfile);
            // TypeScript Audit Fix: Set only allowed properties for UserProfile to prevent compilation failure
            setUserProfile({
              nickname: currentUser.displayName || '테스터',
              photoURL: currentUser.photoURL || undefined
            });
            if (currentUser.email === 'manager@dview.kr') {
              try { localStorage.setItem('dview_is_admin', 'true'); } catch (e) {}
            } else {
              try { localStorage.removeItem('dview_is_admin'); } catch (e) {}
            }
          });

          await Promise.all([cookiePromise, dataPromise]);
        } else {
          setAnonProfile(null);
          setUserProfile(null);
          try { localStorage.removeItem('dview_is_admin'); } catch (e) {}
          // Bypass session cookie delete in mock mode
        }
        if (mounted) {
          setIsLoading(false);
        }
      });

      return () => {
        mounted = false;
        unsubscribeMock();
      };
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!mounted) return;
      setUser(currentUser);
      if (currentUser) {
        // Parallelize session cookie synchronization and Firestore data loading to eliminate network waterfall
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const cookiePromise = currentUser.getIdToken()
          .then((idToken) => {
            if (!mounted) return;
            return fetch('/api/auth/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken }),
              signal: controller.signal
            });
          })
          .catch((cookieErr) => {
            logger.warn('AuthProvider.onAuthStateChanged', 'Failed to set session cookie', {}, cookieErr);
          })
          .finally(() => clearTimeout(timeoutId));

        const dataPromise = Promise.all([
          dashboardFacade.getUserProfile(currentUser.uid),
          UserRepo.getOrCreateProfile(currentUser.uid)
        ]).then(([profile, up]) => {
          if (!mounted) return;
          const normalizedProfile = profile;
          if (normalizedProfile) {
            const parsedAnon = AnonProfileSchema.safeParse(normalizedProfile);
            if (!parsedAnon.success) {
              logger.warn('AuthProvider.onAuthStateChanged', 'Anon profile validation failed', { errors: parsedAnon.error.format() });
            }

            if (isAdmin(currentUser.email)) {
              if (normalizedProfile.nickname !== '매니저') {
                dashboardFacade.updateNickname(currentUser.uid, '매니저').catch((err) => {
                  logger.error('AuthProvider.onAuthStateChanged', 'Failed to update admin nickname asynchronously', { uid: currentUser.uid }, err);
                });
              }
              normalizedProfile.nickname = '매니저';
            }
            if (normalizedProfile.photoURL && normalizedProfile.photoURL.includes('api.dicebear.com')) {
              normalizedProfile.photoURL = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
              dashboardFacade.updatePhotoURL(currentUser.uid, normalizedProfile.photoURL).catch((err) => {
                logger.error('AuthProvider.onAuthStateChanged', 'Failed to update photoURL asynchronously', { uid: currentUser.uid }, err);
              });
            }
          }
          setAnonProfile(normalizedProfile);

          if (up) {
            const parsedUser = UserProfileSchema.safeParse(up);
            if (!parsedUser.success) {
              logger.warn('AuthProvider.onAuthStateChanged', 'User profile validation failed', { errors: parsedUser.error.format() });
            }
          }
          setUserProfile(up);

          if (isAdmin(currentUser.email)) {
            try { localStorage.setItem('dview_is_admin', 'true'); } catch (e) { /* noop */ }
          } else {
            try { localStorage.removeItem('dview_is_admin'); } catch (e) { /* noop */ }
          }
        }).catch((dataErr) => {
          logger.error('AuthProvider.onAuthStateChanged', 'Failed to fetch user data profiles', {}, dataErr);
        });

        await Promise.all([cookiePromise, dataPromise]);
      } else {
        if (!mounted) return;
        setAnonProfile(null);
        setUserProfile(null);
        try { localStorage.removeItem('dview_is_admin'); } catch (e) { /* noop */ }

        // Clear cookie on logout
        try {
          await fetch('/api/auth/session', { method: 'DELETE' });
        } catch (cookieErr) {
          logger.warn('AuthProvider.onAuthStateChanged', 'Failed to clear session cookie', {}, cookieErr);
        }
      }
      if (mounted) {
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    try {
      // 🚀 Playwright E2E Integration / Mock Auth Bridge
      if (typeof window !== 'undefined' && (window as Window & { __E2E_MOCK_AUTH__?: E2EMockAuth }).__E2E_MOCK_AUTH__) {
        await (window as Window & { __E2E_MOCK_AUTH__?: E2EMockAuth }).__E2E_MOCK_AUTH__!.signIn();
        return;
      }

      if (!auth) return;
      
      const isMobile = typeof window !== 'undefined' && 
        (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768);
        
      if (isMobile) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error) {
      logger.error('AuthProvider.handleLogin', 'Login failed', {}, error);
    }
  };

  const handleLogout = async () => {
    try {
      // 🚀 Playwright E2E Integration / Mock Auth Bridge
      if (typeof window !== 'undefined' && (window as Window & { __E2E_MOCK_AUTH__?: E2EMockAuth }).__E2E_MOCK_AUTH__) {
        await (window as Window & { __E2E_MOCK_AUTH__?: E2EMockAuth }).__E2E_MOCK_AUTH__!.signOut();
        return;
      }

      await signOut(auth);
    } catch (error) {
      logger.error('AuthProvider.handleLogout', 'Logout failed', {}, error);
    }
  };

  const updateLocalAnonProfile = (profile: AnonProfile) => {
    setAnonProfile(profile);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        anonProfile,
        isLoading,
        handleLogin,
        handleLogout,
        updateLocalAnonProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
});

AuthProvider.displayName = 'AuthProvider';

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
