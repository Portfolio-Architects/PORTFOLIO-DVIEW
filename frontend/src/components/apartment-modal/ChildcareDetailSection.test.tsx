import { render, screen } from '@testing-library/react';
import ChildcareDetailSection from './ChildcareDetailSection';

describe('ChildcareDetailSection', () => {
  it('renders daycare and kindergarten sections correctly with matched dong', () => {
    render(
      <ChildcareDetailSection 
        dong="오산동" 
        distanceToElementary={150} 
        aptName="동탄역 롯데캐슬" 
      />
    );
    
    // Check titles
    expect(screen.getByText('단지 인근 어린이집 (영유아)')).toBeInTheDocument();
    expect(screen.getByText('단지 인근 유치원 (5-7세)')).toBeInTheDocument();
    
    // Check specific real school names from the database
    expect(screen.getByText('시립동탄역동원어린이집')).toBeInTheDocument();
    expect(screen.getByText('화성나래유치원')).toBeInTheDocument();
  });

  it('renders fallback daycare/kindergarten names for unmatched dongs consistently', () => {
    render(
      <ChildcareDetailSection 
        dong="신동" 
        distanceToElementary={350} 
        aptName="동탄신도시 푸르지오" 
      />
    );
    
    expect(screen.getByText('시립동탄신어린이집')).toBeInTheDocument();
    expect(screen.getByText('동탄신도시초교 병설유치원')).toBeInTheDocument();
  });

  it('renders safety scorecard with 안심 1등급 when distanceToElementary is <= 300m', () => {
    render(
      <ChildcareDetailSection 
        dong="청계동" 
        distanceToElementary={200} 
        aptName="동탄역 시범 더샵 센트럴시티" 
      />
    );

    // 200m is <= 300m, so it should render '안심 1등급' for indicators
    const gradeBadges = screen.getAllByText('안심 1등급');
    expect(gradeBadges.length).toBeGreaterThan(0);
    expect(screen.getByText('보차도 완전 분리 (보행 전용로)')).toBeInTheDocument();
  });

  it('renders safety scorecard with 안심 2등급 when distanceToElementary is between 300m and 600m', () => {
    render(
      <ChildcareDetailSection 
        dong="청계동" 
        distanceToElementary={450} 
        aptName="동탄역 시범 더샵 센트럴시티" 
      />
    );

    // 450m is > 300m and <= 600m, so it should render '안심 2등급' for indicators
    const gradeBadges = screen.getAllByText('안심 2등급');
    expect(gradeBadges.length).toBeGreaterThan(0);
    expect(screen.getByText('스쿨존 펜스 보호 인도 분리')).toBeInTheDocument();
  });

  it('renders safety scorecard with 주의 3등급 when distanceToElementary is > 600m', () => {
    render(
      <ChildcareDetailSection 
        dong="청계동" 
        distanceToElementary={800} 
        aptName="동탄역 시범 더샵 센트럴시티" 
      />
    );

    // 800m is > 600m, so it should render '주의 3등급' for indicators
    const gradeBadges = screen.getAllByText('주의 3등급');
    expect(gradeBadges.length).toBeGreaterThan(0);
    expect(screen.getByText('골목/이면도로 일부 혼용 주의')).toBeInTheDocument();
  });
});
