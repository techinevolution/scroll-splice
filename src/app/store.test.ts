import { beforeEach, describe, expect, it } from 'vitest'

import {
  BUILD_WEEK_LAYER_PLANE_IDS,
  buildWeekEpisode,
} from './fixtures/buildWeekEpisode'
import { useEditorStore } from './store'
import {
  DEFAULT_EPISODE_HEIGHT_INCREMENT,
  getEpisodeContentBottom,
} from '../core/commands'
import {
  getBackgroundBaseLayerPlane,
  getElementCompositionGroup,
  getLayerPlaneById,
  getLayerPlanesForGroup,
  type CompositionGroup,
  type EpisodeElement,
} from '../core/episode'

function fixtureElementInGroup(group: CompositionGroup): EpisodeElement {
  const element = buildWeekEpisode.elements.find(
    (candidate) =>
      getElementCompositionGroup(buildWeekEpisode, candidate) === group,
  )

  if (!element) {
    throw new Error(`Missing ${group} fixture element`)
  }

  return element
}

describe('editor store', () => {
  beforeEach(() => {
    useEditorStore.getState().resetEpisode()
    useEditorStore.getState().setFitViewportLogicalHeight(900)
  })

  it('starts on a valid Content plane and reveals off-screen selections', () => {
    expect(useEditorStore.getState().activeCompositionGroup).toBe('content')
    expect(useEditorStore.getState().activeLayerPlaneId).toBe(
      BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
    )

    useEditorStore.getState().setViewportY(99_000)
    expect(useEditorStore.getState().viewportY).toBe(3_700)

    useEditorStore.getState().setViewportY(0)
    useEditorStore
      .getState()
      .selectElement('beat-06-dawn-caption', true)

    expect(useEditorStore.getState().selectedElementId).toBe(
      'beat-06-dawn-caption',
    )
    expect(useEditorStore.getState().activeLayerPlaneId).toBe(
      BUILD_WEEK_LAYER_PLANE_IDS.contentText,
    )
    expect(useEditorStore.getState().viewportY).toBeGreaterThan(3_000)
  })

  it('keeps a visible canvas selection at the current viewport position', () => {
    useEditorStore.getState().setViewportY(0)
    useEditorStore
      .getState()
      .selectElement('beat-01-stillness-title', false)

    expect(useEditorStore.getState().viewportY).toBe(0)
    expect(useEditorStore.getState().activeLayerPlaneId).toBe(
      BUILD_WEEK_LAYER_PLANE_IDS.contentText,
    )
  })

  it('activates the selected element group and plane', () => {
    const foregroundElement = fixtureElementInGroup('foreground')

    useEditorStore.getState().selectElement(foregroundElement.id)

    expect(useEditorStore.getState().selectedElementId).toBe(
      foregroundElement.id,
    )
    expect(useEditorStore.getState().activeCompositionGroup).toBe(
      'foreground',
    )
    expect(useEditorStore.getState().activeLayerPlaneId).toBe(
      foregroundElement.layerPlaneId,
    )
  })

  it('keeps hidden elements selected and selectable from Layers', () => {
    const elementId = 'beat-01-stillness-title'

    useEditorStore.getState().selectElement(elementId)
    useEditorStore.getState().setElementVisibility(elementId, false)
    expect(useEditorStore.getState().selectedElementId).toBe(elementId)

    useEditorStore.getState().setLayerPlaneVisibility(
      BUILD_WEEK_LAYER_PLANE_IDS.contentText,
      false,
    )
    expect(useEditorStore.getState().selectedElementId).toBe(elementId)

    useEditorStore
      .getState()
      .setCompositionGroupVisibility('content', false)
    expect(useEditorStore.getState().selectedElementId).toBe(elementId)

    useEditorStore.getState().selectElement(null)
    useEditorStore.getState().selectElement(elementId, true)
    expect(useEditorStore.getState().selectedElementId).toBe(elementId)
    expect(useEditorStore.getState().activeCompositionGroup).toBe('content')
    expect(useEditorStore.getState().activeLayerPlaneId).toBe(
      BUILD_WEEK_LAYER_PLANE_IDS.contentText,
    )
  })

  it('changes groups and planes without leaving an incompatible selection', () => {
    useEditorStore
      .getState()
      .selectElement('beat-01-stillness-title')
    useEditorStore.getState().setActiveCompositionGroup('content')
    expect(useEditorStore.getState().selectedElementId).toBe(
      'beat-01-stillness-title',
    )

    useEditorStore.getState().setActiveCompositionGroup('background')
    expect(useEditorStore.getState().selectedElementId).toBeNull()
    expect(useEditorStore.getState().activeLayerPlaneId).toBe(
      BUILD_WEEK_LAYER_PLANE_IDS.backgroundBase,
    )

    useEditorStore
      .getState()
      .setActiveLayerPlane(BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree)
    expect(useEditorStore.getState().activeLayerPlaneId).toBe(
      BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
    )

    useEditorStore
      .getState()
      .setActiveLayerPlane(BUILD_WEEK_LAYER_PLANE_IDS.contentText)
    expect(useEditorStore.getState().activeLayerPlaneId).toBe(
      BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
    )
  })

  it('appends and selects a new ordinary plane in the active group', () => {
    const before = getLayerPlanesForGroup(
      useEditorStore.getState().episode,
      'content',
    )

    useEditorStore.getState().createLayerPlane()

    const state = useEditorStore.getState()
    const after = getLayerPlanesForGroup(state.episode, 'content')

    expect(after).toHaveLength(before.length + 1)
    expect(after.at(-1)).toEqual({
      id: 'content-plane-3',
      kind: 'ordinary',
      compositionGroup: 'content',
      order: 3,
      visible: true,
    })
    expect(state.activeLayerPlaneId).toBe('content-plane-3')
    expect(state.selectedElementId).toBeNull()
  })

  it('deletes an empty plane and activates the nearest lower survivor', () => {
    useEditorStore.getState().createLayerPlane()
    useEditorStore.getState().createLayerPlane()

    expect(useEditorStore.getState().activeLayerPlaneId).toBe(
      'content-plane-4',
    )

    useEditorStore.getState().deleteLayerPlane('content-plane-3')

    const state = useEditorStore.getState()
    const layerPlanes = getLayerPlanesForGroup(state.episode, 'content')

    expect(layerPlanes.map(({ id }) => id)).toEqual([
      BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
      BUILD_WEEK_LAYER_PLANE_IDS.contentText,
      'content-plane-4',
    ])
    expect(layerPlanes.map(({ order }) => order)).toEqual([1, 2, 3])
    expect(state.activeCompositionGroup).toBe('content')
    expect(state.activeLayerPlaneId).toBe(
      BUILD_WEEK_LAYER_PLANE_IDS.contentText,
    )
    expect(state.selectedElementId).toBeNull()
  })

  it('activates the deleted plane group and clears selection after deletion', () => {
    useEditorStore.getState().setActiveCompositionGroup('background')
    useEditorStore.getState().createLayerPlane()
    useEditorStore
      .getState()
      .selectElement('beat-01-stillness-title')

    expect(useEditorStore.getState().activeCompositionGroup).toBe('content')
    expect(useEditorStore.getState().selectedElementId).toBe(
      'beat-01-stillness-title',
    )

    useEditorStore.getState().deleteLayerPlane('background-plane-3')

    const state = useEditorStore.getState()
    expect(state.activeCompositionGroup).toBe('background')
    expect(state.activeLayerPlaneId).toBe(
      BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
    )
    expect(state.selectedElementId).toBeNull()
  })

  it('preserves editor state when plane deletion is guarded', () => {
    useEditorStore
      .getState()
      .setActiveLayerPlane(BUILD_WEEK_LAYER_PLANE_IDS.contentText)

    const textElements = useEditorStore
      .getState()
      .episode.elements.filter(
        ({ layerPlaneId }) =>
          layerPlaneId === BUILD_WEEK_LAYER_PLANE_IDS.contentText,
      )

    for (const element of textElements) {
      useEditorStore.getState().setElementVisibility(element.id, false)
    }

    useEditorStore
      .getState()
      .selectElement('beat-01-stillness-title')

    const stateBeforePopulatedDeletion = useEditorStore.getState()
    useEditorStore
      .getState()
      .deleteLayerPlane(BUILD_WEEK_LAYER_PLANE_IDS.contentText)

    expect(useEditorStore.getState()).toBe(stateBeforePopulatedDeletion)
    expect(useEditorStore.getState().selectedElementId).toBe(
      'beat-01-stillness-title',
    )

    const stateBeforeBaseDeletion = useEditorStore.getState()
    useEditorStore
      .getState()
      .deleteLayerPlane(BUILD_WEEK_LAYER_PLANE_IDS.backgroundBase)

    expect(useEditorStore.getState()).toBe(stateBeforeBaseDeletion)
  })

  it('updates the episode name through the command and rejects blank names', () => {
    useEditorStore.getState().setEpisodeName('The First Sprout')
    expect(useEditorStore.getState().episode.name).toBe('The First Sprout')

    const namedEpisode = useEditorStore.getState().episode
    useEditorStore.getState().setEpisodeName('   ')

    expect(useEditorStore.getState().episode).toBe(namedEpisode)
    expect(useEditorStore.getState().episode.name).toBe('The First Sprout')
  })

  it('extends the episode without moving the viewport and resets both', () => {
    const originalHeight = buildWeekEpisode.logicalHeight

    useEditorStore
      .getState()
      .selectElement('beat-01-stillness-title')
    useEditorStore.getState().setViewportY(1_600)
    useEditorStore.getState().setEpisodeName('A Longer Episode')
    useEditorStore.getState().extendEpisodeHeight()

    const extendedState = useEditorStore.getState()
    expect(extendedState.episode.logicalHeight).toBe(
      originalHeight + DEFAULT_EPISODE_HEIGHT_INCREMENT,
    )
    expect(extendedState.viewportY).toBe(1_600)
    expect(extendedState.viewportLogicalHeight).toBe(900)
    expect(extendedState.selectedElementId).toBe(
      'beat-01-stillness-title',
    )
    expect(extendedState.activeCompositionGroup).toBe('content')
    expect(extendedState.activeLayerPlaneId).toBe(
      BUILD_WEEK_LAYER_PLANE_IDS.contentText,
    )
    expect(extendedState.episode.name).toBe('A Longer Episode')

    useEditorStore.getState().resetEpisode()

    expect(useEditorStore.getState().episode).toBe(buildWeekEpisode)
    expect(useEditorStore.getState().episode.logicalHeight).toBe(
      originalHeight,
    )
    expect(useEditorStore.getState().episode.name).toBe(
      buildWeekEpisode.name,
    )
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
    expect(useEditorStore.getState().activeCompositionGroup).toBe('content')
    expect(useEditorStore.getState().activeLayerPlaneId).toBe(
      BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
    )
    expect(useEditorStore.getState().viewportY).toBe(0)
  })

  it('restores planes, base color, and visibility on reset', () => {
    useEditorStore.getState().setActiveCompositionGroup('background')
    useEditorStore.getState().createLayerPlane()
    useEditorStore.getState().setBaseColor('#123456')
    useEditorStore.getState().setLayerPlaneVisibility(
      BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
      false,
    )
    useEditorStore
      .getState()
      .setCompositionGroupVisibility('background', false)

    expect(
      getLayerPlanesForGroup(useEditorStore.getState().episode, 'background'),
    ).toHaveLength(3)
    expect(
      getBackgroundBaseLayerPlane(useEditorStore.getState().episode)
        ?.baseColor,
    ).toBe('#123456')

    useEditorStore.getState().resetEpisode()

    const state = useEditorStore.getState()
    expect(state.episode).toBe(buildWeekEpisode)
    expect(getLayerPlanesForGroup(state.episode, 'background')).toHaveLength(2)
    expect(getBackgroundBaseLayerPlane(state.episode)?.baseColor).toBe(
      '#F3F0EA',
    )
    expect(
      getLayerPlaneById(
        state.episode,
        BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
      )?.visible,
    ).toBe(true)
    expect(state.episode.compositionGroupVisibility.background).toBe(true)
    expect(state.activeCompositionGroup).toBe('content')
    expect(state.activeLayerPlaneId).toBe(
      BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
    )
  })

  it('deletes only the requested placed element and clears its selection', () => {
    const deletedId = 'beat-01-stillness-background'
    const unrelatedId = 'beat-02-spark-background'

    useEditorStore.getState().selectElement(deletedId)
    useEditorStore.getState().deleteElement(deletedId)

    expect(
      useEditorStore
        .getState()
        .episode.elements.some(({ id }) => id === deletedId),
    ).toBe(false)
    expect(
      useEditorStore
        .getState()
        .episode.elements.some(({ id }) => id === unrelatedId),
    ).toBe(true)
    expect(useEditorStore.getState().selectedElementId).toBeNull()
  })

  it('places a synthetic asset into a populated ordinary plane', () => {
    const beforeCount = useEditorStore.getState().episode.elements.length

    useEditorStore.getState().placeSyntheticAsset({
      name: 'Violet demo shape',
      fill: '#7050B8',
    })

    const state = useEditorStore.getState()
    const placed = state.episode.elements.at(-1)
    expect(state.episode.elements).toHaveLength(beforeCount + 1)
    expect(placed).toMatchObject({
      id: 'synthetic-shape-1',
      name: 'Violet demo shape',
      layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
      fill: '#7050B8',
    })
    expect(state.selectedElementId).toBe(placed?.id)
  })

  it('creates and selects a full-width region on an ordinary Background plane', () => {
    useEditorStore.getState().setActiveCompositionGroup('background')
    useEditorStore
      .getState()
      .setActiveLayerPlane(BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree)
    useEditorStore.getState().createBackgroundColorRegion({
      fill: '#123456',
      startY: 1200,
      height: 600,
    })

    const state = useEditorStore.getState()
    const region = state.episode.elements.at(-1)
    expect(region).toMatchObject({
      id: 'background-color-region-1',
      layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
      fill: '#123456',
      bounds: { x: 0, y: 1200, width: 800, height: 600 },
    })
    expect(state.selectedElementId).toBe(region?.id)
  })

  it('safely trims unused tail space and clamps the viewport', () => {
    const contentBottom = getEpisodeContentBottom(buildWeekEpisode)
    useEditorStore.getState().setViewportY(99_000)

    useEditorStore.getState().resizeEpisodeHeight(1)

    const state = useEditorStore.getState()
    expect(state.episode.logicalHeight).toBe(contentBottom)
    expect(state.viewportY).toBe(
      contentBottom - state.viewportLogicalHeight,
    )
  })

  it('keeps zoom transient, preserves center, and restores Fit Width', () => {
    const episode = useEditorStore.getState().episode
    useEditorStore.getState().setViewportPosition({ x: 0, y: 1800 })

    useEditorStore.getState().setZoomFactor(2)

    const zoomed = useEditorStore.getState()
    expect(zoomed.episode).toBe(episode)
    expect(zoomed.zoomFactor).toBe(2)
    expect(zoomed.viewportLogicalWidth).toBe(400)
    expect(zoomed.viewportLogicalHeight).toBe(450)
    expect(zoomed.viewportX).toBe(200)
    expect(zoomed.viewportY).toBe(2025)

    zoomed.panViewport({ x: 99_000, y: 99_000 })
    expect(useEditorStore.getState().viewportX).toBe(400)
    expect(useEditorStore.getState().viewportY).toBe(
      buildWeekEpisode.logicalHeight - 450,
    )

    useEditorStore.getState().setZoomFactor(1)
    expect(useEditorStore.getState().viewportLogicalWidth).toBe(800)
    expect(useEditorStore.getState().viewportX).toBe(0)
    expect(useEditorStore.getState().episode).toBe(episode)
  })

  it('resets zoom, viewport, created elements, and resized height', () => {
    useEditorStore.getState().placeSyntheticAsset({
      name: 'Mint demo shape',
      fill: '#8BE0C9',
    })
    useEditorStore.getState().resizeEpisodeHeight(8_000)
    useEditorStore.getState().setZoomFactor(2)
    useEditorStore.getState().setViewportPosition({ x: 300, y: 2_000 })

    useEditorStore.getState().resetEpisode()

    const state = useEditorStore.getState()
    expect(state.episode).toBe(buildWeekEpisode)
    expect(state.zoomFactor).toBe(1)
    expect(state.viewportX).toBe(0)
    expect(state.viewportY).toBe(0)
    expect(state.viewportLogicalWidth).toBe(800)
    expect(state.episode.elements).not.toContainEqual(
      expect.objectContaining({ id: 'synthetic-shape-1' }),
    )
  })
})
