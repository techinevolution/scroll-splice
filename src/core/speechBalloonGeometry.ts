import type {
  ElementBounds,
  NormalizedPoint,
  SpeechBalloonTail,
  SpeechBalloonTailSide,
} from './episode'

export type SpeechBalloonTailGeometry = SpeechBalloonTail
export type { SpeechBalloonTailSide }

export interface SpeechBalloonPathResult {
  readonly pathData: string
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

  return {
    pathData: commands.join(' '),
    visualBounds: {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    },
  }
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
