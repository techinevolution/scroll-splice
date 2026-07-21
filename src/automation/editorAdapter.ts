import {
  BUILT_IN_ASSETS,
  type GeneratedImageMetadata,
} from '../assets'
import { isGeneratedImageMetadata } from '../assets/validation'
import { useEditorStore } from '../app/store'
import type {
  ElementAlignment,
  UpdateShapeElementStyleInput,
  UpdateSpeechBalloonElementInput,
  UpdateTextElementInput,
} from '../core/commands'
import type { LogicalPosition } from '../core/coordinates'
import type { SpeechBalloonPresetId } from '../core/speechBalloonPresets'
import {
  COMPOSITION_GROUPS,
  ELEMENT_BLEND_MODES,
  compareElementsByCanvasPosition,
  getElementCompositionGroup,
  getLayerPlaneById,
  isElementEffectivelyVisible,
  type CompositionGroup,
  type ElementBlendMode,
  type ElementBounds,
  type ElementOverflow,
  type ElementTransform,
  type ImageCrop,
  type ImageFrame,
  type ImagePresentation,
  type ShapeFill,
} from '../core/episode'
import {
  materializeGeneratedImageSource,
  type GeneratedImageSource,
} from './generatedImageSource'

export const EDITOR_ADAPTER_API_VERSION = 2 as const

export type EditorAdapterCommand =
  | { readonly type: 'set-active-group'; readonly group: CompositionGroup }
  | { readonly type: 'set-active-plane'; readonly planeId: string }
  | { readonly type: 'set-viewport'; readonly position: LogicalPosition }
  | { readonly type: 'pan-viewport'; readonly delta: LogicalPosition }
  | { readonly type: 'set-zoom'; readonly zoomFactor: number }
  | { readonly type: 'select-element'; readonly elementId: string; readonly reveal?: boolean; readonly toggle?: boolean }
  | { readonly type: 'clear-selection' }
  | { readonly type: 'select-all-in-plane' }
  | { readonly type: 'set-episode-name'; readonly name: string }
  | { readonly type: 'extend-episode' }
  | { readonly type: 'resize-episode'; readonly logicalHeight: number; readonly pinViewportToEnd?: boolean }
  | { readonly type: 'create-plane'; readonly group: CompositionGroup }
  | { readonly type: 'delete-plane'; readonly planeId: string }
  | { readonly type: 'rename-plane'; readonly planeId: string; readonly name: string }
  | { readonly type: 'reorder-plane'; readonly planeId: string; readonly targetIndex: number }
  | { readonly type: 'set-plane-visibility'; readonly planeId: string; readonly visible: boolean }
  | { readonly type: 'set-group-visibility'; readonly group: CompositionGroup; readonly visible: boolean }
  | { readonly type: 'set-base-color'; readonly color: string }
  | { readonly type: 'rename-element'; readonly elementId: string; readonly name: string }
  | { readonly type: 'set-element-visibility'; readonly elementId: string; readonly visible: boolean }
  | { readonly type: 'set-element-lock'; readonly elementId: string; readonly locked: boolean }
  | { readonly type: 'delete-element'; readonly elementId: string }
  | { readonly type: 'duplicate-element'; readonly elementId: string; readonly offset?: LogicalPosition }
  | { readonly type: 'move-element'; readonly elementId: string; readonly position: LogicalPosition }
  | { readonly type: 'resize-element'; readonly elementId: string; readonly bounds: ElementBounds }
  | { readonly type: 'nudge-selection'; readonly delta: LogicalPosition }
  | { readonly type: 'align-selection'; readonly alignment: ElementAlignment }
  | { readonly type: 'move-element-in-stack'; readonly elementId: string; readonly direction: 'backward' | 'forward' }
  | { readonly type: 'reorder-element-in-stack'; readonly elementId: string; readonly targetIndex: number }
  | { readonly type: 'move-element-to-plane'; readonly elementId: string; readonly planeId: string }
  | { readonly type: 'set-element-opacity'; readonly elementId: string; readonly opacity: number }
  | { readonly type: 'set-element-blend-mode'; readonly elementId: string; readonly blendMode: ElementBlendMode }
  | { readonly type: 'set-element-transform'; readonly elementId: string; readonly transform: ElementTransform }
  | { readonly type: 'flip-element'; readonly elementId: string; readonly axis: 'horizontal' | 'vertical' }
  | { readonly type: 'set-element-overflow'; readonly elementId: string; readonly overflow: ElementOverflow }
  | { readonly type: 'create-text'; readonly planeId: string }
  | { readonly type: 'create-speech-balloon'; readonly planeId: string; readonly presetId?: SpeechBalloonPresetId }
  | { readonly type: 'create-background-region'; readonly planeId: string; readonly fill: string; readonly startY: number; readonly height: number }
  | { readonly type: 'place-built-in-asset'; readonly planeId: string; readonly assetId: string }
  | { readonly type: 'place-imported-asset'; readonly planeId: string; readonly assetId: string }
  | { readonly type: 'set-shape-fill'; readonly elementId: string; readonly fill: ShapeFill }
  | { readonly type: 'update-shape-style'; readonly elementId: string; readonly input: UpdateShapeElementStyleInput }
  | { readonly type: 'update-text'; readonly elementId: string; readonly input: UpdateTextElementInput }
  | { readonly type: 'update-speech-balloon'; readonly elementId: string; readonly input: UpdateSpeechBalloonElementInput }
  | { readonly type: 'set-image-presentation'; readonly elementId: string; readonly presentation: ImagePresentation }
  | { readonly type: 'set-image-frame'; readonly elementId: string; readonly frame: ImageFrame }
  | { readonly type: 'set-image-crop'; readonly elementId: string; readonly crop: ImageCrop }
  | { readonly type: 'group-selection' }
  | { readonly type: 'ungroup-selection' }
  | { readonly type: 'move-story-beat'; readonly direction: 'up' | 'down' }
  | { readonly type: 'set-magnet'; readonly enabled: boolean }
  | { readonly type: 'set-slice-guides'; readonly visible: boolean }
  | { readonly type: 'undo' }
  | { readonly type: 'redo' }
  | { readonly type: 'save' }
  | { readonly type: 'save-as' }
  | { readonly type: 'reopen' }
  | { readonly type: 'new-episode' }
  | { readonly type: 'reset-demo' }

export interface GeneratedAssetImportMetadata {
  readonly displayName: string
  readonly creatorCategoryId?: string | null
  readonly provider: string
  readonly model?: string | null
  readonly prompt?: string | null
  readonly generatedAt?: string
}

export type EditorAdapterAsyncCommand =
  | {
      readonly type: 'import-generated-asset'
      readonly source: GeneratedImageSource
      readonly metadata: GeneratedAssetImportMetadata
    }
  | {
      readonly type: 'place-generated-asset'
      readonly assetId: string
      readonly planeId: string
      readonly bounds: ElementBounds
    }

export type EditorAdapterCommandType =
  | EditorAdapterCommand['type']
  | EditorAdapterAsyncCommand['type']

export interface EditorAdapterSnapshot {
  readonly apiVersion: typeof EDITOR_ADAPTER_API_VERSION
  readonly episode: {
    readonly id: string
    readonly name: string
    readonly logicalWidth: number
    readonly logicalHeight: number
    readonly formatVersion: number
  }
  readonly viewport: ElementBounds & { readonly zoomFactor: number }
  readonly selection: { readonly primaryElementId: string | null; readonly elementIds: readonly string[] }
  readonly active: { readonly group: CompositionGroup; readonly planeId: string }
  readonly groups: readonly { readonly id: CompositionGroup; readonly visible: boolean }[]
  readonly planes: readonly {
    readonly id: string
    readonly group: CompositionGroup
    readonly kind: 'base' | 'ordinary'
    readonly order: number
    readonly name: string | null
    readonly visible: boolean
    readonly elementCount: number
  }[]
  readonly elements: readonly {
    readonly id: string
    readonly name: string
    readonly type: string
    readonly group: CompositionGroup | null
    readonly planeId: string
    readonly bounds: ElementBounds
    readonly visible: boolean
    readonly effectivelyVisible: boolean
    readonly locked: boolean
    readonly zIndex: number
    readonly opacity: number
    readonly blendMode: ElementBlendMode
    readonly transform: ElementTransform
    readonly overflow: ElementOverflow
    readonly assetReference: unknown
  }[]
  readonly assets: {
    readonly builtIn: readonly { readonly id: string; readonly name: string; readonly categoryId: string; readonly width: number; readonly height: number }[]
    readonly imported: readonly {
      readonly id: string
      readonly name: string
      readonly mediaType: string
      readonly width: number
      readonly height: number
      readonly categoryId: string | null
      readonly generation: GeneratedImageMetadata | null
    }[]
  }
  readonly editor: {
    readonly currentRevision: number
    readonly canUndo: boolean
    readonly canRedo: boolean
    readonly hasUnsavedChanges: boolean
    readonly magnetEnabled: boolean
    readonly sliceGuidesVisible: boolean
    readonly documentStatus: string
  }
}

type AdapterErrorCode =
  | 'invalid-command'
  | 'invalid-source'
  | 'not-found'
  | 'wrong-type'
  | 'rejected'

export type EditorAdapterResult =
  | { readonly ok: true; readonly command: EditorAdapterCommandType; readonly changed: boolean; readonly createdId?: string; readonly snapshot: EditorAdapterSnapshot }
  | { readonly ok: false; readonly command: EditorAdapterCommandType; readonly code: AdapterErrorCode; readonly message: string; readonly snapshot: EditorAdapterSnapshot }

export interface ScrollSpliceEditorAdapter {
  readonly apiVersion: typeof EDITOR_ADAPTER_API_VERSION
  readonly commandTypes: readonly EditorAdapterCommandType[]
  readonly asyncCommandTypes: readonly EditorAdapterAsyncCommand['type'][]
  inspect(): EditorAdapterSnapshot
  execute(command: EditorAdapterCommand): EditorAdapterResult
  executeAsync(command: EditorAdapterAsyncCommand): Promise<EditorAdapterResult>
}

type EditorStore = Pick<typeof useEditorStore, 'getState'>

export const EDITOR_ADAPTER_COMMAND_TYPES = [
  'set-active-group', 'set-active-plane', 'set-viewport', 'pan-viewport', 'set-zoom',
  'select-element', 'clear-selection', 'select-all-in-plane', 'set-episode-name',
  'extend-episode', 'resize-episode', 'create-plane', 'delete-plane', 'rename-plane',
  'reorder-plane', 'set-plane-visibility', 'set-group-visibility', 'set-base-color',
  'rename-element', 'set-element-visibility', 'set-element-lock', 'delete-element',
  'duplicate-element', 'move-element', 'resize-element', 'nudge-selection',
  'align-selection', 'move-element-in-stack', 'move-element-to-plane',
  'reorder-element-in-stack',
  'set-element-opacity', 'set-element-blend-mode', 'set-element-transform',
  'flip-element', 'set-element-overflow', 'create-text', 'create-speech-balloon',
  'create-background-region', 'place-built-in-asset', 'place-imported-asset',
  'set-shape-fill', 'update-shape-style', 'update-text', 'update-speech-balloon',
  'set-image-presentation', 'set-image-frame', 'set-image-crop', 'group-selection',
  'ungroup-selection', 'move-story-beat', 'set-magnet', 'set-slice-guides', 'undo',
  'redo', 'save', 'save-as', 'reopen', 'new-episode', 'reset-demo',
] as const satisfies readonly EditorAdapterCommand['type'][]

export const EDITOR_ADAPTER_ASYNC_COMMAND_TYPES = [
  'import-generated-asset',
  'place-generated-asset',
] as const satisfies readonly EditorAdapterAsyncCommand['type'][]

export function createEditorAdapter(store: EditorStore = useEditorStore): ScrollSpliceEditorAdapter {
  const inspect = (): EditorAdapterSnapshot => {
    const state = store.getState()
    const elementCounts = new Map<string, number>()
    for (const element of state.episode.elements) {
      elementCounts.set(element.layerPlaneId, (elementCounts.get(element.layerPlaneId) ?? 0) + 1)
    }

    return {
      apiVersion: EDITOR_ADAPTER_API_VERSION,
      episode: {
        id: state.episode.id,
        name: state.episode.name,
        logicalWidth: state.episode.logicalWidth,
        logicalHeight: state.episode.logicalHeight,
        formatVersion: state.episode.formatVersion,
      },
      viewport: {
        x: state.viewportX,
        y: state.viewportY,
        width: state.viewportLogicalWidth,
        height: state.viewportLogicalHeight,
        zoomFactor: state.zoomFactor,
      },
      selection: { primaryElementId: state.selectedElementId, elementIds: [...state.selectedElementIds] },
      active: { group: state.activeCompositionGroup, planeId: state.activeLayerPlaneId },
      groups: COMPOSITION_GROUPS.map((id) => ({ id, visible: state.episode.compositionGroupVisibility[id] })),
      planes: [...state.episode.layerPlanes]
        .sort((a, b) => COMPOSITION_GROUPS.indexOf(a.compositionGroup) - COMPOSITION_GROUPS.indexOf(b.compositionGroup) || a.order - b.order)
        .map((item) => ({
          id: item.id,
          group: item.compositionGroup,
          kind: item.kind,
          order: item.order,
          name: item.name ?? null,
          visible: item.visible,
          elementCount: elementCounts.get(item.id) ?? 0,
        })),
      elements: [...state.episode.elements].sort(compareElementsByCanvasPosition).map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        group: getElementCompositionGroup(state.episode, item) ?? null,
        planeId: item.layerPlaneId,
        bounds: { ...item.bounds },
        visible: item.visible,
        effectivelyVisible: isElementEffectivelyVisible(state.episode, item),
        locked: item.locked,
        zIndex: item.zIndex,
        opacity: item.opacity,
        blendMode: item.blendMode,
        transform: { ...item.transform },
        overflow: item.overflow,
        assetReference: { ...item.assetReference },
      })),
      assets: {
        builtIn: BUILT_IN_ASSETS.map((asset) => ({ id: asset.id, name: asset.displayName, categoryId: asset.categoryId, width: asset.intrinsicWidth, height: asset.intrinsicHeight })),
        imported: state.importedImageAssets.map((asset) => ({
          id: asset.id,
          name: asset.displayName,
          mediaType: asset.mediaType,
          width: asset.intrinsicWidth,
          height: asset.intrinsicHeight,
          categoryId: asset.creatorCategoryId,
          generation: asset.generation ?? null,
        })),
      },
      editor: {
        currentRevision: state.currentRevision,
        canUndo: state.canUndo,
        canRedo: state.canRedo,
        hasUnsavedChanges: state.hasUnsavedChanges,
        magnetEnabled: state.magnetEnabled,
        sliceGuidesVisible: state.sliceGuidesVisible,
        documentStatus: state.documentStatus,
      },
    }
  }

  const fail = (
    command: EditorAdapterCommand | EditorAdapterAsyncCommand,
    code: AdapterErrorCode,
    message: string,
  ): EditorAdapterResult => ({
    ok: false, command: command.type, code, message, snapshot: inspect(),
  })

  const execute = (command: EditorAdapterCommand): EditorAdapterResult => {
    const beforeState = store.getState()
    const beforeEpisode = beforeState.episode
    const beforePlaneIds = new Set(beforeEpisode.layerPlanes.map(({ id }) => id))
    const beforeElementIds = new Set(beforeEpisode.elements.map(({ id }) => id))
    const plane = 'planeId' in command ? getLayerPlaneById(beforeEpisode, command.planeId) : undefined
    const element = 'elementId' in command ? beforeEpisode.elements.find(({ id }) => id === command.elementId) : undefined

    if ('planeId' in command && !plane) return fail(command, 'not-found', `Layer plane ${command.planeId} was not found.`)
    if ('elementId' in command && !element) return fail(command, 'not-found', `Element ${command.elementId} was not found.`)

    const createsElementOnTargetPlane =
      command.type === 'create-text' ||
      command.type === 'create-speech-balloon' ||
      command.type === 'create-background-region' ||
      command.type === 'place-built-in-asset' ||
      command.type === 'place-imported-asset'

    if (createsElementOnTargetPlane) {
      if (plane?.kind !== 'ordinary') return fail(command, 'wrong-type', 'New elements can only be placed on an ordinary layer plane.')
    }

    if (createsElementOnTargetPlane || command.type === 'set-active-plane') {
      if (!plane) {
        return fail(command, 'not-found', `Layer plane ${command.planeId} was not found.`)
      }

      beforeState.setActiveCompositionGroup(plane.compositionGroup)
      store.getState().setActiveLayerPlane(command.planeId)

      const activeState = store.getState()
      if (
        activeState.activeCompositionGroup !== plane.compositionGroup ||
        activeState.activeLayerPlaneId !== command.planeId
      ) {
        return fail(command, 'rejected', `Layer plane ${command.planeId} could not be activated.`)
      }
    }

    switch (command.type) {
      case 'set-active-group': beforeState.setActiveCompositionGroup(command.group); break
      case 'set-active-plane': break
      case 'set-viewport': beforeState.setViewportPosition(command.position); break
      case 'pan-viewport': beforeState.panViewport(command.delta); break
      case 'set-zoom': beforeState.setZoomFactor(command.zoomFactor); break
      case 'select-element': beforeState.selectElement(command.elementId, command.reveal ?? true, command.toggle ?? false); break
      case 'clear-selection': beforeState.selectElement(null); break
      case 'select-all-in-plane': beforeState.selectAllInActivePlane(); break
      case 'set-episode-name': beforeState.setEpisodeName(command.name); break
      case 'extend-episode': beforeState.extendEpisodeHeight(); break
      case 'resize-episode': beforeState.resizeEpisodeHeight(command.logicalHeight, command.pinViewportToEnd); break
      case 'create-plane': beforeState.setActiveCompositionGroup(command.group); store.getState().createLayerPlane(); break
      case 'delete-plane': beforeState.deleteLayerPlane(command.planeId); break
      case 'rename-plane': beforeState.setLayerPlaneName(command.planeId, command.name); break
      case 'reorder-plane': beforeState.reorderLayerPlane(command.planeId, command.targetIndex); break
      case 'set-plane-visibility': beforeState.setLayerPlaneVisibility(command.planeId, command.visible); break
      case 'set-group-visibility': beforeState.setCompositionGroupVisibility(command.group, command.visible); break
      case 'set-base-color': beforeState.setBaseColor(command.color); break
      case 'rename-element': beforeState.setElementName(command.elementId, command.name); break
      case 'set-element-visibility': beforeState.setElementVisibility(command.elementId, command.visible); break
      case 'set-element-lock': beforeState.setElementLocked(command.elementId, command.locked); break
      case 'delete-element': beforeState.deleteElement(command.elementId); break
      case 'duplicate-element': if (!beforeState.duplicateElement(command.elementId, command.offset)) return fail(command, 'rejected', 'The element could not be duplicated.'); break
      case 'move-element': beforeState.moveElement(command.elementId, command.position); break
      case 'resize-element': beforeState.resizeElement(command.elementId, command.bounds); break
      case 'nudge-selection': if (!beforeState.nudgeSelectedElement(command.delta)) return fail(command, 'rejected', 'The current selection could not be nudged.'); break
      case 'align-selection': if (!beforeState.alignSelectedElement(command.alignment)) return fail(command, 'rejected', 'The current selection could not be aligned.'); break
      case 'move-element-in-stack': beforeState.moveElementInStack(command.elementId, command.direction); break
      case 'reorder-element-in-stack': beforeState.reorderElementInStack(command.elementId, command.targetIndex); break
      case 'move-element-to-plane': beforeState.moveElementToLayerPlane(command.elementId, command.planeId); break
      case 'set-element-opacity': beforeState.setElementOpacity(command.elementId, command.opacity); break
      case 'set-element-blend-mode':
        if (!ELEMENT_BLEND_MODES.includes(command.blendMode)) return fail(command, 'invalid-command', 'Unsupported blend mode.')
        beforeState.setElementBlendMode(command.elementId, command.blendMode)
        break
      case 'set-element-transform': beforeState.setElementTransform(command.elementId, command.transform); break
      case 'flip-element': beforeState.toggleElementFlip(command.elementId, command.axis); break
      case 'set-element-overflow': beforeState.setElementOverflow(command.elementId, command.overflow); break
      case 'create-text': if (!store.getState().createTextElement()) return fail(command, 'rejected', 'Text could not be created on that plane.'); break
      case 'create-speech-balloon': if (!store.getState().createSpeechBalloonElement(command.presetId)) return fail(command, 'rejected', 'Speech balloon could not be created on that plane.'); break
      case 'create-background-region':
        if (!store.getState().createBackgroundColorRegion({ fill: command.fill, startY: command.startY, height: command.height })) return fail(command, 'rejected', 'Background region could not be created on that plane.')
        break
      case 'place-built-in-asset': if (!store.getState().placeBuiltInAsset(command.assetId)) return fail(command, 'rejected', 'Built-in asset could not be placed.'); break
      case 'place-imported-asset': if (!store.getState().placeImportedAsset(command.assetId)) return fail(command, 'rejected', 'Imported asset could not be placed.'); break
      case 'set-shape-fill':
        if (element?.type !== 'shape') return fail(command, 'wrong-type', 'The target is not a shape.')
        beforeState.setShapeFill(command.elementId, command.fill)
        break
      case 'update-shape-style':
        if (element?.type !== 'shape') return fail(command, 'wrong-type', 'The target is not a shape.')
        beforeState.updateShapeElementStyle(command.elementId, command.input)
        break
      case 'update-text':
        if (element?.type !== 'text') return fail(command, 'wrong-type', 'The target is not text.')
        beforeState.updateTextElement(command.elementId, command.input)
        break
      case 'update-speech-balloon':
        if (element?.type !== 'speech-balloon') return fail(command, 'wrong-type', 'The target is not a speech balloon.')
        beforeState.updateSpeechBalloonElement(command.elementId, command.input)
        break
      case 'set-image-presentation':
        if (element?.type !== 'image') return fail(command, 'wrong-type', 'The target is not an image.')
        beforeState.setImagePresentation(command.elementId, command.presentation)
        break
      case 'set-image-frame':
        if (element?.type !== 'image') return fail(command, 'wrong-type', 'The target is not an image.')
        beforeState.setImageFrame(command.elementId, command.frame)
        break
      case 'set-image-crop':
        if (element?.type !== 'image') return fail(command, 'wrong-type', 'The target is not an image.')
        beforeState.setImageCrop(command.elementId, command.crop)
        break
      case 'group-selection': if (!beforeState.groupSelectedElements()) return fail(command, 'rejected', 'The selection could not be grouped.'); break
      case 'ungroup-selection': if (!beforeState.ungroupSelectedElements()) return fail(command, 'rejected', 'The selection could not be ungrouped.'); break
      case 'move-story-beat': if (!beforeState.moveSelectedStoryBeat(command.direction)) return fail(command, 'rejected', 'The selected story beat could not be moved.'); break
      case 'set-magnet': if (beforeState.magnetEnabled !== command.enabled) beforeState.toggleMagnet(); break
      case 'set-slice-guides': if (beforeState.sliceGuidesVisible !== command.visible) beforeState.toggleSliceGuides(); break
      case 'undo': beforeState.undo(); break
      case 'redo': beforeState.redo(); break
      case 'save': if (!beforeState.saveEpisode()) return fail(command, 'rejected', 'The episode could not be saved.'); break
      case 'save-as': if (!beforeState.saveEpisodeAs()) return fail(command, 'rejected', 'The episode could not be saved as a new project.'); break
      case 'reopen': if (!beforeState.reopenEpisode()) return fail(command, 'rejected', 'No saved episode could be reopened.'); break
      case 'new-episode': beforeState.newEpisode(); break
      case 'reset-demo': beforeState.resetEpisode(); break
    }

    const afterState = store.getState()
    const createdPlane = afterState.episode.layerPlanes.find(({ id }) => !beforePlaneIds.has(id))
    const createdElement = afterState.episode.elements.find(({ id }) => !beforeElementIds.has(id))
    const changed = afterState !== beforeState || afterState.episode !== beforeEpisode
    return { ok: true, command: command.type, changed, createdId: createdElement?.id ?? createdPlane?.id, snapshot: inspect() }
  }

  const executeAsync = async (
    command: EditorAdapterAsyncCommand,
  ): Promise<EditorAdapterResult> => {
    if (command.type === 'import-generated-asset') {
      const metadata = command.metadata

      if (
        !metadata ||
        typeof metadata.displayName !== 'string' ||
        typeof metadata.provider !== 'string' ||
        (metadata.model !== undefined &&
          metadata.model !== null &&
          typeof metadata.model !== 'string') ||
        (metadata.prompt !== undefined &&
          metadata.prompt !== null &&
          typeof metadata.prompt !== 'string') ||
        (metadata.generatedAt !== undefined &&
          typeof metadata.generatedAt !== 'string') ||
        (metadata.creatorCategoryId !== undefined &&
          metadata.creatorCategoryId !== null &&
          typeof metadata.creatorCategoryId !== 'string')
      ) {
        return fail(command, 'invalid-command', 'The generated asset metadata is invalid.')
      }

      const generatedAt = metadata.generatedAt ?? new Date().toISOString()
      const generation: GeneratedImageMetadata = {
        provider: metadata.provider.trim(),
        model: metadata.model?.trim() || null,
        prompt: metadata.prompt?.trim() || null,
        generatedAt,
      }

      if (!isGeneratedImageMetadata(generation)) {
        return fail(
          command,
          'invalid-command',
          'The generated image provider, model, prompt, or timestamp is invalid.',
        )
      }

      const source = materializeGeneratedImageSource(
        command.source,
        metadata.displayName,
      )

      if (!source.ok) {
        return fail(command, 'invalid-source', source.message)
      }

      const beforeIds = new Set(
        store.getState().importedImageAssets.map(({ id }) => id),
      )
      const imported = await store.getState().importImageAsset(
        source.file,
        metadata.creatorCategoryId ?? null,
        generation,
      )

      if (!imported) {
        return fail(
          command,
          'rejected',
          store.getState().assetLibraryMessage ||
            'The generated image could not be imported.',
        )
      }

      const createdAsset = store
        .getState()
        .importedImageAssets.find(({ id }) => !beforeIds.has(id))

      if (!createdAsset) {
        return fail(
          command,
          'rejected',
          'The generated image was saved, but its stable asset ID could not be identified.',
        )
      }

      return {
        ok: true,
        command: command.type,
        changed: true,
        createdId: createdAsset.id,
        snapshot: inspect(),
      }
    }

    const requestedBounds = command.bounds
    if (
      !requestedBounds ||
      typeof requestedBounds !== 'object' ||
      !Number.isFinite(requestedBounds.x) ||
      !Number.isFinite(requestedBounds.y) ||
      !Number.isFinite(requestedBounds.width) ||
      !Number.isFinite(requestedBounds.height) ||
      requestedBounds.width <= 0 ||
      requestedBounds.height <= 0
    ) {
      return fail(
        command,
        'invalid-command',
        'Generated asset bounds must contain finite positive dimensions.',
      )
    }

    const before = store.getState()
    const plane = getLayerPlaneById(before.episode, command.planeId)

    if (!plane) {
      return fail(
        command,
        'not-found',
        `Layer plane ${command.planeId} was not found.`,
      )
    }

    if (plane.kind !== 'ordinary') {
      return fail(
        command,
        'wrong-type',
        'Generated images can only be placed on an ordinary layer plane.',
      )
    }

    const asset = before.importedImageAssets.find(
      ({ id }) => id === command.assetId,
    )

    if (!asset) {
      return fail(
        command,
        'not-found',
        `Generated asset ${command.assetId} was not found.`,
      )
    }

    if (!asset.generation) {
      return fail(
        command,
        'wrong-type',
        `Asset ${command.assetId} is an ordinary imported image, not a generated asset.`,
      )
    }

    before.setActiveCompositionGroup(plane.compositionGroup)
    store.getState().setActiveLayerPlane(plane.id)

    const active = store.getState()
    if (
      active.activeCompositionGroup !== plane.compositionGroup ||
      active.activeLayerPlaneId !== plane.id
    ) {
      return fail(
        command,
        'rejected',
        `Layer plane ${command.planeId} could not be activated.`,
      )
    }

    const createdId = store.getState().placeImportedAssetAtBounds(
      asset.id,
      plane.id,
      command.bounds,
    )

    if (!createdId) {
      return fail(
        command,
        'rejected',
        store.getState().assetLibraryMessage ||
          'The generated asset could not be placed.',
      )
    }

    return {
      ok: true,
      command: command.type,
      changed: true,
      createdId,
      snapshot: inspect(),
    }
  }

  return {
    apiVersion: EDITOR_ADAPTER_API_VERSION,
    commandTypes: [
      ...EDITOR_ADAPTER_COMMAND_TYPES,
      ...EDITOR_ADAPTER_ASYNC_COMMAND_TYPES,
    ],
    asyncCommandTypes: EDITOR_ADAPTER_ASYNC_COMMAND_TYPES,
    inspect,
    execute,
    executeAsync,
  }
}

export function installEditorAdapterBrowserBridge(target: Window = window): ScrollSpliceEditorAdapter {
  const adapter = createEditorAdapter()
  target.scrollSpliceEditor = adapter
  return adapter
}

declare global {
  interface Window {
    scrollSpliceEditor?: ScrollSpliceEditorAdapter
  }
}
