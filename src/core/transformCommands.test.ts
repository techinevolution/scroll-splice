import { describe, expect, it } from 'vitest'

import {
  createImageElement,
  createSyntheticShapeElement,
  deleteElement,
  moveElement,
  setElementLocked,
  setElementOverflow,
  setElementTransform,
  setImageCrop,
  setImageFrame,
  setImagePresentation,
} from './commands'
import {
  BLANK_EPISODE_LAYER_PLANE_IDS,
  createBlankEpisode,
} from './createBlankEpisode'
import {
  DEFAULT_IMAGE_FRAME,
  IDENTITY_ELEMENT_TRANSFORM,
  type EpisodeDocument,
  type ImageElement,
} from './episode'

function createShapeEpisode(): EpisodeDocument {
  return createSyntheticShapeElement(createBlankEpisode('shape-transform'), {
    layerPlaneId: BLANK_EPISODE_LAYER_PLANE_IDS.content,
    name: 'Panel',
    fill: '#000000',
    bounds: { x: 0, y: 0, width: 100, height: 40 },
  })
}

function createImageEpisode(): EpisodeDocument {
  return createImageElement(createBlankEpisode('image-frame'), {
    layerPlaneId: BLANK_EPISODE_LAYER_PLANE_IDS.content,
    name: 'Photo',
    assetReference: { kind: 'imported', assetId: 'photo-1' },
    bounds: { x: 100, y: 200, width: 300, height: 200 },
  })
}

function onlyElement(document: EpisodeDocument) {
  const element = document.elements[0]
  if (!element) throw new Error('Expected a fixture element.')
  return element
}

function onlyImage(document: EpisodeDocument): ImageElement {
  const element = onlyElement(document)
  if (element.type !== 'image') throw new Error('Expected an image element.')
  return element
}

describe('v6 element transform commands', () => {
  it('creates identity-constrained elements and normalizes rotation', () => {
    const initial = createShapeEpisode()
    const created = onlyElement(initial)

    expect(created.transform).toEqual(IDENTITY_ELEMENT_TRANSFORM)
    expect(created.overflow).toBe('constrained')

    const transformed = setElementTransform(initial, created.id, {
      rotationDegrees: 270,
      flipX: true,
      flipY: false,
    })
    const element = onlyElement(transformed)

    expect(element.transform).toEqual({
      rotationDegrees: -90,
      flipX: true,
      flipY: false,
    })
    expect(element.bounds.y).toBe(30)
  })

  it('rejects impossible constrained rotations and respects element lock', () => {
    const initial = createSyntheticShapeElement(
      createBlankEpisode('shape-too-wide'),
      {
        layerPlaneId: BLANK_EPISODE_LAYER_PLANE_IDS.content,
        name: 'Large panel',
        fill: '#000000',
        bounds: { x: 0, y: 0, width: 800, height: 800 },
      },
    )
    const elementId = onlyElement(initial).id

    expect(
      setElementTransform(initial, elementId, {
        rotationDegrees: 45,
        flipX: false,
        flipY: false,
      }),
    ).toBe(initial)

    const locked = setElementLocked(createShapeEpisode(), onlyElement(createShapeEpisode()).id, true)
    const lockedId = onlyElement(locked).id
    expect(
      setElementTransform(locked, lockedId, {
        rotationDegrees: 30,
        flipX: false,
        flipY: false,
      }),
    ).toBe(locked)
  })

  it('allows intentional bleed but clamps it when constrained again', () => {
    const initial = createShapeEpisode()
    const elementId = onlyElement(initial).id
    const bleeding = setElementOverflow(initial, elementId, 'bleed')
    const moved = moveElement(bleeding, elementId, { x: -80, y: 20 })

    expect(onlyElement(moved).bounds.x).toBe(-80)
    expect(onlyElement(moved).overflow).toBe('bleed')

    const constrained = setElementOverflow(moved, elementId, 'constrained')
    expect(onlyElement(constrained).bounds.x).toBe(0)
    expect(onlyElement(constrained).overflow).toBe('constrained')
  })

  it('removes stale flat groups when deleting a grouped element', () => {
    const first = createShapeEpisode()
    const second = createSyntheticShapeElement(first, {
      layerPlaneId: BLANK_EPISODE_LAYER_PLANE_IDS.content,
      name: 'Second panel',
      fill: '#FFFFFF',
      bounds: { x: 120, y: 0, width: 100, height: 40 },
    })
    const grouped: EpisodeDocument = {
      ...second,
      elementGroups: [
        {
          id: 'pair-1',
          memberElementIds: second.elements.map(({ id }) => id),
        },
      ],
    }

    const deleted = deleteElement(grouped, grouped.elements[0]?.id ?? '')

    expect(deleted.elementGroups).toEqual([])
  })
})

describe('v6 image presentation commands', () => {
  it('creates a deterministic default frame and enables cover', () => {
    const initial = createImageEpisode()
    const image = onlyImage(initial)

    expect(image.frame).toEqual(DEFAULT_IMAGE_FRAME)
    expect(image.presentation).toBe('single')

    const covered = setImagePresentation(initial, image.id, 'cover')
    expect(onlyImage(covered).presentation).toBe('cover')
    expect(onlyImage(covered).bounds).toEqual(image.bounds)
  })

  it('sets rectangle and polygon frames without changing the source', () => {
    const initial = createImageEpisode()
    const image = onlyImage(initial)
    const rounded = setImageFrame(initial, image.id, {
      mask: { kind: 'rectangle', cornerRadius: 500 },
      crop: { focusX: 0.25, focusY: 0.75, zoom: 2 },
      border: { color: ' #FFFFFF ', width: 4 },
    })

    expect(onlyImage(rounded).frame).toEqual({
      mask: { kind: 'rectangle', cornerRadius: 100 },
      crop: { focusX: 0.25, focusY: 0.75, zoom: 2 },
      border: { color: '#FFFFFF', width: 4 },
    })
    expect(onlyImage(rounded).assetReference).toEqual(image.assetReference)

    const polygon = setImageFrame(rounded, image.id, {
      mask: {
        kind: 'polygon',
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 0.2 },
          { x: 0.8, y: 1 },
          { x: 0.1, y: 0.85 },
        ],
      },
      crop: { focusX: 0.5, focusY: 0.5, zoom: 1 },
    })

    expect(onlyImage(polygon).frame.mask.kind).toBe('polygon')
  })

  it('updates crop independently and rejects out-of-range values', () => {
    const initial = createImageEpisode()
    const imageId = onlyImage(initial).id
    const cropped = setImageCrop(initial, imageId, {
      focusX: 0.1,
      focusY: 0.9,
      zoom: 3,
    })

    expect(onlyImage(cropped).frame.crop).toEqual({
      focusX: 0.1,
      focusY: 0.9,
      zoom: 3,
    })
    expect(
      setImageCrop(cropped, imageId, {
        focusX: -1,
        focusY: 0.5,
        zoom: 1,
      }),
    ).toBe(cropped)
  })
})
