import {
  compareElementsByRenderOrder,
  getEffectiveEpisodeBaseColor,
  isElementEffectivelyVisible,
  type EpisodeDocument,
  type EpisodeElement,
  type ImageAssetReference,
  type ImageElement,
  type ShapeElement,
  type SpeechBalloonElement,
  type TextElement,
} from '../core/episode'
import {
  getCoverImagePlacement,
  getElementVisualBounds,
  getImageMaskPath,
} from '../core/elementGeometry'
import { getSpeechBalloonPath } from '../core/speechBalloonGeometry'
import { getSpeechBalloonTextLayout } from '../core/speechBalloonLayout'
import { getSpeechBalloonPresetId } from '../core/speechBalloonPresets'
import {
  applyColorOpacity,
  getTilePatternScale,
  toCanvasCompositeOperation,
} from '../rendering/elementAppearance'
import type { ExportMediaType, ExportProfile } from './profiles'

export const MAX_TALL_MASTER_HEIGHT_PX = 32_767
export const MAX_TALL_MASTER_PIXELS = 64_000_000

export interface RenderedEpisodeFile {
  readonly index: number
  readonly fileName: string
  readonly mediaType: ExportMediaType
  readonly width: number
  readonly height: number
  readonly startLogicalY: number
  readonly endLogicalY: number
  readonly blob: Blob
}

export interface EpisodeRenderOptions {
  readonly episode: EpisodeDocument
  readonly profile: ExportProfile
  readonly mediaType: ExportMediaType
  readonly jpegQuality?: number
  /** Optional creator-reviewed interior cuts in logical episode units. */
  readonly sliceBoundaries?: readonly number[]
  readonly resolveImageSource: (
    reference: ImageAssetReference,
  ) => string | undefined
}

export interface EpisodeRenderResult {
  readonly files: readonly RenderedEpisodeFile[]
  readonly missingSourceElementIds: readonly string[]
  readonly provisional: boolean
}

export interface ExportPreflightIssue {
  readonly code:
    | 'unsupported-media-type'
    | 'wrong-width'
    | 'slice-too-tall'
    | 'slice-too-large'
    | 'too-many-files'
    | 'package-too-large'
    | 'missing-source'
  readonly message: string
  readonly fileName?: string
}

export interface ExportPreflightResult {
  readonly ready: boolean
  readonly verification: ExportProfile['verification']
  readonly provisional: boolean
  readonly totalBytes: number
  readonly issues: readonly ExportPreflightIssue[]
}

export interface EpisodeSlicePlanRange {
  readonly index: number
  readonly startLogicalY: number
  readonly endLogicalY: number
  readonly outputWidth: number
  readonly outputHeight: number
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  if (typeof document === 'undefined') {
    throw new Error('Episode rendering requires a browser canvas.')
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

async function loadImage(source: string): Promise<HTMLImageElement> {
  const image = new Image()
  image.decoding = 'async'
  image.src = source

  try {
    await image.decode()
  } catch {
    if (image.complete) {
      if (image.naturalWidth > 0) return image
      throw new Error('An image source could not be decoded.')
    }

    await new Promise<void>((resolve, reject) => {
      image.addEventListener('load', () => resolve(), { once: true })
      image.addEventListener(
        'error',
        () => reject(new Error('An image source could not be decoded.')),
        { once: true },
      )
    })
  }

  return image
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mediaType: ExportMediaType,
  jpegQuality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('The browser could not encode the rendered image.'))
      },
      mediaType,
      mediaType === 'image/jpeg' ? jpegQuality : undefined,
    )
  })
}

function getExportBaseName(name: string): string {
  const asciiLettersAndNumbers = name
    .normalize('NFKD')
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 48)

  return asciiLettersAndNumbers || 'ScrollSpliceEpisode'
}

export function createExportFileName(
  episodeName: string,
  index: number,
  fileCount: number,
  mediaType: ExportMediaType,
): string {
  const digits = Math.max(3, String(Math.max(fileCount, 1)).length)
  const sequence = String(Math.max(index, 0) + 1).padStart(digits, '0')
  const extension = mediaType === 'image/jpeg' ? 'jpg' : 'png'

  return `${getExportBaseName(episodeName)}${sequence}.${extension}`
}

export function createEpisodeSlicePlan(
  episode: EpisodeDocument,
  profile: ExportProfile,
  sliceBoundaries?: readonly number[],
): readonly EpisodeSlicePlanRange[] {
  const scale = profile.outputWidthPx / episode.logicalWidth
  const logicalSliceHeight = profile.maxSliceHeightPx / scale
  const boundaries = sliceBoundaries
    ? validateSliceBoundaries(sliceBoundaries, episode.logicalHeight)
    : createDefaultSliceBoundaries(
        episode.logicalHeight,
        logicalSliceHeight,
      )
  const points = [0, ...boundaries, episode.logicalHeight]

  return points.slice(0, -1).map((startLogicalY, index) => {
    const endLogicalY = points[index + 1]

    if (endLogicalY === undefined) {
      throw new Error('The episode slice plan is incomplete.')
    }

    return {
      index,
      startLogicalY,
      endLogicalY,
      outputWidth: profile.outputWidthPx,
      outputHeight: Math.max(
        1,
        Math.ceil((endLogicalY - startLogicalY) * scale),
      ),
    }
  })
}

function createDefaultSliceBoundaries(
  episodeLogicalHeight: number,
  logicalSliceHeight: number,
): readonly number[] {
  const boundaries: number[] = []

  for (
    let boundary = logicalSliceHeight;
    boundary < episodeLogicalHeight;
    boundary += logicalSliceHeight
  ) {
    boundaries.push(boundary)
  }

  return boundaries
}

function validateSliceBoundaries(
  boundaries: readonly number[],
  episodeLogicalHeight: number,
): readonly number[] {
  let previous = 0
  const validated: number[] = []

  for (const boundary of boundaries) {
    if (
      !Number.isFinite(boundary) ||
      boundary <= previous ||
      boundary >= episodeLogicalHeight
    ) {
      throw new Error(
        'Custom slice positions must be finite, increasing, and inside the episode.',
      )
    }

    validated.push(boundary)
    previous = boundary
  }

  return validated
}

export function elementIntersectsSliceRange(
  element: EpisodeElement,
  range: EpisodeSlicePlanRange,
): boolean {
  const visualBounds = getElementVisualBounds(element) ?? element.bounds

  return (
    visualBounds.y + visualBounds.height > range.startLogicalY &&
    visualBounds.y < range.endLogicalY
  )
}

function drawShape(
  context: CanvasRenderingContext2D,
  element: ShapeElement,
): void {
  const { bounds } = element
  context.beginPath()

  if (element.shape === 'ellipse') {
    context.ellipse(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
      bounds.width / 2,
      bounds.height / 2,
      0,
      0,
      Math.PI * 2,
    )
  } else if (element.cornerRadius && element.cornerRadius > 0) {
    context.roundRect(
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
      Math.min(element.cornerRadius, bounds.width / 2, bounds.height / 2),
    )
  } else {
    context.rect(bounds.x, bounds.y, bounds.width, bounds.height)
  }

  if (element.fill.kind === 'solid') {
    context.fillStyle = element.fill.color
  } else {
    const gradient = context.createLinearGradient(
      bounds.x,
      bounds.y,
      bounds.x,
      bounds.y + bounds.height,
    )
    gradient.addColorStop(
      0,
      applyColorOpacity(element.fill.top.color, element.fill.top.opacity),
    )
    gradient.addColorStop(
      1,
      applyColorOpacity(
        element.fill.bottom.color,
        element.fill.bottom.opacity,
      ),
    )
    context.fillStyle = gradient
  }

  context.fill()

  if (element.stroke && (element.strokeWidth ?? 0) > 0) {
    context.strokeStyle = element.stroke
    context.lineWidth = element.strokeWidth ?? 1
    context.stroke()
  }
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maximumWidth: number,
): readonly string[] {
  const lines: string[] = []

  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean)

    if (words.length === 0) {
      lines.push('')
      continue
    }

    let line = words[0] ?? ''

    for (const word of words.slice(1)) {
      const candidate = `${line} ${word}`

      if (context.measureText(candidate).width <= maximumWidth) {
        line = candidate
      } else {
        lines.push(line)
        line = word
      }
    }

    lines.push(line)
  }

  return lines
}

function drawText(
  context: CanvasRenderingContext2D,
  element: TextElement,
): void {
  const { bounds } = element
  context.fillStyle = element.fill
  context.font = `${element.fontWeight} ${element.fontSize}px ${element.fontFamily}`
  context.textBaseline = 'middle'
  context.textAlign = element.align
  const lines = wrapText(context, element.text, bounds.width)
  const lineHeight = element.fontSize * element.lineHeight
  const textHeight = lines.length * lineHeight
  const firstLineY = bounds.y + (bounds.height - textHeight) / 2 + lineHeight / 2
  const textX =
    element.align === 'left'
      ? bounds.x
      : element.align === 'right'
        ? bounds.x + bounds.width
        : bounds.x + bounds.width / 2

  context.save()
  context.beginPath()
  context.rect(bounds.x, bounds.y, bounds.width, bounds.height)
  context.clip()
  lines.forEach((line, index) => {
    context.fillText(line, textX, firstLineY + index * lineHeight, bounds.width)
  })
  context.restore()
}

function drawSpeechBalloon(
  context: CanvasRenderingContext2D,
  element: SpeechBalloonElement,
): void {
  const balloon = getSpeechBalloonPath(
    element.bounds,
    element.cornerRadius,
    element.tail,
    getSpeechBalloonPresetId(element),
    element.bodyControlPoints,
  )

  if (!balloon) return

  const bodyPath = new Path2D(balloon.bodyPathData)
  context.fillStyle = element.fill
  if (balloon.tailPathData) {
    const tailPath = new Path2D(balloon.tailPathData)
    context.fill(tailPath)
    if (element.strokeWidth > 0) {
      context.strokeStyle = element.stroke
      context.lineWidth = element.strokeWidth
      context.lineJoin = 'round'
      context.setLineDash(balloon.strokeDash ? [...balloon.strokeDash] : [])
      context.stroke(tailPath)
    }
  }
  context.fill(bodyPath)
  if (element.strokeWidth > 0) {
    context.strokeStyle = element.stroke
    context.lineWidth = element.strokeWidth
    context.lineJoin = 'round'
    context.setLineDash(balloon.strokeDash ? [...balloon.strokeDash] : [])
    context.stroke(bodyPath)
  }
  context.setLineDash([])
  context.strokeStyle = element.stroke
  context.lineWidth = Math.max(1, element.strokeWidth * 0.6)
  context.lineJoin = 'round'
  context.lineCap = 'round'
  balloon.decorationPathData.forEach((data) => {
    context.stroke(new Path2D(data))
  })

  if (!element.text) return

  const layout = getSpeechBalloonTextLayout(element)
  const { bounds } = element
  const maximumWidth = Math.max(1, bounds.width - element.padding * 2)
  const lineHeight = layout.fontSize * element.lineHeight
  const textHeight = layout.lines.length * lineHeight
  const firstLineY = bounds.y + (bounds.height - textHeight) / 2 + lineHeight / 2
  const textX =
    element.align === 'left'
      ? bounds.x + element.padding
      : element.align === 'right'
        ? bounds.x + bounds.width - element.padding
        : bounds.x + bounds.width / 2

  context.save()
  context.beginPath()
  context.rect(bounds.x, bounds.y, bounds.width, bounds.height)
  context.clip()
  context.fillStyle = element.textFill
  context.font = `${element.fontWeight} ${layout.fontSize}px ${element.fontFamily}`
  context.textBaseline = 'middle'
  context.textAlign = element.align
  layout.lines.forEach((line, index) => {
    context.fillText(line, textX, firstLineY + index * lineHeight, maximumWidth)
  })
  context.restore()
}

function drawMissingImage(
  context: CanvasRenderingContext2D,
  element: ImageElement,
): void {
  const { bounds } = element
  context.fillStyle = '#29233A'
  context.fillRect(bounds.x, bounds.y, bounds.width, bounds.height)
  context.strokeStyle = '#AFA6C8'
  context.lineWidth = 4
  context.setLineDash([10, 7])
  context.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height)
  context.setLineDash([])
}

function traceImageMask(
  context: CanvasRenderingContext2D,
  element: ImageElement,
): void {
  const maskPath = getImageMaskPath(element.frame, element.bounds)

  context.beginPath()

  if (!maskPath) {
    context.rect(
      element.bounds.x,
      element.bounds.y,
      element.bounds.width,
      element.bounds.height,
    )
    return
  }

  if (maskPath.kind === 'rectangle') {
    if (maskPath.cornerRadius > 0) {
      context.roundRect(
        maskPath.bounds.x,
        maskPath.bounds.y,
        maskPath.bounds.width,
        maskPath.bounds.height,
        maskPath.cornerRadius,
      )
    } else {
      context.rect(
        maskPath.bounds.x,
        maskPath.bounds.y,
        maskPath.bounds.width,
        maskPath.bounds.height,
      )
    }
    return
  }

  const [firstPoint, ...remainingPoints] = maskPath.points

  if (!firstPoint) {
    context.rect(
      element.bounds.x,
      element.bounds.y,
      element.bounds.width,
      element.bounds.height,
    )
    return
  }

  context.moveTo(firstPoint.x, firstPoint.y)
  for (const point of remainingPoints) {
    context.lineTo(point.x, point.y)
  }
  context.closePath()
}

function drawImageFrameBorder(
  context: CanvasRenderingContext2D,
  element: ImageElement,
): void {
  const border = element.frame.border

  if (!border || border.width <= 0) return

  traceImageMask(context, element)
  context.strokeStyle = border.color
  context.lineWidth = border.width
  context.lineJoin = 'round'
  context.stroke()
}

function drawImageElement(
  context: CanvasRenderingContext2D,
  element: ImageElement,
  image: HTMLImageElement | undefined,
): void {
  const { bounds } = element

  context.save()
  traceImageMask(context, element)
  context.clip()

  if (!image) {
    drawMissingImage(context, element)
  } else if (element.presentation === 'single') {
    context.drawImage(image, bounds.x, bounds.y, bounds.width, bounds.height)
  } else if (element.presentation === 'cover') {
    const placement = getCoverImagePlacement(
      {
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      },
      bounds,
      element.frame.crop,
    )

    if (placement) {
      context.drawImage(
        image,
        placement.source.x,
        placement.source.y,
        placement.source.width,
        placement.source.height,
        placement.destination.x,
        placement.destination.y,
        placement.destination.width,
        placement.destination.height,
      )
    }
  } else {
    const tileScale = getTilePatternScale(
      image.naturalWidth || image.width,
      image.naturalHeight || image.height,
    )
    const tileWidth = Math.max(
      (image.naturalWidth || image.width) * tileScale,
      1,
    )
    const tileHeight = Math.max(
      (image.naturalHeight || image.height) * tileScale,
      1,
    )

    for (let y = bounds.y; y < bounds.y + bounds.height; y += tileHeight) {
      for (let x = bounds.x; x < bounds.x + bounds.width; x += tileWidth) {
        context.drawImage(image, x, y, tileWidth, tileHeight)
      }
    }
  }

  context.restore()
  drawImageFrameBorder(context, element)
}

function applyElementTransform(
  context: CanvasRenderingContext2D,
  element: EpisodeElement,
): void {
  const centerX = element.bounds.x + element.bounds.width / 2
  const centerY = element.bounds.y + element.bounds.height / 2

  context.translate(centerX, centerY)
  context.rotate((element.transform.rotationDegrees * Math.PI) / 180)
  context.scale(
    element.transform.flipX ? -1 : 1,
    element.transform.flipY ? -1 : 1,
  )
  context.translate(-centerX, -centerY)
}

function drawElement(
  context: CanvasRenderingContext2D,
  element: EpisodeElement,
  image: HTMLImageElement | undefined,
): void {
  context.save()
  context.globalAlpha = element.opacity
  context.globalCompositeOperation = toCanvasCompositeOperation(
    element.blendMode,
  )
  applyElementTransform(context, element)

  if (element.type === 'shape') drawShape(context, element)
  else if (element.type === 'text') drawText(context, element)
  else if (element.type === 'speech-balloon') {
    drawSpeechBalloon(context, element)
  } else drawImageElement(context, element, image)

  context.restore()
}

async function resolveElementImages(
  episode: EpisodeDocument,
  resolveImageSource: EpisodeRenderOptions['resolveImageSource'],
): Promise<{
  readonly images: ReadonlyMap<string, HTMLImageElement>
  readonly missingSourceElementIds: readonly string[]
}> {
  const images = new Map<string, HTMLImageElement>()
  const missingSourceElementIds: string[] = []

  await Promise.all(
    episode.elements.map(async (element) => {
      if (element.type !== 'image') return

      const source = resolveImageSource(element.assetReference)

      if (!source) {
        missingSourceElementIds.push(element.id)
        return
      }

      try {
        images.set(element.id, await loadImage(source))
      } catch {
        missingSourceElementIds.push(element.id)
      }
    }),
  )

  return { images, missingSourceElementIds }
}

async function renderRange(
  episode: EpisodeDocument,
  range: EpisodeSlicePlanRange,
  mediaType: ExportMediaType,
  jpegQuality: number,
  orderedElements: readonly EpisodeElement[],
  images: ReadonlyMap<string, HTMLImageElement>,
): Promise<Blob> {
  const canvas = createCanvas(range.outputWidth, range.outputHeight)
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('The browser did not provide a 2D canvas renderer.')
  }

  if (mediaType === 'image/jpeg') {
    context.fillStyle = '#FFFFFF'
    context.fillRect(0, 0, canvas.width, canvas.height)
  }

  const scale = range.outputWidth / episode.logicalWidth
  context.setTransform(scale, 0, 0, scale, 0, -range.startLogicalY * scale)
  context.save()
  context.beginPath()
  context.rect(
    0,
    range.startLogicalY,
    episode.logicalWidth,
    range.endLogicalY - range.startLogicalY,
  )
  context.clip()

  const baseColor = getEffectiveEpisodeBaseColor(episode)
  if (baseColor) {
    context.fillStyle = baseColor
    context.fillRect(
      0,
      range.startLogicalY,
      episode.logicalWidth,
      range.endLogicalY - range.startLogicalY,
    )
  }

  for (const element of orderedElements) {
    if (elementIntersectsSliceRange(element, range)) {
      drawElement(context, element, images.get(element.id))
    }
  }

  context.restore()
  return canvasToBlob(canvas, mediaType, jpegQuality)
}

export async function renderEpisodeSlices(
  options: EpisodeRenderOptions,
): Promise<EpisodeRenderResult> {
  if (!options.profile.acceptedMediaTypes.includes(options.mediaType)) {
    throw new Error('The selected export profile does not accept that format.')
  }

  const ranges = createEpisodeSlicePlan(
    options.episode,
    options.profile,
    options.sliceBoundaries,
  )
  const orderedElements = options.episode.elements
    .filter((element) => isElementEffectivelyVisible(options.episode, element))
    .sort((first, second) =>
      compareElementsByRenderOrder(options.episode, first, second),
    )
  const { images, missingSourceElementIds } = await resolveElementImages(
    options.episode,
    options.resolveImageSource,
  )
  const quality = Math.min(Math.max(options.jpegQuality ?? 0.92, 0.4), 1)
  const files: RenderedEpisodeFile[] = []

  for (const [index, range] of ranges.entries()) {
    const blob = await renderRange(
      options.episode,
      range,
      options.mediaType,
      quality,
      orderedElements,
      images,
    )
    files.push({
      index,
      fileName: createExportFileName(
        options.episode.name,
        index,
        ranges.length,
        options.mediaType,
      ),
      mediaType: options.mediaType,
      width: range.outputWidth,
      height: range.outputHeight,
      startLogicalY: range.startLogicalY,
      endLogicalY: range.endLogicalY,
      blob,
    })
  }

  return {
    files,
    missingSourceElementIds,
    provisional: options.profile.verification !== 'upload-verified',
  }
}

export async function renderTallMaster(
  options: Omit<EpisodeRenderOptions, 'profile'> & {
    readonly outputWidthPx?: number
  },
): Promise<RenderedEpisodeFile> {
  const outputWidth = Math.max(Math.round(options.outputWidthPx ?? 800), 1)
  const scale = outputWidth / options.episode.logicalWidth
  const outputHeight = Math.ceil(options.episode.logicalHeight * scale)

  if (
    outputHeight > MAX_TALL_MASTER_HEIGHT_PX ||
    outputWidth * outputHeight > MAX_TALL_MASTER_PIXELS
  ) {
    throw new Error(
      'This episode is too tall for one reliable browser canvas. Export slices instead.',
    )
  }

  const orderedElements = options.episode.elements
    .filter((element) => isElementEffectivelyVisible(options.episode, element))
    .sort((first, second) =>
      compareElementsByRenderOrder(options.episode, first, second),
    )
  const { images } = await resolveElementImages(
    options.episode,
    options.resolveImageSource,
  )
  const range = {
    index: 0,
    startLogicalY: 0,
    endLogicalY: options.episode.logicalHeight,
    outputWidth,
    outputHeight,
  }
  const blob = await renderRange(
    options.episode,
    range,
    options.mediaType,
    Math.min(Math.max(options.jpegQuality ?? 0.92, 0.4), 1),
    orderedElements,
    images,
  )

  return {
    index: 0,
    fileName: `${getExportBaseName(options.episode.name)}Tall.${
      options.mediaType === 'image/jpeg' ? 'jpg' : 'png'
    }`,
    mediaType: options.mediaType,
    width: outputWidth,
    height: outputHeight,
    startLogicalY: 0,
    endLogicalY: options.episode.logicalHeight,
    blob,
  }
}

export function preflightEpisodeExport(
  profile: ExportProfile,
  files: readonly Pick<
    RenderedEpisodeFile,
    'fileName' | 'mediaType' | 'width' | 'height' | 'blob'
  >[],
  missingSourceElementIds: readonly string[] = [],
): ExportPreflightResult {
  const issues: ExportPreflightIssue[] = []

  for (const file of files) {
    if (!profile.acceptedMediaTypes.includes(file.mediaType)) {
      issues.push({
        code: 'unsupported-media-type',
        fileName: file.fileName,
        message: `${file.fileName} uses an unsupported image format.`,
      })
    }
    if (file.width !== profile.outputWidthPx) {
      issues.push({
        code: 'wrong-width',
        fileName: file.fileName,
        message: `${file.fileName} is ${file.width}px wide instead of ${profile.outputWidthPx}px.`,
      })
    }
    if (file.height > profile.maxSliceHeightPx) {
      issues.push({
        code: 'slice-too-tall',
        fileName: file.fileName,
        message: `${file.fileName} is taller than the observed ${profile.maxSliceHeightPx}px limit.`,
      })
    }
    if (file.blob.size > profile.maxSliceBytes) {
      issues.push({
        code: 'slice-too-large',
        fileName: file.fileName,
        message: `${file.fileName} exceeds the provisional ${profile.maxSliceBytes.toLocaleString()}-byte threshold.`,
      })
    }
  }

  const totalBytes = files.reduce((total, file) => total + file.blob.size, 0)

  if (files.length > profile.maxFileCount) {
    issues.push({
      code: 'too-many-files',
      message: `The package contains ${files.length} files; the observed limit is ${profile.maxFileCount}.`,
    })
  }
  if (totalBytes > profile.maxTotalBytes) {
    issues.push({
      code: 'package-too-large',
      message: `The package exceeds the provisional ${profile.maxTotalBytes.toLocaleString()}-byte total.`,
    })
  }
  if (missingSourceElementIds.length > 0) {
    issues.push({
      code: 'missing-source',
      message: `${missingSourceElementIds.length} placed image source${missingSourceElementIds.length === 1 ? ' is' : 's are'} missing.`,
    })
  }

  return {
    ready: issues.length === 0,
    verification: profile.verification,
    provisional: profile.verification !== 'upload-verified',
    totalBytes,
    issues,
  }
}

export function downloadRenderedFile(file: RenderedEpisodeFile): void {
  const url = URL.createObjectURL(file.blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = file.fileName
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
