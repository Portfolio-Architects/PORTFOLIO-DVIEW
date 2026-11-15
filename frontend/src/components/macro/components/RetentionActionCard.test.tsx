import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RetentionActionCard } from './RetentionActionCard';
import { AptFitFinderCard } from './AptFitFinderCard';

const mockTriggerCustomA2HSModal = jest.fn();
jest.mock('@/components/pwa/PWAProvider', () => ({
  usePWA: () => ({
    triggerCustomA2HSModal: mockTriggerCustomA2HSModal,
  }),
}));

describe('RetentionActionCard Component Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dual retention action buttons without separated AptFitFinder card content', () => {
    render(
      <RetentionActionCard
        selectedAptName="동탄역 롯데캐슬"
        onOpenPushModal={jest.fn()}
      />
    );

    expect(screen.getByTestId('retention-action-card')).toBeInTheDocument();
    expect(screen.getByText('오전 7시 실거래 알림 받기')).toBeInTheDocument();
    expect(screen.getByText('홈 화면에 앱 추가')).toBeInTheDocument();
    expect(screen.queryByTestId('apt-fit-finder-cta')).not.toBeInTheDocument();
    expect(screen.queryByText(/내게 맞는 단지 찾기/)).not.toBeInTheDocument();
  });

  it('triggers onOpenPushModal with selected apartment name when push button is clicked', () => {
    const handleOpenPushModal = jest.fn();

    render(
      <RetentionActionCard
        selectedAptName="동탄역 롯데캐슬"
        onOpenPushModal={handleOpenPushModal}
      />
    );

    const pushBtn = screen.getByText('오전 7시 실거래 알림 받기').closest('button');
    expect(pushBtn).not.toBeNull();
    if (pushBtn) {
      fireEvent.click(pushBtn);
      expect(handleOpenPushModal).toHaveBeenCalledWith('동탄역 롯데캐슬');
    }
  });

  it('triggers A2HS action when home screen button is clicked', () => {
    const handleOpenA2HS = jest.fn();

    render(
      <RetentionActionCard
        onOpenPushModal={jest.fn()}
        onOpenA2HSModal={handleOpenA2HS}
      />
    );

    const a2hsBtn = screen.getByText('홈 화면에 앱 추가').closest('button');
    expect(a2hsBtn).not.toBeNull();
    if (a2hsBtn) {
      fireEvent.click(a2hsBtn);
      expect(handleOpenA2HS).toHaveBeenCalled();
    }
  });
});

describe('AptFitFinderCard Component Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders independent AptFitFinderCard with bg-elevated rounded-2xl surface', () => {
    render(<AptFitFinderCard />);

    const card = screen.getByTestId('apt-fit-finder-card');
    expect(card).toBeInTheDocument();
    expect(card.className).toContain('bg-elevated');
    expect(card.className).toContain('rounded-2xl');
    expect(screen.getByRole('heading', { name: '내게 맞는 단지 찾기' })).toBeInTheDocument();
    expect(screen.getByText('3억 ~ 14억+')).toBeInTheDocument();
    expect(screen.getByText('초품아 · 학원')).toBeInTheDocument();
    expect(screen.getByText('GTX · 트램')).toBeInTheDocument();
    expect(screen.getByTestId('apt-fit-finder-cta')).toBeInTheDocument();
  });

  it('triggers onOpenAptFitFinder when CTA button is clicked', () => {
    const handleOpenQuiz = jest.fn();

    render(<AptFitFinderCard onOpenAptFitFinder={handleOpenQuiz} />);

    const quizBtn = screen.getByTestId('apt-fit-finder-cta');
    fireEvent.click(quizBtn);
    expect(handleOpenQuiz).toHaveBeenCalledTimes(1);
  });
});
