import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus';

export { useNetworkStatus };
export default function useNetworkStatusHook() {
  return useNetworkStatus();
}
