import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent,
} from 'react'
import Konva from 'konva'
import {
  Ellipse,
  Circle,
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Path,
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
  MAX_TEXT_CONTENT_LENGTH,
  MIN_ELEMENT_SIZE,
  isElementFreeformResizable,
} from '../core/commands'
import {
  boundsIntersectViewport,
  clientPointToEpisodePosition,
  getFitScale,
  getElementSnap,
  getViewportScale,
} from '../core/coordinates'
import {
  clampElementGeometry,
  getCoverCropRect,
  getElementVisualBounds,
} from '../core/elementGeometry'
import {
  compareElementsByRenderOrder,
  getEffectiveEpisodeBaseColor,
  isElementEffectivelyVisible,
  type EpisodeElement,
  type ImageElement,
  type ImageMask,
  type SpeechBalloonElement,
  type TextElement,
} from '../core/episode'
import { getSpeechBalloonPath } from '../core/speechBalloonGeometry'
import { getSpeechBalloonTextLayout } from '../core/speechBalloonLayout'
import {
  getDefaultSpeechBalloonBodyControlPoints,
  getSpeechBalloonPresetId,
} from '../core/speechBalloonPresets'
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
import {
  useAssetImage,
  type AssetImageStatus,
} from '../assets/useAssetImage'

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
  readonly accentColor: string
  readonly isSelected: boolean
  readonly isPrimarySelected: boolean
  readonly isEditing: boolean
  readonly episodeLogicalWidth: number
  readonly episodeLogicalHeight: number
  readonly magnetEnabled: boolean
  readonly nearbyBounds: readonly EpisodeElement['bounds'][]
  readonly viewScale: number
  readonly onSelect: (elementId: string, toggle: boolean) => void
  readonly onEdit: (element: TextElement) => void
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
  readonly onSnapChange: (guides: {
    readonly x?: number
    readonly y?: number
  } | null) => void
}

interface ImageElementVisualProps {
  readonly element: ImageElement
  readonly sourceUrl?: string
}

const IMAGE_PLACEHOLDER_LABELS = {
  missing: 'Missing image',
  loading: 'Loading image',
  error: 'Image unavailable',
} as const satisfies Readonly<
  Record<Exclude<AssetImageStatus, 'ready'>, string>
>

function addImageMaskPath(
  context: Konva.Context,
  mask: ImageMask,
  width: number,
  height: number,
) {
  context.beginPath()

  if (mask.kind === 'polygon') {
    const first = mask.points[0]

    if (!first) return

    context.moveTo(first.x * width, first.y * height)
    mask.points.slice(1).forEach((point) => {
      context.lineTo(point.x * width, point.y * height)
    })
    context.closePath()
    return
  }

  const radius = Math.min(mask.cornerRadius, width / 2, height / 2)

  if (radius <= 0) {
    context.rect(0, 0, width, height)
    return
  }

  context.moveTo(radius, 0)
  context.lineTo(width - radius, 0)
  context.quadraticCurveTo(width, 0, width, radius)
  context.lineTo(width, height - radius)
  context.quadraticCurveTo(width, height, width - radius, height)
  context.lineTo(radius, height)
  context.quadraticCurveTo(0, height, 0, height - radius)
  context.lineTo(0, radius)
  context.quadraticCurveTo(0, 0, radius, 0)
  context.closePath()
}

function ImageFrameBorderVisual({
  element,
}: {
  readonly element: ImageElement
}) {
  const { bounds, frame } = element

  if (!frame.border || frame.border.width <= 0) return null

  if (frame.mask.kind === 'polygon') {
    return (
      <Line
        points={frame.mask.points.flatMap((point) => [
          point.x * bounds.width,
          point.y * bounds.height,
        ])}
        closed
        fillEnabled={false}
        stroke={frame.border.color}
        strokeWidth={frame.border.width}
        lineJoin="round"
        listening={false}
      />
    )
  }

  return (
    <Rect
      width={bounds.width}
      height={bounds.height}
      cornerRadius={Math.min(
        frame.mask.cornerRadius,
        bounds.width / 2,
        bounds.height / 2,
      )}
      fillEnabled={false}
      stroke={frame.border.color}
      strokeWidth={frame.border.width}
      listening={false}
    />
  )
}

function ImageElementVisual({
  element,
  sourceUrl,
}: ImageElementVisualProps) {
  const { image, status } = useAssetImage(sourceUrl)
  const { bounds, frame, presentation } = element
  const width = bounds.width
  const height = bounds.height

  if (status === 'ready' && image) {
    let imageVisual

    if (presentation === 'tile') {
      const patternScale = getTilePatternScale(
        image.naturalWidth || image.width,
        image.naturalHeight || image.height,
      )

      imageVisual = (
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
    } else if (presentation === 'cover') {
      const crop = getCoverCropRect(
        {
          width: image.naturalWidth || image.width,
          height: image.naturalHeight || image.height,
        },
        { width, height },
        frame.crop,
      )

      imageVisual = crop ? (
        <KonvaImage
          image={image}
          width={width}
          height={height}
          cropX={crop.x}
          cropY={crop.y}
          cropWidth={crop.width}
          cropHeight={crop.height}
        />
      ) : null
    } else {
      imageVisual = (
        <KonvaImage image={image} width={width} height={height} />
      )
    }

    return (
      <Group>
        <Group
          clipFunc={(context) =>
            addImageMaskPath(context, frame.mask, width, height)
          }
        >
          {imageVisual}
        </Group>
        <ImageFrameBorderVisual element={element} />
      </Group>
    )
  }

  const placeholderStatus = status === 'ready' ? 'error' : status

  return (
    <Group>
      <Group
        name={`image-placeholder image-placeholder-${placeholderStatus}`}
        clipFunc={(context) =>
          addImageMaskPath(context, frame.mask, width, height)
        }
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
      <ImageFrameBorderVisual element={element} />
    </Group>
  )
}

function SpeechBalloonVisual({
  element,
  selected,
  accentColor,
}: {
  readonly element: SpeechBalloonElement
  readonly selected: boolean
  readonly accentColor: string
}) {
  const updateSpeechBalloonElement = useEditorStore(
    (state) => state.updateSpeechBalloonElement,
  )
  const presetId = getSpeechBalloonPresetId(element)
  const defaultPoints = useMemo(
    () => getDefaultSpeechBalloonBodyControlPoints(presetId),
    [presetId],
  )
  const [draftPoints, setDraftPoints] = useState(
    element.bodyControlPoints ?? defaultPoints,
  )
  const [draftActive, setDraftActive] = useState(false)

  const visibleControlPoints = draftActive
    ? draftPoints
    : element.bodyControlPoints ?? defaultPoints
  const path = getSpeechBalloonPath(
    { x: 0, y: 0, width: element.bounds.width, height: element.bounds.height },
    element.cornerRadius,
    element.tail,
    presetId,
    element.bodyControlPoints ?? (draftActive ? draftPoints : undefined),
  )
  const layout = getSpeechBalloonTextLayout(element)

  if (!path) return null

  return (
    <Group data-testid={`editable-balloon-${element.id}`}>
      {path.tailPathData ? (
        <Path
          data={path.tailPathData}
          fill={element.fill}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
          dash={path.strokeDash ? [...path.strokeDash] : undefined}
          lineJoin="round"
        />
      ) : null}
      <Path
        data={path.bodyPathData}
        fill={element.fill}
        stroke={element.stroke}
        strokeWidth={element.strokeWidth}
        dash={path.strokeDash ? [...path.strokeDash] : undefined}
        lineJoin="round"
      />
      {path.decorationPathData.map((data, index) => (
        <Path
          key={`${element.id}-balloon-decoration-${index}`}
          data={data}
          stroke={element.stroke}
          strokeWidth={Math.max(1, element.strokeWidth * 0.6)}
          lineJoin="round"
          lineCap="round"
          listening={false}
        />
      ))}
      {element.text ? <Text
        width={element.bounds.width}
        height={element.bounds.height}
        padding={element.padding}
        text={layout.lines.join('\n')}
        fill={element.textFill}
        fontFamily={element.fontFamily}
        fontSize={layout.fontSize}
        fontStyle={toKonvaFontStyle(element.fontWeight)}
        lineHeight={element.lineHeight}
        align={element.align}
        verticalAlign="middle"
        wrap="none"
        ellipsis={!layout.fits}
        listening={false}
      /> : null}
      {selected && !element.locked
        ? visibleControlPoints.map((point, index) => (
            <Circle
              key={`${element.id}-contour-${index}`}
              data-testid={`balloon-contour-handle-${index}`}
              x={point.x * element.bounds.width}
              y={point.y * element.bounds.height}
              radius={7}
              fill="#fff"
              stroke={accentColor}
              strokeWidth={2}
              draggable
              dragBoundFunc={(position) => ({
                x: Math.max(0, Math.min(element.bounds.width, position.x)),
                y: Math.max(0, Math.min(element.bounds.height, position.y)),
              })}
              onMouseDown={(event) => {
                event.cancelBubble = true
              }}
              onDragMove={(event) => {
                event.cancelBubble = true
                const next = visibleControlPoints.map((candidate, candidateIndex) =>
                  candidateIndex === index
                    ? {
                        x: event.target.x() / element.bounds.width,
                        y: event.target.y() / element.bounds.height,
                      }
                    : candidate,
                )
                setDraftActive(true)
                setDraftPoints(next)
              }}
              onDragEnd={(event) => {
                event.cancelBubble = true
                const next = visibleControlPoints.map((candidate, candidateIndex) =>
                  candidateIndex === index
                    ? {
                        x: event.target.x() / element.bounds.width,
                        y: event.target.y() / element.bounds.height,
                      }
                    : candidate,
                )
                setDraftPoints(next)
                updateSpeechBalloonElement(element.id, {
                  ...element,
                  bodyControlPoints: next,
                })
                setDraftActive(false)
              }}
            />
          ))
        : null}
    </Group>
  )
}

function ElementNode({
  element,
  imageSourceUrl,
  accentColor,
  isSelected,
  isPrimarySelected,
  isEditing,
  episodeLogicalWidth,
  episodeLogicalHeight,
  magnetEnabled,
  nearbyBounds,
  viewScale,
  onSelect,
  onEdit,
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
  const isResizable = isPrimarySelected && !element.locked
  const flipScaleX = element.transform.flipX ? -1 : 1
  const flipScaleY = element.transform.flipY ? -1 : 1

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
  }, [
    bounds.height,
    bounds.width,
    element.transform.flipX,
    element.transform.flipY,
    element.transform.rotationDegrees,
    isFreeformResizable,
    isResizable,
  ])

  useEffect(
    () => () => onClearPreview(element.id),
    [element.id, onClearPreview],
  )

  const getTransformedBounds = (node: Konva.Node) => {
    const width = bounds.width * Math.abs(node.scaleX())
    const height = bounds.height * Math.abs(node.scaleY())
    const requestedBounds = {
      x: node.x() - width / 2,
      y: node.y() - height / 2,
      width,
      height,
    }

    return (
      clampElementGeometry(
        requestedBounds,
        element.transform,
        element.overflow,
        { width: episodeLogicalWidth, height: episodeLogicalHeight },
      ) ?? requestedBounds
    )
  }

  const constrainDrag = (
    node: Konva.Node,
    bypassMagnet: boolean,
  ) => {
    const requestedPosition = {
      x: node.x() - bounds.width / 2,
      y: node.y() - bounds.height / 2,
    }
    const snap =
      magnetEnabled && !bypassMagnet
        ? getElementSnap(
            requestedPosition,
            { width: bounds.width, height: bounds.height },
            {
              width: episodeLogicalWidth,
              height: episodeLogicalHeight,
            },
            nearbyBounds,
            viewScale,
          )
        : {
            position: requestedPosition,
            snappedX: false,
            snappedY: false,
          }
    const snappedPosition =
      element.overflow === 'bleed'
        ? {
            x: snap.snappedX ? snap.position.x : requestedPosition.x,
            y: snap.snappedY ? snap.position.y : requestedPosition.y,
          }
        : snap.position
    const clampedBounds = clampElementGeometry(
      { ...bounds, ...snappedPosition },
      element.transform,
      element.overflow,
      { width: episodeLogicalWidth, height: episodeLogicalHeight },
    ) ?? { ...bounds, ...requestedPosition }
    const position = { x: clampedBounds.x, y: clampedBounds.y }

    node.position({
      x: position.x + bounds.width / 2,
      y: position.y + bounds.height / 2,
    })
    onSnapChange(
      snap.snappedX || snap.snappedY
        ? {
            ...(snap.guideX === undefined ? {} : { x: snap.guideX }),
            ...(snap.guideY === undefined ? {} : { y: snap.guideY }),
          }
        : null,
    )

    return position
  }

  return (
    <>
      <Group
        ref={nodeRef}
        id={element.id}
        name={`episode-element episode-element-${element.type}`}
        x={bounds.x + bounds.width / 2}
        y={bounds.y + bounds.height / 2}
        offsetX={bounds.width / 2}
        offsetY={bounds.height / 2}
        rotation={element.transform.rotationDegrees}
        scaleX={flipScaleX}
        scaleY={flipScaleY}
        listening={element.opacity > 0}
        draggable={
          element.opacity > 0 &&
          isPrimarySelected &&
          !element.locked &&
          !isEditing
        }
        onMouseDown={(event) => {
          event.cancelBubble = true
          onSelect(element.id, event.evt.shiftKey)
        }}
        onTouchStart={(event) => {
          event.cancelBubble = true
          onSelect(element.id, false)
        }}
        onDblClick={(event) => {
          if (element.type !== 'text' || element.locked) return
          event.cancelBubble = true
          onEdit(element)
        }}
        onDblTap={(event) => {
          if (element.type !== 'text' || element.locked) return
          event.cancelBubble = true
          onEdit(element)
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
          onSnapChange(null)
        }}
        onTransform={(event) => {
          onPreviewBounds(element.id, getTransformedBounds(event.target))
        }}
        onTransformEnd={(event) => {
          const node = event.target
          const requestedBounds = getTransformedBounds(node)

          node.scale({ x: flipScaleX, y: flipScaleY })
          node.position({
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2,
          })
          onResize(element.id, requestedBounds)
        }}
        onMouseEnter={(event) => {
          const stage = event.target.getStage()
          if (stage) {
            stage.container().style.cursor =
              element.type === 'text' && !element.locked
                ? 'text'
                : isSelected
                  ? 'grab'
                  : 'pointer'
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
              visible={!isEditing}
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
              element={element}
              sourceUrl={imageSourceUrl}
            />
          ) : null}

          {element.type === 'speech-balloon' ? (
            <SpeechBalloonVisual
              element={element}
              selected={isPrimarySelected}
              accentColor={accentColor}
            />
          ) : null}
        </Group>

        {isSelected && !isResizable ? (
          <Rect
            x={-6}
            y={-6}
            width={bounds.width + 12}
            height={bounds.height + 12}
            stroke={accentColor}
            strokeWidth={4}
            dash={[12, 7]}
            cornerRadius={8}
            shadowColor={accentColor}
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
          anchorStroke={accentColor}
          anchorStrokeWidth={2}
          borderStroke={accentColor}
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

export function EditorCanvas({ accentColor }: { readonly accentColor: string }) {
  const episode = useEditorStore((state) => state.episode)
  const importedImageAssets = useEditorStore(
    (state) => state.importedImageAssets,
  )
  const selectedElementId = useEditorStore((state) => state.selectedElementId)
  const selectedElementIds = useEditorStore((state) => state.selectedElementIds)
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
  const nudgeSelectedElement = useEditorStore(
    (state) => state.nudgeSelectedElement,
  )
  const resizeElement = useEditorStore((state) => state.resizeElement)
  const updateTextElement = useEditorStore(
    (state) => state.updateTextElement,
  )
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
  const importAndPlaceImageAsset = useEditorStore(
    (state) => state.importAndPlaceImageAsset,
  )
  const assetLibraryBusy = useEditorStore((state) => state.assetLibraryBusy)
  const assetLibraryMessage = useEditorStore(
    (state) => state.assetLibraryMessage,
  )
  const assetLibraryMessageKind = useEditorStore(
    (state) => state.assetLibraryMessageKind,
  )
  const reportAssetDropError = useEditorStore(
    (state) => state.reportAssetDropError,
  )
  const [alignmentGuides, setAlignmentGuides] = useState<{
    readonly x?: number
    readonly y?: number
  } | null>(null)
  const [externalFileDropActive, setExternalFileDropActive] = useState(false)
  const [showFileDropFeedback, setShowFileDropFeedback] = useState(false)
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [editingTextDraft, setEditingTextDraft] = useState('')
  const [editingTextDragOffset, setEditingTextDragOffset] = useState({
    x: 0,
    y: 0,
  })
  const editingTextAreaRef = useRef<HTMLTextAreaElement>(null)
  const editingTextDragRef = useRef<{
    readonly pointerId: number
    readonly clientX: number
    readonly clientY: number
    readonly startX: number
    readonly startY: number
    offsetX: number
    offsetY: number
  } | null>(null)
  const preserveTextSelectionOnCanvasPointerRef = useRef(false)
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
  const selectedElement = episode.elements.find(
    ({ id }) => id === selectedElementId,
  )
  const editingTextElement = episode.elements.find(
    (element): element is TextElement =>
      element.id === editingTextId && element.type === 'text',
  )
  const editingTextVerticalInset = useMemo(() => {
    if (!editingTextElement) return 0

    const measurement = new Konva.Text({
      width: editingTextElement.bounds.width,
      height: editingTextElement.bounds.height,
      text: editingTextDraft,
      fontFamily: editingTextElement.fontFamily,
      fontSize: editingTextElement.fontSize,
      fontStyle: toKonvaFontStyle(editingTextElement.fontWeight),
      lineHeight: editingTextElement.lineHeight,
      align: editingTextElement.align,
      verticalAlign: 'middle',
    })
    const renderedTextHeight =
      measurement.textArr.length *
      editingTextElement.fontSize *
      editingTextElement.lineHeight
    measurement.destroy()

    return Math.max(
      (editingTextElement.bounds.height - renderedTextHeight) / 2,
      0,
    )
  }, [editingTextDraft, editingTextElement])

  useEffect(() => {
    if (!editingTextElement) return

    const textArea = editingTextAreaRef.current
    textArea?.focus()
    textArea?.select()
  }, [editingTextElement])

  const finishTextEditing = (commit: boolean) => {
    const currentText =
      editingTextAreaRef.current?.value ?? editingTextDraft

    if (commit && editingTextElement && currentText.trim()) {
      updateTextElement(editingTextElement.id, {
        text: currentText,
        fill: editingTextElement.fill,
        fontSize: editingTextElement.fontSize,
        fontWeight: editingTextElement.fontWeight,
        align: editingTextElement.align,
      })
    }

    setEditingTextId(null)
    setEditingTextDragOffset({ x: 0, y: 0 })
  }

  const finishEditingTextDrag = (
    element: HTMLElement,
    pointerId: number,
  ) => {
    const drag = editingTextDragRef.current
    if (!drag || !editingTextElement || drag.pointerId !== pointerId) return

    if (element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId)
    }
    moveElement(editingTextElement.id, {
      x: drag.startX + drag.offsetX,
      y: drag.startY + drag.offsetY,
    })
    clearElementBoundsPreview(editingTextElement.id)
    editingTextDragRef.current = null
    setEditingTextDragOffset({ x: 0, y: 0 })
    requestAnimationFrame(() => editingTextAreaRef.current?.focus())
  }
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
              getElementVisualBounds(element) ?? element.bounds,
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
  const nearbySnapBounds = useMemo(
    () =>
      episode.elements
        .filter(
          (candidate) =>
            !selectedElementIds.includes(candidate.id) &&
            isElementEffectivelyVisible(episode, candidate),
        )
        .map((candidate) => candidate.bounds),
    [episode, selectedElementIds],
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

    if (
      selectedElementId &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      nudgeSelectedElement({
        x: isHorizontal ? direction * (event.shiftKey ? 10 : 1) : 0,
        y: isHorizontal ? 0 : direction * (event.shiftKey ? 10 : 1),
      })
    ) {
      return
    }

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

  const hasExternalFiles = (event: ReactDragEvent<HTMLDivElement>) =>
    Array.from(event.dataTransfer.types).includes('Files')

  const isCanvasChromeDropTarget = (target: EventTarget | null) =>
    target instanceof Element &&
    Boolean(
      target.closest(
        '.canvas-base-color-control, .episode-height-edge, .episode-end-controls',
      ),
    )

  const handleAssetDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    const isInternalAsset = hasAssetDragPayload(event)
    const isExternalFile = hasExternalFiles(event)

    if (!isInternalAsset && !isExternalFile) return

    event.preventDefault()
    const isChromeTarget = isCanvasChromeDropTarget(event.target)
    event.dataTransfer.dropEffect = isChromeTarget ? 'none' : 'copy'
    setExternalFileDropActive(isExternalFile && !isChromeTarget)
  }

  const handleAssetDragLeave = (event: ReactDragEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget

    if (
      nextTarget instanceof Node &&
      event.currentTarget.contains(nextTarget)
    ) {
      return
    }

    setExternalFileDropActive(false)
  }

  const getDropLogicalCenter = (event: ReactDragEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()

    return clientPointToEpisodePosition(
      { x: event.clientX, y: event.clientY },
      { x: bounds.left, y: bounds.top },
      { x: groupX, y: -viewportY * viewScale },
      viewScale,
    )
  }

  const handleAssetDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    const isInternalAsset = hasAssetDragPayload(event)
    const isExternalFile = hasExternalFiles(event)

    if (!isInternalAsset && !isExternalFile) return

    event.preventDefault()
    setExternalFileDropActive(false)

    if (isCanvasChromeDropTarget(event.target)) {
      reportAssetDropError(
        'Drop the asset on the episode itself, not a canvas control.',
      )
      return
    }

    const logicalCenter = getDropLogicalCenter(event)

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

    if (isExternalFile) {
      const files = Array.from(event.dataTransfer.files)
      setShowFileDropFeedback(true)

      if (files.length !== 1 || !files[0]) {
        reportAssetDropError('Drop one PNG, JPEG, or WebP image at a time.')
        return
      }

      void importAndPlaceImageAsset(files[0], logicalCenter)
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
        data-selected-element-count={selectedElementIds.length}
        data-selected-x={selectedElement?.bounds.x ?? ''}
        data-selected-y={selectedElement?.bounds.y ?? ''}
        data-selected-width={selectedElement?.bounds.width ?? ''}
        data-selected-height={selectedElement?.bounds.height ?? ''}
        data-selected-text={
          selectedElement?.type === 'text' ? selectedElement.text : ''
        }
        data-selected-opacity={selectedElement?.opacity ?? ''}
        data-selected-blend-mode={selectedElement?.blendMode ?? ''}
        data-selected-rotation={
          selectedElement?.transform.rotationDegrees ?? ''
        }
        data-selected-flip-x={selectedElement?.transform.flipX ?? ''}
        data-selected-flip-y={selectedElement?.transform.flipY ?? ''}
        data-selected-overflow={selectedElement?.overflow ?? ''}
        data-selected-fill-kind={
          selectedElement?.type === 'shape' ? selectedElement.fill.kind : ''
        }
        data-selected-image-presentation={
          selectedElement?.type === 'image'
            ? selectedElement.presentation
            : ''
        }
        data-selected-image-mask={
          selectedElement?.type === 'image'
            ? selectedElement.frame.mask.kind
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
        onDragEnter={handleAssetDragOver}
        onDragOver={handleAssetDragOver}
        onDragLeave={handleAssetDragLeave}
        onDrop={handleAssetDrop}
        onPointerDownCapture={(event) => {
          if (
            editingTextElement &&
            event.target !== editingTextAreaRef.current
          ) {
            preserveTextSelectionOnCanvasPointerRef.current = true
          }
        }}
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
            if (preserveTextSelectionOnCanvasPointerRef.current) {
              preserveTextSelectionOnCanvasPointerRef.current = false
              return
            }

            if (editingTextElement) {
              finishTextEditing(true)
              return
            }

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
                  accentColor={accentColor}
                  isSelected={selectedElementIds.includes(element.id)}
                  isPrimarySelected={element.id === selectedElementId}
                  isEditing={element.id === editingTextId}
                  episodeLogicalWidth={episode.logicalWidth}
                  episodeLogicalHeight={episode.logicalHeight}
                  magnetEnabled={magnetEnabled}
                  nearbyBounds={nearbySnapBounds}
                  viewScale={viewScale}
                  onSelect={(elementId, toggle) =>
                    selectElement(elementId, false, toggle)
                  }
                  onEdit={(textElement) => {
                    selectElement(textElement.id)
                    setEditingTextDraft(textElement.text)
                    setEditingTextDragOffset({ x: 0, y: 0 })
                    setEditingTextId(textElement.id)
                  }}
                  onMove={(elementId, x, y) =>
                    moveElement(elementId, { x, y })
                  }
                  onResize={(elementId, bounds) =>
                    resizeElement(elementId, bounds)
                  }
                  onPreviewBounds={previewElementBounds}
                  onClearPreview={clearElementBoundsPreview}
                  onSnapChange={setAlignmentGuides}
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

          {alignmentGuides?.x !== undefined ? (
            <div
              className="center-snap-guide"
              data-testid={
                Math.abs(
                  alignmentGuides.x - episode.logicalWidth / 2,
                ) < 0.000001
                  ? 'center-snap-guide'
                  : 'vertical-alignment-guide'
              }
              data-guide-axis="vertical"
              style={{
                left: groupX + alignmentGuides.x * viewScale,
              }}
            />
          ) : null}

          {alignmentGuides?.y !== undefined ? (
            <div
              className="horizontal-snap-guide"
              data-testid="horizontal-alignment-guide"
              style={{
                left: groupX,
                top: (alignmentGuides.y - viewportY) * viewScale,
                width: episode.logicalWidth * viewScale,
              }}
            />
          ) : null}
        </div>

        {editingTextElement ? (
          <textarea
            ref={editingTextAreaRef}
            className="canvas-text-editor"
            aria-label={`Edit ${editingTextElement.name} on canvas`}
            data-testid="canvas-text-editor"
            maxLength={MAX_TEXT_CONTENT_LENGTH}
            value={editingTextDraft}
            style={{
              left:
                groupX +
                (editingTextElement.bounds.x +
                  editingTextDragOffset.x +
                  editingTextElement.bounds.width / 2) *
                  viewScale,
              top:
                (editingTextElement.bounds.y +
                  editingTextDragOffset.y +
                  editingTextElement.bounds.height / 2 -
                  viewportY) *
                viewScale,
              width: editingTextElement.bounds.width * viewScale,
              height: editingTextElement.bounds.height * viewScale,
              color: editingTextElement.fill,
              fontFamily: editingTextElement.fontFamily,
              fontSize: editingTextElement.fontSize * viewScale,
              fontWeight: editingTextElement.fontWeight,
              lineHeight: editingTextElement.lineHeight,
              textAlign: editingTextElement.align,
              paddingTop: editingTextVerticalInset * viewScale,
              outlineColor: accentColor,
              opacity: editingTextElement.opacity,
              transform: `translate(-50%, -50%) rotate(${editingTextElement.transform.rotationDegrees}deg) scale(${editingTextElement.transform.flipX ? -1 : 1}, ${editingTextElement.transform.flipY ? -1 : 1})`,
            }}
            onChange={(event) => setEditingTextDraft(event.currentTarget.value)}
            onBlur={() => finishTextEditing(true)}
            onKeyDown={(event) => {
              event.stopPropagation()

              if (event.key === 'Escape') {
                event.preventDefault()
                finishTextEditing(false)
              } else if (
                event.key === 'Enter' &&
                (event.metaKey || event.ctrlKey)
              ) {
                event.preventDefault()
                finishTextEditing(true)
              }
            }}
          />
        ) : null}

        {editingTextElement ? (
          <button
            type="button"
            className="canvas-text-move-handle"
            aria-label={`Move ${editingTextElement.name}`}
            title="Drag To Move Text Box"
            style={{
              left:
                groupX +
                (editingTextElement.bounds.x +
                  editingTextDragOffset.x +
                  editingTextElement.bounds.width / 2) *
                  viewScale,
              top:
                (editingTextElement.bounds.y +
                  editingTextDragOffset.y -
                  viewportY) *
                viewScale,
              transform: `translate(-50%, calc(-100% - 5px)) rotate(${editingTextElement.transform.rotationDegrees}deg)`,
            }}
            onPointerDown={(event) => {
              event.preventDefault()
              event.stopPropagation()
              event.currentTarget.setPointerCapture(event.pointerId)
              editingTextDragRef.current = {
                pointerId: event.pointerId,
                clientX: event.clientX,
                clientY: event.clientY,
                startX: editingTextElement.bounds.x,
                startY: editingTextElement.bounds.y,
                offsetX: 0,
                offsetY: 0,
              }
            }}
            onPointerMove={(event) => {
              const drag = editingTextDragRef.current
              if (!drag || drag.pointerId !== event.pointerId) return

              const offset = {
                x: (event.clientX - drag.clientX) / viewScale,
                y: (event.clientY - drag.clientY) / viewScale,
              }
              drag.offsetX = offset.x
              drag.offsetY = offset.y
              setEditingTextDragOffset(offset)
              previewElementBounds(editingTextElement.id, {
                ...editingTextElement.bounds,
                x: drag.startX + offset.x,
                y: drag.startY + offset.y,
              })
            }}
            onPointerUp={(event) =>
              finishEditingTextDrag(event.currentTarget, event.pointerId)
            }
            onPointerCancel={(event) =>
              finishEditingTextDrag(event.currentTarget, event.pointerId)
            }
          >
            <span aria-hidden="true">•••</span>
          </button>
        ) : null}

        <CanvasBaseColorControl />

        {externalFileDropActive ? (
          <div className="canvas-file-drop-prompt" aria-hidden="true">
            <strong>Drop to Import and Place</strong>
            <span>PNG, JPEG, or WebP · saved locally with source alpha</span>
          </div>
        ) : null}

        {showFileDropFeedback && assetLibraryMessage ? (
          <div
            className={`canvas-file-drop-status${assetLibraryMessageKind === 'error' ? ' is-error' : ''}`}
            role={assetLibraryMessageKind === 'error' ? 'alert' : 'status'}
            aria-live="polite"
          >
            {assetLibraryBusy ? 'Working… ' : ''}
            {assetLibraryMessage}
          </div>
        ) : null}

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
          Slice Guides {sliceGuidesVisible ? 'On' : 'Off'}
        </button>
        <button
          type="button"
          className="fit-width-button"
          onClick={() => setZoomFactor(1)}
        >
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
      </div>
    </div>
  )
}
