import { describe, expect, it } from 'vitest'

import { createBlankEpisode } from './createBlankEpisode'
import {
  deleteElementSelection,
  duplicateElementSelection,
  getElementGroupByMember,
  groupElements,
  moveElementSelection,
  moveElementSelectionToLayerPlane,
  setElementSelectionLocked,
  ungroupElements,
} from './groupCommands'
import {
  IDENTITY_ELEMENT_TRANSFORM,
  type EpisodeDocument,
  type ShapeElement,
} from './episode'

function episodeWithElements(): EpisodeDocument {
  const episode = createBlankEpisode('episode-groups')
  const planeId = episode.layerPlanes.find(
    ({ compositionGroup, kind }) =>
      compositionGroup === 'content' && kind === 'ordinary',
  )?.id

  if (!planeId) throw new Error('Fixture needs a content plane.')

  const makeElement = (id: string, x: number): ShapeElement => ({
    id,
    type: 'shape',
    name: id,
    layerPlaneId: planeId,
    bounds: { x, y: 20, width: 100, height: 100 },
    visible: true,
    locked: false,
    zIndex: x,
    opacity: 1,
    blendMode: 'normal',
    transform: IDENTITY_ELEMENT_TRANSFORM,
    overflow: 'constrained',
    assetReference: { kind: 'synthetic', generatorId: 'test-shape' },
    shape: 'rectangle',
    fill: { kind: 'solid', color: '#ffffff' },
  })

  return {
    ...episode,
    elements: [makeElement('one', 0), makeElement('two', 150), makeElement('three', 700)],
  }
}

describe('flat element-group commands', () => {
  it('groups and ungroups existing ungrouped members', () => {
    const grouped = groupElements(episodeWithElements(), ['one', 'two', 'one'])

    expect(grouped.elementGroups).toEqual([
      { id: 'group-1', memberElementIds: ['one', 'two'] },
    ])
    expect(getElementGroupByMember(grouped, 'two')?.id).toBe('group-1')
    expect(groupElements(grouped, ['two', 'three'])).toBe(grouped)
    expect(ungroupElements(grouped, 'group-1').elementGroups).toEqual([])
  })

  it('moves a selection by one shared clamped delta', () => {
    const moved = moveElementSelection(
      episodeWithElements(),
      ['one', 'three'],
      { x: 80, y: -50 },
    )

    expect(moved.elements.find(({ id }) => id === 'one')?.bounds).toMatchObject({
      x: 0,
      y: 0,
    })
    expect(moved.elements.find(({ id }) => id === 'three')?.bounds).toMatchObject({
      x: 700,
      y: 0,
    })
  })

  it('duplicates a full group with new stable IDs and one copied group', () => {
    const grouped = groupElements(episodeWithElements(), ['one', 'two'])
    const duplicated = duplicateElementSelection(grouped, ['one', 'two'])
    const copyGroup = duplicated.elementGroups[1]

    expect(duplicated.elements).toHaveLength(5)
    expect(copyGroup?.id).toBe('group-2')
    expect(copyGroup?.memberElementIds).toHaveLength(2)
    expect(
      copyGroup?.memberElementIds.every((id) => id.includes('-copy-')),
    ).toBe(true)
  })

  it('deletes unlocked members atomically and refuses a locked selection', () => {
    const grouped = groupElements(episodeWithElements(), ['one', 'two'])
    const deleted = deleteElementSelection(grouped, ['one', 'two'])

    expect(deleted.elements.map(({ id }) => id)).toEqual(['three'])
    expect(deleted.elementGroups).toEqual([])

    const locked = {
      ...grouped,
      elements: grouped.elements.map((element) =>
        element.id === 'two' ? { ...element, locked: true } : element,
      ),
    }
    expect(deleteElementSelection(locked, ['one', 'two'])).toBe(locked)
  })

  it('locks and moves a selection to one ordinary plane atomically', () => {
    const original = episodeWithElements()
    const targetPlaneId = original.layerPlanes.find(
      ({ compositionGroup, kind }) =>
        compositionGroup === 'foreground' && kind === 'ordinary',
    )?.id
    if (!targetPlaneId) throw new Error('Fixture needs a target plane.')

    const locked = setElementSelectionLocked(original, ['one', 'two'], true)
    expect(
      locked.elements
        .filter(({ id }) => id === 'one' || id === 'two')
        .every(({ locked: isLocked }) => isLocked),
    ).toBe(true)
    expect(moveElementSelectionToLayerPlane(locked, ['one', 'two'], targetPlaneId)).toBe(locked)

    const unlocked = setElementSelectionLocked(locked, ['one', 'two'], false)
    const moved = moveElementSelectionToLayerPlane(
      unlocked,
      ['one', 'two'],
      targetPlaneId,
    )
    expect(
      moved.elements
        .filter(({ id }) => id === 'one' || id === 'two')
        .every(({ layerPlaneId }) => layerPlaneId === targetPlaneId),
    ).toBe(true)
  })
})
