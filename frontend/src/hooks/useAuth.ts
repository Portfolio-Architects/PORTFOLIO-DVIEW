import { useAuth as useGlobalAuth } from '@/lib/contexts/AuthContext';

export function useAuth() {
  return useGlobalAuth();
}

