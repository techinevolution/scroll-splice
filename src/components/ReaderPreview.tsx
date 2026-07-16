import {
  useEffect,
  useId,
  useMemo,
  useRef,
  type CSSProperties,
} from 'react'

import { useEditorStore } from '../app/store'
import { resolveImageAsset } from '../assets/runtime'
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
  type TextElement,
} from '../core/episode'
import { getSpeechBalloonPath } from '../core/speechBalloonGeometry'
import { getSpeechBalloonTextLayout } from '../core/speechBalloonLayout'
import { useAssetImage } from '../editor/useAssetImage'
import {
  getTilePatternScale,
  toCssMixBlendMode,
} from '../rendering/elementAppearance'

interface ReaderPreviewProps {
  readonly onClose: () => void
}

interface ReaderElementProps {
  readonly element: EpisodeElement
  readonly imageSourceUrl?: string
  readonly definitionId: string
}

interface ReaderImageElementProps {
  readonly element: ImageElement
  readonly sourceUrl?: string
  readonly definitionId: string
}

const previewRootStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 10000,
  overflow: 'hidden',
  background: '#100D17',
  color: '#F8F5FF',
}

const previewHeaderStyle: CSSProperties = {
  position: 'absolute',
  zIndex: 2,
  top: 0,
  right: 0,
  left: 0,
  minHeight: 64,
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 24,
  padding: '10px 18px',
  background: 'rgba(16, 13, 23, 0.92)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
  backdropFilter: 'blur(12px)',
}

const previewScrollStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  overflow: 'auto',
  boxSizing: 'border-box',
  padding: '80px 16px 40px',
  overscrollBehavior: 'contain',
}

const closeButtonStyle: CSSProperties = {
  minWidth: 72,
  minHeight: 38,
  padding: '7px 14px',
  border: '1px solid rgba(255, 255, 255, 0.24)',
  borderRadius: 8,
  background: '#272132',
  color: '#FFFFFF',
  font: 'inherit',
  fontWeight: 700,
  cursor: 'pointer',
}

function getElementVisualStyle(element: EpisodeElement): CSSProperties {
  return {
    mixBlendMode: toCssMixBlendMode(element.blendMode),
  }
}

function getSvgElementTransform(element: EpisodeElement): string {
  const centerX = element.bounds.x + element.bounds.width / 2
  const centerY = element.bounds.y + element.bounds.height / 2
  const scaleX = element.transform.flipX ? -1 : 1
  const scaleY = element.transform.flipY ? -1 : 1

  return `translate(${centerX} ${centerY}) rotate(${element.transform.rotationDegrees}) scale(${scaleX} ${scaleY}) translate(${-centerX} ${-centerY})`
}

function ReaderImageMaskDefinition({
  element,
  clipId,
}: {
  readonly element: ImageElement
  readonly clipId: string
}) {
  const path = getImageMaskPath(element.frame, element.bounds)

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

function ReaderImageFrameBorder({
  element,
}: {
  readonly element: ImageElement
}) {
  const path = getImageMaskPath(element.frame, element.bounds)
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

function ReaderTextElement({ element }: { readonly element: TextElement }) {
  const { bounds } = element

  return (
    <foreignObject
      x={bounds.x}
      y={bounds.y}
      width={bounds.width}
      height={bounds.height}
      overflow="hidden"
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          color: element.fill,
          fontFamily: element.fontFamily,
          fontSize: element.fontSize,
          fontWeight: element.fontWeight,
          lineHeight: element.lineHeight,
          textAlign: element.align,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word',
        }}
      >
        <div style={{ width: '100%' }}>{element.text}</div>
      </div>
    </foreignObject>
  )
}

function ReaderSpeechBalloon({
  element,
}: {
  readonly element: SpeechBalloonElement
}) {
  const path = getSpeechBalloonPath(
    element.bounds,
    element.cornerRadius,
    element.tail,
  )
  const layout = getSpeechBalloonTextLayout(element)

  if (!path) return null

  return (
    <>
      <path
        d={path.pathData}
        fill={element.fill}
        stroke={element.stroke}
        strokeWidth={element.strokeWidth}
        strokeLinejoin="round"
      />
      <foreignObject
        x={element.bounds.x}
        y={element.bounds.y}
        width={element.bounds.width}
        height={element.bounds.height}
        overflow="hidden"
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            padding: element.padding,
            overflow: 'hidden',
            color: element.textFill,
            fontFamily: element.fontFamily,
            fontSize: layout.fontSize,
            fontWeight: element.fontWeight,
            lineHeight: element.lineHeight,
            textAlign: element.align,
            whiteSpace: 'pre-wrap',
          }}
        >
          <div style={{ width: '100%' }}>{layout.lines.join('\n')}</div>
        </div>
      </foreignObject>
    </>
  )
}

function MissingImagePlaceholder({ bounds }: { readonly bounds: ElementBounds }) {
  return (
    <g data-reader-image-placeholder="true">
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
        strokeWidth={Math.min(6, Math.max(1, bounds.width / 40))}
      />
    </g>
  )
}

function ReaderImageElement({
  element,
  sourceUrl,
  definitionId,
}: ReaderImageElementProps) {
  const { image, status } = useAssetImage(sourceUrl)
  const { bounds } = element
  const imageIsReady = status === 'ready' && image !== null
  const patternId = `${definitionId}-pattern`
  const clipId = `${definitionId}-clip`
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
        <ReaderImageMaskDefinition element={element} clipId={clipId} />
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
          data-reader-image-status={status}
          data-reader-image-presentation={element.presentation}
          data-reader-image-mask={element.frame.mask.kind}
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
            <MissingImagePlaceholder bounds={bounds} />
          )}
        </g>
      </g>
      <ReaderImageFrameBorder element={element} />
    </>
  )
}

function ReaderElement({
  element,
  imageSourceUrl,
  definitionId,
}: ReaderElementProps) {
  const { bounds } = element
  const shapeFill =
    element.type === 'shape'
      ? element.fill.kind === 'solid'
        ? element.fill.color
        : `url(#${definitionId}-gradient)`
      : undefined

  return (
    <g
      data-testid={`reader-preview-element-${element.id}`}
      data-reader-element-id={element.id}
      data-reader-element-type={element.type}
      data-opacity={element.opacity}
      data-blend-mode={element.blendMode}
      data-rotation={element.transform.rotationDegrees}
      data-flip-x={element.transform.flipX}
      data-flip-y={element.transform.flipY}
      opacity={element.opacity}
      transform={getSvgElementTransform(element)}
      style={getElementVisualStyle(element)}
    >
      {element.type === 'shape' ? (
        <ShapeGradientDefinition
          element={element}
          definitionId={definitionId}
        />
      ) : null}

      {element.type === 'shape' && element.shape === 'rectangle' ? (
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
      ) : null}

      {element.type === 'shape' && element.shape === 'ellipse' ? (
        <ellipse
          cx={bounds.x + bounds.width / 2}
          cy={bounds.y + bounds.height / 2}
          rx={bounds.width / 2}
          ry={bounds.height / 2}
          fill={shapeFill}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
        />
      ) : null}

      {element.type === 'text' ? (
        <ReaderTextElement element={element} />
      ) : null}

      {element.type === 'image' ? (
        <ReaderImageElement
          element={element}
          sourceUrl={imageSourceUrl}
          definitionId={definitionId}
        />
      ) : null}

      {element.type === 'speech-balloon' ? (
        <ReaderSpeechBalloon element={element} />
      ) : null}
    </g>
  )
}

function sanitizeDefinitionId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-')
}

export function ReaderPreview({ onClose }: ReaderPreviewProps) {
  const episode = useEditorStore((state) => state.episode)
  const importedImageAssets = useEditorStore(
    (state) => state.importedImageAssets,
  )
  const instanceId = sanitizeDefinitionId(useId())
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const definitionPrefix = `reader-preview-${instanceId}-${sanitizeDefinitionId(episode.id)}`
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
  const resolvedImageSources = useMemo(
    () =>
      new Map(
        episode.elements.flatMap((element) => {
          if (element.type !== 'image') {
            return []
          }

          return [
            [
              element.id,
              resolveImageAsset(element.assetReference, importedImageAssets)
                ?.sourceUrl,
            ] as const,
          ]
        }),
      ),
    [episode.elements, importedImageAssets],
  )

  useEffect(() => {
    const previouslyFocused = document.activeElement
    const previousBodyOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'Tab') {
        event.preventDefault()
        closeButtonRef.current?.focus()
      }
    }

    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousBodyOverflow
      window.removeEventListener('keydown', handleKeyDown)

      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus()
      }
    }
  }, [onClose])

  return (
    <section
      data-testid="reader-preview"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reader-preview-title"
      style={previewRootStyle}
    >
      <header data-testid="reader-preview-header" style={previewHeaderStyle}>
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              color: '#B9AECF',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.13em',
              textTransform: 'uppercase',
            }}
          >
            Reader preview
          </p>
          <h1
            id="reader-preview-title"
            data-testid="reader-preview-episode-name"
            style={{
              margin: '2px 0 0',
              overflow: 'hidden',
              fontSize: 17,
              lineHeight: 1.25,
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {episode.name}
          </h1>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          data-testid="reader-preview-close"
          aria-label="Close reader preview"
          style={closeButtonStyle}
          onClick={onClose}
        >
          Close
        </button>
      </header>

      <div
        data-testid="reader-preview-scroll"
        aria-label={`${episode.name} reader preview`}
        style={previewScrollStyle}
      >
        <svg
          data-testid="reader-preview-svg"
          viewBox={`0 0 ${episode.logicalWidth} ${episode.logicalHeight}`}
          preserveAspectRatio="xMidYMin meet"
          role="img"
          aria-label={`${episode.name}, complete vertical episode`}
          style={{
            display: 'block',
            width: '100%',
            maxWidth: episode.logicalWidth,
            height: 'auto',
            margin: '0 auto',
            overflow: 'hidden',
            isolation: 'isolate',
            pointerEvents: 'none',
          }}
        >
          <defs>
            <clipPath id={`${definitionPrefix}-episode-clip`}>
              <rect
                width={episode.logicalWidth}
                height={episode.logicalHeight}
              />
            </clipPath>
          </defs>

          <g clipPath={`url(#${definitionPrefix}-episode-clip)`}>
            <rect
              data-testid="reader-preview-base"
              width={episode.logicalWidth}
              height={episode.logicalHeight}
              fill={baseColor ?? 'transparent'}
              data-visible={baseColor !== undefined}
            />

            {orderedElements.map((element, index) => (
              <ReaderElement
                key={element.id}
                element={element}
                imageSourceUrl={resolvedImageSources.get(element.id)}
                definitionId={`${definitionPrefix}-${index}-${sanitizeDefinitionId(element.id)}`}
              />
            ))}
          </g>
        </svg>
      </div>
    </section>
  )
}
