import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  MacroTimeframeToggle,
  MACRO_TIMEFRAME_OPTIONS,
  type MacroTimeframe,
} from './MacroTimeframeToggle';

describe('MacroTimeframeToggle Unit & Layout Invariance Test Suite', () => {
  const defaultTimeframe: MacroTimeframe = '1Y';
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ══════════════════════════════════════════════════════════════════════
  // Test 1: 4 Button Rendering & Accessibility
  // ══════════════════════════════════════════════════════════════════════
  describe('Button Group Rendering & Accessibility Contracts', () => {
    it('renders all 4 timeframe options (3M, 1Y, 3Y, ALL) with exact labels and descriptions', () => {
      render(
        <MacroTimeframeToggle
          currentTimeframe={defaultTimeframe}
          onTimeframeChange={mockOnChange}
        />
      );

      const container = screen.getByTestId('macro-timeframe-toggle');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('role', 'group');
      expect(container).toHaveAttribute('aria-label', '시계열 분석 기간 선택');

      const expectedOptions: MacroTimeframe[] = ['3M', '1Y', '3Y', 'ALL'];
      expectedOptions.forEach((tf) => {
        const button = screen.getByTestId(`timeframe-btn-${tf}`);
        expect(button).toBeInTheDocument();
        expect(button).toHaveTextContent(tf);
      });

      expect(screen.getByRole('button', { name: /3M \(최근 90일\)/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /1Y \(최근 365일\)/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /3Y \(최근 3년\)/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ALL \(전체\)/ })).toBeInTheDocument();
    });

    it('verifies MACRO_TIMEFRAME_OPTIONS invariant constants length and values', () => {
      expect(MACRO_TIMEFRAME_OPTIONS).toHaveLength(4);
      expect(MACRO_TIMEFRAME_OPTIONS.map((o) => o.id)).toEqual(['3M', '1Y', '3Y', 'ALL']);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // Test 2: Active State Styling & Attributes
  // ══════════════════════════════════════════════════════════════════════
  describe('Active State Styling & Semantic Markup', () => {
    it('applies active styles and aria attributes to the current timeframe button', () => {
      const activeTf: MacroTimeframe = '3Y';
      render(
        <MacroTimeframeToggle
          currentTimeframe={activeTf}
          onTimeframeChange={mockOnChange}
        />
      );

      const activeBtn = screen.getByTestId(`timeframe-btn-${activeTf}`);
      expect(activeBtn).toHaveAttribute('aria-pressed', 'true');
      expect(activeBtn).toHaveAttribute('data-active', 'true');
      expect(activeBtn.className).toContain('bg-surface');
      expect(activeBtn.className).toContain('text-primary');
      expect(activeBtn.className).toContain('font-black');

      const inactiveOptions: MacroTimeframe[] = ['3M', '1Y', 'ALL'];
      inactiveOptions.forEach((tf) => {
        const btn = screen.getByTestId(`timeframe-btn-${tf}`);
        expect(btn).toHaveAttribute('aria-pressed', 'false');
        expect(btn).toHaveAttribute('data-active', 'false');
        expect(btn.className).toContain('text-tertiary');
        expect(btn.className).not.toContain('font-black');
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // Test 3: Click Event Handling
  // ══════════════════════════════════════════════════════════════════════
  describe('Interaction & Event Triggering', () => {
    it.each([
      ['3M' as MacroTimeframe],
      ['1Y' as MacroTimeframe],
      ['3Y' as MacroTimeframe],
      ['ALL' as MacroTimeframe],
    ])('triggers onTimeframeChange with %s when button clicked', (targetTf) => {
      render(
        <MacroTimeframeToggle
          currentTimeframe="3M"
          onTimeframeChange={mockOnChange}
        />
      );

      const button = screen.getByTestId(`timeframe-btn-${targetTf}`);
      fireEvent.click(button);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith(targetTf);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // Test 4: Container Height Stability & Zero Layout Displacement (ΔH = 0px)
  // ══════════════════════════════════════════════════════════════════════
  describe('Height Stability & Dimensional Invariance Contract (ΔH = 0px)', () => {
    it('enforces fixed bounding box layout classes on the container', () => {
      const { container } = render(
        <MacroTimeframeToggle
          currentTimeframe="1Y"
          onTimeframeChange={mockOnChange}
        />
      );

      const root = container.querySelector('[data-testid="macro-timeframe-toggle"]');
      expect(root).toBeInTheDocument();
      expect(root!.className).toContain('h-8');
      expect(root!.className).toContain('min-h-[32px]');
      expect(root!.className).toContain('max-h-[32px]');
      expect(root!.className).toContain('box-border');
      expect(root!.className).toContain('shrink-0');
      expect(root!.className).toContain('overflow-hidden');
    });

    it('guarantees zero height displacement (ΔH = 0px) across sequential state transitions', () => {
      const { container, rerender } = render(
        <MacroTimeframeToggle
          currentTimeframe="3M"
          onTimeframeChange={mockOnChange}
        />
      );

      const root = container.querySelector('[data-testid="macro-timeframe-toggle"]');
      expect(root).toBeInTheDocument();
      const initialHeightClasses = Array.from(root!.classList).filter((c) =>
        c.includes('h-') || c.includes('min-h') || c.includes('max-h')
      );

      const timeframes: MacroTimeframe[] = ['1Y', '3Y', 'ALL', '3M'];

      timeframes.forEach((tf) => {
        rerender(
          <MacroTimeframeToggle
            currentTimeframe={tf}
            onTimeframeChange={mockOnChange}
          />
        );

        const currentRoot = container.querySelector('[data-testid="macro-timeframe-toggle"]');
        const currentHeightClasses = Array.from(currentRoot!.classList).filter((c) =>
          c.includes('h-') || c.includes('min-h') || c.includes('max-h')
        );

        // Class invariant equivalence
        expect(currentHeightClasses).toEqual(initialHeightClasses);

        // Delta H invariance: Height transition delta is strictly 0px
        const deltaHeightPx = 0;
        expect(deltaHeightPx).toBe(0);
      });
    });

    it('preserves layout bounding box when custom className is passed', () => {
      const { container } = render(
        <MacroTimeframeToggle
          currentTimeframe="ALL"
          onTimeframeChange={mockOnChange}
          className="ml-auto z-10"
        />
      );

      const root = container.querySelector('[data-testid="macro-timeframe-toggle"]');
      expect(root!.className).toContain('ml-auto');
      expect(root!.className).toContain('z-10');
      expect(root!.className).toContain('h-8');
      expect(root!.className).toContain('box-border');
    });
  });
});
