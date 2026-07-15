import { describe, expect, it } from 'vitest'

import {
  parseAssetDragPayload,
  serializeAssetDragPayload,
} from './dragPayload'

describe('asset drag payload', () => {
  it.each([
    { kind: 'built-in' as const, assetId: 'builtin-decoration-radiance-v1' },
    { kind: 'imported' as const, assetId: 'imported-image-123' },
  ])('round-trips one strict $kind reference', (payload) => {
    const serialized = serializeAssetDragPayload(payload)

    expect(serialized).toBe(JSON.stringify(payload))
    expect(parseAssetDragPayload(serialized ?? '')).toEqual(payload)
  })

  it.each([
    '',
    'not json',
    'null',
    '[]',
    '{}',
    JSON.stringify({ kind: 'built-in' }),
    JSON.stringify({ kind: 'unknown', assetId: 'source-1' }),
    JSON.stringify({ kind: 'built-in', assetId: ' source-1 ' }),
    JSON.stringify({ kind: 'built-in', assetId: 'source-1', extra: true }),
    JSON.stringify({ kind: 'built-in', assetId: 'x'.repeat(500) }),
  ])('rejects malformed or expanded payload %s', (serialized) => {
    expect(parseAssetDragPayload(serialized)).toBeUndefined()
  })

  it('refuses to serialize an invalid runtime value', () => {
    expect(
      serializeAssetDragPayload({ kind: 'built-in', assetId: ' ' }),
    ).toBeUndefined()
  })
})
