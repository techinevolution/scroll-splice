import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react'

import { useEditorStore } from '../app/store'
import {
  ASSET_DRAG_MIME_TYPE,
  parseAssetDragPayload,
} from '../assets/dragPayload'
import { resolveImageAsset } from '../assets/runtime'
import { VisibilityIcon } from '../components/VisibilityIcon'
import { isElementFreeformResizable } from '../core/commands'
import {
  COMPOSITION_GROUPS,
  COMPOSITION_GROUP_LABELS,
  getLayerPlaneById,
  getLayerPlanesForGroup,
  isElementEffectivelyVisible,
  type ElementBounds,
} from '../core/episode'
import { LayerPlaneTabs } from './LayerPlaneTabs'

const LAYER_ELEMENT_DRAG_MIME_TYPE =
  'application/x-scrollsplice-layer-element'

function TrashIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="m6 7 1 13h10l1-13" />
      <path d="M10 11v5M14 11v5" />
    </svg>
  )
}

function PaperclipIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m21.4 11.6-8.5 8.5a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 1 1-2.8-2.8l8.5-8.5" />
    </svg>
  )
}

function TextIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 5h14M12 5v14M8 19h8" />
    </svg>
  )
}

function LockIcon({ locked }: { readonly locked: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="5" y="10" width="14" height="10" rx="2" />
      {locked ? (
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      ) : (
        <path d="M16 10V7a4 4 0 0 0-7.6-1.7" />
      )}
    </svg>
  )
}

function ShapeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="4" width="13" height="12" rx="1" />
      <circle cx="16" cy="15" r="5" />
    </svg>
  )
}

function CommitNumberInput({
  label,
  value,
  minimum,
  onCommit,
}: {
  readonly label: string
  readonly value: number
  readonly minimum?: number
  readonly onCommit: (value: number) => void
}) {
  const [draft, setDraft] = useState(String(Math.round(value)))

  const commit = () => {
    const nextValue = Number(draft)

    if (Number.isFinite(nextValue) && (minimum === undefined || nextValue >= minimum)) {
      onCommit(nextValue)
    } else {
      setDraft(String(Math.round(value)))
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.blur()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setDraft(String(Math.round(value)))
      event.currentTarget.blur()
    }
  }

  return (
    <label>
      <span>{label}</span>
      <input
        type="number"
        aria-label={`Selected element ${label}`}
        min={minimum}
        step="1"
        value={draft}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
    </label>
  )
}

function CommitTextInput({
  value,
  maximumLength,
  onCommit,
}: {
  readonly value: string
  readonly maximumLength: number
  readonly onCommit: (value: string) => string
}) {
  const [draft, setDraft] = useState(value)

  const commit = () => setDraft(onCommit(draft))

  return (
    <input
      value={draft}
      maxLength={maximumLength}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          event.currentTarget.blur()
        } else if (event.key === 'Escape') {
          event.preventDefault()
          setDraft(value)
          event.currentTarget.blur()
        }
      }}
    />
  )
}

export function LayersPanel() {
  const elements = useEditorStore((state) => state.episode.elements)
  const episode = useEditorStore((state) => state.episode)
  const importedImageAssets = useEditorStore(
    (state) => state.importedImageAssets,
  )
  const activeCompositionGroup = useEditorStore(
    (state) => state.activeCompositionGroup,
  )
  const activeLayerPlaneId = useEditorStore(
    (state) => state.activeLayerPlaneId,
  )
  const selectedElementId = useEditorStore((state) => state.selectedElementId)
  const selectedElementIds = useEditorStore((state) => state.selectedElementIds)
  const selectElement = useEditorStore((state) => state.selectElement)
  const selectAllInActivePlane = useEditorStore(
    (state) => state.selectAllInActivePlane,
  )
  const groupSelectedElements = useEditorStore(
    (state) => state.groupSelectedElements,
  )
  const ungroupSelectedElements = useEditorStore(
    (state) => state.ungroupSelectedElements,
  )
  const moveSelectedStoryBeat = useEditorStore(
    (state) => state.moveSelectedStoryBeat,
  )
  const deleteLayerPlane = useEditorStore((state) => state.deleteLayerPlane)
  const deleteElement = useEditorStore((state) => state.deleteElement)
  const setElementName = useEditorStore((state) => state.setElementName)
  const toggleElementLocked = useEditorStore(
    (state) => state.toggleElementLocked,
  )
  const duplicateElement = useEditorStore((state) => state.duplicateElement)
  const alignSelectedElement = useEditorStore(
    (state) => state.alignSelectedElement,
  )
  const moveElement = useEditorStore((state) => state.moveElement)
  const resizeElement = useEditorStore((state) => state.resizeElement)
  const setElementOverflow = useEditorStore(
    (state) => state.setElementOverflow,
  )
  const openAssetPanel = useEditorStore((state) => state.openAssetPanel)
  const createBackgroundColorRegion = useEditorStore(
    (state) => state.createBackgroundColorRegion,
  )
  const viewportY = useEditorStore((state) => state.viewportY)
  const setBaseColor = useEditorStore((state) => state.setBaseColor)
  const setElementVisibility = useEditorStore(
    (state) => state.setElementVisibility,
  )
  const moveElementInStack = useEditorStore(
    (state) => state.moveElementInStack,
  )
  const reorderElementInStack = useEditorStore(
    (state) => state.reorderElementInStack,
  )
  const moveElementToLayerPlane = useEditorStore(
    (state) => state.moveElementToLayerPlane,
  )
  const createTextElement = useEditorStore((state) => state.createTextElement)
  const placeDraggedAssetOnPlane = useEditorStore(
    (state) => state.placeDraggedAssetOnPlane,
  )
  const reportAssetDropError = useEditorStore(
    (state) => state.reportAssetDropError,
  )
  const selectedLayerRef = useRef<HTMLButtonElement>(null)
  const layersListRef = useRef<HTMLUListElement>(null)
  const [showColorRegionForm, setShowColorRegionForm] = useState(false)
  const [showShapeForm, setShowShapeForm] = useState(false)
  const [assetListDropActive, setAssetListDropActive] = useState(false)
  const [colorRegionFill, setColorRegionFill] = useState('#7B5CC7')
  const [colorRegionStart, setColorRegionStart] = useState('0')
  const [colorRegionHeight, setColorRegionHeight] = useState('1280')
  const [moveTargetPlaneId, setMoveTargetPlaneId] = useState('')
  const [planeDeleteTargetId, setPlaneDeleteTargetId] = useState('')
  const [shapeKind, setShapeKind] = useState<'rectangle' | 'ellipse'>(
    'rectangle',
  )
  const [shapeName, setShapeName] = useState('Panel')
  const [shapeFill, setShapeFill] = useState('#FFFFFF')
  const [shapeStroke, setShapeStroke] = useState('#211A2B')
  const [shapeStrokeWidth, setShapeStrokeWidth] = useState('8')
  const [shapeCornerRadius, setShapeCornerRadius] = useState('0')
  const [draggingElementId, setDraggingElementId] = useState<string | null>(
    null,
  )
  const [elementDropTargetId, setElementDropTargetId] = useState<string | null>(
    null,
  )
  const activeLayerPlane = getLayerPlaneById(episode, activeLayerPlaneId)
  const activeGroupLayerPlanes = getLayerPlanesForGroup(
    episode,
    activeCompositionGroup,
  )

  const orderedElements = useMemo(
    () =>
      elements
        .filter(({ layerPlaneId }) => layerPlaneId === activeLayerPlaneId)
        .sort(
          (first, second) =>
            first.zIndex - second.zIndex || first.id.localeCompare(second.id),
        ),
    [activeLayerPlaneId, elements],
  )
  const selectedElement = useMemo(
    () => elements.find(({ id }) => id === selectedElementId),
    [elements, selectedElementId],
  )
  const selectedElements = useMemo(
    () => elements.filter(({ id }) => selectedElementIds.includes(id)),
    [elements, selectedElementIds],
  )
  const selectedGroup = selectedElement
    ? episode.elementGroups.find(({ memberElementIds }) =>
        memberElementIds.includes(selectedElement.id),
      )
    : undefined
  const selectedContainsGroupedElement = selectedElements.some((element) =>
    episode.elementGroups.some(({ memberElementIds }) =>
      memberElementIds.includes(element.id),
    ),
  )
  const canGroupSelection =
    selectedElements.length >= 2 && !selectedContainsGroupedElement
  const selectionHasLockedElement = selectedElements.some(({ locked }) => locked)
  const localStackElements = useMemo(
    () =>
      elements
        .filter(({ layerPlaneId }) => layerPlaneId === activeLayerPlaneId)
        .sort(
          (first, second) =>
            first.zIndex - second.zIndex || first.id.localeCompare(second.id),
        ),
    [activeLayerPlaneId, elements],
  )
  const selectedStackIndex = selectedElement
    ? localStackElements.findIndex(({ id }) => id === selectedElement.id)
    : -1
  const canSendSelectedBackward =
    selectedStackIndex > 0 && !selectedElement?.locked
  const canBringSelectedForward =
    !selectedElement?.locked &&
    selectedStackIndex >= 0 &&
    selectedStackIndex < localStackElements.length - 1
  const ordinaryPlaneOptions = useMemo(
    () =>
      COMPOSITION_GROUPS.flatMap((compositionGroup) =>
        getLayerPlanesForGroup(episode, compositionGroup)
          .filter((layerPlane) => layerPlane.kind === 'ordinary')
          .map((layerPlane) => ({
            id: layerPlane.id,
            label: `${COMPOSITION_GROUP_LABELS[compositionGroup]} plane ${layerPlane.order}${layerPlane.name ? ` — ${layerPlane.name}` : ''}`,
          })),
      ),
    [episode],
  )
  const availableMoveTargets = useMemo(
    () =>
      selectedElements.length > 0
        ? ordinaryPlaneOptions.filter(
            ({ id }) =>
              !selectedElements.every(({ layerPlaneId }) => layerPlaneId === id),
          )
        : [],
    [ordinaryPlaneOptions, selectedElements],
  )
  const resolvedMoveTargetPlaneId = availableMoveTargets.some(
    ({ id }) => id === moveTargetPlaneId,
  )
    ? moveTargetPlaneId
    : (availableMoveTargets[0]?.id ?? '')
  const groupLabel = COMPOSITION_GROUP_LABELS[activeCompositionGroup]
  const isGroupVisible =
    episode.compositionGroupVisibility[activeCompositionGroup]
  const planeLabel = activeLayerPlane
    ? `${groupLabel} plane ${activeLayerPlane.order}`
    : `${groupLabel} plane`
  const isEmptyPlane = activeLayerPlane && orderedElements.length === 0
  const canHoldElements = activeLayerPlane?.kind === 'ordinary'
  const canAddColorRegion =
    canHoldElements && activeLayerPlane.compositionGroup === 'background'
  const canDeleteEmptyPlane =
    activeLayerPlane?.kind === 'ordinary' &&
    orderedElements.length === 0 &&
    activeGroupLayerPlanes.length > 1
  const populatedPlaneMoveTargets = activeGroupLayerPlanes.filter(
    ({ id, kind }) => id !== activeLayerPlaneId && kind === 'ordinary',
  )
  const resolvedPlaneDeleteTargetId = populatedPlaneMoveTargets.some(
    ({ id }) => id === planeDeleteTargetId,
  )
    ? planeDeleteTargetId
    : (populatedPlaneMoveTargets[0]?.id ?? '')
  const canDeletePopulatedPlane =
    activeLayerPlane?.kind === 'ordinary' &&
    orderedElements.length > 0 &&
    activeGroupLayerPlanes.length > 1 &&
    orderedElements.every(({ locked }) => !locked)
  const deleteExplanation =
    activeLayerPlane?.kind === 'base'
      ? 'Background plane 1 is pinned and cannot be deleted.'
      : activeGroupLayerPlanes.length <= 1
        ? `${groupLabel} must keep at least one plane.`
        : 'This plane is empty and can be safely deleted.'
  const deleteAccessibleLabel = canDeleteEmptyPlane
    ? `Delete ${planeLabel}`
    : `Delete plane unavailable: ${deleteExplanation}`

  useEffect(() => {
    if (selectedElementId) {
      selectedLayerRef.current?.scrollIntoView({ block: 'nearest' })
    } else {
      layersListRef.current?.scrollTo({ top: 0 })
    }
  }, [activeLayerPlaneId, selectedElementId])

  const handleCreateColorRegion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const startY = Number(colorRegionStart)
    const height = Number(colorRegionHeight)

    if (
      colorRegionStart.trim() === '' ||
      colorRegionHeight.trim() === '' ||
      !Number.isFinite(startY) ||
      !Number.isFinite(height) ||
      startY < 0 ||
      height <= 0
    ) {
      return
    }

    const created = createBackgroundColorRegion({
      fill: colorRegionFill,
      startY,
      height,
    })

    if (created) {
      setShowColorRegionForm(false)
    }
  }

  const handleCreateShape = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const strokeWidth = Number(shapeStrokeWidth)
    const cornerRadius = Number(shapeCornerRadius)

    if (
      shapeName.trim() === '' ||
      !Number.isFinite(strokeWidth) ||
      strokeWidth < 0 ||
      !Number.isFinite(cornerRadius) ||
      cornerRadius < 0
    ) {
      return
    }

    useEditorStore.getState().placeSyntheticAsset({
      name: shapeName,
      shape: shapeKind,
      fill: shapeFill,
      stroke: shapeStroke,
      strokeWidth,
      cornerRadius,
    })
    setShowShapeForm(false)
  }

  const updateSelectedBounds = (
    property: keyof ElementBounds,
    value: number,
  ) => {
    if (!selectedElement || selectedElement.locked) return

    if (property === 'x' || property === 'y') {
      moveElement(selectedElement.id, {
        x: property === 'x' ? value : selectedElement.bounds.x,
        y: property === 'y' ? value : selectedElement.bounds.y,
      })
      return
    }

    const aspectRatio = selectedElement.bounds.width / selectedElement.bounds.height
    const isFreeformResizable = isElementFreeformResizable(selectedElement)
    const bounds =
      property === 'width'
        ? {
            ...selectedElement.bounds,
            width: value,
            height: isFreeformResizable
              ? selectedElement.bounds.height
              : value / aspectRatio,
          }
        : {
            ...selectedElement.bounds,
            width: isFreeformResizable
              ? selectedElement.bounds.width
              : value * aspectRatio,
            height: value,
          }

    resizeElement(selectedElement.id, bounds)
  }

  const handleAssetListDragOver = (event: DragEvent<HTMLUListElement>) => {
    if (
      !canHoldElements ||
      !Array.from(event.dataTransfer.types).includes(ASSET_DRAG_MIME_TYPE)
    ) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setAssetListDropActive(true)
  }

  const handleAssetListDragLeave = (event: DragEvent<HTMLUListElement>) => {
    const nextTarget = event.relatedTarget

    if (
      nextTarget instanceof Node &&
      event.currentTarget.contains(nextTarget)
    ) {
      return
    }

    setAssetListDropActive(false)
  }

  const handleAssetListDrop = (event: DragEvent<HTMLUListElement>) => {
    if (
      !Array.from(event.dataTransfer.types).includes(ASSET_DRAG_MIME_TYPE)
    ) {
      return
    }

    event.preventDefault()
    setAssetListDropActive(false)
    const payload = parseAssetDragPayload(
      event.dataTransfer.getData(ASSET_DRAG_MIME_TYPE),
    )

    if (!payload || !canHoldElements || !activeLayerPlane) {
      reportAssetDropError(
        'Drop a valid Asset Library item on an ordinary numbered plane.',
      )
      return
    }

    placeDraggedAssetOnPlane(payload, activeLayerPlane.id)
  }

  const handleElementDragStart = (
    event: DragEvent<HTMLButtonElement>,
    elementId: string,
  ) => {
    event.stopPropagation()
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData(LAYER_ELEMENT_DRAG_MIME_TYPE, elementId)
    setDraggingElementId(elementId)
  }

  const clearElementDrag = () => {
    setDraggingElementId(null)
    setElementDropTargetId(null)
  }

  const handleElementDrop = (
    event: DragEvent<HTMLLIElement>,
    targetElementId: string,
  ) => {
    const sourceElementId =
      event.dataTransfer.getData(LAYER_ELEMENT_DRAG_MIME_TYPE) ||
      draggingElementId

    if (!sourceElementId || sourceElementId === targetElementId) {
      clearElementDrag()
      return
    }

    const targetIndex = localStackElements.findIndex(
      ({ id }) => id === targetElementId,
    )

    if (targetIndex >= 0) {
      event.preventDefault()
      reorderElementInStack(sourceElementId, targetIndex)
    }

    clearElementDrag()
  }

  return (
    <section className="panel-card layers-card" aria-labelledby="layers-heading">
      <header className="panel-heading">
        <h2 id="layers-heading">Layers · {groupLabel}</h2>
        <span className="panel-count">{orderedElements.length}</span>
      </header>

      <LayerPlaneTabs />

      {!isGroupVisible ? (
        <p className="visibility-note" role="status">
          {groupLabel} is hidden. Plane and element eye settings are preserved.
        </p>
      ) : null}

      {isGroupVisible && activeLayerPlane && !activeLayerPlane.visible ? (
        <p className="visibility-note" role="status">
          {planeLabel} is hidden. Its elements remain editable here.
        </p>
      ) : null}

      {activeLayerPlane?.kind === 'base' ? (
        <label className="base-color-control">
          <span>
            <strong>Base Color</strong>
            <small>Full Episode</small>
          </span>
          <input
            type="color"
            aria-label="Base color"
            value={activeLayerPlane.baseColor}
            onChange={(event) => setBaseColor(event.currentTarget.value)}
          />
        </label>
      ) : null}

      {canHoldElements ? (
        <div className="plane-element-actions" aria-label={`${planeLabel} add actions`}>
          {canAddColorRegion ? (
            <button
              type="button"
              aria-expanded={showColorRegionForm}
              onClick={() => {
                setColorRegionStart(String(Math.round(viewportY)))
                setColorRegionHeight(
                  String(
                    Math.max(
                      Math.min(1280, episode.logicalHeight - viewportY),
                      1,
                    ),
                  ),
                )
                setShowColorRegionForm((isOpen) => !isOpen)
              }}
            >
              <span aria-hidden="true">▰</span>
              <span>Color Region</span>
            </button>
          ) : null}
          <button
            type="button"
            aria-expanded={showShapeForm}
            onClick={() => setShowShapeForm((isOpen) => !isOpen)}
          >
            <ShapeIcon />
            <span>Panel / Shape</span>
          </button>
        </div>
      ) : null}

      {canAddColorRegion && showColorRegionForm ? (
        <form className="color-region-form" onSubmit={handleCreateColorRegion}>
          <label>
            <span>Color</span>
            <input
              type="color"
              aria-label="Color region color"
              value={colorRegionFill}
              onChange={(event) => setColorRegionFill(event.currentTarget.value)}
            />
          </label>
          <label>
            <span>Start</span>
            <input
              type="number"
              aria-label="Color region start"
              min="0"
              max={episode.logicalHeight}
              step="1"
              required
              value={colorRegionStart}
              onChange={(event) => setColorRegionStart(event.currentTarget.value)}
            />
          </label>
          <label>
            <span>Length</span>
            <input
              type="number"
              aria-label="Color region length"
              min="1"
              max={episode.logicalHeight}
              step="1"
              required
              value={colorRegionHeight}
              onChange={(event) => setColorRegionHeight(event.currentTarget.value)}
            />
          </label>
          <button type="submit">Add</button>
        </form>
      ) : null}

      {canHoldElements && showShapeForm ? (
        <form className="shape-create-form" onSubmit={handleCreateShape}>
          <label>
            <span>Type</span>
            <select
              value={shapeKind}
              onChange={(event) =>
                setShapeKind(
                  event.currentTarget.value === 'ellipse'
                    ? 'ellipse'
                    : 'rectangle',
                )
              }
            >
              <option value="rectangle">Panel</option>
              <option value="ellipse">Ellipse</option>
            </select>
          </label>
          <label className="shape-name-field">
            <span>Name</span>
            <input
              value={shapeName}
              maxLength={80}
              onChange={(event) => setShapeName(event.currentTarget.value)}
            />
          </label>
          <label>
            <span>Fill</span>
            <input
              type="color"
              value={shapeFill}
              onChange={(event) => setShapeFill(event.currentTarget.value)}
            />
          </label>
          <label>
            <span>Line</span>
            <input
              type="color"
              value={shapeStroke}
              onChange={(event) => setShapeStroke(event.currentTarget.value)}
            />
          </label>
          <label>
            <span>Width</span>
            <input
              type="number"
              min="0"
              max="100"
              value={shapeStrokeWidth}
              onChange={(event) => setShapeStrokeWidth(event.currentTarget.value)}
            />
          </label>
          <label>
            <span>Corners</span>
            <input
              type="number"
              min="0"
              value={shapeCornerRadius}
              disabled={shapeKind === 'ellipse'}
              onChange={(event) => setShapeCornerRadius(event.currentTarget.value)}
            />
          </label>
          <button type="submit">Add</button>
        </form>
      ) : null}

      {isEmptyPlane ? (
        <div className="layer-empty-state">
          <p id="empty-plane-action-explanation">{deleteExplanation}</p>
          <div className="layer-empty-actions">
            <button
              className="layer-empty-action layer-empty-delete"
              type="button"
              disabled={!canDeleteEmptyPlane}
              aria-label={deleteAccessibleLabel}
              aria-describedby="empty-plane-action-explanation"
              title={deleteAccessibleLabel}
              onClick={() => deleteLayerPlane(activeLayerPlane.id)}
            >
              <TrashIcon />
              <span>Delete Plane</span>
            </button>
            <button
              className="layer-empty-action layer-empty-attach"
              type="button"
              disabled={!canHoldElements}
              aria-label={
                canHoldElements
                  ? `Add asset to ${planeLabel}`
                  : 'Add asset unavailable: Background plane 1 is the full-episode base color'
              }
              title={
                canHoldElements
                  ? 'Open the Asset Library'
                  : 'Select an ordinary numbered plane to add an element'
              }
              onClick={openAssetPanel}
            >
              <PaperclipIcon />
              <span>Add Asset</span>
            </button>
            <button
              className="layer-empty-action layer-empty-text"
              type="button"
              disabled={!canHoldElements}
              aria-label={
                canHoldElements
                  ? `Add text to ${planeLabel}`
                  : 'Add text unavailable: Background plane 1 is the full-episode base color'
              }
              title={
                canHoldElements
                  ? `Add text to ${planeLabel}`
                  : 'Select an ordinary numbered plane to add text'
              }
              onClick={() => createTextElement()}
            >
              <TextIcon />
              <span>Add Text</span>
            </button>
          </div>
        </div>
      ) : null}

      {orderedElements.length > 0 ? (
        <div className="layer-selection-tools" aria-label="Layer selection tools">
          <button type="button" onClick={selectAllInActivePlane}>
            Select all in plane
          </button>
          <span aria-live="polite">
            {selectedElementIds.length > 1
              ? `${selectedElementIds.length} selected`
              : selectedElementIds.length === 1
                ? '1 selected'
                : 'None selected'}
          </span>
        </div>
      ) : null}

      <ul
        ref={layersListRef}
        className={`layers-list${assetListDropActive ? ' is-asset-drop-target' : ''}`}
        aria-label={`${planeLabel} elements`}
        data-testid="layer-elements-list"
        onDragOver={handleAssetListDragOver}
        onDragLeave={handleAssetListDragLeave}
        onDrop={handleAssetListDrop}
      >
        {orderedElements.map((element) => {
          const isSelected = selectedElementIds.includes(element.id)
          const isPrimarySelected = element.id === selectedElementId
          const elementGroup = episode.elementGroups.find(
            ({ memberElementIds }) => memberElementIds.includes(element.id),
          )
          const isEffectivelyVisible = isElementEffectivelyVisible(
            episode,
            element,
          )
          const resolvedImageAsset =
            element.type === 'image'
              ? resolveImageAsset(
                  element.assetReference,
                  importedImageAssets,
                )
              : undefined
          const isImageSourceMissing =
            element.type === 'image' && !resolvedImageAsset
          const typeIcon =
            element.type === 'text'
              ? 'T'
              : element.type === 'image'
                ? '▧'
                : '◆'

          return (
            <li
              className={`layer-list-item${isEffectivelyVisible ? '' : ' is-hidden'}${draggingElementId === element.id ? ' is-dragging' : ''}${elementDropTargetId === element.id ? ' is-element-drop-target' : ''}`}
              key={element.id}
              data-element-type={element.type}
              data-element-group-id={elementGroup?.id}
              data-image-source-status={
                element.type === 'image'
                  ? isImageSourceMissing
                    ? 'missing'
                    : 'resolved'
                  : undefined
              }
              onDragOver={(event) => {
                if (!draggingElementId || draggingElementId === element.id) {
                  return
                }

                event.preventDefault()
                event.stopPropagation()
                event.dataTransfer.dropEffect = 'move'
                setElementDropTargetId(element.id)
              }}
              onDragLeave={() => {
                if (elementDropTargetId === element.id) {
                  setElementDropTargetId(null)
                }
              }}
              onDrop={(event) => handleElementDrop(event, element.id)}
            >
              <button
                className="layer-element-drag-grip"
                type="button"
                draggable={!element.locked}
                disabled={element.locked}
                aria-label={`Reorder ${element.name} in its layer stack`}
                title={
                  element.locked
                    ? `Unlock ${element.name} before reordering it`
                    : 'Drag to change overlap order · Arrow keys move one step'
                }
                onDragStart={(event) =>
                  handleElementDragStart(event, element.id)
                }
                onDragEnd={clearElementDrag}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowUp') {
                    event.preventDefault()
                    moveElementInStack(element.id, 'backward')
                  } else if (event.key === 'ArrowDown') {
                    event.preventDefault()
                    moveElementInStack(element.id, 'forward')
                  }
                }}
              >
                <span aria-hidden="true">⠿</span>
              </button>
              <button
                ref={isPrimarySelected ? selectedLayerRef : undefined}
                className={`layer-row${isSelected ? ' is-selected' : ''}`}
                type="button"
                aria-pressed={isSelected}
                data-layer-id={element.id}
                title={
                  isImageSourceMissing
                    ? `${element.name}: image source is missing`
                    : undefined
                }
                onClick={(event) =>
                  selectElement(element.id, true, event.shiftKey)
                }
              >
                <span
                  className={`layer-type layer-type-${element.type}`}
                  aria-hidden="true"
                >
                  {typeIcon}
                </span>
                <span className="layer-name">
                  {element.name}
                  {elementGroup ? (
                    <span className="layer-group-badge" title="Grouped element">
                      G
                    </span>
                  ) : null}
                  {isImageSourceMissing ? (
                    <span className="sr-only">, image source missing</span>
                  ) : null}
                </span>
              </button>
              <button
                className="layer-lock"
                type="button"
                aria-label={`${element.locked ? 'Unlock' : 'Lock'} ${element.name}`}
                aria-pressed={element.locked}
                title={`${element.locked ? 'Unlock' : 'Lock'} ${element.name}`}
                onClick={() => toggleElementLocked(element.id)}
              >
                <LockIcon locked={element.locked} />
              </button>
              <button
                className="layer-eye"
                type="button"
                aria-label={`${element.name} visibility`}
                aria-pressed={element.visible}
                title={`${element.visible ? 'Hide' : 'Show'} ${element.name}`}
                onClick={() =>
                  setElementVisibility(element.id, !element.visible)
                }
              >
                <VisibilityIcon visible={element.visible} />
              </button>
              <button
                className="layer-delete"
                type="button"
                disabled={element.locked}
                aria-label={`Delete ${element.name}`}
                title={
                  element.locked
                    ? `Unlock ${element.name} before deleting it`
                    : `Delete ${element.name}`
                }
                onClick={() => deleteElement(element.id)}
              >
                <TrashIcon />
              </button>
            </li>
          )
        })}
      </ul>

      {activeLayerPlane?.kind === 'ordinary' && orderedElements.length > 0 ? (
        <details className="populated-plane-actions">
          <summary>Plane Options</summary>
          {activeGroupLayerPlanes.length <= 1 ? (
            <p>{groupLabel} must keep at least one plane.</p>
          ) : orderedElements.some(({ locked }) => locked) ? (
            <p>Unlock every element on this plane before deleting it.</p>
          ) : (
            <>
              <p>
                Move all {orderedElements.length} elements to another {groupLabel}{' '}
                plane, or permanently delete them with this plane.
              </p>
              <label>
                <span>Move Elements To</span>
                <select
                  value={resolvedPlaneDeleteTargetId}
                  disabled={populatedPlaneMoveTargets.length === 0}
                  onChange={(event) =>
                    setPlaneDeleteTargetId(event.currentTarget.value)
                  }
                >
                  {populatedPlaneMoveTargets.length === 0 ? (
                    <option value="">No Ordinary Destination Plane</option>
                  ) : null}
                  {populatedPlaneMoveTargets.map((plane) => (
                    <option key={plane.id} value={plane.id}>
                      Plane {plane.order}{plane.name ? ` — ${plane.name}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <div className="populated-plane-action-buttons">
                <button
                  type="button"
                  disabled={!canDeletePopulatedPlane || !resolvedPlaneDeleteTargetId}
                  onClick={() =>
                    deleteLayerPlane(activeLayerPlane.id, {
                      kind: 'move-elements',
                      targetLayerPlaneId: resolvedPlaneDeleteTargetId,
                    })
                  }
                >
                  Move &amp; delete plane
                </button>
                <button
                  className="danger-button"
                  type="button"
                  disabled={!canDeletePopulatedPlane}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete ${planeLabel} and its ${orderedElements.length} elements? This can be undone.`,
                      )
                    ) {
                      deleteLayerPlane(activeLayerPlane.id, {
                        kind: 'delete-elements',
                      })
                    }
                  }}
                >
                  Delete Plane &amp; Elements
                </button>
              </div>
            </>
          )}
        </details>
      ) : null}

      {selectedElement && selectedElement.type !== 'text' ? (
        <div
          className="selected-layer-management"
          aria-label={`${selectedElementIds.length} selected layer action${selectedElementIds.length === 1 ? '' : 's'}`}
          data-testid="selected-layer-management"
        >
          <div className="selection-organization-actions">
            <strong>
              {selectedElementIds.length > 1
                ? `${selectedElementIds.length} Elements Selected`
                : 'Selected Element'}
            </strong>
            <div>
              <button
                type="button"
                disabled={!canGroupSelection}
                title={
                  canGroupSelection
                    ? 'Keep these elements together for selection and movement'
                    : 'Select at least two ungrouped elements to group them'
                }
                onClick={groupSelectedElements}
              >
                Group
              </button>
              <button
                type="button"
                disabled={!selectedGroup}
                onClick={ungroupSelectedElements}
              >
                Ungroup
              </button>
            </div>
            <div>
              <button
                type="button"
                disabled={selectionHasLockedElement}
                onClick={() => moveSelectedStoryBeat('up')}
              >
                Move Up 128
              </button>
              <button
                type="button"
                disabled={selectionHasLockedElement}
                onClick={() => moveSelectedStoryBeat('down')}
              >
                Move Down 128
              </button>
            </div>
          </div>

          <form
            className="selected-element-name"
            onSubmit={(event) => {
              event.preventDefault()
              event.currentTarget.querySelector('input')?.blur()
            }}
          >
            <label>
              <span>Name</span>
              <CommitTextInput
                key={`${selectedElement.id}-${selectedElement.name}`}
                value={selectedElement.name}
                maximumLength={80}
                onCommit={(name) => {
                  setElementName(selectedElement.id, name)
                  return (
                    useEditorStore
                      .getState()
                      .episode.elements.find(({ id }) => id === selectedElement.id)
                      ?.name ?? selectedElement.name
                  )
                }}
              />
            </label>
          </form>

          <div className="selected-element-quick-actions">
            <button
              type="button"
              aria-pressed={selectedElement.locked}
              onClick={() => toggleElementLocked(selectedElement.id)}
            >
              <LockIcon locked={selectedElement.locked} />
              {selectedElement.locked ? 'Unlock Selection' : 'Lock Selection'}
            </button>
            <button
              type="button"
              disabled={selectionHasLockedElement}
              onClick={() => duplicateElement(selectedElement.id)}
            >
              Duplicate Selection
            </button>
          </div>

          <div className="selected-element-geometry" aria-label="Primary selected element geometry">
            <CommitNumberInput
              key={`${selectedElement.id}-x-${selectedElement.bounds.x}`}
              label="X"
              value={selectedElement.bounds.x}
              onCommit={(value) => updateSelectedBounds('x', value)}
            />
            <CommitNumberInput
              key={`${selectedElement.id}-y-${selectedElement.bounds.y}`}
              label="Y"
              value={selectedElement.bounds.y}
              onCommit={(value) => updateSelectedBounds('y', value)}
            />
            <CommitNumberInput
              key={`${selectedElement.id}-width-${selectedElement.bounds.width}`}
              label="W"
              value={selectedElement.bounds.width}
              minimum={24}
              onCommit={(value) => updateSelectedBounds('width', value)}
            />
            <CommitNumberInput
              key={`${selectedElement.id}-height-${selectedElement.bounds.height}`}
              label="H"
              value={selectedElement.bounds.height}
              minimum={24}
              onCommit={(value) => updateSelectedBounds('height', value)}
            />
          </div>

          <label className="selected-element-placement">
            <span>Canvas Placement</span>
            <select
              aria-label="Selected element canvas placement"
              value={selectedElement.overflow}
              disabled={selectedElement.locked || selectedElementIds.length > 1}
              onChange={(event) =>
                setElementOverflow(
                  selectedElement.id,
                  event.currentTarget.value === 'constrained'
                    ? 'constrained'
                    : 'bleed',
                )
              }
            >
              <option value="bleed">Allow Partial Outside</option>
              <option value="constrained">Keep Fully Inside</option>
            </select>
            <small>Outside portions are cropped in preview and export.</small>
          </label>

          <div className="selected-element-align" aria-label="Align selected element">
            <button type="button" disabled={selectedElement.locked || selectedElementIds.length > 1} onClick={() => alignSelectedElement({ horizontal: 'left' })}>Left</button>
            <button type="button" disabled={selectedElement.locked || selectedElementIds.length > 1} onClick={() => alignSelectedElement({ horizontal: 'center' })}>Center</button>
            <button type="button" disabled={selectedElement.locked || selectedElementIds.length > 1} onClick={() => alignSelectedElement({ horizontal: 'right' })}>Right</button>
            <button type="button" disabled={selectedElement.locked || selectedElementIds.length > 1} onClick={() => alignSelectedElement({ vertical: 'top' })}>Top</button>
            <button type="button" disabled={selectedElement.locked || selectedElementIds.length > 1} onClick={() => alignSelectedElement({ vertical: 'middle' })}>Middle</button>
            <button type="button" disabled={selectedElement.locked || selectedElementIds.length > 1} onClick={() => alignSelectedElement({ vertical: 'bottom' })}>Bottom</button>
          </div>

          <div className="selected-layer-stack-actions">
            <button
              type="button"
              disabled={!canSendSelectedBackward || selectedElementIds.length > 1}
              aria-label={`Send ${selectedElement.name} backward`}
              title={
                selectedElement.locked
                  ? 'Unlock this element before changing its stack position'
                  : canSendSelectedBackward
                  ? 'Move one step behind within this plane'
                  : 'Already at the back of this plane'
              }
              onClick={() =>
                moveElementInStack(selectedElement.id, 'backward')
              }
            >
              Send Backward
            </button>
            <button
              type="button"
              disabled={!canBringSelectedForward || selectedElementIds.length > 1}
              aria-label={`Bring ${selectedElement.name} forward`}
              title={
                selectedElement.locked
                  ? 'Unlock this element before changing its stack position'
                  : canBringSelectedForward
                  ? 'Move one step forward within this plane'
                  : 'Already at the front of this plane'
              }
              onClick={() =>
                moveElementInStack(selectedElement.id, 'forward')
              }
            >
              Bring Forward
            </button>
          </div>

          <form
            className="move-element-to-plane"
            onSubmit={(event) => {
              event.preventDefault()
              if (resolvedMoveTargetPlaneId) {
                moveElementToLayerPlane(
                  selectedElement.id,
                  resolvedMoveTargetPlaneId,
                )
              }
            }}
          >
            <label>
              <span>Move To Plane</span>
              <select
                value={resolvedMoveTargetPlaneId}
                disabled={
                  availableMoveTargets.length === 0 || selectionHasLockedElement
                }
                aria-label={`Destination plane for ${selectedElement.name}`}
                title={
                  selectionHasLockedElement
                    ? 'Unlock the selection before moving it to another plane'
                    : undefined
                }
                data-testid="move-element-plane-select"
                onChange={(event) =>
                  setMoveTargetPlaneId(event.currentTarget.value)
                }
              >
                {availableMoveTargets.length === 0 ? (
                  <option value="">No Other Ordinary Planes</option>
                ) : null}
                {availableMoveTargets.map((layerPlane) => (
                  <option value={layerPlane.id} key={layerPlane.id}>
                    {layerPlane.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={!resolvedMoveTargetPlaneId || selectionHasLockedElement}
              title={
                selectionHasLockedElement
                  ? 'Unlock the selection before moving it to another plane'
                  : 'Move the selected elements to the chosen plane'
              }
              data-testid="move-element-plane-submit"
            >
              Move
            </button>
          </form>
        </div>
      ) : null}

      {canHoldElements && !isEmptyPlane ? (
        <div
          className="plane-element-actions plane-element-footer"
          aria-label={`${planeLabel} element actions`}
        >
          <button
            type="button"
            onClick={openAssetPanel}
            title="Open the Asset Library"
          >
            <PaperclipIcon />
            <span>Add Asset</span>
          </button>
          <button
            type="button"
            onClick={() => createTextElement()}
            title={`Add text to ${planeLabel}`}
          >
            <TextIcon />
            <span>Add Text</span>
          </button>
          <button
            type="button"
            onClick={() => setShowShapeForm((isOpen) => !isOpen)}
            title={`Add a panel or shape to ${planeLabel}`}
          >
            <ShapeIcon />
            <span>Panel</span>
          </button>
        </div>
      ) : null}
    </section>
  )
}
