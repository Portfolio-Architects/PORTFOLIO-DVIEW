/**
 * @file TodayUpdatePillBadge.test.tsx
 * @description Component test suite for TodayUpdatePillBadge.
 * Tests active Value Emerald pulse state, truthful neutral state, compact variant,
 * Zero-CLS skeleton, onClick interactivity, and design system invariants.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TodayUpdatePillBadge } from '@/components/common/TodayUpdatePillBadge';
import { TodayUpdateMetrics } from '@/lib/todayUpdateEvaluator';

describe('TodayUpdatePillBadge Component Tests', () => {
  const activeMetrics: TodayUpdateMetrics = {
    todayYmd: '20261111',
    latestRegisteredDate: '20261111',
    isTodayUpdated: true,
    todayRegisteredCount: 5,
    todayNewHighCount: 2,
    latestRegisteredDateLabel: '11월 11일',
    lastSyncTimeLabel: '07:00 KST',
    todayTransactions: [],
  };

  const emptyMetrics: TodayUpdateMetrics = {
    todayYmd: '20261111',
    latestRegisteredDate: '20261110',
    isTodayUpdated: false,
    todayRegisteredCount: 0,
    todayNewHighCount: 0,
    latestRegisteredDateLabel: '11월 10일',
    lastSyncTimeLabel: '07:00 KST',
    todayTransactions: [],
  };

  it('renders fixed-height Zero-CLS shimmer skeleton before hydration or during loading', () => {
    // When no metrics or transactions are provided and SWR has not resolved
    render(<TodayUpdatePillBadge />);
    const skeleton = screen.getByTestId('today-update-pill-badge-skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('h-[26px]');
    expect(skeleton).toHaveClass('animate-pulse');
  });

  it('renders Value Emerald live pulse badge when today transactions exist', () => {
    render(<TodayUpdatePillBadge metrics={activeMetrics} />);

    const badge = screen.getByTestId('today-update-pill-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('오늘 신규 5건 등록 (07:00 반영)');
    expect(badge).toHaveTextContent('신고가 2건');

    // Value Emerald tokens and tabular-nums
    expect(badge).toHaveClass('bg-emerald-50');
    expect(badge).toHaveClass('text-emerald-700');
    expect(badge).toHaveClass('border-emerald-500/25');
    expect(badge).toHaveClass('tabular-nums');
    expect(badge).toHaveClass('h-[26px]');
  });

  it('renders compact text variant when variant="compact"', () => {
    render(<TodayUpdatePillBadge metrics={activeMetrics} variant="compact" />);

    const badge = screen.getByTestId('today-update-pill-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('오늘 등록 5건');
    expect(badge).toHaveTextContent('신고가 2건');
  });

  it('renders truthful neutral state with Clock icon when 0 transactions registered today (weekend/holiday)', () => {
    render(<TodayUpdatePillBadge metrics={emptyMetrics} />);

    const emptyBadge = screen.getByTestId('today-update-pill-badge-empty');
    expect(emptyBadge).toBeInTheDocument();
    expect(emptyBadge).toHaveTextContent('최신 실거래 갱신 완료 (11월 10일)');

    // Slate neutral styling
    expect(emptyBadge).toHaveClass('bg-slate-100');
    expect(emptyBadge).toHaveClass('text-slate-600');
    expect(emptyBadge).toHaveClass('border-slate-200');
    expect(emptyBadge).toHaveClass('tabular-nums');
    expect(emptyBadge).toHaveClass('h-[26px]');
  });

  it('handles onClick callback and supports keyboard accessibility', () => {
    const handleClick = jest.fn();
    render(<TodayUpdatePillBadge metrics={activeMetrics} onClick={handleClick} />);

    const badge = screen.getByTestId('today-update-pill-badge');
    expect(badge).toHaveAttribute('role', 'button');
    expect(badge).toHaveAttribute('tabIndex', '0');

    fireEvent.click(badge);
    expect(handleClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(badge, { key: 'Enter', code: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('strictly adheres to design system invariants (zero emojis, zero prohibited colors)', () => {
    const { container } = render(<TodayUpdatePillBadge metrics={activeMetrics} />);

    const emojiRegex =
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;
    expect(container.textContent?.match(emojiRegex)).toBeNull();

    // Verify prohibited colors (green-*, purple, pink, etc.) are NOT present
    const prohibitedColorRegex =
      /\b(?:bg|text|border|ring)-(?:pink|purple|fuchsia|violet|indigo|yellow|orange|amber|rose|zinc|neutral|stone|gray|teal|cyan|sky|green)-/i;
    expect(container.innerHTML.match(prohibitedColorRegex)).toBeNull();
  });
});
