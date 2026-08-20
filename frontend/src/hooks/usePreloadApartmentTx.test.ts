import { renderHook, act } from '@testing-library/react';
import { usePreloadApartmentTx, getApartmentFileKey, preloadApartmentTxData } from './usePreloadApartmentTx';
import { preload } from 'swr';
import type { DongApartment } from '@/lib/dong-apartments';
import type { AptTxSummary } from '@/lib/types/transaction';

jest.mock('swr', () => ({
  preload: jest.fn(),
}));

describe('usePreloadApartmentTx & getApartmentFileKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
  };

  it('should resolve apartment file key correctly with exact or normalized match', () => {
    const map = new Map<string, DongApartment>();
    map.set('목동신시가지14단지', mockSheetApartments['신정동'][0]);

    const key1 = getApartmentFileKey(
      '목동신시가지14단지',
      '신정동',
      map,
      mockSheetApartments['신정동'],
      undefined,
      mockTxSummary
    );
    expect(key1).toBe('목동신시가지14단지');

    // Empty input returns empty string
    expect(getApartmentFileKey('', '신정동')).toBe('');
  });

  it('should preload recent and full apartment transaction json via SWR preload', () => {
    const encoded = encodeURIComponent('목동신시가지14단지');
    preloadApartmentTxData('목동신시가지14단지');
    expect(preload).toHaveBeenCalledTimes(2);
    expect(preload).toHaveBeenCalledWith(
      expect.stringContaining(`/tx-data/${encoded}-recent.json`),
      expect.any(Function)
    );
    expect(preload).toHaveBeenCalledWith(
      expect.stringContaining(`/tx-data/${encoded}.json`),
      expect.any(Function)
    );
  });

  it('should provide a memoized preload function via the hook', () => {
    const { result } = renderHook(() =>
      usePreloadApartmentTx(mockSheetApartments, undefined, mockTxSummary)
    );

    act(() => {
      result.current('목동신시가지14단지', '신정동');
    });

    expect(preload).toHaveBeenCalledTimes(2);
  });
});
