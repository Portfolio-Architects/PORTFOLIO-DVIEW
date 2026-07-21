# Original User Request

## Initial Request — 2026-07-21T12:30:38Z

Refactor and upgrade the D-VIEW (디뷰) Real Estate & Techno-Valley Data Analytics Web Application to achieve a competition-winning (공모전 우승) standard across visual aesthetic design, sub-100ms navigation performance, modular architecture, and zero-error testing.

Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW
Integrity mode: development

## Requirements

### R1. UI/UX Aesthetic & Visual Polish (Competition Top-Tier Standard)
- Transform key components (DashboardClient, MacroDashboardClient, LoungeModal, MobileDock, LoungeHeader) into modern, highly-polished user interfaces using dark/light theme consistency, smooth Glassmorphism cards, micro-interactions, clean typography, and interactive data visualization.
- Ensure all charts, tables, and maps adapt seamlessly across desktop, tablet, and mobile displays without horizontal scroll breaks or dynamic layout shifts (Cumulative Layout Shift < 0.05).

### R2. Sub-100ms Zero-Delay & Zero-Jank Navigation
- Enhance prefetching (Next.js Link hover prefetching & SWR cache strategies) and optimize client-side data state updates.
- Eliminate tab-switching delays across Data Lab, Apartment Lab, Technovalley, and Lounge detail modals.
- Ensure scroll positions, sticky headers, and active state indicators in the top bar and mobile dock remain strictly synchronized.

### R3. Modular Architecture, Type Safety & Strict Standardizing
- Enforce strict TypeScript typing across all components, API hooks, and data models.
- Clearly separate React Server Components (RSC) and Client Components with minimal client bundle size footprint.

### R4. Automated Testing & End-to-End Quality Verification
- Verify that npm run build in frontend/ passes without any TypeScript or linter errors.
- Ensure all unit tests (npm test) and E2E Playwright tests (npx playwright test) pass cleanly.

## Follow-up — 2026-07-21T13:26:44Z

Audit, verify, and harden the data integrity, calculation consistency, and algorithm correctness across all data models, API parsers, tax simulation formulas, and analytics score computations in the D-VIEW (디뷰) Web Application.

Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW
Integrity mode: development

## Requirements

### R1. Tax Benefit & Business Matching Algorithm Verification
- Audit tax reduction simulation formulas (acquisition tax, property tax, corporate tax reduction rates for Dongtan Techno-Valley migration) to match official local tax ordinances without precision drift.
- Verify Office FitFinder and Share-Office roommate matching algorithms for logical consistency and accurate scoring calculation.

### R2. Data Pipeline & Schema Integrity (SSOT & Public API Parsers)
- Audit data mapping and Zod validation schemas across Google Sheets SSOT, Ministry of Land XML transaction APIs, Hwaseong enterprise data, and Firestore DB.
- Ensure Upstash Redis L2 caching and SWR synchronization do not introduce stale data or desynchronization bugs.

### R3. Comprehensive Automated Audit Suite (npm run audit & Jest)
- Implement rigorous Jest unit and integration tests covering every data formula, parser edge-case, and schema validator.
- Ensure npm run audit executes cleanly with 100% pass rate across TypeScript compilation, ESLint, data consistency, and E2E test suites.

## Acceptance Criteria

### Data & Algorithm Precision
- [ ] All tax reduction simulation results match official tax ordinance formulas with 0 precision error.
- [ ] Data parsers handle all edge-case XML/JSON responses cleanly without falling back to corrupted or unvalidated states.

### Automated Test Passing
- [ ] npm run audit in frontend/ succeeds with exit code 0.
- [ ] All Jest unit/data tests (npm test) pass with 100% success rate.
- [ ] Zero TypeScript or linter warnings across data layer services and facades.
