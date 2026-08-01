## 2026-08-01T16:31:39Z

You are Worker 2 for DVIEW Apt Lab mobile UI refactoring.
Working Directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_2
Project Directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Instructions:
1. Initialize your working directory `.agents/worker_2`.
2. Open `frontend/src/components/MacroDashboardClient.tsx` and apply the following 4 precision & layout fixes to `TimelineItemCard`:

   a) **Mobile Price Precision Fix** (Lines ~467-473):
      Replace mobile price replacement logic:
      ```tsx
      {item.priceEok
        ? item.priceEok.replace(/억\s*([0-9,]+)만?/, (_, m) => {
            const num = parseInt(m.replace(/,/g, ''), 10);
            if (!num || num <= 0) return '억';
            const dec = (num / 10000).toFixed(2).substring(1).replace(/\.?0+$/, '');
            return `${dec}억`;
          })
        : item.priceEok}
      ```

   b) **Mobile Delta Price Precision Fix** (Lines ~488-508):
      Apply the exact same decimal logic for mobile delta price replacements (both rising and falling).

   c) **Row 1 Dong Truncation Guard** (Line ~425):
      Update dong span styling in Row 1:
      ```tsx
      <span className="shrink-0 font-extrabold text-secondary max-w-[80px] xs:max-w-[110px] sm:max-w-none truncate min-w-0" title={item.dong}>
        {item.dong}
      </span>
      ```

   d) **Detail Button Touch Target & Accessibility** (Line ~519):
      Add `aria-label={`${item.aptName} 상세 정보 보기`}` to the 상세 button and refine padding to `px-2 xs:px-2.5 py-1.5 min-h-[32px]`.

3. Run verification commands in `frontend/`:
   - `npm test -- src/components/TimelineItemCardEmpirical.test.tsx`
   - `npx tsc --noEmit`
   - `npm run build`

4. Save your report to `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_2\handoff.md`.
5. Send a message to parent (`3a61764d-d22a-41ce-9435-67c4cdc6e465`) summarizing the fixes applied.
