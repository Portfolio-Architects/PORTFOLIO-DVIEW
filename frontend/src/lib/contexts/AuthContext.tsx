'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebaseConfig';
import { dashboardFacade } from '@/lib/DashboardFacade';
import { isAdmin } from '@/lib/config/admin.config';
import * as UserRepo from '@/lib/repositories/user.repository';
import * as PurchaseRepo from '@/lib/repositories/purchase.repository';
import { DEFAULT_AVATARS, type UserProfile } from '@/lib/types/user.types';

export interface AnonProfile {
  nickname: string;
  frontName?: string;
  photoURL?: string;
}

export interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  anonProfile: AnonProfile | null;
  purchasedReportIds: string[];
  isLoading: boolean;
  handleLogin: () => Promise<void>;
  handleLogout: () => Promise<void>;
  refreshPurchasedReports: () => Promise<void>;
  updateLocalAnonProfile: (profile: AnonProfile) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [anonProfile, setAnonProfile] = useState<AnonProfile | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [purchasedReportIds, setPurchasedReportIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Parallelize session cookie synchronization and Firestore data loading to eliminate network waterfall
        const cookiePromise = currentUser.getIdToken()
          .then((idToken) =>
            fetch('/api/auth/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken })
            })
          )
          .catch((cookieErr) => {
            console.warn('[AuthProvider] Failed to set session cookie:', cookieErr);
          });

        const dataPromise = Promise.all([
          dashboardFacade.getUserProfile(currentUser.uid),
          UserRepo.getOrCreateProfile(currentUser.uid),
          PurchaseRepo.getUserPurchasedReportIds(currentUser.uid)
        ]).then(([profile, up, purchased]) => {
          const normalizedProfile = profile;
          if (normalizedProfile) {
            if (isAdmin(currentUser.email)) {
              if (normalizedProfile.nickname !== '매니저') {
                dashboardFacade.updateNickname(currentUser.uid, '매니저');
              }
              normalizedProfile.nickname = '매니저';
            }
            if (normalizedProfile.photoURL && normalizedProfile.photoURL.includes('api.dicebear.com')) {
              normalizedProfile.photoURL = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
              dashboardFacade.updatePhotoURL(currentUser.uid, normalizedProfile.photoURL);
            }
          }
          setAnonProfile(normalizedProfile);
          setUserProfile(up);
          setPurchasedReportIds(purchased);

          if (isAdmin(currentUser.email)) {
            try { localStorage.setItem('dview_is_admin', 'true'); } catch (e) { /* noop */ }
          } else {
            try { localStorage.removeItem('dview_is_admin'); } catch (e) { /* noop */ }
          }
        }).catch((dataErr) => {
          console.error('[AuthProvider] Failed to fetch user data profiles:', dataErr);
        });

        await Promise.all([cookiePromise, dataPromise]);
      } else {
        setAnonProfile(null);
        setUserProfile(null);
        setPurchasedReportIds([]);
        try { localStorage.removeItem('dview_is_admin'); } catch (e) { /* noop */ }

        // Clear cookie on logout
        try {
          await fetch('/api/auth/session', { method: 'DELETE' });
        } catch (cookieErr) {
          console.warn('[AuthProvider] Failed to clear session cookie:', cookieErr);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const refreshPurchasedReports = async () => {
    if (user) {
      const ids = await PurchaseRepo.getUserPurchasedReportIds(user.uid);
      setPurchasedReportIds(ids);
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
        purchasedReportIds,
        isLoading,
        handleLogin,
        handleLogout,
        refreshPurchasedReports,
        updateLocalAnonProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
