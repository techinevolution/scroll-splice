import { MAX_EPISODE_NAME_LENGTH, MIN_EPISODE_LOGICAL_HEIGHT } from '../core/commands'
import {
  COMPOSITION_GROUPS,
  EPISODE_FORMAT_VERSION,
  EPISODE_LOGICAL_WIDTH,
  type AssetReference,
  type CompositionGroup,
  type CompositionGroupVisibility,
  type ElementBounds,
  type EpisodeDocument,
  type EpisodeElement,
  type LayerPlane,
  type ShapeElement,
  type TextElement,
} from '../core/episode'

export const PROJECT_STORAGE_FORMAT_VERSION = 1 as const
export const PROJECT_STORAGE_KEY = 'scrollsplice.project.last.v1'

const BOUNDS_TOLERANCE = 0.000001

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export type SaveProjectResult =
  | { readonly ok: true; readonly savedAt: string }
  | {
      readonly ok: false
      readonly reason:
        | 'storage-unavailable'
        | 'invalid-document'
        | 'unsupported-version'
        | 'serialization-failed'
        | 'write-failed'
      readonly message: string
    }

export type LoadProjectResult =
  | {
      readonly ok: true
      readonly episode: EpisodeDocument
      readonly savedAt: string
    }
  | {
      readonly ok: false
      readonly reason:
        | 'storage-unavailable'
        | 'not-found'
        | 'read-failed'
        | 'corrupt'
        | 'unsupported-version'
      readonly message: string
    }

export interface ProjectRepository {
  save(episode: EpisodeDocument): SaveProjectResult
  loadLast(): LoadProjectResult
}

export type EpisodeDocumentParseResult =
  | { readonly ok: true; readonly episode: EpisodeDocument }
  | {
      readonly ok: false
      readonly reason: 'corrupt' | 'unsupported-version'
      readonly message: string
    }

interface StoredProjectEnvelopeV1 {
  readonly storageFormatVersion: typeof PROJECT_STORAGE_FORMAT_VERSION
  readonly savedAt: string
  readonly episode: EpisodeDocument
}

type RecordValue = Readonly<Record<string, unknown>>

/**
 * Reads browser storage only when called, so importing this module is safe in
 * tests and other non-browser runtimes. Browsers may deny the property access.
 */
export function getBrowserLocalStorage(): StorageLike | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

export function createLocalStorageProjectRepository(
  storage: StorageLike | undefined,
  now: () => Date = () => new Date(),
): ProjectRepository {
  return {
    save(episode) {
      if (!storage) {
        return failure(
          'storage-unavailable',
          'Local project storage is unavailable in this browser.',
        )
      }

      const parsedEpisode = parseEpisodeDocument(episode)

      if (!parsedEpisode.ok) {
        return failure(
          parsedEpisode.reason === 'unsupported-version'
            ? 'unsupported-version'
            : 'invalid-document',
          parsedEpisode.message,
        )
      }

      let serialized: string
      let savedAt: string

      try {
        savedAt = now().toISOString()
        const envelope: StoredProjectEnvelopeV1 = {
          storageFormatVersion: PROJECT_STORAGE_FORMAT_VERSION,
          savedAt,
          episode: parsedEpisode.episode,
        }
        serialized = JSON.stringify(envelope)
      } catch {
        return failure(
          'serialization-failed',
          'The episode could not be prepared for local saving.',
        )
      }

      try {
        storage.setItem(PROJECT_STORAGE_KEY, serialized)
      } catch {
        return failure(
          'write-failed',
          'The browser could not write the episode to local storage.',
        )
      }

      return { ok: true, savedAt }
    },

    loadLast() {
      if (!storage) {
        return failure(
          'storage-unavailable',
          'Local project storage is unavailable in this browser.',
        )
      }

      let serialized: string | null

      try {
        serialized = storage.getItem(PROJECT_STORAGE_KEY)
      } catch {
        return failure(
          'read-failed',
          'The browser could not read the saved episode.',
        )
      }

      if (serialized === null) {
        return failure('not-found', 'No locally saved episode was found.')
      }

      let value: unknown

      try {
        value = JSON.parse(serialized) as unknown
      } catch {
        return failure(
          'corrupt',
          'The locally saved episode is not valid JSON.',
        )
      }

      return parseStoredEnvelope(value)
    },
  }
}

export function parseEpisodeDocument(
  value: unknown,
): EpisodeDocumentParseResult {
  if (!isRecord(value)) {
    return corruptEpisode('The saved episode is not an object.')
  }

  if (value.formatVersion !== EPISODE_FORMAT_VERSION) {
    return typeof value.formatVersion === 'number'
      ? {
          ok: false,
          reason: 'unsupported-version',
          message: `Episode format ${value.formatVersion} is not supported by this build.`,
        }
      : corruptEpisode('The saved episode has no valid format version.')
  }

  const id = readNonEmptyString(value.id)
  const name = readNonEmptyString(value.name)
  const logicalHeight = value.logicalHeight
  const compositionGroupVisibility = parseCompositionGroupVisibility(
    value.compositionGroupVisibility,
  )

  if (
    !id ||
    !name ||
    name.length > MAX_EPISODE_NAME_LENGTH ||
    value.logicalWidth !== EPISODE_LOGICAL_WIDTH ||
    !isFiniteNumber(logicalHeight) ||
    logicalHeight < MIN_EPISODE_LOGICAL_HEIGHT ||
    !compositionGroupVisibility ||
    !Array.isArray(value.layerPlanes) ||
    !Array.isArray(value.elements)
  ) {
    return corruptEpisode('The saved episode header is invalid.')
  }

  const layerPlanes = value.layerPlanes.map(parseLayerPlane)

  if (layerPlanes.some((layerPlane) => layerPlane === undefined)) {
    return corruptEpisode('The saved episode contains an invalid layer plane.')
  }

  const validLayerPlanes = layerPlanes as LayerPlane[]
  const layerPlaneById = new Map(
    validLayerPlanes.map((layerPlane) => [layerPlane.id, layerPlane]),
  )

  if (
    layerPlaneById.size !== validLayerPlanes.length ||
    !hasValidPlaneStructure(validLayerPlanes)
  ) {
    return corruptEpisode(
      'The saved episode layer planes have duplicate IDs or invalid ordering.',
    )
  }

  const elements = value.elements.map(parseEpisodeElement)

  if (elements.some((element) => element === undefined)) {
    return corruptEpisode('The saved episode contains an invalid element.')
  }

  const validElements = elements as EpisodeElement[]
  const elementIds = new Set(validElements.map(({ id: elementId }) => elementId))

  if (elementIds.size !== validElements.length) {
    return corruptEpisode('The saved episode contains duplicate element IDs.')
  }

  for (const element of validElements) {
    const layerPlane = layerPlaneById.get(element.layerPlaneId)
    const { x, y, width, height } = element.bounds

    if (
      !layerPlane ||
      layerPlane.kind !== 'ordinary' ||
      x + width > EPISODE_LOGICAL_WIDTH + BOUNDS_TOLERANCE ||
      y + height > logicalHeight + BOUNDS_TOLERANCE
    ) {
      return corruptEpisode(
        'The saved episode contains an out-of-bounds or unassigned element.',
      )
    }
  }

  return {
    ok: true,
    episode: {
      id,
      formatVersion: EPISODE_FORMAT_VERSION,
      name,
      logicalWidth: EPISODE_LOGICAL_WIDTH,
      logicalHeight,
      compositionGroupVisibility,
      layerPlanes: validLayerPlanes,
      elements: validElements,
    },
  }
}

function parseStoredEnvelope(value: unknown): LoadProjectResult {
  if (!isRecord(value)) {
    return failure('corrupt', 'The saved project record is not an object.')
  }

  if (value.storageFormatVersion !== PROJECT_STORAGE_FORMAT_VERSION) {
    return typeof value.storageFormatVersion === 'number'
      ? failure(
          'unsupported-version',
          `Project storage format ${value.storageFormatVersion} is not supported by this build.`,
        )
      : failure('corrupt', 'The saved project has no storage format version.')
  }

  const savedAt = value.savedAt

  if (
    typeof savedAt !== 'string' ||
    savedAt.length === 0 ||
    !Number.isFinite(Date.parse(savedAt))
  ) {
    return failure('corrupt', 'The saved project timestamp is invalid.')
  }

  const parsedEpisode = parseEpisodeDocument(value.episode)

  return parsedEpisode.ok
    ? { ok: true, episode: parsedEpisode.episode, savedAt }
    : failure(
        parsedEpisode.reason,
        parsedEpisode.message,
      )
}

function parseCompositionGroupVisibility(
  value: unknown,
): CompositionGroupVisibility | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  if (
    typeof value.background !== 'boolean' ||
    typeof value.content !== 'boolean' ||
    typeof value.foreground !== 'boolean'
  ) {
    return undefined
  }

  return {
    background: value.background,
    content: value.content,
    foreground: value.foreground,
  }
}

function parseLayerPlane(value: unknown): LayerPlane | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const id = readNonEmptyString(value.id)
  const compositionGroup = parseCompositionGroup(value.compositionGroup)
  const order = value.order
  const visible = value.visible
  const name = value.name

  if (
    !id ||
    !compositionGroup ||
    !Number.isInteger(order) ||
    (order as number) < 1 ||
    typeof visible !== 'boolean' ||
    (name !== undefined && !readNonEmptyString(name))
  ) {
    return undefined
  }

  const common = {
    id,
    compositionGroup,
    order: order as number,
    visible,
    ...(typeof name === 'string' ? { name } : {}),
  }

  if (value.kind === 'ordinary') {
    return { ...common, kind: 'ordinary' }
  }

  const baseColor = readNonEmptyString(value.baseColor)

  if (
    value.kind !== 'base' ||
    compositionGroup !== 'background' ||
    !baseColor
  ) {
    return undefined
  }

  return {
    ...common,
    compositionGroup: 'background',
    kind: 'base',
    baseColor,
  }
}

function hasValidPlaneStructure(layerPlanes: readonly LayerPlane[]): boolean {
  const basePlanes = layerPlanes.filter(({ kind }) => kind === 'base')

  if (
    basePlanes.length !== 1 ||
    basePlanes[0]?.compositionGroup !== 'background' ||
    basePlanes[0].order !== 1
  ) {
    return false
  }

  return COMPOSITION_GROUPS.every((compositionGroup) => {
    const orders = layerPlanes
      .filter((layerPlane) => layerPlane.compositionGroup === compositionGroup)
      .map(({ order }) => order)
      .sort((first, second) => first - second)

    return (
      orders.length > 0 &&
      orders.every((order, index) => order === index + 1)
    )
  })
}

function parseEpisodeElement(value: unknown): EpisodeElement | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const id = readNonEmptyString(value.id)
  const name = readNonEmptyString(value.name)
  const layerPlaneId = readNonEmptyString(value.layerPlaneId)
  const bounds = parseElementBounds(value.bounds)
  const assetReference = parseAssetReference(value.assetReference)
  const zIndex = value.zIndex

  if (
    !id ||
    !name ||
    !layerPlaneId ||
    !bounds ||
    !assetReference ||
    typeof value.visible !== 'boolean' ||
    typeof value.locked !== 'boolean' ||
    !Number.isInteger(zIndex) ||
    (zIndex as number) < 0
  ) {
    return undefined
  }

  const common = {
    id,
    name,
    layerPlaneId,
    bounds,
    visible: value.visible,
    locked: value.locked,
    zIndex: zIndex as number,
    assetReference,
  }

  if (value.type === 'shape') {
    return parseShapeElement(value, common)
  }

  return value.type === 'text' ? parseTextElement(value, common) : undefined
}

function parseShapeElement(
  value: RecordValue,
  common: Omit<ShapeElement, 'type' | 'shape' | 'fill'>,
): ShapeElement | undefined {
  const fill = readNonEmptyString(value.fill)
  const stroke = value.stroke
  const strokeWidth = value.strokeWidth
  const cornerRadius = value.cornerRadius
  const opacity = value.opacity

  if (
    (value.shape !== 'rectangle' && value.shape !== 'ellipse') ||
    !fill ||
    (stroke !== undefined && typeof stroke !== 'string') ||
    (strokeWidth !== undefined && !isFiniteNonNegativeNumber(strokeWidth)) ||
    (cornerRadius !== undefined && !isFiniteNonNegativeNumber(cornerRadius)) ||
    (opacity !== undefined &&
      (!isFiniteNumber(opacity) || opacity < 0 || opacity > 1))
  ) {
    return undefined
  }

  return {
    ...common,
    type: 'shape',
    shape: value.shape,
    fill,
    ...(typeof stroke === 'string' ? { stroke } : {}),
    ...(typeof strokeWidth === 'number' ? { strokeWidth } : {}),
    ...(typeof cornerRadius === 'number' ? { cornerRadius } : {}),
    ...(typeof opacity === 'number' ? { opacity } : {}),
  }
}

function parseTextElement(
  value: RecordValue,
  common: Omit<
    TextElement,
    | 'type'
    | 'text'
    | 'fill'
    | 'fontFamily'
    | 'fontSize'
    | 'fontWeight'
    | 'lineHeight'
    | 'align'
  >,
): TextElement | undefined {
  const fill = readNonEmptyString(value.fill)
  const fontFamily = readNonEmptyString(value.fontFamily)
  const fontSize = value.fontSize
  const lineHeight = value.lineHeight

  if (
    typeof value.text !== 'string' ||
    !fill ||
    !fontFamily ||
    !isFiniteNumber(fontSize) ||
    fontSize <= 0 ||
    (value.fontWeight !== 400 &&
      value.fontWeight !== 600 &&
      value.fontWeight !== 700) ||
    !isFiniteNumber(lineHeight) ||
    lineHeight <= 0 ||
    (value.align !== 'left' &&
      value.align !== 'center' &&
      value.align !== 'right')
  ) {
    return undefined
  }

  return {
    ...common,
    type: 'text',
    text: value.text,
    fill,
    fontFamily,
    fontSize,
    fontWeight: value.fontWeight,
    lineHeight,
    align: value.align,
  }
}

function parseElementBounds(value: unknown): ElementBounds | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const { x, y, width, height } = value

  return isFiniteNumber(x) &&
    x >= 0 &&
    isFiniteNumber(y) &&
    y >= 0 &&
    isFiniteNumber(width) &&
    width > 0 &&
    isFiniteNumber(height) &&
    height > 0
    ? { x, y, width, height }
    : undefined
}

function parseAssetReference(value: unknown): AssetReference | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  if (value.kind === 'synthetic') {
    const generatorId = readNonEmptyString(value.generatorId)
    return generatorId ? { kind: 'synthetic', generatorId } : undefined
  }

  if (value.kind === 'imported') {
    const assetId = readNonEmptyString(value.assetId)
    return assetId ? { kind: 'imported', assetId } : undefined
  }

  return undefined
}

function parseCompositionGroup(value: unknown): CompositionGroup | undefined {
  return value === 'background' || value === 'content' || value === 'foreground'
    ? value
    : undefined
}

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : undefined
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0
}

function corruptEpisode(message: string): EpisodeDocumentParseResult {
  return { ok: false, reason: 'corrupt', message }
}

function failure<Reason extends string>(
  reason: Reason,
  message: string,
): { readonly ok: false; readonly reason: Reason; readonly message: string } {
  return { ok: false, reason, message }
}
