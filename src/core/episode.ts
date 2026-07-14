export const EPISODE_FORMAT_VERSION = 3 as const
export const EPISODE_LOGICAL_WIDTH = 800 as const

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

export interface SyntheticAssetReference {
  readonly kind: 'synthetic'
  readonly generatorId: string
}

export interface ImportedAssetReference {
  readonly kind: 'imported'
  readonly assetId: string
}

export type AssetReference =
  | SyntheticAssetReference
  | ImportedAssetReference

interface EpisodeElementBase {
  readonly id: string
  readonly name: string
  readonly layerPlaneId: string
  readonly bounds: ElementBounds
  readonly visible: boolean
  readonly locked: boolean
  readonly zIndex: number
  readonly assetReference: AssetReference
}

export interface ShapeElement extends EpisodeElementBase {
  readonly type: 'shape'
  readonly shape: 'rectangle' | 'ellipse'
  readonly fill: string
  readonly stroke?: string
  readonly strokeWidth?: number
  readonly cornerRadius?: number
  readonly opacity?: number
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

export type EpisodeElement = ShapeElement | TextElement

export interface EpisodeDocument {
  readonly id: string
  readonly formatVersion: typeof EPISODE_FORMAT_VERSION
  readonly name: string
  readonly logicalWidth: typeof EPISODE_LOGICAL_WIDTH
  readonly logicalHeight: number
  readonly compositionGroupVisibility: CompositionGroupVisibility
  readonly layerPlanes: readonly LayerPlane[]
  readonly elements: readonly EpisodeElement[]
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
