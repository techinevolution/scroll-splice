export type ExportProfileVerification =
  | 'form-observed'
  | 'upload-verified'

export interface ExportProfile {
  readonly id: string
  readonly verification: ExportProfileVerification
  readonly outputWidthPx: number
  readonly maxSliceHeightPx: number
  readonly maxSliceBytes: number
  readonly maxTotalBytes: number
  readonly maxFileCount: number
  readonly acceptedMediaTypes: readonly ExportMediaType[]
}

export type ExportMediaType = 'image/png' | 'image/jpeg'

export const WEBTOON_CANVAS_OBSERVED_PROFILE = {
  id: 'webtoon-canvas-2026-07-13-observed',
  verification: 'form-observed',
  outputWidthPx: 800,
  maxSliceHeightPx: 1280,
  // The form says 2 MB / 50 MB but does not state decimal vs binary units.
  // Use conservative decimal values until the harmless upload test verifies it.
  maxSliceBytes: 2_000_000,
  maxTotalBytes: 50_000_000,
  maxFileCount: 100,
  acceptedMediaTypes: ['image/png', 'image/jpeg'],
} as const satisfies ExportProfile

/**
 * Returns provisional interior slice boundaries in episode logical units.
 * The profile dimensions remain output data; the episode width supplies the
 * scale between logical units and output pixels.
 */
export function getCandidateLogicalSliceBoundaries(
  profile: ExportProfile,
  episodeLogicalWidth: number,
  episodeLogicalHeight: number,
): readonly number[] {
  if (
    !isPositiveFinite(profile.outputWidthPx) ||
    !isPositiveFinite(profile.maxSliceHeightPx) ||
    !isPositiveFinite(episodeLogicalWidth) ||
    !isPositiveFinite(episodeLogicalHeight)
  ) {
    return []
  }

  const logicalInterval =
    (profile.maxSliceHeightPx * episodeLogicalWidth) /
    profile.outputWidthPx

  if (!isPositiveFinite(logicalInterval)) {
    return []
  }

  const boundaries: number[] = []

  for (let index = 1; ; index += 1) {
    const boundary = logicalInterval * index

    if (!Number.isFinite(boundary) || boundary >= episodeLogicalHeight) {
      return boundaries
    }

    boundaries.push(boundary)
  }
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0
}
