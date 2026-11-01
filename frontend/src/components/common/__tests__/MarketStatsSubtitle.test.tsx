import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { MarketStatsStrong, MarketStatsLight } from '../MarketStatsSubtitle';
import { staticDataService } from '@/lib/services/staticDataService';

jest.mock('@/lib/services/staticDataService', () => ({
  staticDataService: {
    fetchJson: jest.fn(),
  },
}));

describe('MarketStatsSubtitle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prefers latestRegisteredDate and displays "국토부 등록 반영" matching timeline registration date', async () => {
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
