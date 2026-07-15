# 📊 UI/UX Layout and Performance Metrics Verification Report

## Challenge Summary

- **Verification Date**: 2026-07-14T23:44:00+09:00
- **Audited Target**: D-VIEW local dev environment (http://localhost:5000) via Playwright E2E UI/UX Audit suite
- **Overall risk assessment**: **MEDIUM**

While layout overflow checks and CLS stability passed under critical thresholds, the audit detected multiple 429 (Too Many Requests) errors and corresponding preload page failures due to the rate limiter triggering during sequential E2E test suite executions.

---

## Verification Criteria & Results

### 1. Layout Overflow Verification
- **Criterion**: No layout overflows detected in the `layout.overflows` section of the audit results.
- **Observed Result**: **PASS** (`"overflows": []`).
- **Details**: No elements were detected exceeding the viewport width horizontally without a horizontal scroll parent. Layout responsive integrity holds for the audited views.

### 2. Browser Console Errors and Page Warnings
- **Criterion**: No console errors or page warnings are logged.
- **Observed Result**: **FAIL**
- **Details**:
  - **Console Errors**: 6 instances of HTTP 429 (Too Many Requests) errors for `/api/apartments-by-dong` and `/api/dashboard-init` endpoints.
  - **Console Warnings**: 1 instance of `WARN: /api/apartments-by-dong failed: HTTP 429`.
  - **Page Errors**: 2 instances of `Preload fetch failed` for the rate-limited endpoints.
- **Cause**: The Upstash Redis rate limiter is configured to limit clients to 60 requests/minute. The rapid succession of automated E2E tests sharing the same client IP (`127.0.0.1`) exceeded this rate limit, resulting in HTTP 429 responses.

### 3. Cumulative Layout Shift (CLS)
- **Criterion**: CLS is verified to be 0 or under the strict limit of 0.1.
- **Observed Result**: **PASS**
- **Details**: Measured CLS was `0.03697217701541053`, which is under the strict limit of `0.1` defined by Google Web Vitals and the project's internal `generate-ui-ux-report.js` script. While not exactly `0`, it represents high layout stability.

---

## Challenges

### [Medium] Challenge 1: Rate Limiter Blocking Local E2E Auditing
- **Assumption challenged**: The rate limiter assumes that all clients, including local testing harnesses (`127.0.0.1`), should be limited equally.
- **Attack scenario**: When the automated E2E test suite (which includes multiple specs such as dashboard, login, routing, and UI/UX audit) runs sequentially, the local web server requests hit the production Upstash Redis instance from the loopback IP, triggering a rate-limit block (HTTP 429).
- **Blast radius**: Test results are polluted with network errors. Critical resources fail to preload, which can cause hydration issues, missing data, and test instability.
- **Mitigation**:
  1. Detect environment flags (e.g. `process.env.NODE_ENV === 'test'` or E2E testing user-agent/headers) in the API routes.
  2. Implement an IP-based bypass for `127.0.0.1` and `localhost` in local development / testing contexts.

### [Low] Challenge 2: Non-Zero Cumulative Layout Shift
- **Assumption challenged**: Visual elements are 100% layout-shift free (CLS = 0).
- **Attack scenario**: As the dashboard client-side charts render via SWR, there is a minor layout shift of `~0.037` before the skeleton loaders settle, caused by transition/padding differences or async WebGL load.
- **Blast radius**: Low. The CLS is well below the Google Web Vitals "Good" limit of `0.1`, but still prevents a perfect zero shift.
- **Mitigation**: Ensure container height for charts exactly matches the rendering canvas and check modal transition timings to prevent minor vertical resizing.

---

## Stress Test Results

| Scenario | Expected Behavior | Actual Behavior | Status |
| :--- | :--- | :--- | :---: |
| Exploration view & modal loading | No horizontal scroll layout overflows | No overflows found | **PASS** |
| Web Vitals Measurement | CLS < 0.1 | CLS = 0.03697 | **PASS** |
| Sequential E2E Test execution | 0 network/console errors | Multiple HTTP 429 Errors + Preload Failures | **FAIL** |

---

## Unchallenged Areas

- **Valuation weight adjustments** — Beyond the UI rendering check, the mathematical correctness of weights was not tested since it was out of scope of the UI/UX audit.
