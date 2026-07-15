import { useMemo, useRef, type KeyboardEvent, type PointerEvent } from 'react'

import { useEditorStore } from '../app/store'
import { resolveImageAsset } from '../assets/runtime'
import {
  getMinimapViewportBox2D,
  minimapPointerToViewportPosition,
  type LogicalPosition,
} from '../core/coordinates'
import {
  compareElementsByRenderOrder,
  getEffectiveEpisodeBaseColor,
  isElementEffectivelyVisible,
  type ElementBounds,
  type EpisodeElement,
  type ImageElement,
  type ShapeElement,
} from '../core/episode'
import { useAssetImage } from '../editor/useAssetImage'
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

function MinimapImageElement({
  element,
  bounds,
  sourceUrl,
  isSelected,
  definitionId,
}: MinimapImageElementProps) {
  const { image, status } = useAssetImage(sourceUrl)
  const patternId = `${definitionId}-pattern`
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

  return (
    <>
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

      <g
        data-element-id={element.id}
        data-image-status={status}
        data-opacity={element.opacity}
        data-blend-mode={element.blendMode}
        data-image-presentation={element.presentation}
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

        {!isSelected ? (
          <rect
            x={bounds.x}
            y={bounds.y}
            width={bounds.width}
            height={bounds.height}
            fill="none"
            stroke="#746A8D"
            strokeWidth="2"
          />
        ) : null}
      </g>

      {isSelected ? (
        <rect
          data-selection-outline-for={element.id}
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
          fill="none"
          stroke="#65E4FF"
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

  if (element.type === 'text') {
    const textPreviewHeight = Math.max(bounds.height * 0.38, 12)

    return (
      <>
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
            stroke="#65E4FF"
            strokeWidth="12"
          />
        ) : null}
      </>
    )
  }

  if (element.type === 'image') {
    return (
      <MinimapImageElement
        element={element}
        bounds={bounds}
        sourceUrl={imageSourceUrl}
        isSelected={isSelected}
        definitionId={definitionId}
      />
    )
  }

  const shapeFill =
    element.fill.kind === 'solid'
      ? element.fill.color
      : `url(#${definitionId}-gradient)`

  if (element.shape === 'ellipse') {
    return (
      <>
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
            stroke="#65E4FF"
            strokeWidth="12"
          />
        ) : null}
      </>
    )
  }

  return (
    <>
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
          stroke="#65E4FF"
          strokeWidth="12"
        />
      ) : null}
    </>
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

  const navigateFromPointer = (
    event: PointerEvent<HTMLDivElement>,
    beginDrag: boolean,
  ) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const pointerX = event.clientX - bounds.left
    const pointerY = event.clientY - bounds.top
    const minimapDimensions = { width: bounds.width, height: bounds.height }
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

    if (beginDrag) {
      event.currentTarget.setPointerCapture(event.pointerId)
      const hitViewport =
        pointerX >= viewportBox.x &&
        pointerX <= viewportBox.x + viewportBox.width &&
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
          {episode.logicalHeight.toLocaleString()}u
        </span>
      </header>

      <div
        className="minimap-surface"
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
          style={{ isolation: 'isolate' }}
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
            x={viewportX}
            y={viewportY}
            width={viewportLogicalWidth}
            height={viewportLogicalHeight}
            rx="18"
            fill="rgb(101 228 255 / 0.08)"
            stroke="#65E4FF"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <p id="minimap-navigation-help" className="panel-help">
        Click or drag the cyan frame · x {Math.round(viewportX)} · y{' '}
        {Math.round(viewportY)}
      </p>
      <p id="minimap-position-status" className="sr-only" aria-live="polite">
        Viewport starts at x {Math.round(viewportX)}, y {Math.round(viewportY)};
        visible size {Math.round(viewportLogicalWidth)} by{' '}
        {Math.round(viewportLogicalHeight)} logical units within an episode{' '}
        {episode.logicalWidth} by {episode.logicalHeight} logical units.
      </p>
    </section>
  )
}
