import { render, screen, fireEvent } from '@testing-library/react';
import RelocationTaxSimulator from './RelocationTaxSimulator';
import * as analyticsModule from '@/lib/utils/analytics';
import * as cascadeFallbackModule from '@/lib/ads/cascadeFallback';

describe('RelocationTaxSimulator', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

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

  it('tracks finance_quick_interact on toggles/presets/sliders/copy and emits open_calculator + FALLBACK_CLICK on B2B CPA CTA', () => {
    const trackSpy = jest.spyOn(analyticsModule, 'trackEvent').mockImplementation(() => {});
    const telemetrySpy = jest.spyOn(cascadeFallbackModule, 'sendTelemetry').mockImplementation(() => {});

    render(<RelocationTaxSimulator />);

    // 1. Purchase price preset updates acquisition & property tax and tracks interaction
    fireEvent.click(screen.getByRole('button', { name: '매입 10억' }));
    expect(trackSpy).toHaveBeenCalledWith(
      'finance_quick_interact',
      expect.objectContaining({
        calculator_type: 'corporate_tax_simulator',
        action: 'select_purchase_price_preset',
        purchase_price_manwon: 100000,
      })
    );

    // 2. Corp tax preset updates corporate savings
    fireEvent.click(screen.getByRole('button', { name: '세액 1.5억' }));
    expect(trackSpy).toHaveBeenCalledWith(
      'finance_quick_interact',
      expect.objectContaining({
        calculator_type: 'corporate_tax_simulator',
        action: 'select_corp_tax_preset',
        annual_corp_tax: 15000,
      })
    );

    // 3. Location toggle tracks change_relocation_zone
    fireEvent.click(screen.getByText('기타 지역 (성장관리권역/수도권 외)'));
    expect(trackSpy).toHaveBeenCalledWith(
      'finance_quick_interact',
      expect.objectContaining({
        calculator_type: 'corporate_tax_simulator',
        action: 'change_relocation_zone',
        existing_location: 'other',
      })
    );

    // Corp presets should now be disabled cleanly
    expect(screen.getByRole('button', { name: '세액 1.5억' })).toBeDisabled();

    // 4. Slider adjustment tracks interaction
    const priceSlider = screen.getByLabelText('동탄 지식산업센터 매입 가격 슬라이더');
    fireEvent.change(priceSlider, { target: { value: '50000' } });
    expect(trackSpy).toHaveBeenCalledWith(
      'finance_quick_interact',
      expect.objectContaining({
        calculator_type: 'corporate_tax_simulator',
        action: 'change_purchase_price',
        purchase_price: 50000,
      })
    );

    // 5. Copy works gracefully even when navigator.clipboard is absent
    const origClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    try {
      fireEvent.click(screen.getByRole('button', { name: '결과 텍스트 복사' }));
      expect(trackSpy).toHaveBeenCalledWith(
        'finance_quick_interact',
        expect.objectContaining({
          calculator_type: 'corporate_tax_simulator',
          action: 'copy_tax_report',
        })
      );
      expect(screen.getByText('복사 완료!')).toBeInTheDocument();
    } finally {
      if (origClipboard) {
        Object.defineProperty(navigator, 'clipboard', origClipboard);
      }
    }

    // 6. B2B CPA CTA points to corporate relocation guide (not /technovalley self-loop) and emits closed-loop telemetry
    const cpaCta = screen.getByTestId('relocation-sim-b2b-cpa-cta');
    const href = cpaCta.getAttribute('href') || '';
    expect(href).toContain('/guide/dongtan-technovalley-corporate-relocation-tax');
    expect(href).toContain('utm_campaign=corporate-relocation');

    cpaCta.addEventListener('click', (e) => e.preventDefault(), { once: true });
    fireEvent.click(cpaCta);

    expect(trackSpy).toHaveBeenCalledWith(
      'open_calculator',
      expect.objectContaining({
        calculator_type: 'corporate_tax_simulator',
        surface: 'relocation_tax_simulator_cta',
        trigger: 'simulator_b2b_cpa_cta',
      })
    );
    expect(telemetrySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'FALLBACK_CLICK',
        campaignId: 'corporate-relocation',
        slotId: 'technovalley_simulator_cta',
      })
    );
  });

  it('binds centerName + async initialPurchasePriceManwon into CPA attribution params and flushes rapid slider drags cleanly', () => {
    jest.useFakeTimers();
    const trackSpy = jest.spyOn(analyticsModule, 'trackEvent').mockImplementation(() => {});
    const telemetrySpy = jest.spyOn(cascadeFallbackModule, 'sendTelemetry').mockResolvedValue();

    try {
      const initialTitle = 'D-VIEW 초기 테스트';
      document.title = initialTitle;

      const { rerender, unmount, container } = render(
        <RelocationTaxSimulator centerName="동탄 에이팩시티" initialPurchasePriceManwon={42000} />
      );

      // Concentric toggle contract (Ad Money v5.0 / v5.1)
      const trackEl = container.querySelector('.dview-toggle-track');
      expect(trackEl).not.toBeNull();
      expect(trackEl?.className).toContain('rounded-[10px]');
      expect(trackEl?.className).toContain('p-[3px]');
      const toggleBtn = screen.getByRole('button', { name: '수도권 과밀억제권역 (서울/인천 등)' });
      expect(toggleBtn.className).toContain('rounded-[7px]');

      // Context params include slot_id & apt
      const cpaCta = screen.getByTestId('relocation-sim-b2b-cpa-cta');
      const parsedUrl = new URL(cpaCta.getAttribute('href') || '', 'https://dongtanview.com');
      expect(parsedUrl.searchParams.get('slot_id')).toBe('technovalley_simulator_cta');
      expect(parsedUrl.searchParams.get('apt')).toBe('동탄 에이팩시티');

      cpaCta.addEventListener('click', (e) => e.preventDefault(), { once: true });
      fireEvent.click(cpaCta);
      expect(trackSpy).toHaveBeenCalledWith(
        'open_calculator',
        expect.objectContaining({
          apartment_name: '동탄 에이팩시티',
          apt_name: '동탄 에이팩시티',
        })
      );
      expect(telemetrySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'FALLBACK_CLICK',
          apartmentName: '동탄 에이팩시티',
          slotId: 'technovalley_simulator_cta',
        })
      );

      // Async real tx benchmark updates simulator before manual edit
      rerender(<RelocationTaxSimulator centerName="동탄 에이팩시티" initialPurchasePriceManwon={55000} />);
      expect(screen.getByText('5억 5,000만 원')).toBeInTheDocument();

      // Rapid slider drag inside 800ms window flushes final value (120000) via trailing debounce
      trackSpy.mockClear();
      const priceSlider = screen.getByLabelText('동탄 지식산업센터 매입 가격 슬라이더');
      fireEvent.change(priceSlider, { target: { value: '70000' } });
      jest.advanceTimersByTime(100);
      fireEvent.change(priceSlider, { target: { value: '90000' } });
      jest.advanceTimersByTime(100);
      fireEvent.change(priceSlider, { target: { value: '120000' } });

      // Pending trailing flush completes on pointerUp
      fireEvent.pointerUp(priceSlider);
      expect(trackSpy).toHaveBeenLastCalledWith(
        'finance_quick_interact',
        expect.objectContaining({
          action: 'change_purchase_price',
          purchase_price: 120000,
          apartment_name: '동탄 에이팩시티',
        })
      );

      // Subsequent async benchmark update does NOT overwrite user's edited value
      rerender(<RelocationTaxSimulator centerName="동탄 에이팩시티" initialPurchasePriceManwon={33000} />);
      expect(screen.getByText('12억 원')).toBeInTheDocument();

      // Schedule another throttled drag then unmount: pending timer must be cleared with no post-unmount event
      trackSpy.mockClear();
      fireEvent.change(priceSlider, { target: { value: '140000' } });
      unmount();
      jest.advanceTimersByTime(1000);
      expect(trackSpy).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});
