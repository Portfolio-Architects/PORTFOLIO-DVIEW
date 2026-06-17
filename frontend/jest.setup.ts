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

