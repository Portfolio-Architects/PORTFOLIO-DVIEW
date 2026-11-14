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

  it('renders unified today live ticker with new registrations and new high counts without em-dash or duplicate chrome', async () => {
    const todayYmd = getTodayYmdKST();
    const mm = todayYmd.slice(4, 6);
    const dd = todayYmd.slice(6, 8);

    (staticDataService.fetchJson as jest.Mock).mockResolvedValue({
      apartmentCount: 183,
      saleTxCount: 66336,
      latestContractDate: todayYmd,
      latestRegisteredDate: todayYmd,
      todayRegisteredCount: 36,
      todayNewHighCount: 15,
    });

    const { container } = render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <div>
          <MarketStatsStrong />
          <MarketStatsLight />
        </div>
      </SWRConfig>
    );

    await waitFor(() => {
      expect(screen.getByText('183')).toBeInTheDocument();
      expect(screen.getByText('66,336건')).toBeInTheDocument();
      expect(screen.getByText('오늘 신규 36건')).toBeInTheDocument();
      expect(screen.getByText('신고가 15건')).toBeInTheDocument();
      expect(screen.getByText(`(${mm}.${dd} 07:00)`)).toBeInTheDocument();
    });

    expect(container.textContent).not.toContain('—');
    expect(container.textContent).not.toContain('오늘 아침 7시 갱신');
    expect(screen.getByText('신고가 15건').className).toContain('text-brand-red');
    expect(screen.getByText('신고가 15건').className).not.toContain('bg-red-500');
  });

  it('displays truthful "오늘 07:00 실거래 갱신" without fabricating counts when latestRegisteredDate is today and count is omitted', async () => {
    const todayYmd = getTodayYmdKST();
    const mm = todayYmd.slice(4, 6);
    const dd = todayYmd.slice(6, 8);

    (staticDataService.fetchJson as jest.Mock).mockResolvedValue({
      apartmentCount: 185,
      saleTxCount: 65510,
      latestContractDate: '20261030',
      latestRegisteredDate: todayYmd,
    });

    const { container } = render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <MarketStatsLight />
      </SWRConfig>
    );

    await waitFor(() => {
      expect(screen.getByText('오늘 07:00 실거래 갱신')).toBeInTheDocument();
      expect(screen.getByText(`(${mm}.${dd})`)).toBeInTheDocument();
    });

    expect(container.textContent).not.toContain('0건');
    expect(container.textContent).not.toContain('신규 1건');
  });

  it('prefers latestRegisteredDate, displays "국토부 등록 반영" on past dates, and ignores stale prior-day counts', async () => {
    (staticDataService.fetchJson as jest.Mock).mockResolvedValue({
      apartmentCount: 183,
      saleTxCount: 65500,
      latestContractDate: '20261030',
      latestRegisteredDate: '20261101',
      todayRegisteredCount: 28,
      todayNewHighCount: 9,
    });

    const { container } = render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <div>
          <MarketStatsStrong />
          <MarketStatsLight />
        </div>
      </SWRConfig>
    );

    await waitFor(() => {
      expect(screen.getByText('183')).toBeInTheDocument();
      expect(screen.getByText('65,500건')).toBeInTheDocument();
      expect(screen.getByText('11월 1일 국토부 등록 반영')).toBeInTheDocument();
    });

    expect(container.textContent).not.toContain('오늘 신규 28건');
    expect(container.textContent).not.toContain('—');
  });

  it('falls back to latestContractDate with "거래 반영" when latestRegisteredDate is absent', async () => {
    (staticDataService.fetchJson as jest.Mock).mockResolvedValue({
      apartmentCount: 183,
      saleTxCount: 65500,
      latestContractDate: '20261030',
    });

    render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <MarketStatsLight />
      </SWRConfig>
    );

    await waitFor(() => {
      expect(screen.getByText('10월 30일 거래 반영')).toBeInTheDocument();
    });
  });
});
