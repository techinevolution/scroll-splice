import { describe, expect, it, vi } from 'vitest'

import {
  ASSET_LIBRARY_OBJECT_STORE,
  createIndexedDbAssetRepository,
} from './assetRepository'
import {
  ASSET_LIBRARY_SNAPSHOT_FORMAT_VERSION,
  type AssetLibrarySnapshot,
} from './types'

const NO_PENDING_WRITE = Symbol('no-pending-write')

interface FakeRequest {
  result: unknown
  onsuccess: (() => void) | null
  onerror: (() => void) | null
}

function createRequest(): FakeRequest {
  return {
    result: undefined,
    onsuccess: null,
    onerror: null,
  }
}

class FakeTransaction {
  oncomplete: (() => void) | null = null
  onerror: (() => void) | null = null
  onabort: (() => void) | null = null
  private readRequest: FakeRequest | undefined
  private writeRequest: FakeRequest | undefined
  private pendingWrite: unknown | typeof NO_PENDING_WRITE = NO_PENDING_WRITE
  private aborted = false

  constructor(
    private readonly owner: SerializedIndexedDb,
    private readonly mode: IDBTransactionMode,
  ) {}

  objectStore(name: string): IDBObjectStore {
    if (name !== ASSET_LIBRARY_OBJECT_STORE) {
      throw new Error(`Unknown object store: ${name}`)
    }

    return {
      get: () => {
        this.readRequest = createRequest()
        return this.readRequest as unknown as IDBRequest
      },
      put: (value: unknown) => {
        if (this.mode !== 'readwrite') {
          throw new Error('Cannot write in a readonly transaction.')
        }

        this.pendingWrite = value
        this.writeRequest = createRequest()
        return this.writeRequest as unknown as IDBRequest
      },
    } as unknown as IDBObjectStore
  }

  abort(): void {
    this.aborted = true
  }

  run(): Promise<void> {
    return new Promise((resolve) => {
      queueMicrotask(() => {
        if (this.aborted) {
          this.onabort?.()
          resolve()
          return
        }

        if (this.readRequest) {
          this.readRequest.result = this.owner.value
          this.readRequest.onsuccess?.()
        }

        queueMicrotask(() => {
          if (this.aborted) {
            this.onabort?.()
            resolve()
            return
          }

          if (
            this.mode === 'readwrite' &&
            this.pendingWrite !== NO_PENDING_WRITE
          ) {
            this.owner.value = this.pendingWrite
            this.writeRequest?.onsuccess?.()
          }

          this.oncomplete?.()
          resolve()
        })
      })
    })
  }
}

class SerializedIndexedDb {
  value: unknown
  readonly transactionModes: IDBTransactionMode[] = []
  private readwriteTail: Promise<void> = Promise.resolve()

  constructor(initialValue?: unknown) {
    this.value = initialValue
  }

  readonly factory = {
    open: () => {
      const request = createRequest() as FakeRequest & {
        result: IDBDatabase
        onupgradeneeded: (() => void) | null
        onblocked: (() => void) | null
      }
      request.onupgradeneeded = null
      request.onblocked = null
      request.result = this.createDatabase()

      queueMicrotask(() => request.onsuccess?.())
      return request as unknown as IDBOpenDBRequest
    },
  } as unknown as IDBFactory

  private createDatabase(): IDBDatabase {
    return {
      objectStoreNames: {
        contains: (name: string) => name === ASSET_LIBRARY_OBJECT_STORE,
      },
      createObjectStore: () => ({}) as IDBObjectStore,
      transaction: (
        _storeName: string,
        mode: IDBTransactionMode = 'readonly',
      ) => {
        const transaction = new FakeTransaction(this, mode)
        this.transactionModes.push(mode)

        if (mode === 'readwrite') {
          const run = this.readwriteTail.then(() => transaction.run())
          this.readwriteTail = run.catch(() => undefined)
        } else {
          void transaction.run()
        }

        return transaction as unknown as IDBTransaction
      },
      close: () => undefined,
    } as unknown as IDBDatabase
  }
}

function createSnapshot(
  savedAt = '2026-07-15T18:00:00.000Z',
): AssetLibrarySnapshot {
  return {
    formatVersion: ASSET_LIBRARY_SNAPSHOT_FORMAT_VERSION,
    savedAt,
    creatorCategories: [],
    importedImages: [],
  }
}

function appendCategory(
  current: AssetLibrarySnapshot | undefined,
  id: string,
  name: string,
  savedAt: string,
): AssetLibrarySnapshot {
  const snapshot = current ?? createSnapshot()

  return {
    ...snapshot,
    savedAt,
    creatorCategories: [
      ...snapshot.creatorCategories,
      { id, name, createdAt: savedAt },
    ],
  }
}

describe('IndexedDB asset repository atomic updates', () => {
  it('preserves direct save and load behavior', async () => {
    const indexedDb = new SerializedIndexedDb()
    const repository = createIndexedDbAssetRepository(indexedDb.factory)
    const snapshot = createSnapshot()

    await expect(repository.save(snapshot)).resolves.toEqual({
      ok: true,
      savedAt: snapshot.savedAt,
    })
    await expect(repository.load()).resolves.toEqual({
      ok: true,
      snapshot,
    })
    expect(indexedDb.transactionModes).toEqual(['readwrite', 'readonly'])
  })

  it('serializes concurrent read-transform-write updates across repositories', async () => {
    const indexedDb = new SerializedIndexedDb(createSnapshot())
    const firstRepository = createIndexedDbAssetRepository(indexedDb.factory)
    const secondRepository = createIndexedDbAssetRepository(indexedDb.factory)
    const observedCategoryCounts: number[] = []

    const [firstResult, secondResult] = await Promise.all([
      firstRepository.update((current) => {
        observedCategoryCounts.push(current?.creatorCategories.length ?? -1)
        return appendCategory(
          current,
          'creator-category-ink',
          'Ink',
          '2026-07-15T18:01:00.000Z',
        )
      }),
      secondRepository.update((current) => {
        observedCategoryCounts.push(current?.creatorCategories.length ?? -1)
        return appendCategory(
          current,
          'creator-category-panels',
          'Panels',
          '2026-07-15T18:02:00.000Z',
        )
      }),
    ])

    expect(observedCategoryCounts).toEqual([0, 1])
    expect(firstResult).toMatchObject({
      ok: true,
      snapshot: { creatorCategories: [{ name: 'Ink' }] },
    })
    expect(secondResult).toMatchObject({
      ok: true,
      snapshot: {
        creatorCategories: [{ name: 'Ink' }, { name: 'Panels' }],
      },
    })
    await expect(firstRepository.load()).resolves.toMatchObject({
      ok: true,
      snapshot: {
        creatorCategories: [{ name: 'Ink' }, { name: 'Panels' }],
      },
    })
    expect(indexedDb.transactionModes.slice(0, 2)).toEqual([
      'readwrite',
      'readwrite',
    ])
  })

  it('validates transformed snapshots and leaves the saved value untouched on failure', async () => {
    const original = createSnapshot()
    const indexedDb = new SerializedIndexedDb(original)
    const repository = createIndexedDbAssetRepository(indexedDb.factory)

    await expect(
      repository.update(() => ({ formatVersion: 1 })),
    ).resolves.toMatchObject({
      ok: false,
      reason: 'invalid-snapshot',
    })
    await expect(
      repository.update(() => {
        throw new Error('transform failed')
      }),
    ).resolves.toMatchObject({
      ok: false,
      reason: 'transform-failed',
    })
    await expect(repository.load()).resolves.toEqual({
      ok: true,
      snapshot: original,
    })
  })

  it('refuses to overwrite a corrupt current snapshot', async () => {
    const indexedDb = new SerializedIndexedDb({ formatVersion: 1 })
    const repository = createIndexedDbAssetRepository(indexedDb.factory)
    const transform = vi.fn(() => createSnapshot())

    await expect(repository.update(transform)).resolves.toMatchObject({
      ok: false,
      reason: 'corrupt',
    })
    expect(transform).not.toHaveBeenCalled()
    expect(indexedDb.value).toEqual({ formatVersion: 1 })
  })
})
