import { beforeEach, describe, expect, it } from 'vitest'

import { buildWeekEpisode } from './fixtures/buildWeekEpisode'
import { useEditorStore } from './store'
import type { CompositionGroup, EpisodeElement } from '../core/episode'

function fixtureElementInGroup(group: CompositionGroup): EpisodeElement {
  const element = buildWeekEpisode.elements.find(
    ({ compositionGroup }) => compositionGroup === group,
  )

  if (!element) {
    throw new Error(`Missing ${group} fixture element`)
  }

  return element
}

describe('editor store', () => {
  beforeEach(() => {
    useEditorStore.getState().resetEpisode()
    useEditorStore.getState().setViewportLogicalHeight(900)
  })

  it('clamps navigation and reveals off-screen layer selections', () => {
    useEditorStore.getState().setViewportY(99_000)
    expect(useEditorStore.getState().viewportY).toBe(3_700)

    useEditorStore.getState().setViewportY(0)
    useEditorStore
      .getState()
      .selectElement('beat-06-dawn-caption', true)

    expect(useEditorStore.getState().selectedElementId).toBe(
      'beat-06-dawn-caption',
    )
    expect(useEditorStore.getState().viewportY).toBeGreaterThan(3_000)
  })

  it('keeps a visible canvas selection at the current viewport position', () => {
    useEditorStore.getState().setViewportY(0)
    useEditorStore
      .getState()
      .selectElement('beat-01-stillness-title', false)

    expect(useEditorStore.getState().viewportY).toBe(0)
  })

  it('activates a visible selected element group and rejects hidden elements', () => {
    const foregroundElement = fixtureElementInGroup('foreground')
    const backgroundElement = fixtureElementInGroup('background')

    useEditorStore.getState().selectElement(foregroundElement.id)

    expect(useEditorStore.getState().selectedElementId).toBe(
      foregroundElement.id,
    )
    expect(useEditorStore.getState().activeCompositionGroup).toBe(
      'foreground',
    )

    useEditorStore
      .getState()
      .setCompositionGroupVisibility('background', false)
    useEditorStore.getState().selectElement(backgroundElement.id)

    expect(useEditorStore.getState().selectedElementId).toBeNull()
    expect(useEditorStore.getState().activeCompositionGroup).toBe(
      'foreground',
    )
  })

  it('clears selection when its layer or group becomes hidden', () => {
    const contentElement = fixtureElementInGroup('content')

    useEditorStore.getState().selectElement(contentElement.id)
    useEditorStore
      .getState()
      .setElementVisibility(contentElement.id, false)

    expect(useEditorStore.getState().selectedElementId).toBeNull()
    useEditorStore.getState().selectElement(contentElement.id)
    expect(useEditorStore.getState().selectedElementId).toBeNull()

    useEditorStore
      .getState()
      .setElementVisibility(contentElement.id, true)
    useEditorStore.getState().selectElement(contentElement.id)
    useEditorStore
      .getState()
      .setCompositionGroupVisibility('content', false)

    expect(useEditorStore.getState().selectedElementId).toBeNull()
    expect(
      useEditorStore
        .getState()
        .episode.elements.find(({ id }) => id === contentElement.id)?.visible,
    ).toBe(true)
  })

  it('keeps selection when visibility changes do not hide it', () => {
    const contentElement = fixtureElementInGroup('content')

    useEditorStore.getState().selectElement(contentElement.id)
    useEditorStore
      .getState()
      .setCompositionGroupVisibility('background', false)

    expect(useEditorStore.getState().selectedElementId).toBe(
      contentElement.id,
    )
  })

  it('clears selection only when the active group actually changes', () => {
    const contentElement = fixtureElementInGroup('content')

    useEditorStore.getState().selectElement(contentElement.id)
    useEditorStore.getState().setActiveCompositionGroup('content')

    expect(useEditorStore.getState().selectedElementId).toBe(
      contentElement.id,
    )

    useEditorStore.getState().setActiveCompositionGroup('background')

    expect(useEditorStore.getState().selectedElementId).toBeNull()
    expect(useEditorStore.getState().activeCompositionGroup).toBe(
      'background',
    )
  })

  it('moves through the command and resets the known demo state', () => {
    const elementId = 'beat-01-stillness-accent-2'

    useEditorStore.getState().moveElement(elementId, { x: 500, y: 600 })
    expect(
      useEditorStore
        .getState()
        .episode.elements.find(({ id }) => id === elementId)?.bounds.x,
    ).toBe(500)

    useEditorStore.getState().resetEpisode()

    expect(useEditorStore.getState().episode).toBe(buildWeekEpisode)
    expect(useEditorStore.getState().selectedElementId).toBeNull()
    expect(useEditorStore.getState().activeCompositionGroup).toBe('content')
    expect(useEditorStore.getState().viewportY).toBe(0)
  })

  it('resets active group and visibility after editing them', () => {
    useEditorStore.getState().setActiveCompositionGroup('foreground')
    useEditorStore
      .getState()
      .setCompositionGroupVisibility('background', false)

    useEditorStore.getState().resetEpisode()

    expect(useEditorStore.getState().activeCompositionGroup).toBe('content')
    expect(useEditorStore.getState().episode).toBe(buildWeekEpisode)
    expect(
      useEditorStore.getState().episode.compositionGroupVisibility,
    ).toEqual({
      background: true,
      content: true,
      foreground: true,
    })
  })
})
