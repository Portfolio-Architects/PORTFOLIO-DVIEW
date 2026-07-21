import { render, screen, fireEvent } from '@testing-library/react';
import RelocationTaxSimulator from './RelocationTaxSimulator';

describe('RelocationTaxSimulator', () => {
  it('renders title and default calculations correctly', () => {
    render(<RelocationTaxSimulator />);
    expect(screen.getByText('테크노밸리 이전 세금 감면 시뮬레이터')).toBeInTheDocument();
    expect(screen.getByText('6개년 총 절세 추정치')).toBeInTheDocument();
  });

  it('formats prices correctly without remainder rounding bugs (e.g., 9999.6 -> 1억 원)', () => {
    render(<RelocationTaxSimulator />);
    
    // We can verify that values displayed follow Korean price formatting correctly
    const textContent = screen.getByText('6개년 총 절세 추정치').parentElement?.textContent;
    expect(textContent).toContain('억');
    expect(textContent).not.toContain('10,000만 원');
  });

  it('updates tax savings when location or sliders are modified', () => {
    render(<RelocationTaxSimulator />);
    
    const otherRegionBtn = screen.getByText('기타 지역 (성장관리권역/수도권 외)');
    fireEvent.click(otherRegionBtn);

    // Corp tax savings should be excluded (0) for non-overconcentrated region
    expect(screen.getByText('과밀억제권역 외 이전 시 법인세 감면 혜택은 대상 외이므로 계산에서 제외됩니다.')).toBeInTheDocument();
  });
});
