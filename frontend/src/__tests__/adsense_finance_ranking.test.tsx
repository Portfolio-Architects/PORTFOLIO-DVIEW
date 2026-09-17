import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import {
  calculatePolicyLoan,
  calculateMonthlyAmortization,
} from '@/lib/utils/policyLoanCalculators';
import {
  evaluateJeonseSafety,
  calculateJeonseSafety,
} from '@/lib/utils/jeonseSafetyCalculators';
import {
  calculateNewHighRankings,
  calculateOptimalGapRankings,
  calculateWeeklySurgeRankings,
  getRealtimeRankings,
  calculateRealtimeRankings,
  FALLBACK_RANKINGS,
} from '@/lib/utils/rankingCalculations';
import { PolicyLoanQuickWidget } from '@/components/finance/PolicyLoanQuickWidget';
import { JeonseGuaranteeQuickPreview } from '@/components/finance/JeonseGuaranteeQuickPreview';
import { HighCpcFinanceSection } from '@/components/finance/HighCpcFinanceSection';
import { RealtimeRankingBoard } from '@/components/ranking/RealtimeRankingBoard';

describe('AdSense High-CPC Finance & Realtime Ranking 4-Tier Comprehensive Test Suite', () => {
  // =========================================================================
  // TIER 1: Feature Coverage (Core engines and component baseline rendering)
  // =========================================================================
  describe('Tier 1: Feature Coverage', () => {
    it('1.1 calculates standard amortized monthly payments accurately', () => {
      // 3억 원, 연 3.0%, 30년 (360개월)
      const payment = calculateMonthlyAmortization(300_000_000, 3.0, 30);
      expect(payment).toBeGreaterThan(1_200_000);
      expect(payment).toBeLessThan(1_300_000);

      // 0원 또는 0년인 경우 0 반환
      expect(calculateMonthlyAmortization(0, 3.0, 30)).toBe(0);
      expect(calculateMonthlyAmortization(300_000_000, 3.0, 0)).toBe(0);
    });

    it('1.2 calculates policy loans for all three policy types', () => {
      // 신생아 특례
      const newborn = calculatePolicyLoan({
        loanType: 'NEWBORN',
        homePriceWon: 700_000_000,
        annualIncomeWon: 80_000_000,
      });
      expect(newborn.isEligible).toBe(true);
      expect(newborn.maxLimitWon).toBe(490_000_000);
      expect(newborn.estimatedRatePercent).toBe(1.6);
      expect(newborn.monthlyPaymentWon).toBeGreaterThan(0);

      // 디딤돌
      const didimdol = calculatePolicyLoan({
        loanType: 'DIDIMDOL',
        homePriceWon: 500_000_000,
        annualIncomeWon: 50_000_000,
      });
      expect(didimdol.isEligible).toBe(true);
      expect(didimdol.estimatedRatePercent).toBe(2.65);

      // 보금자리론
      const bogeum = calculatePolicyLoan({
        loanType: 'BOGEUMJARI',
        homePriceWon: 600_000_000,
        annualIncomeWon: 70_000_000,
      });
      expect(bogeum.isEligible).toBe(true);
      expect(bogeum.estimatedRatePercent).toBe(3.95);
    });

    it('1.3 evaluates jeonse guarantee safety and 126% rule metrics', () => {
      const res = evaluateJeonseSafety({
        estimatedPriceWon: 600_000_000,
        seniorMortgageWon: 0,
        jeonseDepositWon: 350_000_000,
      });
      expect(res.isHugGuaranteed).toBe(true);
      expect(res.riskLevel).toBe('SAFE');
      expect(res.debtRatioPercent).toBeLessThan(75);
      expect(res.totalDebtWon).toBe(350_000_000);
      expect(res.officialPriceEstimatedWon).toBe(420_000_000);
    });

    it('1.4 verifies calculateJeonseSafety alias parity', () => {
      const res1 = evaluateJeonseSafety({
        estimatedPriceWon: 500_000_000,
        seniorMortgageWon: 50_000_000,
        jeonseDepositWon: 300_000_000,
      });
      const res2 = calculateJeonseSafety({
        estimatedPriceWon: 500_000_000,
        seniorMortgageWon: 50_000_000,
        jeonseDepositWon: 300_000_000,
      });
      expect(res1).toEqual(res2);
    });

    it('1.5 aggregates realtime rankings with 3 distinct categories', () => {
      const data = getRealtimeRankings(null, null);
      expect(data.newHighList.length).toBe(10);
      expect(data.optimalGapList.length).toBe(10);
      expect(data.weeklySurgeList.length).toBe(10);
      expect(data.newHighList[0].apartmentName).toBe('동탄역 롯데캐슬');
    });

    it('1.6 renders baseline HighCpcFinanceSection with both child widgets', () => {
      render(<HighCpcFinanceSection />);
      expect(screen.getByTestId('high-cpc-finance-section')).toBeInTheDocument();
      expect(screen.getByTestId('policy-loan-quick-widget')).toBeInTheDocument();
      expect(screen.getByTestId('jeonse-guarantee-quick-preview')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // TIER 2: Boundary & Edge Cases
  // =========================================================================
  describe('Tier 2: Boundary & Edge Cases', () => {
    it('2.1 rejects policy loan when home price is 0 or income is negative', () => {
      const res1 = calculatePolicyLoan({
        loanType: 'NEWBORN',
        homePriceWon: 0,
        annualIncomeWon: 50_000_000,
      });
      expect(res1.isEligible).toBe(false);
      expect(res1.ineligibleReason).toContain('올바른 주택가격');

      const res2 = calculatePolicyLoan({
        loanType: 'NEWBORN',
        homePriceWon: 500_000_000,
        annualIncomeWon: -1,
      });
      expect(res2.isEligible).toBe(false);
    });

    it('2.2 rejects newborn loan exceeding 9억 or income exceeding 2억', () => {
      const priceExceeded = calculatePolicyLoan({
        loanType: 'NEWBORN',
        homePriceWon: 950_000_000,
        annualIncomeWon: 80_000_000,
      });
      expect(priceExceeded.isEligible).toBe(false);
      expect(priceExceeded.ineligibleReason).toContain('9억 원 초과');

      const incomeExceeded = calculatePolicyLoan({
        loanType: 'NEWBORN',
        homePriceWon: 800_000_000,
        annualIncomeWon: 250_000_000,
        isDualIncome: true,
      });
      expect(incomeExceeded.isEligible).toBe(false);
      expect(incomeExceeded.ineligibleReason).toContain('소득 2억 원 초과');
    });

    it('2.3 rejects Didimdol when income exceeds 8,500만원', () => {
      const res = calculatePolicyLoan({
        loanType: 'DIDIMDOL',
        homePriceWon: 500_000_000,
        annualIncomeWon: 90_000_000,
      });
      expect(res.isEligible).toBe(false);
      expect(res.ineligibleReason).toContain('8,500만 원 초과');
    });

    it('2.4 handles boundary and invalid inputs in jeonse safety diagnosis', () => {
      const invalid = evaluateJeonseSafety({
        estimatedPriceWon: 0,
        seniorMortgageWon: 0,
        jeonseDepositWon: 0,
      });
      expect(invalid.isHugGuaranteed).toBe(false);
      expect(invalid.guaranteeLimitWon).toBe(0);

      // Senior mortgage exceeding 60% of guarantee limit
      const dangerousMortgage = evaluateJeonseSafety({
        estimatedPriceWon: 500_000_000, // 5억 (가액 약 4.41억~4.5억)
        seniorMortgageWon: 300_000_000, // > 60%
        jeonseDepositWon: 100_000_000,
      });
      expect(dangerousMortgage.isHugGuaranteed).toBe(false);
      expect(dangerousMortgage.riskLevel).toBe('DANGER');
      expect(dangerousMortgage.ineligibleReason).toContain('선순위 근저당이 주택가격의 60%를 초과');

      // Total debt exceeding guarantee limit (126% rule violation)
      const overLimit = evaluateJeonseSafety({
        estimatedPriceWon: 500_000_000,
        seniorMortgageWon: 100_000_000,
        jeonseDepositWon: 420_000_000, // 합 5.2억 > 4.41억
      });
      expect(overLimit.isHugGuaranteed).toBe(false);
      expect(overLimit.riskLevel).toBe('DANGER');
      expect(overLimit.ineligibleReason).toContain('초과');
    });

    it('2.5 gracefully handles empty transactions or summaries in ranking engine', () => {
      const newHigh = calculateNewHighRankings([], []);
      expect(newHigh.length).toBe(10);
      expect(newHigh[0].apartmentName).toBe('동탄역 롯데캐슬');

      const gap = calculateOptimalGapRankings(null, null);
      expect(gap.length).toBe(10);

      const surge = calculateWeeklySurgeRankings([], []);
      expect(surge.length).toBe(10);
    });
  });

  // =========================================================================
  // TIER 3: User Interactions & Callbacks
  // =========================================================================
  describe('Tier 3: User Interactions & Callbacks', () => {
    it('3.1 interacts with PolicyLoanQuickWidget tabs and presets', () => {
      const mockModal = jest.fn();
      render(<PolicyLoanQuickWidget onOpenMortgageModal={mockModal} />);

      expect(screen.getByTestId('policy-loan-quick-widget')).toBeInTheDocument();

      // Click 디딤돌 대출 tab
      const didimdolTab = screen.getByRole('button', { name: '디딤돌 대출' });
      fireEvent.click(didimdolTab);
      expect(didimdolTab).toHaveClass('text-brand-orange');

      // Click 보금자리론 tab
      const bogeumTab = screen.getByRole('button', { name: '보금자리론' });
      fireEvent.click(bogeumTab);
      expect(bogeumTab).toHaveClass('text-brand-orange');

      // Click price preset button (5억)
      const price5 = screen.getByRole('button', { name: '5억' });
      fireEvent.click(price5);
      expect(price5).toHaveClass('bg-brand-orange');

      // Click CTA button
      const ctaBtn = screen.getByRole('button', { name: /정밀 정책자금 한도 계산기 열기/ });
      fireEvent.click(ctaBtn);
      expect(mockModal).toHaveBeenCalledTimes(1);
    });

    it('3.2 interacts with JeonseGuaranteeQuickPreview presets and CTA', () => {
      const mockModal = jest.fn();
      render(<JeonseGuaranteeQuickPreview onOpenJeonseSafetyModal={mockModal} />);

      expect(screen.getByTestId('jeonse-guarantee-quick-preview')).toBeInTheDocument();

      // Click deposit preset (3억)
      const dep3 = screen.getByRole('button', { name: '3억' });
      fireEvent.click(dep3);
      expect(dep3).toHaveClass('bg-brand-orange');

      // Click mortgage preset (5천만)
      const mort5 = screen.getByRole('button', { name: '5천만' });
      fireEvent.click(mort5);
      expect(mort5).toHaveClass('bg-brand-orange');

      // Click CTA
      const cta = screen.getByRole('button', { name: /내 전세 계약서 안심 4단계 정밀진단/ });
      fireEvent.click(cta);
      expect(mockModal).toHaveBeenCalledTimes(1);
    });

    it('3.3 switches tabs and clicks ranking items in RealtimeRankingBoard', () => {
      const mockSelectComplex = jest.fn();
      render(<RealtimeRankingBoard onSelectComplex={mockSelectComplex} />);

      expect(screen.getByTestId('realtime-ranking-board')).toBeInTheDocument();

      // Tab 2: 갭 최적
      const gapTab = screen.getByTestId('ranking-tab-gap');
      fireEvent.click(gapTab);
      expect(gapTab).toHaveClass('text-brand-orange');
      expect(screen.getAllByText(/갭 1\./).length).toBeGreaterThanOrEqual(1);

      // Tab 3: 거래량 급증
      const surgeTab = screen.getByTestId('ranking-tab-surge');
      fireEvent.click(surgeTab);
      expect(surgeTab).toHaveClass('text-brand-orange');
      expect(screen.getAllByText(/주간 \d+건/).length).toBeGreaterThanOrEqual(1);

      // Click row
      const firstRow = screen.getByTestId('ranking-item-1');
      fireEvent.click(firstRow);
      expect(mockSelectComplex).toHaveBeenCalledWith(expect.any(String));
    });

    it('3.4 verifies HighCpcFinanceSection passes deep-link callbacks down', () => {
      const mockMortgage = jest.fn();
      const mockJeonse = jest.fn();

      render(
        <HighCpcFinanceSection
          onOpenMortgageModal={mockMortgage}
          onOpenJeonseSafetyModal={mockJeonse}
        />
      );

      const mortgageCta = screen.getByRole('button', { name: /정밀 정책자금 한도 계산기 열기/ });
      fireEvent.click(mortgageCta);
      expect(mockMortgage).toHaveBeenCalledTimes(1);

      const jeonseCta = screen.getByRole('button', { name: /내 전세 계약서 안심 4단계 정밀진단/ });
      fireEvent.click(jeonseCta);
      expect(mockJeonse).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // TIER 4: Real-World Scenarios
  // =========================================================================
  describe('Tier 4: Real-World Scenarios', () => {
    it('4.1 calculates actual Dongtan young married couple newborn loan', () => {
      // 7억 아파트 (e.g. 동탄역 역세권 59타입), 부부합산 8,000만원
      const result = calculatePolicyLoan({
        loanType: 'NEWBORN',
        homePriceWon: 700_000_000,
        annualIncomeWon: 80_000_000,
        loanPeriodYears: 30,
        isDualIncome: true,
      });

      expect(result.isEligible).toBe(true);
      expect(result.maxLimitWon).toBe(490_000_000); // 7억 * 70%
      expect(result.estimatedRatePercent).toBe(1.6);
      expect(result.monthlyPaymentWon).toBeGreaterThan(1_700_000);
      expect(result.monthlyPaymentWon).toBeLessThan(1_750_000);
      expect(result.badgeText).toBe('최대 5억 한도');
      expect(result.summary).toContain('신생아 특례 최저 1.6%~');
    });

    it('4.2 executes safe jeonse diagnosis for Dongtan Lakefront 6억 apartment', () => {
      // 6억 아파트, 공시가 약 4.2억, HUG 126% 산정 약 5.29억, 전세 3.5억, 무융자
      const diagnosis = evaluateJeonseSafety({
        estimatedPriceWon: 600_000_000,
        seniorMortgageWon: 0,
        jeonseDepositWon: 350_000_000,
      });

      expect(diagnosis.isHugGuaranteed).toBe(true);
      expect(diagnosis.debtRatioPercent).toBeLessThan(75);
      expect(diagnosis.riskLevel).toBe('SAFE');
      expect(diagnosis.adviceText).toContain('전세보증보험 100% 가입 안전권');
    });

    it('4.3 builds dynamic ranking lists from mock transaction feed', () => {
      const liveTx = [
        { aptName: '동탄역 롯데캐슬', dong: '오산동', priceVal: 22.0, priceEok: '22.0억', delta: 1.5, isNewHigh: true, areaPyeong: 34, floor: 32 },
        { aptName: '시범우남퍼스트빌', dong: '청계동', priceVal: 14.0, priceEok: '14.0억', delta: 0.8, isNewHigh: true, areaPyeong: 33, floor: 20 },
      ];
      const summary = {
        '시범우남퍼스트빌': { dong: '청계동', recentPrice: 14.0, jeonsePrice: 10.0, jeonseRatio: 71 },
      };

      const result = getRealtimeRankings(liveTx, summary);
      expect(result.newHighList.length).toBeGreaterThanOrEqual(2);
      expect(result.newHighList[0].apartmentName).toBe('동탄역 롯데캐슬');
      expect(result.optimalGapList.length).toBeGreaterThanOrEqual(1);
      expect(result.weeklySurgeList[0].metricValue).toContain('건');
    });
  });
});
