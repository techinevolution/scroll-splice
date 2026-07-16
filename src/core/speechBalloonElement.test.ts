import { describe, expect, it } from 'vitest'

import {
  createSpeechBalloonElement,
  resizeElement,
  updateSpeechBalloonElement,
} from './commands'
import {
  BLANK_EPISODE_LAYER_PLANE_IDS,
  createBlankEpisode,
} from './createBlankEpisode'
import type { SpeechBalloonElement } from './episode'
import { getSpeechBalloonTextLayout } from './speechBalloonLayout'

function createBalloonEpisode() {
  return createSpeechBalloonElement(createBlankEpisode('balloon-test'), {
    layerPlaneId: BLANK_EPISODE_LAYER_PLANE_IDS.content,
    bounds: { x: 160, y: 180, width: 360, height: 180 },
    text: 'A quiet table waits here.',
  })
}

function onlyBalloon(document = createBalloonEpisode()): SpeechBalloonElement {
  const element = document.elements[0]
  if (element?.type !== 'speech-balloon') {
    throw new Error('Expected an editable speech balloon.')
  }
  return element
}

describe('editable speech balloon commands', () => {
  it('creates one atomic element with an integrated tail and fitted text', () => {
    const element = onlyBalloon()

    expect(element.assetReference).toEqual({
      kind: 'synthetic',
      generatorId: 'scrollsplice-editable-speech-balloon-v1',
    })
    expect(element.tail).toMatchObject({ enabled: true, side: 'bottom' })
    expect(getSpeechBalloonTextLayout(element)).toMatchObject({ fits: true })
  })

  it('updates every creator-facing style atomically and rejects invalid input', () => {
    const initial = createBalloonEpisode()
    const element = onlyBalloon(initial)
    const updated = updateSpeechBalloonElement(initial, element.id, {
      text: 'Turn left at the old gate.',
      fill: '#FFF4D6',
      stroke: '#452812',
      strokeWidth: 8,
      cornerRadius: 32,
      textFill: '#301A0B',
      fontFamily: 'serif',
      fontWeight: 700,
      lineHeight: 1.25,
      align: 'left',
      padding: 28,
      minFontSize: 10,
      maxFontSize: 36,
      tail: {
        enabled: true,
        side: 'left',
        anchor: 0.4,
        width: 0.2,
        tip: { x: -0.35, y: 0.8 },
      },
    })

    expect(onlyBalloon(updated)).toMatchObject({
      text: 'Turn left at the old gate.',
      fill: '#FFF4D6',
      strokeWidth: 8,
      fontWeight: 700,
      align: 'left',
      tail: { side: 'left', tip: { x: -0.35, y: 0.8 } },
    })
    expect(
      updateSpeechBalloonElement(updated, element.id, {
        ...onlyBalloon(updated),
        minFontSize: 40,
        maxFontSize: 20,
      }),
    ).toBe(updated)
  })

  it('resizes freely while retaining an editable, refitted text range', () => {
    const initial = createBalloonEpisode()
    const element = onlyBalloon(initial)
    const resized = resizeElement(initial, element.id, {
      x: 160,
      y: 180,
      width: 220,
      height: 110,
    })
    const resizedBalloon = onlyBalloon(resized)

    expect(resizedBalloon.bounds).toMatchObject({ width: 220, height: 110 })
    expect(resizedBalloon.text).toBe(element.text)
    expect(getSpeechBalloonTextLayout(resizedBalloon).fontSize).toBeLessThan(
      getSpeechBalloonTextLayout(element).fontSize,
    )
  })
})
