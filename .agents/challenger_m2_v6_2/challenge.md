# Challenge Report — Milestone 2 (Frontend Performance & UI/UX Perfection)

## Challenge Summary

**Overall risk assessment**: MEDIUM

Empirical testing and code execution verified the Frontend Performance & UI/UX Perfection changes in Milestone 2. 5 out of 6 targeted edge-case scenarios passed cleanly (dock prefetching, virtual viewport keyboard auto-hide, glassmorphism CSS backdrop-blur, 5-route navigation, and history popstate/hashchange sync). However, empirical execution uncovered a **theme synchronization mismatch** between `SettingsContext` and `next-themes`.

---

## Challenges

### [High] Challenge 1: Theme State Desynchronization Between `SettingsContext` & `next-themes` (`ThemeColorUpdater`)

- **Assumption challenged**: Calling `setTheme('dark')` in `SettingsModal` updates both the UI theme (`.dark` class) and the browser status bar theme color (`meta[name="theme-color"]`).
- **Attack scenario**: User opens consumer settings or profile modal and switches the theme to Dark Mode.
- **Observed empirical failure**: `SettingsModal.tsx` calls `setTheme` from `useSettings()` (`SettingsProvider.tsx`), which adds `dark` class to `document.documentElement`. However, `ThemeColorUpdater` in `ThemeProvider.tsx` reads `useTheme()` from `next-themes`. Because `next-themes` is not notified of the theme change, `resolvedTheme` remains `'light'`, causing `<meta name="theme-color">` to stay `#ffffff` instead of updating to `#121212`.
- **Blast radius**: Discrepancy between dark app UI and light browser status bar/address bar on mobile and PWA displays (iOS Safari & Android Chrome theme-color meta tag mismatch).
- **Mitigation**: Update `SettingsProvider.tsx` or `SettingsModal.tsx` to synchronize `next-themes`'s `useTheme().setTheme` when changing theme, or consolidate theme management into a single provider.

### [Medium] Challenge 2: `FloatingUserBar` Context Dependency Outside `SettingsProvider`

- **Assumption challenged**: `FloatingUserBar` can be rendered in any sub-component or header without requiring a surrounding `SettingsProvider`.
- **Attack scenario**: Rendering `FloatingUserBar` in isolated page routes or unit test harnesses without `SettingsProvider` context.
- **Observed empirical failure**: `FloatingUserBar.tsx:19` calls `useSettings()`, throwing `useSettings must be used within a SettingsProvider` when rendered standalone.
- **Blast radius**: Component test suite failures or unhandled rejections on standalone pages outside `RootLayout`.
- **Mitigation**: Provide safe fallback context or ensure `SettingsProvider` wraps all sub-components.

---

## Stress Test Results

| Scenario | Expected Behavior | Actual Behavior | Pass/Fail |
|---|---|---|---|
| **Dock Touch Prefetching** (`MobileDock.tsx`) | `onTouchStart` and `onMouseEnter` invoke `router.prefetch` on mobile touch viewports without UI latency or errors. | Prefetch triggers cleanly on touchstart & mouseenter. | **PASS** |
| **Virtual Viewport Keyboard Auto-Hide** | MobileDock hides (`translate-y-full opacity-0`) when virtual viewport height shrinks by >120px. | `visualViewport` listener correctly applies hidden CSS classes. | **PASS** |
| **Glassmorphism Backdrop Blur** | Navbars apply `bg-surface/85 backdrop-blur-xl border-border/40` across both light & dark themes. | Translucency and CSS backdrop-blur render accurately. | **PASS** |
| **5-Route Switching & Sync** | Navigating between `technovalley` (`/`), `office` (`/overview?tab=office`), `lounge` (`/lounge`), `overview` (`/overview`), `imjang` (`/explore`) without 404 or state desync. | Smooth route transitions with synchronized activeTab highlights and clean `/technovalley` redirect. | **PASS** |
| **Browser History Back/Forward** | `popstate` / `hashchange` listeners maintain active tab highlight alignment. | History navigation stays perfectly synchronized without layout flash. | **PASS** |
| **Dark/Light Theme & Status Bar Meta Sync** | Toggling dark theme updates `.dark` class AND `<meta name="theme-color">` to `#121212`. | `<html class="dark">` applies, BUT `<meta name="theme-color">` remains `#ffffff` due to `SettingsContext` / `next-themes` decoupling. | **FAIL** |

---

## Unchallenged Areas

- **Production Service Worker Web Push PushManager**: Offline fallbacks used in local dev environment.
