import { describe, expect, it } from 'vitest'

import { buildWeekEpisode } from '../app/fixtures/buildWeekEpisode'
import { moveElement } from './commands'

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
