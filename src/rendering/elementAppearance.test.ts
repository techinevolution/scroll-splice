import { describe, expect, it } from 'vitest'

import {
  MAX_TILE_EDGE_LOGICAL_UNITS,
  applyColorOpacity,
  getKonvaShapeFillProps,
  getTilePatternScale,
  toCanvasCompositeOperation,
  toCssMixBlendMode,
} from './elementAppearance'

describe('element appearance rendering helpers', () => {
  it('maps the domain normal mode to Canvas source-over', () => {
    expect(toCanvasCompositeOperation('normal')).toBe('source-over')
    expect(toCanvasCompositeOperation('multiply')).toBe('multiply')
    expect(toCanvasCompositeOperation('soft-light')).toBe('soft-light')
    expect(toCssMixBlendMode('normal')).toBe('normal')
    expect(toCssMixBlendMode('overlay')).toBe('overlay')
  })

  it('creates solid and vertical Konva fill properties', () => {
    expect(
      getKonvaShapeFillProps(
        { kind: 'solid', color: '#123456' },
        100,
      ),
    ).toEqual({ fill: '#123456', fillPriority: 'color' })
    expect(
      getKonvaShapeFillProps(
        {
          kind: 'vertical-gradient',
          top: { color: '#123456', opacity: 0.25 },
          bottom: { color: '#ABC', opacity: 0.75 },
        },
        240,
      ),
    ).toEqual({
      fillPriority: 'linear-gradient',
      fillLinearGradientStartPoint: { x: 0, y: 0 },
      fillLinearGradientEndPoint: { x: 0, y: 240 },
      fillLinearGradientColorStops: [
        0,
        'rgba(18, 52, 86, 0.25)',
        1,
        'rgba(170, 187, 204, 0.75)',
      ],
    })
  })

  it('combines existing hex alpha with the requested stop opacity', () => {
    expect(applyColorOpacity('#33669980', 0.5)).toBe(
      'rgba(51, 102, 153, 0.251)',
    )
    expect(applyColorOpacity('#FFF0', 1)).toBe(
      'rgba(255, 255, 255, 0)',
    )
    expect(applyColorOpacity('rebeccapurple', 0)).toBe(
      'rgba(0, 0, 0, 0)',
    )
  })

  it('never upscales tiles and caps their longest edge deterministically', () => {
    expect(MAX_TILE_EDGE_LOGICAL_UNITS).toBe(160)
    expect(getTilePatternScale(80, 40)).toBe(1)
    expect(getTilePatternScale(320, 80)).toBe(0.5)
    expect(getTilePatternScale(200, 400)).toBe(0.4)
    expect(getTilePatternScale(Number.NaN, 10)).toBe(1)
  })
})
