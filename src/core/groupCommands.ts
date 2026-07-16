import { duplicateElement } from './commands'
import { clampElementGeometry } from './elementGeometry'
import type {
  ElementGroup,
  EpisodeDocument,
  EpisodeElement,
} from './episode'
import type { LogicalPosition } from './coordinates'

export function getElementGroupByMember(
  document: EpisodeDocument,
  elementId: string,
): ElementGroup | undefined {
  return document.elementGroups.find(({ memberElementIds }) =>
    memberElementIds.includes(elementId),
  )
}

export function groupElements(
  document: EpisodeDocument,
  requestedElementIds: readonly string[],
): EpisodeDocument {
  const memberElementIds = getUniqueExistingIds(document, requestedElementIds)

  if (
    memberElementIds.length < 2 ||
    memberElementIds.some((elementId) =>
      document.elementGroups.some(({ memberElementIds: members }) =>
        members.includes(elementId),
      ),
    )
  ) {
    return document
  }

  const group: ElementGroup = {
    id: createGroupId(document),
    memberElementIds,
  }

  return { ...document, elementGroups: [...document.elementGroups, group] }
}

export function ungroupElements(
  document: EpisodeDocument,
  groupId: string,
): EpisodeDocument {
  const elementGroups = document.elementGroups.filter(({ id }) => id !== groupId)

  return elementGroups.length === document.elementGroups.length
    ? document
    : { ...document, elementGroups }
}

export function moveElementSelection(
  document: EpisodeDocument,
  requestedElementIds: readonly string[],
  delta: LogicalPosition,
): EpisodeDocument {
  if (!Number.isFinite(delta.x) || !Number.isFinite(delta.y)) return document

  const elements = getUniqueExistingElements(document, requestedElementIds)

  if (elements.length === 0 || elements.some(({ locked }) => locked)) {
    return document
  }

  const permitted = elements.map((element) => {
    const bounds = clampElementGeometry(
      {
        ...element.bounds,
        x: element.bounds.x + delta.x,
        y: element.bounds.y + delta.y,
      },
      element.transform,
      element.overflow,
      { width: document.logicalWidth, height: document.logicalHeight },
    )

    return bounds
      ? { x: bounds.x - element.bounds.x, y: bounds.y - element.bounds.y }
      : { x: 0, y: 0 }
  })
  const actualDelta = {
    x: chooseCommonDelta(delta.x, permitted.map(({ x }) => x)),
    y: chooseCommonDelta(delta.y, permitted.map(({ y }) => y)),
  }

  if (actualDelta.x === 0 && actualDelta.y === 0) return document

  const selectedIds = new Set(elements.map(({ id }) => id))
  return {
    ...document,
    elements: document.elements.map((element) =>
      selectedIds.has(element.id)
        ? {
            ...element,
            bounds: {
              ...element.bounds,
              x: element.bounds.x + actualDelta.x,
              y: element.bounds.y + actualDelta.y,
            },
          }
        : element,
    ),
  }
}

export function deleteElementSelection(
  document: EpisodeDocument,
  requestedElementIds: readonly string[],
): EpisodeDocument {
  const elements = getUniqueExistingElements(document, requestedElementIds)

  if (elements.length === 0 || elements.some(({ locked }) => locked)) {
    return document
  }

  const deletedIds = new Set(elements.map(({ id }) => id))
  return {
    ...document,
    elements: document.elements.filter(({ id }) => !deletedIds.has(id)),
    elementGroups: document.elementGroups.flatMap((group) => {
      const memberElementIds = group.memberElementIds.filter(
        (elementId) => !deletedIds.has(elementId),
      )
      return memberElementIds.length >= 2 ? [{ ...group, memberElementIds }] : []
    }),
  }
}

export function setElementSelectionLocked(
  document: EpisodeDocument,
  requestedElementIds: readonly string[],
  locked: boolean,
): EpisodeDocument {
  const elements = getUniqueExistingElements(document, requestedElementIds)

  if (elements.length === 0 || elements.every((element) => element.locked === locked)) {
    return document
  }

  const selectedIds = new Set(elements.map(({ id }) => id))
  return {
    ...document,
    elements: document.elements.map((element) =>
      selectedIds.has(element.id) ? { ...element, locked } : element,
    ),
  }
}

export function moveElementSelectionToLayerPlane(
  document: EpisodeDocument,
  requestedElementIds: readonly string[],
  targetLayerPlaneId: string,
): EpisodeDocument {
  const target = document.layerPlanes.find(
    ({ id, kind }) => id === targetLayerPlaneId && kind === 'ordinary',
  )
  const elements = getUniqueExistingElements(document, requestedElementIds)

  if (
    !target ||
    elements.length === 0 ||
    elements.some(({ locked }) => locked) ||
    elements.every(({ layerPlaneId }) => layerPlaneId === target.id)
  ) {
    return document
  }

  const selectedIds = new Set(elements.map(({ id }) => id))
  const highestTargetZ = document.elements.reduce(
    (highest, element) =>
      element.layerPlaneId === target.id && !selectedIds.has(element.id)
        ? Math.max(highest, element.zIndex)
        : highest,
    -1,
  )
  const zIndexById = new Map(
    [...elements]
      .sort((first, second) => first.zIndex - second.zIndex || first.id.localeCompare(second.id))
      .map((element, index) => [element.id, highestTargetZ + index + 1]),
  )

  return {
    ...document,
    elements: document.elements.map((element) =>
      selectedIds.has(element.id)
        ? {
            ...element,
            layerPlaneId: target.id,
            zIndex: zIndexById.get(element.id) ?? element.zIndex,
          }
        : element,
    ),
  }
}

export function duplicateElementSelection(
  document: EpisodeDocument,
  requestedElementIds: readonly string[],
  offset: LogicalPosition = { x: 24, y: 24 },
): EpisodeDocument {
  const elements = getUniqueExistingElements(document, requestedElementIds)

  if (
    elements.length === 0 ||
    elements.some(({ locked }) => locked) ||
    !Number.isFinite(offset.x) ||
    !Number.isFinite(offset.y)
  ) {
    return document
  }

  let nextDocument = document
  const duplicateIdByOriginal = new Map<string, string>()

  for (const element of elements) {
    const previousIds = new Set(nextDocument.elements.map(({ id }) => id))
    const duplicated = duplicateElement(nextDocument, element.id, offset)
    const copy = duplicated.elements.find(({ id }) => !previousIds.has(id))

    if (!copy) return document

    duplicateIdByOriginal.set(element.id, copy.id)
    nextDocument = duplicated
  }

  const duplicatedGroups: ElementGroup[] = []

  for (const group of document.elementGroups) {
    const memberElementIds = group.memberElementIds.map((elementId) =>
      duplicateIdByOriginal.get(elementId),
    )

    if (memberElementIds.every(
      (elementId): elementId is string => elementId !== undefined,
    )) {
      duplicatedGroups.push({
        id: createGroupId({
          ...nextDocument,
          elementGroups: [...nextDocument.elementGroups, ...duplicatedGroups],
        }),
        memberElementIds,
      })
    }
  }

  return duplicatedGroups.length > 0
    ? {
        ...nextDocument,
        elementGroups: [...nextDocument.elementGroups, ...duplicatedGroups],
      }
    : nextDocument
}

function getUniqueExistingIds(
  document: EpisodeDocument,
  requestedElementIds: readonly string[],
): readonly string[] {
  const existingIds = new Set(document.elements.map(({ id }) => id))
  return [...new Set(requestedElementIds)].filter((id) => existingIds.has(id))
}

function getUniqueExistingElements(
  document: EpisodeDocument,
  requestedElementIds: readonly string[],
): readonly EpisodeElement[] {
  const selectedIds = new Set(getUniqueExistingIds(document, requestedElementIds))
  return document.elements.filter(({ id }) => selectedIds.has(id))
}

function chooseCommonDelta(
  requestedDelta: number,
  permittedDeltas: readonly number[],
): number {
  if (requestedDelta > 0) return Math.min(...permittedDeltas)
  if (requestedDelta < 0) return Math.max(...permittedDeltas)
  return 0
}

function createGroupId(document: EpisodeDocument): string {
  let number = 1
  let id = `group-${number}`

  while (document.elementGroups.some((group) => group.id === id)) {
    number += 1
    id = `group-${number}`
  }

  return id
}
