import React from 'react';
import { renderToString } from 'react-dom/server';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  MobileStickyAnchorAd,
  MOBILE_ANCHOR_MEDIA_QUERY,
  MOBILE_ANCHOR_REFRESH_SLOT_ID,
} from '@/components/layout/MobileStickyAnchorAd';
import { adRefreshManager } from '@/lib/ads/adRefreshManager';
import DashboardClient from '@/components/DashboardClient';
import LoungeHeader from '@/components/LoungeHeader';
import MobileDock from '@/components/pwa/MobileDock';
import GuideAptPreviewCard, {
  GuideAptCtaLink,
} from '@/components/guide/GuideAptPreviewCard';
import type { GuideAptMiniPreviewItem } from '@/lib/data/guides';
import {
  sendTelemetry,
  TelemetryApiResponseSchema,
} from '@/lib/ads/cascadeFallback';
import { POST as AdClickPostHandler } from '@/app/api/ads/click/route';
import {
  trackTabView,
  resetAnalyticsInteractionState,
  resetVirtualPageViewLedger,
} from '@/lib/utils/analytics';
import {
  DVIEW_GA4_INTERACTION_DIMENSIONS,
  inspectGa4CustomDimensionCoverage,
  buildInteractionFunnelReportPlan,
  summarizeAdTelemetryReportRows,
} from '@/lib/services/ga4CustomDimensions';

jest.mock('@/lib/services/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/api/rateLimiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ success: true }),
}));

const mockFirestoreAdd = jest.fn().mockResolvedValue({ id: 'doc-ad-click-1' });
jest.mock('@/lib/firebaseAdmin', () => ({
  adminDb: {
    collection: jest.fn(() => ({
      add: (...args: unknown[]) => mockFirestoreAdd(...args),
    })),
  },
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockPrefetch = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: mockPrefetch,
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/lib/firebaseConfig', () => ({
  db: { __mockDb: true },
}));

jest.mock('@/lib/repositories/apartment.repository', () => ({
  apartmentRepository: {
    fetchApartmentNames: jest.fn().mockResolvedValue([]),
    fetchApartments: jest.fn().mockResolvedValue([]),
  },
  fetchApartmentNames: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    userProfile: null,
    anonProfile: null,
    loading: false,
    handleLogin: jest.fn(),
    handleLogout: jest.fn(),
  }),
}));

jest.mock('@/hooks/useDashboardMeta', () => ({
  useDashboardMeta: () => ({
    sheetApartments: {
      오산동: [{ name: '동탄역 롯데캐슬', dong: '오산동', txKey: '동탄역롯데캐슬', householdCount: 940 }],
    },
    typeMap: {},
    nameMapping: {},
    publicRentalSet: new Set<string>(),
    triggerFetch: jest.fn(),
    isLoading: false,
  }),
}));

jest.mock('@/hooks/useStaticData', () => ({
  useTxData: () => ({
    txSummary: {
      동탄역롯데캐슬: {
        dong: '오산동',
        latestPrice: 150000,
        latestPriceEok: 15.0,
        avgPrice: 148000,
        txCount: 10,
      },
    },
    recentTransactions: [],
    macroTrend: [],
    recent7DaysVolume: 0,
    isLoading: false,
  }),
  useLocationScores: () => ({
    locationScores: {},
    isLoading: false,
  }),
}));

jest.mock('@/hooks/usePreloadApartmentTx', () => ({
  usePreloadApartmentTx: () => jest.fn(),
}));

jest.mock('@/components/pwa/PWAProvider', () => ({
  usePWA: () => ({
    triggerCustomA2HSModal: jest.fn(),
  }),
}));

jest.mock('@/components/MacroDashboardClient', () => {
  const MockMacroDashboard = () => <div data-testid="mock-macro-dashboard">Macro Dashboard</div>;
  MockMacroDashboard.displayName = 'MockMacroDashboard';
  return MockMacroDashboard;
});

function createMatchMediaController(initialMatches: boolean) {
  let currentMatches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  const matchMediaFn = jest.fn().mockImplementation((query: string) => ({
    get matches() {
      return query === MOBILE_ANCHOR_MEDIA_QUERY ? currentMatches : false;
    },
    media: query,
    onchange: null,
    addListener: jest.fn((cb: (event: MediaQueryListEvent) => void) => {
      listeners.add(cb);
    }),
    removeListener: jest.fn((cb: (event: MediaQueryListEvent) => void) => {
      listeners.delete(cb);
    }),
    addEventListener: jest.fn((evt: string, cb: (event: MediaQueryListEvent) => void) => {
      if (evt === 'change') listeners.add(cb);
    }),
    removeEventListener: jest.fn((evt: string, cb: (event: MediaQueryListEvent) => void) => {
      if (evt === 'change') listeners.delete(cb);
    }),
    dispatchEvent: jest.fn(() => true),
  }));

  return {
    matchMediaFn,
    setMatches(nextMatches: boolean) {
      currentMatches = nextMatches;
      const evt = { matches: nextMatches, media: MOBILE_ANCHOR_MEDIA_QUERY } as MediaQueryListEvent;
      listeners.forEach((cb) => cb(evt));
    },
    getListenerCount() {
      return listeners.size;
    },
  };
}

describe('P0 Telemetry & Monetization Integrity Suite (GA4 Report 2026-11-14)', () => {
  const originalEnv = process.env;
  const originalMatchMedia = window.matchMedia;
  const originalInnerWidth = window.innerWidth;
  const originalVisualViewport = window.visualViewport;
  const originalSendBeacon = navigator.sendBeacon;
  const originalFetch = global.fetch;
  const originalScrollTo = window.scrollTo;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      NEXT_PUBLIC_GA_ID: 'G-Y17BHJ77W6',
      NEXT_PUBLIC_ADSENSE_CLIENT_ID: 'ca-pub-7862464791846108',
      NEXT_PUBLIC_ADSENSE_SLOT_ANCHOR: '6782594447',
      NEXT_PUBLIC_ADSENSE_APPROVAL_MODE: 'false',
    };
    localStorage.clear();
    resetVirtualPageViewLedger();
    resetAnalyticsInteractionState();
    adRefreshManager.unobserve(MOBILE_ANCHOR_REFRESH_SLOT_ID);
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      writable: true,
      value: originalVisualViewport,
    });
    window.scrollTo = jest.fn();
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    process.env = originalEnv;
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      writable: true,
      value: originalVisualViewport,
    });
    window.scrollTo = originalScrollTo;
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      writable: true,
      value: originalSendBeacon,
    });
    global.fetch = originalFetch;
    delete (window as unknown as { gtag?: unknown }).gtag;
    delete (window as unknown as { dataLayer?: unknown }).dataLayer;
    jest.useRealTimers();
  });

  describe('P0-1: MobileStickyAnchorAd Desktop Zero-Mount Guard', () => {
    it('never mounts <AdSlot>, never pushes adsbygoogle, and emits zero UNFILLED telemetry on desktop (>= 768px)', () => {
      jest.useFakeTimers();
      const mediaCtrl = createMatchMediaController(false);
      window.matchMedia = mediaCtrl.matchMediaFn;

      const adsPushSpy = jest.fn();
      (window as unknown as { adsbygoogle?: { push: jest.Mock } }).adsbygoogle = {
        push: adsPushSpy,
      };
      const gtagMock = jest.fn();
      window.gtag = gtagMock;
      window.dataLayer = [];

      const visSpy = jest.spyOn(adRefreshManager, 'handleVisibilityChange');
      const unobserveSpy = jest.spyOn(adRefreshManager, 'unobserve');

      const { container, unmount } = render(<MobileStickyAnchorAd />);

      expect(mediaCtrl.matchMediaFn).toHaveBeenCalledWith('(max-width: 767px)');
      expect(screen.queryByTestId('mobile-sticky-anchor-ad')).toBeNull();
      expect(container.querySelector('ins.adsbygoogle')).toBeNull();
      expect(adsPushSpy).not.toHaveBeenCalled();
      expect(visSpy).not.toHaveBeenCalled();
      expect(unobserveSpy).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(10_000);
      });

      expect(gtagMock).not.toHaveBeenCalledWith('event', 'ad_telemetry', expect.anything());
      unmount();
      expect(mediaCtrl.getListenerCount()).toBe(0);
      visSpy.mockRestore();
      unobserveSpy.mockRestore();
    });

    it('dynamically mounts on mobile (<= 767px) and unmounts + unobserves refresh slot when resized to desktop', () => {
      const mediaCtrl = createMatchMediaController(true);
      window.matchMedia = mediaCtrl.matchMediaFn;
      const unobserveSpy = jest.spyOn(adRefreshManager, 'unobserve');

      render(<MobileStickyAnchorAd />);
      expect(screen.getByTestId('mobile-sticky-anchor-ad')).toBeInTheDocument();

      // Transition Mobile -> Desktop
      act(() => {
        mediaCtrl.setMatches(false);
      });
      expect(screen.queryByTestId('mobile-sticky-anchor-ad')).toBeNull();
      expect(unobserveSpy).toHaveBeenCalledWith(MOBILE_ANCHOR_REFRESH_SLOT_ID);

      // Transition Desktop -> Mobile
      act(() => {
        mediaCtrl.setMatches(true);
      });
      expect(screen.getByTestId('mobile-sticky-anchor-ad')).toBeInTheDocument();
      unobserveSpy.mockRestore();
    });

    it('supports legacy Safari addListener/removeListener and innerWidth fallback when matchMedia is unavailable, while maintaining SSR empty parity', () => {
      // 1. SSR hydration parity: server render returns empty HTML
      const ssrHtml = renderToString(<MobileStickyAnchorAd />);
      expect(ssrHtml).toBe('');

      // 2. Legacy addListener / removeListener (no addEventListener)
      let legacyHandler: ((e: MediaQueryListEvent) => void) | null = null;
      const removeListenerSpy = jest.fn();
      window.matchMedia = jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: (cb: (e: MediaQueryListEvent) => void) => {
          legacyHandler = cb;
        },
        removeListener: removeListenerSpy,
      })) as unknown as typeof window.matchMedia;

      const legacyRender = render(<MobileStickyAnchorAd />);
      expect(screen.queryByTestId('mobile-sticky-anchor-ad')).toBeNull();
      act(() => {
        legacyHandler?.({ matches: true, media: MOBILE_ANCHOR_MEDIA_QUERY } as MediaQueryListEvent);
      });
      expect(screen.getByTestId('mobile-sticky-anchor-ad')).toBeInTheDocument();
      legacyRender.unmount();
      expect(removeListenerSpy).toHaveBeenCalledTimes(1);

      // 3. Fallback when window.matchMedia is undefined
      // @ts-expect-error simulating legacy environment without matchMedia
      window.matchMedia = undefined;
      Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1280 });
      const fallbackRender = render(<MobileStickyAnchorAd />);
      expect(screen.queryByTestId('mobile-sticky-anchor-ad')).toBeNull();

      act(() => {
        Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 390 });
        window.dispatchEvent(new Event('resize'));
      });
      expect(screen.getByTestId('mobile-sticky-anchor-ad')).toBeInTheDocument();
      fallbackRender.unmount();
    });

    it('evaluates default jest.setup.ts matchMedia width-accurately (1024px desktop => unmounted, 390px mobile => mounted)', () => {
      // Default JSDOM innerWidth is 1024 -> desktop must NOT mount MobileStickyAnchorAd
      expect(window.innerWidth).toBe(1024);
      const desktopRender = render(<MobileStickyAnchorAd />);
      expect(screen.queryByTestId('mobile-sticky-anchor-ad')).toBeNull();
      desktopRender.unmount();

      // Mobile innerWidth 390 -> mounts MobileStickyAnchorAd
      Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 390 });
      const mobileRender = render(<MobileStickyAnchorAd />);
      expect(screen.getByTestId('mobile-sticky-anchor-ad')).toBeInTheDocument();
      mobileRender.unmount();
    });

    it('resets virtual keyboard visibility across portrait -> landscape -> portrait rotation so remounted anchor ad never stays stuck invisible (opacity-0)', () => {
      const mediaCtrl = createMatchMediaController(true);
      window.matchMedia = mediaCtrl.matchMediaFn;
      Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 844 });

      let vvHeight = 844;
      const vvListeners = new Set<() => void>();
      Object.defineProperty(window, 'visualViewport', {
        configurable: true,
        writable: true,
        value: {
          get height() {
            return vvHeight;
          },
          addEventListener: jest.fn((evt: string, cb: () => void) => {
            if (evt === 'resize') vvListeners.add(cb);
          }),
          removeEventListener: jest.fn((evt: string, cb: () => void) => {
            if (evt === 'resize') vvListeners.delete(cb);
          }),
        },
      });

      const observeSpy = jest.spyOn(adRefreshManager, 'observe');
      const unobserveSpy = jest.spyOn(adRefreshManager, 'unobserve');

      const { unmount } = render(<MobileStickyAnchorAd />);
      const anchorInitial = screen.getByTestId('mobile-sticky-anchor-ad');
      expect(anchorInitial).toHaveClass('opacity-100');
      expect(anchorInitial).not.toHaveAttribute('aria-hidden');
      expect(observeSpy).toHaveBeenCalledTimes(1);

      // 1. Virtual keyboard opens in portrait (vvHeight = 420 < 844 * 0.75)
      act(() => {
        vvHeight = 420;
        vvListeners.forEach((cb) => cb());
      });
      expect(screen.getByTestId('mobile-sticky-anchor-ad')).toHaveClass('opacity-0');
      expect(screen.getByTestId('mobile-sticky-anchor-ad')).toHaveAttribute('aria-hidden', 'true');

      // 2. Device rotates to landscape (844px > 767px) -> unmounts & cleans up refresh slot
      act(() => {
        mediaCtrl.setMatches(false);
      });
      expect(screen.queryByTestId('mobile-sticky-anchor-ad')).toBeNull();
      expect(unobserveSpy).toHaveBeenCalledWith(MOBILE_ANCHOR_REFRESH_SLOT_ID);

      // 3. Keyboard closes while in landscape, then rotates back to portrait (390px)
      vvHeight = 844;
      act(() => {
        mediaCtrl.setMatches(true);
      });
      const anchorRemounted = screen.getByTestId('mobile-sticky-anchor-ad');
      expect(anchorRemounted).toHaveClass('opacity-100');
      expect(anchorRemounted).not.toHaveAttribute('aria-hidden');
      expect(observeSpy).toHaveBeenCalledTimes(2);

      unmount();
      expect(vvListeners.size).toBe(0);
      observeSpy.mockRestore();
      unobserveSpy.mockRestore();
    });
  });

  describe('P0-2: tab_view Mount Suppression, Surface/Trigger Mapping & Custom Dimension Sync', () => {
    it('emits ZERO tab_view events on initial DashboardClient mount, suppresses active-tab re-clicks & #apt= hash changes, and emits single deduplicated tab_view on genuine tab switches', () => {
      const gtagMock = jest.fn();
      window.gtag = gtagMock;
      window.dataLayer = [];

      const { unmount } = render(<DashboardClient initialTab="overview" />);

      const getTabViewCalls = () =>
        gtagMock.mock.calls.filter((call) => call[0] === 'event' && call[1] === 'tab_view');

      // 1. Zero automatic tab_view and zero scrollTo on initial mount + hydration
      expect(getTabViewCalls()).toHaveLength(0);
      expect(window.scrollTo).not.toHaveBeenCalled();

      // 2. Clicking the already-active '아파트 랩' (overview) tab emits 0 tab_view
      const navGroup = screen.getByTestId('nav-left-group');
      const overviewLink = within(navGroup).getByRole('link', { name: '아파트 랩' });
      fireEvent.click(overviewLink);
      expect(getTabViewCalls()).toHaveLength(0);

      // 3. Genuine tab switch via LoungeHeader ('아파트 탐색' -> imjang) emits EXACTLY 1 event with gnb_header + tab_imjang
      const exploreLink = within(navGroup).getByRole('link', { name: '아파트 탐색' });
      fireEvent.click(exploreLink);

      expect(getTabViewCalls()).toHaveLength(1);
      expect(getTabViewCalls()[0][2]).toEqual(
        expect.objectContaining({
          tab_name: 'imjang',
          previous_tab: 'overview',
          surface: 'gnb_header',
          trigger: 'tab_imjang',
        })
      );
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });

      // 4. Genuine tab switch via MobileDock ('부동산 가이드' -> guide) emits EXACTLY 1 event with mobile_dock + tab_guide
      gtagMock.mockClear();
      resetAnalyticsInteractionState();
      const allGuideLinks = screen.getAllByRole('link', { name: /부동산 가이드/ });
      expect(allGuideLinks.length).toBeGreaterThanOrEqual(2);
      const mobileDockGuideLink = allGuideLinks[allGuideLinks.length - 1];
      fireEvent.click(mobileDockGuideLink);

      expect(getTabViewCalls()).toHaveLength(1);
      expect(getTabViewCalls()[0][2]).toEqual(
        expect.objectContaining({
          tab_name: 'guide',
          previous_tab: 'imjang',
          surface: 'mobile_dock',
          trigger: 'tab_guide',
        })
      );

      // 5. Switch back to overview ('/'), then open #apt= modal hash -> emits ZERO spurious tab_view
      fireEvent.click(overviewLink);
      gtagMock.mockClear();
      resetAnalyticsInteractionState();
      act(() => {
        window.history.pushState(null, '', '/#apt=%EB%8F%99%ED%83%84%EC%97%AD%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      expect(getTabViewCalls()).toHaveLength(0);

      unmount();
    });

    it('emits tab_view with surface & trigger on standalone routes (without onTabChange/onTabClick), including /lounge navigation', () => {
      const gtagMock = jest.fn();
      window.gtag = gtagMock;
      window.dataLayer = [];

      const headerRender = render(<LoungeHeader activeTab="stats" />);
      const loungeBtn = screen.getByTestId('header-lounge-link');
      fireEvent.click(loungeBtn);

      expect(gtagMock).toHaveBeenCalledWith(
        'event',
        'tab_view',
        expect.objectContaining({
          tab_name: 'lounge',
          previous_tab: 'stats',
          surface: 'gnb_header',
          trigger: 'tab_lounge',
        })
      );
      headerRender.unmount();

      gtagMock.mockClear();
      resetAnalyticsInteractionState();

      const dockRender = render(<MobileDock activeTab="guide" />);
      fireEvent.click(screen.getByTestId('mobile-dock-more-button'));
      const dockLoungeLink = screen.getByTestId('mobile-dock-lounge-link');
      dockLoungeLink.addEventListener('click', (e) => e.preventDefault());
      fireEvent.click(dockLoungeLink);

      expect(gtagMock).toHaveBeenCalledWith(
        'event',
        'tab_view',
        expect.objectContaining({
          tab_name: 'lounge',
          previous_tab: 'guide',
          surface: 'mobile_dock',
          trigger: 'tab_lounge',
        })
      );
      dockRender.unmount();
    });

    it('validates trackTabView boundary inputs and registers customEvent:tab_name in GA4 custom dimension specs', () => {
      const gtagMock = jest.fn();
      window.gtag = gtagMock;
      window.dataLayer = [];

      // Rejects empty/whitespace tab_name and equivalent 'explore' === 'imjang' self-transitions
      expect(trackTabView({ tab_name: '   ', surface: 'gnb_header' })).toBe(false);
      expect(
        trackTabView({ tab_name: 'explore', previous_tab: 'imjang', surface: 'gnb_header' })
      ).toBe(false);
      expect(gtagMock).not.toHaveBeenCalled();

      // Suppresses rapid duplicate flapping within 300ms
      expect(trackTabView({ tab_name: 'technovalley', surface: 'gnb_header' })).toBe(true);
      expect(trackTabView({ tab_name: 'technovalley', surface: 'dashboard_tab' })).toBe(false);
      expect(gtagMock).toHaveBeenCalledTimes(1);
      expect(gtagMock).toHaveBeenCalledWith('event', 'tab_view', {
        tab_name: 'technovalley',
        surface: 'gnb_header',
        trigger: 'tab_technovalley',
      });

      // Verifies customEvent:tab_name registration in ga4CustomDimensions
      const tabNameSpec = DVIEW_GA4_INTERACTION_DIMENSIONS.find(
        (d) => d.parameterName === 'tab_name'
      );
      expect(tabNameSpec).toEqual(
        expect.objectContaining({
          parameterName: 'tab_name',
          apiName: 'customEvent:tab_name',
          scope: 'EVENT',
        })
      );

      const coverageBefore = inspectGa4CustomDimensionCoverage([
        { apiName: 'customEvent:surface' },
        { apiName: 'customEvent:trigger' },
      ]);
      expect(coverageBefore.missingInteractionDimensions).toContain('tab_name');

      const coverageAfter = inspectGa4CustomDimensionCoverage(
        DVIEW_GA4_INTERACTION_DIMENSIONS.map((d) => ({ apiName: d.apiName }))
      );
      expect(coverageAfter.interactionComplete).toBe(true);
      expect(coverageAfter.registeredInteractionDimensions).toContain('tab_name');

      const funnelPlan = buildInteractionFunnelReportPlan([
        { apiName: 'customEvent:surface' },
        { apiName: 'customEvent:trigger' },
        { apiName: 'customEvent:tab_name' },
      ]);
      expect(funnelPlan.resolvedMap).toEqual({
        surface: 'customEvent:surface',
        trigger: 'customEvent:trigger',
        tab_name: 'customEvent:tab_name',
      });
    });

    it('restores onTabChange("overview") and emits popstate_navigation tab_view on browser Back to "/", while preserving #apt= hash on hashchange', () => {
      const gtagMock = jest.fn();
      window.gtag = gtagMock;
      window.dataLayer = [];
      const onTabChangeSpy = jest.fn();

      // Simulate DashboardClient pattern where activeTab prop stays "overview" while user clicked "/technovalley"
      const { unmount } = render(
        <LoungeHeader activeTab="overview" onTabChange={onTabChangeSpy} />
      );
      const navGroup = screen.getByTestId('nav-left-group');
      const techLink = within(navGroup).getByRole('link', { name: '테크노밸리 랩' });
      fireEvent.click(techLink);
      expect(onTabChangeSpy).toHaveBeenCalledWith('technovalley');

      onTabChangeSpy.mockClear();
      gtagMock.mockClear();
      resetAnalyticsInteractionState();

      // Browser Back button returns URL to "/" while activeTab prop was still "overview"
      act(() => {
        window.history.pushState(null, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      expect(onTabChangeSpy).toHaveBeenCalledWith('overview');
      expect(gtagMock).toHaveBeenCalledWith(
        'event',
        'tab_view',
        expect.objectContaining({
          tab_name: 'overview',
          previous_tab: 'technovalley',
          surface: 'popstate_navigation',
          trigger: 'tab_overview',
        })
      );

      // hashchange on "/#apt=..." invokes onTabChange('overview') without wiping hash or emitting tab_view
      onTabChangeSpy.mockClear();
      gtagMock.mockClear();
      resetAnalyticsInteractionState();
      act(() => {
        window.history.pushState(null, '', '/#apt=%EB%8F%99%ED%83%84%EC%97%AD%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
      expect(onTabChangeSpy).toHaveBeenCalledWith('overview');
      expect(window.location.hash).toBe('#apt=%EB%8F%99%ED%83%84%EC%97%AD%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC');
      expect(gtagMock).not.toHaveBeenCalledWith('event', 'tab_view', expect.anything());

      unmount();

      // Standalone layout (<LoungeHeader activeTab="imjang" /> without onTabChange, e.g. /explore)
      gtagMock.mockClear();
      resetAnalyticsInteractionState();
      window.history.replaceState(null, '', '/explore');
      const standaloneRender = render(<LoungeHeader activeTab="imjang" />);

      // Shallow modal URL /apartment/... popstate must NOT emit spurious tab_view
      act(() => {
        window.history.pushState(null, '', '/apartment/%EB%8F%99%ED%83%84%EC%97%AD%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      expect(gtagMock).not.toHaveBeenCalledWith('event', 'tab_view', expect.anything());

      // Browser Back from standalone /explore to "/" emits popstate_navigation tab_view
      act(() => {
        window.history.pushState(null, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      expect(gtagMock).toHaveBeenCalledWith(
        'event',
        'tab_view',
        expect.objectContaining({
          tab_name: 'overview',
          previous_tab: 'imjang',
          surface: 'popstate_navigation',
          trigger: 'tab_overview',
        })
      );
      standaloneRender.unmount();
    });

    it('suppresses preventDefault, history mutation, scroll, and tab_view on modified clicks (Ctrl/Cmd/Shift/Middle-click) across LoungeHeader and MobileDock', () => {
      const gtagMock = jest.fn();
      window.gtag = gtagMock;
      window.dataLayer = [];
      const onTabChangeSpy = jest.fn();

      const headerRender = render(
        <LoungeHeader activeTab="overview" onTabChange={onTabChangeSpy} />
      );
      const navGroup = screen.getByTestId('nav-left-group');
      const exploreLink = within(navGroup).getByRole('link', { name: '아파트 탐색' });
      const loungeLink = screen.getByTestId('header-lounge-link');

      // Prevent JSDOM navigation warning after verifying component did NOT call preventDefault
      let exploreDefaultPreventedByComponent = false;
      exploreLink.addEventListener('click', (e) => {
        exploreDefaultPreventedByComponent = e.defaultPrevented;
        e.preventDefault();
      });
      let loungeDefaultPreventedByComponent = false;
      loungeLink.addEventListener('click', (e) => {
        loungeDefaultPreventedByComponent = e.defaultPrevented;
        e.preventDefault();
      });

      fireEvent.click(exploreLink, { ctrlKey: true });
      fireEvent.click(exploreLink, { metaKey: true });
      fireEvent.click(exploreLink, { shiftKey: true });
      fireEvent.click(exploreLink, { button: 1 });
      fireEvent.click(loungeLink, { ctrlKey: true });

      expect(exploreDefaultPreventedByComponent).toBe(false);
      expect(loungeDefaultPreventedByComponent).toBe(false);
      expect(onTabChangeSpy).not.toHaveBeenCalled();
      expect(window.location.pathname).toBe('/');
      expect(gtagMock).not.toHaveBeenCalledWith('event', 'tab_view', expect.anything());
      headerRender.unmount();

      // MobileDock modified click check
      const onDockClickSpy = jest.fn();
      const dockRender = render(<MobileDock activeTab="overview" onTabClick={onDockClickSpy} />);
      const dockStatsLink = screen.getByRole('link', { name: /아파트 통계/ });
      let dockDefaultPreventedByComponent = false;
      dockStatsLink.addEventListener('click', (e) => {
        dockDefaultPreventedByComponent = e.defaultPrevented;
        e.preventDefault();
      });

      fireEvent.click(dockStatsLink, { metaKey: true });
      expect(dockDefaultPreventedByComponent).toBe(false);
      expect(onDockClickSpy).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
      expect(gtagMock).not.toHaveBeenCalledWith('event', 'tab_view', expect.anything());

      // MobileDock "더보기" -> Lounge modified click closes menu without emitting tab_view
      fireEvent.click(screen.getByTestId('mobile-dock-more-button'));
      const dockLoungeLink = screen.getByTestId('mobile-dock-lounge-link');
      dockLoungeLink.addEventListener('click', (e) => e.preventDefault());
      fireEvent.click(dockLoungeLink, { ctrlKey: true });
      expect(gtagMock).not.toHaveBeenCalledWith('event', 'tab_view', expect.anything());

      dockRender.unmount();
    });
  });

  describe('P0-3: GuideAptPreviewCard Internal Click Separation & Pure Ad CTR Integrity', () => {
    const samplePreviewItem: GuideAptMiniPreviewItem = {
      name: '동탄역 시범 더샵 센트럴시티',
      canonicalSlug: '동탄역시범더샵센트럴시티',
      displayName: '동탄역 시범 더샵 센트럴시티',
      dong: '청계동',
      zoneId: 'station',
      zoneName: '동탄2 시범단지',
      latestPrice: 135000,
      latestPriceStr: '13억 5,000만',
      latestRent: 71500,
      latestRentStr: '7억 1,500만',
      jeonseRatio: 53,
      perValue: 18.9,
      latestDate: '2026.10',
      latestArea: 84.9,
      latestFloor: 21,
      txCount: 18,
      href: `/apartment/${encodeURIComponent('동탄역시범더샵센트럴시티')}`,
    };

    it('emits GUIDE_PREVIEW_CLICK (never CLICK) and dispatches zero /api/ads/click beacons for GuideAptPreviewCard and GuideAptCtaLink, while real ad CLICK still beacons', () => {
      const gtagMock = jest.fn();
      window.gtag = gtagMock;
      window.dataLayer = [];

      const sendBeaconSpy = jest.fn(() => true);
      Object.defineProperty(navigator, 'sendBeacon', {
        configurable: true,
        writable: true,
        value: sendBeaconSpy,
      });
      const fetchSpy = jest.fn().mockResolvedValue({ ok: true });
      global.fetch = fetchSpy as unknown as typeof fetch;

      const { unmount } = render(
        <div>
          <GuideAptPreviewCard
            item={samplePreviewItem}
            guideSlug="dongtan-station-vs-technovalley-commute"
            placement="article_top"
          />
          <GuideAptCtaLink
            item={samplePreviewItem}
            guideSlug="dongtan-station-vs-technovalley-commute"
            placement="article_bottom"
            dataTestId="guide-apt-cta-link-article_bottom"
          >
            <span>상세 보기</span>
          </GuideAptCtaLink>
        </div>
      );

      const cardEl = screen.getByTestId('guide-apt-preview-card-article_top');
      const ctaEl = screen.getByTestId('guide-apt-cta-link-article_bottom');
      cardEl.addEventListener('click', (e) => e.preventDefault());
      ctaEl.addEventListener('click', (e) => e.preventDefault());

      fireEvent.click(cardEl);
      fireEvent.click(ctaEl);

      const adTelemetryCalls = gtagMock.mock.calls.filter(
        (c) => c[0] === 'event' && c[1] === 'ad_telemetry'
      );
      expect(adTelemetryCalls).toHaveLength(2);
      expect(adTelemetryCalls[0][2]).toEqual(
        expect.objectContaining({
          slot_id:
            'guide_dongtan-station-vs-technovalley-commute_article_top_더샵센트럴시티',
          event_type: 'GUIDE_PREVIEW_CLICK',
          placement_slot_id: 'guide_article_top',
          apartment_name: '더샵센트럴시티',
          dong: '청계동',
        })
      );
      expect(adTelemetryCalls[1][2]).toEqual(
        expect.objectContaining({
          event_type: 'GUIDE_PREVIEW_CLICK',
          placement_slot_id: 'guide_article_bottom',
        })
      );
      expect(
        adTelemetryCalls.some((c) => (c[2] as { event_type?: string }).event_type === 'CLICK')
      ).toBe(false);

      // Internal guide preview clicks MUST NEVER write to /api/ads/click
      expect(sendBeaconSpy).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();

      // Genuine AdSlot CLICK continues to persist to /api/ads/click
      sendTelemetry({
        eventType: 'CLICK',
        slotId: '6782594447',
        placementSlotId: 'guide_article_mid',
        apartmentName: 'GLOBAL',
      });
      expect(sendBeaconSpy).toHaveBeenCalledTimes(1);
      expect(sendBeaconSpy).toHaveBeenCalledWith('/api/ads/click', expect.any(String));

      unmount();
    });

    it('reclassifies historical guide_* CLICK rows to GUIDE_PREVIEW_CLICK in summarizeAdTelemetryReportRows while preserving genuine numeric AdSense slot clicks on /guide/*', () => {
      const summary = summarizeAdTelemetryReportRows([
        {
          pagePath: '/guide/dongtan-station-vs-technovalley-commute',
          deviceCategory: 'mobile',
          'customEvent:slot_id': '6782594447',
          'customEvent:placement_slot_id': 'guide_article_mid',
          'customEvent:event_type': 'IMPRESSION',
          'customEvent:apartment_name': 'GLOBAL',
          'customEvent:user_agent_category': 'MOBILE_WEB',
          eventCount: 27,
        },
        {
          pagePath: '/guide/dongtan-station-vs-technovalley-commute',
          deviceCategory: 'mobile',
          'customEvent:slot_id': '6782594447',
          'customEvent:placement_slot_id': 'guide_article_mid',
          'customEvent:event_type': 'CLICK',
          'customEvent:apartment_name': 'GLOBAL',
          'customEvent:user_agent_category': 'MOBILE_WEB',
          eventCount: 2,
        },
        {
          pagePath: '/guide/dongtan-station-vs-technovalley-commute',
          deviceCategory: 'mobile',
          'customEvent:slot_id':
            'guide_dongtan-station-vs-technovalley-commute_article_top_동탄역시범더샵센트럴시티',
          'customEvent:placement_slot_id': 'guide_article_top',
          'customEvent:event_type': 'CLICK',
          'customEvent:apartment_name': '동탄역시범더샵센트럴시티',
          'customEvent:user_agent_category': 'MOBILE_WEB',
          eventCount: 11,
        },
        {
          pagePath: '/guide/dongtan-1-vs-2-comparison',
          deviceCategory: 'mobile',
          'customEvent:slot_id':
            'guide_dongtan-1-vs-2-comparison_zone_section_동탄역시범리슈빌아파트',
          'customEvent:placement_slot_id': 'guide_zone_section',
          'customEvent:event_type': 'GUIDE_PREVIEW_CLICK',
          'customEvent:apartment_name': '동탄역시범리슈빌아파트',
          'customEvent:user_agent_category': 'MOBILE_WEB',
          eventCount: 4,
        },
      ]);

      expect(summary.impressionEvents).toBe(27);
      expect(summary.byEventType.CLICK).toBe(2);
      expect(summary.byEventType.GUIDE_PREVIEW_CLICK).toBe(15);

      const genuineAdClickBucket = summary.bySlotAndEventType.find(
        (b) => b.slotId === '6782594447' && b.eventType === 'CLICK'
      );
      expect(genuineAdClickBucket?.eventCount).toBe(2);

      const pollutedGuideClickBuckets = summary.bySlotAndEventType.filter(
        (b) => b.slotId.startsWith('guide_') && b.eventType === 'CLICK'
      );
      expect(pollutedGuideClickBuckets).toHaveLength(0);
    });

    it('blocks Firestore ad_clicks persistence in POST /api/ads/click for both GUIDE_PREVIEW_CLICK and legacy guide_* CLICK payloads while persisting real AdSense CLICK', async () => {
      mockFirestoreAdd.mockClear();

      const makeReq = (body: Record<string, unknown>) =>
        ({
          text: async () => JSON.stringify(body),
          headers: new Map([['x-forwarded-for', '127.0.0.1']]),
          cookies: { get: () => undefined },
        }) as unknown as Parameters<typeof AdClickPostHandler>[0];

      // 1. Direct GUIDE_PREVIEW_CLICK payload -> 200 OK, ignored for ad_clicks
      const resGuidePreview = await AdClickPostHandler(
        makeReq({
          eventType: 'GUIDE_PREVIEW_CLICK',
          slotId: 'guide_dongtan-1-vs-2-comparison_article_top_시범더샵',
          apartmentName: '시범더샵',
          dong: '청계동',
          timestamp: new Date().toISOString(),
        })
      );
      expect(resGuidePreview.status).toBe(200);
      const bodyGuidePreview = TelemetryApiResponseSchema.parse(await resGuidePreview.json());
      expect(bodyGuidePreview.persistedId).toBe('guide_preview_ignored');
      expect(mockFirestoreAdd).not.toHaveBeenCalled();

      // 2. Stale cached bundle sending eventType: 'CLICK' with slotId: 'guide_*' -> normalized & ignored
      const resStaleGuideClick = await AdClickPostHandler(
        makeReq({
          eventType: 'CLICK',
          slotId: 'guide_dongtan-station-vs-technovalley-commute_article_top_동탄역롯데캐슬',
          apartmentName: '동탄역롯데캐슬',
          dong: '오산동',
          timestamp: new Date().toISOString(),
        })
      );
      expect(resStaleGuideClick.status).toBe(200);
      const bodyStaleGuide = TelemetryApiResponseSchema.parse(await resStaleGuideClick.json());
      expect(bodyStaleGuide.persistedId).toBe('guide_preview_ignored');
      expect(mockFirestoreAdd).not.toHaveBeenCalled();

      // 3. Genuine numeric AdSense slot CLICK -> persisted to Firestore ad_clicks
      const resRealAdClick = await AdClickPostHandler(
        makeReq({
          eventType: 'CLICK',
          slotId: '6782594447',
          apartmentName: 'GLOBAL',
          dong: '',
          timestamp: new Date().toISOString(),
        })
      );
      expect(resRealAdClick.status).toBe(200);
      const bodyRealAd = TelemetryApiResponseSchema.parse(await resRealAdClick.json());
      expect(bodyRealAd.persistedId).toMatch(/^telemetry_6782594447_/);
      expect(mockFirestoreAdd).toHaveBeenCalledTimes(1);
      expect(mockFirestoreAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          slotId: '6782594447',
          eventType: 'CLICK',
        })
      );
    });
  });
});
