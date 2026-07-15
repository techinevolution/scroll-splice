import { create } from 'zustand'

import {
  BUILD_WEEK_LAYER_PLANE_IDS,
  buildWeekEpisode,
} from './fixtures/buildWeekEpisode'
import { createBlankEpisode } from '../core/createBlankEpisode'
import {
  DEFAULT_EPISODE_HEIGHT_INCREMENT,
  MIN_ELEMENT_SIZE,
  createBackgroundColorRegion as createBackgroundColorRegionCommand,
  createImageElement as createImageElementCommand,
  createLayerPlane as createLayerPlaneCommand,
  createSyntheticShapeElement as createSyntheticShapeElementCommand,
  deleteElement as deleteElementCommand,
  deleteEmptyLayerPlane as deleteEmptyLayerPlaneCommand,
  extendEpisodeHeight as extendEpisodeHeightCommand,
  moveElement as moveElementCommand,
  resizeElement as resizeElementCommand,
  resizeEpisodeHeight as resizeEpisodeHeightCommand,
  setBaseColor as setBaseColorCommand,
  setCompositionGroupVisibility as setCompositionGroupVisibilityCommand,
  setElementVisibility as setElementVisibilityCommand,
  setEpisodeName as setEpisodeNameCommand,
  setLayerPlaneVisibility as setLayerPlaneVisibilityCommand,
} from '../core/commands'
import {
  DEFAULT_ZOOM_FACTOR,
  boundsIntersectViewport,
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
  type ElementBounds,
  type EpisodeDocument,
  type ImageAssetReference,
} from '../core/episode'
import {
  ASSET_LIBRARY_SNAPSHOT_FORMAT_VERSION,
  BUILT_IN_ASSETS,
  createIndexedDbAssetRepository,
  createRuntimeImportedImage,
  importBrowserImage,
  revokeRuntimeImportedImages,
  type AssetLibrarySnapshot,
  type AssetLibrarySnapshotTransform,
  type AssetRepository,
  type BrowserImageFile,
  type CreatorAssetCategorySnapshot,
  type ImportedImageSnapshot,
  type ResolvedImageAsset,
  type RuntimeImportedImage,
} from '../assets'
import { isSafeCreatorCategoryName } from '../assets/validation'
import {
  createLocalStorageProjectRepository,
  getBrowserLocalStorage,
} from '../persistence/projectRepository'

export type AssetLibraryStatus = 'idle' | 'loading' | 'ready' | 'error'
export type AssetLibraryMessageKind = 'info' | 'success' | 'error'

interface EditorState {
  readonly episode: EpisodeDocument
  readonly historyPast: readonly HistoryCheckpoint[]
  readonly historyFuture: readonly HistoryCheckpoint[]
  readonly episodeHeightResizeStart: HistoryCheckpoint | null
  readonly currentRevision: number
  readonly nextRevision: number
  readonly savedRevision: number | null
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly hasUnsavedChanges: boolean
  readonly hasSavedEpisode: boolean
  readonly documentStatus: string
  readonly selectedElementId: string | null
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
  readonly deleteLayerPlane: (layerPlaneId: string) => void
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
  readonly selectElement: (elementId: string | null, reveal?: boolean) => void
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
  readonly deleteElement: (elementId: string) => void
  readonly placeSyntheticAsset: (input: {
    readonly name: string
    readonly fill: string
  }) => void
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
  readonly toggleMagnet: () => void
  readonly toggleSliceGuides: () => void
  readonly toggleAssetPanel: () => void
  readonly openAssetPanel: () => void
  readonly closeAssetPanel: () => void
  readonly initializeAssetLibrary: () => Promise<boolean>
  readonly createCreatorAssetCategory: (
    name: string,
  ) => Promise<string | null>
  readonly importImageAsset: (
    file: BrowserImageFile,
    creatorCategoryId?: string | null,
  ) => Promise<boolean>
  readonly placeBuiltInAsset: (assetId: string) => boolean
  readonly placeImportedAsset: (assetId: string) => boolean
  readonly undo: () => void
  readonly redo: () => void
  readonly saveEpisode: () => void
  readonly reopenEpisode: () => boolean
  readonly newEpisode: () => void
  readonly resetEpisode: () => void
}

interface HistoryCheckpoint {
  readonly episode: EpisodeDocument
  readonly selectedElementId: string | null
  readonly activeCompositionGroup: CompositionGroup
  readonly activeLayerPlaneId: string
  readonly revision: number
}

const INITIAL_VIEWPORT_LOGICAL_HEIGHT = 900
const INITIAL_COMPOSITION_GROUP = 'content' as const
const INITIAL_LAYER_PLANE_ID = BUILD_WEEK_LAYER_PLANE_IDS.contentPanels
const HISTORY_LIMIT = 100
const DEFAULT_IMAGE_VIEWPORT_FRACTION = 0.6

let assetRepositoryOverride: AssetRepository | undefined

export function setAssetRepositoryForTesting(
  repository: AssetRepository | undefined,
): void {
  assetRepositoryOverride = repository
}

function getAssetRepository(): AssetRepository {
  return assetRepositoryOverride ?? createIndexedDbAssetRepository()
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

function synchronizeRuntimeImportedImages(
  currentImages: readonly RuntimeImportedImage[],
  persistedImages: readonly ImportedImageSnapshot[],
): readonly RuntimeImportedImage[] {
  const currentById = new Map(currentImages.map((image) => [image.id, image]))
  const createdImages: RuntimeImportedImage[] = []

  try {
    const synchronized = persistedImages.map((snapshot) => {
      const current = currentById.get(snapshot.id)

      if (current) return current

      const created = createRuntimeImportedImage(snapshot)
      createdImages.push(created)
      return created
    })
    const synchronizedIds = new Set(synchronized.map(({ id }) => id))

    revokeRuntimeImportedImages(
      currentImages.filter(({ id }) => !synchronizedIds.has(id)),
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

  return {
    x: state.viewportX + (state.viewportLogicalWidth - width) / 2,
    y: state.viewportY + (state.viewportLogicalHeight - height) / 2,
    width,
    height,
  }
}

function placeImageAssetInEpisode(
  state: EditorState,
  asset: ResolvedImageAsset,
  assetReference: ImageAssetReference,
): EpisodeDocument | undefined {
  const bounds = getCenteredImageBounds(
    state,
    asset.intrinsicWidth,
    asset.intrinsicHeight,
  )

  if (!bounds) {
    return undefined
  }

  return createImageElementCommand(state.episode, {
    layerPlaneId: state.activeLayerPlaneId,
    name: asset.displayName,
    assetReference,
    bounds,
  })
}

function createHistoryCheckpoint(state: EditorState): HistoryCheckpoint {
  return {
    episode: state.episode,
    selectedElementId: state.selectedElementId,
    activeCompositionGroup: state.activeCompositionGroup,
    activeLayerPlaneId: state.activeLayerPlaneId,
    revision: state.currentRevision,
  }
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

  return {
    ...patch,
    episode,
    historyPast: appendHistoryCheckpoint(
      state.historyPast,
      createHistoryCheckpoint(state),
    ),
    historyFuture: [],
    episodeHeightResizeStart: null,
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
    return {
      selectedElementId: selectedElement.id,
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

const initialLoadResult = getProjectRepository().loadLast()
const initialEpisode = initialLoadResult.ok
  ? initialLoadResult.episode
  : buildWeekEpisode
const initialEditorContext = getDefaultEditorContext(initialEpisode)
const initialDocumentStatus = initialLoadResult.ok
  ? 'Opened saved episode'
  : initialLoadResult.reason === 'not-found' ||
      initialLoadResult.reason === 'storage-unavailable'
    ? 'Demo ready · not saved'
    : `${initialLoadResult.message} Demo loaded instead.`

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
  currentRevision: 0,
  nextRevision: 1,
  savedRevision: 0,
  canUndo: false,
  canRedo: false,
  hasUnsavedChanges: false,
  hasSavedEpisode: initialLoadResult.ok,
  documentStatus: initialDocumentStatus,
  selectedElementId: null,
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

  deleteLayerPlane: (layerPlaneId) => {
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
      const episode = deleteEmptyLayerPlaneCommand(
        state.episode,
        layerPlaneId,
      )

      if (episode === state.episode || deletedIndex < 0) {
        return state
      }

      const previousLayerPlane = groupLayerPlanes[deletedIndex - 1]
      const nextLayerPlane = groupLayerPlanes[deletedIndex + 1]
      const survivorId = previousLayerPlane?.id ?? nextLayerPlane?.id
      const survivor = survivorId
        ? getLayerPlaneById(episode, survivorId)
        : undefined

      if (!survivor) {
        return state
      }

      return commitEpisodeChange(state, episode, {
        activeCompositionGroup: layerPlane.compositionGroup,
        activeLayerPlaneId: survivor.id,
        selectedElementId: null,
        liveElementBounds: null,
      })
    })
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

  selectElement: (elementId, reveal = false) => {
    set((state) => {
      if (!elementId) {
        return { selectedElementId: null, liveElementBounds: null }
      }

      const element = state.episode.elements.find(({ id }) => id === elementId)
      const compositionGroup = element
        ? getElementCompositionGroup(state.episode, element)
        : undefined

      if (!element || !compositionGroup) {
        return { selectedElementId: null, liveElementBounds: null }
      }

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
        selectedElementId: element.id,
        liveElementBounds: null,
        activeCompositionGroup: compositionGroup,
        activeLayerPlaneId: element.layerPlaneId,
        viewportX: reveal && !isVisible ? revealedPosition.x : state.viewportX,
        viewportY: reveal && !isVisible ? revealedPosition.y : state.viewportY,
      }
    })
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

  deleteElement: (elementId) => {
    set((state) => {
      const episode = deleteElementCommand(state.episode, elementId)

      if (episode === state.episode) {
        return state
      }

      return commitEpisodeChange(state, episode, {
        selectedElementId:
          state.selectedElementId === elementId
            ? null
            : state.selectedElementId,
        liveElementBounds:
          state.liveElementBounds?.elementId === elementId
            ? null
            : state.liveElementBounds,
      })
    })
  },

  placeSyntheticAsset: ({ name, fill }) => {
    set((state) => {
      const width = 150
      const height = 110
      const episode = createSyntheticShapeElementCommand(state.episode, {
        layerPlaneId: state.activeLayerPlaneId,
        name,
        fill,
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
    set((state) =>
      commitEpisodeChange(
        state,
        moveElementCommand(state.episode, elementId, logicalPosition),
        {
          liveElementBounds:
            state.liveElementBounds?.elementId === elementId
              ? null
              : state.liveElementBounds,
        },
      ),
    )
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
          'Choose an existing My Library category before uploading.',
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

  placeBuiltInAsset: (assetId) => {
    const state = get()
    const activeLayerPlane = getLayerPlaneById(
      state.episode,
      state.activeLayerPlaneId,
    )
    const builtIn = BUILT_IN_ASSETS.find((asset) => asset.id === assetId)

    if (!builtIn) {
      set({
        assetLibraryMessage: 'That built-in asset is unavailable.',
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    if (activeLayerPlane?.kind !== 'ordinary') {
      set({
        assetLibraryMessage:
          'Select a numbered layer plane before placing an asset.',
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    const asset: ResolvedImageAsset = {
      id: builtIn.id,
      displayName: builtIn.displayName,
      intrinsicWidth: builtIn.intrinsicWidth,
      intrinsicHeight: builtIn.intrinsicHeight,
      sourceUrl: builtIn.source,
    }
    const episode = placeImageAssetInEpisode(state, asset, {
      kind: 'built-in',
      assetId: builtIn.id,
    })

    if (!episode) {
      set({
        assetLibraryMessage:
          'This asset cannot fit inside the episode at a usable size.',
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    if (episode === state.episode) {
      return false
    }

    const createdElement = episode.elements.at(-1)
    set(
      commitEpisodeChange(state, episode, {
        selectedElementId: createdElement?.id ?? state.selectedElementId,
        liveElementBounds: null,
        assetLibraryMessage: `Placed “${builtIn.displayName}”.`,
        assetLibraryMessageKind: 'success',
      }),
    )
    return true
  },

  placeImportedAsset: (assetId) => {
    const state = get()
    const activeLayerPlane = getLayerPlaneById(
      state.episode,
      state.activeLayerPlaneId,
    )
    const imported = state.importedImageAssets.find(
      (asset) => asset.id === assetId,
    )

    if (!imported) {
      set({
        assetLibraryMessage: 'That imported asset source is unavailable.',
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    if (activeLayerPlane?.kind !== 'ordinary') {
      set({
        assetLibraryMessage:
          'Select a numbered layer plane before placing an asset.',
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    const episode = placeImageAssetInEpisode(state, imported, {
      kind: 'imported',
      assetId: imported.id,
    })

    if (!episode) {
      set({
        assetLibraryMessage:
          'This image cannot fit inside the episode at a usable size.',
        assetLibraryMessageKind: 'error',
      })
      return false
    }

    if (episode === state.episode) {
      return false
    }

    const createdElement = episode.elements.at(-1)
    set(
      commitEpisodeChange(state, episode, {
        selectedElementId: createdElement?.id ?? state.selectedElementId,
        liveElementBounds: null,
        assetLibraryMessage: `Placed “${imported.displayName}”.`,
        assetLibraryMessageKind: 'success',
      }),
    )
    return true
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

  saveEpisode: () => {
    const state = get()
    const result = getProjectRepository().save(state.episode)

    if (!result.ok) {
      set({ documentStatus: result.message })
      return
    }

    set({
      savedRevision: state.currentRevision,
      hasSavedEpisode: true,
      hasUnsavedChanges: false,
      documentStatus: 'Saved locally',
    })
  },

  reopenEpisode: () => {
    const result = getProjectRepository().loadLast()

    if (!result.ok) {
      set({ documentStatus: result.message })
      return false
    }

    set((state) => {
      const context = getDefaultEditorContext(result.episode)
      const viewportDimensions = getViewportLogicalDimensions(
        result.episode,
        state.fitViewportLogicalHeight,
        DEFAULT_ZOOM_FACTOR,
      )
      const revision = state.nextRevision

      return {
        episode: result.episode,
        historyPast: [],
        historyFuture: [],
        episodeHeightResizeStart: null,
        currentRevision: revision,
        nextRevision: revision + 1,
        savedRevision: revision,
        canUndo: false,
        canRedo: false,
        hasUnsavedChanges: false,
        hasSavedEpisode: true,
        documentStatus: 'Reopened saved episode',
        selectedElementId: null,
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

    return true
  },

  newEpisode: () => {
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
        currentRevision: revision,
        nextRevision: revision + 1,
        savedRevision: null,
        canUndo: false,
        canRedo: false,
        hasUnsavedChanges: true,
        documentStatus: 'New episode · not saved',
        selectedElementId: null,
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
      const isSavedEpisodeAvailable = state.hasSavedEpisode

      return {
        episode: buildWeekEpisode,
        historyPast: [],
        historyFuture: [],
        episodeHeightResizeStart: null,
        currentRevision: revision,
        nextRevision: revision + 1,
        savedRevision: isSavedEpisodeAvailable
          ? state.savedRevision
          : revision,
        canUndo: false,
        canRedo: false,
        hasUnsavedChanges: isSavedEpisodeAvailable,
        documentStatus: isSavedEpisodeAvailable
          ? 'Demo reset · unsaved changes'
          : 'Demo reset · not saved',
        selectedElementId: null,
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
}))
