/**
 * @class Subscribable
 * @description Generic pub/sub state container utility class.
 */
export class Subscribable<T> {
  private data: T;
  private listeners = new Set<() => void>();

  constructor(initialData: T) {
    this.data = initialData;
  }

  get = (): T => this.data;

  set = (newData: T) => {
    this.data = newData;
    this.listeners.forEach((cb) => cb());
  };

  subscribe = (callback: () => void) => {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  };
}
