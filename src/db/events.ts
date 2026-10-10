import { endOfDay, startOfDay } from 'date-fns';
import { Event, resolveActionColorHex } from '../types';
import {
  EVENTS_STORE,
  INDEX_BY_ACTION_ID,
  INDEX_BY_OCCURRED_AT,
  getDB,
} from './schema';

const MAX_NOTE_LENGTH = 500;

/**
 * Validates and normalizes an Event record before writing to IndexedDB.
 * Enforces non-empty snapshot fields (RISKS.md #7) and note length constraints (SPEC.md § III.2).
 */
function normalizeAndValidateEvent(event: Event): Event {
  const id = event.id.trim();
  const actionId = event.action_id.trim();
  const nameSnapshot = event.action_name_snapshot.trim();
  const iconSnapshot = event.action_icon_snapshot.trim();
  const colorSnapshot = resolveActionColorHex(event.action_color_snapshot);

  if (!id) {
    throw new Error('[1TD][DB] Event.id is required.');
  }
  if (!actionId) {
    throw new Error('[1TD][DB] Event.action_id is required.');
  }
  if (!nameSnapshot) {
    throw new Error('[1TD][DB] Event.action_name_snapshot is required.');
  }
  if (!iconSnapshot) {
    throw new Error('[1TD][DB] Event.action_icon_snapshot is required.');
  }
  if (!colorSnapshot) {
    throw new Error('[1TD][DB] Event.action_color_snapshot is required.');
  }

  const normalizedNote =
    event.note === null || event.note === undefined
      ? null
      : event.note.trim().slice(0, MAX_NOTE_LENGTH);

  return {
    id,
    action_id: actionId,
    action_name_snapshot: nameSnapshot,
    action_icon_snapshot: iconSnapshot,
    action_color_snapshot: colorSnapshot,
    occurred_at: event.occurred_at,
    created_at: event.created_at,
    timezone_id: event.timezone_id,
    note: normalizedNote,
  };
}

function sortEventsNewestFirst(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    const timeDiff = new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime();
    if (!Number.isNaN(timeDiff) && timeDiff !== 0) {
      return timeDiff;
    }
    return b.occurred_at.localeCompare(a.occurred_at);
  });
}

/**
 * Persists a new or updated Event in the `events` object store.
 */
export async function addEvent(event: Event): Promise<Event> {
  try {
    const normalized = normalizeAndValidateEvent(event);
    const db = await getDB();
    await db.put(EVENTS_STORE, normalized);
    return normalized;
  } catch (error: unknown) {
    throw new Error('[1TD][DB] Failed to save event to IndexedDB.', { cause: error });
  }
}

/**
 * Queries events within a date range (or for a single day when `endIso` is omitted).
 * Uses the `by_occurred_at` index with `IDBKeyRange.bound(start, end)` per SPEC.md § IV.1.
 * Also safely handles timezone-offset ISO strings on the target day.
 */
export async function getEventsByDate(
  startOrDate: string | Date,
  endIso?: string
): Promise<Event[]> {
  try {
    const db = await getDB();

    if (typeof startOrDate === 'string' && typeof endIso === 'string') {
      const range = IDBKeyRange.bound(startOrDate, endIso);
      const rows = await db
        .transaction(EVENTS_STORE, 'readonly')
        .store.index(INDEX_BY_OCCURRED_AT)
        .getAll(range);
      return sortEventsNewestFirst(rows);
    }

    const targetDate =
      typeof startOrDate === 'string' ? new Date(startOrDate) : startOrDate;
    if (Number.isNaN(targetDate.getTime())) {
      throw new Error(`Invalid date passed to getEventsByDate: ${String(startOrDate)}`);
    }

    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);
    const startMs = dayStart.getTime();
    const endMs = dayEnd.getTime();

    // Pad lexicographical range by +/- 14 hours to capture any local ISO offset strings
    // (e.g. "2026-10-09T00:05:00+07:00"), then filter accurately by timestamp.
    const lowerBoundIso = new Date(startMs - 14 * 3600 * 1000).toISOString().slice(0, 10);
    const upperBoundIso = `${new Date(endMs + 14 * 3600 * 1000).toISOString().slice(0, 10)}\uffff`;

    const candidates = await db
      .transaction(EVENTS_STORE, 'readonly')
      .store.index(INDEX_BY_OCCURRED_AT)
      .getAll(IDBKeyRange.bound(lowerBoundIso, upperBoundIso));

    const matching = candidates.filter((item) => {
      const itemMs = new Date(item.occurred_at).getTime();
      return itemMs >= startMs && itemMs <= endMs;
    });

    return sortEventsNewestFirst(matching);
  } catch (error: unknown) {
    throw new Error('[1TD][DB] Failed to query events by date.', { cause: error });
  }
}

/**
 * Queries all events associated with a specific `action_id` via `by_action_id` index.
 */
export async function getEventsByAction(actionId: string): Promise<Event[]> {
  try {
    const db = await getDB();
    const rows = await db
      .transaction(EVENTS_STORE, 'readonly')
      .store.index(INDEX_BY_ACTION_ID)
      .getAll(actionId);
    return sortEventsNewestFirst(rows);
  } catch (error: unknown) {
    throw new Error(`[1TD][DB] Failed to query events for action "${actionId}".`, {
      cause: error,
    });
  }
}

/**
 * Deletes a single event by its UUID.
 */
export async function deleteEvent(eventId: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(EVENTS_STORE, eventId);
  } catch (error: unknown) {
    throw new Error(`[1TD][DB] Failed to delete event "${eventId}".`, { cause: error });
  }
}

/**
 * Updates the `note` field on an existing logged event (max 500 chars, or null).
 */
export async function updateEventNote(
  eventId: string,
  note: string | null
): Promise<Event> {
  try {
    const db = await getDB();
    const tx = db.transaction(EVENTS_STORE, 'readwrite');
    const existing = await tx.store.get(eventId);

    if (!existing) {
      throw new Error(`Event "${eventId}" not found.`);
    }

    const trimmedNote =
      note === null ? null : note.trim().slice(0, MAX_NOTE_LENGTH) || null;

    const updated: Event = {
      ...existing,
      note: trimmedNote,
    };

    await tx.store.put(updated);
    await tx.done;
    return updated;
  } catch (error: unknown) {
    throw new Error(`[1TD][DB] Failed to update note for event "${eventId}".`, {
      cause: error,
    });
  }
}

/**
 * Updates the `occurred_at` timestamp on an existing logged event (for EventDetailDrawer).
 */
export async function updateEventOccurredAt(
  eventId: string,
  occurredAt: string
): Promise<Event> {
  try {
    const db = await getDB();
    const tx = db.transaction(EVENTS_STORE, 'readwrite');
    const existing = await tx.store.get(eventId);

    if (!existing) {
      throw new Error(`Event "${eventId}" not found.`);
    }

    const updated: Event = {
      ...existing,
      occurred_at: occurredAt,
    };

    await tx.store.put(updated);
    await tx.done;
    return updated;
  } catch (error: unknown) {
    throw new Error(`[1TD][DB] Failed to update occurred_at for event "${eventId}".`, {
      cause: error,
    });
  }
}

/**
 * Queries all events with `occurred_at >= sinceIso` using `by_occurred_at` index.
 * Used for 7-day suggestion scoring (SPEC.md § IV.1 & § VIII.1).
 */
export async function getEventsSince(sinceIso: string): Promise<Event[]> {
  try {
    const db = await getDB();
    const sinceMs = new Date(sinceIso).getTime();
    const lowerPrefix = sinceIso.slice(0, 10);
    const rows = await db
      .transaction(EVENTS_STORE, 'readonly')
      .store.index(INDEX_BY_OCCURRED_AT)
      .getAll(IDBKeyRange.lowerBound(lowerPrefix));

    const filtered = Number.isNaN(sinceMs)
      ? rows
      : rows.filter((item) => new Date(item.occurred_at).getTime() >= sinceMs);

    return sortEventsNewestFirst(filtered);
  } catch (error: unknown) {
    throw new Error('[1TD][DB] Failed to query recent events.', { cause: error });
  }
}

/**
 * Returns all logged events sorted newest-first (used by HistoryView & JSON Export).
 */
export async function getAllEvents(): Promise<Event[]> {
  try {
    const db = await getDB();
    const rows = await db.getAll(EVENTS_STORE);
    return sortEventsNewestFirst(rows);
  } catch (error: unknown) {
    throw new Error('[1TD][DB] Failed to load all events.', { cause: error });
  }
}

/**
 * Upserts multiple events in a single readwrite transaction (used by JSON Import, SPEC.md § VIII.3).
 */
export async function upsertEvents(events: Event[]): Promise<number> {
  try {
    const db = await getDB();
    const tx = db.transaction(EVENTS_STORE, 'readwrite');
    let count = 0;

    for (const rawEvent of events) {
      tx.store.put(normalizeAndValidateEvent(rawEvent));
      count++;
    }

    await tx.done;
    return count;
  } catch (error: unknown) {
    throw new Error('[1TD][DB] Failed to import events into IndexedDB.', { cause: error });
  }
}

/**
 * Deletes all events from the `events` object store.
 */
export async function clearAllEvents(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear(EVENTS_STORE);
  } catch (error: unknown) {
    throw new Error('[1TD][DB] Failed to clear events object store.', { cause: error });
  }
}
