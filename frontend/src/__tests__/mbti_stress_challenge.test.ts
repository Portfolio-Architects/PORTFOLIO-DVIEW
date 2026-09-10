import {
  calculateScores,
  calculateMbtiType,
  getRecommendedProfile,
  QUIZ_QUESTIONS,
  INITIAL_SCORES,
} from '@/lib/utils/mbtiScoring';
import { ALL_MBTI_TYPES, MBTI_PROFILES, TEMPERAMENTS, getProfileByType } from '@/lib/data/mbtiData';
import { MbtiType, MbtiGroup } from '@/types/mbti';
import { FULL_DONG_DATA } from '@/lib/dong-apartments';

describe('MBTI Empirical Stress Challenge & Mathematical Reachability Harness', () => {
  // --------------------------------------------------------------------------
  // 1. Exhaustive Combinatorial Reachability Analysis (2^7 = 128 permutations)
  // --------------------------------------------------------------------------
  describe('Exhaustive 128-Permutation Reachability', () => {
    const totalPermutations = Math.pow(2, QUIZ_QUESTIONS.length); // 2^7 = 128
    const typeDistribution = new Map<MbtiType, number>();
    const typeExampleAnswers = new Map<MbtiType, Record<number, 'A' | 'B'>>();

    beforeAll(() => {
      ALL_MBTI_TYPES.forEach(t => typeDistribution.set(t, 0));

      for (let i = 0; i < totalPermutations; i++) {
        const answers: Record<number, 'A' | 'B'> = {};
        for (let qIdx = 0; qIdx < QUIZ_QUESTIONS.length; qIdx++) {
          const bit = (i >> qIdx) & 1;
          answers[QUIZ_QUESTIONS[qIdx].id] = bit === 0 ? 'A' : 'B';
        }

        const scores = calculateScores(answers);
        const type = calculateMbtiType(scores);

        typeDistribution.set(type, (typeDistribution.get(type) || 0) + 1);
        if (!typeExampleAnswers.has(type)) {
          typeExampleAnswers.set(type, answers);
        }
      }
    });

    it('has exactly 128 distinct answer vectors for 7 binary questions', () => {
      expect(totalPermutations).toBe(128);
    });

    it('verifies that EVERY single one of the 16 MBTI types is reachable (Reachability = 16/16, 100%)', () => {
      const unreachableTypes: MbtiType[] = [];

      ALL_MBTI_TYPES.forEach(t => {
        const count = typeDistribution.get(t) || 0;
        if (count === 0) {
          unreachableTypes.push(t);
        }
      });

      // Distribution details for verification auditing
      const distributionSummary: Record<string, number> = {};
      ALL_MBTI_TYPES.forEach(t => {
        distributionSummary[t] = typeDistribution.get(t) || 0;
      });

      console.log('--- 16 MBTI Combinatorial Frequency Distribution (out of 128 total) ---');
      console.table(distributionSummary);

      expect(unreachableTypes).toEqual([]);
      expect(typeDistribution.size).toBe(16);
      ALL_MBTI_TYPES.forEach(t => {
        expect(typeDistribution.get(t)).toBeGreaterThan(0);
      });
    });

    it('confirms every type resolves to a unique, non-null profile with matching type key', () => {
      for (const [type, answers] of typeExampleAnswers.entries()) {
        const profile = getRecommendedProfile(answers);
        expect(profile).toBeDefined();
        expect(profile.type).toBe(type);
        expect(profile).toBe(MBTI_PROFILES[type]);
      }
    });
  });

  // --------------------------------------------------------------------------
  // 2. Profile Schema & Data Quality Verification (all 16 profiles)
  // --------------------------------------------------------------------------
  describe('MBTI Profile Schema & Authenticity Verification', () => {
    it('contains exactly 16 profile entries matching ALL_MBTI_TYPES', () => {
      expect(ALL_MBTI_TYPES).toHaveLength(16);
      expect(new Set(ALL_MBTI_TYPES).size).toBe(16);
      expect(Object.keys(MBTI_PROFILES)).toHaveLength(16);
      ALL_MBTI_TYPES.forEach(t => {
        expect(MBTI_PROFILES[t]).toBeDefined();
      });
    });

    it('verifies non-empty required text fields: aptName, alias, rationale, tagline, tags', () => {
      ALL_MBTI_TYPES.forEach(type => {
        const profile = MBTI_PROFILES[type];

        // AptName
        expect(profile.aptName).toBeDefined();
        expect(typeof profile.aptName).toBe('string');
        expect(profile.aptName.trim().length).toBeGreaterThan(0);

        // Alias
        expect(profile.alias).toBeDefined();
        expect(typeof profile.alias).toBe('string');
        expect(profile.alias.trim().length).toBeGreaterThan(0);

        // Tagline
        expect(profile.tagline).toBeDefined();
        expect(typeof profile.tagline).toBe('string');
        expect(profile.tagline.trim().length).toBeGreaterThan(0);

        // Rationale / recommendationReason
        expect(profile.recommendationReason).toBeDefined();
        expect(typeof profile.recommendationReason).toBe('string');
        expect(profile.recommendationReason.trim().length).toBeGreaterThan(20);

        // Tags
        expect(Array.isArray(profile.tags)).toBe(true);
        expect(profile.tags.length).toBeGreaterThanOrEqual(3);
        profile.tags.forEach(tag => {
          expect(typeof tag).toBe('string');
          expect(tag.startsWith('#')).toBe(true);
        });

        // Lifestyle fit
        expect(Array.isArray(profile.lifestyleFit)).toBe(true);
        expect(profile.lifestyleFit.length).toBeGreaterThanOrEqual(3);
        profile.lifestyleFit.forEach(fit => {
          expect(typeof fit).toBe('string');
          expect(fit.trim().length).toBeGreaterThan(0);
        });

        // Banner gradient
        expect(typeof profile.bannerGradient).toBe('string');
        expect(profile.bannerGradient.startsWith('from-')).toBe(true);
      });
    });

    it('verifies 5-axis radar metrics are strictly within [0, 100]', () => {
      const validAxes = ['transit', 'nature', 'education', 'commerce', 'futureValue'] as const;

      ALL_MBTI_TYPES.forEach(type => {
        const profile = MBTI_PROFILES[type];
        expect(profile.radar).toBeDefined();

        validAxes.forEach(axis => {
          const score = profile.radar[axis];
          expect(typeof score).toBe('number');
          expect(Number.isFinite(score)).toBe(true);
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
          expect(score).toBeGreaterThan(0); // Not a zero placeholder
        });
      });
    });

    it('verifies proper zoneId and temperament group mappings', () => {
      const allowedGroups: MbtiGroup[] = ['NT', 'NF', 'SJ', 'SP'];
      const allowedZones = [
        'zone-gwangyeok',
        'zone-sibeom',
        'zone-waterfront',
        'zone-techno',
        'zone-metapolis',
        'zone-sinjugeo',
      ];

      ALL_MBTI_TYPES.forEach(type => {
        const profile = MBTI_PROFILES[type];

        // Group check
        expect(allowedGroups).toContain(profile.group);
        expect(TEMPERAMENTS[profile.group]).toBeDefined();

        // MBTI type <-> Temperament alignment verification
        if (type.includes('NT')) expect(profile.group).toBe('NT');
        else if (type.includes('NF')) expect(profile.group).toBe('NF');
        else if (type.includes('S') && type.includes('J')) expect(profile.group).toBe('SJ');
        else if (type.includes('S') && type.includes('P')) expect(profile.group).toBe('SP');

        // Zone check
        expect(allowedZones).toContain(profile.zoneId);
      });
    });

    it('verifies apartment names are real Dongtan complexes present in FULL_DONG_DATA', () => {
      ALL_MBTI_TYPES.forEach(type => {
        const profile = MBTI_PROFILES[type];
        const dongList = FULL_DONG_DATA[profile.dong];

        expect(dongList).toBeDefined();
        expect(dongList).toContain(profile.aptName);
      });
    });
  });

  // --------------------------------------------------------------------------
  // 3. Edge Cases & Resilience Testing
  // --------------------------------------------------------------------------
  describe('Adversarial & Edge Cases', () => {
    it('handles empty answers gracefully with deterministic default', () => {
      const emptyScores = calculateScores({});
      expect(emptyScores).toEqual(INITIAL_SCORES);

      const defaultType = calculateMbtiType(emptyScores);
      expect(defaultType).toBe('ESTJ'); // 0 >= 0 for all dimensions yields ESTJ
      const profile = getRecommendedProfile({});
      expect(profile.type).toBe('ESTJ');
    });

    it('handles partial answers (1 to 6 questions answered) without crashing', () => {
      for (let numAnswered = 1; numAnswered < QUIZ_QUESTIONS.length; numAnswered++) {
        const partialAnswers: Record<number, 'A' | 'B'> = {};
        for (let i = 1; i <= numAnswered; i++) {
          partialAnswers[i] = 'B';
        }
        const scores = calculateScores(partialAnswers);
        const type = calculateMbtiType(scores);
        expect(ALL_MBTI_TYPES).toContain(type);
        const profile = getRecommendedProfile(partialAnswers);
        expect(profile).toBeDefined();
      }
    });

    it('ignores extraneous or invalid question keys without side-effects', () => {
      const noisyAnswers: any = {
        1: 'A',
        2: 'A',
        3: 'A',
        4: 'A',
        5: 'A',
        6: 'A',
        7: 'A',
        999: 'A',
        '-1': 'B',
        foo: 'bar',
      };
      const scores = calculateScores(noisyAnswers);
      const cleanScores = calculateScores({
        1: 'A',
        2: 'A',
        3: 'A',
        4: 'A',
        5: 'A',
        6: 'A',
        7: 'A',
      });
      expect(scores).toEqual(cleanScores);
    });

    it('is strictly deterministic across 10,000 iterations', () => {
      const sampleAnswers: Record<number, 'A' | 'B'> = {
        1: 'A',
        2: 'B',
        3: 'A',
        4: 'B',
        5: 'A',
        6: 'B',
        7: 'A',
      };
      const initialType = calculateMbtiType(calculateScores(sampleAnswers));

      for (let i = 0; i < 10000; i++) {
        const type = calculateMbtiType(calculateScores(sampleAnswers));
        expect(type).toBe(initialType);
      }
    });

    it('getProfileByType performs case-insensitive lookup', () => {
      expect(getProfileByType('entj')?.aptName).toBe('동탄역 롯데캐슬');
      expect(getProfileByType('ENTJ')?.aptName).toBe('동탄역 롯데캐슬');
      expect(getProfileByType('invalid')).toBeUndefined();
    });
  });
});
