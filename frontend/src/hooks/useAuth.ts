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
            console.warn('[useAuth] Failed to set session cookie:', cookieErr);
          });

        const dataPromise = Promise.all([
          dashboardFacade.getUserProfile(currentUser.uid),
          UserRepo.getOrCreateProfile(currentUser.uid),
          PurchaseRepo.getUserPurchasedReportIds(currentUser.uid)
        ]).then(([profile, up, purchased]) => {
          setAnonProfile(profile);
          setUserProfile(up);
          setPurchasedReportIds(purchased);
        }).catch((dataErr) => {
          console.error('[useAuth] Failed to fetch user data profiles:', dataErr);
        });

        await Promise.all([cookiePromise, dataPromise]);
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
