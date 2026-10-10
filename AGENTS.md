# AGENTS.md — Agent Operation Protocol

## Project Identity

| Field              | Value                                                                            |
| ------------------ | -------------------------------------------------------------------------------- |
| **Name**           | 1TD (One-Tap Diary)                                                              |
| **One-liner**      | Android-first PWA for logging personal activities with a single tap.             |
| **Project type**   | Progressive Web App (PWA) — local-first, offline-capable, zero backend           |
| **Design system**  | "Temporal Field Journal" — mineral darks, acid chartreuse, monospace timestamps  |
| **Primary language** | Vietnamese (UI copy); English (codebase, all documentation)                   |
| **Stack**          | React 18 + TypeScript 5 + Vite 5 (see DECISIONS.md row 7 if changing)           |

---

## Session Initialization Protocol

Read files in this exact order before beginning any task:

| Step | File              | Condition                                  |
| ---- | ----------------- | ------------------------------------------ |
| 1    | AGENTS.md         | Mandatory — every session                  |
| 2    | NOW.md            | Mandatory — every session                  |
| 3    | PROJECT_INDEX.md  | Mandatory — every session                  |
| 4    | SPEC.md (section) | Task-dependent — use routing table in step 3 |
| 5    | DECISIONS.md      | Read before any architecture decision      |
| 6    | RISKS.md          | Read before implementing flagged risk areas |

**Do not** read SPEC.md in full by default. Always locate the specific section first via
PROJECT_INDEX.md routing table, then read only that section.

---

## File Reading Rules

1. Read NOW.md first — understand the active task before reading anything else.
2. Use PROJECT_INDEX.md routing table to identify which SPEC.md section is relevant to the task.
3. Read only the identified section — stop when you have enough context.
4. Search for a section heading before reading the full file.
5. Re-read DECISIONS.md before proposing any architecture change; if a decision exists, respect it.
6. Never re-read a file already held in context unless that file was updated in this session.
7. `token_design.md` and `BLUEPRINT.md` are read-only reference documents — never modify them.

---

## File Writing Rules

1. **NOW.md** — update after every completed task: advance phase if warranted, move tasks,
   update blockers, revise next steps list.
2. **DECISIONS.md** — append a new row only for non-trivial decisions with real tradeoffs.
   Do not record trivial or obvious choices.
3. **RISKS.md** — append new risks when discovered; update Status column when resolved or accepted.
4. **SPEC.md** — single source of truth for data models, persistence, tech stack, and architecture.
   If implementation diverges from spec, update SPEC.md. Never document the same fact in two files.
5. **No duplication** — if two files would contain the same fact, one references the other.
6. **Preserve existing content** — never silently drop, truncate, or overwrite unrelated sections.

---

## Quick Reference Table

| If you need to know...                              | File → Section                                  |
| --------------------------------------------------- | ----------------------------------------------- |
| What to build next                                  | NOW.md → Next Steps                             |
| Current phase / completion state                    | NOW.md → Phase                                  |
| Stitch AI mockup file names                         | NOW.md → Frontend Reference Files               |
| `Action` TypeScript interface                       | SPEC.md → § III.1                               |
| `Event` TypeScript interface                        | SPEC.md → § III.2                               |
| `Settings` TypeScript interface                     | SPEC.md → § III.3                               |
| IndexedDB database name, version, stores, indexes   | SPEC.md → § IV.1                                |
| localStorage key names and value types              | SPEC.md → § IV.2                                |
| Zustand store interfaces                            | SPEC.md → § V                                   |
| Service worker fetch strategies by resource type    | SPEC.md → § VI.1                                |
| Cache naming convention and versioning              | SPEC.md → § VI.2                                |
| SW update flow                                      | SPEC.md → § VI.2                                |
| PWA manifest fields (complete)                      | SPEC.md → § VII                                 |
| Suggestion algorithm formula and weights            | SPEC.md → § VIII.1                              |
| Undo stack behavior and capacity                    | SPEC.md → § VIII.2                              |
| Export / import JSON schema                         | SPEC.md → § VIII.3                              |
| Full directory tree                                 | SPEC.md → § IX                                  |
| CSS custom property names reference                 | SPEC.md → § IX → tokens.css note               |
| Performance targets                                 | SPEC.md → § X                                   |
| Why a specific decision was made                    | DECISIONS.md                                    |
| Active risks and mitigations                        | RISKS.md                                        |
| Full color palette, typography, spacing tokens      | token_design.md (read-only)                     |
| UX screens, flows, and UX principles                | BLUEPRINT.md (read-only)              |
| Icon library choice                                 | SPEC.md → § I (UI row)                          |

---

## Task Execution Checklist

### Before Writing Code
- [ ] Read NOW.md — confirm the active task and that no blocker exists
- [ ] Identify affected TypeScript interfaces in SPEC.md § III
- [ ] Identify affected files and directories in SPEC.md § IX
- [ ] Check DECISIONS.md — is there a settled decision in this area?
- [ ] Check RISKS.md — is this area flagged as high-risk?

### During Development
- [ ] Follow TypeScript interfaces from SPEC.md § III exactly — no deviation without updating spec
- [ ] Use only CSS custom properties from `src/styles/tokens.css` — no hardcoded hex values,
      spacing numbers, or font family strings in component code
- [ ] All IndexedDB operations go through `src/db/` modules only — no raw `idb` calls in
      components, views, or hooks
- [ ] All localStorage operations go through `src/storage/` modules only
- [ ] Touch targets: minimum 48×48px interactive bounding zone on all tappable elements
- [ ] Every tap action must have immediate visual feedback via CSS `:active` — no JS delay
- [ ] No confirmation dialogs on log-action taps — save immediately, offer undo via `UndoToast`
- [ ] `HistoryView` and `RhythmView` are lazy-loaded (`React.lazy` + `Suspense`)
- [ ] Component file limit: 200 lines — extract logic to hooks if exceeded

### After Writing Code
- [ ] Update NOW.md: move completed task → "Completed", update "Current Task", revise "Next Steps"
- [ ] Append new architecture decision to DECISIONS.md if one was made
- [ ] Append new risk to RISKS.md if one was identified

---

## PWA-Specific Coding Rules

### Service Worker
- All SW logic lives in `src/sw.ts` only; do not inline SW code elsewhere.
- Use Workbox via `vite-plugin-pwa` — do not hand-write fetch event handlers for precached assets.
- **Never** set `skipWaiting: true` in Workbox config. Always require explicit user action.
- SW update flow: detect `waiting` SW via `workbox-window` → show in-app "Update available"
  banner → reload only on user consent via `registration.waiting.postMessage({ type: 'SKIP_WAITING' })`.
- Test SW state in Chrome DevTools → Application → Service Workers.
- Always test critical paths with DevTools "Offline" checkbox checked.

### Caching
- Cache names follow `1td-{type}-v{N}` convention. Increment `N` on breaking content changes.
- Delete all stale caches (`v{N-1}` and older) in SW `activate` event — never accumulate.

### IndexedDB
- Only access IndexedDB via `src/db/events.ts` functions. No raw `idb` calls in components.
- All schema migrations live in `src/db/migrate.ts`; each migration handler is idempotent.
- Wrap all DB operations in `try/catch`; surface errors via `uiStore.showToast`.
- All DB operations are `async/await` — never block the render thread.

### State and Performance
- Zustand stores hold UI state and derived/computed data only — never raw DB rows.
- Optimistic UI: update timeline before IndexedDB write resolves; rollback on error.
- Target initial bundle: < 150KB gzipped. `HistoryView` and `RhythmView` are lazy-loaded.

### Offline First
- Treat offline as the default operating mode. Network access is never assumed or required.
- All core features (log, view today, browse library, view history, export) must work fully offline.
- No feature should fail silently when offline.

### Accessibility
- All interactive elements must have `aria-label` or `aria-labelledby`.
- Manage focus on drawer open (focus first interactive element) and close (return focus to trigger).
- Minimum contrast: 4.5:1 for body text; 3:1 for large text (≥ 18px or bold ≥ 14px).

---

## Notes for AI Agents

- **Design language:** "Temporal Field Journal." Reject rounded-card / floating / blurred UI.
  Prefer dense hairline-separated surfaces, matte opaque backgrounds, zero shadows.
- **Primary action color:** `--color-acid: #D8FF5E` (Acid Chartreuse). Use sparingly — active
  states, recording indicators, primary CTA buttons only.
- **Surface levels:** `--color-canvas: #0b0f0c` → `--color-sheet: #191d19` →
  `--color-elevated: #272b28`. Depth via tonal contrast, never box-shadow.
- **Hairline borders:** `--color-hairline: rgba(241, 243, 232, 0.08)`. No other border style.
- **Timestamps:** Always rendered in `--font-mono` (JetBrains Mono).
- **Navigation:** Four top-edge views: `TODAY`, `LIBRARY`, `HISTORY`, `RHYTHM`.
  Active tab: 2px `--color-acid` underline + indicator dot. Labels in uppercase mono-badge style.
- **Undo vs. confirm:** The app never asks "Are you sure?" for logging. Undo toast is always
  available for 3 seconds after a log. This is non-negotiable per UX Principle A.
- **Onboarding gate:** `App.tsx` checks `localStorage.getItem('1td:onboarded')` on mount.
  If absent → render onboarding flow. If present → render main shell.