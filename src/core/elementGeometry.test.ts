import { describe, expect, it } from 'vitest'

import {
  clampElementGeometry,
  getCoverCropRect,
  getCoverImagePlacement,
  getImageMaskPath,
  getTransformedRectBounds,
  isValidNormalizedPolygon,
  normalizeRotationDegrees,
} from './elementGeometry'
import { IDENTITY_ELEMENT_TRANSFORM } from './episode'

describe('element transform geometry', () => {
  it('normalizes rotation to the stable half-open range', () => {
    expect(normalizeRotationDegrees(540)).toBe(-180)
    expect(normalizeRotationDegrees(-181)).toBe(179)
    expect(normalizeRotationDegrees(360)).toBe(0)
  })

  it('computes the visual axis-aligned bounds around the element center', () => {
    expect(
      getTransformedRectBounds(
        { x: 10, y: 20, width: 100, height: 40 },
        { rotationDegrees: 90, flipX: true, flipY: false },
      ),
    ).toEqual({ x: 40, y: -10, width: 40.00000000000001, height: 100 })
  })

  it('translates constrained rotation inside the episode without changing size', () => {
    const bounds = clampElementGeometry(
      { x: 0, y: 0, width: 100, height: 40 },
      { rotationDegrees: 45, flipX: false, flipY: false },
      'constrained',
      { width: 800, height: 1280 },
    )

    expect(bounds?.x).toBe(0)
    expect(bounds?.y).toBeCloseTo(29.497475)
    expect(bounds?.width).toBe(100)
    expect(bounds?.height).toBe(40)
  })

  it('rejects a constrained transformed footprint that cannot fit', () => {
    expect(
      clampElementGeometry(
        { x: 0, y: 0, width: 800, height: 800 },
        { rotationDegrees: 45, flipX: false, flipY: false },
        'constrained',
        { width: 800, height: 1280 },
      ),
    ).toBeUndefined()
  })

  it('allows bleed while keeping at least one logical unit intersecting', () => {
    expect(
      clampElementGeometry(
        { x: -200, y: 20, width: 100, height: 100 },
        IDENTITY_ELEMENT_TRANSFORM,
        'bleed',
        { width: 800, height: 1280 },
      ),
    ).toEqual({ x: -99, y: 20, width: 100, height: 100 })

    expect(
      clampElementGeometry(
        { x: -40, y: 20, width: 100, height: 100 },
        IDENTITY_ELEMENT_TRANSFORM,
        'bleed',
        { width: 800, height: 1280 },
      ),
    ).toEqual({ x: -40, y: 20, width: 100, height: 100 })
  })
})

describe('cover crop geometry', () => {
  it('derives the largest centered source crop that covers the frame', () => {
    expect(
      getCoverCropRect(
        { width: 1600, height: 900 },
        { width: 400, height: 400 },
        { focusX: 0.5, focusY: 0.5, zoom: 1 },
      ),
    ).toEqual({ x: 350, y: 0, width: 900, height: 900 })
  })

  it('applies zoom and clamps a requested focus to the source edge', () => {
    expect(
      getCoverCropRect(
        { width: 1600, height: 900 },
        { width: 400, height: 400 },
        { focusX: 1, focusY: 0, zoom: 2 },
      ),
    ).toEqual({ x: 1150, y: 0, width: 450, height: 450 })
  })

  it('returns draw-ready source and destination rectangles', () => {
    expect(
      getCoverImagePlacement(
        { width: 800, height: 1200 },
        { x: 20, y: 40, width: 400, height: 200 },
        { focusX: 0.5, focusY: 0.5, zoom: 1 },
      ),
    ).toEqual({
      source: { x: 0, y: 400, width: 800, height: 400 },
      destination: { x: 20, y: 40, width: 400, height: 200 },
    })
  })
})

describe('image mask geometry', () => {
  it('maps rectangle and normalized polygon masks into logical bounds', () => {
    expect(
      getImageMaskPath(
        { mask: { kind: 'rectangle', cornerRadius: 80 } },
        { x: 10, y: 20, width: 100, height: 60 },
      ),
    ).toEqual({
      kind: 'rectangle',
      bounds: { x: 10, y: 20, width: 100, height: 60 },
      cornerRadius: 30,
    })

    expect(
      getImageMaskPath(
        {
          mask: {
            kind: 'polygon',
            points: [
              { x: 0, y: 0 },
              { x: 1, y: 0.25 },
              { x: 0.75, y: 1 },
            ],
          },
        },
        { x: 100, y: 200, width: 400, height: 300 },
      ),
    ).toEqual({
      kind: 'polygon',
      points: [
        { x: 100, y: 200 },
        { x: 500, y: 275 },
        { x: 400, y: 500 },
      ],
    })
  })

  it('rejects underspecified, out-of-range, and zero-area polygons', () => {
    expect(
      isValidNormalizedPolygon([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ]),
    ).toBe(false)
    expect(
      isValidNormalizedPolygon([
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 0, y: 1 },
      ]),
    ).toBe(false)
    expect(
      isValidNormalizedPolygon([
        { x: 0, y: 0 },
        { x: 0.5, y: 0.5 },
        { x: 1, y: 1 },
      ]),
    ).toBe(false)
  })
})
