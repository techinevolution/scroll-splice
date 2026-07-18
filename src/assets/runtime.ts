import type { ImageAssetReference } from '../core/episode'
import { BUILT_IN_ASSETS } from './builtInCatalog'
import type { ImportedImageSnapshot } from './types'

const DEMO_STORY_ASSETS = Array.from({ length: 6 }, (_, index) => {
  const panelNumber = String(index + 1).padStart(2, "0")

  return {
    id: "demo-light-we-planted-panel-" + panelNumber,
    displayName: "The Light We Planted · Panel " + (index + 1),
    intrinsicWidth: 1024,
    intrinsicHeight: 1536,
    sourceUrl:
      import.meta.env.BASE_URL +
      "demo/the-light-we-planted/panel-" +
      panelNumber +
      ".jpg",
  }
})

export interface RuntimeImportedImage extends ImportedImageSnapshot {
  readonly sourceUrl: string
}

export interface ResolvedImageAsset {
  readonly id: string
  readonly displayName: string
  readonly intrinsicWidth: number
  readonly intrinsicHeight: number
  readonly sourceUrl: string
}

export function createRuntimeImportedImage(
  snapshot: ImportedImageSnapshot,
): RuntimeImportedImage {
  if (
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    throw new Error('This browser cannot create a local image preview.')
  }

  return {
    ...snapshot,
    sourceUrl: URL.createObjectURL(snapshot.sourceBlob),
  }
}

export function revokeRuntimeImportedImages(
  images: readonly RuntimeImportedImage[],
): void {
  if (typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') {
    return
  }

  for (const image of images) {
    URL.revokeObjectURL(image.sourceUrl)
  }
}

export function resolveImageAsset(
  reference: ImageAssetReference,
  importedImages: readonly RuntimeImportedImage[],
): ResolvedImageAsset | undefined {
  if (reference.kind === 'built-in') {
    const demoStoryAsset = DEMO_STORY_ASSETS.find(
      ({ id }) => id === reference.assetId,
    )

    if (demoStoryAsset) return demoStoryAsset

    const asset = BUILT_IN_ASSETS.find(({ id }) => id === reference.assetId)

    return asset
      ? {
          id: asset.id,
          displayName: asset.displayName,
          intrinsicWidth: asset.intrinsicWidth,
          intrinsicHeight: asset.intrinsicHeight,
          sourceUrl: asset.source,
        }
      : undefined
  }

  const asset = importedImages.find(({ id }) => id === reference.assetId)

  return asset
    ? {
        id: asset.id,
        displayName: asset.displayName,
        intrinsicWidth: asset.intrinsicWidth,
        intrinsicHeight: asset.intrinsicHeight,
        sourceUrl: asset.sourceUrl,
      }
    : undefined
}
