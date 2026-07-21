import {
  BACKGROUND_COLOR_REGION_GENERATOR_ID,
  MAX_EPISODE_NAME_LENGTH,
  MAX_TEXT_CONTENT_LENGTH,
  MAX_TEXT_FONT_SIZE,
  MIN_EPISODE_LOGICAL_HEIGHT,
} from '../core/commands'
import {
  getElementVisualBounds,
  isValidImageCrop,
  isValidImageMask,
  normalizeElementTransform,
} from '../core/elementGeometry'
import {
  APPEARANCE_EPISODE_FORMAT_VERSION,
  COMPOSITION_GROUPS,
  DEFAULT_IMAGE_FRAME,
  ELEMENT_BLEND_MODES,
  EPISODE_FORMAT_VERSION,
  EPISODE_LOGICAL_WIDTH,
  IDENTITY_ELEMENT_TRANSFORM,
  IMAGE_EPISODE_FORMAT_VERSION,
  LEGACY_EPISODE_FORMAT_VERSION,
  type AssetReference,
  type CompositionGroup,
  type CompositionGroupVisibility,
  type ElementBounds,
  type ElementBlendMode,
  type ElementGroup,
  type ElementOverflow,
  type ElementTransform,
  type EpisodeDocument,
  type EpisodeElement,
  type ImageCrop,
  type ImageFrame,
  type ImageFrameBorder,
  type ImageMask,
  type LayerPlane,
  type ShapeElement,
  type ShapeFill,
  type ShapeFillStop,
  type SpeechBalloonElement,
  type SpeechBalloonTail,
  type TextElement,
} from '../core/episode'
import { normalizeSpeechBalloonTail } from '../core/speechBalloonGeometry'
import {
  normalizeSpeechBalloonBodyControlPoints,
  parseSpeechBalloonPresetId,
} from '../core/speechBalloonPresets'

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
type SupportedEpisodeFormatVersion =
  | typeof LEGACY_EPISODE_FORMAT_VERSION
  | typeof IMAGE_EPISODE_FORMAT_VERSION
  | typeof APPEARANCE_EPISODE_FORMAT_VERSION
  | typeof EPISODE_FORMAT_VERSION

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

  if (
    value.formatVersion !== LEGACY_EPISODE_FORMAT_VERSION &&
    value.formatVersion !== IMAGE_EPISODE_FORMAT_VERSION &&
    value.formatVersion !== APPEARANCE_EPISODE_FORMAT_VERSION &&
    value.formatVersion !== EPISODE_FORMAT_VERSION
  ) {
    return typeof value.formatVersion === 'number'
      ? {
          ok: false,
          reason: 'unsupported-version',
          message: `Episode format ${value.formatVersion} is not supported by this build.`,
        }
      : corruptEpisode('The saved episode has no valid format version.')
  }

  const sourceFormatVersion = value.formatVersion

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

  const elements = value.elements.map((element) =>
    parseEpisodeElement(element, sourceFormatVersion),
  )

  if (elements.some((element) => element === undefined)) {
    return corruptEpisode('The saved episode contains an invalid element.')
  }

  const validElements = elements as EpisodeElement[]
  const elementIds = new Set(validElements.map(({ id: elementId }) => elementId))

  if (elementIds.size !== validElements.length) {
    return corruptEpisode('The saved episode contains duplicate element IDs.')
  }

  const elementGroups =
    sourceFormatVersion === EPISODE_FORMAT_VERSION
      ? parseElementGroups(value.elementGroups, elementIds)
      : []

  if (!elementGroups) {
    return corruptEpisode('The saved episode contains invalid element groups.')
  }

  for (const element of validElements) {
    const layerPlane = layerPlaneById.get(element.layerPlaneId)
    const visualBounds = getElementVisualBounds(element)

    if (
      !layerPlane ||
      layerPlane.kind !== 'ordinary' ||
      !visualBounds ||
      !isElementGeometryValid(
        visualBounds,
        element.overflow,
        logicalHeight,
      )
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
      elementGroups,
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

function parseEpisodeElement(
  value: unknown,
  sourceFormatVersion: SupportedEpisodeFormatVersion,
): EpisodeElement | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const id = readNonEmptyString(value.id)
  const name = readNonEmptyString(value.name)
  const layerPlaneId = readNonEmptyString(value.layerPlaneId)
  const bounds = parseElementBounds(value.bounds, sourceFormatVersion)
  const assetReference = parseAssetReference(
    value.assetReference,
    sourceFormatVersion,
  )
  const zIndex = value.zIndex
  const appearance =
    hasAppearanceFields(sourceFormatVersion)
      ? parseElementAppearance(value)
      : { opacity: 1, blendMode: 'normal' as const }
  const transform =
    sourceFormatVersion === EPISODE_FORMAT_VERSION
      ? parseElementTransform(value.transform)
      : IDENTITY_ELEMENT_TRANSFORM
  const overflow =
    sourceFormatVersion === EPISODE_FORMAT_VERSION
      ? parseElementOverflow(value.overflow)
      : 'constrained'

  if (
    !id ||
    !name ||
    !layerPlaneId ||
    !bounds ||
    !assetReference ||
    !appearance ||
    !transform ||
    !overflow ||
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
    ...appearance,
    transform,
    overflow,
    assetReference,
  }

  if (value.type === 'shape') {
    return parseShapeElement(value, common, sourceFormatVersion)
  }

  if (value.type === 'text') {
    return parseTextElement(value, common)
  }

  if (
    value.type === 'speech-balloon' &&
    sourceFormatVersion === EPISODE_FORMAT_VERSION
  ) {
    return parseSpeechBalloonElement(value, common)
  }

  if (
    value.type !== 'image' ||
    sourceFormatVersion === LEGACY_EPISODE_FORMAT_VERSION ||
    (assetReference.kind !== 'built-in' &&
      assetReference.kind !== 'imported')
  ) {
    return undefined
  }

  const presentation =
    hasAppearanceFields(sourceFormatVersion)
      ? value.presentation
      : 'single'
  const frame =
    sourceFormatVersion === EPISODE_FORMAT_VERSION
      ? parseImageFrame(value.frame, bounds)
      : DEFAULT_IMAGE_FRAME
  const validPresentation =
    presentation === 'single' ||
    presentation === 'tile' ||
    (sourceFormatVersion === EPISODE_FORMAT_VERSION &&
      presentation === 'cover')

  return validPresentation && frame
    ? { ...common, type: 'image', assetReference, presentation, frame }
    : undefined
}

function parseShapeElement(
  value: RecordValue,
  common: Omit<
    ShapeElement,
    | 'type'
    | 'shape'
    | 'fill'
    | 'stroke'
    | 'strokeWidth'
    | 'cornerRadius'
  >,
  sourceFormatVersion: SupportedEpisodeFormatVersion,
): ShapeElement | undefined {
  const fill =
    hasAppearanceFields(sourceFormatVersion)
      ? parseShapeFill(value.fill)
      : parseLegacySolidShapeFill(value.fill)
  const stroke = value.stroke
  const strokeWidth = value.strokeWidth
  const cornerRadius = value.cornerRadius
  const legacyOpacity =
    hasAppearanceFields(sourceFormatVersion)
      ? undefined
      : value.opacity

  if (
    (value.shape !== 'rectangle' && value.shape !== 'ellipse') ||
    !fill ||
    (fill.kind === 'vertical-gradient' &&
      (common.assetReference.kind !== 'synthetic' ||
        common.assetReference.generatorId !==
          BACKGROUND_COLOR_REGION_GENERATOR_ID)) ||
    (stroke !== undefined && typeof stroke !== 'string') ||
    (strokeWidth !== undefined && !isFiniteNonNegativeNumber(strokeWidth)) ||
    (cornerRadius !== undefined && !isFiniteNonNegativeNumber(cornerRadius)) ||
    (legacyOpacity !== undefined &&
      (!isFiniteNumber(legacyOpacity) ||
        legacyOpacity < 0 ||
        legacyOpacity > 1))
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
    ...(typeof legacyOpacity === 'number' ? { opacity: legacyOpacity } : {}),
  }
}

function parseElementAppearance(
  value: RecordValue,
): { readonly opacity: number; readonly blendMode: ElementBlendMode } | undefined {
  const opacity = value.opacity
  const blendMode = value.blendMode

  return isFiniteNumber(opacity) &&
    opacity >= 0 &&
    opacity <= 1 &&
    ELEMENT_BLEND_MODES.includes(blendMode as ElementBlendMode)
    ? { opacity, blendMode: blendMode as ElementBlendMode }
    : undefined
}

function parseLegacySolidShapeFill(value: unknown): ShapeFill | undefined {
  const color = readNonEmptyString(value)
  return color ? { kind: 'solid', color } : undefined
}

function parseShapeFill(value: unknown): ShapeFill | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  if (value.kind === 'solid') {
    const color = readNonEmptyString(value.color)
    return color ? { kind: 'solid', color } : undefined
  }

  if (value.kind !== 'vertical-gradient') {
    return undefined
  }

  const top = parseShapeFillStop(value.top)
  const bottom = parseShapeFillStop(value.bottom)

  return top && bottom
    ? { kind: 'vertical-gradient', top, bottom }
    : undefined
}

function parseShapeFillStop(value: unknown): ShapeFillStop | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const color = readNonEmptyString(value.color)
  const opacity = value.opacity

  return color &&
    isFiniteNumber(opacity) &&
    opacity >= 0 &&
    opacity <= 1
    ? { color, opacity }
    : undefined
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

function parseSpeechBalloonElement(
  value: RecordValue,
  common: Omit<
    SpeechBalloonElement,
    | 'type'
    | 'fill'
    | 'stroke'
    | 'strokeWidth'
    | 'cornerRadius'
    | 'text'
    | 'textFill'
    | 'fontFamily'
    | 'fontWeight'
    | 'lineHeight'
    | 'align'
    | 'padding'
    | 'minFontSize'
    | 'maxFontSize'
    | 'tail'
  >,
): SpeechBalloonElement | undefined {
  const fill = readNonEmptyString(value.fill)
  const stroke = readNonEmptyString(value.stroke)
  const textFill = readNonEmptyString(value.textFill)
  const fontFamily = readNonEmptyString(value.fontFamily)
  const tail = parseSpeechBalloonTail(value.tail)
  const bodyControlPoints =
    value.bodyControlPoints === undefined
      ? undefined
      : normalizeSpeechBalloonBodyControlPoints(value.bodyControlPoints)
  const bodyMinimum = Math.min(common.bounds.width, common.bounds.height)

  if (
    common.assetReference.kind !== 'synthetic' ||
    !parseSpeechBalloonPresetId(common.assetReference.generatorId) ||
    typeof value.text !== 'string' ||
    value.text.length > MAX_TEXT_CONTENT_LENGTH ||
    !fill ||
    !stroke ||
    !textFill ||
    !fontFamily ||
    !isFiniteNonNegativeNumber(value.strokeWidth) ||
    value.strokeWidth > 100 ||
    !isFiniteNonNegativeNumber(value.cornerRadius) ||
    value.cornerRadius > bodyMinimum / 2 ||
    (value.fontWeight !== 400 &&
      value.fontWeight !== 600 &&
      value.fontWeight !== 700) ||
    !isFiniteNumber(value.lineHeight) ||
    value.lineHeight < 0.8 ||
    value.lineHeight > 2.5 ||
    (value.align !== 'left' &&
      value.align !== 'center' &&
      value.align !== 'right') ||
    !isFiniteNonNegativeNumber(value.padding) ||
    value.padding * 2 >= bodyMinimum ||
    !isFiniteNumber(value.minFontSize) ||
    value.minFontSize < 8 ||
    value.minFontSize > MAX_TEXT_FONT_SIZE ||
    !isFiniteNumber(value.maxFontSize) ||
    value.maxFontSize < value.minFontSize ||
    value.maxFontSize > MAX_TEXT_FONT_SIZE ||
    !tail ||
    (value.bodyControlPoints !== undefined && !bodyControlPoints)
  ) {
    return undefined
  }

  return {
    ...common,
    type: 'speech-balloon',
    ...(bodyControlPoints ? { bodyControlPoints } : {}),
    fill,
    stroke,
    strokeWidth: value.strokeWidth,
    cornerRadius: value.cornerRadius,
    text: value.text.trim(),
    textFill,
    fontFamily,
    fontWeight: value.fontWeight,
    lineHeight: value.lineHeight,
    align: value.align,
    padding: value.padding,
    minFontSize: value.minFontSize,
    maxFontSize: value.maxFontSize,
    tail,
  }
}

function parseSpeechBalloonTail(value: unknown): SpeechBalloonTail | undefined {
  if (!isRecord(value) || !isRecord(value.tip)) return undefined

  const candidate: SpeechBalloonTail = {
    enabled: value.enabled as boolean,
    side: value.side as SpeechBalloonTail['side'],
    anchor: value.anchor as number,
    width: value.width as number,
    tip: { x: value.tip.x as number, y: value.tip.y as number },
  }
  const normalized = normalizeSpeechBalloonTail(candidate)

  return normalized &&
    normalized.enabled === value.enabled &&
    normalized.side === value.side &&
    normalized.anchor === value.anchor &&
    normalized.width === value.width &&
    normalized.tip.x === value.tip.x &&
    normalized.tip.y === value.tip.y
    ? normalized
    : undefined
}

function parseElementTransform(value: unknown): ElementTransform | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  if (
    !isFiniteNumber(value.rotationDegrees) ||
    typeof value.flipX !== 'boolean' ||
    typeof value.flipY !== 'boolean'
  ) {
    return undefined
  }

  const transform = normalizeElementTransform({
    rotationDegrees: value.rotationDegrees,
    flipX: value.flipX,
    flipY: value.flipY,
  })

  return transform?.rotationDegrees === value.rotationDegrees
    ? transform
    : undefined
}

function parseElementOverflow(value: unknown): ElementOverflow | undefined {
  return value === 'constrained' || value === 'bleed' ? value : undefined
}

function parseImageFrame(
  value: unknown,
  bounds: ElementBounds,
): ImageFrame | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const mask = parseImageMask(value.mask, bounds)
  const crop = parseImageCrop(value.crop)
  const border = parseImageFrameBorder(value.border)

  if (!mask || !crop || (value.border !== undefined && !border)) {
    return undefined
  }

  return {
    mask,
    crop,
    ...(border ? { border } : {}),
  }
}

function parseImageMask(
  value: unknown,
  bounds: ElementBounds,
): ImageMask | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  if (value.kind === 'rectangle') {
    const cornerRadius = value.cornerRadius

    return isFiniteNonNegativeNumber(cornerRadius) &&
      cornerRadius <= Math.min(bounds.width, bounds.height) / 2
      ? { kind: 'rectangle', cornerRadius }
      : undefined
  }

  if (value.kind !== 'polygon' || !Array.isArray(value.points)) {
    return undefined
  }

  const points = value.points.map((point) => {
    if (!isRecord(point) || !isFiniteNumber(point.x) || !isFiniteNumber(point.y)) {
      return undefined
    }

    return { x: point.x, y: point.y }
  })

  if (points.some((point) => point === undefined)) {
    return undefined
  }

  const mask: ImageMask = {
    kind: 'polygon',
    points: points as NonNullable<(typeof points)[number]>[],
  }

  return isValidImageMask(mask) ? mask : undefined
}

function parseImageCrop(value: unknown): ImageCrop | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const crop: ImageCrop = {
    focusX: value.focusX as number,
    focusY: value.focusY as number,
    zoom: value.zoom as number,
  }

  return isValidImageCrop(crop) ? crop : undefined
}

function parseImageFrameBorder(
  value: unknown,
): ImageFrameBorder | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const color = readNonEmptyString(value.color)

  return color && isFiniteNonNegativeNumber(value.width)
    ? { color, width: value.width }
    : undefined
}

function parseElementGroups(
  value: unknown,
  elementIds: ReadonlySet<string>,
): readonly ElementGroup[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const groups: ElementGroup[] = []
  const groupIds = new Set<string>()
  const groupedElementIds = new Set<string>()

  for (const candidate of value) {
    if (!isRecord(candidate)) {
      return undefined
    }

    const id = readNonEmptyString(candidate.id)
    const memberElementIds = candidate.memberElementIds

    if (
      !id ||
      groupIds.has(id) ||
      !Array.isArray(memberElementIds) ||
      memberElementIds.length < 2
    ) {
      return undefined
    }

    const members = memberElementIds.map(readNonEmptyString)
    const uniqueMembers = new Set(members)

    if (
      members.some((memberId) => memberId === undefined) ||
      uniqueMembers.size !== members.length ||
      members.some(
        (memberId) =>
          !elementIds.has(memberId as string) ||
          groupedElementIds.has(memberId as string),
      )
    ) {
      return undefined
    }

    const validMembers = members as string[]
    groupIds.add(id)
    validMembers.forEach((memberId) => groupedElementIds.add(memberId))
    groups.push({ id, memberElementIds: validMembers })
  }

  return groups
}

function isElementGeometryValid(
  visualBounds: ElementBounds,
  overflow: ElementOverflow,
  episodeLogicalHeight: number,
): boolean {
  const right = visualBounds.x + visualBounds.width
  const bottom = visualBounds.y + visualBounds.height

  return overflow === 'constrained'
    ? visualBounds.x >= -BOUNDS_TOLERANCE &&
        visualBounds.y >= -BOUNDS_TOLERANCE &&
        right <= EPISODE_LOGICAL_WIDTH + BOUNDS_TOLERANCE &&
        bottom <= episodeLogicalHeight + BOUNDS_TOLERANCE
    : right > 0 &&
        bottom > 0 &&
        visualBounds.x < EPISODE_LOGICAL_WIDTH &&
        visualBounds.y < episodeLogicalHeight
}

function hasAppearanceFields(
  sourceFormatVersion: SupportedEpisodeFormatVersion,
): boolean {
  return (
    sourceFormatVersion === APPEARANCE_EPISODE_FORMAT_VERSION ||
    sourceFormatVersion === EPISODE_FORMAT_VERSION
  )
}

function parseElementBounds(
  value: unknown,
  sourceFormatVersion: SupportedEpisodeFormatVersion,
): ElementBounds | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const { x, y, width, height } = value

  return isFiniteNumber(x) &&
    (sourceFormatVersion === EPISODE_FORMAT_VERSION || x >= 0) &&
    isFiniteNumber(y) &&
    (sourceFormatVersion === EPISODE_FORMAT_VERSION || y >= 0) &&
    isFiniteNumber(width) &&
    width > 0 &&
    isFiniteNumber(height) &&
    height > 0
    ? { x, y, width, height }
    : undefined
}

function parseAssetReference(
  value: unknown,
  sourceFormatVersion: SupportedEpisodeFormatVersion,
): AssetReference | undefined {
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

  if (
    value.kind === 'built-in' &&
    sourceFormatVersion !== LEGACY_EPISODE_FORMAT_VERSION
  ) {
    const assetId = readNonEmptyString(value.assetId)
    return assetId ? { kind: 'built-in', assetId } : undefined
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
