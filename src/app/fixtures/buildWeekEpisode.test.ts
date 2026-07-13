import { describe, expect, it } from 'vitest'

import {
  COMPOSITION_GROUPS,
  EPISODE_FORMAT_VERSION,
  EPISODE_LOGICAL_WIDTH,
  compareElementsByRenderOrder,
} from '../../core/episode'
import { BUILD_WEEK_BEATS, buildWeekEpisode } from './buildWeekEpisode'

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

  it('uses format v2 and assigns every element to a fixed composition group', () => {
    expect(EPISODE_FORMAT_VERSION).toBe(2)
    expect(buildWeekEpisode.formatVersion).toBe(2)
    expect(buildWeekEpisode.compositionGroupVisibility).toEqual({
      background: true,
      content: true,
      foreground: true,
    })
    expect(
      buildWeekEpisode.elements.filter(
        ({ compositionGroup }) => compositionGroup === 'background',
      ),
    ).toHaveLength(6)
    expect(
      buildWeekEpisode.elements.filter(
        ({ compositionGroup }) => compositionGroup === 'content',
      ),
    ).toHaveLength(12)
    expect(
      buildWeekEpisode.elements.filter(
        ({ compositionGroup }) => compositionGroup === 'foreground',
      ),
    ).toHaveLength(12)
    expect(
      buildWeekEpisode.elements.every(({ compositionGroup }) =>
        COMPOSITION_GROUPS.includes(compositionGroup),
      ),
    ).toBe(true)
  })

  it('renders all Background elements below Content and Foreground', () => {
    const orderedElements = [...buildWeekEpisode.elements].sort(
      compareElementsByRenderOrder,
    )
    const orderedGroups = orderedElements.map(
      ({ compositionGroup }) => compositionGroup,
    )

    expect(orderedGroups).toEqual([
      ...Array(6).fill('background'),
      ...Array(12).fill('content'),
      ...Array(12).fill('foreground'),
    ])

    for (const compositionGroup of COMPOSITION_GROUPS) {
      const zIndices = orderedElements
        .filter((element) => element.compositionGroup === compositionGroup)
        .map(({ zIndex }) => zIndex)

      expect(zIndices).toEqual(
        [...zIndices].sort((first, second) => first - second),
      )
    }
  })

  it('uses stable unique layer IDs, names, and stacking positions', () => {
    const ids = buildWeekEpisode.elements.map(({ id }) => id)
    const names = buildWeekEpisode.elements.map(({ name }) => name)
    const zIndices = buildWeekEpisode.elements.map(({ zIndex }) => zIndex)

    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(names).size).toBe(names.length)
    expect(new Set(zIndices).size).toBe(zIndices.length)
    expect(ids.every(Boolean)).toBe(true)
    expect(names.every(Boolean)).toBe(true)
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
