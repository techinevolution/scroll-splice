export const EPISODE_FORMAT_VERSION = 1 as const
export const EPISODE_LOGICAL_WIDTH = 800 as const

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
  readonly elements: readonly EpisodeElement[]
}
