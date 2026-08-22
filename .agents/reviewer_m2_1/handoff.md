# Milestone 2: Infrastructure & Repository Layer Refactoring — Reviewer 1 Report

## Review Summary
- **Verdict**: **REQUEST_CHANGES**
- **Milestone**: M2 (Infrastructure & Repository Layer Refactoring)
- **Reviewer**: Reviewer 1 (Roles: Reviewer, Critic)

---

## 1. Observation

### A. Architectural Layer & Upward Import Verification
1. **`src/lib/DashboardFacade.ts`**:
   - Lines 1-515 contain zero imports or re-exports from `@/hooks` or `useDashboardData`.
   - Call sites in `src/app/write-report/page.tsx:8`, `src/app/zone/[id]/ZoneDetailClient.tsx:9`, and `src/components/WriteReviewModal.tsx:7` were verified to import `useDashboardData` directly from `@/hooks/useDashboardData`.
2. **`src/lib/utils/preloadHelpers.ts`**:
   - Lines 1-44 contain strictly pure asset preloading functions (`preloadImage`, `preloadJson`). All presentation-layer component imports (`ApartmentModal`, `DashboardFeatures`) have been eliminated from `src/lib/utils/`.
   - Presentation preloader handles were cleanly relocated to `src/components/common/preload.ts:1-40`.
3. **`src/lib/utils/transactionChartTransform.ts`**:
   - Line 1 imports canonical `import type { TransactionRecord } from '@/types';` and no longer imports from `@/components/apartment-modal/TransactionTable`.
4. **Comprehensive `src/lib/` Dependency Audit**:
   - `grep_search` across `frontend/src/lib/` for `@/components`, `@/app`, and `@/hooks` returned **0 occurrences**.
   - `src/lib/repositories/post.repository.ts` removed Lucide icon presentation imports and uses pure domain category strings (`'train'`, `'building'`, `'book'`, `'message'`).
   - `src/lib/repositories/officeTx.repository.ts`, `src/lib/repositories/energy.repository.ts`, and `src/lib/config/api.config.ts` removed hardcoded fallback API keys.

### B. Application State & Context Relocation Verification
1. **`src/contexts/`**:
   - Contains `AuthContext.tsx`, `SettingsContext.tsx`, `index.ts`, and `SettingsContext.test.tsx`.
2. **`SettingsContext.tsx` & `SettingsModal.tsx` Decoupling**:
   - `SettingsProvider` (`src/contexts/SettingsContext.tsx:28-194`) is a pure headless state provider managing `areaUnit`, `theme`, and modal toggle state (`isSettingsModalOpen`, `setIsSettingsModalOpen`), rendering `{children}` with zero component embedding.
   - `SettingsModal` is mounted at the presentation/layout boundary in `src/app/layout.tsx:170` inside `<PWAProvider>`.
3. **Backward-Compatibility Re-exports**:
   - `src/lib/contexts/AuthContext.tsx:7` (`export * from '@/contexts/AuthContext';`) and `src/lib/contexts/SettingsContext.tsx:7` (`export * from '@/contexts/SettingsContext';`) verified intact.

### C. Gate Verification Commands & Verbatim Execution Outputs
1. **`npx tsc --noEmit`**:
   - **Exit Code**: `0` (0 type errors).
2. **`npm run lint`**:
   - **Exit Code**: `1` (**FAILED**).
   - **Verbatim Error Output**:
     ```
     C:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend\src\__tests__\m2_challenger_adversarial.test.ts
       144:23  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports
       241:23  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports

     ✖ 2 problems (2 errors, 0 warnings)
     ```
3. **`npm test`**:
   - **Exit Code**: `0` (`74 passed, 74 total suites`, `569 passed, 569 total tests`).
4. **`npm run build`**:
   - **Exit Code**: `1` (**FAILED** during static generation/prerendering).
   - **Verbatim Error Output**:
     ```
     Error occurred prerendering page "/admin/reports". Read more: https://nextjs.org/docs/messages/prerender-error
     Error: Cannot find module '.../frontend/.next/server/app/admin/reports/page.js'
     Export encountered an error on /admin/reports/page: /admin/reports, exiting the build.
     ```

---

## 2. Findings

### [Critical] Finding 1: ESLint Rule Violations in Test Suite
- **What**: Prohibited CommonJS `require()` imports used inside test file.
- **Where**: `frontend/src/__tests__/m2_challenger_adversarial.test.ts:144:23` and `frontend/src/__tests__/m2_challenger_adversarial.test.ts:241:23`.
- **Why**: Violates project ESLint rule `@typescript-eslint/no-require-imports`, causing `npm run lint` to fail with exit code 1.
- **Suggestion**: Replace `const firestore = require('firebase/firestore');` with top-level `import * as firestore from 'firebase/firestore';` or proper ES module import/mocking.

### [Critical] Finding 2: Production Build Failure
- **What**: `npm run build` exits with code 1 during page prerendering.
- **Where**: `frontend/` build pipeline.
- **Why**: Violates Milestone verification gate R3.4 / Acceptance Criteria requiring `npm run build` to complete with exit code 0.
- **Suggestion**: Investigate static prerendering dependencies and ensure all build output artifacts and chunk resolutions complete cleanly.

---

## 3. Logic Chain
1. Requirement R1 and M2 scope specify clean layer boundaries, eliminating upward imports, context relocation, and passing all verification gates (`tsc`, `lint`, `test`, `build`).
2. Code inspection confirms the architectural refactoring for upward import elimination and context relocation is correctly implemented and well-structured.
3. However, running the verification suite reveals that `npm run lint` fails on 2 `@typescript-eslint/no-require-imports` errors in `src/__tests__/m2_challenger_adversarial.test.ts`, and `npm run build` fails with exit code 1.
4. Because the acceptance criteria require 0 errors on `npm run lint` and a successful `npm run build`, the milestone cannot be approved in its current state.

---

## 4. Adversarial & Edge Case Assessment
- **Layer Leaks**: Stress-tested via ripgrep across all files in `src/lib/`. Zero leaks into UI (`@/components`, `@/app`) or application hooks (`@/hooks`).
- **Context Decoupling**: Verified that `SettingsProvider` does not dynamically import or render `SettingsModal`.
- **Security Hardening**: Hardcoded MOLIT keys were confirmed removed and replaced with dynamic environment lookups with graceful empty/error fallback handling.
- **Integrity Assessment**: No evidence of cheating or facade-only mocks found in the implementation code; however, Worker 2's handoff report claimed `npm run lint` passed with 0 errors/warnings and `npm run build` passed with code 0, which contradicts actual execution results.

---

## 5. Caveats
- The core implementation changes in `src/lib/` and `src/contexts/` are functionally sound and adhere to the architectural invariants.
- The failures are concentrated in the verification gates (ESLint rule in the new adversarial test file and production build prerendering).

---

## 6. Conclusion
Verdict: **REQUEST_CHANGES**.
The code refactoring for upward import elimination, context relocation, and config hardening is structurally sound, but changes are requested to resolve the 2 ESLint errors in `src/__tests__/m2_challenger_adversarial.test.ts` and ensure `npm run build` passes with exit code 0.

---

## 7. Verification Method
To independently verify the findings:
1. Run ESLint:
   ```bash
   cd frontend
   npm run lint
   ```
   *Expected behavior after fix*: Exit code 0, 0 problems.
2. Run Type Check:
   ```bash
   npx tsc --noEmit
   ```
   *Expected behavior*: Exit code 0.
3. Run Unit Tests:
   ```bash
   npm test
   ```
   *Expected behavior*: Exit code 0 (all test suites pass).
4. Run Production Build:
   ```bash
   npm run build
   ```
   *Expected behavior after fix*: Exit code 0.
