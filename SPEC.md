---

```markdown
# SPEC.md — Technical Specification

**Version:** 1.0
**Status:** Design complete, coding not started
**Last Updated:** 2026-10-10

---

## I. Tech Stack

### Core Framework

| Technology   | Version | Role                    | Rationale                                                                                                                           |
| ------------ | ------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| React        | 18.x    | UI framework            | Component model matches repeated TapTile/ActionCard patterns; hooks align with async IDB subscriptions; concurrent features for smooth animation |
| TypeScript   | 5.x     | Type safety             | Enforces Action/Event interface contracts across storage layers; prevents IDB schema drift at compile time                         |
| Vite         | 5.x     | Build tool              | Native ESM, fast HMR, first-class `vite-plugin-pwa` integration, minimal configuration overhead                                   |

> ⚠️ **Assumption:** This stack was selected by the project AI agent, not specified by the developer.
> If a different framework is preferred, update this section and DECISIONS.md row 7 before any code is written.

### PWA Infrastructure

| Technology       | Version | Role                        | Rationale                                                                          |
| ---------------- | ------- | --------------------------- | ---------------------------------------------------------------------------------- |
| vite-plugin-pwa  | 0.20.x  | SW generation + manifest    | Workbox integration, auto-precaching, update prompts; no manual SW fetch handlers |
| Workbox          | 7.x     | Service worker runtime      | Injected via vite-plugin-pwa; industry-standard caching strategies                |
| workbox-window   | 7.x     | SW lifecycle management     | Detects `waiting` SW; drives update notification banner                            |

### Data Layer

| Technology | Version | Role                   | Rationale                                                                          |
| ---------- | ------- | ---------------------- | ---------------------------------------------------------------------------------- |
| idb        | 8.x     | IndexedDB wrapper      | Promise-based API, ~2KB, no ORM overhead; Dexie.js is overkill for one store      |

### State Management

| Technology | Version | Role        | Rationale                                                                                      |
| ---------- | ------- | ----------- | ---------------------------------------------------------------------------------------------- |
| Zustand    | 4.x     | UI state    | Avoids Context re-render cascades under high-frequency tap events; simple API, DevTools support |

### UI

| Technology    | Version | Role           | Rationale                                                                                     |
| ------------- | ------- | -------------- | --------------------------------------------------------------------------------------------- |
| Lucide React  | 0.400.x | Icon library   | MIT licensed; 1000+ icons; tree-shakeable; stable API; satisfies "thư viện ổn định" requirement |
| Custom CSS    | —       | Styling        | Token-based; no utility framework — design system aesthetic requires full visual control      |

### Utilities

| Technology | Version | Role                                     |
| ---------- | ------- | ---------------------------------------- |
| date-fns   | 3.x     | Date/time formatting, manipulation, TZ   |

---

## II. Architecture Overview

### Navigation Model

Four top-edge views. No URL routing — single-page shell. View state lives in `uiStore`.
Views are always mounted; inactive views are hidden via CSS, not unmounted.
`HistoryView` and `RhythmView` are React.lazy-loaded (not in critical-path bundle).

```

┌──────────────────────────────────────────┐
│  TODAY  │  LIBRARY  │  HISTORY  │  RHYTHM  │  ← TopNav (always visible, uppercase mono)
├──────────────────────────────────────────┤
│                                          │
│              <Active View>               │
│   TodayView  /  LibraryView  /  etc.     │
│                                          │
└──────────────────────────────────────────┘
         ↑ ActionDrawer / EventDetailDrawer
           (bottom sheet, max 85% viewport)
```

### Data Flow (Critical Path: Tap → Log)

```
User taps TapTile
  → TapTile.onClick
  → useEvents.logEvent(action)
      → build Event object (UUID, snapshots, occurred_at, timezone_id)
      → optimistic update: push to local state (timeline re-renders immediately)
      → db/events.addEvent(event)  [async, non-blocking]
      → uiStore.pushUndo(event)
      → uiStore.showToast("Đã ghi nhận [name] — Hoàn tác", 3000)
  → TodayView re-renders with new timeline item (newest first)

```

### Layer Architecture

```
┌──────────────────────────────────────────┐
│            Views (src/views/)            │  Compose components; read from hooks only
├──────────────────────────────────────────┤
│         Components (src/components/)     │  Reusable UI atoms and molecules
├──────────────────────────────────────────┤
│           Hooks (src/hooks/)             │  Business logic + data access abstraction
├──────────────────────────────────────────┤
│           Store (src/store/)             │  Zustand: UI state, undo stack, toasts
├──────────────────────────────────────────┤
│   DB Layer (src/db/ + src/storage/)      │  All persistence; isolated from UI layer
└──────────────────────────────────────────┘
```

---

## III. Data Models

### III.1 Action (Template)

```typescript
interface Action {
  id: string;                   // UUID v4 via crypto.randomUUID()
  name: string;                 // Required; 1–40 chars; trimmed
  icon: string;                 // Lucide icon name, e.g. "Coffee", "Moon", "Sunrise"
  color: string;                // Hex (#RRGGBB) OR preset: "terracotta"|"lavender"|"mint"|"chartreuse"
  group?: string;               // Optional grouping label; max 30 chars
  is_pinned: boolean;           // Surfaces in top suggestions; default false
  sort_order: number;           // Integer; lower = higher in Library; auto-assigned on create
  created_at: string;           // ISO 8601, UTC
  archived_at: string | null;   // ISO 8601, UTC; null = active; set to timestamp on archive
}
```

**Constraints:**
- `name`: required, 1–40 chars, trimmed of leading/trailing whitespace.
- `icon`: must be a valid Lucide icon name (validated against Lucide's exported icon map).
- `color`: valid hex `#RRGGBB` or one of four preset keys.
- `sort_order`: auto-assigned as `Math.max(...existing.map(a => a.sort_order), 0) + 1` on create.
- `archived_at`: soft delete. Archived actions never surface in suggestions but their events are preserved.

**Storage:** `localStorage` key `1td:actions` as `JSON.stringify(Action[])`.

---

### III.2 Event (Log Entry)

```typescript
interface Event {
  id: string;                    // UUID v4 via crypto.randomUUID()
  action_id: string;             // FK to Action.id (may reference archived action)
  action_name_snapshot: string;  // REQUIRED: copy of Action.name at log time — never mutated
  action_icon_snapshot: string;  // REQUIRED: copy of Action.icon at log time — never mutated
  action_color_snapshot: string; // REQUIRED: copy of resolved hex color at log time — never mutated
  occurred_at: string;           // ISO 8601 with tz offset, e.g. "2025-10-10T14:23:00+07:00"
  created_at: string;            // ISO 8601, UTC — device clock at log time
  timezone_id: string;           // IANA tz ID, e.g. "Asia/Ho_Chi_Minh"
  note: string | null;           // Optional; max 500 chars; added via EventDetailDrawer after log
}
```

**Constraints:**
- `occurred_at` and `created_at`: both default to current device time at tap moment.
- Snapshot fields: copied from Action at log time, never mutated thereafter. Required — TypeScript
  enforces non-optional. `action_color_snapshot` must be a resolved hex (not a preset key).
- `note`: added only via EventDetailDrawer; never blocking the initial log tap.
- Events are never deleted automatically; user must explicitly delete via EventDetailDrawer.

**Storage:** IndexedDB object store `events`.

---

### III.3 Settings

```typescript
interface SuggestionWeights {
  w1: number; // Time-of-day frequency weight.  Default: 0.35
  w2: number; // Day-of-week frequency weight.  Default: 0.25
  w3: number; // Pin weight.                   Default: 0.20
  w4: number; // Recency weight.               Default: 0.20
  // Invariant: w1 + w2 + w3 + w4 === 1.0
}

interface Settings {
  theme: 'dark' | 'light' | 'system';
  suggestion_weights: SuggestionWeights;
  default_icon: string;        // Lucide icon name for new action default
  last_export: string | null;  // ISO 8601 of last export; null if never exported
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  suggestion_weights: { w1: 0.35, w2: 0.25, w3: 0.20, w4: 0.20 },
  default_icon: 'Activity',
  last_export: null,
};
```

**Storage:** `localStorage` key `1td:settings` as `JSON.stringify(Settings)`.

---

## IV. Persistence

### IV.1 IndexedDB Schema

```
Database name : "1td-db"
Version       : 1
```

| Object Store | Key Path | Auto Increment | Description               |
| ------------ | -------- | -------------- | ------------------------- |
| `events`     | `id`     | false          | All logged events by UUID |

**Indexes on `events`:**

| Index Name       | Key Path      | Unique | Primary Use                              |
| ---------------- | ------------- | ------ | ---------------------------------------- |
| `by_occurred_at` | `occurred_at` | false  | Date-range queries (today / week / month)|
| `by_action_id`   | `action_id`   | false  | All events for a given action            |

**Migration rule:** All `onupgradeneeded` handlers live in `src/db/migrate.ts`, versioned
sequentially. Each handler is idempotent. Never modify existing stores without a version bump.

**Common Query Patterns:**

```typescript
// Today's events (most frequent query)
const start = startOfDay(new Date()).toISOString();
const end   = endOfDay(new Date()).toISOString();
await db.transaction('events').store
  .index('by_occurred_at')
  .getAll(IDBKeyRange.bound(start, end));

// Last 7 days (for suggestion scoring)
const sevenDaysAgo = subDays(new Date(), 7).toISOString();
await db.transaction('events').store
  .index('by_occurred_at')
  .getAll(IDBKeyRange.lowerBound(sevenDaysAgo));

// All events for one action
await db.transaction('events').store
  .index('by_action_id')
  .getAll(actionId);
```

---

### IV.2 localStorage Keys

| Key               | Value Type             | Purpose                                              |
| ----------------- | ---------------------- | ---------------------------------------------------- |
| `1td:actions`     | `Action[]` JSON string | All action templates (active + archived)             |
| `1td:settings`    | `Settings` JSON string | App configuration                                    |
| `1td:onboarded`   | `"true"` (string)      | Onboarding completion gate; absence = show onboarding |
| `1td:undo-stack`  | `Event[]` JSON string  | Last 5 events for quick undo; transient (cleared on restart) |

**Notes:**
- All keys use `1td:` namespace prefix to avoid collisions.
- `1td:undo-stack` is intentionally not preserved across restarts (see DECISIONS.md row 12).
- localStorage is synchronous; keep payloads small. Actions array << 1MB under normal use
  (cap at 500 actions; see RISKS.md row 9).

---

## V. State Management (Zustand)

### V.1 uiStore

```typescript
interface UIStore {
  // View navigation
  activeView: 'today' | 'library' | 'history' | 'rhythm' | 'settings';
  setActiveView(view: UIStore['activeView']): void;

  // Drawer management
  openDrawer: 'action-edit' | 'event-detail' | 'add-action' | null;
  drawerPayload: Action | Event | null;
  openActionDrawer(action: Action): void;
  openEventDetailDrawer(event: Event): void;
  openAddActionDrawer(): void;
  closeDrawer(): void;

  // Undo stack (session-only, LIFO, max 5)
  undoStack: Event[];
  pushUndo(event: Event): void;
  popUndo(): Event | undefined;
  clearUndo(): void;

  // Toast notifications
  toastMessage: string | null;
  toastDuration: number;
  showToast(message: string, duration?: number): void;
  clearToast(): void;
}
```

### V.2 suggestionStore

```typescript
interface SuggestionStore {
  suggestions: Action[];
  isComputing: boolean;
  computeSuggestions(
    actions: Action[],
    recentEvents: Event[],
    weights: SuggestionWeights,
    now: Date
  ): void;
}
```

---

## VI. Service Worker Strategy

### VI.1 Caching Strategy by Resource Type

| Resource Type                          | Strategy                   | Rationale                                         |
| -------------------------------------- | -------------------------- | ------------------------------------------------- |
| HTML shell (`index.html`)              | **Cache-first** (precached)| App shell must load instantly offline             |
| JS bundles (`/assets/*.js`)            | **Cache-first** (precached)| Content-hashed filenames; safe to cache forever   |
| CSS bundles (`/assets/*.css`)          | **Cache-first** (precached)| Same as JS                                        |
| App icons (`/icons/*`)                 | **Cache-first** (precached)| Static; rarely change                             |
| PWA manifest (`/manifest.json`)        | **Network-first**, cache fallback | Reflect latest version for installability  |
| Google Fonts CSS                       | **Cache-first**, 365d expiry | Typography critical for design; offline essential |
| Google Fonts WOFF2 files               | **Cache-first**, 365d expiry | Binary assets; stable URLs                       |
| External API calls                     | N/A                        | None — app is 100% local                          |

### VI.2 Cache Naming, Versioning, and Update Flow

**Cache names:**

| Cache Name          | Contents                         | Cleanup Policy                            |
| ------------------- | -------------------------------- | ----------------------------------------- |
| `1td-static-v{N}`  | HTML, JS, CSS, icons, manifest   | Delete versions `< N` on SW `activate`   |
| `1td-fonts-v1`     | Google Fonts CSS + WOFF2 files   | Stable; bump only on font change          |

**Versioning:** Increment `N` on every production deploy that changes precached content.

**Update flow:**
1. New SW installs in background (`install` event).
2. `workbox-window` detects `waiting` SW — fires `waiting` event.
3. App shows "Update available — Reload" banner (non-blocking, dismissible).
4. On user click: `registration.waiting.postMessage({ type: 'SKIP_WAITING' })` + `window.location.reload()`.
5. Old caches deleted in new SW's `activate` event.

**`vite.config.ts` key options:**
```typescript
VitePWA({
  registerType: 'prompt',        // Never auto-update; always prompt
  workbox: {
    skipWaiting: false,          // Require user consent
    clientsClaim: false,
    globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com/,
        handler: 'CacheFirst',
        options: { cacheName: '1td-fonts-v1', expiration: { maxAgeSeconds: 31536000 } }
      },
      {
        urlPattern: /^https:\/\/fonts\.gstatic\.com/,
        handler: 'CacheFirst',
        options: { cacheName: '1td-fonts-v1', expiration: { maxAgeSeconds: 31536000 } }
      }
    ]
  }
})
```

---

## VII. PWA Manifest

```json
{
  "name": "1TD — One-Tap Diary",
  "short_name": "1TD",
  "description": "Log personal activities with a single tap. Build your daily timeline.",
  "start_url": "/",
  "id": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#101411",
  "background_color": "#0b0f0c",
  "lang": "vi",
  "dir": "ltr",
  "categories": ["productivity", "lifestyle"],
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/today-view.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Today view — quick-log tiles and timeline"
    }
  ]
}
```

---

## VIII. Feature Specifications

### VIII.1 Suggestion Algorithm

```
S(a, t) = w1 · H(a, t)  +  w2 · D(a, t)  +  w3 · P(a)  +  w4 · R(a, t)
```

| Term      | Name                   | Computation                                                                                                      | Range    |
| --------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------- | -------- |
| `H(a, t)` | Time-of-day frequency  | Count of events for action `a` in the same 2-hour bracket as `t`, divided by all events in that bracket. Bracket = `Math.floor(hour / 2)` giving 12 brackets (0–11). | [0, 1]  |
| `D(a, t)` | Day-of-week frequency  | Count of events for action `a` on same weekday as `t`, divided by total events on that weekday across all actions. | [0, 1] |
| `P(a)`    | Pin bonus              | `1` if `action.is_pinned === true`, else `0`.                                                                    | {0, 1}   |
| `R(a, t)` | Recency score          | `1 / (1 + hoursSinceLastLog(a, t))`. Decays toward 0 as time since last log increases.                          | (0, 1]   |

**Default weights:** `w1=0.35, w2=0.25, w3=0.20, w4=0.20` (configurable in Settings).

**Output:** Top 4–5 actions sorted descending by `S`. Displayed as TapTiles in TodayView
suggestion area.

**Cold-start fallback** (apply when `recentEvents.length < 3` in last 7 days):
- Skip scoring entirely.
- Return: pinned actions sorted by `sort_order` first, then unpinned actions by `sort_order`.
- No score displayed in cold-start mode.

**Implementation location:** `src/lib/suggestions.ts` as a pure function:
```typescript
function scoreSuggestions(
  actions: Action[],
  events: Event[],
  weights: SuggestionWeights,
  now: Date,
  topN: number = 5
): Action[]
```

---

### VIII.2 Undo Stack

| Property    | Value                                                               |
| ----------- | ------------------------------------------------------------------- |
| Capacity    | 5 events (LIFO)                                                     |
| Scope       | Session only — cleared on app close or page reload                  |
| Storage     | `1td:undo-stack` in localStorage (transient; cleared on mount)      |
| UI          | UndoToast component — "[Action name] logged — Hoàn tác" — 3s timeout |
| Undo action | Delete event from IndexedDB + remove from UI optimistically          |
| Redo        | Not supported                                                        |

---

### VIII.3 Export / Import

**Export JSON schema:**
```json
{
  "export_version": 1,
  "exported_at": "<ISO 8601>",
  "app_version": "1.0.0",
  "actions": [ ...Action[] ],
  "events": [ ...Event[] ],
  "settings": { ...Settings }
}
```

**Import behavior:**
1. Parse JSON; validate `export_version === 1` — reject otherwise.
2. Actions: upsert by `id` (merge, no duplicates).
3. Events: upsert by `id` (merge, no duplicates).
4. Settings: replace entirely with imported settings.
5. Show result: "Imported X actions, Y events."

**Implementation location:** `src/lib/exportImport.ts`

---

## IX. Directory Structure

```
1td/
│
├── public/
│   ├── manifest.json                    # PWA manifest (values in § VII)
│   ├── icons/
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── icon-maskable-512.png
│   └── screenshots/
│       └── today-view.png
│
├── src/
│   │
│   ├── main.tsx                         # Entry: DB init, SW registration, mount <App />
│   ├── App.tsx                          # Root: onboarding gate, TopNav, view switching
│   ├── sw.ts                            # Workbox SW (via vite-plugin-pwa)
│   │
│   ├── types/
│   │   └── index.ts                     # Action, Event, Settings, SuggestionWeights interfaces
│   │
│   ├── styles/
│   │   ├── tokens.css                   # ALL CSS custom properties from token_design.md ①
│   │   ├── base.css                     # CSS reset + html/body/safe-area base styles
│   │   └── typography.css               # Google Fonts @import + typographic utility classes
│   │
│   ├── db/
│   │   ├── schema.ts                    # openDB("1td-db", 1, ...) with events store + indexes
│   │   ├── events.ts                    # addEvent, getEventsByDate, getEventsByAction,
│   │   │                                #   deleteEvent, updateEventNote
│   │   └── migrate.ts                   # onupgradeneeded handlers per DB version
│   │
│   ├── storage/
│   │   ├── actions.ts                   # getActions, saveActions, addAction,
│   │   │                                #   updateAction, archiveAction
│   │   └── settings.ts                  # getSettings, saveSettings
│   │
│   ├── store/
│   │   ├── uiStore.ts                   # Zustand: activeView, drawer, undoStack, toast
│   │   └── suggestionStore.ts           # Zustand: computed suggestions array
│   │
│   ├── hooks/
│   │   ├── useActions.ts                # Read actions from localStorage; expose CRUD ops
│   │   ├── useEvents.ts                 # logEvent, getEventsForDate, deleteEvent,
│   │   │                                #   updateNote (via src/db/events.ts)
│   │   ├── useSuggestions.ts            # Calls suggestionStore.computeSuggestions;
│   │   │                                #   triggers on action/event change
│   │   ├── useSettings.ts               # Theme sync, storage estimate, export/import/delete-all
│   │   ├── useOnboarding.ts             # 3-step interactive onboarding flow state & actions
│   │   └── useUndoStack.ts              # Expose pushUndo, executeUndo; drive toast lifecycle
│   │
│   ├── lib/
│   │   ├── suggestions.ts               # Pure fn: scoreSuggestions(actions, events, weights, now)
│   │   ├── exportImport.ts              # exportToJSON(): string; importFromJSON(json: string): void
│   │   ├── uuid.ts                      # export const newId = (): string => crypto.randomUUID()
│   │   └── time.ts                      # formatTime, formatDate, getTimeBracket, getTimezone,
│   │                                    #   startOfDay, endOfDay (thin wrappers over date-fns)
│   │
│   ├── components/
│   │   ├── nav/
│   │   │   └── TopNav.tsx               # TODAY / LIBRARY / HISTORY / RHYTHM tab bar;
│   │   │                                #   active tab: 2px --color-acid underline + dot
│   │   │
│   │   ├── onboarding/
│   │   │   └── OnboardingFlow.tsx       # 3-step interactive guide: create 2 actions ->
│   │   │                                #   log first event -> test 3s undo -> set 1td:onboarded
│   │   │
│   │   ├── tiles/
│   │   │   ├── TapTile.tsx              # One-tap entry cell: icon, name, frequency badge;
│   │   │   │                            #   :active fill #20261F + 1px --color-acid border
│   │   │   └── TileGrid.tsx             # Responsive 2-col grid of TapTiles +
│   │   │                                #   "Các hành động khác" cell → opens LibraryView
│   │   │
│   │   ├── timeline/
│   │   │   ├── TimelineItem.tsx         # Event row: color-stripe badge, icon, name,
│   │   │   │                            #   mono timestamp, undo button
│   │   │   └── TimelineFeed.tsx         # Today's events newest-first; empty state
│   │   │
│   │   ├── library/
│   │   │   ├── ActionCard.tsx           # Action in library: icon, name, color chip,
│   │   │   │                            #   pin toggle, edit button
│   │   │   ├── ActionForm.tsx           # Create/edit form: name, icon picker,
│   │   │   │                            #   color picker, group, pin toggle
│   │   │   └── LibraryGrid.tsx          # Searchable grid of ActionCards + "Add" button
│   │   │
│   │   ├── history/
│   │   │   └── HistoryList.tsx          # Events grouped by date; edit/delete per event;
│   │   │                                #   export button
│   │   │
│   │   ├── drawers/
│   │   │   ├── ActionDrawer.tsx         # Bottom sheet (85% viewport): edit action via ActionForm
│   │   │   └── EventDetailDrawer.tsx    # Bottom sheet: add/edit note, edit occurred_at,
│   │   │                                #   delete event
│   │   │
│   │   └── shared/
│   │       ├── IconPicker.tsx           # Searchable Lucide icon grid picker
│   │       ├── ColorPicker.tsx          # 4 preset swatches + custom hex input
│   │       ├── Badge.tsx                # Micro-badge: mono text, 2px left color-stroke
│   │       ├── Timestamp.tsx            # JetBrains Mono formatted time (14:02 / +24M)
│   │       └── UndoToast.tsx            # Bottom toast: "[name] logged — Hoàn tác" 3s timeout
│   │
│   └── views/
│       ├── TodayView.tsx               # Header (date + count) + TileGrid + TimelineFeed
│       ├── LibraryView.tsx             # LibraryGrid; opens ActionDrawer on edit
│       ├── HistoryView.tsx             # HistoryList (lazy loaded)
│       ├── RhythmView.tsx              # Suggestions & analytics (lazy loaded)
│       └── SettingsView.tsx            # Theme, default icon, storage gauge, data ops (lazy loaded)
│
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

**① tokens.css — Key CSS Custom Property Names:**

Agents must use these property names; never hardcode values.

```css
/* Surface levels */
--color-background        /* #101411 */
--color-canvas            /* #0b0f0c  — deepest, margins */
--color-sheet             /* #191d19  — primary entry block substrate */
--color-elevated          /* #272b28  — elevated tap targets, active drawers */
--color-surface-bright    /* #363a37  — brightest surface */

/* Text */
--color-on-surface        /* #e0e3de */
--color-on-surface-variant/* #c5c9b0 */

/* Primary action */
--color-acid              /* #D8FF5E  — Acid Chartreuse; use sparingly */
--color-primary-container /* #cbf152  — Material token variant of chartreuse */
--color-on-primary        /* #293500 */

/* Secondary accent (technical metadata, nav) */
--color-secondary         /* #b9c3ff  — Muted Cobalt */
--color-secondary-container /* #283e9a */

/* Activity accents */
--color-accent-terracotta /* #FF9275 */
--color-accent-lavender   /* #C4AAFF */
--color-accent-mint       /* #9DE4BF */
--color-accent-chartreuse /* #D8FF5E */

/* Structure */
--color-hairline          /* rgba(241, 243, 232, 0.08) — standard borders */
--color-hairline-focus    /* rgba(241, 243, 232, 0.16) — input focus state */
--color-outline           /* #8f937c */
--color-outline-variant   /* #454936 */

/* Error */
--color-error             /* #ffb4ab */
--color-error-container   /* #93000a */

/* Fonts */
--font-display            /* 'Space Grotesk', system-ui, sans-serif */
--font-mono               /* 'JetBrains Mono', ui-monospace, monospace */
--font-editorial          /* 'Newsreader', Georgia, serif */

/* Border radius */
--radius-sm               /* 0.125rem */
--radius-default          /* 0.25rem */
--radius-md               /* 0.375rem */
--radius-lg               /* 0.5rem */
--radius-xl               /* 0.75rem */
--radius-full             /* 9999px */

/* Spacing */
--space-2xs               /* 0.125rem */
--space-xs                /* 0.25rem */
--space-sm                /* 0.5rem */
--space-md                /* 0.75rem */
--space-lg                /* 1.25rem */
--space-xl                /* 2rem */
--space-2xl               /* 3.5rem */
--gutter                  /* 0.75rem */
--margin                  /* 1rem */
```

> ⚠️ **Color discrepancy:** Brand description uses `#D8FF5E` (Acid Chartreuse) as primary action
> color; Material tokens use `#cbf152` as `primary-container`. Both are defined. Use `--color-acid`
> for all active/recording/CTA states per brand narrative. Designer should reconcile before production.

---

## X. Performance Requirements

| Metric                              | Target     | Notes                                              |
| ----------------------------------- | ---------- | -------------------------------------------------- |
| First Contentful Paint              | < 1.5s     | Mid-range Android (Moto G series), 4G connection   |
| Time to Interactive                 | < 3.0s     | Full shell interactivity after JS parse            |
| Tap → visual feedback               | < 16ms     | CSS `:active` state only; no JS required           |
| Initial JS bundle (gzipped)         | < 150KB    | HistoryView + RhythmView excluded (lazy-loaded)    |
| IndexedDB read — today's events     | < 50ms     | Indexed range query; typical use < 200 events/day  |
| Lighthouse PWA score                | 100        | Mandatory for installability on Android            |
| Lighthouse Performance (mobile sim) | ≥ 90       | Simulated mid-tier mobile in Chrome DevTools       |

---

## XI. Security Requirements

- **No outbound network requests** from app code. All data stays on device. CSP enforces this.
- **Content Security Policy** (set in `index.html` `<meta>` tag):
  - `default-src 'self'`
  - `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
  - `font-src 'self' https://fonts.gstatic.com`
  - `script-src 'self'`
  - `connect-src 'none'`
- **Persistent storage:** Call `navigator.storage.persist()` on first run to request durable
  storage quota. Handle rejection gracefully (show "Export regularly" reminder).
- **Storage quota monitoring:** Check `navigator.storage.estimate()` and warn user in Settings
  if `usage / quota > 0.7` (70% used).
- **No authentication:** Local-only, single-user.
- **SW scope:** Explicitly set to `'/'` in both `navigator.serviceWorker.register()` and
  Workbox config to prevent scope mismatch.
- **Data export:** User-initiated only. No automatic backup or upload.

```

---