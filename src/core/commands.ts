import { clampElementPosition, type LogicalPosition } from './coordinates'
import {
  getBackgroundBaseLayerPlane,
  getLayerPlaneById,
  getLayerPlanesForGroup,
  type CompositionGroup,
  type EpisodeDocument,
  type OrdinaryLayerPlane,
} from './episode'

export const DEFAULT_EPISODE_HEIGHT_INCREMENT = 1280
export const MAX_EPISODE_NAME_LENGTH = 60

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

  return { ...document, logicalHeight }
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
