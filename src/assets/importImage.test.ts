import { describe, expect, it, vi } from 'vitest'

import {
  createSafeImageDisplayName,
  importBrowserImage,
  type BrowserImageFile,
} from './importImage'
import { MAX_IMPORTED_IMAGE_BYTES } from './types'

function writeUint16BigEndian(
  bytes: Uint8Array,
  offset: number,
  value: number,
): void {
  bytes[offset] = (value >>> 8) & 0xff
  bytes[offset + 1] = value & 0xff
}

function writeUint16LittleEndian(
  bytes: Uint8Array,
  offset: number,
  value: number,
): void {
  bytes[offset] = value & 0xff
  bytes[offset + 1] = (value >>> 8) & 0xff
}

function writeUint24LittleEndian(
  bytes: Uint8Array,
  offset: number,
  value: number,
): void {
  bytes[offset] = value & 0xff
  bytes[offset + 1] = (value >>> 8) & 0xff
  bytes[offset + 2] = (value >>> 16) & 0xff
}

function writeUint32BigEndian(
  bytes: Uint8Array,
  offset: number,
  value: number,
): void {
  bytes[offset] = (value >>> 24) & 0xff
  bytes[offset + 1] = (value >>> 16) & 0xff
  bytes[offset + 2] = (value >>> 8) & 0xff
  bytes[offset + 3] = value & 0xff
}

function writeUint32LittleEndian(
  bytes: Uint8Array,
  offset: number,
  value: number,
): void {
  bytes[offset] = value & 0xff
  bytes[offset + 1] = (value >>> 8) & 0xff
  bytes[offset + 2] = (value >>> 16) & 0xff
  bytes[offset + 3] = (value >>> 24) & 0xff
}

function writeAscii(bytes: Uint8Array, offset: number, value: string): void {
  Array.from(value, (character) => character.charCodeAt(0)).forEach(
    (character, index) => {
      bytes[offset + index] = character
    },
  )
}

function createPngHeader(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(33)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10])
  writeUint32BigEndian(bytes, 8, 13)
  writeAscii(bytes, 12, 'IHDR')
  writeUint32BigEndian(bytes, 16, width)
  writeUint32BigEndian(bytes, 20, height)
  bytes.set([8, 6, 0, 0, 0], 24)
  return bytes
}

function createJpegHeader(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(23)
  bytes.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08])
  writeUint16BigEndian(bytes, 7, height)
  writeUint16BigEndian(bytes, 9, width)
  bytes.set(
    [0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00],
    11,
  )
  bytes.set([0xff, 0xd9], 21)
  return bytes
}

function createWebpContainer(
  chunkName: 'VP8 ' | 'VP8L' | 'VP8X',
  chunkData: Uint8Array,
): Uint8Array {
  const paddedChunkSize = chunkData.length + (chunkData.length % 2)
  const bytes = new Uint8Array(20 + paddedChunkSize)
  writeAscii(bytes, 0, 'RIFF')
  writeUint32LittleEndian(bytes, 4, bytes.length - 8)
  writeAscii(bytes, 8, 'WEBP')
  writeAscii(bytes, 12, chunkName)
  writeUint32LittleEndian(bytes, 16, chunkData.length)
  bytes.set(chunkData, 20)
  return bytes
}

function createWebpExtendedHeader(width: number, height: number): Uint8Array {
  const data = new Uint8Array(10)
  writeUint24LittleEndian(data, 4, width - 1)
  writeUint24LittleEndian(data, 7, height - 1)
  return createWebpContainer('VP8X', data)
}

function createWebpLossyHeader(width: number, height: number): Uint8Array {
  const data = new Uint8Array(10)
  data.set([0x10, 0x00, 0x00, 0x9d, 0x01, 0x2a])
  writeUint16LittleEndian(data, 6, width)
  writeUint16LittleEndian(data, 8, height)
  return createWebpContainer('VP8 ', data)
}

function createWebpLosslessHeader(width: number, height: number): Uint8Array {
  const data = new Uint8Array(5)
  const packed = ((width - 1) | ((height - 1) << 14)) >>> 0
  data[0] = 0x2f
  writeUint32LittleEndian(data, 1, packed)
  return createWebpContainer('VP8L', data)
}

const VALID_HEADERS = {
  'image/png': createPngHeader(2400, 1600),
  'image/jpeg': createJpegHeader(2400, 1600),
  'image/webp': createWebpExtendedHeader(2400, 1600),
} as const

function createNamedBlob(
  bytes: readonly number[] | Uint8Array,
  type: string,
  name: string,
): BrowserImageFile {
  const source = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes)
  const buffer = new ArrayBuffer(source.byteLength)
  new Uint8Array(buffer).set(source)
  const blob = new Blob([buffer], { type })
  Object.defineProperty(blob, 'name', { value: name, enumerable: true })
  return blob as BrowserImageFile
}

describe('browser image import', () => {
  it.each(Object.entries(VALID_HEADERS))(
    'keeps original %s bytes and records decoded dimensions',
    async (mediaType, header) => {
      const file = createNamedBlob(
        header,
        mediaType,
        '../unsafe\\My\u0000 Image?.source',
      )
      const result = await importBrowserImage(file, {
        creatorCategoryId: 'creator-category-effects',
        createId: () => 'imported-stable-one',
        now: () => new Date('2026-07-15T18:00:00.000Z'),
        decodeDimensions: async () => ({ width: 2400, height: 1600 }),
      })

      expect(result).toMatchObject({
        ok: true,
        image: {
          id: 'imported-stable-one',
          displayName: 'My Image .source',
          mediaType,
          intrinsicWidth: 2400,
          intrinsicHeight: 1600,
          creatorCategoryId: 'creator-category-effects',
          importedAt: '2026-07-15T18:00:00.000Z',
        },
      })

      if (!result.ok) throw new Error(result.message)
      expect(result.image.sourceBlob).toBe(file)
      expect(result.image.byteSize).toBe(file.size)
    },
  )

  it.each([
    ['lossy VP8', createWebpLossyHeader(640, 480), 640, 480],
    ['lossless VP8L', createWebpLosslessHeader(1024, 768), 1024, 768],
    ['extended VP8X', createWebpExtendedHeader(2400, 1600), 2400, 1600],
  ])('reads %s WebP dimensions before full decode', async (_name, header, width, height) => {
    const decodeDimensions = vi.fn(async () => ({ width, height }))

    await expect(
      importBrowserImage(
        createNamedBlob(header, 'image/webp', 'source.webp'),
        {
          decodeDimensions,
          createId: () => 'imported-webp-test',
          now: () => new Date('2026-07-15T18:00:00.000Z'),
        },
      ),
    ).resolves.toMatchObject({
      ok: true,
      image: { intrinsicWidth: width, intrinsicHeight: height },
    })
    expect(decodeDimensions).toHaveBeenCalledOnce()
  })

  it.each(['image/svg+xml', 'image/gif', 'image/heic'])(
    'rejects the unsupported source type %s before decoding',
    async (mediaType) => {
      const file = createNamedBlob([1, 2, 3], mediaType, 'source.bin')
      let decoded = false
      const result = await importBrowserImage(file, {
        decodeDimensions: async () => {
          decoded = true
          return { width: 1, height: 1 }
        },
      })

      expect(result).toMatchObject({
        ok: false,
        reason: 'unsupported-type',
      })
      expect(decoded).toBe(false)
    },
  )

  it('rejects empty, oversized, and signature-mismatched files', async () => {
    const empty = createNamedBlob([], 'image/png', 'empty.png')
    const oversized = createNamedBlob(
      VALID_HEADERS['image/png'],
      'image/png',
      'large.png',
    )
    Object.defineProperty(oversized, 'size', {
      value: MAX_IMPORTED_IMAGE_BYTES + 1,
    })
    const disguisedSvg = createNamedBlob(
      Array.from(new TextEncoder().encode('<svg></svg>')),
      'image/png',
      'not-really-png.png',
    )

    await expect(importBrowserImage(empty)).resolves.toMatchObject({
      ok: false,
      reason: 'empty-file',
    })
    await expect(importBrowserImage(oversized)).resolves.toMatchObject({
      ok: false,
      reason: 'file-too-large',
    })
    await expect(importBrowserImage(disguisedSvg)).resolves.toMatchObject({
      ok: false,
      reason: 'signature-mismatch',
    })
  })

  it.each([
    ['image/png', createPngHeader(8_001, 5_000)],
    ['image/jpeg', createJpegHeader(8_001, 5_000)],
    ['image/webp', createWebpExtendedHeader(8_001, 5_000)],
  ])(
    'rejects header-declared oversized %s images before full decode',
    async (mediaType, header) => {
      const decodeDimensions = vi.fn(async () => ({
        width: 8_001,
        height: 5_000,
      }))

      await expect(
        importBrowserImage(
          createNamedBlob(header, mediaType, 'oversized-source'),
          { decodeDimensions },
        ),
      ).resolves.toMatchObject({ ok: false, reason: 'pixel-limit' })
      expect(decodeDimensions).not.toHaveBeenCalled()
    },
  )

  it.each([
    ['image/png', [137, 80, 78, 71, 13, 10, 26, 10]],
    ['image/jpeg', [0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11]],
    [
      'image/webp',
      [82, 73, 70, 70, 22, 0, 0, 0, 87, 69, 66, 80],
    ],
  ])('rejects malformed or truncated %s headers without decoding', async (mediaType, header) => {
    const decodeDimensions = vi.fn(async () => ({ width: 100, height: 100 }))

    await expect(
      importBrowserImage(
        createNamedBlob(header, mediaType, 'truncated-source'),
        { decodeDimensions },
      ),
    ).resolves.toMatchObject({ ok: false, reason: 'invalid-header' })
    expect(decodeDimensions).not.toHaveBeenCalled()
  })

  it('rejects decode failures, invalid dimensions, and more than 40M pixels', async () => {
    const file = createNamedBlob(
      createPngHeader(100, 100),
      'image/png',
      'valid.png',
    )

    await expect(
      importBrowserImage(file, {
        decodeDimensions: async () => {
          throw new Error('decode failed')
        },
      }),
    ).resolves.toMatchObject({ ok: false, reason: 'decode-failed' })
    await expect(
      importBrowserImage(file, {
        decodeDimensions: async () => ({ width: 0, height: 10 }),
      }),
    ).resolves.toMatchObject({ ok: false, reason: 'decode-failed' })
    await expect(
      importBrowserImage(file, {
        decodeDimensions: async () => ({ width: 8_001, height: 5_000 }),
      }),
    ).resolves.toMatchObject({ ok: false, reason: 'pixel-limit' })
  })

  it('rejects a decoded dimension mismatch after header preflight', async () => {
    const file = createNamedBlob(
      createPngHeader(320, 200),
      'image/png',
      'mismatch.png',
    )

    await expect(
      importBrowserImage(file, {
        decodeDimensions: async () => ({ width: 321, height: 200 }),
      }),
    ).resolves.toMatchObject({ ok: false, reason: 'decode-failed' })
  })

  it('rejects unsafe category and generated IDs', async () => {
    const file = createNamedBlob(
      createPngHeader(100, 100),
      'image/png',
      'valid.png',
    )
    const decodeDimensions = async () => ({ width: 100, height: 100 })

    await expect(
      importBrowserImage(file, {
        creatorCategoryId: '../unsafe',
        decodeDimensions,
      }),
    ).resolves.toMatchObject({ ok: false, reason: 'invalid-category' })
    await expect(
      importBrowserImage(file, {
        createId: () => 'not safe/id',
        decodeDimensions,
      }),
    ).resolves.toMatchObject({ ok: false, reason: 'invalid-id' })
  })
})

describe('safe imported image names', () => {
  it('removes path segments, control characters, and reserved punctuation', () => {
    const name = createSafeImageDisplayName(
      '../folder\\another/<bad>\u0000:name?.png',
    )

    expect(name).toBe('bad name .png')
    expect(name).not.toMatch(/[\\/<>:"|?*]/)
    expect(
      Array.from(name).some((character) => {
        const codePoint = character.codePointAt(0) ?? 0
        return codePoint <= 31 || codePoint === 127
      }),
    ).toBe(false)
  })

  it('uses a bounded fallback for an unusable name', () => {
    expect(createSafeImageDisplayName('\u0000?*')).toBe('Imported image')
    expect(createSafeImageDisplayName('x'.repeat(500))).toHaveLength(120)
  })
})
