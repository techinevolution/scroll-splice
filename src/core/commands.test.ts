import { describe, expect, it } from 'vitest'

import { buildWeekEpisode } from '../app/fixtures/buildWeekEpisode'
import {
  moveElement,
  setCompositionGroupVisibility,
  setElementVisibility,
} from './commands'
import { isElementEffectivelyVisible } from './episode'

describe('moveElement', () => {
  const movableElement = buildWeekEpisode.elements.find(
    ({ id }) => id === 'beat-01-stillness-accent-2',
  )

  if (!movableElement) {
    throw new Error('The movement fixture element is missing.')
  }

  it('returns a new document with only the requested position changed', () => {
    const nextDocument = moveElement(buildWeekEpisode, movableElement.id, {
      x: 500,
      y: 600,
    })
    const movedElement = nextDocument.elements.find(
      ({ id }) => id === movableElement.id,
    )

    expect(nextDocument).not.toBe(buildWeekEpisode)
    expect(movedElement?.bounds).toEqual({
      ...movableElement.bounds,
      x: 500,
      y: 600,
    })
    expect(
      nextDocument.elements.find(
        ({ id }) => id === 'beat-01-stillness-caption',
      ),
    ).toBe(
      buildWeekEpisode.elements.find(
        ({ id }) => id === 'beat-01-stillness-caption',
      ),
    )
  })

  it('clamps the element inside the episode boundary', () => {
    const nextDocument = moveElement(buildWeekEpisode, movableElement.id, {
      x: 10_000,
      y: 10_000,
    })
    const movedElement = nextDocument.elements.find(
      ({ id }) => id === movableElement.id,
    )

    expect(movedElement?.bounds.x).toBe(
      buildWeekEpisode.logicalWidth - movableElement.bounds.width,
    )
    expect(movedElement?.bounds.y).toBe(
      buildWeekEpisode.logicalHeight - movableElement.bounds.height,
    )
  })

  it('returns the original document for an unknown element', () => {
    expect(moveElement(buildWeekEpisode, 'missing', { x: 0, y: 0 })).toBe(
      buildWeekEpisode,
    )
  })
})

describe('setElementVisibility', () => {
  const elementId = 'beat-01-stillness-caption'

  it('changes only the requested element eye state', () => {
    const originalElement = buildWeekEpisode.elements.find(
      ({ id }) => id === elementId,
    )
    const untouchedElement = buildWeekEpisode.elements.find(
      ({ id }) => id === 'beat-01-stillness-title',
    )
    const nextDocument = setElementVisibility(
      buildWeekEpisode,
      elementId,
      false,
    )
    const hiddenElement = nextDocument.elements.find(
      ({ id }) => id === elementId,
    )

    expect(nextDocument).not.toBe(buildWeekEpisode)
    expect(hiddenElement).toEqual({ ...originalElement, visible: false })
    expect(
      nextDocument.elements.find(
        ({ id }) => id === 'beat-01-stillness-title',
      ),
    ).toBe(untouchedElement)
  })

  it('returns the original document when no eye state changes', () => {
    expect(setElementVisibility(buildWeekEpisode, elementId, true)).toBe(
      buildWeekEpisode,
    )
    expect(setElementVisibility(buildWeekEpisode, 'missing', false)).toBe(
      buildWeekEpisode,
    )
  })
})

describe('setCompositionGroupVisibility', () => {
  it('changes only the group eye state and preserves individual settings', () => {
    const individuallyHidden = setElementVisibility(
      buildWeekEpisode,
      'beat-01-stillness-caption',
      false,
    )
    const groupHidden = setCompositionGroupVisibility(
      individuallyHidden,
      'content',
      false,
    )
    const caption = groupHidden.elements.find(
      ({ id }) => id === 'beat-01-stillness-caption',
    )
    const title = groupHidden.elements.find(
      ({ id }) => id === 'beat-01-stillness-title',
    )

    expect(groupHidden).not.toBe(individuallyHidden)
    expect(groupHidden.compositionGroupVisibility).toEqual({
      background: true,
      content: false,
      foreground: true,
    })
    expect(groupHidden.elements).toBe(individuallyHidden.elements)
    expect(caption?.visible).toBe(false)
    expect(title?.visible).toBe(true)
    expect(caption && isElementEffectivelyVisible(groupHidden, caption)).toBe(
      false,
    )
    expect(title && isElementEffectivelyVisible(groupHidden, title)).toBe(
      false,
    )

    const groupShown = setCompositionGroupVisibility(
      groupHidden,
      'content',
      true,
    )
    const restoredCaption = groupShown.elements.find(
      ({ id }) => id === 'beat-01-stillness-caption',
    )
    const restoredTitle = groupShown.elements.find(
      ({ id }) => id === 'beat-01-stillness-title',
    )

    expect(restoredCaption?.visible).toBe(false)
    expect(restoredTitle?.visible).toBe(true)
    expect(
      restoredCaption &&
        isElementEffectivelyVisible(groupShown, restoredCaption),
    ).toBe(false)
    expect(
      restoredTitle && isElementEffectivelyVisible(groupShown, restoredTitle),
    ).toBe(true)
  })

  it('returns the original document when the group eye state is unchanged', () => {
    expect(
      setCompositionGroupVisibility(buildWeekEpisode, 'content', true),
    ).toBe(buildWeekEpisode)
  })
})
