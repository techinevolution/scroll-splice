import {
  clamp,
  clampElementPosition,
  type LogicalPosition,
} from './coordinates'
import {
  getBackgroundBaseLayerPlane,
  getLayerPlaneById,
  getLayerPlanesForGroup,
  type CompositionGroup,
  type ElementBounds,
  type EpisodeDocument,
  type EpisodeElement,
  type OrdinaryLayerPlane,
  type ShapeElement,
} from './episode'

export const DEFAULT_EPISODE_HEIGHT_INCREMENT = 1280
export const MIN_EPISODE_LOGICAL_HEIGHT = 1280
export const MIN_ELEMENT_SIZE = 24
export const MAX_EPISODE_NAME_LENGTH = 60
export const SYNTHETIC_SHAPE_GENERATOR_ID =
  'scrollsplice-editor-shape-v1'
export const BACKGROUND_COLOR_REGION_GENERATOR_ID =
  'scrollsplice-background-color-region-v1'

const MIN_TEXT_FONT_SIZE = 8

export interface CreateSyntheticShapeElementInput {
  readonly layerPlaneId: string
  readonly name: string
  readonly fill: string
  readonly bounds: ElementBounds
}

export interface CreateBackgroundColorRegionInput {
  readonly layerPlaneId: string
  readonly fill: string
  readonly startY: number
  readonly height: number
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

    const position = clampElementPosition(
      requestedPosition,
      element.bounds,
      document.logicalWidth,
      document.logicalHeight,
    )

    if (position.x === element.bounds.x && position.y === element.bounds.y) {
      return element
    }

    changed = true

    return {
      ...element,
      bounds: {
        ...element.bounds,
        ...position,
      },
    }
  })

  return changed ? { ...document, elements } : document
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

  if (isBackgroundColorRegion(element)) {
    const horizontal = resizeFreeformAxis(
      element.bounds.x,
      element.bounds.width,
      requestedBounds.x,
      requestedBounds.width,
      document.logicalWidth,
    )
    const vertical = resizeFreeformAxis(
      element.bounds.y,
      element.bounds.height,
      requestedBounds.y,
      requestedBounds.height,
      document.logicalHeight,
    )
    const bounds = {
      x: horizontal.start,
      y: vertical.start,
      width: horizontal.size,
      height: vertical.size,
    }

    if (
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
        candidate.id === element.id ? { ...candidate, bounds } : candidate,
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
  const maximumScale = Math.min(
    (keepsLeftEdge ? document.logicalWidth - element.bounds.x : currentRight) /
      element.bounds.width,
    (keepsTopEdge
      ? document.logicalHeight - element.bounds.y
      : currentBottom) / element.bounds.height,
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
  const position = clampElementPosition(
    {
      x: keepsLeftEdge ? element.bounds.x : currentRight - width,
      y: keepsTopEdge ? element.bounds.y : currentBottom - height,
    },
    { width, height },
    document.logicalWidth,
    document.logicalHeight,
  )
  const bounds = { ...position, width, height }
  const fontSize =
    element.type === 'text' ? element.fontSize * scale : undefined

  if (
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
        ? {
            ...candidate,
            bounds,
            ...(candidate.type === 'text' ? { fontSize } : {}),
          }
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
) {
  const currentEnd = currentStart + currentSize
  const requestedEnd = requestedStart + requestedSize
  const keepsStartEdge =
    Math.abs(requestedStart - currentStart) <=
    Math.abs(requestedEnd - currentEnd)
  const maximumSize = keepsStartEdge
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

export function deleteElement(
  document: EpisodeDocument,
  elementId: string,
): EpisodeDocument {
  const elements = document.elements.filter(
    (element) => element.id !== elementId,
  )

  return elements.length === document.elements.length
    ? document
    : { ...document, elements }
}

export function createSyntheticShapeElement(
  document: EpisodeDocument,
  input: CreateSyntheticShapeElementInput,
): EpisodeDocument {
  const layerPlane = getLayerPlaneById(document, input.layerPlaneId)
  const name = input.name.trim()
  const fill = input.fill.trim()

  if (
    !layerPlane ||
    layerPlane.kind !== 'ordinary' ||
    name.length === 0 ||
    fill.length === 0
  ) {
    return document
  }

  const bounds = clampNewElementBounds(document, input.bounds)

  if (!bounds) {
    return document
  }

  return appendSyntheticRectangle(document, {
    idPrefix: 'synthetic-shape',
    generatorId: SYNTHETIC_SHAPE_GENERATOR_ID,
    layerPlaneId: layerPlane.id,
    name,
    fill,
    bounds,
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

  return appendSyntheticRectangle(document, {
    idPrefix: 'background-color-region',
    generatorId: BACKGROUND_COLOR_REGION_GENERATOR_ID,
    layerPlaneId: layerPlane.id,
    name: (number) => `Background color region ${number}`,
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

interface AppendSyntheticRectangleInput {
  readonly idPrefix: string
  readonly generatorId: string
  readonly layerPlaneId: string
  readonly name: string | ((number: number) => string)
  readonly fill: string
  readonly bounds: ElementBounds
}

function appendSyntheticRectangle(
  document: EpisodeDocument,
  input: AppendSyntheticRectangleInput,
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
    shape: 'rectangle',
    bounds: input.bounds,
    fill: input.fill,
    opacity: 1,
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
