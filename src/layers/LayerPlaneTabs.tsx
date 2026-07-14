import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useEditorStore } from '../app/store'
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
  const scrollportRef = useRef<HTMLDivElement>(null)
  const tabListRef = useRef<HTMLDivElement>(null)
  const [overflowState, setOverflowState] = useState(INITIAL_OVERFLOW_STATE)
  const layerPlanes = useMemo(
    () => getLayerPlanesForGroup(episode, activeCompositionGroup),
    [activeCompositionGroup, episode],
  )
  const groupLabel = COMPOSITION_GROUP_LABELS[activeCompositionGroup]

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

  return (
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

            return (
              <div
                className={`layer-plane-tab${isActive ? ' is-active' : ''}${layerPlane.visible ? '' : ' is-hidden'}`}
                data-layer-plane-id={layerPlane.id}
                key={layerPlane.id}
              >
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
  )
}
