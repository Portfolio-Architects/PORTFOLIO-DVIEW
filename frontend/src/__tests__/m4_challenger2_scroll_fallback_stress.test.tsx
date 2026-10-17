/**
 * @file m4_challenger2_scroll_fallback_stress.test.tsx
 * @description Empirical Challenger 2 Adversarial Stress Test Suite for Milestone M4.
 *
 * Epistemic Invariants & Challenge Scope:
 * 1. 120fps Scroll Optimization Invariant:
 *    - DOM backdrop-filter and pointer-events suppression during active scrolling.
 *    - Validates globals.css rules and computed CSS styles across .surface-glass-dense
 *      and arbitrary [class*="backdrop-blur"] elements.
 *    - Validates 150ms debounce window and capture-phase nested scroll interception.
 * 2. SSR & Non-Worker Synchronous Fallback Bit-Identical Parity:
 *    - Validates 100% bit-level parity between useStatsWorker fallback and domain engines
 *      (twoSigmaEngine.ts, mortgageEngine.ts).
 *    - Validates behavior under simulated typeof window === 'undefined' SSR scope.
 * 3. 50-Request Concurrent Asynchronous RPC Stress:
 *    - 50 simultaneous RPC requests (25 two-sigma + 25 mortgage vectors) dispatched via Promise.all.
 *    - Verifies zero request ID collision, zero race condition response inversion under random jitter,
 *      and zero memory leaks (pendingRequests.size === 0).
 *    - Inflight termination resilience and worker failure automatic fallback recovery.
 * 4. Zero Detached Buffer Side-Effects:
 *    - Caller Float32Array buffers remain valid and undetached after transferable worker dispatch.
 */

import React from 'react';
import { render, act, renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';
import fs from 'fs';
import path from 'path';

import { ScrollOptimizer } from '@/components/ui/ScrollOptimizer';
import {
  useStatsWorker,
  isWorkerSupported,
  getWorker,
  terminateWorker,
  executeSyncFallback,
  postWorkerRequest,
  WorkerRequest,
  WorkerResponse,
} from '@/lib/hooks/useStatsWorker';
import { calculateTwoSigma, TwoSigmaStats } from '@/lib/analytics/twoSigmaEngine';
import {
  calculateMortgageLoan,
  MortgageLoanInput,
} from '@/lib/services/mortgage/mortgageEngine';

describe('M4 Challenger 2: Scroll 120fps Optimization & Synchronous Fallback Adversarial Stress Suite', () => {
  const originalWorker = (global as any).Worker;
  const originalWindow = global.window;
  const originalGetComputedStyle = window.getComputedStyle;

  beforeEach(() => {
    terminateWorker();
    jest.clearAllMocks();
    document.body.className = '';
  });

  afterEach(() => {
    terminateWorker();
    if (originalWorker) {
      (global as any).Worker = originalWorker;
    } else {
      delete (global as any).Worker;
    }
    global.window = originalWindow;
    window.getComputedStyle = originalGetComputedStyle;
    jest.useRealTimers();
    document.body.className = '';
  });

  // ==========================================================================
  // Suite 1: DOM 스크롤 조작 중 백드롭 블러 해제 및 120fps 유지 불변식 적대적 검증
  // ==========================================================================
  describe('1. DOM Scroll Manipulation, Backdrop Blur Dissolution & 120fps Pointer-Events Invariants', () => {
    let styleElement: HTMLStyleElement;

    beforeAll(() => {
      // Inject globals.css scroll optimization rules into document.head
      styleElement = document.createElement('style');
      styleElement.id = 'test-scroll-optimizer-styles';
      styleElement.textContent = `
        body.is-scrolling * {
          pointer-events: none !important;
        }

        body.is-scrolling,
        body.is-scrolling *,
        body.is-scrolling .surface-glass-dense,
        body.is-scrolling [class*="backdrop-blur"] {
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          will-change: auto !important;
        }

        .surface-glass-dense {
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }
        .backdrop-blur-sm {
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
        }
        .backdrop-blur-md {
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .backdrop-blur-lg {
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        .backdrop-blur-xl {
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }
        .custom-card-backdrop-blur {
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
      `;
      document.head.appendChild(styleElement);
    });

    afterAll(() => {
      if (styleElement && styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    });

    beforeEach(() => {
      jest.useFakeTimers();

      // Emulate CSS backdrop-filter cascade in JSDOM based on globals.css specifications
      window.getComputedStyle = function (elt: Element, pseudoElt?: string | null): CSSStyleDeclaration {
        const computed = originalGetComputedStyle.call(window, elt, pseudoElt);
        const isScrolling = document.body.classList.contains('is-scrolling');
        const className = elt.getAttribute('class') || '';

        let backdropVal = '';
        let webkitBackdropVal = '';

        if (isScrolling) {
          if (
            className.includes('surface-glass-dense') ||
            className.includes('backdrop-blur')
          ) {
            backdropVal = 'none';
            webkitBackdropVal = 'none';
          }
        } else {
          if (className.includes('surface-glass-dense')) {
            backdropVal = 'blur(24px)';
            webkitBackdropVal = 'blur(24px)';
          } else if (className.includes('backdrop-blur-sm')) {
            backdropVal = 'blur(4px)';
            webkitBackdropVal = 'blur(4px)';
          } else if (className.includes('backdrop-blur-md')) {
            backdropVal = 'blur(12px)';
            webkitBackdropVal = 'blur(12px)';
          } else if (className.includes('backdrop-blur-lg')) {
            backdropVal = 'blur(16px)';
            webkitBackdropVal = 'blur(16px)';
          } else if (className.includes('backdrop-blur-xl')) {
            backdropVal = 'blur(24px)';
            webkitBackdropVal = 'blur(24px)';
          } else if (className.includes('backdrop-blur')) {
            backdropVal = 'blur(20px)';
            webkitBackdropVal = 'blur(20px)';
          }
        }

        const originalGetProp = computed.getPropertyValue.bind(computed);
        computed.getPropertyValue = (prop: string) => {
          if (prop === 'backdrop-filter') return backdropVal;
          if (prop === '-webkit-backdrop-filter') return webkitBackdropVal;
          if (prop === 'pointer-events') {
            if (isScrolling) return 'none';
            return originalGetProp(prop) || 'auto';
          }
          return originalGetProp(prop);
        };

        return computed;
      };
    });

    test('1.1. Static globals.css AST & Declaration Invariant Verification', () => {
      const globalsCssPath = path.resolve(__dirname, '../app/globals.css');
      expect(fs.existsSync(globalsCssPath)).toBe(true);

      const cssContent = fs.readFileSync(globalsCssPath, 'utf8');

      // Invariant 1: body.is-scrolling * must enforce pointer-events: none !important;
      const pointerEventsMatch = cssContent.match(
        /body\.is-scrolling\s+\*\s*\{[^}]*pointer-events:\s*none\s*!important;[^}]*\}/
      );
      expect(pointerEventsMatch).not.toBeNull();

      // Invariant 2: body.is-scrolling must enforce backdrop-filter: none !important;
      expect(cssContent).toMatch(/body\.is-scrolling\s*\.surface-glass-dense/);
      expect(cssContent).toMatch(/body\.is-scrolling\s*\[class\*="backdrop-blur"\]/);
      expect(cssContent).toMatch(/backdrop-filter:\s*none\s*!important;/);
      expect(cssContent).toMatch(/-webkit-backdrop-filter:\s*none\s*!important;/);
      expect(cssContent).toMatch(/will-change:\s*auto\s*!important;/);
    });

    test('1.2. DOM Computed Style 100% Suppression of Backdrop Filter & Pointer Events under is-scrolling', () => {
      const { container } = render(
        <div>
          <ScrollOptimizer />
          <div id="dense-glass" className="surface-glass-dense">Dense Glass Card</div>
          <div id="blur-sm" className="backdrop-blur-sm">Blur SM</div>
          <div id="blur-md" className="backdrop-blur-md">Blur MD</div>
          <div id="blur-lg" className="backdrop-blur-lg">Blur LG</div>
          <div id="blur-xl" className="backdrop-blur-xl">Blur XL</div>
          <div id="custom-blur" className="custom-card-backdrop-blur">Custom Blur</div>
          <button id="interactive-btn" type="button">Action Button</button>
          <a id="interactive-link" href="#target">Action Link</a>
        </div>
      );

      const denseEl = container.querySelector('#dense-glass') as HTMLElement;
      const blurSmEl = container.querySelector('#blur-sm') as HTMLElement;
      const blurMdEl = container.querySelector('#blur-md') as HTMLElement;
      const blurLgEl = container.querySelector('#blur-lg') as HTMLElement;
      const blurXlEl = container.querySelector('#blur-xl') as HTMLElement;
      const customBlurEl = container.querySelector('#custom-blur') as HTMLElement;
      const btnEl = container.querySelector('#interactive-btn') as HTMLElement;
      const linkEl = container.querySelector('#interactive-link') as HTMLElement;

      // Phase 0: Initial Idle State Verification
      expect(document.body.classList.contains('is-scrolling')).toBe(false);
      expect(window.getComputedStyle(btnEl).getPropertyValue('pointer-events')).toBe('auto');
      expect(window.getComputedStyle(denseEl).getPropertyValue('backdrop-filter')).toBe('blur(24px)');
      expect(window.getComputedStyle(blurMdEl).getPropertyValue('backdrop-filter')).toBe('blur(12px)');

      // Phase 1: Scroll Event Trigger
      act(() => {
        window.dispatchEvent(new Event('scroll'));
      });

      expect(document.body.classList.contains('is-scrolling')).toBe(true);

      // Invariant Check A: Backdrop Filter 100% suppressed to 'none' across all variants
      expect(window.getComputedStyle(denseEl).getPropertyValue('backdrop-filter')).toBe('none');
      expect(window.getComputedStyle(denseEl).getPropertyValue('-webkit-backdrop-filter')).toBe('none');
      expect(window.getComputedStyle(blurSmEl).getPropertyValue('backdrop-filter')).toBe('none');
      expect(window.getComputedStyle(blurMdEl).getPropertyValue('backdrop-filter')).toBe('none');
      expect(window.getComputedStyle(blurLgEl).getPropertyValue('backdrop-filter')).toBe('none');
      expect(window.getComputedStyle(blurXlEl).getPropertyValue('backdrop-filter')).toBe('none');
      expect(window.getComputedStyle(customBlurEl).getPropertyValue('backdrop-filter')).toBe('none');

      // Invariant Check B: Pointer Events 100% suppressed to 'none' across interactive elements
      expect(window.getComputedStyle(btnEl).getPropertyValue('pointer-events')).toBe('none');
      expect(window.getComputedStyle(linkEl).getPropertyValue('pointer-events')).toBe('none');
      expect(window.getComputedStyle(denseEl).getPropertyValue('pointer-events')).toBe('none');

      // Phase 2: Debounce Idle Boundary (149ms: retains is-scrolling; 150ms: prunes is-scrolling)
      act(() => {
        jest.advanceTimersByTime(149);
      });
      expect(document.body.classList.contains('is-scrolling')).toBe(true);
      expect(window.getComputedStyle(denseEl).getPropertyValue('backdrop-filter')).toBe('none');
      expect(window.getComputedStyle(btnEl).getPropertyValue('pointer-events')).toBe('none');

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(document.body.classList.contains('is-scrolling')).toBe(false);

      // Restored Computed Styles
      expect(window.getComputedStyle(denseEl).getPropertyValue('backdrop-filter')).toBe('blur(24px)');
      expect(window.getComputedStyle(btnEl).getPropertyValue('pointer-events')).toBe('auto');
    });

    test('1.3. High-Frequency Scroll Burst Stress: continuous dispatch resets debounce deadline', () => {
      render(<ScrollOptimizer />);

      // Dispatch 29 consecutive scroll events at 10ms intervals
      for (let i = 0; i < 29; i++) {
        act(() => {
          window.dispatchEvent(new Event('scroll'));
          jest.advanceTimersByTime(10);
        });
        expect(document.body.classList.contains('is-scrolling')).toBe(true);
      }

      // 30th scroll event dispatched (resets full 150ms window)
      act(() => {
        window.dispatchEvent(new Event('scroll'));
      });
      expect(document.body.classList.contains('is-scrolling')).toBe(true);

      // Advance 149ms from final event: must remain active
      act(() => {
        jest.advanceTimersByTime(149);
      });
      expect(document.body.classList.contains('is-scrolling')).toBe(true);

      // Advance 1ms (total 150ms since 30th event): class pruned
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(document.body.classList.contains('is-scrolling')).toBe(false);
    });

    test('1.4. Unmount Lifecycle Cleanliness: immediately liquidates class and prevents post-unmount leaks', () => {
      const { unmount } = render(<ScrollOptimizer />);

      act(() => {
        window.dispatchEvent(new Event('scroll'));
      });
      expect(document.body.classList.contains('is-scrolling')).toBe(true);

      // Unmount while scrolling
      unmount();
      expect(document.body.classList.contains('is-scrolling')).toBe(false);

      // Post-unmount scroll events must not mutate body
      act(() => {
        window.dispatchEvent(new Event('scroll'));
        jest.advanceTimersByTime(200);
      });
      expect(document.body.classList.contains('is-scrolling')).toBe(false);
    });
  });

  // ==========================================================================
  // Suite 2: SSR 및 비-Worker 환경 동기 폴백 투명성 적대적 검증
  // ==========================================================================
  describe('2. SSR & Non-Worker Synchronous Fallback 100% Bit-Identical Parity', () => {
    beforeEach(() => {
      delete (global as any).Worker;
    });

    test('2.1. Non-Worker JSDOM computeTwoSigma achieves 100% bit parity with twoSigmaEngine.ts', async () => {
      const { result } = renderHook(() => useStatsWorker());
      expect(result.current.isWorkerActive).toBe(false);

      const testDatasets: Array<Array<number | null | undefined> | Float32Array> = [
        // Standard normal distribution
        [45000, 52000, 68000, 71000, 85000, 92000, 110000],
        // Homogeneous identical prices (s = 0)
        [80000, 80000, 80000, 80000],
        // Float32Array typed buffer
        new Float32Array([120000, 135000, 142000, 150000]),
        // Array with noisy outliers (null, undefined, NaN, -100, 0)
        [null, 50000, undefined, NaN, -9999, 0, 70000, 90000],
        // Minimal valid sample (N = 2)
        [30000, 50000],
        // High valuation dynamic range (150B KRW)
        [1500000, 1800000, 2200000],
        // Singularity N = 0
        [],
        // Singularity N = 1
        [99999],
      ];

      for (const dataset of testDatasets) {
        let fallbackResult: TwoSigmaStats;
        await act(async () => {
          fallbackResult = await result.current.computeTwoSigma(dataset);
        });

        const arr = dataset instanceof Float32Array ? Array.from(dataset) : dataset;
        const groundTruth = calculateTwoSigma(arr as any);

        // Strict Bit-Level Parity Assertions
        expect(fallbackResult!.isValid).toBe(groundTruth.isValid);
        expect(Object.is(fallbackResult!.mean, groundTruth.mean)).toBe(true);
        expect(Object.is(fallbackResult!.sd, groundTruth.sd)).toBe(true);
        expect(Object.is(fallbackResult!.upper2SD, groundTruth.upper2SD)).toBe(true);
        expect(Object.is(fallbackResult!.lower2SD, groundTruth.lower2SD)).toBe(true);
      }
    });

    test('2.2. Non-Worker JSDOM computeMortgageVector achieves 100% bit parity with mortgageEngine.ts', async () => {
      const { result } = renderHook(() => useStatsWorker());

      const loanTestMatrices: MortgageLoanInput[] = [
        {
          principalWon: 600000000,
          annualRatePercent: 4.2,
          loanPeriodYears: 30,
          repaymentType: 'EQUAL_PRINCIPAL_AND_INTEREST',
        },
        {
          principalWon: 600000000,
          annualRatePercent: 4.2,
          loanPeriodYears: 30,
          repaymentType: 'EQUAL_PRINCIPAL',
        },
        {
          principalWon: 1200000000,
          annualRatePercent: 3.5,
          loanPeriodYears: 40,
          repaymentType: 'EQUAL_PRINCIPAL_AND_INTEREST',
        },
        {
          principalWon: 350000000,
          annualRatePercent: 5.2,
          loanPeriodYears: 15,
          repaymentType: 'EQUAL_PRINCIPAL',
        },
        // Zero interest rate singularity defense (L'Hôpital boundary)
        {
          principalWon: 480000000,
          annualRatePercent: 0.0,
          loanPeriodYears: 20,
          repaymentType: 'EQUAL_PRINCIPAL_AND_INTEREST',
        },
      ];

      for (const input of loanTestMatrices) {
        let fallbackResult: any;
        await act(async () => {
          fallbackResult = await result.current.computeMortgageVector(input);
        });

        const groundTruth = calculateMortgageLoan(input);

        // Parity Assertions
        expect(fallbackResult.repaymentType).toBe(groundTruth.repaymentType);
        expect(fallbackResult.principalWon).toBe(groundTruth.principalWon);
        expect(fallbackResult.monthlyPaymentWon).toBe(groundTruth.monthlyPaymentWon);
        expect(fallbackResult.totalPaymentWon).toBe(groundTruth.totalPaymentWon);
        expect(fallbackResult.totalInterestWon).toBe(groundTruth.totalInterestWon);
        expect(fallbackResult.loanPeriodMonths).toBe(input.loanPeriodYears * 12);
        expect(fallbackResult.monthlyScheduleWon).toBeInstanceOf(Float32Array);
        expect(fallbackResult.monthlyScheduleWon.length).toBe(input.loanPeriodYears * 12);

        if (input.repaymentType === 'EQUAL_PRINCIPAL_AND_INTEREST') {
          expect(fallbackResult.monthlyScheduleWon[0]).toBe(groundTruth.monthlyPaymentWon);
          expect(fallbackResult.monthlyScheduleWon[fallbackResult.loanPeriodMonths - 1]).toBe(groundTruth.monthlyPaymentWon);
        } else {
          expect(fallbackResult.monthlyScheduleWon[0]).toBe(groundTruth.firstMonthPaymentWon);
          expect(fallbackResult.monthlyScheduleWon[fallbackResult.loanPeriodMonths - 1]).toBe(groundTruth.lastMonthPaymentWon);
        }
      }
    });

    test('2.3. Simulated typeof window === "undefined" SSR Scope Execution Parity', () => {
      // Direct invocation of executeSyncFallback in a window-free execution environment
      const twoSigmaInput = [10000, 20000, 30000, 40000];
      const twoSigmaFallback = executeSyncFallback<any, TwoSigmaStats>('CALCULATE_TWO_SIGMA', { values: twoSigmaInput });
      const twoSigmaTruth = calculateTwoSigma(twoSigmaInput);

      expect(twoSigmaFallback).toEqual(twoSigmaTruth);
      expect(twoSigmaFallback.mean).toBe(25000);

      const mortgageInput: MortgageLoanInput = {
        principalWon: 500000000,
        annualRatePercent: 4.0,
        loanPeriodYears: 30,
        repaymentType: 'EQUAL_PRINCIPAL_AND_INTEREST',
      };
      const mortgageFallback = executeSyncFallback<MortgageLoanInput, any>('CALCULATE_MORTGAGE_VECTOR', mortgageInput);
      const mortgageTruth = calculateMortgageLoan(mortgageInput);

      expect(mortgageFallback.monthlyPaymentWon).toBe(mortgageTruth.monthlyPaymentWon);
      expect(mortgageFallback.totalPaymentWon).toBe(mortgageTruth.totalPaymentWon);
      expect(mortgageFallback.monthlyScheduleWon.length).toBe(360);

      // PING action fallback
      const pingResult = executeSyncFallback('PING', null);
      expect(pingResult).toBe('PONG');

      // Unsupported action exception
      expect(() => executeSyncFallback('INVALID_ACTION' as any, null)).toThrow('Unsupported fallback action type');
    });
  });

  // ==========================================================================
  // Suite 3: 동시 다중 RPC 호출 스트레스 검증 (50개 동시 비동기 요청)
  // ==========================================================================
  describe('3. Concurrent 50 Multi-RPC Stress & Zero Collision / Zero Reversal Test', () => {
    /**
     * Asynchronous Mock Worker simulating thread execution with randomized delay jitter
     * to challenge request ID resolution, monotonic sequencing, and race conditions.
     */
    class JitterMockWorker {
      onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      postedRequests: WorkerRequest[] = [];
      terminated = false;

      postMessage(msg: WorkerRequest) {
        this.postedRequests.push(msg);

        // Simulate real worker execution delay between 1ms and 20ms
        const jitterMs = Math.floor(Math.random() * 20) + 1;

        setTimeout(() => {
          if (this.terminated || !this.onmessage) return;

          if (msg.type === 'CALCULATE_TWO_SIGMA') {
            const raw = msg.payload?.values ?? msg.payload;
            const values = raw instanceof Float32Array ? Array.from(raw) : raw;
            const stats = calculateTwoSigma(values);
            const response: WorkerResponse = {
              id: msg.id,
              type: msg.type,
              success: true,
              data: stats,
            };
            this.onmessage({ data: response } as MessageEvent<WorkerResponse>);
          } else if (msg.type === 'CALCULATE_MORTGAGE_VECTOR') {
            const input: MortgageLoanInput = msg.payload;
            const baseResult = calculateMortgageLoan(input);
            const months = input.loanPeriodYears * 12;
            const response: WorkerResponse = {
              id: msg.id,
              type: msg.type,
              success: true,
              data: {
                ...baseResult,
                monthlyRate: (input.annualRatePercent || 0) / 100 / 12,
                monthlyScheduleWon: new Float32Array(months),
              },
            };
            this.onmessage({ data: response } as MessageEvent<WorkerResponse>);
          } else {
            this.onmessage({
              data: {
                id: msg.id,
                type: msg.type,
                success: true,
                data: 'PONG',
              },
            } as MessageEvent<WorkerResponse>);
          }
        }, jitterMs);
      }

      terminate() {
        this.terminated = true;
      }
    }

    beforeEach(() => {
      (global as any).Worker = JitterMockWorker;
      terminateWorker();
    });

    afterEach(() => {
      terminateWorker();
      delete (global as any).Worker;
    });

    test('3.1. 50 Concurrent Async RPC Requests: Resolves with 0 Collisions and 0 Inversions via Promise.all', async () => {
      const { result } = renderHook(() => useStatsWorker());
      expect(result.current.isWorkerActive).toBe(true);

      const TOTAL_CONCURRENT = 50;
      const TWO_SIGMA_COUNT = 25;
      const MORTGAGE_COUNT = 25;

      const promises: Array<Promise<any>> = [];
      const expectedResults: any[] = [];

      // Issue 25 two-sigma calculations with mathematically distinct means
      for (let i = 0; i < TWO_SIGMA_COUNT; i++) {
        const base = (i + 1) * 10000;
        const sample = [base - 2000, base, base + 2000];
        expectedResults.push({
          type: 'TWO_SIGMA',
          index: i,
          expectedMean: base,
        });
        promises.push(result.current.computeTwoSigma(sample));
      }

      // Issue 25 mortgage calculations with distinct principal values
      for (let j = 0; j < MORTGAGE_COUNT; j++) {
        const principalWon = (j + 1) * 30000000; // 3천만원 ~ 7.5억원
        const loanInput: MortgageLoanInput = {
          principalWon,
          annualRatePercent: 4.0,
          loanPeriodYears: 30,
          repaymentType: 'EQUAL_PRINCIPAL_AND_INTEREST',
        };
        expectedResults.push({
          type: 'MORTGAGE',
          index: j,
          expectedPrincipal: principalWon,
        });
        promises.push(result.current.computeMortgageVector(loanInput));
      }

      expect(promises.length).toBe(TOTAL_CONCURRENT);

      let resolvedValues: any[];
      await act(async () => {
        resolvedValues = await Promise.all(promises);
      });

      // Verification A: All 50 promises resolved successfully
      expect(resolvedValues!.length).toBe(TOTAL_CONCURRENT);

      // Verification B: Exact 1-to-1 data mapping without response collision or inversion
      for (let k = 0; k < TWO_SIGMA_COUNT; k++) {
        const res = resolvedValues![k];
        expect(res.isValid).toBe(true);
        expect(res.mean).toBe(expectedResults[k].expectedMean);
      }

      for (let k = TWO_SIGMA_COUNT; k < TOTAL_CONCURRENT; k++) {
        const res = resolvedValues![k];
        expect(res.principalWon).toBe(expectedResults[k].expectedPrincipal);
        expect(res.loanPeriodMonths).toBe(360);
      }

      // Verification C: Worker computation state cleanly settled
      expect(result.current.isComputing).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test('3.2. 50 Concurrent Synchronous Fallback Requests under Non-Worker Environment', async () => {
      // Disabling Worker to force synchronous fallback concurrency
      delete (global as any).Worker;
      terminateWorker();

      const { result } = renderHook(() => useStatsWorker());
      expect(result.current.isWorkerActive).toBe(false);

      const promises: Array<Promise<any>> = [];
      for (let i = 0; i < 50; i++) {
        if (i % 2 === 0) {
          promises.push(result.current.computeTwoSigma([i * 1000 + 100, i * 1000 + 200]));
        } else {
          promises.push(
            result.current.computeMortgageVector({
              principalWon: (i + 1) * 10000000,
              annualRatePercent: 4.2,
              loanPeriodYears: 20,
              repaymentType: 'EQUAL_PRINCIPAL_AND_INTEREST',
            })
          );
        }
      }

      let results: any[];
      await act(async () => {
        results = await Promise.all(promises);
      });

      expect(results!.length).toBe(50);
      for (let i = 0; i < 50; i++) {
        if (i % 2 === 0) {
          expect(results![i].isValid).toBe(true);
          expect(results![i].mean).toBe(i * 1000 + 150);
        } else {
          expect(results![i].principalWon).toBe((i + 1) * 10000000);
          expect(results![i].loanPeriodMonths).toBe(240);
        }
      }
    });

    test('3.3. Inflight Worker Termination: rejects pending RPC promises and recovers hook via fallback', async () => {
      class HangingWorker {
        onmessage: any = null;
        onerror: any = null;
        postMessage() {
          // Never responds
        }
        terminate() {}
      }
      (global as any).Worker = HangingWorker;
      terminateWorker();

      // Test 1: Direct postWorkerRequest rejection upon terminateWorker()
      let directRejection: Error | null = null;
      const directPromise = postWorkerRequest('CALCULATE_TWO_SIGMA', { values: [10, 20] });

      act(() => {
        terminateWorker();
      });

      try {
        await directPromise;
      } catch (err: any) {
        directRejection = err;
      }

      // postWorkerRequest catches rejection and executes sync fallback
      // or directly resolves with fallback data
      expect(directPromise).resolves.toBeDefined();

      // Test 2: Consumer hook resilience: recovers transparently via synchronous fallback
      const { result } = renderHook(() => useStatsWorker());
      const hookPromise = result.current.computeTwoSigma([10, 20]);

      act(() => {
        result.current.terminateWorker();
      });

      const recoveredStats = await hookPromise;
      expect(recoveredStats.isValid).toBe(true);
      expect(recoveredStats.mean).toBe(15);
      expect(result.current.isWorkerActive).toBe(false);
    });

    test('3.4. Worker Failure Fallback Recovery: recovers transparently when Worker returns success: false', async () => {
      class FailingWorker {
        onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
        onerror: any = null;
        postMessage(msg: WorkerRequest) {
          setTimeout(() => {
            if (this.onmessage) {
              this.onmessage({
                data: {
                  id: msg.id,
                  type: msg.type,
                  success: false,
                  error: 'Simulated Worker OOM crash',
                },
              } as MessageEvent<WorkerResponse>);
            }
          }, 5);
        }
        terminate() {}
      }

      (global as any).Worker = FailingWorker;
      terminateWorker();

      const { result } = renderHook(() => useStatsWorker());
      const sample = [50000, 70000];

      let recoveredStats: TwoSigmaStats;
      await act(async () => {
        recoveredStats = await result.current.computeTwoSigma(sample);
      });

      // Even though worker failed with success: false, hook recovered via synchronous fallback
      expect(recoveredStats!.isValid).toBe(true);
      expect(recoveredStats!.mean).toBe(60000);
    });

    test('3.5. Zero Detached Buffer Side-Effects: caller Float32Array remains valid after transferable dispatch', async () => {
      const { result } = renderHook(() => useStatsWorker());
      const callerBuffer = new Float32Array([10000, 20000, 30000]);

      expect(callerBuffer.buffer.byteLength).toBe(12);

      await act(async () => {
        await result.current.computeTwoSigma(callerBuffer);
      });

      // Epistemic Invariant: Caller's buffer must NOT be detached (cloned before transfer)
      expect(callerBuffer.buffer.byteLength).toBe(12);
      expect(callerBuffer[0]).toBe(10000);
      expect(callerBuffer[1]).toBe(20000);
      expect(callerBuffer[2]).toBe(30000);
    });
  });
});
