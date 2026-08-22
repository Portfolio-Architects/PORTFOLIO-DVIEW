import { renderHook, waitFor } from '@testing-library/react';
import { useMacroData } from '../useMacroData';
import { useTechnoValleyData } from '../useTechnoValleyData';
import { staticDataService } from '@/lib/services/staticDataService';
import { apiClient } from '@/lib/api/apiClient';

jest.mock('swr', () => {
  const original = jest.requireActual('swr');
  return {
    __esModule: true,
    ...original,
  };
});

describe('useMacroData and useTechnoValleyData Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useMacroData', () => {
    it('should return fallback initial data immediately without loading state', () => {
      const mockMacro = [
        { name: '2026-01', '동탄 아파트 전체': 100, '동탄 아파트 전세 평균': 80 },
      ];

      const { result } = renderHook(() => useMacroData(mockMacro));
      expect(result.current.macroTrend).toEqual(mockMacro);
      expect(result.current.isLoading).toBe(false);
    });

    it('should fetch macro data when no initial data is provided', async () => {
      const mockMacro = [
        { name: '2026-02', '동탄 아파트 전체': 105, '동탄 아파트 전세 평균': 82 },
      ];

      jest.spyOn(staticDataService, 'fetchJson').mockResolvedValue(mockMacro);

      const { result } = renderHook(() => useMacroData());

      await waitFor(() => {
        expect(result.current.macroTrend).toEqual(mockMacro);
      });
    });
  });

  describe('useTechnoValleyData', () => {
    it('should fetch techno valley distribution, trend, and jisan status', async () => {
      jest.spyOn(apiClient, 'get').mockImplementation((url: string) => {
        if (url === '/api/technovalley/industry-distribution') {
          return Promise.resolve({
            success: true,
            data: [{ name: 'IT/SW', count: 120, color: '#2e7cf6' }],
          });
        }
        if (url === '/api/technovalley/trend') {
          return Promise.resolve({
            success: true,
            data: [{ period: '2026.01', avgSalePrice: 1500, avgDeposit: 1000, avgRent: 50, volume: 30, rentPerPyeong: 4.5 }],
          });
        }
        if (url === '/api/technovalley/jisan-status') {
          return Promise.resolve({
            success: true,
            total: 56,
            completedCount: 43,
            underConstructionCount: 3,
            notStartedCount: 10,
            centers: [],
          });
        }
        return Promise.resolve({});
      });

      const { result } = renderHook(() => useTechnoValleyData());

      await waitFor(() => {
        expect(result.current.distributionData?.length).toBe(1);
        expect(result.current.trendData?.length).toBe(1);
        expect(result.current.jisanStatus?.total).toBe(56);
      });
    });
  });
});
