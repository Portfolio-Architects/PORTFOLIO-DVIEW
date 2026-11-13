/**
 * @file pre07_live_delta_and_deploy_hook.test.tsx
 * @description Empirical test suite verifying immediate pre-07:00 KST transaction display via
 * server-cached Firestore delta overlay + CDN API + SWR client hooks + [vercel skip] HEAD poisoning guard.
 */

import React from 'react';
import { render, screen, renderHook, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SWRConfig } from 'swr';
import fs from 'fs';
import path from 'path';

const mockFirestoreGet = jest.fn();
const mockWhere = jest.fn(() => ({ get: mockFirestoreGet }));
const mockCollection = jest.fn(() => ({ where: mockWhere }));

jest.mock('@/lib/firebaseAdmin', () => ({
  adminDb: {
    collection: (...args: unknown[]) => (mockCollection as (...a: unknown[]) => unknown)(...args),
  },
}));

const mockRedisGet = jest.fn().mockResolvedValue(null);
const mockRedisSet = jest.fn().mockResolvedValue('OK');
const mockRedisDel = jest.fn().mockResolvedValue(1);

jest.mock('@/lib/redis', () => ({
  redis: {
    get: (...args: unknown[]) => mockRedisGet(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
    del: (...args: unknown[]) => mockRedisDel(...args),
  },
}));

jest.mock('@/lib/services/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import {
  getLiveTransactionDelta,
  invalidateLiveTransactionOverlayCache,
} from '@/lib/services/liveTransactionOverlay';
import { GET as liveDeltaRouteGet } from '@/app/api/transactions/live-delta/route';
import { MarketStatsStrong, MarketStatsLight } from '@/components/common/MarketStatsSubtitle';
import { TodayUpdatePillBadge } from '@/components/common/TodayUpdatePillBadge';
import { useTxData, usePeriodTransactions } from '@/hooks/useStaticData';
import { getTodayYmdKST } from '@/lib/todayUpdateEvaluator';
import type { RecentTransaction } from '@/types/transaction';

const realMarketStats = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../public/data/market-stats.json'), 'utf8')
);
const realTxSummaryEnvelope = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../public/data/tx-summary.json'), 'utf8')
);
const realTxSummary = realTxSummaryEnvelope.summary || realTxSummaryEnvelope;
const sampleAptKey =
  Object.keys(realTxSummary).find((k) => k === '동탄역롯데캐슬') ||
  Object.keys(realTxSummary)[0];
const sampleAptBaselineMax =
  Object.values(realTxSummary[sampleAptKey]?.maxPriceByArea || {})[0] || 150000;

describe('Pre-07:00 KST Live Transaction Delta & Deploy Hook Integrity', () => {
  const originalEnableFlag = process.env.ENABLE_LIVE_TX_DELTA_IN_TEST;
  const originalFetch = global.fetch;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.ENABLE_LIVE_TX_DELTA_IN_TEST = '1';
    mockRedisGet.mockResolvedValue(null);
    await invalidateLiveTransactionOverlayCache();
  });

  afterAll(async () => {
    process.env.ENABLE_LIVE_TX_DELTA_IN_TEST = originalEnableFlag;
    global.fetch = originalFetch;
    await invalidateLiveTransactionOverlayCache();
  });

  describe('1. Server Overlay (liveTransactionOverlay.ts)', () => {
    it('enriches post-build Firestore sales, excludes cancelled records, computes new-high flags, and invalidates caches cleanly', async () => {
      const sampleArea = Number(
        Object.keys(realTxSummary[sampleAptKey]?.maxPriceByArea || {})[0] || 84.99
      );
      const areaMax = Number(
        (realTxSummary[sampleAptKey]?.maxPriceByArea || {})[sampleArea.toFixed(2)] ||
          sampleAptBaselineMax
      );

      mockFirestoreGet.mockResolvedValue({
        docs: [
          {
            data: () => ({
              aptName: sampleAptKey,
              dong: '오산동',
              dealType: '매매',
              contractYm: '209912',
              contractDay: '30',
              contractDate: '20991230',
              registeredDate: '20991231',
              price: areaMax + 5000, // Genuine new high
              deposit: 0,
              monthlyRent: 0,
              area: sampleArea,
              areaPyeong: 34,
              floor: 22,
            }),
          },
          {
            data: () => ({
              aptName: sampleAptKey,
              dong: '오산동',
              dealType: '매매',
              contractYm: '209912',
              contractDay: '29',
              contractDate: '20991229',
              registeredDate: '20991231',
              price: Math.max(50000, areaMax - 20000), // Regular sale
              deposit: 0,
              monthlyRent: 0,
              area: sampleArea,
              areaPyeong: 34,
              floor: 7,
            }),
          },
          {
            data: () => ({
              aptName: sampleAptKey,
              dong: '오산동',
              dealType: '매매',
              contractYm: '209912',
              contractDay: '28',
              contractDate: '20991228',
              registeredDate: '20991231',
              price: areaMax + 9000,
              deposit: 0,
              monthlyRent: 0,
              area: sampleArea,
              areaPyeong: 34,
              floor: 15,
              cdealType: 'O', // Cancelled trade: MUST be excluded (Strict Real Data Only)
              cancelDate: '20991231',
            }),
          },
          {
            data: () => ({
              aptName: sampleAptKey,
              dong: '오산동',
              dealType: '전세',
              contractYm: '209912',
              contractDay: '30',
              contractDate: '20991230',
              registeredDate: '20991231',
              price: 0,
              deposit: 60000,
              monthlyRent: 0,
              area: sampleArea,
              areaPyeong: 34,
              floor: 11,
            }),
          },
        ],
      });

      const delta = await getLiveTransactionDelta();

      expect(mockCollection).toHaveBeenCalledWith('transactions');
      expect(delta.hasDelta).toBe(true);
      expect(delta.deltaTransactions).toHaveLength(2);
      expect(delta.rawDeltaDocs).toHaveLength(3); // 2 sales + 1 rent; cancelled sale excluded

      const newHighTx = delta.deltaTransactions.find((t) => t.floor === 22);
      const regularTx = delta.deltaTransactions.find((t) => t.floor === 7);

      expect(newHighTx).toBeDefined();
      expect(newHighTx?.registeredDate).toBe('20991231');
      expect(newHighTx?.registeredDateLabel).toBe('12.31');
      expect(newHighTx?.isNewHigh).toBe(true);
      expect(newHighTx?.priceVal).toBeGreaterThan(0);
      expect(newHighTx?.priceEok).toContain('억');

      expect(regularTx).toBeDefined();
      expect(regularTx?.isNewHigh).toBe(false);

      expect(delta.marketStats?.latestRegisteredDate).toBe('20991231');
      expect(delta.marketStats?.saleTxCount).toBe(Number(realMarketStats.saleTxCount) + 2);

      // Cached second call should NOT re-query Firestore
      expect(mockFirestoreGet).toHaveBeenCalledTimes(1);
      await getLiveTransactionDelta();
      expect(mockFirestoreGet).toHaveBeenCalledTimes(1);

      // Cache invalidation forces fresh Firestore read on next call
      await invalidateLiveTransactionOverlayCache();
      await getLiveTransactionDelta();
      expect(mockFirestoreGet).toHaveBeenCalledTimes(2);
    });
  });

  describe('2. CDN API Route (/api/transactions/live-delta)', () => {
    it('returns HTTP 200 JSON with CDN Cache-Control headers', async () => {
      mockFirestoreGet.mockResolvedValue({ docs: [] });

      const response = await liveDeltaRouteGet();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe(
        'public, s-maxage=60, stale-while-revalidate=120'
      );
      expect(body).toHaveProperty('hasDelta', false);
      expect(body).toHaveProperty('deltaTransactions');
    });
  });

  describe('3. Client Pre-Rebuild Immediate Display & Idempotency', () => {
    it('renders TodayUpdatePillBadge, MarketStatsLight, and 1d period transactions immediately before static rebuild completes', async () => {
      const todayYmd = getTodayYmdKST(new Date());
      const todayMmDd = `${todayYmd.slice(4, 6)}.${todayYmd.slice(6, 8)}`;

      const deltaTransactions: RecentTransaction[] = [
        {
          aptName: '동탄역 롯데캐슬',
          txKey: '동탄역롯데캐슬',
          date: todayMmDd,
          contractDate: todayYmd,
          registeredDate: todayYmd,
          registeredDateLabel: todayMmDd,
          priceVal: 17.2,
          priceEok: '17억2,000',
          area: 102.77,
          areaPyeong: 41,
          floor: 28,
          dealType: '매매',
          isNewHigh: true,
          delta: 0.7,
          deltaPercent: 4.2,
        },
        {
          aptName: '동탄역 시범 우남퍼스트빌',
          txKey: '동탄역시범우남퍼스트빌아파트',
          date: todayMmDd,
          contractDate: todayYmd,
          registeredDate: todayYmd,
          registeredDateLabel: todayMmDd,
          priceVal: 11.5,
          priceEok: '11억5,000',
          area: 84.95,
          areaPyeong: 34,
          floor: 12,
          dealType: '매매',
          isNewHigh: false,
          delta: 0.2,
          deltaPercent: 1.8,
        },
      ];

      const livePayload = {
        hasDelta: true,
        baselineRegisteredDate: '20260101',
        marketStats: {
          apartmentCount: 185,
          saleTxCount: 66302,
          latestContractDate: todayYmd,
          latestRegisteredDate: todayYmd,
          todayRegisteredCount: 2,
          todayNewHighCount: 1,
          lastSyncTime: '07:00 KST',
        },
        deltaTransactions,
        rawDeltaDocs: deltaTransactions.map((t) => ({
          txKey: t.txKey,
          aptName: t.aptName,
          dealType: '매매',
          contractYm: todayYmd.slice(0, 6),
          contractDay: todayYmd.slice(6, 8),
          contractDate: todayYmd,
          registeredDate: todayYmd,
          registeredDateLabel: todayMmDd,
          price: Math.round(t.priceVal * 10000),
          deposit: 0,
          monthlyRent: 0,
          area: t.area,
          areaPyeong: t.areaPyeong,
          floor: Number(t.floor),
        })),
      };

      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (typeof url === 'string' && url.includes('/api/transactions/live-delta')) {
          return Promise.resolve(
            new Response(JSON.stringify(livePayload), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        if (typeof url === 'string' && url.includes('/data/market-stats.json')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                apartmentCount: 185,
                saleTxCount: 66300,
                latestContractDate: '20260101',
                latestRegisteredDate: '20260101',
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify({}), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });

      render(
        <>
          <MarketStatsStrong />
          <MarketStatsLight text="테스트 문구" />
          <TodayUpdatePillBadge />
        </>,
        { wrapper }
      );

      await waitFor(() => {
        const badge = screen.getByTestId('today-update-pill-badge');
        expect(badge).toHaveTextContent('오늘 신규 2건 등록 (07:00 반영)');
        expect(badge).toHaveTextContent('신고가 1건');
      });

      expect(screen.getByText(/66,302건/)).toBeInTheDocument();
      expect(screen.getByText(/오늘 아침 7시 갱신/)).toBeInTheDocument();

      // usePeriodTransactions('1d') immediately includes today's 2 new transactions on top of yesterday's fallback
      const yesterdayFallback: RecentTransaction[] = [
        {
          aptName: '어제 거래 단지',
          txKey: '어제거래단지',
          date: '01.01',
          contractDate: '20260101',
          registeredDate: '20260102',
          registeredDateLabel: '01.02',
          priceVal: 8.5,
          priceEok: '8억5,000',
          area: 84.5,
          areaPyeong: 34,
          floor: 5,
          dealType: '매매',
        },
      ];

      const { result: periodResult } = renderHook(
        () => usePeriodTransactions('1d', yesterdayFallback),
        { wrapper }
      );

      await waitFor(() => {
        expect(periodResult.current.transactions).toHaveLength(2);
      });
      expect(periodResult.current.transactions.map((t) => t.registeredDate)).toEqual([
        todayYmd,
        todayYmd,
      ]);

      // Idempotency proof: when SSR initial data ALREADY includes the delta, txCount must NOT double-increment
      const ssrSummaryAlreadyApplied = {
        동탄역롯데캐슬: {
          latestPrice: 172000,
          latestPriceEok: '17억2,000',
          latestArea: 41,
          latestFloor: 28,
          latestDate: todayYmd,
          maxPrice: 172000,
          maxPriceEok: '17억2,000',
          minPrice: 100000,
          minPriceEok: '10억',
          txCount: 100,
          avg1MPrice: 170000,
          avg1MPriceEok: '17억',
          recent: [],
        },
        동탄역시범우남퍼스트빌아파트: {
          latestPrice: 115000,
          latestPriceEok: '11억5,000',
          latestArea: 34,
          latestFloor: 12,
          latestDate: todayYmd,
          maxPrice: 120000,
          maxPriceEok: '12억',
          minPrice: 90000,
          minPriceEok: '9억',
          txCount: 80,
          avg1MPrice: 112000,
          avg1MPriceEok: '11억2,000',
          recent: [],
        },
      };

      const { result: idempotentResult } = renderHook(
        () =>
          useTxData(
            undefined,
            ssrSummaryAlreadyApplied as any,
            undefined,
            deltaTransactions
          ),
        { wrapper }
      );

      await act(async () => {
        await new Promise((r) => setTimeout(r, 80));
      });

      expect(idempotentResult.current.txSummary?.동탄역롯데캐슬?.txCount).toBe(100);
      expect(idempotentResult.current.recentTransactions).toHaveLength(2);
    });
  });

  describe('4. Workflow Regression Guard (Clean master HEAD for Morning Deploy Hooks)', () => {
    it('ensures sync-transactions.yml never commits [vercel skip] to master', () => {
      const workflowPath = path.resolve(__dirname, '../../../.github/workflows/sync-transactions.yml');
      const content = fs.readFileSync(workflowPath, 'utf8');
      const commitLines = content
        .split('\n')
        .filter((line) => line.includes('git commit -m'));

      expect(commitLines.length).toBeGreaterThan(0);
      for (const line of commitLines) {
        expect(line).not.toContain('[vercel skip]');
      }
    });
  });
});
