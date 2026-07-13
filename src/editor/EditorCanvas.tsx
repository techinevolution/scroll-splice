import { useEffect, useMemo, type KeyboardEvent } from 'react'
import { Ellipse, Group, Layer, Rect, Stage, Text } from 'react-konva'

import { useEditorStore } from '../app/store'
import {
  boundsIntersectVerticalViewport,
  getFitScale,
  getLogicalViewportHeight,
} from '../core/coordinates'
import {
  compareElementsByRenderOrder,
  isElementEffectivelyVisible,
  type EpisodeElement,
} from '../core/episode'
import { useElementSize } from './useElementSize'

const RENDER_BUFFER = 160

interface ElementNodeProps {
  readonly element: EpisodeElement
  readonly isSelected: boolean
  readonly onSelect: (elementId: string) => void
  readonly onMove: (elementId: string, x: number, y: number) => void
}

function ElementNode({
  element,
  isSelected,
  onSelect,
  onMove,
}: ElementNodeProps) {
  const { bounds } = element

  return (
    <Group
      x={bounds.x}
      y={bounds.y}
      draggable={isSelected && !element.locked}
      onMouseDown={(event) => {
        event.cancelBubble = true
        onSelect(element.id)
      }}
      onTouchStart={(event) => {
        event.cancelBubble = true
        onSelect(element.id)
      }}
      onDragEnd={(event) => {
        onMove(element.id, event.target.x(), event.target.y())
      }}
      onMouseEnter={(event) => {
        const stage = event.target.getStage()
        if (stage) stage.container().style.cursor = isSelected ? 'grab' : 'pointer'
      }}
      onMouseLeave={(event) => {
        const stage = event.target.getStage()
        if (stage) stage.container().style.cursor = 'default'
      }}
    >
      {element.type === 'shape' && element.shape === 'rectangle' ? (
        <Rect
          width={bounds.width}
          height={bounds.height}
          fill={element.fill}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
          cornerRadius={element.cornerRadius}
          opacity={element.opacity}
        />
      ) : null}

      {element.type === 'shape' && element.shape === 'ellipse' ? (
        <Ellipse
          x={bounds.width / 2}
          y={bounds.height / 2}
          radiusX={bounds.width / 2}
          radiusY={bounds.height / 2}
          fill={element.fill}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
          opacity={element.opacity}
        />
      ) : null}

      {element.type === 'text' ? (
        <Text
          width={bounds.width}
          height={bounds.height}
          text={element.text}
          fill={element.fill}
          fontFamily={element.fontFamily}
          fontSize={element.fontSize}
          fontStyle={element.fontWeight >= 700 ? 'bold' : 'normal'}
          lineHeight={element.lineHeight}
          align={element.align}
          verticalAlign="middle"
        />
      ) : null}

      {isSelected ? (
        <Rect
          x={-6}
          y={-6}
          width={bounds.width + 12}
          height={bounds.height + 12}
          stroke="#65E4FF"
          strokeWidth={4}
          dash={[12, 7]}
          cornerRadius={8}
          shadowColor="#65E4FF"
          shadowBlur={10}
          listening={false}
        />
      ) : null}
    </Group>
  )
}

export function EditorCanvas() {
  const episode = useEditorStore((state) => state.episode)
  const selectedElementId = useEditorStore((state) => state.selectedElementId)
  const viewportY = useEditorStore((state) => state.viewportY)
  const viewportLogicalHeight = useEditorStore(
    (state) => state.viewportLogicalHeight,
  )
  const setViewportLogicalHeight = useEditorStore(
    (state) => state.setViewportLogicalHeight,
  )
  const panViewport = useEditorStore((state) => state.panViewport)
  const selectElement = useEditorStore((state) => state.selectElement)
  const moveElement = useEditorStore((state) => state.moveElement)
  const { elementRef, size } = useElementSize<HTMLDivElement>()

  const stageWidth = Math.max(size.width, 1)
  const stageHeight = Math.max(size.height, 1)
  const fitScale = getFitScale(stageWidth, episode.logicalWidth)

  useEffect(() => {
    setViewportLogicalHeight(
      getLogicalViewportHeight(stageHeight, fitScale, episode.logicalHeight),
    )
  }, [
    episode.logicalHeight,
    fitScale,
    setViewportLogicalHeight,
    stageHeight,
  ])

  const visibleElements = useMemo(
    () =>
      episode.elements
        .filter(
          (element) =>
            isElementEffectivelyVisible(episode, element) &&
            boundsIntersectVerticalViewport(
              element.bounds,
              viewportY - RENDER_BUFFER,
              viewportLogicalHeight + RENDER_BUFFER * 2,
            ),
        )
        .sort(compareElementsByRenderOrder),
    [episode, viewportLogicalHeight, viewportY],
  )

  const handleKeyboardNavigation = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return
    }

    event.preventDefault()
    const direction = event.key === 'ArrowDown' ? 1 : -1
    const distance = event.shiftKey
      ? viewportLogicalHeight * 0.8
      : viewportLogicalHeight * 0.12
    panViewport(direction * distance)
  }

  return (
    <div className="editor-canvas-shell">
      <div
        ref={elementRef}
        className="editor-canvas-frame"
        data-testid="editor-canvas"
        data-ready={size.width > 0 && size.height > 0}
        role="region"
        aria-busy={size.width <= 0 || size.height <= 0}
        aria-label="Episode editing canvas. Use the mouse wheel or arrow keys to move through the episode."
        tabIndex={0}
        onKeyDown={handleKeyboardNavigation}
      >
        <Stage
          width={stageWidth}
          height={stageHeight}
          onWheel={(event) => {
            event.evt.preventDefault()
            panViewport(event.evt.deltaY / fitScale)
          }}
          onMouseDown={(event) => {
            if (event.target === event.target.getStage()) {
              selectElement(null)
            }
          }}
        >
          <Layer>
            <Group scaleX={fitScale} scaleY={fitScale} y={-viewportY * fitScale}>
              <Rect
                width={episode.logicalWidth}
                height={episode.logicalHeight}
                fill="#F3F0EA"
                listening={false}
              />
              {visibleElements.map((element) => (
                <ElementNode
                  key={element.id}
                  element={element}
                  isSelected={element.id === selectedElementId}
                  onSelect={(elementId) => selectElement(elementId)}
                  onMove={(elementId, x, y) =>
                    moveElement(elementId, { x, y })
                  }
                />
              ))}
            </Group>
          </Layer>
        </Stage>
      </div>

      <div className="canvas-position" aria-live="polite">
        <span>{Math.round((viewportY / episode.logicalHeight) * 100)}%</span>
        <span aria-hidden="true">·</span>
        <span>{Math.round(fitScale * 100)}% fit</span>
      </div>
    </div>
  )
}
