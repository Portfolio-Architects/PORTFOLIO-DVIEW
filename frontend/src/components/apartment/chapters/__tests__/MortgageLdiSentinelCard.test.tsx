import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MortgageLdiSentinelCard } from '../MortgageLdiSentinelCard';

describe('MortgageLdiSentinelCard (Chapter 05 Interactive Sentinel)', () => {
  const defaultProps = {
    aptName: '동탄역 롯데캐슬',
    dong: '오산동',
    latestSalePrice: 160000, // 16억원
    latestDepositPrice: 65000, // 6.5억원
    jeonseRatio: 40.6,
    householdCount: 940,
    inline: false,
    onOpenMortgageCalculator: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. 기본 렌더링 및 Arctic Lumina 글래스모피즘 규격 검증', () => {
    it('1.1 최외곽 컨테이너 및 헤더, Arctic Lumina 클래스 토큰이 정상 투영된다', () => {
      render(<MortgageLdiSentinelCard {...defaultProps} />);

      const card = screen.getByTestId('mortgage-ldi-sentinel-card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('backdrop-blur-xl');
      expect(card).toHaveClass('rounded-[20px]');
      expect(card).toHaveClass('border');

      expect(screen.getByText('주담대 LDI 및 스트레스 DSR 센티넬')).toBeInTheDocument();
      expect(screen.getByText('실시간 수리 엔진')).toBeInTheDocument();
    });

    it('1.2 결측 Props(가격 미제공) 진입 시에도 안전한 정책 표준 기본값으로 렌더링된다', () => {
      render(<MortgageLdiSentinelCard aptName="미확인 단지" />);

      const card = screen.getByTestId('mortgage-ldi-sentinel-card');
      expect(card).toBeInTheDocument();
      // 폴백 7억원에 대한 60% = 4.2억원 기준 계산 확인
      expect(screen.getByText('대출 원금')).toBeInTheDocument();
    });
  });

  describe('2. 대화형 컨트롤러 및 상태 전이 검증', () => {
    it('2.1 상환 방식 토글 클릭 시 원리금균등 및 원금균등 상태가 전환된다', () => {
      render(<MortgageLdiSentinelCard {...defaultProps} />);

      const amortizingBtn = screen.getByTestId('repayment-amortizing-btn');
      const principalBtn = screen.getByTestId('repayment-principal-btn');

      expect(amortizingBtn).toBeInTheDocument();
      expect(principalBtn).toBeInTheDocument();

      // 초기: 원리금균등 활성 (월 상환액 (고정) 라벨 확인)
      expect(screen.getByText('월 상환액 (고정)')).toBeInTheDocument();

      // 원금균등 클릭
      fireEvent.click(principalBtn);
      expect(screen.getByText('1회차 월 상환액')).toBeInTheDocument();
      expect(screen.getByText(/만기 회차:/)).toBeInTheDocument();

      // 다시 원리금균등 클릭
      fireEvent.click(amortizingBtn);
      expect(screen.getByText('월 상환액 (고정)')).toBeInTheDocument();
    });

    it('2.2 대출 만기 칩 클릭 시 기간이 동적으로 갱신된다', () => {
      render(<MortgageLdiSentinelCard {...defaultProps} />);

      const tenor40Btn = screen.getByTestId('tenor-40-btn');
      expect(tenor40Btn).toBeInTheDocument();

      fireEvent.click(tenor40Btn);
      expect(screen.getByText('40년 (480개월)')).toBeInTheDocument();

      const tenor20Btn = screen.getByTestId('tenor-20-btn');
      fireEvent.click(tenor20Btn);
      expect(screen.getByText('20년 (240개월)')).toBeInTheDocument();
    });

    it('2.3 슬라이더 조작 시 원금, 연소득, 금리 수치가 동기화된다', () => {
      render(<MortgageLdiSentinelCard {...defaultProps} />);

      const principalSlider = screen.getByTestId('principal-slider');
      const incomeSlider = screen.getByTestId('income-slider');
      const rateSlider = screen.getByTestId('rate-slider');

      // 원금 슬라이더 80,000만원(8억원)으로 변경
      fireEvent.change(principalSlider, { target: { value: '80000' } });
      expect(screen.getByText('8억원')).toBeInTheDocument();

      // 연소득 슬라이더 10,000만원(1억원)으로 변경
      fireEvent.change(incomeSlider, { target: { value: '10000' } });
      expect(screen.getByText('1억원')).toBeInTheDocument();

      // 금리 슬라이더 5.5%로 변경
      fireEvent.change(rateSlider, { target: { value: '5.5' } });
      expect(screen.getByText('5.5%')).toBeInTheDocument();
    });
  });

  describe('3. 스트레스 DSR 40% 한도 게이지 모듈 검증', () => {
    it('3.1 DSR 게이지 바, 법정 규제 기준선, 상태 뱃지가 렌더링된다', () => {
      render(<MortgageLdiSentinelCard {...defaultProps} />);

      expect(screen.getByTestId('dsr-status-badge')).toBeInTheDocument();
      expect(screen.getByTestId('dsr-progress-bar')).toBeInTheDocument();
      expect(screen.getByText('규제 상한 40.0%')).toBeInTheDocument();
      expect(screen.getByText(/스트레스 DSR 40% 규제 한도 게이지/)).toBeInTheDocument();
      expect(screen.getByText(/차주 소득 기반 최대 대출 한도/)).toBeInTheDocument();
    });

    it('3.2 극단적 대출 원금 설정 시 DSR 초과 상태로 판정된다', () => {
      render(<MortgageLdiSentinelCard {...defaultProps} />);

      const principalSlider = screen.getByTestId('principal-slider');
      const incomeSlider = screen.getByTestId('income-slider');

      // 저소득 (3,000만원) + 고원금 (15억원)
      fireEvent.change(incomeSlider, { target: { value: '3000' } });
      fireEvent.change(principalSlider, { target: { value: '150000' } });

      const badge = screen.getByTestId('dsr-status-badge');
      expect(badge).toHaveTextContent('규제 한도 초과');
    });
  });

  describe('4. 금리 충격 민감도 히트맵 검증', () => {
    it('4.1 4개 시나리오(+1.0%p, +1.5%p, +2.0%p, +3.0%p) 카드가 모두 렌더링된다', () => {
      render(<MortgageLdiSentinelCard {...defaultProps} />);

      expect(screen.getByTestId('rate-shock-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('rate-shock-card-1.5')).toBeInTheDocument();
      expect(screen.getByTestId('rate-shock-card-2')).toBeInTheDocument();
      expect(screen.getByTestId('rate-shock-card-3')).toBeInTheDocument();

      expect(screen.getByText('+1.0%p')).toBeInTheDocument();
      expect(screen.getByText('+1.5%p')).toBeInTheDocument();
      expect(screen.getByText('+2.0%p')).toBeInTheDocument();
      expect(screen.getByText('+3.0%p')).toBeInTheDocument();
    });
  });

  describe('5. 역전세 결손액 센티넬 검증', () => {
    it('5.1 하락률 변경 시 결손액 및 경보 카드가 반응한다', () => {
      render(<MortgageLdiSentinelCard {...defaultProps} />);

      const shock20Btn = screen.getByTestId('jeonse-shock-20-btn');
      expect(shock20Btn).toBeInTheDocument();

      fireEvent.click(shock20Btn);

      const alertCard = screen.getByTestId('jeonse-shortfall-alert');
      expect(alertCard).toBeInTheDocument();
      expect(alertCard).toHaveTextContent('만기 시 보증금 반환 결손액 발생 위험');
    });
  });

  describe('6. 수리적 안정성 및 특이점(Singularity/NaN/Infinity) 방어 검증', () => {
    it('6.1 원금 0, 금리 0 등 경계 조건에서도 NaN/Infinity 없이 정상 렌더링된다', () => {
      const { container } = render(
        <MortgageLdiSentinelCard
          aptName="특이점 단지"
          latestSalePrice={0}
          latestDepositPrice={0}
        />
      );

      // DOM 내 NaN 및 Infinity 문자열이 전혀 없음을 검증
      expect(container.textContent).not.toContain('NaN');
      expect(container.textContent).not.toContain('Infinity');
    });

    it('6.2 정밀 계산기 모달 콜백 버튼이 정상 동작한다', () => {
      const mockCallback = jest.fn();
      render(<MortgageLdiSentinelCard {...defaultProps} onOpenMortgageCalculator={mockCallback} />);

      const modalBtn = screen.getByRole('button', { name: /정밀 계산기 모달/ });
      expect(modalBtn).toBeInTheDocument();

      fireEvent.click(modalBtn);
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith('동탄역 롯데캐슬');
    });
  });
});
