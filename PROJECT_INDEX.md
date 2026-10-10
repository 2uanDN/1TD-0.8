# PROJECT_INDEX.md — Navigation Map

**Project:** 1TD (One-Tap Diary)
**Description:** Android-first PWA for logging personal activities with a single tap.
**Current Phase:** STEP 12 COMPLETE — Full v1 PWA Audit, Offline Verification, Service Worker Update Flow & Bundle Optimization (< 150KB gzipped) Complete.
**Last Updated:** 2026-10-09

---

## Routing Table

| If you need to know...                              | File          | Section / Location               |
| --------------------------------------------------- | ------------- | -------------------------------- |
| What to build next, in priority order               | NOW.md        | Next Steps                       |
| Current phase and completion state                  | NOW.md        | Phase + Completed                |
| Active blockers                                     | NOW.md        | Blockers                         |
| Stitch AI mockup file names                         | NOW.md        | Frontend Reference Files         |
| Full tech stack with versions and rationale         | SPEC.md       | § I. Tech Stack                  |
| Architecture overview, layer diagram, data flow     | SPEC.md       | § II. Architecture Overview      |
| `Action` interface (fields, types, constraints)     | SPEC.md       | § III.1                          |
| `Event` interface (fields, types, constraints)      | SPEC.md       | § III.2                          |
| `Settings` + `SuggestionWeights` interfaces         | SPEC.md       | § III.3                          |
| Default settings values                             | SPEC.md       | § III.3                          |
| IndexedDB: DB name, version, object stores, indexes | SPEC.md       | § IV.1 IndexedDB Schema          |
| IndexedDB query patterns (date range, by action)    | SPEC.md       | § IV.1 → Query Patterns          |
| localStorage key names, value types, purposes       | SPEC.md       | § IV.2 localStorage Keys         |
| `uiStore` Zustand interface                         | SPEC.md       | § V.1                            |
| `suggestionStore` Zustand interface                 | SPEC.md       | § V.2                            |
| SW caching strategy by resource type                | SPEC.md       | § VI.1                           |
| Cache name convention and versioning scheme         | SPEC.md       | § VI.2                           |
| SW update flow (user-confirmed reload)              | SPEC.md       | § VI.2 → Update Flow             |
| Complete PWA manifest JSON                          | SPEC.md       | § VII                            |
| Suggestion algorithm formula and component defs     | SPEC.md       | § VIII.1                         |
| Suggestion cold-start behavior                      | SPEC.md       | § VIII.1 → Cold-start            |
| Undo stack: capacity, scope, UI, behavior           | SPEC.md       | § VIII.2                         |
| Export / import JSON schema                         | SPEC.md       | § VIII.3                         |
| Full directory tree with file-level descriptions    | SPEC.md       | § IX                             |
| CSS custom property names (token reference)         | SPEC.md       | § IX → tokens.css note           |
| Performance targets (FCP, TTI, bundle size)         | SPEC.md       | § X                              |
| Security requirements (CSP, storage, auth)          | SPEC.md       | § XI                             |
| All architecture decisions with rationale           | DECISIONS.md  | full file                        |
| Active risks, likelihood, impact, mitigations       | RISKS.md      | full file                        |
| Color palette (hex values, semantic names)          | token_design.md | colors section (read-only)      |
| Typography scale (fonts, sizes, weights)            | token_design.md | typography section (read-only)  |
| Spacing system and border radius values             | token_design.md | spacing + rounded (read-only)   |
| Component descriptions (TapTile, Nav, Drawers...)   | token_design.md | Components section (read-only)  |
| UX principles (A, B, C)                             | BLUEPRINT.md | § I.2 (read-only)       |
| Screen designs and UI flows                         | BLUEPRINT.md | § III (read-only)        |

---

## File Registry

| File                      | Purpose (one line)                                                                     | R/W      |
| ------------------------- | -------------------------------------------------------------------------------------- | -------- |
| `AGENTS.md`               | Agent operation protocol: init order, reading/writing rules, quick reference, PWA rules | R + W    |
| `PROJECT_INDEX.md`        | Navigation map: routing table, file registry, cross-references                        | R + W    |
| `SPEC.md`                 | Complete technical specification: single source of truth for all implementation facts  | R + W    |
| `NOW.md`                  | Live project state: phase, completed tasks, active task, blockers, next steps           | R + W    |
| `DECISIONS.md`            | Architecture decision log: every non-trivial decision with context and rationale        | R + W    |
| `RISKS.md`                | Risk register: likelihood, impact, mitigation, status for all identified risks          | R + W    |
| `token_design.md`         | Design system: full token definitions for color, typography, spacing, components        | R only   |
| `BLUEPRINT.md`  | Product blueprint: UX principles, screen designs, data architecture, feature specs     | R only   |

---

## Key Implementation Cross-References

| Specification Location          | Implementation Location                             |
| ------------------------------- | --------------------------------------------------- |
| SPEC.md § III (data models)     | `src/types/index.ts`                                |
| SPEC.md § IV.1 (IDB schema)     | `src/db/schema.ts` + `src/db/migrate.ts`            |
| SPEC.md § IV.2 (localStorage)   | `src/storage/actions.ts` + `src/storage/settings.ts`|
| SPEC.md § V (Zustand stores)    | `src/store/uiStore.ts` + `src/store/suggestionStore.ts` |
| SPEC.md § VI (SW strategy)      | `src/sw.ts` + `vite.config.ts` (vite-plugin-pwa)   |
| SPEC.md § VII (manifest)        | `public/manifest.json`                              |
| SPEC.md § VIII.1 (algorithm)    | `src/lib/suggestions.ts`                            |
| token_design.md colors          | `src/styles/tokens.css`                             |
| token_design.md typography      | `src/styles/typography.css`                         |
| token_design.md components      | `src/components/`                                   |
| BLUEPRINT.md screens  | `src/views/`                                        |