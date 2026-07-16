# DVIEW Patch UX/PWA Implementation Changes

## 1. 디자인 일관성 확보 (Background Color) [R1]
- **explore/layout.tsx**: Updated main container `div` background class from `bg-surface` to `bg-body` to establish proper contrast against card components.
- **explore/page.tsx**: Updated skeleton wrapper container `div` background class from `bg-surface` to `bg-body`.
- **lounge/layout.tsx**: Updated main container `div` background class from `bg-surface` to `bg-body`.

## 2. 라운지 페이지 내비게이션 및 라우팅 정합성 수정 [R2]
- **LoungeContainerClient.tsx**: Converted the "현장 임장기" `span` into an accessible HTML `button`. Added style-matching Tailwind classes (`bg-transparent border-none p-0 font-normal text-tertiary text-[13px] sm:text-[14.5px] leading-snug cursor-pointer hover:text-primary hover:underline hover:decoration-dashed transition-colors`) and keyboard events (keydown triggers navigation on Enter/Space). Corrected target redirection route to `/overview` instead of `/`.
- **LoungeFeedClient.tsx**:
  - Updated card keydown and click handlers to redirect to `/overview#apt=` instead of `/#apt=`.
  - Added accessibility parameters (`role="link"`, `tabIndex={0}`, keyboard Enter/Space keydown listener, and focus ring styling) to the apartment badge container. Updated its redirection route to `/overview#apt=`.
- **LoungeDetailClient.tsx**: Updated the auto-linker mention URL builder to point to `/overview#apt=` instead of `/#apt=`.
- **AptStoriesWidget.tsx**: Updated the `handleCardClick` redirection target to `/overview#apt=`.
- **kakaoShare.ts**: Corrected all Kakao Link share targets and clipboard fallbacks to point to `/overview#apt=` instead of `/#apt=` across all modules (including general share, jeonse, mortgage, tax, sell timing, and custom details).
- **notify-comment/route.ts**: Updated the push notification payload URL targeting the comment location to `/overview#apt=`.
- **notify-new-high/route.ts**: Updated the push notification payload URL targeting the new high transaction location to `/overview#apt=`.

## 3. PWA 업데이트 적용 팝업 출력 성능 최적화 [R3]
- **pwa-register.js**: Refactored the service worker registration trigger. Rather than waiting for the global window `load` event, it now registers immediately if `document.readyState` is `'complete'` or `'interactive'`. If not, it falls back to the `'DOMContentLoaded'` event on the document.
- **PWAProvider.tsx**:
  - Created a `setupMonitor(reg)` helper to handle registering service worker listeners, initiating manual updates, and querying waiting states.
  - Implemented an `isConfigured` guard to guarantee that listeners and manual update checks are set up exactly once per component lifecycle.
  - Checked `navigator.serviceWorker.getRegistration()` on mount to immediately query the active service worker and check if an update is waiting.
  - Set up `navigator.serviceWorker.ready` as a fallback, protecting against duplicate registrations via the `isConfigured` guard.
