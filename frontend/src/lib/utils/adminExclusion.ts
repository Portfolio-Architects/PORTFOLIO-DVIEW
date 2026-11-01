export const ADMIN_STORAGE_KEY = 'dview_is_admin';
export const ADMIN_COOKIE_NAME = 'dview_is_admin';
export const ADMIN_QUERY_PARAM = 'dview_admin';
export const ADMIN_COOKIE_MAX_AGE_SECONDS = 31536000; // 365 days
export const DEFAULT_GA_MEASUREMENT_ID = 'G-Y17BHJ77W6';

export type AdminToggleNotice = 'enabled' | 'disabled' | 'status_on' | 'status_off';

declare global {
  interface Window {
    __dviewAdminNotice?: AdminToggleNotice;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

export function hasAdminExclusionCookie(rawCookie?: string | null): boolean {
  if (typeof rawCookie !== 'string' || rawCookie.length === 0) {
    return false;
  }
  const parts = rawCookie.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (
      trimmed === `${ADMIN_COOKIE_NAME}=true` ||
      trimmed === `${ADMIN_COOKIE_NAME}=1`
    ) {
      return true;
    }
  }
  return false;
}

export interface RequestLikeForAdminCheck {
  cookies?: {
    get?: (name: string) => { value?: string } | undefined;
  };
  headers?: {
    get?: (name: string) => string | null;
  };
}

export function isRequestFromExcludedAdmin(
  request?: RequestLikeForAdminCheck | null
): boolean {
  if (!request) return false;
  try {
    const cookieVal = request.cookies?.get?.(ADMIN_COOKIE_NAME)?.value;
    if (cookieVal === 'true' || cookieVal === '1') {
      return true;
    }
  } catch {
    // Fall through to raw Cookie header inspection
  }
  try {
    const rawCookieHeader = request.headers?.get?.('cookie');
    return hasAdminExclusionCookie(rawCookieHeader);
  } catch {
    return false;
  }
}

export function resolveGaMeasurementIds(explicitGaId?: string): string[] {
  const candidates = [
    typeof explicitGaId === 'string' ? explicitGaId.trim() : '',
    typeof process !== 'undefined' && typeof process.env?.NEXT_PUBLIC_GA_ID === 'string'
      ? process.env.NEXT_PUBLIC_GA_ID.trim()
      : '',
    DEFAULT_GA_MEASUREMENT_ID,
  ];
  const unique: string[] = [];
  for (const id of candidates) {
    if (id && !unique.includes(id)) {
      unique.push(id);
    }
  }
  return unique;
}

export function applyGaDisableFlag(disabled: boolean, explicitGaId?: string): void {
  if (typeof window === 'undefined') return;
  const ids = resolveGaMeasurementIds(explicitGaId);
  for (const id of ids) {
    try {
      window[`ga-disable-${id}`] = disabled;
    } catch {
      // Ignore read-only window property errors in exotic sandboxes
    }
  }
}

export function isAdminTrackingExcludedClient(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(ADMIN_STORAGE_KEY) === 'true') {
      return true;
    }
  } catch {
    // Ignore SecurityError when storage is disabled
  }

  try {
    if (typeof document !== 'undefined' && hasAdminExclusionCookie(document.cookie)) {
      return true;
    }
  } catch {
    // Ignore document.cookie access errors
  }

  return false;
}

export function setAdminTrackingExclusion(enabled: boolean, explicitGaId?: string): void {
  if (typeof window === 'undefined') return;

  try {
    if (typeof localStorage !== 'undefined') {
      if (enabled) {
        localStorage.setItem(ADMIN_STORAGE_KEY, 'true');
      } else {
        localStorage.removeItem(ADMIN_STORAGE_KEY);
      }
    }
  } catch {
    // Ignore storage quota or SecurityError
  }

  try {
    if (typeof document !== 'undefined') {
      const secureAttr =
        typeof window.location !== 'undefined' && window.location.protocol === 'https:'
          ? '; Secure'
          : '';
      if (enabled) {
        document.cookie = `${ADMIN_COOKIE_NAME}=true; path=/; max-age=${ADMIN_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secureAttr}`;
      } else {
        document.cookie = `${ADMIN_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax${secureAttr}`;
      }
    }
  } catch {
    // Ignore cookie write errors
  }

  applyGaDisableFlag(enabled, explicitGaId);
}

function stripAdminQueryParamFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(ADMIN_QUERY_PARAM)) return;
    url.searchParams.delete(ADMIN_QUERY_PARAM);
    const cleanRelative = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(window.history.state, '', cleanRelative);
  } catch {
    // Ignore history API errors
  }
}

export function syncAdminTrackingStateClient(explicitGaId?: string): AdminToggleNotice | null {
  if (typeof window === 'undefined') return null;

  if (window.__dviewAdminNotice) {
    const pendingNotice = window.__dviewAdminNotice;
    delete window.__dviewAdminNotice;
    const active = isAdminTrackingExcludedClient();
    applyGaDisableFlag(active, explicitGaId);
    return pendingNotice;
  }

  try {
    const params = new URLSearchParams(window.location.search || '');
    const rawToggle = params.get(ADMIN_QUERY_PARAM);
    if (rawToggle !== null) {
      const normalized = rawToggle.trim().toLowerCase();
      if (normalized === '1' || normalized === 'true' || normalized === 'on') {
        setAdminTrackingExclusion(true, explicitGaId);
        stripAdminQueryParamFromUrl();
        return 'enabled';
      }
      if (normalized === '0' || normalized === 'false' || normalized === 'off') {
        setAdminTrackingExclusion(false, explicitGaId);
        stripAdminQueryParamFromUrl();
        return 'disabled';
      }
      if (normalized === 'status' || normalized === 'check') {
        const active = isAdminTrackingExcludedClient();
        applyGaDisableFlag(active, explicitGaId);
        stripAdminQueryParamFromUrl();
        return active ? 'status_on' : 'status_off';
      }
    }
  } catch {
    // Ignore URLSearchParams errors
  }

  const excluded = isAdminTrackingExcludedClient();
  if (excluded) {
    setAdminTrackingExclusion(true, explicitGaId);
  }
  return null;
}

/**
 * Generates a synchronous pre-hydration `<head>` inline script that executes BEFORE
 * `@next/third-parties/google` (`_next-ga-init` / `gtag.js`) initializes.
 * Sets `window['ga-disable-<GA_ID>'] = true` immediately for registered admin devices
 * and processes one-click `?dview_admin=1|0|status` URL switches while stripping the query parameter.
 */
export function buildPreHydrationAdminGuardScript(explicitGaId?: string): string {
  const idsJson = JSON.stringify(resolveGaMeasurementIds(explicitGaId));
  return `(function(){try{var K=${JSON.stringify(ADMIN_STORAGE_KEY)},Q=${JSON.stringify(ADMIN_QUERY_PARAM)},IDS=${idsJson},M=${ADMIN_COOKIE_MAX_AGE_SECONDS};var hasCookie=function(){var c=document.cookie||'';var p=c.split(';');for(var i=0;i<p.length;i++){var t=p[i].replace(/^\\s+|\\s+$/g,'');if(t===K+'=true'||t===K+'=1')return true;}return false;};var hasLs=function(){try{return window.localStorage&&window.localStorage.getItem(K)==='true';}catch(e){return false;}};var setState=function(on){try{if(window.localStorage){if(on)window.localStorage.setItem(K,'true');else window.localStorage.removeItem(K);}}catch(e){}try{var sec=window.location&&window.location.protocol==='https:'?'; Secure':'';document.cookie=on?(K+'=true; path=/; max-age='+M+'; SameSite=Lax'+sec):(K+'=; path=/; max-age=0; SameSite=Lax'+sec);}catch(e){}for(var j=0;j<IDS.length;j++){window['ga-disable-'+IDS[j]]=Boolean(on);}};var strip=function(){try{var u=new URL(window.location.href);if(u.searchParams.has(Q)){u.searchParams.delete(Q);window.history.replaceState(window.history.state,'',u.pathname+u.search+u.hash);}}catch(e){}};var sp=new URLSearchParams(window.location.search||'');var q=sp.get(Q);if(q!==null){var v=q.replace(/^\\s+|\\s+$/g,'').toLowerCase();if(v==='1'||v==='true'||v==='on'){setState(true);strip();window.__dviewAdminNotice='enabled';return;}if(v==='0'||v==='false'||v==='off'){setState(false);strip();window.__dviewAdminNotice='disabled';return;}if(v==='status'||v==='check'){var cur=hasLs()||hasCookie();if(cur)setState(true);strip();window.__dviewAdminNotice=cur?'status_on':'status_off';return;}}if(hasLs()||hasCookie()){setState(true);}}catch(e){}})();`;
}
