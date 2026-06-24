import { generateMamacafeNickname } from './nickname';

describe('Nickname Generator Utilities', () => {
  it('should generate a valid nickname following the format [Area] [Modifier][Suffix]', () => {
    const DONGTAN_AREAS = [
      '청계동', '영천동', '오산동', '송동', '목동', '산척동', '반송동', 
      '석우동', '능동', '장지동', '동탄역', '호수공원', '센트럴파크', '시범단지'
    ];
    const MODIFIERS = [
      '러블리', '스위트', '행복한', '건강한', '스마일', '든든한', 
      '지혜로운', '상냥한', '따뜻한', '다정한', '슬기로운', '명랑한',
      '친근한', '신나는', '긍정적인', '기분좋은'
    ];
    const SUFFIXES = [
      '맘', '대디', '이모', '삼촌', '러버', '둥이맘', '남매맘', 
      '형제맘', '자매맘', '초보맘', '워킹맘', '육아대디'
    ];

    for (let i = 0; i < 100; i++) {
      const nickname = generateMamacafeNickname();
      expect(typeof nickname).toBe('string');
      
      const parts = nickname.split(' ');
      expect(parts).toHaveLength(2);
      
      const [area, remainder] = parts;
      expect(DONGTAN_AREAS).toContain(area);
      
      // Verify remainder starts with one of MODIFIERS and ends with one of SUFFIXES
      const matchedModifier = MODIFIERS.find(m => remainder.startsWith(m));
      expect(matchedModifier).toBeDefined();
      
      const matchedSuffix = SUFFIXES.find(s => remainder.endsWith(s));
      expect(matchedSuffix).toBeDefined();
    }
  });
});
