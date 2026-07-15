import { describe, expect, it } from 'vitest'

import { createIndexedDbAssetRepository } from './assetRepository'
import { parseAssetLibrarySnapshot } from './snapshot'
import {
  ASSET_LIBRARY_SNAPSHOT_FORMAT_VERSION,
  type AssetLibrarySnapshot,
} from './types'

const SAVED_AT = '2026-07-15T18:00:00.000Z'
const IMPORTED_AT = '2026-07-15T17:30:00.000Z'

function createPngBlob(): Blob {
  return new Blob(
    [Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])],
    { type: 'image/png' },
  )
}

function createSnapshot(): AssetLibrarySnapshot {
  const sourceBlob = createPngBlob()

  return {
    formatVersion: ASSET_LIBRARY_SNAPSHOT_FORMAT_VERSION,
    savedAt: SAVED_AT,
    creatorCategories: [
      {
        id: 'creator-category-effects',
        name: 'Favorite Effects',
        createdAt: IMPORTED_AT,
      },
    ],
    importedImages: [
      {
        id: 'imported-image-one',
        displayName: 'ink.png',
        mediaType: 'image/png',
        byteSize: sourceBlob.size,
        intrinsicWidth: 800,
        intrinsicHeight: 1200,
        sourceBlob,
        creatorCategoryId: 'creator-category-effects',
        importedAt: IMPORTED_AT,
      },
    ],
  }
}

describe('asset-library snapshot parser', () => {
  it('accepts a versioned snapshot without replacing its source Blob', () => {
    const snapshot = createSnapshot()
    const result = parseAssetLibrarySnapshot(snapshot)

    expect(result).toMatchObject({
      ok: true,
      snapshot: {
        formatVersion: 1,
        savedAt: SAVED_AT,
        creatorCategories: [{ id: 'creator-category-effects' }],
        importedImages: [{ id: 'imported-image-one' }],
      },
    })

    if (!result.ok) throw new Error(result.message)
    expect(result.snapshot.importedImages[0]?.sourceBlob).toBe(
      snapshot.importedImages[0]?.sourceBlob,
    )
  })

  it('distinguishes unsupported versions from malformed snapshots', () => {
    expect(
      parseAssetLibrarySnapshot({ ...createSnapshot(), formatVersion: 2 }),
    ).toMatchObject({ ok: false, reason: 'unsupported-version' })
    expect(
      parseAssetLibrarySnapshot({ ...createSnapshot(), savedAt: 'not-a-date' }),
    ).toMatchObject({ ok: false, reason: 'corrupt' })
    expect(parseAssetLibrarySnapshot(null)).toMatchObject({
      ok: false,
      reason: 'corrupt',
    })
  })

  it.each([
    ['duplicate category IDs', (snapshot: AssetLibrarySnapshot) => ({
      ...snapshot,
      creatorCategories: [
        ...snapshot.creatorCategories,
        { ...snapshot.creatorCategories[0]!, name: 'Second name' },
      ],
    })],
    ['duplicate category names', (snapshot: AssetLibrarySnapshot) => ({
      ...snapshot,
      creatorCategories: [
        ...snapshot.creatorCategories,
        {
          ...snapshot.creatorCategories[0]!,
          id: 'creator-category-second',
          name: 'favorite effects',
        },
      ],
    })],
    ['missing category reference', (snapshot: AssetLibrarySnapshot) => ({
      ...snapshot,
      importedImages: snapshot.importedImages.map((image) => ({
        ...image,
        creatorCategoryId: 'creator-category-missing',
      })),
    })],
    ['mismatched Blob media type', (snapshot: AssetLibrarySnapshot) => ({
      ...snapshot,
      importedImages: snapshot.importedImages.map((image) => ({
        ...image,
        mediaType: 'image/jpeg',
      })),
    })],
    ['mismatched Blob byte size', (snapshot: AssetLibrarySnapshot) => ({
      ...snapshot,
      importedImages: snapshot.importedImages.map((image) => ({
        ...image,
        byteSize: image.byteSize + 1,
      })),
    })],
    ['excessive decoded pixels', (snapshot: AssetLibrarySnapshot) => ({
      ...snapshot,
      importedImages: snapshot.importedImages.map((image) => ({
        ...image,
        intrinsicWidth: 10_000,
        intrinsicHeight: 10_000,
      })),
    })],
    ['duplicate image IDs', (snapshot: AssetLibrarySnapshot) => ({
      ...snapshot,
      importedImages: [
        ...snapshot.importedImages,
        { ...snapshot.importedImages[0]! },
      ],
    })],
  ])('rejects %s', (_description, mutate) => {
    expect(parseAssetLibrarySnapshot(mutate(createSnapshot()))).toMatchObject({
      ok: false,
      reason: 'corrupt',
    })
  })
})

describe('IndexedDB asset repository boundary', () => {
  it('fails safely when IndexedDB is unavailable', async () => {
    const repository = createIndexedDbAssetRepository(undefined)

    await expect(repository.load()).resolves.toMatchObject({
      ok: false,
      reason: 'storage-unavailable',
    })
    await expect(repository.save(createSnapshot())).resolves.toMatchObject({
      ok: false,
      reason: 'storage-unavailable',
    })
  })

  it('rejects invalid input before attempting to open IndexedDB', async () => {
    const repository = createIndexedDbAssetRepository(undefined)

    await expect(repository.save({ formatVersion: 1 })).resolves.toMatchObject({
      ok: false,
      reason: 'invalid-snapshot',
    })
    await expect(
      repository.save({ ...createSnapshot(), formatVersion: 99 }),
    ).resolves.toMatchObject({
      ok: false,
      reason: 'unsupported-version',
    })
  })
})
