import { describe, expect, it } from 'vitest'

import { materializeGeneratedImageSource } from './generatedImageSource'

function createPngBytes(width = 320, height = 180): Uint8Array {
  const bytes = new Uint8Array(24)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10])
  bytes.set([0, 0, 0, 13, 73, 72, 68, 82], 8)
  new DataView(bytes.buffer).setUint32(16, width)
  new DataView(bytes.buffer).setUint32(20, height)
  return bytes
}

function encodeBase64(bytes: Uint8Array): string {
  return globalThis.btoa(
    Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''),
  )
}

describe('generated image source intake', () => {
  it('accepts a typed Blob and gives it the requested file name', async () => {
    const source = new Blob([new Uint8Array(createPngBytes()).buffer], {
      type: 'image/png',
    })
    const result = materializeGeneratedImageSource(
      source,
      'generated-panel.png',
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.file.name).toBe('generated-panel.png')
    expect(result.file.type).toBe('image/png')
    expect(new Uint8Array(await result.file.arrayBuffer())).toEqual(
      createPngBytes(),
    )
  })

  it('accepts both a data URL and raw base64', async () => {
    const base64 = encodeBase64(createPngBytes())
    const dataUrl = materializeGeneratedImageSource(
      { kind: 'data-url', dataUrl: `data:image/png;base64,${base64}` },
      'from-data-url.png',
    )
    const raw = materializeGeneratedImageSource(
      { kind: 'base64', base64, mediaType: 'image/png' },
      'from-base64.png',
    )

    expect(dataUrl.ok && dataUrl.file.type).toBe('image/png')
    expect(raw.ok && raw.file.type).toBe('image/png')
    if (!dataUrl.ok || !raw.ok) return
    expect(await dataUrl.file.arrayBuffer()).toEqual(await raw.file.arrayBuffer())
  })

  it('rejects malformed or unsupported generated sources', () => {
    expect(
      materializeGeneratedImageSource(
        {
          kind: 'data-url',
          dataUrl: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
        },
        'unsafe.svg',
      ),
    ).toMatchObject({ ok: false })
    expect(
      materializeGeneratedImageSource(
        { kind: 'base64', base64: 'not base64!', mediaType: 'image/png' },
        'broken.png',
      ),
    ).toMatchObject({ ok: false })
  })
})
