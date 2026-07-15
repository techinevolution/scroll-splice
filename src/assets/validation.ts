import {
  IMPORTED_IMAGE_MEDIA_TYPES,
  MAX_ASSET_DISPLAY_NAME_LENGTH,
  MAX_CREATOR_CATEGORY_NAME_LENGTH,
  type ImportedImageMediaType,
} from './types'

const SAFE_ASSET_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,79}$/i

export type RecordValue = Readonly<Record<string, unknown>>

export function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isSafeAssetId(value: unknown): value is string {
  return typeof value === 'string' && SAFE_ASSET_ID_PATTERN.test(value)
}

export function isSafeDisplayName(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_ASSET_DISPLAY_NAME_LENGTH &&
    value === value.trim() &&
    !hasControlCharacters(value)
  )
}

export function isSafeCreatorCategoryName(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_CREATOR_CATEGORY_NAME_LENGTH &&
    value === value.trim() &&
    !hasControlCharacters(value)
  )
}

export function isImportedImageMediaType(
  value: unknown,
): value is ImportedImageMediaType {
  return (
    typeof value === 'string' &&
    IMPORTED_IMAGE_MEDIA_TYPES.some((mediaType) => mediaType === value)
  )
}

export function isValidIsoDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    Number.isFinite(Date.parse(value))
  )
}

export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

export function replaceControlCharacters(value: string): string {
  return Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return codePoint <= 31 || codePoint === 127 ? ' ' : character
  }).join('')
}

function hasControlCharacters(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return codePoint <= 31 || codePoint === 127
  })
}
