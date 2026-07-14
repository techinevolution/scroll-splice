import { useMemo, useRef, type KeyboardEvent, type PointerEvent } from 'react'

import { useEditorStore } from '../app/store'
import {
  getMinimapViewportBox,
  minimapPointerToViewportY,
} from '../core/coordinates'
import {
  compareElementsByRenderOrder,
  getEffectiveEpisodeBaseColor,
  isElementEffectivelyVisible,
  type EpisodeElement,
} from '../core/episode'

interface MinimapElementProps {
  readonly element: EpisodeElement
  readonly isSelected: boolean
}

function MinimapElement({ element, isSelected }: MinimapElementProps) {
  const { bounds } = element
  const stroke = isSelected ? '#65E4FF' : undefined
  const strokeWidth = isSelected ? 12 : 0

  if (element.type === 'text') {
    return (
      <rect
        data-element-id={element.id}
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={Math.max(bounds.height * 0.38, 12)}
        rx="8"
        fill={element.fill}
        opacity="0.86"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    )
  }

  if (element.shape === 'ellipse') {
    return (
      <ellipse
        data-element-id={element.id}
        cx={bounds.x + bounds.width / 2}
        cy={bounds.y + bounds.height / 2}
        rx={bounds.width / 2}
        ry={bounds.height / 2}
        fill={element.fill}
        opacity={element.opacity}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    )
  }

  return (
    <rect
      data-element-id={element.id}
      x={bounds.x}
      y={bounds.y}
      width={bounds.width}
      height={bounds.height}
      rx={element.cornerRadius}
      fill={element.fill}
      opacity={element.opacity}
      stroke={stroke ?? element.stroke}
      strokeWidth={strokeWidth || element.strokeWidth}
    />
  )
}

export function EpisodeMinimap() {
  const episode = useEditorStore((state) => state.episode)
  const selectedElementId = useEditorStore((state) => state.selectedElementId)
  const viewportY = useEditorStore((state) => state.viewportY)
  const viewportLogicalHeight = useEditorStore(
    (state) => state.viewportLogicalHeight,
  )
  const setViewportY = useEditorStore((state) => state.setViewportY)
  const panViewport = useEditorStore((state) => state.panViewport)
  const dragOffset = useRef<number | null>(null)
  const baseColor = getEffectiveEpisodeBaseColor(episode)
  const orderedElements = useMemo(
    () =>
      episode.elements
        .filter((element) => isElementEffectivelyVisible(episode, element))
        .sort((first, second) =>
          compareElementsByRenderOrder(episode, first, second),
        ),
    [episode],
  )

  const navigateFromPointer = (
    event: PointerEvent<HTMLDivElement>,
    beginDrag: boolean,
  ) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const pointerY = event.clientY - bounds.top
    const viewportBox = getMinimapViewportBox(
      viewportY,
      viewportLogicalHeight,
      episode.logicalHeight,
      bounds.height,
    )

    if (beginDrag) {
      event.currentTarget.setPointerCapture(event.pointerId)
      const hitViewport =
        pointerY >= viewportBox.y &&
        pointerY <= viewportBox.y + viewportBox.height

      dragOffset.current = hitViewport
        ? pointerY - viewportBox.y
        : viewportBox.height / 2
    }

    if (dragOffset.current === null) {
      return
    }

    const requestedTop =
      ((pointerY - dragOffset.current) / bounds.height) * episode.logicalHeight

    if (beginDrag && pointerY < viewportBox.y) {
      setViewportY(
        minimapPointerToViewportY(
          pointerY,
          bounds.height,
          episode.logicalHeight,
          viewportLogicalHeight,
        ),
      )
      return
    }

    if (beginDrag && pointerY > viewportBox.y + viewportBox.height) {
      setViewportY(
        minimapPointerToViewportY(
          pointerY,
          bounds.height,
          episode.logicalHeight,
          viewportLogicalHeight,
        ),
      )
      return
    }

    setViewportY(requestedTop)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const smallStep = viewportLogicalHeight * 0.12
    const largeStep = viewportLogicalHeight * 0.85

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      panViewport(event.key === 'ArrowDown' ? smallStep : -smallStep)
    } else if (event.key === 'PageDown' || event.key === 'PageUp') {
      event.preventDefault()
      panViewport(event.key === 'PageDown' ? largeStep : -largeStep)
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      setViewportY(event.key === 'Home' ? 0 : episode.logicalHeight)
    }
  }

  return (
    <section className="panel-card minimap-card" aria-labelledby="minimap-heading">
      <header className="panel-heading">
        <div>
          <p className="panel-kicker">Full episode</p>
          <h2 id="minimap-heading">Minimap</h2>
        </div>
        <span className="panel-count">
          {episode.logicalHeight.toLocaleString()}u
        </span>
      </header>

      <div
        className="minimap-surface"
        data-testid="minimap"
        role="slider"
        tabIndex={0}
        aria-label="Episode position"
        aria-valuemin={0}
        aria-valuemax={episode.logicalHeight}
        aria-valuenow={Math.round(viewportY)}
        aria-orientation="vertical"
        onKeyDown={handleKeyDown}
        onPointerDown={(event) => navigateFromPointer(event, true)}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            navigateFromPointer(event, false)
          }
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
          }
          dragOffset.current = null
        }}
        onPointerCancel={() => {
          dragOffset.current = null
        }}
      >
        <svg
          viewBox={`0 0 ${episode.logicalWidth} ${episode.logicalHeight}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {baseColor ? (
            <rect
              data-testid="minimap-base"
              width={episode.logicalWidth}
              height={episode.logicalHeight}
              fill={baseColor}
            />
          ) : null}
          {orderedElements.map((element) => (
            <MinimapElement
              key={element.id}
              element={element}
              isSelected={element.id === selectedElementId}
            />
          ))}
          <rect
            data-testid="minimap-viewport"
            x="4"
            y={viewportY}
            width={episode.logicalWidth - 8}
            height={viewportLogicalHeight}
            rx="18"
            fill="rgb(101 228 255 / 0.08)"
            stroke="#65E4FF"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <p className="panel-help">Click anywhere or drag the cyan frame.</p>
    </section>
  )
}
