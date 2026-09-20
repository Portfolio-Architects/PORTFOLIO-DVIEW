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

if (global.Response && !(global.Response as any).json) {
  (global.Response as any).json = (data: any, init?: any) => {
    const res = new (global.Response as any)(JSON.stringify(data), init);
    res.headers.set('Content-Type', 'application/json');
    return res;
  };
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

// Global Recharts mock to avoid JSDOM SVG measurement issues and Redux state updates outside act()
jest.mock('recharts', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  const OriginalModule = jest.requireActual('recharts');
  const MockNull = () => null;
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) =>
      React.createElement('div', { 'data-testid': 'responsive-container', style: { width: 800, height: 400 } }, children),
    ComposedChart: ({ children }: any) =>
      React.createElement('svg', { 'data-testid': 'composed-chart' }, children),
    AreaChart: ({ children, data }: any) =>
      React.createElement('svg', { 'data-testid': 'area-chart', 'data-count': Array.isArray(data) ? data.length : 0 }, children),
    BarChart: ({ children, data }: any) =>
      React.createElement('svg', { 'data-testid': 'bar-chart', 'data-count': Array.isArray(data) ? data.length : 0 }, children),
    LineChart: ({ children, data }: any) =>
      React.createElement('svg', { 'data-testid': 'line-chart', 'data-count': Array.isArray(data) ? data.length : 0 }, children),
    PieChart: ({ children }: any) =>
      React.createElement('svg', { 'data-testid': 'pie-chart' }, children),
    RadarChart: ({ children }: any) =>
      React.createElement('svg', { 'data-testid': 'radar-chart' }, children),
    Area: MockNull,
    Bar: MockNull,
    Line: MockNull,
    Pie: ({ data }: any) =>
      React.createElement('div', { 'data-testid': 'recharts-pie', 'data-count': Array.isArray(data) ? data.length : 0 }),
    Cell: MockNull,
    XAxis: MockNull,
    YAxis: MockNull,
    CartesianGrid: MockNull,
    Tooltip: () => React.createElement('div', { 'data-testid': 'recharts-tooltip' }),
    Legend: () => React.createElement('div', { 'data-testid': 'recharts-legend' }),
    PolarGrid: MockNull,
    PolarAngleAxis: MockNull,
    PolarRadiusAxis: MockNull,
    Radar: MockNull,
    ReferenceLine: MockNull,
    ReferenceArea: MockNull,
  };
});

// Suppress un-actionable React 19 act() warnings originating from third-party libraries & async hooks
const originalError = console.error;
console.error = (...args: any[]) => {
  const fullMsg = args.map((a) => (typeof a === 'string' ? a : '')).join(' ');
  if (fullMsg.includes('not wrapped in act(...)')) {
    return;
  }
  originalError(...args);
};

const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const fullMsg = args.map((a) => (typeof a === 'string' ? a : '')).join(' ');
  if (
    fullMsg.includes('The width(0) and height(0) of chart should be greater than 0') ||
    fullMsg.includes('please check the style of container')
  ) {
    return;
  }
  originalWarn(...args);
};

