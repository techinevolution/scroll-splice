import {
  EPISODE_FORMAT_VERSION,
  EPISODE_LOGICAL_WIDTH,
  type EpisodeDocument,
  type LayerPlane,
} from './episode'

export const BLANK_EPISODE_NAME = 'Untitled Episode'
export const BLANK_EPISODE_LOGICAL_HEIGHT = 1280

export const BLANK_EPISODE_LAYER_PLANE_IDS = {
  backgroundBase: 'background-plane-1',
  backgroundFree: 'background-plane-2',
  content: 'content-plane-1',
  foreground: 'foreground-plane-1',
} as const

const BLANK_EPISODE_BASE_COLOR = '#FFFFFF'

export function createBlankEpisode(episodeId: string): EpisodeDocument {
  const id = episodeId.trim()

  if (!id) {
    throw new Error('A blank episode requires a non-empty stable ID.')
  }

  const layerPlanes: readonly LayerPlane[] = [
    {
      id: BLANK_EPISODE_LAYER_PLANE_IDS.backgroundBase,
      kind: 'base',
      compositionGroup: 'background',
      order: 1,
      visible: true,
      baseColor: BLANK_EPISODE_BASE_COLOR,
    },
    {
      id: BLANK_EPISODE_LAYER_PLANE_IDS.backgroundFree,
      kind: 'ordinary',
      compositionGroup: 'background',
      order: 2,
      visible: true,
    },
    {
      id: BLANK_EPISODE_LAYER_PLANE_IDS.content,
      kind: 'ordinary',
      compositionGroup: 'content',
      order: 1,
      visible: true,
    },
    {
      id: BLANK_EPISODE_LAYER_PLANE_IDS.foreground,
      kind: 'ordinary',
      compositionGroup: 'foreground',
      order: 1,
      visible: true,
    },
  ]

  return {
    id,
    formatVersion: EPISODE_FORMAT_VERSION,
    name: BLANK_EPISODE_NAME,
    logicalWidth: EPISODE_LOGICAL_WIDTH,
    logicalHeight: BLANK_EPISODE_LOGICAL_HEIGHT,
    compositionGroupVisibility: {
      background: true,
      content: true,
      foreground: true,
    },
    layerPlanes,
    elements: [],
  }
}
