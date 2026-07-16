import type { EpisodeDocument, OrdinaryLayerPlane } from './episode'

export type PopulatedPlaneDisposition =
  | { readonly kind: 'move-elements'; readonly targetLayerPlaneId: string }
  | { readonly kind: 'delete-elements' }

/**
 * Deletes an ordinary layer plane only when the caller has supplied an
 * explicit disposition for every placed element. Locked elements protect the
 * operation, and movement stays within the same composition group.
 */
export function deleteLayerPlaneWithDisposition(
  document: EpisodeDocument,
  layerPlaneId: string,
  disposition: PopulatedPlaneDisposition,
): EpisodeDocument {
  const plane = document.layerPlanes.find(
    (candidate): candidate is OrdinaryLayerPlane =>
      candidate.id === layerPlaneId && candidate.kind === 'ordinary',
  )

  if (!plane) return document

  const siblingPlanes = document.layerPlanes.filter(
    ({ compositionGroup }) => compositionGroup === plane.compositionGroup,
  )
  const elementsOnPlane = document.elements.filter(
    (element) => element.layerPlaneId === plane.id,
  )

  if (
    siblingPlanes.length <= 1 ||
    elementsOnPlane.some(({ locked }) => locked)
  ) {
    return document
  }

  let elements = document.elements
  let deletedElementIds = new Set<string>()

  if (elementsOnPlane.length > 0) {
    if (disposition.kind === 'move-elements') {
      const target = document.layerPlanes.find(
        ({ id }) => id === disposition.targetLayerPlaneId,
      )

      if (
        !target ||
        target.kind !== 'ordinary' ||
        target.id === plane.id ||
        target.compositionGroup !== plane.compositionGroup
      ) {
        return document
      }

      const highestTargetZ = document.elements.reduce(
        (highest, element) =>
          element.layerPlaneId === target.id
            ? Math.max(highest, element.zIndex)
            : highest,
        -1,
      )
      const movedZIndexById = new Map(
        [...elementsOnPlane]
          .sort((first, second) => first.zIndex - second.zIndex)
          .map((element, index) => [element.id, highestTargetZ + index + 1]),
      )

      elements = document.elements.map((element) =>
        element.layerPlaneId === plane.id
          ? {
              ...element,
              layerPlaneId: target.id,
              zIndex: movedZIndexById.get(element.id) ?? element.zIndex,
            }
          : element,
      )
    } else if (disposition.kind === 'delete-elements') {
      deletedElementIds = new Set(elementsOnPlane.map(({ id }) => id))
      elements = document.elements.filter(
        ({ id }) => !deletedElementIds.has(id),
      )
    } else {
      return document
    }
  }

  const layerPlanes = document.layerPlanes
    .filter(({ id }) => id !== plane.id)
    .map((candidate) =>
      candidate.compositionGroup === plane.compositionGroup &&
      candidate.order > plane.order
        ? { ...candidate, order: candidate.order - 1 }
        : candidate,
    )
  const elementGroups =
    deletedElementIds.size === 0
      ? document.elementGroups
      : document.elementGroups.flatMap((group) => {
          const memberElementIds = group.memberElementIds.filter(
            (id) => !deletedElementIds.has(id),
          )
          return memberElementIds.length >= 2
            ? [{ ...group, memberElementIds }]
            : []
        })

  return { ...document, layerPlanes, elements, elementGroups }
}
