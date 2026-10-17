import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MortgageLdiSentinelCard } from '../MortgageLdiSentinelCard';

describe('Adversarial Challenge: MortgageLdiSentinelCard Stress & Fuzzing Suite', () => {
  describe('ADV-CARD-01: Boundary Props & Fuzzing Resilience', () => {
    it('should withstand 0, negative, and extreme props without NaN or Infinity text leakage', () => {
      const { container } = render(
        <MortgageLdiSentinelCard
          aptName="아크로리버파크 극단치"
          latestSalePrice={0}
          latestDepositPrice={0}
          jeonseRatio={0}
          householdCount={0}
        />
      );

      expect(container.textContent).not.toContain('NaN');
      expect(container.textContent).not.toContain('Infinity');
      expect(container.textContent).not.toContain('undefined만원');
      expect(container.textContent).not.toContain('null');
    });

    it('should withstand multi-billion won luxury complex (100B KRW / 10,000,000 manwon)', () => {
      const { container } = render(
        <MortgageLdiSentinelCard
          aptName="한남더힐 초고가"
          latestSalePrice={10_000_000}
          latestDepositPrice={6_000_000}
          jeonseRatio={60.0}
        />
      );

      expect(container.textContent).not.toContain('NaN');
      expect(container.textContent).not.toContain('Infinity');
      // Principal should clamp to max slider bound 20억원 (200000 manwon)
      expect(screen.getByText('20억원')).toBeInTheDocument();
    });
  });

  describe('ADV-CARD-02: Interactive Extreme Slider Range Manipulation', () => {
    it('should handle worst-case DSR stress (2000M loan, 20M income, 8.0% interest) with safe clamping', () => {
      render(
        <MortgageLdiSentinelCard
          aptName="스트레스 테스트 단지"
          latestSalePrice={100000}
          latestDepositPrice={50000}
        />
      );

      const principalSlider = screen.getByTestId('principal-slider');
      const incomeSlider = screen.getByTestId('income-slider');
      const rateSlider = screen.getByTestId('rate-slider');

      // Set to extreme worst-case
      fireEvent.change(principalSlider, { target: { value: '200000' } }); // 20억원
      fireEvent.change(incomeSlider, { target: { value: '2000' } });       // 2,000만원
      fireEvent.change(rateSlider, { target: { value: '8.0' } });         // 8.0%

      const badge = screen.getByTestId('dsr-status-badge');
      expect(badge).toHaveTextContent('규제 한도 초과');

      const progressBar = screen.getByTestId('dsr-progress-bar');
      expect(progressBar).toBeInTheDocument();
      // Progress bar should clamp width at 100%
      expect(progressBar).toHaveStyle({ width: '100%' });
    });

    it('should handle best-case minimal loan (10M loan, 300M income, 2.0% interest)', () => {
      render(
        <MortgageLdiSentinelCard
          aptName="최소 레버리지 단지"
          latestSalePrice={100000}
          latestDepositPrice={50000}
        />
      );

      const principalSlider = screen.getByTestId('principal-slider');
      const incomeSlider = screen.getByTestId('income-slider');
      const rateSlider = screen.getByTestId('rate-slider');

      fireEvent.change(principalSlider, { target: { value: '1000' } }); // 1,000만원
      fireEvent.change(incomeSlider, { target: { value: '30000' } });   // 3억원
      fireEvent.change(rateSlider, { target: { value: '2.0' } });       // 2.0%

      const badge = screen.getByTestId('dsr-status-badge');
      expect(badge).toHaveTextContent('한도 여유 (안정)');
    });
  });

  describe('ADV-CARD-03: Tenor & Jeonse Shock Dynamic State Sweeps', () => {
    it('should safely transition through all tenor options (10Y, 20Y, 30Y, 40Y, 50Y)', () => {
      render(<MortgageLdiSentinelCard aptName="만기 스위프 단지" />);

      const tenors = [10, 20, 30, 40, 50];
      for (const t of tenors) {
        const btn = screen.getByTestId(`tenor-${t}-btn`);
        fireEvent.click(btn);
        expect(screen.getByText(`${t}년 (${t * 12}개월)`)).toBeInTheDocument();
      }
    });

    it('should safely transition through all jeonse shock options (5% to 30%)', () => {
      render(
        <MortgageLdiSentinelCard
          aptName="역전세 스위프 단지"
          latestDepositPrice={60000} // 6억원
        />
      );

      const shocks = [5, 10, 15, 20, 25, 30];
      for (const s of shocks) {
        const btn = screen.getByTestId(`jeonse-shock-${s}-btn`);
        fireEvent.click(btn);
        const alert = screen.getByTestId('jeonse-shortfall-alert');
        expect(alert).toHaveTextContent(`만기 시 보증금 반환 결손액 발생 위험 (${s}% 하락 시)`);
      }
    });
  });
});
