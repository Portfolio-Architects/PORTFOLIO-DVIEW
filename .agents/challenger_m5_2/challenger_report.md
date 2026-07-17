## Challenge Summary

**Overall risk assessment**: HIGH

Through white-box analysis and Playwright automated adversarial testing, two significant engineering gaps have been verified in the frontend codebase of D-VIEW:
1. **Query Parameter Popstate Synchronization Bug**: In `DashboardClient.tsx`, URL history updates for non-hash transitions (like going back from `/overview?tab=office` to `/overview`) are completely ignored. The component remains stuck on the old tab state.
2. **Unhandled Firestore Failures and Stuck Loaders**: In `LoungeDetailClient.tsx`, client-side Firebase calls (like `getDoc` and `onSnapshot`) are executed without a `try/catch` block. When Firebase is offline or uninitialized, this uncaught exception prevents the component from updating its `loading` state, leaving the user stuck on the loading spinner forever.

---

## Challenges

### [High] Challenge 1: Tab Switching State Desynchronization during Client-Side Popstate Transitions

- **Assumption challenged**: The codebase assumes that Next.js client-side page transitions or native `hashchange` listeners are sufficient to handle URL history navigation. It assumes that tab routing via `window.history.replaceState` avoids history bloat, and that any back navigation will only happen upon full route mount.
- **Attack scenario**: 
  1. A user enters `/overview?tab=office`.
  2. The user navigates to `/explore` (which is a soft transition via Next.js router).
  3. The user hits the browser back button.
  4. The browser changes the URL back to `/overview?tab=office`. Because the route path `/overview` remains the same, Next.js does not remount `DashboardClient`.
  5. Because `DashboardClient` only checks search parameters during mount and only listens to `hashchange` events (not query parameter or `popstate` events), the `activeTab` state does not update. The URL remains `/overview?tab=office`, but the UI is stuck rendering the `overview` (Apartment Lab) tab.
- **Blast radius**: Complete state desynchronization between URL and UI. The user is shown the wrong tab after history navigation, violating single-page app history expectations.
- **Mitigation**: Add a `useEffect` hook in `DashboardClient.tsx` that monitors Next.js `useSearchParams()` or query changes, and updates `activeTab` reactively:
  ```typescript
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  useEffect(() => {
    if (tab === 'office' || tab === 'gap') {
      setActiveTab('office');
    } else if (tab === 'lounge' || tab === 'talk') {
      setActiveTab('lounge');
    } else {
      setActiveTab('overview');
    }
  }, [tab]);
  ```

### [High] Challenge 2: Uncaught Firestore Exceptions Causing Stuck Loading State in Lounge Modal

- **Assumption challenged**: The code assumes client-side Firebase (`db`) will always be initialized and network requests will always succeed or timeout gracefully.
- **Attack scenario**: 
  When the app runs in an environment where Firebase configuration keys are missing (such as local test runs, self-hosted dev servers, or when Firebase is blocked by a network firewall), `db` evaluates to `null`.
  When opening the Lounge detail modal, `LoungeDetailClient` calls `doc(db, 'posts', postId)`. Because `db` is null, it throws an unhandled `TypeError: Cannot read properties of null (reading '_delegate')`.
  Since this asynchronous call is not wrapped in a `try...catch` block, the exception goes uncaught, aborting execution before `setLoading(false)` is reached. The modal stays stuck on the loading spinner forever with no error fallback.
- **Blast radius**: The Lounge modal UI fails silently and permanently under Firestore/connection failure conditions.
- **Mitigation**:
  1. Add a check for `db` existence. If missing, fail early and set `loading` to `false`.
  2. Wrap client-side Firebase network calls (`getDoc`) inside a `try...catch` block:
     ```typescript
     const fetchPost = async () => {
       if (!db) {
         setLoading(false);
         return;
       }
       try {
         const snap = await getDoc(doc(db, 'posts', postId).withConverter(postConverter));
         if (active && snap.exists()) {
           // ...
         }
       } catch (err) {
         logger.error('LoungeDetailClient.fetchPost', 'Failed to fetch post from Firestore', {}, err);
         // set error state
       } finally {
         if (active) setLoading(false);
       }
     };
     ```

---

## Stress Test Results

- **Deep Link to Tab** → Navigating to `/overview?tab=office` → Renders the office tab correctly on initial mount → **PASS**
- **Query Parameter Tab Sync on Back Navigation** → Navigate from `/overview?tab=office` to `/explore`, then click browser back button → Expected active tab to switch back to "사무실 탐색", but `activeTab` stayed as "아파트 랩" → **FAIL** (Synchonization gap confirmed)
- **Modal CLS on Transition** → Open Lounge post modal and monitor layout-shift performance entries → Modal Transition CLS = 0 (aspect-ratio and skeletons correctly reserve layout footprint) → **PASS** (CLS target < 0.1 achieved)
- **Firebase Offline Modal Recovery** → Open Lounge post modal with Firebase uninitialized → Expected component to handle error gracefully, but unhandled TypeError thrown and loading spinner stuck permanently → **FAIL** (Robustness gap confirmed)

---

## Unchallenged Areas

- **Firebase Write / Update Security Rules** — The scope of the review was limited to white-box rendering, tab state, and layout shift; write behaviors like comment creation or likes throttling under slow networks were not challenged on the security rule level.
