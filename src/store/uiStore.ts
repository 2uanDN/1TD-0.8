import { create } from 'zustand';
import {
  clearTransientUndoStack,
  saveTransientUndoStack,
} from '../storage/settings';
import { Action, Event } from '../types';

export const MAX_UNDO_STACK_SIZE = 5;
export const DEFAULT_TOAST_DURATION_MS = 3000;

export interface UIStore {
  // View navigation
  activeView: 'today' | 'library' | 'history' | 'rhythm' | 'settings';
  setActiveView(view: UIStore['activeView']): void;

  // Drawer management
  openDrawer: 'action-edit' | 'event-detail' | 'add-action' | null;
  drawerPayload: Action | Event | null;
  openActionDrawer(action: Action): void;
  openEventDetailDrawer(event: Event): void;
  openAddActionDrawer(): void;
  closeDrawer(): void;

  // Undo stack (session-only, LIFO, max 5)
  undoStack: Event[];
  pushUndo(event: Event): void;
  popUndo(): Event | undefined;
  clearUndo(): void;

  // Toast notifications
  toastMessage: string | null;
  toastDuration: number;
  showToast(message: string, duration?: number): void;
  clearToast(): void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  activeView: 'today',
  setActiveView: (view) => set({ activeView: view }),

  openDrawer: null,
  drawerPayload: null,
  openActionDrawer: (action) =>
    set({ openDrawer: 'action-edit', drawerPayload: action }),
  openEventDetailDrawer: (event) =>
    set({ openDrawer: 'event-detail', drawerPayload: event }),
  openAddActionDrawer: () =>
    set({ openDrawer: 'add-action', drawerPayload: null }),
  closeDrawer: () =>
    set({ openDrawer: null, drawerPayload: null }),

  undoStack: [],
  pushUndo: (event) => {
    const current = get().undoStack;
    const nextStack = [
      ...current.filter((item) => item.id !== event.id),
      event,
    ].slice(-MAX_UNDO_STACK_SIZE);
    saveTransientUndoStack(nextStack);
    set({ undoStack: nextStack });
  },
  popUndo: () => {
    const current = get().undoStack;
    if (current.length === 0) {
      return undefined;
    }
    const popped = current[current.length - 1];
    const nextStack = current.slice(0, -1);
    if (nextStack.length === 0) {
      clearTransientUndoStack();
    } else {
      saveTransientUndoStack(nextStack);
    }
    set({ undoStack: nextStack });
    return popped;
  },
  clearUndo: () => {
    clearTransientUndoStack();
    set({ undoStack: [] });
  },

  toastMessage: null,
  toastDuration: DEFAULT_TOAST_DURATION_MS,
  showToast: (message, duration = DEFAULT_TOAST_DURATION_MS) =>
    set({ toastMessage: message, toastDuration: duration }),
  clearToast: () =>
    set({ toastMessage: null }),
}));
