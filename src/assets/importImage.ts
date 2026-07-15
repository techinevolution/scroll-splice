import {
  MAX_ASSET_DISPLAY_NAME_LENGTH,
  MAX_IMPORTED_IMAGE_BYTES,
  MAX_IMPORTED_IMAGE_PIXELS,
  type ImportedImageMediaType,
  type ImportedImageSnapshot,
} from './types'
import {
  isImportedImageMediaType,
  isPositiveInteger,
  isSafeAssetId,
  replaceControlCharacters,
} from './validation'

export type BrowserImageFile = Blob & { readonly name: string }

export interface DecodedImageDimensions {
  readonly width: number
  readonly height: number
}

export interface ImportBrowserImageOptions {
  readonly creatorCategoryId?: string | null
  readonly decodeDimensions?: (
    sourceBlob: Blob,
  ) => Promise<DecodedImageDimensions>
  readonly createId?: () => string
  readonly now?: () => Date
}

export type ImportBrowserImageResult =
  | { readonly ok: true; readonly image: ImportedImageSnapshot }
  | {
      readonly ok: false
      readonly reason:
        | 'invalid-file'
        | 'unsupported-type'
        | 'empty-file'
        | 'file-too-large'
        | 'signature-mismatch'
        | 'invalid-header'
        | 'decode-failed'
        | 'pixel-limit'
        | 'invalid-category'
        | 'invalid-id'
        | 'metadata-failed'
      readonly message: string
    }

export async function importBrowserImage(
  file: BrowserImageFile,
  options: ImportBrowserImageOptions = {},
): Promise<ImportBrowserImageResult> {
  if (!(file instanceof Blob) || typeof file.name !== 'string') {
    return failure('invalid-file', 'Choose a valid local image file.')
  }

  if (!isImportedImageMediaType(file.type)) {
    return failure(
      'unsupported-type',
      'Only PNG, JPEG, and WebP source images are supported.',
    )
  }

  if (file.size === 0) {
    return failure('empty-file', 'The selected image file is empty.')
  }

  if (file.size > MAX_IMPORTED_IMAGE_BYTES) {
    return failure(
      'file-too-large',
      'The selected image is larger than the 20 MiB source limit.',
    )
  }

  const creatorCategoryId = options.creatorCategoryId ?? null

  if (creatorCategoryId !== null && !isSafeAssetId(creatorCategoryId)) {
    return failure(
      'invalid-category',
      'The selected creator category is invalid.',
    )
  }

  let headerResult: ImageHeaderResult

  try {
    headerResult = await readImageHeader(file, file.type)
  } catch {
    return failure('invalid-file', 'The selected image could not be read.')
  }

  if (!headerResult.ok && headerResult.reason === 'signature-mismatch') {
    return failure(
      'signature-mismatch',
      'The file contents do not match its PNG, JPEG, or WebP type.',
    )
  }

  if (!headerResult.ok) {
    return failure(
      'invalid-header',
      'The selected image has a malformed or truncated image header.',
    )
  }

  const headerDimensions = headerResult.dimensions

  if (
    headerDimensions.width * headerDimensions.height >
    MAX_IMPORTED_IMAGE_PIXELS
  ) {
    return failure(
      'pixel-limit',
      'The selected image exceeds the 40-megapixel decoded-size limit.',
    )
  }

  let dimensions: DecodedImageDimensions

  try {
    dimensions = await (options.decodeDimensions ??
      decodeBrowserImageDimensions)(file)
  } catch {
    return failure(
      'decode-failed',
      'The selected image could not be decoded by this browser.',
    )
  }

  if (
    !isPositiveInteger(dimensions.width) ||
    !isPositiveInteger(dimensions.height)
  ) {
    return failure(
      'decode-failed',
      'The selected image reported invalid decoded dimensions.',
    )
  }

  if (dimensions.width * dimensions.height > MAX_IMPORTED_IMAGE_PIXELS) {
    return failure(
      'pixel-limit',
      'The selected image exceeds the 40-megapixel decoded-size limit.',
    )
  }

  if (!dimensionsMatchHeader(headerDimensions, dimensions, file.type)) {
    return failure(
      'decode-failed',
      'The decoded image dimensions do not match its image header.',
    )
  }

  let id: string
  let importedAt: string

  try {
    id = (options.createId ?? createStableImportedImageId)()
    importedAt = (options.now ?? (() => new Date()))().toISOString()
  } catch {
    return failure(
      'metadata-failed',
      'The imported image metadata could not be created.',
    )
  }

  if (!isSafeAssetId(id)) {
    return failure('invalid-id', 'The imported image ID is invalid.')
  }

  return {
    ok: true,
    image: {
      id,
      displayName: createSafeImageDisplayName(file.name),
      mediaType: file.type,
      byteSize: file.size,
      intrinsicWidth: dimensions.width,
      intrinsicHeight: dimensions.height,
      sourceBlob: file,
      creatorCategoryId,
      importedAt,
    },
  }
}

export function createSafeImageDisplayName(name: string): string {
  const fileName = name
    .normalize('NFKC')
    .replaceAll('\\', '/')
    .split('/')
    .at(-1)
  const safeName = replaceControlCharacters(fileName ?? '')
    .replace(/[<>:"|?*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return (safeName || 'Imported image').slice(
    0,
    MAX_ASSET_DISPLAY_NAME_LENGTH,
  )
}

export async function decodeBrowserImageDimensions(
  sourceBlob: Blob,
): Promise<DecodedImageDimensions> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(sourceBlob)

      try {
        return { width: bitmap.width, height: bitmap.height }
      } finally {
        bitmap.close()
      }
    } catch {
      // Some browsers support createImageBitmap but reject otherwise valid
      // source files. The native Image path below provides a safe fallback.
    }
  }

  if (
    typeof Image === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    throw new Error('No browser image decoder is available.')
  }

  const objectUrl = URL.createObjectURL(sourceBlob)

  try {
    return await new Promise<DecodedImageDimensions>((resolve, reject) => {
      const image = new Image()
      image.decoding = 'async'
      image.onload = () =>
        resolve({ width: image.naturalWidth, height: image.naturalHeight })
      image.onerror = () => reject(new Error('Image decode failed.'))
      image.src = objectUrl
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

type ImageHeaderResult =
  | { readonly ok: true; readonly dimensions: DecodedImageDimensions }
  | {
      readonly ok: false
      readonly reason: 'signature-mismatch' | 'invalid-header'
    }

async function readImageHeader(
  sourceBlob: Blob,
  mediaType: ImportedImageMediaType,
): Promise<ImageHeaderResult> {
  const bytes = new Uint8Array(await sourceBlob.arrayBuffer())
  let signatureMatches: boolean
  let dimensions: DecodedImageDimensions | undefined

  if (mediaType === 'image/png') {
    signatureMatches = matchesBytes(
      bytes,
      [137, 80, 78, 71, 13, 10, 26, 10],
    )
    dimensions = signatureMatches ? readPngDimensions(bytes) : undefined
  } else if (mediaType === 'image/jpeg') {
    signatureMatches = matchesBytes(bytes, [255, 216, 255])
    dimensions = signatureMatches ? readJpegDimensions(bytes) : undefined
  } else {
    signatureMatches =
      matchesBytes(bytes, [82, 73, 70, 70]) &&
      matchesBytes(bytes, [87, 69, 66, 80], 8)
    dimensions = signatureMatches ? readWebpDimensions(bytes) : undefined
  }

  if (!signatureMatches) {
    return { ok: false, reason: 'signature-mismatch' }
  }

  return dimensions
    ? { ok: true, dimensions }
    : { ok: false, reason: 'invalid-header' }
}

function readPngDimensions(
  bytes: Uint8Array,
): DecodedImageDimensions | undefined {
  if (
    bytes.length < 24 ||
    readUint32BigEndian(bytes, 8) !== 13 ||
    !matchesBytes(bytes, [73, 72, 68, 82], 12)
  ) {
    return undefined
  }

  return createDimensions(
    readUint32BigEndian(bytes, 16),
    readUint32BigEndian(bytes, 20),
  )
}

function readJpegDimensions(
  bytes: Uint8Array,
): DecodedImageDimensions | undefined {
  let offset = 2

  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      return undefined
    }

    while (bytes[offset] === 0xff) {
      offset += 1
    }

    const marker = bytes[offset]

    if (marker === undefined || marker === 0x00) {
      return undefined
    }

    offset += 1

    if (
      marker === 0xd8 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      continue
    }

    if (marker === 0xd9 || marker === 0xda) {
      return undefined
    }

    const segmentLength = readUint16BigEndian(bytes, offset)

    if (
      segmentLength === undefined ||
      segmentLength < 2 ||
      offset + segmentLength > bytes.length
    ) {
      return undefined
    }

    if (isJpegStartOfFrameMarker(marker)) {
      if (segmentLength < 8) {
        return undefined
      }

      return createDimensions(
        readUint16BigEndian(bytes, offset + 5),
        readUint16BigEndian(bytes, offset + 3),
      )
    }

    offset += segmentLength
  }

  return undefined
}

function isJpegStartOfFrameMarker(marker: number): boolean {
  return (
    marker >= 0xc0 &&
    marker <= 0xcf &&
    marker !== 0xc4 &&
    marker !== 0xc8 &&
    marker !== 0xcc
  )
}

function readWebpDimensions(
  bytes: Uint8Array,
): DecodedImageDimensions | undefined {
  const riffSize = readUint32LittleEndian(bytes, 4)

  if (riffSize === undefined || riffSize < 4) {
    return undefined
  }

  const riffEnd = riffSize + 8

  if (riffEnd > bytes.length) {
    return undefined
  }

  let chunkOffset = 12

  while (chunkOffset + 8 <= riffEnd) {
    const chunkSize = readUint32LittleEndian(bytes, chunkOffset + 4)

    if (chunkSize === undefined) {
      return undefined
    }

    const dataOffset = chunkOffset + 8
    const dataEnd = dataOffset + chunkSize

    if (dataEnd > riffEnd) {
      return undefined
    }

    if (matchesBytes(bytes, [86, 80, 56, 88], chunkOffset)) {
      return readWebpExtendedDimensions(bytes, dataOffset, chunkSize)
    }

    if (matchesBytes(bytes, [86, 80, 56, 76], chunkOffset)) {
      return readWebpLosslessDimensions(bytes, dataOffset, chunkSize)
    }

    if (matchesBytes(bytes, [86, 80, 56, 32], chunkOffset)) {
      return readWebpLossyDimensions(bytes, dataOffset, chunkSize)
    }

    chunkOffset = dataEnd + (chunkSize % 2)
  }

  return undefined
}

function readWebpExtendedDimensions(
  bytes: Uint8Array,
  offset: number,
  chunkSize: number,
): DecodedImageDimensions | undefined {
  if (chunkSize !== 10) {
    return undefined
  }

  const widthMinusOne = readUint24LittleEndian(bytes, offset + 4)
  const heightMinusOne = readUint24LittleEndian(bytes, offset + 7)

  return createDimensions(
    widthMinusOne === undefined ? undefined : widthMinusOne + 1,
    heightMinusOne === undefined ? undefined : heightMinusOne + 1,
  )
}

function readWebpLosslessDimensions(
  bytes: Uint8Array,
  offset: number,
  chunkSize: number,
): DecodedImageDimensions | undefined {
  if (chunkSize < 5 || bytes[offset] !== 0x2f) {
    return undefined
  }

  const packed = readUint32LittleEndian(bytes, offset + 1)

  if (packed === undefined || packed >>> 29 !== 0) {
    return undefined
  }

  return createDimensions(
    (packed & 0x3fff) + 1,
    ((packed >>> 14) & 0x3fff) + 1,
  )
}

function readWebpLossyDimensions(
  bytes: Uint8Array,
  offset: number,
  chunkSize: number,
): DecodedImageDimensions | undefined {
  if (
    chunkSize < 10 ||
    (bytes[offset] ?? 1) & 1 ||
    !matchesBytes(bytes, [0x9d, 0x01, 0x2a], offset + 3)
  ) {
    return undefined
  }

  const encodedWidth = readUint16LittleEndian(bytes, offset + 6)
  const encodedHeight = readUint16LittleEndian(bytes, offset + 8)

  return createDimensions(
    encodedWidth === undefined ? undefined : encodedWidth & 0x3fff,
    encodedHeight === undefined ? undefined : encodedHeight & 0x3fff,
  )
}

function dimensionsMatchHeader(
  header: DecodedImageDimensions,
  decoded: DecodedImageDimensions,
  mediaType: ImportedImageMediaType,
): boolean {
  const exactMatch =
    header.width === decoded.width && header.height === decoded.height
  const orientationSwappedJpeg =
    mediaType === 'image/jpeg' &&
    header.width === decoded.height &&
    header.height === decoded.width

  return exactMatch || orientationSwappedJpeg
}

function createDimensions(
  width: number | undefined,
  height: number | undefined,
): DecodedImageDimensions | undefined {
  return isPositiveInteger(width) && isPositiveInteger(height)
    ? { width, height }
    : undefined
}

function readUint16BigEndian(
  bytes: Uint8Array,
  offset: number,
): number | undefined {
  const first = bytes[offset]
  const second = bytes[offset + 1]

  return first === undefined || second === undefined
    ? undefined
    : first * 0x100 + second
}

function readUint16LittleEndian(
  bytes: Uint8Array,
  offset: number,
): number | undefined {
  const first = bytes[offset]
  const second = bytes[offset + 1]

  return first === undefined || second === undefined
    ? undefined
    : first + second * 0x100
}

function readUint24LittleEndian(
  bytes: Uint8Array,
  offset: number,
): number | undefined {
  const first = bytes[offset]
  const second = bytes[offset + 1]
  const third = bytes[offset + 2]

  return first === undefined || second === undefined || third === undefined
    ? undefined
    : first + second * 0x100 + third * 0x1_0000
}

function readUint32BigEndian(
  bytes: Uint8Array,
  offset: number,
): number | undefined {
  const first = bytes[offset]
  const second = bytes[offset + 1]
  const third = bytes[offset + 2]
  const fourth = bytes[offset + 3]

  return first === undefined ||
    second === undefined ||
    third === undefined ||
    fourth === undefined
    ? undefined
    : first * 0x1_000000 +
        second * 0x1_0000 +
        third * 0x100 +
        fourth
}

function readUint32LittleEndian(
  bytes: Uint8Array,
  offset: number,
): number | undefined {
  const first = bytes[offset]
  const second = bytes[offset + 1]
  const third = bytes[offset + 2]
  const fourth = bytes[offset + 3]

  return first === undefined ||
    second === undefined ||
    third === undefined ||
    fourth === undefined
    ? undefined
    : first +
        second * 0x100 +
        third * 0x1_0000 +
        fourth * 0x1_000000
}

function matchesBytes(
  actual: Uint8Array,
  expected: readonly number[],
  offset = 0,
): boolean {
  return expected.every((value, index) => actual[offset + index] === value)
}

function createStableImportedImageId(): string {
  const randomUUID = globalThis.crypto?.randomUUID

  return randomUUID
    ? `imported-${randomUUID.call(globalThis.crypto)}`
    : `imported-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function failure<Reason extends string>(
  reason: Reason,
  message: string,
): { readonly ok: false; readonly reason: Reason; readonly message: string } {
  return { ok: false, reason, message }
}
