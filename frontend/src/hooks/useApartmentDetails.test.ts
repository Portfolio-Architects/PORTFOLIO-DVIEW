import { renderHook, act, waitFor } from '@testing-library/react';
import { useApartmentDetails } from './useApartmentDetails';
import { dashboardFacade, FieldReportData } from '@/lib/DashboardFacade';
import type { DongApartment } from '@/lib/dong-apartments';
import type { AptTxSummary, LocationScoreItem } from '@/lib/types/transaction';
import { preload } from 'swr';

jest.mock('swr', () => {
  const original = jest.requireActual('swr');
  return {
    __esModule: true,
    ...original,
    default: jest.fn(() => ({ data: [], isLoading: false })),
    preload: jest.fn(),
  };
});

describe('useApartmentDetails Hook & Race Condition Defense', () => {
  const mockSheetApartments: Record<string, DongApartment[]> = {
    '신정동': [
      {
        name: '목동신시가지14단지',
        dong: '신정동',
        txKey: '목동신시가지14단지',
        totalHouseholds: 3100,
        highFloor: 20,
        lowFloor: 5,
        builder: '현대건설',
        useApproveYmd: '1987-10-01',
        cctvCount: 150,
        parkingCount: 2000,
        parkCount: 1,
        academyCount: 50,
        busStopCount: 10,
        subwayCount: 2,
        martCount: 3,
        hospitalCount: 5,
      } as DongApartment,
      {
        name: '목동신시가지13단지',
        dong: '신정동',
        txKey: '목동신시가지13단지',
        totalHouseholds: 2280,
        highFloor: 15,
        lowFloor: 5,
        builder: '대우건설',
        useApproveYmd: '1987-07-01',
        cctvCount: 120,
        parkingCount: 1500,
        parkCount: 1,
        academyCount: 40,
        busStopCount: 8,
        subwayCount: 1,
        martCount: 2,
        hospitalCount: 3,
      } as DongApartment,
    ],
  };

  const mockTxSummary: Record<string, AptTxSummary> = {
    '목동신시가지14단지': {
      count: 100,
      recentPrice: 150000,
      avgPrice: 140000,
      highestPrice: 180000,
      lowestPrice: 110000,
      jeonseCount: 80,
      recentJeonsePrice: 80000,
      avgJeonsePrice: 75000,
    },
    '목동신시가지13단지': {
      count: 90,
      recentPrice: 160000,
      avgPrice: 150000,
      highestPrice: 190000,
      lowestPrice: 120000,
      jeonseCount: 70,
      recentJeonsePrice: 85000,
      avgJeonsePrice: 80000,
    },
  };

  const mockLocationScores: Record<string, LocationScoreItem> = {
    '목동신시가지14단지': {
      subwayDistanceMeters: 350,
      nearestSubwayStation: '양천구청역',
    } as unknown as LocationScoreItem,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should prevent race condition when rapid card switching occurs (active request tracking)', async () => {
    let resolveFirstReport: (data: FieldReportData) => void = () => {};
    let resolveSecondReport: (data: FieldReportData) => void = () => {};

    const firstPromise = new Promise<FieldReportData>((resolve) => {
      resolveFirstReport = resolve;
    });
    const secondPromise = new Promise<FieldReportData>((resolve) => {
      resolveSecondReport = resolve;
    });

    const getFullReportSpy = jest.spyOn(dashboardFacade, 'getFullReport');
    getFullReportSpy.mockImplementation((id: string) => {
      if (id === 'report-14') {
        return firstPromise;
      }
      if (id === 'report-13') {
        return secondPromise;
      }
      return Promise.resolve(null as unknown as FieldReportData);
    });

    const report14: FieldReportData = {
      id: 'report-14',
      apartmentName: '목동신시가지14단지',
      dong: '신정동',
      review: '14단지 상세 리포트',
    };

    const report13: FieldReportData = {
      id: 'report-13',
      apartmentName: '목동신시가지13단지',
      dong: '신정동',
      review: '13단지 상세 리포트',
    };

    // User initially clicks 14단지
    const { result, rerender } = renderHook(
      ({ selectedReport }) =>
        useApartmentDetails(
          selectedReport,
          mockSheetApartments,
          undefined,
          null,
          mockTxSummary,
          mockLocationScores
        ),
      { initialProps: { selectedReport: report14 as FieldReportData | null } }
    );

    expect(result.current.isLoadingDetail).toBe(true);

    // User rapidly switches to 13단지 before 14단지 resolves
    rerender({ selectedReport: report13 });
    expect(result.current.isLoadingDetail).toBe(true);

    // 13단지 resolves first
    await act(async () => {
      resolveSecondReport({
        id: 'report-13',
        apartmentName: '목동신시가지13단지',
        dong: '신정동',
        review: '13단지 최종 데이터',
      });
    });

    expect(result.current.isLoadingDetail).toBe(false);
    expect(result.current.fullReportData?.apartmentName).toBe('목동신시가지13단지');
    expect(result.current.fullReportData?.review).toBe('13단지 최종 데이터');

    // 14단지 resolves later (stale out-of-order response)
    await act(async () => {
      resolveFirstReport({
        id: 'report-14',
        apartmentName: '목동신시가지14단지',
        dong: '신정동',
        review: '14단지 지연 데이터',
      });
    });

    // Stale 14단지 response MUST NOT overwrite current 13단지 data
    expect(result.current.fullReportData?.apartmentName).toBe('목동신시가지13단지');
    expect(result.current.fullReportData?.review).toBe('13단지 최종 데이터');
  });

  it('should handle stub reports via getFullReportByApartmentName', async () => {
    const stubReport: FieldReportData = {
      id: 'stub-목동신시가지14단지',
      apartmentName: '목동신시가지14단지',
      dong: '신정동',
    };

    const spy = jest.spyOn(dashboardFacade, 'getFullReportByApartmentName').mockResolvedValue({
      id: 'stub-목동신시가지14단지',
      apartmentName: '목동신시가지14단지',
      dong: '신정동',
      review: '스텁 리포트 성공',
    });

    const { result } = renderHook(() =>
      useApartmentDetails(
        stubReport,
        mockSheetApartments,
        undefined,
        null,
        mockTxSummary,
        mockLocationScores
      )
    );

    await waitFor(() => {
      expect(result.current.fullReportData?.review).toBe('스텁 리포트 성공');
    });

    expect(spy).toHaveBeenCalledWith('목동신시가지14단지');
  });

  it('should reset state when selectedReport becomes null', async () => {
    const report: FieldReportData = {
      id: 'report-14',
      apartmentName: '목동신시가지14단지',
      dong: '신정동',
    };

    jest.spyOn(dashboardFacade, 'getFullReport').mockResolvedValue({
      id: 'report-14',
      apartmentName: '목동신시가지14단지',
      dong: '신정동',
      review: '리포트 14',
    });

    const { result, rerender } = renderHook(
      ({ selectedReport }) =>
        useApartmentDetails(
          selectedReport,
          mockSheetApartments,
          undefined,
          null,
          mockTxSummary,
          mockLocationScores
        ),
      { initialProps: { selectedReport: report as FieldReportData | null } }
    );

    await waitFor(() => {
      expect(result.current.fullReportData).not.toBeNull();
    });

    rerender({ selectedReport: null });

    expect(result.current.fullReportData).toBeNull();
    expect(result.current.isLoadingDetail).toBe(false);
    expect(result.current.resolvedReport).toBeNull();
  });

  it('should consolidate preloading through preloadApartmentTx', () => {
    const { result } = renderHook(() =>
      useApartmentDetails(
        null,
        mockSheetApartments,
        undefined,
        null,
        mockTxSummary,
        mockLocationScores
      )
    );

    act(() => {
      result.current.preloadApartmentTx?.('목동신시가지14단지', '신정동');
    });

    expect(preload).toHaveBeenCalledTimes(2);
  });
});
