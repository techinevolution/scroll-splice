export const BUILT_IN_ASSET_CATEGORY_IDS = [
  'speech-balloons',
  'decorations',
  'splatters',
] as const

export type BuiltInAssetCategoryId =
  (typeof BUILT_IN_ASSET_CATEGORY_IDS)[number]

export const IMPORTED_IMAGE_MEDIA_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const

export type ImportedImageMediaType =
  (typeof IMPORTED_IMAGE_MEDIA_TYPES)[number]

export const ASSET_LIBRARY_SNAPSHOT_FORMAT_VERSION = 1 as const
export const MAX_IMPORTED_IMAGE_BYTES = 20 * 1024 * 1024
export const MAX_IMPORTED_IMAGE_PIXELS = 40_000_000
export const MAX_ASSET_DISPLAY_NAME_LENGTH = 120
export const MAX_CREATOR_CATEGORY_NAME_LENGTH = 40
export const MAX_GENERATED_PROVIDER_LENGTH = 120
export const MAX_GENERATED_MODEL_LENGTH = 160
export const MAX_GENERATED_PROMPT_LENGTH = 8_000

export interface BuiltInAssetDefinition {
  readonly id: string
  readonly categoryId: BuiltInAssetCategoryId
  readonly displayName: string
  readonly mediaType: 'image/svg+xml'
  readonly intrinsicWidth: number
  readonly intrinsicHeight: number
  readonly source: string
}

export interface CreatorAssetCategorySnapshot {
  readonly id: string
  readonly name: string
  readonly createdAt: string
}

export interface GeneratedImageMetadata {
  readonly provider: string
  readonly model: string | null
  readonly prompt: string | null
  readonly generatedAt: string
}

export interface ImportedImageSnapshot {
  readonly id: string
  readonly displayName: string
  readonly mediaType: ImportedImageMediaType
  readonly byteSize: number
  readonly intrinsicWidth: number
  readonly intrinsicHeight: number
  readonly sourceBlob: Blob
  readonly creatorCategoryId: string | null
  readonly importedAt: string
  readonly generation?: GeneratedImageMetadata
}

export interface AssetLibrarySnapshot {
  readonly formatVersion: typeof ASSET_LIBRARY_SNAPSHOT_FORMAT_VERSION
  readonly savedAt: string
  readonly creatorCategories: readonly CreatorAssetCategorySnapshot[]
  readonly importedImages: readonly ImportedImageSnapshot[]
}
