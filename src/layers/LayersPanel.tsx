import { useEffect, useMemo, useRef } from 'react'

import { useEditorStore } from '../app/store'
import { VisibilityIcon } from '../components/VisibilityIcon'
import {
  COMPOSITION_GROUP_LABELS,
  compareElementsByCanvasPosition,
  getLayerPlaneById,
  getLayerPlanesForGroup,
  isElementEffectivelyVisible,
} from '../core/episode'
import { LayerPlaneTabs } from './LayerPlaneTabs'

export function LayersPanel() {
  const elements = useEditorStore((state) => state.episode.elements)
  const episode = useEditorStore((state) => state.episode)
  const activeCompositionGroup = useEditorStore(
    (state) => state.activeCompositionGroup,
  )
  const activeLayerPlaneId = useEditorStore(
    (state) => state.activeLayerPlaneId,
  )
  const selectedElementId = useEditorStore((state) => state.selectedElementId)
  const selectElement = useEditorStore((state) => state.selectElement)
  const deleteLayerPlane = useEditorStore((state) => state.deleteLayerPlane)
  const setBaseColor = useEditorStore((state) => state.setBaseColor)
  const setElementVisibility = useEditorStore(
    (state) => state.setElementVisibility,
  )
  const selectedLayerRef = useRef<HTMLButtonElement>(null)
  const layersListRef = useRef<HTMLUListElement>(null)
  const activeLayerPlane = getLayerPlaneById(episode, activeLayerPlaneId)
  const activeGroupLayerPlanes = getLayerPlanesForGroup(
    episode,
    activeCompositionGroup,
  )

  const orderedElements = useMemo(
    () =>
      elements
        .filter(({ layerPlaneId }) => layerPlaneId === activeLayerPlaneId)
        .sort(compareElementsByCanvasPosition),
    [activeLayerPlaneId, elements],
  )
  const groupLabel = COMPOSITION_GROUP_LABELS[activeCompositionGroup]
  const isGroupVisible =
    episode.compositionGroupVisibility[activeCompositionGroup]
  const planeLabel = activeLayerPlane
    ? `${groupLabel} plane ${activeLayerPlane.order}`
    : `${groupLabel} plane`
  const isEmptyPlane = activeLayerPlane && orderedElements.length === 0
  const canDeleteEmptyPlane =
    activeLayerPlane?.kind === 'ordinary' &&
    orderedElements.length === 0 &&
    activeGroupLayerPlanes.length > 1
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

  return (
    <section className="panel-card layers-card" aria-labelledby="layers-heading">
      <header className="panel-heading">
        <div>
          <p className="panel-kicker">Episode structure</p>
          <h2 id="layers-heading">Layers · {groupLabel}</h2>
        </div>
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
            <strong>Base color</strong>
            <small>Full episode</small>
          </span>
          <input
            type="color"
            aria-label="Base color"
            value={activeLayerPlane.baseColor}
            onChange={(event) => setBaseColor(event.currentTarget.value)}
          />
        </label>
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
              <span>Delete plane</span>
            </button>
            <button
              className="layer-empty-action layer-empty-attach"
              type="button"
              disabled
              aria-label="Attach asset, coming later"
              title="Attach asset is coming later"
            >
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
              <span>Attach asset</span>
            </button>
          </div>
        </div>
      ) : null}

      <ul
        ref={layersListRef}
        className="layers-list"
        aria-label={`${planeLabel} elements`}
        data-testid="layer-elements-list"
      >
        {orderedElements.map((element) => {
          const isSelected = element.id === selectedElementId
          const isEffectivelyVisible = isElementEffectivelyVisible(
            episode,
            element,
          )

          return (
            <li
              className={`layer-list-item${isEffectivelyVisible ? '' : ' is-hidden'}`}
              key={element.id}
            >
              <button
                ref={isSelected ? selectedLayerRef : undefined}
                className={`layer-row${isSelected ? ' is-selected' : ''}`}
                type="button"
                aria-pressed={isSelected}
                data-layer-id={element.id}
                onClick={() => selectElement(element.id, true)}
              >
                <span className={`layer-type layer-type-${element.type}`}>
                  {element.type === 'text' ? 'T' : '◆'}
                </span>
                <span className="layer-name">{element.name}</span>
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
            </li>
          )
        })}
      </ul>
    </section>
  )
}
