import { DBSchema, IDBPDatabase, openDB } from 'idb';
import type { Event } from '../types';
import { runMigrations } from './migrate';

export const DB_NAME = '1td-db';
export const DB_VERSION = 1;
export const EVENTS_STORE = 'events' as const;

export const INDEX_BY_OCCURRED_AT = 'by_occurred_at' as const;
export const INDEX_BY_ACTION_ID = 'by_action_id' as const;

export interface OneTapDiaryDB extends DBSchema {
  events: {
    key: string;
    value: Event;
    indexes: {
      by_occurred_at: string;
      by_action_id: string;
    };
  };
}

type BlockedListener = (messageVi: string) => void;

export const IDB_BLOCKED_MESSAGE_VI =
  'Vui lòng đóng các tab 1TD khác để hoàn tất cập nhật cơ sở dữ liệu.';

let dbPromise: Promise<IDBPDatabase<OneTapDiaryDB>> | null = null;
let isBlockedState = false;
let visibilityRetryAttached = false;
const blockedListeners = new Set<BlockedListener>();

/**
 * Subscribe to IndexedDB upgrade blocked events (RISKS.md #12).
 * Allows UI layer / uiStore to display a toast without coupling DB layer to React.
 */
export function onDatabaseBlocked(listener: BlockedListener): () => void {
  blockedListeners.add(listener);
  return () => {
    blockedListeners.delete(listener);
  };
}

function notifyBlockedListeners(): void {
  blockedListeners.forEach((listener) => {
    try {
      listener(IDB_BLOCKED_MESSAGE_VI);
    } catch (error: unknown) {
      console.error('[1TD][DB] Blocked listener error:', error);
    }
  });
}

function attachVisibilityRetry(): void {
  if (visibilityRetryAttached || typeof document === 'undefined') {
    return;
  }
  visibilityRetryAttached = true;

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && isBlockedState) {
      isBlockedState = false;
      dbPromise = null;
      void getDB().catch((error: unknown) => {
        console.error('[1TD][DB] Retry openDB after visibilitychange failed:', error);
      });
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
}

/**
 * Opens or returns the shared `1td-db` IndexedDB connection.
 */
export function getDB(): Promise<IDBPDatabase<OneTapDiaryDB>> {
  if (!dbPromise) {
    attachVisibilityRetry();

    dbPromise = openDB<OneTapDiaryDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        try {
          runMigrations(db, oldVersion, newVersion, transaction);
        } catch (error: unknown) {
          console.error('[1TD][DB] Schema migration failed:', error);
          throw error;
        }
      },
      blocked(currentVersion, blockedVersion) {
        isBlockedState = true;
        console.warn(
          `[1TD][DB] Database upgrade from v${currentVersion} to v${String(blockedVersion)} is blocked by another open tab.`
        );
        notifyBlockedListeners();
      },
      blocking(currentVersion, blockedVersion, event) {
        console.info(
          `[1TD][DB] Closing connection (v${currentVersion}) to allow upgrade to v${String(blockedVersion)}.`
        );
        const target = event.target as IDBDatabase | null;
        target?.close();
        dbPromise = null;
      },
      terminated() {
        console.warn('[1TD][DB] IndexedDB connection was abnormally terminated by the browser.');
        dbPromise = null;
      },
    }).catch((error: unknown) => {
      dbPromise = null;
      throw error;
    });
  }

  return dbPromise;
}
