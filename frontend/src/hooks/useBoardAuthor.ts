'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export const AUTHOR_TOKEN_STORAGE_KEY = 'dview_author_token';
export const AUTHOR_PROFILE_STORAGE_KEY = 'dview_author_profile';

export interface AuthorProfileState {
  selectedTitle: string | null;
  dong?: string;
  titleSetAt: number | null;
  titleExpiresAt: number | null;
  isGpsVerified: boolean;
  gpsVerifiedComplex?: string;
  gpsVerifiedAt?: number;
  isLocked: boolean;
  daysRemaining: number;
}

export interface UseBoardAuthorReturn {
  authorToken: string;
  selectedTitle: string | null;
  dong: string | null;
  titleSetAt: number | null;
  titleExpiresAt: number | null;
  isLocked: boolean;
  daysRemaining: number;
  isGpsVerified: boolean;
  gpsVerifiedComplex: string | null;
  gpsVerifiedAt: number | null;
  isLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  setLockedTitle: (title: string) => Promise<{
    success: boolean;
    error?: string;
    daysRemaining?: number;
    message?: string;
  }>;
  verifyLocation: (
    complexName: string,
    lat: number,
    lng: number
  ) => Promise<{
    verified: boolean;
    distanceMeters?: number;
    code?: string;
    message: string;
  }>;
}

/**
 * 256비트 암호학적 난수 64자리 Hex 토큰 생성
 */
export function generateClientAuthorToken(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // 브라우저 crypto 미지원 환경 폴백
  return Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

export function useBoardAuthor(): UseBoardAuthorReturn {
  const [authorToken, setAuthorToken] = useState<string>('');
  const [profile, setProfile] = useState<AuthorProfileState>({
    selectedTitle: null,
    dong: undefined,
    titleSetAt: null,
    titleExpiresAt: null,
    isGpsVerified: false,
    gpsVerifiedComplex: undefined,
    gpsVerifiedAt: undefined,
    isLocked: false,
    daysRemaining: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const authorTokenRef = useRef<string>('');
  authorTokenRef.current = authorToken;

  // 1. Initial Token & Profile Bootstrap
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let token = localStorage.getItem(AUTHOR_TOKEN_STORAGE_KEY);
    if (!token || token.trim().length === 0) {
      token = generateClientAuthorToken();
      localStorage.setItem(AUTHOR_TOKEN_STORAGE_KEY, token);
    }
    setAuthorToken(token);
    authorTokenRef.current = token;

    // Fast-path: Load cached profile snapshot to avoid layout flash
    try {
      const cached = localStorage.getItem(AUTHOR_PROFILE_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as AuthorProfileState;
        const now = Date.now();
        const isLocked = Boolean(parsed.titleExpiresAt && now < parsed.titleExpiresAt);
        const daysRemaining = isLocked && parsed.titleExpiresAt
          ? Math.max(1, Math.ceil((parsed.titleExpiresAt - now) / (24 * 60 * 60 * 1000)))
          : 0;

        setProfile({
          ...parsed,
          isLocked,
          daysRemaining,
        });
      }
    } catch {
      // Ignore cache parse failures
    }

    // Fetch fresh profile from API
    fetchProfile(token);

    // Multi-tab sync via storage event
    const handleStorage = (e: StorageEvent) => {
      if (e.key === AUTHOR_TOKEN_STORAGE_KEY && e.newValue) {
        setAuthorToken(e.newValue);
        authorTokenRef.current = e.newValue;
        fetchProfile(e.newValue);
      } else if (e.key === AUTHOR_PROFILE_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as AuthorProfileState;
          const now = Date.now();
          const isLocked = Boolean(parsed.titleExpiresAt && now < parsed.titleExpiresAt);
          const daysRemaining = isLocked && parsed.titleExpiresAt
            ? Math.max(1, Math.ceil((parsed.titleExpiresAt - now) / (24 * 60 * 60 * 1000)))
            : 0;
          setProfile({ ...parsed, isLocked, daysRemaining });
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // 2. Fetch Profile from Server
  const fetchProfile = useCallback(async (tokenToUse?: string) => {
    const token = tokenToUse || authorTokenRef.current;
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch('/api/board/profile', {
        method: 'GET',
        headers: {
          'x-author-token': token,
        },
      });

      if (!res.ok) {
        throw new Error(`Profile fetch failed: ${res.status}`);
      }

      const json = await res.json();
      if (json.success && json.data) {
        const data = json.data;
        const profileData = data.profile;

        if (profileData) {
          const now = Date.now();
          const isLocked = Boolean(profileData.titleExpiresAt && now < profileData.titleExpiresAt);
          const daysRemaining = isLocked
            ? Math.max(1, Math.ceil((profileData.titleExpiresAt - now) / (24 * 60 * 60 * 1000)))
            : 0;

          const updated: AuthorProfileState = {
            selectedTitle: profileData.selectedTitle || null,
            dong: profileData.dong || undefined,
            titleSetAt: profileData.titleSetAt || null,
            titleExpiresAt: profileData.titleExpiresAt || null,
            isGpsVerified: Boolean(profileData.isGpsVerified),
            gpsVerifiedComplex: profileData.gpsVerifiedComplex || undefined,
            gpsVerifiedAt: profileData.gpsVerifiedAt || undefined,
            isLocked,
            daysRemaining,
          };

          setProfile(updated);
          if (typeof window !== 'undefined') {
            localStorage.setItem(AUTHOR_PROFILE_STORAGE_KEY, JSON.stringify(updated));
          }
        } else {
          // No profile yet
          const emptyProfile: AuthorProfileState = {
            selectedTitle: null,
            dong: undefined,
            titleSetAt: null,
            titleExpiresAt: null,
            isGpsVerified: false,
            gpsVerifiedComplex: undefined,
            gpsVerifiedAt: undefined,
            isLocked: false,
            daysRemaining: 0,
          };
          setProfile(emptyProfile);
          if (typeof window !== 'undefined') {
            localStorage.removeItem(AUTHOR_PROFILE_STORAGE_KEY);
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  // 3. Set 30-Day Locked Title
  const setLockedTitle = useCallback(
    async (
      title: string
    ): Promise<{
      success: boolean;
      error?: string;
      daysRemaining?: number;
      message?: string;
    }> => {
      const token = authorTokenRef.current;
      if (!token) {
        return { success: false, error: 'TOKEN_MISSING', message: '작성자 토큰이 유효하지 않습니다.' };
      }

      try {
        setError(null);
        const res = await fetch('/api/board/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-author-token': token,
          },
          body: JSON.stringify({
            selectedTitle: title,
            authorToken: token,
          }),
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          const errCode = json.error?.code || 'SET_TITLE_FAILED';
          const errMsg = json.error?.message || '단지 타이틀 설정에 실패했습니다.';
          const days = json.error?.details?.daysRemaining;

          return {
            success: false,
            error: errCode,
            daysRemaining: days,
            message: errMsg,
          };
        }

        const profileData = json.data?.profile;
        if (profileData) {
          const now = Date.now();
          const isLocked = Boolean(profileData.titleExpiresAt && now < profileData.titleExpiresAt);
          const daysRemaining = isLocked
            ? Math.max(1, Math.ceil((profileData.titleExpiresAt - now) / (24 * 60 * 60 * 1000)))
            : 0;

          const updated: AuthorProfileState = {
            selectedTitle: profileData.selectedTitle,
            dong: profileData.dong,
            titleSetAt: profileData.titleSetAt,
            titleExpiresAt: profileData.titleExpiresAt,
            isGpsVerified: Boolean(profileData.isGpsVerified),
            gpsVerifiedComplex: profileData.gpsVerifiedComplex,
            gpsVerifiedAt: profileData.gpsVerifiedAt,
            isLocked,
            daysRemaining,
          };

          setProfile(updated);
          if (typeof window !== 'undefined') {
            localStorage.setItem(AUTHOR_PROFILE_STORAGE_KEY, JSON.stringify(updated));
          }
        }

        return { success: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        return { success: false, error: 'NETWORK_ERROR', message };
      }
    },
    []
  );

  // 4. Verify GPS Location for Complex
  const verifyLocation = useCallback(
    async (
      complexName: string,
      lat: number,
      lng: number
    ): Promise<{
      verified: boolean;
      distanceMeters?: number;
      code?: string;
      message: string;
    }> => {
      const token = authorTokenRef.current;
      if (!token) {
        return {
          verified: false,
          code: 'TOKEN_MISSING',
          message: '작성자 토큰이 유효하지 않습니다.',
        };
      }

      try {
        setError(null);
        const res = await fetch('/api/board/verify-location', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-author-token': token,
          },
          body: JSON.stringify({
            complexName,
            lat,
            lng,
            authorToken: token,
          }),
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          const errCode = json.error?.code || 'VERIFICATION_FAILED';
          const errMsg = json.error?.message || '위치 인증 처리에 실패했습니다.';
          return {
            verified: false,
            code: errCode,
            message: errMsg,
          };
        }

        const data = json.data;
        if (data.verified) {
          // Verification passed -> update profile state
          setProfile((prev) => {
            const updated: AuthorProfileState = {
              ...prev,
              isGpsVerified: true,
              gpsVerifiedComplex: complexName,
              gpsVerifiedAt: Date.now(),
            };
            if (typeof window !== 'undefined') {
              localStorage.setItem(AUTHOR_PROFILE_STORAGE_KEY, JSON.stringify(updated));
            }
            return updated;
          });
        }

        return {
          verified: Boolean(data.verified),
          distanceMeters: data.distanceMeters,
          code: data.code,
          message: data.message || (data.verified ? '위치 인증이 완료되었습니다.' : '위치 인증에 실패했습니다.'),
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        return {
          verified: false,
          code: 'NETWORK_ERROR',
          message: '위치 인증 통신 중 오류가 발생했습니다.',
        };
      }
    },
    []
  );

  return {
    authorToken,
    selectedTitle: profile.selectedTitle,
    dong: profile.dong || null,
    titleSetAt: profile.titleSetAt,
    titleExpiresAt: profile.titleExpiresAt,
    isLocked: profile.isLocked,
    daysRemaining: profile.daysRemaining,
    isGpsVerified: profile.isGpsVerified,
    gpsVerifiedComplex: profile.gpsVerifiedComplex || null,
    gpsVerifiedAt: profile.gpsVerifiedAt || null,
    isLoading,
    error,
    refreshProfile,
    setLockedTitle,
    verifyLocation,
  };
}

export default useBoardAuthor;
