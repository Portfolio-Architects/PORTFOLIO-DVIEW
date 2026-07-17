# Vacancy Estimation API and Unit Testing Investigation Analysis

This report documents the detailed investigation of the Next.js API route `frontend/src/app/api/technovalley/trend/route.ts`, the Jest unit testing environment in `frontend/`, and the design/mocking strategy required for the R5 unit test suite.

---

## 1. API Route Analysis (`frontend/src/app/api/technovalley/trend/route.ts`)

The endpoint calculates real-time and historical vacancy rates and average rents for 10 target buildings in Yeongcheon-dong/Dongtan Technovalley.

### A. Request Handling & Cache Strategy
* **Dynamic Route**: Configured as `export const dynamic = 'force-dynamic'`.
* **Bypassing Cache**: Checks query parameters `refresh` and `bypassCache`:
  ```typescript
  const bypassCache = searchParams.get('refresh') === 'true' || searchParams.get('bypassCache') === 'true';
  ```
* **Memory Cache & File Cache**:
  * **Memory Cache**: Uses an in-memory variable `memoryCache` with a TTL of 10 minutes (`CACHE_TTL_MS = 600000`). If hit and not bypassed, returns response with header `Cache-Control: public, max-age=60, stale-while-revalidate=30`.
  * **File Cache**: Falls back to reading from `scratch/trend-cache.json`. If found and valid, populates the memory cache and returns the data with header `Cache-Control: public, max-age=3600, stale-while-revalidate=600`.
  * **Cache Write**: When recalculated, it writes the result back to both `memoryCache` and `scratch/trend-cache.json` (creating the parent directory if missing).

### B. Core Calculation Logic
When cache is bypassed or missed:
1. **Transaction Fetching**: Runs parallel fetches using `getOfficeTransactions(regionCode, ym)` for 6 timeline months (`TARGET_MONTHS = ['202501', '202505', '202509', '202511', '202601', '202605']`) and two region codes (`41590` and `41597`):
   ```typescript
   const [list90, list97] = await Promise.all([
     getOfficeTransactions('41590', ym),
     getOfficeTransactions('41597', ym)
   ]);
   ```
2. **Metadata Loading**:
   * Reads building metadata from `src/lib/data/yeongcheon_jisan_units.json` (extracting `totalUnits`, `gfa`, and `baselineVacancy`).
   * Reads National Pension Service (NPS) stats from `src/lib/data/nps_stats.json` (extracting `totalEmployees`, `companiesCount`, `newHires`, and `departures`).
3. **Macro Heat Bonus Calculation**:
   * Scale Factor: `(totalEmp / 100000) * (compCount / 10000)`
   * Growth Factor: `((newHires - departures) / totalEmp) * 1.5`
   * `macroBonus = scaleFactor + Math.max(0, growthFactor)`
4. **Transaction Classification**:
   * Matches transactions to buildings using normalized string matching on `buildingName` (removing spaces and lowercasing) or fallback matching on `jibun` (lot number).
   * Ten target buildings: `금강 IX`, `실리콘앨리`, `SH타임`, `더퍼스트`, `SK V1`, `에이팩시티`, `테라타워`, `IT타워`, `메가비즈타워`, `비즈타워`.
5. **Weighted Rent Estimation**:
   * Transaction weight: `sizeSqM >= 100` is weighted `1.5`; `sizeSqM <= 50` is weighted `0.5`; others are `1.0`.
   * Rent per pyeong is calculated using a 3.5% yield formula: `calculatedRent = ((priceRaw / (sizeSqM / 3.3058)) * 0.035) / 12`.
   * Final rent averages are validated to be within bounds `[2.5, 5.5]` ten thousand KRW/pyeong. If invalid or empty, it falls back to `FALLBACK_RENT_MAP`.
   * Overall average rent is the simple average of all 10 buildings' rents.
6. **Stateful Chronological Vacancy Modeling**:
   * Tracks and updates vacancy rate state sequentially across `TARGET_MONTHS` starting from `BASELINE_VACANCY_2411`.
   * Vacancy reduction: `reductionPercent = (txWeightSum * 1.5 / totalUnits) * 100`.
   * Agglomeration scale factor: `buildingScaleFactor = Math.min(1.5, Math.max(0.8, gfa / 100000))`.
   * Dynamic Turnover model: Prior to `202601`, `'실리콘앨리'` and `'금강 IX'` have a turnover rate of `-0.5` (natural filling phase). Others have `0.2` (natural tenant decay/turnover).
   * Formula: `estimatedVacancy = Math.max(2.0, currentVacancy[key] - (reductionPercent * buildingScaleFactor) + turnoverRate - macroBonus)`.
   * Updates state `currentVacancy` dynamically for sequential months.
7. **Historical Integration**:
   * Prepends `STATIC_HISTORICAL_DATA` (representing 21.01 to 24.11) before the calculated trends.

### C. JSON Response Structure
* **Successful Recalculation**:
  ```json
  {
    "success": true,
    "source": "govt-api-calculated",
    "data": [
      {
        "date": "21.01",
        "금강 IX": null,
        "실리콘앨리": null,
        ...
        "금강IX_임대료": null,
        "실리콘앨리_임대료": null,
        "평균임대료": 2.56
      },
      ...
      {
        "date": "26.05",
        "금강 IX": 20.2,
        ...
        "금강IX_임대료": 3.88,
        ...
        "평균임대료": 3.68
      }
    ]
  }
  ```
* **Ultimate Fallback (Error Mode)**:
  ```json
  {
    "success": true,
    "source": "static-fallback",
    "data": [...],
    "error": "Error message details"
  }
  ```

---

## 2. Jest Testing Setup & Execution

### A. Test Directory and Naming Conventions
* **Storage Location**: Unit tests are co-located alongside the source code in `frontend/src/` (e.g., `src/components/GapInvestmentExplorer.test.tsx`).
* **Convention**: File names match `*.test.ts` or `*.test.tsx`.
* **Next.js API Tests**: To follow layout standards, the route unit test file must be placed at `frontend/src/app/api/technovalley/trend/route.test.ts`.

### B. Configuration Files
* **`jest.config.ts`**: Set to use `ts-jest` preset, `jsdom` environment, and maps path alias `@/*` to `src/*`. It ignores standard `tests/` directories (which are for Playwright E2E tests).
* **`jest.setup.ts`**: Polyfills Web APIs (`fetch`, `Headers`, `Request`, `Response`) inside Jest's JSDOM environment using `node-fetch`.

### C. Running the Tests
Tests are executed from the `frontend/` directory:
* Run all unit tests: `npm run test` or `npx jest`
* Run specific test suite: `npx jest src/app/api/technovalley/trend/route.test.ts`

---

## 3. Mock Data & R5 Unit Test Design Outline

Because the API route performs I/O on JSON files and fetches external transactions via service layers, the tests must mock these dependencies.

### A. Mocking Strategy
1. **Mocking `@/lib/services/officeTx.service`**:
   * Mock `getOfficeTransactions` to return structured mock transactions containing varying `priceRaw`, `sizeSqM`, `buildingName`, and `jibun` to test both matching types and size weight classification.
2. **Mocking `fs` Module**:
   * Use `jest.spyOn(fs, 'readFileSync')` to return mock building list database and mock NPS stats database instead of modifying the filesystem.
   * Mock `fs.existsSync`, `fs.mkdirSync`, and `fs.writeFileSync` to intercept file cache operations.
3. **Mocking `NextRequest`**:
   * Construct `NextRequest` objects using standard URLs (e.g. `http://localhost/api/technovalley/trend?refresh=true`) to test cache bypassing.

### B. R5 Test Suite Structure (`route.test.ts` Sketch)

```typescript
import { GET } from './route';
import { NextRequest } from 'next/server';
import { getOfficeTransactions } from '@/lib/services/officeTx.service';
import fs from 'fs';

// Mock the office transaction service
jest.mock('@/lib/services/officeTx.service', () => ({
  getOfficeTransactions: jest.fn(),
}));

// Mock logger to suppress clutter in test console
jest.mock('@/lib/services/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('GET /api/technovalley/trend', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear in-memory cache if accessible, or bypass using query params
  });

  describe('Caching Behavior', () => {
    it('should serve from memory/file cache if refresh param is not present', async () => {
      // Mock fs.existsSync to true for the local cache file
      const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      const readSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue(
        JSON.stringify({ data: [{ date: '21.01', '평균임대료': 2.56 }], timestamp: Date.now() })
      );

      const req = new NextRequest('http://localhost/api/technovalley/trend');
      const res = await GET(req);
      const body = await res.json();

      expect(body.success).toBe(true);
      expect(body.source).toBe('file-cache');
      expect(body.data[0].date).toBe('21.01');
      
      existsSpy.mockRestore();
      readSpy.mockRestore();
    });

    it('should query API and write to cache if refresh is true', async () => {
      // Setup mocked files/DB responses
      const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      const readSpy = jest.spyOn(fs, 'readFileSync').mockImplementation((p: any) => {
        if (p.includes('yeongcheon_jisan_units.json')) {
          return JSON.stringify([{ id: '금강 IX', totalUnits: 1000, gfa: 100000, baselineVacancy: 20 }]);
        }
        if (p.includes('nps_stats.json')) {
          return JSON.stringify({ stats: { yeongcheonDong: { totalEmployees: 10000, companiesCount: 500, newHires: 100, departures: 50 } } });
        }
        throw new Error('Not found');
      });
      const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

      // Mock transaction response
      (getOfficeTransactions as jest.Mock).mockResolvedValue([
        { buildingName: '금강펜테리움 IX타워', type: '임대', sizeSqM: 99, priceRaw: 120, jibun: '823-6' }
      ]);

      const req = new NextRequest('http://localhost/api/technovalley/trend?refresh=true');
      const res = await GET(req);
      const body = await res.json();

      expect(body.success).toBe(true);
      expect(body.source).toBe('govt-api-calculated');
      expect(getOfficeTransactions).toHaveBeenCalled();
      expect(writeSpy).toHaveBeenCalled();

      existsSpy.mockRestore();
      readSpy.mockRestore();
      writeSpy.mockRestore();
    });
  });

  describe('Calculation Integrity', () => {
    it('should correctly match buildings and calculate weighted rents and vacancy rates', async () => {
      // Verify name mapping logic and lot (jibun) fallback matching.
      // Verify size-based weight heuristics (>= 100 sqm is 1.5, <= 50 sqm is 0.5, else 1.0).
      // Verify vacancy rates reduction calculations incorporating building scale and NPS macro bonus.
    });

    it('should clamp vacancy rate to a minimum of 2.0%', async () => {
      // Setup transaction returns that would lower the vacancy rate beyond limits and verify it limits to 2.0.
    });
  });

  describe('Error Fallbacks', () => {
    it('should recover gracefully and return static fallbacks if calculations throw errors', async () => {
      // Force getOfficeTransactions to throw, verify ultimate static fallback is returned with success: true.
      (getOfficeTransactions as jest.Mock).mockRejectedValue(new Error('MOLIT service unavailable'));

      const req = new NextRequest('http://localhost/api/technovalley/trend?refresh=true');
      const res = await GET(req);
      const body = await res.json();

      expect(body.success).toBe(true);
      expect(body.source).toBe('static-fallback');
      expect(body.error).toBeDefined();
    });
  });
});
```
