import { render, screen } from '@testing-library/react';
import ChildcareDetailSection from './ChildcareDetailSection';

describe('ChildcareDetailSection', () => {
  it('renders daycare and kindergarten sections correctly with matched dong', () => {
    render(
      <ChildcareDetailSection 
        dong="오산동" 
        distanceToElementary={150} 
        aptName="동탄역 센트럴푸르지오" 
      />
    );
    
    // Check titles
    expect(screen.getByText('단지 인근 어린이집 (영유아)')).toBeInTheDocument();
    expect(screen.getByText('단지 인근 유치원 (5-7세)')).toBeInTheDocument();
    
    // Check specific real school names from the database
    expect(screen.getByText('시립여울숲어린이집')).toBeInTheDocument();
    expect(screen.getByText('동탄유치원')).toBeInTheDocument();
    
    // Check disclaimer for non-overridden dongs
    expect(screen.getByText(/행정동\(오산동\) 내 대표 보육 시설 정보가 표시됩니다/)).toBeInTheDocument();
  });

  it('renders preparing status message for unmatched dongs', () => {
    render(
      <ChildcareDetailSection 
        dong="방교동" 
        distanceToElementary={350} 
        aptName="동탄신도시 푸르지오" 
      />
    );
    
    expect(screen.getByText('방교동 보육 인프라 데이터 준비 중')).toBeInTheDocument();
    expect(screen.queryByText('단지 인근 어린이집 (영유아)')).not.toBeInTheDocument();
  });

  it('renders safety scorecard with preparing status', () => {
    render(
      <ChildcareDetailSection 
        dong="청계동" 
        distanceToElementary={200} 
        aptName="동탄역 시범 더샵 센트럴시티" 
      />
    );

    expect(screen.getByText('초등 통학로 안심 길목 진단')).toBeInTheDocument();
    expect(screen.getByText('준비 중')).toBeInTheDocument();
    expect(screen.getByText('더 정확하고 유용한 통학 안전 진단 서비스 준비 중')).toBeInTheDocument();
  });

  it('renders overridden childcare data for specific apartments (e.g. 힐스테이트 동탄역)', () => {
    render(
      <ChildcareDetailSection 
        dong="영천동" 
        distanceToElementary={100} 
        aptName="힐스테이트 동탄역" 
      />
    );
    
    // Check exact override daycares
    expect(screen.getByText('동탄역힐스 어린이집')).toBeInTheDocument();
    expect(screen.getByText('근로복지공단 화성어린이집')).toBeInTheDocument();
    
    // Check exact override kindergartens
    expect(screen.getByText('윤정유치원')).toBeInTheDocument();
    expect(screen.getByText('치동초등학교 병설유치원')).toBeInTheDocument();
    
    // Check footnote disclaimer is NOT rendered since it is overridden
    expect(screen.queryByText(/행정동\(영천동\) 내 대표 보육 시설 정보가 표시됩니다/)).not.toBeInTheDocument();
  });

  it('renders updated real kindergarten names for 반송동 and 능동', () => {
    const { rerender } = render(
      <ChildcareDetailSection 
        dong="반송동" 
        distanceToElementary={150} 
        aptName="메타폴리스" 
      />
    );
    // 반송동 check
    expect(screen.getByText('반송초등학교병설유치원')).toBeInTheDocument();
    expect(screen.getByText('솔빛유치원')).toBeInTheDocument();
    expect(screen.queryByText('시립반송유치원')).not.toBeInTheDocument();

    // 능동 check
    rerender(
      <ChildcareDetailSection 
        dong="능동" 
        distanceToElementary={150} 
        aptName="이지더원" 
      />
    );
    expect(screen.getByText('능동초등학교병설유치원')).toBeInTheDocument();
    expect(screen.getByText('새봄유치원')).toBeInTheDocument();
    expect(screen.queryByText('푸른초등학교병설유치원')).not.toBeInTheDocument();
  });

  it('renders overridden childcare data for 동탄역 시범 한화꿈에그린 프레스티지', () => {
    render(
      <ChildcareDetailSection 
        dong="청계동" 
        distanceToElementary={180} 
        aptName="동탄역 시범 한화꿈에그린 프레스티지" 
      />
    );
    
    expect(screen.getByText('시립한화꿈에어린이집')).toBeInTheDocument();
    expect(screen.getByText('시립한화나래어린이집')).toBeInTheDocument();
    expect(screen.getByText('아인초등학교 병설유치원')).toBeInTheDocument();
    expect(screen.getByText('청계유치원')).toBeInTheDocument();
  });

  it('renders overridden childcare data for 동탄역 푸르지오', () => {
    render(
      <ChildcareDetailSection 
        dong="영천동" 
        distanceToElementary={250} 
        aptName="동탄역 푸르지오" 
      />
    );
    
    expect(screen.getByText('시립동탄역푸르지오어린이집')).toBeInTheDocument();
    expect(screen.getByText('시립영천어린이집')).toBeInTheDocument();
    expect(screen.getByText('윤정유치원')).toBeInTheDocument();
    expect(screen.getByText('치동초등학교 병설유치원')).toBeInTheDocument();
  });

  it('renders dynamically computed Haversine distances when coordinates are provided', () => {
    render(
      <ChildcareDetailSection 
        dong="여울동" 
        distanceToElementary={150} 
        aptName="테스트 아파트" 
        coordinates="37.20000, 127.09000"
      />
    );
    
    // Check facility names
    expect(screen.getByText('시립여울숲어린이집')).toBeInTheDocument();
    expect(screen.getByText('시립동탄행복어린이집')).toBeInTheDocument();
    expect(screen.getByText('동탄유치원')).toBeInTheDocument();
    expect(screen.getByText('동탄초등학교 병설유치원')).toBeInTheDocument();

    // Check calculated distances and times
    expect(screen.getByText('294')).toBeInTheDocument();
    expect(screen.getByText('도보 4분')).toBeInTheDocument();

    expect(screen.getByText('183')).toBeInTheDocument();
    expect(screen.getByText('도보 3분')).toBeInTheDocument();

    expect(screen.getByText('536')).toBeInTheDocument();
    expect(screen.getByText('도보 7분')).toBeInTheDocument();

    expect(screen.getByText('660')).toBeInTheDocument();
    expect(screen.getByText('도보 9분')).toBeInTheDocument();
  });
});
