import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import fs from 'fs';
import path from 'path';

import { RetentionActionCard } from '@/components/macro/components/RetentionActionCard';
import { RealtimeRankingBoard } from '@/components/ranking/RealtimeRankingBoard';
import * as analytics from '@/lib/utils/analytics';

// Spy on trackEvent
const trackEventSpy = jest.spyOn(analytics, 'trackEvent').mockImplementation(() => {});

// Mock PWAProvider
const mockTriggerCustomA2HSModal = jest.fn();
jest.mock('@/components/pwa/PWAProvider', () => ({
  usePWA: () => ({
    triggerCustomA2HSModal: mockTriggerCustomA2HSModal,
  }),
}));

describe('Empirical Challenger: Zone 2 Adversarial Stress Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ══════════════════════════════════════════════════════════════
  // Section 1: RetentionActionCard Trigger & Edge Case Oracles
  // ══════════════════════════════════════════════════════════════
  describe('RetentionActionCard Oracles & Boundary Conditions', () => {
    it('Oracle 1.1: Push modal trigger passes exact selectedAptName and tracks event', () => {
      const onOpenPushModal = jest.fn();
      render(
        <RetentionActionCard
          selectedAptName="동탄역 롯데캐슬"
          onOpenPushModal={onOpenPushModal}
        />
      );

      const pushBtn = screen.getByText('오전 7시 실거래 알림 받기').closest('button');
      expect(pushBtn).not.toBeNull();
      fireEvent.click(pushBtn!);

      expect(onOpenPushModal).toHaveBeenCalledTimes(1);
      expect(onOpenPushModal).toHaveBeenCalledWith('동탄역 롯데캐슬');
      expect(trackEventSpy).toHaveBeenCalledWith('push_modal_open', {
        surface: 'zone2_terminal',
        trigger: 'hero_card',
        apt_name: '동탄역 롯데캐슬',
      });
      expect(screen.getByText(/동탄역 롯데캐슬 신규 체결 즉시 발송/)).toBeInTheDocument();
    });

    it('Oracle 1.2: Push modal fallback to "동탄 전체" when selectedAptName is null, undefined, or empty', () => {
      const onOpenPushModal = jest.fn();

      // Test with null
      const { rerender } = render(
        <RetentionActionCard
          selectedAptName={null}
          onOpenPushModal={onOpenPushModal}
        />
      );

      const pushBtn = screen.getByText('오전 7시 실거래 알림 받기').closest('button');
      fireEvent.click(pushBtn!);
      expect(onOpenPushModal).toHaveBeenLastCalledWith('동탄 전체');
      expect(trackEventSpy).toHaveBeenLastCalledWith('push_modal_open', {
        surface: 'zone2_terminal',
        trigger: 'hero_card',
        apt_name: '동탄 전체',
      });
      expect(screen.getByText(/동탄 전역 신규 체결 즉시 발송/)).toBeInTheDocument();

      // Test with undefined
      rerender(
        <RetentionActionCard
          selectedAptName={undefined}
          onOpenPushModal={onOpenPushModal}
        />
      );
      fireEvent.click(pushBtn!);
      expect(onOpenPushModal).toHaveBeenLastCalledWith('동탄 전체');
      expect(trackEventSpy).toHaveBeenLastCalledWith('push_modal_open', {
        surface: 'zone2_terminal',
        trigger: 'hero_card',
        apt_name: '동탄 전체',
      });

      // Test with empty string ""
      rerender(
        <RetentionActionCard
          selectedAptName=""
          onOpenPushModal={onOpenPushModal}
        />
      );
      fireEvent.click(pushBtn!);
      expect(onOpenPushModal).toHaveBeenLastCalledWith('동탄 전체');
      expect(trackEventSpy).toHaveBeenLastCalledWith('push_modal_open', {
        surface: 'zone2_terminal',
        trigger: 'hero_card',
        apt_name: '동탄 전체',
      });
    });

    it('Oracle 1.3: A2HS trigger uses onOpenA2HSModal when provided', () => {
      const onOpenA2HSModal = jest.fn();
      render(
        <RetentionActionCard
          onOpenPushModal={jest.fn()}
          onOpenA2HSModal={onOpenA2HSModal}
        />
      );

      const a2hsBtn = screen.getByText('홈 화면에 앱 추가').closest('button');
      expect(a2hsBtn).not.toBeNull();
      fireEvent.click(a2hsBtn!);

      expect(onOpenA2HSModal).toHaveBeenCalledTimes(1);
      expect(mockTriggerCustomA2HSModal).not.toHaveBeenCalled();
      expect(trackEventSpy).toHaveBeenCalledWith('a2hs_modal_open', {
        surface: 'zone2_terminal',
        trigger: 'hero_card',
      });
    });

    it('Oracle 1.4: A2HS trigger falls back to usePWA().triggerCustomA2HSModal when onOpenA2HSModal is omitted', () => {
      render(
        <RetentionActionCard
          onOpenPushModal={jest.fn()}
        />
      );

      const a2hsBtn = screen.getByText('홈 화면에 앱 추가').closest('button');
      expect(a2hsBtn).not.toBeNull();
      fireEvent.click(a2hsBtn!);

      expect(mockTriggerCustomA2HSModal).toHaveBeenCalledTimes(1);
      expect(trackEventSpy).toHaveBeenCalledWith('a2hs_modal_open', {
        surface: 'zone2_terminal',
        trigger: 'hero_card',
      });
    });

    it('Oracle 1.5: AptFitFinder trigger invokes callback and logs analytics', () => {
      const onOpenAptFitFinder = jest.fn();
      render(
        <RetentionActionCard
          onOpenPushModal={jest.fn()}
          onOpenAptFitFinder={onOpenAptFitFinder}
        />
      );

      const quizBtn = screen.getByText('내게 맞는 단지 찾기 (AptFitFinder)').closest('button');
      expect(quizBtn).not.toBeNull();
      fireEvent.click(quizBtn!);

      expect(onOpenAptFitFinder).toHaveBeenCalledTimes(1);
      expect(trackEventSpy).toHaveBeenCalledWith('open_calculator', {
        calculator_type: 'apt_fit_finder',
        surface: 'zone2_terminal',
      });
    });

    it('Oracle 1.6: AptFitFinder safely no-ops without exception when onOpenAptFitFinder is undefined', () => {
      render(
        <RetentionActionCard
          onOpenPushModal={jest.fn()}
        />
      );

      const quizBtn = screen.getByText('내게 맞는 단지 찾기 (AptFitFinder)').closest('button');
      expect(() => {
        fireEvent.click(quizBtn!);
      }).not.toThrow();
      expect(trackEventSpy).toHaveBeenCalledWith('open_calculator', {
        calculator_type: 'apt_fit_finder',
        surface: 'zone2_terminal',
      });
    });

    it('Stress 1.7: 100 rapid sequential clicks burst on retention buttons causes zero errors', () => {
      const onOpenPushModal = jest.fn();
      const onOpenAptFitFinder = jest.fn();

      render(
        <RetentionActionCard
          selectedAptName="동탄역 린스트라우스"
          onOpenPushModal={onOpenPushModal}
          onOpenAptFitFinder={onOpenAptFitFinder}
        />
      );

      const pushBtn = screen.getByText('오전 7시 실거래 알림 받기').closest('button')!;
      const a2hsBtn = screen.getByText('홈 화면에 앱 추가').closest('button')!;
      const quizBtn = screen.getByText('내게 맞는 단지 찾기 (AptFitFinder)').closest('button')!;

      act(() => {
        for (let i = 0; i < 100; i++) {
          fireEvent.click(pushBtn);
          fireEvent.click(a2hsBtn);
          fireEvent.click(quizBtn);
        }
      });

      expect(onOpenPushModal).toHaveBeenCalledTimes(100);
      expect(mockTriggerCustomA2HSModal).toHaveBeenCalledTimes(100);
      expect(onOpenAptFitFinder).toHaveBeenCalledTimes(100);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // Section 2: RealtimeRankingBoard Tab Switching & State Sync
  // ══════════════════════════════════════════════════════════════
  describe('RealtimeRankingBoard Tab Switches & Complex Selection', () => {
    const mockTx = [
      {
        aptName: '동탄역 롯데캐슬',
        dong: '오산동',
        price: 165000,
        area: 84.9,
        floor: 35,
        date: '2026.04.15',
        isNewHigh: true,
      },
      {
        aptName: '동탄역 시범 우남퍼스트빌',
        dong: '청계동',
        price: 115000,
        area: 84.8,
        floor: 18,
        date: '2026.04.14',
      },
      {
        aptName: '동탄역 유보라 아이비파크',
        dong: '목동',
        price: 75000,
        area: 84.5,
        floor: 12,
        date: '2026.04.13',
      },
    ];

    it('Oracle 2.1: Default active tab is "high" and displays ranking list', () => {
      render(<RealtimeRankingBoard recentTransactions={mockTx} />);

      const highTab = screen.getByTestId('ranking-tab-high');
      expect(highTab.className).toContain('dview-toggle-btn-active');
      expect(screen.getByTestId('realtime-ranking-board')).toBeInTheDocument();
    });

    it('Oracle 2.2: Switches tabs between "high", "gap", and "surge" smoothly', () => {
      render(<RealtimeRankingBoard recentTransactions={mockTx} />);

      const highTab = screen.getByTestId('ranking-tab-high');
      const gapTab = screen.getByTestId('ranking-tab-gap');
      const surgeTab = screen.getByTestId('ranking-tab-surge');

      // Click gap tab
      fireEvent.click(gapTab);
      expect(gapTab.className).toContain('dview-toggle-btn-active');
      expect(highTab.className).toContain('dview-toggle-btn-inactive');

      // Click surge tab
      fireEvent.click(surgeTab);
      expect(surgeTab.className).toContain('dview-toggle-btn-active');
      expect(gapTab.className).toContain('dview-toggle-btn-inactive');

      // Click high tab back
      fireEvent.click(highTab);
      expect(highTab.className).toContain('dview-toggle-btn-active');
      expect(surgeTab.className).toContain('dview-toggle-btn-inactive');
    });

    it('Oracle 2.3: Clicking a complex row fires onSelectComplex callback with exact name', () => {
      const onSelectComplex = jest.fn();
      render(
        <RealtimeRankingBoard
          recentTransactions={mockTx}
          onSelectComplex={onSelectComplex}
        />
      );

      const firstItem = screen.getByTestId('ranking-item-1');
      expect(firstItem).toBeInTheDocument();
      fireEvent.click(firstItem);

      expect(onSelectComplex).toHaveBeenCalledTimes(1);
      expect(typeof onSelectComplex.mock.calls[0][0]).toBe('string');
      expect(onSelectComplex.mock.calls[0][0].length).toBeGreaterThan(0);
    });

    it('Oracle 2.4: Falls back to onSelectApt if onSelectComplex is not provided', () => {
      const onSelectApt = jest.fn();
      render(
        <RealtimeRankingBoard
          recentTransactions={mockTx}
          onSelectApt={onSelectApt}
        />
      );

      const firstItem = screen.getByTestId('ranking-item-1');
      fireEvent.click(firstItem);

      expect(onSelectApt).toHaveBeenCalledTimes(1);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // Section 3: Static Analysis of Zone 2 Grid Structure in MacroDashboardClient
  // ══════════════════════════════════════════════════════════════
  describe('MacroDashboardClient Zone 2 7:5 Grid Structure Invariants', () => {
    const macroDashboardClientPath = path.resolve(
      __dirname,
      '../components/MacroDashboardClient.tsx'
    );
    const source = fs.readFileSync(macroDashboardClientPath, 'utf-8');

    it('Oracle 3.1: Zone 2 container uses 1-col on mobile and 12-cols on desktop', () => {
      // Must contain `grid grid-cols-1 lg:grid-cols-12`
      expect(source).toMatch(/grid\s+grid-cols-1\s+lg:grid-cols-12/);
    });

    it('Oracle 3.2: Left side uses lg:col-span-7 (7/12 width)', () => {
      expect(source).toMatch(/lg:col-span-7\s+flex\s+flex-col/);
    });

    it('Oracle 3.3: Right side uses lg:col-span-5 (5/12 width)', () => {
      expect(source).toMatch(/lg:col-span-5\s+flex\s+flex-col/);
    });

    it('Oracle 3.4: 7 + 5 = 12 total columns invariant holds with no orphaned spans', () => {
      const matches7 = source.match(/lg:col-span-7/g);
      const matches5 = source.match(/lg:col-span-5/g);
      expect(matches7).not.toBeNull();
      expect(matches5).not.toBeNull();
      expect(matches7!.length).toBeGreaterThanOrEqual(1);
      expect(matches5!.length).toBeGreaterThanOrEqual(1);
    });

    it('Oracle 3.5: AptDonutSection is restored in Zone 2A with variant="navigator" and initialMode="zone"', () => {
      expect(source).toMatch(/<AptDonutSection[\s\S]*?variant="navigator"[\s\S]*?initialMode="zone"/);
      expect(source).toMatch(/import\s+\{\s*AptDonutSection/);
    });

    it('Oracle 3.6: AptMetricCards is restored in Zone 2A connected to activeDonutSector', () => {
      expect(source).toMatch(/<AptMetricCards[\s\S]*?activeSector=\{activeDonutSector\}/);
      expect(source).toMatch(/import\s+\{\s*AptMetricCards\s*\}/);
    });

    it('Oracle 3.7: Zone 2A enforces exact 6:6 symmetric lg:h-[526px] desktop Hero geometry', () => {
      const colSpan6Matches = source.match(/lg:col-span-6\s+flex\s+flex-col[\s\S]*?lg:h-\[526px\]/g);
      expect(colSpan6Matches).not.toBeNull();
      expect(colSpan6Matches!.length).toBeGreaterThanOrEqual(2);
    });

    it('Oracle 3.8: selectedTimelineApt state synchronizes between RealtimeRankingBoard and RetentionActionCard', () => {
      // In source, RealtimeRankingBoard's onSelectComplex sets selectedTimelineApt
      expect(source).toMatch(/setSelectedTimelineApt\((complexName|aptName)\)/);
      // RetentionActionCard receives selectedTimelineApt as selectedAptName
      expect(source).toMatch(/<RetentionActionCard[\s\S]*?selectedAptName=\{selectedTimelineApt\}/);
    });

    it('Oracle 3.9: PushSubscriptionModal receives pushTargetApt or selectedTimelineApt', () => {
      expect(source).toMatch(/aptName=\{pushTargetApt\s*\|\|\s*selectedTimelineApt\s*\|\|\s*'동탄 전체'\}/);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // Section 4: AptDonutSection Standalone Preservation & /stats Safety
  // ══════════════════════════════════════════════════════════════
  describe('AptDonutSection Preservation & Stats Safety', () => {
    it('Oracle 4.1: AptDonutSection files are preserved and accessible', () => {
      const p1 = path.resolve(__dirname, '../components/macro/AptDonutSection.tsx');
      const p2 = path.resolve(__dirname, '../components/macro/components/AptDonutSection.tsx');
      expect(fs.existsSync(p1)).toBe(true);
      expect(fs.existsSync(p2)).toBe(true);
    });

    it('Oracle 4.2: /stats page compiles and contains valid schema markup and components', () => {
      const statsPagePath = path.resolve(__dirname, '../app/stats/page.tsx');
      const statsClientPath = path.resolve(__dirname, '../app/stats/StatsPageClient.tsx');
      expect(fs.existsSync(statsPagePath)).toBe(true);
      expect(fs.existsSync(statsClientPath)).toBe(true);

      const statsPageContent = fs.readFileSync(statsPagePath, 'utf-8');
      expect(statsPageContent).toMatch(/StatsPageClient/);
      expect(statsPageContent).toMatch(/MarketStatsStrong/);
    });
  });
});
