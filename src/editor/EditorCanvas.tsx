import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import type Konva from 'konva'
import {
  Ellipse,
  Group,
  Layer,
  Rect,
  Stage,
  Text,
  Transformer,
} from 'react-konva'

import { useEditorStore } from '../app/store'
import {
  MIN_ELEMENT_SIZE,
  isBackgroundColorRegion,
} from '../core/commands'
import {
  boundsIntersectViewport,
  clampElementPosition,
  getFitScale,
  getEpisodeCenterSnap,
  getVerticalScrollProgress,
  getViewportScale,
} from '../core/coordinates'
import {
  compareElementsByRenderOrder,
  getEffectiveEpisodeBaseColor,
  isElementEffectivelyVisible,
  type EpisodeElement,
} from '../core/episode'
import {
  WEBTOON_CANVAS_OBSERVED_PROFILE,
  getCandidateLogicalSliceBoundaries,
} from '../export/profiles'
import { useElementSize } from './useElementSize'
import { CanvasBaseColorControl } from './CanvasBaseColorControl'
import { EpisodeHeightControls } from './EpisodeHeightControls'

const RENDER_BUFFER = 160

interface ElementNodeProps {
  readonly element: EpisodeElement
  readonly isSelected: boolean
  readonly episodeLogicalWidth: number
  readonly episodeLogicalHeight: number
  readonly magnetEnabled: boolean
  readonly viewScale: number
  readonly onSelect: (elementId: string) => void
  readonly onMove: (elementId: string, x: number, y: number) => void
  readonly onResize: (
    elementId: string,
    bounds: EpisodeElement['bounds'],
  ) => void
  readonly onSnapChange: (snapped: boolean) => void
}

function ElementNode({
  element,
  isSelected,
  episodeLogicalWidth,
  episodeLogicalHeight,
  magnetEnabled,
  viewScale,
  onSelect,
  onMove,
  onResize,
  onSnapChange,
}: ElementNodeProps) {
  const { bounds } = element
  const nodeRef = useRef<Konva.Group>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const isBackgroundRegion = isBackgroundColorRegion(element)
  const isResizable = isSelected && !element.locked && !isBackgroundRegion

  useEffect(() => {
    const node = nodeRef.current
    const transformer = transformerRef.current

    if (!isResizable || !node || !transformer) {
      return
    }

    transformer.nodes([node])
    transformer.moveToTop()
    transformer.forceUpdate()
    transformer.getLayer()?.batchDraw()
  }, [bounds.height, bounds.width, isResizable])

  const constrainDrag = (
    node: Konva.Node,
    bypassMagnet: boolean,
  ) => {
    const requestedX = isBackgroundRegion ? 0 : node.x()
    const centerSnap =
      magnetEnabled && !bypassMagnet && !isBackgroundRegion
        ? getEpisodeCenterSnap(
            requestedX,
            bounds.width,
            episodeLogicalWidth,
            viewScale,
          )
        : { x: requestedX, snapped: false }
    const position = clampElementPosition(
      { x: centerSnap.x, y: node.y() },
      bounds,
      episodeLogicalWidth,
      episodeLogicalHeight,
    )

    node.position(position)
    onSnapChange(centerSnap.snapped)

    return position
  }

  return (
    <>
      <Group
        ref={nodeRef}
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
        onDragMove={(event) => {
          constrainDrag(event.target, event.evt.altKey)
        }}
        onDragEnd={(event) => {
          const position = constrainDrag(event.target, event.evt.altKey)
          onMove(element.id, position.x, position.y)
          onSnapChange(false)
        }}
        onTransformEnd={(event) => {
          const node = event.target
          const requestedBounds = {
            x: node.x(),
            y: node.y(),
            width: bounds.width * Math.abs(node.scaleX()),
            height: bounds.height * Math.abs(node.scaleY()),
          }

          node.scale({ x: 1, y: 1 })
          node.position({ x: bounds.x, y: bounds.y })
          onResize(element.id, requestedBounds)
        }}
        onMouseEnter={(event) => {
          const stage = event.target.getStage()
          if (stage) {
            stage.container().style.cursor = isSelected ? 'grab' : 'pointer'
          }
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

        {isSelected && !isResizable ? (
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
            strokeScaleEnabled={false}
            listening={false}
          />
        ) : null}
      </Group>

      {isResizable ? (
        <Transformer
          ref={transformerRef}
          enabledAnchors={[
            'top-left',
            'top-right',
            'bottom-left',
            'bottom-right',
          ]}
          rotateEnabled={false}
          keepRatio
          flipEnabled={false}
          anchorSize={14}
          anchorCornerRadius={3}
          anchorFill="#F7F4FF"
          anchorStroke="#65E4FF"
          anchorStrokeWidth={2}
          borderStroke="#65E4FF"
          borderStrokeWidth={2}
          borderDash={[8, 5]}
          boundBoxFunc={(oldBox, newBox) =>
            Math.abs(newBox.width) < MIN_ELEMENT_SIZE * viewScale ||
            Math.abs(newBox.height) < MIN_ELEMENT_SIZE * viewScale
              ? oldBox
              : newBox
          }
        />
      ) : null}
    </>
  )
}

export function EditorCanvas() {
  const episode = useEditorStore((state) => state.episode)
  const selectedElementId = useEditorStore((state) => state.selectedElementId)
  const viewportX = useEditorStore((state) => state.viewportX)
  const viewportY = useEditorStore((state) => state.viewportY)
  const viewportLogicalWidth = useEditorStore(
    (state) => state.viewportLogicalWidth,
  )
  const viewportLogicalHeight = useEditorStore(
    (state) => state.viewportLogicalHeight,
  )
  const zoomFactor = useEditorStore((state) => state.zoomFactor)
  const magnetEnabled = useEditorStore((state) => state.magnetEnabled)
  const sliceGuidesVisible = useEditorStore(
    (state) => state.sliceGuidesVisible,
  )
  const setFitViewportLogicalHeight = useEditorStore(
    (state) => state.setFitViewportLogicalHeight,
  )
  const setZoomFactor = useEditorStore((state) => state.setZoomFactor)
  const panViewport = useEditorStore((state) => state.panViewport)
  const selectElement = useEditorStore((state) => state.selectElement)
  const moveElement = useEditorStore((state) => state.moveElement)
  const resizeElement = useEditorStore((state) => state.resizeElement)
  const toggleMagnet = useEditorStore((state) => state.toggleMagnet)
  const toggleSliceGuides = useEditorStore(
    (state) => state.toggleSliceGuides,
  )
  const [centerSnapGuideVisible, setCenterSnapGuideVisible] = useState(false)
  const { elementRef, size } = useElementSize<HTMLDivElement>()

  const stageWidth = Math.max(size.width, 1)
  const stageHeight = Math.max(size.height, 1)
  const fitScale = getFitScale(stageWidth, episode.logicalWidth)
  const viewScale = getViewportScale(
    stageWidth,
    episode.logicalWidth,
    zoomFactor,
  )
  const groupX =
    Math.max((stageWidth - episode.logicalWidth * viewScale) / 2, 0) -
    viewportX * viewScale
  const baseColor = getEffectiveEpisodeBaseColor(episode)
  const isAtEpisodeEnd =
    viewportY + viewportLogicalHeight >= episode.logicalHeight - 1
  const scrollProgress = getVerticalScrollProgress(
    viewportY,
    viewportLogicalHeight,
    episode.logicalHeight,
  )
  const selectedElement = episode.elements.find(
    ({ id }) => id === selectedElementId,
  )
  const sliceBoundaries = useMemo(
    () =>
      getCandidateLogicalSliceBoundaries(
        WEBTOON_CANVAS_OBSERVED_PROFILE,
        episode.logicalWidth,
        episode.logicalHeight,
      ),
    [episode.logicalHeight, episode.logicalWidth],
  )
  const visibleSliceBoundaries = sliceGuidesVisible
    ? sliceBoundaries.filter((boundary) => {
        const screenY = (boundary - viewportY) * viewScale
        return screenY >= 0 && screenY <= stageHeight
      })
    : []

  useEffect(() => {
    setFitViewportLogicalHeight(stageHeight / fitScale)
  }, [
    fitScale,
    setFitViewportLogicalHeight,
    stageHeight,
  ])

  const visibleElements = useMemo(
    () =>
      episode.elements
        .filter(
          (element) =>
            isElementEffectivelyVisible(episode, element) &&
            boundsIntersectViewport(
              element.bounds,
              {
                x: viewportX - RENDER_BUFFER,
                y: viewportY - RENDER_BUFFER,
                width: viewportLogicalWidth + RENDER_BUFFER * 2,
                height: viewportLogicalHeight + RENDER_BUFFER * 2,
              },
            ),
        )
        .sort((first, second) =>
          compareElementsByRenderOrder(episode, first, second),
        ),
    [
      episode,
      viewportLogicalHeight,
      viewportLogicalWidth,
      viewportX,
      viewportY,
    ],
  )

  const handleKeyboardNavigation = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      return
    }

    event.preventDefault()
    const isHorizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight'
    const direction = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1
    const distance = isHorizontal
      ? viewportLogicalWidth * (event.shiftKey ? 0.8 : 0.12)
      : viewportLogicalHeight * (event.shiftKey ? 0.8 : 0.12)

    panViewport({
      x: isHorizontal ? direction * distance : 0,
      y: isHorizontal ? 0 : direction * distance,
    })
  }

  return (
    <div className="editor-canvas-shell">
      <div
        ref={elementRef}
        className="editor-canvas-frame"
        data-testid="editor-canvas"
        data-ready={size.width > 0 && size.height > 0}
        data-base-color={baseColor ?? 'transparent'}
        data-episode-height={episode.logicalHeight}
        data-zoom-percent={Math.round(zoomFactor * 100)}
        data-viewport-x={viewportX}
        data-viewport-y={viewportY}
        data-viewport-width={viewportLogicalWidth}
        data-viewport-height={viewportLogicalHeight}
        data-magnet-enabled={magnetEnabled}
        data-slice-guides-visible={sliceGuidesVisible}
        data-slice-guide-count={sliceBoundaries.length}
        data-visible-slice-guide-count={visibleSliceBoundaries.length}
        data-selected-element-id={selectedElement?.id ?? ''}
        data-selected-x={selectedElement?.bounds.x ?? ''}
        data-selected-y={selectedElement?.bounds.y ?? ''}
        data-selected-width={selectedElement?.bounds.width ?? ''}
        data-selected-height={selectedElement?.bounds.height ?? ''}
        data-resize-handle-count={
          selectedElement &&
          !selectedElement.locked &&
          !isBackgroundColorRegion(selectedElement)
            ? 4
            : 0
        }
        role="region"
        aria-busy={size.width <= 0 || size.height <= 0}
        aria-label="Episode editing canvas. Use the mouse wheel, trackpad, or arrow keys to move through the episode."
        tabIndex={0}
        onKeyDown={handleKeyboardNavigation}
      >
        <Stage
          width={stageWidth}
          height={stageHeight}
          onWheel={(event) => {
            event.evt.preventDefault()
            const horizontalDelta =
              event.evt.shiftKey && event.evt.deltaX === 0
                ? event.evt.deltaY
                : event.evt.deltaX
            const verticalDelta = event.evt.shiftKey ? 0 : event.evt.deltaY

            panViewport({
              x: horizontalDelta / viewScale,
              y: verticalDelta / viewScale,
            })
          }}
          onMouseDown={(event) => {
            if (event.target === event.target.getStage()) {
              selectElement(null)
            }
          }}
        >
          <Layer>
            <Group
              scaleX={viewScale}
              scaleY={viewScale}
              x={groupX}
              y={-viewportY * viewScale}
            >
              {baseColor ? (
                <Rect
                  width={episode.logicalWidth}
                  height={episode.logicalHeight}
                  fill={baseColor}
                  listening={false}
                />
              ) : null}
              {visibleElements.map((element) => (
                <ElementNode
                  key={element.id}
                  element={element}
                  isSelected={element.id === selectedElementId}
                  episodeLogicalWidth={episode.logicalWidth}
                  episodeLogicalHeight={episode.logicalHeight}
                  magnetEnabled={magnetEnabled}
                  viewScale={viewScale}
                  onSelect={(elementId) => selectElement(elementId)}
                  onMove={(elementId, x, y) =>
                    moveElement(elementId, { x, y })
                  }
                  onResize={(elementId, bounds) =>
                    resizeElement(elementId, bounds)
                  }
                  onSnapChange={setCenterSnapGuideVisible}
                />
              ))}
            </Group>
          </Layer>
        </Stage>

        <div className="canvas-guide-overlay" aria-hidden="true">
          {visibleSliceBoundaries.map((boundary) => (
            <div
              key={boundary}
              className="slice-guide"
              data-slice-guide-y={boundary}
              style={{
                left: groupX,
                top: (boundary - viewportY) * viewScale,
                width: episode.logicalWidth * viewScale,
              }}
            >
              <span>
                {WEBTOON_CANVAS_OBSERVED_PROFILE.maxSliceHeightPx}px candidate
              </span>
            </div>
          ))}

          {centerSnapGuideVisible ? (
            <div
              className="center-snap-guide"
              data-testid="center-snap-guide"
              style={{
                left:
                  groupX + (episode.logicalWidth * viewScale) / 2,
              }}
            />
          ) : null}
        </div>
      </div>

      <CanvasBaseColorControl />

      {isAtEpisodeEnd ? <EpisodeHeightControls viewScale={viewScale} /> : null}

      <div className="canvas-view-controls" aria-label="Canvas view controls">
        <button
          type="button"
          className="view-toggle-button"
          data-testid="alignment-magnet-toggle"
          aria-pressed={magnetEnabled}
          onClick={toggleMagnet}
          title="Snap element centers to the episode centerline. Hold Alt or Option while dragging to bypass."
        >
          <span aria-hidden="true">🧲</span>
          Magnet {magnetEnabled ? 'On' : 'Off'}
        </button>
        <button
          type="button"
          className="view-toggle-button"
          data-testid="slice-guides-toggle"
          aria-pressed={sliceGuidesVisible}
          onClick={toggleSliceGuides}
          title="Show candidate WEBTOON slice boundaries every 1280 output pixels."
        >
          <span aria-hidden="true">⋯</span>
          Slice guides {sliceGuidesVisible ? 'On' : 'Off'}
        </button>
        <button type="button" onClick={() => setZoomFactor(1)}>
          Fit Width
        </button>
        <input
          type="range"
          aria-label="Canvas zoom"
          min="50"
          max="200"
          step="10"
          value={Math.round(zoomFactor * 100)}
          onChange={(event) =>
            setZoomFactor(Number(event.currentTarget.value) / 100)
          }
        />
        <output>{Math.round(zoomFactor * 100)}%</output>
        <span aria-live="polite">
          {Math.round(scrollProgress * 100)}% down
        </span>
      </div>
    </div>
  )
}
