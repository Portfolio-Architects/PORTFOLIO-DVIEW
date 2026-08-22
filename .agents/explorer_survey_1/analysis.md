# Domain & Types Layer Comprehensive Survey Report (Milestone 1 Survey)

**Agent**: Explorer 1 (`explorer_survey_1`)  
**Target Codebase**: `frontend/src/`  
**Date**: 2026-08-21  
**Status**: Complete & Verified (tsc check passes with 0 errors)

---

## Executive Summary

A comprehensive, read-only survey of the Domain & Types layer and overall Type Safety across the `frontend/` codebase was conducted. The survey revealed that while TypeScript strict mode is enabled in `tsconfig.json`, type definitions are heavily fragmented, duplicated, and mislocated across `src/lib/types/`, `src/lib/validation/`, `src/lib/utils/`, page routes, and UI components. Furthermore, several untyped `any` leaks, unsafe type assertions, and presentation leaks (e.g., React JSX nodes / Lucide icons in domain interfaces) violate the architectural layer boundaries defined in `ORIGINAL_REQUEST.md`.

This report provides an exhaustive inventory of domain entities, value objects, DTOs, API contracts, duplicates, `any` occurrences, and tsconfig evaluation, concluding with a blueprint for a centralized domain model in `src/types/` and a zero-regression migration roadmap for Milestone 1.

---

## 1. tsconfig.json & TypeScript Strictness Review

### 1.1 Current Configuration (`frontend/tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "types": ["jest", "node"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    "**/*.mts",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "tests",
    "playwright.config.ts",
    "**/*.test.ts",
    "**/*.test.tsx",
    "jest.setup.ts"
  ]
}
```

### 1.2 Evaluation & Strictness Gaps

| Setting | Current Status | Assessment & Recommendation |
|---|---|---|
| `strict: true` | Enabled | Covers `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, `alwaysStrict`. Baseline check `npx tsc --noEmit` passes with 0 errors. |
| `noUncheckedIndexedAccess` | **Disabled** (default false) | **High Risk**: Object and array lookups (e.g. `Record<string, T>[key]` or `arr[0]`) return `T` instead of `T \| undefined`. Enabling this during Milestone 1 would prevent runtime `TypeError: undefined is not an object` errors in data transformation pipelines. |
| `exactOptionalPropertyTypes` | **Disabled** | Optional properties allow `undefined` explicitly. Keep as-is for now to prevent widespread breaks with Zod schemas. |
| `noImplicitOverride` | **Disabled** | Class-based strategies (e.g. `FirebaseDashboardDataStrategy`) do not enforce `override` keyword. Recommended to enable for clean OOP contracts. |
| `noFallthroughCasesInSwitch` | **Disabled** | Recommended to enable for switch statements in parsers/reducers. |
| `paths` | Single alias `@/*` | Only `@/*` is mapped. Recommending domain sub-aliases or clean module boundaries such as `@/types/*` for centralized domain imports. |
| `exclude` | Excludes test files | Unit tests are checked separately by Jest/ts-jest. The production build compilation strictly checks `src/`. |

---

## 2. Inventory of Domain Entities, Value Objects, DTOs & API Contracts

### 2.1 Domain Entities

| Entity | Primary Attributes | Current Locations |
|---|---|---|
| **ApartmentComplex** | `id`, `name`, `dong`, `brand`, `householdCount`, `yearBuilt`, `far`, `bcr`, `parkingPerHousehold`, `parkingCount`, `maxFloor`, `minFloor`, `lat`, `lng`, `txKey`, `isPublicRental` | `src/lib/dong-apartments.ts`<br>`src/lib/apartment-data.ts`<br>`src/lib/validation/facade.schemas.ts` |
| **Transaction / TransactionRecord** | `aptName`, `dong`, `dealType`, `contractYm`, `contractDay`, `contractDate`, `price`, `priceEok`, `deposit`, `monthlyRent`, `area`, `areaPyeong`, `floor`, `buildYear`, `buyer`, `seller`, `roadName`, `cancelDate`, `isOutlier`, `reqGb`, `rnuYn` | `src/lib/types/transaction.ts`<br>`src/hooks/useApartmentDetails.ts`<br>`src/hooks/useStaticData.ts`<br>`src/app/apartment/[aptName]/page.tsx` |
| **FieldReport / ScoutingReport** | `id`, `dong`, `apartmentName`, `thumbnailUrl`, `images`, `metrics`, `sections`, `premiumScores`, `premiumContent`, `isPremium`, `likes`, `commentCount`, `viewCount`, `authorUid`, `author`, `scoutingDate`, `createdAt`, `updatedAt` | `src/lib/types/report.types.ts`<br>`src/lib/types/scoutingReport.ts`<br>`src/lib/validation/facade.schemas.ts` |
| **LoungePost / Post** | `id`, `title`, `content`, `category`, `author`, `authorUid`, `imageUrl`, `likes`, `views`, `commentCount`, `verifiedApartment`, `verificationLevel`, `createdAt` | `src/lib/types/dashboard.types.ts`<br>`src/lib/repositories/post.repository.ts`<br>`src/components/LoungeContainerClient.tsx` |
| **Comment (Report & Lounge)** | `id`, `text`, `author`, `authorUid`, `apartmentName`, `createdAt` | `src/lib/types/report.types.ts`<br>`src/components/LoungeDetailClient.tsx`<br>`src/lib/repositories/comment.repository.ts` |
| **UserReview** | `id`, `apartmentName`, `dong`, `rating`, `content`, `photoURL`, `author`, `authorUid`, `verifiedApartment`, `verificationLevel`, `likes`, `createdAt` | `src/lib/types/review.types.ts`<br>`src/lib/repositories/review.repository.ts` |
| **UserProfile** | `nickname`, `hasSetNickname`, `photoURL`, `verifiedApartment`, `verificationLevel`, `createdAt`, `uploaderPoints`, `uploaderTier` | `src/lib/types/user.types.ts`<br>`src/lib/repositories/user.repository.ts` |
| **JisanCenter / CenterSpec / JisanBuilding** | `name`, `companyName`, `regType`, `complexName`, `status`, `landArea`, `buildingArea`, `totalFloorArea`, `roadAddress`, `developer`, `builder`, `unitCount`, `tenants`, `baselineVacancy` | `src/app/api/technovalley/center-specs/route.ts`<br>`src/app/api/technovalley/trend/route.ts`<br>`src/lib/services/googleSheets.ts`<br>`src/lib/validation/facade.schemas.ts` |
| **LocalNotice / Notice** | `id`, `title`, `url`, `dept`, `date`, `isDongtan`, `source`, `createdAt`, `content` | `src/app/api/cron/sync-local-notices/route.ts`<br>`src/components/LocalEventCuration.tsx`<br>`src/app/news/NewsClient.tsx`<br>`src/lib/validation/facade.schemas.ts` |
| **AdInquiry & Subscription** | `id`, `companyName`, `contactInfo`, `message`, `email`, `realtime`, `weekly`, `status`, `createdAt`, `updatedAt` | `src/app/admin/inquiries/page.tsx` |

---

### 2.2 Value Objects & Quantitative Domain Models

| Value Object | Description & Key Fields | Current Locations |
|---|---|---|
| **ObjectiveMetrics** | 25+ quantitative spatial and facility distance metrics (`distanceToElementary`, `distanceToSubway`, `distanceToStarbucks`, `academyDensity`, `restaurantDensity`, etc.) | `src/lib/types/scoutingReport.ts`<br>`src/lib/validation/facade.schemas.ts`<br>`src/lib/utils/valuationEngine.ts` |
| **PremiumScores & ScoreBreakdown** | Composite scoring structure with dimension weights (`education`, `transport`, `livingComfort`, `complex`, `lifestyle`, `totalScore`, `details`) | `src/lib/utils/scoring.ts`<br>`src/lib/validation/facade.schemas.ts` |
| **ValuationResult & ValuationBreakdown** | PUR (Price-to-Utility Ratio), DCF implied value, cap rate, discount rate, estimated yield, fair value gap, investment grade | `src/lib/utils/valuation.ts`<br>`src/lib/utils/valuationEngine.ts` |
| **VerdictResult & TaxResult** | AI Sell Timing score ('호구 지수'), rotation rate, capital gains tax breakdown (`transferProfit`, `taxableBase`, `computedTax`, `localTax`, `totalTax`, `isTaxFree`) | `src/lib/utils/sellTimingEngine.ts` |
| **AcquisitionCostResult & MortgageLoanResult** | Acquisition tax, brokerage fee, equal principal & interest monthly payment, amortization schedule | `src/lib/utils/calculatorEngines.ts` |
| **MacroEnvironment & SupplyPipeline** | Macro risk-free rate, funding cost, COFIX, jeonse conversion rate, inflation, expected move-in volume, historical avg volume | `src/lib/types/macro.types.ts`<br>`src/lib/utils/valuationEngine.ts` |
| **AptTxSummary & PyeongSummary** | Aggregated price metrics (`latestPrice`, `latestPriceEok`, `avg1MPrice`, `avg3MPrice`, `maxPrice`, `minPrice`, `txCount`, `recent`) | `src/lib/types/transaction.ts`<br>`src/app/apartment/[aptName]/page.tsx`<br>`src/lib/validation/facade.schemas.ts` |
| **ImageMeta & PhotoItem** | Image metadata with location tags, EXIF capturedAt timestamp, isPremium flag, caption, uploader info | `src/lib/types/scoutingReport.ts`<br>`src/lib/types/report.types.ts`<br>`src/lib/validation/facade.schemas.ts` |

---

### 2.3 API Envelopes, DTOs & Contracts

| Contract / DTO | Purpose & Signature | File Location |
|---|---|---|
| `ApiResponse<T>` | Standard response union: `ApiSuccessResponse<T> \| ApiErrorResponse` | `src/lib/api/apiResponse.ts` |
| `ApiSuccessResponse<T>` | `{ success: true, data: T, source?: string, message?: string }` | `src/lib/api/apiResponse.ts` |
| `ApiErrorResponse` | `{ success: false, error: string, code?: string, message?: string, details?: unknown }` | `src/lib/api/apiResponse.ts` |
| `InitialPageData` | Composite SSR payload for `/overview` and `/` (`favoriteCounts`, `typeMap`, `apartmentMeta`, `sheetApartments`, `fieldReports`, `kpis`, `macroTrend`, `txSummary`, `recent7DaysVolume`, `recentTransactions`) | `src/lib/validation/facade.schemas.ts:673`<br>`src/lib/services/dashboardData.ts` |
| `JisanStatusResponse` | `{ success: boolean, total: number, completedCount: number, underConstructionCount: number, notStartedCount: number, centers: JisanStatusItem[] }` | `src/lib/validation/facade.schemas.ts:114` |
| `CenterSpecsResponse` | Specs, curated tenant lists, and floor areas for 지식산업센터 | `src/app/api/technovalley/center-specs/route.ts` |
| `TrendResponse` | Jisan price/rent trends over time (`TrendRecord[]`) | `src/app/api/technovalley/trend/route.ts` |
| `TypeMapResponse` | Type mapping entries (`TypeMapItem[]` / `TypeMapEntry[]`) | `src/lib/services/googleSheets.ts`<br>`src/app/api/type-map/route.ts` |

---

## 3. Detailed Audit of Duplications, Inconsistencies & Type Safety Defects

### 3.1 Type Definition Duplication Matrix

```
[Problem: Fragmented Single-Source-of-Truth]
             ┌───────────────────────────────┐
             │   Apartment Model (5 defs)    │
             ├───────────────────────────────┤
             │ • DongApartment (dong-apts.ts)│
             │ • StaticApartment (apt-data)  │
             │ • StaticApartment (Dashboard) │
             │ • AptMeta (admin/page.tsx)    │
             │ • DongApartmentSchema (facade)│
             └───────────────────────────────┘
                            │
             ┌──────────────┴────────────────┐
             │   Transaction Model (8 defs)  │
             ├───────────────────────────────┤
             │ • RecentTx (transaction.ts)   │
             │ • RecentTransaction (trans.ts)│
             │ • TransactionRecord (useApt)  │
             │ • RawTransactionRecord (useApt│
             │ • Transaction (apt/[name])    │
             │ • Transaction (cron/notify)   │
             │ • HomeTransactionRecord (over)│
             │ • FirestoreTransaction (static│
             └───────────────────────────────┘
```

#### Detailed Breakdown of Duplicates:

1. **Apartment Entities**:
   - `src/lib/dong-apartments.ts:90`: `interface DongApartment { name: string; dong: string; householdCount?: number; yearBuilt?: string; brand?: string; lat?: number; lng?: number; txKey?: string; }`
   - `src/lib/apartment-data.ts:9`: `interface StaticApartment { name: string; dong: string; householdCount?: number; yearBuilt?: string; brand?: string; }`
   - `src/components/DashboardClient.tsx:228`: `interface StaticApartment { name: string; dong: string; householdCount?: number; yearBuilt?: string; brand?: string; }` (Exact duplicate defined inside component file!)
   - `src/app/admin/apartments/[name]/page.tsx:41` & `src/app/admin/page.tsx:43`: `interface AptMeta { householdCount?: number; yearBuilt?: string; brand?: string; far?: number; bcr?: number; parkingPerHousehold?: number; }`
   - `src/lib/validation/facade.schemas.ts:463`: `DongApartmentSchema`

2. **Transaction Entities & Records**:
   - `src/lib/types/transaction.ts:1`: `interface RecentTx`
   - `src/lib/types/transaction.ts:74`: `interface RecentTransaction`
   - `src/hooks/useApartmentDetails.ts:13`: `interface TransactionRecord` (24 fields)
   - `src/hooks/useApartmentDetails.ts:42`: `interface RawTransactionRecord`
   - `src/app/apartment/[aptName]/page.tsx:53`: `interface Transaction`
   - `src/app/api/cron/send-tx-notifications/route.ts:25`: `interface Transaction`
   - `src/app/api/cron/sync-transactions/route.ts:124`: `type TransactionRecord = z.infer<typeof transactionRecordSchema>`
   - `src/app/overview/page.tsx:8`: `interface HomeTransactionRecord`
   - `src/hooks/useStaticData.ts:24`: `type FirestoreTransaction = z.infer<typeof FirestoreTransactionSchema>`
   - `src/lib/validation/facade.schemas.ts:379`: `TransactionRecordSchema`

3. **Notices and News**:
   - `src/app/api/cron/sync-local-notices/route.ts:45`: `interface NoticeItem`
   - `src/app/news/NewsClient.tsx:46`: `interface NoticeItem`
   - `src/components/LoungeContainerClient.tsx:74`: `interface NoticeItem`
   - `src/components/LocalEventCuration.tsx:8`: `interface LocalNoticeItem`
   - `src/lib/types/dashboard.types.ts:37`: `interface NewsItemData`
   - `src/app/news/NewsClient.tsx:37`: `interface NewsItem`
   - `src/components/LoungeContainerClient.tsx:86`: `interface NewsItem`

4. **Posts, Stories & Comments**:
   - `src/components/LoungeContainerClient.tsx:59`: `interface Post`
   - `src/lib/repositories/post.repository.ts:22`: `interface PostDetailData`
   - `src/lib/repositories/post.repository.ts:36`: `interface RecentLoungeItem`
   - `src/lib/repositories/post.repository.ts:56`: `interface DbPostDoc`
   - `src/lib/repositories/post.repository.ts:73`: `interface ProcessablePost`
   - `src/app/api/posts/route.ts:31`: `interface CombinedPostItem`
   - `src/lib/types/report.types.ts:34`: `interface CommentData`
   - `src/components/LoungeDetailClient.tsx:39`: `interface PostComment`
   - `src/lib/repositories/post.repository.ts:90`: `interface ProcessableComment`
   - `src/components/AptStoriesWidget.tsx:10`: `interface AptStory`

5. **Type Map**:
   - `src/lib/services/googleSheets.ts:39`: `interface TypeMapItem`
   - `src/app/api/type-map/route.ts:13`: `interface TypeMapEntry`
   - `src/lib/validation/facade.schemas.ts:448`: `TypeMapItemSchema`
   - `src/app/api/type-map/route.ts:24`: `typeMapEntrySchema`

6. **Objective Metrics & Location Scores**:
   - `src/lib/types/scoutingReport.ts:20`: `interface ObjectiveMetrics`
   - `src/lib/validation/facade.schemas.ts:214`: `ObjectiveMetricsSchema`
   - `src/lib/utils/valuationEngine.ts:27`: `ObjectiveMetricsSchema` (Re-defined separately with different transforms)
   - `src/app/apartment/[aptName]/page.tsx:29`: `interface LocationScore`
   - `src/lib/types/transaction.ts:62`: `interface LocationScoreItem`

---

### 3.2 Architectural Boundary Violations

1. **Presentation Layer Leaking into Domain Types**:
   - `src/lib/types/dashboard.types.ts:6`: `import { type ElementType } from 'react';`
   - `src/lib/types/dashboard.types.ts:21-27`:
     ```typescript
     export interface KPIData {
       mainValue: string | React.ReactNode;
       subValue: string | React.ReactNode;
       description: string | React.ReactNode;
       icon: string | ElementType; // Embedding React Component in domain type!
     }
     export interface NewsItemData {
       icon: ElementType; // Embedding React Component in domain type!
     }
     ```
   - **Impact**: Makes domain data structures non-serializable across SSR/Client boundaries and tightly couples the domain data contract to React.

2. **Runtime Logic Placed Inside Types Directory**:
   - `src/lib/types/user.types.ts`: Contains runtime functions `getDisplayName()`, `createEmojiAvatar()`, `DEFAULT_AVATARS` array, and `getRandomDefaultAvatar()`.
   - **Impact**: Violates "Types: zero dependencies, zero logic". Types files must contain only type definitions and interfaces.

3. **Domain Contracts Mislocated in Infrastructure & Validation**:
   - `src/types/` contains only 2 files (`global.d.ts`, `modules.d.ts`). All actual domain types are scattered in `src/lib/types/`, `src/lib/validation/`, and `src/lib/repositories/`.

---

### 3.3 Untyped `any` Usages & Unsafe Assertions Inventory

| File Path | Line Number | Exact Code Snippet | Category / Risk |
|---|---|---|---|
| `src/lib/validation/facade.schemas.ts` | 6 | `export const IsomorphicFileSchema = z.custom<any>((val) => ...` | Schema `any` bypass |
| `src/lib/validation/facade.schemas.ts` | 150-153 | `mainValue: z.any()`, `subValue: z.any()`, `description: z.any()`, `icon: z.any()` | Weak Zod schema validation |
| `src/lib/validation/facade.schemas.ts` | 291 | `premiumScores: z.any().optional()` | Unchecked scoring schema |
| `src/lib/validation/facade.schemas.ts` | 299, 303 | `sections: z.any()`, `file: z.any()` | Untyped form input payload |
| `src/lib/validation/facade.schemas.ts` | 320 | `sections: z.record(z.string(), z.any())` | Untyped dictionary payload |
| `src/lib/repositories/post.repository.ts` | 431 | `rawStories: any[],` | Untyped DB query result |
| `src/components/MindMap3D.tsx` | 34 | `sheetApartments: Record<string, any[]>;` | Untyped component prop |
| `src/components/MindMap3D.tsx` | 35 | `txSummaryData: Record<string, any>;` | Untyped summary dictionary |
| `src/components/MindMap3D.tsx` | 47 | `const zoomHintTimeout = useRef<any>(null);` | `NodeJS.Timeout \| number` typed as `any` |
| `src/components/OfficeExplorerClient.tsx` | 340 | `function calculateJisanScore(item: any, existingScore?: number): number` | Untyped business parameter |
| `src/components/OfficeExplorerClient.tsx` | 454 | `const centers: any[] = Array.isArray(jisanStatusRes?.centers) ? jisanStatusRes.centers : [];` | Untyped array fallback |
| `src/components/apartment-modal/TransactionChartSection.tsx` | 32 | `const TransactionChartTooltip = React.memo(({ active, payload }: any) => {` | Recharts tooltip payload `any` |
| `src/components/apartment-modal/TransactionChartSection.tsx` | 84, 86, 87 | `}: any) => { ... const xAx = Object.values(xAxisMap)[0] as any;` | Unsafe chart axis type assertion |
| `src/components/apartment-modal/TransactionChartSection.tsx` | 91 | `{displayScatterData.map((d: any, i: number) => {` | Untyped scatter plot data point |
| `src/components/apartment/ApartmentModalKakaoCard.tsx` | 8 | `transactions?: any[];` | Untyped modal prop |
| `src/components/apartment/ApartmentModalPriceSummary.tsx` | 9 | `transactions?: any[];` | Untyped modal prop |
| `src/components/apartment/ApartmentModalTransactionsTable.tsx` | 11 | `filteredTransactions: any[];` | Untyped table prop |
| `src/components/TossApartmentExploreClient.tsx` | 92 | `data: null as any[] | null,` | Untyped initial state |
| `src/components/admin/report-editor/ImageUploadSection.tsx` | 38 | `const fieldsRef = useRef<any[]>([]);` | Untyped ref array |
| `src/app/admin/page.tsx` | 38 | `function autoSuggest(aptName: string, TX_SUMMARY: Record<string, any>): string | null` | Untyped admin helper |
| `src/app/api/transaction-summary/route.ts` | 10, 12 | `async function getTxSummary(): Promise<Record<string, any>>` | Untyped API route response |
| `src/app/explore/ExploreClient.tsx` | 200 | `const EMPTY_OBJECT: Record<string, any> = {};` | Untyped fallback object |
| `src/app/lounge/[id]/page.tsx` | 93 | `let initialPost: Record<string, any> | undefined = undefined;` | Untyped SSR post state |
| `src/app/news/NewsClient.tsx` | 111 | `icon: React.ComponentType<any>;` | Untyped React icon component |
| `src/components/OfficeDetailModal.tsx` | 328, 535 | `onClick={() => setActiveTab(tab.id as any)}`, `setTxFilter(f.id as any)` | Unsafe enum/tab type casting |

---

## 4. Proposed Centralized Domain Model Architecture (Milestone 1)

### 4.1 Target Directory Layout (`src/types/`)

Consolidate all type definitions and domain contracts into `src/types/` organized by business domain with clear submodules and zero UI/presentation dependencies:

```
src/types/
├── index.ts                 # Central public re-export barrel
├── api.ts                   # ApiResponse<T>, ApiSuccessResponse, ApiErrorResponse, standard envelopes
├── apartment.ts             # ApartmentComplex, DongApartment, StaticApartment, AptMeta, TypeMapItem
├── transaction.ts           # TransactionRecord, RecentTx, RecentTransaction, AptTxSummary, PyeongSummary
├── report.ts                # FieldReportData, ScoutingReport, ReportSections, ImageMeta, PhotoItem
├── lounge.ts                # LoungePost, PostDetail, RecentLoungeItem, PostComment, AptStory
├── review.ts                # UserReview, ReviewInput
├── user.ts                  # UserProfile, VerificationLevel, UserTier
├── macro.ts                 # MacroEnvironment, SupplyPipeline, MacroDataConfig, DongtanMacroTrendPoint
├── technovalley.ts          # JisanCenter, CenterSpecItem, JisanBuilding, TrendRecord, NpsStatsData
├── valuation.ts             # ValuationResult, ValuationBreakdown, DCFResult, DongSpreadResult, ScoreDetail, PremiumScores
├── calculator.ts            # AcquisitionCostResult, MortgageLoanResult, VerdictResult, TaxResult
├── notice.ts                # LocalNoticeItem, NoticeItem, GoogleNewsItem
├── inquiry.ts               # AdInquiry, SubscriptionItem, AdBannerData, AdSlot
├── global.d.ts              # Ambient Window, KakaoSDK, external declarations (retained)
└── modules.d.ts             # Third-party module declarations (retained)
```

### 4.2 Migration Rules & Clean Separation of Concerns

1. **Zero UI Leaks**:
   - `KPIData` and `NewsItemData` must use string icon identifiers (`iconName: string`) or serialize primitives (`string | number`) in domain models. UI components map icon names to Lucide icons at render time.
2. **Move Runtime Helpers Out of Types**:
   - Move `getDisplayName`, `DEFAULT_AVATARS`, `getRandomDefaultAvatar`, and `createEmojiAvatar` from `src/lib/types/user.types.ts` to `src/lib/utils/userUtils.ts` or `src/lib/utils/avatar.ts`.
3. **Single Source of Truth for Schemas**:
   - Derive TypeScript types directly from canonical Zod schemas using `z.infer<typeof ...>` or maintain synchronized contract interfaces that Zod schemas enforce (`z.ZodType<DomainInterface>`).
4. **Backward Compatibility via Barrel Exports**:
   - Maintain `src/lib/types/*.ts` during transition by re-exporting from `@/types/*` so existing imports throughout `src/lib/` and `src/components/` do not break.

---

## 5. Milestone 1 Actionable Migration Plan

| Step | Scope | Target Files | Verification Method |
|---|---|---|---|
| **Step 1** | Create centralized `src/types/*.ts` modules | `src/types/api.ts`, `apartment.ts`, `transaction.ts`, `report.ts`, `lounge.ts`, `review.ts`, `user.ts`, `macro.ts`, `technovalley.ts`, `valuation.ts`, `calculator.ts`, `notice.ts`, `inquiry.ts`, `index.ts` | `npx tsc --noEmit` |
| **Step 2** | Extract runtime logic from types | Create `src/lib/utils/userUtils.ts`, clean `src/lib/types/user.types.ts` | `npm test` |
| **Step 3** | Eliminate duplicate interface definitions across components & API routes | Replace inline interfaces in `src/app/overview/page.tsx`, `src/app/apartment/[aptName]/page.tsx`, `src/app/admin/inquiries/page.tsx`, `src/app/admin/pending-photos/page.tsx`, `src/components/DashboardClient.tsx`, `src/components/LoungeContainerClient.tsx`, `src/components/LocalEventCuration.tsx` with imports from `@/types` | `npx tsc --noEmit` |
| **Step 4** | Eliminate `any` and unsafe type assertions in production code | Update `facade.schemas.ts`, `MindMap3D.tsx`, `OfficeExplorerClient.tsx`, `TransactionChartSection.tsx`, `ApartmentModalKakaoCard.tsx`, `ApartmentModalPriceSummary.tsx`, `ApartmentModalTransactionsTable.tsx`, `TossApartmentExploreClient.tsx`, `transaction-summary/route.ts` | `npx tsc --noEmit` |
| **Step 5** | Align Zod schemas with centralized domain types | Update `src/lib/validation/facade.schemas.ts` to implement/infer domain contracts strictly without `z.any()` | `npx tsc --noEmit` & `npm test` |
| **Step 6** | Deprecate and proxy legacy `src/lib/types/` | Add barrel re-exports from `src/lib/types/*.ts` pointing to `@/types/*` | `npx tsc --noEmit` & `npm run build` |
| **Step 7** | Execute Full Verification Gate | Run full verification suite | `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` |
