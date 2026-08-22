import { useAuth as useGlobalAuth, AuthContextType } from '@/contexts/AuthContext';

export function useAuth(): AuthContextType {
  return useGlobalAuth();
}

