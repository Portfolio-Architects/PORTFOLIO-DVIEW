# Project: D-VIEW Architecture Refactoring

## Architecture
D-VIEW is a Next.js (App Router, Turbopack, TypeScript, TailwindCSS) real estate analytics and community platform.
The architecture enforces strict unidirectional dependency flow:

```
Presentation Layer (`src/components/`, `src/app/`)
       │
       ▼
Application Layer (`src/hooks/`, `src/contexts/`)
       │
       ▼
Infrastructure Layer (`src/lib/repositories/`, `src/lib/services/`, `src/lib/api/`)
       │
       ▼
Domain & Types Layer (`src/types/`)
```

### Architectural Layer Invariants
1. **Domain & Types Layer (`src/types/`)**: Zero external dependencies, pure TypeScript type declarations, DTOs, entity models, and value objects. No runtime logic, no JSX/React imports.
2. **Infrastructure Layer (`src/lib/`)**: Data access, repositories, database adapters (Firestore, Redis), external API clients (Google Sheets, MOLIT), utility math/scoring engines, and server-side API response envelopes (`apiSuccess`, `apiError`). Must NOT import from `src/components/`, `src/app/`, or `src/hooks/`.
3. **Application Layer (`src/hooks/`, `src/contexts/`)**: Application state, client-side orchestration, custom hooks, React Context providers. Handles race conditions, request cancellation (`AbortController`), and deduplicated caching.
4. **Presentation Layer (`src/components/`, `src/app/`)**: React UI components, page routes, dynamic loading boundaries, modals, charts, and API route handlers (`src/app/api/`). Adheres to Single Responsibility Principle (SRP) and preserves all existing `data-testid` and props contracts.
5. **Data Pipeline Layer (`scripts/pipeline/`)**: ETL scripts for outlier filtering, macro trends, apartment summarization, and file chunk generation.

---

## Feature Inventory
| # | Feature / Area | Description | Milestone | Source |
|---|----------------|-------------|-----------|--------|
| 1 | Centralized Domain Types | Consolidate scattered types into `src/types/` (`apartment.ts`, `transaction.ts`, `report.ts`, `lounge.ts`, `review.ts`, `user.ts`, `macro.ts`, `technovalley.ts`, `valuation.ts`, `calculator.ts`, `notice.ts`, `inquiry.ts`, `api.ts`, `index.ts`) | M1 | Survey (Explorer 1) [DONE] |
| 2 | Elimination of Untyped `any` & Type Duplications | Remove duplicate apartment/transaction/news definitions; remove `any` from schemas (`facade.schemas.ts`), modal props, and chart tooltips | M1 | Survey (Explorer 1) [DONE] |
| 3 | Separation of Runtime Logic from Types | Move SVG avatar rendering and constants from `user.types.ts` into `src/lib/utils/userUtils.ts` | M1 | Survey (Explorer 1) [DONE] |
| 4 | Repository Encapsulation & Resilient Error Handling | Encapsulate Firestore, Redis, Google Sheets, and MOLIT data operations into typed repositories with uniform retry & error handling | M2 | Survey (Explorer 2) [DONE] |
| 5 | Removal of Upward Layer Imports in Lib | Remove `SettingsModal` from `SettingsContext`, Lucide icons from `post.repository.ts`, `useDashboardData` from `DashboardFacade.ts`, and UI imports from `preloadHelpers.ts` | M2 | Survey (Explorer 2, 3) [DONE] |
| 6 | Secure Config & Environment Variable Hardening | Remove hardcoded fallback API keys in `officeTx.repository.ts`, `energy.repository.ts`, and `api.config.ts`; validate via environment schema | M2 | Survey (Explorer 2) [DONE] |
| 7 | Application State & Context Relocation | Relocate `src/lib/contexts/` to `src/contexts/` to establish clean Application layer boundary | M2 | Survey (Explorer 2) [DONE] |
| 8 | Application Hook Abstraction & Cancellation | Eliminate raw Firestore queries in `useStaticData.ts`; add typed client adapters for `useFavorites.ts`, `useComments.ts`; implement `AbortController` cancellation | M3 | Survey (Explorer 2) [DONE] |
| 9 | API Route Response Envelope Standardization | Standardize all 44 API routes in `src/app/api/` with unified envelope (`apiSuccess`, `apiError`), `checkRateLimit`, and standard HTTP status codes | M4 | Survey (Explorer 3) [DONE] |
| 10 | Presentation Component Decoupling & SRP | Extract domain computation from `src/app/apartment/[aptName]/page.tsx` into domain services (`apartmentPageService.ts`); preserve Recharts and `data-testid` contracts | M4 | Survey (Explorer 3) [DONE] |
| 11 | Full Verification & Zero-Regression Guardrail | Execute and pass `npx tsc --noEmit` (0 errors), `npm run lint` (0 errors/warnings), `npm test` (84 test suites / 710 tests pass), `npm run build` (Turbopack, 177 pages), `madge` (0 cycles) | M5 | Survey (Explorer 3) [DONE] |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Domain & Types Layer Refactoring | Centralize all domain models into `src/types/`, eliminate duplicates and `any` types, isolate runtime helpers | none | DONE |
| M2 | Infrastructure & Repository Layer Refactoring | Standardize repositories, remove upward imports, relocate contexts, secure config | M1 | DONE |
| M3 | Application & Hooks Layer Refactoring | Decouple hooks from raw Firestore/fetch, implement request cancellation & race condition guards | M1, M2 | DONE |
| M4 | Presentation & API Routes Layer Refactoring | Standardize 44 API routes with uniform response envelope & rate limiting, decouple page business logic | M1, M2, M3 | DONE |
| M5 | Final Verification & Zero-Regression Hardening | Execute full gate suites (`tsc`, `lint`, `test`, `build`, `madge`) and adversarial validation | M1, M2, M3, M4 | DONE |

---

## Interface Contracts

### 1. Domain Types Interface (`src/types/`)
- `src/types/apartment.ts`: Canonical `DongApartment`, `StaticApartment`, `ApartmentSummary`, `AptMeta`
- `src/types/transaction.ts`: Canonical `TransactionRecord`, `RecentTransaction`, `TransactionSummary`
- `src/types/api.ts`: Standard API envelope `ApiResponse<T>`, `ApiSuccessResponse<T>`, `ApiErrorResponse`
- `src/types/user.ts`: `UserProfile`, `UserRole`, `AuthUser`
- `src/types/report.ts`, `src/types/lounge.ts`, `src/types/review.ts`, `src/types/macro.ts`, `src/types/technovalley.ts`, `src/types/valuation.ts`, `src/types/calculator.ts`, `src/types/notice.ts`

### 2. API Response Envelope Contract (`src/lib/api/apiResponse.ts`)
```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: number;
    path?: string;
    durationMs?: number;
    [key: string]: any;
  };
}
```

### 3. Rate Limiter Contract (`src/lib/api/rateLimiter.ts`)
```typescript
function checkRateLimit(
  req: NextRequest,
  config?: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; reset: number; response?: NextResponse }>;
```

---

## Code Layout
```
frontend/src/
├── types/                 # Layer 0: Pure domain interfaces, types, DTOs, API envelopes (no runtime code)
├── lib/                   # Layer 1: Infrastructure, repositories, DB/Redis clients, scoring engines, API helpers
│   ├── repositories/      # Encapsulated data access (Firestore Admin, Redis, APIs)
│   ├── services/          # External services (Google Sheets, MOLIT Open Data, apartmentPageService)
│   ├── api/               # API envelope helpers, rate limiting, error codes, typed apiClient
│   ├── utils/             # Pure mathematical and formatting utility functions
│   └── validation/        # Zod validation schemas
├── contexts/              # Layer 2: React Context state providers (AuthContext, SettingsContext, etc.)
├── hooks/                 # Layer 2: Custom React hooks, client-side data synchronization & cancellation
├── components/            # Layer 3: Presentation UI components, modals, charts (SRP, memoized)
└── app/                   # Layer 3: Next.js App Router (pages, layouts, and API route handlers `api/`)
```
