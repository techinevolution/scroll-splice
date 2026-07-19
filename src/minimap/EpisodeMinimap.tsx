import { useEffect, useMemo, useRef, type KeyboardEvent, type PointerEvent } from 'react'

import { useEditorStore } from '../app/store'
import { resolveImageAsset } from '../assets/runtime'
import {
  getMinimapViewportBox2D,
  minimapPointerToViewportPosition,
  type LogicalPosition,
} from '../core/coordinates'
import {
  getCoverCropRect,
  getImageMaskPath,
} from '../core/elementGeometry'
import {
  compareElementsByRenderOrder,
  getEffectiveEpisodeBaseColor,
  isElementEffectivelyVisible,
  type ElementBounds,
  type EpisodeElement,
  type ImageElement,
  type ShapeElement,
  type SpeechBalloonElement,
} from '../core/episode'
import { getSpeechBalloonPath } from '../core/speechBalloonGeometry'
import { useAssetImage } from '../assets/useAssetImage'
import {
  getTilePatternScale,
  toCssMixBlendMode,
} from '../rendering/elementAppearance'

interface MinimapElementProps {
  readonly element: EpisodeElement
  readonly bounds: ElementBounds
  readonly isSelected: boolean
  readonly imageSourceUrl?: string
  readonly definitionId: string
}

interface MinimapImageElementProps {
  readonly element: ImageElement
  readonly bounds: ElementBounds
  readonly sourceUrl?: string
  readonly isSelected: boolean
  readonly definitionId: string
}

function getSvgElementTransform(
  element: EpisodeElement,
  bounds: ElementBounds = element.bounds,
): string {
  const centerX = bounds.x + bounds.width / 2
  const centerY = bounds.y + bounds.height / 2
  const scaleX = element.transform.flipX ? -1 : 1
  const scaleY = element.transform.flipY ? -1 : 1

  return `translate(${centerX} ${centerY}) rotate(${element.transform.rotationDegrees}) scale(${scaleX} ${scaleY}) translate(${-centerX} ${-centerY})`
}

function SvgImageMaskDefinition({
  element,
  bounds,
  clipId,
}: {
  readonly element: ImageElement
  readonly bounds: ElementBounds
  readonly clipId: string
}) {
  const path = getImageMaskPath(element.frame, bounds)

  if (!path) return null

  return (
    <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
      {path.kind === 'rectangle' ? (
        <rect
          x={path.bounds.x}
          y={path.bounds.y}
          width={path.bounds.width}
          height={path.bounds.height}
          rx={path.cornerRadius}
        />
      ) : (
        <polygon
          points={path.points.map(({ x, y }) => `${x},${y}`).join(' ')}
        />
      )}
    </clipPath>
  )
}

function SvgImageFrameBorder({
  element,
  bounds,
}: {
  readonly element: ImageElement
  readonly bounds: ElementBounds
}) {
  const path = getImageMaskPath(element.frame, bounds)
  const border = element.frame.border

  if (!path || !border || border.width <= 0) return null

  return path.kind === 'rectangle' ? (
    <rect
      x={path.bounds.x}
      y={path.bounds.y}
      width={path.bounds.width}
      height={path.bounds.height}
      rx={path.cornerRadius}
      fill="none"
      stroke={border.color}
      strokeWidth={border.width}
    />
  ) : (
    <polygon
      points={path.points.map(({ x, y }) => `${x},${y}`).join(' ')}
      fill="none"
      stroke={border.color}
      strokeWidth={border.width}
      strokeLinejoin="round"
    />
  )
}

function MinimapImageElement({
  element,
  bounds,
  sourceUrl,
  isSelected,
  definitionId,
}: MinimapImageElementProps) {
  const { image, status } = useAssetImage(sourceUrl)
  const patternId = `${definitionId}-pattern`
  const clipId = `${definitionId}-clip`
  const imageIsReady = status === 'ready' && image !== null
  const patternScale = imageIsReady
    ? getTilePatternScale(
        image.naturalWidth || image.width,
        image.naturalHeight || image.height,
      )
    : 1
  const tileWidth = imageIsReady
    ? (image.naturalWidth || image.width) * patternScale
    : 1
  const tileHeight = imageIsReady
    ? (image.naturalHeight || image.height) * patternScale
    : 1
  const coverCrop = imageIsReady
    ? getCoverCropRect(
        {
          width: image.naturalWidth || image.width,
          height: image.naturalHeight || image.height,
        },
        { width: bounds.width, height: bounds.height },
        element.frame.crop,
      )
    : undefined

  return (
    <>
      <defs>
        <SvgImageMaskDefinition
          element={element}
          bounds={bounds}
          clipId={clipId}
        />
      </defs>
      {imageIsReady && element.presentation === 'tile' ? (
        <defs>
          <pattern
            id={patternId}
            x={bounds.x}
            y={bounds.y}
            width={tileWidth}
            height={tileHeight}
            patternUnits="userSpaceOnUse"
            patternContentUnits="userSpaceOnUse"
          >
            <image
              href={image.src}
              x={bounds.x}
              y={bounds.y}
              width={tileWidth}
              height={tileHeight}
              preserveAspectRatio="none"
            />
          </pattern>
        </defs>
      ) : null}

      <g clipPath={`url(#${clipId})`}>
        <g
          data-element-id={element.id}
          data-image-status={status}
          data-opacity={element.opacity}
          data-blend-mode={element.blendMode}
          data-image-presentation={element.presentation}
          data-image-mask={element.frame.mask.kind}
          opacity={element.opacity}
          style={{ mixBlendMode: toCssMixBlendMode(element.blendMode) }}
        >
          {imageIsReady ? (
            element.presentation === 'tile' ? (
              <rect
                x={bounds.x}
                y={bounds.y}
                width={bounds.width}
                height={bounds.height}
                fill={`url(#${patternId})`}
              />
            ) : element.presentation === 'cover' && coverCrop ? (
              <svg
                x={bounds.x}
                y={bounds.y}
                width={bounds.width}
                height={bounds.height}
                viewBox={`${coverCrop.x} ${coverCrop.y} ${coverCrop.width} ${coverCrop.height}`}
                preserveAspectRatio="none"
                overflow="hidden"
              >
                <image
                  href={image.src}
                  x="0"
                  y="0"
                  width={image.naturalWidth || image.width}
                  height={image.naturalHeight || image.height}
                  preserveAspectRatio="none"
                />
              </svg>
            ) : (
              <image
                href={image.src}
                x={bounds.x}
                y={bounds.y}
                width={bounds.width}
                height={bounds.height}
                preserveAspectRatio="none"
              />
            )
          ) : (
            <>
              <rect
                x={bounds.x}
                y={bounds.y}
                width={bounds.width}
                height={bounds.height}
                fill="#29233A"
              />
              <path
                d={`M ${bounds.x} ${bounds.y} L ${bounds.x + bounds.width} ${bounds.y + bounds.height} M ${bounds.x + bounds.width} ${bounds.y} L ${bounds.x} ${bounds.y + bounds.height}`}
                fill="none"
                stroke="#AFA6C8"
                strokeWidth="6"
              />
            </>
          )}
        </g>
      </g>
      <SvgImageFrameBorder element={element} bounds={bounds} />

      {isSelected ? (
        <rect
          data-selection-outline-for={element.id}
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
          fill="none"
          stroke="var(--ui-accent)"
          strokeWidth="12"
        />
      ) : null}
    </>
  )
}

function ShapeGradientDefinition({
  element,
  definitionId,
}: {
  readonly element: ShapeElement
  readonly definitionId: string
}) {
  if (element.fill.kind !== 'vertical-gradient') {
    return null
  }

  return (
    <defs>
      <linearGradient
        id={`${definitionId}-gradient`}
        x1="0%"
        y1="0%"
        x2="0%"
        y2="100%"
      >
        <stop
          offset="0%"
          stopColor={element.fill.top.color}
          stopOpacity={element.fill.top.opacity}
        />
        <stop
          offset="100%"
          stopColor={element.fill.bottom.color}
          stopOpacity={element.fill.bottom.opacity}
        />
      </linearGradient>
    </defs>
  )
}

function MinimapSpeechBalloon({
  element,
  bounds,
  isSelected,
}: {
  readonly element: SpeechBalloonElement
  readonly bounds: ElementBounds
  readonly isSelected: boolean
}) {
  const path = getSpeechBalloonPath(bounds, element.cornerRadius, element.tail)

  if (!path) return null

  return (
    <>
      <path
        data-element-id={element.id}
        data-element-type="speech-balloon"
        d={path.pathData}
        fill={element.fill}
        stroke={element.stroke}
        strokeWidth={element.strokeWidth}
        opacity={element.opacity}
        style={{ mixBlendMode: toCssMixBlendMode(element.blendMode) }}
        strokeLinejoin="round"
      />
      <rect
        x={bounds.x + bounds.width * 0.24}
        y={bounds.y + bounds.height * 0.42}
        width={bounds.width * 0.52}
        height={Math.max(bounds.height * 0.1, 8)}
        rx="4"
        fill={element.textFill}
        opacity={element.opacity * 0.75}
      />
      {isSelected ? (
        <path
          data-selection-outline-for={element.id}
          d={path.pathData}
          fill="none"
          stroke="var(--ui-accent)"
          strokeWidth="12"
          strokeLinejoin="round"
        />
      ) : null}
    </>
  )
}

function MinimapElement({
  element,
  bounds,
  isSelected,
  imageSourceUrl,
  definitionId,
}: MinimapElementProps) {
  const visualStyle = {
    mixBlendMode: toCssMixBlendMode(element.blendMode),
  }
  const elementTransform = getSvgElementTransform(element, bounds)

  if (element.type === 'text') {
    const textPreviewHeight = Math.max(bounds.height * 0.38, 12)

    return (
      <g
        transform={elementTransform}
        data-rotation={element.transform.rotationDegrees}
        data-flip-x={element.transform.flipX}
        data-flip-y={element.transform.flipY}
      >
        <g
          data-element-id={element.id}
          data-opacity={element.opacity}
          data-blend-mode={element.blendMode}
          opacity={element.opacity}
          style={visualStyle}
        >
          <rect
            x={bounds.x}
            y={bounds.y}
            width={bounds.width}
            height={textPreviewHeight}
            rx="8"
            fill={element.fill}
            opacity="0.86"
          />
        </g>
        {isSelected ? (
          <rect
            data-selection-outline-for={element.id}
            x={bounds.x}
            y={bounds.y}
            width={bounds.width}
            height={textPreviewHeight}
            rx="8"
            fill="none"
            stroke="var(--ui-accent)"
            strokeWidth="12"
          />
        ) : null}
      </g>
    )
  }

  if (element.type === 'image') {
    return (
      <g
        transform={elementTransform}
        data-rotation={element.transform.rotationDegrees}
        data-flip-x={element.transform.flipX}
        data-flip-y={element.transform.flipY}
      >
        <MinimapImageElement
          element={element}
          bounds={bounds}
          sourceUrl={imageSourceUrl}
          isSelected={isSelected}
          definitionId={definitionId}
        />
      </g>
    )
  }

  if (element.type === 'speech-balloon') {
    return (
      <g
        transform={elementTransform}
        data-rotation={element.transform.rotationDegrees}
        data-flip-x={element.transform.flipX}
        data-flip-y={element.transform.flipY}
      >
        <MinimapSpeechBalloon
          element={element}
          bounds={bounds}
          isSelected={isSelected}
        />
      </g>
    )
  }

  const shapeFill =
    element.fill.kind === 'solid'
      ? element.fill.color
      : `url(#${definitionId}-gradient)`

  if (element.shape === 'ellipse') {
    return (
      <g
        transform={elementTransform}
        data-rotation={element.transform.rotationDegrees}
        data-flip-x={element.transform.flipX}
        data-flip-y={element.transform.flipY}
      >
        <ShapeGradientDefinition
          element={element}
          definitionId={definitionId}
        />
        <g
          data-element-id={element.id}
          data-opacity={element.opacity}
          data-blend-mode={element.blendMode}
          data-fill-kind={element.fill.kind}
          opacity={element.opacity}
          style={visualStyle}
        >
          <ellipse
            cx={bounds.x + bounds.width / 2}
            cy={bounds.y + bounds.height / 2}
            rx={bounds.width / 2}
            ry={bounds.height / 2}
            fill={shapeFill}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
          />
        </g>
        {isSelected ? (
          <ellipse
            data-selection-outline-for={element.id}
            cx={bounds.x + bounds.width / 2}
            cy={bounds.y + bounds.height / 2}
            rx={bounds.width / 2}
            ry={bounds.height / 2}
            fill="none"
            stroke="var(--ui-accent)"
            strokeWidth="12"
          />
        ) : null}
      </g>
    )
  }

  return (
    <g
      transform={elementTransform}
      data-rotation={element.transform.rotationDegrees}
      data-flip-x={element.transform.flipX}
      data-flip-y={element.transform.flipY}
    >
      <ShapeGradientDefinition
        element={element}
        definitionId={definitionId}
      />
      <g
        data-element-id={element.id}
        data-opacity={element.opacity}
        data-blend-mode={element.blendMode}
        data-fill-kind={element.fill.kind}
        opacity={element.opacity}
        style={visualStyle}
      >
        <rect
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
          rx={element.cornerRadius}
          fill={shapeFill}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
        />
      </g>
      {isSelected ? (
        <rect
          data-selection-outline-for={element.id}
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
          rx={element.cornerRadius}
          fill="none"
          stroke="var(--ui-accent)"
          strokeWidth="12"
        />
      ) : null}
    </g>
  )
}

export function EpisodeMinimap() {
  const episode = useEditorStore((state) => state.episode)
  const importedImageAssets = useEditorStore(
    (state) => state.importedImageAssets,
  )
  const selectedElementId = useEditorStore((state) => state.selectedElementId)
  const liveElementBounds = useEditorStore((state) => state.liveElementBounds)
  const viewportX = useEditorStore((state) => state.viewportX)
  const viewportY = useEditorStore((state) => state.viewportY)
  const viewportLogicalWidth = useEditorStore(
    (state) => state.viewportLogicalWidth,
  )
  const viewportLogicalHeight = useEditorStore(
    (state) => state.viewportLogicalHeight,
  )
  const setViewportPosition = useEditorStore(
    (state) => state.setViewportPosition,
  )
  const panViewport = useEditorStore((state) => state.panViewport)
  const dragOffset = useRef<LogicalPosition | null>(null)
  const scrollViewportRef = useRef<HTMLDivElement>(null)
  const minimapSurfaceRef = useRef<HTMLDivElement>(null)
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
  const visibleImageElementCount = orderedElements.filter(
    ({ type }) => type === 'image',
  ).length
  const missingImageElementCount = [...resolvedImageAssets.values()].filter(
    (asset) => asset === undefined,
  ).length

  useEffect(() => {
    const scrollViewport = scrollViewportRef.current
    const minimapSurface = minimapSurfaceRef.current

    if (!scrollViewport || !minimapSurface) {
      return
    }

    const scale = minimapSurface.clientHeight / episode.logicalHeight
    const viewportTop = viewportY * scale
    const viewportBottom = (viewportY + viewportLogicalHeight) * scale

    if (viewportTop < scrollViewport.scrollTop) {
      scrollViewport.scrollTop = viewportTop
    } else if (
      viewportBottom >
      scrollViewport.scrollTop + scrollViewport.clientHeight
    ) {
      scrollViewport.scrollTop = viewportBottom - scrollViewport.clientHeight
    }
  }, [episode.logicalHeight, viewportLogicalHeight, viewportY])

  const navigateFromPointer = (
    event: PointerEvent<HTMLDivElement>,
    beginDrag: boolean,
  ) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const pointerX =
      event.clientX - bounds.left - event.currentTarget.clientLeft
    const pointerY =
      event.clientY - bounds.top - event.currentTarget.clientTop
    const minimapDimensions = {
      width: event.currentTarget.clientWidth,
      height: event.currentTarget.clientHeight,
    }
    const episodeDimensions = {
      width: episode.logicalWidth,
      height: episode.logicalHeight,
    }
    const viewportDimensions = {
      width: viewportLogicalWidth,
      height: viewportLogicalHeight,
    }
    const viewportBox = getMinimapViewportBox2D(
      {
        x: viewportX,
        y: viewportY,
        ...viewportDimensions,
      },
      episodeDimensions,
      minimapDimensions,
    )
    const viewportFrameExpansion =
      (48 / episode.logicalWidth) * minimapDimensions.width

    if (beginDrag) {
      event.currentTarget.setPointerCapture(event.pointerId)
      const hitViewport =
        pointerX >= viewportBox.x - viewportFrameExpansion &&
        pointerX <=
          viewportBox.x + viewportBox.width + viewportFrameExpansion &&
        pointerY >= viewportBox.y &&
        pointerY <= viewportBox.y + viewportBox.height

      dragOffset.current = hitViewport
        ? { x: pointerX - viewportBox.x, y: pointerY - viewportBox.y }
        : { x: viewportBox.width / 2, y: viewportBox.height / 2 }
    }

    if (dragOffset.current === null) {
      return
    }

    setViewportPosition(
      minimapPointerToViewportPosition(
        { x: pointerX, y: pointerY },
        minimapDimensions,
        episodeDimensions,
        viewportDimensions,
        dragOffset.current,
      ),
    )
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const smallStep = viewportLogicalHeight * 0.12
    const largeStep = viewportLogicalHeight * 0.85

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      panViewport({
        x: 0,
        y: event.key === 'ArrowDown' ? smallStep : -smallStep,
      })
    } else if (event.key === 'PageDown' || event.key === 'PageUp') {
      event.preventDefault()
      panViewport({
        x: 0,
        y: event.key === 'PageDown' ? largeStep : -largeStep,
      })
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      panViewport({
        x:
          (event.key === 'ArrowRight' ? 1 : -1) *
          viewportLogicalWidth *
          0.12,
        y: 0,
      })
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      setViewportPosition({
        x: viewportX,
        y: event.key === 'Home' ? 0 : episode.logicalHeight,
      })
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
          {episode.logicalHeight.toLocaleString()}px
        </span>
      </header>

      <div
        className="minimap-scroll-viewport"
        data-testid="minimap-scroll-viewport"
        ref={scrollViewportRef}
      >
        <div
          className="minimap-surface"
          ref={minimapSurfaceRef}
          style={{
            aspectRatio: `${episode.logicalWidth} / ${episode.logicalHeight}`,
          }}
          data-testid="minimap"
          role="region"
          tabIndex={0}
          aria-label="Episode position and viewport"
          aria-roledescription="two-dimensional viewport navigator"
          aria-describedby="minimap-navigation-help minimap-position-status"
          data-viewport-x={viewportX}
          data-viewport-y={viewportY}
          data-image-element-count={resolvedImageAssets.size}
          data-visible-image-element-count={visibleImageElementCount}
          data-missing-image-element-count={missingImageElementCount}
          data-aspect-fit="contain"
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
            preserveAspectRatio="xMidYMid meet"
            style={{ isolation: 'isolate', overflow: 'visible' }}
            aria-hidden="true"
          >
            <defs>
              <pattern
                id="minimap-transparency-grid"
                width="80"
                height="80"
                patternUnits="userSpaceOnUse"
              >
                <rect width="80" height="80" fill="#d9d4df" />
                <path d="M0 0h40v40H0ZM40 40h40v40H40Z" fill="#eeeaf1" />
              </pattern>
            </defs>
            <rect
              width={episode.logicalWidth}
              height={episode.logicalHeight}
              fill="url(#minimap-transparency-grid)"
            />
            {baseColor ? (
              <rect
                data-testid="minimap-base"
                width={episode.logicalWidth}
                height={episode.logicalHeight}
                fill={baseColor}
              />
            ) : null}
            {orderedElements.map((element, index) => (
              <MinimapElement
                key={element.id}
                element={element}
                definitionId={`minimap-appearance-${index}`}
                imageSourceUrl={
                  resolvedImageAssets.get(element.id)?.sourceUrl
                }
                bounds={
                  liveElementBounds?.elementId === element.id &&
                  selectedElementId === element.id
                    ? liveElementBounds.bounds
                    : element.bounds
                }
                isSelected={element.id === selectedElementId}
              />
            ))}
            <rect
              data-testid="minimap-viewport"
              x={viewportX - 48}
              y={viewportY}
              width={viewportLogicalWidth + 96}
              height={viewportLogicalHeight}
              rx="18"
              fill="rgb(101 228 255 / 0.08)"
              stroke="var(--ui-accent)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      </div>
      <p id="minimap-navigation-help" className="panel-help">
        Click or drag the frame · x {Math.round(viewportX)}px · y{' '}
        {Math.round(viewportY)}px
      </p>
      <p id="minimap-position-status" className="sr-only" aria-live="polite">
        Viewport starts at x {Math.round(viewportX)}, y {Math.round(viewportY)};
        visible size {Math.round(viewportLogicalWidth)} by{' '}
        {Math.round(viewportLogicalHeight)} pixels within an episode{' '}
        {episode.logicalWidth} by {episode.logicalHeight} pixels.
      </p>
    </section>
  )
}
