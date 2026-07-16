import { describe, expect, it } from 'vitest'

import { createLayerPlane, createSyntheticShapeElement } from './commands'
import { createBlankEpisode } from './createBlankEpisode'
import { deleteLayerPlaneWithDisposition } from './planeCommands'

function populatedEpisode() {
  const original = createBlankEpisode('episode-plane-delete')
  const withSecondPlane = createLayerPlane(original, 'content')
  const contentPlanes = withSecondPlane.layerPlanes.filter(
    ({ compositionGroup }) => compositionGroup === 'content',
  )
  const source = contentPlanes[0]
  const target = contentPlanes[1]

  if (!source || !target) throw new Error('Fixture needs two content planes.')

  const withElement = createSyntheticShapeElement(withSecondPlane, {
    layerPlaneId: source.id,
    name: 'Panel',
    shape: 'rectangle',
    fill: '#ffffff',
    bounds: { x: 10, y: 20, width: 100, height: 120 },
  })

  return { episode: withElement, source, target }
}

describe('deleteLayerPlaneWithDisposition', () => {
  it('moves elements to an explicit same-group destination before deletion', () => {
    const { episode, source, target } = populatedEpisode()
    const result = deleteLayerPlaneWithDisposition(episode, source.id, {
      kind: 'move-elements',
      targetLayerPlaneId: target.id,
    })

    expect(result.layerPlanes.some(({ id }) => id === source.id)).toBe(false)
    expect(result.elements).toHaveLength(1)
    expect(result.elements[0]?.layerPlaneId).toBe(target.id)
  })

  it('requires explicit destructive disposition and cleans group membership', () => {
    const { episode, source } = populatedEpisode()
    const elementId = episode.elements[0]?.id
    if (!elementId) throw new Error('Fixture needs an element.')
    const grouped = {
      ...episode,
      elementGroups: [
        { id: 'group-1', memberElementIds: [elementId, 'missing-for-test'] },
      ],
    }
    const result = deleteLayerPlaneWithDisposition(grouped, source.id, {
      kind: 'delete-elements',
    })

    expect(result.elements).toEqual([])
    expect(result.elementGroups).toEqual([])
  })

  it('refuses cross-group destinations, base deletion, last-plane deletion, and locked content', () => {
    const { episode, source } = populatedEpisode()
    const backgroundPlane = episode.layerPlanes.find(
      ({ compositionGroup }) => compositionGroup === 'background',
    )
    if (!backgroundPlane) throw new Error('Fixture needs a background plane.')

    expect(
      deleteLayerPlaneWithDisposition(episode, source.id, {
        kind: 'move-elements',
        targetLayerPlaneId: backgroundPlane.id,
      }),
    ).toBe(episode)
    expect(
      deleteLayerPlaneWithDisposition(episode, backgroundPlane.id, {
        kind: 'delete-elements',
      }),
    ).toBe(episode)

    const backgroundOrdinary = episode.layerPlanes.find(
      ({ compositionGroup, kind }) =>
        compositionGroup === 'background' && kind === 'ordinary',
    )
    if (!backgroundOrdinary) throw new Error('Fixture needs an ordinary Background plane.')
    const populatedBackground = createSyntheticShapeElement(episode, {
      layerPlaneId: backgroundOrdinary.id,
      name: 'Background accent',
      shape: 'rectangle',
      fill: '#ffffff',
      bounds: { x: 10, y: 20, width: 100, height: 120 },
    })
    expect(
      deleteLayerPlaneWithDisposition(populatedBackground, backgroundOrdinary.id, {
        kind: 'move-elements',
        targetLayerPlaneId: backgroundPlane.id,
      }),
    ).toBe(populatedBackground)

    const locked = {
      ...episode,
      elements: episode.elements.map((element) => ({
        ...element,
        locked: true,
      })),
    }
    expect(
      deleteLayerPlaneWithDisposition(locked, source.id, {
        kind: 'delete-elements',
      }),
    ).toBe(locked)
  })
})
