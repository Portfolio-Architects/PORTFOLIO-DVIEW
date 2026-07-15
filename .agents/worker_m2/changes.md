# M2 Lounge & News Enhancements - Changes Report

## Overview of Changes
We have successfully implemented typography and performance optimizations for the Lounge & News components (Milestone M2) following Apple HIG design patterns and memoization practices:

### 1. `frontend/src/components/LoungeFeedClient.tsx`
- **NoticeCard Sub-component Extraction**: Extracted inline mapped notice rendering logic into a memoized `NoticeCard` sub-component (`React.memo`) to eliminate unnecessary re-renders of list items.
- **Visual styling upgrade**: Applied Apple HIG styling rules with `rounded-[20px]` outer card wrappers, border color refinements (`border-border/40 dark:border-white/10`), glassmorphic backgrounds (`backdrop-blur-md bg-surface/80 dark:bg-zinc-900/80`), hover translation (`scale-[1.01]`), and shadow updates.
- **Removed hardcoded background variables**: Updated `getCategoryChipStyles` to use high-contrast alpha-layered background utility classes (e.g. `bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20` instead of solid light greens) ensuring support for dark mode and accessibility guidelines.

### 2. `frontend/src/components/LoungeDetailClient.tsx`
- **CommentItem Sub-component Extraction**: Extracted inline mapped comment list items into a memoized `CommentItem` sub-component (`React.memo`).
- **Visual styling upgrade**: Updated the post details wrapper, comment box container, recommended posts container, and inline apartment mentions to use `rounded-[20px]`, `backdrop-blur-md bg-surface/80 dark:bg-zinc-900/80`, and fine border classes (`border-border/40 dark:border-white/10`).
- **Input and focus enhancements**: Implemented a responsive alpha border design for textareas and input fields, adding transition animations on active/focus states (`focus:ring-2 focus:ring-[#c44d00]/30`).
- **Typography & Contrasts**: Replaced custom bold font weights with `font-extrabold text-primary/90 dark:text-zinc-100 tracking-tight leading-relaxed` on post titles and subheadings.

### 3. `frontend/src/components/LoungeComposeClient.tsx`
- **Callback Memoization**: Wrapped modal action handlers (`handleClose`, `handleKeyDown`, `handleImageUpload`, and `handleSubmit`) in `useCallback` to avoid function recreation overhead.
- **Visual styling upgrade**: Applied Apple HIG design rules with `rounded-t-[20px] sm:rounded-[20px]` modal outer boxes, input area adjustments, and active button hover scales (`hover:scale-[1.02] active:scale-[0.98]`).
- **Typography**: Enhanced input and textarea placeholders with high-contrast text and cleaner spacing.

### 4. `frontend/src/components/CommentSection.tsx`
- **Callback Memoization**: Memoized input action handlers (`handleAction`, `handleMentionAuthor`, `handleInputChange`, `selectSuggestion`, and `handleKeyDown`) with `useCallback`.
- **Visual styling upgrade**: Upgraded comments section wrapper, banner cards, and autocomplete popovers to use `rounded-[20px]`, backdrop blurs, and border alphas. Added item hover states (`hover:scale-[1.01] hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]`).

### 5. `frontend/src/app/news/NewsClient.tsx`
- **Sub-component Extraction**: Extracted news items and local notices into memoized sub-components `<NewsCard />` and `<NoticeItemCard />` to optimize re-render performance.
- **Visual styling upgrade**: Updated lists, modal dialog structures, shimmer loader boxes, and action buttons to follow HIG rounded/glassmorphism styling.
- **Removed hardcoded background variables**: Updated `getNoticeSourceDetails` and `getNewsCategoryDetails` to use alpha-based backgrounds.
