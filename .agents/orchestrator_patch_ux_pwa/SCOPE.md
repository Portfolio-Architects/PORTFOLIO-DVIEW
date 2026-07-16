# Scope: DVIEW UX/UI and PWA Patch

## Architecture
- **Tech Stack**: Next.js (App Router), React, TypeScript, TailwindCSS.
- **Background Styling**: Adjust backgrounds from `bg-surface` to `bg-body` in explore and lounge layout/page components to improve visual contrast against cards (which use `bg-surface` or `bg-surface/80`).
- **Lounge Routing**: Fix routing in community features. Ensure links redirect to `/overview` instead of `/` and `/overview#apt=...` instead of `/#apt=...` to ensure correct rendering of the map and apartment details modal.
- **PWA Service Worker Registration & UI**:
  - `pwa-register.js`: Optimize SW registration timing to trigger immediately on `interactive` or `complete` document readystates, or fallback to `DOMContentLoaded`.
  - `PWAProvider.tsx`: Check for `waiting` worker state immediately upon mounting using `navigator.serviceWorker.getRegistration()` instead of waiting for `navigator.serviceWorker.ready`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | R1. 디자인 일관성 확보 (Background Color) | Update layout.tsx and page.tsx files under /explore and /lounge to use bg-body background color | None | PLANNED |
| 2 | R2. 라운지 페이지 내비게이션 및 라우팅 정합성 수정 | Fix routing target URLs in LoungeContainerClient.tsx and LoungeFeedClient.tsx to point to /overview | None | PLANNED |
| 3 | R3. PWA 업데이트 적용 팝업 출력 성능 최적화 | Refactor SW registration timing and immediate waiting status check in PWAProvider.tsx | None | PLANNED |
| 4 | R4. 전수 검증 및 빌드 정합성 확보 (Technical Integrity) | Run npm run audit to verify compile, lint, and E2E test suite success | M1, M2, M3 | PLANNED |

## Interface Contracts
- **Routing parameters**: `/overview#apt=...` must contain the apartment name parameter mapped exactly as expected by the overview page component.
- **Service Worker API**: `navigator.serviceWorker.getRegistration()` returns a Promise resolving to the ServiceWorkerRegistration, which contains the `.waiting` property indicating if a new worker is waiting to activate.
