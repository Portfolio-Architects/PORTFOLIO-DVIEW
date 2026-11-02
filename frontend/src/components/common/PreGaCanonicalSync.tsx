'use client';

import { useEffect } from 'react';
import {
  NOISE_APARTMENT_QUERY_PARAMS,
  stripApartmentNoiseQueryParams,
} from '@/lib/utils/apartmentMapping';

interface PreGaCanonicalSyncProps {
  canonicalPath: string;
}

/**
 * Normalizes non-canonical `/apartment/[aptName]` URLs and strips crawler/translator
 * noise query parameters (`?hl=ko-KR`, `?gl=KR`, `?_x_tr_*`) in the browser address bar:
 * 1) During SSR (`typeof window === 'undefined'`), emits an executable inline `<script>`
 *    so the browser HTML parser runs `history.replaceState` synchronously before GA4/hydration.
 * 2) On the client (`typeof window !== 'undefined'`), renders the `<script>` with
 *    `type="application/json"` (data block) and `suppressHydrationWarning` so React 19 never
 *    emits "Encountered a script tag while rendering React component", while `useEffect`
 *    handles `history.replaceState` normalization during client-side App Router navigations.
 */
export default function PreGaCanonicalSync({ canonicalPath }: PreGaCanonicalSyncProps) {
  const safeCanonicalPathJson = JSON.stringify(canonicalPath).replace(/</g, '\\u003c');
  const safeNoiseParamsJson = JSON.stringify(NOISE_APARTMENT_QUERY_PARAMS);
  const preGaCanonicalSyncScript = `(function(){try{var p=${safeCanonicalPathJson},np=${safeNoiseParamsJson};if(typeof window!=='undefined'&&window.location&&window.history&&typeof window.history.replaceState==='function'){var s=window.location.search||'';var sp=new URLSearchParams(s);var dirty=false;var keys=Array.from(sp.keys());for(var i=0;i<keys.length;i++){var k=keys[i].toLowerCase();if(np.indexOf(k)!==-1){sp.delete(keys[i]);dirty=true;}}var ns=dirty?(sp.toString()?'?'+sp.toString():''):s;if(window.location.pathname!==p||dirty){window.history.replaceState(window.history.state,'',p+ns+(window.location.hash||''));}}}catch(_){}})();`;

  useEffect(() => {
    try {
      if (
        typeof window !== 'undefined' &&
        window.location &&
        window.history &&
        typeof window.history.replaceState === 'function'
      ) {
        const currentSearch = window.location.search || '';
        const cleanedSearch = stripApartmentNoiseQueryParams(currentSearch);
        if (window.location.pathname !== canonicalPath || cleanedSearch !== currentSearch) {
          window.history.replaceState(
            window.history.state,
            '',
            canonicalPath + cleanedSearch + (window.location.hash || '')
          );
        }
      }
    } catch {
      // Ignore history API restrictions in embedded/sandboxed contexts
    }
  }, [canonicalPath]);

  const scriptType = typeof window === 'undefined' ? undefined : 'application/json';

  return (
    <script
      id="dview-pre-ga-canonical-sync"
      type={scriptType}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: preGaCanonicalSyncScript }}
    />
  );
}
