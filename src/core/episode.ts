export const LEGACY_EPISODE_FORMAT_VERSION = 3 as const
export const IMAGE_EPISODE_FORMAT_VERSION = 4 as const
export const APPEARANCE_EPISODE_FORMAT_VERSION = 5 as const
export const EPISODE_FORMAT_VERSION = 6 as const
export const EPISODE_LOGICAL_WIDTH = 800 as const

export const ELEMENT_BLEND_MODES = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'soft-light',
] as const

export type ElementBlendMode = (typeof ELEMENT_BLEND_MODES)[number]

export const COMPOSITION_GROUPS = [
  'background',
  'content',
  'foreground',
] as const

export type CompositionGroup = (typeof COMPOSITION_GROUPS)[number]

export const COMPOSITION_GROUP_LABELS = {
  background: 'Background',
  content: 'Content',
  foreground: 'Foreground',
} as const satisfies Readonly<Record<CompositionGroup, string>>

export type CompositionGroupVisibility = Readonly<
  Record<CompositionGroup, boolean>
>

interface LayerPlaneBase {
  readonly id: string
  readonly compositionGroup: CompositionGroup
  readonly order: number
  readonly visible: boolean
  readonly name?: string
}

export interface BackgroundBaseLayerPlane extends LayerPlaneBase {
  readonly kind: 'base'
  readonly compositionGroup: 'background'
  readonly baseColor: string
}

export interface OrdinaryLayerPlane extends LayerPlaneBase {
  readonly kind: 'ordinary'
}

export type LayerPlane = BackgroundBaseLayerPlane | OrdinaryLayerPlane

export interface ElementBounds {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface ElementTransform {
  readonly rotationDegrees: number
  readonly flipX: boolean
  readonly flipY: boolean
}

export type ElementOverflow = 'constrained' | 'bleed'

export const DEFAULT_ELEMENT_OVERFLOW = 'bleed' as const satisfies ElementOverflow

export const IDENTITY_ELEMENT_TRANSFORM = {
  rotationDegrees: 0,
  flipX: false,
  flipY: false,
} as const satisfies ElementTransform

export interface SyntheticAssetReference {
  readonly kind: 'synthetic'
  readonly generatorId: string
}

export interface ImportedAssetReference {
  readonly kind: 'imported'
  readonly assetId: string
}

export interface BuiltInAssetReference {
  readonly kind: 'built-in'
  readonly assetId: string
}

export type ImageAssetReference =
  | BuiltInAssetReference
  | ImportedAssetReference

export type AssetReference =
  | SyntheticAssetReference
  | ImageAssetReference

interface EpisodeElementBase {
  readonly id: string
  readonly name: string
  readonly layerPlaneId: string
  readonly bounds: ElementBounds
  readonly visible: boolean
  readonly locked: boolean
  readonly zIndex: number
  readonly opacity: number
  readonly blendMode: ElementBlendMode
  readonly transform: ElementTransform
  readonly overflow: ElementOverflow
  readonly assetReference: AssetReference
}

export interface ShapeFillStop {
  readonly color: string
  readonly opacity: number
}

export interface SolidShapeFill {
  readonly kind: 'solid'
  readonly color: string
}

export interface VerticalGradientShapeFill {
  readonly kind: 'vertical-gradient'
  readonly top: ShapeFillStop
  readonly bottom: ShapeFillStop
}

export type ShapeFill = SolidShapeFill | VerticalGradientShapeFill

export interface ShapeElement extends EpisodeElementBase {
  readonly type: 'shape'
  readonly shape: 'rectangle' | 'ellipse'
  readonly fill: ShapeFill
  readonly stroke?: string
  readonly strokeWidth?: number
  readonly cornerRadius?: number
}

export interface TextElement extends EpisodeElementBase {
  readonly type: 'text'
  readonly text: string
  readonly fill: string
  readonly fontFamily: string
  readonly fontSize: number
  readonly fontWeight: 400 | 600 | 700
  readonly lineHeight: number
  readonly align: 'left' | 'center' | 'right'
}

export type SpeechBalloonTailSide = 'top' | 'right' | 'bottom' | 'left'

export interface SpeechBalloonTail {
  readonly enabled: boolean
  readonly side: SpeechBalloonTailSide
  /** Position along the selected body edge, from 0 to 1. */
  readonly anchor: number
  /** Tail-base width as a fraction of the selected body edge. */
  readonly width: number
  /** Tail tip in body-normalized coordinates; it may extend outside 0...1. */
  readonly tip: NormalizedPoint
}

export interface SpeechBalloonElement extends EpisodeElementBase {
  readonly type: 'speech-balloon'
  /** Optional normalized contour edited directly by the creator. */
  readonly bodyControlPoints?: readonly NormalizedPoint[]
  readonly fill: string
  readonly stroke: string
  readonly strokeWidth: number
  readonly cornerRadius: number
  readonly text: string
  readonly textFill: string
  readonly fontFamily: string
  readonly fontWeight: 400 | 600 | 700
  readonly lineHeight: number
  readonly align: 'left' | 'center' | 'right'
  readonly padding: number
  readonly minFontSize: number
  readonly maxFontSize: number
  readonly tail: SpeechBalloonTail
}

export interface ImageElement extends EpisodeElementBase {
  readonly type: 'image'
  readonly assetReference: ImageAssetReference
  readonly presentation: ImagePresentation
  readonly frame: ImageFrame
}

export type ImagePresentation = 'single' | 'tile' | 'cover'

export interface NormalizedPoint {
  readonly x: number
  readonly y: number
}

export interface RectangleImageMask {
  readonly kind: 'rectangle'
  readonly cornerRadius: number
}

export interface PolygonImageMask {
  readonly kind: 'polygon'
  readonly points: readonly NormalizedPoint[]
}

export type ImageMask = RectangleImageMask | PolygonImageMask

export interface ImageCrop {
  readonly focusX: number
  readonly focusY: number
  readonly zoom: number
}

export interface ImageFrameBorder {
  readonly color: string
  readonly width: number
}

export interface ImageFrame {
  readonly mask: ImageMask
  readonly crop: ImageCrop
  readonly border?: ImageFrameBorder
}

export const DEFAULT_IMAGE_FRAME = {
  mask: { kind: 'rectangle', cornerRadius: 0 },
  crop: { focusX: 0.5, focusY: 0.5, zoom: 1 },
} as const satisfies ImageFrame

export type EpisodeElement =
  | ShapeElement
  | TextElement
  | ImageElement
  | SpeechBalloonElement

export interface ElementGroup {
  readonly id: string
  readonly memberElementIds: readonly string[]
}

export interface EpisodeDocument {
  readonly id: string
  readonly formatVersion: typeof EPISODE_FORMAT_VERSION
  readonly name: string
  readonly logicalWidth: typeof EPISODE_LOGICAL_WIDTH
  readonly logicalHeight: number
  readonly compositionGroupVisibility: CompositionGroupVisibility
  readonly layerPlanes: readonly LayerPlane[]
  readonly elements: readonly EpisodeElement[]
  readonly elementGroups: readonly ElementGroup[]
}

const COMPOSITION_GROUP_RENDER_ORDER = {
  background: 0,
  content: 1,
  foreground: 2,
} as const satisfies Readonly<Record<CompositionGroup, number>>

export function isElementEffectivelyVisible(
  document: EpisodeDocument,
  element: EpisodeElement,
): boolean {
  const layerPlane = getLayerPlaneById(document, element.layerPlaneId)

  return (
    layerPlane !== undefined &&
    isLayerPlaneEffectivelyVisible(document, layerPlane) &&
    element.visible
  )
}

export function isLayerPlaneEffectivelyVisible(
  document: EpisodeDocument,
  layerPlane: LayerPlane,
): boolean {
  return (
    document.compositionGroupVisibility[layerPlane.compositionGroup] &&
    layerPlane.visible
  )
}

export function getLayerPlaneById(
  document: EpisodeDocument,
  layerPlaneId: string,
): LayerPlane | undefined {
  return document.layerPlanes.find(({ id }) => id === layerPlaneId)
}

export function getLayerPlanesForGroup(
  document: EpisodeDocument,
  compositionGroup: CompositionGroup,
): readonly LayerPlane[] {
  return document.layerPlanes
    .filter((layerPlane) => layerPlane.compositionGroup === compositionGroup)
    .sort((first, second) => first.order - second.order)
}

export function getElementCompositionGroup(
  document: EpisodeDocument,
  element: EpisodeElement,
): CompositionGroup | undefined {
  return getLayerPlaneById(document, element.layerPlaneId)?.compositionGroup
}

export function getBackgroundBaseLayerPlane(
  document: EpisodeDocument,
): BackgroundBaseLayerPlane | undefined {
  return document.layerPlanes.find(
    (layerPlane): layerPlane is BackgroundBaseLayerPlane =>
      layerPlane.kind === 'base',
  )
}

export function getEffectiveEpisodeBaseColor(
  document: EpisodeDocument,
): string | undefined {
  const baseLayerPlane = getBackgroundBaseLayerPlane(document)

  return baseLayerPlane &&
    isLayerPlaneEffectivelyVisible(document, baseLayerPlane)
    ? baseLayerPlane.baseColor
    : undefined
}

export function compareElementsByRenderOrder(
  document: EpisodeDocument,
  first: EpisodeElement,
  second: EpisodeElement,
): number {
  const firstLayerPlane = getLayerPlaneById(document, first.layerPlaneId)
  const secondLayerPlane = getLayerPlaneById(document, second.layerPlaneId)

  const groupDifference =
    getCompositionGroupRenderRank(firstLayerPlane) -
    getCompositionGroupRenderRank(secondLayerPlane)

  const layerPlaneDifference =
    getLayerPlaneRenderOrder(firstLayerPlane) -
    getLayerPlaneRenderOrder(secondLayerPlane)

  return groupDifference || layerPlaneDifference || first.zIndex - second.zIndex
}

export function compareElementsByCanvasPosition(
  first: EpisodeElement,
  second: EpisodeElement,
): number {
  return (
    first.bounds.y - second.bounds.y ||
    second.zIndex - first.zIndex ||
    first.id.localeCompare(second.id)
  )
}

function getCompositionGroupRenderRank(
  layerPlane: LayerPlane | undefined,
): number {
  return layerPlane
    ? COMPOSITION_GROUP_RENDER_ORDER[layerPlane.compositionGroup]
    : Number.MAX_SAFE_INTEGER
}

function getLayerPlaneRenderOrder(layerPlane: LayerPlane | undefined): number {
  return layerPlane?.order ?? Number.MAX_SAFE_INTEGER
}
