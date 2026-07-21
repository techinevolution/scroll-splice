import type {
  ElementBounds,
  NormalizedPoint,
  SpeechBalloonTail,
  SpeechBalloonTailSide,
} from './episode'
import type { SpeechBalloonPresetId } from './speechBalloonPresets'

export type SpeechBalloonTailGeometry = SpeechBalloonTail
export type { SpeechBalloonTailSide }

export interface SpeechBalloonPathResult {
  readonly pathData: string
  readonly bodyPathData: string
  readonly tailPathData?: string
  readonly decorationPathData: readonly string[]
  readonly strokeDash?: readonly number[]
  readonly visualBounds: ElementBounds
}

export const DEFAULT_SPEECH_BALLOON_TAIL = {
  enabled: true,
  side: 'bottom',
  anchor: 0.68,
  width: 0.16,
  tip: { x: 0.84, y: 1.28 },
} as const satisfies SpeechBalloonTailGeometry

/** Creates one closed, editable rounded-balloon outline with an inline tail. */
export function getSpeechBalloonPath(
  bounds: ElementBounds,
  requestedCornerRadius: number,
  tail: SpeechBalloonTailGeometry,
  presetId: SpeechBalloonPresetId = 'standard',
  bodyControlPoints?: readonly NormalizedPoint[],
): SpeechBalloonPathResult | undefined {
  if (
    !isFinitePositiveBounds(bounds) ||
    !Number.isFinite(requestedCornerRadius)
  ) {
    return undefined
  }

  const normalizedTail = normalizeSpeechBalloonTail(tail)
  if (!normalizedTail) return undefined

  const radius = clamp(
    requestedCornerRadius,
    0,
    Math.min(bounds.width, bounds.height) / 2,
  )
  const left = bounds.x
  const top = bounds.y
  const right = bounds.x + bounds.width
  const bottom = bounds.y + bounds.height
  const tip = {
    x: bounds.x + normalizedTail.tip.x * bounds.width,
    y: bounds.y + normalizedTail.tip.y * bounds.height,
  }
  const topTail = createHorizontalTailPoints(
    left,
    right,
    radius,
    normalizedTail,
    'top',
    tip,
  )
  const rightTail = createVerticalTailPoints(
    top,
    bottom,
    radius,
    normalizedTail,
    'right',
    tip,
  )
  const bottomTail = createHorizontalTailPoints(
    left,
    right,
    radius,
    normalizedTail,
    'bottom',
    tip,
  )
  const leftTail = createVerticalTailPoints(
    top,
    bottom,
    radius,
    normalizedTail,
    'left',
    tip,
  )
  const commands = [
    `M ${number(left + radius)} ${number(top)}`,
    ...forwardTailCommands(topTail, right - radius, top),
    `Q ${number(right)} ${number(top)} ${number(right)} ${number(top + radius)}`,
    ...forwardVerticalTailCommands(rightTail, right, bottom - radius),
    `Q ${number(right)} ${number(bottom)} ${number(right - radius)} ${number(bottom)}`,
    ...reverseTailCommands(bottomTail, left + radius, bottom),
    `Q ${number(left)} ${number(bottom)} ${number(left)} ${number(bottom - radius)}`,
    ...reverseVerticalTailCommands(leftTail, left, top + radius),
    `Q ${number(left)} ${number(top)} ${number(left + radius)} ${number(top)}`,
    'Z',
  ]
  const includesTail = normalizedTail.enabled
  const minX = includesTail ? Math.min(bounds.x, tip.x) : bounds.x
  const minY = includesTail ? Math.min(bounds.y, tip.y) : bounds.y
  const maxX = includesTail ? Math.max(right, tip.x) : right
  const maxY = includesTail ? Math.max(bottom, tip.y) : bottom

  const standardPathData = commands.join(' ')
  const defaultGeometry = presetId === 'standard'
    ? { bodyPathData: standardPathData, decorationPathData: [] }
    : createPresetGeometry(bounds, radius, normalizedTail, presetId)
  const presetGeometry = bodyControlPoints
    ? createCustomPresetGeometry(
        bounds,
        normalizedTail,
        presetId,
        bodyControlPoints,
        defaultGeometry,
      )
    : defaultGeometry

  return {
    pathData: [
      presetGeometry.tailPathData,
      presetGeometry.bodyPathData,
      ...presetGeometry.decorationPathData,
    ]
      .filter(Boolean)
      .join(' '),
    ...presetGeometry,
    visualBounds: {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    },
  }
}

function createCustomBodyPath(
  bounds: ElementBounds,
  points: readonly NormalizedPoint[],
  pathStyle: 'smooth' | 'angular' = 'smooth',
): string {
  const mapped = points.map((point) => ({
    x: bounds.x + point.x * bounds.width,
    y: bounds.y + point.y * bounds.height,
  }))
  return pathStyle === 'angular'
    ? createClosedAngularPath(mapped)
    : createClosedSmoothPath(mapped)
}

interface PresetGeometry {
  readonly bodyPathData: string
  readonly tailPathData?: string
  readonly decorationPathData: readonly string[]
  readonly strokeDash?: readonly number[]
}

function createCustomPresetGeometry(
  bounds: ElementBounds,
  tail: SpeechBalloonTailGeometry,
  presetId: SpeechBalloonPresetId,
  bodyControlPoints: readonly NormalizedPoint[],
  defaultGeometry: PresetGeometry,
): PresetGeometry {
  const pathStyle =
    presetId === 'shout' ||
    presetId === 'electric' ||
    presetId === 'rough'
      ? 'angular'
      : 'smooth'
  const decorationPathData = presetId === 'double-outline'
    ? [
        createCustomBodyPath(
          {
            x: bounds.x + bounds.width * 0.045,
            y: bounds.y + bounds.height * 0.07,
            width: bounds.width * 0.91,
            height: bounds.height * 0.86,
          },
          bodyControlPoints,
        ),
      ]
    : defaultGeometry.decorationPathData

  return {
    bodyPathData: createCustomBodyPath(
      bounds,
      bodyControlPoints,
      pathStyle,
    ),
    tailPathData: createDetachedTailPath(bounds, tail),
    decorationPathData,
    strokeDash: defaultGeometry.strokeDash,
  }
}

function createPresetGeometry(
  bounds: ElementBounds,
  radius: number,
  tail: SpeechBalloonTailGeometry,
  presetId: Exclude<SpeechBalloonPresetId, 'standard'>,
): PresetGeometry {
  const tailPathData = createDetachedTailPath(bounds, tail)
  const ellipse = createEllipsePath(bounds)

  switch (presetId) {
    case 'rounded':
      return {
        bodyPathData: createRoundedRectPath(
          bounds,
          Math.max(radius, Math.min(bounds.width, bounds.height) * 0.34),
        ),
        tailPathData,
        decorationPathData: [],
      }
    case 'thought':
      return {
        bodyPathData: createSmoothRadialPath(bounds, 18, (index) =>
          index % 2 === 0 ? 1 : 0.9,
        ),
        tailPathData,
        decorationPathData: [],
      }
    case 'whisper':
      return {
        bodyPathData: ellipse,
        tailPathData,
        decorationPathData: [],
        strokeDash: [10, 10],
      }
    case 'shout':
      return {
        bodyPathData: createRadialPath(
          bounds,
          28,
          (index) =>
            [1, 0.7, 0.92, 0.66, 1, 0.74, 0.88][index % 7] ?? 1,
        ),
        tailPathData,
        decorationPathData: [],
      }
    case 'electric':
      return {
        bodyPathData: createRadialPath(bounds, 28, (index) =>
          index % 2 === 0 ? 1 : 0.8,
        ),
        tailPathData,
        decorationPathData: [],
      }
    case 'rough': {
      const scales = [0.92, 1, 0.86, 0.97, 0.89, 1, 0.9, 0.98]
      return {
        bodyPathData: createRadialPath(
          bounds,
          24,
          (index) => scales[index % scales.length] ?? 1,
        ),
        tailPathData,
        decorationPathData: [],
      }
    }
    case 'wavy':
      return {
        bodyPathData: createSmoothRadialPath(bounds, 24, (index) =>
          index % 2 === 0 ? 1 : 0.88,
        ),
        tailPathData,
        decorationPathData: [],
      }
    case 'telepathic':
      return {
        bodyPathData: ellipse,
        tailPathData,
        decorationPathData: createRipplePaths(bounds),
      }
    case 'double-outline':
      return {
        bodyPathData: ellipse,
        tailPathData,
        decorationPathData: [
          createEllipsePath({
            x: bounds.x + bounds.width * 0.045,
            y: bounds.y + bounds.height * 0.07,
            width: bounds.width * 0.91,
            height: bounds.height * 0.86,
          }),
        ],
      }
  }
}

function createDetachedTailPath(
  bounds: ElementBounds,
  tail: SpeechBalloonTailGeometry,
): string | undefined {
  if (!tail.enabled) return undefined
  const tipX = bounds.x + tail.tip.x * bounds.width
  const tipY = bounds.y + tail.tip.y * bounds.height
  const halfWidth =
    (tail.side === 'top' || tail.side === 'bottom'
      ? bounds.width
      : bounds.height) * tail.width / 2

  if (tail.side === 'top' || tail.side === 'bottom') {
    const y = tail.side === 'top' ? bounds.y : bounds.y + bounds.height
    const center = bounds.x + bounds.width * tail.anchor
    return `M ${number(center - halfWidth)} ${number(y)} L ${number(tipX)} ${number(tipY)} L ${number(center + halfWidth)} ${number(y)} Z`
  }

  const x = tail.side === 'left' ? bounds.x : bounds.x + bounds.width
  const center = bounds.y + bounds.height * tail.anchor
  return `M ${number(x)} ${number(center - halfWidth)} L ${number(tipX)} ${number(tipY)} L ${number(x)} ${number(center + halfWidth)} Z`
}

function createRoundedRectPath(bounds: ElementBounds, requestedRadius: number) {
  const radius = Math.min(requestedRadius, bounds.width / 2, bounds.height / 2)
  const right = bounds.x + bounds.width
  const bottom = bounds.y + bounds.height
  return [
    `M ${number(bounds.x + radius)} ${number(bounds.y)}`,
    `H ${number(right - radius)}`,
    `Q ${number(right)} ${number(bounds.y)} ${number(right)} ${number(bounds.y + radius)}`,
    `V ${number(bottom - radius)}`,
    `Q ${number(right)} ${number(bottom)} ${number(right - radius)} ${number(bottom)}`,
    `H ${number(bounds.x + radius)}`,
    `Q ${number(bounds.x)} ${number(bottom)} ${number(bounds.x)} ${number(bottom - radius)}`,
    `V ${number(bounds.y + radius)}`,
    `Q ${number(bounds.x)} ${number(bounds.y)} ${number(bounds.x + radius)} ${number(bounds.y)}`,
    'Z',
  ].join(' ')
}

function createEllipsePath(bounds: ElementBounds): string {
  const cx = bounds.x + bounds.width / 2
  const cy = bounds.y + bounds.height / 2
  const rx = bounds.width / 2
  const ry = bounds.height / 2
  return `M ${number(cx - rx)} ${number(cy)} A ${number(rx)} ${number(ry)} 0 1 0 ${number(cx + rx)} ${number(cy)} A ${number(rx)} ${number(ry)} 0 1 0 ${number(cx - rx)} ${number(cy)} Z`
}

function createRadialPath(
  bounds: ElementBounds,
  pointCount: number,
  scaleAt: (index: number) => number,
): string {
  const cx = bounds.x + bounds.width / 2
  const cy = bounds.y + bounds.height / 2
  const rx = bounds.width / 2
  const ry = bounds.height / 2
  const points = Array.from({ length: pointCount }, (_, index) => {
    const angle = -Math.PI / 2 + (index / pointCount) * Math.PI * 2
    const scale = scaleAt(index)
    return {
      x: cx + Math.cos(angle) * rx * scale,
      y: cy + Math.sin(angle) * ry * scale,
    }
  })
  return `${points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${number(point.x)} ${number(point.y)}`).join(' ')} Z`
}

function createSmoothRadialPath(
  bounds: ElementBounds,
  pointCount: number,
  scaleAt: (index: number) => number,
): string {
  const cx = bounds.x + bounds.width / 2
  const cy = bounds.y + bounds.height / 2
  const rx = bounds.width / 2
  const ry = bounds.height / 2
  const points = Array.from({ length: pointCount }, (_, index) => {
    const angle = -Math.PI / 2 + (index / pointCount) * Math.PI * 2
    const scale = scaleAt(index)
    return {
      x: cx + Math.cos(angle) * rx * scale,
      y: cy + Math.sin(angle) * ry * scale,
    }
  })
  return createClosedSmoothPath(points)
}

function createClosedSmoothPath(
  points: readonly NormalizedPoint[],
): string {
  const last = points.at(-1)
  const first = points[0]
  if (!last || !first) return ''
  const startingMidpoint = {
    x: (last.x + first.x) / 2,
    y: (last.y + first.y) / 2,
  }
  return [
    `M ${number(startingMidpoint.x)} ${number(startingMidpoint.y)}`,
    ...points.map((point, index) => {
      const next = points[(index + 1) % points.length] ?? first
      return `Q ${number(point.x)} ${number(point.y)} ${number((point.x + next.x) / 2)} ${number((point.y + next.y) / 2)}`
    }),
    'Z',
  ].join(' ')
}

function createClosedAngularPath(
  points: readonly NormalizedPoint[],
): string {
  return `${points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'} ${number(point.x)} ${number(point.y)}`,
    )
    .join(' ')} Z`
}

function createRipplePaths(bounds: ElementBounds): readonly string[] {
  const top = bounds.y + bounds.height * 0.28
  const bottom = bounds.y + bounds.height * 0.72
  const left = bounds.x - bounds.width * 0.06
  const right = bounds.x + bounds.width * 1.06
  const inset = bounds.width * 0.045
  return [
    `M ${number(left + inset)} ${number(top)} Q ${number(left - inset)} ${number(bounds.y + bounds.height / 2)} ${number(left + inset)} ${number(bottom)}`,
    `M ${number(right - inset)} ${number(top)} Q ${number(right + inset)} ${number(bounds.y + bounds.height / 2)} ${number(right - inset)} ${number(bottom)}`,
  ]
}

export function normalizeSpeechBalloonTail(
  tail: SpeechBalloonTailGeometry,
): SpeechBalloonTailGeometry | undefined {
  if (
    !tail ||
    typeof tail.enabled !== 'boolean' ||
    !['top', 'right', 'bottom', 'left'].includes(tail.side) ||
    !Number.isFinite(tail.anchor) ||
    !Number.isFinite(tail.width) ||
    !tail.tip ||
    !Number.isFinite(tail.tip.x) ||
    !Number.isFinite(tail.tip.y)
  ) {
    return undefined
  }

  return {
    enabled: tail.enabled,
    side: tail.side,
    anchor: clamp(tail.anchor, 0.1, 0.9),
    width: clamp(tail.width, 0.04, 0.5),
    tip: {
      x: clamp(tail.tip.x, -1, 2),
      y: clamp(tail.tip.y, -1, 2),
    },
  }
}

interface TailPoints {
  readonly start: number
  readonly end: number
  readonly tip: NormalizedPoint
}

function createHorizontalTailPoints(
  start: number,
  end: number,
  radius: number,
  tail: SpeechBalloonTailGeometry,
  side: SpeechBalloonTailSide,
  tip: NormalizedPoint,
): TailPoints | undefined {
  if (!tail.enabled || tail.side !== side) return undefined

  const length = end - start
  const center = clamp(start + length * tail.anchor, start + radius, end - radius)
  const halfWidth = Math.min((length * tail.width) / 2, Math.max(length / 2 - radius, 0))

  return {
    start: center - halfWidth,
    end: center + halfWidth,
    tip: { x: tip.x, y: tip.y },
  }
}

function createVerticalTailPoints(
  start: number,
  end: number,
  radius: number,
  tail: SpeechBalloonTailGeometry,
  side: SpeechBalloonTailSide,
  tip: NormalizedPoint,
): TailPoints | undefined {
  if (!tail.enabled || tail.side !== side) return undefined

  const length = end - start
  const center = clamp(start + length * tail.anchor, start + radius, end - radius)
  const halfWidth = Math.min((length * tail.width) / 2, Math.max(length / 2 - radius, 0))

  return {
    start: center - halfWidth,
    end: center + halfWidth,
    tip: { x: tip.x, y: tip.y },
  }
}

function forwardTailCommands(
  tail: TailPoints | undefined,
  endX: number,
  y: number,
): readonly string[] {
  return tail
    ? [
        `L ${number(tail.start)} ${number(y)}`,
        `L ${number(tail.tip.x)} ${number(tail.tip.y)}`,
        `L ${number(tail.end)} ${number(y)}`,
        `L ${number(endX)} ${number(y)}`,
      ]
    : [`L ${number(endX)} ${number(y)}`]
}

function reverseTailCommands(
  tail: TailPoints | undefined,
  endX: number,
  y: number,
): readonly string[] {
  return tail
    ? [
        `L ${number(tail.end)} ${number(y)}`,
        `L ${number(tail.tip.x)} ${number(tail.tip.y)}`,
        `L ${number(tail.start)} ${number(y)}`,
        `L ${number(endX)} ${number(y)}`,
      ]
    : [`L ${number(endX)} ${number(y)}`]
}

function forwardVerticalTailCommands(
  tail: TailPoints | undefined,
  x: number,
  endY: number,
): readonly string[] {
  return tail
    ? [
        `L ${number(x)} ${number(tail.start)}`,
        `L ${number(tail.tip.x)} ${number(tail.tip.y)}`,
        `L ${number(x)} ${number(tail.end)}`,
        `L ${number(x)} ${number(endY)}`,
      ]
    : [`L ${number(x)} ${number(endY)}`]
}

function reverseVerticalTailCommands(
  tail: TailPoints | undefined,
  x: number,
  endY: number,
): readonly string[] {
  return tail
    ? [
        `L ${number(x)} ${number(tail.end)}`,
        `L ${number(tail.tip.x)} ${number(tail.tip.y)}`,
        `L ${number(x)} ${number(tail.start)}`,
        `L ${number(x)} ${number(endY)}`,
      ]
    : [`L ${number(x)} ${number(endY)}`]
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

function number(value: number): string {
  return Number(value.toFixed(4)).toString()
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}
