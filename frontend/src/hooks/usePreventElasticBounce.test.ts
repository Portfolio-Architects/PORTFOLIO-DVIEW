import { renderHook } from '@testing-library/react';
import { usePreventElasticBounce } from './usePreventElasticBounce';

describe('usePreventElasticBounce', () => {
  let element: HTMLDivElement;
  let addEventListenerSpy: jest.SpyInstance;
  let removeEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    element = document.createElement('div');
    Object.defineProperty(element, 'scrollTop', { value: 0, writable: true });
    Object.defineProperty(element, 'clientHeight', { value: 100, writable: true });
    Object.defineProperty(element, 'scrollHeight', { value: 200, writable: true });

    addEventListenerSpy = jest.spyOn(element, 'addEventListener');
    removeEventListenerSpy = jest.spyOn(element, 'removeEventListener');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should attach touchmove listener with passive: false', () => {
    const ref = { current: element };
    renderHook(() => usePreventElasticBounce(ref));

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'touchmove',
      expect.any(Function),
      { passive: false }
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'touchstart',
      expect.any(Function),
      { passive: true }
    );
  });

  it('should remove event listeners on unmount', () => {
    const ref = { current: element };
    const { unmount } = renderHook(() => usePreventElasticBounce(ref));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchmove', expect.any(Function));
  });

  it('should call preventDefault when scrolling up at top boundary (scrollTop <= 0 and deltaY > 0)', () => {
    const ref = { current: element };
    renderHook(() => usePreventElasticBounce(ref));

    element.scrollTop = 0;

    // Simulate touchstart at Y=100
    const startEvent = new TouchEvent('touchstart', {
      touches: [{ clientY: 100, clientX: 100 } as Touch]
    });
    element.dispatchEvent(startEvent);

    // Simulate touchmove to Y=120 (deltaY = +20, pulling down)
    const moveEvent = new TouchEvent('touchmove', {
      cancelable: true,
      touches: [{ clientY: 120, clientX: 100 } as Touch]
    });
    const preventDefaultSpy = jest.spyOn(moveEvent, 'preventDefault');

    element.dispatchEvent(moveEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should call preventDefault when scrolling down at bottom boundary (scrollTop + clientHeight >= scrollHeight and deltaY < 0)', () => {
    const ref = { current: element };
    renderHook(() => usePreventElasticBounce(ref));

    element.scrollTop = 100; // scrollTop (100) + clientHeight (100) = scrollHeight (200)

    // Simulate touchstart at Y=100
    const startEvent = new TouchEvent('touchstart', {
      touches: [{ clientY: 100, clientX: 100 } as Touch]
    });
    element.dispatchEvent(startEvent);

    // Simulate touchmove to Y=80 (deltaY = -20, pushing up)
    const moveEvent = new TouchEvent('touchmove', {
      cancelable: true,
      touches: [{ clientY: 80, clientX: 100 } as Touch]
    });
    const preventDefaultSpy = jest.spyOn(moveEvent, 'preventDefault');

    element.dispatchEvent(moveEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should NOT call preventDefault when scrolling in middle of container', () => {
    const ref = { current: element };
    renderHook(() => usePreventElasticBounce(ref));

    element.scrollTop = 50; // In middle (50 > 0 and 50 + 100 < 200)

    const startEvent = new TouchEvent('touchstart', {
      touches: [{ clientY: 100, clientX: 100 } as Touch]
    });
    element.dispatchEvent(startEvent);

    const moveEvent = new TouchEvent('touchmove', {
      cancelable: true,
      touches: [{ clientY: 120, clientX: 100 } as Touch]
    });
    const preventDefaultSpy = jest.spyOn(moveEvent, 'preventDefault');

    element.dispatchEvent(moveEvent);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  it('should NOT call preventDefault for horizontal swipe gestures (Math.abs(deltaX) >= Math.abs(deltaY))', () => {
    const ref = { current: element };
    renderHook(() => usePreventElasticBounce(ref));

    element.scrollTop = 0; // At top boundary

    const startEvent = new TouchEvent('touchstart', {
      touches: [{ clientY: 100, clientX: 100 } as Touch]
    });
    element.dispatchEvent(startEvent);

    // deltaY = +10, deltaX = +20 (horizontal movement is greater)
    const moveEvent = new TouchEvent('touchmove', {
      cancelable: true,
      touches: [{ clientY: 110, clientX: 120 } as Touch]
    });
    const preventDefaultSpy = jest.spyOn(moveEvent, 'preventDefault');

    element.dispatchEvent(moveEvent);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  it('should NOT call preventDefault when e.cancelable is false', () => {
    const ref = { current: element };
    renderHook(() => usePreventElasticBounce(ref));

    element.scrollTop = 0;

    const startEvent = new TouchEvent('touchstart', {
      touches: [{ clientY: 100, clientX: 100 } as Touch]
    });
    element.dispatchEvent(startEvent);

    const moveEvent = new TouchEvent('touchmove', {
      cancelable: false,
      touches: [{ clientY: 120, clientX: 100 } as Touch]
    });
    const preventDefaultSpy = jest.spyOn(moveEvent, 'preventDefault');

    element.dispatchEvent(moveEvent);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  it('should NOT call preventDefault for multi-touch gestures', () => {
    const ref = { current: element };
    renderHook(() => usePreventElasticBounce(ref));

    element.scrollTop = 0;

    const startEvent = new TouchEvent('touchstart', {
      touches: [{ clientY: 100, clientX: 100 } as Touch]
    });
    element.dispatchEvent(startEvent);

    const moveEvent = new TouchEvent('touchmove', {
      cancelable: true,
      touches: [
        { clientY: 120, clientX: 100 } as Touch,
        { clientY: 120, clientX: 150 } as Touch
      ]
    });
    const preventDefaultSpy = jest.spyOn(moveEvent, 'preventDefault');

    element.dispatchEvent(moveEvent);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });
});
