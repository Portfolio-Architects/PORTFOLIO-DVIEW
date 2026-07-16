# Handoff Report - Explorer 2 UX/UI & PWA Navigation Analysis

## 1. Observation
- In `LoungeContainerClient.tsx` (lines 303-309), the "현장 임장기" click handler routes to `/` using `window.location.href = '/'`. It is implemented on a `<span>` element and lacks `tabIndex` and keyboard event handlers.
- In `LoungeFeedClient.tsx`, there are 3 occurrences of `/#apt=` routing redirecting to the main page map:
  - Line 1153: `window.location.href = \`/#apt=\${encodeURIComponent(news.apartmentName)}\`;` (inside card `onKeyDown`)
  - Line 1162: `window.location.href = \`/#apt=\${encodeURIComponent(news.apartmentName)}\`;` (inside card `onClick`)
  - Line 1188: `window.location.href = \`/#apt=\${encodeURIComponent(news.apartmentName || '')}\`;` (inside nested badge `onClick`)
- The nested badge `span` for "🏠 아파트 랩 연동" (lines 1184-1196) has click event handling but lacks keyboard focus (`tabIndex={0}`) or enter key handler.
- In `explore/layout.tsx` (line 11), `explore/page.tsx` (line 21), and `lounge/layout.tsx` (line 13), the container elements use the `bg-surface` class.
- In `pwa-register.js` (lines 45-49), service worker registration waits for the window `load` event when the document state is not `'complete'`.
- In `PWAProvider.tsx` (lines 354-383), `waiting` service worker status is checked within `navigator.serviceWorker.ready.then(...)`.

---

## 2. Logic Chain
- **Navigation Alignment**: The root URL `/` is the **D-VIEW 테크노 랩 (Office/ 지산)**, whereas the real estate interactive map is on `/overview`.
- **R2 (Lounge Page Navigation)**: Since "현장 임장기" and "🏠 아파트 랩 연동" are intended to route users to the apartment map and open specific apartment detail modals respectively, directing them to `/` is incorrect. They must route to `/overview` and `/overview#apt=...`.
- **Keyboard Access**: Non-interactive HTML elements (such as `<span>`) with click event listeners do not natively receive keyboard focus or register Enter/Space clicks. Adding `tabIndex={0}` and `onKeyDown` listeners ensures accessibility compliance.
- **R1 (Design Contrast)**: Since card components render in `bg-surface`, their layout wrappers must use `bg-body` to maintain high visual contrast.
- **R3 (PWA Optimization)**: Registering the SW on `DOMContentLoaded` ensures registration happens as early as possible. Checking `.waiting` using `.getRegistration()` on mount avoids waiting for `.ready` to resolve.

---

## 3. Caveats
- We did not implement or edit any codebase files, as we are strictly read-only.
- The `AptStoriesWidget.tsx` and `LoungeDetailClient.tsx` also contain routing targets pointing to `/#apt=...`. Although not explicitly in the primary focus list, they are part of the lounge routing flow and have been included in the proposed recommendations.

---

## 4. Conclusion
- Update `LoungeContainerClient.tsx` "현장 임장기" to route to `/overview`, using a `<button>` or adding keyboard listeners.
- Update `LoungeFeedClient.tsx` redirect targets from `/#apt=` to `/overview#apt=` and add `tabIndex={0}` + keyboard keydown handlers to the "🏠 아파트 랩 연동" badge span.
- Replace `bg-surface` with `bg-body` in the three explore and lounge layout/page wrappers.
- Improve SW registration timing in `pwa-register.js` and waiting state checking in `PWAProvider.tsx` to optimize update popup loading speed.

---

## 5. Verification Method
- **Command**: Run `npm run audit` in `frontend/` directory to run the TS compile check, ESLint check, and E2E tests.
- **Paths to Inspect**:
  - `frontend/src/components/LoungeContainerClient.tsx`
  - `frontend/src/components/LoungeFeedClient.tsx`
  - `frontend/src/app/explore/layout.tsx`
  - `frontend/src/app/explore/page.tsx`
  - `frontend/src/app/lounge/layout.tsx`
  - `frontend/public/js/pwa-register.js`
  - `frontend/src/components/pwa/PWAProvider.tsx`
