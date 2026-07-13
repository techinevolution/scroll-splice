import { clampElementPosition, type LogicalPosition } from './coordinates'
import type { EpisodeDocument } from './episode'

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
