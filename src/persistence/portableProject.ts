import type { EpisodeDocument } from '../core/episode'
import { parseAssetLibrarySnapshot } from '../assets/snapshot'
import {
  ASSET_LIBRARY_SNAPSHOT_FORMAT_VERSION,
  MAX_IMPORTED_IMAGE_BYTES,
  type AssetLibrarySnapshot,
  type CreatorAssetCategorySnapshot,
  type ImportedImageMediaType,
  type ImportedImageSnapshot,
} from '../assets/types'
import {
  isImportedImageMediaType,
  isPositiveInteger,
  isRecord,
  isValidIsoDate,
  type RecordValue,
} from '../assets/validation'
import { parseEpisodeDocument } from './projectRepository'

export const PORTABLE_PROJECT_FORMAT_VERSION = 1 as const
export const PORTABLE_PROJECT_APPLICATION = 'ScrollSplice' as const
export const PORTABLE_PROJECT_FILE_EXTENSION = '.scrollsplice' as const
export const PORTABLE_PROJECT_MEDIA_TYPE =
  'application/vnd.scrollsplice.project+json' as const
export const MAX_PORTABLE_PROJECT_BYTES = 128 * 1024 * 1024
export const MAX_PORTABLE_PROJECT_SOURCE_BYTES = 96 * 1024 * 1024
export const MAX_PORTABLE_IMPORTED_IMAGES = 200
export const MAX_PORTABLE_CREATOR_CATEGORIES = 200

const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const BASE64_PATTERN =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/

export type PortableProjectFailureReason =
  | 'invalid-episode'
  | 'invalid-assets'
  | 'missing-asset'
  | 'unsupported-version'
  | 'corrupt'
  | 'too-large'
  | 'read-failed'
  | 'serialization-failed'

export interface PortableProjectFailure {
  readonly ok: false
  readonly reason: PortableProjectFailureReason
  readonly message: string
}

export type SerializePortableProjectResult =
  | {
      readonly ok: true
      readonly blob: Blob
      readonly byteSize: number
      readonly fileName: string
      readonly createdAt: string
    }
  | PortableProjectFailure

export type ParsePortableProjectResult =
  | {
      readonly ok: true
      readonly createdAt: string
      readonly episode: EpisodeDocument
      readonly assetLibrary: AssetLibrarySnapshot
    }
  | PortableProjectFailure

export interface SerializePortableProjectOptions {
  readonly now?: () => Date
}

interface PortableImportedImageV1 {
  readonly id: string
  readonly displayName: string
  readonly mediaType: ImportedImageMediaType
  readonly byteSize: number
  readonly intrinsicWidth: number
  readonly intrinsicHeight: number
  readonly creatorCategoryId: string | null
  readonly importedAt: string
  readonly sourceEncoding: 'base64'
  readonly sourceBase64: string
}

interface PortableAssetLibraryV1 {
  readonly formatVersion: typeof ASSET_LIBRARY_SNAPSHOT_FORMAT_VERSION
  readonly savedAt: string
  readonly creatorCategories: readonly CreatorAssetCategorySnapshot[]
  readonly importedImages: readonly PortableImportedImageV1[]
}

interface PortableProjectEnvelopeV1 {
  readonly packageFormatVersion: typeof PORTABLE_PROJECT_FORMAT_VERSION
  readonly application: typeof PORTABLE_PROJECT_APPLICATION
  readonly createdAt: string
  readonly episode: EpisodeDocument
  readonly assetLibrary: PortableAssetLibraryV1
}

export async function serializePortableProject(
  episode: EpisodeDocument,
  assetLibrary: AssetLibrarySnapshot,
  options: SerializePortableProjectOptions = {},
): Promise<SerializePortableProjectResult> {
  const parsedEpisode = parseEpisodeDocument(episode)

  if (!parsedEpisode.ok) {
    return portableFailure(
      parsedEpisode.reason === 'unsupported-version'
        ? 'unsupported-version'
        : 'invalid-episode',
      parsedEpisode.message,
    )
  }

  const parsedAssets = parseAssetLibrarySnapshot(assetLibrary)

  if (!parsedAssets.ok) {
    return portableFailure(
      parsedAssets.reason === 'unsupported-version'
        ? 'unsupported-version'
        : 'invalid-assets',
      parsedAssets.message,
    )
  }

  const bounded = validatePortableAssetBounds(parsedAssets.snapshot)

  if (!bounded.ok) {
    return bounded
  }

  const complete = validateImportedAssetReferences(
    parsedEpisode.episode,
    parsedAssets.snapshot,
  )

  if (!complete.ok) {
    return complete
  }

  let createdAt: string

  try {
    createdAt = (options.now ?? (() => new Date()))().toISOString()
  } catch {
    return portableFailure(
      'serialization-failed',
      'The portable project timestamp could not be created.',
    )
  }

  if (!isValidIsoDate(createdAt)) {
    return portableFailure(
      'serialization-failed',
      'The portable project timestamp is invalid.',
    )
  }

  const importedImages: PortableImportedImageV1[] = []

  try {
    for (const image of parsedAssets.snapshot.importedImages) {
      const sourceBytes = new Uint8Array(await image.sourceBlob.arrayBuffer())

      if (sourceBytes.byteLength !== image.byteSize) {
        return portableFailure(
          'invalid-assets',
          `Asset ${image.id} changed size while the project package was being created.`,
        )
      }

      importedImages.push({
        id: image.id,
        displayName: image.displayName,
        mediaType: image.mediaType,
        byteSize: image.byteSize,
        intrinsicWidth: image.intrinsicWidth,
        intrinsicHeight: image.intrinsicHeight,
        creatorCategoryId: image.creatorCategoryId,
        importedAt: image.importedAt,
        sourceEncoding: 'base64',
        sourceBase64: encodeBase64(sourceBytes),
      })
    }
  } catch {
    return portableFailure(
      'read-failed',
      'One or more imported asset files could not be read.',
    )
  }

  let serialized: string

  try {
    const envelope: PortableProjectEnvelopeV1 = {
      packageFormatVersion: PORTABLE_PROJECT_FORMAT_VERSION,
      application: PORTABLE_PROJECT_APPLICATION,
      createdAt,
      episode: parsedEpisode.episode,
      assetLibrary: {
        formatVersion: ASSET_LIBRARY_SNAPSHOT_FORMAT_VERSION,
        savedAt: parsedAssets.snapshot.savedAt,
        creatorCategories: parsedAssets.snapshot.creatorCategories,
        importedImages,
      },
    }
    serialized = JSON.stringify(envelope)
  } catch {
    return portableFailure(
      'serialization-failed',
      'The portable project package could not be serialized.',
    )
  }

  const byteSize = utf8ByteLength(serialized)

  if (byteSize > MAX_PORTABLE_PROJECT_BYTES) {
    return portableFailure(
      'too-large',
      `The portable project package exceeds the ${formatMiB(MAX_PORTABLE_PROJECT_BYTES)} MiB safety limit.`,
    )
  }

  return {
    ok: true,
    blob: new Blob([serialized], { type: PORTABLE_PROJECT_MEDIA_TYPE }),
    byteSize,
    fileName: createPortableProjectFileName(parsedEpisode.episode.name),
    createdAt,
  }
}

export async function parsePortableProject(
  input: string | Blob,
): Promise<ParsePortableProjectResult> {
  let serialized: string

  if (typeof input === 'string') {
    if (utf8ByteLength(input) > MAX_PORTABLE_PROJECT_BYTES) {
      return portableFailure(
        'too-large',
        `The portable project package exceeds the ${formatMiB(MAX_PORTABLE_PROJECT_BYTES)} MiB safety limit.`,
      )
    }

    serialized = input
  } else {
    if (input.size > MAX_PORTABLE_PROJECT_BYTES) {
      return portableFailure(
        'too-large',
        `The portable project package exceeds the ${formatMiB(MAX_PORTABLE_PROJECT_BYTES)} MiB safety limit.`,
      )
    }

    try {
      serialized = await input.text()
    } catch {
      return portableFailure(
        'read-failed',
        'The portable project file could not be read.',
      )
    }
  }

  let value: unknown

  try {
    value = JSON.parse(serialized) as unknown
  } catch {
    return portableFailure(
      'corrupt',
      'The portable project package is not valid JSON.',
    )
  }

  return parsePortableProjectEnvelope(value)
}

export function createPortableProjectFileName(episodeName: string): string {
  const safeName = Array.from(episodeName.trim(), (character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return codePoint <= 31 ||
      codePoint === 127 ||
      character === '/' ||
      character === '\\' ||
      character === ':'
      ? '-'
      : character
  })
    .join('')
    .replace(/\s+/g, ' ')
    .replace(/^[. ]+|[. ]+$/g, '')
    .slice(0, 80)

  return `${safeName || 'Untitled Episode'}${PORTABLE_PROJECT_FILE_EXTENSION}`
}

async function parsePortableProjectEnvelope(
  value: unknown,
): Promise<ParsePortableProjectResult> {
  if (!isRecord(value)) {
    return portableFailure('corrupt', 'The portable project is not an object.')
  }

  if (value.packageFormatVersion !== PORTABLE_PROJECT_FORMAT_VERSION) {
    return typeof value.packageFormatVersion === 'number'
      ? portableFailure(
          'unsupported-version',
          `Portable project format ${value.packageFormatVersion} is not supported by this build.`,
        )
      : portableFailure(
          'corrupt',
          'The portable project has no package format version.',
        )
  }

  if (
    !hasExactKeys(value, [
      'packageFormatVersion',
      'application',
      'createdAt',
      'episode',
      'assetLibrary',
    ]) ||
    value.application !== PORTABLE_PROJECT_APPLICATION ||
    !isValidIsoDate(value.createdAt)
  ) {
    return portableFailure('corrupt', 'The portable project metadata is invalid.')
  }

  const parsedEpisode = parseEpisodeDocument(value.episode)

  if (!parsedEpisode.ok) {
    return portableFailure(
      parsedEpisode.reason === 'unsupported-version'
        ? 'unsupported-version'
        : 'invalid-episode',
      parsedEpisode.message,
    )
  }

  const decodedAssets = decodePortableAssetLibrary(value.assetLibrary)

  if (!decodedAssets.ok) {
    return decodedAssets
  }

  const complete = validateImportedAssetReferences(
    parsedEpisode.episode,
    decodedAssets.snapshot,
  )

  if (!complete.ok) {
    return complete
  }

  return {
    ok: true,
    createdAt: value.createdAt,
    episode: parsedEpisode.episode,
    assetLibrary: decodedAssets.snapshot,
  }
}

function decodePortableAssetLibrary(
  value: unknown,
):
  | { readonly ok: true; readonly snapshot: AssetLibrarySnapshot }
  | PortableProjectFailure {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      'formatVersion',
      'savedAt',
      'creatorCategories',
      'importedImages',
    ])
  ) {
    return portableFailure(
      'corrupt',
      'The portable asset-library record is invalid.',
    )
  }

  if (value.formatVersion !== ASSET_LIBRARY_SNAPSHOT_FORMAT_VERSION) {
    return typeof value.formatVersion === 'number'
      ? portableFailure(
          'unsupported-version',
          `Asset-library snapshot format ${value.formatVersion} is not supported by this build.`,
        )
      : portableFailure(
          'corrupt',
          'The portable asset library has no format version.',
        )
  }

  if (
    !isValidIsoDate(value.savedAt) ||
    !Array.isArray(value.creatorCategories) ||
    !Array.isArray(value.importedImages) ||
    value.creatorCategories.length > MAX_PORTABLE_CREATOR_CATEGORIES ||
    value.importedImages.length > MAX_PORTABLE_IMPORTED_IMAGES
  ) {
    return portableFailure(
      'corrupt',
      'The portable asset-library header is invalid.',
    )
  }

  if (
    value.creatorCategories.some(
      (category) =>
        !isRecord(category) ||
        !hasExactKeys(category, ['id', 'name', 'createdAt']),
    )
  ) {
    return portableFailure(
      'corrupt',
      'The portable project contains invalid category metadata.',
    )
  }

  let totalSourceBytes = 0
  const importedImages: ImportedImageSnapshot[] = []

  for (const imageValue of value.importedImages) {
    if (!isRecord(imageValue)) {
      return portableFailure(
        'corrupt',
        'The portable project contains an invalid imported image.',
      )
    }

    const decodedImage = decodePortableImportedImage(imageValue)

    if (!decodedImage.ok) {
      return decodedImage
    }

    totalSourceBytes += decodedImage.image.byteSize

    if (totalSourceBytes > MAX_PORTABLE_PROJECT_SOURCE_BYTES) {
      return portableFailure(
        'too-large',
        `The imported sources exceed the ${formatMiB(MAX_PORTABLE_PROJECT_SOURCE_BYTES)} MiB package safety limit.`,
      )
    }

    importedImages.push(decodedImage.image)
  }

  const parsed = parseAssetLibrarySnapshot({
    formatVersion: ASSET_LIBRARY_SNAPSHOT_FORMAT_VERSION,
    savedAt: value.savedAt,
    creatorCategories: value.creatorCategories,
    importedImages,
  })

  return parsed.ok
    ? { ok: true, snapshot: parsed.snapshot }
    : portableFailure(
        parsed.reason === 'unsupported-version'
          ? 'unsupported-version'
          : 'invalid-assets',
        parsed.message,
      )
}

function decodePortableImportedImage(
  value: RecordValue,
):
  | { readonly ok: true; readonly image: ImportedImageSnapshot }
  | PortableProjectFailure {
  if (
    !hasExactKeys(value, [
      'id',
      'displayName',
      'mediaType',
      'byteSize',
      'intrinsicWidth',
      'intrinsicHeight',
      'creatorCategoryId',
      'importedAt',
      'sourceEncoding',
      'sourceBase64',
    ]) ||
    value.sourceEncoding !== 'base64' ||
    typeof value.sourceBase64 !== 'string' ||
    !isImportedImageMediaType(value.mediaType) ||
    !isPositiveInteger(value.byteSize) ||
    value.byteSize > MAX_IMPORTED_IMAGE_BYTES
  ) {
    return portableFailure(
      'corrupt',
      'The portable imported-image metadata is invalid.',
    )
  }

  const sourceBytes = decodeBase64(value.sourceBase64, value.byteSize)

  if (!sourceBytes) {
    return portableFailure(
      'corrupt',
      `The encoded bytes for imported asset ${String(value.id)} are invalid.`,
    )
  }

  return {
    ok: true,
    image: {
      id: value.id as string,
      displayName: value.displayName as string,
      mediaType: value.mediaType,
      byteSize: value.byteSize,
      intrinsicWidth: value.intrinsicWidth as number,
      intrinsicHeight: value.intrinsicHeight as number,
      sourceBlob: new Blob([sourceBytes], { type: value.mediaType }),
      creatorCategoryId: value.creatorCategoryId as string | null,
      importedAt: value.importedAt as string,
    },
  }
}

function validatePortableAssetBounds(
  snapshot: AssetLibrarySnapshot,
): { readonly ok: true } | PortableProjectFailure {
  if (
    snapshot.creatorCategories.length > MAX_PORTABLE_CREATOR_CATEGORIES ||
    snapshot.importedImages.length > MAX_PORTABLE_IMPORTED_IMAGES
  ) {
    return portableFailure(
      'too-large',
      'The asset library contains too many categories or imported images for one portable project.',
    )
  }

  const totalSourceBytes = snapshot.importedImages.reduce(
    (total, image) => total + image.byteSize,
    0,
  )

  return totalSourceBytes <= MAX_PORTABLE_PROJECT_SOURCE_BYTES
    ? { ok: true }
    : portableFailure(
        'too-large',
        `The imported sources exceed the ${formatMiB(MAX_PORTABLE_PROJECT_SOURCE_BYTES)} MiB package safety limit.`,
      )
}

function validateImportedAssetReferences(
  episode: EpisodeDocument,
  snapshot: AssetLibrarySnapshot,
): { readonly ok: true } | PortableProjectFailure {
  const importedAssetIds = new Set(
    snapshot.importedImages.map(({ id }) => id),
  )
  const missingAssetId = episode.elements.find(
    ({ assetReference }) =>
      assetReference.kind === 'imported' &&
      !importedAssetIds.has(assetReference.assetId),
  )?.assetReference

  return missingAssetId?.kind === 'imported'
    ? portableFailure(
        'missing-asset',
        `Imported asset ${missingAssetId.assetId} is referenced by the episode but missing from the portable asset library.`,
      )
    : { ok: true }
}

function encodeBase64(bytes: Uint8Array): string {
  let encoded = ''

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0
    const hasSecond = index + 1 < bytes.length
    const hasThird = index + 2 < bytes.length
    const second = bytes[index + 1] ?? 0
    const third = bytes[index + 2] ?? 0
    const combined = (first << 16) | (second << 8) | third

    encoded += BASE64_ALPHABET[(combined >>> 18) & 63]
    encoded += BASE64_ALPHABET[(combined >>> 12) & 63]
    encoded += hasSecond ? BASE64_ALPHABET[(combined >>> 6) & 63] : '='
    encoded += hasThird ? BASE64_ALPHABET[combined & 63] : '='
  }

  return encoded
}

function decodeBase64(
  encoded: string,
  expectedByteSize: number,
): Uint8Array<ArrayBuffer> | undefined {
  if (
    encoded.length === 0 ||
    !BASE64_PATTERN.test(encoded) ||
    getDecodedBase64Size(encoded) !== expectedByteSize
  ) {
    return undefined
  }

  const bytes = new Uint8Array(new ArrayBuffer(expectedByteSize))
  let byteIndex = 0

  for (let index = 0; index < encoded.length; index += 4) {
    const first = BASE64_ALPHABET.indexOf(encoded[index] ?? '')
    const second = BASE64_ALPHABET.indexOf(encoded[index + 1] ?? '')
    const thirdCharacter = encoded[index + 2] ?? '='
    const fourthCharacter = encoded[index + 3] ?? '='
    const third = thirdCharacter === '=' ? 0 : BASE64_ALPHABET.indexOf(thirdCharacter)
    const fourth =
      fourthCharacter === '=' ? 0 : BASE64_ALPHABET.indexOf(fourthCharacter)
    const combined = (first << 18) | (second << 12) | (third << 6) | fourth

    if (byteIndex < bytes.length) bytes[byteIndex++] = (combined >>> 16) & 255
    if (thirdCharacter !== '=' && byteIndex < bytes.length) {
      bytes[byteIndex++] = (combined >>> 8) & 255
    }
    if (fourthCharacter !== '=' && byteIndex < bytes.length) {
      bytes[byteIndex++] = combined & 255
    }
  }

  return byteIndex === expectedByteSize ? bytes : undefined
}

function getDecodedBase64Size(encoded: string): number {
  const padding = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0
  return (encoded.length / 4) * 3 - padding
}

function hasExactKeys(value: RecordValue, keys: readonly string[]): boolean {
  const actualKeys = Object.keys(value).sort()
  const expectedKeys = [...keys].sort()

  return (
    actualKeys.length === expectedKeys.length &&
    actualKeys.every((key, index) => key === expectedKeys[index])
  )
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

function formatMiB(bytes: number): number {
  return bytes / (1024 * 1024)
}

function portableFailure(
  reason: PortableProjectFailureReason,
  message: string,
): PortableProjectFailure {
  return { ok: false, reason, message }
}
