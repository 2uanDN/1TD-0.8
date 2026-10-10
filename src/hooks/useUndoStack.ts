import { useCallback } from 'react';
import { saveTransientUndoStack, clearTransientUndoStack } from '../storage/settings';
import { DEFAULT_TOAST_DURATION_MS, useUIStore } from '../store/uiStore';
import { Event } from '../types';
import { useEvents } from './useEvents';

export interface UseUndoStackResult {
  undoStack: Event[];
  latestUndoEvent: Event | undefined;
  canUndo: boolean;
  pushUndo: (event: Event) => void;
  executeUndo: (targetEvent?: Event) => Promise<Event | undefined>;
}

/**
 * SPEC.md § VIII.2 & § IX — Expose pushUndo, executeUndo; drive toast lifecycle.
 * Deletes the undone event from IndexedDB and removes it from UI state optimistically.
 */
export function useUndoStack(): UseUndoStackResult {
  const undoStack = useUIStore((state) => state.undoStack);
  const storePushUndo = useUIStore((state) => state.pushUndo);
  const storePopUndo = useUIStore((state) => state.popUndo);
  const showToast = useUIStore((state) => state.showToast);
  const clearToast = useUIStore((state) => state.clearToast);
  const { deleteEvent } = useEvents();

  const latestUndoEvent =
    undoStack.length > 0 ? undoStack[undoStack.length - 1] : undefined;
  const canUndo = undoStack.length > 0;

  const pushUndo = useCallback(
    (event: Event) => {
      storePushUndo(event);
      showToast(
        `Đã ghi nhận ${event.action_name_snapshot} — Hoàn tác`,
        DEFAULT_TOAST_DURATION_MS
      );
    },
    [storePushUndo, showToast]
  );

  const executeUndo = useCallback(
    async (targetEvent?: Event): Promise<Event | undefined> => {
      let eventToUndo: Event | undefined;

      if (targetEvent) {
        eventToUndo = targetEvent;
        const currentStack = useUIStore.getState().undoStack;
        const nextStack = currentStack.filter((item) => item.id !== targetEvent.id);
        if (nextStack.length === 0) {
          clearTransientUndoStack();
        } else {
          saveTransientUndoStack(nextStack);
        }
        useUIStore.setState({ undoStack: nextStack });
      } else {
        eventToUndo = storePopUndo();
      }

      if (!eventToUndo) {
        return undefined;
      }

      clearToast();

      const deleted = await deleteEvent(eventToUndo.id);
      if (deleted) {
        showToast(
          `Đã hoàn tác: ${eventToUndo.action_name_snapshot}`,
          DEFAULT_TOAST_DURATION_MS
        );
        return eventToUndo;
      }

      return undefined;
    },
    [storePopUndo, clearToast, deleteEvent, showToast]
  );

  return {
    undoStack,
    latestUndoEvent,
    canUndo,
    pushUndo,
    executeUndo,
  };
}
