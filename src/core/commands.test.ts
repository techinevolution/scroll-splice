import { describe, expect, it } from 'vitest'

import {
  BUILD_WEEK_LAYER_PLANE_IDS,
  buildWeekEpisode,
} from '../app/fixtures/buildWeekEpisode'
import {
  BACKGROUND_COLOR_REGION_GENERATOR_ID,
  DEFAULT_EPISODE_HEIGHT_INCREMENT,
  MIN_ELEMENT_SIZE,
  SYNTHETIC_SHAPE_GENERATOR_ID,
  createBackgroundColorRegion,
  createImageElement,
  createLayerPlane,
  createSyntheticShapeElement,
  deleteElement,
  deleteEmptyLayerPlane,
  extendEpisodeHeight,
  getEpisodeContentBottom,
  MIN_EPISODE_LOGICAL_HEIGHT,
  moveElement,
  resizeElement,
  resizeEpisodeHeight,
  setBaseColor,
  setCompositionGroupVisibility,
  setElementBlendMode,
  setElementOpacity,
  setElementVisibility,
  setEpisodeName,
  setImagePresentation,
  setLayerPlaneVisibility,
  setShapeFill,
} from './commands'
import {
  getBackgroundBaseLayerPlane,
  getEffectiveEpisodeBaseColor,
  getLayerPlanesForGroup,
  isElementEffectivelyVisible,
} from './episode'

describe('setEpisodeName', () => {
  it('stores a trimmed nonblank episode name', () => {
    const nextDocument = setEpisodeName(
      buildWeekEpisode,
      '  A Light Below  ',
    )

    expect(nextDocument).not.toBe(buildWeekEpisode)
    expect(nextDocument.name).toBe('A Light Below')
    expect(nextDocument.elements).toBe(buildWeekEpisode.elements)
    expect(nextDocument.layerPlanes).toBe(buildWeekEpisode.layerPlanes)
  })

  it('accepts an episode name at the 60-character limit', () => {
    const requestedName = 'a'.repeat(60)

    expect(setEpisodeName(buildWeekEpisode, requestedName).name).toBe(
      requestedName,
    )
  })

  it.each([
    { requestedName: '', description: 'blank' },
    { requestedName: '   ', description: 'whitespace-only' },
    {
      requestedName: 'a'.repeat(61),
      description: 'longer than 60 characters',
    },
  ])(
    'returns the original document for a $description name',
    ({ requestedName }) => {
      expect(setEpisodeName(buildWeekEpisode, requestedName)).toBe(
        buildWeekEpisode,
      )
    },
  )

  it('returns the original document when trimming produces the current name', () => {
    expect(
      setEpisodeName(buildWeekEpisode, `  ${buildWeekEpisode.name}  `),
    ).toBe(buildWeekEpisode)
  })
})

describe('extendEpisodeHeight', () => {
  it('uses a centralized 1280-unit default increment', () => {
    expect(DEFAULT_EPISODE_HEIGHT_INCREMENT).toBe(1280)

    const nextDocument = extendEpisodeHeight(
      buildWeekEpisode,
      DEFAULT_EPISODE_HEIGHT_INCREMENT,
    )

    expect(nextDocument).not.toBe(buildWeekEpisode)
    expect(nextDocument.logicalHeight).toBe(
      buildWeekEpisode.logicalHeight + DEFAULT_EPISODE_HEIGHT_INCREMENT,
    )
    expect(nextDocument.elements).toBe(buildWeekEpisode.elements)
    expect(nextDocument.layerPlanes).toBe(buildWeekEpisode.layerPlanes)
  })

  it('accepts any finite positive increment', () => {
    expect(extendEpisodeHeight(buildWeekEpisode, 12.5).logicalHeight).toBe(
      buildWeekEpisode.logicalHeight + 12.5,
    )
  })

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'returns the original document for invalid amount %s',
    (amount) => {
      expect(extendEpisodeHeight(buildWeekEpisode, amount)).toBe(
        buildWeekEpisode,
      )
    },
  )

  it('returns the original document if the resulting height is not finite', () => {
    const enormousDocument = {
      ...buildWeekEpisode,
      logicalHeight: Number.MAX_VALUE,
    }

    expect(extendEpisodeHeight(enormousDocument, Number.MAX_VALUE)).toBe(
      enormousDocument,
    )
  })

  it('delegates through the content-safe exact resize command', () => {
    const contentBottom = getEpisodeContentBottom(buildWeekEpisode)
    const undersizedDocument = {
      ...buildWeekEpisode,
      logicalHeight: 100,
    }

    expect(extendEpisodeHeight(undersizedDocument, 10).logicalHeight).toBe(
      contentBottom,
    )
  })
})

describe('resizeEpisodeHeight', () => {
  it('grows or trims to an exact finite positive logical height', () => {
    const grown = resizeEpisodeHeight(
      buildWeekEpisode,
      buildWeekEpisode.logicalHeight + 37.5,
    )
    const trimmed = resizeEpisodeHeight(
      buildWeekEpisode,
      buildWeekEpisode.logicalHeight - 100,
    )

    expect(grown.logicalHeight).toBe(buildWeekEpisode.logicalHeight + 37.5)
    expect(trimmed.logicalHeight).toBe(buildWeekEpisode.logicalHeight - 100)
    expect(trimmed.elements).toBe(buildWeekEpisode.elements)
    expect(trimmed.layerPlanes).toBe(buildWeekEpisode.layerPlanes)
  })

  it('stops at the lowest element bottom, including hidden elements', () => {
    const contentBottom = getEpisodeContentBottom(buildWeekEpisode)
    const lowestElement = buildWeekEpisode.elements.find(
      (element) =>
        element.bounds.y + element.bounds.height === contentBottom,
    )

    if (!lowestElement) {
      throw new Error('The lowest fixture element is missing.')
    }

    const withLowestHidden = setElementVisibility(
      buildWeekEpisode,
      lowestElement.id,
      false,
    )
    const nextDocument = resizeEpisodeHeight(withLowestHidden, 1)

    expect(nextDocument.logicalHeight).toBe(contentBottom)
    expect(nextDocument.elements).toBe(withLowestHidden.elements)
    expect(
      nextDocument.elements.find(({ id }) => id === lowestElement.id)?.visible,
    ).toBe(false)
  })

  it('keeps an empty episode at a usable minimum height', () => {
    const emptyEpisode = { ...buildWeekEpisode, elements: [] }

    expect(resizeEpisodeHeight(emptyEpisode, 1).logicalHeight).toBe(
      MIN_EPISODE_LOGICAL_HEIGHT,
    )
  })

  it.each([
    0,
    -1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ])('returns the original document for invalid height %s', (height) => {
    expect(resizeEpisodeHeight(buildWeekEpisode, height)).toBe(
      buildWeekEpisode,
    )
  })

  it('returns the original document when the safe height is unchanged', () => {
    expect(
      resizeEpisodeHeight(buildWeekEpisode, buildWeekEpisode.logicalHeight),
    ).toBe(buildWeekEpisode)
  })
})

describe('moveElement', () => {
  const movableElement = buildWeekEpisode.elements.find(
    ({ id }) => id === 'beat-01-stillness-accent-2',
  )

  if (!movableElement) {
    throw new Error('The movement fixture element is missing.')
  }

  it('returns a new document with only the requested position changed', () => {
    const nextDocument = moveElement(buildWeekEpisode, movableElement.id, {
      x: 500,
      y: 600,
    })
    const movedElement = nextDocument.elements.find(
      ({ id }) => id === movableElement.id,
    )

    expect(nextDocument).not.toBe(buildWeekEpisode)
    expect(movedElement?.bounds).toEqual({
      ...movableElement.bounds,
      x: 500,
      y: 600,
    })
    expect(
      nextDocument.elements.find(
        ({ id }) => id === 'beat-01-stillness-caption',
      ),
    ).toBe(
      buildWeekEpisode.elements.find(
        ({ id }) => id === 'beat-01-stillness-caption',
      ),
    )
  })

  it('clamps the element inside the episode boundary', () => {
    const nextDocument = moveElement(buildWeekEpisode, movableElement.id, {
      x: 10_000,
      y: 10_000,
    })
    const movedElement = nextDocument.elements.find(
      ({ id }) => id === movableElement.id,
    )

    expect(movedElement?.bounds.x).toBe(
      buildWeekEpisode.logicalWidth - movableElement.bounds.width,
    )
    expect(movedElement?.bounds.y).toBe(
      buildWeekEpisode.logicalHeight - movableElement.bounds.height,
    )
  })

  it('returns the original document for an unknown element', () => {
    expect(moveElement(buildWeekEpisode, 'missing', { x: 0, y: 0 })).toBe(
      buildWeekEpisode,
    )
  })
})

describe('resizeElement', () => {
  const shapeElement = buildWeekEpisode.elements.find(
    ({ id }) => id === 'beat-01-stillness-accent-2',
  )
  const textElement = buildWeekEpisode.elements.find(
    ({ id }) => id === 'beat-01-stillness-caption',
  )

  if (!shapeElement || !textElement || textElement.type !== 'text') {
    throw new Error('The resize fixture elements are missing.')
  }

  it('resizes a shape proportionally and preserves unrelated element identity', () => {
    const unrelatedElement = buildWeekEpisode.elements.find(
      ({ id }) => id === 'beat-01-stillness-title',
    )
    const nextDocument = resizeElement(
      buildWeekEpisode,
      shapeElement.id,
      {
        x: shapeElement.bounds.x,
        y: shapeElement.bounds.y,
        width: shapeElement.bounds.width * 2,
        height: shapeElement.bounds.height * 2,
      },
    )
    const resizedElement = nextDocument.elements.find(
      ({ id }) => id === shapeElement.id,
    )

    expect(nextDocument).not.toBe(buildWeekEpisode)
    expect(resizedElement?.bounds).toEqual({
      x: shapeElement.bounds.x,
      y: shapeElement.bounds.y,
      width: shapeElement.bounds.width * 2,
      height: shapeElement.bounds.height * 2,
    })
    expect(
      nextDocument.elements.find(
        ({ id }) => id === unrelatedElement?.id,
      ),
    ).toBe(unrelatedElement)
  })

  it('uses one scale for mismatched requested dimensions', () => {
    const nextDocument = resizeElement(
      buildWeekEpisode,
      shapeElement.id,
      {
        ...shapeElement.bounds,
        width: shapeElement.bounds.width * 3,
        height: shapeElement.bounds.height * 2,
      },
    )
    const resizedElement = nextDocument.elements.find(
      ({ id }) => id === shapeElement.id,
    )

    expect(resizedElement?.bounds.width).toBe(
      shapeElement.bounds.width * 2,
    )
    expect(resizedElement?.bounds.height).toBe(
      shapeElement.bounds.height * 2,
    )
  })

  it('keeps the opposite corner fixed when minimum size is applied', () => {
    const currentRight = shapeElement.bounds.x + shapeElement.bounds.width
    const currentBottom = shapeElement.bounds.y + shapeElement.bounds.height
    const nextDocument = resizeElement(
      buildWeekEpisode,
      shapeElement.id,
      {
        x: currentRight - 1,
        y: currentBottom - 1,
        width: 1,
        height: 1,
      },
    )
    const resizedBounds = nextDocument.elements.find(
      ({ id }) => id === shapeElement.id,
    )?.bounds

    expect(resizedBounds).toEqual({
      x: currentRight - MIN_ELEMENT_SIZE,
      y: currentBottom - MIN_ELEMENT_SIZE,
      width: MIN_ELEMENT_SIZE,
      height: MIN_ELEMENT_SIZE,
    })
  })

  it('scales text bounds and font size together with an 8-unit font minimum', () => {
    const smallFontText = {
      ...textElement,
      fontSize: 10,
    }
    const document = {
      ...buildWeekEpisode,
      elements: buildWeekEpisode.elements.map((element) =>
        element.id === smallFontText.id ? smallFontText : element,
      ),
    }
    const nextDocument = resizeElement(document, smallFontText.id, {
      ...smallFontText.bounds,
      width: 1,
      height: 1,
    })
    const resizedElement = nextDocument.elements.find(
      ({ id }) => id === smallFontText.id,
    )

    expect(resizedElement?.bounds.width).toBe(
      smallFontText.bounds.width * 0.8,
    )
    expect(resizedElement?.bounds.height).toBe(
      smallFontText.bounds.height * 0.8,
    )
    expect(resizedElement?.type).toBe('text')
    if (resizedElement?.type !== 'text') {
      throw new Error('The resized fixture stopped being text.')
    }
    expect(resizedElement.fontSize).toBe(8)
  })

  it('clamps a resized element fully inside the episode', () => {
    const nextDocument = resizeElement(
      buildWeekEpisode,
      shapeElement.id,
      {
        x: shapeElement.bounds.x,
        y: shapeElement.bounds.y,
        width: 10_000,
        height: 10_000,
      },
    )
    const resizedBounds = nextDocument.elements.find(
      ({ id }) => id === shapeElement.id,
    )?.bounds

    expect(resizedBounds).toBeDefined()
    if (!resizedBounds) {
      throw new Error('The resized fixture element is missing.')
    }
    expect(resizedBounds.x).toBeGreaterThanOrEqual(0)
    expect(resizedBounds.y).toBeGreaterThanOrEqual(0)
    expect(resizedBounds.x + resizedBounds.width).toBeLessThanOrEqual(
      buildWeekEpisode.logicalWidth,
    )
    expect(resizedBounds.y + resizedBounds.height).toBeLessThanOrEqual(
      buildWeekEpisode.logicalHeight,
    )
    expect(resizedBounds.x).toBe(shapeElement.bounds.x)
    expect(resizedBounds.y).toBe(shapeElement.bounds.y)
    expect(resizedBounds.width / resizedBounds.height).toBe(
      shapeElement.bounds.width / shapeElement.bounds.height,
    )
  })

  it('rejects unknown, locked, and invalid resizes', () => {
    const requestedBounds = {
      ...shapeElement.bounds,
      width: shapeElement.bounds.width * 2,
      height: shapeElement.bounds.height * 2,
    }
    const lockedDocument = {
      ...buildWeekEpisode,
      elements: buildWeekEpisode.elements.map((element) =>
        element.id === shapeElement.id
          ? { ...element, locked: true }
          : element,
      ),
    }
    expect(resizeElement(buildWeekEpisode, 'missing', requestedBounds)).toBe(
      buildWeekEpisode,
    )
    expect(resizeElement(lockedDocument, shapeElement.id, requestedBounds)).toBe(
      lockedDocument,
    )
    expect(
      resizeElement(buildWeekEpisode, shapeElement.id, {
        ...requestedBounds,
        width: Number.NaN,
      }),
    ).toBe(buildWeekEpisode)
  })

  it('resizes Background color regions independently from every edge', () => {
    const withRegion = createBackgroundColorRegion(buildWeekEpisode, {
      layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
      fill: '#332255',
      startY: 900,
      height: 600,
    })
    const region = withRegion.elements.at(-1)

    expect(region).toBeDefined()
    if (!region) {
      throw new Error('The Background color region is missing.')
    }

    const resizedFromTopLeft = resizeElement(withRegion, region.id, {
      x: 200,
      y: 1_000,
      width: 600,
      height: 500,
    })
    expect(resizedFromTopLeft.elements.at(-1)?.bounds).toEqual({
      x: 200,
      y: 1_000,
      width: 600,
      height: 500,
    })

    const resizedFromBottomRight = resizeElement(withRegion, region.id, {
      x: 0,
      y: 900,
      width: 500,
      height: 300,
    })
    expect(resizedFromBottomRight.elements.at(-1)?.bounds).toEqual({
      x: 0,
      y: 900,
      width: 500,
      height: 300,
    })

    const minimumFromTopLeft = resizeElement(withRegion, region.id, {
      x: 799,
      y: 1_499,
      width: 1,
      height: 1,
    })
    expect(minimumFromTopLeft.elements.at(-1)?.bounds).toEqual({
      x: 800 - MIN_ELEMENT_SIZE,
      y: 1_500 - MIN_ELEMENT_SIZE,
      width: MIN_ELEMENT_SIZE,
      height: MIN_ELEMENT_SIZE,
    })

    const clampedFromBottomRight = resizeElement(withRegion, region.id, {
      x: 0,
      y: 900,
      width: 10_000,
      height: 10_000,
    })
    expect(clampedFromBottomRight.elements.at(-1)?.bounds).toEqual({
      x: 0,
      y: 900,
      width: buildWeekEpisode.logicalWidth,
      height: buildWeekEpisode.logicalHeight - 900,
    })
  })

  it('resizes tiled images independently while single images stay proportional', () => {
    const withImage = createImageElement(buildWeekEpisode, {
      layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
      name: 'Texture',
      assetReference: { kind: 'imported', assetId: 'texture-1' },
      bounds: { x: 100, y: 200, width: 200, height: 100 },
    })
    const image = withImage.elements.at(-1)

    if (!image || image.type !== 'image') {
      throw new Error('The image resize fixture is missing.')
    }

    const singleResize = resizeElement(withImage, image.id, {
      ...image.bounds,
      width: 300,
      height: 300,
    })
    expect(singleResize.elements.at(-1)?.bounds).toEqual({
      x: 100,
      y: 200,
      width: 300,
      height: 150,
    })

    const tiled = setImagePresentation(withImage, image.id, 'tile')
    const tileResize = resizeElement(tiled, image.id, {
      x: 50,
      y: 150,
      width: 250,
      height: 150,
    })
    expect(tileResize.elements.at(-1)?.bounds).toEqual({
      x: 50,
      y: 150,
      width: 250,
      height: 150,
    })
  })
})

describe('setElementVisibility', () => {
  const elementId = 'beat-01-stillness-caption'

  it('changes only the requested element eye state', () => {
    const originalElement = buildWeekEpisode.elements.find(
      ({ id }) => id === elementId,
    )
    const untouchedElement = buildWeekEpisode.elements.find(
      ({ id }) => id === 'beat-01-stillness-title',
    )
    const nextDocument = setElementVisibility(
      buildWeekEpisode,
      elementId,
      false,
    )
    const hiddenElement = nextDocument.elements.find(
      ({ id }) => id === elementId,
    )

    expect(nextDocument).not.toBe(buildWeekEpisode)
    expect(hiddenElement).toEqual({ ...originalElement, visible: false })
    expect(
      nextDocument.elements.find(
        ({ id }) => id === 'beat-01-stillness-title',
      ),
    ).toBe(untouchedElement)
  })

  it('returns the original document when no eye state changes', () => {
    expect(setElementVisibility(buildWeekEpisode, elementId, true)).toBe(
      buildWeekEpisode,
    )
    expect(setElementVisibility(buildWeekEpisode, 'missing', false)).toBe(
      buildWeekEpisode,
    )
  })
})

describe('element appearance commands', () => {
  const shapeId = 'beat-01-stillness-accent-2'
  const textId = 'beat-01-stillness-caption'

  it('sets universal opacity and clamps finite values into the document range', () => {
    const halfVisible = setElementOpacity(buildWeekEpisode, textId, 0.5)
    const transparent = setElementOpacity(halfVisible, textId, -20)
    const opaque = setElementOpacity(transparent, textId, 20)

    expect(
      halfVisible.elements.find(({ id }) => id === textId)?.opacity,
    ).toBe(0.5)
    expect(
      transparent.elements.find(({ id }) => id === textId)?.opacity,
    ).toBe(0)
    expect(opaque.elements.find(({ id }) => id === textId)?.opacity).toBe(1)
  })

  it('sets each supported blend mode without replacing unrelated elements', () => {
    const unrelated = buildWeekEpisode.elements.find(
      ({ id }) => id === textId,
    )
    let episode = buildWeekEpisode

    for (const blendMode of [
      'multiply',
      'screen',
      'overlay',
      'soft-light',
      'normal',
    ] as const) {
      episode = setElementBlendMode(episode, shapeId, blendMode)
      expect(
        episode.elements.find(({ id }) => id === shapeId)?.blendMode,
      ).toBe(blendMode)
    }

    expect(episode.elements.find(({ id }) => id === textId)).toBe(unrelated)
  })

  it('sets normalized solid and vertical two-stop shape fills', () => {
    const withRegion = createBackgroundColorRegion(buildWeekEpisode, {
      layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
      fill: '#7050B8',
      startY: 100,
      height: 600,
    })
    const region = withRegion.elements.at(-1)

    if (!region) {
      throw new Error('The Background region appearance fixture is missing.')
    }

    const solid = setShapeFill(withRegion, region.id, {
      kind: 'solid',
      color: '  #123456  ',
    })
    const gradient = setShapeFill(solid, region.id, {
      kind: 'vertical-gradient',
      top: { color: '  #112233 ', opacity: 0.25 },
      bottom: { color: '#AABBCC  ', opacity: 0.75 },
    })

    expect(solid.elements.find(({ id }) => id === region.id)).toMatchObject({
      fill: { kind: 'solid', color: '#123456' },
    })
    expect(gradient.elements.find(({ id }) => id === region.id)).toMatchObject({
      fill: {
        kind: 'vertical-gradient',
        top: { color: '#112233', opacity: 0.25 },
        bottom: { color: '#AABBCC', opacity: 0.75 },
      },
    })
    expect(
      setShapeFill(buildWeekEpisode, shapeId, {
        kind: 'vertical-gradient',
        top: { color: '#000000', opacity: 1 },
        bottom: { color: '#FFFFFF', opacity: 0 },
      }),
    ).toBe(buildWeekEpisode)
  })

  it('changes image presentation only for an image element', () => {
    const withImage = createImageElement(buildWeekEpisode, {
      layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
      name: 'Texture',
      assetReference: { kind: 'imported', assetId: 'upload-1' },
      bounds: { x: 0, y: 0, width: 100, height: 100 },
    })
    const image = withImage.elements.at(-1)

    if (!image) {
      throw new Error('The image appearance fixture is missing.')
    }

    const tiled = setImagePresentation(withImage, image.id, 'tile')

    expect(tiled.elements.at(-1)).toMatchObject({ presentation: 'tile' })
    expect(setImagePresentation(tiled, image.id, 'tile')).toBe(tiled)
    expect(setImagePresentation(tiled, shapeId, 'tile')).toBe(tiled)

    const resizedTile = resizeElement(tiled, image.id, {
      x: 10,
      y: 20,
      width: 200,
      height: 200,
    })
    expect(setImagePresentation(resizedTile, image.id, 'single')).toBe(
      resizedTile,
    )

    const restoredSingle = setImagePresentation(
      resizedTile,
      image.id,
      'single',
      { sourceAspectRatio: 2 },
    )
    const resizedTileElement = resizedTile.elements.at(-1)
    const restoredSingleElement = restoredSingle.elements.at(-1)
    expect(restoredSingleElement).toMatchObject({
      presentation: 'single',
      bounds: { width: 200, height: 100 },
    })
    expect(
      (restoredSingleElement?.bounds.x ?? 0) +
        (restoredSingleElement?.bounds.width ?? 0) / 2,
    ).toBeCloseTo(
      (resizedTileElement?.bounds.x ?? 0) +
        (resizedTileElement?.bounds.width ?? 0) / 2,
    )
    expect(
      (restoredSingleElement?.bounds.y ?? 0) +
        (restoredSingleElement?.bounds.height ?? 0) / 2,
    ).toBeCloseTo(
      (resizedTileElement?.bounds.y ?? 0) +
        (resizedTileElement?.bounds.height ?? 0) / 2,
    )
  })

  it('returns the original document for missing, unchanged, or invalid appearance', () => {
    const shape = buildWeekEpisode.elements.find(({ id }) => id === shapeId)

    if (!shape || shape.type !== 'shape') {
      throw new Error('The shape appearance fixture is missing.')
    }

    expect(setElementOpacity(buildWeekEpisode, 'missing', 0.5)).toBe(
      buildWeekEpisode,
    )
    expect(setElementOpacity(buildWeekEpisode, shapeId, shape.opacity)).toBe(
      buildWeekEpisode,
    )
    expect(setElementOpacity(buildWeekEpisode, shapeId, Number.NaN)).toBe(
      buildWeekEpisode,
    )
    expect(
      setElementBlendMode(
        buildWeekEpisode,
        shapeId,
        'difference' as never,
      ),
    ).toBe(buildWeekEpisode)
    expect(setElementBlendMode(buildWeekEpisode, shapeId, 'normal')).toBe(
      buildWeekEpisode,
    )
    expect(setShapeFill(buildWeekEpisode, shapeId, shape.fill)).toBe(
      buildWeekEpisode,
    )
    expect(
      setShapeFill(buildWeekEpisode, textId, {
        kind: 'solid',
        color: '#000000',
      }),
    ).toBe(buildWeekEpisode)
    expect(
      setShapeFill(buildWeekEpisode, shapeId, {
        kind: 'vertical-gradient',
        top: { color: '#000000', opacity: -1 },
        bottom: { color: '#FFFFFF', opacity: 1 },
      }),
    ).toBe(buildWeekEpisode)
    expect(
      setImagePresentation(
        buildWeekEpisode,
        shapeId,
        'stretch' as never,
      ),
    ).toBe(buildWeekEpisode)
  })
})

describe('deleteElement', () => {
  it('removes only the requested placed element', () => {
    const elementId = 'beat-01-stillness-caption'
    const untouchedElement = buildWeekEpisode.elements.find(
      ({ id }) => id === 'beat-01-stillness-title',
    )
    const nextDocument = deleteElement(buildWeekEpisode, elementId)

    expect(nextDocument).not.toBe(buildWeekEpisode)
    expect(nextDocument.elements).toHaveLength(
      buildWeekEpisode.elements.length - 1,
    )
    expect(nextDocument.elements.some(({ id }) => id === elementId)).toBe(
      false,
    )
    expect(
      nextDocument.elements.find(
        ({ id }) => id === 'beat-01-stillness-title',
      ),
    ).toBe(untouchedElement)
    expect(nextDocument.layerPlanes).toBe(buildWeekEpisode.layerPlanes)
  })

  it('returns the original document for an unknown element', () => {
    expect(deleteElement(buildWeekEpisode, 'missing')).toBe(buildWeekEpisode)
  })
})

describe('createSyntheticShapeElement', () => {
  it('adds a movable code-defined rectangle to an ordinary plane', () => {
    const nextDocument = createSyntheticShapeElement(buildWeekEpisode, {
      layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
      name: '  Violet swatch  ',
      fill: '  #7048B8  ',
      bounds: {
        x: buildWeekEpisode.logicalWidth - 25,
        y: buildWeekEpisode.logicalHeight - 25,
        width: 100,
        height: 100,
      },
    })
    const created = nextDocument.elements.at(-1)
    const planeZIndexes = buildWeekEpisode.elements
      .filter(
        ({ layerPlaneId }) =>
          layerPlaneId === BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
      )
      .map(({ zIndex }) => zIndex)

    expect(created).toEqual({
      id: 'synthetic-shape-1',
      name: 'Violet swatch',
      layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
      type: 'shape',
      shape: 'rectangle',
      bounds: {
        x: buildWeekEpisode.logicalWidth - 100,
        y: buildWeekEpisode.logicalHeight - 100,
        width: 100,
        height: 100,
      },
      fill: { kind: 'solid', color: '#7048B8' },
      opacity: 1,
      blendMode: 'normal',
      visible: true,
      locked: false,
      zIndex: Math.max(...planeZIndexes) + 1,
      assetReference: {
        kind: 'synthetic',
        generatorId: SYNTHETIC_SHAPE_GENERATOR_ID,
      },
    })
  })

  it('uses deterministic collision-safe IDs and plane-local z-indexes', () => {
    const input = {
      layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
      name: 'Swatch',
      fill: '#123456',
      bounds: { x: 10, y: 20, width: 30, height: 40 },
    }
    const first = createSyntheticShapeElement(buildWeekEpisode, input)
    const second = createSyntheticShapeElement(first, input)

    expect(first.elements.at(-1)?.id).toBe('synthetic-shape-1')
    expect(first.elements.at(-1)?.zIndex).toBe(0)
    expect(second.elements.at(-1)?.id).toBe('synthetic-shape-2')
    expect(second.elements.at(-1)?.zIndex).toBe(1)
  })

  it('clamps oversized bounds to the episode', () => {
    const nextDocument = createSyntheticShapeElement(buildWeekEpisode, {
      layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
      name: 'Full episode swatch',
      fill: '#123456',
      bounds: {
        x: 100,
        y: 100,
        width: buildWeekEpisode.logicalWidth * 2,
        height: buildWeekEpisode.logicalHeight * 2,
      },
    })

    expect(nextDocument.elements.at(-1)?.bounds).toEqual({
      x: 0,
      y: 0,
      width: buildWeekEpisode.logicalWidth,
      height: buildWeekEpisode.logicalHeight,
    })
  })

  it('rejects the pinned base, missing planes, and invalid shape data', () => {
    const validInput = {
      layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.backgroundBase,
      name: 'Swatch',
      fill: '#123456',
      bounds: { x: 0, y: 0, width: 100, height: 100 },
    }

    expect(createSyntheticShapeElement(buildWeekEpisode, validInput)).toBe(
      buildWeekEpisode,
    )
    expect(
      createSyntheticShapeElement(buildWeekEpisode, {
        ...validInput,
        layerPlaneId: 'missing',
      }),
    ).toBe(buildWeekEpisode)
    expect(
      createSyntheticShapeElement(buildWeekEpisode, {
        ...validInput,
        layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
        bounds: { ...validInput.bounds, width: Number.NaN },
      }),
    ).toBe(buildWeekEpisode)
    expect(
      createSyntheticShapeElement(buildWeekEpisode, {
        ...validInput,
        layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
        name: '   ',
      }),
    ).toBe(buildWeekEpisode)
  })
})

describe('createImageElement', () => {
  it('adds a built-in image to an ordinary plane with clamped bounds', () => {
    const nextDocument = createImageElement(buildWeekEpisode, {
      layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
      name: '  Rounded speech bubble  ',
      assetReference: {
        kind: 'built-in',
        assetId: '  speech-bubble-rounded  ',
      },
      bounds: {
        x: buildWeekEpisode.logicalWidth - 20,
        y: buildWeekEpisode.logicalHeight - 10,
        width: 160,
        height: 80,
      },
    })
    const created = nextDocument.elements.at(-1)
    const planeZIndexes = buildWeekEpisode.elements
      .filter(
        ({ layerPlaneId }) =>
          layerPlaneId === BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
      )
      .map(({ zIndex }) => zIndex)

    expect(created).toEqual({
      id: 'image-element-1',
      name: 'Rounded speech bubble',
      layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
      type: 'image',
      bounds: {
        x: buildWeekEpisode.logicalWidth - 160,
        y: buildWeekEpisode.logicalHeight - 80,
        width: 160,
        height: 80,
      },
      visible: true,
      locked: false,
      zIndex: Math.max(...planeZIndexes) + 1,
      opacity: 1,
      blendMode: 'normal',
      assetReference: {
        kind: 'built-in',
        assetId: 'speech-bubble-rounded',
      },
      presentation: 'single',
    })
  })

  it('uses collision-safe IDs and plane-local z-indexes for imported images', () => {
    const first = createImageElement(buildWeekEpisode, {
      layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
      name: 'Imported texture',
      assetReference: { kind: 'imported', assetId: 'upload-1' },
      bounds: { x: 10, y: 20, width: 100, height: 50 },
    })
    const second = createImageElement(first, {
      layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
      name: 'Imported texture',
      assetReference: { kind: 'imported', assetId: 'upload-1' },
      bounds: { x: 20, y: 30, width: 100, height: 50 },
    })

    expect(first.elements.at(-1)?.id).toBe('image-element-1')
    expect(first.elements.at(-1)?.zIndex).toBe(0)
    expect(second.elements.at(-1)?.id).toBe('image-element-2')
    expect(second.elements.at(-1)?.zIndex).toBe(1)
  })

  it('rejects base or missing planes and invalid image data', () => {
    const validInput = {
      layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.backgroundBase,
      name: 'Imported texture',
      assetReference: { kind: 'imported' as const, assetId: 'upload-1' },
      bounds: { x: 0, y: 0, width: 100, height: 50 },
    }

    expect(createImageElement(buildWeekEpisode, validInput)).toBe(
      buildWeekEpisode,
    )
    expect(
      createImageElement(buildWeekEpisode, {
        ...validInput,
        layerPlaneId: 'missing',
      }),
    ).toBe(buildWeekEpisode)
    expect(
      createImageElement(buildWeekEpisode, {
        ...validInput,
        layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
        name: '   ',
      }),
    ).toBe(buildWeekEpisode)
    expect(
      createImageElement(buildWeekEpisode, {
        ...validInput,
        layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
        assetReference: { kind: 'imported', assetId: '   ' },
      }),
    ).toBe(buildWeekEpisode)
    expect(
      createImageElement(buildWeekEpisode, {
        ...validInput,
        layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
        bounds: { ...validInput.bounds, height: Number.NaN },
      }),
    ).toBe(buildWeekEpisode)
  })

  it('preserves an image aspect ratio when resizing', () => {
    const withImage = createImageElement(buildWeekEpisode, {
      layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
      name: 'Rounded speech bubble',
      assetReference: {
        kind: 'built-in',
        assetId: 'speech-bubble-rounded',
      },
      bounds: { x: 100, y: 100, width: 200, height: 100 },
    })
    const image = withImage.elements.at(-1)

    if (!image || image.type !== 'image') {
      throw new Error('The image fixture was not created.')
    }

    const resized = resizeElement(withImage, image.id, {
      ...image.bounds,
      width: 300,
      height: 300,
    }).elements.at(-1)

    expect(resized?.bounds).toEqual({
      x: 100,
      y: 100,
      width: 300,
      height: 150,
    })
  })
})

describe('createBackgroundColorRegion', () => {
  it('adds a full-width solid region to an ordinary Background plane', () => {
    const nextDocument = createBackgroundColorRegion(buildWeekEpisode, {
      layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
      fill: ' #332255 ',
      startY: 900,
      height: 1600,
    })
    const created = nextDocument.elements.at(-1)

    expect(created).toEqual({
      id: 'background-color-region-1',
      name: 'Background color region 1',
      layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
      type: 'shape',
      shape: 'rectangle',
      bounds: {
        x: 0,
        y: 900,
        width: buildWeekEpisode.logicalWidth,
        height: 1600,
      },
      fill: { kind: 'solid', color: '#332255' },
      opacity: 1,
      blendMode: 'normal',
      visible: true,
      locked: false,
      zIndex: 0,
      assetReference: {
        kind: 'synthetic',
        generatorId: BACKGROUND_COLOR_REGION_GENERATOR_ID,
      },
    })

    if (!created) {
      throw new Error('The Background color region was not created.')
    }

    const moved = moveElement(nextDocument, created.id, {
      x: 200,
      y: 1200,
    }).elements.at(-1)

    expect(moved?.bounds.x).toBe(0)
    expect(moved?.bounds.y).toBe(1200)

    const narrowed = resizeElement(nextDocument, created.id, {
      ...created.bounds,
      width: 500,
    })
    const freelyMoved = moveElement(narrowed, created.id, {
      x: 200,
      y: 1200,
    }).elements.at(-1)

    expect(freelyMoved?.bounds.x).toBe(200)
    expect(freelyMoved?.bounds.y).toBe(1200)
  })

  it('keeps the chosen start and trims a region at the episode bottom', () => {
    const startY = buildWeekEpisode.logicalHeight - 100
    const nextDocument = createBackgroundColorRegion(buildWeekEpisode, {
      layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
      fill: '#332255',
      startY,
      height: 1000,
    })

    expect(nextDocument.elements.at(-1)?.bounds).toEqual({
      x: 0,
      y: startY,
      width: buildWeekEpisode.logicalWidth,
      height: 100,
    })
  })

  it('uses deterministic collision-safe IDs and next plane z-indexes', () => {
    const input = {
      layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
      fill: '#332255',
      startY: 0,
      height: 100,
    }
    const first = createBackgroundColorRegion(buildWeekEpisode, input)
    const second = createBackgroundColorRegion(first, input)

    expect(first.elements.at(-1)?.id).toBe('background-color-region-1')
    expect(first.elements.at(-1)?.zIndex).toBe(0)
    expect(second.elements.at(-1)?.id).toBe('background-color-region-2')
    expect(second.elements.at(-1)?.name).toBe('Background color region 2')
    expect(second.elements.at(-1)?.zIndex).toBe(1)
  })

  it('rejects non-Background planes, the pinned base, and invalid geometry', () => {
    const validInput = {
      layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
      fill: '#332255',
      startY: 0,
      height: 100,
    }

    expect(createBackgroundColorRegion(buildWeekEpisode, validInput)).toBe(
      buildWeekEpisode,
    )
    expect(
      createBackgroundColorRegion(buildWeekEpisode, {
        ...validInput,
        layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.backgroundBase,
      }),
    ).toBe(buildWeekEpisode)
    expect(
      createBackgroundColorRegion(buildWeekEpisode, {
        ...validInput,
        layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
        height: 0,
      }),
    ).toBe(buildWeekEpisode)
    expect(
      createBackgroundColorRegion(buildWeekEpisode, {
        ...validInput,
        layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
        startY: buildWeekEpisode.logicalHeight,
      }),
    ).toBe(buildWeekEpisode)
  })
})

describe('setCompositionGroupVisibility', () => {
  it('changes only the group eye state and preserves individual settings', () => {
    const individuallyHidden = setElementVisibility(
      buildWeekEpisode,
      'beat-01-stillness-caption',
      false,
    )
    const groupHidden = setCompositionGroupVisibility(
      individuallyHidden,
      'content',
      false,
    )
    const caption = groupHidden.elements.find(
      ({ id }) => id === 'beat-01-stillness-caption',
    )
    const title = groupHidden.elements.find(
      ({ id }) => id === 'beat-01-stillness-title',
    )

    expect(groupHidden).not.toBe(individuallyHidden)
    expect(groupHidden.compositionGroupVisibility).toEqual({
      background: true,
      content: false,
      foreground: true,
    })
    expect(groupHidden.elements).toBe(individuallyHidden.elements)
    expect(caption?.visible).toBe(false)
    expect(title?.visible).toBe(true)
    expect(caption && isElementEffectivelyVisible(groupHidden, caption)).toBe(
      false,
    )
    expect(title && isElementEffectivelyVisible(groupHidden, title)).toBe(
      false,
    )

    const groupShown = setCompositionGroupVisibility(
      groupHidden,
      'content',
      true,
    )
    const restoredCaption = groupShown.elements.find(
      ({ id }) => id === 'beat-01-stillness-caption',
    )
    const restoredTitle = groupShown.elements.find(
      ({ id }) => id === 'beat-01-stillness-title',
    )

    expect(restoredCaption?.visible).toBe(false)
    expect(restoredTitle?.visible).toBe(true)
    expect(
      restoredCaption &&
        isElementEffectivelyVisible(groupShown, restoredCaption),
    ).toBe(false)
    expect(
      restoredTitle && isElementEffectivelyVisible(groupShown, restoredTitle),
    ).toBe(true)
  })

  it('returns the original document when the group eye state is unchanged', () => {
    expect(
      setCompositionGroupVisibility(buildWeekEpisode, 'content', true),
    ).toBe(buildWeekEpisode)
  })
})

describe('createLayerPlane', () => {
  it('appends a visible ordinary plane with a stable ID and order', () => {
    const nextDocument = createLayerPlane(buildWeekEpisode, 'content')
    const contentLayerPlanes = getLayerPlanesForGroup(nextDocument, 'content')

    expect(nextDocument).not.toBe(buildWeekEpisode)
    expect(nextDocument.elements).toBe(buildWeekEpisode.elements)
    expect(contentLayerPlanes).toEqual([
      ...getLayerPlanesForGroup(buildWeekEpisode, 'content'),
      {
        id: 'content-plane-3',
        kind: 'ordinary',
        compositionGroup: 'content',
        order: 3,
        visible: true,
      },
    ])

    const twiceCreated = createLayerPlane(nextDocument, 'content')
    expect(getLayerPlanesForGroup(twiceCreated, 'content').at(-1)).toEqual({
      id: 'content-plane-4',
      kind: 'ordinary',
      compositionGroup: 'content',
      order: 4,
      visible: true,
    })
  })

  it('keeps Background plane 1 pinned while appending a free plane', () => {
    const nextDocument = createLayerPlane(buildWeekEpisode, 'background')
    const backgroundLayerPlanes = getLayerPlanesForGroup(
      nextDocument,
      'background',
    )

    expect(backgroundLayerPlanes[0]).toBe(
      getBackgroundBaseLayerPlane(buildWeekEpisode),
    )
    expect(backgroundLayerPlanes.at(-1)).toEqual({
      id: 'background-plane-3',
      kind: 'ordinary',
      compositionGroup: 'background',
      order: 3,
      visible: true,
    })
  })
})

describe('deleteEmptyLayerPlane', () => {
  it('deletes an empty ordinary plane and preserves document contents', () => {
    const withEmptyPlane = createLayerPlane(buildWeekEpisode, 'content')
    const nextDocument = deleteEmptyLayerPlane(
      withEmptyPlane,
      'content-plane-3',
    )

    expect(nextDocument).not.toBe(withEmptyPlane)
    expect(nextDocument.elements).toBe(withEmptyPlane.elements)
    expect(nextDocument.layerPlanes.map(({ id }) => id)).toEqual(
      buildWeekEpisode.layerPlanes.map(({ id }) => id),
    )
    expect(getLayerPlanesForGroup(nextDocument, 'content')).toEqual(
      getLayerPlanesForGroup(buildWeekEpisode, 'content'),
    )
  })

  it('compacts orders within only the deleted plane group', () => {
    const withTwoEmptyPlanes = createLayerPlane(
      createLayerPlane(buildWeekEpisode, 'content'),
      'content',
    )
    const originalBackgroundPlanes = getLayerPlanesForGroup(
      withTwoEmptyPlanes,
      'background',
    )
    const nextDocument = deleteEmptyLayerPlane(
      withTwoEmptyPlanes,
      'content-plane-3',
    )

    expect(
      getLayerPlanesForGroup(nextDocument, 'content').map(({ id, order }) => ({
        id,
        order,
      })),
    ).toEqual([
      { id: BUILD_WEEK_LAYER_PLANE_IDS.contentPanels, order: 1 },
      { id: BUILD_WEEK_LAYER_PLANE_IDS.contentText, order: 2 },
      { id: 'content-plane-4', order: 3 },
    ])
    expect(
      nextDocument.layerPlanes.find(({ id }) => id === 'content-plane-4')?.id,
    ).toBe('content-plane-4')
    expect(getLayerPlanesForGroup(nextDocument, 'background')).toEqual(
      originalBackgroundPlanes,
    )
  })

  it('returns the original document for an unknown plane', () => {
    expect(deleteEmptyLayerPlane(buildWeekEpisode, 'missing')).toBe(
      buildWeekEpisode,
    )
  })

  it('protects pinned Background plane 1', () => {
    expect(
      deleteEmptyLayerPlane(
        buildWeekEpisode,
        BUILD_WEEK_LAYER_PLANE_IDS.backgroundBase,
      ),
    ).toBe(buildWeekEpisode)
  })

  it('treats a hidden element as content and refuses to delete its plane', () => {
    const withEmptyPlane = createLayerPlane(buildWeekEpisode, 'content')
    const sourceElement = buildWeekEpisode.elements[0]

    if (!sourceElement) {
      throw new Error('The hidden-element fixture source is missing.')
    }

    const hiddenElementDocument = {
      ...withEmptyPlane,
      elements: [
        ...withEmptyPlane.elements,
        {
          ...sourceElement,
          id: 'hidden-only-plane-element',
          layerPlaneId: 'content-plane-3',
          visible: false,
        },
      ],
    }

    expect(
      deleteEmptyLayerPlane(
        hiddenElementDocument,
        'content-plane-3',
      ),
    ).toBe(hiddenElementDocument)
  })

  it("refuses to delete a group's final plane even when it is empty", () => {
    const emptyForegroundDocument = {
      ...buildWeekEpisode,
      elements: buildWeekEpisode.elements.filter(
        ({ layerPlaneId }) =>
          layerPlaneId !== BUILD_WEEK_LAYER_PLANE_IDS.foregroundAccents,
      ),
    }

    expect(
      deleteEmptyLayerPlane(
        emptyForegroundDocument,
        BUILD_WEEK_LAYER_PLANE_IDS.foregroundAccents,
      ),
    ).toBe(emptyForegroundDocument)
  })
})

describe('setLayerPlaneVisibility', () => {
  it('changes only one plane and participates in effective visibility', () => {
    const title = buildWeekEpisode.elements.find(
      ({ id }) => id === 'beat-01-stillness-title',
    )
    const panel = buildWeekEpisode.elements.find(
      ({ id }) => id === 'beat-01-stillness-background',
    )
    const nextDocument = setLayerPlaneVisibility(
      buildWeekEpisode,
      BUILD_WEEK_LAYER_PLANE_IDS.contentText,
      false,
    )

    expect(nextDocument).not.toBe(buildWeekEpisode)
    expect(nextDocument.elements).toBe(buildWeekEpisode.elements)
    expect(
      getLayerPlanesForGroup(nextDocument, 'content').find(
        ({ id }) => id === BUILD_WEEK_LAYER_PLANE_IDS.contentText,
      )?.visible,
    ).toBe(false)
    expect(title && isElementEffectivelyVisible(nextDocument, title)).toBe(
      false,
    )
    expect(panel && isElementEffectivelyVisible(nextDocument, panel)).toBe(
      true,
    )
  })

  it('returns the original document when no plane eye state changes', () => {
    expect(
      setLayerPlaneVisibility(
        buildWeekEpisode,
        BUILD_WEEK_LAYER_PLANE_IDS.contentText,
        true,
      ),
    ).toBe(buildWeekEpisode)
    expect(
      setLayerPlaneVisibility(buildWeekEpisode, 'missing', false),
    ).toBe(buildWeekEpisode)
  })
})

describe('setBaseColor', () => {
  it('changes only the full-episode Background base color', () => {
    const nextDocument = setBaseColor(buildWeekEpisode, '#221133')
    const originalBase = getBackgroundBaseLayerPlane(buildWeekEpisode)
    const nextBase = getBackgroundBaseLayerPlane(nextDocument)

    expect(nextDocument).not.toBe(buildWeekEpisode)
    expect(nextDocument.elements).toBe(buildWeekEpisode.elements)
    expect(nextBase).toEqual({ ...originalBase, baseColor: '#221133' })
    expect(
      nextDocument.layerPlanes.find(
        ({ id }) => id === BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
      ),
    ).toBe(
      buildWeekEpisode.layerPlanes.find(
        ({ id }) => id === BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
      ),
    )
  })

  it('returns the original document when the color is unchanged', () => {
    expect(setBaseColor(buildWeekEpisode, '#F3F0EA')).toBe(buildWeekEpisode)
  })
})

describe('getEffectiveEpisodeBaseColor', () => {
  it('returns the initial visible base color', () => {
    expect(getEffectiveEpisodeBaseColor(buildWeekEpisode)).toBe('#F3F0EA')
  })

  it('returns the changed visible base color', () => {
    const nextDocument = setBaseColor(buildWeekEpisode, '#221133')

    expect(getEffectiveEpisodeBaseColor(nextDocument)).toBe('#221133')
  })

  it('returns undefined when either the base plane or its group is hidden', () => {
    const baseHidden = setLayerPlaneVisibility(
      buildWeekEpisode,
      BUILD_WEEK_LAYER_PLANE_IDS.backgroundBase,
      false,
    )
    const backgroundHidden = setCompositionGroupVisibility(
      buildWeekEpisode,
      'background',
      false,
    )

    expect(getEffectiveEpisodeBaseColor(baseHidden)).toBeUndefined()
    expect(getEffectiveEpisodeBaseColor(backgroundHidden)).toBeUndefined()
  })
})
