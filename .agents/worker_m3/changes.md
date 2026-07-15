# Changes — 2026-07-15T23:05:00+09:00

## 1. frontend/src/components/OfficeExplorerClient.tsx

- **Performance Optimization (R4)**:
  - Wrapped the main `OfficeExplorerClient` component in `React.memo` to prevent unnecessary root-level re-renders on parent updates.
  - Dynamically imported `CoLeasingBoard` with `{ ssr: false }` using Next.js `dynamic()` helper. Included a sleek skeleton screen loading placeholder.
  - Extracted inline building list mapping item into a separate memoized `<OfficeBuildingCard />` component, which prevents re-rendering the entire building cards list when other filters or state updates occur.
- **Apple HIG Styling Upgrade (R2)**:
  - Outer layouts and filter panels updated to `rounded-[20px]`, glassmorphism `bg-surface/80 dark:bg-zinc-900/80 backdrop-blur-md`, and fine borders `border-border/40 dark:border-white/10`.
  - Upgraded drag resizer element border to `bg-border/30 dark:bg-white/10`.
  - Building card styling enhanced with `rounded-[20px]`, glassmorphism backdrop (`bg-surface/80 dark:bg-zinc-900/80 backdrop-blur-md`), shadow finishes, and `hover:scale-[1.01]` transition transitions.
  - Added smooth scroll fade-in transitions using CSS animations (`animate-in fade-in slide-in-from-bottom-2 duration-300`) and the `scroll-smooth` class on the list wrapper.
  - Detail modal visual styling upgraded to glassmorphism: `bg-surface/90 dark:bg-zinc-900/90 backdrop-blur-lg rounded-[20px] border-border/40 dark:border-white/10 shadow-2xl`.
- **Typography & Theme Enhancements (R3)**:
  - Applied `tracking-tight` and `leading-normal`/`leading-relaxed` to headings and bodies to establish comfortable reading hierarchy.
  - Improved contrast: replaced generic text styling with `text-primary/95 dark:text-zinc-100` and `text-secondary/70 dark:text-zinc-400`.
  - Swapped hardcoded pastel backgrounds with alpha values (e.g. `bg-emerald-500/10 dark:bg-emerald-500/20` and `bg-orange-500/10 dark:bg-orange-500/20`).

## 2. frontend/src/components/GapInvestmentExplorer.tsx

- **Apple HIG Styling Upgrade (R2)**:
  - Main container layout updated to `rounded-[20px]`, glassmorphic opacity `bg-surface/80 dark:bg-zinc-900/80 backdrop-blur-md`, and fine border finishes (`border-border/40 dark:border-white/10`).
  - Stats container cards updated to `rounded-[20px]`, `bg-body/20 dark:bg-zinc-950/20 border-border/40 dark:border-white/10 shadow-sm`.
  - Dynamic budget controller panel updated to `rounded-[20px]`, `bg-body/20 dark:bg-zinc-950/20 border-border/40 dark:border-white/10`.
  - Upgraded quick preset select buttons and show more buttons with `rounded-[10px]` and `rounded-[20px]`, respectively, with smooth scaling transitions (`hover:scale-[1.02] active:scale-[0.98]`).
  - Upgraded select inputs to HIG standards: `bg-surface/80 dark:bg-zinc-800/80 border-border/40 dark:border-white/10 hover:border-[#ea6100]/30 text-primary dark:text-zinc-100 rounded-xl px-3.5 py-2.5 text-[12.5px] font-extrabold focus:outline-none focus:ring-2 focus:ring-[#ea6100]/30`.
  - Upgraded warning banner to glassmorphism: `bg-body/20 dark:bg-zinc-800/30 border-border/40 dark:border-white/10 rounded-[20px] backdrop-blur-sm`.
  - Upgraded `GapComplexCard` to a uniform acrylic HIG card: `bg-surface/80 dark:bg-zinc-900/80 backdrop-blur-md border border-border/40 dark:border-white/10 shadow-sm hover:scale-[1.01] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] rounded-[20px] transition-all duration-300`.
- **Typography & Theme Enhancements (R3)**:
  - Swapped hardcoded light/dark colors (e.g., `#e8f8f5`, `#042820`) in cards with alpha colors (`bg-[#c44d00]/5 dark:bg-[#ea6100]/10 border-[#c44d00]/10 dark:border-[#ea6100]/25`).
  - Added `tracking-tight` and `leading-normal` to card titles and descriptions.
  - Refined typography hierarchy: replaced high-contrast colors with `text-primary/95 dark:text-zinc-100`, `text-secondary/70 dark:text-zinc-400`, and `text-secondary/60 dark:text-zinc-500`.
