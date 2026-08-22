# Original User Request

## 2026-08-21T14:27:33Z

Execute an end-to-end architectural layer refactoring across the D-VIEW project (`frontend/`), establishing clean layer boundaries, eliminating circular dependencies, standardizing domain contracts, and ensuring zero regressions across all verification gates.

Working directory: frontend
Integrity mode: development

## Requirements

### R1. Architectural Layer Boundary & Separation of Concerns
Establish clear architectural layer isolation across the codebase:
1. **Domain & Types Layer (`src/types/`, Domain Entities/Value Objects)**: Centralize data contracts, DTOs, and type interfaces. Eliminate duplicate type definitions and unsafe `any`/type assertions across modules.
2. **Infrastructure & Repository Layer (`src/lib/`, DB/Cache/External APIs)**: Encapsulate data fetching (Firestore, Upstash Redis, Google Sheets, MOLIT Open Data) into clean repository and adapter interfaces with uniform error handling and retry resilience.
3. **Application & Hook Layer (`src/hooks/`)**: Separate business/application orchestration and data synchronization from UI rendering. Ensure custom hooks handle race conditions, cancellation, and deduplicated caching safely.
4. **Presentation Layer (`src/components/`, `src/app/`)**: Enforce unidirectional data flow and modular SRP (Single Responsibility Principle) composition. Ensure high-frequency render paths and heavy components use appropriate memoization and lazy-loading boundaries without breaking test IDs or props contracts.
5. **Data Pipeline Layer (`scripts/`)**: Maintain modular decomposition of ETL scripts (outlier filters, trend aggregators, file chunk generators) with clean interfaces and isolated execution paths.

### R2. Strict Interface Contracts & Cross-Layer Dependency Rules
Enforce clean dependency direction (UI → Application → Infrastructure → Domain):
1. Prevent upward/circular dependencies (e.g. presentation logic leaking into domain/data layers or infrastructure leaking UI state).
2. Standardize all API route handlers (`src/app/api/`) using the unified response envelope (`success`, `data`, `error`, `meta`) with standardized status codes and rate limiting.

### R3. Verification & Zero-Regression Guardrail
The refactoring must pass all static analysis, type checking, test suites, and production build pipelines without regression:
1. TypeScript strict type check passes with 0 errors (`npx tsc --noEmit`).
2. ESLint checks pass with 0 errors and 0 warnings (`npm run lint`).
3. Full test suite passes without flaky or failing tests (`npm test`).
4. Production build completes successfully with Turbopack (`npm run build`).

## Acceptance Criteria

### Layer Separation & Clean Code Quality
- [ ] No circular dependencies or upward imports across domain, infrastructure, application, and UI layers.
- [ ] Domain models and API DTO contracts are strictly typed without untyped `any` leaks in repositories or custom hooks.
- [ ] API routes consistently utilize the standard response envelope and resilient error handling.
- [ ] UI components preserve all existing user-facing props interfaces, behavioral contracts, and data-testid attributes.

### Objective Verification Gates
- [ ] `npx tsc --noEmit` exits with status code 0 and 0 errors.
- [ ] `npm run lint` exits with status code 0 and 0 errors.
- [ ] `npm test` executes the complete test suite and passes 100% of tests with 0 failures.
- [ ] `npm run build` completes the Next.js production build without errors.
