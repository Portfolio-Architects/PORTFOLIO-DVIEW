import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AptDonutSection, PRICE_TIER_COLORS, PYEONG_TIER_COLORS, formatPriceEok, formatSectorAvgPrice } from './AptDonutSection';

// Mock Recharts
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container" style={{ width: '100%', height: '100%' }}>{children}</div>,
    PieChart: ({ children }: any) => <svg data-testid="pie-chart">{children}</svg>,
    Pie: ({ children, onClick, onMouseEnter, onMouseLeave, data }: any) => (
      <g
        data-testid="pie"
        onClick={() => onClick && data && data[0] && onClick(data[0])}
        onMouseEnter={(e) => onMouseEnter && data && data[0] && onMouseEnter(data[0], 0, e)}
        onMouseLeave={onMouseLeave}
      >
        {children}
      </g>
    ),
    Cell: ({ fill, onClick, onMouseEnter, onMouseLeave }: any) => (
      <path
        data-testid="pie-cell"
        fill={fill}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />
    ),
    Tooltip: () => <div data-testid="tooltip" />,
  };
});

jest.mock('@/lib/preload', () => ({
  preloadApartmentModal: jest.fn(),
}));

describe('AptDonutSection Test Suite', () => {
  const mockRecentTransactions = [
    {
      aptName: '동탄역 롯데캐슬',
      txKey: '동탄역롯데캐슬',
      date: '08.18',
      contractDate: '20260818',
      priceVal: 16.5,
      priceEok: '16억 5,000만',
      area: 59.8,
      areaPyeong: 25.1,
      floor: 25,
      isNewHigh: true,
      delta: 0.8,
      deltaPercent: 5.1,
    },
    {
      aptName: '동탄역 시범 우남퍼스트빌',
      txKey: '동탄역시범우남퍼스트빌',
      date: '08.17',
      contractDate: '20260817',
      priceVal: 11.2,
      priceEok: '11억 2,000만',
      area: 84.8,
      areaPyeong: 33.8,
      floor: 18,
      isNewHigh: false,
      delta: 0.4,
      deltaPercent: 3.7,
    },
    {
      aptName: '동탄역 시범 더샵 센트럴시티',
      txKey: '동탄역시범더샵센트럴시티',
      date: '08.16',
      contractDate: '20260816',
      priceVal: 8.5,
      priceEok: '8억 5,000만',
      area: 95.5,
      areaPyeong: 38.5,
      floor: 12,
      isNewHigh: false,
      delta: 0,
      deltaPercent: 0,
    },
    {
      aptName: '서동탄역 우남퍼스트빌',
      txKey: '서동탄역우남퍼스트빌',
      date: '08.15',
      contractDate: '20260815',
      priceVal: 5.2,
      priceEok: '5억 2,000만',
      area: 115.0,
      areaPyeong: 45.0,
      floor: 10,
      isNewHigh: false,
      delta: -0.3,
      deltaPercent: -2.5,
    },
  ];

  const mockSummary = {
    '동탄역 롯데캐슬': {
      dong: '오산동',
      avg3MPrice: 16.2,
      avg3MPriceEok: '16억 2,000만',
    },
    '동탄역 시범 우남퍼스트빌': {
      dong: '청계동',
      avg3MPrice: 11.0,
      avg3MPriceEok: '11억',
    },
    '동탄역 시범 더샵 센트럴시티': {
      dong: '청계동',
      avg3MPrice: 8.5,
      avg3MPriceEok: '8억 5,000만',
    },
    '서동탄역 우남퍼스트빌': {
      dong: '능동',
      avg3MPrice: 5.2,
      avg3MPriceEok: '5억 2,000만',
    },
  };

  describe('Pyeong & Price Mode Toggle & Distribution', () => {
    it('renders pyeong tier demand tiers by default with exact 100% total percentage sum', () => {
      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={mockRecentTransactions}
          txSummaryData={mockSummary as any}
        />
      );

      // Mode switch buttons
      const pyeongBtn = screen.getByRole('button', { name: '평형대별' });
      const priceBtn = screen.getByRole('button', { name: '가격대별' });
      expect(pyeongBtn).toBeInTheDocument();
      expect(priceBtn).toBeInTheDocument();
      expect(pyeongBtn).toHaveAttribute('aria-pressed', 'true');
      expect(priceBtn).toHaveAttribute('aria-pressed', 'false');

      // 4 pyeong tiers by default
      expect(screen.getByText('소형 (60㎡ 이하)')).toBeInTheDocument();
      expect(screen.getByText('중소형 (60~85㎡)')).toBeInTheDocument();
      expect(screen.getByText('중대형 (85~102㎡)')).toBeInTheDocument();
      expect(screen.getByText('대형 (102㎡ 초과)')).toBeInTheDocument();

      // 4 items: each 1 count -> 25.0% each
      const percentageElements = screen.getAllByText('25.0%');
      expect(percentageElements.length).toBeGreaterThanOrEqual(4);

      // Center overlay badge
      expect(screen.getByText('총 실거래')).toBeInTheDocument();
      expect(screen.getByText('4건')).toBeInTheDocument();
      expect(screen.getByText(/최근 90일.*기준/)).toBeInTheDocument();
    });

    it('switches between pyeong mode and price mode via switch toggle cleanly', () => {
      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={mockRecentTransactions}
          txSummaryData={mockSummary as any}
        />
      );

      // Default: Pyeong mode
      expect(screen.getByText('소형 (60㎡ 이하)')).toBeInTheDocument();
      expect(screen.queryByText('6억 이하')).not.toBeInTheDocument();

      // Click '가격대별' button
      const priceBtn = screen.getByRole('button', { name: '가격대별' });
      fireEvent.click(priceBtn);

      // Now Price mode is active
      expect(screen.getByText('6억 이하')).toBeInTheDocument();
      expect(screen.getByText('6억 ~ 9억')).toBeInTheDocument();
      expect(screen.getByText('9억 ~ 15억')).toBeInTheDocument();
      expect(screen.getByText('15억 초과')).toBeInTheDocument();
      expect(screen.queryByText('소형 (60㎡ 이하)')).not.toBeInTheDocument();

      // Click '평형대별' button to switch back
      const pyeongBtn = screen.getByRole('button', { name: '평형대별' });
      fireEvent.click(pyeongBtn);

      expect(screen.getByText('소형 (60㎡ 이하)')).toBeInTheDocument();
      expect(screen.queryByText('6억 이하')).not.toBeInTheDocument();
    });

    it('displays representative apartment inline and selects category on card click to connect with KPI cards', () => {
      const mockOnSelectApt = jest.fn();
      const mockOnActiveSectorChange = jest.fn();
      const mockPreload = jest.fn();

      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={mockRecentTransactions}
          txSummaryData={mockSummary as any}
          onSelectApt={mockOnSelectApt}
          onActiveSectorChange={mockOnActiveSectorChange}
          preloadApartmentTx={mockPreload}
        />
      );

      // Simplified 1-line card shows category name and transaction count
      expect(screen.getByText('소형 (60㎡ 이하)')).toBeInTheDocument();
      expect(screen.getAllByText('(1건)').length).toBeGreaterThanOrEqual(1);

      // Clicking card toggles category selection and notifies onActiveSectorChange without opening modal
      const smallRow = screen.getByLabelText(/소형 \(60㎡ 이하\) 1건/i);
      fireEvent.click(smallRow);
      expect(mockOnSelectApt).not.toHaveBeenCalled();
      expect(mockOnActiveSectorChange).toHaveBeenCalledWith(
        expect.objectContaining({ name: '소형 (60㎡ 이하)' })
      );

      // Selection reset button works
      const resetBtn = screen.getByText('선택 초기화');
      fireEvent.click(resetBtn);
      expect(screen.queryByText('선택 초기화')).not.toBeInTheDocument();
    });

    it('handles empty transactions without crashing or NaN', () => {
      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={[]}
        />
      );

      expect(screen.getAllByText('(0건)').length).toBeGreaterThanOrEqual(4);
      expect(screen.getAllByText('0.0%').length).toBeGreaterThanOrEqual(4);
    });

    it('handles malformed transaction items safely', () => {
      const malformedData = [
        null,
        undefined,
        {},
        { aptName: '이상한 단지', priceVal: undefined, delta: null },
      ];

      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={malformedData as any}
        />
      );

      expect(screen.getByText('실거래 비중')).toBeInTheDocument();
    });

    it('applies responsive layout classes preventing mobile vertical overflow and width shrinkage', () => {
      const { container } = render(
        <AptDonutSection
          mounted={true}
          recentTransactions={mockRecentTransactions}
          txSummaryData={mockSummary as any}
        />
      );

      // Verify header uses CSS order classes for responsive 2-row layout
      const modeSwitchContainer = container.querySelector('.order-3');
      expect(modeSwitchContainer).toBeInTheDocument();
      expect(modeSwitchContainer).toHaveClass('w-full');

      // Verify chart wrapper uses sm:h-full instead of unbounded mobile h-full
      const chartWrapper = container.querySelector('.sm\\:border-r');
      expect(chartWrapper).toBeInTheDocument();
      expect(chartWrapper).toHaveClass('sm:h-full');
      expect(chartWrapper?.className).not.toMatch(/\s+h-full\s+/);

      // Verify legend wrapper expands to 100% width on mobile
      const legendWrapper = container.querySelector('.w-full.sm\\:flex-1');
      expect(legendWrapper).toBeInTheDocument();
    });

    it('filters out public rental apartments when publicRentalSet is provided', () => {
      const publicRentalSet = new Set(['서동탄역 우남퍼스트빌']);

      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={mockRecentTransactions}
          publicRentalSet={publicRentalSet}
        />
      );

      // Out of 4 transactions, '서동탄역 우남퍼스트빌' (대형) is filtered -> 3 remaining
      // 대형 is 0건 / 0.0%
      expect(screen.getByText('0.0%')).toBeInTheDocument();
    });

    it('correctly updates internal state and fires onActiveCategoryChange callback in uncontrolled mode', () => {
      const onActiveChange = jest.fn();

      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={mockRecentTransactions}
          txSummaryData={mockSummary as any}
          onActiveCategoryChange={onActiveChange}
        />
      );

      // Click '중소형 (60~85㎡)'
      const mediumRow = screen.getByLabelText(/중소형 \(60~85㎡\) 1건/i);
      fireEvent.click(mediumRow);

      expect(onActiveChange).toHaveBeenCalledWith('중소형 (60~85㎡)');
      expect(screen.getAllByText('중소형 (60~85㎡)').length).toBeGreaterThanOrEqual(1);
    });

    it('correctly resolves dong and aliases via nameMapping', () => {
      const nameMapping = {
        '우남퍼스트빌': '동탄역시범우남퍼스트빌',
      };
      const txWithAlias = [
        {
          aptName: '우남퍼스트빌',
          priceVal: 11.2,
          area: 84.8,
          areaPyeong: 33.8,
          delta: 0.4,
        },
      ];
      const onActiveSectorChange = jest.fn();

      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={txWithAlias}
          txSummaryData={mockSummary as any}
          nameMapping={nameMapping}
          onActiveSectorChange={onActiveSectorChange}
        />
      );

      const mediumRow = screen.getByLabelText(/중소형 \(60~85㎡\) 1건/i);
      fireEvent.click(mediumRow);

      // Should resolve dong '청계동' in activeSector repApt
      expect(onActiveSectorChange).toHaveBeenCalledWith(
        expect.objectContaining({
          repApt: expect.objectContaining({
            dong: '청계동',
          }),
        })
      );
    });

    it('guarantees percentage sum equals exactly 100.0% for odd number of transactions', () => {
      const threeTransactions = [
        { aptName: 'Apt1', priceVal: 5, area: 55, areaPyeong: 25 },
        { aptName: 'Apt2', priceVal: 8, area: 84, areaPyeong: 34 },
        { aptName: 'Apt3', priceVal: 12, area: 98, areaPyeong: 45 },
      ];

      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={threeTransactions}
        />
      );

      // 33.4% + 33.3% + 33.3% + 0.0% = 100.0%
      expect(screen.getByText('33.4%')).toBeInTheDocument();
      expect(screen.getAllByText('33.3%').length).toBe(2);
    });

    it('does not trigger modal or preload when interacting with simplified donut breakdown cards', () => {
      const mockPreload = jest.fn();
      const mockSelectApt = jest.fn();
      const txWithoutDong = [
        { aptName: '단지무동', priceVal: 8.5, area: 84.9, areaPyeong: 34 },
      ];

      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={txWithoutDong}
          preloadApartmentTx={mockPreload}
          onSelectApt={mockSelectApt}
        />
      );

      const mediumRow = screen.getByLabelText(/중소형 \(60~85㎡\) 1건/i);
      fireEvent.mouseEnter(mediumRow);
      expect(mockPreload).not.toHaveBeenCalled();

      fireEvent.click(mediumRow);
      expect(mockSelectApt).not.toHaveBeenCalled();
    });

    it('formats missing priceEok into eok/man representation and resolves txKey-only transactions', () => {
      const txKeyOnlyData = [
        {
          txKey: '동탄역롯데캐슬',
          priceVal: 16.5,
          area: 59.8,
        },
      ];

      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={txKeyOnlyData}
          txSummaryData={mockSummary as any}
        />
      );

      const smallRow = screen.getByLabelText(/소형 \(60㎡ 이하\) 1건/i);
      fireEvent.click(smallRow);

      expect(screen.getAllByText('소형 (60㎡ 이하)').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Period Selection (7d / 30d / 90d / 1y)', () => {
    it('renders all 4 period buttons and default 90d badge and label', () => {
      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={mockRecentTransactions}
          txSummaryData={mockSummary as any}
        />
      );

      expect(screen.getByRole('button', { name: /최근 7일 실거래 보기/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /최근 30일 실거래 보기/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /최근 90일 실거래 보기/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /최근 1년 실거래 보기/i })).toBeInTheDocument();

      // 3y and all are removed
      expect(screen.queryByRole('button', { name: /최근 3년/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /전체/i })).not.toBeInTheDocument();

      // Check center overlay period label
      expect(screen.getByText(/최근 90일.*기준/)).toBeInTheDocument();
    });

    it('switches period and invokes onPeriodChange callback when period button is clicked', () => {
      const handlePeriodChange = jest.fn();
      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={mockRecentTransactions}
          txSummaryData={mockSummary as any}
          onPeriodChange={handlePeriodChange}
        />
      );

      const sevenDaysBtn = screen.getByRole('button', { name: /최근 7일 실거래 보기/i });
      fireEvent.click(sevenDaysBtn);

      expect(handlePeriodChange).toHaveBeenCalledWith('7d');
      expect(screen.getByText(/최근 7일.*기준/)).toBeInTheDocument();

      const thirtyDaysBtn = screen.getByRole('button', { name: /최근 30일 실거래 보기/i });
      fireEvent.click(thirtyDaysBtn);

      expect(handlePeriodChange).toHaveBeenCalledWith('30d');
      expect(screen.getByText(/최근 30일.*기준/)).toBeInTheDocument();

      const oneYearBtn = screen.getByRole('button', { name: /최근 1년 실거래 보기/i });
      fireEvent.click(oneYearBtn);

      expect(handlePeriodChange).toHaveBeenCalledWith('1y');
      expect(screen.getByText(/최근 1년.*기준/)).toBeInTheDocument();
    });

    it('filters transactions dynamically by date for 7d period', () => {
      const transactionsWithVariousDates = [
        {
          aptName: '동탄역 롯데캐슬',
          contractDate: '20260818',
          priceVal: 16.5,
          area: 59.8,
        },
        {
          aptName: '동탄역 시범 우남퍼스트빌',
          contractDate: '20260815',
          priceVal: 11.2,
          area: 84.8,
        },
        {
          aptName: '동탄역 시범 한화꿈에그린',
          contractDate: '20260701', // over 40 days prior
          priceVal: 11.5,
          area: 120.5,
        },
      ];

      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={transactionsWithVariousDates}
        />
      );

      // In 90d (default), all 3 transactions are included
      expect(screen.getByText('3건')).toBeInTheDocument();

      // Click 7d button
      const sevenDaysBtn = screen.getByRole('button', { name: /최근 7일 실거래 보기/i });
      fireEvent.click(sevenDaysBtn);

      // Only 20260818 and 20260815 are within 7 days of 20260818
      expect(screen.getByText('2건')).toBeInTheDocument();
    });
  });

  describe('AdSense Yield Optimization & Policy Finance Integration', () => {
    it('maintains clean card layouts without cluttered policy descriptions in price mode', () => {
      render(
        <AptDonutSection
          mounted={true}
          initialMode="price"
          recentTransactions={mockRecentTransactions}
          txSummaryData={mockSummary as any}
        />
      );

      // Verify verbose policy descriptions are removed from cards for intuitive customer appeal
      expect(screen.queryByText('보금자리론·디딤돌·신생아특례 정책대출 적격 가성비 구간')).not.toBeInTheDocument();
      expect(screen.queryByText('신생아특례 대출 상한 및 국평 실거주 주력 수요 구간')).not.toBeInTheDocument();
      expect(screen.queryByText('동탄역세권 대장 단지 및 상급지 갈아타기 선호 구간')).not.toBeInTheDocument();
      expect(screen.queryByText('동탄 최고가 랜드마크 및 하이엔드 자산가 구간')).not.toBeInTheDocument();

      // Verify micro-chip capsules and badges are completely removed from legend cards in price mode
      expect(screen.queryByText('디딤돌·신생아 1.6%~')).not.toBeInTheDocument();
      expect(screen.queryByText('신생아특례 5억')).not.toBeInTheDocument();
      expect(screen.queryByText('상급지 갈아타기')).not.toBeInTheDocument();
      expect(screen.queryByText('하이엔드 프리미엄')).not.toBeInTheDocument();
      expect(screen.queryByText('인기 1위')).not.toBeInTheDocument();

      // Verify center HUD maintains clean aesthetic
      expect(screen.queryByText(/정책적격/)).not.toBeInTheDocument();
    });

    it('removes all micro-chip capsules and badges from legend cards in pyeong mode', () => {
      render(
        <AptDonutSection
          mounted={true}
          initialMode="pyeong"
          recentTransactions={mockRecentTransactions}
          txSummaryData={mockSummary as any}
        />
      );

      // Verify all pyeong micro-chip capsules and popularity badges are completely removed
      expect(screen.queryByText('1~2인·신혼')).not.toBeInTheDocument();
      expect(screen.queryByText('국민평형 84타입')).not.toBeInTheDocument();
      expect(screen.queryByText('여유공간 선호')).not.toBeInTheDocument();
      expect(screen.queryByText('희소 펜트·대형')).not.toBeInTheDocument();
      expect(screen.queryByText('인기 1위')).not.toBeInTheDocument();
    });

    it('enforces exact 4-color palette invariance between pyeong and price tiers', () => {
      expect(PRICE_TIER_COLORS.under6).toBe(PYEONG_TIER_COLORS.small);
      expect(PRICE_TIER_COLORS.under9).toBe(PYEONG_TIER_COLORS.medium);
      expect(PRICE_TIER_COLORS.under15).toBe(PYEONG_TIER_COLORS.large);
      expect(PRICE_TIER_COLORS.over15).toBe(PYEONG_TIER_COLORS.xlarge);

      expect(PRICE_TIER_COLORS.under6).toBe('#059669');
      expect(PRICE_TIER_COLORS.under9).toBe('#2563eb');
      expect(PRICE_TIER_COLORS.under15).toBe('#60a5fa');
      expect(PRICE_TIER_COLORS.over15).toBe('#334155');
    });

    it('triggers onOpenMortgageModal callback when loan CTA is clicked in selected card in price mode', () => {
      const mockOpenMortgage = jest.fn();
      render(
        <AptDonutSection
          mounted={true}
          initialMode="price"
          recentTransactions={mockRecentTransactions}
          txSummaryData={mockSummary as any}
          onOpenMortgageModal={mockOpenMortgage}
        />
      );

      // Select '6억 ~ 9억'
      const under9Row = screen.getByLabelText(/6억 ~ 9억 1건/i);
      fireEvent.click(under9Row);

      // Verify CTA button appears
      const loanCta = screen.getByText(/대출 한도·금리 >/i);
      expect(loanCta).toBeInTheDocument();

      // Click loan CTA
      fireEvent.click(loanCta);
      expect(mockOpenMortgage).toHaveBeenCalledTimes(1);
    });

    it('transitions center HUD cleanly when hovering over pie slice without floating tooltip overlap', () => {
      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={mockRecentTransactions}
          txSummaryData={mockSummary as any}
        />
      );

      // Initially Center HUD shows total transactions
      expect(screen.getByText('총 실거래')).toBeInTheDocument();
      expect(screen.getByText('4건')).toBeInTheDocument();

      // Hover over Pie slice
      const pie = screen.getByTestId('pie');
      fireEvent.mouseEnter(pie);

      // Center HUD transitions to show the hovered slice cleanly
      expect(screen.getAllByText('소형 (60㎡ 이하)').length).toBe(2);
      expect(screen.getAllByText('25.0%').length).toBeGreaterThanOrEqual(4);
      expect(screen.queryByText('총 실거래')).not.toBeInTheDocument();

      // Mouse leaves Pie
      fireEvent.mouseLeave(pie);
      expect(screen.getByText('총 실거래')).toBeInTheDocument();
      expect(screen.getByText('4건')).toBeInTheDocument();
    });
  });

  describe('Helper Functions', () => {
    it('formatPriceEok formats valid and invalid values correctly', () => {
      expect(formatPriceEok(16.5)).toBe('16억 5,000만');
      expect(formatPriceEok(12.0)).toBe('12억');
      expect(formatPriceEok(0.85)).toBe('8,500만');
      expect(formatPriceEok(0)).toBe('-');
      expect(formatPriceEok(-5)).toBe('-');
    });

    it('formatSectorAvgPrice formats correctly', () => {
      expect(formatSectorAvgPrice([])).toBe('');
      expect(
        formatSectorAvgPrice([
          { aptName: 'Apt1', priceVal: 10, dong: '오산동', priceEok: '10억', areaPyeong: 25, delta: 0 },
          { aptName: 'Apt2', priceVal: 12, dong: '청계동', priceEok: '12억', areaPyeong: 25, delta: 0 },
        ])
      ).toBe('평균 11.0억');
    });
  });

  describe('Header Layout & Title Readability Invariant', () => {
    it('renders prominent title with indicator dot and total count badge', () => {
      render(
        <AptDonutSection
          recentTransactions={mockRecentTransactions}
          mounted={true}
        />
      );

      const titleHeading = screen.getByRole('heading', { level: 3, name: '실거래 비중' });
      expect(titleHeading).toBeInTheDocument();
      expect(screen.getByText('총 4건')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '평형대별' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '가격대별' })).toBeInTheDocument();
    });
  });
});
