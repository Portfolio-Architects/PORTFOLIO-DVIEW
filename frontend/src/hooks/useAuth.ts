import { useAuth as useGlobalAuth, AuthContextType } from '@/lib/contexts/AuthContext';

export function useAuth(): AuthContextType {
  return useGlobalAuth();
}

