import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RetentionActionCard } from './RetentionActionCard';

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

  it('renders dual retention action buttons and quick tool button', () => {
    render(
      <RetentionActionCard
        selectedAptName="동탄역 롯데캐슬"
        onOpenPushModal={jest.fn()}
      />
    );

    expect(screen.getByTestId('retention-action-card')).toBeInTheDocument();
    expect(screen.getByText('오전 7시 실거래 알림 받기')).toBeInTheDocument();
    expect(screen.getByText('홈 화면에 앱 추가')).toBeInTheDocument();
    expect(screen.getByText('내게 맞는 단지 찾기 (AptFitFinder)')).toBeInTheDocument();
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

  it('triggers onOpenAptFitFinder when quick tool button is clicked', () => {
    const handleOpenQuiz = jest.fn();

    render(
      <RetentionActionCard
        onOpenPushModal={jest.fn()}
        onOpenAptFitFinder={handleOpenQuiz}
      />
    );

    const quizBtn = screen.getByText('내게 맞는 단지 찾기 (AptFitFinder)').closest('button');
    expect(quizBtn).not.toBeNull();
    if (quizBtn) {
      fireEvent.click(quizBtn);
      expect(handleOpenQuiz).toHaveBeenCalled();
    }
  });
});
