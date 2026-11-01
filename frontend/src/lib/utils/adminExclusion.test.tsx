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
});
