import type { AssetLibrarySnapshot } from '../assets'
import type { EpisodeDocument } from '../core/episode'

export interface PortableProjectMergeResult {
  readonly episode: EpisodeDocument
  readonly assetLibrary: AssetLibrarySnapshot
  readonly remappedCategoryCount: number
  readonly remappedAssetCount: number
}

/**
 * Merges one already-validated portable package into the browser library.
 * Existing source records always win their IDs. Incoming collisions receive a
 * fresh stable ID and every imported image reference in the episode is
 * rewritten to match, so importing can never replace a local source silently.
 */
export function mergePortableProjectAssets(
  current: AssetLibrarySnapshot,
  incoming: AssetLibrarySnapshot,
  episode: EpisodeDocument,
  savedAt: string,
): PortableProjectMergeResult {
  const usedCategoryIds = new Set(
    current.creatorCategories.map(({ id }) => id),
  )
  const categoryByName = new Map(
    current.creatorCategories.map((category) => [
      category.name.toLocaleLowerCase(),
      category,
    ]),
  )
  const categoryIdMap = new Map<string, string>()
  const categories = [...current.creatorCategories]
  let remappedCategoryCount = 0

  for (const category of incoming.creatorCategories) {
    const existingByName = categoryByName.get(
      category.name.toLocaleLowerCase(),
    )

    if (existingByName) {
      categoryIdMap.set(category.id, existingByName.id)
      if (existingByName.id !== category.id) remappedCategoryCount += 1
      continue
    }

    const categoryId = usedCategoryIds.has(category.id)
      ? createAvailableId(category.id, usedCategoryIds)
      : category.id

    if (categoryId !== category.id) remappedCategoryCount += 1
    usedCategoryIds.add(categoryId)
    categoryByName.set(category.name.toLocaleLowerCase(), {
      ...category,
      id: categoryId,
    })
    categoryIdMap.set(category.id, categoryId)
    categories.push({ ...category, id: categoryId })
  }

  const usedAssetIds = new Set(current.importedImages.map(({ id }) => id))
  const assetIdMap = new Map<string, string>()
  const importedImages = [...current.importedImages]
  let remappedAssetCount = 0

  for (const image of incoming.importedImages) {
    const assetId = usedAssetIds.has(image.id)
      ? createAvailableId(image.id, usedAssetIds)
      : image.id

    if (assetId !== image.id) remappedAssetCount += 1
    usedAssetIds.add(assetId)
    assetIdMap.set(image.id, assetId)
    importedImages.push({
      ...image,
      id: assetId,
      creatorCategoryId:
        image.creatorCategoryId === null
          ? null
          : (categoryIdMap.get(image.creatorCategoryId) ?? null),
    })
  }

  const rewrittenEpisode: EpisodeDocument = {
    ...episode,
    elements: episode.elements.map((element) => {
      if (
        element.type !== 'image' ||
        element.assetReference.kind !== 'imported'
      ) {
        return element
      }

      const assetId = assetIdMap.get(element.assetReference.assetId)

      return assetId && assetId !== element.assetReference.assetId
        ? {
            ...element,
            assetReference: { kind: 'imported', assetId },
          }
        : element
    }),
  }

  return {
    episode: rewrittenEpisode,
    assetLibrary: {
      formatVersion: current.formatVersion,
      savedAt,
      creatorCategories: categories,
      importedImages,
    },
    remappedCategoryCount,
    remappedAssetCount,
  }
}

function createAvailableId(baseId: string, usedIds: ReadonlySet<string>): string {
  for (let suffixNumber = 1; suffixNumber <= 10_000; suffixNumber += 1) {
    const suffix = `-import-${suffixNumber}`
    const candidate = `${baseId.slice(0, 80 - suffix.length)}${suffix}`

    if (!usedIds.has(candidate)) return candidate
  }

  throw new Error('A collision-free imported asset ID could not be created.')
}
