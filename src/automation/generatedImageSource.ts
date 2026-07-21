import type { BrowserImageFile, ImportedImageMediaType } from '../assets'
import { isImportedImageMediaType } from '../assets/validation'

export type GeneratedImageSource =
  | Blob
  | {
      readonly kind: 'blob'
      readonly blob: Blob
      readonly mediaType?: ImportedImageMediaType
    }
  | { readonly kind: 'data-url'; readonly dataUrl: string }
  | {
      readonly kind: 'base64'
      readonly base64: string
      readonly mediaType: ImportedImageMediaType
    }

export type MaterializeGeneratedImageResult =
  | { readonly ok: true; readonly file: BrowserImageFile }
  | { readonly ok: false; readonly message: string }

const DATA_URL_PATTERN =
  /^data:(image\/(?:png|jpeg|webp));base64,([a-z0-9+/=\s]+)$/i
const BASE64_PATTERN =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/

export function materializeGeneratedImageSource(
  source: GeneratedImageSource,
  displayName: string,
): MaterializeGeneratedImageResult {
  if (source instanceof Blob) {
    return materializeBlob(source, undefined, displayName)
  }

  if (!source || typeof source !== 'object' || !('kind' in source)) {
    return failure('The generated image source is invalid.')
  }

  if (source.kind === 'blob') {
    if (!(source.blob instanceof Blob)) {
      return failure('The generated image Blob is invalid.')
    }

    return materializeBlob(source.blob, source.mediaType, displayName)
  }

  let encoded: string
  let mediaType: ImportedImageMediaType

  if (source.kind === 'data-url' && typeof source.dataUrl === 'string') {
    const match = DATA_URL_PATTERN.exec(source.dataUrl)
    const matchedMediaType = match?.[1]?.toLowerCase()

    if (!match || !isImportedImageMediaType(matchedMediaType)) {
      return failure(
        'Use a base64 PNG, JPEG, or WebP data URL for generated images.',
      )
    }

    mediaType = matchedMediaType
    encoded = match[2] ?? ''
  } else if (
    source.kind === 'base64' &&
    typeof source.base64 === 'string' &&
    isImportedImageMediaType(source.mediaType)
  ) {
    mediaType = source.mediaType
    encoded = source.base64
  } else {
    return failure('The generated image source is invalid.')
  }

  const bytes = decodeBase64(encoded)

  if (!bytes) {
    return failure('The generated image base64 is malformed or empty.')
  }

  return createNamedFile(
    new Blob([new Uint8Array(bytes).buffer], { type: mediaType }),
    displayName,
  )
}

function materializeBlob(
  source: Blob,
  requestedMediaType: ImportedImageMediaType | undefined,
  displayName: string,
): MaterializeGeneratedImageResult {
  const mediaType = source.type || requestedMediaType

  if (!isImportedImageMediaType(mediaType)) {
    return failure('Generated images must be PNG, JPEG, or WebP.')
  }

  if (source.type && requestedMediaType && source.type !== requestedMediaType) {
    return failure('The generated image Blob type does not match its metadata.')
  }

  return createNamedFile(new Blob([source], { type: mediaType }), displayName)
}

function createNamedFile(
  blob: Blob,
  displayName: string,
): MaterializeGeneratedImageResult {
  if (blob.size === 0) return failure('The generated image is empty.')

  const file = blob as BrowserImageFile

  try {
    Object.defineProperty(file, 'name', {
      configurable: false,
      enumerable: true,
      value: displayName,
    })
  } catch {
    return failure('The generated image could not be prepared for import.')
  }

  return { ok: true, file }
}

function decodeBase64(encoded: string): Uint8Array | undefined {
  const normalized = encoded.replace(/\s/g, '')

  if (
    normalized.length === 0 ||
    normalized.length % 4 !== 0 ||
    !BASE64_PATTERN.test(normalized) ||
    typeof globalThis.atob !== 'function'
  ) {
    return undefined
  }

  const estimatedByteSize =
    (normalized.length / 4) * 3 -
    (normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0)

  if (estimatedByteSize <= 0 || !Number.isSafeInteger(estimatedByteSize)) {
    return undefined
  }

  try {
    const binary = globalThis.atob(normalized)
    const bytes = new Uint8Array(binary.length)

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }

    return bytes
  } catch {
    return undefined
  }
}

function failure(message: string): MaterializeGeneratedImageResult {
  return { ok: false, message }
}
