import { getAdForApartment, AdBannerDetails } from './adMatching';

describe('AdMatching Utilities', () => {
  it('should return fallback brokerage ad when metrics are undefined', () => {
    const ad: AdBannerDetails = getAdForApartment(undefined);
    expect(ad.adType).toBe('brokerage');
    expect(ad.badge).toBe('동탄 전문 중개');
  });

  it('should return insurance ad when jeonseRate is 70% or higher', () => {
    const ad: AdBannerDetails = getAdForApartment({
      jeonseRate: 0.75,
      yearBuilt: '2020',
      distanceToElementary: 500,
    });
    expect(ad.adType).toBe('insurance');
    expect(ad.badge).toBe('안전 보증 케어');
    expect(ad.link).toBe('https://jeonse.dview.com/insurance');
  });

  it('should return interior ad when age is 15 years or older', () => {
    // Reference year is 2026, so 2011 is 15 years old
    const ad: AdBannerDetails = getAdForApartment({
      jeonseRate: 0.60,
      yearBuilt: '2011',
      distanceToElementary: 500,
    });
    expect(ad.adType).toBe('interior');
    expect(ad.badge).toBe('노후단지 특별혜택');
  });

  it('should return academy ad when distanceToElementary is 300m or less', () => {
    const ad: AdBannerDetails = getAdForApartment({
      jeonseRate: 0.60,
      yearBuilt: '2020', // 6 years old (< 15)
      distanceToElementary: 200, // <= 300m
    });
    expect(ad.adType).toBe('academy');
    expect(ad.badge).toBe('학세권 안심 교육');
  });

  it('should return fallback interior ad when age is less than 5 years', () => {
    const ad: AdBannerDetails = getAdForApartment({
      jeonseRate: 0.60,
      yearBuilt: '2023', // 3 years old (< 5)
      distanceToElementary: 400, // > 300m
    });
    expect(ad.adType).toBe('interior');
    expect(ad.badge).toBe('새 집으로 입주');
  });

  it('should return fallback academy ad when distanceToElementary is greater than 500m', () => {
    const ad: AdBannerDetails = getAdForApartment({
      jeonseRate: 0.60,
      yearBuilt: '2015', // 11 years old
      distanceToElementary: 600, // > 500m
    });
    expect(ad.adType).toBe('academy');
    expect(ad.badge).toBe('안심 등하교 케어');
  });

  it('should return cleaning ad as general fallback when no other conditions match', () => {
    const ad: AdBannerDetails = getAdForApartment({
      jeonseRate: 0.60,
      yearBuilt: '2018', // 8 years old
      distanceToElementary: 400, // > 300m and <= 500m
      distanceToSubway: 1000, // <= 1500m
    });
    expect(ad.adType).toBe('cleaning');
    expect(ad.badge).toBe('입주 & 홈케어');
  });

  it('should handle string yearBuilt formatting correctly', () => {
    const ad: AdBannerDetails = getAdForApartment({
      jeonseRate: 0.60,
      yearBuilt: '2010년 12월 30일', // 16 years old
      distanceToElementary: 500,
    });
    expect(ad.adType).toBe('interior');
    expect(ad.badge).toBe('노후단지 특별혜택');
  });
});
