import { describe, expect, it } from 'vitest'

import {
  DEFAULT_SPEECH_BALLOON_TAIL,
  getSpeechBalloonPath,
  normalizeSpeechBalloonTail,
} from './speechBalloonGeometry'
import { SPEECH_BALLOON_PRESETS } from './speechBalloonPresets'

describe('speech balloon geometry', () => {
  it('builds one closed outline with an integrated bottom tail', () => {
    const result = getSpeechBalloonPath(
      { x: 100, y: 200, width: 300, height: 180 },
      80,
      DEFAULT_SPEECH_BALLOON_TAIL,
    )

    expect(result?.pathData).toContain('M 180 200')
    expect(result?.pathData).toContain('L 352 430.4')
    expect(result?.pathData.endsWith('Z')).toBe(true)
    expect(result?.visualBounds).toMatchObject({ x: 100, y: 200, width: 300 })
    expect(result?.visualBounds.height).toBeCloseTo(230.4)
  })

  it('supports every tail side and expands visual bounds to include its tip', () => {
    const sides = ['top', 'right', 'bottom', 'left'] as const
    const tips = {
      top: { x: 0.5, y: -0.5 },
      right: { x: 1.5, y: 0.5 },
      bottom: { x: 0.5, y: 1.5 },
      left: { x: -0.5, y: 0.5 },
    }

    for (const side of sides) {
      const result = getSpeechBalloonPath(
        { x: 0, y: 0, width: 100, height: 80 },
        20,
        { ...DEFAULT_SPEECH_BALLOON_TAIL, side, tip: tips[side] },
      )
      expect(result?.pathData).toContain('L')
      expect(result?.visualBounds.width).toBeGreaterThanOrEqual(100)
      expect(result?.visualBounds.height).toBeGreaterThanOrEqual(80)
    }
  })

  it('clamps recoverable tail controls and rejects nonfinite values', () => {
    expect(
      normalizeSpeechBalloonTail({
        enabled: true,
        side: 'left',
        anchor: 9,
        width: -2,
        tip: { x: -9, y: 9 },
      }),
    ).toEqual({
      enabled: true,
      side: 'left',
      anchor: 0.9,
      width: 0.04,
      tip: { x: -1, y: 2 },
    })
    expect(
      normalizeSpeechBalloonTail({
        ...DEFAULT_SPEECH_BALLOON_TAIL,
        anchor: Number.NaN,
      }),
    ).toBeUndefined()
  })

  it('can render the body without a tail', () => {
    const result = getSpeechBalloonPath(
      { x: 5, y: 6, width: 80, height: 50 },
      12,
      { ...DEFAULT_SPEECH_BALLOON_TAIL, enabled: false },
    )

    expect(result?.visualBounds).toEqual({ x: 5, y: 6, width: 80, height: 50 })
  })

  it('renders every editable preset through the shared geometry path', () => {
    const results = SPEECH_BALLOON_PRESETS.map(({ id }) =>
      getSpeechBalloonPath(
        { x: 0, y: 0, width: 320, height: 180 },
        42,
        DEFAULT_SPEECH_BALLOON_TAIL,
        id,
      ),
    )

    expect(results.every(Boolean)).toBe(true)
    expect(
      new Set(
        results.map((result) =>
          JSON.stringify({
            body: result?.bodyPathData,
            decorations: result?.decorationPathData,
            dash: result?.strokeDash,
          }),
        ),
      ).size,
    ).toBe(10)
    expect(results.find((_, index) => SPEECH_BALLOON_PRESETS[index]?.id === 'whisper')?.strokeDash).toEqual([10, 10])
    expect(results.find((_, index) => SPEECH_BALLOON_PRESETS[index]?.id === 'double-outline')?.decorationPathData).toHaveLength(1)
  })

  it('preserves preset-specific outline treatments after contour editing', () => {
    const customPoints = [
      { x: 0.5, y: 0 },
      { x: 1, y: 0.5 },
      { x: 0.5, y: 1 },
      { x: 0, y: 0.5 },
      { x: 0.2, y: 0.2 },
      { x: 0.8, y: 0.2 },
    ]
    const bounds = { x: 0, y: 0, width: 320, height: 180 }

    const whisper = getSpeechBalloonPath(
      bounds,
      42,
      DEFAULT_SPEECH_BALLOON_TAIL,
      'whisper',
      customPoints,
    )
    const telepathic = getSpeechBalloonPath(
      bounds,
      42,
      DEFAULT_SPEECH_BALLOON_TAIL,
      'telepathic',
      customPoints,
    )
    const doubleOutline = getSpeechBalloonPath(
      bounds,
      42,
      DEFAULT_SPEECH_BALLOON_TAIL,
      'double-outline',
      customPoints,
    )
    const shout = getSpeechBalloonPath(
      bounds,
      42,
      DEFAULT_SPEECH_BALLOON_TAIL,
      'shout',
      customPoints,
    )
    const electric = getSpeechBalloonPath(
      bounds,
      42,
      DEFAULT_SPEECH_BALLOON_TAIL,
      'electric',
      customPoints,
    )
    const rough = getSpeechBalloonPath(
      bounds,
      42,
      DEFAULT_SPEECH_BALLOON_TAIL,
      'rough',
      customPoints,
    )

    expect(whisper?.strokeDash).toEqual([10, 10])
    expect(telepathic?.decorationPathData).toHaveLength(2)
    expect(doubleOutline?.decorationPathData).toHaveLength(1)
    expect(doubleOutline?.decorationPathData[0]).not.toBe(
      doubleOutline?.bodyPathData,
    )
    for (const angular of [shout, electric, rough]) {
      expect(angular?.bodyPathData).toContain(' L ')
      expect(angular?.bodyPathData).not.toContain(' Q ')
    }
  })
})
