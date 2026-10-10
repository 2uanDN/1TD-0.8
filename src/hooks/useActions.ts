import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addAction as storageAddAction,
  archiveAction as storageArchiveAction,
  ensureSeedActions,
  getActions as storageGetActions,
  updateAction as storageUpdateAction,
} from '../storage/actions';
import { useUIStore } from '../store/uiStore';
import { Action, CreateActionInput, UpdateActionInput } from '../types';

type ActionsListener = (actions: Action[]) => void;

const listeners = new Set<ActionsListener>();
let cachedActions: Action[] | null = null;

function readInitialActions(): Action[] {
  if (cachedActions !== null) {
    return cachedActions;
  }
  cachedActions = ensureSeedActions();
  return cachedActions;
}

function broadcastActions(nextActions: Action[]): void {
  cachedActions = nextActions;
  listeners.forEach((listener) => {
    listener(nextActions);
  });
}

export interface UseActionsResult {
  actions: Action[];
  activeActions: Action[];
  pinnedActions: Action[];
  createAction: (input: CreateActionInput) => Action | null;
  editAction: (id: string, updates: UpdateActionInput) => Action | null;
  togglePinAction: (id: string) => Action | null;
  removeAction: (id: string) => Action | null;
  refreshActions: () => void;
}

export function useActions(): UseActionsResult {
  const showToast = useUIStore((state) => state.showToast);
  const [actions, setActions] = useState<Action[]>(() => readInitialActions());

  const refreshActions = useCallback(() => {
    const fresh = storageGetActions();
    broadcastActions(fresh);
  }, []);

  useEffect(() => {
    listeners.add(setActions);
    setActions(readInitialActions());

    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === null || event.key === '1td:actions') {
        const fresh = storageGetActions();
        broadcastActions(fresh);
      }
    };

    window.addEventListener('storage', handleStorageEvent);
    return () => {
      listeners.delete(setActions);
      if (listeners.size === 0) {
        cachedActions = null;
      }
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  const activeActions = useMemo(
    () => actions.filter((action) => action.archived_at === null),
    [actions]
  );

  const pinnedActions = useMemo(
    () => activeActions.filter((action) => action.is_pinned),
    [activeActions]
  );

  const createAction = useCallback(
    (input: CreateActionInput): Action | null => {
      try {
        const created = storageAddAction(input);
        broadcastActions(storageGetActions());
        return created;
      } catch (error: unknown) {
        console.error('[1TD][useActions] Failed to create action:', error);
        showToast('Không thể tạo mẫu hành động mới.');
        return null;
      }
    },
    [showToast]
  );

  const editAction = useCallback(
    (id: string, updates: UpdateActionInput): Action | null => {
      try {
        const updated = storageUpdateAction(id, updates);
        broadcastActions(storageGetActions());
        return updated;
      } catch (error: unknown) {
        console.error('[1TD][useActions] Failed to update action:', error);
        showToast('Không thể cập nhật mẫu hành động.');
        return null;
      }
    },
    [showToast]
  );

  const togglePinAction = useCallback(
    (id: string): Action | null => {
      const target = actions.find((item) => item.id === id);
      if (!target) {
        return null;
      }
      return editAction(id, { is_pinned: !target.is_pinned });
    },
    [actions, editAction]
  );

  const removeAction = useCallback(
    (id: string): Action | null => {
      try {
        const archived = storageArchiveAction(id);
        broadcastActions(storageGetActions());
        return archived;
      } catch (error: unknown) {
        console.error('[1TD][useActions] Failed to archive action:', error);
        showToast('Không thể lưu trữ mẫu hành động.');
        return null;
      }
    },
    [showToast]
  );

  return {
    actions,
    activeActions,
    pinnedActions,
    createAction,
    editAction,
    togglePinAction,
    removeAction,
    refreshActions,
  };
}
