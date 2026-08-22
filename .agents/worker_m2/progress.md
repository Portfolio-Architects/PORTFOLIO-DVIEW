# Progress — Worker M2 (Milestone 2)

**Last visited**: 2026-08-22T22:33:30+09:00

## Tasks
- [x] Task 1: `frontend/src/app/layout.tsx` - Convert `SettingsModal`, `WelcomeModal`, `CustomA2HSModal` to `dynamic(() => import(...))`
- [x] Task 2: `frontend/src/components/OfficeExplorerClient.tsx` - Convert `OfficeDetailModal` to `dynamic(() => import(...), { ssr: false })`
- [x] Task 3: `frontend/src/components/ApartmentModal.tsx` - Convert `PushSubscriptionModal` to `dynamic(() => import(...), { ssr: false })`
- [x] Task 4: `frontend/src/components/EngineeringReportClient.tsx` & `frontend/src/components/ReportClient.tsx` - Convert static jsPDF import to lazy dynamic import in export handlers
- [x] Task 5: `frontend/next.config.ts` - Add `recharts` to `experimental.optimizePackageImports`
- [x] Task 6: `frontend/src/lib/preload.ts` - Implement non-blocking idle priority preloading with `requestIdleCallback`
- [x] Task 7: Verification (`npx tsc --noEmit` & `npm test` & `npm run build`)
- [x] Task 8: Write handoff report & notify orchestrator
