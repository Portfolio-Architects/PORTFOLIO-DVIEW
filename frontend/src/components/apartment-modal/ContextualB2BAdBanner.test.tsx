import { render, screen, fireEvent } from '@testing-library/react';
import ContextualB2BAdBanner from './ContextualB2BAdBanner';
import { addDoc } from 'firebase/firestore';

// Mock Firebase SDK to prevent actual database calls
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn().mockResolvedValue({ id: 'mock-ad-click-id' }),
  serverTimestamp: jest.fn().mockReturnValue('mock-timestamp'),
}));

jest.mock('@/lib/firebaseConfig', () => ({
  db: {}, // Mock DB object
}));

describe('ContextualB2BAdBanner CPA 광고 스마트 매칭 테스트', () => {
  const mockOnOpenAdModal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    window.open = jest.fn(); // Mock window.open
  });

  it('전세가율이 70% 이상일 때 보증보험 광고(insurance)를 매칭하고 클릭 시 랜딩으로 이동한다', () => {
    render(
      <ContextualB2BAdBanner
        apartmentName="동탄 시범 다샵"
        dong="청계동"
        yearBuilt="2015-12-30"
        distanceToElementary={500}
        jeonseRate={0.78}
        userId="test-user-id"
        onOpenAdModal={mockOnOpenAdModal}
      />
    );

    // Verify correct contextual ad is rendered (Insurance)
    expect(screen.getByText('안전 보증 케어')).toBeInTheDocument();
    expect(screen.getByText('혹시 내 전세금도 위험할까? 보증보험 요건 1분 확인')).toBeInTheDocument();
    expect(screen.getByText(/최근 전세가율이 70%를 상회하여/)).toBeInTheDocument();
    expect(screen.getByText('보증보험 가입 자격 무료 진단')).toBeInTheDocument();

    // Trigger click on action button
    const actionButton = screen.getByText('보증보험 가입 자격 무료 진단');
    fireEvent.click(actionButton);

    // Verify Firestore click tracking call
    expect(addDoc).toHaveBeenCalledTimes(1);
    
    // Verify window.open was triggered for insurance link
    expect(window.open).toHaveBeenCalledWith('https://jeonse.dview.com/insurance', '_blank', 'noopener,noreferrer');
  });

  it('준공 15년 이상 노후단지일 때 인테리어 광고(interior)를 매칭하고 클릭 시 콜백을 실행한다', () => {
    render(
      <ContextualB2BAdBanner
        apartmentName="동탄1동 다은마을 래미안"
        dong="반송동"
        yearBuilt="2007-03-24" // 2026 - 2007 = 19 years old (>= 15)
        distanceToElementary={500}
        jeonseRate={0.55}
        userId="test-user-id"
        onOpenAdModal={mockOnOpenAdModal}
      />
    );

    // Verify correct contextual ad is rendered (Interior)
    expect(screen.getByText('노후단지 특별혜택')).toBeInTheDocument();
    expect(screen.getByText('동탄 노후 단지 전용 인테리어 & 샷시 패키지 특별전')).toBeInTheDocument();
    expect(screen.getByText(/준공 15년이 경과하여 단열 성능 보강 및/)).toBeInTheDocument();
    expect(screen.getByText('인테리어 무료 실측 신청하기')).toBeInTheDocument();

    // Trigger click on ad banner card
    const bannerCard = screen.getByText('동탄 노후 단지 전용 인테리어 & 샷시 패키지 특별전');
    fireEvent.click(bannerCard);

    // Verify Firestore click tracking call
    expect(addDoc).toHaveBeenCalledTimes(1);
    
    // For interior ad, it should trigger onOpenAdModal if provided instead of window.open
    expect(mockOnOpenAdModal).toHaveBeenCalledTimes(1);
    expect(window.open).not.toHaveBeenCalled();
  });

  it('초등학교 도보 300m 이내 안심 학군일 때 학원 광고(academy)를 매칭하고 클릭 시 랜딩으로 이동한다', () => {
    render(
      <ContextualB2BAdBanner
        apartmentName="동탄역 시범 한화"
        dong="청계동"
        yearBuilt="2018-05-10" // 8 years old
        distanceToElementary={150} // <= 300m
        jeonseRate={0.52}
        userId="test-user-id"
        onOpenAdModal={mockOnOpenAdModal}
      />
    );

    // Verify correct contextual ad is rendered (Academy)
    expect(screen.getByText('학세권 안심 교육')).toBeInTheDocument();
    expect(screen.getByText('단지 초인접 영어/수학 전문 교육 1회 무료 체험권')).toBeInTheDocument();
    expect(screen.getByText(/어린 자녀의 도보 통학이 매우 편리한/)).toBeInTheDocument();
    expect(screen.getByText('무료 레벨테스트 & 체험 신청')).toBeInTheDocument();

    // Trigger click
    const actionButton = screen.getByText('무료 레벨테스트 & 체험 신청');
    fireEvent.click(actionButton);

    // Verify Firestore click tracking call
    expect(addDoc).toHaveBeenCalledTimes(1);
    expect(window.open).toHaveBeenCalledWith('https://academy.dview.com/free-pass', '_blank', 'noopener,noreferrer');
  });

  it('그 외 일반 단지일 때 입주/홈케어 광고(cleaning)를 폴백 매칭하고 클릭 시 콜백을 실행한다', () => {
    render(
      <ContextualB2BAdBanner
        apartmentName="동탄역 롯데캐슬"
        dong="오산동"
        yearBuilt="2021-07-15" // 5 years old
        distanceToElementary={400} // > 300m
        jeonseRate={0.62} // < 0.70
        userId="test-user-id"
        onOpenAdModal={mockOnOpenAdModal}
      />
    );

    // Verify fallback ad is rendered (Cleaning)
    expect(screen.getByText('입주 & 홈케어')).toBeInTheDocument();
    expect(screen.getByText('동탄 아파트 홈케어 (입주청소/줄눈/탄성코트) 특가 공동구매')).toBeInTheDocument();
    expect(screen.getByText(/쾌적한 주거 공간의 시작을 위한 안심/)).toBeInTheDocument();
    expect(screen.getByText('홈케어 특가 상담 신청')).toBeInTheDocument();

    // Trigger click
    const bannerCard = screen.getByText('동탄 아파트 홈케어 (입주청소/줄눈/탄성코트) 특가 공동구매');
    fireEvent.click(bannerCard);

    // Verify Firestore click tracking call
    expect(addDoc).toHaveBeenCalledTimes(1);
    expect(mockOnOpenAdModal).toHaveBeenCalledTimes(1);
  });

  it('onOpenConsumerAdModal Prop이 전달되었을 때 학원 광고를 클릭하면 콜백이 호출된다', () => {
    const mockOnOpenConsumerAdModal = jest.fn();
    render(
      <ContextualB2BAdBanner
        apartmentName="동탄역 시범 한화"
        dong="청계동"
        yearBuilt="2018-05-10"
        distanceToElementary={150} // 학원 광고 매칭 조건 (<= 300m)
        jeonseRate={0.52}
        userId="test-user-id"
        onOpenConsumerAdModal={mockOnOpenConsumerAdModal}
      />
    );

    const actionButton = screen.getByText('무료 레벨테스트 & 체험 신청');
    fireEvent.click(actionButton);

    expect(addDoc).toHaveBeenCalledTimes(1);
    expect(mockOnOpenConsumerAdModal).toHaveBeenCalledWith('academy', '단지 초인접 영어/수학 전문 교육 1회 무료 체험권');
    expect(window.open).not.toHaveBeenCalled();
  });
});
