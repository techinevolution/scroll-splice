import { afterEach, describe, expect, it, vi } from 'vitest'

import { WEBTOON_CANVAS_OBSERVED_PROFILE } from './profiles'
import {
  createEpisodeSlicePlan,
  createExportFileName,
  elementIntersectsSliceRange,
  preflightEpisodeExport,
  renderEpisodeSlices,
} from './renderEpisode'
import {
  BLANK_EPISODE_LAYER_PLANE_IDS,
  createBlankEpisode,
} from '../core/createBlankEpisode'
import type { EpisodeDocument, ImageElement, ShapeElement } from '../core/episode'

afterEach(() => {
  vi.unstubAllGlobals()
})

function createShapeElement(
  overrides: Partial<ShapeElement> = {},
): ShapeElement {
  return {
    id: 'shape-render-test',
    name: 'Shape render test',
    layerPlaneId: BLANK_EPISODE_LAYER_PLANE_IDS.content,
    bounds: { x: 0, y: 1300, width: 100, height: 20 },
    visible: true,
    locked: false,
    zIndex: 0,
    opacity: 1,
    blendMode: 'normal',
    transform: { rotationDegrees: 90, flipX: false, flipY: false },
    overflow: 'bleed',
    assetReference: {
      kind: 'synthetic',
      generatorId: 'shape-render-test',
    },
    type: 'shape',
    shape: 'rectangle',
    fill: { kind: 'solid', color: '#000000' },
    ...overrides,
  }
}

function createImageElement(
  overrides: Partial<ImageElement> = {},
): ImageElement {
  return {
    id: 'image-render-test',
    name: 'Image render test',
    layerPlaneId: BLANK_EPISODE_LAYER_PLANE_IDS.content,
    bounds: { x: 10, y: 20, width: 200, height: 200 },
    visible: true,
    locked: false,
    zIndex: 0,
    opacity: 0.4,
    blendMode: 'multiply',
    transform: { rotationDegrees: 90, flipX: true, flipY: false },
    overflow: 'bleed',
    assetReference: { kind: 'built-in', assetId: 'image-render-test' },
    type: 'image',
    presentation: 'cover',
    frame: {
      mask: { kind: 'rectangle', cornerRadius: 24 },
      crop: { focusX: 0.75, focusY: 0.25, zoom: 2 },
      border: { color: '#FF00AA', width: 6 },
    },
    ...overrides,
  }
}

function installCanvasRendererMock() {
  const context = {
    beginPath: vi.fn(),
    clip: vi.fn(),
    closePath: vi.fn(),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    rect: vi.fn(),
    restore: vi.fn(),
    rotate: vi.fn(),
    roundRect: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    setLineDash: vi.fn(),
    setTransform: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
    translate: vi.fn(),
    fillStyle: '#000000',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    lineJoin: 'miter',
    lineWidth: 1,
    strokeStyle: '#000000',
  }
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
    toBlob: vi.fn((callback: BlobCallback, type?: string) => {
      callback(new Blob(['rendered'], { type }))
    }),
  }

  class FakeImage {
    complete = true
    decoding = 'async'
    height = 200
    naturalHeight = 200
    naturalWidth = 400
    src = ''
    width = 400

    async decode() {
      return undefined
    }
  }

  vi.stubGlobal('document', {
    createElement: vi.fn(() => canvas),
  })
  vi.stubGlobal('Image', FakeImage)

  return { canvas, context }
}

describe('createExportFileName', () => {
  it('creates deterministic English-letter-and-number sequence names', () => {
    expect(createExportFileName('Signal in the Fog!', 0, 12, 'image/png')).toBe(
      'SignalintheFog001.png',
    )
    expect(createExportFileName('根とテーブル', 4, 8, 'image/jpeg')).toBe(
      'ScrollSpliceEpisode005.jpg',
    )
  })
})

describe('createEpisodeSlicePlan', () => {
  it('creates deterministic profile cuts and accepts reviewed interior cuts', () => {
    const episode = {
      ...createBlankEpisode('episode-export-plan'),
      logicalHeight: 3000,
    }

    expect(
      createEpisodeSlicePlan(episode, WEBTOON_CANVAS_OBSERVED_PROFILE).map(
        ({ startLogicalY, endLogicalY, outputHeight }) => ({
          startLogicalY,
          endLogicalY,
          outputHeight,
        }),
      ),
    ).toEqual([
      { startLogicalY: 0, endLogicalY: 1280, outputHeight: 1280 },
      { startLogicalY: 1280, endLogicalY: 2560, outputHeight: 1280 },
      { startLogicalY: 2560, endLogicalY: 3000, outputHeight: 440 },
    ])

    expect(
      createEpisodeSlicePlan(
        episode,
        WEBTOON_CANVAS_OBSERVED_PROFILE,
        [1200, 2400],
      ).map(({ startLogicalY, endLogicalY }) => ({
        startLogicalY,
        endLogicalY,
      })),
    ).toEqual([
      { startLogicalY: 0, endLogicalY: 1200 },
      { startLogicalY: 1200, endLogicalY: 2400 },
      { startLogicalY: 2400, endLogicalY: 3000 },
    ])
  })

  it('rejects unordered or exterior creator cuts', () => {
    const episode = createBlankEpisode('episode-invalid-export-plan')

    expect(() =>
      createEpisodeSlicePlan(
        episode,
        WEBTOON_CANVAS_OBSERVED_PROFILE,
        [800, 700],
      ),
    ).toThrow(/finite, increasing/)
    expect(() =>
      createEpisodeSlicePlan(
        episode,
        WEBTOON_CANVAS_OBSERVED_PROFILE,
        [episode.logicalHeight],
      ),
    ).toThrow(/inside the episode/)
  })
})

describe('v6 render geometry', () => {
  it('includes a rotated bleed element when its visual bounds cross a slice', () => {
    const element = createShapeElement()
    const firstSlice = {
      index: 0,
      startLogicalY: 0,
      endLogicalY: 1280,
      outputWidth: 800,
      outputHeight: 1280,
    }

    expect(element.bounds.y).toBeGreaterThanOrEqual(firstSlice.endLogicalY)
    expect(elementIntersectsSliceRange(element, firstSlice)).toBe(true)
    expect(
      elementIntersectsSliceRange(element, {
        ...firstSlice,
        startLogicalY: 0,
        endLogicalY: 1200,
        outputHeight: 1200,
      }),
    ).toBe(false)
  })

  it('renders cover crop, rounded mask, border, rotation, flip, alpha, and blend', async () => {
    const { context } = installCanvasRendererMock()
    const imageElement = createImageElement()
    const episode: EpisodeDocument = {
      ...createBlankEpisode('episode-v6-render'),
      logicalHeight: 400,
      elements: [imageElement],
    }

    const result = await renderEpisodeSlices({
      episode,
      profile: WEBTOON_CANVAS_OBSERVED_PROFILE,
      mediaType: 'image/png',
      resolveImageSource: () => 'blob:image-render-test',
    })

    expect(result.missingSourceElementIds).toEqual([])
    expect(result.files).toHaveLength(1)
    expect(context.translate).toHaveBeenNthCalledWith(1, 110, 120)
    expect(context.rotate).toHaveBeenCalledWith(Math.PI / 2)
    expect(context.scale).toHaveBeenCalledWith(-1, 1)
    expect(context.translate).toHaveBeenNthCalledWith(2, -110, -120)
    expect(context.roundRect).toHaveBeenCalledTimes(2)
    expect(context.roundRect).toHaveBeenCalledWith(10, 20, 200, 200, 24)
    expect(context.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      250,
      0,
      100,
      100,
      10,
      20,
      200,
      200,
    )
    expect(context.stroke).toHaveBeenCalledTimes(1)
    expect(context.strokeStyle).toBe('#FF00AA')
    expect(context.lineWidth).toBe(6)
    expect(context.globalAlpha).toBe(0.4)
    expect(context.globalCompositeOperation).toBe('multiply')
  })

  it('clips a stretched transparent image to a polygon frame', async () => {
    const { context } = installCanvasRendererMock()
    const imageElement = createImageElement({
      presentation: 'single',
      transform: { rotationDegrees: 0, flipX: false, flipY: true },
      frame: {
        mask: {
          kind: 'polygon',
          points: [
            { x: 0.5, y: 0 },
            { x: 1, y: 1 },
            { x: 0, y: 1 },
          ],
        },
        crop: { focusX: 0.5, focusY: 0.5, zoom: 1 },
      },
    })
    const episode: EpisodeDocument = {
      ...createBlankEpisode('episode-polygon-render'),
      logicalHeight: 400,
      elements: [imageElement],
    }

    await renderEpisodeSlices({
      episode,
      profile: WEBTOON_CANVAS_OBSERVED_PROFILE,
      mediaType: 'image/png',
      resolveImageSource: () => 'blob:image-render-test',
    })

    expect(context.moveTo).toHaveBeenCalledWith(110, 20)
    expect(context.lineTo).toHaveBeenNthCalledWith(1, 210, 220)
    expect(context.lineTo).toHaveBeenNthCalledWith(2, 10, 220)
    expect(context.closePath).toHaveBeenCalledTimes(1)
    expect(context.clip).toHaveBeenCalledTimes(2)
    expect(context.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      10,
      20,
      200,
      200,
    )
    expect(context.scale).toHaveBeenCalledWith(1, -1)
  })
})

describe('preflightEpisodeExport', () => {
  it('passes a provisional package while preserving its unverified label', () => {
    const result = preflightEpisodeExport(WEBTOON_CANVAS_OBSERVED_PROFILE, [
      {
        fileName: 'Episode001.png',
        mediaType: 'image/png',
        width: 800,
        height: 1280,
        blob: new Blob(['safe'], { type: 'image/png' }),
      },
    ])

    expect(result).toMatchObject({
      ready: true,
      provisional: true,
      verification: 'form-observed',
      totalBytes: 4,
      issues: [],
    })
  })

  it('reports dimension, byte, count, package, format, and source failures', () => {
    const tinyProfile = {
      ...WEBTOON_CANVAS_OBSERVED_PROFILE,
      maxSliceBytes: 2,
      maxTotalBytes: 3,
      maxFileCount: 1,
    }
    const files = [
      {
        fileName: 'Episode001.webp',
        mediaType: 'image/webp' as never,
        width: 801,
        height: 1281,
        blob: new Blob(['large'], { type: 'image/webp' }),
      },
      {
        fileName: 'Episode002.png',
        mediaType: 'image/png' as const,
        width: 800,
        height: 100,
        blob: new Blob(['x'], { type: 'image/png' }),
      },
    ]

    const result = preflightEpisodeExport(tinyProfile, files, ['missing'])

    expect(result.ready).toBe(false)
    expect(result.issues.map(({ code }) => code)).toEqual([
      'unsupported-media-type',
      'wrong-width',
      'slice-too-tall',
      'slice-too-large',
      'too-many-files',
      'package-too-large',
      'missing-source',
    ])
  })
})
