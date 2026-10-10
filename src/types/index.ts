/**
 * Core data models and persistence contracts for 1TD (One-Tap Diary).
 * Single source of truth: SPEC.md § III & § VIII.3
 */

export type ActionPresetColor = 'terracotta' | 'lavender' | 'mint' | 'chartreuse';

export const ACTION_PRESET_HEX_MAP: Record<ActionPresetColor, string> = {
  terracotta: '#FF9275',
  lavender: '#C4AAFF',
  mint: '#9DE4BF',
  chartreuse: '#D8FF5E',
};

/**
 * Resolves an Action color value (preset name or #RRGGBB hex) to an explicit #RRGGBB hex string.
 * Required when snapshotting `action_color_snapshot` onto an Event at log time (SPEC.md § III.2).
 */
export function resolveActionColorHex(color: string): string {
  const normalized = color.trim().toLowerCase();
  if (normalized in ACTION_PRESET_HEX_MAP) {
    return ACTION_PRESET_HEX_MAP[normalized as ActionPresetColor];
  }
  if (/^#[0-9a-f]{6}$/i.test(color.trim())) {
    return color.trim().toUpperCase();
  }
  return ACTION_PRESET_HEX_MAP.chartreuse;
}

/**
 * Validate whether a string is an allowed Action color (preset key or 6-digit hex).
 */
export function isValidActionColor(color: string): boolean {
  const trimmed = color.trim();
  return (
    trimmed in ACTION_PRESET_HEX_MAP ||
    /^#[0-9a-fA-F]{6}$/.test(trimmed)
  );
}

/**
 * SPEC.md § III.1 — Action (Template)
 * Stored in localStorage under key `1td:actions`.
 */
export interface Action {
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

export interface CreateActionInput {
  name: string;
  icon: string;
  color: string;
  group?: string;
  is_pinned?: boolean;
  sort_order?: number;
}

export interface UpdateActionInput {
  name?: string;
  icon?: string;
  color?: string;
  group?: string | undefined;
  is_pinned?: boolean;
  sort_order?: number;
  archived_at?: string | null;
}

/**
 * SPEC.md § III.2 — Event (Log Entry)
 * Stored in IndexedDB object store `events`.
 */
export interface Event {
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

/**
 * SPEC.md § III.3 — SuggestionWeights & Settings
 * Stored in localStorage under key `1td:settings`.
 */
export interface SuggestionWeights {
  w1: number; // Time-of-day frequency weight.  Default: 0.35
  w2: number; // Day-of-week frequency weight.  Default: 0.25
  w3: number; // Pin weight.                   Default: 0.20
  w4: number; // Recency weight.               Default: 0.20
  // Invariant: w1 + w2 + w3 + w4 === 1.0
}

export type ThemePreference = 'dark' | 'light' | 'system';

export interface Settings {
  theme: ThemePreference;
  suggestion_weights: SuggestionWeights;
  default_icon: string;        // Lucide icon name for new action default
  last_export: string | null;  // ISO 8601 of last export; null if never exported
}

export const DEFAULT_SUGGESTION_WEIGHTS: SuggestionWeights = {
  w1: 0.35,
  w2: 0.25,
  w3: 0.20,
  w4: 0.20,
};

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  suggestion_weights: { ...DEFAULT_SUGGESTION_WEIGHTS },
  default_icon: 'Activity',
  last_export: null,
};

/**
 * SPEC.md § VIII.3 — Export / Import JSON Schema
 */
export interface ExportBundleV1 {
  export_version: 1;
  exported_at: string;
  app_version: string;
  actions: Action[];
  events: Event[];
  settings: Settings;
}
