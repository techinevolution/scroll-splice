import { describe, expect, it } from 'vitest'

import {
  BLANK_EPISODE_LAYER_PLANE_IDS,
  BLANK_EPISODE_LOGICAL_HEIGHT,
  BLANK_EPISODE_NAME,
  createBlankEpisode,
} from './createBlankEpisode'
import {
  EPISODE_FORMAT_VERSION,
  EPISODE_LOGICAL_WIDTH,
  getBackgroundBaseLayerPlane,
  getLayerPlanesForGroup,
} from './episode'

describe('createBlankEpisode', () => {
  it('creates the minimal editable current-format episode from an injected ID', () => {
    const episode = createBlankEpisode('episode-new-123')

    expect(episode).toEqual({
      id: 'episode-new-123',
      formatVersion: EPISODE_FORMAT_VERSION,
      name: BLANK_EPISODE_NAME,
      logicalWidth: EPISODE_LOGICAL_WIDTH,
      logicalHeight: BLANK_EPISODE_LOGICAL_HEIGHT,
      compositionGroupVisibility: {
        background: true,
        content: true,
        foreground: true,
      },
      layerPlanes: [
        {
          id: BLANK_EPISODE_LAYER_PLANE_IDS.backgroundBase,
          kind: 'base',
          compositionGroup: 'background',
          order: 1,
          visible: true,
          baseColor: '#FFFFFF',
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
      ],
      elements: [],
      elementGroups: [],
    })
  })

  it('seeds one editable ordinary plane in every composition group', () => {
    const episode = createBlankEpisode('episode-plane-proof')

    expect(getBackgroundBaseLayerPlane(episode)?.order).toBe(1)
    expect(
      getLayerPlanesForGroup(episode, 'background').map(({ kind }) => kind),
    ).toEqual(['base', 'ordinary'])
    expect(getLayerPlanesForGroup(episode, 'content')).toHaveLength(1)
    expect(getLayerPlanesForGroup(episode, 'foreground')).toHaveLength(1)
  })

  it('trims the injected ID and rejects a blank ID', () => {
    expect(createBlankEpisode('  episode-trimmed  ').id).toBe(
      'episode-trimmed',
    )
    expect(() => createBlankEpisode('   ')).toThrow(
      'A blank episode requires a non-empty stable ID.',
    )
  })

  it('returns fresh document collections for each new episode', () => {
    const first = createBlankEpisode('episode-one')
    const second = createBlankEpisode('episode-two')

    expect(first).not.toBe(second)
    expect(first.layerPlanes).not.toBe(second.layerPlanes)
    expect(first.elements).not.toBe(second.elements)
  })
})
