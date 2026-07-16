import { describe, expect, it } from 'vitest'

import {
  BUILD_WEEK_LAYER_PLANE_IDS,
  buildWeekEpisode,
} from '../app/fixtures/buildWeekEpisode'
import { createImageElement } from '../core/commands'
import { createLocalStorageProjectLibraryRepository } from '../persistence/projectLibraryRepository'
import {
  PROJECT_STORAGE_KEY,
  createLocalStorageProjectRepository,
} from '../persistence/projectRepository'
import {
  createDebouncedLocalStorageRecoveryRepository,
} from '../persistence/recoveryRepository'
import {
  checkImportedAssetDeletionSafety,
  type AssetReferenceStorage,
} from './referenceSafety'

const ASSET_ID = 'imported-reference-proof'

class MemoryStorage implements AssetReferenceStorage {
  readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }
}

function withImportedReference() {
  return createImageElement(buildWeekEpisode, {
    layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
    name: 'Reference proof',
    assetReference: { kind: 'imported', assetId: ASSET_ID },
    bounds: { x: 120, y: 320, width: 300, height: 180 },
  })
}

describe('imported source deletion safety', () => {
  it('allows deletion only after every known episode store is readable and unused', () => {
    const storage = new MemoryStorage()

    expect(
      checkImportedAssetDeletionSafety(ASSET_ID, buildWeekEpisode, storage),
    ).toEqual({ ok: true })
  })

  it('blocks a current or explicitly saved reference', () => {
    const storage = new MemoryStorage()
    const referencedEpisode = withImportedReference()

    expect(
      checkImportedAssetDeletionSafety(ASSET_ID, referencedEpisode, storage),
    ).toMatchObject({ ok: false, message: expect.stringContaining('current') })

    expect(
      createLocalStorageProjectRepository(storage).save(referencedEpisode),
    ).toMatchObject({ ok: true })
    expect(
      checkImportedAssetDeletionSafety(ASSET_ID, buildWeekEpisode, storage),
    ).toMatchObject({ ok: false, message: expect.stringContaining('explicit') })
  })

  it('blocks recovery and local-project references', () => {
    const storage = new MemoryStorage()
    const referencedEpisode = withImportedReference()
    const recovery = createDebouncedLocalStorageRecoveryRepository(storage, {
      debounceMs: 60_000,
    })

    expect(recovery.save(null, referencedEpisode)).toMatchObject({ ok: true })
    expect(recovery.flush()).toMatchObject({ ok: true, status: 'saved' })
    expect(
      checkImportedAssetDeletionSafety(ASSET_ID, buildWeekEpisode, storage),
    ).toMatchObject({ ok: false, message: expect.stringContaining('recovery') })

    expect(recovery.clear()).toEqual({ ok: true })
    expect(
      createLocalStorageProjectLibraryRepository(storage).saveAs(
        referencedEpisode,
      ),
    ).toMatchObject({ ok: true })
    expect(
      checkImportedAssetDeletionSafety(ASSET_ID, buildWeekEpisode, storage),
    ).toMatchObject({ ok: false, message: expect.stringContaining('Local project') })
  })

  it('fails closed when storage is unavailable or a known record is corrupt', () => {
    expect(
      checkImportedAssetDeletionSafety(
        ASSET_ID,
        buildWeekEpisode,
        undefined,
      ),
    ).toMatchObject({ ok: false, message: expect.stringContaining('unavailable') })

    const storage = new MemoryStorage()
    storage.setItem(PROJECT_STORAGE_KEY, '{not-json')

    expect(
      checkImportedAssetDeletionSafety(ASSET_ID, buildWeekEpisode, storage),
    ).toMatchObject({ ok: false, message: expect.stringContaining('could not be checked') })
  })
})
