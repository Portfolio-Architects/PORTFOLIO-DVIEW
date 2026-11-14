import fs from 'fs';
import path from 'path';
import vm from 'vm';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NextRequest } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  ADMIN_STORAGE_KEY,
  buildPreHydrationAdminGuardScript,
  hasAdminExclusionCookie,
  isAdminTrackingExcludedClient,
  isRequestFromExcludedAdmin,
  setAdminTrackingExclusion,
  syncAdminTrackingStateClient,
} from './adminExclusion';
import {
  trackEvent,
  trackVirtualPageView,
  getVirtualPageViewCount,
  resetVirtualPageViewLedger,
} from './analytics';
import {
  dispatchGa4AdTelemetry,
  sendAdTelemetryBeacon,
  sendTelemetry,
} from '@/lib/ads/cascadeFallback';
import SiteTracker from '@/components/SiteTracker';
import * as TrafficRepo from '@/lib/repositories/traffic.repository';

jest.mock('@/lib/services/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('D-VIEW Admin Device GA4 & Telemetry Exclusion System', () => {
  const originalEnv = process.env;

  function clearAdminState() {
    localStorage.clear();
    document.cookie = `${ADMIN_COOKIE_NAME}=; path=/; max-age=0`;
    delete window.__dviewAdminNotice;
    delete window['ga-disable-G-Y17BHJ77W6'];
    delete window.dataLayer;
    delete window.gtag;
    resetVirtualPageViewLedger();
    window.history.replaceState(null, '', '/');
  }

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      NEXT_PUBLIC_GA_ID: 'G-Y17BHJ77W6',
    };
    clearAdminState();
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
    clearAdminState();
  });

  it('places synchronous #dview-ga-admin-guard inside <head> strictly before <GoogleAnalytics in RootLayout', () => {
    const layoutPath = path.resolve(__dirname, '../../app/layout.tsx');
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');

    const guardIdx = layoutContent.indexOf('id="dview-ga-admin-guard"');
    const headCloseIdx = layoutContent.indexOf('</head>');
    const gaIdx = layoutContent.indexOf('<GoogleAnalytics');

    expect(guardIdx).toBeGreaterThan(-1);
    expect(headCloseIdx).toBeGreaterThan(guardIdx);
    expect(gaIdx).toBeGreaterThan(headCloseIdx);
  });

  it('executes pre-hydration inline guard for ?dview_admin=1|0|status, sets ga-disable synchronously, and strips query parameter cleanly', () => {
    const scriptCode = buildPreHydrationAdminGuardScript('G-Y17BHJ77W6');

    // 1. Activate with ?dview_admin=1 while preserving other query params and hash
    window.history.replaceState(null, '', '/explore?dong=오산동&dview_admin=1#top');
    vm.runInNewContext(scriptCode, {
      window,
      document,
      URL,
      URLSearchParams,
    });

    expect(localStorage.getItem(ADMIN_STORAGE_KEY)).toBe('true');
    expect(hasAdminExclusionCookie(document.cookie)).toBe(true);
    expect(window['ga-disable-G-Y17BHJ77W6']).toBe(true);
    expect(window.__dviewAdminNotice).toBe('enabled');
    expect(window.location.search).not.toContain('dview_admin');
    expect(decodeURIComponent(window.location.search)).toBe('?dong=오산동');
    expect(window.location.hash).toBe('#top');

    // 2. Subsequent normal page load with localStorage cleared (cookie-only resilience, e.g. PWA/ITP)
    delete window.__dviewAdminNotice;
    delete window['ga-disable-G-Y17BHJ77W6'];
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    window.history.replaceState(null, '', '/guide/dongtan-1-vs-2-comparison');

    vm.runInNewContext(scriptCode, {
      window,
      document,
      URL,
      URLSearchParams,
    });

    expect(window['ga-disable-G-Y17BHJ77W6']).toBe(true);
    expect(localStorage.getItem(ADMIN_STORAGE_KEY)).toBe('true');
    expect(window.__dviewAdminNotice).toBeUndefined();

    // 3. Status check (?dview_admin=status)
    window.history.replaceState(null, '', '/?dview_admin=status');
    vm.runInNewContext(scriptCode, {
      window,
      document,
      URL,
      URLSearchParams,
    });
    expect(window.__dviewAdminNotice).toBe('status_on');
    expect(window.location.search).toBe('');

    // 4. Deactivate (?dview_admin=0)
    window.history.replaceState(null, '', '/?dview_admin=0');
    vm.runInNewContext(scriptCode, {
      window,
      document,
      URL,
      URLSearchParams,
    });
    expect(localStorage.getItem(ADMIN_STORAGE_KEY)).toBeNull();
    expect(hasAdminExclusionCookie(document.cookie)).toBe(false);
    expect(window['ga-disable-G-Y17BHJ77W6']).toBe(false);
    expect(window.__dviewAdminNotice).toBe('disabled');
    expect(window.location.search).toBe('');
  });

  it('blocks trackEvent, trackVirtualPageView, dispatchGa4AdTelemetry, sendTelemetry, and sendAdTelemetryBeacon when excluded', () => {
    setAdminTrackingExclusion(true, 'G-Y17BHJ77W6');
    expect(isAdminTrackingExcludedClient()).toBe(true);

    const gtagMock = jest.fn();
    window.gtag = gtagMock;
    const beaconSpy = jest.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'sendBeacon', {
      value: beaconSpy,
      configurable: true,
      writable: true,
    });

    trackEvent('tab_view', { tab_name: 'overview' });
    const vpv = trackVirtualPageView('/apartment/동탄역롯데캐슬');

    expect(vpv.gaEventDispatched).toBe(false);
    expect(vpv.adsenseVirtualPvDispatched).toBe(0);
    expect(getVirtualPageViewCount()).toBe(0);

    expect(
      dispatchGa4AdTelemetry({
        eventType: 'VIEWABLE_IMPRESSION',
        slotId: '6782594447',
      })
    ).toBe(false);

    expect(
      sendTelemetry({
        eventType: 'IMPRESSION',
        slotId: '6782594447',
      })
    ).toBe(false);

    expect(
      sendAdTelemetryBeacon({
        eventType: 'CLICK',
        slotId: '6782594447',
        timestamp: new Date().toISOString(),
      })
    ).toBe(false);

    expect(gtagMock).not.toHaveBeenCalled();
    expect(beaconSpy).not.toHaveBeenCalled();
  });

  it('renders Zero-CLS confirmation toast in SiteTracker only when toggled via ?dview_admin=1 and suppresses visit increment', () => {
    jest.useFakeTimers();
    const visitSpy = jest
      .spyOn(TrafficRepo, 'incrementWebsiteVisit')
      .mockResolvedValue(undefined);

    try {
      window.history.replaceState(null, '', '/?dview_admin=1');
      render(<SiteTracker />);

      const toast = screen.getByTestId('dview-admin-exclusion-toast');
      expect(toast).toBeInTheDocument();
      expect(toast.className).toContain('fixed');
      expect(screen.getByText('관리자 기기 등록 완료')).toBeInTheDocument();
      expect(visitSpy).not.toHaveBeenCalled();
      expect(window['ga-disable-G-Y17BHJ77W6']).toBe(true);

      // Auto-dismisses after 4500ms
      act(() => {
        jest.advanceTimersByTime(4600);
      });
      expect(screen.queryByTestId('dview-admin-exclusion-toast')).not.toBeInTheDocument();

      // Dismiss button works immediately when status checked
      window.history.replaceState(null, '', '/?dview_admin=status');
      expect(syncAdminTrackingStateClient('G-Y17BHJ77W6')).toBe('status_on');
    } finally {
      visitSpy.mockRestore();
      jest.useRealTimers();
    }
  });

  it('identifies excluded admin requests via dview_is_admin cookie on NextRequest for server API routes', () => {
    const normalReq = new NextRequest('https://dongtanview.com/api/traffic', {
      method: 'POST',
    });
    expect(isRequestFromExcludedAdmin(normalReq)).toBe(false);

    const adminReq = new NextRequest('https://dongtanview.com/api/traffic', {
      method: 'POST',
      headers: {
        cookie: 'other_cookie=abc; dview_is_admin=true; theme=dark',
      },
    });
    expect(isRequestFromExcludedAdmin(adminReq)).toBe(true);

    // Dismiss button coverage on SiteTracker
    window.__dviewAdminNotice = 'enabled';
    render(<SiteTracker />);
    const closeBtn = screen.getByRole('button', { name: '알림 닫기' });
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('dview-admin-exclusion-toast')).not.toBeInTheDocument();
  });

  it('synchronizes ga-disable across cross-tab storage, foreground visibilitychange/focus, pageshow, pushState, and blocks GA4 leakage during ?dview_admin=status (status_off) inspection', () => {
    jest.useFakeTimers();
    try {
      // 0. Pre-hydration <head> script on ?dview_admin=status (unexcluded device) must suppress GA4 for the diagnostic pageview without persisting storage/cookie
      window.history.replaceState(null, '', '/?dview_admin=status');
      const headScript = buildPreHydrationAdminGuardScript('G-Y17BHJ77W6');
      vm.runInNewContext(headScript, {
        window,
        document,
        URLSearchParams,
      });
      expect(window.__dviewAdminNotice).toBe('status_off');
      expect(window['ga-disable-G-Y17BHJ77W6']).toBe(true);
      expect(localStorage.getItem(ADMIN_STORAGE_KEY)).toBeNull();
      expect(hasAdminExclusionCookie(document.cookie)).toBe(false);
      delete window.__dviewAdminNotice;
      delete window['ga-disable-G-Y17BHJ77W6'];

      // 1. Mount on an unexcluded browser checking ?dview_admin=status -> shows status_off toast, holds ga-disable=true for this diagnostic load without writing storage/cookie, and allows 1-click enable
      window.history.replaceState(null, '', '/?Dview_Admin=status');
      render(<SiteTracker />);

      expect(screen.getByText('관리자 제외 비활성 상태')).toBeInTheDocument();
      expect(window['ga-disable-G-Y17BHJ77W6']).toBe(true);
      expect(localStorage.getItem(ADMIN_STORAGE_KEY)).toBeNull();
      expect(hasAdminExclusionCookie(document.cookie)).toBe(false);

      const enableBtn = screen.getByTestId('dview-admin-enable-btn');
      fireEvent.click(enableBtn);

      expect(screen.getByText('관리자 기기 등록 완료')).toBeInTheDocument();
      expect(localStorage.getItem(ADMIN_STORAGE_KEY)).toBe('true');
      expect(hasAdminExclusionCookie(document.cookie)).toBe(true);
      expect(window['ga-disable-G-Y17BHJ77W6']).toBe(true);

      act(() => {
        jest.advanceTimersByTime(4600);
      });
      expect(screen.queryByTestId('dview-admin-exclusion-toast')).not.toBeInTheDocument();

      // 2. Simulate long-lived background tab where ga-disable flag & cookie were cleared while localStorage remained 'true'
      delete window['ga-disable-G-Y17BHJ77W6'];
      document.cookie = `${ADMIN_COOKIE_NAME}=; path=/; max-age=0`;
      expect(hasAdminExclusionCookie(document.cookie)).toBe(false);
      act(() => {
        window.dispatchEvent(new Event('storage'));
      });
      expect(window['ga-disable-G-Y17BHJ77W6']).toBe(true);
      expect(hasAdminExclusionCookie(document.cookie)).toBe(true);

      // 3. Simulate foreground wakeup (visibilitychange, focus) and bfcache restore (pageshow)
      delete window['ga-disable-G-Y17BHJ77W6'];
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(window['ga-disable-G-Y17BHJ77W6']).toBe(true);

      delete window['ga-disable-G-Y17BHJ77W6'];
      act(() => {
        window.dispatchEvent(new Event('focus'));
      });
      expect(window['ga-disable-G-Y17BHJ77W6']).toBe(true);

      delete window['ga-disable-G-Y17BHJ77W6'];
      act(() => {
        window.dispatchEvent(new Event('pageshow'));
      });
      expect(window['ga-disable-G-Y17BHJ77W6']).toBe(true);

      // 4. Client-side SPA navigation via history.pushState with mixed-case ?DVIEW_ADMIN=0 & ?DVIEW_ADMIN=1
      act(() => {
        window.history.pushState(null, '', '/?DVIEW_ADMIN=0');
      });
      expect(window['ga-disable-G-Y17BHJ77W6']).toBe(false);
      expect(localStorage.getItem(ADMIN_STORAGE_KEY)).toBeNull();
      expect(window.location.search).toBe('');

      act(() => {
        window.history.pushState(null, '', '/?DVIEW_ADMIN=1');
      });
      expect(window['ga-disable-G-Y17BHJ77W6']).toBe(true);
      expect(localStorage.getItem(ADMIN_STORAGE_KEY)).toBe('true');
      expect(window.location.search).toBe('');
    } finally {
      jest.useRealTimers();
    }
  });

  it('prevents React 19 <head> hydration mismatch when AdSense prepends show_ads_impl script before inline <head> scripts', async () => {
    const ReactDOMClient = await import('react-dom/client');
    const shieldCode = '(function(){window.__shieldRan=true;})();';
    const scriptCode = buildPreHydrationAdminGuardScript('G-Y17BHJ77W6');

    const originalHeadHtml = document.head.innerHTML;
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      // 1. Simulate SSR <head> output from RootLayout
      document.head.innerHTML = '';

      const shieldEl = document.createElement('script');
      shieldEl.id = 'dview-preview-iframe-shield';
      shieldEl.innerHTML = shieldCode;
      document.head.appendChild(shieldEl);

      const guardEl = document.createElement('script');
      guardEl.id = 'dview-ga-admin-guard';
      guardEl.innerHTML = scriptCode;
      document.head.appendChild(guardEl);

      // 2. Execute pre-hydration inline guard synchronously as browser HTML parser does
      vm.runInNewContext(scriptCode, {
        window,
        document,
        URL,
        URLSearchParams,
      });

      // 3. Simulate Google AdSense adsbygoogle.js executing before React hydration:
      //    const s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(showAdsImpl, s);
      //    Note: dynamically created <script> has IDL .async === true, while hasAttribute('async') === false.
      const showAdsImpl = document.createElement('script');
      showAdsImpl.src =
        'https://pagead2.googlesyndication.com/pagead/managed/js/adsense/m202611110101/show_ads_impl_fy2021.js';
      showAdsImpl.setAttribute('fetchpriority', 'high');
      const firstScript = document.head.getElementsByTagName('script')[0];
      firstScript.parentNode!.insertBefore(showAdsImpl, firstScript);

      expect(document.head.firstElementChild).toBe(showAdsImpl);
      expect(showAdsImpl.hasAttribute('async')).toBe(true);

      // Also verify deferred script (explicitly defer) is NOT marked async
      const deferredScript = document.createElement('script');
      deferredScript.src = 'https://example.com/deferred.js';
      deferredScript.defer = true;
      document.head.appendChild(deferredScript);
      expect(deferredScript.hasAttribute('async')).toBe(false);
      document.head.removeChild(deferredScript);

      // 4. Hydrate <head> with React 19 hydrateRoot and assert zero hydration mismatch errors
      let root: ReturnType<typeof ReactDOMClient.hydrateRoot> | null = null;
      await act(async () => {
        root = ReactDOMClient.hydrateRoot(
          document.head,
          <>
            <script
              id="dview-preview-iframe-shield"
              suppressHydrationWarning
              dangerouslySetInnerHTML={{ __html: shieldCode }}
            />
            <script
              id="dview-ga-admin-guard"
              suppressHydrationWarning
              dangerouslySetInnerHTML={{ __html: scriptCode }}
            />
          </>
        );
      });

      const hydrationErrors = errorSpy.mock.calls
        .map((args) => args.map(String).join(' '))
        .filter((msg) => /hydrat|mismatch|didn't match/i.test(msg));
      expect(hydrationErrors).toEqual([]);

      if (root) {
        act(() => {
          (root as ReturnType<typeof ReactDOMClient.hydrateRoot>).unmount();
        });
      }
    } finally {
      errorSpy.mockRestore();
      document.head.innerHTML = originalHeadHtml;
    }
  });
});
