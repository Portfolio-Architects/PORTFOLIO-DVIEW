# E2E Test Infra: Hwaseong & Dongtan Administrative Network Normalization

## Test Philosophy
- Opaque-box, requirement-driven. No internal mock coupling where external interfaces can be tested end-to-end.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial + Real-World Workload Testing.

## Feature Inventory
| # | Feature | Source | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|--------|:------:|:------:|:------:|:------:|
| 1 | Gosi `BD_notice` Extraction | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 2 | BBS 1154 (동탄트램) 6-Column Alignment | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 3 | BBS 1049 (동탄 1~9동) Normalization | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 4 | Batch Script Schema & Culture Parity | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 5 | Deduplication Logic in `newsData.ts` | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 6 | `/api/local-notices` & Repository Integration | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 7 | Anti-WAF Bypass Proxy Whitelist | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 8 | SSR Prop Hydration in Lounge Clients | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 9 | Category & Dongtan 1~9 Filtering | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 10 | Dynamic D-Day & Modal / Kakao Share | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 11 | Static Fallback Data & Degradation | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- Test runner: Jest (`npm test`) / Node.js test scripts.
- Test location: `frontend/tests/e2e/local-notices-e2e.test.ts` or `frontend/tests/e2e/local-notices-pipeline.test.ts`.
- Pass/Fail Semantics:
  - Exit code 0 on pass.
  - All category assertions (`gosi`, `bbs`, `rail`, `dong`, `culture`) must pass.
  - Dongtan 1~9 dong filtering must return matching items for each individual dong.
  - Fallback mode must provide complete fallback dataset with no crashes or blank outputs when DB is offline.

## Coverage Thresholds
- Tier 1: Feature Coverage (>=5 per feature)
- Tier 2: Boundary & Corner Cases (>=5 per feature)
- Tier 3: Cross-Feature Combinations (pairwise interactions across tabs, filters, and fallback)
- Tier 4: Real-World Application Scenarios (complete user flows from lounge entry to notice viewing, modal popup, and share)
