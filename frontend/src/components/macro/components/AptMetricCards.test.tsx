import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AptMetricCards } from './AptMetricCards';

describe('AptMetricCards Test Suite', () => {
  const mockRecentTransactions = [
    {
      aptName: '동탄역 롯데캐슬',
      priceVal: 16.5,
      areaPyeong: 34.2,
      isNewHigh: true,
    },
    {
      aptName: '동탄역 시범 우남퍼스트빌',
      priceVal: 11.2,
      areaPyeong: 33.8,
      isNewHigh: true,
    },
    {
      aptName: '동탄역 시범 더샵 센트럴시티',
      priceVal: 12.0,
      areaPyeong: 33.5,
      isNewHigh: false,
    },
  ];

  const mockMacroTrend = [
    {
      name: '26.05',
      '동탄 아파트 전체': 8.5,
      '동탄 아파트 전세 평균': 4.8,
    },
  ];

  it('renders all 4 metric cards correctly with computed values', () => {
    const mockOpenSellTiming = jest.fn();

    render(
      <AptMetricCards
        recentTransactions={mockRecentTransactions}
        macroTrendData={mockMacroTrend as any}
        onOpenSellTimingCalculator={mockOpenSellTiming}
      />
    );

    // 1. New High count
    expect(screen.getByText('신고가 달성')).toBeInTheDocument();
    expect(screen.getByText('2건')).toBeInTheDocument();

    // 2. Avg price per pyeong
    expect(screen.getByText('평당 평균 실거래가')).toBeInTheDocument();
    expect(screen.getByText(/만원/)).toBeInTheDocument();

    // 3. Avg jeonse rate
    expect(screen.getByText('평균 전세가율')).toBeInTheDocument();
    // 4.8 / 8.5 * 100 = 56.5%
    expect(screen.getByText('56.5%')).toBeInTheDocument();

    // 4. CTA Card
    expect(screen.getByText('우리집 적정 가치 & 매도 타이밍')).toBeInTheDocument();
    const ctaButton = screen.getByLabelText(/우리집 적정 가치 및 매도 타이밍 진단 계산기 열기/i);
    expect(ctaButton).toBeInTheDocument();

    fireEvent.click(ctaButton);
    expect(mockOpenSellTiming).toHaveBeenCalledTimes(1);
  });

  it('respects explicit props overrides', () => {
    render(
      <AptMetricCards
        newHighCount={42}
        newHighChange={7}
        avgPyeongPrice={3200}
        avgJeonseRate={61.8}
      />
    );

    expect(screen.getByText('42건')).toBeInTheDocument();
    expect(screen.getByText(/전기 대비 \+7건 상승세/)).toBeInTheDocument();
    expect(screen.getByText('3,200만원')).toBeInTheDocument();
    expect(screen.getByText('61.8%')).toBeInTheDocument();
  });

  it('handles empty data gracefully with sensible fallbacks without NaN', () => {
    render(
      <AptMetricCards
        recentTransactions={[]}
        macroTrendData={[]}
      />
    );

    expect(screen.getByText('신고가 달성')).toBeInTheDocument();
    expect(screen.getByText('0건')).toBeInTheDocument();
    expect(screen.getByText('평당 평균 실거래가')).toBeInTheDocument();
    expect(screen.getByText('평균 전세가율')).toBeInTheDocument();
    expect(screen.getByText('우리집 적정 가치 & 매도 타이밍')).toBeInTheDocument();

    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });

  it('computes metrics from txSummaryData when recentTransactions is undefined', () => {
    const mockSummary = {
      aptA: {
        avg3MPerPyeong: 3100,
        avg3MPrice: 10.0,
        avg3MRentDeposit: 6.0,
        recent: [
          { isNewHigh: true, priceVal: 10.5 },
          { isNewHigh: false, priceVal: 9.8 },
        ],
      },
    };

    render(
      <AptMetricCards
        txSummaryData={mockSummary as any}
      />
    );

    // 1 new high in summary
    expect(screen.getByText('1건')).toBeInTheDocument();
    // 3,100만원 avg pyeong price
    expect(screen.getByText('3,100만원')).toBeInTheDocument();
    // 6.0 / 10.0 * 100 = 60.0%
    expect(screen.getByText('60.0%')).toBeInTheDocument();
  });

  it('scans macroTrendData backwards to find latest valid data point with positive sale and jeonse', () => {
    const trendWithTrailingEmpty = [
      { name: '26.04', '동탄 아파트 전체': 8.0, '동탄 아파트 전세 평균': 4.4 }, // 55.0%
      { name: '26.05', '동탄 아파트 전체': 0, '동탄 아파트 전세 평균': 0 },     // invalid trailing
    ];

    render(
      <AptMetricCards
        macroTrendData={trendWithTrailingEmpty as any}
      />
    );

    // 4.4 / 8.0 * 100 = 55.0%
    expect(screen.getByText('55.0%')).toBeInTheDocument();
  });

  it('converts area in m2 to pyeong automatically when areaPyeong is missing', () => {
    const txWithAreaM2 = [
      {
        aptName: '단지',
        priceVal: 10.0,
        area: 99.174, // ~ 30 pyeong
      },
    ];

    render(
      <AptMetricCards
        recentTransactions={txWithAreaM2}
      />
    );

    // 10.0 * 10000 / (99.174 / 3.3058) = 100000 / 30 = ~3333
    expect(screen.getByText(/3,333만원/)).toBeInTheDocument();
  });

  it('renders correct change text for zero and negative newHighChange values', () => {
    const { rerender } = render(
      <AptMetricCards
        newHighCount={15}
        newHighChange={0}
      />
    );

    expect(screen.getByText('전기 대비 변동 없음')).toBeInTheDocument();

    rerender(
      <AptMetricCards
        newHighCount={12}
        newHighChange={-4}
      />
    );

    expect(screen.getByText('전기 대비 -4건 하락세')).toBeInTheDocument();
  });
});

