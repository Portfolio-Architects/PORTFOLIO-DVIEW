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

    // 1. Create a dummy element that mimics ad placement
    // easy-list filters look for classes like adsbox, ad-placeholder, adsbygoogle, etc.
    const testDiv = document.createElement('div');
    testDiv.className = 'adsbox ad-placeholder adsbygoogle ad-banner';
    testDiv.setAttribute(
      'style',
      'position: absolute; left: -9999px; top: -9999px; width: 1px; height: 1px; display: block !important;'
    );
    
    document.body.appendChild(testDiv);

    const checkAdBlock = () => {
      // 2. Check if window.adsbygoogle is loaded and initialized
      const adsbygoogle = (window as any).adsbygoogle;
      const scriptBlocked = !adsbygoogle || adsbygoogle.push === Array.prototype.push;

      // 3. Check if the DOM element is hidden or collapsed by the adblock extension
      const rect = testDiv.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(testDiv);
      const domBlocked = 
        testDiv.offsetHeight === 0 || 
        testDiv.clientHeight === 0 || 
        rect.height === 0 || 
        computedStyle.display === 'none' || 
        computedStyle.visibility === 'hidden';

      const isBlocked = scriptBlocked || domBlocked;

      setIsAdBlockActive(isBlocked);
      setIsLoading(false);
    };

    // Delay evaluation slightly to allow AdBlockers time to process the DOM element
    const timer = setTimeout(() => {
      checkAdBlock();
      if (document.body.contains(testDiv)) {
        document.body.removeChild(testDiv);
      }
    }, 2000);

    return () => {
      clearTimeout(timer);
      if (document.body.contains(testDiv)) {
        document.body.removeChild(testDiv);
      }
    };
  }, []);

  return { isAdBlockActive, isLoading };
}
