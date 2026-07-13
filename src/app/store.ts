import { create } from 'zustand'

import { buildWeekEpisode } from './fixtures/buildWeekEpisode'
import {
  moveElement as moveElementCommand,
  setCompositionGroupVisibility as setCompositionGroupVisibilityCommand,
  setElementVisibility as setElementVisibilityCommand,
} from '../core/commands'
import {
  boundsIntersectVerticalViewport,
  centerBoundsInViewport,
  clampViewportY,
  type LogicalPosition,
} from '../core/coordinates'
import {
  isElementEffectivelyVisible,
  type CompositionGroup,
  type EpisodeDocument,
} from '../core/episode'

interface EditorState {
  readonly episode: EpisodeDocument
  readonly selectedElementId: string | null
  readonly activeCompositionGroup: CompositionGroup
  readonly viewportY: number
  readonly viewportLogicalHeight: number
  readonly assetPanelOpen: boolean
  readonly setActiveCompositionGroup: (group: CompositionGroup) => void
  readonly setViewportLogicalHeight: (logicalHeight: number) => void
  readonly setViewportY: (logicalY: number) => void
  readonly panViewport: (logicalDelta: number) => void
  readonly selectElement: (elementId: string | null, reveal?: boolean) => void
  readonly setElementVisibility: (elementId: string, visible: boolean) => void
  readonly setCompositionGroupVisibility: (
    group: CompositionGroup,
    visible: boolean,
  ) => void
  readonly moveElement: (
    elementId: string,
    logicalPosition: LogicalPosition,
  ) => void
  readonly toggleAssetPanel: () => void
  readonly resetEpisode: () => void
}

const INITIAL_VIEWPORT_LOGICAL_HEIGHT = 900

function keepVisibleSelection(
  episode: EpisodeDocument,
  selectedElementId: string | null,
): string | null {
  if (!selectedElementId) {
    return null
  }

  const selectedElement = episode.elements.find(
    ({ id }) => id === selectedElementId,
  )

  return selectedElement &&
    isElementEffectivelyVisible(episode, selectedElement)
    ? selectedElementId
    : null
}

export const useEditorStore = create<EditorState>((set) => ({
  episode: buildWeekEpisode,
  selectedElementId: null,
  activeCompositionGroup: 'content',
  viewportY: 0,
  viewportLogicalHeight: INITIAL_VIEWPORT_LOGICAL_HEIGHT,
  assetPanelOpen: false,

  setActiveCompositionGroup: (group) => {
    set((state) => ({
      activeCompositionGroup: group,
      selectedElementId:
        group === state.activeCompositionGroup
          ? state.selectedElementId
          : null,
    }))
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
      const element = state.episode.elements.find(({ id }) => id === elementId)

      if (!element || !isElementEffectivelyVisible(state.episode, element)) {
        return { selectedElementId: null }
      }

      const isVisible = boundsIntersectVerticalViewport(
        element.bounds,
        state.viewportY,
        state.viewportLogicalHeight,
      )

      return {
        selectedElementId: element.id,
        activeCompositionGroup: element.compositionGroup,
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
    set((state) => {
      const episode = setElementVisibilityCommand(
        state.episode,
        elementId,
        visible,
      )

      return {
        episode,
        selectedElementId: keepVisibleSelection(
          episode,
          state.selectedElementId,
        ),
      }
    })
  },

  setCompositionGroupVisibility: (group, visible) => {
    set((state) => {
      const episode = setCompositionGroupVisibilityCommand(
        state.episode,
        group,
        visible,
      )

      return {
        episode,
        selectedElementId: keepVisibleSelection(
          episode,
          state.selectedElementId,
        ),
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

  resetEpisode: () => {
    set({
      episode: buildWeekEpisode,
      selectedElementId: null,
      activeCompositionGroup: 'content',
      viewportY: 0,
      assetPanelOpen: false,
    })
  },
}))
