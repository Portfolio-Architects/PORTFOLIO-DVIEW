import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  RecirculationTargetAptSchema,
  TerminalRecirculationHubPropsSchema,
  decodeSafeAptParam,
  trackVirtualPageView,
  getVirtualPageViewLedger,
  getVirtualPageViewCount,
  resetVirtualPageViewLedger,
  syncShallowApartmentOpen,
  syncShallowModalCloseToDashboard,
  transitionRecirculationState,
  selectRecirculationTargets,
  type RecirculationState,
} from '@/lib/ads/recirculationEngine';
import { TerminalRecirculationHub } from '@/components/apartment/TerminalRecirculationHub';
import ApartmentModal from '@/components/apartment/ApartmentModal';
import InAppBrowserBypass from '@/components/pwa/InAppBrowserBypass';
import AptCompareModal from '@/components/consumer/AptCompareModal';
import { adRefreshManager } from '@/lib/ads/adRefreshManager';
import type { DongApartment } from '@/lib/dong-apartments';
import type { AptTxSummary } from '@/lib/types/transaction';
import type { FieldReportData } from '@/lib/types/report.types';

jest.mock('@/components/pwa/PWAProvider', () => ({
  usePWA: () => ({
    showToast: jest.fn(),
    triggerCustomA2HSModal: jest.fn(),
  }),
}));

jest.mock('@/contexts/SettingsContext', () => ({
  useSettingsValues: () => ({
    areaUnit: 'm2',
  }),
}));

jest.mock('@/hooks/usePreventElasticBounce', () => ({
  usePreventElasticBounce: jest.fn(),
}));

jest.mock('@/hooks/useSwipeNavigation', () => ({
  useSwipeNavigation: jest.fn(),
}));

jest.mock('@/hooks/useApartmentDetails', () => ({
  useApartmentDetails: (report: FieldReportData) => ({
    txSummaryData: {},
    fullReportData: report,
    modalTransactions: [],
    isLoadingDetail: false,
    isTxLoading: false,
    resolvedReport: report,
    aptTxSummary: undefined,
    loadAllTransactions: jest.fn(),
  }),
}));


const REAL_SAMPLE_APARTMENTS: Record<string, DongApartment[]> = {
  오산동: [
    {
      name: '동탄역 롯데캐슬',
      dong: '오산동',
      householdCount: 940,
      yearBuilt: '2021',
      brand: '롯데캐슬',
    },
    {
      name: '동탄역 반도유보라 아이비파크 7.0',
      dong: '오산동',
      householdCount: 710,
      yearBuilt: '2019',
      brand: '반도유보라',
    },
    {
      name: '동탄역 파라곤',
      dong: '오산동',
      householdCount: 424,
      yearBuilt: '2021',
      brand: '파라곤',
    },
  ],
  청계동: [
    {
      name: '동탄역시범더샵센트럴시티',
      dong: '청계동',
      householdCount: 874,
      yearBuilt: '2015',
      brand: '더샵',
    },
    {
      name: '동탄역시범우남퍼스트빌',
      dong: '청계동',
      householdCount: 1442,
      yearBuilt: '2015',
      brand: '우남퍼스트빌',
    },
  ],
};

const REAL_SAMPLE_TX_SUMMARY: Record<string, AptTxSummary> = {
  '동탄역 롯데캐슬': {
    latestPrice: 155000,
    latestPriceEok: '15.5억',
    latestArea: 84,
    latestFloor: 28,
    latestDate: '2026-03-10',
    maxPrice: 165000,
    maxPriceEok: '16.5억',
    minPrice: 135000,
    minPriceEok: '13.5억',
    txCount: 42,
    avg1MPrice: 154000,
    avg1MPriceEok: '15.4억',
    avg3MPrice: 152000,
    avg3MTxCount: 18,
    latestRentDeposit: 84000,
    dong: '오산동',
  },
  '동탄역 반도유보라 아이비파크 7.0': {
    latestPrice: 108000,
    latestPriceEok: '10.8억',
    latestArea: 84,
    latestFloor: 21,
    latestDate: '2026-03-08',
    maxPrice: 120000,
    maxPriceEok: '12.0억',
    minPrice: 95000,
    minPriceEok: '9.5억',
    txCount: 31,
    avg1MPrice: 107000,
    avg1MPriceEok: '10.7억',
    avg3MPrice: 106000,
    avg3MTxCount: 14,
    latestRentDeposit: 62000,
    dong: '오산동',
  },
  '동탄역 파라곤': {
    latestPrice: 115000,
    latestPriceEok: '11.5억',
    latestArea: 84,
    latestFloor: 19,
    latestDate: '2026-03-05',
    maxPrice: 125000,
    maxPriceEok: '12.5억',
    minPrice: 100000,
    minPriceEok: '10.0억',
    txCount: 24,
    avg1MPrice: 114000,
    avg1MPriceEok: '11.4억',
    avg3MPrice: 113000,
    avg3MTxCount: 11,
    latestRentDeposit: 66000,
    dong: '오산동',
  },
  동탄역시범더샵센트럴시티: {
    latestPrice: 128000,
    latestPriceEok: '12.8억',
    latestArea: 84,
    latestFloor: 17,
    latestDate: '2026-03-11',
    maxPrice: 142000,
    maxPriceEok: '14.2억',
    minPrice: 115000,
    minPriceEok: '11.5억',
    txCount: 38,
    avg1MPrice: 127000,
    avg1MPriceEok: '12.7억',
    avg3MPrice: 126000,
    avg3MTxCount: 16,
    latestRentDeposit: 74000,
    dong: '청계동',
  },
};

describe('M4 Dynamic Recirculation Hub & Shallow Routing PV Multiplier', () => {
  beforeEach(() => {
    resetVirtualPageViewLedger();
    adRefreshManager.reset();
    window.history.replaceState(null, '', '/');
  });


  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  describe('1. Shallow Routing & Virtual PV Invariant + 6 Deterministic State Transitions (f: S x A -> S)', () => {
    it('executes all 6 deterministic state transitions and dispatches exact Virtual PVs', () => {
      const pushStateSpy = jest.spyOn(window.history, 'pushState');
      const replaceStateSpy = jest.spyOn(window.history, 'replaceState');
      const unregisterSpy = jest.spyOn(adRefreshManager, 'unregisterSlot');

      let state: RecirculationState = { status: 'DASHBOARD_IDLE' };

      // Transition 1: f(DASHBOARD_IDLE, SELECT_APT(A)) = CHAPTER_EXPLORE(A)
      const t1 = transitionRecirculationState(state, {
        type: 'SELECT_APT',
        apt: '동탄역 롯데캐슬',
      });
      state = t1.state;
      expect(state).toEqual({ status: 'CHAPTER_EXPLORE', apt: '동탄역 롯데캐슬' });
      expect(t1.url).toBe(`/apartment/${encodeURIComponent('동탄역 롯데캐슬')}`);
      expect(t1.historyMethod).toBe('pushState');
      expect(t1.virtualPvDispatched).toBe(true);
      expect(window.location.pathname).toBe(`/apartment/${encodeURIComponent('동탄역 롯데캐슬')}`);
      expect(getVirtualPageViewCount()).toBe(1);

      // Transition 2: f(CHAPTER_EXPLORE(A), SELECT_APT(B)) = CHAPTER_EXPLORE(B)
      const t2 = transitionRecirculationState(state, {
        type: 'SELECT_APT',
        apt: '동탄역시범더샵센트럴시티',
      });
      state = t2.state;
      expect(state).toEqual({ status: 'CHAPTER_EXPLORE', apt: '동탄역시범더샵센트럴시티' });
      expect(t2.url).toBe(`/apartment/${encodeURIComponent('동탄역시범더샵센트럴시티')}`);
      expect(getVirtualPageViewCount()).toBe(2);

      // Transition 3: f(CHAPTER_EXPLORE(B), CLICK_RECIRC_COMPARE(A)) = COMPARE_OPEN(B, A)
      const t3 = transitionRecirculationState(state, {
        type: 'CLICK_RECIRC_COMPARE',
        targetApt: '동탄역 롯데캐슬',
      });
      state = t3.state;
      expect(state).toEqual({
        status: 'COMPARE_OPEN',
        apt1: '동탄역시범더샵센트럴시티',
        apt2: '동탄역 롯데캐슬',
      });
      expect(t3.url).toBe(
        `/compare?apt1=${encodeURIComponent('동탄역시범더샵센트럴시티')}&apt2=${encodeURIComponent('동탄역 롯데캐슬')}`
      );
      expect(getVirtualPageViewCount()).toBe(3);

      // Transition 5a: f(COMPARE_OPEN(B, A), MODAL_CLOSE) = CHAPTER_EXPLORE(B)
      const t5a = transitionRecirculationState(state, { type: 'MODAL_CLOSE' });
      state = t5a.state;
      expect(state).toEqual({ status: 'CHAPTER_EXPLORE', apt: '동탄역시범더샵센트럴시티' });
      expect(t5a.historyMethod).toBe('replaceState');
      expect(t5a.virtualPvDispatched).toBe(true);
      expect(getVirtualPageViewCount()).toBe(4);

      // Transition 4: f(CHAPTER_EXPLORE(B), CLICK_RECIRC_MORTGAGE) = CALC_OPEN('mortgage', B)
      const t4 = transitionRecirculationState(state, {
        type: 'CLICK_RECIRC_MORTGAGE',
        priceWon: 1_280_000_000,
      });
      state = t4.state;
      expect(state).toEqual({
        status: 'CALC_OPEN',
        calcType: 'mortgage',
        apt: '동탄역시범더샵센트럴시티',
        priceWon: 1_280_000_000,
      });
      expect(t4.url).toBe(
        `/calculator/mortgage?apt=${encodeURIComponent('동탄역시범더샵센트럴시티')}`
      );
      expect(getVirtualPageViewCount()).toBe(5);

      // Transition 5b: f(CALC_OPEN('mortgage', B), MODAL_CLOSE) = CHAPTER_EXPLORE(B)
      const t5b = transitionRecirculationState(state, { type: 'MODAL_CLOSE' });
      state = t5b.state;
      expect(state).toEqual({ status: 'CHAPTER_EXPLORE', apt: '동탄역시범더샵센트럴시티' });
      expect(getVirtualPageViewCount()).toBe(6);

      // Transition 6: f(CHAPTER_EXPLORE(B), MODAL_CLOSE) = DASHBOARD_IDLE
      const t6 = transitionRecirculationState(state, { type: 'MODAL_CLOSE' });
      state = t6.state;
      expect(state).toEqual({ status: 'DASHBOARD_IDLE' });
      expect(t6.url).toBe('/');
      expect(t6.historyMethod).toBe('replaceState');
      expect(t6.virtualPvDispatched).toBe(false);
      expect(window.location.pathname).toBe('/');
      expect(unregisterSpy).toHaveBeenCalledWith('1000000002_ch02');
      expect(unregisterSpy).toHaveBeenCalledWith('1000000002_ch05');
      expect(pushStateSpy).toHaveBeenCalled();
      expect(replaceStateSpy).toHaveBeenCalled();
    });

    it('deduplicates simultaneous syncShallowApartmentOpen calls within 50ms and restores / on close', () => {
      const first = syncShallowApartmentOpen('동탄역 롯데캐슬', { dong: '오산동' });
      const duplicate = syncShallowApartmentOpen('동탄역 롯데캐슬', { dong: '오산동' });

      expect(first).not.toBeNull();
      expect(duplicate).toEqual(first);
      expect(getVirtualPageViewCount()).toBe(1);
      expect(window.location.pathname).toBe(`/apartment/${encodeURIComponent('동탄역 롯데캐슬')}`);

      syncShallowModalCloseToDashboard();
      expect(window.location.pathname).toBe('/');
    });
  });

  describe('2. Terminal Recirculation Hub & O(K) Recommendation Engine (t < 2ms)', () => {
    it('extracts 3 schema-valid similar complexes in O(K) time (< 2ms for K = 184)', () => {
      // Build 184 synthetic complexes from real Dongtan dongs
      const largeSheet: Record<string, DongApartment[]> = { 오산동: [], 청계동: [], 송동: [] };
      const dongs = ['오산동', '청계동', '송동'];
      for (let i = 0; i < 184; i++) {
        const d = dongs[i % 3];
        largeSheet[d].push({
          name: `동탄단지_${i}`,
          dong: d,
          householdCount: 500 + (i % 1000),
          yearBuilt: '2020',
        });
      }

      // Warm up JIT once, then measure deterministic O(K) execution latency
      selectRecirculationTargets({
        currentAptName: '동탄역 롯데캐슬',
        currentDong: '오산동',
        currentPriceWon: 1_550_000_000,
        sheetApartments: largeSheet,
        txSummaryData: REAL_SAMPLE_TX_SUMMARY,
      });

      const t0 = performance.now();
      const targets = selectRecirculationTargets({
        currentAptName: '동탄역 롯데캐슬',
        currentDong: '오산동',
        currentPriceWon: 1_550_000_000,
        sheetApartments: largeSheet,
        txSummaryData: REAL_SAMPLE_TX_SUMMARY,
      });
      const elapsedMs = performance.now() - t0;

      expect(elapsedMs).toBeLessThan(2); // Deterministic O(K) < 2ms bound
      expect(targets).toHaveLength(3);

      for (const target of targets) {
        const parsed = RecirculationTargetAptSchema.safeParse(target);
        expect(parsed.success).toBe(true);
        expect(target.aptName).not.toBe('동탄역 롯데캐슬');
      }
    });

    it('renders 3 similar complex cards, 1:1 compare prefill launcher, and mortgage calculator launcher with Zero-CLS geometry', () => {
      const targets = selectRecirculationTargets({
        currentAptName: '동탄역 롯데캐슬',
        currentDong: '오산동',
        currentPriceWon: 1_550_000_000,
        sheetApartments: REAL_SAMPLE_APARTMENTS,
        txSummaryData: REAL_SAMPLE_TX_SUMMARY,
      });

      const onSelectApartment = jest.fn();
      const onOpenCompare = jest.fn();
      const onOpenMortgage = jest.fn();

      const props = {
        currentAptName: '동탄역 롯데캐슬',
        currentDong: '오산동',
        currentPriceWon: 1_550_000_000,
        targets,
        onSelectApartment,
        onOpenCompare,
        onOpenMortgage,
      };

      expect(TerminalRecirculationHubPropsSchema.safeParse(props).success).toBe(true);

      render(<TerminalRecirculationHub {...props} />);

      const hub = screen.getByTestId('terminal-recirculation-hub');
      expect(hub.className).toContain('min-h-[320px]');

      // 3 target cards rendered
      for (let i = 0; i < 3; i++) {
        expect(screen.getByTestId(`recirc-target-card-${i}`)).toBeTruthy();
      }

      // Clicking card 0 explore triggers onSelectApartment
      fireEvent.click(screen.getByTestId('recirc-select-apt-0'));
      expect(onSelectApartment).toHaveBeenCalledWith(targets[0].aptName);

      // Clicking 1:1 compare launcher triggers onOpenCompare with current and primary target
      fireEvent.click(screen.getByTestId('recirc-compare-launcher'));
      expect(onOpenCompare).toHaveBeenCalledWith('동탄역 롯데캐슬', targets[0].aptName);

      // Clicking mortgage launcher triggers onOpenMortgage with current apt and priceWon
      fireEvent.click(screen.getByTestId('recirc-mortgage-launcher'));
      expect(onOpenMortgage).toHaveBeenCalledWith('동탄역 롯데캐슬', 1_550_000_000);
    });
  });

  describe('3. AptCompareModal 2-Apartment Prefill & Reverse-Entry to 8-Chapter Report', () => {
    it('prefills both apartments when initialSecondAptName is provided and triggers reverse-entry', () => {
      const onSelectApartment = jest.fn();
      const onClose = jest.fn();

      render(
        <AptCompareModal
          isOpen={true}
          onClose={onClose}
          initialAptName="동탄역 롯데캐슬"
          initialSecondAptName="동탄역시범더샵센트럴시티"
          onSelectApartment={onSelectApartment}
          sheetApartments={REAL_SAMPLE_APARTMENTS}
          txSummaryData={REAL_SAMPLE_TX_SUMMARY}
          nameMapping={{}}
          fieldReportsMap={new Map()}
          typeMap={{}}
        />
      );

      // Both apartments are prefilled, so reverse-entry bar is rendered
      const reverseBar = screen.getByTestId('compare-reverse-entry-bar');
      expect(reverseBar).toBeTruthy();

      const revBtn1 = screen.getByTestId('compare-reverse-entry-apt1');
      const revBtn2 = screen.getByTestId('compare-reverse-entry-apt2');

      fireEvent.click(revBtn1);
      expect(onSelectApartment).toHaveBeenCalledWith('동탄역 롯데캐슬');

      fireEvent.click(revBtn2);
      expect(onSelectApartment).toHaveBeenCalledWith('동탄역시범더샵센트럴시티');
    });
  });

  describe('4. Soft In-App Banner Invariant (48px Non-Blocking Slim Top Banner)', () => {
    const originalUserAgent = navigator.userAgent;

    afterEach(() => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      });
    });

    it('renders a 48px non-blocking slim banner in KakaoTalk/Instagram WebView without full-screen blocking overlay', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.5.0',
        configurable: true,
      });

      const { container } = render(
        <div>
          <InAppBrowserBypass />
          <main data-testid="main-content-under-banner">본문 및 광고 슬롯 정상 노출</main>
        </div>
      );

      const banner = screen.getByTestId('inapp-slim-banner');
      expect(banner).toBeTruthy();
      expect(banner.style.height).toBe('48px');
      expect(banner.className).toContain('h-[48px]');
      expect(banner.className).not.toContain('inset-0');
      expect(container.innerHTML).not.toContain('z-[99999]');

      // Main content remains rendered and accessible alongside the slim banner
      expect(screen.getByTestId('main-content-under-banner')).toBeTruthy();

      // Dismiss button hides banner cleanly
      fireEvent.click(screen.getByTestId('inapp-dismiss-btn'));
      expect(screen.queryByTestId('inapp-slim-banner')).toBeNull();
    });
  });

  describe('5. Popperian Falsifiability & Critical Region Verification (Welch Two-Sample t-Test & CVaR_0.99)', () => {
    it('rejects H_0 (PV delta <= 0.8) with Welch t_stat > 2.326 at alpha = 0.01 and maintains CVaR_0.99(t_route) < 50ms', () => {
      // Simulate N_1 = 60 baseline sessions (1 PV per session) vs N_2 = 60 M4 recirculation sessions
      const baselineSessions: number[] = [];
      const m4Sessions: number[] = [];
      const routeLatenciesMs: number[] = [];

      for (let i = 0; i < 60; i++) {
        // Baseline: single modal view without shallow routing virtual PV recirculation
        baselineSessions.push(1 + (i % 2) * 0.2);

        // M4 session: initial select + similar complex explore + compare + mortgage recirculation
        resetVirtualPageViewLedger();
        const tStart = performance.now();
        let st: RecirculationState = { status: 'DASHBOARD_IDLE' };
        st = transitionRecirculationState(st, { type: 'SELECT_APT', apt: '동탄역 롯데캐슬' }).state;
        st = transitionRecirculationState(st, {
          type: 'SELECT_APT',
          apt: '동탄역시범더샵센트럴시티',
        }).state;
        if (i % 3 !== 0) {
          st = transitionRecirculationState(st, {
            type: 'CLICK_RECIRC_COMPARE',
            targetApt: '동탄역 파라곤',
          }).state;
        }
        if (i % 2 === 0) {
          st = transitionRecirculationState(st, {
            type: 'CLICK_RECIRC_MORTGAGE',
            priceWon: 1_280_000_000,
          }).state;
        }
        routeLatenciesMs.push(performance.now() - tStart);
        m4Sessions.push(getVirtualPageViewLedger().length);
      }

      const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
      const variance = (arr: number[], m: number) =>
        arr.reduce((acc, v) => acc + (v - m) ** 2, 0) / (arr.length - 1);

      const mu1 = mean(baselineSessions);
      const mu2 = mean(m4Sessions);
      const s1Sq = variance(baselineSessions, mu1);
      const s2Sq = variance(m4Sessions, mu2);

      // Welch's two-sample t-statistic against null hypothesis delta_0 = 0.8
      const delta0 = 0.8;
      const se = Math.sqrt(s2Sq / m4Sessions.length + s1Sq / baselineSessions.length);
      const tStat = (mu2 - mu1 - delta0) / se;

      expect(mu2 - mu1).toBeGreaterThan(0.8);
      expect(tStat).toBeGreaterThan(2.576);

      // CVaR_0.99(t_route) < 50ms check
      const sortedLatencies = [...routeLatenciesMs].sort((a, b) => a - b);
      const tailIndex = Math.floor(sortedLatencies.length * 0.99);
      const cvar99 = sortedLatencies[tailIndex];
      expect(cvar99).toBeLessThan(50);
    });
  });

  describe('6. ApartmentModal Chapter 08 Integration & Edge Case Resilience', () => {
    it('mounts ViralPaywallGate and TerminalRecirculationHub inside #chapter-08-report, syncs shallow route on mount, and restores / on close', () => {
      const mockReport: FieldReportData = {
        id: 'rep-lotte-1',
        apartmentName: '동탄역 롯데캐슬',
        dong: '오산동',
        author: 'DVIEW',
        likes: 12,
        commentCount: 3,
        createdAt: null,
        metrics: {
          brand: '롯데캐슬',
          householdCount: 940,
          yearBuilt: 2021,
          parkingPerHousehold: 1.48,
          distanceToSubway: 120,
          distanceToElementary: 320,
          distanceToMiddle: 450,
          distanceToHigh: 600,
          distanceToStarbucks: 150,
          distanceToHospital: 400,
          distanceToPark: 280,
          academyCount: 45,
        },
      };

      const onClose = jest.fn();
      const onSelectApartment = jest.fn();
      const onOpenCompare = jest.fn();
      const onOpenMortgage = jest.fn();

      render(
        <ApartmentModal
          report={mockReport}
          onClose={onClose}
          user={null}
          typeMap={{}}
          inline={false}
          sheetApartments={REAL_SAMPLE_APARTMENTS}
          txSummaryData={REAL_SAMPLE_TX_SUMMARY}
          onSelectApartment={onSelectApartment}
          onOpenCompare={onOpenCompare}
          onOpenMortgage={onOpenMortgage}
        />
      );

      // Shallow routing synced on mount
      expect(window.location.pathname).toBe(`/apartment/${encodeURIComponent('동탄역 롯데캐슬')}`);
      expect(getVirtualPageViewCount()).toBe(1);

      // Chapter 08 contains both ViralPaywallGate and TerminalRecirculationHub
      const ch08 = screen.getByTestId('chapter-08-report');
      expect(ch08.textContent).toContain('단지 정밀 가치분석 인사이트');
      expect(screen.getByTestId('terminal-recirculation-hub')).toBeTruthy();

      // Clicking close button restores '/' and calls onClose
      const closeBtn = screen.getByLabelText('닫기');
      fireEvent.click(closeBtn);
      expect(window.location.pathname).toBe('/');
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('recovers deterministically when empty datasets or boundary values are passed to selectRecirculationTargets', () => {
      const targets = selectRecirculationTargets({
        currentAptName: '',
        currentDong: '',
        currentPriceWon: -500,
        sheetApartments: {},
        txSummaryData: {},
      });

      expect(targets).toHaveLength(3);
      targets.forEach((t) => {
        expect(RecirculationTargetAptSchema.safeParse(t).success).toBe(true);
      });
    });

    it('deduplicates async (> 50ms) DashboardClient -> ApartmentModal shallow route calls to exact 1 virtual PV', () => {
      let fakeNow = 1_700_000_000_000;
      jest.spyOn(Date, 'now').mockImplementation(() => fakeNow);

      // 1. DashboardClient handleAptClick dispatches shallow route at t = 0ms
      const first = syncShallowApartmentOpen('동탄역 롯데캐슬', { dong: '오산동' });
      expect(first).not.toBeNull();
      expect(getVirtualPageViewCount()).toBe(1);

      // 2. Dynamic chunk FieldReportModal finishes loading 350ms later (> 50ms) and mounts ApartmentModal
      fakeNow += 350;
      const second = syncShallowApartmentOpen('동탄역 롯데캐슬', { dong: '오산동' });
      expect(second).toEqual(first);
      expect(getVirtualPageViewCount()).toBe(1);

      // 3. Navigating to a different apartment B dispatches virtual PV #2
      fakeNow += 1200;
      const third = syncShallowApartmentOpen('동탄역시범더샵센트럴시티', { dong: '청계동' });
      expect(third).not.toBeNull();
      expect(getVirtualPageViewCount()).toBe(2);
    });

    it('preserves adRefreshManager onRefreshKeyChange callbacks across SELECT_APT and MODAL_CLOSE transitions', () => {
      const onRefreshKeyChangeCh02 = jest.fn();
      const onRefreshKeyChangeCh05 = jest.fn();

      adRefreshManager.registerSlot('1000000002_ch02', {
        intersectionRatio: 0.8,
        onRefreshKeyChange: onRefreshKeyChangeCh02,
      });
      adRefreshManager.registerSlot('1000000002_ch05', {
        intersectionRatio: 0.8,
        onRefreshKeyChange: onRefreshKeyChangeCh05,
      });

      // Transition to apartment B via transitionRecirculationState (which re-registers slots)
      let st: RecirculationState = { status: 'CHAPTER_EXPLORE', apt: '동탄역 롯데캐슬' };
      st = transitionRecirculationState(st, {
        type: 'SELECT_APT',
        apt: '동탄역시범더샵센트럴시티',
      }).state;

      const slotCh02 = adRefreshManager.getSlot('1000000002_ch02');
      const slotCh05 = adRefreshManager.getSlot('1000000002_ch05');
      expect(slotCh02?.onRefreshKeyChange).toBe(onRefreshKeyChangeCh02);
      expect(slotCh05?.onRefreshKeyChange).toBe(onRefreshKeyChangeCh05);

      // Update intersection back to visible (>= 0.5) and trigger tab switch refresh after cooldown
      let fakeNow = Date.now();
      jest.spyOn(Date, 'now').mockImplementation(() => fakeNow);
      adRefreshManager.updateIntersection('1000000002_ch02', 0.85);
      fakeNow += 31_000;
      adRefreshManager.onTabSwitch();
      expect(onRefreshKeyChangeCh02).toHaveBeenCalledWith(1);
    });

    it('prevents URL %25 double-encoding on pre-encoded and special-character apartment names across round-trip transitions', () => {
      const specialName = '동탄역 (1차/A블록 & 센트럴)';
      const preEncoded = encodeURIComponent(specialName);

      expect(decodeSafeAptParam(preEncoded)).toBe(specialName);
      expect(decodeSafeAptParam(encodeURIComponent(preEncoded))).toBe(specialName);

      let st: RecirculationState = { status: 'DASHBOARD_IDLE' };
      const t1 = transitionRecirculationState(st, { type: 'SELECT_APT', apt: preEncoded });
      st = t1.state;
      expect(st).toEqual({ status: 'CHAPTER_EXPLORE', apt: specialName });
      expect(t1.url).toBe(`/apartment/${encodeURIComponent(specialName)}`);
      expect(t1.url).not.toContain('%25');

      const t2 = transitionRecirculationState(st, {
        type: 'CLICK_RECIRC_COMPARE',
        targetApt: encodeURIComponent('동탄역 롯데캐슬'),
      });
      st = t2.state;
      expect(t2.url).not.toContain('%25');

      const t3 = transitionRecirculationState(st, { type: 'MODAL_CLOSE' });
      expect(t3.state).toEqual({ status: 'CHAPTER_EXPLORE', apt: specialName });
      expect(t3.url).toBe(`/apartment/${encodeURIComponent(specialName)}`);
      expect(t3.url).not.toContain('%25');
    });
  });
});

