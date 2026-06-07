import { render, screen, fireEvent } from '@testing-library/react';
import JeonseSafetyReport from './JeonseSafetyReport';

describe('JeonseSafetyReport', () => {
  const mockOnOpenAdModal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly for safe rating (>= 90 points)', () => {
    render(
      <JeonseSafetyReport 
        aptName="동탄역 롯데캐슬" 
        ratio={0.5} 
        latestPrice={100000} 
        latestDeposit={50000} 
        volume3M={15} 
        householdCount={1200}
        onOpenAdModal={mockOnOpenAdModal}
      />
    );

    // Total: 50 (ratio < 60%) + 20 (deposit < 7.8억) + 20 (vol >= 10) + 10 (households >= 1000) = 100 points
    expect(screen.getByText('안심 등급 (100점)')).toBeInTheDocument();
    expect(screen.getByText('보증금 회수 안정성이 매우 높은 단지입니다.')).toBeInTheDocument();
    
    // Check specific detail scores
    expect(screen.getByText('50 / 50점')).toBeInTheDocument();
    expect(screen.getAllByText('20 / 20점').length).toBe(2); // margin & liquidity
    expect(screen.getByText('10 / 10점')).toBeInTheDocument(); // scale

    // Ad banner should NOT be rendered for safe grade
    expect(screen.queryByText(/임차인 필수: 전세보증금 반환보증보험 가입 요건 확인/)).not.toBeInTheDocument();
  });

  it('renders correctly for caution rating (70-89 points)', () => {
    render(
      <JeonseSafetyReport 
        aptName="동탄역 시범 더샵 센트럴시티" 
        ratio={0.65} 
        latestPrice={100000} 
        latestDeposit={65000} 
        volume3M={6} 
        householdCount={800}
        onOpenAdModal={mockOnOpenAdModal}
      />
    );

    // Total: 40 (60% <= ratio < 70%) + 20 (deposit < 7.8억) + 15 (5 <= vol < 10) + 7 (500 <= households < 1000) = 82 points
    expect(screen.getByText('주의 등급 (82점)')).toBeInTheDocument();
    expect(screen.getByText('보증금 반환 조건에 대한 모니터링이 필요합니다.')).toBeInTheDocument();

    // Check specific detail scores
    expect(screen.getByText('40 / 50점')).toBeInTheDocument();
    expect(screen.getByText('20 / 20점')).toBeInTheDocument();
    expect(screen.getByText('15 / 20점')).toBeInTheDocument();
    expect(screen.getByText('7 / 10점')).toBeInTheDocument();

    // Ad banner SHOULD be rendered for caution grade
    expect(screen.getByText(/임차인 필수: 전세보증금 반환보증보험 가입 요건 확인/)).toBeInTheDocument();
    
    // Trigger ad modal click
    const adButton = screen.getByText('무료 가입 진단받기');
    fireEvent.click(adButton);
    expect(mockOnOpenAdModal).toHaveBeenCalledTimes(1);
  });

  it('renders correctly for danger rating (< 70 points)', () => {
    render(
      <JeonseSafetyReport 
        aptName="동탄역 삼정그린코아" 
        ratio={0.85} 
        latestPrice={100000} 
        latestDeposit={85000} 
        volume3M={0} 
        householdCount={400}
        onOpenAdModal={mockOnOpenAdModal}
      />
    );

    // Total: 10 (80% <= ratio < 90%) + 10 (7.8억 <= deposit < 10억) + 5 (vol == 0) + 4 (households < 500) = 29 points
    expect(screen.getByText('위험 등급 (29점)')).toBeInTheDocument();
    expect(screen.getByText('깡통전세 및 보증금 일부 미반환 위험이 큽니다.')).toBeInTheDocument();

    // Check specific detail scores
    expect(screen.getByText('10 / 50점')).toBeInTheDocument();
    expect(screen.getByText('10 / 20점')).toBeInTheDocument();
    expect(screen.getByText('5 / 20점')).toBeInTheDocument();
    expect(screen.getByText('4 / 10점')).toBeInTheDocument();

    // Ad banner SHOULD be rendered for danger grade
    expect(screen.getByText(/임차인 필수: 전세보증금 반환보증보험 가입 요건 확인/)).toBeInTheDocument();
  });
});
