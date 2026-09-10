import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MBTIResultView } from './MBTIResultView';
import { MBTI_PROFILES } from '@/lib/data/mbtiData';

// Mock Recharts ResponsiveContainer to avoid 0-width in jsdom
jest.mock('recharts', () => {
  const original = jest.requireActual('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 400, height: 300 }}>{children}</div>
    ),
  };
});

describe('MBTIResultView', () => {
  const entjProfile = MBTI_PROFILES.ENTJ;

  it('renders MBTI profile details and matched complex correctly', () => {
    render(<MBTIResultView profile={entjProfile} />);

    expect(screen.getByTestId('mbti-result-view')).toBeInTheDocument();
    expect(screen.getByText('ENTJ')).toBeInTheDocument();
    expect(screen.getByText(entjProfile.alias)).toBeInTheDocument();
    expect(screen.getByText(entjProfile.aptName)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(entjProfile.dong, 'i'))).toBeInTheDocument();
    expect(screen.getByTestId('mbti-radar-chart')).toBeInTheDocument();
  });

  it('updates window.location.hash when CTA button is clicked', () => {
    const hashSpy = jest.fn();
    window.addEventListener('hashchange', hashSpy);

    render(<MBTIResultView profile={entjProfile} />);

    const ctaButton = screen.getByTestId('cta-open-apt-modal');
    fireEvent.click(ctaButton);

    expect(window.location.hash).toContain(`apt=${encodeURIComponent(entjProfile.aptName)}`);
    expect(hashSpy).toHaveBeenCalled();
  });

  it('triggers onRetry and onViewEncyclopedia handlers', () => {
    const handleRetry = jest.fn();
    const handleEncyclopedia = jest.fn();

    render(
      <MBTIResultView
        profile={entjProfile}
        onRetry={handleRetry}
        onViewEncyclopedia={handleEncyclopedia}
      />
    );

    const retryBtn = screen.getByText('테스트 다시하기');
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);

    const encyclopediaBtn = screen.getByText('16개 전 유형 도감 보기');
    fireEvent.click(encyclopediaBtn);
    expect(handleEncyclopedia).toHaveBeenCalledTimes(1);
  });
});
