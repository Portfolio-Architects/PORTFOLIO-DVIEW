import { Subscribable } from './subscribable';

describe('Subscribable Utility Class', () => {
  it('should initialize with the provided data and return it via get()', () => {
    const store = new Subscribable<number>(42);
    expect(store.get()).toBe(42);
  });

  it('should update data via set() and notify subscribed listeners', () => {
    const store = new Subscribable<string>('initial');
    const callback = jest.fn();

    store.subscribe(callback);
    expect(callback).not.toHaveBeenCalled();

    store.set('updated');
    expect(store.get()).toBe('updated');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should stop notifying the listener after calling the unsubscribe function', () => {
    const store = new Subscribable<{ count: number }>({ count: 0 });
    const callback = jest.fn();

    const unsubscribe = store.subscribe(callback);
    store.set({ count: 1 });
    expect(callback).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.set({ count: 2 });
    expect(callback).toHaveBeenCalledTimes(1); // Should still be 1, not 2
    expect(store.get()).toEqual({ count: 2 });
  });

  it('should support multiple independent listeners', () => {
    const store = new Subscribable<boolean>(false);
    const cb1 = jest.fn();
    const cb2 = jest.fn();

    store.subscribe(cb1);
    store.subscribe(cb2);

    store.set(true);
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
  });
});
