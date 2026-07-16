import type { ElementBounds } from './episode'

export interface LogicalPosition {
  readonly x: number
  readonly y: number
}

export interface LogicalDimensions {
  readonly width: number
  readonly height: number
}

export interface LogicalViewport extends LogicalPosition, LogicalDimensions {}

export interface MinimapViewportBox {
  readonly y: number
  readonly height: number
}

export interface MinimapViewportRect extends MinimapViewportBox {
  readonly x: number
  readonly width: number
}

export interface HorizontalSnapResult {
  readonly x: number
  readonly snapped: boolean
}

export interface ElementSnapResult {
  readonly position: LogicalPosition
  readonly snappedX: boolean
  readonly snappedY: boolean
  readonly guideX?: number
  readonly guideY?: number
}

export const MIN_ZOOM_FACTOR = 0.5
export const MAX_ZOOM_FACTOR = 2
export const DEFAULT_ZOOM_FACTOR = 1
export const CENTER_SNAP_THRESHOLD_PX = 8
export const ELEMENT_SNAP_THRESHOLD_PX = 8

export function clientPointToEpisodePosition(
  clientPoint: LogicalPosition,
  canvasClientOrigin: LogicalPosition,
  episodePixelOffset: LogicalPosition,
  viewScale: number,
): LogicalPosition | undefined {
  if (
    !Number.isFinite(clientPoint.x) ||
    !Number.isFinite(clientPoint.y) ||
    !Number.isFinite(canvasClientOrigin.x) ||
    !Number.isFinite(canvasClientOrigin.y) ||
    !Number.isFinite(episodePixelOffset.x) ||
    !Number.isFinite(episodePixelOffset.y) ||
    !Number.isFinite(viewScale) ||
    viewScale <= 0
  ) {
    return undefined
  }

  return {
    x:
      (clientPoint.x - canvasClientOrigin.x - episodePixelOffset.x) /
      viewScale,
    y:
      (clientPoint.y - canvasClientOrigin.y - episodePixelOffset.y) /
      viewScale,
  }
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum))
}

export function clampZoomFactor(requestedZoomFactor: number): number {
  if (!Number.isFinite(requestedZoomFactor)) {
    return DEFAULT_ZOOM_FACTOR
  }

  return clamp(requestedZoomFactor, MIN_ZOOM_FACTOR, MAX_ZOOM_FACTOR)
}

export function getFitScale(
  viewportPixelWidth: number,
  episodeLogicalWidth: number,
): number {
  if (viewportPixelWidth <= 0 || episodeLogicalWidth <= 0) {
    return 1
  }

  return viewportPixelWidth / episodeLogicalWidth
}

export function getViewportScale(
  viewportPixelWidth: number,
  episodeLogicalWidth: number,
  zoomFactor: number,
): number {
  return (
    getFitScale(viewportPixelWidth, episodeLogicalWidth) *
    clampZoomFactor(zoomFactor)
  )
}

export function getLogicalViewportDimensions(
  viewportPixelWidth: number,
  viewportPixelHeight: number,
  episodeLogicalWidth: number,
  episodeLogicalHeight: number,
  zoomFactor: number,
): LogicalDimensions {
  const safeEpisodeWidth = Math.max(episodeLogicalWidth, 0)
  const safeEpisodeHeight = Math.max(episodeLogicalHeight, 0)

  if (
    viewportPixelWidth <= 0 ||
    viewportPixelHeight <= 0 ||
    safeEpisodeWidth <= 0 ||
    safeEpisodeHeight <= 0
  ) {
    return {
      width: safeEpisodeWidth,
      height: safeEpisodeHeight,
    }
  }

  const scale = getViewportScale(
    viewportPixelWidth,
    safeEpisodeWidth,
    zoomFactor,
  )

  return {
    width: Math.min(viewportPixelWidth / scale, safeEpisodeWidth),
    height: Math.min(viewportPixelHeight / scale, safeEpisodeHeight),
  }
}

export function getLogicalViewportHeight(
  viewportPixelHeight: number,
  fitScale: number,
  episodeLogicalHeight: number,
): number {
  if (viewportPixelHeight <= 0 || fitScale <= 0) {
    return episodeLogicalHeight
  }

  return Math.min(viewportPixelHeight / fitScale, episodeLogicalHeight)
}

export function clampViewportY(
  requestedY: number,
  episodeLogicalHeight: number,
  viewportLogicalHeight: number,
): number {
  return clamp(
    requestedY,
    0,
    Math.max(episodeLogicalHeight - viewportLogicalHeight, 0),
  )
}

export function clampViewportPosition(
  requestedPosition: LogicalPosition,
  episodeLogicalDimensions: LogicalDimensions,
  viewportLogicalDimensions: LogicalDimensions,
): LogicalPosition {
  return {
    x: clamp(
      requestedPosition.x,
      0,
      episodeLogicalDimensions.width - viewportLogicalDimensions.width,
    ),
    y: clampViewportY(
      requestedPosition.y,
      episodeLogicalDimensions.height,
      viewportLogicalDimensions.height,
    ),
  }
}

export function preserveViewportCenter(
  currentViewport: LogicalViewport,
  nextViewportLogicalDimensions: LogicalDimensions,
  episodeLogicalDimensions: LogicalDimensions,
): LogicalPosition {
  return clampViewportPosition(
    {
      x:
        currentViewport.x +
        currentViewport.width / 2 -
        nextViewportLogicalDimensions.width / 2,
      y:
        currentViewport.y +
        currentViewport.height / 2 -
        nextViewportLogicalDimensions.height / 2,
    },
    episodeLogicalDimensions,
    nextViewportLogicalDimensions,
  )
}

export function centerBoundsInViewport(
  bounds: ElementBounds,
  episodeLogicalHeight: number,
  viewportLogicalHeight: number,
): number {
  const elementCenter = bounds.y + bounds.height / 2

  return clampViewportY(
    elementCenter - viewportLogicalHeight / 2,
    episodeLogicalHeight,
    viewportLogicalHeight,
  )
}

export function boundsIntersectVerticalViewport(
  bounds: ElementBounds,
  viewportY: number,
  viewportLogicalHeight: number,
): boolean {
  const viewportBottom = viewportY + viewportLogicalHeight
  const elementBottom = bounds.y + bounds.height

  return elementBottom > viewportY && bounds.y < viewportBottom
}

export function boundsIntersectViewport(
  bounds: ElementBounds,
  viewport: LogicalViewport,
): boolean {
  const viewportRight = viewport.x + viewport.width
  const viewportBottom = viewport.y + viewport.height
  const elementRight = bounds.x + bounds.width
  const elementBottom = bounds.y + bounds.height

  return (
    elementRight > viewport.x &&
    bounds.x < viewportRight &&
    elementBottom > viewport.y &&
    bounds.y < viewportBottom
  )
}

export function centerBoundsInViewport2D(
  bounds: ElementBounds,
  episodeLogicalDimensions: LogicalDimensions,
  viewportLogicalDimensions: LogicalDimensions,
): LogicalPosition {
  return clampViewportPosition(
    {
      x:
        bounds.x +
        bounds.width / 2 -
        viewportLogicalDimensions.width / 2,
      y:
        bounds.y +
        bounds.height / 2 -
        viewportLogicalDimensions.height / 2,
    },
    episodeLogicalDimensions,
    viewportLogicalDimensions,
  )
}

export function revealBoundsInViewport(
  bounds: ElementBounds,
  viewport: LogicalViewport,
  episodeLogicalDimensions: LogicalDimensions,
): LogicalPosition {
  const horizontalIntersection =
    bounds.x + bounds.width > viewport.x &&
    bounds.x < viewport.x + viewport.width
  const verticalIntersection = boundsIntersectVerticalViewport(
    bounds,
    viewport.y,
    viewport.height,
  )

  return clampViewportPosition(
    {
      x: horizontalIntersection
        ? viewport.x
        : bounds.x + bounds.width / 2 - viewport.width / 2,
      y: verticalIntersection
        ? viewport.y
        : bounds.y + bounds.height / 2 - viewport.height / 2,
    },
    episodeLogicalDimensions,
    viewport,
  )
}

export function getMinimapViewportBox(
  viewportY: number,
  viewportLogicalHeight: number,
  episodeLogicalHeight: number,
  minimapPixelHeight: number,
): MinimapViewportBox {
  if (episodeLogicalHeight <= 0 || minimapPixelHeight <= 0) {
    return { y: 0, height: 0 }
  }

  const scale = minimapPixelHeight / episodeLogicalHeight

  return {
    y: clamp(viewportY * scale, 0, minimapPixelHeight),
    height: clamp(viewportLogicalHeight * scale, 0, minimapPixelHeight),
  }
}

export function getMinimapViewportBox2D(
  viewport: LogicalViewport,
  episodeLogicalDimensions: LogicalDimensions,
  minimapPixelDimensions: LogicalDimensions,
): MinimapViewportRect {
  if (
    episodeLogicalDimensions.width <= 0 ||
    episodeLogicalDimensions.height <= 0 ||
    minimapPixelDimensions.width <= 0 ||
    minimapPixelDimensions.height <= 0
  ) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  const episodeRect = getMinimapEpisodeRect(
    episodeLogicalDimensions,
    minimapPixelDimensions,
  )
  const scale = episodeRect.width / episodeLogicalDimensions.width
  const width = clamp(
    viewport.width * scale,
    0,
    episodeRect.width,
  )
  const height = clamp(
    viewport.height * scale,
    0,
    episodeRect.height,
  )

  return {
    x: clamp(
      episodeRect.x + viewport.x * scale,
      episodeRect.x,
      episodeRect.x + episodeRect.width - width,
    ),
    y: clamp(
      episodeRect.y + viewport.y * scale,
      episodeRect.y,
      episodeRect.y + episodeRect.height - height,
    ),
    width,
    height,
  }
}

/**
 * Fits the full episode into the minimap without changing its aspect ratio.
 * Any unused space is centered as letterboxing around this returned rect.
 */
export function getMinimapEpisodeRect(
  episodeLogicalDimensions: LogicalDimensions,
  minimapPixelDimensions: LogicalDimensions,
): MinimapViewportRect {
  if (
    episodeLogicalDimensions.width <= 0 ||
    episodeLogicalDimensions.height <= 0 ||
    minimapPixelDimensions.width <= 0 ||
    minimapPixelDimensions.height <= 0
  ) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  const scale = Math.min(
    minimapPixelDimensions.width / episodeLogicalDimensions.width,
    minimapPixelDimensions.height / episodeLogicalDimensions.height,
  )
  const width = episodeLogicalDimensions.width * scale
  const height = episodeLogicalDimensions.height * scale

  return {
    x: (minimapPixelDimensions.width - width) / 2,
    y: (minimapPixelDimensions.height - height) / 2,
    width,
    height,
  }
}

export function minimapPointerToViewportPosition(
  pointerPixelPosition: LogicalPosition,
  minimapPixelDimensions: LogicalDimensions,
  episodeLogicalDimensions: LogicalDimensions,
  viewportLogicalDimensions: LogicalDimensions,
  pointerOffsetInViewportBox?: LogicalPosition,
): LogicalPosition {
  if (
    minimapPixelDimensions.width <= 0 ||
    minimapPixelDimensions.height <= 0 ||
    episodeLogicalDimensions.width <= 0 ||
    episodeLogicalDimensions.height <= 0
  ) {
    return { x: 0, y: 0 }
  }

  const episodeRect = getMinimapEpisodeRect(
    episodeLogicalDimensions,
    minimapPixelDimensions,
  )
  const viewportBox = getMinimapViewportBox2D(
    {
      x: 0,
      y: 0,
      ...viewportLogicalDimensions,
    },
    episodeLogicalDimensions,
    minimapPixelDimensions,
  )
  const pointerOffset = pointerOffsetInViewportBox ?? {
    x: viewportBox.width / 2,
    y: viewportBox.height / 2,
  }
  const scale = episodeRect.width / episodeLogicalDimensions.width
  const requestedPosition = {
    x:
      (clamp(
        pointerPixelPosition.x,
        episodeRect.x,
        episodeRect.x + episodeRect.width,
      ) -
        episodeRect.x -
        pointerOffset.x) /
      scale,
    y:
      (clamp(
        pointerPixelPosition.y,
        episodeRect.y,
        episodeRect.y + episodeRect.height,
      ) -
        episodeRect.y -
        pointerOffset.y) /
      scale,
  }

  return clampViewportPosition(
    requestedPosition,
    episodeLogicalDimensions,
    viewportLogicalDimensions,
  )
}

export function minimapPointerToViewportY(
  pointerPixelY: number,
  minimapPixelHeight: number,
  episodeLogicalHeight: number,
  viewportLogicalHeight: number,
): number {
  if (minimapPixelHeight <= 0) {
    return 0
  }

  const requestedCenter =
    (clamp(pointerPixelY, 0, minimapPixelHeight) / minimapPixelHeight) *
    episodeLogicalHeight

  return clampViewportY(
    requestedCenter - viewportLogicalHeight / 2,
    episodeLogicalHeight,
    viewportLogicalHeight,
  )
}

export function getVerticalScrollProgress(
  viewportY: number,
  viewportLogicalHeight: number,
  episodeLogicalHeight: number,
): number {
  if (episodeLogicalHeight <= 0) {
    return 0
  }

  const maximumViewportY = Math.max(
    episodeLogicalHeight - viewportLogicalHeight,
    0,
  )

  if (maximumViewportY === 0) {
    return 1
  }

  return clamp(viewportY / maximumViewportY, 0, 1)
}

export function clampElementPosition(
  requestedPosition: LogicalPosition,
  bounds: Pick<ElementBounds, 'width' | 'height'>,
  episodeLogicalWidth: number,
  episodeLogicalHeight: number,
): LogicalPosition {
  return {
    x: clamp(requestedPosition.x, 0, episodeLogicalWidth - bounds.width),
    y: clamp(requestedPosition.y, 0, episodeLogicalHeight - bounds.height),
  }
}

export function getEpisodeCenterSnap(
  requestedX: number,
  elementWidth: number,
  episodeWidth: number,
  viewScale: number,
  thresholdPixels = CENTER_SNAP_THRESHOLD_PX,
): HorizontalSnapResult {
  if (
    !Number.isFinite(requestedX) ||
    !Number.isFinite(elementWidth) ||
    !Number.isFinite(episodeWidth) ||
    !Number.isFinite(viewScale) ||
    !Number.isFinite(thresholdPixels) ||
    elementWidth <= 0 ||
    episodeWidth <= 0 ||
    viewScale <= 0 ||
    thresholdPixels < 0
  ) {
    return { x: requestedX, snapped: false }
  }

  const centeredX = (episodeWidth - elementWidth) / 2
  const thresholdLogicalUnits = thresholdPixels / viewScale

  return Math.abs(requestedX - centeredX) <= thresholdLogicalUnits
    ? { x: centeredX, snapped: true }
    : { x: requestedX, snapped: false }
}

interface AxisSnapCandidate {
  readonly position: number
  readonly guide: number
}

function getClosestAxisSnap(
  requestedPosition: number,
  candidates: readonly AxisSnapCandidate[],
  maximumPosition: number,
  thresholdLogicalUnits: number,
): { readonly position: number; readonly guide?: number } {
  let closest:
    | (AxisSnapCandidate & { readonly distance: number })
    | undefined

  for (const candidate of candidates) {
    if (
      !Number.isFinite(candidate.position) ||
      !Number.isFinite(candidate.guide) ||
      candidate.position < 0 ||
      candidate.position > maximumPosition
    ) {
      continue
    }

    const distance = Math.abs(candidate.position - requestedPosition)

    if (
      distance <= thresholdLogicalUnits &&
      (closest === undefined || distance < closest.distance)
    ) {
      closest = { ...candidate, distance }
    }
  }

  return closest
    ? { position: closest.position, guide: closest.guide }
    : { position: requestedPosition }
}

/**
 * Snaps an element to the episode edges/center and to nearby element edges,
 * centers, and adjacent boundaries. The returned guide coordinates are in
 * episode logical units so every renderer can draw the same alignment hint.
 */
export function getElementSnap(
  requestedPosition: LogicalPosition,
  elementDimensions: LogicalDimensions,
  episodeDimensions: LogicalDimensions,
  nearbyBounds: readonly ElementBounds[],
  viewScale: number,
  thresholdPixels = ELEMENT_SNAP_THRESHOLD_PX,
): ElementSnapResult {
  if (
    !Number.isFinite(requestedPosition.x) ||
    !Number.isFinite(requestedPosition.y) ||
    !Number.isFinite(elementDimensions.width) ||
    !Number.isFinite(elementDimensions.height) ||
    !Number.isFinite(episodeDimensions.width) ||
    !Number.isFinite(episodeDimensions.height) ||
    !Number.isFinite(viewScale) ||
    !Number.isFinite(thresholdPixels) ||
    elementDimensions.width <= 0 ||
    elementDimensions.height <= 0 ||
    episodeDimensions.width <= 0 ||
    episodeDimensions.height <= 0 ||
    viewScale <= 0 ||
    thresholdPixels < 0
  ) {
    return {
      position: requestedPosition,
      snappedX: false,
      snappedY: false,
    }
  }

  const { width, height } = elementDimensions
  const thresholdLogicalUnits = thresholdPixels / viewScale
  const horizontalCandidates: AxisSnapCandidate[] = [
    { position: 0, guide: 0 },
    {
      position: (episodeDimensions.width - width) / 2,
      guide: episodeDimensions.width / 2,
    },
    {
      position: episodeDimensions.width - width,
      guide: episodeDimensions.width,
    },
  ]
  const verticalCandidates: AxisSnapCandidate[] = [
    { position: 0, guide: 0 },
    {
      position: (episodeDimensions.height - height) / 2,
      guide: episodeDimensions.height / 2,
    },
    {
      position: episodeDimensions.height - height,
      guide: episodeDimensions.height,
    },
  ]

  for (const bounds of nearbyBounds) {
    if (
      !Number.isFinite(bounds.x) ||
      !Number.isFinite(bounds.y) ||
      !Number.isFinite(bounds.width) ||
      !Number.isFinite(bounds.height) ||
      bounds.width <= 0 ||
      bounds.height <= 0
    ) {
      continue
    }

    const right = bounds.x + bounds.width
    const bottom = bounds.y + bounds.height
    const centerX = bounds.x + bounds.width / 2
    const centerY = bounds.y + bounds.height / 2

    horizontalCandidates.push(
      { position: bounds.x, guide: bounds.x },
      { position: centerX - width / 2, guide: centerX },
      { position: right - width, guide: right },
      { position: bounds.x - width, guide: bounds.x },
      { position: right, guide: right },
    )
    verticalCandidates.push(
      { position: bounds.y, guide: bounds.y },
      { position: centerY - height / 2, guide: centerY },
      { position: bottom - height, guide: bottom },
      { position: bounds.y - height, guide: bounds.y },
      { position: bottom, guide: bottom },
    )
  }

  const horizontal = getClosestAxisSnap(
    requestedPosition.x,
    horizontalCandidates,
    Math.max(episodeDimensions.width - width, 0),
    thresholdLogicalUnits,
  )
  const vertical = getClosestAxisSnap(
    requestedPosition.y,
    verticalCandidates,
    Math.max(episodeDimensions.height - height, 0),
    thresholdLogicalUnits,
  )

  return {
    position: {
      x: horizontal.position,
      y: vertical.position,
    },
    snappedX: horizontal.guide !== undefined,
    snappedY: vertical.guide !== undefined,
    ...(horizontal.guide === undefined ? {} : { guideX: horizontal.guide }),
    ...(vertical.guide === undefined ? {} : { guideY: vertical.guide }),
  }
}
