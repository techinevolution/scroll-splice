import { beforeEach, describe, expect, it } from 'vitest'

import { buildWeekEpisode } from './fixtures/buildWeekEpisode'
import { useEditorStore } from './store'

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
    expect(useEditorStore.getState().viewportY).toBe(0)
  })
})
