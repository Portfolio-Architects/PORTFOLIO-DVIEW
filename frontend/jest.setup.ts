// Optional: configure or set up a testing framework before each test.
import '@testing-library/jest-dom';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodeFetch = require('node-fetch');

// Polyfill fetch and Web APIs for JSDOM environment in Jest using node-fetch
if (!global.fetch) {
  global.fetch = nodeFetch;
}

if (!global.Headers) {
  global.Headers = nodeFetch.Headers;
}

if (!global.Request) {
  global.Request = nodeFetch.Request;
}

if (!global.Response) {
  global.Response = nodeFetch.Response;
}

// Global Polyfills for DOM observers & media queries
if (typeof window !== 'undefined') {
  if (!global.ResizeObserver) {
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  if (!global.IntersectionObserver) {
    global.IntersectionObserver = class IntersectionObserver {
      readonly root: Element | null = null;
      readonly rootMargin: string = '';
      readonly thresholds: ReadonlyArray<number> = [];
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() { return []; }
    } as any;
  }

  if (!window.matchMedia) {
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }
}
