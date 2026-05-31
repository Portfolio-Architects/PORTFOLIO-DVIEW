import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebaseConfig';
import { dashboardFacade } from '@/lib/DashboardFacade';
import * as UserRepo from '@/lib/repositories/user.repository';
import * as PurchaseRepo from '@/lib/repositories/purchase.repository';
import type { UserProfile } from '@/lib/types/user.types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [anonProfile, setAnonProfile] = useState<{nickname: string; frontName?: string; photoURL?: string} | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [purchasedReportIds, setPurchasedReportIds] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const profile = await dashboardFacade.getUserProfile(currentUser.uid);
        setAnonProfile(profile);
        const up = await UserRepo.getOrCreateProfile(currentUser.uid);
        setUserProfile(up);
        const purchased = await PurchaseRepo.getUserPurchasedReportIds(currentUser.uid);
        setPurchasedReportIds(purchased);

        // Sync cookie on login (HttpOnly session cookie for S+ security rating)
        try {
          const idToken = await currentUser.getIdToken();
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken })
          });
        } catch (cookieErr) {
          console.warn('[useAuth] Failed to set session cookie:', cookieErr);
        }
      } else {
        setAnonProfile(null);
        setUserProfile(null);
        setPurchasedReportIds([]);

        // Clear cookie on logout
        try {
          await fetch('/api/auth/session', { method: 'DELETE' });
        } catch (cookieErr) {
          console.warn('[useAuth] Failed to clear session cookie:', cookieErr);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try { await signInWithPopup(auth, googleProvider); } 
    catch (error) { console.error("Login failed", error); }
  };

  const handleLogout = async () => {
    try { await signOut(auth); } 
    catch (error) { console.error("Logout failed", error); }
  };

  const refreshPurchasedReports = async () => {
    if (user) {
      const ids = await PurchaseRepo.getUserPurchasedReportIds(user.uid);
      setPurchasedReportIds(ids);
    }
  };

  return {
    user,
    userProfile,
    anonProfile,
    purchasedReportIds,
    handleLogin,
    handleLogout,
    refreshPurchasedReports
  };
}
