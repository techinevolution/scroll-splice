import { create } from 'zustand'

import {
  BUILD_WEEK_LAYER_PLANE_IDS,
  buildWeekEpisode,
} from './fixtures/buildWeekEpisode'
import {
  DEFAULT_EPISODE_HEIGHT_INCREMENT,
  createBackgroundColorRegion as createBackgroundColorRegionCommand,
  createLayerPlane as createLayerPlaneCommand,
  createSyntheticShapeElement as createSyntheticShapeElementCommand,
  deleteElement as deleteElementCommand,
  deleteEmptyLayerPlane as deleteEmptyLayerPlaneCommand,
  extendEpisodeHeight as extendEpisodeHeightCommand,
  moveElement as moveElementCommand,
  resizeEpisodeHeight as resizeEpisodeHeightCommand,
  setBaseColor as setBaseColorCommand,
  setCompositionGroupVisibility as setCompositionGroupVisibilityCommand,
  setElementVisibility as setElementVisibilityCommand,
  setEpisodeName as setEpisodeNameCommand,
  setLayerPlaneVisibility as setLayerPlaneVisibilityCommand,
} from '../core/commands'
import {
  DEFAULT_ZOOM_FACTOR,
  boundsIntersectViewport,
  clampViewportPosition,
  clampZoomFactor,
  preserveViewportCenter,
  revealBoundsInViewport,
  type LogicalPosition,
  type LogicalViewport,
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
  readonly viewportX: number
  readonly viewportY: number
  readonly viewportLogicalWidth: number
  readonly viewportLogicalHeight: number
  readonly fitViewportLogicalHeight: number
  readonly zoomFactor: number
  readonly assetPanelOpen: boolean
  readonly setActiveCompositionGroup: (group: CompositionGroup) => void
  readonly setActiveLayerPlane: (layerPlaneId: string) => void
  readonly createLayerPlane: () => void
  readonly deleteLayerPlane: (layerPlaneId: string) => void
  readonly setEpisodeName: (name: string) => void
  readonly extendEpisodeHeight: () => void
  readonly resizeEpisodeHeight: (
    logicalHeight: number,
    pinViewportToEnd?: boolean,
  ) => void
  readonly setFitViewportLogicalHeight: (logicalHeight: number) => void
  readonly setZoomFactor: (zoomFactor: number) => void
  readonly setViewportPosition: (position: LogicalPosition) => void
  readonly setViewportY: (logicalY: number) => void
  readonly panViewport: (logicalDelta: LogicalPosition) => void
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
  readonly deleteElement: (elementId: string) => void
  readonly placeSyntheticAsset: (input: {
    readonly name: string
    readonly fill: string
  }) => void
  readonly createBackgroundColorRegion: (input: {
    readonly fill: string
    readonly startY: number
    readonly height: number
  }) => void
  readonly moveElement: (
    elementId: string,
    logicalPosition: LogicalPosition,
  ) => void
  readonly toggleAssetPanel: () => void
  readonly openAssetPanel: () => void
  readonly resetEpisode: () => void
}

const INITIAL_VIEWPORT_LOGICAL_HEIGHT = 900
const INITIAL_COMPOSITION_GROUP = 'content' as const
const INITIAL_LAYER_PLANE_ID = BUILD_WEEK_LAYER_PLANE_IDS.contentPanels

function getViewportLogicalDimensions(
  episode: EpisodeDocument,
  fitViewportLogicalHeight: number,
  zoomFactor: number,
) {
  return {
    width: Math.min(episode.logicalWidth / zoomFactor, episode.logicalWidth),
    height: Math.min(
      fitViewportLogicalHeight / zoomFactor,
      episode.logicalHeight,
    ),
  }
}

function getEpisodeLogicalDimensions(episode: EpisodeDocument) {
  return { width: episode.logicalWidth, height: episode.logicalHeight }
}

function getLogicalViewport(state: EditorState): LogicalViewport {
  return {
    x: state.viewportX,
    y: state.viewportY,
    width: state.viewportLogicalWidth,
    height: state.viewportLogicalHeight,
  }
}

export const useEditorStore = create<EditorState>((set) => ({
  episode: buildWeekEpisode,
  selectedElementId: null,
  activeCompositionGroup: INITIAL_COMPOSITION_GROUP,
  activeLayerPlaneId: INITIAL_LAYER_PLANE_ID,
  viewportX: 0,
  viewportY: 0,
  viewportLogicalWidth: buildWeekEpisode.logicalWidth,
  viewportLogicalHeight: INITIAL_VIEWPORT_LOGICAL_HEIGHT,
  fitViewportLogicalHeight: INITIAL_VIEWPORT_LOGICAL_HEIGHT,
  zoomFactor: DEFAULT_ZOOM_FACTOR,
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

      if (episode === state.episode) {
        return state
      }

      const viewportDimensions = getViewportLogicalDimensions(
        episode,
        state.fitViewportLogicalHeight,
        state.zoomFactor,
      )

      return {
        episode,
        viewportLogicalWidth: viewportDimensions.width,
        viewportLogicalHeight: viewportDimensions.height,
      }
    })
  },

  resizeEpisodeHeight: (logicalHeight, pinViewportToEnd = false) => {
    set((state) => {
      const episode = resizeEpisodeHeightCommand(state.episode, logicalHeight)

      if (episode === state.episode) {
        return state
      }

      const viewportDimensions = getViewportLogicalDimensions(
        episode,
        state.fitViewportLogicalHeight,
        state.zoomFactor,
      )
      const viewportPosition = pinViewportToEnd
        ? clampViewportPosition(
            {
              x: state.viewportX,
              y: episode.logicalHeight - viewportDimensions.height,
            },
            getEpisodeLogicalDimensions(episode),
            viewportDimensions,
          )
        : clampViewportPosition(
            { x: state.viewportX, y: state.viewportY },
            getEpisodeLogicalDimensions(episode),
            viewportDimensions,
          )

      return {
        episode,
        viewportX: viewportPosition.x,
        viewportY: viewportPosition.y,
        viewportLogicalWidth: viewportDimensions.width,
        viewportLogicalHeight: viewportDimensions.height,
      }
    })
  },

  setFitViewportLogicalHeight: (logicalHeight) => {
    set((state) => {
      if (!Number.isFinite(logicalHeight) || logicalHeight <= 0) {
        return state
      }

      const viewportDimensions = getViewportLogicalDimensions(
        state.episode,
        logicalHeight,
        state.zoomFactor,
      )
      const viewportPosition = clampViewportPosition(
        { x: state.viewportX, y: state.viewportY },
        getEpisodeLogicalDimensions(state.episode),
        viewportDimensions,
      )

      return {
        fitViewportLogicalHeight: logicalHeight,
        viewportX: viewportPosition.x,
        viewportY: viewportPosition.y,
        viewportLogicalWidth: viewportDimensions.width,
        viewportLogicalHeight: viewportDimensions.height,
      }
    })
  },

  setZoomFactor: (requestedZoomFactor) => {
    set((state) => {
      const zoomFactor = clampZoomFactor(requestedZoomFactor)

      if (zoomFactor === state.zoomFactor) {
        return state
      }

      const viewportDimensions = getViewportLogicalDimensions(
        state.episode,
        state.fitViewportLogicalHeight,
        zoomFactor,
      )
      const viewportPosition = preserveViewportCenter(
        getLogicalViewport(state),
        viewportDimensions,
        getEpisodeLogicalDimensions(state.episode),
      )

      return {
        zoomFactor,
        viewportX: viewportPosition.x,
        viewportY: viewportPosition.y,
        viewportLogicalWidth: viewportDimensions.width,
        viewportLogicalHeight: viewportDimensions.height,
      }
    })
  },

  setViewportPosition: (position) => {
    set((state) => {
      const viewportPosition = clampViewportPosition(
        position,
        getEpisodeLogicalDimensions(state.episode),
        {
          width: state.viewportLogicalWidth,
          height: state.viewportLogicalHeight,
        },
      )

      return {
        viewportX: viewportPosition.x,
        viewportY: viewportPosition.y,
      }
    })
  },

  setViewportY: (logicalY) => {
    set((state) => {
      const viewportPosition = clampViewportPosition(
        { x: state.viewportX, y: logicalY },
        getEpisodeLogicalDimensions(state.episode),
        {
          width: state.viewportLogicalWidth,
          height: state.viewportLogicalHeight,
        },
      )

      return { viewportY: viewportPosition.y }
    })
  },

  panViewport: (logicalDelta) => {
    set((state) => {
      const viewportPosition = clampViewportPosition(
        {
          x: state.viewportX + logicalDelta.x,
          y: state.viewportY + logicalDelta.y,
        },
        getEpisodeLogicalDimensions(state.episode),
        {
          width: state.viewportLogicalWidth,
          height: state.viewportLogicalHeight,
        },
      )

      return {
        viewportX: viewportPosition.x,
        viewportY: viewportPosition.y,
      }
    })
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

      const viewport = getLogicalViewport(state)
      const isVisible = boundsIntersectViewport(element.bounds, viewport)
      const revealedPosition = reveal
        ? revealBoundsInViewport(
            element.bounds,
            viewport,
            getEpisodeLogicalDimensions(state.episode),
          )
        : { x: state.viewportX, y: state.viewportY }

      return {
        selectedElementId: element.id,
        activeCompositionGroup: compositionGroup,
        activeLayerPlaneId: element.layerPlaneId,
        viewportX: reveal && !isVisible ? revealedPosition.x : state.viewportX,
        viewportY: reveal && !isVisible ? revealedPosition.y : state.viewportY,
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

  deleteElement: (elementId) => {
    set((state) => {
      const episode = deleteElementCommand(state.episode, elementId)

      if (episode === state.episode) {
        return state
      }

      return {
        episode,
        selectedElementId:
          state.selectedElementId === elementId
            ? null
            : state.selectedElementId,
      }
    })
  },

  placeSyntheticAsset: ({ name, fill }) => {
    set((state) => {
      const width = 150
      const height = 110
      const episode = createSyntheticShapeElementCommand(state.episode, {
        layerPlaneId: state.activeLayerPlaneId,
        name,
        fill,
        bounds: {
          x: state.viewportX + (state.viewportLogicalWidth - width) / 2,
          y: state.viewportY + (state.viewportLogicalHeight - height) / 2,
          width,
          height,
        },
      })

      if (episode === state.episode) {
        return state
      }

      const createdElement = episode.elements.at(-1)

      return {
        episode,
        selectedElementId: createdElement?.id ?? state.selectedElementId,
      }
    })
  },

  createBackgroundColorRegion: ({ fill, startY, height }) => {
    set((state) => {
      const episode = createBackgroundColorRegionCommand(state.episode, {
        layerPlaneId: state.activeLayerPlaneId,
        fill,
        startY,
        height,
      })

      if (episode === state.episode) {
        return state
      }

      const createdElement = episode.elements.at(-1)

      return {
        episode,
        selectedElementId: createdElement?.id ?? state.selectedElementId,
      }
    })
  },

  moveElement: (elementId, logicalPosition) => {
    set((state) => ({
      episode: moveElementCommand(state.episode, elementId, logicalPosition),
    }))
  },

  toggleAssetPanel: () => {
    set((state) => ({ assetPanelOpen: !state.assetPanelOpen }))
  },

  openAssetPanel: () => {
    set({ assetPanelOpen: true })
  },

  resetEpisode: () => {
    set((state) => {
      const viewportDimensions = getViewportLogicalDimensions(
        buildWeekEpisode,
        state.fitViewportLogicalHeight,
        DEFAULT_ZOOM_FACTOR,
      )

      return {
        episode: buildWeekEpisode,
        selectedElementId: null,
        activeCompositionGroup: INITIAL_COMPOSITION_GROUP,
        activeLayerPlaneId: INITIAL_LAYER_PLANE_ID,
        viewportX: 0,
        viewportY: 0,
        viewportLogicalWidth: viewportDimensions.width,
        viewportLogicalHeight: viewportDimensions.height,
        zoomFactor: DEFAULT_ZOOM_FACTOR,
        assetPanelOpen: false,
      }
    })
  },
}))
