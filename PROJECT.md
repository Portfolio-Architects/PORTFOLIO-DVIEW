# Project: D-VIEW Real Estate & Techno-Valley Data Analytics Web Application Refactoring

## Architecture
- Next.js App Router structure under `frontend/src/app/`
- Core UI & Client Components under `frontend/src/components/`:
  - `DashboardClient.tsx`
  - `MacroDashboardClient.tsx`
  - `LoungeModal.tsx` / `LoungeDetailClient.tsx`
  - `MobileDock.tsx`
  - `LoungeHeader.tsx`
- Navigation & Data Hooks: prefetching, SWR / context caching, service worker (`frontend/public/sw.js`)
- Global CSS & Glassmorphism themes: `frontend/src/app/globals.css`
- Automated Test Suites: `frontend/tests/` (Jest unit tests & Playwright E2E integration tests)

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Baselining | Run baseline `npm run build`, `npm test`, `npx playwright test` in `frontend/`, inspect components and bottlenecks | none | DONE |
| 2 | R1: UI/UX Aesthetic & Visual Polish | Modernize key components (`DashboardClient`, `MacroDashboardClient`, `LoungeModal`, `MobileDock`, `LoungeHeader`) with dark/light themes, Glassmorphism cards, micro-interactions, responsive CLS < 0.05 | 1 | DONE |
| 3 | R2: Sub-100ms Navigation & Zero-Jank | Optimize Next.js Link hover prefetching, SWR caching, tab switching (Data Lab, Apartment Lab, Technovalley, Lounge modal), scroll & dock sync | 2 | DONE |
| 4 | R3: Modular RSC/Client Architecture & TS | Enforce strict TypeScript typing across all components/hooks/models, clear RSC/Client boundary separation, minimal client bundle footprint | 3 | DONE |
| 5 | R4: Build, Unit & E2E Test Verification & Audit | Verify 100% passing build, unit tests, Playwright E2E tests, and Forensic Integrity Audit verification | 4 | DONE |

## Interface Contracts
### LoungeHeader ↔ MobileDock
- Active routes, labels, and state indicators are 100% synchronized across desktop header and mobile dock (5 main routes: `technovalley`, `office`, `lounge`, `overview`, `imjang`).
- Identical visual active indicators, smooth tab switching without DOM layout shift.

### RSC ↔ Client Components
- Server components fetch data without shipping unnecessary JS to the browser.
- Client components marked with `'use client'` encapsulate interactive UI, state, micro-interactions, and SWR hooks.

## Code Layout
- Frontend Root: `frontend/`
- Source Code: `frontend/src/`
- App Router: `frontend/src/app/`
- Components: `frontend/src/components/`
- Tests: `frontend/tests/`
