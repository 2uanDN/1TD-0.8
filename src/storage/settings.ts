import {
  DEFAULT_SETTINGS,
  DEFAULT_SUGGESTION_WEIGHTS,
  Event,
  Settings,
  SuggestionWeights,
  ThemePreference,
} from '../types';

export const SETTINGS_STORAGE_KEY = '1td:settings';
export const ONBOARDED_STORAGE_KEY = '1td:onboarded';
export const UNDO_STACK_STORAGE_KEY = '1td:undo-stack';

function isValidTheme(value: unknown): value is ThemePreference {
  return value === 'dark' || value === 'light' || value === 'system';
}

function sanitizeWeights(candidate: unknown): SuggestionWeights {
  if (!candidate || typeof candidate !== 'object') {
    return { ...DEFAULT_SUGGESTION_WEIGHTS };
  }

  const raw = candidate as Record<string, unknown>;
  const w1 = typeof raw.w1 === 'number' && Number.isFinite(raw.w1) && raw.w1 >= 0 ? raw.w1 : DEFAULT_SUGGESTION_WEIGHTS.w1;
  const w2 = typeof raw.w2 === 'number' && Number.isFinite(raw.w2) && raw.w2 >= 0 ? raw.w2 : DEFAULT_SUGGESTION_WEIGHTS.w2;
  const w3 = typeof raw.w3 === 'number' && Number.isFinite(raw.w3) && raw.w3 >= 0 ? raw.w3 : DEFAULT_SUGGESTION_WEIGHTS.w3;
  const w4 = typeof raw.w4 === 'number' && Number.isFinite(raw.w4) && raw.w4 >= 0 ? raw.w4 : DEFAULT_SUGGESTION_WEIGHTS.w4;

  const sum = w1 + w2 + w3 + w4;
  if (sum <= 0) {
    return { ...DEFAULT_SUGGESTION_WEIGHTS };
  }

  // Maintain invariant w1 + w2 + w3 + w4 === 1.0 (SPEC.md § III.3)
  if (Math.abs(sum - 1.0) > 1e-6) {
    const normW1 = Number((w1 / sum).toFixed(4));
    const normW2 = Number((w2 / sum).toFixed(4));
    const normW3 = Number((w3 / sum).toFixed(4));
    const normW4 = Number((1 - normW1 - normW2 - normW3).toFixed(4));
    return { w1: normW1, w2: normW2, w3: normW3, w4: normW4 };
  }

  return { w1, w2, w3, w4 };
}

/**
 * Reads application settings from `localStorage` (`1td:settings`),
 * falling back to `DEFAULT_SETTINGS` for any missing or invalid fields.
 */
export function getSettings(): Settings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      ...DEFAULT_SETTINGS,
      suggestion_weights: { ...DEFAULT_SUGGESTION_WEIGHTS },
    };
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return {
        ...DEFAULT_SETTINGS,
        suggestion_weights: { ...DEFAULT_SUGGESTION_WEIGHTS },
      };
    }

    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      theme: isValidTheme(parsed.theme) ? parsed.theme : DEFAULT_SETTINGS.theme,
      suggestion_weights: sanitizeWeights(parsed.suggestion_weights),
      default_icon:
        typeof parsed.default_icon === 'string' && parsed.default_icon.trim().length > 0
          ? parsed.default_icon.trim()
          : DEFAULT_SETTINGS.default_icon,
      last_export:
        typeof parsed.last_export === 'string' ? parsed.last_export : null,
    };
  } catch (error: unknown) {
    console.error('[1TD][Storage] Failed to read 1td:settings from localStorage:', error);
    return {
      ...DEFAULT_SETTINGS,
      suggestion_weights: { ...DEFAULT_SUGGESTION_WEIGHTS },
    };
  }
}

/**
 * Saves full or partial Settings to `localStorage` (`1td:settings`) and returns the merged Settings.
 */
export function saveSettings(updates: Partial<Settings> | Settings): Settings {
  const current = getSettings();

  const merged: Settings = {
    theme: isValidTheme(updates.theme) ? updates.theme : current.theme,
    suggestion_weights:
      updates.suggestion_weights !== undefined
        ? sanitizeWeights(updates.suggestion_weights)
        : current.suggestion_weights,
    default_icon:
      typeof updates.default_icon === 'string' && updates.default_icon.trim().length > 0
        ? updates.default_icon.trim()
        : current.default_icon,
    last_export:
      updates.last_export !== undefined ? updates.last_export : current.last_export,
  };

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
    } catch (error: unknown) {
      throw new Error('[1TD][Storage] Failed to save 1td:settings to localStorage.', {
        cause: error,
      });
    }
  }

  return merged;
}

/**
 * Checks whether onboarding has been completed (`1td:onboarded === "true"` per SPEC.md § IV.2).
 */
export function isOnboarded(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    return window.localStorage.getItem(ONBOARDED_STORAGE_KEY) === 'true';
  } catch (error: unknown) {
    console.warn('[1TD][Storage] Failed to read 1td:onboarded from localStorage:', error);
    return false;
  }
}

/**
 * Persists or clears the onboarding completion flag (`1td:onboarded` in localStorage).
 */
export function setOnboarded(completed = true): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    if (completed) {
      window.localStorage.setItem(ONBOARDED_STORAGE_KEY, 'true');
    } else {
      window.localStorage.removeItem(ONBOARDED_STORAGE_KEY);
    }
  } catch (error: unknown) {
    console.warn('[1TD][Storage] Failed to update 1td:onboarded in localStorage:', error);
  }
}

/**
 * Transiently mirrors the session undo stack (`1td:undo-stack`) per SPEC.md § IV.2 & § VIII.2.
 */
export function saveTransientUndoStack(stack: Event[]): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(UNDO_STACK_STORAGE_KEY, JSON.stringify(stack));
  } catch (error: unknown) {
    console.warn('[1TD][Storage] Failed to write transient 1td:undo-stack:', error);
  }
}

/**
 * Clears `1td:undo-stack` on app mount or explicit undo reset (DECISIONS.md #12).
 */
export function clearTransientUndoStack(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.removeItem(UNDO_STACK_STORAGE_KEY);
  } catch (error: unknown) {
    console.warn('[1TD][Storage] Failed to clear transient 1td:undo-stack:', error);
  }
}

/**
 * Resets application settings in `localStorage` (`1td:settings`) back to `DEFAULT_SETTINGS`.
 */
export function resetSettings(): Settings {
  const defaults: Settings = {
    ...DEFAULT_SETTINGS,
    suggestion_weights: { ...DEFAULT_SUGGESTION_WEIGHTS },
  };
  return saveSettings(defaults);
}

/**
 * Computes the approximate byte size (UTF-16, 2 bytes per code unit) of all `1td:` keys in `localStorage`.
 */
export function getLocalStorageUsageBytes(): number {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 0;
  }
  try {
    let totalChars = 0;
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith('1td:')) {
        const value = window.localStorage.getItem(key) ?? '';
        totalChars += key.length + value.length;
      }
    }
    return totalChars * 2;
  } catch (error: unknown) {
    console.warn('[1TD][Storage] Failed to compute localStorage usage:', error);
    return 0;
  }
}

