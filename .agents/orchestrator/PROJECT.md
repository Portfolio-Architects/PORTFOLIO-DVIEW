# Project: Apartment Rent Transaction Data Optimization

## Architecture
- Data Collection Layer: API route `frontend/src/app/api/cron/sync-transactions/route.ts`, scripts `frontend/scripts/fetch-rent.js`, `frontend/scripts/upload-rent-csv.js`, `frontend/scripts/upload-rent-csv-fast.js`, interfacing with MOLIT (국토교통부) Public Data API.
- Database Layer: Firebase Firestore `transactions` collection, `_key` generation logic, `firestore.indexes.json` composite indexing, query filters, deduplication, shared `areaConverter.ts` (`TYPE_MAP` / `areaPyeong` area mapping).
- Frontend Layer: Next.js components `TransactionTable`, `TransactionChartSection`, `TransactionSummaryMetrics`, `ApartmentModal`, `MacroDashboardClient`, handling rent/sale transactions visualization.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | MOLIT Rent API Collection | Fetch rent data by `LAWD_CD` (41590 & 41597) & month, handle XML/JSON parsing, encode API key | M1 | survey |
| 2 | Rent Data Parsing & Normalization | Parse deposit (`보증금액`), monthly rent (`월세금액`), transaction type ('전세'/'월세'), date formatting | M1 | survey |
| 3 | Cron & Upload Script Fixes | Add `vercel.json` crons, fix `fetch-rent.js` XML parsing, fix CSV uploader deterministic IDs | M1 | survey |
| 4 | Firestore Upsert & Key Generation | Include `monthlyRent` in `_key` (`RENT_${apt}_${date}_${area}_${dep}_${rent}_${flr}`), eliminate collisions | M2 | survey |
| 5 | Shared Area & Pyeong Converter | Implement `areaConverter.ts` using `type-map.json` for unified supply pyeong mapping | M2 | survey |
| 6 | Composite Firestore Indexes | Create `firestore.indexes.json` and link in `firebase.json` for compound queries | M2 | survey |
| 7 | Frontend State Sync & Metrics | Sync `TransactionSummaryMetrics` with `ApartmentModal` `chartType`, include `월세` in Jeonse metrics & gap cards | M3 | survey |
| 8 | Rent Table Sorting & Macro Aggregation | Fix converted price sorting in `TransactionTable`, include `월세` in `MacroDashboardClient` rent trends | M3 | survey |
| 9 | End-to-End Build & Integrity Check | Pass `npx tsc --noEmit`, `npm run build`, and Forensic Audit verification | M4 | survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 0 | Exploration & Survey | Map data flow from MOLIT API to DB and UI; identify root causes of missing rent data | None | DONE |
| 1 | Data Collection & Script Fixes (R1) | Fix `sync-transactions/route.ts`, `fetch-rent.js`, `upload-rent-csv.js`, `vercel.json` | M0 | DONE (Conv: 21cbef53-9b52-4ea7-8256-107e7d84d1ed) |
| 2 | Firestore Upsert & Data Integrity (R2) | Fix `_key` generation, composite indices, deduplication, shared `areaConverter.ts` | M1 | DONE (Conv: 0ee8523f-e5e4-4edd-8802-18b5147087de) |
| 3 | Frontend Integration & UI Verification (R3) | Fix `TransactionSummaryMetrics`, `TransactionTable`, `MacroDashboardClient` rendering | M2 | DONE (Conv: 2ada89b4-83be-43ee-8a52-f1e419817f0a) |
| 4 | Final E2E Verification & Audit | Execute builds, static typing checks, reviewer evaluation, challenger tests, and forensic audit | M3 | DONE |

## Code Layout
- API Routes: `frontend/src/app/api/cron/sync-transactions/route.ts`
- Collection Scripts: `frontend/scripts/fetch-rent.js`, `frontend/scripts/upload-rent-csv.js`, `frontend/scripts/upload-rent-csv-fast.js`
- Database Utility & Shared Converters: `frontend/src/lib/utils/areaConverter.ts`
- Configs: `frontend/vercel.json`, `frontend/firebase.json`, `frontend/firestore.indexes.json`
- Frontend Components: `frontend/src/components/apartment-modal/TransactionSummaryMetrics.tsx`, `frontend/src/components/apartment-modal/TransactionTable.tsx`, `frontend/src/components/ApartmentModal.tsx`, `frontend/src/components/MacroDashboardClient.tsx`

## Interface Contracts
### Rent Transaction Schema
- `_key`: `RENT_${aptName}_${contractYm}_${contractDay}_${area}_${deposit}_${monthlyRent}_${floor}`
- `dealType`: '전세' | '월세' | '매매'
- `deposit`: number (보증금, 만원 단위)
- `monthlyRent`: number (월세, 만원 단위, 0 for 전세/매매)
- `lawdCd`: legal dong code string ('41590', '41597')
- `areaPyeong`: number (공급평형, e.g. 34)
