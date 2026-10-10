---

```markdown
# NOW.md — Current Project State

**Phase:** STEP 12 COMPLETE — Full v1 PWA Audit, Offline Verification, Service Worker Update Flow & Bundle Optimization (< 150KB gzipped) Complete
**Last Updated:** 2026-10-10

---

## Completed

- [x] Product concept, UX principles, and screen designs (`BLUEPRINT.md`)
- [x] Design system — "Temporal Field Journal" (`token_design.md`)
- [x] Data architecture decided: `actions` / `events` / `settings` separation with IDB + localStorage split
- [x] UI flows designed: Today, Library, History, Rhythm, Settings, Onboarding
- [x] Technical specification written (`SPEC.md`)
- [x] Architecture decisions logged (`DECISIONS.md`)
- [x] Risk register initialized (`RISKS.md`)
- [x] Project documentation system bootstrapped (all 6 core files)
- [x] Step 1 — Project setup, PWA manifest & Service Worker (`src/sw.ts`), CSS token/base/typography layers, and `TopNav` 4-tab shell
- [x] Step 2 — TypeScript interfaces (`src/types/index.ts`), IndexedDB layer (`src/db/schema.ts`, `src/db/migrate.ts`, `src/db/events.ts`), and localStorage layer (`src/storage/actions.ts`, `src/storage/settings.ts`)
- [x] Step 3 — Zustand stores (`src/store/uiStore.ts`, `src/store/suggestionStore.ts`), utilities (`src/lib/uuid.ts`, `src/lib/time.ts`), `src/App.tsx` (onboarding gate + `TopNav` + always-mounted view switcher), and skeleton views (`TodayView`, `LibraryView`, lazy-loaded `HistoryView`, lazy-loaded `RhythmView`)
- [x] Step 4 — Core Tap Flow (End-to-End): `ActionIcon`, `TapTile`, `TileGrid`, `useActions`, `useEvents`, `useUndoStack`, `UndoToast`, and optimistic logging in `TodayView`
- [x] Step 5 — Timeline: `Badge`, `Timestamp`, `TimelineItem`, `TimelineFeed`, and live `TodayView` header & timeline integration
- [x] Step 6 — Library Screen: `IconPicker`, `ColorPicker`, `ActionCard`, `ActionForm`, `LibraryGrid`, `ActionDrawer`, and full Action CRUD in `LibraryView`
- [x] Step 7 — Event Detail Drawer: `EventDetailDrawer`, note editing, `occurred_at` time editing (input + minute steppers), and event deletion with inline confirmation
- [x] Step 8 — History View: `HistoryList.tsx` (events grouped by date with edit/delete per event), `exportImport.ts` (`exportToJSON` & `importFromJSON` per `SPEC.md § VIII.3`), and `HistoryView.tsx`
- [x] Step 9 — Rhythm View (Suggestions & Analytics): `src/lib/suggestions.ts` (`scoreSuggestions` + cold-start fallback + sequence & habit rhythm analytics), `src/hooks/useSuggestions.ts`, and lazy-loaded `src/views/RhythmView.tsx`
- [x] Step 10 — Settings Screen: `src/hooks/useSettings.ts`, `:root[data-theme='light']` token overrides, default icon picker, calibrated storage usage & persistent quota monitor, and JSON export / import / delete-all data in lazy-loaded `src/views/SettingsView.tsx`
- [x] Step 11 — Onboarding Flow: `src/hooks/useOnboarding.ts` and `src/components/onboarding/OnboardingFlow.tsx` (3-step interactive guide: create/confirm 2 actions → log first event → test 3s undo + local-first & iOS Safari guidance → set `1td:onboarded` on completion)
- [x] Step 12 — PWA Audit and Offline Testing: tree-shaken `date-fns/locale/vi` bundle optimization (< 150KB gzipped), SPA `NavigationRoute` & offline font fallback in `src/sw.ts`, dismissible SW update banner (`SPEC.md § VI.2`), live offline status indicator, IndexedDB blocked toast wiring (`RISKS.md #12`), and PWA diagnostics in `SettingsView.tsx`
- [x] Post-v1 Polish — Fixed Flexbox button compression/overflow across `.view-row-between` and `.shell-banner` (`TodayView`, `LibraryView`, `SettingsView`) and expanded `ACTION_ICON_MAP` / `IconPicker` from 31 to 80 curated Lucide icons with Vietnamese/English keyword inference

---

## Current Task

**All 12 v1 Implementation Steps Complete — Ready for Production Release**

All planned v1 milestones (Steps 1–12) are implemented and verified. Future iterations (v2) may evaluate optional encrypted backup/sync per `DECISIONS.md #1`.

---

## Blockers

None.

---

## Next Steps (Priority Order)

### Step 1 — Project Init and CSS Foundation
- [x] `npm create vite@latest 1td -- --template react-ts`
- [x] Install dependencies:
  `npm install idb@8 zustand@4 lucide-react date-fns@3`
  `npm install -D vite-plugin-pwa`
- [x] Configure `vite.config.ts` with `vite-plugin-pwa` using manifest values from `SPEC.md § VII`
- [x] Create `public/manifest.json` (copy from `SPEC.md § VII`)
- [x] Create `src/styles/tokens.css` (all CSS custom properties from `SPEC.md § IX → tokens.css`)
- [x] Create `src/styles/base.css` (CSS reset + html/body base + safe-area insets)
- [x] Create `src/styles/typography.css` (Google Fonts @import + typographic utility classes)
- [x] Import all three style files in `src/main.tsx`

### Step 2 — TypeScript Interfaces and Persistence Layer
- [x] Create `src/types/index.ts` with `Action`, `Event`, `Settings`, `SuggestionWeights` per `SPEC.md § III`
- [x] Create `src/db/schema.ts` (`openDB("1td-db", 1, ...)` with `events` store and indexes)
- [x] Create `src/db/migrate.ts` (version 1 `onupgradeneeded` handler)
- [x] Create `src/db/events.ts` (`addEvent`, `getEventsByDate`, `getEventsByAction`,
  `deleteEvent`, `updateEventNote`)
- [x] Create `src/storage/actions.ts` (`getActions`, `saveActions`, `addAction`,
  `updateAction`, `archiveAction`)
- [x] Create `src/storage/settings.ts` (`getSettings`, `saveSettings`)

### Step 3 — Zustand Stores and App Shell
- [x] Create `src/store/uiStore.ts` (per `SPEC.md § V.1`)
- [x] Create `src/store/suggestionStore.ts` (per `SPEC.md § V.2`)
- [x] Create `src/lib/uuid.ts`, `src/lib/time.ts`
- [x] Create `src/App.tsx` (onboarding gate + TopNav + view switcher skeleton)
- [x] Build `src/components/nav/TopNav.tsx` (TODAY/LIBRARY/HISTORY/RHYTHM; acid underline on active)
- [x] Create skeleton views (empty layout, no data): `TodayView`, `LibraryView`, `HistoryView`, `RhythmView`

### Step 4 — Core Tap Flow (End-to-End)
- [x] Build `TapTile.tsx` and `TileGrid.tsx`
- [x] Build `useActions.ts` and `useEvents.ts` hooks
- [x] Wire `logEvent()` in `TodayView`: tap → build Event → optimistic update → IDB write → undo push → toast
- [x] Build `UndoToast.tsx` (3s timeout, "Hoàn tác" button)
- [x] Build `useUndoStack.ts` (executeUndo deletes event from IDB + UI)

### Step 5 — Timeline
- [x] Build `TimelineItem.tsx` (color badge, icon, name, mono timestamp, undo button)
- [x] Build `TimelineFeed.tsx` (newest first, empty state)
- [x] Connect `TodayView` header to live event count

### Step 6 — Library Screen
- [x] Build `ActionCard.tsx`, `ActionForm.tsx`, `LibraryGrid.tsx`
- [x] Build `ActionDrawer.tsx` (bottom sheet)
- [x] Full CRUD on actions: add, edit, pin/unpin, archive
- [x] `IconPicker.tsx` and `ColorPicker.tsx` shared components

### Step 7 — Event Detail Drawer
- [x] Build `EventDetailDrawer.tsx`
- [x] Add/edit note on logged event
- [x] Edit `occurred_at` time
- [x] Delete event with confirmation

### Step 8 — History View
- [x] Build `HistoryList.tsx` (grouped by date; edit/delete per event)
- [x] Export to JSON (`src/lib/exportImport.ts`)
- [x] Lazy-load `HistoryView`

### Step 9 — Rhythm View (Suggestions & Analytics)
- [x] Implement `src/lib/suggestions.ts` (pure scoring function)
- [x] Wire `useSuggestions.ts` hook
- [x] Build `RhythmView.tsx`
- [x] Lazy-load `RhythmView`

### Step 10 — Settings Screen
- [x] Dark / light / system theme toggle
- [x] Export / Import / Delete all data
- [x] Storage usage display

### Step 11 — Onboarding Flow
- [x] 3-step guide: create 2 actions → log first event → understand undo
- [x] Set `1td:onboarded` on completion

### Step 12 — PWA Audit and Offline Testing
- [x] Lighthouse PWA audit: score must be 100
- [x] Lighthouse Performance (mobile simulation): score ≥ 90
- [x] Full offline test: disconnect network, verify all core features work
- [x] SW update flow test: deploy, open old cached version, verify update banner appears
- [x] iOS Safari test: install to home screen, verify storage persists across sessions

---