import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SettingsProvider, useSettings, useSettingsValues, useSettingsUi } from './SettingsContext';

describe('SettingsContext Architecture Decoupling Suite', () => {
  function TestConsumer() {
    const { areaUnit, setAreaUnit, theme, setTheme, isSettingsModalOpen, setIsSettingsModalOpen } = useSettings();
    return (
      <div>
        <span data-testid="area-unit">{areaUnit}</span>
        <span data-testid="theme">{theme}</span>
        <span data-testid="modal-status">{isSettingsModalOpen ? 'open' : 'closed'}</span>
        <button onClick={() => setAreaUnit('pyeong')}>Change Area</button>
        <button onClick={() => setTheme('dark')}>Change Theme</button>
        <button onClick={() => setIsSettingsModalOpen(true)}>Open Modal</button>
      </div>
    );
  }

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('renders children without embedding SettingsModal inside the provider', () => {
    render(
      <SettingsProvider>
        <TestConsumer />
      </SettingsProvider>
    );

    expect(screen.getByTestId('area-unit')).toHaveTextContent('m2');
    expect(screen.getByTestId('theme')).toHaveTextContent('system');
    expect(screen.getByTestId('modal-status')).toHaveTextContent('closed');
  });

  it('updates area unit and theme state properly', () => {
    render(
      <SettingsProvider>
        <TestConsumer />
      </SettingsProvider>
    );

    act(() => {
      screen.getByText('Change Area').click();
    });
    expect(screen.getByTestId('area-unit')).toHaveTextContent('pyeong');

    act(() => {
      screen.getByText('Change Theme').click();
    });
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('manages modal open/close state decoupled from modal rendering', () => {
    render(
      <SettingsProvider>
        <TestConsumer />
      </SettingsProvider>
    );

    act(() => {
      screen.getByText('Open Modal').click();
    });
    expect(screen.getByTestId('modal-status')).toHaveTextContent('open');
  });

  it('throws error when useSettings is used outside of SettingsProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useSettings must be used within a SettingsProvider');
    spy.mockRestore();
  });
});
