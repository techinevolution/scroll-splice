import { useEffect, useMemo, useRef } from 'react'

import { useEditorStore } from '../app/store'

export function LayersPanel() {
  const elements = useEditorStore((state) => state.episode.elements)
  const selectedElementId = useEditorStore((state) => state.selectedElementId)
  const selectElement = useEditorStore((state) => state.selectElement)
  const selectedLayerRef = useRef<HTMLButtonElement>(null)
  const layersListRef = useRef<HTMLUListElement>(null)

  const orderedElements = useMemo(
    () => [...elements].sort((first, second) => second.zIndex - first.zIndex),
    [elements],
  )

  useEffect(() => {
    if (selectedElementId) {
      selectedLayerRef.current?.scrollIntoView({ block: 'nearest' })
    } else {
      layersListRef.current?.scrollTo({ top: 0 })
    }
  }, [selectedElementId])

  return (
    <section className="panel-card layers-card" aria-labelledby="layers-heading">
      <header className="panel-heading">
        <div>
          <p className="panel-kicker">Episode structure</p>
          <h2 id="layers-heading">Layers</h2>
        </div>
        <span>{elements.length}</span>
      </header>

      <ul
        ref={layersListRef}
        className="layers-list"
        aria-label="Episode layers"
      >
        {orderedElements.map((element) => {
          const isSelected = element.id === selectedElementId

          return (
            <li key={element.id}>
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
                <span className="layer-visibility" aria-hidden="true">
                  ●
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
