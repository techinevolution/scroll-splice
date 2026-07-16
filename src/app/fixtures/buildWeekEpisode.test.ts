import { describe, expect, it } from 'vitest'

import {
  COMPOSITION_GROUPS,
  EPISODE_FORMAT_VERSION,
  EPISODE_LOGICAL_WIDTH,
  compareElementsByCanvasPosition,
  compareElementsByRenderOrder,
  getBackgroundBaseLayerPlane,
  getElementCompositionGroup,
  getLayerPlaneById,
  getLayerPlanesForGroup,
} from '../../core/episode'
import {
  BUILD_WEEK_BEATS,
  BUILD_WEEK_LAYER_PLANE_IDS,
  buildWeekEpisode,
} from './buildWeekEpisode'

describe('buildWeekEpisode', () => {
  it('contains six original story beats made only from shapes and text', () => {
    expect(BUILD_WEEK_BEATS).toHaveLength(6)
    expect(buildWeekEpisode.elements).toHaveLength(30)
    expect(buildWeekEpisode.elements.filter(({ type }) => type === 'shape')).toHaveLength(
      18,
    )
    expect(buildWeekEpisode.elements.filter(({ type }) => type === 'text')).toHaveLength(
      12,
    )

    for (const beat of BUILD_WEEK_BEATS) {
      expect(
        buildWeekEpisode.elements.filter(({ id }) => id.startsWith(`${beat.id}-`)),
      ).toHaveLength(5)
    }
  })

  it('uses format v5 and assigns every element to a stable layer plane', () => {
    expect(EPISODE_FORMAT_VERSION).toBe(6)
    expect(buildWeekEpisode.formatVersion).toBe(6)
    expect(buildWeekEpisode.compositionGroupVisibility).toEqual({
      background: true,
      content: true,
      foreground: true,
    })
    expect(
      buildWeekEpisode.elements.filter(
        ({ layerPlaneId }) =>
          getLayerPlaneById(buildWeekEpisode, layerPlaneId)?.compositionGroup ===
          'background',
      ),
    ).toHaveLength(0)
    expect(
      buildWeekEpisode.elements.filter(
        ({ layerPlaneId }) =>
          getLayerPlaneById(buildWeekEpisode, layerPlaneId)?.compositionGroup ===
          'content',
      ),
    ).toHaveLength(18)
    expect(
      buildWeekEpisode.elements.filter(
        ({ layerPlaneId }) =>
          getLayerPlaneById(buildWeekEpisode, layerPlaneId)?.compositionGroup ===
          'foreground',
      ),
    ).toHaveLength(12)
    expect(
      buildWeekEpisode.elements.every(({ layerPlaneId }) =>
        Boolean(getLayerPlaneById(buildWeekEpisode, layerPlaneId)),
      ),
    ).toBe(true)
    expect(
      buildWeekEpisode.elements.every(
        ({ opacity, blendMode }) =>
          opacity >= 0 && opacity <= 1 && blendMode === 'normal',
      ),
    ).toBe(true)
    expect(
      buildWeekEpisode.elements
        .filter((element) => element.type === 'shape')
        .every(({ fill }) => fill.kind === 'solid'),
    ).toBe(true)
  })

  it('seeds a pinned full-episode base and ordinary planes in every group', () => {
    const baseLayerPlane = getBackgroundBaseLayerPlane(buildWeekEpisode)

    expect(buildWeekEpisode.layerPlanes).toHaveLength(5)
    expect(baseLayerPlane).toEqual({
      id: BUILD_WEEK_LAYER_PLANE_IDS.backgroundBase,
      kind: 'base',
      compositionGroup: 'background',
      order: 1,
      visible: true,
      baseColor: '#F3F0EA',
    })
    expect(getLayerPlanesForGroup(buildWeekEpisode, 'background')).toEqual([
      baseLayerPlane,
      expect.objectContaining({
        id: BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
        kind: 'ordinary',
        order: 2,
      }),
    ])
    expect(getLayerPlanesForGroup(buildWeekEpisode, 'content')).toHaveLength(2)
    expect(getLayerPlanesForGroup(buildWeekEpisode, 'foreground')).toHaveLength(
      1,
    )
    expect(
      buildWeekEpisode.elements.some(
        ({ layerPlaneId }) => layerPlaneId === baseLayerPlane?.id,
      ),
    ).toBe(false)
  })

  it('puts panels below text in Content and accents in Foreground', () => {
    expect(
      buildWeekEpisode.elements.filter(
        ({ layerPlaneId }) =>
          layerPlaneId === BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
      ),
    ).toHaveLength(6)
    expect(
      buildWeekEpisode.elements.filter(
        ({ layerPlaneId }) =>
          layerPlaneId === BUILD_WEEK_LAYER_PLANE_IDS.contentText,
      ),
    ).toHaveLength(12)
    expect(
      buildWeekEpisode.elements.filter(
        ({ layerPlaneId }) =>
          layerPlaneId === BUILD_WEEK_LAYER_PLANE_IDS.foregroundAccents,
      ),
    ).toHaveLength(12)
  })

  it('renders by fixed group, then plane, then local stacking order', () => {
    const orderedElements = [...buildWeekEpisode.elements].sort(
      (first, second) =>
        compareElementsByRenderOrder(buildWeekEpisode, first, second),
    )
    const orderedGroups = orderedElements.map((element) =>
      getElementCompositionGroup(buildWeekEpisode, element),
    )

    expect(orderedGroups).toEqual([
      ...Array(18).fill('content'),
      ...Array(12).fill('foreground'),
    ])

    for (const compositionGroup of COMPOSITION_GROUPS) {
      const groupElements = orderedElements.filter(
        (element) =>
          getElementCompositionGroup(buildWeekEpisode, element) ===
          compositionGroup,
      )
      const planeOrders = groupElements.map(
        ({ layerPlaneId }) =>
          getLayerPlaneById(buildWeekEpisode, layerPlaneId)?.order,
      )

      expect(planeOrders).toEqual(
        [...planeOrders].sort((first, second) =>
          (first ?? 0) - (second ?? 0),
        ),
      )

      for (const layerPlane of getLayerPlanesForGroup(
        buildWeekEpisode,
        compositionGroup,
      )) {
        const zIndices = groupElements
          .filter(({ layerPlaneId }) => layerPlaneId === layerPlane.id)
          .map(({ zIndex }) => zIndex)

        expect(zIndices).toEqual(
          [...zIndices].sort((first, second) => first - second),
        )
      }
    }
  })

  it('orders a plane from top to bottom with local stacking as the tie-break', () => {
    const orderedText = buildWeekEpisode.elements
      .filter(
        ({ layerPlaneId }) =>
          layerPlaneId === BUILD_WEEK_LAYER_PLANE_IDS.contentText,
      )
      .sort(compareElementsByCanvasPosition)

    expect(orderedText.slice(0, 3).map(({ id }) => id)).toEqual([
      'beat-01-stillness-title',
      'beat-01-stillness-caption',
      'beat-02-spark-title',
    ])

    const title = orderedText[0]
    if (!title) throw new Error('Missing text ordering fixture')

    const lowerStack = { ...title, id: 'lower-stack', zIndex: 1 }
    const higherStack = { ...title, id: 'higher-stack', zIndex: 2 }

    expect(
      [lowerStack, higherStack]
        .sort(compareElementsByCanvasPosition)
        .map(({ id }) => id),
    ).toEqual(['higher-stack', 'lower-stack'])
  })

  it('uses stable unique plane and element identities', () => {
    const layerPlaneIds = buildWeekEpisode.layerPlanes.map(({ id }) => id)
    const ids = buildWeekEpisode.elements.map(({ id }) => id)
    const names = buildWeekEpisode.elements.map(({ name }) => name)

    expect(new Set(layerPlaneIds).size).toBe(layerPlaneIds.length)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(names).size).toBe(names.length)
    expect(layerPlaneIds.every(Boolean)).toBe(true)
    expect(ids.every(Boolean)).toBe(true)
    expect(names.every(Boolean)).toBe(true)

    for (const compositionGroup of COMPOSITION_GROUPS) {
      const orders = getLayerPlanesForGroup(
        buildWeekEpisode,
        compositionGroup,
      ).map(({ order }) => order)

      expect(new Set(orders).size).toBe(orders.length)
      expect(orders).toEqual(
        [...orders].sort((first, second) => first - second),
      )
    }
  })

  it('keeps every element within the logical episode', () => {
    expect(buildWeekEpisode.logicalWidth).toBe(EPISODE_LOGICAL_WIDTH)
    expect(buildWeekEpisode.logicalHeight).toBeGreaterThan(4_000)

    for (const element of buildWeekEpisode.elements) {
      const { x, y, width, height } = element.bounds

      expect(x).toBeGreaterThanOrEqual(0)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(width).toBeGreaterThan(0)
      expect(height).toBeGreaterThan(0)
      expect(x + width).toBeLessThanOrEqual(buildWeekEpisode.logicalWidth)
      expect(y + height).toBeLessThanOrEqual(buildWeekEpisode.logicalHeight)
    }
  })

  it('is serializable and public-safe', () => {
    const serialized = JSON.stringify(buildWeekEpisode)
    const restored = JSON.parse(serialized) as unknown

    expect(restored).toEqual(buildWeekEpisode)
    expect(serialized).not.toMatch(/root\s*&\s*table/i)
    expect(
      buildWeekEpisode.elements.every(
        ({ assetReference }) => assetReference.kind === 'synthetic',
      ),
    ).toBe(true)
  })
})
