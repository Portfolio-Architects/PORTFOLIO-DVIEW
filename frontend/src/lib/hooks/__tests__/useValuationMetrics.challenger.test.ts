/**
 * @file useValuationMetrics.challenger.test.ts
 * @description Empirical Challenger Hook Resilience Suite for useValuationMetrics.ts.
 * 
 * Tests:
 * 1. SWR rate loading failure & error envelope recovery (fallback to MACRO_CONFIG).
 * 2. Firestore valuation overrides network failure / permission error recovery (resilience & zero crash).
 * 3. Firestore successful override injection and state propagation to UtilityScoreV2.
 * 4. Interactive state machines (commute destination, simulation sliders, copy timers, unmount safety).
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import useSWR from 'swr';
import * as firestoreModule from 'firebase/firestore';
import { useValuationMetrics } from '../useValuationMetrics';
import type { FieldReportData } from '@/lib/DashboardFacade';
import { MACRO_CONFIG } from '@/lib/macro-summary';

// Mock Firebase Config
jest.mock('@/lib/firebaseConfig', () => ({
  db: { _isMockDb: true },
  auth: null,
  storage: null,
}));

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  doc: jest.fn().mockReturnValue('mock-override-doc-ref'),
  getDoc: jest.fn(),
}));

// Mock SWR
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('useValuationMetrics Empirical Challenger Resilience Suite', () => {
  const mockReport: FieldReportData = {
    id: 'report-test-1',
    author: 'tester',
    likes: 10,
    commentCount: 5,
    apartmentName: '동탄역 롯데캐슬',
    dong: '오산동',
    metrics: {
      brand: '롯데캐슬',
      householdCount: 1500,
      yearBuilt: 2021,
      parkingPerHousehold: 1.5,
      far: 220,
      bcr: 15,
      distanceToSubway: 150,
      distanceToTram: 300,
      distanceToElementary: 200,
      distanceToMiddle: 500,
      distanceToHigh: 700,
    },
  };

  const mockTxs = [
    { dealType: '매매', price: 160000, contractYm: '202604', contractDay: '05' },
    { dealType: '전세', deposit: 80000, price: 80000, contractYm: '202604', contractDay: '05' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });

    // Default SWR: return idle/loading
    (useSWR as unknown as jest.Mock).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
    });

    // Default Firestore: empty document
    (firestoreModule.getDoc as jest.Mock).mockResolvedValue({
      exists: () => false,
      data: () => ({}),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // =========================================================================
  // 1. SWR Macro Rates Error Resilience
  // =========================================================================
  describe('1. SWR Macro Rates Error Resilience', () => {
    it('maintains default MACRO_CONFIG when SWR network fetch fails', async () => {
      (useSWR as unknown as jest.Mock).mockReturnValue({
        data: undefined,
        error: new Error('SWR 503 Network Timeout'),
        isLoading: false,
      });

      const { result } = renderHook(() =>
        useValuationMetrics(mockReport, mockTxs)
      );

      expect(result.current.macroConfig.riskFreeRate).toBe(MACRO_CONFIG.macroEnvironment.riskFreeRate);
      expect(result.current.macroConfig.fundingCost).toBe(MACRO_CONFIG.macroEnvironment.fundingCost);
    });

    it('maintains default MACRO_CONFIG when SWR API returns error payload (success: false)', async () => {
      (useSWR as unknown as jest.Mock).mockReturnValue({
        data: { success: false, data: undefined },
        error: undefined,
        isLoading: false,
      });

      const { result } = renderHook(() =>
        useValuationMetrics(mockReport, mockTxs)
      );

      expect(result.current.macroConfig.riskFreeRate).toBe(MACRO_CONFIG.macroEnvironment.riskFreeRate);
      expect(result.current.macroConfig.fundingCost).toBe(MACRO_CONFIG.macroEnvironment.fundingCost);
    });

    it('updates macroConfig deterministically when SWR succeeds with valid rates', async () => {
      (useSWR as unknown as jest.Mock).mockReturnValue({
        data: {
          success: true,
          data: { riskFreeRate: 2.85, fundingCost: 3.40 },
        },
        error: undefined,
        isLoading: false,
      });

      const { result } = renderHook(() =>
        useValuationMetrics(mockReport, mockTxs)
      );

      await waitFor(() => {
        expect(result.current.macroConfig.riskFreeRate).toBe(2.85);
        expect(result.current.macroConfig.fundingCost).toBe(3.40);
      });
    });
  });

  // =========================================================================
  // 2. Firestore Valuation Overrides Error Recovery
  // =========================================================================
  describe('2. Firestore Valuation Overrides Error Recovery', () => {
    it('recovers gracefully with overrideScore = 0 when Firestore rejects with permission error', async () => {
      (firestoreModule.getDoc as jest.Mock).mockRejectedValue(
        new Error('FirebaseError: [code=permission-denied]: Missing or insufficient permissions')
      );

      const { result } = renderHook(() =>
        useValuationMetrics(mockReport, mockTxs)
      );

      // Await pending async microtasks
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.overrideScore).toBe(0);
      expect(result.current.utilityScoreResult.total).toBeGreaterThan(0);
    });

    it('recovers gracefully when Firestore document does not exist', async () => {
      (firestoreModule.getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
        data: () => ({}),
      });

      const { result } = renderHook(() =>
        useValuationMetrics(mockReport, mockTxs)
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.overrideScore).toBe(0);
    });

    it('successfully applies overrideScore when document contains normalized apartment key', async () => {
      (firestoreModule.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({
          '동탄역롯데캐슬': 7, // Normalized key for '동탄역 롯데캐슬'
        }),
      });

      const { result } = renderHook(() =>
        useValuationMetrics(mockReport, mockTxs)
      );

      await waitFor(() => {
        expect(result.current.overrideScore).toBe(7);
      });

      // Utility score breakdown should reflect the +7 override
      expect(result.current.utilityScoreResult.logs.some(l => l.category === '어드민 수동 보정' && l.score === 7)).toBe(true);
    });
  });

  // =========================================================================
  // 3. Interactive State Machines & Timers
  // =========================================================================
  describe('3. Interactive State Machines & Lifecycle Safety', () => {
    it('manages commute destination toggle and recalculates total time', () => {
      const { result } = renderHook(() =>
        useValuationMetrics(mockReport, mockTxs)
      );

      expect(result.current.commuteDest).toBe('gangnam');
      const gangnamTime = result.current.commuteAnalysis.totalTime;

      act(() => {
        result.current.setCommuteDest('pangyo');
      });

      expect(result.current.commuteDest).toBe('pangyo');
      expect(result.current.commuteAnalysis.transitTime).toBe(20);
      expect(result.current.commuteAnalysis.totalTime).toBeLessThan(gangnamTime);
    });

    it('handles clipboard copy timeout lifecycle without memory leaks', async () => {
      const { result, unmount } = renderHook(() =>
        useValuationMetrics(mockReport, mockTxs)
      );

      // Copy Scenario
      act(() => {
        result.current.handleCopyScenario();
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      expect(result.current.isCopiedScenario).toBe(true);

      // Fast-forward 2000ms timer
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(result.current.isCopiedScenario).toBe(false);

      // Copy Commute
      act(() => {
        result.current.handleCopyCommute();
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isCopiedCommute).toBe(true);

      // Unmount before timer completes
      unmount();

      act(() => {
        jest.advanceTimersByTime(2000);
      });
      // Should not throw any state update on unmounted component error
    });

    it('toggles score accordion open/close state', () => {
      const { result } = renderHook(() =>
        useValuationMetrics(mockReport, mockTxs)
      );

      expect(result.current.isScoreAccordionOpen).toBe(false);

      act(() => {
        result.current.handleScoreAccordionToggle();
      });

      expect(result.current.isScoreAccordionOpen).toBe(true);

      act(() => {
        result.current.handleScoreAccordionToggle();
      });

      expect(result.current.isScoreAccordionOpen).toBe(false);
    });

    it('updates simulatedDCF when simBaseRate and simGrowthRate change via sliders', () => {
      const { result } = renderHook(() =>
        useValuationMetrics(mockReport, mockTxs)
      );

      const initialImplied = result.current.simulatedDCF.impliedValue;

      act(() => {
        result.current.setSimBaseRate(5.0); // Rate hike scenario
      });

      expect(result.current.simBaseRate).toBe(5.0);
      // Higher discount rate -> lower implied value
      expect(result.current.simulatedDCF.impliedValue).toBeLessThan(initialImplied);
    });
  });
});
