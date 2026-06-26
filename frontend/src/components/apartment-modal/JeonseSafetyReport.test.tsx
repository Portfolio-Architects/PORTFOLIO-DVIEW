import { render, screen, fireEvent } from '@testing-library/react';
import JeonseSafetyReport from './JeonseSafetyReport';

describe('JeonseSafetyReport', () => {
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
      />
    );

    expect(screen.getByText('안심 등급 (100점)')).toBeInTheDocument();
    expect(screen.getByText('보증금 회수 안정성이 매우 높은 단지입니다.')).toBeInTheDocument();
    
    expect(screen.getByText('50 / 50점')).toBeInTheDocument();
    expect(screen.getAllByText('20 / 20점').length).toBe(2); 
    expect(screen.getByText('10 / 10점')).toBeInTheDocument(); 

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
      />
    );

    expect(screen.getByText('주의 등급 (82점)')).toBeInTheDocument();
    expect(screen.getByText('보증금 반환 조건에 대한 모니터링이 필요합니다.')).toBeInTheDocument();

    expect(screen.getByText('40 / 50점')).toBeInTheDocument();
    expect(screen.getByText('20 / 20점')).toBeInTheDocument();
    expect(screen.getByText('15 / 20점')).toBeInTheDocument();
    expect(screen.getByText('7 / 10점')).toBeInTheDocument();

    expect(screen.getByText(/임차인 필수: 전세보증금 반환보증보험 가입 요건 확인/)).toBeInTheDocument();
    
    const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null as any);
    const adButton = screen.getByText('HUG 공식 기준 확인');
    fireEvent.click(adButton);
    expect(windowOpenSpy).toHaveBeenCalledWith('https://www.khug.or.kr/web/ig/dr/igdr000001.jsp', '_blank', 'noopener,noreferrer');
    windowOpenSpy.mockRestore();
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
      />
    );

    expect(screen.getByText('위험 등급 (29점)')).toBeInTheDocument();
    expect(screen.getByText('깡통전세 및 보증금 일부 미반환 위험이 큽니다.')).toBeInTheDocument();

    expect(screen.getByText('10 / 50점')).toBeInTheDocument();
    expect(screen.getByText('10 / 20점')).toBeInTheDocument();
    expect(screen.getByText('5 / 20점')).toBeInTheDocument();
    expect(screen.getByText('4 / 10점')).toBeInTheDocument();

    expect(screen.getByText(/임차인 필수: 전세보증금 반환보증보험 가입 요건 확인/)).toBeInTheDocument();
  });
});
