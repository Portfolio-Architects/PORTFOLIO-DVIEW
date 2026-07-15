# UI/UX Layout & Performance Diagnostics Challenge Report

## Challenge Summary

**Overall risk assessment**: **LOW**

All primary E2E functional and layout correctness metrics have passed. However, the E2E audit surfaced minor environmental dependencies and logging behaviors that could affect verification consistency in CI/CD pipelines.

---

## Challenges

### [Medium] Challenge 1: Rate Limiting in Development/Test Environments
- **Assumption challenged**: That the test environment has no rate limit restrictions.
- **Attack scenario**: During automated testing, fast sequential requests from the same runner IP to `/api/apartments-by-dong` and `/api/dashboard-init` trigger Upstash Redis rate limiting (configured to a default 60 requests/minute). This causes HTTP 429 (Too Many Requests) errors, resulting in test run console failures and preload failures.
- **Blast radius**: E2E test suites or CI pipelines fail due to rate limit blocks, even when the application logic is completely correct.
- **Mitigation**: Ensure that in test environments, rate limiting is bypassed or scaled up (e.g., by setting `RATE_LIMIT_MAX_REQUESTS` to a high threshold like `10000` or clearing `UPSTASH_REDIS_REST_URL` to disable Redis-backed rate limiting).

### [Low] Challenge 2: Next.js Port Collision on Windows (EADDRINUSE)
- **Assumption challenged**: That Playwright's `webServer` automatically cleans up all spawned Next.js processes upon test exit.
- **Attack scenario**: On Windows, the Next.js process spawned by `webServer` can persist after the test runner exits. Subsequent E2E test invocations fail immediately with `EADDRINUSE: address already in use :::5000`.
- **Blast radius**: Consecutive local test runs fail unless the developer manually kills the orphaned `node.exe` process.
- **Mitigation**: Add a pre-test cleanup step in the package scripts to force-kill any process on port 5000, or verify the port status before running tests.

### [Low] Challenge 3: Accessibility Color Contrast Violation
- **Assumption challenged**: That the UI layout complies fully with accessibility standards.
- **Attack scenario**: Axe-Core audit flagged a contrast ratio issue on `.shadow-\[0_2px_12px_rgba\(0\,0\,0\,0\.06\)\] > span` (text: "아파트 탐색").
- **Blast radius**: WCAG 2 AA minimum contrast ratio thresholds are not met for this specific heading element, potentially failing strict accessibility audits.
- **Mitigation**: Adjust the background/foreground colors of the "아파트 탐색" span to achieve a contrast ratio of at least 4.5:1.

---

## Stress Test & Audit Results

| Scenario | Expected Behavior | Actual Behavior | Pass/Fail |
|----------|-------------------|-----------------|-----------|
| **Layout Overflows** | `layout.overflows` section is empty (`[]`) | No layout overflows detected. | **PASS** |
| **Client Console Error/Warnings** | No console errors or warnings logged in browser console. | 0 errors and 0 warnings logged (once rate limit raised). | **PASS** |
| **Cumulative Layout Shift (CLS)** | CLS is 0 or under the strict limit of `0.1`. | CLS measured: `0.03636` (well under the `0.1` limit). | **PASS** |
| **Accessiblity Audit** | Zero WCAG violations | 1 violation flagged (`color-contrast` on "아파트 탐색"). | **FAIL** (Non-blocking) |

---

## Unchallenged Areas

- **Backend Database Integrity**: Out of scope for E2E UI/UX layout and performance verification.
- **Firebase Auth Security**: Not stress-tested in this layout-specific verification audit.
