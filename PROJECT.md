# Project: D-VIEW Web UX & Performance Optimization Phase

## Architecture
- React / Next.js app directory structure in `frontend/src`.
- Global CSS in `frontend/src/app/globals.css`.
- Main dashboard client: `frontend/src/components/DashboardClient.tsx`.
- Macro dashboard client: `frontend/src/components/MacroDashboardClient.tsx`.
- Community / Lounge page and detail modal: `frontend/src/app/lounge/` and `frontend/src/components/LoungeModal.tsx`.
- Service worker caching logic in `frontend/public/sw.js`.
- Playwright E2E and Jest unit test suites in `frontend/tests/` and other test files.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Baselining | Explore codebase, run baseline build/test to see failures or metrics, identify bottlenecks in SW, prefetch, tabs, and modals | none | DONE |
| 2 | R1: Zero-Delay Navigation | Optimize Next.js prefetching, programmatic prefetch on hover, SWR/Context caching, and Service Worker chunk/JSON caching | 1 | DONE |
| 3 | R2: Zero-Jank Transitions | Eliminate CLS and lag in tab switching (Data Lab, Apartment Lab, Technovalley) and Community detail modal transitions, handle scroll and sticky headers | 2 | DONE |
| 4 | R3: Final Verification | Verify production build success, run E2E Playwright/Jest tests, check integrity | 3 | DONE |
| 5 | Phase 2: Adversarial Hardening | Challenger-driven white-box testing to discover and patch edge cases in navigation and transitions | 4 | DONE |

## Interface Contracts
### LoungeHeader ↔ MobileDock
- Active routes and labels must be structurally aligned (e.g., matching tabs, items, paths).
- Same visual feedback indicators (background, font weight, border/underline).

## Code Layout
- Frontend project root: `frontend/`
- Navigation: `frontend/src/components/`
- Pages: `frontend/src/app/`
- Tests: `frontend/tests/`
