// Optional: configure or set up a testing framework before each test.
import '@testing-library/jest-dom';

const nodeFetch = require('node-fetch');

// Polyfill fetch and Web APIs for JSDOM environment in Jest using node-fetch
if (!global.fetch) {
  // @ts-ignore
  global.fetch = nodeFetch;
}

if (!global.Headers) {
  // @ts-ignore
  global.Headers = nodeFetch.Headers;
}

if (!global.Request) {
  // @ts-ignore
  global.Request = nodeFetch.Request;
}

if (!global.Response) {
  // @ts-ignore
  global.Response = nodeFetch.Response;
}

