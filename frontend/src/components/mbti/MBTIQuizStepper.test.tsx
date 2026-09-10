import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MBTIQuizStepper } from './MBTIQuizStepper';
import { QUIZ_QUESTIONS } from '@/lib/utils/mbtiScoring';

describe('MBTIQuizStepper', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders initial step Q1 correctly', () => {
    const handleComplete = jest.fn();
    render(<MBTIQuizStepper onComplete={handleComplete} />);

    expect(screen.getByTestId('mbti-quiz-stepper')).toBeInTheDocument();
    expect(screen.getByText(/Q1 \/ 7/i)).toBeInTheDocument();
    expect(screen.getByText(QUIZ_QUESTIONS[0].title)).toBeInTheDocument();
    expect(screen.getByTestId('quiz-option-a')).toBeInTheDocument();
    expect(screen.getByTestId('quiz-option-b')).toBeInTheDocument();
  });

  it('progresses to next question on option click and calls onComplete after 7 questions', () => {
    const handleComplete = jest.fn();
    render(<MBTIQuizStepper onComplete={handleComplete} />);

    // Answer 7 questions sequentially
    for (let i = 0; i < 7; i++) {
      expect(screen.getByText(new RegExp(`Q${i + 1} \\/ 7`, 'i'))).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('quiz-option-a'));
      act(() => {
        jest.advanceTimersByTime(250);
      });
    }

    expect(handleComplete).toHaveBeenCalledTimes(1);
    const recordedAnswers = handleComplete.mock.calls[0][0];
    expect(recordedAnswers).toEqual({
      1: 'A',
      2: 'A',
      3: 'A',
      4: 'A',
      5: 'A',
      6: 'A',
      7: 'A',
    });
  });

  it('allows navigating back to previous step', () => {
    const handleComplete = jest.fn();
    const handleCancel = jest.fn();
    render(<MBTIQuizStepper onComplete={handleComplete} onCancel={handleCancel} />);

    // Select Q1
    fireEvent.click(screen.getByTestId('quiz-option-b'));
    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(screen.getByText(/Q2 \/ 7/i)).toBeInTheDocument();

    // Click back button
    fireEvent.click(screen.getByLabelText('이전 질문으로 이동'));
    expect(screen.getByText(/Q1 \/ 7/i)).toBeInTheDocument();
  });
});
