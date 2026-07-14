import { create } from 'zustand'

import {
  BUILD_WEEK_LAYER_PLANE_IDS,
  buildWeekEpisode,
} from './fixtures/buildWeekEpisode'
import {
  DEFAULT_EPISODE_HEIGHT_INCREMENT,
  createLayerPlane as createLayerPlaneCommand,
  deleteEmptyLayerPlane as deleteEmptyLayerPlaneCommand,
  extendEpisodeHeight as extendEpisodeHeightCommand,
  moveElement as moveElementCommand,
  setBaseColor as setBaseColorCommand,
  setCompositionGroupVisibility as setCompositionGroupVisibilityCommand,
  setElementVisibility as setElementVisibilityCommand,
  setEpisodeName as setEpisodeNameCommand,
  setLayerPlaneVisibility as setLayerPlaneVisibilityCommand,
} from '../core/commands'
import {
  boundsIntersectVerticalViewport,
  centerBoundsInViewport,
  clampViewportY,
  type LogicalPosition,
} from '../core/coordinates'
import {
  getElementCompositionGroup,
  getLayerPlaneById,
  getLayerPlanesForGroup,
  type CompositionGroup,
  type EpisodeDocument,
} from '../core/episode'

interface EditorState {
  readonly episode: EpisodeDocument
  readonly selectedElementId: string | null
  readonly activeCompositionGroup: CompositionGroup
  readonly activeLayerPlaneId: string
  readonly viewportY: number
  readonly viewportLogicalHeight: number
  readonly assetPanelOpen: boolean
  readonly setActiveCompositionGroup: (group: CompositionGroup) => void
  readonly setActiveLayerPlane: (layerPlaneId: string) => void
  readonly createLayerPlane: () => void
  readonly deleteLayerPlane: (layerPlaneId: string) => void
  readonly setEpisodeName: (name: string) => void
  readonly extendEpisodeHeight: () => void
  readonly setViewportLogicalHeight: (logicalHeight: number) => void
  readonly setViewportY: (logicalY: number) => void
  readonly panViewport: (logicalDelta: number) => void
  readonly selectElement: (elementId: string | null, reveal?: boolean) => void
  readonly setElementVisibility: (elementId: string, visible: boolean) => void
  readonly setLayerPlaneVisibility: (
    layerPlaneId: string,
    visible: boolean,
  ) => void
  readonly setCompositionGroupVisibility: (
    group: CompositionGroup,
    visible: boolean,
  ) => void
  readonly setBaseColor: (color: string) => void
  readonly moveElement: (
    elementId: string,
    logicalPosition: LogicalPosition,
  ) => void
  readonly toggleAssetPanel: () => void
  readonly resetEpisode: () => void
}

const INITIAL_VIEWPORT_LOGICAL_HEIGHT = 900
const INITIAL_COMPOSITION_GROUP = 'content' as const
const INITIAL_LAYER_PLANE_ID = BUILD_WEEK_LAYER_PLANE_IDS.contentPanels

export const useEditorStore = create<EditorState>((set) => ({
  episode: buildWeekEpisode,
  selectedElementId: null,
  activeCompositionGroup: INITIAL_COMPOSITION_GROUP,
  activeLayerPlaneId: INITIAL_LAYER_PLANE_ID,
  viewportY: 0,
  viewportLogicalHeight: INITIAL_VIEWPORT_LOGICAL_HEIGHT,
  assetPanelOpen: false,

  setActiveCompositionGroup: (group) => {
    set((state) => {
      if (group === state.activeCompositionGroup) {
        return state
      }

      const firstLayerPlane = getLayerPlanesForGroup(state.episode, group)[0]

      return {
        activeCompositionGroup: group,
        activeLayerPlaneId: firstLayerPlane?.id ?? state.activeLayerPlaneId,
        selectedElementId: null,
      }
    })
  },

  setActiveLayerPlane: (layerPlaneId) => {
    set((state) => {
      const layerPlane = getLayerPlaneById(state.episode, layerPlaneId)

      if (
        !layerPlane ||
        layerPlane.compositionGroup !== state.activeCompositionGroup ||
        layerPlane.id === state.activeLayerPlaneId
      ) {
        return state
      }

      const selectedElement = state.episode.elements.find(
        ({ id }) => id === state.selectedElementId,
      )

      return {
        activeLayerPlaneId: layerPlane.id,
        selectedElementId:
          selectedElement?.layerPlaneId === layerPlane.id
            ? selectedElement.id
            : null,
      }
    })
  },

  createLayerPlane: () => {
    set((state) => {
      const episode = createLayerPlaneCommand(
        state.episode,
        state.activeCompositionGroup,
      )
      const layerPlanes = getLayerPlanesForGroup(
        episode,
        state.activeCompositionGroup,
      )
      const createdLayerPlane = layerPlanes[layerPlanes.length - 1]

      return {
        episode,
        activeLayerPlaneId:
          createdLayerPlane?.id ?? state.activeLayerPlaneId,
        selectedElementId: null,
      }
    })
  },

  deleteLayerPlane: (layerPlaneId) => {
    set((state) => {
      const layerPlane = getLayerPlaneById(state.episode, layerPlaneId)
      if (!layerPlane) {
        return state
      }

      const groupLayerPlanes = getLayerPlanesForGroup(
        state.episode,
        layerPlane.compositionGroup,
      )
      const deletedIndex = groupLayerPlanes.findIndex(
        ({ id }) => id === layerPlaneId,
      )
      const episode = deleteEmptyLayerPlaneCommand(
        state.episode,
        layerPlaneId,
      )

      if (episode === state.episode || deletedIndex < 0) {
        return state
      }

      const previousLayerPlane = groupLayerPlanes[deletedIndex - 1]
      const nextLayerPlane = groupLayerPlanes[deletedIndex + 1]
      const survivorId = previousLayerPlane?.id ?? nextLayerPlane?.id
      const survivor = survivorId
        ? getLayerPlaneById(episode, survivorId)
        : undefined

      if (!survivor) {
        return state
      }

      return {
        episode,
        activeCompositionGroup: layerPlane.compositionGroup,
        activeLayerPlaneId: survivor.id,
        selectedElementId: null,
      }
    })
  },

  setEpisodeName: (name) => {
    set((state) => {
      const episode = setEpisodeNameCommand(state.episode, name)
      return episode === state.episode ? state : { episode }
    })
  },

  extendEpisodeHeight: () => {
    set((state) => {
      const episode = extendEpisodeHeightCommand(
        state.episode,
        DEFAULT_EPISODE_HEIGHT_INCREMENT,
      )
      return episode === state.episode ? state : { episode }
    })
  },

  setViewportLogicalHeight: (logicalHeight) => {
    set((state) => ({
      viewportLogicalHeight: logicalHeight,
      viewportY: clampViewportY(
        state.viewportY,
        state.episode.logicalHeight,
        logicalHeight,
      ),
    }))
  },

  setViewportY: (logicalY) => {
    set((state) => ({
      viewportY: clampViewportY(
        logicalY,
        state.episode.logicalHeight,
        state.viewportLogicalHeight,
      ),
    }))
  },

  panViewport: (logicalDelta) => {
    set((state) => ({
      viewportY: clampViewportY(
        state.viewportY + logicalDelta,
        state.episode.logicalHeight,
        state.viewportLogicalHeight,
      ),
    }))
  },

  selectElement: (elementId, reveal = false) => {
    set((state) => {
      if (!elementId) {
        return { selectedElementId: null }
      }

      const element = state.episode.elements.find(({ id }) => id === elementId)
      const compositionGroup = element
        ? getElementCompositionGroup(state.episode, element)
        : undefined

      if (!element || !compositionGroup) {
        return { selectedElementId: null }
      }

      const isVisible = boundsIntersectVerticalViewport(
        element.bounds,
        state.viewportY,
        state.viewportLogicalHeight,
      )

      return {
        selectedElementId: element.id,
        activeCompositionGroup: compositionGroup,
        activeLayerPlaneId: element.layerPlaneId,
        viewportY:
          reveal && !isVisible
            ? centerBoundsInViewport(
                element.bounds,
                state.episode.logicalHeight,
                state.viewportLogicalHeight,
              )
            : state.viewportY,
      }
    })
  },

  setElementVisibility: (elementId, visible) => {
    set((state) => ({
      episode: setElementVisibilityCommand(
        state.episode,
        elementId,
        visible,
      ),
    }))
  },

  setLayerPlaneVisibility: (layerPlaneId, visible) => {
    set((state) => ({
      episode: setLayerPlaneVisibilityCommand(
        state.episode,
        layerPlaneId,
        visible,
      ),
    }))
  },

  setCompositionGroupVisibility: (group, visible) => {
    set((state) => ({
      episode: setCompositionGroupVisibilityCommand(
        state.episode,
        group,
        visible,
      ),
    }))
  },

  setBaseColor: (color) => {
    set((state) => ({
      episode: setBaseColorCommand(state.episode, color),
    }))
  },

  moveElement: (elementId, logicalPosition) => {
    set((state) => ({
      episode: moveElementCommand(state.episode, elementId, logicalPosition),
    }))
  },

  toggleAssetPanel: () => {
    set((state) => ({ assetPanelOpen: !state.assetPanelOpen }))
  },

  resetEpisode: () => {
    set({
      episode: buildWeekEpisode,
      selectedElementId: null,
      activeCompositionGroup: INITIAL_COMPOSITION_GROUP,
      activeLayerPlaneId: INITIAL_LAYER_PLANE_ID,
      viewportY: 0,
      assetPanelOpen: false,
    })
  },
}))
