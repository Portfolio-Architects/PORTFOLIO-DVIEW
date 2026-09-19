'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/types';
import { z } from 'zod';

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

export interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  anonProfile: AnonProfile | null;
  isLoading: boolean;
  handleLogin: () => Promise<void>;
  handleLogout: () => Promise<void>;
  updateLocalAnonProfile: (profile: AnonProfile) => void;
}

export const STATIC_AUTH_STATE: AuthContextType = Object.freeze({
  user: null,
  userProfile: null,
  anonProfile: null,
  isLoading: false,
  handleLogin: async () => {},
  handleLogout: async () => {},
  updateLocalAnonProfile: () => {},
});

export const AuthContext = createContext<AuthContextType>(STATIC_AUTH_STATE);

export const AuthProvider = React.memo(function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={STATIC_AUTH_STATE}>
      {children}
    </AuthContext.Provider>
  );
});

AuthProvider.displayName = 'AuthProvider';

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  return context ?? STATIC_AUTH_STATE;
}
