import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { MBTIContainer } from '@/components/mbti/MBTIContainer';
import { ALL_MBTI_TYPES, MBTI_PROFILES } from '@/lib/data/mbtiData';

// Mock Recharts ResponsiveContainer to avoid 0-width in jsdom
jest.mock('recharts', () => {
  const original = jest.requireActual('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => (
      <div data-testid="recharts-mock-container" style={{ width: 400, height: 300 }}>
        {children}
      </div>
    ),
  };
});

describe('MBTI E2E Full Integration Flow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.location.hash = '';
    window.scrollTo = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('completes the full interactive quiz journey: Intro -> 7 Questions -> Matched Result -> Modal Hash', async () => {
    render(<MBTIContainer initialView="intro" />);

    // 1. Check intro screen
    expect(screen.getByTestId('mbti-intro')).toBeInTheDocument();
    expect(screen.getByText(/나와 영혼의 궁합인/i)).toBeInTheDocument();

    // 2. Click start quiz
    const startBtn = screen.getByTestId('start-quiz-btn');
    fireEvent.click(startBtn);

    // 3. Verify quiz stepper starts at Q1
    expect(screen.getByTestId('mbti-quiz-stepper')).toBeInTheDocument();
    expect(screen.getByText(/Q1 \/ 7/i)).toBeInTheDocument();

    // 4. Answer all 7 questions with option A (targets ESTJ)
    for (let i = 1; i <= 7; i++) {
      expect(screen.getByText(new RegExp(`Q${i} \\/ 7`, 'i'))).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('quiz-option-a'));
      act(() => {
        jest.advanceTimersByTime(250);
      });
    }

    // 5. Verify result screen displays ESTJ profile
    expect(screen.getByTestId('mbti-result-view')).toBeInTheDocument();
    expect(screen.getByText('ESTJ')).toBeInTheDocument();
    expect(screen.getByText('엄격한 관리자 (계획도시의 표준)')).toBeInTheDocument();
    expect(screen.getByText('동탄역 시범 더샵 센트럴시티')).toBeInTheDocument();
    expect(screen.getByTestId('mbti-radar-chart')).toBeInTheDocument();

    // 6. Click CTA button and verify hash changes to open ApartmentModal
    const ctaBtn = screen.getByTestId('cta-open-apt-modal');
    fireEvent.click(ctaBtn);
    expect(window.location.hash).toBe(`#apt=${encodeURIComponent('동탄역 시범 더샵 센트럴시티')}`);
  });

  it('supports direct landing on a specific MBTI result and allows switching to encyclopedia', () => {
    render(<MBTIContainer initialView="result" initialType="ENTP" />);

    // Direct landing on ENTP result
    expect(screen.getByTestId('mbti-result-view')).toBeInTheDocument();
    expect(screen.getByText('ENTP')).toBeInTheDocument();
    expect(screen.getByText('동탄린스트라우스 더레이크')).toBeInTheDocument();

    // Click '16개 전 유형 도감 보기'
    const viewEncyclopediaBtn = screen.getByText('16개 전 유형 도감 보기');
    fireEvent.click(viewEncyclopediaBtn);

    // Verify encyclopedia is mounted
    expect(screen.getByTestId('mbti-encyclopedia')).toBeInTheDocument();

    // Filter by NF
    const nfTab = screen.getByTestId('filter-tab-NF');
    fireEvent.click(nfTab);

    expect(screen.getByTestId('profile-card-ENFJ')).toBeInTheDocument();
    expect(screen.getByTestId('profile-card-INFJ')).toBeInTheDocument();
    expect(screen.getByTestId('profile-card-ENFP')).toBeInTheDocument();
    expect(screen.getByTestId('profile-card-INFP')).toBeInTheDocument();
    expect(screen.queryByTestId('profile-card-ENTP')).not.toBeInTheDocument();

    // Select INFP from encyclopedia
    fireEvent.click(screen.getByTestId('profile-card-INFP'));

    // Should navigate to INFP result view
    expect(screen.getByTestId('mbti-result-view')).toBeInTheDocument();
    expect(screen.getByText('INFP')).toBeInTheDocument();
    expect(screen.getByText('힐스테이트 동탄포레')).toBeInTheDocument();
  });

  it('verifies all 16 MBTI profiles have complete data integrity', () => {
    expect(ALL_MBTI_TYPES).toHaveLength(16);

    ALL_MBTI_TYPES.forEach((type) => {
      const p = MBTI_PROFILES[type];
      expect(p).toBeDefined();
      expect(p.type).toBe(type);
      expect(p.alias).toBeTruthy();
      expect(p.aptName).toBeTruthy();
      expect(p.dong).toBeTruthy();
      expect(p.tags.length).toBeGreaterThanOrEqual(3);
      expect(p.recommendationReason).toBeTruthy();
      expect(p.lifestyleFit.length).toBeGreaterThanOrEqual(3);
      expect(p.radar.transit).toBeGreaterThanOrEqual(0);
      expect(p.radar.nature).toBeGreaterThanOrEqual(0);
      expect(p.radar.education).toBeGreaterThanOrEqual(0);
      expect(p.radar.commerce).toBeGreaterThanOrEqual(0);
      expect(p.radar.futureValue).toBeGreaterThanOrEqual(0);
    });
  });
});
