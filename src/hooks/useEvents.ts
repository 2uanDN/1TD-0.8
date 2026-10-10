import { subDays } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addEvent as dbAddEvent,
  clearAllEvents as dbClearAllEvents,
  deleteEvent as dbDeleteEvent,
  getAllEvents as dbGetAllEvents,
  getEventsByDate as dbGetEventsByDate,
  getEventsSince as dbGetEventsSince,
  updateEventNote as dbUpdateEventNote,
  updateEventOccurredAt as dbUpdateEventOccurredAt,
} from '../db/events';
import { endOfDay, formatLocalIsoOffset, getTimezone } from '../lib/time';
import { newId } from '../lib/uuid';
import {
  clearTransientUndoStack,
  saveTransientUndoStack,
} from '../storage/settings';
import { DEFAULT_TOAST_DURATION_MS, useUIStore } from '../store/uiStore';
import { Action, Event, resolveActionColorHex } from '../types';

interface EventsSnapshot {
  todayEvents: Event[];
  recentEvents: Event[];
  allEvents: Event[];
  isLoaded: boolean;
}

type EventsListener = (snapshot: EventsSnapshot) => void;

const listeners = new Set<EventsListener>();

let sharedState: EventsSnapshot = {
  todayEvents: [],
  recentEvents: [],
  allEvents: [],
  isLoaded: false,
};

let loadPromise: Promise<void> | null = null;

function broadcastEvents(next: Partial<EventsSnapshot>): void {
  sharedState = { ...sharedState, ...next };
  listeners.forEach((listener) => {
    listener(sharedState);
  });
}

function sortNewestFirst(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    const diff =
      new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime();
    if (!Number.isNaN(diff) && diff !== 0) {
      return diff;
    }
    return b.occurred_at.localeCompare(a.occurred_at);
  });
}

function removeEventFromUndoStack(eventId: string): void {
  const currentStack = useUIStore.getState().undoStack;
  if (!currentStack.some((item) => item.id === eventId)) {
    return;
  }
  const nextStack = currentStack.filter((item) => item.id !== eventId);
  if (nextStack.length === 0) {
    clearTransientUndoStack();
  } else {
    saveTransientUndoStack(nextStack);
  }
  useUIStore.setState({ undoStack: nextStack });
}

async function fetchTodayAndRecentEvents(): Promise<void> {
  if (loadPromise) {
    return loadPromise;
  }

  const currentPromise = (async () => {
    try {
      const now = new Date();
      const sevenDaysAgoIso = subDays(now, 7).toISOString();
      const [todayRows, recentRows, allRows] = await Promise.all([
        dbGetEventsByDate(now),
        dbGetEventsSince(sevenDaysAgoIso),
        dbGetAllEvents(),
      ]);

      broadcastEvents({
        todayEvents: sortNewestFirst(todayRows),
        recentEvents: sortNewestFirst(recentRows),
        allEvents: sortNewestFirst(allRows),
        isLoaded: true,
      });
    } catch (error: unknown) {
      console.error('[1TD][useEvents] Failed to load events from IndexedDB:', error);
      useUIStore
        .getState()
        .showToast('Không thể tải dữ liệu hoạt động từ thiết bị.');
      broadcastEvents({ isLoaded: true });
    } finally {
      if (loadPromise === currentPromise) {
        loadPromise = null;
      }
    }
  })();

  loadPromise = currentPromise;
  return currentPromise;
}

export interface UseEventsResult {
  todayEvents: Event[];
  recentEvents: Event[];
  allEvents: Event[];
  isLoading: boolean;
  todayCountsByActionId: Record<string, number>;
  lastLoggedAtByActionId: Record<string, string>;
  logEvent: (action: Action) => Promise<Event | null>;
  getEventsForDate: (date: Date | string) => Promise<Event[]>;
  deleteEvent: (eventId: string) => Promise<boolean>;
  clearEvents: () => Promise<boolean>;
  updateNote: (eventId: string, note: string | null) => Promise<Event | null>;
  updateOccurredAt: (eventId: string, occurredAt: string) => Promise<Event | null>;
  refreshEvents: () => Promise<void>;
}

export function useEvents(): UseEventsResult {
  const [snapshot, setSnapshot] = useState<EventsSnapshot>(() => sharedState);

  const refreshEvents = useCallback(async () => {
    await fetchTodayAndRecentEvents();
  }, []);

  useEffect(() => {
    listeners.add(setSnapshot);
    setSnapshot(sharedState);

    if (!sharedState.isLoaded) {
      void fetchTodayAndRecentEvents();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void fetchTodayAndRecentEvents();
      }
    };

    let midnightTimer: number;
    const scheduleMidnightRefresh = () => {
      const msUntilMidnight = Math.max(
        1,
        endOfDay(new Date()).getTime() - Date.now() + 1
      );
      midnightTimer = window.setTimeout(() => {
        void fetchTodayAndRecentEvents();
        scheduleMidnightRefresh();
      }, msUntilMidnight);
    };
    scheduleMidnightRefresh();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      listeners.delete(setSnapshot);
      if (listeners.size === 0) {
        sharedState = {
          todayEvents: [],
          recentEvents: [],
          allEvents: [],
          isLoaded: false,
        };
        loadPromise = null;
      }
      window.clearTimeout(midnightTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const todayCountsByActionId = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const event of snapshot.todayEvents) {
      counts[event.action_id] = (counts[event.action_id] ?? 0) + 1;
    }
    return counts;
  }, [snapshot.todayEvents]);

  const lastLoggedAtByActionId = useMemo(() => {
    const latest: Record<string, string> = {};
    for (const event of snapshot.todayEvents) {
      if (!latest[event.action_id]) {
        latest[event.action_id] = event.occurred_at;
      }
    }
    return latest;
  }, [snapshot.todayEvents]);

  const logEvent = useCallback(async (action: Action): Promise<Event | null> => {
    const now = new Date();
    const newEvent: Event = {
      id: newId(),
      action_id: action.id,
      action_name_snapshot: action.name.trim(),
      action_icon_snapshot: action.icon.trim(),
      action_color_snapshot: resolveActionColorHex(action.color),
      occurred_at: formatLocalIsoOffset(now),
      created_at: now.toISOString(),
      timezone_id: getTimezone(),
      note: null,
    };

    // 1. Optimistic UI update before IndexedDB write resolves (SPEC.md § II & AGENTS.md)
    broadcastEvents({
      todayEvents: sortNewestFirst([newEvent, ...sharedState.todayEvents]),
      recentEvents: sortNewestFirst([newEvent, ...sharedState.recentEvents]),
      allEvents: sortNewestFirst([newEvent, ...sharedState.allEvents]),
    });

    // 2. Push to session undo stack and trigger 3s UndoToast
    const uiState = useUIStore.getState();
    uiState.pushUndo(newEvent);
    uiState.showToast(
      `Đã ghi nhận ${newEvent.action_name_snapshot} — Hoàn tác`,
      DEFAULT_TOAST_DURATION_MS
    );

    // 3. Persist to IndexedDB asynchronously; targeted rollback on failure
    try {
      const saved = await dbAddEvent(newEvent);
      return saved;
    } catch (error: unknown) {
      console.error('[1TD][useEvents] Failed to persist event to IndexedDB:', error);
      broadcastEvents({
        todayEvents: sharedState.todayEvents.filter((e) => e.id !== newEvent.id),
        recentEvents: sharedState.recentEvents.filter((e) => e.id !== newEvent.id),
        allEvents: sharedState.allEvents.filter((e) => e.id !== newEvent.id),
      });
      removeEventFromUndoStack(newEvent.id);
      useUIStore
        .getState()
        .showToast('Không thể lưu hoạt động vào thiết bị.', DEFAULT_TOAST_DURATION_MS);
      return null;
    }
  }, []);

  const getEventsForDate = useCallback(
    async (date: Date | string): Promise<Event[]> => {
      try {
        return await dbGetEventsByDate(date);
      } catch (error: unknown) {
        console.error('[1TD][useEvents] Failed to query events by date:', error);
        useUIStore
          .getState()
          .showToast('Không thể truy vấn lịch sử hoạt động.');
        return [];
      }
    },
    []
  );

  const deleteEvent = useCallback(async (eventId: string): Promise<boolean> => {
    const deletedFromToday = sharedState.todayEvents.find(
      (item) => item.id === eventId
    );
    const deletedFromRecent = sharedState.recentEvents.find(
      (item) => item.id === eventId
    );
    const deletedFromAll = sharedState.allEvents.find(
      (item) => item.id === eventId
    );

    // Optimistic removal from UI state
    broadcastEvents({
      todayEvents: sharedState.todayEvents.filter((item) => item.id !== eventId),
      recentEvents: sharedState.recentEvents.filter((item) => item.id !== eventId),
      allEvents: sharedState.allEvents.filter((item) => item.id !== eventId),
    });

    try {
      await dbDeleteEvent(eventId);
      removeEventFromUndoStack(eventId);
      return true;
    } catch (error: unknown) {
      console.error('[1TD][useEvents] Failed to delete event from IndexedDB:', error);
      const restoreItem = (
        list: Event[],
        deletedItem: Event | undefined
      ): Event[] => {
        if (!deletedItem || list.some((item) => item.id === deletedItem.id)) {
          return list;
        }
        return sortNewestFirst([deletedItem, ...list]);
      };

      broadcastEvents({
        todayEvents: restoreItem(sharedState.todayEvents, deletedFromToday),
        recentEvents: restoreItem(sharedState.recentEvents, deletedFromRecent),
        allEvents: restoreItem(sharedState.allEvents, deletedFromAll),
      });
      useUIStore
        .getState()
        .showToast('Không thể xóa bản ghi hoạt động.');
      return false;
    }
  }, []);

  const updateNote = useCallback(
    async (eventId: string, note: string | null): Promise<Event | null> => {
      const targetEvent =
        sharedState.allEvents.find((item) => item.id === eventId) ??
        sharedState.todayEvents.find((item) => item.id === eventId) ??
        sharedState.recentEvents.find((item) => item.id === eventId);
      const prevNote = targetEvent?.note ?? null;

      const applyNote = (list: Event[], nextNote: string | null) =>
        list.map((item) =>
          item.id === eventId ? { ...item, note: nextNote } : item
        );

      broadcastEvents({
        todayEvents: applyNote(sharedState.todayEvents, note),
        recentEvents: applyNote(sharedState.recentEvents, note),
        allEvents: applyNote(sharedState.allEvents, note),
      });

      try {
        const updated = await dbUpdateEventNote(eventId, note);
        return updated;
      } catch (error: unknown) {
        console.error('[1TD][useEvents] Failed to update event note:', error);
        broadcastEvents({
          todayEvents: applyNote(sharedState.todayEvents, prevNote),
          recentEvents: applyNote(sharedState.recentEvents, prevNote),
          allEvents: applyNote(sharedState.allEvents, prevNote),
        });
        useUIStore
          .getState()
          .showToast('Không thể lưu ghi chú hoạt động.');
        return null;
      }
    },
    []
  );

  const updateOccurredAt = useCallback(
    async (eventId: string, occurredAt: string): Promise<Event | null> => {
      const targetEvent =
        sharedState.allEvents.find((item) => item.id === eventId) ??
        sharedState.todayEvents.find((item) => item.id === eventId) ??
        sharedState.recentEvents.find((item) => item.id === eventId);
      const prevOccurredAt = targetEvent?.occurred_at;

      const applyTime = (list: Event[], nextOccurredAt: string) =>
        sortNewestFirst(
          list.map((item) =>
            item.id === eventId
              ? { ...item, occurred_at: nextOccurredAt }
              : item
          )
        );

      broadcastEvents({
        todayEvents: applyTime(sharedState.todayEvents, occurredAt),
        recentEvents: applyTime(sharedState.recentEvents, occurredAt),
        allEvents: applyTime(sharedState.allEvents, occurredAt),
      });

      try {
        const updated = await dbUpdateEventOccurredAt(eventId, occurredAt);
        return updated;
      } catch (error: unknown) {
        console.error('[1TD][useEvents] Failed to update event occurred_at:', error);
        if (prevOccurredAt !== undefined) {
          broadcastEvents({
            todayEvents: applyTime(sharedState.todayEvents, prevOccurredAt),
            recentEvents: applyTime(sharedState.recentEvents, prevOccurredAt),
            allEvents: applyTime(sharedState.allEvents, prevOccurredAt),
          });
        }
        useUIStore
          .getState()
          .showToast('Không thể cập nhật thời gian hoạt động.');
        return null;
      }
    },
    []
  );

  const clearEvents = useCallback(async (): Promise<boolean> => {
    const prevToday = sharedState.todayEvents;
    const prevRecent = sharedState.recentEvents;
    const prevAll = sharedState.allEvents;

    broadcastEvents({
      todayEvents: [],
      recentEvents: [],
      allEvents: [],
    });

    try {
      await dbClearAllEvents();
      useUIStore.getState().clearUndo();
      return true;
    } catch (error: unknown) {
      console.error('[1TD][useEvents] Failed to clear all events from IndexedDB:', error);
      broadcastEvents({
        todayEvents: prevToday,
        recentEvents: prevRecent,
        allEvents: prevAll,
      });
      useUIStore.getState().showToast('Không thể xóa toàn bộ dữ liệu sự kiện.');
      return false;
    }
  }, []);

  return {
    todayEvents: snapshot.todayEvents,
    recentEvents: snapshot.recentEvents,
    allEvents: snapshot.allEvents,
    isLoading: !snapshot.isLoaded,
    todayCountsByActionId,
    lastLoggedAtByActionId,
    logEvent,
    getEventsForDate,
    deleteEvent,
    clearEvents,
    updateNote,
    updateOccurredAt,
    refreshEvents,
  };
}
