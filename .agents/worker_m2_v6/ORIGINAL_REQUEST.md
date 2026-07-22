## 2026-07-22T07:22:52Z
You are Worker 1 for Milestone 2 (Frontend Performance & UI/UX Perfection) of the D-VIEW Refactoring project.
Your working directory is: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_m2_v6

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Mission & Task Details:
Refactor `frontend/src/` components to achieve competition-winning quality across:
1. Sub-100ms Navigation & Link Prefetching:
   - Ensure main routes (`technovalley`, `office`, `lounge`, `overview`, `imjang`) navigate seamlessly under 100ms.
   - Enable programmatic prefetching on hover across navigation links in `LoungeHeader.tsx` and `MobileDock.tsx`.
2. Header & Dock Active Route / State Synchronization:
   - Synchronize active route & state indicators between desktop `LoungeHeader` and `MobileDock` for all 5 main routes (`technovalley`, `office`, `lounge`, `overview`, `imjang`).
   - Eliminate duplicated desktop header markup in `DashboardClient.tsx` by reusing `LoungeHeader.tsx`.
   - Replace `window.history.replaceState` tab switching calls in `DashboardClient.tsx` and `MobileDock.tsx` with proper Next router context state synchronization so all components reflect current route & tab.
3. Zero Cumulative Layout Shift (CLS < 0.05):
   - Enforce fixed min-height containers and CSS grid/flex stability during tab switches and state changes.
4. Glassmorphism & UI/UX Polish:
   - Enhance dark/light glassmorphism styling (`backdrop-blur-xl`, CSS custom variables in `globals.css`).
   - Fix light-mode contrast accessibility violation on tab badge in `LoungeHeader` / `MobileDock`.
5. Verification:
   - Execute `npm run build` inside `frontend/` to verify zero TypeScript errors.
   - Execute `npm test` inside `frontend/` to verify all unit test suites pass.

Document all changes made in `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_m2_v6\changes.md` and `handoff.md`.
When finished, send a message to parent (ID: 30641c5e-2edf-4e25-aa58-f578c6aab4db) with the path to your handoff report.
