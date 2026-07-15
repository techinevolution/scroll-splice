export const ASSET_DRAG_MIME_TYPE =
  'application/x-scrollsplice-asset-v1+json' as const

export type AssetDragKind = 'built-in' | 'imported'

export interface AssetDragPayload {
  readonly kind: AssetDragKind
  readonly assetId: string
}

const MAX_DRAG_ASSET_ID_LENGTH = 256
const MAX_SERIALIZED_DRAG_PAYLOAD_LENGTH = 512

function isAssetDragPayload(value: unknown): value is AssetDragPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const record = value as Record<string, unknown>
  const keys = Object.keys(record).sort()

  return (
    keys.length === 2 &&
    keys[0] === 'assetId' &&
    keys[1] === 'kind' &&
    (record.kind === 'built-in' || record.kind === 'imported') &&
    typeof record.assetId === 'string' &&
    record.assetId.length > 0 &&
    record.assetId.length <= MAX_DRAG_ASSET_ID_LENGTH &&
    record.assetId === record.assetId.trim()
  )
}

export function serializeAssetDragPayload(
  payload: AssetDragPayload,
): string | undefined {
  return isAssetDragPayload(payload) ? JSON.stringify(payload) : undefined
}

export function parseAssetDragPayload(
  serialized: string,
): AssetDragPayload | undefined {
  if (
    !serialized ||
    serialized.length > MAX_SERIALIZED_DRAG_PAYLOAD_LENGTH
  ) {
    return undefined
  }

  try {
    const parsed: unknown = JSON.parse(serialized)
    return isAssetDragPayload(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}
