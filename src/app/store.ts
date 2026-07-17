import { create } from 'zustand'

import {
  BUILD_WEEK_LAYER_PLANE_IDS,
  buildWeekEpisode,
} from './fixtures/buildWeekEpisode'
import { createBlankEpisode } from '../core/createBlankEpisode'
import {
  DEFAULT_EPISODE_HEIGHT_INCREMENT,
  MIN_ELEMENT_SIZE,
  alignElement as alignElementCommand,
  createBackgroundColorRegion as createBackgroundColorRegionCommand,
  createImageElement as createImageElementCommand,
  createLayerPlane as createLayerPlaneCommand,
  createSpeechBalloonElement as createSpeechBalloonElementCommand,
  createSyntheticShapeElement as createSyntheticShapeElementCommand,
  createTextElement as createTextElementCommand,
  deleteEmptyLayerPlane as deleteEmptyLayerPlaneCommand,
  extendEpisodeHeight as extendEpisodeHeightCommand,
  moveElementInStack as moveElementInStackCommand,
  reorderLayerPlane as reorderLayerPlaneCommand,
  resizeElement as resizeElementCommand,
  resizeEpisodeHeight as resizeEpisodeHeightCommand,
  setBaseColor as setBaseColorCommand,
  setCompositionGroupVisibility as setCompositionGroupVisibilityCommand,
  setElementBlendMode as setElementBlendModeCommand,
  setElementName as setElementNameCommand,
  setElementOpacity as setElementOpacityCommand,
  setElementOverflow as setElementOverflowCommand,
  setElementTransform as setElementTransformCommand,
  setElementVisibility as setElementVisibilityCommand,
  setEpisodeName as setEpisodeNameCommand,
  setImagePresentation as setImagePresentationCommand,
  setImageCrop as setImageCropCommand,
  setImageFrame as setImageFrameCommand,
  setLayerPlaneName as setLayerPlaneNameCommand,
  setLayerPlaneVisibility as setLayerPlaneVisibilityCommand,
  setShapeFill as setShapeFillCommand,
  updateShapeElementStyle as updateShapeElementStyleCommand,
  updateSpeechBalloonElement as updateSpeechBalloonElementCommand,
  updateTextElement as updateTextElementCommand,
  type ElementAlignment,
  type UpdateShapeElementStyleInput,
  type UpdateSpeechBalloonElementInput,
  type UpdateTextElementInput,
} from '../core/commands'
import {
  deleteElementSelection as deleteElementSelectionCommand,
  duplicateElementSelection as duplicateElementSelectionCommand,
  getElementGroupByMember,
  groupElements as groupElementsCommand,
  moveElementSelection as moveElementSelectionCommand,
  moveElementSelectionToLayerPlane as moveElementSelectionToLayerPlaneCommand,
  setElementSelectionLocked as setElementSelectionLockedCommand,
  ungroupElements as ungroupElementsCommand,
} from '../core/groupCommands'
import {
  deleteLayerPlaneWithDisposition,
  type PopulatedPlaneDisposition,
} from '../core/planeCommands'
import {
  DEFAULT_ZOOM_FACTOR,
  boundsIntersectViewport,
  clampElementPosition,
  clampViewportPosition,
  clampZoomFactor,
  preserveViewportCenter,
  revealBoundsInViewport,
  type LogicalPosition,
  type LogicalViewport,
} from '../core/coordinates'
import {
  getElementCompositionGroup,
  getLayerPlaneById,
  getLayerPlanesForGroup,
  type CompositionGroup,
  type ElementBlendMode,
  type ElementBounds,
  type ElementOverflow,
  type ElementTransform,
  type EpisodeDocument,
  type ImageCrop,
  type ImageElement,
  type ImageFrame,
  type ImageAssetReference,
  type ShapeFill,
  type ShapeElement,
} from '../core/episode'
import {
  ASSET_LIBRARY_SNAPSHOT_FORMAT_VERSION,
  BUILT_IN_ASSETS,
  checkImportedAssetDeletionSafety,
  createIndexedDbAssetRepository,
  createRuntimeImportedImage,
  importBrowserImage,
  revokeRuntimeImportedImages,
  type AssetLibrarySnapshot,
  type AssetLibrarySnapshotTransform,
  type AssetReferenceStorage,
  type AssetDragPayload,
  type AssetRepository,
  type BrowserImageFile,
  type CreatorAssetCategorySnapshot,
  type ImportedImageSnapshot,
  type ResolvedImageAsset,
  type RuntimeImportedImage,
} from '../assets'
import {
  isSafeCreatorCategoryName,
  isSafeDisplayName,
} from '../assets/validation'
import {
  createLocalStorageProjectRepository,
  getBrowserLocalStorage,
} from '../persistence/projectRepository'
import {
  createLocalStorageProjectLibraryRepository,
  type LocalProjectSummary,
} from '../persistence/projectLibraryRepository'
import {
  createDebouncedLocalStorageRecoveryRepository,
  type DebouncedRecoveryRepository,
  type RecoveredProject,
  type RecoveryStorageLike,
} from '../persistence/recoveryRepository'
import {
  parsePortableProject,
  serializePortableProject,
} from '../persistence/portableProject'
import { mergePortableProjectAssets } from '../persistence/portableProjectMerge'

export type AssetLibraryStatus = 'idle' | 'loading' | 'ready' | 'error'
export type AssetLibraryMessageKind = 'info' | 'success' | 'error'

interface EditorState {
  readonly episode: EpisodeDocument
  readonly historyPast: readonly HistoryCheckpoint[]
  readonly historyFuture: readonly HistoryCheckpoint[]
  readonly episodeHeightResizeStart: HistoryCheckpoint | null
  readonly elementOpacityEditStart: ElementOpacityEditStart | null
  readonly currentRevision: number
  readonly nextRevision: number
  readonly savedRevision: number | null
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly hasUnsavedChanges: boolean
  readonly hasSavedEpisode: boolean
  readonly currentProjectId: string | null
  readonly reopenProjectId: string | null
  readonly recentProjects: readonly LocalProjectSummary[]
  readonly projectLibraryBusy: boolean
  readonly recoveryAvailable: RecoveredProject | null
  readonly recoveryMessage: string | null
  readonly documentStatus: string
  readonly selectedElementId: string | null
  readonly selectedElementIds: readonly string[]
  readonly liveElementBounds: {
    readonly elementId: string
    readonly bounds: ElementBounds
  } | null
  readonly activeCompositionGroup: CompositionGroup
  readonly activeLayerPlaneId: string
  readonly viewportX: number
  readonly viewportY: number
  readonly viewportLogicalWidth: number
  readonly viewportLogicalHeight: number
  readonly fitViewportLogicalHeight: number
  readonly zoomFactor: number
  readonly assetPanelOpen: boolean
  readonly assetLibraryStatus: AssetLibraryStatus
  readonly assetLibraryBusy: boolean
  readonly assetLibraryMessage: string | null
  readonly assetLibraryMessageKind: AssetLibraryMessageKind
  readonly creatorAssetCategories: readonly CreatorAssetCategorySnapshot[]
  readonly importedImageAssets: readonly RuntimeImportedImage[]
  readonly magnetEnabled: boolean
  readonly sliceGuidesVisible: boolean
  readonly setActiveCompositionGroup: (group: CompositionGroup) => void
  readonly setActiveLayerPlane: (layerPlaneId: string) => void
  readonly createLayerPlane: () => void
  readonly deleteLayerPlane: (
    layerPlaneId: string,
    disposition?: PopulatedPlaneDisposition,
  ) => void
  readonly setLayerPlaneName: (layerPlaneId: string, name: string) => void
  readonly reorderLayerPlane: (
    layerPlaneId: string,
    targetIndex: number,
  ) => void
  readonly setEpisodeName: (name: string) => void
  readonly extendEpisodeHeight: () => void
  readonly resizeEpisodeHeight: (
    logicalHeight: number,
    pinViewportToEnd?: boolean,
  ) => void
  readonly beginEpisodeHeightResize: () => void
  readonly endEpisodeHeightResize: () => void
  readonly cancelEpisodeHeightResize: () => void
  readonly setFitViewportLogicalHeight: (logicalHeight: number) => void
  readonly setZoomFactor: (zoomFactor: number) => void
  readonly setViewportPosition: (position: LogicalPosition) => void
  readonly setViewportY: (logicalY: number) => void
  readonly panViewport: (logicalDelta: LogicalPosition) => void
  readonly selectElement: (
    elementId: string | null,
    reveal?: boolean,
    toggle?: boolean,
  ) => void
  readonly selectAllInActivePlane: () => void
  readonly groupSelectedElements: () => boolean
  readonly ungroupSelectedElements: () => boolean
  readonly moveSelectedStoryBeat: (direction: 'up' | 'down') => boolean
  readonly setElementVisibility: (elementId: string, visible: boolean) => void
  readonly setLayerPlaneVisibility: (
    layerPlaneId: string,
    visible: boolean,
  ) => void
  readonly setCompositionGroupVisibility: (
    group: CompositionGroup,
    visible: boolean,
  ) => void
  readonly setBaseColor: (color: string) => void
  readonly setElementName: (elementId: string, name: string) => void
  readonly setElementLocked: (elementId: string, locked: boolean) => void
  readonly toggleElementLocked: (elementId: string) => void
  readonly deleteElement: (elementId: string) => void
  readonly duplicateElement: (
    elementId: string,
    offset?: LogicalPosition,
  ) => boolean
  readonly nudgeSelectedElement: (delta: LogicalPosition) => boolean
  readonly alignSelectedElement: (alignment: ElementAlignment) => boolean
  readonly moveElementInStack: (
    elementId: string,
    direction: 'backward' | 'forward',
  ) => void
  readonly moveElementToLayerPlane: (
    elementId: string,
    layerPlaneId: string,
  ) => void
  readonly placeSyntheticAsset: (input: {
    readonly name: string
    readonly shape?: ShapeElement['shape']
    readonly fill: string
    readonly stroke?: string
    readonly strokeWidth?: number
    readonly cornerRadius?: number
  }) => void
  readonly createTextElement: () => boolean
  readonly createSpeechBalloonElement: () => boolean
  readonly createBackgroundColorRegion: (input: {
    readonly fill: string
    readonly startY: number
    readonly height: number
  }) => boolean
  readonly moveElement: (
    elementId: string,
    logicalPosition: LogicalPosition,
  ) => void
  readonly resizeElement: (
    elementId: string,
    logicalBounds: ElementBounds,
  ) => void
  readonly previewElementBounds: (
    elementId: string,
    logicalBounds: ElementBounds,
  ) => void
  readonly clearElementBoundsPreview: (elementId?: string) => void
  readonly setElementOpacity: (elementId: string, opacity: number) => void
  readonly beginElementOpacityEdit: (elementId: string) => void
  readonly previewElementOpacity: (elementId: string, opacity: number) => void
  readonly endElementOpacityEdit: () => void
  readonly cancelElementOpacityEdit: () => void
  readonly setElementBlendMode: (
    elementId: string,
    blendMode: ElementBlendMode,
  ) => void
  readonly setElementTransform: (
    elementId: string,
    transform: ElementTransform,
  ) => void
  readonly toggleElementFlip: (
    elementId: string,
    axis: 'horizontal' | 'vertical',
  ) => void
  readonly setElementOverflow: (
    elementId: string,
    overflow: ElementOverflow,
  ) => void
  readonly setShapeFill: (elementId: string, fill: ShapeFill) => void
  readonly updateShapeElementStyle: (
    elementId: string,
    input: UpdateShapeElementStyleInput,
  ) => void
  readonly updateTextElement: (
    elementId: string,
    input: UpdateTextElementInput,
  ) => void
  readonly updateSpeechBalloonElement: (
    elementId: string,
    input: UpdateSpeechBalloonElementInput,
  ) => void
  readonly setImagePresentation: (
    elementId: string,
    presentation: ImageElement['presentation'],
  ) => void
  readonly setImageFrame: (elementId: string, frame: ImageFrame) => void
  readonly setImageCrop: (elementId: string, crop: ImageCrop) => void
  readonly toggleMagnet: () => void
  readonly toggleSliceGuides: () => void
  readonly toggleAssetPanel: () => void
  readonly openAssetPanel: () => void
  readonly closeAssetPanel: () => void
  readonly initializeAssetLibrary: () => Promise<boolean>
  readonly createCreatorAssetCategory: (
    name: string,
  ) => Promise<string | null>
  readonly renameCreatorAssetCategory: (
    categoryId: string,
    name: string,
  ) => Promise<boolean>
  readonly deleteCreatorAssetCategory: (
    categoryId: string,
  ) => Promise<boolean>
  readonly reorderCreatorAssetCategory: (
    categoryId: string,
    targetIndex: number,
  ) => Promise<boolean>
  readonly importImageAsset: (
    file: BrowserImageFile,
    creatorCategoryId?: string | null,
  ) => Promise<boolean>
  readonly importAndPlaceImageAsset: (
    file: BrowserImageFile,
    logicalCenter: LogicalPosition,
  ) => Promise<boolean>
  readonly renameImportedImageAsset: (
    assetId: string,
    name: string,
  ) => Promise<boolean>
  readonly moveImportedImageAsset: (
    assetId: string,
    creatorCategoryId: string | null,
  ) => Promise<boolean>
  readonly replaceImportedImageAsset: (
    assetId: string,
    file: BrowserImageFile,
  ) => Promise<boolean>
  readonly deleteImportedImageAsset: (assetId: string) => Promise<boolean>
  readonly placeBuiltInAsset: (assetId: string) => boolean
  readonly placeImportedAsset: (assetId: string) => boolean
  readonly placeDraggedAsset: (
    payload: AssetDragPayload,
    logicalCenter: LogicalPosition,
  ) => boolean
  readonly placeDraggedAssetOnPlane: (
    payload: AssetDragPayload,
    layerPlaneId: string,
  ) => boolean
  readonly reportAssetDropError: (message: string) => void
  readonly undo: () => void
  readonly redo: () => void
  readonly saveEpisode: () => boolean
  readonly saveEpisodeAs: () => boolean
  readonly openLocalProject: (projectId: string) => boolean
  readonly deleteLocalProject: (projectId: string) => boolean
  readonly refreshRecentProjects: () => boolean
  readonly reopenEpisode: () => boolean
  readonly newEpisode: () => void
  readonly resetEpisode: () => void
  readonly restoreRecovery: () => boolean
  readonly discardRecovery: () => boolean
  readonly flushRecovery: () => void
  readonly exportPortableProject: () => Promise<{
    readonly blob: Blob
    readonly fileName: string
  } | null>
  readonly importPortableProject: (file: Blob) => Promise<boolean>
}

interface HistoryCheckpoint {
  readonly episode: EpisodeDocument
  readonly selectedElementId: string | null
  readonly selectedElementIds: readonly string[]
  readonly activeCompositionGroup: CompositionGroup
  readonly activeLayerPlaneId: string
  readonly revision: number
}

interface ElementOpacityEditStart {
  readonly elementId: string
  readonly checkpoint: HistoryCheckpoint
}

const INITIAL_VIEWPORT_LOGICAL_HEIGHT = 900
const INITIAL_COMPOSITION_GROUP = 'content' as const
const INITIAL_LAYER_PLANE_ID = BUILD_WEEK_LAYER_PLANE_IDS.contentPanels
const HISTORY_LIMIT = 100
const DEFAULT_IMAGE_VIEWPORT_FRACTION = 0.6
const STORY_BEAT_STEP = 128

let assetRepositoryOverride: AssetRepository | undefined
let assetReferenceStorageOverride:
  | AssetReferenceStorage
  | null
  | undefined

export function setAssetRepositoryForTesting(
  repository: AssetRepository | undefined,
): void {
  assetRepositoryOverride = repository
}

export function setAssetReferenceStorageForTesting(
  storage: AssetReferenceStorage | null | undefined,
): void {
  assetReferenceStorageOverride = storage
}

function getAssetRepository(): AssetRepository {
  return assetRepositoryOverride ?? createIndexedDbAssetRepository()
}

function getAssetReferenceStorage(): AssetReferenceStorage | undefined {
  if (assetReferenceStorageOverride !== undefined) {
    return assetReferenceStorageOverride ?? undefined
  }

  const storage = getBrowserLocalStorage()

  return storage &&
    typeof (storage as Partial<AssetReferenceStorage>).removeItem === 'function'
    ? (storage as AssetReferenceStorage)
    : undefined
}

type EditorStatePatch = Partial<EditorState>

function createImportedImageSnapshot(
  image: RuntimeImportedImage,
): ImportedImageSnapshot {
  return {
    id: image.id,
    displayName: image.displayName,
    mediaType: image.mediaType,
    byteSize: image.byteSize,
    intrinsicWidth: image.intrinsicWidth,
    intrinsicHeight: image.intrinsicHeight,
    sourceBlob: image.sourceBlob,
    creatorCategoryId: image.creatorCategoryId,
    importedAt: image.importedAt,
  }
}

function createAssetLibrarySnapshot(
  state: EditorState,
  savedAt: string,
  creatorCategories: readonly CreatorAssetCategorySnapshot[] =
    state.creatorAssetCategories,
  importedImages: readonly ImportedImageSnapshot[] =
    state.importedImageAssets.map(createImportedImageSnapshot),
): AssetLibrarySnapshot {
  return {
    formatVersion: ASSET_LIBRARY_SNAPSHOT_FORMAT_VERSION,
    savedAt,
    creatorCategories,
    importedImages,
  }
}

type PersistAssetLibraryResult =
  | { readonly ok: true; readonly snapshot: AssetLibrarySnapshot }
  | { readonly ok: false; readonly message: string }

async function persistAssetLibraryUpdate(
  repository: AssetRepository,
  transform: AssetLibrarySnapshotTransform,
): Promise<PersistAssetLibraryResult> {
  return repository.update(transform)
}

function getLatestAssetLibraryParts(
  state: EditorState,
  currentSnapshot: AssetLibrarySnapshot | undefined,
): {
  readonly creatorCategories: readonly CreatorAssetCategorySnapshot[]
  readonly importedImages: readonly ImportedImageSnapshot[]
} {
  return {
    creatorCategories:
      currentSnapshot?.creatorCategories ?? state.creatorAssetCategories,
    importedImages:
      currentSnapshot?.importedImages ??
      state.importedImageAssets.map(createImportedImageSnapshot),
  }
}

function createAssetLibraryRefreshPatch(
  state: EditorState,
  snapshot: AssetLibrarySnapshot,
  successMessage: string,
): EditorStatePatch {
  try {
    return {
      assetLibraryStatus: 'ready',
      assetLibraryBusy: false,
      assetLibraryMessage: successMessage,
      assetLibraryMessageKind: 'success',
      creatorAssetCategories: snapshot.creatorCategories,
      importedImageAssets: synchronizeRuntimeImportedImages(
        state.importedImageAssets,
        snapshot.importedImages,
      ),
    }
  } catch {
    return {
      assetLibraryStatus: 'ready',
      assetLibraryBusy: false,
      assetLibraryMessage:
        'The library change was saved, but its previews need a reload.',
      assetLibraryMessageKind: 'error',
      creatorAssetCategories: snapshot.creatorCategories,
    }
  }
}

function createAssetLibraryMutationFailurePatch(
  state: EditorState,
  result: PersistAssetLibraryResult,
  mutationError: string | undefined,
  fallbackMessage: string,
): EditorStatePatch {
  const message = mutationError ?? (result.ok ? fallbackMessage : result.message)

  return result.ok
    ? {
        ...createAssetLibraryRefreshPatch(state, result.snapshot, message),
        assetLibraryMessage: message,
        assetLibraryMessageKind: 'error',
      }
    : {
        assetLibraryBusy: false,
        assetLibraryMessage: message,
        assetLibraryMessageKind: 'error',
      }
}

function synchronizeRuntimeImportedImages(
  currentImages: readonly RuntimeImportedImage[],
  persistedImages: readonly ImportedImageSnapshot[],
): readonly RuntimeImportedImage[] {
  const currentById = new Map(currentImages.map((image) => [image.id, image]))
  const createdImages: RuntimeImportedImage[] = []

  try {
    const synchronized = persistedImages.map((snapshot) => {
      const current = currentById.get(snapshot.id)

      if (current && current.sourceBlob === snapshot.sourceBlob) {
        return {
          ...snapshot,
          sourceUrl: current.sourceUrl,
        }
      }

      const created = createRuntimeImportedImage(snapshot)
      createdImages.push(created)
      return created
    })
    const retainedSourceUrls = new Set(
      synchronized.map(({ sourceUrl }) => sourceUrl),
    )

    revokeRuntimeImportedImages(
      currentImages.filter(
        ({ sourceUrl }) => !retainedSourceUrls.has(sourceUrl),
      ),
    )
    return synchronized
  } catch (error) {
    revokeRuntimeImportedImages(createdImages)
    throw error
  }
}

function createCreatorCategoryId(state: EditorState): string {
  const existingIds = new Set(
    state.creatorAssetCategories.map(({ id }) => id),
  )
  let id: string

  do {
    const randomUUID = globalThis.crypto?.randomUUID
    const suffix = randomUUID
      ? randomUUID.call(globalThis.crypto)
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    id = `creator-category-${suffix}`
  } while (existingIds.has(id))

  return id
}

function getCenteredImageBounds(
  state: EditorState,
  intrinsicWidth: number,
  intrinsicHeight: number,
  logicalCenter?: LogicalPosition,
): ElementBounds | undefined {
  if (
    !Number.isFinite(intrinsicWidth) ||
    !Number.isFinite(intrinsicHeight) ||
    intrinsicWidth <= 0 ||
    intrinsicHeight <= 0
  ) {
    return undefined
  }

  const preferredScale = Math.min(
    1,
    (state.viewportLogicalWidth * DEFAULT_IMAGE_VIEWPORT_FRACTION) /
      intrinsicWidth,
    (state.viewportLogicalHeight * DEFAULT_IMAGE_VIEWPORT_FRACTION) /
      intrinsicHeight,
  )
  const minimumUsableScale = Math.max(
    MIN_ELEMENT_SIZE / intrinsicWidth,
    MIN_ELEMENT_SIZE / intrinsicHeight,
  )
  const maximumEpisodeScale = Math.min(
    state.episode.logicalWidth / intrinsicWidth,
    state.episode.logicalHeight / intrinsicHeight,
  )

  if (minimumUsableScale > maximumEpisodeScale) {
    return undefined
  }

  const scale = Math.min(
    Math.max(preferredScale, minimumUsableScale),
    maximumEpisodeScale,
  )
  const width = intrinsicWidth * scale
  const height = intrinsicHeight * scale
  const center = logicalCenter ?? {
    x: state.viewportX + state.viewportLogicalWidth / 2,
    y: state.viewportY + state.viewportLogicalHeight / 2,
  }

  if (!Number.isFinite(center.x) || !Number.isFinite(center.y)) {
    return undefined
  }

  const position = clampElementPosition(
    { x: center.x - width / 2, y: center.y - height / 2 },
    { width, height },
    state.episode.logicalWidth,
    state.episode.logicalHeight,
  )

  return {
    ...position,
    width,
    height,
  }
}

function placeImageAssetInEpisode(
  state: EditorState,
  asset: ResolvedImageAsset,
  assetReference: ImageAssetReference,
  logicalCenter?: LogicalPosition,
  layerPlaneId: string = state.activeLayerPlaneId,
): EpisodeDocument | undefined {
  const bounds = getCenteredImageBounds(
    state,
    asset.intrinsicWidth,
    asset.intrinsicHeight,
    logicalCenter,
  )

  if (!bounds) {
    return undefined
  }

  return createImageElementCommand(state.episode, {
    layerPlaneId,
    name: asset.displayName,
    assetReference,
    bounds,
  })
}

interface AssetPlacementTransition {
  readonly placed: boolean
  readonly nextState: EditorState | EditorStatePatch
}

function createAssetPlacementTransition(
  state: EditorState,
  assetReference: ImageAssetReference,
  logicalCenter?: LogicalPosition,
  targetLayerPlaneId: string = state.activeLayerPlaneId,
): AssetPlacementTransition {
  const activeLayerPlane = getLayerPlaneById(
    state.episode,
    targetLayerPlaneId,
  )

  if (activeLayerPlane?.kind !== 'ordinary') {
    return {
      placed: false,
      nextState: {
        assetLibraryMessage:
          'Select a numbered layer plane before placing an asset.',
        assetLibraryMessageKind: 'error',
      },
    }
  }

  if (
    logicalCenter &&
    (!Number.isFinite(logicalCenter.x) || !Number.isFinite(logicalCenter.y))
  ) {
    return {
      placed: false,
      nextState: {
        assetLibraryMessage: 'The canvas drop position is invalid.',
        assetLibraryMessageKind: 'error',
      },
    }
  }

  let asset: ResolvedImageAsset | undefined
  let missingSourceMessage: string
  let cannotFitMessage: string

  if (assetReference.kind === 'built-in') {
    const builtIn = BUILT_IN_ASSETS.find(
      (candidate) => candidate.id === assetReference.assetId,
    )

    asset = builtIn
      ? {
          id: builtIn.id,
          displayName: builtIn.displayName,
          intrinsicWidth: builtIn.intrinsicWidth,
          intrinsicHeight: builtIn.intrinsicHeight,
          sourceUrl: builtIn.source,
        }
      : undefined
    missingSourceMessage = 'That built-in asset is unavailable.'
    cannotFitMessage =
      'This asset cannot fit inside the episode at a usable size.'
  } else {
    asset = state.importedImageAssets.find(
      (candidate) => candidate.id === assetReference.assetId,
    )
    missingSourceMessage = 'That imported asset source is unavailable.'
    cannotFitMessage =
      'This image cannot fit inside the episode at a usable size.'
  }

  if (!asset) {
    return {
      placed: false,
      nextState: {
        assetLibraryMessage: missingSourceMessage,
        assetLibraryMessageKind: 'error',
      },
    }
  }

  const episode = placeImageAssetInEpisode(
    state,
    asset,
    assetReference,
    logicalCenter,
    targetLayerPlaneId,
  )

  if (!episode) {
    return {
      placed: false,
      nextState: {
        assetLibraryMessage: cannotFitMessage,
        assetLibraryMessageKind: 'error',
      },
    }
  }

  if (episode === state.episode) {
    return { placed: false, nextState: state }
  }

  const createdElement = episode.elements.at(-1)

  return {
    placed: true,
    nextState: commitEpisodeChange(state, episode, {
      selectedElementId: createdElement?.id ?? state.selectedElementId,
      activeCompositionGroup: activeLayerPlane.compositionGroup,
      activeLayerPlaneId: activeLayerPlane.id,
      liveElementBounds: null,
      assetLibraryMessage: `Placed “${asset.displayName}”.`,
      assetLibraryMessageKind: 'success',
    }),
  }
}

function createHistoryCheckpoint(state: EditorState): HistoryCheckpoint {
  return {
    episode: state.episode,
    selectedElementId: state.selectedElementId,
    selectedElementIds: [...state.selectedElementIds],
    activeCompositionGroup: state.activeCompositionGroup,
    activeLayerPlaneId: state.activeLayerPlaneId,
    revision: state.currentRevision,
  }
}

function getSelectionUnit(
  episode: EpisodeDocument,
  elementId: string,
): readonly string[] {
  const group = getElementGroupByMember(episode, elementId)
  const ids = group?.memberElementIds ?? [elementId]
  const existingIds = new Set(episode.elements.map(({ id }) => id))

  return [elementId, ...ids.filter((id) => id !== elementId)].filter(
    (id, index, allIds) => existingIds.has(id) && allIds.indexOf(id) === index,
  )
}

function getActionSelection(
  state: EditorState,
  elementId: string,
): readonly string[] {
  return state.selectedElementIds.includes(elementId)
    ? state.selectedElementIds
    : getSelectionUnit(state.episode, elementId)
}

function reconcileSelection(
  episode: EpisodeDocument,
  state: EditorState,
  patch: EditorStatePatch,
): Pick<EditorState, 'selectedElementId' | 'selectedElementIds'> {
  const hasPrimary = Object.prototype.hasOwnProperty.call(
    patch,
    'selectedElementId',
  )
  const hasSelection = Object.prototype.hasOwnProperty.call(
    patch,
    'selectedElementIds',
  )
  const requestedPrimary = hasPrimary
    ? (patch.selectedElementId ?? null)
    : state.selectedElementId
  const requestedIds = hasSelection
    ? (patch.selectedElementIds ?? [])
    : hasPrimary
      ? requestedPrimary
        ? [requestedPrimary]
        : []
      : state.selectedElementIds
  const existingIds = new Set(episode.elements.map(({ id }) => id))
  const selectedElementIds = [...new Set(requestedIds)].filter((id) =>
    existingIds.has(id),
  )
  const selectedElementId =
    requestedPrimary && selectedElementIds.includes(requestedPrimary)
      ? requestedPrimary
      : (selectedElementIds[0] ?? null)

  return { selectedElementId, selectedElementIds }
}

function isDirtyAtRevision(
  revision: number,
  savedRevision: number | null,
): boolean {
  return savedRevision === null || revision !== savedRevision
}

function appendHistoryCheckpoint(
  checkpoints: readonly HistoryCheckpoint[],
  checkpoint: HistoryCheckpoint,
): readonly HistoryCheckpoint[] {
  return [...checkpoints, checkpoint].slice(-HISTORY_LIMIT)
}

function commitEpisodeChange(
  state: EditorState,
  episode: EpisodeDocument,
  patch: EditorStatePatch = {},
): EditorState | EditorStatePatch {
  if (episode === state.episode) {
    return Object.keys(patch).length > 0 ? patch : state
  }

  const revision = state.nextRevision
  const selection = reconcileSelection(episode, state, patch)

  return {
    ...patch,
    ...selection,
    episode,
    historyPast: appendHistoryCheckpoint(
      state.historyPast,
      createHistoryCheckpoint(state),
    ),
    historyFuture: [],
    episodeHeightResizeStart: null,
    elementOpacityEditStart: null,
    currentRevision: revision,
    nextRevision: revision + 1,
    canUndo: true,
    canRedo: false,
    hasUnsavedChanges: isDirtyAtRevision(revision, state.savedRevision),
    documentStatus: 'Unsaved changes',
  }
}

function getDefaultEditorContext(episode: EpisodeDocument): {
  readonly activeCompositionGroup: CompositionGroup
  readonly activeLayerPlaneId: string
} {
  const contentPlane = getLayerPlanesForGroup(episode, 'content')[0]
  const fallbackPlane = episode.layerPlanes[0]
  const layerPlane = contentPlane ?? fallbackPlane

  return {
    activeCompositionGroup: layerPlane?.compositionGroup ?? 'content',
    activeLayerPlaneId: layerPlane?.id ?? '',
  }
}

function reconcileCheckpointContext(
  episode: EpisodeDocument,
  checkpoint: HistoryCheckpoint,
) {
  const selectedElement = checkpoint.selectedElementId
    ? episode.elements.find(({ id }) => id === checkpoint.selectedElementId)
    : undefined
  const selectedGroup = selectedElement
    ? getElementCompositionGroup(episode, selectedElement)
    : undefined

  if (selectedElement && selectedGroup) {
    const selectedElementIds = [...new Set(checkpoint.selectedElementIds)].filter(
      (id) => episode.elements.some((element) => element.id === id),
    )

    return {
      selectedElementId: selectedElement.id,
      selectedElementIds: selectedElementIds.includes(selectedElement.id)
        ? selectedElementIds
        : [selectedElement.id],
      activeCompositionGroup: selectedGroup,
      activeLayerPlaneId: selectedElement.layerPlaneId,
    }
  }

  const requestedPlane = getLayerPlaneById(
    episode,
    checkpoint.activeLayerPlaneId,
  )

  if (requestedPlane) {
    return {
      selectedElementId: null,
      selectedElementIds: [],
      activeCompositionGroup: requestedPlane.compositionGroup,
      activeLayerPlaneId: requestedPlane.id,
    }
  }

  const requestedGroupPlane = getLayerPlanesForGroup(
    episode,
    checkpoint.activeCompositionGroup,
  )[0]
  const fallback = getDefaultEditorContext(episode)

  return {
    selectedElementId: null,
    selectedElementIds: [],
    activeCompositionGroup:
      requestedGroupPlane?.compositionGroup ?? fallback.activeCompositionGroup,
    activeLayerPlaneId: requestedGroupPlane?.id ?? fallback.activeLayerPlaneId,
  }
}

function restoreHistoryCheckpoint(
  state: EditorState,
  checkpoint: HistoryCheckpoint,
): EditorStatePatch {
  const viewportDimensions = getViewportLogicalDimensions(
    checkpoint.episode,
    state.fitViewportLogicalHeight,
    state.zoomFactor,
  )
  const viewportPosition = clampViewportPosition(
    { x: state.viewportX, y: state.viewportY },
    getEpisodeLogicalDimensions(checkpoint.episode),
    viewportDimensions,
  )

  return {
    episode: checkpoint.episode,
    ...reconcileCheckpointContext(checkpoint.episode, checkpoint),
    liveElementBounds: null,
    episodeHeightResizeStart: null,
    elementOpacityEditStart: null,
    currentRevision: checkpoint.revision,
    hasUnsavedChanges: isDirtyAtRevision(
      checkpoint.revision,
      state.savedRevision,
    ),
    viewportX: viewportPosition.x,
    viewportY: viewportPosition.y,
    viewportLogicalWidth: viewportDimensions.width,
    viewportLogicalHeight: viewportDimensions.height,
  }
}

function createEpisodeId(): string {
  const randomUUID = globalThis.crypto?.randomUUID

  return randomUUID
    ? randomUUID.call(globalThis.crypto)
    : `episode-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function getProjectRepository() {
  return createLocalStorageProjectRepository(getBrowserLocalStorage())
}

function getProjectLibraryRepository() {
  return createLocalStorageProjectLibraryRepository(getBrowserLocalStorage())
}

function getRecoveryStorage(): RecoveryStorageLike | undefined {
  const storage = getBrowserLocalStorage()

  return storage &&
    typeof (storage as Partial<RecoveryStorageLike>).removeItem === 'function'
    ? (storage as RecoveryStorageLike)
    : undefined
}

let recoveryRepositoryStorage: RecoveryStorageLike | undefined
let recoveryRepository: DebouncedRecoveryRepository | undefined

function getRecoveryRepository(): DebouncedRecoveryRepository {
  const storage = getRecoveryStorage()

  if (!recoveryRepository || storage !== recoveryRepositoryStorage) {
    recoveryRepository?.dispose()
    recoveryRepositoryStorage = storage
    recoveryRepository = createDebouncedLocalStorageRecoveryRepository(storage)
  }

  return recoveryRepository
}

function clearRecoverySnapshot(): void {
  getRecoveryRepository().clear()
}

function loadInitialProjectState(): {
  readonly episode: EpisodeDocument
  readonly currentProjectId: string | null
  readonly recentProjects: readonly LocalProjectSummary[]
  readonly documentStatus: string
  readonly hasSavedEpisode: boolean
} {
  const projectLibrary = getProjectLibraryRepository()
  const migration = projectLibrary.importLegacyLast()
  const listed = projectLibrary.listRecent()

  if (listed.ok) {
    const projectId =
      migration.ok && migration.status === 'imported'
        ? migration.projectId
        : listed.projects[0]?.projectId
    const loaded = projectId ? projectLibrary.load(projectId) : undefined

    if (loaded?.ok) {
      return {
        episode: loaded.project.episode,
        currentProjectId: loaded.project.projectId,
        recentProjects: listed.projects,
        documentStatus: 'Opened saved episode',
        hasSavedEpisode: true,
      }
    }

    if (!loaded) {
      return {
        episode: buildWeekEpisode,
        currentProjectId: null,
        recentProjects: listed.projects,
        documentStatus: 'Demo ready · not saved',
        hasSavedEpisode: listed.projects.length > 0,
      }
    }
  }

  const legacy = getProjectRepository().loadLast()

  if (legacy.ok) {
    return {
      episode: legacy.episode,
      currentProjectId: null,
      recentProjects: listed.ok ? listed.projects : [],
      documentStatus: 'Opened legacy saved episode',
      hasSavedEpisode: true,
    }
  }

  const failureMessage = !listed.ok
    ? listed.message
    : !migration.ok
      ? migration.message
      : legacy.reason !== 'not-found' && legacy.reason !== 'storage-unavailable'
        ? legacy.message
        : null

  return {
    episode: buildWeekEpisode,
    currentProjectId: null,
    recentProjects: listed.ok ? listed.projects : [],
    documentStatus: failureMessage
      ? `${failureMessage} Demo loaded instead.`
      : 'Demo ready · not saved',
    hasSavedEpisode: false,
  }
}

const initialProjectState = loadInitialProjectState()
const initialEpisode = initialProjectState.episode
const initialEditorContext = getDefaultEditorContext(initialEpisode)
const initialRecoveryResult = getRecoveryRepository().load()
const initialRecovery = initialRecoveryResult.ok
  ? initialRecoveryResult.recovery
  : null
const initialRecoveryMessage =
  !initialRecoveryResult.ok &&
  initialRecoveryResult.reason !== 'not-found' &&
  initialRecoveryResult.reason !== 'storage-unavailable'
    ? initialRecoveryResult.message
    : null

function createLoadedEpisodePatch(
  state: EditorState,
  episode: EpisodeDocument,
  input: {
    readonly currentProjectId: string | null
    readonly saved: boolean
    readonly documentStatus: string
  },
): EditorStatePatch {
  const context = getDefaultEditorContext(episode)
  const viewportDimensions = getViewportLogicalDimensions(
    episode,
    state.fitViewportLogicalHeight,
    DEFAULT_ZOOM_FACTOR,
  )
  const revision = state.nextRevision

  return {
    episode,
    historyPast: [],
    historyFuture: [],
    episodeHeightResizeStart: null,
    elementOpacityEditStart: null,
    currentRevision: revision,
    nextRevision: revision + 1,
    savedRevision: input.saved ? revision : null,
    canUndo: false,
    canRedo: false,
    hasUnsavedChanges: !input.saved,
    currentProjectId: input.currentProjectId,
    documentStatus: input.documentStatus,
    selectedElementId: null,
    selectedElementIds: [],
    liveElementBounds: null,
    ...context,
    viewportX: 0,
    viewportY: 0,
    viewportLogicalWidth: viewportDimensions.width,
    viewportLogicalHeight: viewportDimensions.height,
    zoomFactor: DEFAULT_ZOOM_FACTOR,
    assetPanelOpen: false,
    magnetEnabled: true,
    sliceGuidesVisible: true,
  }
}

function getViewportLogicalDimensions(
  episode: EpisodeDocument,
  fitViewportLogicalHeight: number,
  zoomFactor: number,
) {
  return {
    width: Math.min(episode.logicalWidth / zoomFactor, episode.logicalWidth),
    height: Math.min(
      fitViewportLogicalHeight / zoomFactor,
      episode.logicalHeight,
    ),
  }
}

function getEpisodeLogicalDimensions(episode: EpisodeDocument) {
  return { width: episode.logicalWidth, height: episode.logicalHeight }
}

function getLogicalViewport(state: EditorState): LogicalViewport {
  return {
    x: state.viewportX,
    y: state.viewportY,
    width: state.viewportLogicalWidth,
    height: state.viewportLogicalHeight,
  }
}

export const useEditorStore = create<EditorState>((set, get) => ({
  episode: initialEpisode,
  historyPast: [],
  historyFuture: [],
  episodeHeightResizeStart: null,
  elementOpacityEditStart: null,
  currentRevision: 0,
  nextRevision: 1,
  savedRevision: 0,
  canUndo: false,
  canRedo: false,
  hasUnsavedChanges: false,
  hasSavedEpisode: initialProjectState.hasSavedEpisode,
  currentProjectId: initialProjectState.currentProjectId,
  reopenProjectId: initialProjectState.currentProjectId,
  recentProjects: initialProjectState.recentProjects,
  projectLibraryBusy: false,
  recoveryAvailable: initialRecovery,
  recoveryMessage: initialRecoveryMessage,
  documentStatus: initialProjectState.documentStatus,
  selectedElementId: null,
  selectedElementIds: [],
  liveElementBounds: null,
  activeCompositionGroup: initialEditorContext.activeCompositionGroup,
  activeLayerPlaneId: initialEditorContext.activeLayerPlaneId,
  viewportX: 0,
  viewportY: 0,
  viewportLogicalWidth: initialEpisode.logicalWidth,
  viewportLogicalHeight: Math.min(
    INITIAL_VIEWPORT_LOGICAL_HEIGHT,
    initialEpisode.logicalHeight,
  ),
  fitViewportLogicalHeight: INITIAL_VIEWPORT_LOGICAL_HEIGHT,
  zoomFactor: DEFAULT_ZOOM_FACTOR,
  assetPanelOpen: false,
  assetLibraryStatus: 'idle',
  assetLibraryBusy: false,
  assetLibraryMessage: null,
  assetLibraryMessageKind: 'info',
  creatorAssetCategories: [],
  importedImageAssets: [],
  magnetEnabled: true,
  sliceGuidesVisible: true,

  setActiveCompositionGroup: (group) => {
    set((state) => {
      if (group === state.activeCompositionGroup) {
        return state
      }

      const firstLayerPlane = getLayerPlanesForGroup(state.episode, group)[0]

      return {
        activeCompositionGroup: group,
        activeLayerPlaneId: firstLayerPlane?.id ?? state.activeLayerPlaneId,
        selectedElementId: null,
        selectedElementIds: [],
        liveElementBounds: null,
      }
    })
  },

  setActiveLayerPlane: (layerPlaneId) => {
    set((state) => {
      const layerPlane = getLayerPlaneById(state.episode, layerPlaneId)

      if (
        !layerPlane ||
        layerPlane.compositionGroup !== state.activeCompositionGroup ||
        layerPlane.id === state.activeLayerPlaneId
      ) {
        return state
      }

      const selectedElement = state.episode.elements.find(
        ({ id }) => id === state.selectedElementId,
      )

      return {
        activeLayerPlaneId: layerPlane.id,
        selectedElementId:
          selectedElement?.layerPlaneId === layerPlane.id
            ? selectedElement.id
            : null,
        selectedElementIds:
          selectedElement?.layerPlaneId === layerPlane.id
            ? state.selectedElementIds
            : [],
        liveElementBounds: null,
      }
    })
  },

  createLayerPlane: () => {
    set((state) => {
      const episode = createLayerPlaneCommand(
        state.episode,
        state.activeCompositionGroup,
      )
      const layerPlanes = getLayerPlanesForGroup(
        episode,
        state.activeCompositionGroup,
      )
      const createdLayerPlane = layerPlanes[layerPlanes.length - 1]

      return commitEpisodeChange(state, episode, {
        activeLayerPlaneId:
          createdLayerPlane?.id ?? state.activeLayerPlaneId,
        selectedElementId: null,
        liveElementBounds: null,
      })
    })
  },

  deleteLayerPlane: (layerPlaneId, disposition) => {
    set((state) => {
      const layerPlane = getLayerPlaneById(state.episode, layerPlaneId)
      if (!layerPlane) {
        return state
      }

      const groupLayerPlanes = getLayerPlanesForGroup(
        state.episode,
        layerPlane.compositionGroup,
      )
      const deletedIndex = groupLayerPlanes.findIndex(
        ({ id }) => id === layerPlaneId,
      )
      const elementsOnPlane = state.episode.elements.filter(
        (element) => element.layerPlaneId === layerPlaneId,
      )
      const episode =
        elementsOnPlane.length === 0
          ? deleteEmptyLayerPlaneCommand(state.episode, layerPlaneId)
          : disposition
            ? deleteLayerPlaneWithDisposition(
                state.episode,
                layerPlaneId,
                disposition,
              )
            : state.episode

      if (episode === state.episode || deletedIndex < 0) {
        return state
      }

      const previousLayerPlane = groupLayerPlanes[deletedIndex - 1]
      const nextLayerPlane = groupLayerPlanes[deletedIndex + 1]
      const survivorId =
        disposition?.kind === 'move-elements'
          ? disposition.targetLayerPlaneId
          : (previousLayerPlane?.id ?? nextLayerPlane?.id)
      const survivor = survivorId
        ? getLayerPlaneById(episode, survivorId)
        : undefined

      if (!survivor) {
        return state
      }

      return commitEpisodeChange(state, episode, {
        activeCompositionGroup: layerPlane.compositionGroup,
        activeLayerPlaneId: survivor.id,
        ...(elementsOnPlane.length === 0
          ? { selectedElementId: null, selectedElementIds: [] }
          : {}),
        liveElementBounds: null,
      })
    })
  },

  setLayerPlaneName: (layerPlaneId, name) => {
    set((state) =>
      commitEpisodeChange(
        state,
        setLayerPlaneNameCommand(state.episode, layerPlaneId, name),
      ),
    )
  },

  reorderLayerPlane: (layerPlaneId, targetIndex) => {
    set((state) =>
      commitEpisodeChange(
        state,
        reorderLayerPlaneCommand(
          state.episode,
          layerPlaneId,
          targetIndex,
        ),
      ),
    )
  },

  setEpisodeName: (name) => {
    set((state) => {
      const episode = setEpisodeNameCommand(state.episode, name)
      return commitEpisodeChange(state, episode)
    })
  },

  extendEpisodeHeight: () => {
    set((state) => {
      const episode = extendEpisodeHeightCommand(
        state.episode,
        DEFAULT_EPISODE_HEIGHT_INCREMENT,
      )

      if (episode === state.episode) {
        return state
      }

      const viewportDimensions = getViewportLogicalDimensions(
        episode,
        state.fitViewportLogicalHeight,
        state.zoomFactor,
      )

      return commitEpisodeChange(state, episode, {
        viewportLogicalWidth: viewportDimensions.width,
        viewportLogicalHeight: viewportDimensions.height,
      })
    })
  },

  resizeEpisodeHeight: (logicalHeight, pinViewportToEnd = false) => {
    set((state) => {
      const episode = resizeEpisodeHeightCommand(state.episode, logicalHeight)

      if (episode === state.episode) {
        return state
      }

      const viewportDimensions = getViewportLogicalDimensions(
        episode,
        state.fitViewportLogicalHeight,
        state.zoomFactor,
      )
      const viewportPosition = pinViewportToEnd
        ? clampViewportPosition(
            {
              x: state.viewportX,
              y: episode.logicalHeight - viewportDimensions.height,
            },
            getEpisodeLogicalDimensions(episode),
            viewportDimensions,
          )
        : clampViewportPosition(
            { x: state.viewportX, y: state.viewportY },
            getEpisodeLogicalDimensions(episode),
            viewportDimensions,
          )

      const patch = {
        viewportX: viewportPosition.x,
        viewportY: viewportPosition.y,
        viewportLogicalWidth: viewportDimensions.width,
        viewportLogicalHeight: viewportDimensions.height,
      }

      if (state.episodeHeightResizeStart) {
        return {
          ...patch,
          episode,
          hasUnsavedChanges: true,
          documentStatus: 'Unsaved changes',
        }
      }

      return commitEpisodeChange(state, episode, patch)
    })
  },

  beginEpisodeHeightResize: () => {
    set((state) =>
      state.episodeHeightResizeStart
        ? state
        : { episodeHeightResizeStart: createHistoryCheckpoint(state) },
    )
  },

  endEpisodeHeightResize: () => {
    set((state) => {
      const start = state.episodeHeightResizeStart

      if (!start) {
        return state
      }

      if (start.episode.logicalHeight === state.episode.logicalHeight) {
        const restored = restoreHistoryCheckpoint(state, start)

        return {
          ...restored,
          episodeHeightResizeStart: null,
          historyPast: state.historyPast,
          historyFuture: state.historyFuture,
          canUndo: state.historyPast.length > 0,
          canRedo: state.historyFuture.length > 0,
          documentStatus: restored.hasUnsavedChanges
            ? 'Unsaved changes'
            : state.hasSavedEpisode
              ? 'Saved locally'
              : 'Demo ready · not saved',
        }
      }

      const revision = state.nextRevision

      return {
        episodeHeightResizeStart: null,
        historyPast: appendHistoryCheckpoint(state.historyPast, start),
        historyFuture: [],
        currentRevision: revision,
        nextRevision: revision + 1,
        canUndo: true,
        canRedo: false,
        hasUnsavedChanges: isDirtyAtRevision(revision, state.savedRevision),
        documentStatus: 'Unsaved changes',
      }
    })
  },

  cancelEpisodeHeightResize: () => {
    set((state) => {
      const start = state.episodeHeightResizeStart

      if (!start) {
        return state
      }

      const restored = restoreHistoryCheckpoint(state, start)

      return {
        ...restored,
        historyPast: state.historyPast,
        historyFuture: state.historyFuture,
        canUndo: state.historyPast.length > 0,
        canRedo: state.historyFuture.length > 0,
        documentStatus: restored.hasUnsavedChanges
          ? 'Unsaved changes'
          : state.hasSavedEpisode
            ? 'Saved locally'
            : 'Demo ready · not saved',
      }
    })
  },

  setFitViewportLogicalHeight: (logicalHeight) => {
    set((state) => {
      if (!Number.isFinite(logicalHeight) || logicalHeight <= 0) {
        return state
      }

      const viewportDimensions = getViewportLogicalDimensions(
        state.episode,
        logicalHeight,
        state.zoomFactor,
      )
      const viewportPosition = clampViewportPosition(
        { x: state.viewportX, y: state.viewportY },
        getEpisodeLogicalDimensions(state.episode),
        viewportDimensions,
      )

      return {
        fitViewportLogicalHeight: logicalHeight,
        viewportX: viewportPosition.x,
        viewportY: viewportPosition.y,
        viewportLogicalWidth: viewportDimensions.width,
        viewportLogicalHeight: viewportDimensions.height,
      }
    })
  },

  setZoomFactor: (requestedZoomFactor) => {
    set((state) => {
      const zoomFactor = clampZoomFactor(requestedZoomFactor)

      if (zoomFactor === state.zoomFactor) {
        return state
      }

      const viewportDimensions = getViewportLogicalDimensions(
        state.episode,
        state.fitViewportLogicalHeight,
        zoomFactor,
      )
      const viewportPosition = preserveViewportCenter(
        getLogicalViewport(state),
        viewportDimensions,
        getEpisodeLogicalDimensions(state.episode),
      )

      return {
        zoomFactor,
        viewportX: viewportPosition.x,
        viewportY: viewportPosition.y,
        viewportLogicalWidth: viewportDimensions.width,
        viewportLogicalHeight: viewportDimensions.height,
      }
    })
  },

  setViewportPosition: (position) => {
    set((state) => {
      const viewportPosition = clampViewportPosition(
        position,
        getEpisodeLogicalDimensions(state.episode),
        {
          width: state.viewportLogicalWidth,
          height: state.viewportLogicalHeight,
        },
      )

      return {
        viewportX: viewportPosition.x,
        viewportY: viewportPosition.y,
      }
    })
  },

  setViewportY: (logicalY) => {
    set((state) => {
      const viewportPosition = clampViewportPosition(
        { x: state.viewportX, y: logicalY },
        getEpisodeLogicalDimensions(state.episode),
        {
          width: state.viewportLogicalWidth,
          height: state.viewportLogicalHeight,
        },
      )

      return { viewportY: viewportPosition.y }
    })
  },

  panViewport: (logicalDelta) => {
    set((state) => {
      const viewportPosition = clampViewportPosition(
        {
          x: state.viewportX + logicalDelta.x,
          y: state.viewportY + logicalDelta.y,
        },
        getEpisodeLogicalDimensions(state.episode),
        {
          width: state.viewportLogicalWidth,
          height: state.viewportLogicalHeight,
        },
      )

      return {
        viewportX: viewportPosition.x,
        viewportY: viewportPosition.y,
      }
    })
  },

  selectElement: (elementId, reveal = false, toggle = false) => {
    set((state) => {
      if (!elementId) {
        return {
          selectedElementId: null,
          selectedElementIds: [],
          liveElementBounds: null,
        }
      }

      const element = state.episode.elements.find(({ id }) => id === elementId)
      const compositionGroup = element
        ? getElementCompositionGroup(state.episode, element)
        : undefined

      if (!element || !compositionGroup) {
        return {
          selectedElementId: null,
          selectedElementIds: [],
          liveElementBounds: null,
        }
      }

      const selectionUnit = getSelectionUnit(state.episode, element.id)
      const selectedIds = new Set(state.selectedElementIds)
      const removeUnit =
        toggle && selectionUnit.every((id) => selectedIds.has(id))
      const selectedElementIds = toggle
        ? removeUnit
          ? state.selectedElementIds.filter((id) => !selectionUnit.includes(id))
          : [
              ...state.selectedElementIds,
              ...selectionUnit.filter((id) => !selectedIds.has(id)),
            ]
        : selectionUnit
      const selectedElementId = removeUnit
        ? state.selectedElementId &&
          selectedElementIds.includes(state.selectedElementId)
          ? state.selectedElementId
          : (selectedElementIds[0] ?? null)
        : element.id

      const viewport = getLogicalViewport(state)
      const isVisible = boundsIntersectViewport(element.bounds, viewport)
      const revealedPosition = reveal
        ? revealBoundsInViewport(
            element.bounds,
            viewport,
            getEpisodeLogicalDimensions(state.episode),
          )
        : { x: state.viewportX, y: state.viewportY }

      return {
        selectedElementId,
        selectedElementIds,
        liveElementBounds: null,
        activeCompositionGroup: compositionGroup,
        activeLayerPlaneId: element.layerPlaneId,
        viewportX: reveal && !isVisible ? revealedPosition.x : state.viewportX,
        viewportY: reveal && !isVisible ? revealedPosition.y : state.viewportY,
      }
    })
  },

  selectAllInActivePlane: () => {
    set((state) => {
      const activePlaneElementIds = state.episode.elements
        .filter(({ layerPlaneId }) => layerPlaneId === state.activeLayerPlaneId)
        .map(({ id }) => id)
      const selectedElementIds = [
        ...new Set(
          activePlaneElementIds.flatMap((id) =>
            getSelectionUnit(state.episode, id),
          ),
        ),
      ]

      return {
        selectedElementIds,
        selectedElementId:
          state.selectedElementId &&
          selectedElementIds.includes(state.selectedElementId)
            ? state.selectedElementId
            : (selectedElementIds[0] ?? null),
        liveElementBounds: null,
      }
    })
  },

  groupSelectedElements: () => {
    const state = get()
    const episode = groupElementsCommand(
      state.episode,
      state.selectedElementIds,
    )

    if (episode === state.episode) return false
    set(commitEpisodeChange(state, episode))
    return true
  },

  ungroupSelectedElements: () => {
    const state = get()
    const group = state.selectedElementId
      ? getElementGroupByMember(state.episode, state.selectedElementId)
      : undefined

    if (!group) return false
    const episode = ungroupElementsCommand(state.episode, group.id)
    if (episode === state.episode) return false
    set(commitEpisodeChange(state, episode))
    return true
  },

  moveSelectedStoryBeat: (direction) => {
    const state = get()
    const episode = moveElementSelectionCommand(
      state.episode,
      state.selectedElementIds,
      { x: 0, y: direction === 'up' ? -STORY_BEAT_STEP : STORY_BEAT_STEP },
    )

    if (episode === state.episode) return false
    set(commitEpisodeChange(state, episode, { liveElementBounds: null }))
    return true
  },

  setElementVisibility: (elementId, visible) => {
    set((state) =>
      commitEpisodeChange(
        state,
        setElementVisibilityCommand(
          state.episode,
          elementId,
          visible,
        ),
      ),
    )
  },

  setLayerPlaneVisibility: (layerPlaneId, visible) => {
    set((state) =>
      commitEpisodeChange(
        state,
        setLayerPlaneVisibilityCommand(
          state.episode,
          layerPlaneId,
          visible,
        ),
      ),
    )
  },

  setCompositionGroupVisibility: (group, visible) => {
    set((state) =>
      commitEpisodeChange(
        state,
        setCompositionGroupVisibilityCommand(
          state.episode,
          group,
          visible,
        ),
      ),
    )
  },

  setBaseColor: (color) => {
    set((state) =>
      commitEpisodeChange(
        state,
        setBaseColorCommand(state.episode, color),
      ),
    )
  },

  setElementName: (elementId, name) => {
    set((state) =>
      commitEpisodeChange(
        state,
        setElementNameCommand(state.episode, elementId, name),
      ),
    )
  },

  setElementLocked: (elementId, locked) => {
    set((state) => {
      const selectedIds = getActionSelection(state, elementId)
      const episode = setElementSelectionLockedCommand(
        state.episode,
        selectedIds,
        locked,
      )

      if (episode === state.episode) {
        return state
      }

      return commitEpisodeChange(state, episode, {
        liveElementBounds:
          state.liveElementBounds?.elementId === elementId
            ? null
            : state.liveElementBounds,
      })
    })
  },

  toggleElementLocked: (elementId) => {
    set((state) => {
      const element = state.episode.elements.find(({ id }) => id === elementId)
      if (!element) return state
      const selectedIds = getActionSelection(state, elementId)
      const episode = setElementSelectionLockedCommand(
        state.episode,
        selectedIds,
        !element.locked,
      )

      if (episode === state.episode) {
        return state
      }

      return commitEpisodeChange(state, episode, {
        liveElementBounds:
          state.liveElementBounds?.elementId === elementId
            ? null
            : state.liveElementBounds,
      })
    })
  },

  deleteElement: (elementId) => {
    set((state) => {
      const selectedIds = getActionSelection(state, elementId)
      const episode = deleteElementSelectionCommand(
        state.episode,
        selectedIds,
      )

      if (episode === state.episode) {
        return state
      }

      return commitEpisodeChange(state, episode, {
        selectedElementId: selectedIds.includes(state.selectedElementId ?? '')
          ? null
          : state.selectedElementId,
        selectedElementIds: state.selectedElementIds.filter(
          (id) => !selectedIds.includes(id),
        ),
        liveElementBounds:
          state.liveElementBounds?.elementId === elementId
            ? null
            : state.liveElementBounds,
      })
    })
  },

  duplicateElement: (elementId, offset) => {
    const state = get()
    const selectedIds = getActionSelection(state, elementId)
    const existingIds = new Set(state.episode.elements.map(({ id }) => id))
    const episode = duplicateElementSelectionCommand(
      state.episode,
      selectedIds,
      offset,
    )

    if (episode === state.episode) {
      return false
    }

    const createdElements = episode.elements.filter(({ id }) => !existingIds.has(id))
    const createdElement = createdElements[0]
    const compositionGroup = createdElement
      ? getElementCompositionGroup(episode, createdElement)
      : undefined

    set(
      commitEpisodeChange(state, episode, {
        selectedElementId: createdElement?.id ?? state.selectedElementId,
        selectedElementIds: createdElements.map(({ id }) => id),
        activeCompositionGroup:
          compositionGroup ?? state.activeCompositionGroup,
        activeLayerPlaneId:
          createdElement?.layerPlaneId ?? state.activeLayerPlaneId,
        liveElementBounds: null,
      }),
    )
    return true
  },

  nudgeSelectedElement: (delta) => {
    const state = get()

    if (state.selectedElementIds.length === 0) {
      return false
    }

    const episode = moveElementSelectionCommand(
      state.episode,
      state.selectedElementIds,
      delta,
    )

    if (episode === state.episode) {
      return false
    }

    set(
      commitEpisodeChange(state, episode, {
        liveElementBounds: null,
      }),
    )
    return true
  },

  alignSelectedElement: (alignment) => {
    const state = get()

    if (!state.selectedElementId) {
      return false
    }

    const episode = alignElementCommand(
      state.episode,
      state.selectedElementId,
      alignment,
    )

    if (episode === state.episode) {
      return false
    }

    set(
      commitEpisodeChange(state, episode, {
        liveElementBounds: null,
      }),
    )
    return true
  },

  moveElementInStack: (elementId, direction) => {
    set((state) =>
      commitEpisodeChange(
        state,
        moveElementInStackCommand(state.episode, elementId, direction),
      ),
    )
  },

  moveElementToLayerPlane: (elementId, layerPlaneId) => {
    set((state) => {
      const targetLayerPlane = getLayerPlaneById(
        state.episode,
        layerPlaneId,
      )
      const selectedIds = getActionSelection(state, elementId)
      const episode = moveElementSelectionToLayerPlaneCommand(
        state.episode,
        selectedIds,
        layerPlaneId,
      )

      if (
        episode === state.episode ||
        !targetLayerPlane ||
        targetLayerPlane.kind !== 'ordinary'
      ) {
        return state
      }

      return commitEpisodeChange(state, episode, {
        activeCompositionGroup: targetLayerPlane.compositionGroup,
        activeLayerPlaneId: targetLayerPlane.id,
        selectedElementId: elementId,
        selectedElementIds: selectedIds,
        liveElementBounds: null,
      })
    })
  },

  placeSyntheticAsset: ({
    name,
    shape,
    fill,
    stroke,
    strokeWidth,
    cornerRadius,
  }) => {
    set((state) => {
      const width = 150
      const height = 110
      const episode = createSyntheticShapeElementCommand(state.episode, {
        layerPlaneId: state.activeLayerPlaneId,
        name,
        shape,
        fill,
        stroke,
        strokeWidth,
        cornerRadius,
        bounds: {
          x: state.viewportX + (state.viewportLogicalWidth - width) / 2,
          y: state.viewportY + (state.viewportLogicalHeight - height) / 2,
          width,
          height,
        },
      })

      if (episode === state.episode) {
        return state
      }

      const createdElement = episode.elements.at(-1)

      return commitEpisodeChange(state, episode, {
        selectedElementId: createdElement?.id ?? state.selectedElementId,
        liveElementBounds: null,
      })
    })
  },

  createTextElement: () => {
    const state = get()
    const width = Math.min(520, state.episode.logicalWidth)
    const height = 96
    const episode = createTextElementCommand(state.episode, {
      layerPlaneId: state.activeLayerPlaneId,
      text: 'Your text',
      fill: '#1b1630',
      bounds: {
        x: state.viewportX + (state.viewportLogicalWidth - width) / 2,
        y: state.viewportY + (state.viewportLogicalHeight - height) / 2,
        width,
        height,
      },
    })

    if (episode === state.episode) {
      return false
    }

    const createdElement = episode.elements.at(-1)
    set(
      commitEpisodeChange(state, episode, {
        selectedElementId: createdElement?.id ?? state.selectedElementId,
        liveElementBounds: null,
      }),
    )
    return true
  },

  createSpeechBalloonElement: () => {
    const state = get()
    const width = Math.min(340, state.episode.logicalWidth - 48)
    const height = 176
    const preferredY =
      state.viewportY + (state.viewportLogicalHeight - height) / 2
    const episode = createSpeechBalloonElementCommand(state.episode, {
      layerPlaneId: state.activeLayerPlaneId,
      text: 'Your dialogue',
      bounds: {
        x: state.viewportX + (state.viewportLogicalWidth - width) / 2,
        y: Math.min(
          preferredY,
          state.episode.logicalHeight - height * 1.28,
        ),
        width,
        height,
      },
    })

    if (episode === state.episode) return false

    const createdElement = episode.elements.at(-1)
    set(
      commitEpisodeChange(state, episode, {
        selectedElementId: createdElement?.id ?? state.selectedElementId,
        selectedElementIds: createdElement ? [createdElement.id] : [],
        liveElementBounds: null,
      }),
    )
    return true
  },

  createBackgroundColorRegion: ({ fill, startY, height }) => {
    const state = get()
    const episode = createBackgroundColorRegionCommand(state.episode, {
      layerPlaneId: state.activeLayerPlaneId,
      fill,
      startY,
      height,
    })

    if (episode === state.episode) {
      return false
    }

    const createdElement = episode.elements.at(-1)
    set(
      commitEpisodeChange(state, episode, {
        selectedElementId: createdElement?.id ?? state.selectedElementId,
        liveElementBounds: null,
      }),
    )

    return true
  },

  moveElement: (elementId, logicalPosition) => {
    set((state) => {
      const element = state.episode.elements.find(({ id }) => id === elementId)
      if (!element) return state
      const selectedIds = getActionSelection(state, elementId)
      const episode = moveElementSelectionCommand(
        state.episode,
        selectedIds,
        {
          x: logicalPosition.x - element.bounds.x,
          y: logicalPosition.y - element.bounds.y,
        },
      )

      return commitEpisodeChange(
        state,
        episode,
        {
          liveElementBounds:
            state.liveElementBounds?.elementId === elementId
              ? null
              : state.liveElementBounds,
        },
      )
    })
  },

  resizeElement: (elementId, logicalBounds) => {
    set((state) =>
      commitEpisodeChange(
        state,
        resizeElementCommand(state.episode, elementId, logicalBounds),
        {
          liveElementBounds:
            state.liveElementBounds?.elementId === elementId
              ? null
              : state.liveElementBounds,
        },
      ),
    )
  },

  previewElementBounds: (elementId, logicalBounds) => {
    set((state) => {
      const element = state.episode.elements.find(({ id }) => id === elementId)
      const currentPreview = state.liveElementBounds
      const hasFinitePositiveBounds =
        Number.isFinite(logicalBounds.x) &&
        Number.isFinite(logicalBounds.y) &&
        Number.isFinite(logicalBounds.width) &&
        Number.isFinite(logicalBounds.height) &&
        logicalBounds.width > 0 &&
        logicalBounds.height > 0

      if (
        !element ||
        element.locked ||
        state.selectedElementId !== elementId ||
        !hasFinitePositiveBounds
      ) {
        return state
      }

      if (
        currentPreview?.elementId === elementId &&
        currentPreview.bounds.x === logicalBounds.x &&
        currentPreview.bounds.y === logicalBounds.y &&
        currentPreview.bounds.width === logicalBounds.width &&
        currentPreview.bounds.height === logicalBounds.height
      ) {
        return state
      }

      return {
        liveElementBounds: {
          elementId,
          bounds: { ...logicalBounds },
        },
      }
    })
  },

  clearElementBoundsPreview: (elementId) => {
    set((state) => {
      if (
        !state.liveElementBounds ||
        (elementId && state.liveElementBounds.elementId !== elementId)
      ) {
        return state
      }

      return { liveElementBounds: null }
    })
  },

  setElementOpacity: (elementId, opacity) => {
    set((state) => {
      if (state.elementOpacityEditStart) {
        return state
      }

      return commitEpisodeChange(
        state,
        setElementOpacityCommand(state.episode, elementId, opacity),
      )
    })
  },

  beginElementOpacityEdit: (elementId) => {
    set((state) => {
      const element = state.episode.elements.find(({ id }) => id === elementId)

      if (
        !element ||
        state.selectedElementId !== elementId ||
        state.elementOpacityEditStart ||
        state.episodeHeightResizeStart
      ) {
        return state
      }

      return {
        elementOpacityEditStart: {
          elementId,
          checkpoint: createHistoryCheckpoint(state),
        },
      }
    })
  },

  previewElementOpacity: (elementId, opacity) => {
    set((state) => {
      const start = state.elementOpacityEditStart

      if (!start || start.elementId !== elementId) {
        return state
      }

      const episode = setElementOpacityCommand(state.episode, elementId, opacity)

      return episode === state.episode
        ? state
        : {
            episode,
            hasUnsavedChanges: true,
            documentStatus: 'Unsaved changes',
          }
    })
  },

  endElementOpacityEdit: () => {
    set((state) => {
      const start = state.elementOpacityEditStart

      if (!start) {
        return state
      }

      const startingOpacity = start.checkpoint.episode.elements.find(
        ({ id }) => id === start.elementId,
      )?.opacity
      const endingOpacity = state.episode.elements.find(
        ({ id }) => id === start.elementId,
      )?.opacity

      if (
        startingOpacity === undefined ||
        endingOpacity === undefined ||
        startingOpacity === endingOpacity
      ) {
        const restored = restoreHistoryCheckpoint(state, start.checkpoint)

        return {
          ...restored,
          historyPast: state.historyPast,
          historyFuture: state.historyFuture,
          canUndo: state.historyPast.length > 0,
          canRedo: state.historyFuture.length > 0,
          documentStatus: restored.hasUnsavedChanges
            ? 'Unsaved changes'
            : state.hasSavedEpisode
              ? 'Saved locally'
              : 'Demo ready · not saved',
        }
      }

      const revision = state.nextRevision

      return {
        elementOpacityEditStart: null,
        historyPast: appendHistoryCheckpoint(
          state.historyPast,
          start.checkpoint,
        ),
        historyFuture: [],
        currentRevision: revision,
        nextRevision: revision + 1,
        canUndo: true,
        canRedo: false,
        hasUnsavedChanges: isDirtyAtRevision(revision, state.savedRevision),
        documentStatus: 'Unsaved changes',
      }
    })
  },

  cancelElementOpacityEdit: () => {
    set((state) => {
      const start = state.elementOpacityEditStart

      if (!start) {
        return state
      }

      const restored = restoreHistoryCheckpoint(state, start.checkpoint)

      return {
        ...restored,
        historyPast: state.historyPast,
        historyFuture: state.historyFuture,
        canUndo: state.historyPast.length > 0,
        canRedo: state.historyFuture.length > 0,
        documentStatus: restored.hasUnsavedChanges
          ? 'Unsaved changes'
          : state.hasSavedEpisode
            ? 'Saved locally'
            : 'Demo ready · not saved',
      }
    })
  },

  setElementBlendMode: (elementId, blendMode) => {
    set((state) =>
      commitEpisodeChange(
        state,
        setElementBlendModeCommand(state.episode, elementId, blendMode),
      ),
    )
  },

  setElementTransform: (elementId, transform) => {
    set((state) =>
      commitEpisodeChange(
        state,
        setElementTransformCommand(state.episode, elementId, transform),
      ),
    )
  },

  toggleElementFlip: (elementId, axis) => {
    set((state) => {
      const element = state.episode.elements.find(
        ({ id }) => id === elementId,
      )

      if (!element) return state

      return commitEpisodeChange(
        state,
        setElementTransformCommand(state.episode, elementId, {
          ...element.transform,
          ...(axis === 'horizontal'
            ? { flipX: !element.transform.flipX }
            : { flipY: !element.transform.flipY }),
        }),
      )
    })
  },

  setElementOverflow: (elementId, overflow) => {
    set((state) =>
      commitEpisodeChange(
        state,
        setElementOverflowCommand(state.episode, elementId, overflow),
      ),
    )
  },

  setShapeFill: (elementId, fill) => {
    set((state) =>
      commitEpisodeChange(
        state,
        setShapeFillCommand(state.episode, elementId, fill),
      ),
    )
  },

  updateShapeElementStyle: (elementId, input) => {
    set((state) =>
      commitEpisodeChange(
        state,
        updateShapeElementStyleCommand(state.episode, elementId, input),
      ),
    )
  },

  updateTextElement: (elementId, input) => {
    set((state) =>
      commitEpisodeChange(
        state,
        updateTextElementCommand(state.episode, elementId, input),
      ),
    )
  },

  updateSpeechBalloonElement: (elementId, input) => {
    set((state) =>
      commitEpisodeChange(
        state,
        updateSpeechBalloonElementCommand(state.episode, elementId, input),
      ),
    )
  },

  setImagePresentation: (elementId, presentation) => {
    set((state) => {
      const element = state.episode.elements.find(
        ({ id }) => id === elementId,
      )
      const source =
        element?.type === 'image'
          ? element.assetReference.kind === 'built-in'
            ? BUILT_IN_ASSETS.find(
                ({ id }) => id === element.assetReference.assetId,
              )
            : state.importedImageAssets.find(
                ({ id }) => id === element.assetReference.assetId,
              )
          : undefined
      const sourceAspectRatio = source
        ? source.intrinsicWidth / source.intrinsicHeight
        : undefined

      return commitEpisodeChange(
        state,
        setImagePresentationCommand(
          state.episode,
          elementId,
          presentation,
          { sourceAspectRatio },
        ),
      )
    })
  },

  setImageFrame: (elementId, frame) => {
    set((state) =>
      commitEpisodeChange(
        state,
        setImageFrameCommand(state.episode, elementId, frame),
      ),
    )
  },

  setImageCrop: (elementId, crop) => {
    set((state) =>
      commitEpisodeChange(
        state,
        setImageCropCommand(state.episode, elementId, crop),
      ),
    )
  },

  toggleMagnet: () => {
    set((state) => ({ magnetEnabled: !state.magnetEnabled }))
  },

  toggleSliceGuides: () => {
    set((state) => ({ sliceGuidesVisible: !state.sliceGuidesVisible }))
  },

  toggleAssetPanel: () => {
    set((state) => ({ assetPanelOpen: !state.assetPanelOpen }))
  },

  openAssetPanel: () => {
    set({ assetPanelOpen: true })
  },

  closeAssetPanel: () => {
    set({ assetPanelOpen: false })
  },

  initializeAssetLibrary: async () => {
    const state = get()

    if (
      state.assetLibraryStatus === 'ready' ||
      state.assetLibraryStatus === 'loading' ||
      state.assetLibraryBusy
    ) {
      return state.assetLibraryStatus === 'ready'
    }

    set({
      assetLibraryStatus: 'loading',
      assetLibraryBusy: true,
      assetLibraryMessage: 'Loading local assets…',
      assetLibraryMessageKind: 'info',
    })

    let result: Awaited<ReturnType<AssetRepository['load']>>

    try {
      result = await getAssetRepository().load()
    } catch {
      set({
        assetLibraryStatus: 'error',
        assetLibraryBusy: false,
        assetLibraryMessage: 'The local asset library could not be loaded.',
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    if (!result.ok) {
      if (result.reason === 'not-found') {
        revokeRuntimeImportedImages(state.importedImageAssets)
        set({
          assetLibraryStatus: 'ready',
          assetLibraryBusy: false,
          assetLibraryMessage: 'Asset Library ready.',
          assetLibraryMessageKind: 'info',
          creatorAssetCategories: [],
          importedImageAssets: [],
        })
        return true
      }

      set({
        assetLibraryStatus: 'error',
        assetLibraryBusy: false,
        assetLibraryMessage: result.message,
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    const importedImages: RuntimeImportedImage[] = []

    try {
      for (const image of result.snapshot.importedImages) {
        importedImages.push(createRuntimeImportedImage(image))
      }
    } catch {
      revokeRuntimeImportedImages(importedImages)
      set({
        assetLibraryStatus: 'error',
        assetLibraryBusy: false,
        assetLibraryMessage:
          'Saved asset sources were found, but previews could not be created.',
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    revokeRuntimeImportedImages(state.importedImageAssets)
    set({
      assetLibraryStatus: 'ready',
      assetLibraryBusy: false,
      assetLibraryMessage:
        importedImages.length > 0
          ? `Loaded ${importedImages.length} local ${importedImages.length === 1 ? 'asset' : 'assets'}.`
          : 'Asset Library ready.',
      assetLibraryMessageKind: 'success',
      creatorAssetCategories: result.snapshot.creatorCategories,
      importedImageAssets: importedImages,
    })
    return true
  },

  createCreatorAssetCategory: async (requestedName) => {
    const state = get()
    const name = requestedName.trim()

    if (state.assetLibraryStatus !== 'ready') {
      set({
        assetLibraryMessage:
          'Local asset storage must load successfully before categories can change.',
        assetLibraryMessageKind: 'error',
      })
      return null
    }

    if (state.assetLibraryBusy) {
      return null
    }

    if (!isSafeCreatorCategoryName(name)) {
      set({
        assetLibraryMessage:
          'Enter a category name between 1 and 40 characters.',
        assetLibraryMessageKind: 'error',
      })
      return null
    }

    if (
      state.creatorAssetCategories.some(
        (category) =>
          category.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
    ) {
      set({
        assetLibraryMessage: 'A category with that name already exists.',
        assetLibraryMessageKind: 'error',
      })
      return null
    }

    const createdAt = new Date().toISOString()
    const category: CreatorAssetCategorySnapshot = {
      id: createCreatorCategoryId(state),
      name,
      createdAt,
    }
    const currentImportedImages = state.importedImageAssets.map(
      createImportedImageSnapshot,
    )

    set({
      assetLibraryBusy: true,
      assetLibraryMessage: 'Saving category…',
      assetLibraryMessageKind: 'info',
    })

    let categoryConflict = false
    let result: PersistAssetLibraryResult

    try {
      result = await persistAssetLibraryUpdate(
        getAssetRepository(),
        (currentSnapshot) => {
          const latestCategories =
            currentSnapshot?.creatorCategories ??
            state.creatorAssetCategories
          const latestImportedImages =
            currentSnapshot?.importedImages ?? currentImportedImages

          if (
            latestCategories.some(
              (candidate) =>
                candidate.name.toLocaleLowerCase() ===
                category.name.toLocaleLowerCase(),
            )
          ) {
            categoryConflict = true
            return (
              currentSnapshot ??
              createAssetLibrarySnapshot(
                state,
                createdAt,
                latestCategories,
                latestImportedImages,
              )
            )
          }

          return createAssetLibrarySnapshot(
            state,
            createdAt,
            [...latestCategories, category],
            latestImportedImages,
          )
        },
      )
    } catch {
      set({
        assetLibraryStatus:
          state.assetLibraryStatus === 'ready' ? 'ready' : 'error',
        assetLibraryBusy: false,
        assetLibraryMessage: 'The category could not be saved locally.',
        assetLibraryMessageKind: 'error',
      })
      return null
    }

    if (!result.ok) {
      set({
        assetLibraryStatus:
          state.assetLibraryStatus === 'ready' ? 'ready' : 'error',
        assetLibraryBusy: false,
        assetLibraryMessage: result.message,
        assetLibraryMessageKind: 'error',
      })
      return null
    }

    if (categoryConflict) {
      let importedImageAssets = state.importedImageAssets

      try {
        importedImageAssets = synchronizeRuntimeImportedImages(
          state.importedImageAssets,
          result.snapshot.importedImages,
        )
      } catch {
        // The category conflict remains authoritative even if a remote preview
        // cannot be hydrated until the next reload.
      }

      set({
        assetLibraryStatus: 'ready',
        assetLibraryBusy: false,
        assetLibraryMessage: 'A category with that name already exists.',
        assetLibraryMessageKind: 'error',
        creatorAssetCategories: result.snapshot.creatorCategories,
        importedImageAssets,
      })
      return null
    }

    let importedImageAssets: readonly RuntimeImportedImage[]

    try {
      importedImageAssets = synchronizeRuntimeImportedImages(
        state.importedImageAssets,
        result.snapshot.importedImages,
      )
    } catch {
      set({
        assetLibraryStatus: 'ready',
        assetLibraryBusy: false,
        assetLibraryMessage:
          'The category was saved, but assets added in another tab need a reload.',
        assetLibraryMessageKind: 'error',
        creatorAssetCategories: result.snapshot.creatorCategories,
      })
      return category.id
    }

    set({
      assetLibraryStatus: 'ready',
      assetLibraryBusy: false,
      assetLibraryMessage: `Created “${category.name}”.`,
      assetLibraryMessageKind: 'success',
      creatorAssetCategories: result.snapshot.creatorCategories,
      importedImageAssets,
    })
    return category.id
  },

  renameCreatorAssetCategory: async (categoryId, requestedName) => {
    const state = get()
    const name = requestedName.trim()
    const category = state.creatorAssetCategories.find(
      ({ id }) => id === categoryId,
    )

    if (
      state.assetLibraryStatus !== 'ready' ||
      state.assetLibraryBusy ||
      !category
    ) {
      set({
        assetLibraryMessage: category
          ? 'Wait for the current Asset Library change to finish.'
          : 'That creator category is no longer available.',
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    if (!isSafeCreatorCategoryName(name)) {
      set({
        assetLibraryMessage:
          'Enter a category name between 1 and 40 characters.',
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    set({
      assetLibraryBusy: true,
      assetLibraryMessage: `Renaming “${category.name}”…`,
      assetLibraryMessageKind: 'info',
    })

    let mutationError: string | undefined
    let result: PersistAssetLibraryResult

    try {
      result = await persistAssetLibraryUpdate(
        getAssetRepository(),
        (currentSnapshot) => {
          const latest = getLatestAssetLibraryParts(state, currentSnapshot)
          const currentCategory = latest.creatorCategories.find(
            ({ id }) => id === categoryId,
          )

          if (!currentCategory) {
            mutationError = 'That creator category was removed in another tab.'
          } else if (
            latest.creatorCategories.some(
              (candidate) =>
                candidate.id !== categoryId &&
                candidate.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
            )
          ) {
            mutationError = 'A category with that name already exists.'
          }

          const creatorCategories = mutationError
            ? latest.creatorCategories
            : latest.creatorCategories.map((candidate) =>
                candidate.id === categoryId
                  ? { ...candidate, name }
                  : candidate,
              )

          return createAssetLibrarySnapshot(
            state,
            new Date().toISOString(),
            creatorCategories,
            latest.importedImages,
          )
        },
      )
    } catch {
      result = { ok: false, message: 'The category could not be renamed.' }
    }

    if (!result.ok || mutationError) {
      set(
        createAssetLibraryMutationFailurePatch(
          state,
          result,
          mutationError,
          'The category could not be renamed.',
        ),
      )
      return false
    }

    set(createAssetLibraryRefreshPatch(state, result.snapshot, `Renamed category to “${name}”.`))
    return true
  },

  deleteCreatorAssetCategory: async (categoryId) => {
    const state = get()
    const category = state.creatorAssetCategories.find(
      ({ id }) => id === categoryId,
    )

    if (
      state.assetLibraryStatus !== 'ready' ||
      state.assetLibraryBusy ||
      !category
    ) {
      set({
        assetLibraryMessage: category
          ? 'Wait for the current Asset Library change to finish.'
          : 'That creator category is no longer available.',
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    set({
      assetLibraryBusy: true,
      assetLibraryMessage: `Removing “${category.name}”…`,
      assetLibraryMessageKind: 'info',
    })

    let mutationError: string | undefined
    let result: PersistAssetLibraryResult

    try {
      result = await persistAssetLibraryUpdate(
        getAssetRepository(),
        (currentSnapshot) => {
          const latest = getLatestAssetLibraryParts(state, currentSnapshot)

          if (!latest.creatorCategories.some(({ id }) => id === categoryId)) {
            mutationError = 'That creator category was removed in another tab.'
          }

          return createAssetLibrarySnapshot(
            state,
            new Date().toISOString(),
            mutationError
              ? latest.creatorCategories
              : latest.creatorCategories.filter(({ id }) => id !== categoryId),
            mutationError
              ? latest.importedImages
              : latest.importedImages.map((image) =>
                  image.creatorCategoryId === categoryId
                    ? { ...image, creatorCategoryId: null }
                    : image,
                ),
          )
        },
      )
    } catch {
      result = { ok: false, message: 'The category could not be deleted.' }
    }

    if (!result.ok || mutationError) {
      set(
        createAssetLibraryMutationFailurePatch(
          state,
          result,
          mutationError,
          'The category could not be deleted.',
        ),
      )
      return false
    }

    set(
      createAssetLibraryRefreshPatch(
        state,
        result.snapshot,
        `Deleted “${category.name}”. Its assets are now in Unsorted.`,
      ),
    )
    return true
  },

  reorderCreatorAssetCategory: async (categoryId, requestedTargetIndex) => {
    const state = get()
    const category = state.creatorAssetCategories.find(
      ({ id }) => id === categoryId,
    )

    if (
      state.assetLibraryStatus !== 'ready' ||
      state.assetLibraryBusy ||
      !category ||
      !Number.isInteger(requestedTargetIndex)
    ) {
      set({
        assetLibraryMessage: category
          ? 'That category move is unavailable right now.'
          : 'That creator category is no longer available.',
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    set({
      assetLibraryBusy: true,
      assetLibraryMessage: `Moving “${category.name}”…`,
      assetLibraryMessageKind: 'info',
    })

    let mutationError: string | undefined
    let result: PersistAssetLibraryResult

    try {
      result = await persistAssetLibraryUpdate(
        getAssetRepository(),
        (currentSnapshot) => {
          const latest = getLatestAssetLibraryParts(state, currentSnapshot)
          const sourceIndex = latest.creatorCategories.findIndex(
            ({ id }) => id === categoryId,
          )

          if (sourceIndex < 0) {
            mutationError = 'That creator category was removed in another tab.'
            return createAssetLibrarySnapshot(
              state,
              new Date().toISOString(),
              latest.creatorCategories,
              latest.importedImages,
            )
          }

          const targetIndex = Math.min(
            Math.max(requestedTargetIndex, 0),
            latest.creatorCategories.length - 1,
          )
          const creatorCategories = [...latest.creatorCategories]
          const [movedCategory] = creatorCategories.splice(sourceIndex, 1)

          if (movedCategory) creatorCategories.splice(targetIndex, 0, movedCategory)

          return createAssetLibrarySnapshot(
            state,
            new Date().toISOString(),
            creatorCategories,
            latest.importedImages,
          )
        },
      )
    } catch {
      result = { ok: false, message: 'The category could not be reordered.' }
    }

    if (!result.ok || mutationError) {
      set(
        createAssetLibraryMutationFailurePatch(
          state,
          result,
          mutationError,
          'The category could not be reordered.',
        ),
      )
      return false
    }

    set(createAssetLibraryRefreshPatch(state, result.snapshot, `Moved “${category.name}”.`))
    return true
  },

  importImageAsset: async (file, requestedCreatorCategoryId = null) => {
    const state = get()
    const creatorCategoryId = requestedCreatorCategoryId ?? null

    if (state.assetLibraryStatus !== 'ready') {
      set({
        assetLibraryMessage:
          'Local asset storage must load successfully before images can be imported.',
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    if (state.assetLibraryBusy) {
      return false
    }

    if (
      creatorCategoryId !== null &&
      !state.creatorAssetCategories.some(
        ({ id }) => id === creatorCategoryId,
      )
    ) {
      set({
        assetLibraryMessage:
          'Choose an existing Uploads category before uploading.',
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    set({
      assetLibraryBusy: true,
      assetLibraryMessage: 'Checking image…',
      assetLibraryMessageKind: 'info',
    })

    let imported: Awaited<ReturnType<typeof importBrowserImage>>

    try {
      imported = await importBrowserImage(file, { creatorCategoryId })
    } catch {
      set({
        assetLibraryBusy: false,
        assetLibraryMessage: 'The selected image could not be imported.',
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    if (!imported.ok) {
      set({
        assetLibraryBusy: false,
        assetLibraryMessage: imported.message,
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    if (
      state.importedImageAssets.some(({ id }) => id === imported.image.id)
    ) {
      set({
        assetLibraryBusy: false,
        assetLibraryMessage: 'That imported image ID is already in use.',
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    let runtimeImage: RuntimeImportedImage

    try {
      runtimeImage = createRuntimeImportedImage(imported.image)
    } catch {
      set({
        assetLibraryBusy: false,
        assetLibraryMessage:
          'The image is valid, but this browser could not create its preview.',
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    let importedIdConflict = false
    let saveResult: PersistAssetLibraryResult

    try {
      saveResult = await persistAssetLibraryUpdate(
        getAssetRepository(),
        (currentSnapshot) => {
          const latestImportedImages =
            currentSnapshot?.importedImages ??
            state.importedImageAssets.map(createImportedImageSnapshot)

          if (
            latestImportedImages.some(({ id }) => id === imported.image.id)
          ) {
            importedIdConflict = true
            return (
              currentSnapshot ??
              createAssetLibrarySnapshot(
                state,
                new Date().toISOString(),
                state.creatorAssetCategories,
                latestImportedImages,
              )
            )
          }

          return createAssetLibrarySnapshot(
            state,
            new Date().toISOString(),
            currentSnapshot?.creatorCategories ??
              state.creatorAssetCategories,
            [...latestImportedImages, imported.image],
          )
        },
      )
    } catch {
      revokeRuntimeImportedImages([runtimeImage])
      set({
        assetLibraryBusy: false,
        assetLibraryMessage: 'The image could not be saved locally.',
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    if (!saveResult.ok) {
      revokeRuntimeImportedImages([runtimeImage])
      set({
        assetLibraryBusy: false,
        assetLibraryMessage: saveResult.message,
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    if (importedIdConflict) {
      revokeRuntimeImportedImages([runtimeImage])
      set({
        assetLibraryBusy: false,
        assetLibraryMessage: 'That imported image ID is already in use.',
        assetLibraryMessageKind: 'error',
        creatorAssetCategories: saveResult.snapshot.creatorCategories,
      })
      return false
    }

    let synchronizedImages: readonly RuntimeImportedImage[]

    try {
      synchronizedImages = synchronizeRuntimeImportedImages(
        [...state.importedImageAssets, runtimeImage],
        saveResult.snapshot.importedImages,
      )
    } catch {
      set({
        assetLibraryStatus: 'ready',
        assetLibraryBusy: false,
        assetLibraryMessage:
          'The image was saved, but assets added in another tab need a reload.',
        assetLibraryMessageKind: 'error',
        creatorAssetCategories: saveResult.snapshot.creatorCategories,
        importedImageAssets: [...state.importedImageAssets, runtimeImage],
      })
      return true
    }

    set({
      assetLibraryStatus: 'ready',
      assetLibraryBusy: false,
      assetLibraryMessage: `Imported “${runtimeImage.displayName}”.`,
      assetLibraryMessageKind: 'success',
      creatorAssetCategories: saveResult.snapshot.creatorCategories,
      importedImageAssets: synchronizedImages,
    })
    return true
  },

  importAndPlaceImageAsset: async (file, logicalCenter) => {
    const state = get()
    const targetLayerPlane = getLayerPlaneById(
      state.episode,
      state.activeLayerPlaneId,
    )

    if (targetLayerPlane?.kind !== 'ordinary') {
      set({
        assetLibraryMessage:
          'Select a numbered layer plane before dropping an image file.',
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    if (!Number.isFinite(logicalCenter.x) || !Number.isFinite(logicalCenter.y)) {
      set({
        assetLibraryMessage: 'The canvas drop position is invalid.',
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    const existingIds = new Set(
      state.importedImageAssets.map(({ id }) => id),
    )
    const targetLayerPlaneId = targetLayerPlane.id
    const imported = await get().importImageAsset(file, null)

    if (!imported) return false

    const latest = get()
    const importedImage = latest.importedImageAssets.find(
      (image) =>
        !existingIds.has(image.id) && image.sourceBlob === file,
    )

    if (!importedImage) {
      set({
        assetLibraryMessage:
          'The image was imported, but its new library record could not be identified for placement.',
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    const transition = createAssetPlacementTransition(
      latest,
      { kind: 'imported', assetId: importedImage.id },
      logicalCenter,
      targetLayerPlaneId,
    )

    set(transition.nextState)
    return transition.placed
  },

  renameImportedImageAsset: async (assetId, requestedName) => {
    const state = get()
    const asset = state.importedImageAssets.find(({ id }) => id === assetId)
    const name = requestedName.trim()

    if (
      state.assetLibraryStatus !== 'ready' ||
      state.assetLibraryBusy ||
      !asset
    ) {
      set({
        assetLibraryMessage: asset
          ? 'Wait for the current Asset Library change to finish.'
          : 'That imported source is no longer available.',
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    if (!isSafeDisplayName(name)) {
      set({
        assetLibraryMessage:
          'Enter a source name between 1 and 120 characters without control characters.',
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    set({
      assetLibraryBusy: true,
      assetLibraryMessage: `Renaming “${asset.displayName}”…`,
      assetLibraryMessageKind: 'info',
    })

    let mutationError: string | undefined
    let result: PersistAssetLibraryResult

    try {
      result = await persistAssetLibraryUpdate(
        getAssetRepository(),
        (currentSnapshot) => {
          const latest = getLatestAssetLibraryParts(state, currentSnapshot)

          if (!latest.importedImages.some(({ id }) => id === assetId)) {
            mutationError = 'That source was removed in another tab.'
          }

          return createAssetLibrarySnapshot(
            state,
            new Date().toISOString(),
            latest.creatorCategories,
            mutationError
              ? latest.importedImages
              : latest.importedImages.map((image) =>
                  image.id === assetId ? { ...image, displayName: name } : image,
                ),
          )
        },
      )
    } catch {
      result = { ok: false, message: 'The source could not be renamed.' }
    }

    if (!result.ok || mutationError) {
      set(
        createAssetLibraryMutationFailurePatch(
          state,
          result,
          mutationError,
          'The source could not be renamed.',
        ),
      )
      return false
    }

    set(createAssetLibraryRefreshPatch(state, result.snapshot, `Renamed source to “${name}”.`))
    return true
  },

  moveImportedImageAsset: async (assetId, creatorCategoryId) => {
    const state = get()
    const asset = state.importedImageAssets.find(({ id }) => id === assetId)
    const targetCategory =
      creatorCategoryId === null
        ? null
        : state.creatorAssetCategories.find(({ id }) => id === creatorCategoryId)

    if (
      state.assetLibraryStatus !== 'ready' ||
      state.assetLibraryBusy ||
      !asset ||
      (creatorCategoryId !== null && !targetCategory)
    ) {
      set({
        assetLibraryMessage: !asset
          ? 'That imported source is no longer available.'
          : 'Choose an available destination category.',
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    set({
      assetLibraryBusy: true,
      assetLibraryMessage: `Moving “${asset.displayName}”…`,
      assetLibraryMessageKind: 'info',
    })

    let mutationError: string | undefined
    let result: PersistAssetLibraryResult

    try {
      result = await persistAssetLibraryUpdate(
        getAssetRepository(),
        (currentSnapshot) => {
          const latest = getLatestAssetLibraryParts(state, currentSnapshot)

          if (!latest.importedImages.some(({ id }) => id === assetId)) {
            mutationError = 'That source was removed in another tab.'
          } else if (
            creatorCategoryId !== null &&
            !latest.creatorCategories.some(({ id }) => id === creatorCategoryId)
          ) {
            mutationError = 'The destination category was removed in another tab.'
          }

          return createAssetLibrarySnapshot(
            state,
            new Date().toISOString(),
            latest.creatorCategories,
            mutationError
              ? latest.importedImages
              : latest.importedImages.map((image) =>
                  image.id === assetId
                    ? { ...image, creatorCategoryId }
                    : image,
                ),
          )
        },
      )
    } catch {
      result = { ok: false, message: 'The source could not be moved.' }
    }

    if (!result.ok || mutationError) {
      set(
        createAssetLibraryMutationFailurePatch(
          state,
          result,
          mutationError,
          'The source could not be moved.',
        ),
      )
      return false
    }

    const destinationName = targetCategory?.name ?? 'Unsorted'
    set(
      createAssetLibraryRefreshPatch(
        state,
        result.snapshot,
        `Moved “${asset.displayName}” to ${destinationName}.`,
      ),
    )
    return true
  },

  replaceImportedImageAsset: async (assetId, file) => {
    const state = get()
    const asset = state.importedImageAssets.find(({ id }) => id === assetId)

    if (
      state.assetLibraryStatus !== 'ready' ||
      state.assetLibraryBusy ||
      !asset
    ) {
      set({
        assetLibraryMessage: asset
          ? 'Wait for the current Asset Library change to finish.'
          : 'That imported source is no longer available.',
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    set({
      assetLibraryBusy: true,
      assetLibraryMessage: `Checking replacement for “${asset.displayName}”…`,
      assetLibraryMessageKind: 'info',
    })

    let imported: Awaited<ReturnType<typeof importBrowserImage>>

    try {
      imported = await importBrowserImage(file, {
        creatorCategoryId: asset.creatorCategoryId,
        createId: () => asset.id,
      })
    } catch {
      imported = {
        ok: false,
        reason: 'invalid-file',
        message: 'The replacement image could not be checked.',
      }
    }

    if (!imported.ok) {
      set({
        assetLibraryBusy: false,
        assetLibraryMessage: imported.message,
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    let mutationError: string | undefined
    let result: PersistAssetLibraryResult

    try {
      result = await persistAssetLibraryUpdate(
        getAssetRepository(),
        (currentSnapshot) => {
          const latest = getLatestAssetLibraryParts(state, currentSnapshot)
          const latestAsset = latest.importedImages.find(
            ({ id }) => id === assetId,
          )

          if (!latestAsset) {
            mutationError = 'That source was removed in another tab.'
          }

          const replacement = latestAsset
            ? {
                ...imported.image,
                id: latestAsset.id,
                displayName: latestAsset.displayName,
                creatorCategoryId: latestAsset.creatorCategoryId,
                importedAt: latestAsset.importedAt,
              }
            : imported.image

          return createAssetLibrarySnapshot(
            state,
            new Date().toISOString(),
            latest.creatorCategories,
            mutationError
              ? latest.importedImages
              : latest.importedImages.map((image) =>
                  image.id === assetId ? replacement : image,
                ),
          )
        },
      )
    } catch {
      result = { ok: false, message: 'The source could not be replaced.' }
    }

    if (!result.ok || mutationError) {
      set(
        createAssetLibraryMutationFailurePatch(
          state,
          result,
          mutationError,
          'The source could not be replaced.',
        ),
      )
      return false
    }

    set(
      createAssetLibraryRefreshPatch(
        state,
        result.snapshot,
        `Replaced “${asset.displayName}” without changing its source ID.`,
      ),
    )
    return true
  },

  deleteImportedImageAsset: async (assetId) => {
    const state = get()
    const asset = state.importedImageAssets.find(({ id }) => id === assetId)

    if (
      state.assetLibraryStatus !== 'ready' ||
      state.assetLibraryBusy ||
      !asset
    ) {
      set({
        assetLibraryMessage: asset
          ? 'Wait for the current Asset Library change to finish.'
          : 'That imported source is no longer available.',
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    const deletionSafety = checkImportedAssetDeletionSafety(
      assetId,
      state.episode,
      getAssetReferenceStorage(),
    )

    if (!deletionSafety.ok) {
      set({
        assetLibraryMessage: deletionSafety.message,
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    set({
      assetLibraryBusy: true,
      assetLibraryMessage: `Deleting “${asset.displayName}”…`,
      assetLibraryMessageKind: 'info',
    })

    let mutationError: string | undefined
    let result: PersistAssetLibraryResult

    try {
      result = await persistAssetLibraryUpdate(
        getAssetRepository(),
        (currentSnapshot) => {
          const latest = getLatestAssetLibraryParts(state, currentSnapshot)

          if (!latest.importedImages.some(({ id }) => id === assetId)) {
            mutationError = 'That source was removed in another tab.'
          }

          return createAssetLibrarySnapshot(
            state,
            new Date().toISOString(),
            latest.creatorCategories,
            mutationError
              ? latest.importedImages
              : latest.importedImages.filter(({ id }) => id !== assetId),
          )
        },
      )
    } catch {
      result = { ok: false, message: 'The source could not be deleted.' }
    }

    if (!result.ok || mutationError) {
      set(
        createAssetLibraryMutationFailurePatch(
          state,
          result,
          mutationError,
          'The source could not be deleted.',
        ),
      )
      return false
    }

    set(
      createAssetLibraryRefreshPatch(
        state,
        result.snapshot,
        `Deleted reusable source “${asset.displayName}”.`,
      ),
    )
    return true
  },

  placeBuiltInAsset: (assetId) => {
    const state = get()
    const transition = createAssetPlacementTransition(state, {
      kind: 'built-in',
      assetId,
    })

    set(transition.nextState)
    return transition.placed
  },

  placeImportedAsset: (assetId) => {
    const state = get()
    const transition = createAssetPlacementTransition(state, {
      kind: 'imported',
      assetId,
    })

    set(transition.nextState)
    return transition.placed
  },

  placeDraggedAsset: (payload, logicalCenter) => {
    const state = get()
    const transition = createAssetPlacementTransition(
      state,
      { kind: payload.kind, assetId: payload.assetId },
      logicalCenter,
    )

    set(transition.nextState)
    return transition.placed
  },

  placeDraggedAssetOnPlane: (payload, layerPlaneId) => {
    const state = get()
    const transition = createAssetPlacementTransition(
      state,
      { kind: payload.kind, assetId: payload.assetId },
      undefined,
      layerPlaneId,
    )

    set(transition.nextState)
    return transition.placed
  },

  reportAssetDropError: (message) => {
    const normalizedMessage = message.trim()

    set({
      assetLibraryMessage:
        normalizedMessage || 'That asset could not be dropped on the canvas.',
      assetLibraryMessageKind: 'error',
    })
  },

  undo: () => {
    set((state) => {
      const checkpoint = state.historyPast.at(-1)

      if (!checkpoint) {
        return state
      }

      const historyPast = state.historyPast.slice(0, -1)
      const historyFuture = [
        createHistoryCheckpoint(state),
        ...state.historyFuture,
      ].slice(0, HISTORY_LIMIT)

      return {
        ...restoreHistoryCheckpoint(state, checkpoint),
        historyPast,
        historyFuture,
        canUndo: historyPast.length > 0,
        canRedo: true,
        documentStatus: 'Undid last change',
      }
    })
  },

  redo: () => {
    set((state) => {
      const [checkpoint, ...historyFuture] = state.historyFuture

      if (!checkpoint) {
        return state
      }

      const historyPast = appendHistoryCheckpoint(
        state.historyPast,
        createHistoryCheckpoint(state),
      )

      return {
        ...restoreHistoryCheckpoint(state, checkpoint),
        historyPast,
        historyFuture,
        canUndo: true,
        canRedo: historyFuture.length > 0,
        documentStatus: 'Redid last change',
      }
    })
  },

  refreshRecentProjects: () => {
    const result = getProjectLibraryRepository().listRecent()

    if (!result.ok) {
      set({ documentStatus: result.message })
      return false
    }

    set({ recentProjects: result.projects })
    return true
  },

  saveEpisode: () => {
    const state = get()
    const projectLibrary = getProjectLibraryRepository()
    const result = state.currentProjectId
      ? projectLibrary.save(state.currentProjectId, state.episode)
      : projectLibrary.saveAs(state.episode)

    if (!result.ok) {
      set({ documentStatus: result.message })
      return false
    }

    // The old slot remains a best-effort fail-safe for already-installed
    // builds. The project library above is the authoritative save.
    getProjectRepository().save(state.episode)
    const recent = projectLibrary.listRecent()
    clearRecoverySnapshot()
    set({
      savedRevision: state.currentRevision,
      currentProjectId: result.projectId,
      reopenProjectId: result.projectId,
      recentProjects: recent.ok ? recent.projects : state.recentProjects,
      hasSavedEpisode: true,
      hasUnsavedChanges: false,
      recoveryAvailable: null,
      recoveryMessage: null,
      documentStatus: 'Saved locally',
    })
    return true
  },

  saveEpisodeAs: () => {
    const state = get()
    const projectLibrary = getProjectLibraryRepository()
    const result = projectLibrary.saveAs(state.episode)

    if (!result.ok) {
      set({ documentStatus: result.message })
      return false
    }

    getProjectRepository().save(state.episode)
    const recent = projectLibrary.listRecent()
    clearRecoverySnapshot()
    set({
      savedRevision: state.currentRevision,
      currentProjectId: result.projectId,
      reopenProjectId: result.projectId,
      recentProjects: recent.ok ? recent.projects : state.recentProjects,
      hasSavedEpisode: true,
      hasUnsavedChanges: false,
      recoveryAvailable: null,
      recoveryMessage: null,
      documentStatus: 'Saved a new local project',
    })
    return true
  },

  openLocalProject: (projectId) => {
    const projectLibrary = getProjectLibraryRepository()
    const result = projectLibrary.load(projectId)

    if (!result.ok) {
      set({ documentStatus: result.message })
      return false
    }

    const recent = projectLibrary.listRecent()
    clearRecoverySnapshot()
    set((state) => ({
      ...createLoadedEpisodePatch(state, result.project.episode, {
        currentProjectId: result.project.projectId,
        saved: true,
        documentStatus: `Opened “${result.project.name}”`,
      }),
      reopenProjectId: result.project.projectId,
      recentProjects: recent.ok ? recent.projects : state.recentProjects,
      hasSavedEpisode: true,
      recoveryAvailable: null,
      recoveryMessage: null,
    }))
    return true
  },

  deleteLocalProject: (projectId) => {
    const state = get()
    const projectLibrary = getProjectLibraryRepository()
    const result = projectLibrary.delete(projectId)

    if (!result.ok) {
      set({ documentStatus: result.message })
      return false
    }

    const recentResult = projectLibrary.listRecent()
    const recentProjects = recentResult.ok
      ? recentResult.projects
      : state.recentProjects.filter((project) => project.projectId !== projectId)
    const deletedCurrent = state.currentProjectId === projectId
    const reopenProjectId =
      state.reopenProjectId === projectId
        ? (recentProjects[0]?.projectId ?? null)
        : state.reopenProjectId

    set({
      currentProjectId: deletedCurrent ? null : state.currentProjectId,
      reopenProjectId,
      recentProjects,
      hasSavedEpisode: reopenProjectId !== null,
      savedRevision: deletedCurrent ? null : state.savedRevision,
      hasUnsavedChanges: deletedCurrent ? true : state.hasUnsavedChanges,
      documentStatus: deletedCurrent
        ? 'Deleted local project · current episode is now unsaved'
        : 'Deleted local project',
    })
    return true
  },

  reopenEpisode: () => {
    const state = get()
    const projectId = state.currentProjectId ?? state.reopenProjectId

    if (projectId) {
      const projectLibrary = getProjectLibraryRepository()
      const result = projectLibrary.load(projectId)

      if (!result.ok) {
        set({ documentStatus: result.message })
        return false
      }

      const recent = projectLibrary.listRecent()
      clearRecoverySnapshot()
      set((currentState) => ({
        ...createLoadedEpisodePatch(currentState, result.project.episode, {
          currentProjectId: projectId,
          saved: true,
          documentStatus: 'Reopened saved episode',
        }),
        reopenProjectId: projectId,
        recentProjects: recent.ok
          ? recent.projects
          : currentState.recentProjects,
        hasSavedEpisode: true,
        recoveryAvailable: null,
        recoveryMessage: null,
      }))
      return true
    }

    const legacy = getProjectRepository().loadLast()

    if (!legacy.ok) {
      set({ documentStatus: legacy.message })
      return false
    }

    clearRecoverySnapshot()
    set((currentState) => ({
      ...createLoadedEpisodePatch(currentState, legacy.episode, {
        currentProjectId: null,
        saved: true,
        documentStatus: 'Reopened legacy saved episode',
      }),
      hasSavedEpisode: true,
      recoveryAvailable: null,
      recoveryMessage: null,
    }))
    return true
  },

  newEpisode: () => {
    clearRecoverySnapshot()
    set((state) => {
      const episode = createBlankEpisode(createEpisodeId())
      const context = getDefaultEditorContext(episode)
      const viewportDimensions = getViewportLogicalDimensions(
        episode,
        state.fitViewportLogicalHeight,
        DEFAULT_ZOOM_FACTOR,
      )
      const revision = state.nextRevision

      return {
        episode,
        historyPast: [],
        historyFuture: [],
        episodeHeightResizeStart: null,
        elementOpacityEditStart: null,
        currentRevision: revision,
        nextRevision: revision + 1,
        savedRevision: null,
        canUndo: false,
        canRedo: false,
        hasUnsavedChanges: true,
        currentProjectId: null,
        recoveryAvailable: null,
        recoveryMessage: null,
        documentStatus: 'New episode · not saved',
        selectedElementId: null,
        selectedElementIds: [],
        liveElementBounds: null,
        ...context,
        viewportX: 0,
        viewportY: 0,
        viewportLogicalWidth: viewportDimensions.width,
        viewportLogicalHeight: viewportDimensions.height,
        zoomFactor: DEFAULT_ZOOM_FACTOR,
        assetPanelOpen: false,
        magnetEnabled: true,
        sliceGuidesVisible: true,
      }
    })
  },

  resetEpisode: () => {
    set((state) => {
      const viewportDimensions = getViewportLogicalDimensions(
        buildWeekEpisode,
        state.fitViewportLogicalHeight,
        DEFAULT_ZOOM_FACTOR,
      )

      const revision = state.nextRevision
      return {
        episode: buildWeekEpisode,
        historyPast: [],
        historyFuture: [],
        episodeHeightResizeStart: null,
        elementOpacityEditStart: null,
        currentRevision: revision,
        nextRevision: revision + 1,
        savedRevision: state.hasSavedEpisode ? state.savedRevision : null,
        canUndo: false,
        canRedo: false,
        hasUnsavedChanges: true,
        documentStatus: 'Demo reset · unsaved changes',
        selectedElementId: null,
        selectedElementIds: [],
        liveElementBounds: null,
        activeCompositionGroup: INITIAL_COMPOSITION_GROUP,
        activeLayerPlaneId: INITIAL_LAYER_PLANE_ID,
        viewportX: 0,
        viewportY: 0,
        viewportLogicalWidth: viewportDimensions.width,
        viewportLogicalHeight: viewportDimensions.height,
        zoomFactor: DEFAULT_ZOOM_FACTOR,
        assetPanelOpen: false,
        magnetEnabled: true,
        sliceGuidesVisible: true,
      }
    })
  },

  restoreRecovery: () => {
    const state = get()
    const recovery = state.recoveryAvailable

    if (!recovery) return false

    const recoveryProjectExists =
      recovery.projectId !== null &&
      state.recentProjects.some(
        ({ projectId }) => projectId === recovery.projectId,
      )
    const projectId = recoveryProjectExists ? recovery.projectId : null

    set((currentState) => ({
      ...createLoadedEpisodePatch(currentState, recovery.episode, {
        currentProjectId: projectId,
        saved: false,
        documentStatus: 'Restored crash recovery · save to keep it',
      }),
      reopenProjectId: projectId ?? currentState.reopenProjectId,
      hasSavedEpisode:
        projectId !== null || currentState.reopenProjectId !== null,
      recoveryAvailable: null,
      recoveryMessage: null,
    }))
    return true
  },

  discardRecovery: () => {
    const result = getRecoveryRepository().clear()

    if (!result.ok) {
      set({ recoveryMessage: result.message })
      return false
    }

    set({
      recoveryAvailable: null,
      recoveryMessage: null,
      documentStatus: 'Discarded crash recovery',
    })
    return true
  },

  flushRecovery: () => {
    getRecoveryRepository().flush()
  },

  exportPortableProject: async () => {
    const state = get()
    const loadedAssets = await getAssetRepository().load()
    const savedAt = new Date().toISOString()

    if (!loadedAssets.ok && loadedAssets.reason !== 'not-found') {
      set({ documentStatus: loadedAssets.message })
      return null
    }

    const assetLibrary = loadedAssets.ok
      ? loadedAssets.snapshot
      : createAssetLibrarySnapshot(state, savedAt)

    const result = await serializePortableProject(state.episode, assetLibrary)

    if (!result.ok) {
      set({ documentStatus: result.message })
      return null
    }

    set({ documentStatus: 'Portable project ready to download' })
    return { blob: result.blob, fileName: result.fileName }
  },

  importPortableProject: async (file) => {
    const parsed = await parsePortableProject(file)

    if (!parsed.ok) {
      set({ documentStatus: parsed.message })
      return false
    }

    const state = get()
    const savedAt = new Date().toISOString()
    let merged: ReturnType<typeof mergePortableProjectAssets> | undefined
    let updateResult: Awaited<ReturnType<AssetRepository['update']>>

    try {
      updateResult = await getAssetRepository().update((currentSnapshot) => {
        const current =
          currentSnapshot ?? createAssetLibrarySnapshot(state, savedAt)
        merged = mergePortableProjectAssets(
          current,
          parsed.assetLibrary,
          parsed.episode,
          savedAt,
        )
        return merged.assetLibrary
      })
    } catch {
      set({ documentStatus: 'The portable project assets could not be merged.' })
      return false
    }

    if (!updateResult.ok || !merged) {
      set({
        documentStatus: updateResult.ok
          ? 'The portable project merge did not produce an episode.'
          : updateResult.message,
      })
      return false
    }

    clearRecoverySnapshot()
    set((currentState) => ({
      ...createLoadedEpisodePatch(currentState, merged!.episode, {
        currentProjectId: null,
        saved: false,
        documentStatus:
          merged!.remappedAssetCount + merged!.remappedCategoryCount > 0
            ? 'Imported portable project safely · conflicting library IDs were remapped'
            : 'Imported portable project · save to add it to local projects',
      }),
      ...createAssetLibraryRefreshPatch(
        currentState,
        updateResult.snapshot,
        'Portable asset library merged.',
      ),
      currentProjectId: null,
      hasSavedEpisode: currentState.reopenProjectId !== null,
      recoveryAvailable: null,
      recoveryMessage: null,
    }))
    return true
  },
}))

useEditorStore.subscribe((state, previousState) => {
  if (
    state.episode !== previousState.episode &&
    state.hasUnsavedChanges
  ) {
    getRecoveryRepository().save(state.currentProjectId, state.episode)
  }
})
