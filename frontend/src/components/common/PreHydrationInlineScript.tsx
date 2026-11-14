'use client';

import { useEffect } from 'react';

interface PreHydrationInlineScriptProps {
  id: string;
  code: string;
  nonce?: string;
  runCapturePreviewOnMount?: boolean;
}

/**
 * Emits an executable inline `<script>` during SSR (`typeof window === 'undefined'`) so the
 * browser HTML parser runs `code` synchronously before React hydration, while marking
 * `type="application/json"` (a standard HTML script data block) on the client
 * (`typeof window !== 'undefined'`) with `suppressHydrationWarning` so React 19 never logs
 * "Encountered a script tag while rendering React component" during client mounts or Fast Refresh.
 */
export default function PreHydrationInlineScript({
  id,
  code,
  nonce,
  runCapturePreviewOnMount = false,
}: PreHydrationInlineScriptProps) {
  useEffect(() => {
    if (!runCapturePreviewOnMount) return;
    try {
      const win = window as Window & { __dviewCapturePreviewSnap?: () => void };
      if (typeof win.__dviewCapturePreviewSnap === 'function') {
        win.__dviewCapturePreviewSnap();
      }
    } catch {
      // Ignore sandboxed preview restrictions
    }
  }, [runCapturePreviewOnMount]);

  const scriptType = typeof window === 'undefined' ? undefined : 'application/json';

  return (
    <script
      id={id}
      nonce={nonce}
      type={scriptType}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}
