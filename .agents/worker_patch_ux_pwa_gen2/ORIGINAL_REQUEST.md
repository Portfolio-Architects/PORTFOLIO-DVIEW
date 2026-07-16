## 2026-07-16T12:35:00Z
<USER_REQUEST>
You are the Worker Gen 2 for the DVIEW project patch.
Your working directory is: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_patch_ux_pwa_gen2

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Objective: Fix the keyboard accessibility gap identified in frontend/src/components/LoungeFeedClient.tsx.

Your tasks:
1. Locate the "💼 테크노 랩 연동" badge in frontend/src/components/LoungeFeedClient.tsx (around lines 1207-1219).
2. Refactor the span element to support full keyboard accessibility:
   - Add role="link"
   - Add tabIndex={0}
   - Add onKeyDown handler so that pressing Enter or Space triggers:
     e.stopPropagation();
     e.preventDefault();
     window.location.href = '/overview?tab=office';
   - Update className to include outline-none and focus ring styling (e.g. focus-visible:ring-2 focus-visible:ring-indigo-500/50).
3. Run verification checks:
   - cd frontend
   - npx tsc --noEmit
   - npm run lint
   - npm run build
4. Write your changes and logs to:
   - c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_patch_ux_pwa_gen2\changes.md

Report back to me using send_message with the absolute path of your changes and handoff files when done.
</USER_REQUEST>
