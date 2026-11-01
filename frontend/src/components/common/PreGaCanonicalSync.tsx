'use client';

import { useEffect } from 'react';

interface PreGaCanonicalSyncProps {
  canonicalPath: string;
}

/**
 * Normalizes non-canonical `/apartment/[aptName]` URLs in the browser address bar:
 * 1) During SSR (`typeof window === 'undefined'`), emits an executable inline `<script>`
 *    so the browser HTML parser runs `history.replaceState` synchronously before GA4/hydration.
 * 2) On the client (`typeof window !== 'undefined'`), renders the `<script>` with
 *    `type="application/json"` (data block) and `suppressHydrationWarning` so React 19 never
 *    emits "Encountered a script tag while rendering React component", while `useEffect`
 *    handles `history.replaceState` normalization during client-side App Router navigations.
 */
export default function PreGaCanonicalSync({ canonicalPath }: PreGaCanonicalSyncProps) {
  const safeCanonicalPathJson = JSON.stringify(canonicalPath).replace(/</g, '\\u003c');
  const preGaCanonicalSyncScript = `(function(){try{var p=${safeCanonicalPathJson};if(typeof window!=='undefined'&&window.location&&window.history&&typeof window.history.replaceState==='function'&&window.location.pathname!==p){window.history.replaceState(window.history.state,'',p+(window.location.search||'')+(window.location.hash||''));}}catch(_){}})();`;

  useEffect(() => {
    try {
      if (
        typeof window !== 'undefined' &&
        window.location &&
        window.history &&
        typeof window.history.replaceState === 'function' &&
        window.location.pathname !== canonicalPath
      ) {
        window.history.replaceState(
          window.history.state,
          '',
          canonicalPath + (window.location.search || '') + (window.location.hash || '')
        );
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
