import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from 'react'

import { useEditorStore } from '../app/store'
import {
  ASSET_DRAG_MIME_TYPE,
  parseAssetDragPayload,
} from '../assets/dragPayload'
import { VisibilityIcon } from '../components/VisibilityIcon'
import {
  COMPOSITION_GROUP_LABELS,
  getLayerPlanesForGroup,
} from '../core/episode'

interface OverflowState {
  readonly hasOverflow: boolean
  readonly canScrollLeft: boolean
  readonly canScrollRight: boolean
}

const INITIAL_OVERFLOW_STATE: OverflowState = {
  hasOverflow: false,
  canScrollLeft: false,
  canScrollRight: false,
}

const LAYER_PLANE_DRAG_TYPE = 'application/x-scrollsplice-layer-plane-id'

interface DropIntent {
  readonly targetId: string
  readonly position: 'before' | 'after'
}

export function LayerPlaneTabs() {
  const episode = useEditorStore((state) => state.episode)
  const activeCompositionGroup = useEditorStore(
    (state) => state.activeCompositionGroup,
  )
  const activeLayerPlaneId = useEditorStore(
    (state) => state.activeLayerPlaneId,
  )
  const setActiveLayerPlane = useEditorStore(
    (state) => state.setActiveLayerPlane,
  )
  const createLayerPlane = useEditorStore((state) => state.createLayerPlane)
  const setLayerPlaneVisibility = useEditorStore(
    (state) => state.setLayerPlaneVisibility,
  )
  const setLayerPlaneName = useEditorStore(
    (state) => state.setLayerPlaneName,
  )
  const reorderLayerPlane = useEditorStore(
    (state) => state.reorderLayerPlane,
  )
  const placeDraggedAssetOnPlane = useEditorStore(
    (state) => state.placeDraggedAssetOnPlane,
  )
  const reportAssetDropError = useEditorStore(
    (state) => state.reportAssetDropError,
  )
  const scrollportRef = useRef<HTMLDivElement>(null)
  const tabListRef = useRef<HTMLDivElement>(null)
  const planeNameInputRef = useRef<HTMLInputElement>(null)
  const skipNextNameCommitRef = useRef(false)
  const [overflowState, setOverflowState] = useState(INITIAL_OVERFLOW_STATE)
  const [draggedPlaneId, setDraggedPlaneId] = useState<string | null>(null)
  const [dropIntent, setDropIntent] = useState<DropIntent | null>(null)
  const [assetDropTargetId, setAssetDropTargetId] = useState<string | null>(
    null,
  )
  const layerPlanes = useMemo(
    () => getLayerPlanesForGroup(episode, activeCompositionGroup),
    [activeCompositionGroup, episode],
  )
  const groupLabel = COMPOSITION_GROUP_LABELS[activeCompositionGroup]
  const activeLayerPlane = layerPlanes.find(
    ({ id }) => id === activeLayerPlaneId,
  )
  const activePlaneIndex = layerPlanes.findIndex(
    ({ id }) => id === activeLayerPlaneId,
  )
  const canMoveActivePlaneLeft =
    activeLayerPlane?.kind === 'ordinary' &&
    activePlaneIndex > 0 &&
    layerPlanes[activePlaneIndex - 1]?.kind === 'ordinary'
  const canMoveActivePlaneRight =
    activeLayerPlane?.kind === 'ordinary' &&
    activePlaneIndex >= 0 &&
    activePlaneIndex < layerPlanes.length - 1

  const updateOverflowState = useCallback(() => {
    const scrollport = scrollportRef.current
    if (!scrollport) return

    const maxScrollLeft = Math.max(
      scrollport.scrollWidth - scrollport.clientWidth,
      0,
    )
    const nextState = {
      hasOverflow: maxScrollLeft > 1,
      canScrollLeft: scrollport.scrollLeft > 1,
      canScrollRight: scrollport.scrollLeft < maxScrollLeft - 1,
    }

    setOverflowState((currentState) =>
      currentState.hasOverflow === nextState.hasOverflow &&
      currentState.canScrollLeft === nextState.canScrollLeft &&
      currentState.canScrollRight === nextState.canScrollRight
        ? currentState
        : nextState,
    )
  }, [])

  useEffect(() => {
    const scrollport = scrollportRef.current
    if (!scrollport) return

    const resizeObserver = new ResizeObserver(updateOverflowState)
    resizeObserver.observe(scrollport)
    if (tabListRef.current) {
      resizeObserver.observe(tabListRef.current)
    }
    scrollport.addEventListener('scroll', updateOverflowState, {
      passive: true,
    })
    updateOverflowState()

    return () => {
      resizeObserver.disconnect()
      scrollport.removeEventListener('scroll', updateOverflowState)
    }
  }, [updateOverflowState])

  useLayoutEffect(() => {
    const scrollport = scrollportRef.current
    const activeTab = scrollport?.querySelector<HTMLElement>(
      `[data-layer-plane-id="${activeLayerPlaneId}"]`,
    )

    if (scrollport && activeTab) {
      const scrollportBounds = scrollport.getBoundingClientRect()
      const activeTabBounds = activeTab.getBoundingClientRect()
      let requestedLeft = scrollport.scrollLeft

      if (activeTabBounds.left < scrollportBounds.left) {
        requestedLeft -= scrollportBounds.left - activeTabBounds.left
      } else if (activeTabBounds.right > scrollportBounds.right) {
        requestedLeft += activeTabBounds.right - scrollportBounds.right
      }

      requestedLeft = Math.min(
        Math.max(requestedLeft, 0),
        Math.max(scrollport.scrollWidth - scrollport.clientWidth, 0),
      )

      if (requestedLeft !== scrollport.scrollLeft) {
        scrollport.scrollTo({ left: requestedLeft })
      }
    }

    const animationFrame = requestAnimationFrame(updateOverflowState)
    return () => cancelAnimationFrame(animationFrame)
  }, [activeLayerPlaneId, layerPlanes.length, updateOverflowState])

  const scrollTabs = (direction: -1 | 1) => {
    const scrollport = scrollportRef.current
    if (!scrollport) return

    scrollport.scrollBy({
      left: direction * Math.max(scrollport.clientWidth * 0.7, 100),
    })
  }

  const commitPlaneName = () => {
    const input = planeNameInputRef.current
    if (!activeLayerPlane || !input) return

    const nextName = input.value.trim()
    if (nextName !== (activeLayerPlane.name ?? '')) {
      setLayerPlaneName(activeLayerPlane.id, nextName)
    }
    input.value = nextName
  }

  const handlePlaneNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      skipNextNameCommitRef.current = true
      commitPlaneName()
      event.currentTarget.blur()
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      skipNextNameCommitRef.current = true
      event.currentTarget.value = activeLayerPlane?.name ?? ''
      event.currentTarget.blur()
    }
  }

  const handlePlaneNameBlur = () => {
    if (skipNextNameCommitRef.current) {
      skipNextNameCommitRef.current = false
      return
    }

    commitPlaneName()
  }

  const handleDragStart = (
    event: DragEvent<HTMLSpanElement>,
    layerPlaneId: string,
  ) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData(LAYER_PLANE_DRAG_TYPE, layerPlaneId)
    setDraggedPlaneId(layerPlaneId)
    setDropIntent(null)
  }

  const handleDragOver = (
    event: DragEvent<HTMLDivElement>,
    targetLayerPlaneId: string,
  ) => {
    const targetPlane = layerPlanes.find(
      ({ id }) => id === targetLayerPlaneId,
    )
    const isAssetDrop = Array.from(event.dataTransfer.types).includes(
      ASSET_DRAG_MIME_TYPE,
    )

    if (isAssetDrop) {
      if (targetPlane?.kind !== 'ordinary') return

      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
      setAssetDropTargetId(targetLayerPlaneId)
      setDropIntent(null)
      return
    }

    const sourcePlane = layerPlanes.find(({ id }) => id === draggedPlaneId)

    if (
      !sourcePlane ||
      sourcePlane.kind !== 'ordinary' ||
      !targetPlane ||
      targetPlane.kind !== 'ordinary' ||
      sourcePlane.id === targetPlane.id
    ) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    const targetBounds = event.currentTarget.getBoundingClientRect()
    const position =
      event.clientX < targetBounds.left + targetBounds.width / 2
        ? 'before'
        : 'after'

    setDropIntent((currentIntent) =>
      currentIntent?.targetId === targetLayerPlaneId &&
      currentIntent.position === position
        ? currentIntent
        : { targetId: targetLayerPlaneId, position },
    )
  }

  const handleDrop = (
    event: DragEvent<HTMLDivElement>,
    targetLayerPlaneId: string,
  ) => {
    const targetPlane = layerPlanes.find(
      ({ id }) => id === targetLayerPlaneId,
    )
    const isAssetDrop = Array.from(event.dataTransfer.types).includes(
      ASSET_DRAG_MIME_TYPE,
    )

    if (isAssetDrop) {
      event.preventDefault()
      const payload = parseAssetDragPayload(
        event.dataTransfer.getData(ASSET_DRAG_MIME_TYPE),
      )

      if (!payload || targetPlane?.kind !== 'ordinary') {
        reportAssetDropError(
          'Drop a valid Asset Library item on an ordinary numbered plane.',
        )
      } else {
        placeDraggedAssetOnPlane(payload, targetLayerPlaneId)
      }

      setDraggedPlaneId(null)
      setDropIntent(null)
      setAssetDropTargetId(null)
      return
    }

    event.preventDefault()

    const sourceIndex = layerPlanes.findIndex(
      ({ id }) => id === draggedPlaneId,
    )
    const targetIndex = layerPlanes.findIndex(
      ({ id }) => id === targetLayerPlaneId,
    )
    const sourcePlane = layerPlanes[sourceIndex]
    const reorderTargetPlane = layerPlanes[targetIndex]
    const position =
      dropIntent?.targetId === targetLayerPlaneId
        ? dropIntent.position
        : 'before'

    if (
      draggedPlaneId &&
      sourcePlane?.kind === 'ordinary' &&
      reorderTargetPlane?.kind === 'ordinary' &&
      sourceIndex !== targetIndex
    ) {
      let finalIndex = targetIndex + (position === 'after' ? 1 : 0)
      if (sourceIndex < finalIndex) {
        finalIndex -= 1
      }

      if (finalIndex !== sourceIndex) {
        reorderLayerPlane(draggedPlaneId, finalIndex)
      }
    }

    setDraggedPlaneId(null)
    setDropIntent(null)
    setAssetDropTargetId(null)
  }

  const handleDragLeave = (
    event: DragEvent<HTMLDivElement>,
    targetLayerPlaneId: string,
  ) => {
    const nextTarget = event.relatedTarget
    if (
      nextTarget instanceof Node &&
      event.currentTarget.contains(nextTarget)
    ) {
      return
    }

    setDropIntent((currentIntent) =>
      currentIntent?.targetId === targetLayerPlaneId ? null : currentIntent,
    )
    setAssetDropTargetId((currentTargetId) =>
      currentTargetId === targetLayerPlaneId ? null : currentTargetId,
    )
  }

  const clearDragState = () => {
    setDraggedPlaneId(null)
    setDropIntent(null)
    setAssetDropTargetId(null)
  }

  return (
    <div className="layer-plane-navigation-shell">
      <div
        className="layer-plane-navigation"
        role="group"
        aria-label={`${groupLabel} layer planes`}
      >
        {overflowState.hasOverflow ? (
          <button
            className="layer-plane-scroll"
            type="button"
            aria-label="Scroll layer planes left"
            disabled={!overflowState.canScrollLeft}
            onClick={() => scrollTabs(-1)}
          >
            ‹
          </button>
        ) : null}

        <div
          ref={scrollportRef}
          className="layer-plane-scrollport"
          data-testid="layer-plane-scrollport"
        >
          <div ref={tabListRef} className="layer-plane-tab-list">
            {layerPlanes.map((layerPlane) => {
              const isActive = layerPlane.id === activeLayerPlaneId
              const planeLabel = `${groupLabel} plane ${layerPlane.order}`
              const planeDropIntent =
                dropIntent?.targetId === layerPlane.id ? dropIntent : null

              return (
                <div
                  className={`layer-plane-tab${isActive ? ' is-active' : ''}${layerPlane.visible ? '' : ' is-hidden'}${draggedPlaneId === layerPlane.id ? ' is-dragging' : ''}${planeDropIntent ? ` is-drop-${planeDropIntent.position}` : ''}${assetDropTargetId === layerPlane.id ? ' is-asset-drop-target' : ''}`}
                  data-layer-plane-id={layerPlane.id}
                  data-drop-position={planeDropIntent?.position}
                  key={layerPlane.id}
                  onDragOver={(event) => handleDragOver(event, layerPlane.id)}
                  onDragLeave={(event) =>
                    handleDragLeave(event, layerPlane.id)
                  }
                  onDrop={(event) => handleDrop(event, layerPlane.id)}
                >
                  {planeDropIntent ? (
                    <span
                      className={`layer-plane-drop-marker is-${planeDropIntent.position}`}
                      data-testid={`layer-plane-drop-${planeDropIntent.position}`}
                      aria-hidden="true"
                    />
                  ) : null}
                  {layerPlane.kind === 'ordinary' ? (
                    <span
                      className="layer-plane-drag-grip"
                      draggable
                      aria-hidden="true"
                      title={`Drag to reorder ${planeLabel}`}
                      data-testid={`layer-plane-drag-grip-${layerPlane.id}`}
                      onDragStart={(event) =>
                        handleDragStart(event, layerPlane.id)
                      }
                      onDragEnd={clearDragState}
                    >
                      ⋮⋮
                    </span>
                  ) : null}
                  <button
                    className="layer-plane-select"
                    type="button"
                    aria-label={planeLabel}
                    aria-pressed={isActive}
                    title={layerPlane.name ?? planeLabel}
                    onClick={() => setActiveLayerPlane(layerPlane.id)}
                  >
                    {layerPlane.order}
                  </button>
                  <button
                    className="layer-plane-eye"
                    type="button"
                    aria-label={`${planeLabel} visibility`}
                    aria-pressed={layerPlane.visible}
                    title={`${layerPlane.visible ? 'Hide' : 'Show'} ${planeLabel}`}
                    onClick={() =>
                      setLayerPlaneVisibility(
                        layerPlane.id,
                        !layerPlane.visible,
                      )
                    }
                  >
                    <VisibilityIcon visible={layerPlane.visible} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {overflowState.hasOverflow ? (
          <button
            className="layer-plane-scroll"
            type="button"
            aria-label="Scroll layer planes right"
            disabled={!overflowState.canScrollRight}
            onClick={() => scrollTabs(1)}
          >
            ›
          </button>
        ) : null}

        <button
          className="layer-plane-add"
          type="button"
          aria-label={`Add ${groupLabel} plane`}
          title={`Add ${groupLabel} plane`}
          onClick={createLayerPlane}
        >
          +
        </button>
      </div>

      {activeLayerPlane ? (
        <div
          className={`active-layer-plane-settings${activeLayerPlane.kind === 'base' ? ' is-pinned' : ''}`}
          data-testid="active-layer-plane-settings"
        >
          {activeLayerPlane.kind === 'ordinary' ? (
            <button
              className="layer-plane-move layer-plane-move-left"
              type="button"
              disabled={!canMoveActivePlaneLeft}
              aria-label={`Move ${groupLabel} plane ${activeLayerPlane.order} left`}
              onClick={() =>
                reorderLayerPlane(activeLayerPlane.id, activePlaneIndex - 1)
              }
            >
              Move Left
            </button>
          ) : (
            <span className="layer-plane-pinned-label">Pinned base</span>
          )}

          {activeLayerPlane.kind === 'ordinary' ? (
            <label className="layer-plane-name-control">
              <span>Plane name</span>
              <input
                key={`${activeLayerPlane.id}:${activeLayerPlane.name ?? ''}`}
                ref={planeNameInputRef}
                type="text"
                maxLength={32}
                defaultValue={activeLayerPlane.name ?? ''}
                placeholder="Optional name"
                aria-label={`${groupLabel} plane ${activeLayerPlane.order} name`}
                data-testid="active-layer-plane-name"
                onBlur={handlePlaneNameBlur}
                onKeyDown={handlePlaneNameKeyDown}
              />
            </label>
          ) : null}

          {activeLayerPlane.kind === 'ordinary' ? (
            <button
              className="layer-plane-move layer-plane-move-right"
              type="button"
              disabled={!canMoveActivePlaneRight}
              aria-label={`Move ${groupLabel} plane ${activeLayerPlane.order} right`}
              onClick={() =>
                reorderLayerPlane(activeLayerPlane.id, activePlaneIndex + 1)
              }
            >
              Move Right
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
