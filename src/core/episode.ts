export const EPISODE_FORMAT_VERSION = 2 as const
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
  readonly compositionGroup: CompositionGroup
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
  return (
    document.compositionGroupVisibility[element.compositionGroup] &&
    element.visible
  )
}

export function compareElementsByRenderOrder(
  first: EpisodeElement,
  second: EpisodeElement,
): number {
  const groupDifference =
    COMPOSITION_GROUP_RENDER_ORDER[first.compositionGroup] -
    COMPOSITION_GROUP_RENDER_ORDER[second.compositionGroup]

  return groupDifference || first.zIndex - second.zIndex
}
