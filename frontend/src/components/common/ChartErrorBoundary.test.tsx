import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChartErrorBoundary from './ChartErrorBoundary';

const ProblemChild = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Chart SVG Render Error');
  }
  return <div data-testid="chart-content">Chart rendered cleanly</div>;
};

describe('ChartErrorBoundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it('renders children when there is no error', () => {
    render(
      <ChartErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </ChartErrorBoundary>
    );

    expect(screen.getByTestId('chart-content')).toBeInTheDocument();
  });

  it('catches render error and displays fallback UI', () => {
    render(
      <ChartErrorBoundary fallbackText="차트를 불러오는 중 오류가 발생했습니다.">
        <ProblemChild shouldThrow={true} />
      </ChartErrorBoundary>
    );

    expect(screen.getByText('차트를 불러오는 중 오류가 발생했습니다.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
  });

  it('resets error state when clicking retry button', () => {
    let shouldThrow = true;
    const DynamicProblemChild = () => {
      if (shouldThrow) {
        throw new Error('Chart SVG Render Error');
      }
      return <div data-testid="chart-content">Chart rendered cleanly</div>;
    };

    render(
      <ChartErrorBoundary>
        <DynamicProblemChild />
      </ChartErrorBoundary>
    );

    expect(screen.getByText('차트 데이터를 불러오는 중 오류가 발생했습니다.')).toBeInTheDocument();

    // Resolve failure condition before clicking retry button
    shouldThrow = false;
    const retryBtn = screen.getByRole('button', { name: '다시 시도' });
    fireEvent.click(retryBtn);

    expect(screen.getByTestId('chart-content')).toBeInTheDocument();
  });
});
