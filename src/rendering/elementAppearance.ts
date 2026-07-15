import type { ElementBlendMode, ShapeFill } from '../core/episode'

export const MAX_TILE_EDGE_LOGICAL_UNITS = 160

export type CanvasCompositeOperation =
  | 'source-over'
  | Exclude<ElementBlendMode, 'normal'>

interface KonvaSolidFillProps {
  readonly fill: string
  readonly fillPriority: 'color'
}

interface KonvaVerticalGradientFillProps {
  readonly fillPriority: 'linear-gradient'
  readonly fillLinearGradientStartPoint: {
    readonly x: number
    readonly y: number
  }
  readonly fillLinearGradientEndPoint: {
    readonly x: number
    readonly y: number
  }
  readonly fillLinearGradientColorStops: [
    number,
    string,
    number,
    string,
  ]
}

export type KonvaShapeFillProps =
  | KonvaSolidFillProps
  | KonvaVerticalGradientFillProps

export function toCanvasCompositeOperation(
  blendMode: ElementBlendMode,
): CanvasCompositeOperation {
  return blendMode === 'normal' ? 'source-over' : blendMode
}

export function toCssMixBlendMode(
  blendMode: ElementBlendMode,
): ElementBlendMode {
  return blendMode
}

export function getKonvaShapeFillProps(
  fill: ShapeFill,
  height: number,
): KonvaShapeFillProps {
  if (fill.kind === 'solid') {
    return { fill: fill.color, fillPriority: 'color' }
  }

  return {
    fillPriority: 'linear-gradient',
    fillLinearGradientStartPoint: { x: 0, y: 0 },
    fillLinearGradientEndPoint: {
      x: 0,
      y: Number.isFinite(height) && height > 0 ? height : 1,
    },
    fillLinearGradientColorStops: [
      0,
      applyColorOpacity(fill.top.color, fill.top.opacity),
      1,
      applyColorOpacity(fill.bottom.color, fill.bottom.opacity),
    ],
  }
}

export function getTilePatternScale(
  intrinsicWidth: number,
  intrinsicHeight: number,
): number {
  if (
    !Number.isFinite(intrinsicWidth) ||
    !Number.isFinite(intrinsicHeight) ||
    intrinsicWidth <= 0 ||
    intrinsicHeight <= 0
  ) {
    return 1
  }

  return Math.min(
    1,
    MAX_TILE_EDGE_LOGICAL_UNITS /
      Math.max(intrinsicWidth, intrinsicHeight),
  )
}

export function applyColorOpacity(color: string, opacity: number): string {
  const normalizedOpacity = Math.min(Math.max(opacity, 0), 1)
  const channels = parseHexColor(color)

  if (!channels) {
    if (normalizedOpacity === 0) {
      return 'rgba(0, 0, 0, 0)'
    }

    return normalizedOpacity === 1
      ? color
      : `color-mix(in srgb, ${color} ${formatPercentage(normalizedOpacity)}%, transparent)`
  }

  const alpha = channels.alpha * normalizedOpacity

  return `rgba(${channels.red}, ${channels.green}, ${channels.blue}, ${formatAlpha(alpha)})`
}

interface ColorChannels {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
}

function parseHexColor(color: string): ColorChannels | undefined {
  const value = color.trim()
  const shorthandMatch = /^#([\da-f])([\da-f])([\da-f])([\da-f])?$/i.exec(
    value,
  )

  if (shorthandMatch) {
    return {
      red: Number.parseInt(shorthandMatch[1]!.repeat(2), 16),
      green: Number.parseInt(shorthandMatch[2]!.repeat(2), 16),
      blue: Number.parseInt(shorthandMatch[3]!.repeat(2), 16),
      alpha: shorthandMatch[4]
        ? Number.parseInt(shorthandMatch[4]!.repeat(2), 16) / 255
        : 1,
    }
  }

  const longhandMatch =
    /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})([\da-f]{2})?$/i.exec(value)

  if (!longhandMatch) {
    return undefined
  }

  return {
    red: Number.parseInt(longhandMatch[1]!, 16),
    green: Number.parseInt(longhandMatch[2]!, 16),
    blue: Number.parseInt(longhandMatch[3]!, 16),
    alpha: longhandMatch[4]
      ? Number.parseInt(longhandMatch[4]!, 16) / 255
      : 1,
  }
}

function formatAlpha(value: number): string {
  return Number(value.toFixed(4)).toString()
}

function formatPercentage(value: number): string {
  return Number((value * 100).toFixed(2)).toString()
}
