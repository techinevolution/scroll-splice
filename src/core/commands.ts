import {
  clamp,
  clampElementPosition,
  type LogicalPosition,
} from './coordinates'
import {
  clampEpisodeElementGeometry,
  isValidImageCrop,
  isValidImageMask,
  normalizeElementTransform,
} from './elementGeometry'
import {
  DEFAULT_ELEMENT_OVERFLOW,
  DEFAULT_IMAGE_FRAME,
  ELEMENT_BLEND_MODES,
  IDENTITY_ELEMENT_TRANSFORM,
  getBackgroundBaseLayerPlane,
  getLayerPlaneById,
  getLayerPlanesForGroup,
  type CompositionGroup,
  type ElementBounds,
  type ElementBlendMode,
  type ElementOverflow,
  type ElementTransform,
  type EpisodeDocument,
  type EpisodeElement,
  type ImageAssetReference,
  type ImageCrop,
  type ImageElement,
  type ImageFrame,
  type NormalizedPoint,
  type OrdinaryLayerPlane,
  type ShapeFill,
  type ShapeFillStop,
  type ShapeElement,
  type SpeechBalloonElement,
  type SpeechBalloonTail,
  type TextElement,
} from './episode'
import {
  DEFAULT_SPEECH_BALLOON_TAIL,
  normalizeSpeechBalloonTail,
} from './speechBalloonGeometry'
import {
  getSpeechBalloonGeneratorId,
  getSpeechBalloonPreset,
  getSpeechBalloonPresetId,
  normalizeSpeechBalloonBodyControlPoints,
  type SpeechBalloonPresetId,
} from './speechBalloonPresets'

export { SPEECH_BALLOON_GENERATOR_ID } from './speechBalloonPresets'

export const DEFAULT_EPISODE_HEIGHT_INCREMENT = 1280
export const MIN_EPISODE_LOGICAL_HEIGHT = 1280
export const MIN_ELEMENT_SIZE = 24
export const MAX_EPISODE_NAME_LENGTH = 60
export const MAX_LAYER_PLANE_NAME_LENGTH = 32
export const MAX_ELEMENT_NAME_LENGTH = 80
export const MAX_TEXT_CONTENT_LENGTH = 2000
export const MAX_TEXT_FONT_SIZE = 200
export const SYNTHETIC_SHAPE_GENERATOR_ID =
  'scrollsplice-editor-shape-v1'
export const BACKGROUND_COLOR_REGION_GENERATOR_ID =
  'scrollsplice-background-color-region-v1'
export const TEXT_ELEMENT_GENERATOR_ID = 'scrollsplice-editor-text-v1'
const MIN_TEXT_FONT_SIZE = 8

export interface CreateSyntheticShapeElementInput {
  readonly layerPlaneId: string
  readonly name: string
  readonly shape?: ShapeElement['shape']
  readonly fill: string
  readonly stroke?: string
  readonly strokeWidth?: number
  readonly cornerRadius?: number
  readonly bounds: ElementBounds
}

export type HorizontalElementAlignment = 'left' | 'center' | 'right'
export type VerticalElementAlignment = 'top' | 'middle' | 'bottom'

export interface ElementAlignment {
  readonly horizontal?: HorizontalElementAlignment
  readonly vertical?: VerticalElementAlignment
}

export interface CreateBackgroundColorRegionInput {
  readonly layerPlaneId: string
  readonly fill: string
  readonly startY: number
  readonly height: number
}

export interface CreateImageElementInput {
  readonly layerPlaneId: string
  readonly name: string
  readonly assetReference: ImageAssetReference
  readonly bounds: ElementBounds
}

export interface CreateTextElementInput {
  readonly layerPlaneId: string
  readonly text: string
  readonly fill: string
  readonly bounds: ElementBounds
  readonly fontSize?: number
  readonly fontWeight?: TextElement['fontWeight']
  readonly align?: TextElement['align']
}

export interface UpdateTextElementInput {
  readonly text: string
  readonly fill: string
  readonly fontSize: number
  readonly fontWeight: TextElement['fontWeight']
  readonly align: TextElement['align']
}

export interface CreateSpeechBalloonElementInput {
  readonly layerPlaneId: string
  readonly bounds: ElementBounds
  readonly text?: string
  readonly presetId?: SpeechBalloonPresetId
}

export interface UpdateSpeechBalloonElementInput {
  readonly presetId?: SpeechBalloonPresetId
  readonly bodyControlPoints?: readonly NormalizedPoint[]
  readonly text: string
  readonly fill: string
  readonly stroke: string
  readonly strokeWidth: number
  readonly cornerRadius: number
  readonly textFill: string
  readonly fontFamily: string
  readonly fontWeight: SpeechBalloonElement['fontWeight']
  readonly lineHeight: number
  readonly align: SpeechBalloonElement['align']
  readonly padding: number
  readonly minFontSize: number
  readonly maxFontSize: number
  readonly tail: SpeechBalloonTail
}

export interface UpdateShapeElementStyleInput {
  readonly shape: ShapeElement['shape']
  readonly stroke: string | null
  readonly strokeWidth: number
  readonly cornerRadius: number
}

export function setEpisodeName(
  document: EpisodeDocument,
  requestedName: string,
): EpisodeDocument {
  const name = requestedName.trim()

  if (
    name.length === 0 ||
    name.length > MAX_EPISODE_NAME_LENGTH ||
    name === document.name
  ) {
    return document
  }

  return { ...document, name }
}

export function setElementName(
  document: EpisodeDocument,
  elementId: string,
  requestedName: string,
): EpisodeDocument {
  const name = requestedName.trim()

  if (name.length === 0 || name.length > MAX_ELEMENT_NAME_LENGTH) {
    return document
  }

  return replaceElement(document, elementId, (element) =>
    element.name === name ? element : { ...element, name },
  )
}

export function setElementLocked(
  document: EpisodeDocument,
  elementId: string,
  locked: boolean,
): EpisodeDocument {
  return replaceElement(document, elementId, (element) =>
    element.locked === locked ? element : { ...element, locked },
  )
}

export function toggleElementLocked(
  document: EpisodeDocument,
  elementId: string,
): EpisodeDocument {
  return replaceElement(document, elementId, (element) => ({
    ...element,
    locked: !element.locked,
  }))
}

export function setElementTransform(
  document: EpisodeDocument,
  elementId: string,
  requestedTransform: ElementTransform,
): EpisodeDocument {
  const transform = normalizeElementTransform(requestedTransform)

  if (!transform) {
    return document
  }

  return replaceElement(document, elementId, (element) => {
    if (element.locked) {
      return element
    }

    const bounds = clampEpisodeElementGeometry(
      element,
      element.bounds,
      transform,
      element.overflow,
      { width: document.logicalWidth, height: document.logicalHeight },
    )

    if (!bounds) {
      return element
    }

    return areElementTransformsEqual(element.transform, transform) &&
      areElementBoundsEqual(element.bounds, bounds)
      ? element
      : { ...element, bounds, transform }
  })
}

export function setElementOverflow(
  document: EpisodeDocument,
  elementId: string,
  overflow: ElementOverflow,
): EpisodeDocument {
  if (overflow !== 'constrained' && overflow !== 'bleed') {
    return document
  }

  return replaceElement(document, elementId, (element) => {
    if (element.locked) {
      return element
    }

    const bounds = clampEpisodeElementGeometry(
      element,
      element.bounds,
      element.transform,
      overflow,
      { width: document.logicalWidth, height: document.logicalHeight },
    )

    if (!bounds) {
      return element
    }

    return element.overflow === overflow &&
      areElementBoundsEqual(element.bounds, bounds)
      ? element
      : { ...element, bounds, overflow }
  })
}

export function extendEpisodeHeight(
  document: EpisodeDocument,
  amount: number,
): EpisodeDocument {
  if (!Number.isFinite(amount) || amount <= 0) {
    return document
  }

  const logicalHeight = document.logicalHeight + amount

  if (
    !Number.isFinite(logicalHeight) ||
    logicalHeight <= document.logicalHeight
  ) {
    return document
  }

  return resizeEpisodeHeight(document, logicalHeight)
}

export function resizeEpisodeHeight(
  document: EpisodeDocument,
  requestedHeight: number,
): EpisodeDocument {
  if (!Number.isFinite(requestedHeight) || requestedHeight <= 0) {
    return document
  }

  const contentBottom = getEpisodeContentBottom(document)

  if (!Number.isFinite(contentBottom)) {
    return document
  }

  const logicalHeight = Math.max(
    requestedHeight,
    contentBottom,
    MIN_EPISODE_LOGICAL_HEIGHT,
  )

  return logicalHeight === document.logicalHeight
    ? document
    : { ...document, logicalHeight }
}

export function getEpisodeContentBottom(
  document: EpisodeDocument,
): number {
  return document.elements.reduce((lowestBottom, element) => {
    const elementBottom = element.bounds.y + element.bounds.height

    return Number.isFinite(elementBottom)
      ? Math.max(lowestBottom, elementBottom)
      : Number.POSITIVE_INFINITY
  }, 0)
}

export function moveElement(
  document: EpisodeDocument,
  elementId: string,
  requestedPosition: LogicalPosition,
): EpisodeDocument {
  let changed = false

  const elements = document.elements.map((element) => {
    if (element.id !== elementId || element.locked) {
      return element
    }

    const bounds = clampEpisodeElementGeometry(
      element,
      { ...element.bounds, ...requestedPosition },
      element.transform,
      element.overflow,
      { width: document.logicalWidth, height: document.logicalHeight },
    )

    if (
      !bounds ||
      (bounds.x === element.bounds.x && bounds.y === element.bounds.y)
    ) {
      return element
    }

    changed = true

    return {
      ...element,
      bounds,
    }
  })

  return changed ? { ...document, elements } : document
}

export function nudgeElement(
  document: EpisodeDocument,
  elementId: string,
  delta: LogicalPosition,
): EpisodeDocument {
  const element = document.elements.find(({ id }) => id === elementId)

  if (!element || !Number.isFinite(delta.x) || !Number.isFinite(delta.y)) {
    return document
  }

  return moveElement(document, elementId, {
    x: element.bounds.x + delta.x,
    y: element.bounds.y + delta.y,
  })
}

export function alignElement(
  document: EpisodeDocument,
  elementId: string,
  alignment: ElementAlignment,
): EpisodeDocument {
  const element = document.elements.find(({ id }) => id === elementId)
  const { horizontal, vertical } = alignment

  if (
    !element ||
    (horizontal === undefined && vertical === undefined) ||
    (horizontal !== undefined &&
      horizontal !== 'left' &&
      horizontal !== 'center' &&
      horizontal !== 'right') ||
    (vertical !== undefined &&
      vertical !== 'top' &&
      vertical !== 'middle' &&
      vertical !== 'bottom')
  ) {
    return document
  }

  const x =
    horizontal === 'left'
      ? 0
      : horizontal === 'center'
        ? (document.logicalWidth - element.bounds.width) / 2
        : horizontal === 'right'
          ? document.logicalWidth - element.bounds.width
          : element.bounds.x
  const y =
    vertical === 'top'
      ? 0
      : vertical === 'middle'
        ? (document.logicalHeight - element.bounds.height) / 2
        : vertical === 'bottom'
          ? document.logicalHeight - element.bounds.height
          : element.bounds.y

  return moveElement(document, elementId, { x, y })
}

export function duplicateElement(
  document: EpisodeDocument,
  elementId: string,
  offset: LogicalPosition = { x: 24, y: 24 },
): EpisodeDocument {
  const element = document.elements.find(({ id }) => id === elementId)

  if (
    !element ||
    !areFinitePositiveBounds(element.bounds) ||
    !Number.isFinite(offset.x) ||
    !Number.isFinite(offset.y) ||
    !Number.isFinite(document.logicalWidth) ||
    !Number.isFinite(document.logicalHeight) ||
    document.logicalWidth <= 0 ||
    document.logicalHeight <= 0
  ) {
    return document
  }

  const { id } = createElementId(document, `${element.id}-copy`)
  const bounds = clampEpisodeElementGeometry(
    element,
    {
      ...element.bounds,
      x: element.bounds.x + offset.x,
      y: element.bounds.y + offset.y,
    },
    element.transform,
    element.overflow,
    { width: document.logicalWidth, height: document.logicalHeight },
  )

  if (!bounds) {
    return document
  }
  const highestZIndex = document.elements.reduce(
    (highest, candidate) =>
      candidate.layerPlaneId === element.layerPlaneId
        ? Math.max(highest, candidate.zIndex)
        : highest,
    -1,
  )
  const copySuffix = ' copy'
  const duplicateName = `${element.name}${copySuffix}`
  const duplicate: EpisodeElement = {
    ...element,
    id,
    name:
      duplicateName.length <= MAX_ELEMENT_NAME_LENGTH
        ? duplicateName
        : `${element.name.slice(
            0,
            MAX_ELEMENT_NAME_LENGTH - copySuffix.length,
          )}${copySuffix}`,
    bounds,
    zIndex: highestZIndex + 1,
  }

  return { ...document, elements: [...document.elements, duplicate] }
}

export function resizeElement(
  document: EpisodeDocument,
  elementId: string,
  requestedBounds: ElementBounds,
): EpisodeDocument {
  const element = document.elements.find(({ id }) => id === elementId)

  if (
    !element ||
    element.locked ||
    !areFinitePositiveBounds(requestedBounds) ||
    !areFinitePositiveBounds(element.bounds) ||
    (element.type === 'text' &&
      (!Number.isFinite(element.fontSize) || element.fontSize <= 0)) ||
    !Number.isFinite(document.logicalWidth) ||
    !Number.isFinite(document.logicalHeight) ||
    document.logicalWidth <= 0 ||
    document.logicalHeight <= 0
  ) {
    return document
  }

  if (isElementFreeformResizable(element)) {
    const horizontal = resizeFreeformAxis(
      element.bounds.x,
      element.bounds.width,
      requestedBounds.x,
      requestedBounds.width,
      document.logicalWidth,
      element.overflow,
    )
    const vertical = resizeFreeformAxis(
      element.bounds.y,
      element.bounds.height,
      requestedBounds.y,
      requestedBounds.height,
      document.logicalHeight,
      element.overflow,
    )
    const requestedGeometry = {
      x: horizontal.start,
      y: vertical.start,
      width: horizontal.size,
      height: vertical.size,
    }
    const bounds = clampEpisodeElementGeometry(
      element,
      requestedGeometry,
      element.transform,
      element.overflow,
      { width: document.logicalWidth, height: document.logicalHeight },
    )

    if (
      !bounds ||
      bounds.x === element.bounds.x &&
      bounds.y === element.bounds.y &&
      bounds.width === element.bounds.width &&
      bounds.height === element.bounds.height
    ) {
      return document
    }

    return {
      ...document,
      elements: document.elements.map((candidate) =>
        candidate.id === element.id
          ? withResizedElementBounds(candidate, bounds)
          : candidate,
      ),
    }
  }

  const widthScale = requestedBounds.width / element.bounds.width
  const heightScale = requestedBounds.height / element.bounds.height
  const requestedScale = Math.min(widthScale, heightScale)
  const requestedRight = requestedBounds.x + requestedBounds.width
  const requestedBottom = requestedBounds.y + requestedBounds.height
  const currentRight = element.bounds.x + element.bounds.width
  const currentBottom = element.bounds.y + element.bounds.height
  const keepsLeftEdge =
    Math.abs(requestedBounds.x - element.bounds.x) <=
    Math.abs(requestedRight - currentRight)
  const keepsTopEdge =
    Math.abs(requestedBounds.y - element.bounds.y) <=
    Math.abs(requestedBottom - currentBottom)
  const minimumScale = Math.max(
    MIN_ELEMENT_SIZE / element.bounds.width,
    MIN_ELEMENT_SIZE / element.bounds.height,
    element.type === 'text'
      ? MIN_TEXT_FONT_SIZE / element.fontSize
      : 0,
  )
  const maximumScale =
    element.overflow === 'bleed'
      ? element.type === 'text'
        ? MAX_TEXT_FONT_SIZE / element.fontSize
        : Number.POSITIVE_INFINITY
      : Math.min(
          (keepsLeftEdge
            ? document.logicalWidth - element.bounds.x
            : currentRight) / element.bounds.width,
          (keepsTopEdge
            ? document.logicalHeight - element.bounds.y
            : currentBottom) / element.bounds.height,
          element.type === 'text'
            ? MAX_TEXT_FONT_SIZE / element.fontSize
            : Number.POSITIVE_INFINITY,
        )

  if (!Number.isFinite(requestedScale) || maximumScale <= 0) {
    return document
  }

  const scale = clamp(
    requestedScale,
    Math.min(minimumScale, maximumScale),
    maximumScale,
  )
  const width = element.bounds.width * scale
  const height = element.bounds.height * scale
  const requestedPosition = {
    x: keepsLeftEdge ? element.bounds.x : currentRight - width,
    y: keepsTopEdge ? element.bounds.y : currentBottom - height,
  }
  const position =
    element.overflow === 'bleed'
      ? requestedPosition
      : clampElementPosition(
          requestedPosition,
          { width, height },
          document.logicalWidth,
          document.logicalHeight,
        )
  const requestedGeometry = { ...position, width, height }
  const bounds = clampEpisodeElementGeometry(
    element,
    requestedGeometry,
    element.transform,
    element.overflow,
    { width: document.logicalWidth, height: document.logicalHeight },
  )
  const fontSize =
    element.type === 'text' ? element.fontSize * scale : undefined

  if (
    !bounds ||
    bounds.x === element.bounds.x &&
    bounds.y === element.bounds.y &&
    bounds.width === element.bounds.width &&
    bounds.height === element.bounds.height &&
    (element.type !== 'text' || fontSize === element.fontSize)
  ) {
    return document
  }

  return {
    ...document,
    elements: document.elements.map((candidate) =>
      candidate.id === element.id
        ? withResizedElementBounds(candidate, bounds, fontSize)
        : candidate,
    ),
  }
}

function resizeFreeformAxis(
  currentStart: number,
  currentSize: number,
  requestedStart: number,
  requestedSize: number,
  containerSize: number,
  overflow: ElementOverflow,
) {
  const currentEnd = currentStart + currentSize
  const requestedEnd = requestedStart + requestedSize
  const keepsStartEdge =
    Math.abs(requestedStart - currentStart) <=
    Math.abs(requestedEnd - currentEnd)
  const maximumSize =
    overflow === 'bleed'
      ? Number.POSITIVE_INFINITY
      : keepsStartEdge
        ? containerSize - currentStart
        : currentEnd
  const size = clamp(
    requestedSize,
    Math.min(MIN_ELEMENT_SIZE, maximumSize),
    maximumSize,
  )

  return {
    start: keepsStartEdge ? currentStart : currentEnd - size,
    size,
  }
}

function withResizedElementBounds(
  element: EpisodeElement,
  bounds: ElementBounds,
  textFontSize?: number,
): EpisodeElement {
  if (element.type === 'text') {
    return {
      ...element,
      bounds,
      ...(textFontSize !== undefined ? { fontSize: textFontSize } : {}),
    }
  }

  if (element.type === 'speech-balloon') {
    return {
      ...element,
      bounds,
      cornerRadius: Math.min(
        element.cornerRadius,
        bounds.width / 2,
        bounds.height / 2,
      ),
      padding: Math.min(
        element.padding,
        Math.max(0, Math.min(bounds.width, bounds.height) / 2 - 1),
      ),
    }
  }

  if (element.type === 'image' && element.frame.mask.kind === 'rectangle') {
    return {
      ...element,
      bounds,
      frame: {
        ...element.frame,
        mask: {
          ...element.frame.mask,
          cornerRadius: Math.min(
            element.frame.mask.cornerRadius,
            bounds.width / 2,
            bounds.height / 2,
          ),
        },
      },
    }
  }

  return { ...element, bounds }
}

function areFinitePositiveBounds(bounds: ElementBounds): boolean {
  return (
    Number.isFinite(bounds.x) &&
    Number.isFinite(bounds.y) &&
    Number.isFinite(bounds.width) &&
    Number.isFinite(bounds.height) &&
    bounds.width > 0 &&
    bounds.height > 0
  )
}

export function isBackgroundColorRegion(element: EpisodeElement): boolean {
  return (
    element.assetReference.kind === 'synthetic' &&
    element.assetReference.generatorId ===
      BACKGROUND_COLOR_REGION_GENERATOR_ID
  )
}

export function isElementFreeformResizable(
  element: EpisodeElement,
): boolean {
  return (
    isBackgroundColorRegion(element) ||
    element.type === 'speech-balloon' ||
    (element.type === 'image' && element.presentation !== 'single')
  )
}

export function setElementVisibility(
  document: EpisodeDocument,
  elementId: string,
  visible: boolean,
): EpisodeDocument {
  let changed = false

  const elements = document.elements.map((element) => {
    if (element.id !== elementId || element.visible === visible) {
      return element
    }

    changed = true
    return { ...element, visible }
  })

  return changed ? { ...document, elements } : document
}

export function setElementOpacity(
  document: EpisodeDocument,
  elementId: string,
  requestedOpacity: number,
): EpisodeDocument {
  if (!Number.isFinite(requestedOpacity)) {
    return document
  }

  const opacity = clamp(requestedOpacity, 0, 1)

  return replaceElement(document, elementId, (element) =>
    element.opacity === opacity ? element : { ...element, opacity },
  )
}

export function setElementBlendMode(
  document: EpisodeDocument,
  elementId: string,
  blendMode: ElementBlendMode,
): EpisodeDocument {
  if (!ELEMENT_BLEND_MODES.includes(blendMode)) {
    return document
  }

  return replaceElement(document, elementId, (element) =>
    element.blendMode === blendMode ? element : { ...element, blendMode },
  )
}

export function setShapeFill(
  document: EpisodeDocument,
  elementId: string,
  requestedFill: ShapeFill,
): EpisodeDocument {
  const fill = normalizeShapeFill(requestedFill)

  if (!fill) {
    return document
  }

  return replaceElement(document, elementId, (element) => {
    if (
      element.type !== 'shape' ||
      (fill.kind === 'vertical-gradient' &&
        !isBackgroundColorRegion(element)) ||
      areShapeFillsEqual(element.fill, fill)
    ) {
      return element
    }

    return { ...element, fill }
  })
}

export function updateShapeElementStyle(
  document: EpisodeDocument,
  elementId: string,
  input: UpdateShapeElementStyleInput,
): EpisodeDocument {
  const stroke = input.stroke?.trim() || undefined

  if (
    (input.shape !== 'rectangle' && input.shape !== 'ellipse') ||
    !Number.isFinite(input.strokeWidth) ||
    input.strokeWidth < 0 ||
    input.strokeWidth > 100 ||
    !Number.isFinite(input.cornerRadius) ||
    input.cornerRadius < 0
  ) {
    return document
  }

  return replaceElement(document, elementId, (element) => {
    if (element.type !== 'shape') return element

    const strokeWidth = stroke ? input.strokeWidth : undefined
    const cornerRadius =
      input.shape === 'rectangle'
        ? Math.min(
            input.cornerRadius,
            element.bounds.width / 2,
            element.bounds.height / 2,
          )
        : undefined

    if (
      element.shape === input.shape &&
      element.stroke === stroke &&
      element.strokeWidth === strokeWidth &&
      element.cornerRadius === cornerRadius
    ) {
      return element
    }

    return {
      ...element,
      shape: input.shape,
      ...(stroke
        ? { stroke, strokeWidth }
        : { stroke: undefined, strokeWidth: undefined }),
      ...(cornerRadius === undefined
        ? { cornerRadius: undefined }
        : { cornerRadius }),
    }
  })
}

export function setImagePresentation(
  document: EpisodeDocument,
  elementId: string,
  presentation: ImageElement['presentation'],
  options: {
    readonly sourceAspectRatio?: number
  } = {},
): EpisodeDocument {
  if (
    presentation !== 'single' &&
    presentation !== 'tile' &&
    presentation !== 'cover'
  ) {
    return document
  }

  return replaceElement(document, elementId, (element) => {
    if (element.type !== 'image' || element.presentation === presentation) {
      return element
    }

    if (presentation === 'tile' || presentation === 'cover') {
      return { ...element, presentation }
    }

    const sourceAspectRatio = options.sourceAspectRatio

    if (
      sourceAspectRatio === undefined ||
      !Number.isFinite(sourceAspectRatio) ||
      sourceAspectRatio <= 0
    ) {
      return element
    }

    const sourceWidth = sourceAspectRatio >= 1 ? sourceAspectRatio : 1
    const sourceHeight = sourceAspectRatio >= 1 ? 1 : 1 / sourceAspectRatio
    const preferredScale = Math.min(
      element.bounds.width / sourceWidth,
      element.bounds.height / sourceHeight,
    )
    const minimumUsableScale = Math.max(
      MIN_ELEMENT_SIZE / sourceWidth,
      MIN_ELEMENT_SIZE / sourceHeight,
    )
    const maximumEpisodeScale = Math.min(
      document.logicalWidth / sourceWidth,
      document.logicalHeight / sourceHeight,
    )

    if (minimumUsableScale > maximumEpisodeScale) {
      return element
    }

    const scale = clamp(
      preferredScale,
      minimumUsableScale,
      maximumEpisodeScale,
    )
    const width = sourceWidth * scale
    const height = sourceHeight * scale
    const position = clampElementPosition(
      {
        x: element.bounds.x + (element.bounds.width - width) / 2,
        y: element.bounds.y + (element.bounds.height - height) / 2,
      },
      { width, height },
      document.logicalWidth,
      document.logicalHeight,
    )

    return {
      ...withResizedElementBounds(element, {
        ...position,
        width,
        height,
      }),
      presentation,
    } as ImageElement
  })
}

export function setImageFrame(
  document: EpisodeDocument,
  elementId: string,
  requestedFrame: ImageFrame,
): EpisodeDocument {
  return replaceElement(document, elementId, (element) => {
    if (element.type !== 'image') {
      return element
    }

    const frame = normalizeImageFrame(requestedFrame, element.bounds)

    return !frame || areImageFramesEqual(element.frame, frame)
      ? element
      : { ...element, frame }
  })
}

export function setImageCrop(
  document: EpisodeDocument,
  elementId: string,
  requestedCrop: ImageCrop,
): EpisodeDocument {
  if (!isValidImageCrop(requestedCrop)) {
    return document
  }

  return replaceElement(document, elementId, (element) => {
    if (
      element.type !== 'image' ||
      areImageCropsEqual(element.frame.crop, requestedCrop)
    ) {
      return element
    }

    return {
      ...element,
      frame: {
        ...element.frame,
        crop: { ...requestedCrop },
      },
    }
  })
}

export function deleteElement(
  document: EpisodeDocument,
  elementId: string,
): EpisodeDocument {
  const element = document.elements.find(({ id }) => id === elementId)

  if (!element || element.locked) {
    return document
  }

  const elements = document.elements.filter(
    (candidate) => candidate.id !== elementId,
  )
  const elementGroups = document.elementGroups.flatMap((group) => {
    if (!group.memberElementIds.includes(elementId)) {
      return [group]
    }

    const memberElementIds = group.memberElementIds.filter(
      (memberElementId) => memberElementId !== elementId,
    )

    return memberElementIds.length >= 2
      ? [{ ...group, memberElementIds }]
      : []
  })

  return { ...document, elements, elementGroups }
}

export function moveElementInStack(
  document: EpisodeDocument,
  elementId: string,
  direction: 'backward' | 'forward',
): EpisodeDocument {
  const element = document.elements.find(({ id }) => id === elementId)

  if (
    !element ||
    element.locked ||
    (direction !== 'backward' && direction !== 'forward')
  ) {
    return document
  }

  const stack = document.elements
    .filter(({ layerPlaneId }) => layerPlaneId === element.layerPlaneId)
    .sort(
      (first, second) =>
        first.zIndex - second.zIndex || first.id.localeCompare(second.id),
    )
  const currentIndex = stack.findIndex(({ id }) => id === elementId)
  const targetIndex =
    direction === 'backward' ? currentIndex - 1 : currentIndex + 1

  return reorderElementInStack(document, elementId, targetIndex)
}

export function reorderElementInStack(
  document: EpisodeDocument,
  elementId: string,
  targetIndex: number,
): EpisodeDocument {
  const element = document.elements.find(({ id }) => id === elementId)

  if (!element || element.locked || !Number.isInteger(targetIndex)) {
    return document
  }

  const stack = document.elements
    .filter(({ layerPlaneId }) => layerPlaneId === element.layerPlaneId)
    .sort(
      (first, second) =>
        first.zIndex - second.zIndex || first.id.localeCompare(second.id),
    )
  const currentIndex = stack.findIndex(({ id }) => id === elementId)

  if (
    currentIndex < 0 ||
    targetIndex < 0 ||
    targetIndex >= stack.length ||
    currentIndex === targetIndex
  ) {
    return document
  }

  const reordered = [...stack]
  const movedElement = reordered[currentIndex]

  if (!movedElement) {
    return document
  }

  reordered.splice(currentIndex, 1)
  reordered.splice(targetIndex, 0, movedElement)
  const zIndexes = new Map(
    reordered.map(({ id }, index) => [id, index]),
  )

  return {
    ...document,
    elements: document.elements.map((candidate) => {
      const zIndex = zIndexes.get(candidate.id)

      return zIndex !== undefined && candidate.zIndex !== zIndex
        ? { ...candidate, zIndex }
        : candidate
    }),
  }
}

export function moveElementToLayerPlane(
  document: EpisodeDocument,
  elementId: string,
  targetLayerPlaneId: string,
): EpisodeDocument {
  const element = document.elements.find(({ id }) => id === elementId)
  const targetLayerPlane = getLayerPlaneById(document, targetLayerPlaneId)

  if (
    !element ||
    element.locked ||
    !targetLayerPlane ||
    targetLayerPlane.kind !== 'ordinary' ||
    element.layerPlaneId === targetLayerPlane.id
  ) {
    return document
  }

  const sourceStack = document.elements
    .filter(
      (candidate) =>
        candidate.layerPlaneId === element.layerPlaneId &&
        candidate.id !== element.id,
    )
    .sort(
      (first, second) =>
        first.zIndex - second.zIndex || first.id.localeCompare(second.id),
    )
  const targetStack = document.elements
    .filter(
      (candidate) => candidate.layerPlaneId === targetLayerPlane.id,
    )
    .sort(
      (first, second) =>
        first.zIndex - second.zIndex || first.id.localeCompare(second.id),
    )
  const sourceZIndexes = new Map(
    sourceStack.map(({ id }, index) => [id, index]),
  )
  const targetZIndexes = new Map(
    targetStack.map(({ id }, index) => [id, index]),
  )

  return {
    ...document,
    elements: document.elements.map((candidate) => {
      if (candidate.id === element.id) {
        return {
          ...candidate,
          layerPlaneId: targetLayerPlane.id,
          zIndex: targetStack.length,
        }
      }

      const sourceZIndex = sourceZIndexes.get(candidate.id)

      if (sourceZIndex !== undefined) {
        return candidate.zIndex === sourceZIndex
          ? candidate
          : { ...candidate, zIndex: sourceZIndex }
      }

      const targetZIndex = targetZIndexes.get(candidate.id)

      return targetZIndex !== undefined && candidate.zIndex !== targetZIndex
        ? { ...candidate, zIndex: targetZIndex }
        : candidate
    }),
  }
}

export function createSyntheticShapeElement(
  document: EpisodeDocument,
  input: CreateSyntheticShapeElementInput,
): EpisodeDocument {
  const layerPlane = getLayerPlaneById(document, input.layerPlaneId)
  const name = input.name.trim()
  const shape = input.shape ?? 'rectangle'
  const fill = input.fill.trim()
  const stroke = input.stroke?.trim()

  if (
    !layerPlane ||
    layerPlane.kind !== 'ordinary' ||
    name.length === 0 ||
    name.length > MAX_ELEMENT_NAME_LENGTH ||
    (shape !== 'rectangle' && shape !== 'ellipse') ||
    fill.length === 0 ||
    (input.stroke !== undefined && !stroke) ||
    (input.strokeWidth !== undefined &&
      (!stroke ||
        !Number.isFinite(input.strokeWidth) ||
        input.strokeWidth < 0)) ||
    (input.cornerRadius !== undefined &&
      (!Number.isFinite(input.cornerRadius) || input.cornerRadius < 0))
  ) {
    return document
  }

  const bounds = clampNewElementBounds(document, input.bounds)

  if (!bounds) {
    return document
  }

  return appendSyntheticShape(document, {
    idPrefix: 'synthetic-shape',
    generatorId: SYNTHETIC_SHAPE_GENERATOR_ID,
    layerPlaneId: layerPlane.id,
    name,
    shape,
    fill,
    ...(stroke
      ? { stroke, strokeWidth: input.strokeWidth ?? 2 }
      : {}),
    ...(input.cornerRadius !== undefined
      ? {
          cornerRadius: Math.min(
            input.cornerRadius,
            bounds.width / 2,
            bounds.height / 2,
          ),
        }
      : {}),
    bounds,
  })
}

export function createImageElement(
  document: EpisodeDocument,
  input: CreateImageElementInput,
): EpisodeDocument {
  const layerPlane = getLayerPlaneById(document, input.layerPlaneId)
  const name = input.name.trim()
  const assetId = input.assetReference.assetId.trim()

  if (
    !layerPlane ||
    layerPlane.kind !== 'ordinary' ||
    name.length === 0 ||
    assetId.length === 0 ||
    (input.assetReference.kind !== 'built-in' &&
      input.assetReference.kind !== 'imported')
  ) {
    return document
  }

  const bounds = clampNewElementBounds(document, input.bounds)

  if (!bounds) {
    return document
  }

  const { id } = createElementId(document, 'image-element')
  const highestZIndex = document.elements.reduce(
    (highest, element) =>
      element.layerPlaneId === layerPlane.id
        ? Math.max(highest, element.zIndex)
        : highest,
    -1,
  )
  const element: ImageElement = {
    id,
    name,
    layerPlaneId: layerPlane.id,
    type: 'image',
    bounds,
    visible: true,
    locked: false,
    zIndex: highestZIndex + 1,
    opacity: 1,
    blendMode: 'normal',
    transform: IDENTITY_ELEMENT_TRANSFORM,
    overflow: DEFAULT_ELEMENT_OVERFLOW,
    assetReference: {
      kind: input.assetReference.kind,
      assetId,
    },
    presentation: 'single',
    frame: DEFAULT_IMAGE_FRAME,
  }

  return { ...document, elements: [...document.elements, element] }
}

export function createTextElement(
  document: EpisodeDocument,
  input: CreateTextElementInput,
): EpisodeDocument {
  const layerPlane = getLayerPlaneById(document, input.layerPlaneId)
  const text = input.text.trim()
  const fill = input.fill.trim()
  const fontSize = input.fontSize ?? 36
  const fontWeight = input.fontWeight ?? 600
  const align = input.align ?? 'center'

  if (
    !layerPlane ||
    layerPlane.kind !== 'ordinary' ||
    text.length === 0 ||
    text.length > MAX_TEXT_CONTENT_LENGTH ||
    fill.length === 0 ||
    !isValidTextFontSize(fontSize) ||
    !isTextFontWeight(fontWeight) ||
    !isTextAlignment(align)
  ) {
    return document
  }

  const bounds = clampNewElementBounds(document, input.bounds)

  if (!bounds) {
    return document
  }

  const { id, number } = createElementId(document, 'text-element')
  const highestZIndex = document.elements.reduce(
    (highest, element) =>
      element.layerPlaneId === layerPlane.id
        ? Math.max(highest, element.zIndex)
        : highest,
    -1,
  )
  const element: TextElement = {
    id,
    name: `Text ${number}`,
    layerPlaneId: layerPlane.id,
    type: 'text',
    bounds,
    text,
    fill,
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    fontSize,
    fontWeight,
    lineHeight: 1.2,
    align,
    visible: true,
    locked: false,
    zIndex: highestZIndex + 1,
    opacity: 1,
    blendMode: 'normal',
    transform: IDENTITY_ELEMENT_TRANSFORM,
    overflow: DEFAULT_ELEMENT_OVERFLOW,
    assetReference: {
      kind: 'synthetic',
      generatorId: TEXT_ELEMENT_GENERATOR_ID,
    },
  }

  return { ...document, elements: [...document.elements, element] }
}

export function updateTextElement(
  document: EpisodeDocument,
  elementId: string,
  input: UpdateTextElementInput,
): EpisodeDocument {
  const text = input.text.trim()
  const fill = input.fill.trim()

  if (
    text.length === 0 ||
    text.length > MAX_TEXT_CONTENT_LENGTH ||
    fill.length === 0 ||
    !isValidTextFontSize(input.fontSize) ||
    !isTextFontWeight(input.fontWeight) ||
    !isTextAlignment(input.align)
  ) {
    return document
  }

  let changed = false
  const elements = document.elements.map((element) => {
    if (element.id !== elementId || element.type !== 'text') {
      return element
    }

    if (
      element.text === text &&
      element.fill === fill &&
      element.fontSize === input.fontSize &&
      element.fontWeight === input.fontWeight &&
      element.align === input.align
    ) {
      return element
    }

    changed = true
    return {
      ...element,
      text,
      fill,
      fontSize: input.fontSize,
      fontWeight: input.fontWeight,
      align: input.align,
    }
  })

  return changed ? { ...document, elements } : document
}

export function createSpeechBalloonElement(
  document: EpisodeDocument,
  input: CreateSpeechBalloonElementInput,
): EpisodeDocument {
  const layerPlane = getLayerPlaneById(document, input.layerPlaneId)
  const bounds = clampNewElementBounds(document, input.bounds)
  const text = (input.text ?? '').trim()
  const presetId = input.presetId ?? 'standard'
  const preset = getSpeechBalloonPreset(presetId)

  if (
    !layerPlane ||
    layerPlane.kind !== 'ordinary' ||
    !bounds ||
    text.length > MAX_TEXT_CONTENT_LENGTH
  ) {
    return document
  }

  const { id, number } = createElementId(document, 'speech-balloon')
  const highestZIndex = document.elements.reduce(
    (highest, element) =>
      element.layerPlaneId === layerPlane.id
        ? Math.max(highest, element.zIndex)
        : highest,
    -1,
  )
  const element: SpeechBalloonElement = {
    id,
    name: `${preset.label} balloon ${number}`,
    layerPlaneId: layerPlane.id,
    type: 'speech-balloon',
    bounds,
    fill: '#FFFFFF',
    stroke: '#211A2B',
    strokeWidth: 6,
    cornerRadius: Math.min(56, bounds.width / 2, bounds.height / 2),
    text,
    textFill: '#211A2B',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    fontWeight: 600,
    lineHeight: 1.15,
    align: 'center',
    padding: Math.min(24, bounds.width / 4, bounds.height / 4),
    minFontSize: 12,
    maxFontSize: 44,
    tail: DEFAULT_SPEECH_BALLOON_TAIL,
    visible: true,
    locked: false,
    zIndex: highestZIndex + 1,
    opacity: 1,
    blendMode: 'normal',
    transform: IDENTITY_ELEMENT_TRANSFORM,
    overflow: DEFAULT_ELEMENT_OVERFLOW,
    assetReference: {
      kind: 'synthetic',
      generatorId: getSpeechBalloonGeneratorId(presetId),
    },
  }

  return { ...document, elements: [...document.elements, element] }
}

export function updateSpeechBalloonElement(
  document: EpisodeDocument,
  elementId: string,
  input: UpdateSpeechBalloonElementInput,
): EpisodeDocument {
  const text = input.text.trim()
  const fill = input.fill.trim()
  const stroke = input.stroke.trim()
  const textFill = input.textFill.trim()
  const fontFamily = input.fontFamily.trim()
  const tail = normalizeSpeechBalloonTail(input.tail)
  const bodyControlPoints =
    input.bodyControlPoints === undefined
      ? undefined
      : normalizeSpeechBalloonBodyControlPoints(input.bodyControlPoints)

  if (
    text.length > MAX_TEXT_CONTENT_LENGTH ||
    !fill ||
    !stroke ||
    !textFill ||
    !fontFamily ||
    !Number.isFinite(input.strokeWidth) ||
    input.strokeWidth < 0 ||
    input.strokeWidth > 100 ||
    !Number.isFinite(input.cornerRadius) ||
    input.cornerRadius < 0 ||
    !Number.isFinite(input.lineHeight) ||
    input.lineHeight < 0.8 ||
    input.lineHeight > 2.5 ||
    !isTextFontWeight(input.fontWeight) ||
    !isTextAlignment(input.align) ||
    !Number.isFinite(input.padding) ||
    input.padding < 0 ||
    !isValidTextFontSize(input.minFontSize) ||
    !isValidTextFontSize(input.maxFontSize) ||
    input.maxFontSize < input.minFontSize ||
    !tail ||
    (input.bodyControlPoints !== undefined && !bodyControlPoints)
  ) {
    return document
  }

  return replaceElement(document, elementId, (element) => {
    if (element.type !== 'speech-balloon') return element

    const padding = Math.min(
      input.padding,
      Math.max(0, Math.min(element.bounds.width, element.bounds.height) / 2 - 1),
    )
    const cornerRadius = Math.min(
      input.cornerRadius,
      element.bounds.width / 2,
      element.bounds.height / 2,
    )
    const next: SpeechBalloonElement = {
      ...element,
      assetReference: {
        kind: 'synthetic',
        generatorId: getSpeechBalloonGeneratorId(
          input.presetId ?? getSpeechBalloonPresetId(element),
        ),
      },
      ...(bodyControlPoints === undefined
        ? { bodyControlPoints: element.bodyControlPoints }
        : { bodyControlPoints }),
      text,
      fill,
      stroke,
      strokeWidth: input.strokeWidth,
      cornerRadius,
      textFill,
      fontFamily,
      fontWeight: input.fontWeight,
      lineHeight: input.lineHeight,
      align: input.align,
      padding,
      minFontSize: input.minFontSize,
      maxFontSize: input.maxFontSize,
      tail,
    }

    return areSpeechBalloonStylesEqual(element, next) ? element : next
  })
}

export function createBackgroundColorRegion(
  document: EpisodeDocument,
  input: CreateBackgroundColorRegionInput,
): EpisodeDocument {
  const layerPlane = getLayerPlaneById(document, input.layerPlaneId)
  const fill = input.fill.trim()

  if (
    !layerPlane ||
    layerPlane.kind !== 'ordinary' ||
    layerPlane.compositionGroup !== 'background' ||
    fill.length === 0 ||
    !Number.isFinite(input.startY) ||
    !Number.isFinite(input.height) ||
    input.height <= 0 ||
    document.logicalHeight <= 0
  ) {
    return document
  }

  const startY = clamp(input.startY, 0, document.logicalHeight)
  const height = Math.min(input.height, document.logicalHeight - startY)

  if (height <= 0) {
    return document
  }

  return appendSyntheticShape(document, {
    idPrefix: 'background-color-region',
    generatorId: BACKGROUND_COLOR_REGION_GENERATOR_ID,
    layerPlaneId: layerPlane.id,
    name: (number) => `Background color region ${number}`,
    shape: 'rectangle',
    fill,
    bounds: {
      x: 0,
      y: startY,
      width: document.logicalWidth,
      height,
    },
  })
}

export function setCompositionGroupVisibility(
  document: EpisodeDocument,
  compositionGroup: CompositionGroup,
  visible: boolean,
): EpisodeDocument {
  if (document.compositionGroupVisibility[compositionGroup] === visible) {
    return document
  }

  return {
    ...document,
    compositionGroupVisibility: {
      ...document.compositionGroupVisibility,
      [compositionGroup]: visible,
    },
  }
}

export function createLayerPlane(
  document: EpisodeDocument,
  compositionGroup: CompositionGroup,
): EpisodeDocument {
  const layerPlanes = getLayerPlanesForGroup(document, compositionGroup)
  const nextOrder =
    layerPlanes.reduce(
      (highestOrder, layerPlane) =>
        Math.max(highestOrder, layerPlane.order),
      0,
    ) + 1
  const layerPlane: OrdinaryLayerPlane = {
    id: createLayerPlaneId(document, compositionGroup, nextOrder),
    kind: 'ordinary',
    compositionGroup,
    order: nextOrder,
    visible: true,
  }

  return {
    ...document,
    layerPlanes: [...document.layerPlanes, layerPlane],
  }
}

export function setLayerPlaneName(
  document: EpisodeDocument,
  layerPlaneId: string,
  requestedName: string,
): EpisodeDocument {
  const layerPlane = getLayerPlaneById(document, layerPlaneId)
  const name = requestedName.trim()

  if (
    !layerPlane ||
    layerPlane.kind !== 'ordinary' ||
    name.length > MAX_LAYER_PLANE_NAME_LENGTH ||
    name === (layerPlane.name ?? '')
  ) {
    return document
  }

  return {
    ...document,
    layerPlanes: document.layerPlanes.map((candidate) => {
      if (
        candidate.id !== layerPlane.id ||
        candidate.kind !== 'ordinary'
      ) {
        return candidate
      }

      if (name.length > 0) {
        return { ...candidate, name }
      }

      return {
        id: candidate.id,
        kind: 'ordinary',
        compositionGroup: candidate.compositionGroup,
        order: candidate.order,
        visible: candidate.visible,
      }
    }),
  }
}

export function reorderLayerPlane(
  document: EpisodeDocument,
  layerPlaneId: string,
  requestedTargetIndex: number,
): EpisodeDocument {
  const layerPlane = getLayerPlaneById(document, layerPlaneId)

  if (
    !layerPlane ||
    layerPlane.kind !== 'ordinary' ||
    !Number.isInteger(requestedTargetIndex)
  ) {
    return document
  }

  const groupLayerPlanes = getLayerPlanesForGroup(
    document,
    layerPlane.compositionGroup,
  )
  const currentIndex = groupLayerPlanes.findIndex(
    ({ id }) => id === layerPlane.id,
  )
  const minimumTargetIndex =
    layerPlane.compositionGroup === 'background' &&
    groupLayerPlanes[0]?.kind === 'base'
      ? 1
      : 0
  const targetIndex = clamp(
    requestedTargetIndex,
    minimumTargetIndex,
    groupLayerPlanes.length - 1,
  )

  if (currentIndex < 0 || currentIndex === targetIndex) {
    return document
  }

  const reordered = [...groupLayerPlanes]
  const movedLayerPlane = reordered[currentIndex]

  if (!movedLayerPlane) {
    return document
  }

  reordered.splice(currentIndex, 1)
  reordered.splice(targetIndex, 0, movedLayerPlane)
  const orders = new Map(
    reordered.map(({ id }, index) => [id, index + 1]),
  )

  return {
    ...document,
    layerPlanes: document.layerPlanes.map((candidate) => {
      const order = orders.get(candidate.id)

      return order !== undefined && candidate.order !== order
        ? { ...candidate, order }
        : candidate
    }),
  }
}

export function deleteEmptyLayerPlane(
  document: EpisodeDocument,
  layerPlaneId: string,
): EpisodeDocument {
  const layerPlane = getLayerPlaneById(document, layerPlaneId)

  if (
    !layerPlane ||
    layerPlane.kind !== 'ordinary' ||
    document.elements.some(
      (element) => element.layerPlaneId === layerPlaneId,
    )
  ) {
    return document
  }

  const groupLayerPlanes = getLayerPlanesForGroup(
    document,
    layerPlane.compositionGroup,
  )

  if (groupLayerPlanes.length <= 1) {
    return document
  }

  const compactOrders = new Map(
    groupLayerPlanes
      .filter(({ id }) => id !== layerPlaneId)
      .map(({ id }, index) => [id, index + 1]),
  )

  return {
    ...document,
    layerPlanes: document.layerPlanes
      .filter(({ id }) => id !== layerPlaneId)
      .map((candidate) => {
        const compactOrder = compactOrders.get(candidate.id)

        return compactOrder !== undefined && candidate.order !== compactOrder
          ? { ...candidate, order: compactOrder }
          : candidate
      }),
  }
}

export function setLayerPlaneVisibility(
  document: EpisodeDocument,
  layerPlaneId: string,
  visible: boolean,
): EpisodeDocument {
  let changed = false

  const layerPlanes = document.layerPlanes.map((layerPlane) => {
    if (layerPlane.id !== layerPlaneId || layerPlane.visible === visible) {
      return layerPlane
    }

    changed = true
    return { ...layerPlane, visible }
  })

  return changed ? { ...document, layerPlanes } : document
}

export function setBaseColor(
  document: EpisodeDocument,
  baseColor: string,
): EpisodeDocument {
  const baseLayerPlane = getBackgroundBaseLayerPlane(document)

  if (!baseLayerPlane || baseLayerPlane.baseColor === baseColor) {
    return document
  }

  return {
    ...document,
    layerPlanes: document.layerPlanes.map((layerPlane) =>
      layerPlane.id === baseLayerPlane.id
        ? { ...layerPlane, baseColor }
        : layerPlane,
    ),
  }
}

function createLayerPlaneId(
  document: EpisodeDocument,
  compositionGroup: CompositionGroup,
  startingNumber: number,
): string {
  let candidateNumber = startingNumber
  let candidateId = `${compositionGroup}-plane-${candidateNumber}`

  while (getLayerPlaneById(document, candidateId)) {
    candidateNumber += 1
    candidateId = `${compositionGroup}-plane-${candidateNumber}`
  }

  return candidateId
}

interface AppendSyntheticShapeInput {
  readonly idPrefix: string
  readonly generatorId: string
  readonly layerPlaneId: string
  readonly name: string | ((number: number) => string)
  readonly shape: ShapeElement['shape']
  readonly fill: string
  readonly stroke?: string
  readonly strokeWidth?: number
  readonly cornerRadius?: number
  readonly bounds: ElementBounds
}

function appendSyntheticShape(
  document: EpisodeDocument,
  input: AppendSyntheticShapeInput,
): EpisodeDocument {
  const { id, number } = createElementId(document, input.idPrefix)
  const highestZIndex = document.elements.reduce(
    (highest, element) =>
      element.layerPlaneId === input.layerPlaneId
        ? Math.max(highest, element.zIndex)
        : highest,
    -1,
  )
  const element: ShapeElement = {
    id,
    name:
      typeof input.name === 'function'
        ? input.name(number)
        : input.name,
    layerPlaneId: input.layerPlaneId,
    type: 'shape',
    shape: input.shape,
    bounds: input.bounds,
    fill: { kind: 'solid', color: input.fill },
    ...(input.stroke !== undefined ? { stroke: input.stroke } : {}),
    ...(input.strokeWidth !== undefined
      ? { strokeWidth: input.strokeWidth }
      : {}),
    ...(input.cornerRadius !== undefined
      ? { cornerRadius: input.cornerRadius }
      : {}),
    opacity: 1,
    blendMode: 'normal',
    transform: IDENTITY_ELEMENT_TRANSFORM,
    overflow: DEFAULT_ELEMENT_OVERFLOW,
    visible: true,
    locked: false,
    zIndex: highestZIndex + 1,
    assetReference: {
      kind: 'synthetic',
      generatorId: input.generatorId,
    },
  }

  return { ...document, elements: [...document.elements, element] }
}

function replaceElement(
  document: EpisodeDocument,
  elementId: string,
  replace: (element: EpisodeElement) => EpisodeElement,
): EpisodeDocument {
  let changed = false

  const elements = document.elements.map((element) => {
    if (element.id !== elementId) {
      return element
    }

    const replacement = replace(element)
    changed = replacement !== element
    return replacement
  })

  return changed ? { ...document, elements } : document
}

function normalizeImageFrame(
  frame: ImageFrame,
  bounds: ElementBounds,
): ImageFrame | undefined {
  if (!frame || !isValidImageMask(frame.mask) || !isValidImageCrop(frame.crop)) {
    return undefined
  }

  const border = frame.border

  if (
    border !== undefined &&
    (typeof border.color !== 'string' ||
      border.color.trim().length === 0 ||
      !Number.isFinite(border.width) ||
      border.width < 0)
  ) {
    return undefined
  }

  const mask =
    frame.mask.kind === 'rectangle'
      ? {
          kind: 'rectangle' as const,
          cornerRadius: Math.min(
            frame.mask.cornerRadius,
            bounds.width / 2,
            bounds.height / 2,
          ),
        }
      : {
          kind: 'polygon' as const,
          points: frame.mask.points.map((point) => ({ ...point })),
        }

  return {
    mask,
    crop: { ...frame.crop },
    ...(border
      ? { border: { color: border.color.trim(), width: border.width } }
      : {}),
  }
}

function areElementTransformsEqual(
  first: ElementTransform,
  second: ElementTransform,
): boolean {
  return (
    first.rotationDegrees === second.rotationDegrees &&
    first.flipX === second.flipX &&
    first.flipY === second.flipY
  )
}

function areElementBoundsEqual(
  first: ElementBounds,
  second: ElementBounds,
): boolean {
  return (
    first.x === second.x &&
    first.y === second.y &&
    first.width === second.width &&
    first.height === second.height
  )
}

function areImageCropsEqual(first: ImageCrop, second: ImageCrop): boolean {
  return (
    first.focusX === second.focusX &&
    first.focusY === second.focusY &&
    first.zoom === second.zoom
  )
}

function areImageFramesEqual(first: ImageFrame, second: ImageFrame): boolean {
  if (
    !areImageCropsEqual(first.crop, second.crop) ||
    first.mask.kind !== second.mask.kind ||
    first.border?.color !== second.border?.color ||
    first.border?.width !== second.border?.width
  ) {
    return false
  }

  if (first.mask.kind === 'rectangle' && second.mask.kind === 'rectangle') {
    return first.mask.cornerRadius === second.mask.cornerRadius
  }

  if (first.mask.kind !== 'polygon' || second.mask.kind !== 'polygon') {
    return false
  }

  const secondPoints = second.mask.points

  return (
    first.mask.points.length === secondPoints.length &&
    first.mask.points.every(
      (point, index) =>
        point.x === secondPoints[index]?.x &&
        point.y === secondPoints[index]?.y,
    )
  )
}

function areSpeechBalloonStylesEqual(
  first: SpeechBalloonElement,
  second: SpeechBalloonElement,
): boolean {
  return (
    first.assetReference.kind === 'synthetic' &&
    second.assetReference.kind === 'synthetic' &&
    first.assetReference.generatorId === second.assetReference.generatorId &&
    JSON.stringify(first.bodyControlPoints ?? null) ===
      JSON.stringify(second.bodyControlPoints ?? null) &&
    first.text === second.text &&
    first.fill === second.fill &&
    first.stroke === second.stroke &&
    first.strokeWidth === second.strokeWidth &&
    first.cornerRadius === second.cornerRadius &&
    first.textFill === second.textFill &&
    first.fontFamily === second.fontFamily &&
    first.fontWeight === second.fontWeight &&
    first.lineHeight === second.lineHeight &&
    first.align === second.align &&
    first.padding === second.padding &&
    first.minFontSize === second.minFontSize &&
    first.maxFontSize === second.maxFontSize &&
    first.tail.enabled === second.tail.enabled &&
    first.tail.side === second.tail.side &&
    first.tail.anchor === second.tail.anchor &&
    first.tail.width === second.tail.width &&
    first.tail.tip.x === second.tail.tip.x &&
    first.tail.tip.y === second.tail.tip.y
  )
}

function normalizeShapeFill(value: unknown): ShapeFill | undefined {
  if (!isUnknownRecord(value)) {
    return undefined
  }

  if (value.kind === 'solid') {
    const color = normalizeColor(value.color)
    return color ? { kind: 'solid', color } : undefined
  }

  if (value.kind !== 'vertical-gradient') {
    return undefined
  }

  const top = normalizeShapeFillStop(value.top)
  const bottom = normalizeShapeFillStop(value.bottom)

  return top && bottom
    ? { kind: 'vertical-gradient', top, bottom }
    : undefined
}

function normalizeShapeFillStop(value: unknown): ShapeFillStop | undefined {
  if (!isUnknownRecord(value)) {
    return undefined
  }

  const color = normalizeColor(value.color)
  const opacity = value.opacity

  return color &&
    typeof opacity === 'number' &&
    Number.isFinite(opacity) &&
    opacity >= 0 &&
    opacity <= 1
    ? { color, opacity }
    : undefined
}

function normalizeColor(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const color = value.trim()
  return color.length > 0 ? color : undefined
}

function areShapeFillsEqual(first: ShapeFill, second: ShapeFill): boolean {
  if (first.kind !== second.kind) {
    return false
  }

  if (first.kind === 'solid' && second.kind === 'solid') {
    return first.color === second.color
  }

  return (
    first.kind === 'vertical-gradient' &&
    second.kind === 'vertical-gradient' &&
    first.top.color === second.top.color &&
    first.top.opacity === second.top.opacity &&
    first.bottom.color === second.bottom.color &&
    first.bottom.opacity === second.bottom.opacity
  )
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidTextFontSize(fontSize: number): boolean {
  return (
    Number.isFinite(fontSize) &&
    fontSize >= MIN_TEXT_FONT_SIZE &&
    fontSize <= MAX_TEXT_FONT_SIZE
  )
}

function isTextFontWeight(
  fontWeight: number,
): fontWeight is TextElement['fontWeight'] {
  return fontWeight === 400 || fontWeight === 600 || fontWeight === 700
}

function isTextAlignment(
  align: string,
): align is TextElement['align'] {
  return align === 'left' || align === 'center' || align === 'right'
}

function clampNewElementBounds(
  document: EpisodeDocument,
  requestedBounds: ElementBounds,
): ElementBounds | undefined {
  if (
    !Number.isFinite(requestedBounds.x) ||
    !Number.isFinite(requestedBounds.y) ||
    !Number.isFinite(requestedBounds.width) ||
    !Number.isFinite(requestedBounds.height) ||
    requestedBounds.width <= 0 ||
    requestedBounds.height <= 0 ||
    document.logicalWidth <= 0 ||
    document.logicalHeight <= 0
  ) {
    return undefined
  }

  const width = Math.min(requestedBounds.width, document.logicalWidth)
  const height = Math.min(requestedBounds.height, document.logicalHeight)
  const position = clampElementPosition(
    requestedBounds,
    { width, height },
    document.logicalWidth,
    document.logicalHeight,
  )

  return { ...position, width, height }
}

function createElementId(
  document: EpisodeDocument,
  prefix: string,
): { readonly id: string; readonly number: number } {
  let number = 1
  let id = `${prefix}-${number}`

  while (document.elements.some((element) => element.id === id)) {
    number += 1
    id = `${prefix}-${number}`
  }

  return { id, number }
}
