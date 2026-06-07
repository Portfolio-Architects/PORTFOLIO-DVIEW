import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

// Helper component that throws an error conditionally
const FlakyComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test rendering error');
  }
  return <div data-testid="content">Successful Content</div>;
};

describe('ErrorBoundary Self-Healing & Recovery', () => {
  // Mute console.error output during tests to keep logs clean
  let originalError: typeof console.error;
  beforeAll(() => {
    originalError = console.error;
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary name="Test Boundary">
        <FlakyComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.getByText('Successful Content')).toBeInTheDocument();
  });

  it('displays fallback details when an error is caught', () => {
    render(
      <ErrorBoundary name="Test Boundary">
        <FlakyComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
    expect(screen.getByText('Test Boundary 영역 로드 실패')).toBeInTheDocument();
  });

  it('recovers when manual "다시 시도" button is clicked and error is resolved', () => {
    const { rerender } = render(
      <ErrorBoundary name="Test Boundary">
        <FlakyComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Test Boundary 영역 로드 실패')).toBeInTheDocument();

    // Rerender with the error condition resolved
    rerender(
      <ErrorBoundary name="Test Boundary">
        <FlakyComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    // Click "다시 시도"
    fireEvent.click(screen.getByText('다시 시도'));

    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.queryByText('Test Boundary 영역 로드 실패')).not.toBeInTheDocument();
  });

  it('automatically heals when browser online event fires and error is resolved', () => {
    const { rerender } = render(
      <ErrorBoundary name="Test Boundary">
        <FlakyComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Test Boundary 영역 로드 실패')).toBeInTheDocument();

    // Rerender with the error condition resolved
    rerender(
      <ErrorBoundary name="Test Boundary">
        <FlakyComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    // Dispatch a global 'online' event to simulate network recovery
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.queryByText('Test Boundary 영역 로드 실패')).not.toBeInTheDocument();
  });
});
