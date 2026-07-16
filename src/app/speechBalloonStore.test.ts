import { beforeEach, describe, expect, it } from 'vitest'

import {
  BLANK_EPISODE_LAYER_PLANE_IDS,
  createBlankEpisode,
} from '../core/createBlankEpisode'
import { useEditorStore } from './store'

describe('editable speech balloon store history', () => {
  beforeEach(() => {
    useEditorStore.setState({
      episode: createBlankEpisode('balloon-store'),
      historyPast: [],
      historyFuture: [],
      currentRevision: 0,
      nextRevision: 1,
      savedRevision: null,
      canUndo: false,
      canRedo: false,
      hasUnsavedChanges: false,
      selectedElementId: null,
      selectedElementIds: [],
      activeCompositionGroup: 'content',
      activeLayerPlaneId: BLANK_EPISODE_LAYER_PLANE_IDS.content,
      viewportX: 0,
      viewportY: 0,
      viewportLogicalWidth: 800,
      viewportLogicalHeight: 900,
      liveElementBounds: null,
    })
  })

  it('creates, edits, and undoes an atomic balloon through normal history', () => {
    expect(useEditorStore.getState().createSpeechBalloonElement()).toBe(true)
    const created = useEditorStore.getState().episode.elements[0]
    expect(created?.type).toBe('speech-balloon')
    expect(useEditorStore.getState().canUndo).toBe(true)
    if (created?.type !== 'speech-balloon') throw new Error('Expected balloon')

    useEditorStore.getState().updateSpeechBalloonElement(created.id, {
      ...created,
      text: 'Edited wording',
    })
    expect(useEditorStore.getState().episode.elements[0]).toMatchObject({
      type: 'speech-balloon',
      text: 'Edited wording',
    })

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().episode.elements[0]).toMatchObject({
      type: 'speech-balloon',
      text: 'Your dialogue',
    })
    useEditorStore.getState().undo()
    expect(useEditorStore.getState().episode.elements).toEqual([])
  })
})
