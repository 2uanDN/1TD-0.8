import {
  Action,
  CreateActionInput,
  UpdateActionInput,
  isValidActionColor,
} from '../types';

export const ACTIONS_STORAGE_KEY = '1td:actions';
export const MAX_ACTIONS_LIMIT = 500;
export const WARN_ACTIONS_THRESHOLD = 400;

const MAX_ACTION_NAME_LENGTH = 40;
const MAX_ACTION_GROUP_LENGTH = 30;

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0;
    const val = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return val.toString(16);
  });
}

function sanitizeActionName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > MAX_ACTION_NAME_LENGTH) {
    throw new Error(
      `[1TD][Storage] Action name must be between 1 and ${MAX_ACTION_NAME_LENGTH} characters.`
    );
  }
  return trimmed;
}

function sanitizeActionGroup(group?: string): string | undefined {
  if (group === undefined) {
    return undefined;
  }
  const trimmed = group.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.slice(0, MAX_ACTION_GROUP_LENGTH);
}

function sanitizeActionColor(color: string): string {
  const trimmed = color.trim();
  if (!isValidActionColor(trimmed)) {
    throw new Error(
      `[1TD][Storage] Invalid action color "${color}". Expected preset ("terracotta"|"lavender"|"mint"|"chartreuse") or #RRGGBB.`
    );
  }
  return trimmed;
}

function sanitizeActionIcon(icon: string): string {
  const trimmed = icon.trim();
  if (!trimmed) {
    throw new Error('[1TD][Storage] Action icon name is required.');
  }
  return trimmed;
}

function isActionRecord(candidate: unknown): candidate is Action {
  if (!candidate || typeof candidate !== 'object') {
    return false;
  }
  const obj = candidate as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.icon === 'string' &&
    typeof obj.color === 'string' &&
    typeof obj.is_pinned === 'boolean' &&
    typeof obj.sort_order === 'number' &&
    typeof obj.created_at === 'string' &&
    (obj.archived_at === null || typeof obj.archived_at === 'string')
  );
}

export const DEFAULT_STARTER_ACTIONS: ReadonlyArray<CreateActionInput> = [
  {
    name: 'Ngủ dậy',
    icon: 'Sunrise',
    color: 'chartreuse',
    group: 'Buổi sáng',
    is_pinned: true,
    sort_order: 1,
  },
  {
    name: 'Uống cà phê',
    icon: 'Coffee',
    color: 'terracotta',
    group: 'Buổi sáng',
    is_pinned: true,
    sort_order: 2,
  },
  {
    name: 'Ăn sáng',
    icon: 'Utensils',
    color: 'mint',
    group: 'Dinh dưỡng',
    is_pinned: true,
    sort_order: 3,
  },
  {
    name: 'Bắt đầu làm việc',
    icon: 'Briefcase',
    color: 'lavender',
    group: 'Công việc',
    is_pinned: true,
    sort_order: 4,
  },
];

/**
 * Reads all actions (active and archived) from `localStorage` (`1td:actions`),
 * sorted ascending by `sort_order`.
 */
export function getActions(): Action[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(ACTIONS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter(isActionRecord)
      .sort((a, b) => a.sort_order - b.sort_order);
  } catch (error: unknown) {
    console.error('[1TD][Storage] Failed to parse 1td:actions from localStorage:', error);
    return [];
  }
}

/**
 * Seeds starter actions from BLUEPRINT.md § III.1 when `1td:actions` has never been initialized.
 * Respects an explicitly empty array (`[]`) if the user has archived or cleared actions.
 */
export function ensureSeedActions(): Action[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(ACTIONS_STORAGE_KEY);
    if (raw !== null) {
      return getActions();
    }
    const nowIso = new Date().toISOString();
    const seeded: Action[] = DEFAULT_STARTER_ACTIONS.map((item, idx) => ({
      id: generateUuid(),
      name: sanitizeActionName(item.name),
      icon: sanitizeActionIcon(item.icon),
      color: sanitizeActionColor(item.color),
      ...(item.group ? { group: sanitizeActionGroup(item.group) } : {}),
      is_pinned: Boolean(item.is_pinned ?? true),
      sort_order: item.sort_order ?? idx + 1,
      created_at: nowIso,
      archived_at: null,
    }));
    saveActions(seeded);
    return seeded;
  } catch (error: unknown) {
    console.error('[1TD][Storage] Failed to seed default actions:', error);
    return [];
  }
}

/**
 * Writes the full array of actions to `localStorage` (`1td:actions`).
 * Enforces the 500-action ceiling specified in RISKS.md #9.
 */
export function saveActions(actions: Action[]): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  if (actions.length > MAX_ACTIONS_LIMIT) {
    throw new Error(
      `[1TD][Storage] Action library limit (${MAX_ACTIONS_LIMIT}) exceeded.`
    );
  }

  try {
    window.localStorage.setItem(ACTIONS_STORAGE_KEY, JSON.stringify(actions));
  } catch (error: unknown) {
    throw new Error('[1TD][Storage] Failed to write 1td:actions to localStorage.', {
      cause: error,
    });
  }
}

/**
 * Creates a new Action template, auto-assigning `id`, `sort_order`, `created_at`, and `archived_at: null`
 * per SPEC.md § III.1.
 */
export function addAction(input: CreateActionInput): Action {
  const existing = getActions();

  if (existing.length >= MAX_ACTIONS_LIMIT) {
    throw new Error(
      `[1TD][Storage] Cannot create more than ${MAX_ACTIONS_LIMIT} actions.`
    );
  }

  const maxSortOrder = existing.reduce(
    (max, item) => (item.sort_order > max ? item.sort_order : max),
    0
  );

  const nextSortOrder =
    typeof input.sort_order === 'number' && Number.isInteger(input.sort_order)
      ? input.sort_order
      : maxSortOrder + 1;

  const group = sanitizeActionGroup(input.group);

  const newAction: Action = {
    id: generateUuid(),
    name: sanitizeActionName(input.name),
    icon: sanitizeActionIcon(input.icon),
    color: sanitizeActionColor(input.color),
    ...(group !== undefined ? { group } : {}),
    is_pinned: Boolean(input.is_pinned ?? false),
    sort_order: nextSortOrder,
    created_at: new Date().toISOString(),
    archived_at: null,
  };

  const nextActions = [...existing, newAction];
  saveActions(nextActions);
  return newAction;
}

/**
 * Updates an existing Action template by `id`.
 */
export function updateAction(id: string, updates: UpdateActionInput): Action {
  const existing = getActions();
  const index = existing.findIndex((item) => item.id === id);

  if (index === -1) {
    throw new Error(`[1TD][Storage] Action "${id}" not found.`);
  }

  const current = existing[index];
  const updatedGroup =
    'group' in updates ? sanitizeActionGroup(updates.group) : current.group;

  const updated: Action = {
    ...current,
    name: updates.name !== undefined ? sanitizeActionName(updates.name) : current.name,
    icon: updates.icon !== undefined ? sanitizeActionIcon(updates.icon) : current.icon,
    color: updates.color !== undefined ? sanitizeActionColor(updates.color) : current.color,
    is_pinned: updates.is_pinned !== undefined ? Boolean(updates.is_pinned) : current.is_pinned,
    sort_order:
      updates.sort_order !== undefined && Number.isInteger(updates.sort_order)
        ? updates.sort_order
        : current.sort_order,
    archived_at:
      updates.archived_at !== undefined ? updates.archived_at : current.archived_at,
  };

  if (updatedGroup !== undefined) {
    updated.group = updatedGroup;
  } else {
    delete updated.group;
  }

  const nextActions = [...existing];
  nextActions[index] = updated;
  saveActions(nextActions);
  return updated;
}

/**
 * Soft-deletes an Action by setting `archived_at` to the current UTC ISO 8601 timestamp
 * and unpinning it (DECISIONS.md #11 & SPEC.md § III.1).
 */
export function archiveAction(id: string): Action {
  return updateAction(id, {
    archived_at: new Date().toISOString(),
    is_pinned: false,
  });
}

/**
 * Deletes all stored action templates by writing an empty array to `1td:actions`.
 * Used when the user explicitly deletes all data in Settings.
 */
export function clearAllActions(): void {
  saveActions([]);
}

