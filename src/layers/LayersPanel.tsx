import { useEffect, useMemo, useRef } from 'react'

import { useEditorStore } from '../app/store'
import {
  COMPOSITION_GROUP_LABELS,
  isElementEffectivelyVisible,
} from '../core/episode'
import { VisibilityIcon } from '../components/VisibilityIcon'

export function LayersPanel() {
  const elements = useEditorStore((state) => state.episode.elements)
  const episode = useEditorStore((state) => state.episode)
  const activeCompositionGroup = useEditorStore(
    (state) => state.activeCompositionGroup,
  )
  const selectedElementId = useEditorStore((state) => state.selectedElementId)
  const selectElement = useEditorStore((state) => state.selectElement)
  const setElementVisibility = useEditorStore(
    (state) => state.setElementVisibility,
  )
  const selectedLayerRef = useRef<HTMLButtonElement>(null)
  const layersListRef = useRef<HTMLUListElement>(null)

  const orderedElements = useMemo(
    () =>
      elements
        .filter(
          ({ compositionGroup }) =>
            compositionGroup === activeCompositionGroup,
        )
        .sort((first, second) => second.zIndex - first.zIndex),
    [activeCompositionGroup, elements],
  )
  const groupLabel = COMPOSITION_GROUP_LABELS[activeCompositionGroup]
  const isGroupVisible =
    episode.compositionGroupVisibility[activeCompositionGroup]

  useEffect(() => {
    if (selectedElementId) {
      selectedLayerRef.current?.scrollIntoView({ block: 'nearest' })
    } else {
      layersListRef.current?.scrollTo({ top: 0 })
    }
  }, [activeCompositionGroup, selectedElementId])

  return (
    <section className="panel-card layers-card" aria-labelledby="layers-heading">
      <header className="panel-heading">
        <div>
          <p className="panel-kicker">Episode structure</p>
          <h2 id="layers-heading">Layers · {groupLabel}</h2>
        </div>
        <span className="panel-count">{orderedElements.length}</span>
      </header>

      <p
        className={`group-visibility-note${isGroupVisible ? '' : ' is-visible'}`}
        role="status"
      >
        {groupLabel} is hidden on the canvas. Individual eye settings are
        preserved.
      </p>

      <ul
        ref={layersListRef}
        className="layers-list"
        aria-label={`${groupLabel} layers`}
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
                disabled={!isEffectivelyVisible}
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
