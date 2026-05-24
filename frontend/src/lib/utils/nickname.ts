/**
 * @module nickname
 * @description Generates random Dongtan Mom-cafe style nicknames for community engagement.
 */

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

/**
 * Generates a random Korean nickname tailored to the Dongtan local community (e.g. '송동 러블리남매맘').
 */
export function generateMamacafeNickname(): string {
  const area = DONGTAN_AREAS[Math.floor(Math.random() * DONGTAN_AREAS.length)];
  const modifier = MODIFIERS[Math.floor(Math.random() * MODIFIERS.length)];
  const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
  return `${area} ${modifier}${suffix}`;
}
