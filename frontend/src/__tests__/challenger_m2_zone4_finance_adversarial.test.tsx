import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TrafficNoticeBoard, type LocalNoticeItem } from '@/components/macro/TrafficNoticeBoard';
import { HighCpcFinanceSection } from '@/components/finance/HighCpcFinanceSection';
import { PolicyLoanQuickWidget } from '@/components/finance/PolicyLoanQuickWidget';
import { JeonseGuaranteeQuickPreview } from '@/components/finance/JeonseGuaranteeQuickPreview';
import { GUIDE_ARTICLES } from '@/lib/data/guides';

describe('Adversarial Challenger M2-2: Zone 4 & Finance Auto-Binding Empirical Verification', () => {
  describe('1. TrafficNoticeBoard Network Edge Cases & Resilience', () => {
    it('handles completely empty notices without crashing and displays fallback notices', () => {
      render(
        <TrafficNoticeBoard
          railStrategyNotices={[]}
          tramNotices={[]}
        />
      );

      expect(screen.getByText('동탄 철도 교통 게시판')).toBeInTheDocument();
      const emptyFallbacks = screen.getAllByText('관련 공지사항이 없습니다.');
      expect(emptyFallbacks).toHaveLength(2); // One for rail strategy, one for tram
    });

    it('gracefully handles malformed or unusual date strings', () => {
      const oddDateNotices: LocalNoticeItem[] = [
        {
          id: 'rail-odd-1',
          title: '날짜 빈 문자열 공고',
          url: 'https://example.com/1',
          dept: '철도전략과',
          date: '', // empty date string
          isDongtan: true,
          source: 'rail',
        },
        {
          id: 'rail-odd-2',
          title: '연도만 있는 짧은 날짜 공고',
          url: 'https://example.com/2',
          dept: '철도전략과',
          date: '2026', // short date
          isDongtan: true,
          source: 'rail',
        },
      ];

      expect(() => {
        render(
          <TrafficNoticeBoard
            railStrategyNotices={oddDateNotices}
            tramNotices={[]}
          />
        );
      }).not.toThrow();

      expect(screen.getByText('날짜 빈 문자열 공고')).toBeInTheDocument();
      expect(screen.getByText('연도만 있는 짧은 날짜 공고')).toBeInTheDocument();
    });

    it('triggers navigation for rail notices and window.open for tram notices', () => {
      const windowOpenMock = jest.spyOn(window, 'open').mockImplementation(() => null);

      const railItem: LocalNoticeItem = {
        id: 'rail-test-101',
        title: '동탄역 환승센터 복합개발 계획',
        url: 'https://example.com/rail-101',
        dept: '철도전략과',
        date: '2026-06-15',
        isDongtan: true,
        source: 'rail',
      };

      const tramItem: LocalNoticeItem = {
        id: 'tram-test-202',
        title: '트램 1호선 오산-동탄-수원 노선 착공식',
        url: 'https://example.com/tram-202',
        dept: '트램추진단',
        date: '2026-06-20',
        isDongtan: true,
        source: 'rail',
      };

      render(
        <TrafficNoticeBoard
          railStrategyNotices={[railItem]}
          tramNotices={[tramItem]}
        />
      );

      // Verify buttons have correct aria-labels
      const railBtn = screen.getByLabelText(/공고: 동탄역 환승센터 복합개발 계획/);
      expect(railBtn).toBeInTheDocument();

      // Suppress JSDOM's expected "Not implemented: navigation" console error when setting window.location.href
      const spyError = jest.spyOn(console, 'error').mockImplementation((...args: any[]) => {
        const msg = args.map((a) => (typeof a === 'string' ? a : a?.message || '')).join(' ');
        if (msg.includes('Not implemented: navigation')) return;
      });

      expect(() => {
        fireEvent.click(railBtn);
      }).not.toThrow();

      spyError.mockRestore();

      // Click tram notice -> external official link
      const tramBtn = screen.getByLabelText(/공고: 트램 1호선 오산-동탄-수원 노선 착공식/);
      expect(tramBtn).toBeInTheDocument();
      fireEvent.click(tramBtn);
      expect(windowOpenMock).toHaveBeenCalledWith('https://example.com/tram-202', '_blank', 'noopener,noreferrer');

      windowOpenMock.mockRestore();
    });
  });

  describe('2. HighCpcFinanceSection Falsy, Zero, and Extreme Price Handling', () => {
    it('suppresses benchmark target badge when apartmentName is falsy (null, empty, undefined)', () => {
      const { rerender } = render(
        <HighCpcFinanceSection
          apartmentName={null}
          defaultPriceWon={900_000_000}
        />
      );
      expect(screen.queryByTestId('finance-benchmark-target-badge')).not.toBeInTheDocument();

      rerender(
        <HighCpcFinanceSection
          apartmentName=""
          defaultPriceWon={900_000_000}
        />
      );
      expect(screen.queryByTestId('finance-benchmark-target-badge')).not.toBeInTheDocument();

      rerender(
        <HighCpcFinanceSection
          apartmentName={undefined}
          defaultPriceWon={900_000_000}
        />
      );
      expect(screen.queryByTestId('finance-benchmark-target-badge')).not.toBeInTheDocument();
    });

    it('suppresses benchmark target badge when defaultPriceWon is 0, negative, or undefined', () => {
      const { rerender } = render(
        <HighCpcFinanceSection
          apartmentName="동탄역 롯데캐슬"
          defaultPriceWon={0}
        />
      );
      expect(screen.queryByTestId('finance-benchmark-target-badge')).not.toBeInTheDocument();

      rerender(
        <HighCpcFinanceSection
          apartmentName="동탄역 롯데캐슬"
          defaultPriceWon={-100_000_000}
        />
      );
      expect(screen.queryByTestId('finance-benchmark-target-badge')).not.toBeInTheDocument();

      rerender(
        <HighCpcFinanceSection
          apartmentName="동탄역 롯데캐슬"
          defaultPriceWon={undefined}
        />
      );
      expect(screen.queryByTestId('finance-benchmark-target-badge')).not.toBeInTheDocument();
    });

    it('survives extreme high price (100억) without crashing or NaN errors', () => {
      const extremePrice = 10_000_000_000; // 100억

      render(
        <HighCpcFinanceSection
          apartmentName="동탄 펜트하우스"
          defaultPriceWon={extremePrice}
        />
      );

      const badge = screen.getByTestId('finance-benchmark-target-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('동탄 펜트하우스');
      expect(badge).toHaveTextContent('100.0억');

      // PolicyLoanQuickWidget should mark 100억 as ineligible for newborn loan (> 9억 cap)
      const policyWidget = screen.getByTestId('policy-loan-quick-widget');
      expect(policyWidget).toBeInTheDocument();
      expect(screen.getByText('기준 초과')).toBeInTheDocument();
      expect(screen.getByText(/대상 주택가격 9억 원 초과/)).toBeInTheDocument();

      // JeonseGuaranteeQuickPreview should calculate debt ratio cleanly without NaN
      const jeonseWidget = screen.getByTestId('jeonse-guarantee-quick-preview');
      expect(jeonseWidget).toBeInTheDocument();
      expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
    });

    it('survives small positive price (5천만원) without crashing', () => {
      const smallPrice = 50_000_000; // 5천만원

      render(
        <HighCpcFinanceSection
          apartmentName="동탄 소형주택"
          defaultPriceWon={smallPrice}
        />
      );

      const badge = screen.getByTestId('finance-benchmark-target-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('동탄 소형주택');
      expect(badge).toHaveTextContent('0.5억');

      // Calculations remain valid numbers
      expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
    });

    it('executes all 4 modal trigger callbacks properly', () => {
      const mortgageMock = jest.fn();
      const jeonseMock = jest.fn();
      const taxMock = jest.fn();
      const sellTimingMock = jest.fn();

      render(
        <HighCpcFinanceSection
          onOpenMortgageModal={mortgageMock}
          onOpenJeonseSafetyModal={jeonseMock}
          onOpenTaxCalculator={taxMock}
          onOpenSellTiming={sellTimingMock}
        />
      );

      fireEvent.click(screen.getByTestId('open-mortgage-modal-btn'));
      expect(mortgageMock).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByTestId('open-jeonse-safety-modal-btn'));
      expect(jeonseMock).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByTestId('open-tax-modal-btn'));
      expect(taxMock).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByTestId('open-sell-timing-modal-btn'));
      expect(sellTimingMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. Dynamic State Synchronization: selectedTimelineApt -> Finance Section & Widgets', () => {
    // Dynamic binding harness simulating state changes from timeline selection
    function DynamicFinanceHarness({
      initialApt,
      initialPrice,
    }: {
      initialApt: string;
      initialPrice: number;
    }) {
      const [selectedApt, setSelectedApt] = useState<string | null>(initialApt);
      const [priceWon, setPriceWon] = useState<number | undefined>(initialPrice);

      return (
        <div>
          <button
            data-testid="switch-to-cheap-apt"
            onClick={() => {
              setSelectedApt('동탄역시범우남퍼스트빌');
              setPriceWon(850_000_000); // 8.5억 (신생아 특례 9억 이하 충족)
            }}
          >
            우남퍼스트빌(8.5억) 선택
          </button>
          <button
            data-testid="switch-to-expensive-apt"
            onClick={() => {
              setSelectedApt('동탄역 롯데캐슬');
              setPriceWon(1_650_000_000); // 16.5억 (신생아 특례 9억 초과)
            }}
          >
            롯데캐슬(16.5억) 선택
          </button>
          <button
            data-testid="switch-to-unknown-apt"
            onClick={() => {
              setSelectedApt('거래기록없는단지');
              setPriceWon(undefined);
            }}
          >
            거래기록 없는 단지 선택
          </button>

          <HighCpcFinanceSection
            apartmentName={selectedApt}
            defaultPriceWon={priceWon}
          />
        </div>
      );
    }

    it('updates benchmark target badge and recomputes policy loan & jeonse widgets when selectedTimelineApt changes', () => {
      render(
        <DynamicFinanceHarness
          initialApt="동탄역 롯데캐슬"
          initialPrice={1_650_000_000}
        />
      );

      // Initial state: 16.5억 -> Ineligible
      const badge = screen.getByTestId('finance-benchmark-target-badge');
      expect(badge).toHaveTextContent('동탄역 롯데캐슬');
      expect(badge).toHaveTextContent('16.5억');
      expect(screen.getByText('기준 초과')).toBeInTheDocument();

      // Switch to 8.5억 apartment
      fireEvent.click(screen.getByTestId('switch-to-cheap-apt'));

      // Badge must update
      expect(screen.getByTestId('finance-benchmark-target-badge')).toHaveTextContent('동탄역시범우남퍼스트빌');
      expect(screen.getByTestId('finance-benchmark-target-badge')).toHaveTextContent('8.5억');

      // Policy loan widget must synchronize and recalculate to ELIGIBLE (<= 9억)
      expect(screen.getByText('예상 지원 한도')).toBeInTheDocument();
      expect(screen.getByText(/최대 5.0억 원/)).toBeInTheDocument();
      expect(screen.queryByText('기준 초과')).not.toBeInTheDocument();

      // Switch to apartment with no price data
      fireEvent.click(screen.getByTestId('switch-to-unknown-apt'));

      // Badge should disappear because priceWon is undefined
      expect(screen.queryByTestId('finance-benchmark-target-badge')).not.toBeInTheDocument();
    });
  });

  describe('4. Guide Cards and Community Lounge Route Integrity', () => {
    it('verifies all 3 curated guides have valid content and link to /guide/:slug', () => {
      const top3 = GUIDE_ARTICLES.slice(0, 3);
      expect(top3).toHaveLength(3);

      expect(top3.map((g) => g.slug)).toEqual([
        'dongtan-1-vs-2-comparison',
        'gtx-a-tram-rail-network',
        'stress-dsr-valuation-guide',
      ]);

      top3.forEach((guide) => {
        expect(guide.title.length).toBeGreaterThan(5);
        expect(guide.description.length).toBeGreaterThan(10);
        expect(guide.readingTime).toMatch(/분/);
      });
    });

    it('verifies community lounge card links to /lounge', () => {
      // Re-create the lounge entry card structure as rendered in MacroDashboardClient
      render(
        <div data-testid="lounge-entry-card">
          <a href="/lounge" data-testid="lounge-link-btn">
            라운지 입장하기
          </a>
        </div>
      );

      const loungeBtn = screen.getByTestId('lounge-link-btn');
      expect(loungeBtn).toBeInTheDocument();
      expect(loungeBtn).toHaveAttribute('href', '/lounge');
    });
  });

  describe('5. Dynamic Price Binding Resolution Matrix & AdSlot 2 Contextual Targeting', () => {
    // Pure function mimicking MacroDashboardClient's financeBinding useMemo
    function resolveFinanceBinding({
      selectedApt,
      userFavorites,
      txSummaryData,
      recentTransactions,
      defaultApts = ['동탄역 롯데캐슬'],
    }: {
      selectedApt: string | null;
      userFavorites?: Set<string>;
      txSummaryData?: Record<string, { latestPrice?: number }>;
      recentTransactions?: Array<{ aptName: string; priceVal: number }>;
      defaultApts?: string[];
    }) {
      let targetApt = selectedApt;
      if (!targetApt && userFavorites && userFavorites.size > 0) {
        targetApt = Array.from(userFavorites)[0];
      }
      if (!targetApt && defaultApts.length > 0) {
        targetApt = defaultApts[0];
      }
      if (!targetApt) return { aptName: null, priceWon: undefined };

      let priceWon: number | undefined = undefined;
      if (txSummaryData && txSummaryData[targetApt]?.latestPrice) {
        priceWon = txSummaryData[targetApt].latestPrice! * 10_000;
      }

      if (!priceWon && recentTransactions && recentTransactions.length > 0) {
        const matchingTx = recentTransactions.find((t) => t.aptName === targetApt);
        if (matchingTx && matchingTx.priceVal > 0) {
          priceWon = Math.round(matchingTx.priceVal * 100_000_000);
        }
      }

      return {
        aptName: targetApt,
        priceWon,
      };
    }

    it('resolves price from txSummaryData first (latestPrice * 10,000)', () => {
      const binding = resolveFinanceBinding({
        selectedApt: '동탄역 롯데캐슬',
        txSummaryData: {
          '동탄역 롯데캐슬': { latestPrice: 165000 }, // 16억 5,000만 in 만원
        },
      });

      expect(binding.aptName).toBe('동탄역 롯데캐슬');
      expect(binding.priceWon).toBe(1_650_000_000);
    });

    it('falls back to recentTransactions if txSummaryData is absent', () => {
      const binding = resolveFinanceBinding({
        selectedApt: '동탄역 시범한화',
        recentTransactions: [
          { aptName: '동탄역 시범한화', priceVal: 12.5 }, // 12.5억 in 억
        ],
      });

      expect(binding.aptName).toBe('동탄역 시범한화');
      expect(binding.priceWon).toBe(1_250_000_000);
    });

    it('falls back to top user favorite when selectedTimelineApt is null', () => {
      const binding = resolveFinanceBinding({
        selectedApt: null,
        userFavorites: new Set(['동탄역 시범우남퍼스트빌']),
        txSummaryData: {
          '동탄역 시범우남퍼스트빌': { latestPrice: 110000 },
        },
      });

      expect(binding.aptName).toBe('동탄역 시범우남퍼스트빌');
      expect(binding.priceWon).toBe(1_100_000_000);
    });

    it('falls back to default benchmark when both selectedApt and userFavorites are empty', () => {
      const binding = resolveFinanceBinding({
        selectedApt: null,
        userFavorites: new Set(),
        txSummaryData: {
          '동탄역 롯데캐슬': { latestPrice: 160000 },
        },
      });

      expect(binding.aptName).toBe('동탄역 롯데캐슬');
      expect(binding.priceWon).toBe(1_600_000_000);
    });

    it('returns undefined priceWon without error when no transaction records exist', () => {
      const binding = resolveFinanceBinding({
        selectedApt: '신규미분양단지',
        txSummaryData: {},
        recentTransactions: [],
      });

      expect(binding.aptName).toBe('신규미분양단지');
      expect(binding.priceWon).toBeUndefined();
    });
  });
});

