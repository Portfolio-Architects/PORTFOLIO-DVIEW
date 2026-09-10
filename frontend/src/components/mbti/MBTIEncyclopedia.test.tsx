import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MBTIEncyclopedia } from './MBTIEncyclopedia';
import { ALL_MBTI_TYPES } from '@/lib/data/mbtiData';

describe('MBTIEncyclopedia', () => {
  it('renders all 16 MBTI cards on initial load', () => {
    render(<MBTIEncyclopedia />);

    expect(screen.getByTestId('mbti-encyclopedia')).toBeInTheDocument();
    ALL_MBTI_TYPES.forEach((type) => {
      expect(screen.getByTestId(`profile-card-${type}`)).toBeInTheDocument();
    });
  });

  it('filters profiles when temperament tab is selected', () => {
    render(<MBTIEncyclopedia />);

    // Click 'NT' tab
    const ntTab = screen.getByTestId('filter-tab-NT');
    fireEvent.click(ntTab);

    // Should render ENTJ, INTJ, ENTP, INTP
    expect(screen.getByTestId('profile-card-ENTJ')).toBeInTheDocument();
    expect(screen.getByTestId('profile-card-INTJ')).toBeInTheDocument();
    expect(screen.getByTestId('profile-card-ENTP')).toBeInTheDocument();
    expect(screen.getByTestId('profile-card-INTP')).toBeInTheDocument();

    // Should NOT render ESTJ
    expect(screen.queryByTestId('profile-card-ESTJ')).not.toBeInTheDocument();
  });

  it('filters profiles by search input query', () => {
    render(<MBTIEncyclopedia />);

    const searchInput = screen.getByPlaceholderText('단지명, MBTI, 동 검색...');
    fireEvent.change(searchInput, { target: { value: '롯데캐슬' } });

    expect(screen.getByTestId('profile-card-ENTJ')).toBeInTheDocument();
    expect(screen.queryByTestId('profile-card-INTJ')).not.toBeInTheDocument();
  });

  it('calls onSelectProfile when a card is clicked', () => {
    const handleSelect = jest.fn();
    render(<MBTIEncyclopedia onSelectProfile={handleSelect} />);

    const entjCard = screen.getByTestId('profile-card-ENTJ');
    fireEvent.click(entjCard);

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect.mock.calls[0][0].type).toBe('ENTJ');
  });

  it('calls onStartQuiz when start quiz button is clicked', () => {
    const handleStartQuiz = jest.fn();
    render(<MBTIEncyclopedia onStartQuiz={handleStartQuiz} />);

    const startBtn = screen.getByTestId('encyclopedia-start-quiz');
    fireEvent.click(startBtn);

    expect(handleStartQuiz).toHaveBeenCalledTimes(1);
  });
});
