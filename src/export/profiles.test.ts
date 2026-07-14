import { describe, expect, it } from 'vitest'

import {
  WEBTOON_CANVAS_OBSERVED_PROFILE,
  getCandidateLogicalSliceBoundaries,
  type ExportProfile,
} from './profiles'

describe('WEBTOON_CANVAS_OBSERVED_PROFILE', () => {
  it('keeps the authenticated form observation provisional', () => {
    expect(WEBTOON_CANVAS_OBSERVED_PROFILE).toEqual({
      id: 'webtoon-canvas-2026-07-13-observed',
      verification: 'form-observed',
      outputWidthPx: 800,
      maxSliceHeightPx: 1280,
    })
  })
})

describe('getCandidateLogicalSliceBoundaries', () => {
  it('maps the current 800px profile directly onto an 800-unit episode', () => {
    expect(
      getCandidateLogicalSliceBoundaries(
        WEBTOON_CANVAS_OBSERVED_PROFILE,
        800,
        4600,
      ),
    ).toEqual([1280, 2560, 3840])
  })

  it('scales the logical interval when logical and output widths differ', () => {
    expect(
      getCandidateLogicalSliceBoundaries(
        WEBTOON_CANVAS_OBSERVED_PROFILE,
        1600,
        6000,
      ),
    ).toEqual([2560, 5120])

    expect(
      getCandidateLogicalSliceBoundaries(
        WEBTOON_CANVAS_OBSERVED_PROFILE,
        400,
        2000,
      ),
    ).toEqual([640, 1280, 1920])
  })

  it('uses only exact interior boundaries', () => {
    expect(
      getCandidateLogicalSliceBoundaries(
        WEBTOON_CANVAS_OBSERVED_PROFILE,
        800,
        1280,
      ),
    ).toEqual([])
    expect(
      getCandidateLogicalSliceBoundaries(
        WEBTOON_CANVAS_OBSERVED_PROFILE,
        800,
        2560,
      ),
    ).toEqual([1280])
    expect(
      getCandidateLogicalSliceBoundaries(
        WEBTOON_CANVAS_OBSERVED_PROFILE,
        800,
        2560.01,
      ),
    ).toEqual([1280, 2560])
  })

  it.each([
    ['zero', 0],
    ['negative', -1],
    ['NaN', Number.NaN],
    ['positive infinity', Number.POSITIVE_INFINITY],
    ['negative infinity', Number.NEGATIVE_INFINITY],
  ])('rejects a %s logical dimension', (_description, value) => {
    expect(
      getCandidateLogicalSliceBoundaries(
        WEBTOON_CANVAS_OBSERVED_PROFILE,
        value,
        4600,
      ),
    ).toEqual([])
    expect(
      getCandidateLogicalSliceBoundaries(
        WEBTOON_CANVAS_OBSERVED_PROFILE,
        800,
        value,
      ),
    ).toEqual([])
  })

  it.each([
    ['zero', 0],
    ['negative', -1],
    ['NaN', Number.NaN],
    ['positive infinity', Number.POSITIVE_INFINITY],
    ['negative infinity', Number.NEGATIVE_INFINITY],
  ])('rejects a profile with a %s output dimension', (_description, value) => {
    const invalidWidthProfile: ExportProfile = {
      ...WEBTOON_CANVAS_OBSERVED_PROFILE,
      outputWidthPx: value,
    }
    const invalidHeightProfile: ExportProfile = {
      ...WEBTOON_CANVAS_OBSERVED_PROFILE,
      maxSliceHeightPx: value,
    }

    expect(
      getCandidateLogicalSliceBoundaries(invalidWidthProfile, 800, 4600),
    ).toEqual([])
    expect(
      getCandidateLogicalSliceBoundaries(invalidHeightProfile, 800, 4600),
    ).toEqual([])
  })
})
