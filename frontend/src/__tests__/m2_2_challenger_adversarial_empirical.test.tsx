/**
 * @file m2_2_challenger_adversarial_empirical.test.tsx
 * @description Adversarial Empirical Challenger Verification Suite for Milestone 2:
 * 1. Zero-CLS Stress Test (fixed h-[26px] badge footprint, h-[144px] PageHeroHeader invariant)
 * 2. Timeline Badge and 1d Filter Stress Test ('1d' tab, [오늘 등록] inline badge, sticky date pulse badge)
 * 3. Strict Real Data Only Invariant (registeredDate vs contractDate distinction, truthful 0-count display)
 * 4. Ad Money Design System & Typography Guardrails (Zero emojis, Value Emerald tokens, tabular-nums)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TodayUpdatePillBadge } from '@/components/common/TodayUpdatePillBadge';
import { MacroHeader } from '@/components/macro/components/MacroHeader';
import { TimelineFilterControls } from '@/components/macro/components/MacroControls';
import { MacroTimelineView, TimelineGroup } from '@/components/macro/components/MacroTimelineView';
import {
  evaluateTodayUpdateMetrics,
  getTodayYmdKST,
  formatDateLabelKST,
  isRegisteredToday,
} from '@/lib/todayUpdateEvaluator';

// Mock react-intersection-observer for MacroTimelineView infinite scroll
jest.mock('react-intersection-observer', () => ({
  useInView: () => ({
    ref: jest.fn(),
    inView: false,
  }),
}));

describe('Challenger Milestone 2: Adversarial Stress Test Suite', () => {
  const TODAY_KST = getTodayYmdKST();

  describe('Suite 1: Zero-CLS Bounding Box & Layout Shift Invariant ($CLS < 0.001$)', () => {
    it('1.1 TodayUpdatePillBadge skeleton strictly enforces h-[26px] shrink-0 footprint', () => {
      render(<TodayUpdatePillBadge />);
      const skeleton = screen.getByTestId('today-update-pill-badge-skeleton');

      expect(skeleton).toBeInTheDocument();
      expect(skeleton.className).toContain('h-[26px]');
      expect(skeleton.className).toContain('shrink-0');
      expect(skeleton.className).toContain('min-w-[130px]');
      expect(skeleton.className).toContain('animate-pulse');
    });

    it('1.2 Active Value Emerald badge strictly enforces h-[26px] shrink-0 footprint', () => {
      render(
        <TodayUpdatePillBadge
          metrics={{
            todayYmd: TODAY_KST,
            latestRegisteredDate: TODAY_KST,
            isTodayUpdated: true,
            todayRegisteredCount: 7,
            todayNewHighCount: 1,
            latestRegisteredDateLabel: '11월 11일',
            lastSyncTimeLabel: '07:00 KST',
          }}
        />
      );

      const activeBadge = screen.getByTestId('today-update-pill-badge');
      expect(activeBadge).toBeInTheDocument();
      expect(activeBadge.className).toContain('h-[26px]');
      expect(activeBadge.className).toContain('shrink-0');
      expect(activeBadge.className).toContain('tabular-nums');
      expect(activeBadge.className).toContain('bg-emerald-50');
      expect(activeBadge.className).toContain('text-emerald-700');
    });

    it('1.3 Truthful empty state strictly enforces h-[26px] shrink-0 footprint (Delta H = 0px)', () => {
      render(
        <TodayUpdatePillBadge
          metrics={{
            todayYmd: TODAY_KST,
            latestRegisteredDate: '20261110',
            isTodayUpdated: false,
            todayRegisteredCount: 0,
            todayNewHighCount: 0,
            latestRegisteredDateLabel: '11월 10일',
            lastSyncTimeLabel: '07:00 KST',
          }}
        />
      );

      const emptyBadge = screen.getByTestId('today-update-pill-badge-empty');
      expect(emptyBadge).toBeInTheDocument();
      expect(emptyBadge.className).toContain('h-[26px]');
      expect(emptyBadge.className).toContain('shrink-0');
      expect(emptyBadge.className).toContain('tabular-nums');
      expect(emptyBadge.className).toContain('bg-slate-100');
      expect(emptyBadge.className).toContain('text-slate-600');
    });

    it('1.4 MacroHeader preserves PageHeroHeader h-[144px] and rightContent h-[26px] hidden sm:flex', () => {
      const { container } = render(<MacroHeader macroTrendJsonLd={null} />);

      // Verify the hero header container has h-[144px] shrink-0
      const heroOuter = container.querySelector('.h-\\[144px\\]');
      expect(heroOuter).not.toBeNull();
      expect(heroOuter?.className).toContain('shrink-0');

      // Verify rightContent container hides on mobile to prevent vertical stacking and CLS
      const rightContentWrapper = container.querySelector('.hidden.sm\\:flex.items-center.gap-2.h-\\[26px\\]');
      expect(rightContentWrapper).not.toBeNull();
    });
  });

  describe('Suite 2: Timeline Badge and 1d Period Filter Empirical Stress Test', () => {
    it('2.1 TimelineFilterControls renders "오늘" tab and invokes callback when clicked', () => {
      const mockSetPeriod = jest.fn();
      render(
        <TimelineFilterControls
          periodFilter="90d"
          setPeriodFilter={mockSetPeriod}
          availableDongs={[]}
          availableApts={[]}
        />
      );

      const todayTab = screen.getByTestId('period-filter-1d');
      expect(todayTab).toBeInTheDocument();
      expect(todayTab).toHaveTextContent('오늘');

      fireEvent.click(todayTab);
      expect(mockSetPeriod).toHaveBeenCalledTimes(1);
      expect(mockSetPeriod).toHaveBeenCalledWith('1d');
    });

    it('2.2 MacroTimelineView renders "오늘" tab and marks it active when periodFilter="1d"', () => {
      const mockSetPeriod = jest.fn();
      render(
        <MacroTimelineView
          timelineGroups={[]}
          periodFilter="1d"
          setPeriodFilter={mockSetPeriod}
          isInlineExpanded={true}
        />
      );

      const todayTab = screen.getByTestId('timeline-period-tab-1d');
      expect(todayTab).toBeInTheDocument();
      expect(todayTab).toHaveTextContent('오늘');
      // Active styling
      expect(todayTab.className).toContain('bg-surface');

      fireEvent.click(todayTab);
      expect(mockSetPeriod).toHaveBeenCalledWith('1d');
    });

    it('2.3 MacroTimelineView renders today sticky group badge [오늘 신규 반영] for today group', () => {
      const mockGroups: TimelineGroup[] = [
        {
          dateStr: TODAY_KST,
          dateKey: TODAY_KST,
          timestamp: Date.now(),
          items: [
            {
              aptName: '동탄역 롯데캐슬',
              dong: '오산동',
              priceEok: '16.5억',
              priceVal: 16.5,
              area: 84.9,
              areaPyeong: 34,
              floor: 20,
              type: 'normal',
              isNewHigh: false,
              registeredDate: TODAY_KST,
              isTodayRegistered: true,
            },
          ],
        },
        {
          dateStr: '20261109',
          dateKey: '20261109',
          timestamp: Date.now() - 2 * 86400000,
          items: [
            {
              aptName: '동탄역시범우남퍼스트빌',
              dong: '청계동',
              priceEok: '11.0억',
              priceVal: 11.0,
              area: 84.9,
              areaPyeong: 34,
              floor: 15,
              type: 'normal',
              isNewHigh: false,
              registeredDate: '20261109',
              isTodayRegistered: false,
            },
          ],
        },
      ];

      render(
        <MacroTimelineView
          timelineGroups={mockGroups}
          periodFilter="1d"
          viewMode="card"
        />
      );

      // Verify today sticky header badge
      const todayGroupBadge = screen.getByTestId('timeline-group-today-badge');
      expect(todayGroupBadge).toBeInTheDocument();
      expect(todayGroupBadge).toHaveTextContent('오늘 신규 반영');

      // Verify inline [오늘 등록] badge on card
      const itemBadges = screen.getAllByTestId('timeline-today-registered-badge');
      expect(itemBadges).toHaveLength(1);
      expect(itemBadges[0]).toHaveTextContent('오늘 등록');
    });

    it('2.4 Inline [오늘 등록] and [신고가] badges coexist without layout breakdown', () => {
      const mockGroups: TimelineGroup[] = [
        {
          dateStr: TODAY_KST,
          dateKey: TODAY_KST,
          timestamp: Date.now(),
          items: [
            {
              aptName: '동탄역 롯데캐슬',
              dong: '오산동',
              priceEok: '22.0억',
              priceVal: 22.0,
              area: 102.5,
              areaPyeong: 41,
              floor: 35,
              type: 'high',
              isNewHigh: true,
              registeredDate: TODAY_KST,
              isTodayRegistered: true,
            },
          ],
        },
      ];

      render(
        <MacroTimelineView
          timelineGroups={mockGroups}
          periodFilter="1d"
          viewMode="card"
        />
      );

      const todayBadge = screen.getByTestId('timeline-today-registered-badge');
      expect(todayBadge).toBeInTheDocument();
      expect(todayBadge).toHaveTextContent('오늘 등록');

      // In card view, 신고가 badge is present
      expect(screen.getByText('신고가')).toBeInTheDocument();
    });
  });

  describe('Suite 3: Strict Real Data Only Invariant & Edge Case Mining', () => {
    it('3.1 Distinguishes registeredDate (MOLIT RTMS disclosure) from contractDate', () => {
      // Contract happened today, but was NOT registered today
      const delayedRegistrationTx = {
        registeredDate: '20261110',
        contractDate: TODAY_KST,
        isNewHigh: false,
      };

      const metrics = evaluateTodayUpdateMetrics(
        [delayedRegistrationTx],
        { latestRegisteredDate: '20261110' },
        new Date()
      );

      expect(metrics.isTodayUpdated).toBe(false);
      expect(metrics.todayRegisteredCount).toBe(0);
      expect(metrics.todayTransactions?.length).toBe(0);
    });

    it('3.2 Accurately evaluates transactions registered today even if contractDate was 20 days ago', () => {
      const realWorldTx = {
        registeredDate: TODAY_KST,
        contractDate: '20261022', // Contract 20 days ago, disclosed today
        isNewHigh: true,
      };

      const metrics = evaluateTodayUpdateMetrics(
        [realWorldTx],
        { latestRegisteredDate: TODAY_KST },
        new Date()
      );

      expect(metrics.isTodayUpdated).toBe(true);
      expect(metrics.todayRegisteredCount).toBe(1);
      expect(metrics.todayNewHighCount).toBe(1);
      expect(metrics.todayTransactions?.length).toBe(1);
    });

    it('3.3 Robustly handles null, undefined, malformed strings, and empty arrays', () => {
      expect(isRegisteredToday(null)).toBe(false);
      expect(isRegisteredToday(undefined)).toBe(false);
      expect(isRegisteredToday('')).toBe(false);
      expect(isRegisteredToday('invalid-date')).toBe(false);
      expect(isRegisteredToday('2026-11-11', '20261111')).toBe(true);

      expect(formatDateLabelKST(null)).toBe('');
      expect(formatDateLabelKST(undefined)).toBe('');
      expect(formatDateLabelKST('bad')).toBe('');
      expect(formatDateLabelKST('20261111')).toBe('11월 11일');

      // Malformed transactions
      const malformedTxs = [
        null as unknown as { registeredDate?: string },
        undefined as unknown as { registeredDate?: string },
        { registeredDate: undefined },
        { registeredDate: '' },
        { registeredDate: '999999' },
      ];

      const metrics = evaluateTodayUpdateMetrics(
        malformedTxs,
        null,
        new Date()
      );

      expect(metrics.todayRegisteredCount).toBe(0);
      expect(metrics.isTodayUpdated).toBe(false);
    });

    it('3.4 KST timezone boundary tests (+9h shift)', () => {
      // 2026-11-11 00:00:05 KST is 2026-11-10 15:00:05 UTC
      const kstMidnight = new Date('2026-11-10T15:00:05Z');
      expect(getTodayYmdKST(kstMidnight)).toBe('20261111');

      // 2026-11-11 23:59:55 KST is 2026-11-11 14:59:55 UTC
      const kstEndOfDay = new Date('2026-11-11T14:59:55Z');
      expect(getTodayYmdKST(kstEndOfDay)).toBe('20261111');
    });

    it('3.5 Truthful display on weekends and holidays (0 count renders slate neutral completed)', () => {
      const weekendMetrics = evaluateTodayUpdateMetrics(
        [],
        {
          latestRegisteredDate: '20261108',
          todayRegisteredCount: 0,
          todayNewHighCount: 0,
        },
        new Date('2026-11-09T00:00:00Z') // A day where no MOLIT RTMS batches occurred
      );

      expect(weekendMetrics.isTodayUpdated).toBe(false);
      expect(weekendMetrics.todayRegisteredCount).toBe(0);
      expect(weekendMetrics.latestRegisteredDateLabel).toBe('11월 8일');

      render(<TodayUpdatePillBadge metrics={weekendMetrics} />);
      const emptyBadge = screen.getByTestId('today-update-pill-badge-empty');
      expect(emptyBadge).toHaveTextContent('최신 실거래 갱신 완료 (11월 8일)');
      expect(screen.queryByText(/신규 0건/)).toBeNull();
    });
  });

  describe('Suite 4: Ad Money Design System & Typography Guardrails', () => {
    it('4.1 Zero unicode sub-emojis present in rendered components', () => {
      const { container } = render(
        <div>
          <TodayUpdatePillBadge
            metrics={{
              todayYmd: TODAY_KST,
              latestRegisteredDate: TODAY_KST,
              isTodayUpdated: true,
              todayRegisteredCount: 3,
              todayNewHighCount: 1,
              latestRegisteredDateLabel: '11월 11일',
              lastSyncTimeLabel: '07:00 KST',
            }}
          />
          <MacroHeader macroTrendJsonLd={null} />
          <TimelineFilterControls periodFilter="1d" availableDongs={[]} availableApts={[]} />
        </div>
      );

      const emojiRegex =
        /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;
      expect(container.textContent?.match(emojiRegex)).toBeNull();
    });

    it('4.2 Strictly enforces Value Emerald tokens and rejects prohibited color palettes', () => {
      const { container } = render(
        <TodayUpdatePillBadge
          metrics={{
            todayYmd: TODAY_KST,
            latestRegisteredDate: TODAY_KST,
            isTodayUpdated: true,
            todayRegisteredCount: 12,
            todayNewHighCount: 3,
            latestRegisteredDateLabel: '11월 11일',
            lastSyncTimeLabel: '07:00 KST',
          }}
        />
      );

      // Verify Value Emerald
      expect(container.innerHTML).toContain('text-emerald-700');
      expect(container.innerHTML).toContain('bg-emerald-50');

      // Prohibited colors (green-*, purple, pink, etc.) must not exist
      const prohibitedColorRegex =
        /\b(?:bg|text|border|ring)-(?:pink|purple|fuchsia|violet|indigo|yellow|orange|amber|rose|zinc|neutral|stone|gray|teal|cyan|sky|green)-/i;
      expect(container.innerHTML.match(prohibitedColorRegex)).toBeNull();
    });

    it('4.3 Enforces tabular-nums font invariant on all numerical displays', () => {
      render(
        <TodayUpdatePillBadge
          metrics={{
            todayYmd: TODAY_KST,
            latestRegisteredDate: TODAY_KST,
            isTodayUpdated: true,
            todayRegisteredCount: 4,
            todayNewHighCount: 0,
            latestRegisteredDateLabel: '11월 11일',
            lastSyncTimeLabel: '07:00 KST',
          }}
        />
      );

      const badge = screen.getByTestId('today-update-pill-badge');
      expect(badge.className).toContain('tabular-nums');
      expect(badge.className).not.toContain('font-mono');
    });
  });
});
