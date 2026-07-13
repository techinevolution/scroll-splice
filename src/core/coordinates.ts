import type { ElementBounds } from './episode'

export interface LogicalPosition {
  readonly x: number
  readonly y: number
}

export interface MinimapViewportBox {
  readonly y: number
  readonly height: number
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum))
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
