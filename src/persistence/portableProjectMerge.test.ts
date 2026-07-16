import { describe, expect, it } from 'vitest'

import {
  ASSET_LIBRARY_SNAPSHOT_FORMAT_VERSION,
  type AssetLibrarySnapshot,
} from '../assets'
import { createBlankEpisode } from '../core/createBlankEpisode'
import type { EpisodeDocument, ImageElement } from '../core/episode'
import { mergePortableProjectAssets } from './portableProjectMerge'

function snapshot(
  categoryId: string,
  categoryName: string,
  assetId: string,
  byte: number,
): AssetLibrarySnapshot {
  return {
    formatVersion: ASSET_LIBRARY_SNAPSHOT_FORMAT_VERSION,
    savedAt: '2026-07-16T10:00:00.000Z',
    creatorCategories: [
      {
        id: categoryId,
        name: categoryName,
        createdAt: '2026-07-16T09:00:00.000Z',
      },
    ],
    importedImages: [
      {
        id: assetId,
        displayName: `${assetId}.png`,
        mediaType: 'image/png',
        byteSize: 1,
        intrinsicWidth: 1,
        intrinsicHeight: 1,
        sourceBlob: new Blob([new Uint8Array([byte])], { type: 'image/png' }),
        creatorCategoryId: categoryId,
        importedAt: '2026-07-16T09:30:00.000Z',
      },
    ],
  }
}

function episodeWithImportedAsset(assetId: string): EpisodeDocument {
  const episode = createBlankEpisode('episode-portable')
  const planeId = episode.layerPlanes.find(
    ({ compositionGroup, kind }) =>
      compositionGroup === 'content' && kind === 'ordinary',
  )?.id

  if (!planeId) throw new Error('Fixture needs a content plane.')

  const image: ImageElement = {
    id: 'portable-image',
    type: 'image',
    name: 'Portable image',
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    transform: { rotationDegrees: 0, flipX: false, flipY: false },
    overflow: 'constrained',
    zIndex: 0,
    layerPlaneId: planeId,
    bounds: { x: 10, y: 10, width: 100, height: 100 },
    assetReference: { kind: 'imported', assetId },
    presentation: 'single',
    frame: {
      mask: { kind: 'rectangle', cornerRadius: 0 },
      crop: { focusX: 0.5, focusY: 0.5, zoom: 1 },
    },
  }

  return { ...episode, elements: [image] }
}

describe('portable project collision merge', () => {
  it('remaps conflicting IDs and rewrites the imported episode reference', () => {
    const current = snapshot('category-shared', 'Local', 'asset-shared', 1)
    const incoming = snapshot('category-shared', 'Incoming', 'asset-shared', 2)
    const result = mergePortableProjectAssets(
      current,
      incoming,
      episodeWithImportedAsset('asset-shared'),
      '2026-07-16T12:00:00.000Z',
    )

    expect(result.assetLibrary.creatorCategories.map(({ id }) => id)).toEqual([
      'category-shared',
      'category-shared-import-1',
    ])
    expect(result.assetLibrary.importedImages.map(({ id }) => id)).toEqual([
      'asset-shared',
      'asset-shared-import-1',
    ])
    expect(
      result.assetLibrary.importedImages[1]?.creatorCategoryId,
    ).toBe('category-shared-import-1')
    expect(
      (result.episode.elements[0] as ImageElement).assetReference,
    ).toEqual({ kind: 'imported', assetId: 'asset-shared-import-1' })
    expect(result.remappedCategoryCount).toBe(1)
    expect(result.remappedAssetCount).toBe(1)
  })

  it('reuses an existing category name while preserving a unique source ID', () => {
    const current = snapshot('category-local', 'Textures', 'asset-local', 1)
    const incoming = snapshot(
      'category-portable',
      'Textures',
      'asset-portable',
      2,
    )
    const result = mergePortableProjectAssets(
      current,
      incoming,
      episodeWithImportedAsset('asset-portable'),
      '2026-07-16T12:00:00.000Z',
    )

    expect(result.assetLibrary.creatorCategories).toHaveLength(1)
    expect(result.assetLibrary.importedImages[1]).toMatchObject({
      id: 'asset-portable',
      creatorCategoryId: 'category-local',
    })
    expect(result.remappedCategoryCount).toBe(1)
    expect(result.remappedAssetCount).toBe(0)
  })
})
