import { describe, expect, it } from 'vitest'

import {
  BUILD_WEEK_LAYER_PLANE_IDS,
  buildWeekEpisode,
} from '../app/fixtures/buildWeekEpisode'
import {
  DEFAULT_EPISODE_HEIGHT_INCREMENT,
  createLayerPlane,
  deleteEmptyLayerPlane,
  extendEpisodeHeight,
  moveElement,
  setBaseColor,
  setCompositionGroupVisibility,
  setElementVisibility,
  setEpisodeName,
  setLayerPlaneVisibility,
} from './commands'
import {
  getBackgroundBaseLayerPlane,
  getEffectiveEpisodeBaseColor,
  getLayerPlanesForGroup,
  isElementEffectivelyVisible,
} from './episode'

describe('setEpisodeName', () => {
  it('stores a trimmed nonblank episode name', () => {
    const nextDocument = setEpisodeName(
      buildWeekEpisode,
      '  A Light Below  ',
    )

    expect(nextDocument).not.toBe(buildWeekEpisode)
    expect(nextDocument.name).toBe('A Light Below')
    expect(nextDocument.elements).toBe(buildWeekEpisode.elements)
    expect(nextDocument.layerPlanes).toBe(buildWeekEpisode.layerPlanes)
  })

  it('accepts an episode name at the 60-character limit', () => {
    const requestedName = 'a'.repeat(60)

    expect(setEpisodeName(buildWeekEpisode, requestedName).name).toBe(
      requestedName,
    )
  })

  it.each([
    { requestedName: '', description: 'blank' },
    { requestedName: '   ', description: 'whitespace-only' },
    {
      requestedName: 'a'.repeat(61),
      description: 'longer than 60 characters',
    },
  ])(
    'returns the original document for a $description name',
    ({ requestedName }) => {
      expect(setEpisodeName(buildWeekEpisode, requestedName)).toBe(
        buildWeekEpisode,
      )
    },
  )

  it('returns the original document when trimming produces the current name', () => {
    expect(
      setEpisodeName(buildWeekEpisode, `  ${buildWeekEpisode.name}  `),
    ).toBe(buildWeekEpisode)
  })
})

describe('extendEpisodeHeight', () => {
  it('uses a centralized 1280-unit default increment', () => {
    expect(DEFAULT_EPISODE_HEIGHT_INCREMENT).toBe(1280)

    const nextDocument = extendEpisodeHeight(
      buildWeekEpisode,
      DEFAULT_EPISODE_HEIGHT_INCREMENT,
    )

    expect(nextDocument).not.toBe(buildWeekEpisode)
    expect(nextDocument.logicalHeight).toBe(
      buildWeekEpisode.logicalHeight + DEFAULT_EPISODE_HEIGHT_INCREMENT,
    )
    expect(nextDocument.elements).toBe(buildWeekEpisode.elements)
    expect(nextDocument.layerPlanes).toBe(buildWeekEpisode.layerPlanes)
  })

  it('accepts any finite positive increment', () => {
    expect(extendEpisodeHeight(buildWeekEpisode, 12.5).logicalHeight).toBe(
      buildWeekEpisode.logicalHeight + 12.5,
    )
  })

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'returns the original document for invalid amount %s',
    (amount) => {
      expect(extendEpisodeHeight(buildWeekEpisode, amount)).toBe(
        buildWeekEpisode,
      )
    },
  )

  it('returns the original document if the resulting height is not finite', () => {
    const enormousDocument = {
      ...buildWeekEpisode,
      logicalHeight: Number.MAX_VALUE,
    }

    expect(extendEpisodeHeight(enormousDocument, Number.MAX_VALUE)).toBe(
      enormousDocument,
    )
  })
})

describe('moveElement', () => {
  const movableElement = buildWeekEpisode.elements.find(
    ({ id }) => id === 'beat-01-stillness-accent-2',
  )

  if (!movableElement) {
    throw new Error('The movement fixture element is missing.')
  }

  it('returns a new document with only the requested position changed', () => {
    const nextDocument = moveElement(buildWeekEpisode, movableElement.id, {
      x: 500,
      y: 600,
    })
    const movedElement = nextDocument.elements.find(
      ({ id }) => id === movableElement.id,
    )

    expect(nextDocument).not.toBe(buildWeekEpisode)
    expect(movedElement?.bounds).toEqual({
      ...movableElement.bounds,
      x: 500,
      y: 600,
    })
    expect(
      nextDocument.elements.find(
        ({ id }) => id === 'beat-01-stillness-caption',
      ),
    ).toBe(
      buildWeekEpisode.elements.find(
        ({ id }) => id === 'beat-01-stillness-caption',
      ),
    )
  })

  it('clamps the element inside the episode boundary', () => {
    const nextDocument = moveElement(buildWeekEpisode, movableElement.id, {
      x: 10_000,
      y: 10_000,
    })
    const movedElement = nextDocument.elements.find(
      ({ id }) => id === movableElement.id,
    )

    expect(movedElement?.bounds.x).toBe(
      buildWeekEpisode.logicalWidth - movableElement.bounds.width,
    )
    expect(movedElement?.bounds.y).toBe(
      buildWeekEpisode.logicalHeight - movableElement.bounds.height,
    )
  })

  it('returns the original document for an unknown element', () => {
    expect(moveElement(buildWeekEpisode, 'missing', { x: 0, y: 0 })).toBe(
      buildWeekEpisode,
    )
  })
})

describe('setElementVisibility', () => {
  const elementId = 'beat-01-stillness-caption'

  it('changes only the requested element eye state', () => {
    const originalElement = buildWeekEpisode.elements.find(
      ({ id }) => id === elementId,
    )
    const untouchedElement = buildWeekEpisode.elements.find(
      ({ id }) => id === 'beat-01-stillness-title',
    )
    const nextDocument = setElementVisibility(
      buildWeekEpisode,
      elementId,
      false,
    )
    const hiddenElement = nextDocument.elements.find(
      ({ id }) => id === elementId,
    )

    expect(nextDocument).not.toBe(buildWeekEpisode)
    expect(hiddenElement).toEqual({ ...originalElement, visible: false })
    expect(
      nextDocument.elements.find(
        ({ id }) => id === 'beat-01-stillness-title',
      ),
    ).toBe(untouchedElement)
  })

  it('returns the original document when no eye state changes', () => {
    expect(setElementVisibility(buildWeekEpisode, elementId, true)).toBe(
      buildWeekEpisode,
    )
    expect(setElementVisibility(buildWeekEpisode, 'missing', false)).toBe(
      buildWeekEpisode,
    )
  })
})

describe('setCompositionGroupVisibility', () => {
  it('changes only the group eye state and preserves individual settings', () => {
    const individuallyHidden = setElementVisibility(
      buildWeekEpisode,
      'beat-01-stillness-caption',
      false,
    )
    const groupHidden = setCompositionGroupVisibility(
      individuallyHidden,
      'content',
      false,
    )
    const caption = groupHidden.elements.find(
      ({ id }) => id === 'beat-01-stillness-caption',
    )
    const title = groupHidden.elements.find(
      ({ id }) => id === 'beat-01-stillness-title',
    )

    expect(groupHidden).not.toBe(individuallyHidden)
    expect(groupHidden.compositionGroupVisibility).toEqual({
      background: true,
      content: false,
      foreground: true,
    })
    expect(groupHidden.elements).toBe(individuallyHidden.elements)
    expect(caption?.visible).toBe(false)
    expect(title?.visible).toBe(true)
    expect(caption && isElementEffectivelyVisible(groupHidden, caption)).toBe(
      false,
    )
    expect(title && isElementEffectivelyVisible(groupHidden, title)).toBe(
      false,
    )

    const groupShown = setCompositionGroupVisibility(
      groupHidden,
      'content',
      true,
    )
    const restoredCaption = groupShown.elements.find(
      ({ id }) => id === 'beat-01-stillness-caption',
    )
    const restoredTitle = groupShown.elements.find(
      ({ id }) => id === 'beat-01-stillness-title',
    )

    expect(restoredCaption?.visible).toBe(false)
    expect(restoredTitle?.visible).toBe(true)
    expect(
      restoredCaption &&
        isElementEffectivelyVisible(groupShown, restoredCaption),
    ).toBe(false)
    expect(
      restoredTitle && isElementEffectivelyVisible(groupShown, restoredTitle),
    ).toBe(true)
  })

  it('returns the original document when the group eye state is unchanged', () => {
    expect(
      setCompositionGroupVisibility(buildWeekEpisode, 'content', true),
    ).toBe(buildWeekEpisode)
  })
})

describe('createLayerPlane', () => {
  it('appends a visible ordinary plane with a stable ID and order', () => {
    const nextDocument = createLayerPlane(buildWeekEpisode, 'content')
    const contentLayerPlanes = getLayerPlanesForGroup(nextDocument, 'content')

    expect(nextDocument).not.toBe(buildWeekEpisode)
    expect(nextDocument.elements).toBe(buildWeekEpisode.elements)
    expect(contentLayerPlanes).toEqual([
      ...getLayerPlanesForGroup(buildWeekEpisode, 'content'),
      {
        id: 'content-plane-3',
        kind: 'ordinary',
        compositionGroup: 'content',
        order: 3,
        visible: true,
      },
    ])

    const twiceCreated = createLayerPlane(nextDocument, 'content')
    expect(getLayerPlanesForGroup(twiceCreated, 'content').at(-1)).toEqual({
      id: 'content-plane-4',
      kind: 'ordinary',
      compositionGroup: 'content',
      order: 4,
      visible: true,
    })
  })

  it('keeps Background plane 1 pinned while appending a free plane', () => {
    const nextDocument = createLayerPlane(buildWeekEpisode, 'background')
    const backgroundLayerPlanes = getLayerPlanesForGroup(
      nextDocument,
      'background',
    )

    expect(backgroundLayerPlanes[0]).toBe(
      getBackgroundBaseLayerPlane(buildWeekEpisode),
    )
    expect(backgroundLayerPlanes.at(-1)).toEqual({
      id: 'background-plane-3',
      kind: 'ordinary',
      compositionGroup: 'background',
      order: 3,
      visible: true,
    })
  })
})

describe('deleteEmptyLayerPlane', () => {
  it('deletes an empty ordinary plane and preserves document contents', () => {
    const withEmptyPlane = createLayerPlane(buildWeekEpisode, 'content')
    const nextDocument = deleteEmptyLayerPlane(
      withEmptyPlane,
      'content-plane-3',
    )

    expect(nextDocument).not.toBe(withEmptyPlane)
    expect(nextDocument.elements).toBe(withEmptyPlane.elements)
    expect(nextDocument.layerPlanes.map(({ id }) => id)).toEqual(
      buildWeekEpisode.layerPlanes.map(({ id }) => id),
    )
    expect(getLayerPlanesForGroup(nextDocument, 'content')).toEqual(
      getLayerPlanesForGroup(buildWeekEpisode, 'content'),
    )
  })

  it('compacts orders within only the deleted plane group', () => {
    const withTwoEmptyPlanes = createLayerPlane(
      createLayerPlane(buildWeekEpisode, 'content'),
      'content',
    )
    const originalBackgroundPlanes = getLayerPlanesForGroup(
      withTwoEmptyPlanes,
      'background',
    )
    const nextDocument = deleteEmptyLayerPlane(
      withTwoEmptyPlanes,
      'content-plane-3',
    )

    expect(
      getLayerPlanesForGroup(nextDocument, 'content').map(({ id, order }) => ({
        id,
        order,
      })),
    ).toEqual([
      { id: BUILD_WEEK_LAYER_PLANE_IDS.contentPanels, order: 1 },
      { id: BUILD_WEEK_LAYER_PLANE_IDS.contentText, order: 2 },
      { id: 'content-plane-4', order: 3 },
    ])
    expect(
      nextDocument.layerPlanes.find(({ id }) => id === 'content-plane-4')?.id,
    ).toBe('content-plane-4')
    expect(getLayerPlanesForGroup(nextDocument, 'background')).toEqual(
      originalBackgroundPlanes,
    )
  })

  it('returns the original document for an unknown plane', () => {
    expect(deleteEmptyLayerPlane(buildWeekEpisode, 'missing')).toBe(
      buildWeekEpisode,
    )
  })

  it('protects pinned Background plane 1', () => {
    expect(
      deleteEmptyLayerPlane(
        buildWeekEpisode,
        BUILD_WEEK_LAYER_PLANE_IDS.backgroundBase,
      ),
    ).toBe(buildWeekEpisode)
  })

  it('treats a hidden element as content and refuses to delete its plane', () => {
    const withEmptyPlane = createLayerPlane(buildWeekEpisode, 'content')
    const sourceElement = buildWeekEpisode.elements[0]

    if (!sourceElement) {
      throw new Error('The hidden-element fixture source is missing.')
    }

    const hiddenElementDocument = {
      ...withEmptyPlane,
      elements: [
        ...withEmptyPlane.elements,
        {
          ...sourceElement,
          id: 'hidden-only-plane-element',
          layerPlaneId: 'content-plane-3',
          visible: false,
        },
      ],
    }

    expect(
      deleteEmptyLayerPlane(
        hiddenElementDocument,
        'content-plane-3',
      ),
    ).toBe(hiddenElementDocument)
  })

  it("refuses to delete a group's final plane even when it is empty", () => {
    const emptyForegroundDocument = {
      ...buildWeekEpisode,
      elements: buildWeekEpisode.elements.filter(
        ({ layerPlaneId }) =>
          layerPlaneId !== BUILD_WEEK_LAYER_PLANE_IDS.foregroundAccents,
      ),
    }

    expect(
      deleteEmptyLayerPlane(
        emptyForegroundDocument,
        BUILD_WEEK_LAYER_PLANE_IDS.foregroundAccents,
      ),
    ).toBe(emptyForegroundDocument)
  })
})

describe('setLayerPlaneVisibility', () => {
  it('changes only one plane and participates in effective visibility', () => {
    const title = buildWeekEpisode.elements.find(
      ({ id }) => id === 'beat-01-stillness-title',
    )
    const panel = buildWeekEpisode.elements.find(
      ({ id }) => id === 'beat-01-stillness-background',
    )
    const nextDocument = setLayerPlaneVisibility(
      buildWeekEpisode,
      BUILD_WEEK_LAYER_PLANE_IDS.contentText,
      false,
    )

    expect(nextDocument).not.toBe(buildWeekEpisode)
    expect(nextDocument.elements).toBe(buildWeekEpisode.elements)
    expect(
      getLayerPlanesForGroup(nextDocument, 'content').find(
        ({ id }) => id === BUILD_WEEK_LAYER_PLANE_IDS.contentText,
      )?.visible,
    ).toBe(false)
    expect(title && isElementEffectivelyVisible(nextDocument, title)).toBe(
      false,
    )
    expect(panel && isElementEffectivelyVisible(nextDocument, panel)).toBe(
      true,
    )
  })

  it('returns the original document when no plane eye state changes', () => {
    expect(
      setLayerPlaneVisibility(
        buildWeekEpisode,
        BUILD_WEEK_LAYER_PLANE_IDS.contentText,
        true,
      ),
    ).toBe(buildWeekEpisode)
    expect(
      setLayerPlaneVisibility(buildWeekEpisode, 'missing', false),
    ).toBe(buildWeekEpisode)
  })
})

describe('setBaseColor', () => {
  it('changes only the full-episode Background base color', () => {
    const nextDocument = setBaseColor(buildWeekEpisode, '#221133')
    const originalBase = getBackgroundBaseLayerPlane(buildWeekEpisode)
    const nextBase = getBackgroundBaseLayerPlane(nextDocument)

    expect(nextDocument).not.toBe(buildWeekEpisode)
    expect(nextDocument.elements).toBe(buildWeekEpisode.elements)
    expect(nextBase).toEqual({ ...originalBase, baseColor: '#221133' })
    expect(
      nextDocument.layerPlanes.find(
        ({ id }) => id === BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
      ),
    ).toBe(
      buildWeekEpisode.layerPlanes.find(
        ({ id }) => id === BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
      ),
    )
  })

  it('returns the original document when the color is unchanged', () => {
    expect(setBaseColor(buildWeekEpisode, '#F3F0EA')).toBe(buildWeekEpisode)
  })
})

describe('getEffectiveEpisodeBaseColor', () => {
  it('returns the initial visible base color', () => {
    expect(getEffectiveEpisodeBaseColor(buildWeekEpisode)).toBe('#F3F0EA')
  })

  it('returns the changed visible base color', () => {
    const nextDocument = setBaseColor(buildWeekEpisode, '#221133')

    expect(getEffectiveEpisodeBaseColor(nextDocument)).toBe('#221133')
  })

  it('returns undefined when either the base plane or its group is hidden', () => {
    const baseHidden = setLayerPlaneVisibility(
      buildWeekEpisode,
      BUILD_WEEK_LAYER_PLANE_IDS.backgroundBase,
      false,
    )
    const backgroundHidden = setCompositionGroupVisibility(
      buildWeekEpisode,
      'background',
      false,
    )

    expect(getEffectiveEpisodeBaseColor(baseHidden)).toBeUndefined()
    expect(getEffectiveEpisodeBaseColor(backgroundHidden)).toBeUndefined()
  })
})
