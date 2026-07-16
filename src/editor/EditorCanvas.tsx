import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent,
} from 'react'
import type Konva from 'konva'
import {
  Ellipse,
  Group,
  Image as KonvaImage,
  Layer,
  Rect,
  Stage,
  Text,
  Transformer,
} from 'react-konva'

import { useEditorStore } from '../app/store'
import {
  ASSET_DRAG_MIME_TYPE,
  parseAssetDragPayload,
} from '../assets/dragPayload'
import { resolveImageAsset } from '../assets/runtime'
import {
  MIN_ELEMENT_SIZE,
  isElementFreeformResizable,
} from '../core/commands'
import {
  boundsIntersectViewport,
  clientPointToEpisodePosition,
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
import {
  getKonvaShapeFillProps,
  getTilePatternScale,
  toCanvasCompositeOperation,
  toKonvaFontStyle,
} from '../rendering/elementAppearance'
import { useElementSize } from './useElementSize'
import { CanvasBaseColorControl } from './CanvasBaseColorControl'
import { EpisodeHeightControls } from './EpisodeHeightControls'
import { useAssetImage, type AssetImageStatus } from './useAssetImage'

const RENDER_BUFFER = 160
const PROPORTIONAL_RESIZE_ANCHORS = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
]
const FREEFORM_RESIZE_ANCHORS = [
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
]

interface ElementNodeProps {
  readonly element: EpisodeElement
  readonly imageSourceUrl?: string
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
  readonly onPreviewBounds: (
    elementId: string,
    bounds: EpisodeElement['bounds'],
  ) => void
  readonly onClearPreview: (elementId?: string) => void
  readonly onSnapChange: (snapped: boolean) => void
}

interface ImageElementVisualProps {
  readonly sourceUrl?: string
  readonly width: number
  readonly height: number
  readonly presentation: 'single' | 'tile'
}

const IMAGE_PLACEHOLDER_LABELS = {
  missing: 'Missing image',
  loading: 'Loading image',
  error: 'Image unavailable',
} as const satisfies Readonly<
  Record<Exclude<AssetImageStatus, 'ready'>, string>
>

function ImageElementVisual({
  sourceUrl,
  width,
  height,
  presentation,
}: ImageElementVisualProps) {
  const { image, status } = useAssetImage(sourceUrl)

  if (status === 'ready' && image) {
    if (presentation === 'tile') {
      const patternScale = getTilePatternScale(
        image.naturalWidth || image.width,
        image.naturalHeight || image.height,
      )

      return (
        <Rect
          width={width}
          height={height}
          fillPatternImage={image}
          fillPatternRepeat="repeat"
          fillPatternScaleX={patternScale}
          fillPatternScaleY={patternScale}
          perfectDrawEnabled={false}
        />
      )
    }

    return (
      <KonvaImage
        image={image}
        width={width}
        height={height}
      />
    )
  }

  const placeholderStatus = status === 'ready' ? 'error' : status

  return (
    <Group
      name={`image-placeholder image-placeholder-${placeholderStatus}`}
    >
      <Rect
        width={width}
        height={height}
        fill="#29233A"
        stroke="#AFA6C8"
        strokeWidth={2}
        dash={[10, 7]}
      />
      <Text
        width={width}
        height={height}
        padding={12}
        text={IMAGE_PLACEHOLDER_LABELS[placeholderStatus]}
        fill="#D8D2E8"
        fontSize={Math.min(24, Math.max(12, height / 5))}
        align="center"
        verticalAlign="middle"
        listening={false}
      />
    </Group>
  )
}

function ElementNode({
  element,
  imageSourceUrl,
  isSelected,
  episodeLogicalWidth,
  episodeLogicalHeight,
  magnetEnabled,
  viewScale,
  onSelect,
  onMove,
  onResize,
  onPreviewBounds,
  onClearPreview,
  onSnapChange,
}: ElementNodeProps) {
  const { bounds } = element
  const nodeRef = useRef<Konva.Group>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const isFreeformResizable = isElementFreeformResizable(element)
  const isResizable = isSelected && !element.locked

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
  }, [bounds.height, bounds.width, isFreeformResizable, isResizable])

  useEffect(
    () => () => onClearPreview(element.id),
    [element.id, onClearPreview],
  )

  const getTransformedBounds = (node: Konva.Node) => ({
    x: node.x(),
    y: node.y(),
    width: bounds.width * Math.abs(node.scaleX()),
    height: bounds.height * Math.abs(node.scaleY()),
  })

  const constrainDrag = (
    node: Konva.Node,
    bypassMagnet: boolean,
  ) => {
    const requestedX = node.x()
    const centerSnap =
      magnetEnabled && !bypassMagnet
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
        id={element.id}
        name={`episode-element episode-element-${element.type}`}
        x={bounds.x}
        y={bounds.y}
        listening={element.opacity > 0}
        draggable={element.opacity > 0 && isSelected && !element.locked}
        onMouseDown={(event) => {
          event.cancelBubble = true
          onSelect(element.id)
        }}
        onTouchStart={(event) => {
          event.cancelBubble = true
          onSelect(element.id)
        }}
        onDragMove={(event) => {
          const position = constrainDrag(
            event.target,
            event.evt?.altKey ?? false,
          )
          onPreviewBounds(element.id, {
            ...bounds,
            ...position,
          })
        }}
        onDragEnd={(event) => {
          const position = constrainDrag(
            event.target,
            event.evt?.altKey ?? false,
          )
          onMove(element.id, position.x, position.y)
          onSnapChange(false)
        }}
        onTransform={(event) => {
          onPreviewBounds(element.id, getTransformedBounds(event.target))
        }}
        onTransformEnd={(event) => {
          const node = event.target
          const requestedBounds = getTransformedBounds(node)

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
        <Group
          name="episode-element-visual"
          opacity={element.opacity}
          globalCompositeOperation={toCanvasCompositeOperation(
            element.blendMode,
          )}
        >
          {element.type === 'shape' && element.shape === 'rectangle' ? (
            <Rect
              width={bounds.width}
              height={bounds.height}
              {...getKonvaShapeFillProps(element.fill, bounds.height)}
              stroke={element.stroke}
              strokeWidth={element.strokeWidth}
              cornerRadius={element.cornerRadius}
            />
          ) : null}

          {element.type === 'shape' && element.shape === 'ellipse' ? (
            <Ellipse
              x={bounds.width / 2}
              y={bounds.height / 2}
              radiusX={bounds.width / 2}
              radiusY={bounds.height / 2}
              {...getKonvaShapeFillProps(element.fill, bounds.height)}
              stroke={element.stroke}
              strokeWidth={element.strokeWidth}
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
              fontStyle={toKonvaFontStyle(element.fontWeight)}
              lineHeight={element.lineHeight}
              align={element.align}
              verticalAlign="middle"
            />
          ) : null}

          {element.type === 'image' ? (
            <ImageElementVisual
              sourceUrl={imageSourceUrl}
              width={bounds.width}
              height={bounds.height}
              presentation={element.presentation}
            />
          ) : null}
        </Group>

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
          enabledAnchors={
            isFreeformResizable
              ? FREEFORM_RESIZE_ANCHORS
              : PROPORTIONAL_RESIZE_ANCHORS
          }
          rotateEnabled={false}
          keepRatio={!isFreeformResizable}
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
  const importedImageAssets = useEditorStore(
    (state) => state.importedImageAssets,
  )
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
  const previewElementBounds = useEditorStore(
    (state) => state.previewElementBounds,
  )
  const clearElementBoundsPreview = useEditorStore(
    (state) => state.clearElementBoundsPreview,
  )
  const toggleMagnet = useEditorStore((state) => state.toggleMagnet)
  const toggleSliceGuides = useEditorStore(
    (state) => state.toggleSliceGuides,
  )
  const placeDraggedAsset = useEditorStore(
    (state) => state.placeDraggedAsset,
  )
  const reportAssetDropError = useEditorStore(
    (state) => state.reportAssetDropError,
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
  const resolvedImageAssets = useMemo(
    () =>
      new Map(
        episode.elements.flatMap((element) => {
          if (element.type !== 'image') {
            return []
          }

          return [
            [
              element.id,
              resolveImageAsset(element.assetReference, importedImageAssets),
            ] as const,
          ]
        }),
      ),
    [episode.elements, importedImageAssets],
  )
  const imageElementCount = resolvedImageAssets.size
  const visibleImageElementCount = visibleElements.filter(
    ({ type }) => type === 'image',
  ).length
  const missingImageElementCount = [...resolvedImageAssets.values()].filter(
    (asset) => asset === undefined,
  ).length

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

  const hasAssetDragPayload = (event: ReactDragEvent<HTMLDivElement>) =>
    Array.from(event.dataTransfer.types).includes(ASSET_DRAG_MIME_TYPE)

  const isCanvasChromeDropTarget = (target: EventTarget | null) =>
    target instanceof Element &&
    Boolean(
      target.closest(
        '.canvas-base-color-control, .episode-height-edge, .episode-end-controls',
      ),
    )

  const handleAssetDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    if (
      !hasAssetDragPayload(event) ||
      isCanvasChromeDropTarget(event.target)
    ) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  const handleAssetDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!hasAssetDragPayload(event)) {
      return
    }

    event.preventDefault()

    if (isCanvasChromeDropTarget(event.target)) {
      reportAssetDropError(
        'Drop the asset on the episode itself, not a canvas control.',
      )
      return
    }

    const payload = parseAssetDragPayload(
      event.dataTransfer.getData(ASSET_DRAG_MIME_TYPE),
    )

    if (!payload) {
      reportAssetDropError(
        'Only valid items from the ScrollSplice Asset Library can be dropped here.',
      )
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    const logicalCenter = clientPointToEpisodePosition(
      { x: event.clientX, y: event.clientY },
      { x: bounds.left, y: bounds.top },
      { x: groupX, y: -viewportY * viewScale },
      viewScale,
    )

    if (
      !logicalCenter ||
      logicalCenter.x < 0 ||
      logicalCenter.x > episode.logicalWidth ||
      logicalCenter.y < 0 ||
      logicalCenter.y > episode.logicalHeight
    ) {
      reportAssetDropError('Drop the asset inside the episode canvas.')
      return
    }

    placeDraggedAsset(payload, logicalCenter)
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
        data-selected-opacity={selectedElement?.opacity ?? ''}
        data-selected-blend-mode={selectedElement?.blendMode ?? ''}
        data-selected-fill-kind={
          selectedElement?.type === 'shape' ? selectedElement.fill.kind : ''
        }
        data-selected-image-presentation={
          selectedElement?.type === 'image'
            ? selectedElement.presentation
            : ''
        }
        data-image-element-count={imageElementCount}
        data-visible-image-element-count={visibleImageElementCount}
        data-missing-image-element-count={missingImageElementCount}
        data-resize-handle-count={
          selectedElement && !selectedElement.locked
            ? isElementFreeformResizable(selectedElement)
              ? FREEFORM_RESIZE_ANCHORS.length
              : PROPORTIONAL_RESIZE_ANCHORS.length
            : 0
        }
        role="region"
        aria-busy={size.width <= 0 || size.height <= 0}
        aria-label="Episode editing canvas. Use the mouse wheel, trackpad, or arrow keys to move through the episode."
        tabIndex={0}
        onKeyDown={handleKeyboardNavigation}
        onDragOver={handleAssetDragOver}
        onDrop={handleAssetDrop}
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
                  imageSourceUrl={
                    resolvedImageAssets.get(element.id)?.sourceUrl
                  }
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
                  onPreviewBounds={previewElementBounds}
                  onClearPreview={clearElementBoundsPreview}
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
            />
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

        <CanvasBaseColorControl />

        {isAtEpisodeEnd ? <EpisodeHeightControls viewScale={viewScale} /> : null}
      </div>

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
