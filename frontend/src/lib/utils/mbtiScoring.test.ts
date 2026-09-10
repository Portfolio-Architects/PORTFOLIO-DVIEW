import {
  calculateScores,
  calculateMbtiType,
  getRecommendedProfile,
  QUIZ_QUESTIONS,
} from './mbtiScoring';
import { ALL_MBTI_TYPES, MBTI_PROFILES } from '@/lib/data/mbtiData';
import { MbtiType } from '@/types/mbti';

describe('mbtiScoring logic', () => {
  it('has exactly 7 questions defined with options A and B', () => {
    expect(QUIZ_QUESTIONS).toHaveLength(7);
    QUIZ_QUESTIONS.forEach((q, idx) => {
      expect(q.id).toBe(idx + 1);
      expect(q.title).toBeTruthy();
      expect(q.optionA).toBeDefined();
      expect(q.optionB).toBeDefined();
    });
  });

  it('calculates all A answers to ESTJ', () => {
    const answers: Record<number, 'A' | 'B'> = {
      1: 'A',
      2: 'A',
      3: 'A',
      4: 'A',
      5: 'A',
      6: 'A',
      7: 'A',
    };
    const scores = calculateScores(answers);
    expect(scores.E).toBeGreaterThan(scores.I);
    expect(scores.S).toBeGreaterThan(scores.N);
    expect(scores.T).toBeGreaterThan(scores.F);
    expect(scores.J).toBeGreaterThan(scores.P);

    const type = calculateMbtiType(scores);
    expect(type).toBe('ESTJ');

    const profile = getRecommendedProfile(answers);
    expect(profile.type).toBe('ESTJ');
    expect(profile.aptName).toBe('동탄역 시범 더샵 센트럴시티');
  });

  it('calculates all B answers to INFP', () => {
    const answers: Record<number, 'A' | 'B'> = {
      1: 'B',
      2: 'B',
      3: 'B',
      4: 'B',
      5: 'B',
      6: 'B',
      7: 'B',
    };
    const scores = calculateScores(answers);
    expect(scores.I).toBeGreaterThan(scores.E);
    expect(scores.N).toBeGreaterThan(scores.S);
    expect(scores.F).toBeGreaterThan(scores.T);
    expect(scores.P).toBeGreaterThan(scores.J);

    const type = calculateMbtiType(scores);
    expect(type).toBe('INFP');

    const profile = getRecommendedProfile(answers);
    expect(profile.type).toBe('INFP');
    expect(profile.aptName).toBe('힐스테이트 동탄포레');
  });

  it('can generate all 16 MBTI types with genuine answer combinations', () => {
    const reachableTypes = new Set<MbtiType>();

    const answerCombinations: Record<MbtiType, Record<number, 'A' | 'B'>> = {
      ENTJ: { 1: 'A', 2: 'B', 3: 'B', 4: 'A', 5: 'A', 6: 'A', 7: 'A' },
      INTJ: { 1: 'B', 2: 'B', 3: 'B', 4: 'A', 5: 'B', 6: 'A', 7: 'A' },
      ENTP: { 1: 'A', 2: 'B', 3: 'B', 4: 'A', 5: 'A', 6: 'B', 7: 'B' },
      INTP: { 1: 'B', 2: 'B', 3: 'B', 4: 'A', 5: 'B', 6: 'B', 7: 'B' },
      ESTJ: { 1: 'A', 2: 'A', 3: 'A', 4: 'A', 5: 'A', 6: 'A', 7: 'A' },
      ISTJ: { 1: 'B', 2: 'A', 3: 'A', 4: 'A', 5: 'B', 6: 'A', 7: 'A' },
      ESTP: { 1: 'A', 2: 'A', 3: 'A', 4: 'A', 5: 'A', 6: 'B', 7: 'B' },
      ISTP: { 1: 'B', 2: 'A', 3: 'A', 4: 'A', 5: 'B', 6: 'B', 7: 'B' },
      ENFJ: { 1: 'A', 2: 'B', 3: 'B', 4: 'B', 5: 'B', 6: 'A', 7: 'A' },
      INFJ: { 1: 'B', 2: 'B', 3: 'B', 4: 'B', 5: 'B', 6: 'A', 7: 'A' },
      ENFP: { 1: 'A', 2: 'B', 3: 'B', 4: 'B', 5: 'B', 6: 'B', 7: 'B' },
      INFP: { 1: 'B', 2: 'B', 3: 'B', 4: 'B', 5: 'B', 6: 'B', 7: 'B' },
      ESFJ: { 1: 'A', 2: 'A', 3: 'A', 4: 'B', 5: 'B', 6: 'A', 7: 'A' },
      ISFJ: { 1: 'B', 2: 'A', 3: 'A', 4: 'B', 5: 'B', 6: 'A', 7: 'A' },
      ESFP: { 1: 'A', 2: 'A', 3: 'A', 4: 'B', 5: 'B', 6: 'B', 7: 'B' },
      ISFP: { 1: 'B', 2: 'A', 3: 'A', 4: 'B', 5: 'B', 6: 'B', 7: 'B' },
    };

    for (const expectedType of ALL_MBTI_TYPES) {
      const answers = answerCombinations[expectedType];
      const scores = calculateScores(answers);
      const calculated = calculateMbtiType(scores);
      expect(calculated).toBe(expectedType);
      reachableTypes.add(calculated);

      const profile = getRecommendedProfile(answers);
      expect(profile).toBe(MBTI_PROFILES[expectedType]);
      expect(profile.type).toBe(expectedType);
      expect(profile.radar).toBeDefined();
      expect(profile.tags.length).toBeGreaterThanOrEqual(3);
    }

    expect(reachableTypes.size).toBe(16);
  });
});
