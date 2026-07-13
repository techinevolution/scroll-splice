import { create } from 'zustand'

import { buildWeekEpisode } from './fixtures/buildWeekEpisode'
import { moveElement as moveElementCommand } from '../core/commands'
import {
  boundsIntersectVerticalViewport,
  centerBoundsInViewport,
  clampViewportY,
  type LogicalPosition,
} from '../core/coordinates'
import type { EpisodeDocument } from '../core/episode'

interface EditorState {
  readonly episode: EpisodeDocument
  readonly selectedElementId: string | null
  readonly viewportY: number
  readonly viewportLogicalHeight: number
  readonly assetPanelOpen: boolean
  readonly setViewportLogicalHeight: (logicalHeight: number) => void
  readonly setViewportY: (logicalY: number) => void
  readonly panViewport: (logicalDelta: number) => void
  readonly selectElement: (elementId: string | null, reveal?: boolean) => void
  readonly moveElement: (
    elementId: string,
    logicalPosition: LogicalPosition,
  ) => void
  readonly toggleAssetPanel: () => void
  readonly resetEpisode: () => void
}

const INITIAL_VIEWPORT_LOGICAL_HEIGHT = 900

export const useEditorStore = create<EditorState>((set) => ({
  episode: buildWeekEpisode,
  selectedElementId: null,
  viewportY: 0,
  viewportLogicalHeight: INITIAL_VIEWPORT_LOGICAL_HEIGHT,
  assetPanelOpen: false,

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

      if (!element) {
        return { selectedElementId: null }
      }

      const isVisible = boundsIntersectVerticalViewport(
        element.bounds,
        state.viewportY,
        state.viewportLogicalHeight,
      )

      return {
        selectedElementId: element.id,
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
      viewportY: 0,
      assetPanelOpen: false,
    })
  },
}))
