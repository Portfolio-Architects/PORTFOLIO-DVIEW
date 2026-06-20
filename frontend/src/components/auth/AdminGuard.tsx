'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(
    process.env.NODE_ENV === 'development' ? true : null
  );

  useEffect(() => {
    let mounted = true;

    // Dev mode: skip auth entirely
    if (process.env.NODE_ENV === 'development') {
      localStorage.setItem('dview_is_admin', 'true');
      return;
    }

    if (isLoading) return;

    if (!user) {
      setIsAuthorized(false);
      localStorage.removeItem('dview_is_admin');
      router.push('/');
      return;
    }

    const checkAdminClaims = async () => {
      try {
        // Force refresh the token to get the latest custom claims
        const idTokenResult = await user.getIdTokenResult(true);
        if (!mounted) return;
        if (idTokenResult.claims.admin === true) {
          setIsAuthorized(true);
          localStorage.setItem('dview_is_admin', 'true');
        } else {
          console.error("User does not have admin claims.");
          setIsAuthorized(false);
          localStorage.removeItem('dview_is_admin');
          router.push('/');
        }
      } catch (error) {
        if (!mounted) return;
        console.error("Error fetching token claims:", error);
        setIsAuthorized(false);
        localStorage.removeItem('dview_is_admin');
        router.push('/');
      }
    };

    checkAdminClaims();

    return () => {
      mounted = false;
    };
  }, [user, isLoading, router, pathname]);

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-body">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-toss-blue" size={40} />
          <p className="text-secondary font-medium">관리자 권한을 확인하고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}
