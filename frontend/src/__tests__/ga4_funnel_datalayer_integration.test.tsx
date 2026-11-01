import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { GoogleAnalytics } from '@next/third-parties/google';
import { trackEvent, resetVirtualPageViewLedger } from '@/lib/utils/analytics';
import {
  syncShallowApartmentOpen,
  syncShallowModalCloseToDashboard,
  transitionRecirculationState,
} from '@/lib/ads/recirculationEngine';

describe('GA4 Real @next/third-parties/google dataLayer Funnel Integration (Unmocked)', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalPerformanceMark: typeof performance.mark | undefined;

  beforeEach(() => {
    originalEnv = { ...process.env };
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_GA_ID = 'G-Y17BHJ77W6';
    localStorage.clear();
    resetVirtualPageViewLedger();
    window.history.replaceState(null, '', '/');

    originalPerformanceMark = performance.mark;
    if (typeof performance.mark !== 'function') {
      Object.defineProperty(performance, 'mark', {
        value: jest.fn(),
        configurable: true,
        writable: true,
      });
    }

    window.dataLayer = undefined;
    window.gtag = undefined;
  });

  afterEach(() => {
    cleanup();
    process.env = originalEnv;
    if (originalPerformanceMark === undefined) {
      Object.defineProperty(performance, 'mark', {
        value: undefined,
        configurable: true,
        writable: true,
      });
    } else {
      performance.mark = originalPerformanceMark;
    }
    window.dataLayer = undefined;
    window.gtag = undefined;
  });

  it('enforces gtag.js mandatory js -> config -> event queue ordering when GoogleAnalytics precedes child mount effects as in RootLayout', () => {
    function ChildMountTracker() {
      React.useEffect(() => {
        trackEvent('tab_view', { tab_name: 'overview' });
        syncShallowApartmentOpen('동탄역 롯데캐슬', { dong: '오산동' });
      }, []);
      return <div>child</div>;
    }

    try {
      render(
        <>
          <GoogleAnalytics gaId="G-Y17BHJ77W6" />
          <ChildMountTracker />
        </>
      );

      expect(typeof window.gtag).toBe('function');
      const entries = (window.dataLayer as unknown as Array<ArrayLike<unknown>>).map((item) =>
        Array.from(item)
      );
      expect(entries).toHaveLength(4);
      expect(entries[0][0]).toBe('js');
      expect(entries[0][1]).toBeInstanceOf(Date);
      expect(entries[1]).toEqual(['config', 'G-Y17BHJ77W6']);
      expect(entries[2]).toEqual(['event', 'tab_view', { tab_name: 'overview' }]);
      expect(entries[3][0]).toBe('event');
      expect(entries[3][1]).toBe('page_view');
    } finally {
      const initEl = document.getElementById('_next-ga-init');
      initEl?.remove();
      const gaEl = document.getElementById('_next-ga');
      gaEl?.remove();
    }
  });

  it('pushes gtag.js-compatible 3-arg Arguments tuples ("event", eventName, params) into window.dataLayer for all D-VIEW funnel events without duplicates', () => {
    // 1. Mount real <GoogleAnalytics> from @next/third-parties/google
    render(<GoogleAnalytics gaId="G-Y17BHJ77W6" />);

    // Clear initial ['js', Date] / ['config', 'G-Y17BHJ77W6'] if _next-ga-init ran synchronously,
    // and first test pre-dataLayer hydration window (window.dataLayer === undefined)
    window.dataLayer = undefined;
    trackEvent('tab_view', { tab_name: 'macro' });
    expect(Array.isArray(window.dataLayer)).toBe(true);
    expect(window.dataLayer).toHaveLength(1);

    // 2. Ensure window.gtag is active alongside sendGAEvent (as in production after _next-ga-init)
    if (typeof window.gtag !== 'function') {
      window.gtag = function gtag() {
        window.dataLayer = window.dataLayer || [];
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer.push(arguments);
      };
    }

    // 3. Fire remaining custom funnel events and shallow modal routing virtual pageviews
    trackEvent('view_apartment', { apt_name: '동탄역 롯데캐슬' });
    trackEvent('search_apartment', { query: '동탄역' });
    trackEvent('open_calculator', {
      calculator_type: 'mortgage',
      apt_name: undefined,
      surface: 'dashboard',
    });
    trackEvent('share_apartment', { apt_name: '동탄역 롯데캐슬', method: 'kakao' });
    syncShallowApartmentOpen('동탄역 롯데캐슬', { dong: '오산동' });
    transitionRecirculationState(
      { status: 'CHAPTER_EXPLORE', apt: '동탄역 롯데캐슬' },
      { type: 'CLICK_RECIRC_COMPARE', targetApt: '동탄역시범더샵센트럴시티' }
    );
    syncShallowModalCloseToDashboard();

    // Expect exact 7 events (no duplicate pushes even when window.gtag is active alongside sendGAEvent)
    const entries = window.dataLayer as unknown as Array<ArrayLike<unknown>>;
    expect(entries).toHaveLength(7);

    // Verify every entry is an Arguments-like tuple: [0] === 'event', [1] === eventName, [2] === clean params object
    for (const entry of entries) {
      expect(entry.length).toBe(3);
      expect(entry[0]).toBe('event');
      expect(typeof entry[1]).toBe('string');
      expect(typeof entry[2]).toBe('object');
      expect(entry[2]).not.toBeNull();
      // Must NOT wrap in GTM object format { event: ... }
      expect('event' in (entry[2] as Record<string, unknown>)).toBe(false);
    }

    expect(Array.from(entries[0])).toEqual(['event', 'tab_view', { tab_name: 'macro' }]);
    expect(Array.from(entries[1])).toEqual([
      'event',
      'view_apartment',
      { apt_name: '동탄역 롯데캐슬' },
    ]);
    expect(Array.from(entries[2])).toEqual(['event', 'search_apartment', { query: '동탄역' }]);
    expect(Array.from(entries[3])).toEqual([
      'event',
      'open_calculator',
      { calculator_type: 'mortgage', surface: 'dashboard' },
    ]);
    expect(Array.from(entries[4])).toEqual([
      'event',
      'share_apartment',
      { apt_name: '동탄역 롯데캐슬', method: 'kakao' },
    ]);
    expect(entries[5][0]).toBe('event');
    expect(entries[5][1]).toBe('page_view');
    expect(entries[5][2]).toEqual(
      expect.objectContaining({
        page_path: `/apartment/${encodeURIComponent('동탄역 롯데캐슬')}`,
        apt_name: '동탄역 롯데캐슬',
        dong: '오산동',
        transition: 'SELECT_APT',
        virtual_pv: 1,
        adsense_virtual_pv: 1,
      })
    );
    expect(entries[6][0]).toBe('event');
    expect(entries[6][1]).toBe('page_view');
    expect(entries[6][2]).toEqual(
      expect.objectContaining({
        page_path: `/compare?apt1=${encodeURIComponent('동탄역 롯데캐슬')}&apt2=${encodeURIComponent('동탄역시범더샵센트럴시티')}`,
        page_location: `${window.location.origin}/compare?apt1=${encodeURIComponent('동탄역 롯데캐슬')}&apt2=${encodeURIComponent('동탄역시범더샵센트럴시티')}`,
        apt1: '동탄역 롯데캐슬',
        apt2: '동탄역시범더샵센트럴시티',
        transition: 'CLICK_RECIRC_COMPARE',
        virtual_pv: 1,
        adsense_virtual_pv: 1,
      })
    );
  });

  it('dispatches share_apartment and share_report 3-arg Arguments tuples from ReportShareBar without double-firing on Web Share fallback', async () => {
    const { fireEvent, act } = await import('@testing-library/react');
    const ReportShareBar = (await import('@/components/common/ReportShareBar')).default;
    const kakaoShareModule = await import('@/lib/utils/kakaoShare');

    const copySpy = jest
      .spyOn(kakaoShareModule, 'copyTextToClipboardDirect')
      .mockResolvedValue(true);
    const originalShare = navigator.share;

    try {
      render(
        <>
          <GoogleAnalytics gaId="G-Y17BHJ77W6" />
          <ReportShareBar
            title="동탄역 롯데캐슬 실거래가 리포트"
            summaryLines={['매매가 15.5억', '전세가율 54.2%']}
            canonicalPath={`/apartment/${encodeURIComponent('동탄역 롯데캐슬')}`}
            campaign="apt_ssr_report"
          />
          <ReportShareBar
            title="스트레스 DSR 한도 가이드"
            summaryLines={['핵심 요약 1']}
            canonicalPath="/guide/stress-dsr-valuation-guide"
            campaign="guide_stress_dsr"
          />
        </>
      );

      window.dataLayer = [];

      const copyBtns = document.querySelectorAll('[data-testid="report-share-copy-btn"]');
      const nativeBtns = document.querySelectorAll('[data-testid="report-share-native-btn"]');

      // 1. Copy summary on apartment report -> share_apartment (copy_summary)
      await act(async () => {
        fireEvent.click(copyBtns[0]);
      });

      // 2. Native Web Share rejects/cancels -> falls back to clipboard copy -> exactly ONE share_apartment (copy_summary), not two
      Object.defineProperty(navigator, 'share', {
        value: jest.fn().mockRejectedValueOnce(new Error('AbortError')),
        configurable: true,
        writable: true,
      });
      await act(async () => {
        fireEvent.click(nativeBtns[0]);
      });

      // 3. Native Web Share succeeds on guide report -> share_report (webshare)
      Object.defineProperty(navigator, 'share', {
        value: jest.fn().mockResolvedValueOnce(undefined),
        configurable: true,
        writable: true,
      });
      await act(async () => {
        fireEvent.click(nativeBtns[1]);
      });

      const entries = (window.dataLayer as unknown as Array<ArrayLike<unknown>>).map((e) =>
        Array.from(e)
      );
      expect(entries).toHaveLength(3);
      expect(entries[0]).toEqual([
        'event',
        'share_apartment',
        {
          apt_name: '동탄역 롯데캐슬',
          method: 'copy_summary',
          campaign: 'apt_ssr_report',
          surface: 'report_share_bar',
        },
      ]);
      expect(entries[1]).toEqual([
        'event',
        'share_apartment',
        {
          apt_name: '동탄역 롯데캐슬',
          method: 'copy_summary',
          campaign: 'apt_ssr_report',
          surface: 'report_share_bar',
        },
      ]);
      expect(entries[2]).toEqual([
        'event',
        'share_report',
        {
          report_title: '스트레스 DSR 한도 가이드',
          canonical_path: '/guide/stress-dsr-valuation-guide',
          method: 'webshare',
          campaign: 'guide_stress_dsr',
        },
      ]);
    } finally {
      copySpy.mockRestore();
      Object.defineProperty(navigator, 'share', {
        value: originalShare,
        configurable: true,
        writable: true,
      });
    }
  });

  it('guards RootLayout GoogleAnalytics placement before {children} and dispatches debounced search_apartment from MacroChartSection', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { fireEvent, act } = await import('@testing-library/react');
    const { MacroChartSection } = await import('@/components/macro/components/MacroChartSection');

    // 1. Structural invariant: layout.tsx must mount <GoogleAnalytics before {children}
    const layoutSource = fs.readFileSync(
      path.resolve(__dirname, '../app/layout.tsx'),
      'utf8'
    );
    const gaIndex = layoutSource.indexOf('<GoogleAnalytics');
    const childrenIndex = layoutSource.indexOf('{children}');
    expect(gaIndex).toBeGreaterThan(-1);
    expect(childrenIndex).toBeGreaterThan(-1);
    expect(gaIndex).toBeLessThan(childrenIndex);

    // 2. MacroChartSection debounced search_apartment integration
    jest.useFakeTimers();
    try {
      render(
        <>
          <GoogleAnalytics gaId="G-Y17BHJ77W6" />
          <MacroChartSection
            isDefaultAptSettingUp={false}
            mounted={true}
            selectedTimelineApt="동탄역 롯데캐슬"
            setSelectedTimelineApt={jest.fn()}
            preloadApartmentModal={jest.fn()}
            defaultTimelineApts={['동탄역 롯데캐슬']}
            sheetApartments={{
              오산동: [{ name: '동탄역 롯데캐슬', dong: '오산동', householdCount: 940 }],
            }}
            timeframe="1Y"
            setTimeframe={jest.fn()}
            isAptTxLoading={false}
            aptRealTxData={[]}
            mainLineData={[]}
            mainXTicks={[]}
            mainYTicks={[]}
            renderChart={() => <div data-testid="mock-chart" />}
          />
        </>
      );

      window.dataLayer = [];
      const searchInput = document.querySelector('input[type="text"], input[type="search"], input[placeholder*="단지"]') as HTMLInputElement | null;
      expect(searchInput).not.toBeNull();

      act(() => {
        fireEvent.change(searchInput!, { target: { value: '롯데캐슬' } });
      });

      // Before 1000ms debounce expires -> 0 events
      expect(window.dataLayer).toHaveLength(0);

      act(() => {
        jest.advanceTimersByTime(1050);
      });

      const entries = (window.dataLayer as unknown as Array<ArrayLike<unknown>>).map((e) =>
        Array.from(e)
      );
      expect(entries).toEqual([
        ['event', 'search_apartment', { query: '롯데캐슬', surface: 'dashboard_chart' }],
      ]);
    } finally {
      jest.useRealTimers();
    }
  });
});


