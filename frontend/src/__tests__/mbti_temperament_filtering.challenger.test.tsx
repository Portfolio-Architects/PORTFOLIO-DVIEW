import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MBTIEncyclopedia } from '@/components/mbti/MBTIEncyclopedia';
import { ALL_MBTI_TYPES, MBTI_PROFILES, TEMPERAMENTS } from '@/lib/data/mbtiData';
import { MbtiGroup } from '@/types/mbti';

describe('Challenger Stress Test: MBTI Encyclopedia Filtering (All, NT, NF, SJ, SP)', () => {
  const groups: MbtiGroup[] = ['NT', 'NF', 'SJ', 'SP'];

  it('verifies that each temperament tab filters exactly to its 4 respective profiles and excludes all others', () => {
    render(<MBTIEncyclopedia />);

    groups.forEach((group) => {
      // Click the tab
      const tabBtn = screen.getByTestId(`filter-tab-${group}`);
      fireEvent.click(tabBtn);

      const expectedTypes = ALL_MBTI_TYPES.filter((t) => MBTI_PROFILES[t].group === group);
      const excludedTypes = ALL_MBTI_TYPES.filter((t) => MBTI_PROFILES[t].group !== group);

      expect(expectedTypes).toHaveLength(4);
      expect(excludedTypes).toHaveLength(12);

      // Verify all expected profiles are rendered
      expectedTypes.forEach((type) => {
        expect(screen.getByTestId(`profile-card-${type}`)).toBeInTheDocument();
      });

      // Verify all excluded profiles are NOT rendered
      excludedTypes.forEach((type) => {
        expect(screen.queryByTestId(`profile-card-${type}`)).not.toBeInTheDocument();
      });
    });

    // Verify ALL tab restores all 16 profiles
    const allTab = screen.getByTestId('filter-tab-ALL');
    fireEvent.click(allTab);

    ALL_MBTI_TYPES.forEach((type) => {
      expect(screen.getByTestId(`profile-card-${type}`)).toBeInTheDocument();
    });
  });

  it('stress tests tab switching combined with text search queries and clearing', () => {
    render(<MBTIEncyclopedia />);

    // 1. Select NF tab
    fireEvent.click(screen.getByTestId('filter-tab-NF'));
    expect(screen.getByTestId('profile-card-INFJ')).toBeInTheDocument();
    expect(screen.getByTestId('profile-card-ENFP')).toBeInTheDocument();

    // 2. Search for '호수공원' (relevant to ENFP or others)
    const searchInput = screen.getByPlaceholderText('단지명, MBTI, 동 검색...');
    fireEvent.change(searchInput, { target: { value: '호수공원' } });

    // In NF group, find which profiles have '호수공원' in aptName, alias, tags, etc.
    const nfWithLake = ALL_MBTI_TYPES.filter(
      (t) =>
        MBTI_PROFILES[t].group === 'NF' &&
        (MBTI_PROFILES[t].aptName.includes('호수공원') ||
          MBTI_PROFILES[t].tags.some((tag) => tag.includes('호수공원')) ||
          MBTI_PROFILES[t].alias.includes('호수공원'))
    );

    nfWithLake.forEach((t) => {
      expect(screen.getByTestId(`profile-card-${t}`)).toBeInTheDocument();
    });

    // 3. Search for non-existent string in NF
    fireEvent.change(searchInput, { target: { value: 'XYZNONEXISTENT' } });
    ALL_MBTI_TYPES.forEach((t) => {
      expect(screen.queryByTestId(`profile-card-${t}`)).not.toBeInTheDocument();
    });

    // 4. Clear search and switch to SP
    fireEvent.change(searchInput, { target: { value: '' } });
    fireEvent.click(screen.getByTestId('filter-tab-SP'));

    const spTypes = ALL_MBTI_TYPES.filter((t) => MBTI_PROFILES[t].group === 'SP');
    expect(spTypes).toHaveLength(4);
    spTypes.forEach((t) => {
      expect(screen.getByTestId(`profile-card-${t}`)).toBeInTheDocument();
    });
    expect(screen.queryByTestId('profile-card-INFJ')).not.toBeInTheDocument();
  });

  it('validates temperament metadata and labels match domain specifications', () => {
    expect(TEMPERAMENTS.NT.label).toBe('분석가형');
    expect(TEMPERAMENTS.NF.label).toBe('외교관형');
    expect(TEMPERAMENTS.SJ.label).toBe('관리자형');
    expect(TEMPERAMENTS.SP.label).toBe('탐험가형');

    groups.forEach((group) => {
      const typesInGroup = ALL_MBTI_TYPES.filter((t) => MBTI_PROFILES[t].group === group);
      expect(typesInGroup).toHaveLength(4);
      expect(TEMPERAMENTS[group].color).toMatch(/^#/);
    });
  });
});
