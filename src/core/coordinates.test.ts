import { describe, expect, it } from 'vitest'

import {
  boundsIntersectViewport,
  boundsIntersectVerticalViewport,
  centerBoundsInViewport2D,
  centerBoundsInViewport,
  clampElementPosition,
  clampViewportPosition,
  clampViewportY,
  clampZoomFactor,
  getFitScale,
  getLogicalViewportDimensions,
  getLogicalViewportHeight,
  getMinimapViewportBox,
  getMinimapViewportBox2D,
  getVerticalScrollProgress,
  getViewportScale,
  minimapPointerToViewportPosition,
  minimapPointerToViewportY,
  preserveViewportCenter,
  revealBoundsInViewport,
} from './coordinates'

describe('viewport coordinates', () => {
  it('fits the fixed logical width and derives the visible logical height', () => {
    const scale = getFitScale(600, 800)

    expect(scale).toBe(0.75)
    expect(getLogicalViewportHeight(675, scale, 4_600)).toBe(900)
  })

  it('clamps Fit Width-relative zoom and derives both logical dimensions', () => {
    expect(clampZoomFactor(0.25)).toBe(0.5)
    expect(clampZoomFactor(1.25)).toBe(1.25)
    expect(clampZoomFactor(4)).toBe(2)
    expect(clampZoomFactor(Number.NaN)).toBe(1)

    expect(getViewportScale(600, 800, 2)).toBe(1.5)
    expect(getLogicalViewportDimensions(600, 600, 800, 4_600, 0.5)).toEqual(
      { width: 800, height: 1_600 },
    )
    expect(getLogicalViewportDimensions(600, 600, 800, 4_600, 1)).toEqual({
      width: 800,
      height: 800,
    })
    expect(getLogicalViewportDimensions(600, 600, 800, 4_600, 2)).toEqual({
      width: 400,
      height: 400,
    })
  })

  it('clamps viewport movement to the episode', () => {
    expect(clampViewportY(-100, 4_600, 900)).toBe(0)
    expect(clampViewportY(2_000, 4_600, 900)).toBe(2_000)
    expect(clampViewportY(4_500, 4_600, 900)).toBe(3_700)
    expect(
      clampViewportPosition(
        { x: -100, y: 4_500 },
        { width: 800, height: 4_600 },
        { width: 400, height: 900 },
      ),
    ).toEqual({ x: 0, y: 3_700 })
  })

  it('preserves the logical center while zooming and clamps at the edges', () => {
    expect(
      preserveViewportCenter(
        { x: 100, y: 1_000, width: 400, height: 900 },
        { width: 200, height: 450 },
        { width: 800, height: 4_600 },
      ),
    ).toEqual({ x: 200, y: 1_225 })

    expect(
      preserveViewportCenter(
        { x: 0, y: 0, width: 800, height: 900 },
        { width: 400, height: 450 },
        { width: 800, height: 4_600 },
      ),
    ).toEqual({ x: 200, y: 225 })
  })

  it('centers an off-screen element and reports viewport intersection', () => {
    const bounds = { x: 80, y: 3_900, width: 640, height: 70 }
    const centeredY = centerBoundsInViewport(bounds, 4_600, 900)

    expect(centeredY).toBe(3_485)
    expect(boundsIntersectVerticalViewport(bounds, 0, 900)).toBe(false)
    expect(boundsIntersectVerticalViewport(bounds, centeredY, 900)).toBe(true)
  })

  it('intersects and reveals elements in both viewport axes', () => {
    const bounds = { x: 650, y: 3_900, width: 100, height: 70 }
    const viewport = { x: 0, y: 0, width: 400, height: 900 }
    const episode = { width: 800, height: 4_600 }

    expect(boundsIntersectViewport(bounds, viewport)).toBe(false)
    expect(
      centerBoundsInViewport2D(bounds, episode, {
        width: viewport.width,
        height: viewport.height,
      }),
    ).toEqual({ x: 400, y: 3_485 })
    expect(revealBoundsInViewport(bounds, viewport, episode)).toEqual({
      x: 400,
      y: 3_485,
    })

    expect(
      revealBoundsInViewport(
        { ...bounds, y: 500 },
        viewport,
        episode,
      ),
    ).toEqual({ x: 400, y: 0 })
  })

  it('uses the same proportional mapping for minimap display and navigation', () => {
    expect(getMinimapViewportBox(920, 920, 4_600, 230)).toEqual({
      y: 46,
      height: 46,
    })
    expect(minimapPointerToViewportY(115, 230, 4_600, 920)).toBe(1_840)
  })

  it('maps an exact two-dimensional minimap viewport and pointer navigation', () => {
    const episode = { width: 800, height: 4_600 }
    const minimap = { width: 200, height: 230 }
    const viewport = { x: 200, y: 920, width: 400, height: 920 }

    expect(getMinimapViewportBox2D(viewport, episode, minimap)).toEqual({
      x: 50,
      y: 46,
      width: 100,
      height: 46,
    })
    expect(
      minimapPointerToViewportPosition(
        { x: 150, y: 115 },
        minimap,
        episode,
        { width: viewport.width, height: viewport.height },
      ),
    ).toEqual({ x: 400, y: 1_840 })
    expect(
      minimapPointerToViewportPosition(
        { x: 100, y: 60 },
        minimap,
        episode,
        { width: viewport.width, height: viewport.height },
        { x: 25, y: 10 },
      ),
    ).toEqual({ x: 300, y: 1_000 })
  })

  it('reports scroll progress over the navigable range so the bottom is 100%', () => {
    expect(getVerticalScrollProgress(0, 900, 4_600)).toBe(0)
    expect(getVerticalScrollProgress(1_850, 900, 4_600)).toBe(0.5)
    expect(getVerticalScrollProgress(3_700, 900, 4_600)).toBe(1)
    expect(getVerticalScrollProgress(4_600, 900, 4_600)).toBe(1)
    expect(getVerticalScrollProgress(0, 4_600, 4_600)).toBe(1)
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
