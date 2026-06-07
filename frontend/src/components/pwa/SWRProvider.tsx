'use client';

import React, { ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus';

export default function SWRProvider({ children }: { children: ReactNode }) {
  const isOnline = useNetworkStatus();

  return (
    <SWRConfig
      value={{
        revalidateOnFocus: isOnline,
        revalidateOnReconnect: isOnline,
        shouldRetryOnError: isOnline,
        // Disable SWR auto-polling while offline to prevent error loops
        refreshInterval: isOnline ? undefined : 0,
        onError: (err) => {
          if (!isOnline) {
            // Mute errors in console when offline to avoid spamming
            return;
          }
          console.error('SWR Global Error:', err);
        }
      }}
    >
      {children}
    </SWRConfig>
  );
}
