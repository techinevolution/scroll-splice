import { useEffect, useMemo, useRef } from 'react'

import { useEditorStore } from '../app/store'
import { VisibilityIcon } from '../components/VisibilityIcon'
import {
  COMPOSITION_GROUP_LABELS,
  compareElementsByCanvasPosition,
  getLayerPlaneById,
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
  const setBaseColor = useEditorStore((state) => state.setBaseColor)
  const setElementVisibility = useEditorStore(
    (state) => state.setElementVisibility,
  )
  const selectedLayerRef = useRef<HTMLButtonElement>(null)
  const layersListRef = useRef<HTMLUListElement>(null)
  const activeLayerPlane = getLayerPlaneById(episode, activeLayerPlaneId)

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

      {orderedElements.length === 0 ? (
        <p className="layer-empty-state">
          {activeLayerPlane?.kind === 'base'
            ? 'This pinned plane supplies the episode backdrop.'
            : 'This plane is empty and ready for elements.'}
        </p>
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
