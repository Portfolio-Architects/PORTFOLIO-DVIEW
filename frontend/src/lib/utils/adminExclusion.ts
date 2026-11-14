import {
  NOISE_APARTMENT_QUERY_PARAMS,
  PRE_HYDRATION_APT_ALIAS_MAP,
} from './canonicalAptCatalog';

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

function getCaseInsensitiveSearchParam(
  params: URLSearchParams,
  targetKey: string
): string | null {
  const direct = params.get(targetKey);
  if (direct !== null) return direct;
  const lowerTarget = targetKey.toLowerCase();
  let matched: string | null = null;
  params.forEach((value, key) => {
    if (matched === null && key.toLowerCase() === lowerTarget) {
      matched = value;
    }
  });
  return matched;
}

function stripAdminQueryParamFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    const lowerTarget = ADMIN_QUERY_PARAM.toLowerCase();
    const keysToDelete: string[] = [];
    url.searchParams.forEach((_, key) => {
      if (key.toLowerCase() === lowerTarget) {
        keysToDelete.push(key);
      }
    });
    if (keysToDelete.length === 0) return;
    for (const key of keysToDelete) {
      url.searchParams.delete(key);
    }
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
    if (pendingNotice === 'status_off' && !active) {
      // Suppress GA4 beacon emission during the admin status-check load itself without persisting storage/cookie
      applyGaDisableFlag(true, explicitGaId);
    } else if (active) {
      setAdminTrackingExclusion(true, explicitGaId);
    } else {
      applyGaDisableFlag(false, explicitGaId);
    }
    return pendingNotice;
  }

  try {
    const params = new URLSearchParams(window.location.search || '');
    const rawToggle = getCaseInsensitiveSearchParam(params, ADMIN_QUERY_PARAM);
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
        if (active) {
          setAdminTrackingExclusion(true, explicitGaId);
        } else {
          // Suppress GA4 beacon emission during the diagnostic status check without persisting storage/cookie
          applyGaDisableFlag(true, explicitGaId);
        }
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
 * 1) Normalizes non-canonical `/apartment/[aptName]` paths (e.g. `/apartment/동탄역 롯데캐슬` ->
 *    `/apartment/동탄역롯데캐슬`, `/apartment/동탄역 시범 리슈빌` -> `/apartment/동탄역시범리슈빌아파트`)
 *    and strips crawler/translator noise query parameters (`?hl=ko-KR`, `?gl=KR`, `?_x_tr_*`)
 *    via `window.history.replaceState` strictly before `<GoogleAnalytics>` runs in `<body>`.
 * 2) Sets `window['ga-disable-<GA_ID>'] = true` immediately for registered admin devices
 *    and processes one-click `?dview_admin=1|0|status` URL switches while stripping the query parameter.
 */
const PRE_HYDRATION_APT_ALIAS_JSON = JSON.stringify(PRE_HYDRATION_APT_ALIAS_MAP).replace(/</g, '\\u003c');
const PRE_HYDRATION_NOISE_PARAMS_JSON = JSON.stringify(NOISE_APARTMENT_QUERY_PARAMS);

export function buildPreHydrationAdminGuardScript(explicitGaId?: string): string {
  const idsJson = JSON.stringify(resolveGaMeasurementIds(explicitGaId));
  const headAsyncSyncSnippet = `try{var hd=typeof document!=='undefined'&&document&&document.head;if(hd&&!hd.__dvHeadAsyncSync){hd.__dvHeadAsyncSync=1;var syncAsync=function(n){try{if(n&&n.nodeType===1&&n.nodeName==='SCRIPT'&&n.getAttribute('src')&&!n.defer&&!n.hasAttribute('defer')&&!n.hasAttribute('itemprop')&&!n.hasAttribute('async')){n.setAttribute('async','');}}catch(e){}return n;};var ex=hd.getElementsByTagName('script');for(var si=0;si<ex.length;si++)syncAsync(ex[si]);var oIB=hd.insertBefore;if(typeof oIB==='function'){hd.insertBefore=function(n,r){return oIB.call(this,syncAsync(n),r);};}var oAC=hd.appendChild;if(typeof oAC==='function'){hd.appendChild=function(n){return oAC.call(this,syncAsync(n));};}if(typeof window!=='undefined'&&window&&typeof window.MutationObserver==='function'){var mo=new window.MutationObserver(function(ms){for(var mi=0;mi<ms.length;mi++){var m=ms[mi];if(m.type==='attributes'){syncAsync(m.target);}else if(m.addedNodes){for(var ni=0;ni<m.addedNodes.length;ni++)syncAsync(m.addedNodes[ni]);}}});mo.observe(hd,{childList:true,attributes:true,attributeFilter:['src'],subtree:true});if(typeof window.addEventListener==='function'){window.addEventListener('load',function(){if(typeof window!=='undefined'&&window&&typeof window.setTimeout==='function'){window.setTimeout(function(){try{mo.disconnect();}catch(e){}},5000);}else{try{mo.disconnect();}catch(e){}}},{once:true});}}}}catch(e){}`;
  return `(function(){try{${headAsyncSyncSnippet}var K=${JSON.stringify(ADMIN_STORAGE_KEY)},Q=${JSON.stringify(ADMIN_QUERY_PARAM)},IDS=${idsJson},M=${ADMIN_COOKIE_MAX_AGE_SECONDS},AM=${PRE_HYDRATION_APT_ALIAS_JSON},NP=${PRE_HYDRATION_NOISE_PARAMS_JSON};var curPath=window.location?window.location.pathname||'':'';var curSearch=window.location?window.location.search||'':'';var curHash=window.location?window.location.hash||'':'';try{if(window.location&&window.history&&typeof window.history.replaceState==='function'){if(curPath.indexOf('/apartment/')===0){var rawSeg=curPath.slice(11).replace(/\\/+$/,'');if(rawSeg&&rawSeg.indexOf('/')===-1){var dec=rawSeg;var decOk=true;for(var d=0;d<3;d++){if(!/%[0-9A-Fa-f]{2}/.test(dec))break;try{var nxt=decodeURIComponent(dec).replace(/^\\s+|\\s+$/g,'');if(nxt===dec)break;dec=nxt;}catch(e){decOk=false;break;}}if(typeof dec.normalize==='function')dec=dec.normalize('NFC');var cleanDec=dec.replace(/[\\u200B-\\u200D\\uFEFF]/g,'').replace(/^\\[[^\\]]+\\]\\s*/,'');var k=cleanDec.replace(/\\s+/g,'').toLowerCase();var ks=cleanDec.replace(/\\[.*?\\]\\s*/g,'').replace(/[()（）,]/g,'').replace(/[Ⅰⅰ]/g,'1').replace(/[Ⅱⅱ]/g,'2').replace(/[Ⅲⅲ]/g,'3').replace(/[Ⅳⅳ]/g,'4').replace(/&/g,'앤').replace(/\\.+$/g,'').replace(/\\s+/g,'').toLowerCase();var lookup=function(key){var v=AM[key];return v?(v===1?key:v):'';};var resolveKey=function(key){if(!key)return '';var c=lookup(key);if(!c&&/아파트$/.test(key))c=lookup(key.replace(/아파트$/,''));if(!c)c=lookup(key+'아파트');return c;};var can=resolveKey(k)||resolveKey(ks);var tp=curPath;if(can){tp='/apartment/'+encodeURIComponent(can);}else if(decOk){tp='/apartment/'+encodeURIComponent(dec);}var spApt=new URLSearchParams(curSearch);var dirty=false;var rem=[];spApt.forEach(function(_,key){if(NP.indexOf(key.toLowerCase())!==-1){dirty=true;rem.push(key);}});for(var ri=0;ri<rem.length;ri++)spApt.delete(rem[ri]);var ns=dirty?(spApt.toString()?'?'+spApt.toString():''):curSearch;if(curPath!==tp||dirty){curPath=tp;curSearch=ns;window.history.replaceState(window.history.state,'',curPath+curSearch+curHash);}}}}}catch(e){}var hasCookie=function(){var c=document.cookie||'';var p=c.split(';');for(var i=0;i<p.length;i++){var t=p[i].replace(/^\\s+|\\s+$/g,'');if(t===K+'=true'||t===K+'=1')return true;};return false;};var hasLs=function(){try{return window.localStorage&&window.localStorage.getItem(K)==='true';}catch(e){return false;}};var setState=function(on){try{if(window.localStorage){if(on)window.localStorage.setItem(K,'true');else window.localStorage.removeItem(K);}}catch(e){}try{var sec=window.location&&window.location.protocol==='https:'?'; Secure':'';document.cookie=on?(K+'=true; path=/; max-age='+M+'; SameSite=Lax'+sec):(K+'=; path=/; max-age=0; SameSite=Lax'+sec);}catch(e){}for(var j=0;j<IDS.length;j++){window['ga-disable-'+IDS[j]]=Boolean(on);}};var strip=function(){try{if(window.history&&typeof window.history.replaceState==='function'){var spClean=new URLSearchParams(curSearch||(window.location&&window.location.search)||'');var qKeys=[];spClean.forEach(function(_,key){if(key.toLowerCase()===Q)qKeys.push(key);});if(qKeys.length>0){for(var qi=0;qi<qKeys.length;qi++)spClean.delete(qKeys[qi]);var nextSearch=spClean.toString()?'?'+spClean.toString():'';var baseP=curPath||(window.location&&window.location.pathname)||'/';var baseH=curHash||(window.location&&window.location.hash)||'';curSearch=nextSearch;window.history.replaceState(window.history.state,'',baseP+nextSearch+baseH);}}}catch(e){}};var sp=new URLSearchParams(curSearch||(window.location&&window.location.search)||'');var q=sp.get(Q);if(q===null){sp.forEach(function(val,key){if(q===null&&key.toLowerCase()===Q)q=val;});}if(q!==null){var v=q.replace(/^\\s+|\\s+$/g,'').toLowerCase();if(v==='1'||v==='true'||v==='on'){setState(true);strip();window.__dviewAdminNotice='enabled';return;}if(v==='0'||v==='false'||v==='off'){setState(false);strip();window.__dviewAdminNotice='disabled';return;}if(v==='status'||v==='check'){var cur=hasLs()||hasCookie();if(cur){setState(true);}else{for(var k2=0;k2<IDS.length;k2++){window['ga-disable-'+IDS[k2]]=true;}}strip();window.__dviewAdminNotice=cur?'status_on':'status_off';return;}}if(hasLs()||hasCookie()){setState(true);}}catch(e){}})();`;
}

