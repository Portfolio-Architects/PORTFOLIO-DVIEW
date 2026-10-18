'use client';

import { useState, useEffect } from 'react';

export function useAdBlockDetector() {
  const [isAdBlockActive, setIsAdBlockActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    // 1. Create a dummy bait element that mimics ad placement
    // EasyList filters target classes like adsbox, ad-placeholder, adsbygoogle, ad-banner
    const testDiv = document.createElement('div');
    testDiv.className = 'adsbox ad-placeholder adsbygoogle ad-banner';
    testDiv.setAttribute(
      'style',
      'position: absolute; left: -9999px; top: -9999px; width: 1px; height: 1px; display: block !important;'
    );

    document.body.appendChild(testDiv);

    let scriptErrored = false;
    let scriptLoaded = false;
    const adsenseScriptEl = document.querySelector(
      'script#google-adsense, script[src*="adsbygoogle"]'
    );

    const evaluateBaitAndScript = () => {
      const adsbygoogle = window.adsbygoogle as
        | { push?: unknown; loaded?: boolean }
        | unknown[]
        | undefined;

      const hasCustomPush =
        Boolean(adsbygoogle) &&
        typeof (adsbygoogle as { push?: unknown }).push === 'function' &&
        (adsbygoogle as { push?: unknown }).push !== Array.prototype.push;
      const isLoadedFlag =
        Boolean(adsbygoogle) &&
        (adsbygoogle as { loaded?: boolean }).loaded === true;

      const rect = testDiv.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(testDiv);
      const cssExplicitlyHidden =
        computedStyle.display === 'none' || computedStyle.visibility === 'hidden';
      const domCollapsed =
        testDiv.offsetHeight === 0 ||
        testDiv.clientHeight === 0 ||
        rect.height === 0 ||
        cssExplicitlyHidden;

      // Guard against slow network false-positive:
      // If an AdSense script tag exists in the document, has not yet completed load or failed with an error event,
      // and the bait element is NOT collapsed in DOM, do not false-positive on Array.prototype.push alone
      // even when document.readyState has already transitioned to 'interactive' or 'complete'.
      const currentScriptEl =
        adsenseScriptEl ??
        document.querySelector('script#google-adsense, script[src*="adsbygoogle"]');
      const hasExplicitErrorAttr =
        currentScriptEl?.getAttribute('data-adblock-error') === 'true';
      const isSlowNetworkPending =
        Boolean(currentScriptEl) &&
        !domCollapsed &&
        !scriptErrored &&
        !scriptLoaded &&
        !hasExplicitErrorAttr;

      const scriptBlocked = !hasCustomPush && !isLoadedFlag && !isSlowNetworkPending;
      const isBlocked = scriptBlocked || domCollapsed;

      return { isBlocked, cssExplicitlyHidden, hasCustomPush, domCollapsed };
    };

    const checkAdBlock = () => {
      const { isBlocked } = evaluateBaitAndScript();
      setIsAdBlockActive(isBlocked);
      setIsLoading(false);
    };

    const handleScriptError = () => {
      scriptErrored = true;
      adsenseScriptEl?.setAttribute('data-adblock-error', 'true');
      setIsAdBlockActive(true);
      setIsLoading(false);
    };

    const handleScriptLoad = () => {
      scriptLoaded = true;
      checkAdBlock();
    };

    if (adsenseScriptEl) {
      adsenseScriptEl.addEventListener('error', handleScriptError);
      adsenseScriptEl.addEventListener('load', handleScriptLoad);
    }

    const timer = setTimeout(() => {
      checkAdBlock();
      if (document.body.contains(testDiv)) {
        document.body.removeChild(testDiv);
      }
    }, 2000);

    return () => {
      clearTimeout(timer);
      if (adsenseScriptEl) {
        adsenseScriptEl.removeEventListener('error', handleScriptError);
        adsenseScriptEl.removeEventListener('load', handleScriptLoad);
      }
      if (document.body.contains(testDiv)) {
        document.body.removeChild(testDiv);
      }
    };
  }, []);

  return { isAdBlockActive, isLoading };
}
