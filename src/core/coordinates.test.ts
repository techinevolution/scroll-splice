import { describe, expect, it } from 'vitest'

import {
  CENTER_SNAP_THRESHOLD_PX,
  ELEMENT_SNAP_THRESHOLD_PX,
  boundsIntersectViewport,
  boundsIntersectVerticalViewport,
  clientPointToEpisodePosition,
  centerBoundsInViewport2D,
  centerBoundsInViewport,
  clampElementPosition,
  clampViewportPosition,
  clampViewportY,
  clampZoomFactor,
  getFitScale,
  getEpisodeCenterSnap,
  getElementSnap,
  getLogicalViewportDimensions,
  getLogicalViewportHeight,
  getMinimapEpisodeRect,
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
  it('maps a client drop point through canvas offset, zoom, and pan', () => {
    expect(
      clientPointToEpisodePosition(
        { x: 300, y: 250 },
        { x: 100, y: 50 },
        { x: -600, y: -2_000 },
        2,
      ),
    ).toEqual({ x: 400, y: 1_100 })

    expect(
      clientPointToEpisodePosition(
        { x: 300, y: 175 },
        { x: 100, y: 50 },
        { x: 100, y: -100 },
        0.5,
      ),
    ).toEqual({ x: 200, y: 450 })

    expect(
      clientPointToEpisodePosition(
        { x: 150, y: 175 },
        { x: 100, y: 50 },
        { x: 100, y: -100 },
        0.5,
      ),
    ).toEqual({ x: -100, y: 450 })

    expect(
      clientPointToEpisodePosition(
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        0,
      ),
    ).toBeUndefined()
  })

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
      x: 90,
      y: 46,
      width: 20,
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
        { x: 5, y: 10 },
      ),
    ).toEqual({ x: 300, y: 1_000 })
  })

  it('letterboxes the episode and clamps minimap navigation to fitted geometry', () => {
    const episode = { width: 800, height: 4_600 }
    const wideMinimap = { width: 200, height: 230 }

    expect(getMinimapEpisodeRect(episode, wideMinimap)).toEqual({
      x: 80,
      y: 0,
      width: 40,
      height: 230,
    })
    expect(
      minimapPointerToViewportPosition(
        { x: 0, y: 115 },
        wideMinimap,
        episode,
        { width: 400, height: 920 },
      ),
    ).toEqual({ x: 0, y: 1_840 })
    expect(
      minimapPointerToViewportPosition(
        { x: 200, y: 115 },
        wideMinimap,
        episode,
        { width: 400, height: 920 },
      ),
    ).toEqual({ x: 400, y: 1_840 })
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

  it.each([
    { viewScale: 0.5, insideOffset: 16, outsideOffset: 16.01 },
    { viewScale: 1, insideOffset: 8, outsideOffset: 8.01 },
    { viewScale: 2, insideOffset: 4, outsideOffset: 4.01 },
  ])(
    'snaps to the episode center within $viewScale scale threshold',
    ({ viewScale, insideOffset, outsideOffset }) => {
      const centeredX = (800 - 150) / 2

      expect(
        getEpisodeCenterSnap(
          centeredX + insideOffset,
          150,
          800,
          viewScale,
        ),
      ).toEqual({ x: centeredX, snapped: true })
      expect(
        getEpisodeCenterSnap(
          centeredX + outsideOffset,
          150,
          800,
          viewScale,
        ),
      ).toEqual({ x: centeredX + outsideOffset, snapped: false })
    },
  )

  it('leaves invalid center-snap requests unsnapped', () => {
    expect(getEpisodeCenterSnap(10, 0, 800, 1)).toEqual({
      x: 10,
      snapped: false,
    })
    expect(
      getEpisodeCenterSnap(10, 100, 800, 1, -CENTER_SNAP_THRESHOLD_PX),
    ).toEqual({ x: 10, snapped: false })
  })

  it('snaps independently to episode edges and center guides', () => {
    expect(
      getElementSnap(
        { x: 326, y: 4 },
        { width: 150, height: 100 },
        { width: 800, height: 4_600 },
        [],
        1,
      ),
    ).toEqual({
      position: { x: 325, y: 0 },
      snappedX: true,
      snappedY: true,
      guideX: 400,
      guideY: 0,
    })

    expect(
      getElementSnap(
        { x: 646, y: 4_496 },
        { width: 150, height: 100 },
        { width: 800, height: 4_600 },
        [],
        1,
      ),
    ).toEqual({
      position: { x: 650, y: 4_500 },
      snappedX: true,
      snappedY: true,
      guideX: 800,
      guideY: 4_600,
    })
  })

  it('aligns or places an element beside nearby element bounds', () => {
    const nearby = [{ x: 100, y: 300, width: 200, height: 180 }]

    expect(
      getElementSnap(
        { x: 104, y: 342 },
        { width: 120, height: 96 },
        { width: 800, height: 4_600 },
        nearby,
        1,
      ),
    ).toEqual({
      position: { x: 100, y: 342 },
      snappedX: true,
      snappedY: true,
      guideX: 100,
      guideY: 390,
    })

    expect(
      getElementSnap(
        { x: 304, y: 484 },
        { width: 120, height: 96 },
        { width: 800, height: 4_600 },
        nearby,
        1,
      ),
    ).toEqual({
      position: { x: 300, y: 480 },
      snappedX: true,
      snappedY: true,
      guideX: 300,
      guideY: 480,
    })
  })

  it('keeps snap tolerance pixel-stable across zoom and ignores invalid bounds', () => {
    const requested = { x: 113, y: 526 }
    const nearby = [
      { x: 100, y: 500, width: 200, height: 100 },
      { x: Number.NaN, y: 0, width: 10, height: 10 },
    ]

    expect(
      getElementSnap(
        requested,
        { width: 80, height: 80 },
        { width: 800, height: 4_600 },
        nearby,
        0.5,
      ),
    ).toMatchObject({
      position: { x: 100, y: 520 },
      snappedX: true,
      snappedY: true,
    })
    expect(
      getElementSnap(
        requested,
        { width: 80, height: 80 },
        { width: 800, height: 4_600 },
        nearby,
        2,
      ),
    ).toEqual({
      position: requested,
      snappedX: false,
      snappedY: false,
    })
    expect(
      getElementSnap(
        requested,
        { width: 0, height: 80 },
        { width: 800, height: 4_600 },
        nearby,
        1,
        -ELEMENT_SNAP_THRESHOLD_PX,
      ),
    ).toEqual({
      position: requested,
      snappedX: false,
      snappedY: false,
    })
  })
})
