import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { MarketStatsStrong, MarketStatsLight } from '../MarketStatsSubtitle';
import { staticDataService } from '@/lib/services/staticDataService';
import { getTodayYmdKST } from '@/lib/todayUpdateEvaluator';

jest.mock('@/lib/services/staticDataService', () => ({
  staticDataService: {
    fetchJson: jest.fn(),
  },
}));

describe('MarketStatsSubtitle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prefers latestRegisteredDate and displays "국토부 등록 반영" matching timeline registration date for past dates', async () => {
    (staticDataService.fetchJson as jest.Mock).mockResolvedValue({
      apartmentCount: 183,
      saleTxCount: 65500,
      latestContractDate: '20261030',
      latestRegisteredDate: '20261101',
    });

    render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <div>
          <MarketStatsStrong />
          <MarketStatsLight text="내 한도로 살 수 있는 단지와 갈아타기 손익까지" />
        </div>
      </SWRConfig>
    );

    await waitFor(() => {
      expect(screen.getByText('183')).toBeInTheDocument();
      expect(screen.getByText('65,500건')).toBeInTheDocument();
      expect(screen.getByText(/11월 1일 국토부 등록 반영/)).toBeInTheDocument();
    });
  });

  it('displays "오늘 아침 7시 갱신" with emerald pulse when latestRegisteredDate is today (KST)', async () => {
    const todayYmd = getTodayYmdKST();
    const month = Number(todayYmd.slice(4, 6));
    const day = Number(todayYmd.slice(6, 8));
    const expectedLabel = `${month}월 ${day}일`;

    (staticDataService.fetchJson as jest.Mock).mockResolvedValue({
      apartmentCount: 185,
      saleTxCount: 65510,
      latestContractDate: '20261030',
      latestRegisteredDate: todayYmd,
    });

    render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <MarketStatsLight text="내 한도로 살 수 있는 단지와 갈아타기 손익까지" />
      </SWRConfig>
    );

    await waitFor(() => {
      expect(
        screen.getByText(new RegExp(`오늘 아침 7시 갱신 \\(${expectedLabel}\\)`))
      ).toBeInTheDocument();
    });
  });

  it('falls back to latestContractDate with "거래 반영" when latestRegisteredDate is absent', async () => {
    (staticDataService.fetchJson as jest.Mock).mockResolvedValue({
      apartmentCount: 183,
      saleTxCount: 65500,
      latestContractDate: '20261030',
    });

    render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <MarketStatsLight text="내 한도로 살 수 있는 단지와 갈아타기 손익까지" />
      </SWRConfig>
    );

    await waitFor(() => {
      expect(screen.getByText(/10월 30일 거래 반영/)).toBeInTheDocument();
    });
  });
});
