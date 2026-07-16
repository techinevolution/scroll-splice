import type {
  ElementBounds,
  ElementOverflow,
  ElementTransform,
  EpisodeElement,
  ImageCrop,
  ImageFrame,
  ImageMask,
  NormalizedPoint,
} from './episode'
import { getSpeechBalloonPath } from './speechBalloonGeometry'

const FULL_TURN_DEGREES = 360
const HALF_TURN_DEGREES = 180
const MIN_BLEED_INTERSECTION = 1
const POLYGON_AREA_EPSILON = 0.000001

export interface GeometryDimensions {
  readonly width: number
  readonly height: number
}

export interface CoverImagePlacement {
  readonly source: ElementBounds
  readonly destination: ElementBounds
}

export type ImageMaskPath =
  | {
      readonly kind: 'rectangle'
      readonly bounds: ElementBounds
      readonly cornerRadius: number
    }
  | {
      readonly kind: 'polygon'
      readonly points: readonly NormalizedPoint[]
    }

export function normalizeRotationDegrees(rotationDegrees: number): number {
  if (!Number.isFinite(rotationDegrees)) {
    return Number.NaN
  }

  const normalized =
    ((rotationDegrees + HALF_TURN_DEGREES) % FULL_TURN_DEGREES +
      FULL_TURN_DEGREES) %
      FULL_TURN_DEGREES -
    HALF_TURN_DEGREES

  return Object.is(normalized, -0) ? 0 : normalized
}

export function normalizeElementTransform(
  transform: ElementTransform,
): ElementTransform | undefined {
  if (
    !transform ||
    typeof transform.flipX !== 'boolean' ||
    typeof transform.flipY !== 'boolean'
  ) {
    return undefined
  }

  const rotationDegrees = normalizeRotationDegrees(transform.rotationDegrees)

  return Number.isFinite(rotationDegrees)
    ? {
        rotationDegrees,
        flipX: transform.flipX,
        flipY: transform.flipY,
      }
    : undefined
}

export function getTransformedRectBounds(
  bounds: ElementBounds,
  transform: ElementTransform,
): ElementBounds | undefined {
  const normalizedTransform = normalizeElementTransform(transform)

  if (!isFinitePositiveBounds(bounds) || !normalizedTransform) {
    return undefined
  }

  const radians = (normalizedTransform.rotationDegrees * Math.PI) / 180
  const cosine = Math.abs(Math.cos(radians))
  const sine = Math.abs(Math.sin(radians))
  const width = bounds.width * cosine + bounds.height * sine
  const height = bounds.width * sine + bounds.height * cosine
  const centerX = bounds.x + bounds.width / 2
  const centerY = bounds.y + bounds.height / 2

  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  }
}

export function getElementVisualBounds(
  element: EpisodeElement,
): ElementBounds | undefined {
  if (element.type !== 'speech-balloon') {
    return getTransformedRectBounds(element.bounds, element.transform)
  }

  const balloon = getSpeechBalloonPath(
    element.bounds,
    element.cornerRadius,
    element.tail,
  )

  return balloon
    ? getTransformedBoundsAroundCenter(
        balloon.visualBounds,
        {
          x: element.bounds.x + element.bounds.width / 2,
          y: element.bounds.y + element.bounds.height / 2,
        },
        element.transform,
      )
    : undefined
}

function getTransformedBoundsAroundCenter(
  bounds: ElementBounds,
  center: NormalizedPoint,
  transform: ElementTransform,
): ElementBounds | undefined {
  const normalizedTransform = normalizeElementTransform(transform)

  if (!isFinitePositiveBounds(bounds) || !normalizedTransform) return undefined

  const radians = (normalizedTransform.rotationDegrees * Math.PI) / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const scaleX = normalizedTransform.flipX ? -1 : 1
  const scaleY = normalizedTransform.flipY ? -1 : 1
  const corners = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height },
  ].map((point) => {
    const localX = (point.x - center.x) * scaleX
    const localY = (point.y - center.y) * scaleY

    return {
      x: center.x + localX * cosine - localY * sine,
      y: center.y + localX * sine + localY * cosine,
    }
  })
  const xs = corners.map(({ x }) => x)
  const ys = corners.map(({ y }) => y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function clampElementGeometry(
  bounds: ElementBounds,
  transform: ElementTransform,
  overflow: ElementOverflow,
  episodeDimensions: GeometryDimensions,
): ElementBounds | undefined {
  if (
    (overflow !== 'constrained' && overflow !== 'bleed') ||
    !isFinitePositiveDimensions(episodeDimensions)
  ) {
    return undefined
  }

  const visualBounds = getTransformedRectBounds(bounds, transform)

  if (!visualBounds) {
    return undefined
  }

  if (
    overflow === 'constrained' &&
    (visualBounds.width > episodeDimensions.width ||
      visualBounds.height > episodeDimensions.height)
  ) {
    return undefined
  }

  const translation =
    overflow === 'constrained'
      ? getConstrainedTranslation(visualBounds, episodeDimensions)
      : getBleedTranslation(visualBounds, episodeDimensions)

  return {
    ...bounds,
    x: bounds.x + translation.x,
    y: bounds.y + translation.y,
  }
}

/** Applies normal bounds clamping, then includes type-specific visuals such as
 * a speech-balloon tail when keeping an element inside (or intersecting) the
 * episode. */
export function clampEpisodeElementGeometry(
  element: EpisodeElement,
  bounds: ElementBounds,
  transform: ElementTransform,
  overflow: ElementOverflow,
  episodeDimensions: GeometryDimensions,
): ElementBounds | undefined {
  const bodyBounds = clampElementGeometry(
    bounds,
    transform,
    overflow,
    episodeDimensions,
  )

  if (!bodyBounds || element.type !== 'speech-balloon') return bodyBounds

  const visualBounds = getElementVisualBounds({
    ...element,
    bounds: bodyBounds,
    transform,
    overflow,
  })

  if (!visualBounds) return undefined
  if (
    overflow === 'constrained' &&
    (visualBounds.width > episodeDimensions.width ||
      visualBounds.height > episodeDimensions.height)
  ) {
    return undefined
  }

  const translation =
    overflow === 'constrained'
      ? getConstrainedTranslation(visualBounds, episodeDimensions)
      : getBleedTranslation(visualBounds, episodeDimensions)

  return {
    ...bodyBounds,
    x: bodyBounds.x + translation.x,
    y: bodyBounds.y + translation.y,
  }
}

export function getCoverCropRect(
  sourceDimensions: GeometryDimensions,
  frameDimensions: GeometryDimensions,
  crop: ImageCrop,
): ElementBounds | undefined {
  if (
    !isFinitePositiveDimensions(sourceDimensions) ||
    !isFinitePositiveDimensions(frameDimensions) ||
    !isValidImageCrop(crop)
  ) {
    return undefined
  }

  const sourceAspectRatio = sourceDimensions.width / sourceDimensions.height
  const frameAspectRatio = frameDimensions.width / frameDimensions.height
  const baseWidth =
    sourceAspectRatio > frameAspectRatio
      ? sourceDimensions.height * frameAspectRatio
      : sourceDimensions.width
  const baseHeight =
    sourceAspectRatio > frameAspectRatio
      ? sourceDimensions.height
      : sourceDimensions.width / frameAspectRatio
  const width = baseWidth / crop.zoom
  const height = baseHeight / crop.zoom
  const focusCenterX = crop.focusX * sourceDimensions.width
  const focusCenterY = crop.focusY * sourceDimensions.height

  return {
    x: clamp(focusCenterX - width / 2, 0, sourceDimensions.width - width),
    y: clamp(focusCenterY - height / 2, 0, sourceDimensions.height - height),
    width,
    height,
  }
}

export function getCoverImagePlacement(
  sourceDimensions: GeometryDimensions,
  frameBounds: ElementBounds,
  crop: ImageCrop,
): CoverImagePlacement | undefined {
  if (!isFinitePositiveBounds(frameBounds)) {
    return undefined
  }

  const source = getCoverCropRect(
    sourceDimensions,
    { width: frameBounds.width, height: frameBounds.height },
    crop,
  )

  return source ? { source, destination: { ...frameBounds } } : undefined
}

export function getImageMaskPath(
  frame: Pick<ImageFrame, 'mask'>,
  bounds: ElementBounds,
): ImageMaskPath | undefined {
  if (!isFinitePositiveBounds(bounds) || !isValidImageMask(frame.mask)) {
    return undefined
  }

  if (frame.mask.kind === 'rectangle') {
    return {
      kind: 'rectangle',
      bounds: { ...bounds },
      cornerRadius: Math.min(
        frame.mask.cornerRadius,
        bounds.width / 2,
        bounds.height / 2,
      ),
    }
  }

  return {
    kind: 'polygon',
    points: frame.mask.points.map((point) => ({
      x: bounds.x + point.x * bounds.width,
      y: bounds.y + point.y * bounds.height,
    })),
  }
}

export function isValidImageCrop(crop: ImageCrop): boolean {
  return (
    crop !== undefined &&
    crop !== null &&
    Number.isFinite(crop.focusX) &&
    crop.focusX >= 0 &&
    crop.focusX <= 1 &&
    Number.isFinite(crop.focusY) &&
    crop.focusY >= 0 &&
    crop.focusY <= 1 &&
    Number.isFinite(crop.zoom) &&
    crop.zoom >= 1 &&
    crop.zoom <= 4
  )
}

export function isValidImageMask(mask: ImageMask): boolean {
  if (!mask || typeof mask !== 'object') {
    return false
  }

  if (mask.kind === 'rectangle') {
    return Number.isFinite(mask.cornerRadius) && mask.cornerRadius >= 0
  }

  return (
    mask.kind === 'polygon' &&
    isValidNormalizedPolygon(mask.points)
  )
}

export function isValidNormalizedPolygon(
  points: readonly NormalizedPoint[],
): boolean {
  if (points.length < 3 || points.length > 8) {
    return false
  }

  if (
    points.some(
      ({ x, y }) =>
        !Number.isFinite(x) ||
        x < 0 ||
        x > 1 ||
        !Number.isFinite(y) ||
        y < 0 ||
        y > 1,
    )
  ) {
    return false
  }

  const doubledArea = points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length]
    return next ? area + point.x * next.y - next.x * point.y : area
  }, 0)

  return Math.abs(doubledArea) > POLYGON_AREA_EPSILON
}

function getConstrainedTranslation(
  visualBounds: ElementBounds,
  episodeDimensions: GeometryDimensions,
): { readonly x: number; readonly y: number } {
  const visualRight = visualBounds.x + visualBounds.width
  const visualBottom = visualBounds.y + visualBounds.height

  return {
    x:
      visualBounds.x < 0
        ? -visualBounds.x
        : visualRight > episodeDimensions.width
          ? episodeDimensions.width - visualRight
          : 0,
    y:
      visualBounds.y < 0
        ? -visualBounds.y
        : visualBottom > episodeDimensions.height
          ? episodeDimensions.height - visualBottom
          : 0,
  }
}

function getBleedTranslation(
  visualBounds: ElementBounds,
  episodeDimensions: GeometryDimensions,
): { readonly x: number; readonly y: number } {
  const visualRight = visualBounds.x + visualBounds.width
  const visualBottom = visualBounds.y + visualBounds.height

  return {
    x:
      visualRight <= 0
        ? MIN_BLEED_INTERSECTION - visualRight
        : visualBounds.x >= episodeDimensions.width
          ? episodeDimensions.width - MIN_BLEED_INTERSECTION - visualBounds.x
          : 0,
    y:
      visualBottom <= 0
        ? MIN_BLEED_INTERSECTION - visualBottom
        : visualBounds.y >= episodeDimensions.height
          ? episodeDimensions.height -
            MIN_BLEED_INTERSECTION -
            visualBounds.y
          : 0,
  }
}

function isFinitePositiveBounds(bounds: ElementBounds): boolean {
  return (
    Number.isFinite(bounds.x) &&
    Number.isFinite(bounds.y) &&
    Number.isFinite(bounds.width) &&
    bounds.width > 0 &&
    Number.isFinite(bounds.height) &&
    bounds.height > 0
  )
}

function isFinitePositiveDimensions(
  dimensions: GeometryDimensions,
): boolean {
  return (
    Number.isFinite(dimensions.width) &&
    dimensions.width > 0 &&
    Number.isFinite(dimensions.height) &&
    dimensions.height > 0
  )
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}
