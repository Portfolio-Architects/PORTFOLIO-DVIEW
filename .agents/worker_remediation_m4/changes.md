# Modifications Summary

## SWR Cache Improvements in SWRProvider.tsx

1. **Fix location-scores.json Cache Key Mismatch**:
   - Location: `frontend/src/components/pwa/SWRProvider.tsx` (lines 28-34)
   - Change: Updated the target `/data/location-scores.json` in the preloading list to match the versioned cache key format queried in `useStaticData.ts`.
   - Code before:
     ```typescript
     '/data/location-scores.json',
     ```
   - Code after:
     ```typescript
     `/data/location-scores.json?v=${BUILD_VERSION}`,
     ```

2. **Clean up unnecessary preload targets**:
   - Location: `frontend/src/components/pwa/SWRProvider.tsx` (lines 28-34)
   - Change: Removed `'/api/apartments-by-dong'` from the `targets` array as it is only queried with SWR on the admin dashboard page. Preloading it globally for all users is redundant and wastes bandwidth.
