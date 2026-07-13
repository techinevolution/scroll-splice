import { describe, expect, it } from 'vitest'

import {
  boundsIntersectVerticalViewport,
  centerBoundsInViewport,
  clampElementPosition,
  clampViewportY,
  getFitScale,
  getLogicalViewportHeight,
  getMinimapViewportBox,
  minimapPointerToViewportY,
} from './coordinates'

describe('viewport coordinates', () => {
  it('fits the fixed logical width and derives the visible logical height', () => {
    const scale = getFitScale(600, 800)

    expect(scale).toBe(0.75)
    expect(getLogicalViewportHeight(675, scale, 4_600)).toBe(900)
  })

  it('clamps viewport movement to the episode', () => {
    expect(clampViewportY(-100, 4_600, 900)).toBe(0)
    expect(clampViewportY(2_000, 4_600, 900)).toBe(2_000)
    expect(clampViewportY(4_500, 4_600, 900)).toBe(3_700)
  })

  it('centers an off-screen element and reports viewport intersection', () => {
    const bounds = { x: 80, y: 3_900, width: 640, height: 70 }
    const centeredY = centerBoundsInViewport(bounds, 4_600, 900)

    expect(centeredY).toBe(3_485)
    expect(boundsIntersectVerticalViewport(bounds, 0, 900)).toBe(false)
    expect(boundsIntersectVerticalViewport(bounds, centeredY, 900)).toBe(true)
  })

  it('uses the same proportional mapping for minimap display and navigation', () => {
    expect(getMinimapViewportBox(920, 920, 4_600, 230)).toEqual({
      y: 46,
      height: 46,
    })
    expect(minimapPointerToViewportY(115, 230, 4_600, 920)).toBe(1_840)
  })
})

describe('element coordinates', () => {
  it('keeps moved elements fully inside the logical episode', () => {
    expect(
      clampElementPosition(
        { x: 790, y: -20 },
        { width: 140, height: 100 },
        800,
        4_600,
      ),
    ).toEqual({ x: 660, y: 0 })
  })
})
