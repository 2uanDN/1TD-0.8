import type { IDBPDatabase, IDBPTransaction, StoreNames } from 'idb';
import type { OneTapDiaryDB } from './schema';

/**
 * IndexedDB Sequential Migration Handlers (SPEC.md § IV.1 & RISKS.md #12)
 *
 * Rules:
 * 1. Every schema change requires bumping `DB_VERSION` in `src/db/schema.ts` and adding
 *    a corresponding sequential handler in `MIGRATIONS` below.
 * 2. Every handler must be idempotent: inspect `db.objectStoreNames` and `store.indexNames`
 *    before creating object stores or indexes.
 * 3. Multi-tab upgrade safety (RISKS.md #12):
 *    If another open tab holds an older connection when a version upgrade runs, IndexedDB
 *    fires `blocked`. `src/db/schema.ts` closes stale connections on `blocking`, notifies
 *    listeners on `blocked` ("Vui lòng đóng các tab 1TD khác để hoàn tất cập nhật"),
 *    and retries opening the database on `document.visibilitychange`.
 */

type MigrationHandler = (
  db: IDBPDatabase<OneTapDiaryDB>,
  transaction: IDBPTransaction<OneTapDiaryDB, StoreNames<OneTapDiaryDB>[], 'versionchange'>
) => void;

const migrateToV1: MigrationHandler = (db, transaction) => {
  const store = db.objectStoreNames.contains('events')
    ? transaction.objectStore('events')
    : db.createObjectStore('events', {
        keyPath: 'id',
        autoIncrement: false,
      });

  if (!store.indexNames.contains('by_occurred_at')) {
    store.createIndex('by_occurred_at', 'occurred_at', { unique: false });
  }

  if (!store.indexNames.contains('by_action_id')) {
    store.createIndex('by_action_id', 'action_id', { unique: false });
  }
};

const MIGRATIONS: Record<number, MigrationHandler> = {
  1: migrateToV1,
};

/**
 * Executes all sequential migrations between `oldVersion` and `newVersion`.
 */
export function runMigrations(
  db: IDBPDatabase<OneTapDiaryDB>,
  oldVersion: number,
  newVersion: number | null,
  transaction: IDBPTransaction<OneTapDiaryDB, StoreNames<OneTapDiaryDB>[], 'versionchange'>
): void {
  const targetVersion = newVersion ?? 1;

  for (let version = oldVersion + 1; version <= targetVersion; version += 1) {
    const handler = MIGRATIONS[version];
    if (handler) {
      handler(db, transaction);
    }
  }
}
