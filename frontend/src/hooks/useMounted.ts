import { useState, useEffect } from 'react';

/**
 * A standard hook to check if the component has mounted on the client-side.
 * Prevents Next.js Server-Side Rendering (SSR) Hydration Mismatch issues
 * by safely gating client-only UI components or logic.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
