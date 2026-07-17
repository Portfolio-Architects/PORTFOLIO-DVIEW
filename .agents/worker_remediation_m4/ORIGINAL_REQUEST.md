## 2026-07-18T00:36:56Z
You are the Remediation Worker. Your working directory is c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_remediation_m4\.
Your mission is to resolve the minor caching issues identified by Reviewer 1 and Challenger 2:

1. **Fix location-scores.json Cache Key Mismatch**:
   - In `frontend/src/components/pwa/SWRProvider.tsx`, import `BUILD_VERSION` if not already imported (it is imported as `import { BUILD_VERSION } from '@/lib/build-version';` on line 7).
   - In the `targets` array inside `preloadEssentialData` (around line 28-35), change `'/data/location-scores.json'` to `\`/data/location-scores.json?v=\${BUILD_VERSION}\`` so it matches the SWR key queried in `useStaticData.ts`.

2. **Clean up unnecessary preload targets**:
   - In `frontend/src/components/pwa/SWRProvider.tsx`, remove `'/api/apartments-by-dong'` from the `targets` array, as it is only queried with SWR on the admin dashboard page and preloading it for all normal users is redundant and wastes bandwidth.

3. **Verify Build & Tests**:
   - Run `npm run build` in `frontend/` to check production compile.
   - Run `npm run test:e2e` in `frontend/` to ensure Playwright tests are passing.
   - Document changes in `changes.md` and verification results in `handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
