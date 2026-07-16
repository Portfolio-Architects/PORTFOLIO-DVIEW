# DVIEW Patch UX/PWA Synthesized Plan

## Consensus Findings

### R1. 디자인 일관성 확보 (Background Color)
- Update layouts and page components to use `bg-body` instead of `bg-surface` to establish proper visual contrast with card components (which use `bg-surface` or `bg-surface/80` glassmorphism).
- Target files:
  1. `frontend/src/app/explore/layout.tsx` (Line 11): Change `bg-surface` -> `bg-body`
  2. `frontend/src/app/explore/page.tsx` (Line 21): Change `bg-surface` -> `bg-body`
  3. `frontend/src/app/lounge/layout.tsx` (Line 13): Change `bg-surface` -> `bg-body`

### R2. 라운지 페이지 내비게이션 및 라우팅 정합성 수정
- Fix navigation routing targets from root (`/`) to `/overview` or `/overview#apt=...` to ensure interactive maps load properly.
- Target files:
  1. `frontend/src/components/LoungeContainerClient.tsx` (Line 304): Update "현장 임장기" click to route to `/overview`. Convert to accessible button with keydown handlers (Enter/Space) and correct tailwind class mapping.
  2. `frontend/src/components/LoungeFeedClient.tsx`:
     - Card keydown / click handlers (Lines 1153, 1162): Update redirect target `/#apt=` to `/overview#apt=`.
     - Badge click handler (Line 1188): Update redirect target `/#apt=` to `/overview#apt=`. Add keyboard accessibility (`tabIndex={0}` and keydown handler for Enter/Space).
  3. System-Wide Redirection Integrity:
     - Check and update references to `/#apt=` in the following files to prevent broken navigation:
       - `frontend/src/components/LoungeDetailClient.tsx` (Line 1214)
       - `frontend/src/components/AptStoriesWidget.tsx` (Line 94)
       - `frontend/src/lib/utils/kakaoShare.ts` (various link sharing logic)
       - Push notification API routes: `frontend/src/app/api/push/notify-comment/route.ts` & `notify-new-high/route.ts`

### R3. PWA 업데이트 적용 팝업 출력 성능 최적화
- **Service Worker Registration Timing**:
  - In `frontend/public/js/pwa-register.js` (Lines 45-49), do not wait for the window `load` event. Register immediately if `document.readyState` is `'complete'` or `'interactive'`, otherwise use `'DOMContentLoaded'`.
- **Immediate Waiting Status Check**:
  - In `frontend/src/components/pwa/PWAProvider.tsx` (Lines 354-383), immediately check for a `waiting` worker on mount using `navigator.serviceWorker.getRegistration()`. Setup the monitor right away if found, and keep `navigator.serviceWorker.ready` as a fallback. Implement a protection to prevent double-registration listeners.

---

## Action Plan for Worker

1. Apply changes for **R1 (Background Color)**.
2. Apply changes for **R2 (Lounge Routing)**, including keyboard accessibility improvements.
3. Apply changes for **R3 (PWA Optimization)**.
4. Run standard local checks:
   - Typecheck: `npx tsc --noEmit` inside `frontend/`
   - ESLint: `npx eslint . --max-warnings=10` or verify clean audit
   - Build: `npm run build` in the `frontend` directory to ensure perfect technical integrity.
5. Provide a detailed handoff report when complete.
