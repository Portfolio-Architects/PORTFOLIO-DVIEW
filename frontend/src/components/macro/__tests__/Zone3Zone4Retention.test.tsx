import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MacroTimelineView, type TimelineGroup } from '../components/MacroTimelineView';
import { HighCpcFinanceSection } from '@/components/finance/HighCpcFinanceSection';
import { PolicyLoanQuickWidget } from '@/components/finance/PolicyLoanQuickWidget';
import { JeonseGuaranteeQuickPreview } from '@/components/finance/JeonseGuaranteeQuickPreview';
import { TrafficNoticeBoard } from '../TrafficNoticeBoard';
import { ApartmentModalHeader } from '@/components/apartment/ApartmentModalHeader';
import { GUIDE_ARTICLES } from '@/lib/data/guides';

// Sample mock data for testing
const mockTimelineGroups: TimelineGroup[] = [
  {
    date: '2026-10-30',
    dateLabel: '10.30 (금)',
    highestPriceApt: '동탄역 롯데캐슬',
    items: [
      {
        aptName: '동탄역 롯데캐슬',
        dong: '오산동',
        priceVal: 16.5,
        priceEok: '16억 5,000만',
        area: 84.9,
        areaPyeong: 34,
        floor: 25,
        type: 'high',
        dealType: '매매',
        contractDate: '20261030',
        delta: 0.5,
        deltaPercent: 3.1,
      },
      {
        aptName: '동탄역시범한화꿈에그린프레스티지',
        dong: '청계동',
        priceVal: 12.0,
        priceEok: '12억',
        area: 84.5,
        areaPyeong: 34,
        floor: 18,
        type: 'normal',
        dealType: '매매',
        contractDate: '20261030',
        delta: 0,
        deltaPercent: 0,
      },
    ],
  },
  {
    date: '2026-10-29',
    dateLabel: '10.29 (목)',
    items: [
      {
        aptName: '동탄역시범우남퍼스트빌',
        dong: '청계동',
        priceVal: 11.2,
        priceEok: '11억 2,000만',
        area: 84.8,
        areaPyeong: 34,
        floor: 12,
        type: 'normal',
        dealType: '매매',
        contractDate: '20261029',
        delta: -0.2,
        deltaPercent: -1.8,
      },
    ],
  },
];

describe('Milestone 2: Zone 3 & Zone 4 Retention-First Layout Overhaul Suite', () => {
  describe('1. Zone 3: MacroTimelineView 4-Segment Tabs & Segment Filtering', () => {
    it('renders all 4 segment tabs and stats link button at the top of the timeline', () => {
      render(
        <MacroTimelineView
          timelineGroups={mockTimelineGroups}
          userFavorites={new Set(['동탄역 롯데캐슬'])}
          pyeongRankings={[]}
        />
      );

      const segmentTabs = screen.getByTestId('timeline-segment-tabs');
      expect(segmentTabs).toBeInTheDocument();

      expect(screen.getByTestId('timeline-segment-all')).toBeInTheDocument();
      expect(screen.getByTestId('timeline-segment-favorites')).toBeInTheDocument();
      expect(screen.getByTestId('timeline-segment-new-high')).toBeInTheDocument();
      expect(screen.getByTestId('timeline-segment-ranking')).toBeInTheDocument();
    });

    it('filters transactions when switching to favorites segment and renders matching items', () => {
      render(
        <MacroTimelineView
          timelineGroups={mockTimelineGroups}
          userFavorites={new Set(['동탄역 롯데캐슬'])}
        />
      );

      const favTab = screen.getByTestId('timeline-segment-favorites');
      fireEvent.click(favTab);

      // Only 동탄역 롯데캐슬 should be visible, others filtered out
      expect(screen.getByTestId('timeline-card-동탄역 롯데캐슬')).toBeInTheDocument();
      expect(screen.queryByTestId('timeline-card-동탄역시범한화꿈에그린프레스티지')).not.toBeInTheDocument();
      expect(screen.queryByTestId('timeline-card-동탄역시범우남퍼스트빌')).not.toBeInTheDocument();
    });

    it('renders helpful empty prompt when favorites segment is selected with 0 favorites', () => {
      render(
        <MacroTimelineView
          timelineGroups={mockTimelineGroups}
          userFavorites={new Set()}
        />
      );

      const favTab = screen.getByTestId('timeline-segment-favorites');
      fireEvent.click(favTab);

      const emptyPrompt = screen.getByTestId('timeline-favorites-empty-prompt');
      expect(emptyPrompt).toBeInTheDocument();
      expect(screen.getByText('등록된 관심 단지가 없습니다')).toBeInTheDocument();

      const showAllBtn = screen.getByTestId('timeline-show-all-segment-btn');
      expect(showAllBtn).toBeInTheDocument();

      // Clicking show-all resets active segment to 'all'
      fireEvent.click(showAllBtn);
      expect(screen.getByTestId('timeline-card-동탄역 롯데캐슬')).toBeInTheDocument();
    });

    it('filters transactions to new high only when new_high segment is selected', () => {
      render(
        <MacroTimelineView
          timelineGroups={mockTimelineGroups}
        />
      );

      const newHighTab = screen.getByTestId('timeline-segment-new-high');
      fireEvent.click(newHighTab);

      // Only 동탄역 롯데캐슬 has type === 'high'
      expect(screen.getByTestId('timeline-card-동탄역 롯데캐슬')).toBeInTheDocument();
      expect(screen.queryByTestId('timeline-card-동탄역시범한화꿈에그린프레스티지')).not.toBeInTheDocument();
      expect(screen.queryByTestId('timeline-card-동탄역시범우남퍼스트빌')).not.toBeInTheDocument();
    });
  });

  describe('2. Zone 3: Inline 1-Click Star Toggle and Event Isolation', () => {
    it('renders star toggle button on cards and triggers onToggleFavorite with stopPropagation', () => {
      const onToggleFavoriteMock = jest.fn();
      const onCardClickMock = jest.fn();

      render(
        <MacroTimelineView
          timelineGroups={mockTimelineGroups}
          userFavorites={new Set(['동탄역 롯데캐슬'])}
          onToggleFavorite={onToggleFavoriteMock}
          onCardClick={onCardClickMock}
        />
      );

      const starBtn = screen.getByTestId('timeline-fav-toggle-동탄역 롯데캐슬');
      expect(starBtn).toBeInTheDocument();
      expect(starBtn).toHaveAttribute('aria-label', '동탄역 롯데캐슬 찜 해제');

      // Click star toggle
      fireEvent.click(starBtn);
      expect(onToggleFavoriteMock).toHaveBeenCalledWith('동탄역 롯데캐슬');
      // Verify stopPropagation: onCardClick should NOT have been called
      expect(onCardClickMock).not.toHaveBeenCalled();
    });

    it('renders star toggle button on list rows and triggers onToggleFavorite with stopPropagation', () => {
      const onToggleFavoriteMock = jest.fn();
      const onCardClickMock = jest.fn();

      render(
        <MacroTimelineView
          timelineGroups={mockTimelineGroups}
          viewMode="list"
          userFavorites={new Set()}
          onToggleFavorite={onToggleFavoriteMock}
          onCardClick={onCardClickMock}
        />
      );

      const starBtn = screen.getByTestId('timeline-fav-toggle-동탄역 롯데캐슬');
      expect(starBtn).toBeInTheDocument();
      expect(starBtn).toHaveAttribute('aria-label', '동탄역 롯데캐슬 찜하기');

      fireEvent.click(starBtn);
      expect(onToggleFavoriteMock).toHaveBeenCalledWith('동탄역 롯데캐슬');
      expect(onCardClickMock).not.toHaveBeenCalled();
    });
  });

  describe('3. Zone 4: TrafficNoticeBoard & Community Lounge Card', () => {
    it('renders real traffic notice items for rail strategy and tram', () => {
      const railNotices = [
        {
          id: 'rail-1',
          title: '동탄 인덕원선 복선전철 제1공구 실시계획 고시',
          url: 'https://example.com/rail-1',
          dept: '철도전략과',
          date: '2026-10-28',
          isDongtan: true,
          source: 'rail' as const,
        },
      ];
      const tramNotices = [
        {
          id: 'tram-1',
          title: '동탄 도시철도(트램) 건설사업 기본계획 변경안 공람',
          url: 'https://example.com/tram-1',
          dept: '트램건설추진단',
          date: '2026-10-25',
          isDongtan: true,
          source: 'rail' as const,
        },
      ];

      render(
        <TrafficNoticeBoard
          railStrategyNotices={railNotices}
          tramNotices={tramNotices}
        />
      );

      expect(screen.getByText('동탄 철도 교통 게시판')).toBeInTheDocument();
      expect(screen.getByText('동탄 인덕원선 복선전철 제1공구 실시계획 고시')).toBeInTheDocument();
      expect(screen.getByText('동탄 도시철도(트램) 건설사업 기본계획 변경안 공람')).toBeInTheDocument();
    });
  });

  describe('4. Zone 4: Curated Comparison Guides Integrity', () => {
    it('verifies top 3 curated comparison guides are available in GUIDE_ARTICLES', () => {
      const top3 = GUIDE_ARTICLES.slice(0, 3);
      expect(top3).toHaveLength(3);

      expect(top3[0].slug).toBe('dongtan-1-vs-2-comparison');
      expect(top3[1].slug).toBe('gtx-a-tram-rail-network');
      expect(top3[2].slug).toBe('stress-dsr-valuation-guide');

      top3.forEach((guide) => {
        expect(guide.title).toBeTruthy();
        expect(guide.description).toBeTruthy();
        expect(guide.category).toBeTruthy();
        expect(guide.readingTime).toBeTruthy();
      });
    });
  });

  describe('5. Zone 4: HighCpcFinanceSection Price Auto-Binding & Policy Loan Calculation', () => {
    it('renders benchmark target badge with apartment name and real price', () => {
      render(
        <HighCpcFinanceSection
          apartmentName="동탄역 롯데캐슬"
          defaultPriceWon={1_600_000_000}
        />
      );

      const badge = screen.getByTestId('finance-benchmark-target-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('동탄역 롯데캐슬');
      expect(badge).toHaveTextContent('16.0억');
    });

    it('auto-binds initial price into PolicyLoanQuickWidget and re-computes loan eligibility', () => {
      render(
        <PolicyLoanQuickWidget
          apartmentName="동탄역 롯데캐슬"
          initialHomePriceWon={800_000_000}
        />
      );

      expect(screen.getByTestId('policy-loan-quick-widget')).toBeInTheDocument();
      // 8억 is eligible under Newborn loan (up to 9억)
      expect(screen.getByText('예상 지원 한도')).toBeInTheDocument();
      expect(screen.getByText(/최대 5.0억 원/)).toBeInTheDocument();
    });

    it('auto-binds initial price into JeonseGuaranteeQuickPreview and evaluates HUG safety', () => {
      render(
        <JeonseGuaranteeQuickPreview
          apartmentName="동탄역 롯데캐슬"
          initialEstimatedPriceWon={800_000_000}
        />
      );

      expect(screen.getByTestId('jeonse-guarantee-quick-preview')).toBeInTheDocument();
      // Price 8억 -> HUG 126% limit evaluated
      expect(screen.getByText(/안전 \(보증가입\)/)).toBeInTheDocument();
      expect(screen.getByText(/HUG 반환보증 가입이 가능하며/)).toBeInTheDocument();
    });
  });

  describe('6. Direct Favorites Search-and-Add & Apartment Detail Watchlist Integration', () => {
    beforeEach(() => {
      localStorage.removeItem('dview_guest_favorites');
    });

    it('lets user search and add a favorite directly inside the empty 내 관심단지 tab and manage saved chips', () => {
      render(<MacroTimelineView timelineGroups={mockTimelineGroups} />);

      fireEvent.click(screen.getByTestId('timeline-segment-favorites'));
      expect(screen.getByTestId('timeline-favorites-empty-prompt')).toBeInTheDocument();

      // Search inside empty favorites tab and click quick-add
      const quickInput = screen.getByTestId('favorites-quick-add-input');
      fireEvent.change(quickInput, { target: { value: '롯데캐슬' } });

      const addBtn = screen.getByTestId('favorites-quick-add-btn-동탄역 롯데캐슬');
      fireEvent.click(addBtn);

      // Watchlist chip bar renders and filters transactions to 동탄역 롯데캐슬
      expect(screen.getByTestId('timeline-favorites-watchlist-bar')).toBeInTheDocument();
      expect(screen.getByTestId('timeline-card-동탄역 롯데캐슬')).toBeInTheDocument();
      expect(
        screen.queryByTestId('timeline-card-동탄역시범우남퍼스트빌')
      ).not.toBeInTheDocument();

      // Remove via chip X button restores empty prompt
      fireEvent.click(screen.getByTestId('favorites-chip-remove-동탄역 롯데캐슬'));
      expect(screen.getByTestId('timeline-favorites-empty-prompt')).toBeInTheDocument();
    });

    it('matches favorite names containing spaces against raw MOLIT transaction names without spaces', () => {
      render(
        <MacroTimelineView
          timelineGroups={mockTimelineGroups}
          userFavorites={new Set(['동탄역 시범 우남퍼스트빌'])}
        />
      );

      fireEvent.click(screen.getByTestId('timeline-segment-favorites'));
      expect(screen.getByTestId('timeline-card-동탄역시범우남퍼스트빌')).toBeInTheDocument();
      expect(screen.queryByTestId('timeline-card-동탄역 롯데캐슬')).not.toBeInTheDocument();
    });

    it('saves and unsaves favorite apartment directly from ApartmentModalHeader', () => {
      render(
        <ApartmentModalHeader
          report={{ apartmentName: '동탄역 롯데캐슬', dong: '오산동', sections: {} } as any}
          displayAptName="동탄역 롯데캐슬"
          handleNativeShare={jest.fn()}
          handleCopySummary={jest.fn()}
          handleDownloadShareCard={jest.fn()}
          setIsPushModalOpen={jest.fn()}
          copiedStatus={null}
          isToolDropdownOpen={false}
          setIsToolDropdownOpen={jest.fn()}
          toolDropdownRef={{ current: null }}
          preloadCalculators={jest.fn()}
        />
      );

      const detailFavBtn = screen.getByTestId('apt-detail-favorite-btn');
      expect(detailFavBtn).toHaveTextContent('관심단지 저장');

      fireEvent.click(detailFavBtn);
      expect(detailFavBtn).toHaveTextContent('관심단지 저장됨');
      expect(JSON.parse(localStorage.getItem('dview_guest_favorites') || '[]')).toContain(
        '동탄역 롯데캐슬'
      );
    });
  });
});
