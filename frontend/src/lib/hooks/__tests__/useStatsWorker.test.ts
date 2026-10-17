import { renderHook, act } from '@testing-library/react';
import {
  useStatsWorker,
  isWorkerSupported,
  getWorker,
  terminateWorker,
  executeSyncFallback,
  postWorkerRequest,
  WorkerRequest,
  WorkerResponse,
} from '../useStatsWorker';
import { calculateTwoSigma } from '@/lib/analytics/twoSigmaEngine';
import { calculateMortgageLoan } from '@/lib/services/mortgage/mortgageEngine';

describe('useStatsWorker — Singleton Web Worker & Synchronous Fallback (Milestone 3 / R3)', () => {
  const originalWorker = (global as any).Worker;
  const originalWindow = global.window;

  beforeEach(() => {
    terminateWorker();
    jest.clearAllMocks();
  });

  afterEach(() => {
    terminateWorker();
    if (originalWorker) {
      (global as any).Worker = originalWorker;
    } else {
      delete (global as any).Worker;
    }
    global.window = originalWindow;
    jest.useRealTimers();
  });

  // ==========================================================================
  // 1. JSDOM Default Environment (Worker Unsupported / Fallback Mode)
  // ==========================================================================
  describe('1. JSDOM Default Fallback Mode (typeof Worker === "undefined")', () => {
    beforeEach(() => {
      delete (global as any).Worker;
    });

    it('confirms worker is unsupported and hook indicates inactive status', () => {
      expect(isWorkerSupported()).toBe(false);
      expect(getWorker()).toBeNull();

      const { result } = renderHook(() => useStatsWorker());
      expect(result.current.isWorkerActive).toBe(false);
      expect(result.current.isComputing).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('computes exact two-sigma statistics transparently via synchronous fallback', async () => {
      const { result } = renderHook(() => useStatsWorker());
      const sample = [10, 20];

      let statsResult: any;
      await act(async () => {
        statsResult = await result.current.computeTwoSigma(sample);
      });

      const groundTruth = calculateTwoSigma(sample);
      expect(statsResult).toEqual(groundTruth);
      expect(statsResult.isValid).toBe(true);
      expect(statsResult.mean).toBe(15);
      expect(statsResult.sd).toBeCloseTo(Math.sqrt(50), 10);
      expect(statsResult.upper2SD).toBeCloseTo(15 + 2 * Math.sqrt(50), 10);
      expect(statsResult.lower2SD).toBeCloseTo(15 - 2 * Math.sqrt(50), 10);
      expect(result.current.isComputing).toBe(false);
    });

    it('correctly handles Float32Array inputs and filters non-positive outliers in fallback mode', async () => {
      const { result } = renderHook(() => useStatsWorker());
      const typedSample = new Float32Array([100, 200, 300]);

      let statsResult: any;
      await act(async () => {
        statsResult = await result.current.computeTwoSigma(typedSample);
      });

      expect(statsResult.isValid).toBe(true);
      expect(statsResult.mean).toBe(200);
      expect(statsResult.sd).toBe(100);
      expect(statsResult.upper2SD).toBe(400);
      expect(statsResult.lower2SD).toBe(0);
    });

    it('satisfies singularity defense (N < 2) returning isValid: false in fallback mode', async () => {
      const { result } = renderHook(() => useStatsWorker());

      let emptyResult: any;
      let singleResult: any;
      await act(async () => {
        emptyResult = await result.current.computeTwoSigma([]);
        singleResult = await result.current.computeTwoSigma([50]);
      });

      expect(emptyResult.isValid).toBe(false);
      expect(emptyResult.mean).toBeNull();
      expect(singleResult.isValid).toBe(false);
      expect(singleResult.mean).toBeNull();
    });

    it('computes mortgage amortization vector for Equal Principal and Interest in fallback mode', async () => {
      const { result } = renderHook(() => useStatsWorker());
      const loanInput = {
        principalWon: 600000000,
        annualRatePercent: 4.2,
        loanPeriodYears: 30,
        repaymentType: 'EQUAL_PRINCIPAL_AND_INTEREST' as const,
      };

      let mortgageResult: any;
      await act(async () => {
        mortgageResult = await result.current.computeMortgageVector(loanInput);
      });

      const groundTruth = calculateMortgageLoan(loanInput);
      expect(mortgageResult.monthlyPaymentWon).toBe(groundTruth.monthlyPaymentWon);
      expect(mortgageResult.totalPaymentWon).toBe(groundTruth.totalPaymentWon);
      expect(mortgageResult.loanPeriodMonths).toBe(360);
      expect(mortgageResult.monthlyScheduleWon).toBeInstanceOf(Float32Array);
      expect(mortgageResult.monthlyScheduleWon.length).toBe(360);
      expect(mortgageResult.monthlyScheduleWon[0]).toBe(groundTruth.monthlyPaymentWon);
      expect(mortgageResult.monthlyScheduleWon[359]).toBe(groundTruth.monthlyPaymentWon);
    });

    it('computes mortgage amortization vector for Equal Principal in fallback mode', async () => {
      const { result } = renderHook(() => useStatsWorker());
      const loanInput = {
        principalWon: 600000000,
        annualRatePercent: 4.2,
        loanPeriodYears: 30,
        repaymentType: 'EQUAL_PRINCIPAL' as const,
      };

      let mortgageResult: any;
      await act(async () => {
        mortgageResult = await result.current.computeMortgageVector(loanInput);
      });

      const groundTruth = calculateMortgageLoan(loanInput);
      expect(mortgageResult.firstMonthPaymentWon).toBe(groundTruth.firstMonthPaymentWon);
      expect(mortgageResult.lastMonthPaymentWon).toBe(groundTruth.lastMonthPaymentWon);
      expect(mortgageResult.monthlyScheduleWon.length).toBe(360);
      expect(mortgageResult.monthlyScheduleWon[0]).toBe(groundTruth.firstMonthPaymentWon);
      expect(mortgageResult.monthlyScheduleWon[359]).toBe(groundTruth.lastMonthPaymentWon);
    });
  });

  // ==========================================================================
  // 2. MockWorker Injected Environment & Singleton Invariant
  // ==========================================================================
  describe('2. MockWorker Injected Environment & Singleton Invariant', () => {
    let constructorCallCount = 0;
    let mockInstances: MockWorker[] = [];

    class MockWorker {
      onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      postedMessages: any[] = [];
      terminated = false;

      constructor() {
        constructorCallCount++;
        mockInstances.push(this);
      }

      postMessage(message: any) {
        this.postedMessages.push(message);
      }

      terminate() {
        this.terminated = true;
      }
    }

    beforeEach(() => {
      constructorCallCount = 0;
      mockInstances = [];
      (global as any).Worker = MockWorker;
      terminateWorker();
    });

    afterEach(() => {
      terminateWorker();
      delete (global as any).Worker;
    });

    it('enforces singleton invariant: constructor call count is strictly 1 across multiple hook instances', () => {
      expect(isWorkerSupported()).toBe(true);

      const hook1 = renderHook(() => useStatsWorker());
      const hook2 = renderHook(() => useStatsWorker());
      const hook3 = renderHook(() => useStatsWorker());
      const hook4 = renderHook(() => useStatsWorker());
      const hook5 = renderHook(() => useStatsWorker());

      expect(constructorCallCount).toBe(1);
      expect(mockInstances.length).toBe(1);
      expect(hook1.result.current.isWorkerActive).toBe(true);
      expect(hook2.result.current.isWorkerActive).toBe(true);
      expect(hook3.result.current.isWorkerActive).toBe(true);
      expect(hook4.result.current.isWorkerActive).toBe(true);
      expect(hook5.result.current.isWorkerActive).toBe(true);
    });

    it('terminates worker cleanly and resets active state upon terminateWorker call', () => {
      const { result } = renderHook(() => useStatsWorker());
      expect(constructorCallCount).toBe(1);
      expect(result.current.isWorkerActive).toBe(true);

      act(() => {
        result.current.terminateWorker();
      });

      expect(mockInstances[0].terminated).toBe(true);
      expect(result.current.isWorkerActive).toBe(false);

      // Subsequent call re-instantiates lazily
      const worker = getWorker();
      expect(worker).not.toBeNull();
      expect(constructorCallCount).toBe(2);
    });
  });

  // ==========================================================================
  // 3. Concurrent 10 Asynchronous RPC Requests & Request ID Mapping
  // ==========================================================================
  describe('3. Concurrent 10 Asynchronous RPC Requests & Monotonic Mapping', () => {
    class EchoMockWorker {
      onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
      onerror: ((event: any) => void) | null = null;

      postMessage(msg: WorkerRequest) {
        // Simulate asynchronous, out-of-order response timing
        const delay = Math.floor(Math.random() * 15) + 5;
        setTimeout(() => {
          if (!this.onmessage) return;

          if (msg.type === 'CALCULATE_TWO_SIGMA') {
            const values = msg.payload.values;
            const meanVal = Array.isArray(values) ? values[0] : values[0];
            const response: WorkerResponse = {
              id: msg.id,
              type: msg.type,
              success: true,
              data: {
                isValid: true,
                mean: meanVal,
                sd: 10,
                upper2SD: meanVal + 20,
                lower2SD: Math.max(0, meanVal - 20),
              },
            };
            this.onmessage({ data: response } as MessageEvent<WorkerResponse>);
          } else if (msg.type === 'CALCULATE_MORTGAGE_VECTOR') {
            const input = msg.payload;
            const response: WorkerResponse = {
              id: msg.id,
              type: msg.type,
              success: true,
              data: {
                monthlyPaymentWon: input.principalWon / 360,
                totalPaymentWon: input.principalWon,
                totalInterestWon: 0,
                loanPeriodMonths: 360,
                monthlyRate: 0.0035,
                monthlyScheduleWon: new Float32Array(360),
              },
            };
            this.onmessage({ data: response } as MessageEvent<WorkerResponse>);
          }
        }, delay);
      }

      terminate() {}
    }

    beforeEach(() => {
      (global as any).Worker = EchoMockWorker;
      terminateWorker();
    });

    afterEach(() => {
      terminateWorker();
      delete (global as any).Worker;
    });

    it('resolves 10 simultaneous asynchronous requests mapped deterministically without response collision', async () => {
      const { result } = renderHook(() => useStatsWorker());

      const testIndices = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

      let results: any[];
      await act(async () => {
        const promises = testIndices.map((val) =>
          result.current.computeTwoSigma([val, val + 10])
        );
        results = await Promise.all(promises);
      });

      expect(results!).toHaveLength(10);
      for (let i = 0; i < testIndices.length; i++) {
        expect(results![i].mean).toBe(testIndices[i]);
        expect(results![i].isValid).toBe(true);
      }
      expect(result.current.isComputing).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('correctly maps heterogeneous concurrent requests (TwoSigma & MortgageVector)', async () => {
      const { result } = renderHook(() => useStatsWorker());

      let sigmaRes: any;
      let mortgageRes: any;
      await act(async () => {
        const p1 = result.current.computeTwoSigma([555, 666]);
        const p2 = result.current.computeMortgageVector({
          principalWon: 360000000,
          annualRatePercent: 4.2,
          loanPeriodYears: 30,
        });
        [sigmaRes, mortgageRes] = await Promise.all([p1, p2]);
      });

      expect(sigmaRes.mean).toBe(555);
      expect(mortgageRes.monthlyPaymentWon).toBe(1000000);
      expect(mortgageRes.monthlyScheduleWon).toBeInstanceOf(Float32Array);
    });
  });

  // ==========================================================================
  // 4. SSR Simulation & Environment Invariance
  // ==========================================================================
  describe('4. SSR Simulation (typeof window === "undefined")', () => {
    it('safely evaluates without throwing ReferenceError in SSR environment', () => {
      const savedWindow = global.window;
      try {
        // Simulate Node.js SSR context
        (global as any).window = undefined;

        expect(isWorkerSupported()).toBe(false);
        expect(getWorker()).toBeNull();

        // Direct fallback executions
        const twoSigmaFallback = executeSyncFallback<any, any>('CALCULATE_TWO_SIGMA', {
          values: [20, 40],
        });
        expect(twoSigmaFallback.isValid).toBe(true);
        expect(twoSigmaFallback.mean).toBe(30);

        const pingFallback = executeSyncFallback('PING', {});
        expect(pingFallback).toBe('PONG');
      } finally {
        global.window = savedWindow;
      }
    });
  });

  // ==========================================================================
  // 5. SLA 3,000ms Timeout & Crash Fault Recovery
  // ==========================================================================
  describe('5. SLA 3,000ms Timeout & Crash Fault Recovery', () => {
    class SilentMockWorker {
      onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      postMessage() {
        // Intentionally silent: simulates hung or unresponsive worker
      }
      terminate() {}
    }

    class CrashingMockWorker {
      onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      postMessage() {
        setTimeout(() => {
          if (this.onerror) {
            this.onerror(new Error('Out of memory: worker killed'));
          }
        }, 10);
      }
      terminate() {}
    }

    it('triggers transparent synchronous recovery when 3,000ms SLA timeout expires', async () => {
      jest.useFakeTimers();
      (global as any).Worker = SilentMockWorker;
      terminateWorker();

      const { result } = renderHook(() => useStatsWorker());

      const promise = result.current.computeTwoSigma([100, 200]);

      // Fast forward past SLA 3000ms guard
      act(() => {
        jest.advanceTimersByTime(3001);
      });

      let statsResult: any;
      await act(async () => {
        statsResult = await promise;
      });

      // Recovers via synchronous fallback
      expect(statsResult.isValid).toBe(true);
      expect(statsResult.mean).toBe(150);
      expect(statsResult.sd).toBeCloseTo(Math.sqrt(5000), 10);

      delete (global as any).Worker;
    });

    it('recovers pending requests via synchronous fallback upon worker runtime crash', async () => {
      (global as any).Worker = CrashingMockWorker;
      terminateWorker();

      const { result } = renderHook(() => useStatsWorker());

      let statsResult: any;
      await act(async () => {
        statsResult = await result.current.computeTwoSigma([50, 70]);
      });

      expect(statsResult.isValid).toBe(true);
      expect(statsResult.mean).toBe(60);

      delete (global as any).Worker;
    });
  });
});
