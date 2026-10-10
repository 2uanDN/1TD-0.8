import { getAllEvents, upsertEvents } from '../db/events';
import { formatDate } from './time';
import {
  MAX_ACTIONS_LIMIT,
  getActions,
  saveActions,
} from '../storage/actions';
import { saveSettings } from '../storage/settings';
import {
  Action,
  DEFAULT_SETTINGS,
  Event,
  ExportBundleV1,
  Settings,
  isValidActionColor,
  resolveActionColorHex,
} from '../types';

export const APP_VERSION = '1.0.0';
export const EXPORT_VERSION = 1;

export interface ImportResult {
  actionsCount: number;
  eventsCount: number;
  message: string;
}

function normalizeImportedAction(raw: unknown, fallbackOrder: number): Action {
  if (!raw || typeof raw !== 'object') {
    throw new Error('[1TD][Import] Invalid action entry in JSON.');
  }

  const record = raw as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id.trim() : '';
  const name = typeof record.name === 'string' ? record.name.trim().slice(0, 40) : '';
  const icon = typeof record.icon === 'string' ? record.icon.trim() : '';
  const rawColor = typeof record.color === 'string' ? record.color.trim() : '';

  if (!id || !name || !icon) {
    throw new Error('[1TD][Import] Action is missing required id, name, or icon.');
  }

  const color = isValidActionColor(rawColor) ? rawColor : 'chartreuse';
  const group =
    typeof record.group === 'string' && record.group.trim().length > 0
      ? record.group.trim().slice(0, 30)
      : undefined;

  const isPinned = Boolean(record.is_pinned);
  const sortOrder =
    typeof record.sort_order === 'number' && Number.isInteger(record.sort_order)
      ? record.sort_order
      : fallbackOrder;
  const createdAt =
    typeof record.created_at === 'string' && record.created_at.trim().length > 0
      ? record.created_at.trim()
      : new Date().toISOString();
  const archivedAt =
    typeof record.archived_at === 'string' && record.archived_at.trim().length > 0
      ? record.archived_at.trim()
      : null;

  return {
    id,
    name,
    icon,
    color,
    ...(group !== undefined ? { group } : {}),
    is_pinned: archivedAt !== null ? false : isPinned,
    sort_order: sortOrder,
    created_at: createdAt,
    archived_at: archivedAt,
  };
}

function normalizeImportedEvent(raw: unknown): Event {
  if (!raw || typeof raw !== 'object') {
    throw new Error('[1TD][Import] Invalid event entry in JSON.');
  }

  const record = raw as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id.trim() : '';
  const actionId = typeof record.action_id === 'string' ? record.action_id.trim() : '';
  const nameSnapshot =
    typeof record.action_name_snapshot === 'string'
      ? record.action_name_snapshot.trim()
      : '';
  const iconSnapshot =
    typeof record.action_icon_snapshot === 'string'
      ? record.action_icon_snapshot.trim()
      : '';
  const rawColorSnapshot =
    typeof record.action_color_snapshot === 'string'
      ? record.action_color_snapshot.trim()
      : '';
  const occurredAt =
    typeof record.occurred_at === 'string' ? record.occurred_at.trim() : '';
  const createdAt =
    typeof record.created_at === 'string' && record.created_at.trim().length > 0
      ? record.created_at.trim()
      : occurredAt;
  const timezoneId =
    typeof record.timezone_id === 'string' && record.timezone_id.trim().length > 0
      ? record.timezone_id.trim()
      : 'UTC';

  if (!id || !actionId || !nameSnapshot || !iconSnapshot || !occurredAt) {
    throw new Error('[1TD][Import] Event is missing required fields.');
  }

  const note =
    typeof record.note === 'string' && record.note.trim().length > 0
      ? record.note.trim().slice(0, 500)
      : null;

  return {
    id,
    action_id: actionId,
    action_name_snapshot: nameSnapshot,
    action_icon_snapshot: iconSnapshot,
    action_color_snapshot: resolveActionColorHex(rawColorSnapshot || 'chartreuse'),
    occurred_at: occurredAt,
    created_at: createdAt,
    timezone_id: timezoneId,
    note,
  };
}

/**
 * SPEC.md § VIII.3 — Serializes all actions, events, and settings into an `ExportBundleV1` JSON string
 * and updates `settings.last_export` with the export timestamp.
 */
export async function exportToJSON(): Promise<string> {
  const exportedAt = new Date().toISOString();
  const [actions, events] = await Promise.all([
    Promise.resolve(getActions()),
    getAllEvents(),
  ]);

  const settings = saveSettings({ last_export: exportedAt });

  const bundle: ExportBundleV1 = {
    export_version: EXPORT_VERSION,
    exported_at: exportedAt,
    app_version: APP_VERSION,
    actions,
    events,
    settings,
  };

  return JSON.stringify(bundle, null, 2);
}

/**
 * Triggers a client-side download of a serialized JSON string as a `.json` file.
 */
export function downloadJsonFile(jsonContent: string, filename?: string): string {
  const dateStamp = formatDate(new Date(), 'yyyy-MM-dd');
  const resolvedFilename = filename ?? `1td-export-${dateStamp}.json`;

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return resolvedFilename;
  }

  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = resolvedFilename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);

  return resolvedFilename;
}

/**
 * SPEC.md § VIII.3 — Parses and validates a 1TD JSON export bundle (`export_version === 1`),
 * upserts actions and events by `id`, replaces settings, and returns an `ImportResult`.
 */
export async function importFromJSON(json: string): Promise<ImportResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error: unknown) {
    throw new Error('[1TD][Import] Tệp JSON không hợp lệ hoặc bị hỏng.', {
      cause: error,
    });
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('[1TD][Import] Cấu trúc dữ liệu JSON không hợp lệ.');
  }

  const candidate = parsed as Record<string, unknown>;
  if (candidate.export_version !== EXPORT_VERSION) {
    throw new Error(
      `[1TD][Import] Phiên bản xuất không được hỗ trợ (export_version: ${String(
        candidate.export_version
      )}). Yêu cầu export_version = 1.`
    );
  }

  if (!Array.isArray(candidate.actions) || !Array.isArray(candidate.events)) {
    throw new Error('[1TD][Import] Thiếu danh sách actions hoặc events trong tệp JSON.');
  }

  // 1. Upsert actions by id (merge, no duplicates)
  const existingActions = getActions();
  const actionsById = new Map<string, Action>();
  for (const action of existingActions) {
    actionsById.set(action.id, action);
  }

  const importedActionsMap = new Map<string, Action>();
  candidate.actions.forEach((rawAction, index) => {
    const normalized = normalizeImportedAction(
      rawAction,
      existingActions.length + index + 1
    );
    actionsById.set(normalized.id, normalized);
    importedActionsMap.set(normalized.id, normalized);
  });

  const mergedActions = Array.from(actionsById.values())
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, MAX_ACTIONS_LIMIT);
  saveActions(mergedActions);

  // 2. Upsert events by id (merge, no duplicates)
  const uniqueEventsMap = new Map<string, Event>();
  for (const rawEvent of candidate.events) {
    const normalized = normalizeImportedEvent(rawEvent);
    uniqueEventsMap.set(normalized.id, normalized);
  }
  const uniqueEvents = Array.from(uniqueEventsMap.values());
  const eventsCount = await upsertEvents(uniqueEvents);

  // 3. Replace settings entirely with imported settings
  const rawSettings =
    candidate.settings && typeof candidate.settings === 'object'
      ? (candidate.settings as Partial<Settings>)
      : DEFAULT_SETTINGS;

  saveSettings({
    theme: rawSettings.theme ?? DEFAULT_SETTINGS.theme,
    suggestion_weights:
      rawSettings.suggestion_weights ?? DEFAULT_SETTINGS.suggestion_weights,
    default_icon: rawSettings.default_icon ?? DEFAULT_SETTINGS.default_icon,
    last_export:
      typeof rawSettings.last_export === 'string' ? rawSettings.last_export : null,
  });

  const actionsCount = importedActionsMap.size;
  const message = `Imported ${actionsCount} actions, ${eventsCount} events.`;

  return {
    actionsCount,
    eventsCount,
    message,
  };
}
