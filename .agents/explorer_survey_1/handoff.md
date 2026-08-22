# Handoff Report: Domain & Types Layer Survey

**Agent**: Explorer 1 (`explorer_survey_1`)  
**Mission**: Comprehensive Survey of Domain & Types Layer and Type Safety across `frontend/`  
**Date**: 2026-08-21T14:32:00Z  
**Type**: Hard Handoff (Task Complete)

---

## 1. Observation

Direct code observations from the frontend codebase (`frontend/src/`):

1. **Mislocated Domain Types**:
   - `src/types/` contains only 2 ambient declaration files: `global.d.ts` (KakaoSDK, Window extensions) and `modules.d.ts` (`declare module '@google-analytics/data'`, `declare module 'html2canvas-pro'`).
   - Domain types are fragmented across `src/lib/types/` (7 files), `src/lib/validation/facade.schemas.ts`, `src/lib/utils/` (scoring, valuation, valuationEngine, calculatorEngines, sellTimingEngine), `src/lib/dong-apartments.ts`, `src/lib/apartment-data.ts`, and individual page/component files.

2. **Severe Type Duplication Across Layers**:
   - **Apartment entity defined in 5 places**: `DongApartment` (`src/lib/dong-apartments.ts:90`), `StaticApartment` (`src/lib/apartment-data.ts:9`), `StaticApartment` (`src/components/DashboardClient.tsx:228`), `AptMeta` (`src/app/admin/apartments/[name]/page.tsx:41` & `src/app/admin/page.tsx:43`), and `DongApartmentSchema` (`src/lib/validation/facade.schemas.ts:463`).
   - **Transaction record defined in 8 places**: `RecentTx` (`src/lib/types/transaction.ts:1`), `RecentTransaction` (`src/lib/types/transaction.ts:74`), `TransactionRecord` (`src/hooks/useApartmentDetails.ts:13`), `RawTransactionRecord` (`src/hooks/useApartmentDetails.ts:42`), `Transaction` (`src/app/apartment/[aptName]/page.tsx:53`), `Transaction` (`src/app/api/cron/send-tx-notifications/route.ts:25`), `HomeTransactionRecord` (`src/app/overview/page.tsx:8`), and `FirestoreTransaction` (`src/hooks/useStaticData.ts:24`).
   - **Notice / News item defined in 6 places**: `NoticeItem` (`src/app/api/cron/sync-local-notices/route.ts:45`), `NoticeItem` (`src/app/news/NewsClient.tsx:46`), `NoticeItem` (`src/components/LoungeContainerClient.tsx:74`), `LocalNoticeItem` (`src/components/LocalEventCuration.tsx:8`), `NewsItemData` (`src/lib/types/dashboard.types.ts:37`), and `NewsItem` (`src/app/news/NewsClient.tsx:37`).
   - **TypeMap defined in 3 places**: `TypeMapItem` (`src/lib/services/googleSheets.ts:39`), `TypeMapEntry` (`src/app/api/type-map/route.ts:13`), and `TypeMapItemSchema` (`src/lib/validation/facade.schemas.ts:448`).

3. **Presentation Leaks in Domain Types**:
   - `src/lib/types/dashboard.types.ts:6`: `import { type ElementType } from 'react';`
   - `src/lib/types/dashboard.types.ts:21-27,53`: `mainValue: string | React.ReactNode;`, `subValue: string | React.ReactNode;`, `description: string | React.ReactNode;`, `icon: string | ElementType;` in `KPIData` and `icon: ElementType;` in `NewsItemData`.

4. **Runtime Code in Types Directory**:
   - `src/lib/types/user.types.ts:30-63`: Exports runtime helpers `getDisplayName()`, `createEmojiAvatar()`, `DEFAULT_AVATARS`, and `getRandomDefaultAvatar()`.

5. **Untyped `any` and Unsafe Casts in Production Code**:
   - `src/lib/validation/facade.schemas.ts:6`: `export const IsomorphicFileSchema = z.custom<any>(...)`
   - `src/lib/validation/facade.schemas.ts:150-153`: `mainValue: z.any()`, `subValue: z.any()`, `description: z.any()`, `icon: z.any()`
   - `src/lib/validation/facade.schemas.ts:291,299,303,320`: `premiumScores: z.any().optional()`, `sections: z.any()`, `file: z.any()`, `sections: z.record(z.string(), z.any())`
   - `src/components/MindMap3D.tsx:34-35,47`: `sheetApartments: Record<string, any[]>`, `txSummaryData: Record<string, any>`, `useRef<any>(null)`
   - `src/components/OfficeExplorerClient.tsx:340,454`: `calculateJisanScore(item: any)`, `const centers: any[] = ...`
   - `src/components/apartment-modal/TransactionChartSection.tsx:32,84,86,87,91`: `TransactionChartTooltip = React.memo(({ active, payload }: any)`, `const xAx = Object.values(xAxisMap)[0] as any;`
   - `src/components/apartment/ApartmentModalKakaoCard.tsx:8`: `transactions?: any[];`
   - `src/components/apartment/ApartmentModalPriceSummary.tsx:9`: `transactions?: any[];`
   - `src/components/apartment/ApartmentModalTransactionsTable.tsx:11`: `filteredTransactions: any[];`
   - `src/components/TossApartmentExploreClient.tsx:92`: `data: null as any[] | null`
   - `src/app/api/transaction-summary/route.ts:10`: `async function getTxSummary(): Promise<Record<string, any>>`

6. **Compiler & Strictness State**:
   - `tsconfig.json` has `strict: true`.
   - Command `npx tsc --noEmit` exits with status code 0 (0 errors).
   - `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch` are currently disabled.

---

## 2. Logic Chain

1. **From Observation 1 & 2**: Because domain entities are defined independently in 5-8 different files across UI components, hooks, repositories, and routes, field updates (e.g. adding a property to `TransactionRecord` or `ApartmentComplex`) cause silent desynchronization, missed updates, and runtime bugs.
2. **From Observation 3**: Because `KPIData` and `NewsItemData` import `React` and use `ElementType`/`ReactNode`, data models cannot be cleanly serialized across server/client boundaries without bundling React into pure data repositories, violating the dependency direction (UI → Application → Infrastructure → Domain).
3. **From Observation 4**: Because `user.types.ts` contains SVG generation logic and avatar array constants, the types module carries executable side effects and runtime dependencies, violating "Types: zero dependencies, zero logic".
4. **From Observation 5**: Because `facade.schemas.ts`, UI modal props, and API route handlers use `any`, `Record<string, any>`, and `any[]`, TypeScript's compiler cannot check data flow integrity, allowing undefined property access to slip past static analysis.
5. **From Observation 6**: Because `npx tsc --noEmit` currently passes, all migrations to centralize types into `src/types/` can be performed incrementally with zero regressions by preserving backward compatibility re-exports in `src/lib/types/` during the transition.

---

## 3. Caveats

1. **Recharts Tooltip & Axis Types**:
   - In `TransactionChartSection.tsx`, Recharts passes internal `TooltipProps` and custom payload structures that are complex generics. Replacing `payload: any` requires exact typing with `TooltipProps<ValueType, NameType>` from `recharts` to prevent type mismatch regressions in chart tests.
2. **Firebase Timestamp Serialization**:
   - Fields named `createdAt` vary across Firestore `Timestamp`, serializable `number` (millis), or formatted `string`. The centralized domain model must standardize domain entity timestamps to `number | null` (epoch ms) or ISO `string`, with converters handling Firestore `Timestamp`.
3. **Zod vs Interface Inversion**:
   - Some modules currently use `z.infer<typeof Schema>` while others write manual `interface` declarations. Standardizing on `src/types/*.ts` interfaces and typing schemas as `z.ZodType<DomainInterface>` guarantees schema-to-type alignment without divergence.

---

## 4. Conclusion

For **Milestone 1 (Domain & Types Layer Refactoring)**, the following actions are recommended:
1. Establish a canonical, centralized `src/types/` module structure (`api.ts`, `apartment.ts`, `transaction.ts`, `report.ts`, `lounge.ts`, `review.ts`, `user.ts`, `macro.ts`, `technovalley.ts`, `valuation.ts`, `calculator.ts`, `notice.ts`, `inquiry.ts`, `index.ts`).
2. Move SVG and avatar runtime logic out of `user.types.ts` into `src/lib/utils/userUtils.ts`.
3. Eliminate all `any` usages in `facade.schemas.ts`, modal props (`ApartmentModalKakaoCard`, `ApartmentModalPriceSummary`, `ApartmentModalTransactionsTable`), `MindMap3D.tsx`, `OfficeExplorerClient.tsx`, and `TransactionChartSection.tsx`.
4. Re-export all types from `src/lib/types/*.ts` to point to `@/types/*` for seamless backward compatibility.
5. Enable `noImplicitOverride` and `noFallthroughCasesInSwitch` in `tsconfig.json`.

---

## 5. Verification Method

To independently verify the findings and any subsequent refactoring:

1. **Type Check Baseline**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected: Exit code 0, 0 errors.*

2. **Lint Check**:
   ```bash
   npm run lint
   ```
   *Expected: Exit code 0, 0 errors, 0 warnings.*

3. **Test Suite**:
   ```bash
   npm test
   ```
   *Expected: All unit and empirical tests pass.*

4. **Production Build**:
   ```bash
   npm run build
   ```
   *Expected: Clean Next.js production build completion.*

5. **Files to Inspect**:
   - `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\explorer_survey_1\analysis.md`
   - `frontend/src/lib/types/`
   - `frontend/src/lib/validation/facade.schemas.ts`
   - `frontend/src/components/apartment/`
