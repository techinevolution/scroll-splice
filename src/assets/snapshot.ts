import {
  ASSET_LIBRARY_SNAPSHOT_FORMAT_VERSION,
  type AssetLibrarySnapshot,
  type CreatorAssetCategorySnapshot,
  type ImportedImageSnapshot,
} from './types'
import {
  isImportedImageMediaType,
  isGeneratedImageMetadata,
  isPositiveInteger,
  isRecord,
  isSafeAssetId,
  isSafeCreatorCategoryName,
  isSafeDisplayName,
  isValidIsoDate,
  type RecordValue,
} from './validation'

export type AssetLibrarySnapshotParseResult =
  | { readonly ok: true; readonly snapshot: AssetLibrarySnapshot }
  | {
      readonly ok: false
      readonly reason: 'corrupt' | 'unsupported-version'
      readonly message: string
    }

export function parseAssetLibrarySnapshot(
  value: unknown,
): AssetLibrarySnapshotParseResult {
  if (!isRecord(value)) {
    return corruptSnapshot('The asset-library snapshot is not an object.')
  }

  if (value.formatVersion !== ASSET_LIBRARY_SNAPSHOT_FORMAT_VERSION) {
    return typeof value.formatVersion === 'number'
      ? {
          ok: false,
          reason: 'unsupported-version',
          message: `Asset-library snapshot format ${value.formatVersion} is not supported by this build.`,
        }
      : corruptSnapshot('The asset-library snapshot has no valid format version.')
  }

  if (
    !isValidIsoDate(value.savedAt) ||
    !Array.isArray(value.creatorCategories) ||
    !Array.isArray(value.importedImages)
  ) {
    return corruptSnapshot('The asset-library snapshot header is invalid.')
  }

  const creatorCategories = value.creatorCategories.map(parseCreatorCategory)

  if (creatorCategories.some((category) => category === undefined)) {
    return corruptSnapshot('The snapshot contains an invalid creator category.')
  }

  const validCategories = creatorCategories as CreatorAssetCategorySnapshot[]
  const categoryIds = new Set(validCategories.map(({ id }) => id))
  const categoryNames = new Set(
    validCategories.map(({ name }) => name.toLocaleLowerCase()),
  )

  if (
    categoryIds.size !== validCategories.length ||
    categoryNames.size !== validCategories.length
  ) {
    return corruptSnapshot(
      'Creator category IDs and names must be unique.',
    )
  }

  const importedImages = value.importedImages.map(parseImportedImage)

  if (importedImages.some((image) => image === undefined)) {
    return corruptSnapshot('The snapshot contains an invalid imported image.')
  }

  const validImages = importedImages as ImportedImageSnapshot[]
  const imageIds = new Set(validImages.map(({ id }) => id))

  if (imageIds.size !== validImages.length) {
    return corruptSnapshot('Imported image IDs must be unique.')
  }

  if (
    validImages.some(
      ({ creatorCategoryId }) =>
        creatorCategoryId !== null && !categoryIds.has(creatorCategoryId),
    )
  ) {
    return corruptSnapshot(
      'An imported image references a missing creator category.',
    )
  }

  return {
    ok: true,
    snapshot: {
      formatVersion: ASSET_LIBRARY_SNAPSHOT_FORMAT_VERSION,
      savedAt: value.savedAt,
      creatorCategories: validCategories,
      importedImages: validImages,
    },
  }
}

function parseCreatorCategory(
  value: unknown,
): CreatorAssetCategorySnapshot | undefined {
  if (
    !isRecord(value) ||
    !isSafeAssetId(value.id) ||
    !isSafeCreatorCategoryName(value.name) ||
    !isValidIsoDate(value.createdAt)
  ) {
    return undefined
  }

  return {
    id: value.id,
    name: value.name,
    createdAt: value.createdAt,
  }
}

function parseImportedImage(value: unknown): ImportedImageSnapshot | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const sourceBlob = readBlob(value)
  const generation =
    value.generation === undefined
      ? undefined
      : isGeneratedImageMetadata(value.generation)
        ? value.generation
        : null

  if (
    !sourceBlob ||
    !isSafeAssetId(value.id) ||
    !isSafeDisplayName(value.displayName) ||
    !isImportedImageMediaType(value.mediaType) ||
    !isPositiveInteger(value.byteSize) ||
    !isPositiveInteger(value.intrinsicWidth) ||
    !isPositiveInteger(value.intrinsicHeight) ||
    sourceBlob.size !== value.byteSize ||
    sourceBlob.type !== value.mediaType ||
    (value.creatorCategoryId !== null &&
      !isSafeAssetId(value.creatorCategoryId)) ||
    !isValidIsoDate(value.importedAt)
    || generation === null
  ) {
    return undefined
  }

  return {
    id: value.id,
    displayName: value.displayName,
    mediaType: value.mediaType,
    byteSize: value.byteSize,
    intrinsicWidth: value.intrinsicWidth,
    intrinsicHeight: value.intrinsicHeight,
    sourceBlob,
    creatorCategoryId: value.creatorCategoryId,
    importedAt: value.importedAt,
    ...(generation ? { generation } : {}),
  }
}

function readBlob(value: RecordValue): Blob | undefined {
  return typeof Blob !== 'undefined' && value.sourceBlob instanceof Blob
    ? value.sourceBlob
    : undefined
}

function corruptSnapshot(message: string): AssetLibrarySnapshotParseResult {
  return { ok: false, reason: 'corrupt', message }
}
