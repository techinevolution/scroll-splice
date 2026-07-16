import { describe, expect, it } from 'vitest'

import { createImageElement } from '../core/commands'
import {
  BLANK_EPISODE_LAYER_PLANE_IDS,
  createBlankEpisode,
} from '../core/createBlankEpisode'
import {
  ASSET_LIBRARY_SNAPSHOT_FORMAT_VERSION,
  type AssetLibrarySnapshot,
} from '../assets/types'
import {
  PORTABLE_PROJECT_FILE_EXTENSION,
  PORTABLE_PROJECT_FORMAT_VERSION,
  PORTABLE_PROJECT_MEDIA_TYPE,
  createPortableProjectFileName,
  parsePortableProject,
  serializePortableProject,
} from './portableProject'

const SAVED_AT = '2026-07-16T13:00:00.000Z'
const CREATED_AT = '2026-07-16T13:30:00.000Z'
const SOURCE_BYTES = Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 1, 2, 127, 128, 254, 255,
])

function createAssetLibrary(): AssetLibrarySnapshot {
  const sourceBlob = new Blob([SOURCE_BYTES], { type: 'image/png' })

  return {
    formatVersion: ASSET_LIBRARY_SNAPSHOT_FORMAT_VERSION,
    savedAt: SAVED_AT,
    creatorCategories: [
      {
        id: 'creator-category-effects',
        name: 'Effects',
        createdAt: SAVED_AT,
      },
    ],
    importedImages: [
      {
        id: 'imported-alpha-panel',
        displayName: 'alpha-panel.png',
        mediaType: 'image/png',
        byteSize: sourceBlob.size,
        intrinsicWidth: 800,
        intrinsicHeight: 1280,
        sourceBlob,
        creatorCategoryId: 'creator-category-effects',
        importedAt: SAVED_AT,
      },
    ],
  }
}

function createEpisodeWithImportedImage() {
  return createImageElement(createBlankEpisode('episode-portable'), {
    layerPlaneId: BLANK_EPISODE_LAYER_PLANE_IDS.content,
    name: 'Transparent panel',
    assetReference: {
      kind: 'imported',
      assetId: 'imported-alpha-panel',
    },
    bounds: { x: 40, y: 60, width: 400, height: 640 },
  })
}

async function createSerializedPackage(): Promise<string> {
  const result = await serializePortableProject(
    createEpisodeWithImportedImage(),
    createAssetLibrary(),
    { now: () => new Date(CREATED_AT) },
  )

  if (!result.ok) throw new Error(result.message)
  return result.blob.text()
}

describe('portable ScrollSplice project package', () => {
  it('round-trips an episode and exact imported source bytes through base64', async () => {
    const serialized = await serializePortableProject(
      createEpisodeWithImportedImage(),
      createAssetLibrary(),
      { now: () => new Date(CREATED_AT) },
    )

    expect(serialized).toMatchObject({
      ok: true,
      createdAt: CREATED_AT,
      fileName: `Untitled Episode${PORTABLE_PROJECT_FILE_EXTENSION}`,
    })
    if (!serialized.ok) throw new Error(serialized.message)
    expect(serialized.blob.type).toBe(PORTABLE_PROJECT_MEDIA_TYPE)
    expect(serialized.blob.size).toBe(serialized.byteSize)

    const parsed = await parsePortableProject(serialized.blob)

    expect(parsed).toMatchObject({
      ok: true,
      createdAt: CREATED_AT,
      episode: {
        id: 'episode-portable',
        elements: [
          {
            assetReference: {
              kind: 'imported',
              assetId: 'imported-alpha-panel',
            },
          },
        ],
      },
      assetLibrary: {
        savedAt: SAVED_AT,
        creatorCategories: [{ id: 'creator-category-effects' }],
        importedImages: [
          {
            id: 'imported-alpha-panel',
            mediaType: 'image/png',
          },
        ],
      },
    })

    if (!parsed.ok) throw new Error(parsed.message)
    const restored = parsed.assetLibrary.importedImages[0]?.sourceBlob
    if (!restored) throw new Error('The portable source Blob was not restored.')
    expect(restored?.type).toBe('image/png')
    expect(restored?.size).toBe(SOURCE_BYTES.byteLength)
    expect(new Uint8Array(await restored.arrayBuffer())).toEqual(SOURCE_BYTES)
  })

  it('keeps the JSON package versioned and metadata-only outside source base64', async () => {
    const json = JSON.parse(await createSerializedPackage()) as Record<
      string,
      unknown
    >

    expect(json).toMatchObject({
      packageFormatVersion: PORTABLE_PROJECT_FORMAT_VERSION,
      application: 'ScrollSplice',
      createdAt: CREATED_AT,
      assetLibrary: {
        formatVersion: ASSET_LIBRARY_SNAPSHOT_FORMAT_VERSION,
        importedImages: [
          {
            id: 'imported-alpha-panel',
            sourceEncoding: 'base64',
            sourceBase64: expect.any(String),
          },
        ],
      },
    })
    expect(JSON.stringify(json)).not.toContain('blob:')
  })

  it('rejects missing source assets instead of making a broken portable project', async () => {
    const emptyLibrary: AssetLibrarySnapshot = {
      formatVersion: ASSET_LIBRARY_SNAPSHOT_FORMAT_VERSION,
      savedAt: SAVED_AT,
      creatorCategories: [],
      importedImages: [],
    }

    await expect(
      serializePortableProject(createEpisodeWithImportedImage(), emptyLibrary),
    ).resolves.toMatchObject({ ok: false, reason: 'missing-asset' })
  })

  it('rejects unsupported versions, extra envelope metadata, and malformed base64', async () => {
    const json = JSON.parse(await createSerializedPackage()) as Record<
      string,
      unknown
    >

    await expect(
      parsePortableProject(
        JSON.stringify({ ...json, packageFormatVersion: 99 }),
      ),
    ).resolves.toMatchObject({ ok: false, reason: 'unsupported-version' })

    await expect(
      parsePortableProject(JSON.stringify({ ...json, surprise: true })),
    ).resolves.toMatchObject({ ok: false, reason: 'corrupt' })

    const assetLibrary = json.assetLibrary as {
      importedImages: Array<Record<string, unknown>>
    }
    assetLibrary.importedImages[0] = {
      ...assetLibrary.importedImages[0],
      sourceBase64: 'not base64!',
    }

    await expect(
      parsePortableProject(JSON.stringify(json)),
    ).resolves.toMatchObject({ ok: false, reason: 'corrupt' })
  })

  it('rejects inconsistent source metadata and invalid asset snapshots', async () => {
    const json = JSON.parse(await createSerializedPackage()) as {
      assetLibrary: { importedImages: Array<Record<string, unknown>> }
    }
    json.assetLibrary.importedImages[0] = {
      ...json.assetLibrary.importedImages[0],
      byteSize: SOURCE_BYTES.byteLength + 1,
    }

    await expect(
      parsePortableProject(JSON.stringify(json)),
    ).resolves.toMatchObject({ ok: false, reason: 'corrupt' })

    const assetLibrary = createAssetLibrary()
    await expect(
      serializePortableProject(createEpisodeWithImportedImage(), {
        ...assetLibrary,
        importedImages: assetLibrary.importedImages.map((image) => ({
          ...image,
          byteSize: image.byteSize + 1,
        })),
      }),
    ).resolves.toMatchObject({ ok: false, reason: 'invalid-assets' })
  })

  it('creates a safe user-facing file name', () => {
    expect(createPortableProjectFileName('  Fog / Dawn: Episode 1  ')).toBe(
      `Fog - Dawn- Episode 1${PORTABLE_PROJECT_FILE_EXTENSION}`,
    )
    expect(createPortableProjectFileName('  ...  ')).toBe(
      `Untitled Episode${PORTABLE_PROJECT_FILE_EXTENSION}`,
    )
  })
})
