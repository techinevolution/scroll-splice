import type { AssetLibrarySnapshot } from './types'
import { parseAssetLibrarySnapshot } from './snapshot'

export const ASSET_LIBRARY_DB_NAME = 'scrollsplice-asset-library-v1'
export const ASSET_LIBRARY_DB_VERSION = 1
export const ASSET_LIBRARY_OBJECT_STORE = 'snapshots'
export const ASSET_LIBRARY_SNAPSHOT_KEY = 'current'

export type SaveAssetLibraryResult =
  | { readonly ok: true; readonly savedAt: string }
  | {
      readonly ok: false
      readonly reason:
        | 'storage-unavailable'
        | 'invalid-snapshot'
        | 'unsupported-version'
        | 'open-failed'
        | 'write-failed'
      readonly message: string
    }

export type LoadAssetLibraryResult =
  | { readonly ok: true; readonly snapshot: AssetLibrarySnapshot }
  | {
      readonly ok: false
      readonly reason:
        | 'storage-unavailable'
        | 'not-found'
        | 'open-failed'
        | 'read-failed'
        | 'corrupt'
        | 'unsupported-version'
      readonly message: string
    }

export type AssetLibrarySnapshotTransform = (
  currentSnapshot: AssetLibrarySnapshot | undefined,
) => unknown

export type UpdateAssetLibraryResult =
  | { readonly ok: true; readonly snapshot: AssetLibrarySnapshot }
  | {
      readonly ok: false
      readonly reason:
        | 'storage-unavailable'
        | 'invalid-snapshot'
        | 'unsupported-version'
        | 'open-failed'
        | 'read-failed'
        | 'corrupt'
        | 'transform-failed'
        | 'write-failed'
      readonly message: string
    }

export type UpdateAssetLibrary = (
  transform: AssetLibrarySnapshotTransform,
) => Promise<UpdateAssetLibraryResult>

export interface AssetRepository {
  save(snapshot: unknown): Promise<SaveAssetLibraryResult>
  load(): Promise<LoadAssetLibraryResult>
  readonly update: UpdateAssetLibrary
}

export interface AtomicAssetRepository extends AssetRepository {
  readonly update: UpdateAssetLibrary
}

type OpenDatabaseResult =
  | { readonly ok: true; readonly database: IDBDatabase }
  | { readonly ok: false; readonly message: string }

type ReadSnapshotResult =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly message: string }

export function getBrowserIndexedDB(): IDBFactory | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.indexedDB
  } catch {
    return undefined
  }
}

export function createIndexedDbAssetRepository(
  indexedDb: IDBFactory | undefined = getBrowserIndexedDB(),
): AtomicAssetRepository {
  return {
    async save(snapshot) {
      const parsed = parseAssetLibrarySnapshot(snapshot)

      if (!parsed.ok) {
        return failure(
          parsed.reason === 'unsupported-version'
            ? 'unsupported-version'
            : 'invalid-snapshot',
          parsed.message,
        )
      }

      if (!indexedDb) {
        return failure(
          'storage-unavailable',
          'Local asset storage is unavailable in this browser.',
        )
      }

      const opened = await openAssetDatabase(indexedDb)

      if (!opened.ok) {
        return failure('open-failed', opened.message)
      }

      try {
        const written = await writeSnapshot(
          opened.database,
          parsed.snapshot,
        )

        return written.ok
          ? { ok: true, savedAt: parsed.snapshot.savedAt }
          : failure('write-failed', written.message)
      } finally {
        opened.database.close()
      }
    },

    async load() {
      if (!indexedDb) {
        return failure(
          'storage-unavailable',
          'Local asset storage is unavailable in this browser.',
        )
      }

      const opened = await openAssetDatabase(indexedDb)

      if (!opened.ok) {
        return failure('open-failed', opened.message)
      }

      try {
        const read = await readSnapshot(opened.database)

        if (!read.ok) {
          return failure('read-failed', read.message)
        }

        if (read.value === undefined) {
          return failure('not-found', 'No locally saved asset library was found.')
        }

        const parsed = parseAssetLibrarySnapshot(read.value)

        return parsed.ok
          ? { ok: true, snapshot: parsed.snapshot }
          : failure(parsed.reason, parsed.message)
      } finally {
        opened.database.close()
      }
    },

    async update(transform) {
      if (!indexedDb) {
        return failure(
          'storage-unavailable',
          'Local asset storage is unavailable in this browser.',
        )
      }

      const opened = await openAssetDatabase(indexedDb)

      if (!opened.ok) {
        return failure('open-failed', opened.message)
      }

      try {
        return await updateSnapshot(opened.database, transform)
      } finally {
        opened.database.close()
      }
    },
  }
}

function openAssetDatabase(indexedDb: IDBFactory): Promise<OpenDatabaseResult> {
  return new Promise((resolve) => {
    let request: IDBOpenDBRequest

    try {
      request = indexedDb.open(ASSET_LIBRARY_DB_NAME, ASSET_LIBRARY_DB_VERSION)
    } catch {
      resolve({
        ok: false,
        message: 'The browser could not open local asset storage.',
      })
      return
    }

    let settled = false
    const settle = (result: OpenDatabaseResult) => {
      if (settled) {
        if (result.ok) result.database.close()
        return
      }

      settled = true
      resolve(result)
    }

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(ASSET_LIBRARY_OBJECT_STORE)) {
        database.createObjectStore(ASSET_LIBRARY_OBJECT_STORE)
      }
    }
    request.onsuccess = () =>
      settle({ ok: true, database: request.result })
    request.onerror = () =>
      settle({
        ok: false,
        message: 'The browser could not open local asset storage.',
      })
    request.onblocked = () =>
      settle({
        ok: false,
        message: 'Local asset storage is blocked by another open editor tab.',
      })
  })
}

function readSnapshot(database: IDBDatabase): Promise<ReadSnapshotResult> {
  return new Promise((resolve) => {
    let transaction: IDBTransaction
    let value: unknown

    try {
      transaction = database.transaction(
        ASSET_LIBRARY_OBJECT_STORE,
        'readonly',
      )
      const request = transaction
        .objectStore(ASSET_LIBRARY_OBJECT_STORE)
        .get(ASSET_LIBRARY_SNAPSHOT_KEY)
      request.onsuccess = () => {
        value = request.result as unknown
      }
    } catch {
      resolve({
        ok: false,
        message: 'The browser could not read local asset storage.',
      })
      return
    }

    transaction.oncomplete = () => resolve({ ok: true, value })
    transaction.onerror = () =>
      resolve({
        ok: false,
        message: 'The browser could not read the saved asset library.',
      })
    transaction.onabort = () =>
      resolve({
        ok: false,
        message: 'Reading the saved asset library was interrupted.',
      })
  })
}

function writeSnapshot(
  database: IDBDatabase,
  snapshot: AssetLibrarySnapshot,
): Promise<{ readonly ok: true } | { readonly ok: false; readonly message: string }> {
  return new Promise((resolve) => {
    let transaction: IDBTransaction

    try {
      transaction = database.transaction(
        ASSET_LIBRARY_OBJECT_STORE,
        'readwrite',
      )
      transaction
        .objectStore(ASSET_LIBRARY_OBJECT_STORE)
        .put(snapshot, ASSET_LIBRARY_SNAPSHOT_KEY)
    } catch {
      resolve({
        ok: false,
        message: 'The browser could not prepare the asset library for saving.',
      })
      return
    }

    transaction.oncomplete = () => resolve({ ok: true })
    transaction.onerror = () =>
      resolve({
        ok: false,
        message: 'The browser could not save the asset library.',
      })
    transaction.onabort = () =>
      resolve({
        ok: false,
        message: 'Saving the asset library was interrupted.',
      })
  })
}

function updateSnapshot(
  database: IDBDatabase,
  transform: AssetLibrarySnapshotTransform,
): Promise<UpdateAssetLibraryResult> {
  return new Promise((resolve) => {
    let transaction: IDBTransaction
    let savedSnapshot: AssetLibrarySnapshot | undefined
    let operationFailure:
      | Extract<UpdateAssetLibraryResult, { readonly ok: false }>
      | undefined
    let settled = false

    const settle = (result: UpdateAssetLibraryResult) => {
      if (settled) return
      settled = true
      resolve(result)
    }

    const abortWith = (
      result: Extract<UpdateAssetLibraryResult, { readonly ok: false }>,
    ) => {
      operationFailure = result

      try {
        transaction.abort()
      } catch {
        settle(result)
      }
    }

    try {
      transaction = database.transaction(
        ASSET_LIBRARY_OBJECT_STORE,
        'readwrite',
      )
      const objectStore = transaction.objectStore(
        ASSET_LIBRARY_OBJECT_STORE,
      )
      const readRequest = objectStore.get(ASSET_LIBRARY_SNAPSHOT_KEY)

      readRequest.onsuccess = () => {
        let currentSnapshot: AssetLibrarySnapshot | undefined

        if (readRequest.result !== undefined) {
          const parsedCurrent = parseAssetLibrarySnapshot(
            readRequest.result as unknown,
          )

          if (!parsedCurrent.ok) {
            abortWith(failure(parsedCurrent.reason, parsedCurrent.message))
            return
          }

          currentSnapshot = parsedCurrent.snapshot
        }

        let transformed: unknown

        try {
          transformed = transform(currentSnapshot)
        } catch {
          abortWith(
            failure(
              'transform-failed',
              'The asset-library update could not be prepared.',
            ),
          )
          return
        }

        const parsedNext = parseAssetLibrarySnapshot(transformed)

        if (!parsedNext.ok) {
          abortWith(
            failure(
              parsedNext.reason === 'unsupported-version'
                ? 'unsupported-version'
                : 'invalid-snapshot',
              parsedNext.message,
            ),
          )
          return
        }

        savedSnapshot = parsedNext.snapshot

        try {
          const writeRequest = objectStore.put(
            savedSnapshot,
            ASSET_LIBRARY_SNAPSHOT_KEY,
          )
          writeRequest.onerror = () => {
            operationFailure = failure(
              'write-failed',
              'The browser could not save the updated asset library.',
            )
          }
        } catch {
          abortWith(
            failure(
              'write-failed',
              'The browser could not prepare the updated asset library for saving.',
            ),
          )
        }
      }

      readRequest.onerror = () => {
        operationFailure = failure(
          'read-failed',
          'The browser could not read the saved asset library for updating.',
        )
      }
    } catch {
      settle(
        failure(
          'read-failed',
          'The browser could not prepare the asset library for updating.',
        ),
      )
      return
    }

    transaction.oncomplete = () => {
      settle(
        savedSnapshot
          ? { ok: true, snapshot: savedSnapshot }
          : failure(
              'write-failed',
              'The asset-library update completed without a saved snapshot.',
            ),
      )
    }
    transaction.onerror = () => {
      operationFailure ??= failure(
        'write-failed',
        'The browser could not update the saved asset library.',
      )
    }
    transaction.onabort = () => {
      settle(
        operationFailure ??
          failure(
            'write-failed',
            'Updating the saved asset library was interrupted.',
          ),
      )
    }
  })
}

function failure<Reason extends string>(
  reason: Reason,
  message: string,
): { readonly ok: false; readonly reason: Reason; readonly message: string } {
  return { ok: false, reason, message }
}
