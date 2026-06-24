import { getContextualAd } from './ContextualAdEngine';
import { getAdForApartment } from './adMatching';

// Mock the underlying adMatching utility to isolate ContextualAdEngine logic
jest.mock('./adMatching', () => ({
  getAdForApartment: jest.fn(),
}));

describe('ContextualAdEngine Utility', () => {
  const mockGetAdForApartment = getAdForApartment as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a valid ContextualAd object on a successful happy path', () => {
    mockGetAdForApartment.mockReturnValue({
      adType: 'academy',
      badge: '교육 추천',
      title: '영어 수학 전문 학원',
      description: '초등학교 바로 앞 1대1 개인 맞춤 매니징 케어 시스템',
      buttonText: '무료 청강 신청',
      link: '/academy-details',
    });

    const ad = getContextualAd('2015', 150, 65);

    expect(mockGetAdForApartment).toHaveBeenCalledWith({
      yearBuilt: '2015',
      distanceToElementary: 150,
      jeonseRate: 65,
    });

    expect(ad).toEqual({
      adType: 'academy',
      badge: '교육 추천',
      title: '영어 수학 전문 학원',
      desc: '초등학교 바로 앞 1대1 개인 맞춤 매니징 케어 시스템',
      actionText: '무료 청강 신청',
      link: '/academy-details',
    });
  });

  it('should transform yearBuilt to string and numeric types correctly when passed as different types', () => {
    mockGetAdForApartment.mockReturnValue({
      adType: 'interior',
      badge: '인테리어',
      title: '구축 인테리어 혜택',
      description: '연식이 쌓인 아파트의 스마트한 인테리어 설계 제안',
      buttonText: '무료 상담',
      link: '/interior-advice',
    });

    // Pass yearBuilt as number and distance/rate as strings to verify Zod type transform
    // @ts-expect-error - testing string inputs for distance/rate parameters
    const ad = getContextualAd(2005, '400', '72');

    expect(mockGetAdForApartment).toHaveBeenCalledWith({
      yearBuilt: '2005',
      distanceToElementary: 400,
      jeonseRate: 72,
    });

    expect(ad.adType).toBe('interior');
  });

  it('should handle missing/null/undefined parameters and pass undefined to getAdForApartment', () => {
    mockGetAdForApartment.mockReturnValue({
      adType: 'insurance',
      badge: '안심 혜택',
      title: '전세금 반환보증 보험 가입',
      description: '내 소중한 보증금을 지키는 HUG 전세보증금 반환보증 특약',
      buttonText: '보험료 계산',
      link: '/insurance',
    });

    // @ts-expect-error - testing null inputs for yearBuilt and jeonseRate parameters
    const ad = getContextualAd(null, undefined, null);

    expect(mockGetAdForApartment).toHaveBeenCalledWith({
      yearBuilt: undefined,
      distanceToElementary: undefined,
      jeonseRate: undefined,
    });

    expect(ad.adType).toBe('insurance');
  });

  it('should fall back to the default fallback ad structure when the underlying utility returns invalid data', () => {
    // Return invalid data containing incorrect properties or wrong types to force schema validation fail
    mockGetAdForApartment.mockReturnValue({
      adType: 'invalid_type_not_in_enum', // violates z.enum
      badge: 123, // violates z.string
      title: '샘플 광고',
      description: '잘못된 스키마 데이터',
      buttonText: '바로가기',
      link: '/some-link',
    });

    const ad = getContextualAd('2018', 200, 50);

    expect(ad).toEqual({
      adType: 'interior',
      badge: '스폰서',
      title: '동탄 아파트 리모델링 상담',
      desc: 'DVIEW 제휴 프리미엄 리모델링 특별 패키지 혜택을 만나보세요.',
      actionText: '상담 신청',
      link: '/lounge',
    });
  });
});
