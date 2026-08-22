# Survey Report: R2 — Bundle Size & Code Splitting / Dynamic Imports Optimization

## 1. Observation

### 1.1 Root Layout Global Modals Static Imports
- **File**: `frontend/src/app/layout.tsx`
  - Line 25: `import CustomA2HSModal from '@/components/pwa/CustomA2HSModal';`
  - Line 35: `import WelcomeModal from '@/components/ui/WelcomeModal';`
  - Line 40: `import SettingsModal from '@/components/SettingsModal';`
  - Line 168: `<CustomA2HSModal />`
  - Line 169: `<WelcomeModal />`
  - Line 170: `<SettingsModal />`
- **Observed Characteristics**:
  - `CustomA2HSModal` (`src/components/pwa/CustomA2HSModal.tsx`, 212 lines) handles PWA installation prompt. Returns `null` unless `showCustomA2HSModal` is true.
  - `WelcomeModal` (`src/components/ui/WelcomeModal.tsx`, 238 lines) displays a first-time guide after a `1500ms` `setTimeout` or returns `null`.
  - `SettingsModal` (`src/components/SettingsModal.tsx`, 311 lines) displays user theme & area unit settings when triggered via user click.
  - **Issue**: These 3 modals (761 lines total + nested icons + DOM portal logic) are statically bundled into the global layout chunk, which is downloaded synchronously on **every single route** across the entire application (`/`, `/apartment/[aptName]`, `/explore`, `/news`, etc.).

---

### 1.2 Over-Aggressive Webpack Preloading on Dashboard Tabs
- **File**: `frontend/src/components/DashboardClient.tsx`
  - Lines 159–184:
    ```tsx
    const MacroDashboardClient = dynamic(() => import(/* webpackPreload: true */ '@/components/MacroDashboardClient').catch(err => { ... }), { 
      ssr: false, 
      loading: () => <MacroDashboardSkeleton /> 
    });

    const LoungeContainerClient = dynamic(() => import(/* webpackPreload: true */ '@/components/LoungeContainerClient').catch(err => { ... }), { 
      ssr: false, 
      loading: () => <LoungeSkeleton /> 
    });

    const OfficeExplorerClient = dynamic(() => import(/* webpackPreload: true */ '@/components/OfficeExplorerClient').catch(err => { ... }), { 
      ssr: false, 
      loading: () => <OfficeSkeleton /> 
    });
    ```
- **Observed Behavior**:
  - Webpack's `/* webpackPreload: true */` directive generates `<link rel="preload">` in the HTML document `<head>`.
  - When a user lands on the homepage (`/`), the browser immediately initiates network downloads for **all three client components** (`MacroDashboardClient`, `LoungeContainerClient`, and `OfficeExplorerClient`) in parallel before First Contentful Paint (FCP).
  - This creates bandwidth competition and JS parsing contention on the main thread, delaying the rendering of the active Overview tab.

---

### 1.3 Leaking `recharts` into `MacroDashboardClient` via `AptDonutSection`
- **Files**:
  - `frontend/src/components/MacroDashboardClient.tsx` (Lines 19, 22, 23):
    ```tsx
    import { MacroBriefingModal } from "./macro/components/MacroBriefingModal";
    import { AptDonutSection } from "./macro/components/AptDonutSection";
    ```
  - `frontend/src/components/macro/components/AptDonutSection.tsx` (Lines 4–10):
    ```tsx
    import {
      ResponsiveContainer,
      PieChart,
      Pie,
      Cell,
      Tooltip,
    } from 'recharts';
    ```
- **Observed Behavior**:
  - `MacroTrendChart` is properly dynamically imported (`dynamic(() => import("@/components/MacroTrendChart"), ...)`).
  - However, because `AptDonutSection` is statically imported in `MacroDashboardClient.tsx`, the entire `recharts` package (~150KB+ D3/SVG dependencies) is compiled directly into the `MacroDashboardClient` bundle.
  - `MacroBriefingModal` (115 lines, rendered via portal) is also statically imported even though it is only shown when the user explicitly triggers it or meets briefing criteria.

---

### 1.4 Static Modal Imports in `OfficeExplorerClient.tsx`
- **File**: `frontend/src/components/OfficeExplorerClient.tsx`
  - Line 18: `import OfficeDetailModal from '@/components/OfficeDetailModal';`
  - Lines 762–765:
    ```tsx
    <OfficeDetailModal 
      building={selectedBuilding} 
      onClose={() => setSelectedBuilding(null)} 
    />
    ```
- **Observed Behavior**:
  - `OfficeDetailModal` (`src/components/OfficeDetailModal.tsx`) is 816 lines (42KB), containing 28+ Lucide icons and detailed office spec calculator tables.
  - It is statically imported in `OfficeExplorerClient`, meaning the entire 42KB modal chunk is loaded and evaluated as soon as the Office tab mounts, even if the user never clicks any building card.

---

### 1.5 Static Modal Imports in `ApartmentModal.tsx`
- **File**: `frontend/src/components/apartment/ApartmentModal.tsx`
  - Line 31: `import PushSubscriptionModal from '@/components/pwa/PushSubscriptionModal';`
  - Lines 1247 & 1303: `<PushSubscriptionModal ... />`
- **Observed Behavior**:
  - `PushSubscriptionModal` (243 lines) is only displayed when the user clicks the notification bell button.
  - While other modals (`PhotoUploadModal`, `BuyOrWaitVote`, `JeonseSafetyReport`) are dynamically imported with `next/dynamic`, `PushSubscriptionModal` remains a static import.

---

### 1.6 Static Heavy PDF Imports in Admin Report Viewers
- **Files**:
  - `frontend/src/components/EngineeringReportClient.tsx` (Line 9): `import jsPDF from 'jspdf';`
  - `frontend/src/components/ReportClient.tsx` (Line 6): `import jsPDF from 'jspdf';`
- **Observed Behavior**:
  - `jspdf` (~300KB minified/gzipped, ~800KB raw) is imported at the module top level.
  - In contrast, `src/lib/utils/pdfExport.ts` correctly uses lazy dynamic loading:
    `const jsPDF = (await import('jspdf')).default;`

---

### 1.7 Unused & Heavy Dependencies in `package.json` and `next.config.ts`
- **Files**:
  - `frontend/package.json` (Line 52): `"mermaid": "^11.13.0"`
  - `frontend/package.json` (Lines 37, 62): `"@types/react-window": "^1.8.8"`, `"react-window": "^1.8.11"`
  - `frontend/next.config.ts` (Lines 29–31):
    ```ts
    experimental: {
      optimizePackageImports: ["lucide-react", "swr"],
    },
    ```
- **Observed Behavior**:
  - `mermaid` (>500KB gzipped) is only mentioned in markdown code blocks (`engineering-report.md`) and is **never imported** anywhere in `src/`.
  - `react-window` is never imported anywhere in `src/` (virtualization in explore client was refactored).
  - `recharts` is not included in `experimental.optimizePackageImports`.

---

### 1.8 Over-Eager Hover Preload Storm in `preload.ts`
- **File**: `frontend/src/components/common/preload.ts`
  - Lines 10–28:
    ```ts
    export function preloadApartmentModal(): void {
      if (typeof window === 'undefined') return;
      import('@/components/ApartmentModal').catch(() => {});
      import('@/components/CommentSection').catch(() => {});
      import('@/components/apartment-modal/ViralPaywallGate').catch(() => {});
      import('@/components/apartment-modal/JeonseSafetyReport').catch(() => {});
      import('@/components/apartment-modal/TransactionChartSection').catch(() => {});
      import('@/components/apartment-modal/PhotoUploadModal').catch(() => {});
      import('@/components/apartment-modal/BuyOrWaitVote').catch(() => {});
      import('@/components/apartment-modal/EducationAnalysisSection').catch(() => {});
      import('@/components/apartment-modal/InfraAnalysisSection').catch(() => {});
      import('@/components/apartment-modal/ScoutingReportDetailSection').catch(() => {});
      import('@/components/consumer/AdvancedValuationMetrics').catch(() => {});
      import('@/components/consumer/AnchorTenantCard').catch(() => {});
    }
    ```
  - Lines 33–39:
    ```ts
    export function preloadDashboardFeatures(): void {
      if (typeof window === 'undefined') return;
      import('@/components/GapInvestmentExplorer').catch(() => {});
      import('@/components/LoungeContainerClient').catch(() => {});
      import('@/components/MacroDashboardClient').catch(() => {});
      import('@/components/OfficeExplorerClient').catch(() => {});
    }
    ```
- **Observed Behavior**:
  - A single mouse hover event triggers 12 concurrent dynamic chunk requests.
  - `GapInvestmentExplorer` is deprecated/not mounted on the dashboard but is still preloaded.

---

## 2. Logic Chain

```
[Observation 1.1: layout.tsx static modal imports]
  └─> All 3 modals (SettingsModal, WelcomeModal, CustomA2HSModal) are included in the initial HTML layout chunk.
  └─> Causes larger initial JS payload on mobile / 3G connections on every page.
  └─> [Proposal 1]: Use dynamic imports with ssr: false in layout.tsx.

[Observation 1.2: webpackPreload: true in DashboardClient]
  └─> Browser downloads Lounge and Office chunks concurrently during initial page load of '/'.
  └─> Bandwidth and main thread CPU are stolen from the active MacroDashboardClient.
  └─> [Proposal 2]: Remove webpackPreload: true on LoungeContainerClient & OfficeExplorerClient.

[Observation 1.3: AptDonutSection static import of recharts]
  └─> MacroTrendChart's dynamic import fails to isolate recharts from MacroDashboardClient.
  └─> MacroDashboardClient initial chunk balloons with full recharts D3/SVG dependencies.
  └─> [Proposal 3]: Dynamically import AptDonutSection (with circular pulse fallback) and MacroBriefingModal.

[Observation 1.4: OfficeDetailModal static import in OfficeExplorerClient]
  └─> 816 lines / 42KB modal code loads synchronously when Office tab is selected.
  └─> [Proposal 4]: Convert OfficeDetailModal to next/dynamic with ssr: false.

[Observation 1.5: PushSubscriptionModal in ApartmentModal]
  └─> Static import adds unnecessary weight to ApartmentModal initial open.
  └─> [Proposal 5]: Dynamically import PushSubscriptionModal with ssr: false.

[Observation 1.6: Static jsPDF imports in admin reports]
  └─> jsPDF (~300KB+ gzipped) is evaluated on page load instead of on export click.
  └─> [Proposal 6]: Lazy load jsPDF inside handleExportPDF via await import('jspdf').

[Observation 1.7: Unused packages in package.json & next.config.ts]
  └─> mermaid (500KB+), react-window are dead dependencies.
  └─> [Proposal 7]: Remove unused deps from package.json and add "recharts" to optimizePackageImports.

[Observation 1.8: Hover preload storm in preload.ts]
  └─> 12 simultaneous network requests on single hover.
  └─> [Proposal 8]: Streamline preloadApartmentModal to only load primary modal shell.
```

---

## 3. Caveats

1. **Test Mocking Caveats**:
   - `AptCompareModal.adversarial.test.tsx`, `AptCompareModal.test.tsx`, `AptFitFinder.test.tsx`, `GapInvestmentExplorer.test.tsx`, and `MacroControls.test.tsx` directly import components without `next/dynamic` wrappers. Any code splitting changes in page/parent components must ensure test suites continue to import components directly or with properly resolved dynamic mocks.
2. **SSR & SEO Considerations**:
   - For `TossApartmentExploreClient` and `LoungeContainerClient`, SSR is currently preserved for SEO crawler accessibility. Dynamic code-splitting of user-interactive modals (`CustomA2HSModal`, `SettingsModal`, `OfficeDetailModal`, `PushSubscriptionModal`) has zero negative SEO impact because modals do not contain indexable body text.
3. **No Breaking API Changes**:
   - All proposed changes are purely presentation-layer import transformations (`next/dynamic` and inline `await import()`), preserving 100% of existing prop interfaces, callbacks, and runtime behaviors.

---

## 4. Conclusion & Actionable Optimization Roadmap

### Summary Table of Optimization Candidates

| Component / Target | Current Import Method | Proposed Optimization | Fallback / Skeleton | Estimated Saving |
|---|---|---|---|---|
| `layout.tsx` (`SettingsModal`) | Static `import` | `dynamic(() => import('@/components/SettingsModal'), { ssr: false })` | None (`null`) | ~25 KB |
| `layout.tsx` (`WelcomeModal`) | Static `import` | `dynamic(() => import('@/components/ui/WelcomeModal'), { ssr: false })` | None (`null`) | ~20 KB |
| `layout.tsx` (`CustomA2HSModal`) | Static `import` | `dynamic(() => import('@/components/pwa/CustomA2HSModal'), { ssr: false })` | None (`null`) | ~22 KB |
| `DashboardClient.tsx` (`LoungeContainerClient`) | `dynamic(webpackPreload: true)` | Remove `webpackPreload: true` | `<LoungeSkeleton />` | Eliminates early parallel preload |
| `DashboardClient.tsx` (`OfficeExplorerClient`) | `dynamic(webpackPreload: true)` | Remove `webpackPreload: true` | `<OfficeSkeleton />` | Eliminates early parallel preload |
| `MacroDashboardClient.tsx` (`AptDonutSection`) | Static `import` | `dynamic(() => import('./macro/components/AptDonutSection'), { ssr: false, loading: ... })` | `<div className="w-[200px] h-[200px] rounded-full border-4 border-dashed border-border animate-pulse" />` | Isolates `recharts` (~150 KB) |
| `MacroDashboardClient.tsx` (`MacroBriefingModal`) | Static `import` | `dynamic(() => import('./macro/components/MacroBriefingModal').then(m => m.MacroBriefingModal), { ssr: false })` | None (`null`) | ~12 KB |
| `OfficeExplorerClient.tsx` (`OfficeDetailModal`) | Static `import` | `dynamic(() => import('@/components/OfficeDetailModal'), { ssr: false })` | None (`null`) | ~42 KB |
| `ApartmentModal.tsx` (`PushSubscriptionModal`) | Static `import` | `dynamic(() => import('@/components/pwa/PushSubscriptionModal'), { ssr: false })` | None (`null`) | ~20 KB |
| `EngineeringReportClient.tsx` & `ReportClient.tsx` (`jsPDF`) | Static `import jsPDF from 'jspdf'` | `const jsPDF = (await import('jspdf')).default;` inside export handler | Loading spinner in export button | ~300 KB (at load time) |
| `package.json` Dependencies | Installed (`mermaid`, `react-window`) | Remove unused dependencies | N/A | Reduced node_modules & lockfile footprint |
| `next.config.ts` | `["lucide-react", "swr"]` | Add `"recharts"` to `optimizePackageImports` | N/A | Faster compilation & tighter tree-shaking |
| `preload.ts` | 12 simultaneous eager imports | Limit to primary modal shell | N/A | Eliminates hover network spike |

---

## 5. Verification Method

1. **TypeScript Type Safety**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected*: Zero errors (`exit code 0`).

2. **Full Unit & Integration Test Suites**:
   ```powershell
   npm test -- --passWithNoTests
   ```
   *Expected*: 99/99 test suites passing (1018+ tests green).

3. **Production Build & Bundle Size Analysis**:
   ```powershell
   npm run build
   ```
   *Expected*: Successful build (`exit code 0`) with reduced initial layout and overview chunk sizes.

4. **Runtime Verification**:
   - Verify modal triggers: Settings, A2HS, Welcome, Office detail modal, Push subscription modal open cleanly on demand without layout shift.
   - Verify PDF export in admin engineering report downloads as valid `.pdf`.
