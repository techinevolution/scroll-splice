import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  BUILD_WEEK_LAYER_PLANE_IDS,
  buildWeekEpisode,
} from './fixtures/buildWeekEpisode'
import {
  setAssetRepositoryForTesting,
  useEditorStore,
} from './store'
import {
  ASSET_LIBRARY_SNAPSHOT_FORMAT_VERSION,
  parseAssetLibrarySnapshot,
  revokeRuntimeImportedImages,
  type AssetLibrarySnapshot,
  type AssetLibrarySnapshotTransform,
  type AssetRepository,
  type BrowserImageFile,
  type LoadAssetLibraryResult,
  type SaveAssetLibraryResult,
  type UpdateAssetLibraryResult,
} from '../assets'
import {
  DEFAULT_EPISODE_HEIGHT_INCREMENT,
  getEpisodeContentBottom,
} from '../core/commands'
import {
  getBackgroundBaseLayerPlane,
  getElementCompositionGroup,
  getLayerPlaneById,
  getLayerPlanesForGroup,
  type CompositionGroup,
  type EpisodeElement,
} from '../core/episode'

function fixtureElementInGroup(group: CompositionGroup): EpisodeElement {
  const element = buildWeekEpisode.elements.find(
    (candidate) =>
      getElementCompositionGroup(buildWeekEpisode, candidate) === group,
  )

  if (!element) {
    throw new Error(`Missing ${group} fixture element`)
  }

  return element
}

class MemoryAssetRepository implements AssetRepository {
  snapshot: AssetLibrarySnapshot | undefined
  loadCount = 0
  saveCount = 0

  constructor(snapshot?: AssetLibrarySnapshot) {
    this.snapshot = snapshot
  }

  async load(): Promise<LoadAssetLibraryResult> {
    this.loadCount += 1

    return this.snapshot
      ? { ok: true, snapshot: this.snapshot }
      : {
          ok: false,
          reason: 'not-found',
          message: 'No locally saved asset library was found.',
        }
  }

  async save(value: unknown): Promise<SaveAssetLibraryResult> {
    this.saveCount += 1
    const parsed = parseAssetLibrarySnapshot(value)

    if (!parsed.ok) {
      return {
        ok: false,
        reason:
          parsed.reason === 'unsupported-version'
            ? 'unsupported-version'
            : 'invalid-snapshot',
        message: parsed.message,
      }
    }

    this.snapshot = parsed.snapshot
    return { ok: true, savedAt: parsed.snapshot.savedAt }
  }

  async update(
    transform: AssetLibrarySnapshotTransform,
  ): Promise<UpdateAssetLibraryResult> {
    let transformed: unknown

    try {
      transformed = transform(this.snapshot)
    } catch {
      return {
        ok: false,
        reason: 'transform-failed',
        message: 'The asset-library update could not be prepared.',
      }
    }

    const parsed = parseAssetLibrarySnapshot(transformed)

    if (!parsed.ok) {
      return {
        ok: false,
        reason:
          parsed.reason === 'unsupported-version'
            ? 'unsupported-version'
            : 'invalid-snapshot',
        message: parsed.message,
      }
    }

    this.saveCount += 1
    this.snapshot = parsed.snapshot
    return { ok: true, snapshot: parsed.snapshot }
  }
}

function createNamedPngFile(
  name = 'transparent-overlay.png',
  width = 320,
  height = 180,
): BrowserImageFile {
  const header = new Uint8Array(24)
  header.set([137, 80, 78, 71, 13, 10, 26, 10])
  header.set([0, 0, 0, 13, 73, 72, 68, 82], 8)
  new DataView(header.buffer).setUint32(16, width)
  new DataView(header.buffer).setUint32(20, height)
  const file = new Blob([header], { type: 'image/png' }) as BrowserImageFile

  Object.defineProperty(file, 'name', { value: name })
  return file
}

function stubImageRuntime(width: number, height: number): void {
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ width, height, close: vi.fn() })),
  )
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:scrollsplice-test')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
}

describe('editor store', () => {
  beforeEach(() => {
    revokeRuntimeImportedImages(
      useEditorStore.getState().importedImageAssets,
    )
    setAssetRepositoryForTesting(undefined)
    useEditorStore.setState({
      assetLibraryStatus: 'idle',
      assetLibraryBusy: false,
      assetLibraryMessage: null,
      assetLibraryMessageKind: 'info',
      creatorAssetCategories: [],
      importedImageAssets: [],
    })
    useEditorStore.getState().resetEpisode()
    useEditorStore.getState().setFitViewportLogicalHeight(900)

    const state = useEditorStore.getState()
    useEditorStore.setState({
      hasSavedEpisode: false,
      savedRevision: state.currentRevision,
      hasUnsavedChanges: false,
      documentStatus: 'Demo ready · not saved',
    })
  })

  afterEach(() => {
    revokeRuntimeImportedImages(
      useEditorStore.getState().importedImageAssets,
    )
    useEditorStore.setState({
      assetLibraryStatus: 'idle',
      assetLibraryBusy: false,
      assetLibraryMessage: null,
      assetLibraryMessageKind: 'info',
      creatorAssetCategories: [],
      importedImageAssets: [],
    })
    setAssetRepositoryForTesting(undefined)
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('starts on a valid Content plane and reveals off-screen selections', () => {
    expect(useEditorStore.getState().activeCompositionGroup).toBe('content')
    expect(useEditorStore.getState().activeLayerPlaneId).toBe(
      BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
    )

    useEditorStore.getState().setViewportY(99_000)
    expect(useEditorStore.getState().viewportY).toBe(3_700)

    useEditorStore.getState().setViewportY(0)
    useEditorStore
      .getState()
      .selectElement('beat-06-dawn-caption', true)

    expect(useEditorStore.getState().selectedElementId).toBe(
      'beat-06-dawn-caption',
    )
    expect(useEditorStore.getState().activeLayerPlaneId).toBe(
      BUILD_WEEK_LAYER_PLANE_IDS.contentText,
    )
    expect(useEditorStore.getState().viewportY).toBeGreaterThan(3_000)
  })

  it('keeps a visible canvas selection at the current viewport position', () => {
    useEditorStore.getState().setViewportY(0)
    useEditorStore
      .getState()
      .selectElement('beat-01-stillness-title', false)

    expect(useEditorStore.getState().viewportY).toBe(0)
    expect(useEditorStore.getState().activeLayerPlaneId).toBe(
      BUILD_WEEK_LAYER_PLANE_IDS.contentText,
    )
  })

  it('activates the selected element group and plane', () => {
    const foregroundElement = fixtureElementInGroup('foreground')

    useEditorStore.getState().selectElement(foregroundElement.id)

    expect(useEditorStore.getState().selectedElementId).toBe(
      foregroundElement.id,
    )
    expect(useEditorStore.getState().activeCompositionGroup).toBe(
      'foreground',
    )
    expect(useEditorStore.getState().activeLayerPlaneId).toBe(
      foregroundElement.layerPlaneId,
    )
  })

  it('keeps hidden elements selected and selectable from Layers', () => {
    const elementId = 'beat-01-stillness-title'

    useEditorStore.getState().selectElement(elementId)
    useEditorStore.getState().setElementVisibility(elementId, false)
    expect(useEditorStore.getState().selectedElementId).toBe(elementId)

    useEditorStore.getState().setLayerPlaneVisibility(
      BUILD_WEEK_LAYER_PLANE_IDS.contentText,
      false,
    )
    expect(useEditorStore.getState().selectedElementId).toBe(elementId)

    useEditorStore
      .getState()
      .setCompositionGroupVisibility('content', false)
    expect(useEditorStore.getState().selectedElementId).toBe(elementId)

    useEditorStore.getState().selectElement(null)
    useEditorStore.getState().selectElement(elementId, true)
    expect(useEditorStore.getState().selectedElementId).toBe(elementId)
    expect(useEditorStore.getState().activeCompositionGroup).toBe('content')
    expect(useEditorStore.getState().activeLayerPlaneId).toBe(
      BUILD_WEEK_LAYER_PLANE_IDS.contentText,
    )
  })

  it('changes groups and planes without leaving an incompatible selection', () => {
    useEditorStore
      .getState()
      .selectElement('beat-01-stillness-title')
    useEditorStore.getState().setActiveCompositionGroup('content')
    expect(useEditorStore.getState().selectedElementId).toBe(
      'beat-01-stillness-title',
    )

    useEditorStore.getState().setActiveCompositionGroup('background')
    expect(useEditorStore.getState().selectedElementId).toBeNull()
    expect(useEditorStore.getState().activeLayerPlaneId).toBe(
      BUILD_WEEK_LAYER_PLANE_IDS.backgroundBase,
    )

    useEditorStore
      .getState()
      .setActiveLayerPlane(BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree)
    expect(useEditorStore.getState().activeLayerPlaneId).toBe(
      BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
    )

    useEditorStore
      .getState()
      .setActiveLayerPlane(BUILD_WEEK_LAYER_PLANE_IDS.contentText)
    expect(useEditorStore.getState().activeLayerPlaneId).toBe(
      BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
    )
  })

  it('appends and selects a new ordinary plane in the active group', () => {
    const before = getLayerPlanesForGroup(
      useEditorStore.getState().episode,
      'content',
    )

    useEditorStore.getState().createLayerPlane()

    const state = useEditorStore.getState()
    const after = getLayerPlanesForGroup(state.episode, 'content')

    expect(after).toHaveLength(before.length + 1)
    expect(after.at(-1)).toEqual({
      id: 'content-plane-3',
      kind: 'ordinary',
      compositionGroup: 'content',
      order: 3,
      visible: true,
    })
    expect(state.activeLayerPlaneId).toBe('content-plane-3')
    expect(state.selectedElementId).toBeNull()
  })

  it('deletes an empty plane and activates the nearest lower survivor', () => {
    useEditorStore.getState().createLayerPlane()
    useEditorStore.getState().createLayerPlane()

    expect(useEditorStore.getState().activeLayerPlaneId).toBe(
      'content-plane-4',
    )

    useEditorStore.getState().deleteLayerPlane('content-plane-3')

    const state = useEditorStore.getState()
    const layerPlanes = getLayerPlanesForGroup(state.episode, 'content')

    expect(layerPlanes.map(({ id }) => id)).toEqual([
      BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
      BUILD_WEEK_LAYER_PLANE_IDS.contentText,
      'content-plane-4',
    ])
    expect(layerPlanes.map(({ order }) => order)).toEqual([1, 2, 3])
    expect(state.activeCompositionGroup).toBe('content')
    expect(state.activeLayerPlaneId).toBe(
      BUILD_WEEK_LAYER_PLANE_IDS.contentText,
    )
    expect(state.selectedElementId).toBeNull()
  })

  it('activates the deleted plane group and clears selection after deletion', () => {
    useEditorStore.getState().setActiveCompositionGroup('background')
    useEditorStore.getState().createLayerPlane()
    useEditorStore
      .getState()
      .selectElement('beat-01-stillness-title')

    expect(useEditorStore.getState().activeCompositionGroup).toBe('content')
    expect(useEditorStore.getState().selectedElementId).toBe(
      'beat-01-stillness-title',
    )

    useEditorStore.getState().deleteLayerPlane('background-plane-3')

    const state = useEditorStore.getState()
    expect(state.activeCompositionGroup).toBe('background')
    expect(state.activeLayerPlaneId).toBe(
      BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
    )
    expect(state.selectedElementId).toBeNull()
  })

  it('preserves editor state when plane deletion is guarded', () => {
    useEditorStore
      .getState()
      .setActiveLayerPlane(BUILD_WEEK_LAYER_PLANE_IDS.contentText)

    const textElements = useEditorStore
      .getState()
      .episode.elements.filter(
        ({ layerPlaneId }) =>
          layerPlaneId === BUILD_WEEK_LAYER_PLANE_IDS.contentText,
      )

    for (const element of textElements) {
      useEditorStore.getState().setElementVisibility(element.id, false)
    }

    useEditorStore
      .getState()
      .selectElement('beat-01-stillness-title')

    const stateBeforePopulatedDeletion = useEditorStore.getState()
    useEditorStore
      .getState()
      .deleteLayerPlane(BUILD_WEEK_LAYER_PLANE_IDS.contentText)

    expect(useEditorStore.getState()).toBe(stateBeforePopulatedDeletion)
    expect(useEditorStore.getState().selectedElementId).toBe(
      'beat-01-stillness-title',
    )

    const stateBeforeBaseDeletion = useEditorStore.getState()
    useEditorStore
      .getState()
      .deleteLayerPlane(BUILD_WEEK_LAYER_PLANE_IDS.backgroundBase)

    expect(useEditorStore.getState()).toBe(stateBeforeBaseDeletion)
  })

  it('updates the episode name through the command and rejects blank names', () => {
    useEditorStore.getState().setEpisodeName('The First Sprout')
    expect(useEditorStore.getState().episode.name).toBe('The First Sprout')

    const namedEpisode = useEditorStore.getState().episode
    useEditorStore.getState().setEpisodeName('   ')

    expect(useEditorStore.getState().episode).toBe(namedEpisode)
    expect(useEditorStore.getState().episode.name).toBe('The First Sprout')
  })

  it('extends the episode without moving the viewport and resets both', () => {
    const originalHeight = buildWeekEpisode.logicalHeight

    useEditorStore
      .getState()
      .selectElement('beat-01-stillness-title')
    useEditorStore.getState().setViewportY(1_600)
    useEditorStore.getState().setEpisodeName('A Longer Episode')
    useEditorStore.getState().extendEpisodeHeight()

    const extendedState = useEditorStore.getState()
    expect(extendedState.episode.logicalHeight).toBe(
      originalHeight + DEFAULT_EPISODE_HEIGHT_INCREMENT,
    )
    expect(extendedState.viewportY).toBe(1_600)
    expect(extendedState.viewportLogicalHeight).toBe(900)
    expect(extendedState.selectedElementId).toBe(
      'beat-01-stillness-title',
    )
    expect(extendedState.activeCompositionGroup).toBe('content')
    expect(extendedState.activeLayerPlaneId).toBe(
      BUILD_WEEK_LAYER_PLANE_IDS.contentText,
    )
    expect(extendedState.episode.name).toBe('A Longer Episode')

    useEditorStore.getState().resetEpisode()

    expect(useEditorStore.getState().episode).toBe(buildWeekEpisode)
    expect(useEditorStore.getState().episode.logicalHeight).toBe(
      originalHeight,
    )
    expect(useEditorStore.getState().episode.name).toBe(
      buildWeekEpisode.name,
    )
    expect(useEditorStore.getState().viewportY).toBe(0)
  })

  it('moves through the command and resets the known demo state', () => {
    const elementId = 'beat-01-stillness-accent-2'

    useEditorStore.getState().moveElement(elementId, { x: 500, y: 600 })
    expect(
      useEditorStore
        .getState()
        .episode.elements.find(({ id }) => id === elementId)?.bounds.x,
    ).toBe(500)

    useEditorStore.getState().resetEpisode()

    expect(useEditorStore.getState().episode).toBe(buildWeekEpisode)
    expect(useEditorStore.getState().selectedElementId).toBeNull()
    expect(useEditorStore.getState().activeCompositionGroup).toBe('content')
    expect(useEditorStore.getState().activeLayerPlaneId).toBe(
      BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
    )
    expect(useEditorStore.getState().viewportY).toBe(0)
  })

  it('previews live element bounds without mutating the episode and clears on commit', () => {
    const elementId = 'beat-01-stillness-accent-2'
    const episode = useEditorStore.getState().episode

    expect(useEditorStore.getState().liveElementBounds).toBeNull()
    useEditorStore.getState().selectElement(elementId)
    useEditorStore.getState().previewElementBounds(elementId, {
      x: 400,
      y: 500,
      width: 60,
      height: 60,
    })

    expect(useEditorStore.getState().episode).toBe(episode)
    expect(useEditorStore.getState().liveElementBounds).toEqual({
      elementId,
      bounds: { x: 400, y: 500, width: 60, height: 60 },
    })

    useEditorStore.getState().clearElementBoundsPreview('different-element')
    expect(useEditorStore.getState().liveElementBounds).not.toBeNull()

    useEditorStore.getState().clearElementBoundsPreview(elementId)
    expect(useEditorStore.getState().liveElementBounds).toBeNull()
    useEditorStore.getState().previewElementBounds(elementId, {
      x: 400,
      y: 500,
      width: 60,
      height: 60,
    })

    useEditorStore.getState().moveElement(elementId, { x: 400, y: 500 })
    expect(useEditorStore.getState().liveElementBounds).toBeNull()
    expect(
      useEditorStore
        .getState()
        .episode.elements.find(({ id }) => id === elementId)?.bounds,
    ).toMatchObject({ x: 400, y: 500 })
  })

  it('clears stale live bounds on selection changes, deletion, and reset', () => {
    const elementId = 'beat-01-stillness-accent-2'
    const previewBounds = { x: 400, y: 500, width: 60, height: 60 }

    useEditorStore.getState().selectElement(elementId)
    useEditorStore
      .getState()
      .previewElementBounds(elementId, previewBounds)
    useEditorStore
      .getState()
      .selectElement('beat-01-stillness-title')
    expect(useEditorStore.getState().liveElementBounds).toBeNull()

    useEditorStore.getState().selectElement(elementId)
    useEditorStore
      .getState()
      .previewElementBounds(elementId, previewBounds)
    useEditorStore.getState().deleteElement(elementId)
    expect(useEditorStore.getState().liveElementBounds).toBeNull()

    useEditorStore.getState().resetEpisode()
    useEditorStore.getState().selectElement(elementId)
    useEditorStore
      .getState()
      .previewElementBounds(elementId, previewBounds)
    useEditorStore.getState().setActiveCompositionGroup('background')
    expect(useEditorStore.getState().liveElementBounds).toBeNull()

    useEditorStore.getState().resetEpisode()
    useEditorStore.getState().selectElement(elementId)
    useEditorStore
      .getState()
      .previewElementBounds(elementId, previewBounds)
    useEditorStore.getState().resetEpisode()
    expect(useEditorStore.getState().liveElementBounds).toBeNull()
  })

  it('resizes through the command and restores the fixture on reset', () => {
    const elementId = 'beat-01-stillness-accent-2'
    const before = useEditorStore
      .getState()
      .episode.elements.find(({ id }) => id === elementId)

    expect(before).toBeDefined()
    if (!before) {
      throw new Error('Missing resize fixture element')
    }

    useEditorStore.getState().selectElement(elementId)
    useEditorStore.getState().previewElementBounds(elementId, {
      ...before.bounds,
      width: before.bounds.width * 1.5,
      height: before.bounds.height * 1.5,
    })
    expect(useEditorStore.getState().liveElementBounds).not.toBeNull()
    useEditorStore.getState().resizeElement(elementId, {
      ...before.bounds,
      width: before.bounds.width * 1.5,
      height: before.bounds.height * 1.5,
    })

    const resized = useEditorStore
      .getState()
      .episode.elements.find(({ id }) => id === elementId)
    expect(resized?.bounds.width).toBe(before.bounds.width * 1.5)
    expect(resized?.bounds.height).toBe(before.bounds.height * 1.5)
    expect(useEditorStore.getState().liveElementBounds).toBeNull()

    useEditorStore.getState().resetEpisode()
    expect(useEditorStore.getState().episode).toBe(buildWeekEpisode)
  })

  it('defaults editor guides on, toggles them without changing the episode, and resets them', () => {
    const episode = useEditorStore.getState().episode

    expect(useEditorStore.getState().magnetEnabled).toBe(true)
    expect(useEditorStore.getState().sliceGuidesVisible).toBe(true)

    useEditorStore.getState().toggleMagnet()
    useEditorStore.getState().toggleSliceGuides()

    expect(useEditorStore.getState().magnetEnabled).toBe(false)
    expect(useEditorStore.getState().sliceGuidesVisible).toBe(false)
    expect(useEditorStore.getState().episode).toBe(episode)

    useEditorStore.getState().resetEpisode()
    expect(useEditorStore.getState().magnetEnabled).toBe(true)
    expect(useEditorStore.getState().sliceGuidesVisible).toBe(true)
  })

  it('restores planes, base color, and visibility on reset', () => {
    useEditorStore.getState().setActiveCompositionGroup('background')
    useEditorStore.getState().createLayerPlane()
    useEditorStore.getState().setBaseColor('#123456')
    useEditorStore.getState().setLayerPlaneVisibility(
      BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
      false,
    )
    useEditorStore
      .getState()
      .setCompositionGroupVisibility('background', false)

    expect(
      getLayerPlanesForGroup(useEditorStore.getState().episode, 'background'),
    ).toHaveLength(3)
    expect(
      getBackgroundBaseLayerPlane(useEditorStore.getState().episode)
        ?.baseColor,
    ).toBe('#123456')

    useEditorStore.getState().resetEpisode()

    const state = useEditorStore.getState()
    expect(state.episode).toBe(buildWeekEpisode)
    expect(getLayerPlanesForGroup(state.episode, 'background')).toHaveLength(2)
    expect(getBackgroundBaseLayerPlane(state.episode)?.baseColor).toBe(
      '#F3F0EA',
    )
    expect(
      getLayerPlaneById(
        state.episode,
        BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
      )?.visible,
    ).toBe(true)
    expect(state.episode.compositionGroupVisibility.background).toBe(true)
    expect(state.activeCompositionGroup).toBe('content')
    expect(state.activeLayerPlaneId).toBe(
      BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
    )
  })

  it('deletes only the requested placed element and clears its selection', () => {
    const deletedId = 'beat-01-stillness-background'
    const unrelatedId = 'beat-02-spark-background'

    useEditorStore.getState().selectElement(deletedId)
    useEditorStore.getState().deleteElement(deletedId)

    expect(
      useEditorStore
        .getState()
        .episode.elements.some(({ id }) => id === deletedId),
    ).toBe(false)
    expect(
      useEditorStore
        .getState()
        .episode.elements.some(({ id }) => id === unrelatedId),
    ).toBe(true)
    expect(useEditorStore.getState().selectedElementId).toBeNull()
  })

  it('places a synthetic asset into a populated ordinary plane', () => {
    const beforeCount = useEditorStore.getState().episode.elements.length

    useEditorStore.getState().placeSyntheticAsset({
      name: 'Violet demo shape',
      fill: '#7050B8',
    })

    const state = useEditorStore.getState()
    const placed = state.episode.elements.at(-1)
    expect(state.episode.elements).toHaveLength(beforeCount + 1)
    expect(placed).toMatchObject({
      id: 'synthetic-shape-1',
      name: 'Violet demo shape',
      layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
      fill: { kind: 'solid', color: '#7050B8' },
    })
    expect(state.selectedElementId).toBe(placed?.id)
  })

  it('hydrates the persistent asset library once and creates runtime previews', async () => {
    stubImageRuntime(320, 180)
    const sourceBlob = createNamedPngFile()
    const repository = new MemoryAssetRepository({
      formatVersion: ASSET_LIBRARY_SNAPSHOT_FORMAT_VERSION,
      savedAt: '2026-07-15T17:00:00.000Z',
      creatorCategories: [
        {
          id: 'creator-category-effects',
          name: 'Effects',
          createdAt: '2026-07-15T16:00:00.000Z',
        },
      ],
      importedImages: [
        {
          id: 'imported-overlay',
          displayName: 'transparent-overlay.png',
          mediaType: 'image/png',
          byteSize: sourceBlob.size,
          intrinsicWidth: 320,
          intrinsicHeight: 180,
          sourceBlob,
          creatorCategoryId: 'creator-category-effects',
          importedAt: '2026-07-15T16:30:00.000Z',
        },
      ],
    })
    setAssetRepositoryForTesting(repository)

    await expect(
      useEditorStore.getState().initializeAssetLibrary(),
    ).resolves.toBe(true)
    await expect(
      useEditorStore.getState().initializeAssetLibrary(),
    ).resolves.toBe(true)

    const state = useEditorStore.getState()
    expect(repository.loadCount).toBe(1)
    expect(state.assetLibraryStatus).toBe('ready')
    expect(state.creatorAssetCategories).toHaveLength(1)
    expect(state.importedImageAssets).toEqual([
      expect.objectContaining({
        id: 'imported-overlay',
        sourceBlob,
        sourceUrl: 'blob:scrollsplice-test',
      }),
    ])
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
  })

  it('blocks library mutations when saved sources fail to hydrate', async () => {
    let saveCount = 0
    const repository: AssetRepository = {
      async load() {
        return {
          ok: false,
          reason: 'read-failed',
          message: 'The saved asset library could not be read.',
        }
      },
      async save() {
        saveCount += 1
        return { ok: true, savedAt: '2026-07-15T18:00:00.000Z' }
      },
      async update() {
        saveCount += 1
        return {
          ok: false,
          reason: 'read-failed',
          message: 'The saved asset library could not be read.',
        }
      },
    }
    setAssetRepositoryForTesting(repository)

    await expect(
      useEditorStore.getState().initializeAssetLibrary(),
    ).resolves.toBe(false)
    expect(useEditorStore.getState().assetLibraryStatus).toBe('error')

    await expect(
      useEditorStore.getState().createCreatorAssetCategory('Effects'),
    ).resolves.toBeNull()
    await expect(
      useEditorStore
        .getState()
        .importImageAsset(createNamedPngFile()),
    ).resolves.toBe(false)
    expect(saveCount).toBe(0)
    expect(useEditorStore.getState().creatorAssetCategories).toHaveLength(0)
    expect(useEditorStore.getState().importedImageAssets).toHaveLength(0)
  })

  it('persists creator categories outside episode history and keeps them across document boundaries', async () => {
    const repository = new MemoryAssetRepository()
    setAssetRepositoryForTesting(repository)
    await useEditorStore.getState().initializeAssetLibrary()
    const episode = useEditorStore.getState().episode
    const historyCount = useEditorStore.getState().historyPast.length

    const categoryId = await useEditorStore
      .getState()
      .createCreatorAssetCategory('  Effects  ')

    expect(categoryId).toMatch(/^creator-category-/)
    expect(repository.snapshot?.creatorCategories).toEqual([
      expect.objectContaining({ id: categoryId, name: 'Effects' }),
    ])
    expect(useEditorStore.getState().episode).toBe(episode)
    expect(useEditorStore.getState().historyPast).toHaveLength(historyCount)
    expect(
      await useEditorStore
        .getState()
        .createCreatorAssetCategory('effects'),
    ).toBeNull()
    expect(repository.saveCount).toBe(1)

    const categories = useEditorStore.getState().creatorAssetCategories
    useEditorStore.getState().newEpisode()
    expect(useEditorStore.getState().creatorAssetCategories).toBe(categories)
    useEditorStore.getState().resetEpisode()
    expect(useEditorStore.getState().creatorAssetCategories).toBe(categories)
  })

  it('merges asset-library updates committed by another tab into the current view', async () => {
    stubImageRuntime(320, 180)
    const repository = new MemoryAssetRepository()
    setAssetRepositoryForTesting(repository)
    await useEditorStore.getState().initializeAssetLibrary()
    const sourceBlob = createNamedPngFile('remote-overlay.png')

    repository.snapshot = {
      formatVersion: ASSET_LIBRARY_SNAPSHOT_FORMAT_VERSION,
      savedAt: '2026-07-15T18:00:00.000Z',
      creatorCategories: [
        {
          id: 'creator-category-remote',
          name: 'Remote effects',
          createdAt: '2026-07-15T17:50:00.000Z',
        },
      ],
      importedImages: [
        {
          id: 'imported-remote-overlay',
          displayName: 'remote-overlay.png',
          mediaType: 'image/png',
          byteSize: sourceBlob.size,
          intrinsicWidth: 320,
          intrinsicHeight: 180,
          sourceBlob,
          creatorCategoryId: 'creator-category-remote',
          importedAt: '2026-07-15T17:55:00.000Z',
        },
      ],
    }

    await expect(
      useEditorStore.getState().createCreatorAssetCategory('Local effects'),
    ).resolves.toMatch(/^creator-category-/)

    expect(
      useEditorStore
        .getState()
        .creatorAssetCategories.map(({ name }) => name),
    ).toEqual(['Remote effects', 'Local effects'])
    expect(useEditorStore.getState().importedImageAssets).toEqual([
      expect.objectContaining({
        id: 'imported-remote-overlay',
        sourceBlob,
        sourceUrl: 'blob:scrollsplice-test',
      }),
    ])
  })

  it('imports an unchanged image source without adding episode history', async () => {
    stubImageRuntime(1_200, 600)
    const repository = new MemoryAssetRepository()
    setAssetRepositoryForTesting(repository)
    await useEditorStore.getState().initializeAssetLibrary()
    const categoryId = await useEditorStore
      .getState()
      .createCreatorAssetCategory('Panels')

    if (!categoryId) {
      throw new Error('The creator-category fixture was not created.')
    }

    const file = createNamedPngFile('  alpha-panel.png  ', 1_200, 600)
    const episode = useEditorStore.getState().episode
    const historyCount = useEditorStore.getState().historyPast.length

    await expect(
      useEditorStore.getState().importImageAsset(file, categoryId),
    ).resolves.toBe(true)

    const imported = useEditorStore.getState().importedImageAssets[0]
    expect(imported).toMatchObject({
      displayName: 'alpha-panel.png',
      intrinsicWidth: 1_200,
      intrinsicHeight: 600,
      sourceBlob: file,
      creatorCategoryId: categoryId,
      sourceUrl: 'blob:scrollsplice-test',
    })
    expect(repository.snapshot?.importedImages[0]?.sourceBlob).toBe(file)
    expect(useEditorStore.getState().episode).toBe(episode)
    expect(useEditorStore.getState().historyPast).toHaveLength(historyCount)
    await expect(
      useEditorStore.getState().importImageAsset(file, 'missing-category'),
    ).resolves.toBe(false)
    expect(repository.snapshot?.importedImages).toHaveLength(1)
  })

  it('places built-in images proportionally at viewport center through history', () => {
    useEditorStore.getState().setViewportY(1_000)
    const beforeCount = useEditorStore.getState().episode.elements.length
    const beforeHistoryCount = useEditorStore.getState().historyPast.length

    expect(
      useEditorStore
        .getState()
        .placeBuiltInAsset('builtin-speech-balloon-oval-v1'),
    ).toBe(true)

    const placed = useEditorStore.getState().episode.elements.at(-1)
    expect(placed).toMatchObject({
      id: 'image-element-1',
      type: 'image',
      layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
      bounds: { x: 220, y: 1_325, width: 360, height: 250 },
      assetReference: {
        kind: 'built-in',
        assetId: 'builtin-speech-balloon-oval-v1',
      },
    })
    expect(useEditorStore.getState().selectedElementId).toBe(placed?.id)
    expect(useEditorStore.getState().historyPast).toHaveLength(
      beforeHistoryCount + 1,
    )

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().episode.elements).toHaveLength(beforeCount)
    useEditorStore.getState().redo()
    expect(useEditorStore.getState().episode.elements.at(-1)).toEqual(placed)
  })

  it('places a dragged built-in at an explicit center and clamps it to the episode', () => {
    const beforeCount = useEditorStore.getState().episode.elements.length
    const beforeHistoryCount = useEditorStore.getState().historyPast.length

    expect(
      useEditorStore.getState().placeDraggedAsset(
        {
          kind: 'built-in',
          assetId: 'builtin-speech-balloon-oval-v1',
        },
        { x: 799, y: buildWeekEpisode.logicalHeight - 1 },
      ),
    ).toBe(true)

    const placed = useEditorStore.getState().episode.elements.at(-1)
    expect(placed).toMatchObject({
      type: 'image',
      bounds: {
        x: buildWeekEpisode.logicalWidth - 360,
        y: buildWeekEpisode.logicalHeight - 250,
        width: 360,
        height: 250,
      },
      assetReference: {
        kind: 'built-in',
        assetId: 'builtin-speech-balloon-oval-v1',
      },
    })
    expect(useEditorStore.getState().episode.elements).toHaveLength(
      beforeCount + 1,
    )
    expect(useEditorStore.getState().historyPast).toHaveLength(
      beforeHistoryCount + 1,
    )

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().episode.elements).toHaveLength(beforeCount)
    useEditorStore.getState().redo()
    expect(useEditorStore.getState().episode.elements.at(-1)).toEqual(placed)
  })

  it('places one imported source repeatedly without duplicating it and guards the base plane', async () => {
    stubImageRuntime(1_200, 600)
    const repository = new MemoryAssetRepository()
    setAssetRepositoryForTesting(repository)
    await useEditorStore.getState().initializeAssetLibrary()
    await useEditorStore
      .getState()
      .importImageAsset(createNamedPngFile('transparent-overlay.png', 1_200, 600))
    const imported = useEditorStore.getState().importedImageAssets[0]

    if (!imported) {
      throw new Error('The imported-image fixture was not created.')
    }

    expect(useEditorStore.getState().placeImportedAsset(imported.id)).toBe(true)
    expect(useEditorStore.getState().placeImportedAsset(imported.id)).toBe(true)

    const placed = useEditorStore
      .getState()
      .episode.elements.filter(({ type }) => type === 'image')
    expect(placed.map(({ id }) => id)).toEqual([
      'image-element-1',
      'image-element-2',
    ])
    expect(placed[0]?.bounds).toEqual({
      x: 160,
      y: 330,
      width: 480,
      height: 240,
    })
    expect(useEditorStore.getState().importedImageAssets).toHaveLength(1)

    useEditorStore.getState().setActiveCompositionGroup('background')
    const historyCount = useEditorStore.getState().historyPast.length
    expect(useEditorStore.getState().placeImportedAsset(imported.id)).toBe(false)
    expect(useEditorStore.getState().historyPast).toHaveLength(historyCount)
    expect(useEditorStore.getState().importedImageAssets).toHaveLength(1)
  })

  it('places a dragged imported source at its explicit logical center', async () => {
    stubImageRuntime(1_200, 600)
    const repository = new MemoryAssetRepository()
    setAssetRepositoryForTesting(repository)
    await useEditorStore.getState().initializeAssetLibrary()
    await useEditorStore
      .getState()
      .importImageAsset(createNamedPngFile('dragged-overlay.png', 1_200, 600))
    const imported = useEditorStore.getState().importedImageAssets[0]

    if (!imported) {
      throw new Error('The dragged imported-image fixture was not created.')
    }

    expect(
      useEditorStore.getState().placeDraggedAsset(
        { kind: 'imported', assetId: imported.id },
        { x: 100, y: 200 },
      ),
    ).toBe(true)

    expect(useEditorStore.getState().episode.elements.at(-1)).toMatchObject({
      type: 'image',
      bounds: { x: 0, y: 80, width: 480, height: 240 },
      assetReference: { kind: 'imported', assetId: imported.id },
    })

    useEditorStore.getState().setActiveCompositionGroup('background')
    const historyCount = useEditorStore.getState().historyPast.length
    expect(
      useEditorStore.getState().placeDraggedAsset(
        { kind: 'imported', assetId: imported.id },
        { x: 400, y: 400 },
      ),
    ).toBe(false)
    expect(useEditorStore.getState().historyPast).toHaveLength(historyCount)
    expect(useEditorStore.getState().assetLibraryMessage).toBe(
      'Select a numbered layer plane before placing an asset.',
    )
  })

  it('rejects an invalid dragged-asset center without changing history', () => {
    const historyCount = useEditorStore.getState().historyPast.length

    expect(
      useEditorStore.getState().placeDraggedAsset(
        {
          kind: 'built-in',
          assetId: 'builtin-decoration-radiance-v1',
        },
        { x: Number.NaN, y: 200 },
      ),
    ).toBe(false)
    expect(useEditorStore.getState().historyPast).toHaveLength(historyCount)
    expect(useEditorStore.getState().assetLibraryMessage).toBe(
      'The canvas drop position is invalid.',
    )
  })

  it('refuses image proportions that cannot fit at the minimum usable size', async () => {
    stubImageRuntime(10_000, 1)
    const repository = new MemoryAssetRepository()
    setAssetRepositoryForTesting(repository)
    await useEditorStore.getState().initializeAssetLibrary()
    await useEditorStore
      .getState()
      .importImageAsset(createNamedPngFile('extreme-strip.png', 10_000, 1))
    const imported = useEditorStore.getState().importedImageAssets[0]

    if (!imported) {
      throw new Error('The extreme-ratio image fixture was not imported.')
    }

    const historyCount = useEditorStore.getState().historyPast.length
    expect(useEditorStore.getState().placeImportedAsset(imported.id)).toBe(false)
    expect(useEditorStore.getState().historyPast).toHaveLength(historyCount)
    expect(useEditorStore.getState().assetLibraryMessage).toBe(
      'This image cannot fit inside the episode at a usable size.',
    )
  })

  it('closes the asset panel idempotently without changing document state', () => {
    const episode = useEditorStore.getState().episode
    const history = useEditorStore.getState().historyPast

    useEditorStore.getState().openAssetPanel()
    expect(useEditorStore.getState().assetPanelOpen).toBe(true)
    useEditorStore.getState().closeAssetPanel()
    useEditorStore.getState().closeAssetPanel()

    expect(useEditorStore.getState().assetPanelOpen).toBe(false)
    expect(useEditorStore.getState().episode).toBe(episode)
    expect(useEditorStore.getState().historyPast).toBe(history)
  })

  it('creates and selects a full-width region on an ordinary Background plane', () => {
    useEditorStore.getState().setActiveCompositionGroup('background')
    useEditorStore
      .getState()
      .setActiveLayerPlane(BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree)
    useEditorStore.getState().createBackgroundColorRegion({
      fill: '#123456',
      startY: 1200,
      height: 600,
    })

    const state = useEditorStore.getState()
    const region = state.episode.elements.at(-1)
    expect(region).toMatchObject({
      id: 'background-color-region-1',
      layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
      fill: { kind: 'solid', color: '#123456' },
      bounds: { x: 0, y: 1200, width: 800, height: 600 },
    })
    expect(state.selectedElementId).toBe(region?.id)
  })

  it('safely trims unused tail space and clamps the viewport', () => {
    const contentBottom = getEpisodeContentBottom(buildWeekEpisode)
    useEditorStore.getState().setViewportY(99_000)

    useEditorStore.getState().resizeEpisodeHeight(1)

    const state = useEditorStore.getState()
    expect(state.episode.logicalHeight).toBe(contentBottom)
    expect(state.viewportY).toBe(
      contentBottom - state.viewportLogicalHeight,
    )
  })

  it('keeps zoom transient, preserves center, and restores Fit Width', () => {
    const episode = useEditorStore.getState().episode
    useEditorStore.getState().setViewportPosition({ x: 0, y: 1800 })

    useEditorStore.getState().setZoomFactor(2)

    const zoomed = useEditorStore.getState()
    expect(zoomed.episode).toBe(episode)
    expect(zoomed.zoomFactor).toBe(2)
    expect(zoomed.viewportLogicalWidth).toBe(400)
    expect(zoomed.viewportLogicalHeight).toBe(450)
    expect(zoomed.viewportX).toBe(200)
    expect(zoomed.viewportY).toBe(2025)

    zoomed.panViewport({ x: 99_000, y: 99_000 })
    expect(useEditorStore.getState().viewportX).toBe(400)
    expect(useEditorStore.getState().viewportY).toBe(
      buildWeekEpisode.logicalHeight - 450,
    )

    useEditorStore.getState().setZoomFactor(1)
    expect(useEditorStore.getState().viewportLogicalWidth).toBe(800)
    expect(useEditorStore.getState().viewportX).toBe(0)
    expect(useEditorStore.getState().episode).toBe(episode)
  })

  it('resets zoom, viewport, created elements, and resized height', () => {
    useEditorStore.getState().placeSyntheticAsset({
      name: 'Mint demo shape',
      fill: '#8BE0C9',
    })
    useEditorStore.getState().resizeEpisodeHeight(8_000)
    useEditorStore.getState().setZoomFactor(2)
    useEditorStore.getState().setViewportPosition({ x: 300, y: 2_000 })

    useEditorStore.getState().resetEpisode()

    const state = useEditorStore.getState()
    expect(state.episode).toBe(buildWeekEpisode)
    expect(state.zoomFactor).toBe(1)
    expect(state.viewportX).toBe(0)
    expect(state.viewportY).toBe(0)
    expect(state.viewportLogicalWidth).toBe(800)
    expect(state.episode.elements).not.toContainEqual(
      expect.objectContaining({ id: 'synthetic-shape-1' }),
    )
  })

  it('undoes and redoes synthetic creation with its stable ID and selection', () => {
    const beforeCount = useEditorStore.getState().episode.elements.length
    const beforeHistoryCount = useEditorStore.getState().historyPast.length

    useEditorStore.getState().placeSyntheticAsset({
      name: 'History demo shape',
      fill: '#7050B8',
    })

    const created = useEditorStore.getState().episode.elements.at(-1)
    expect(created?.id).toBe('synthetic-shape-1')
    expect(useEditorStore.getState().selectedElementId).toBe(created?.id)
    expect(useEditorStore.getState().historyPast).toHaveLength(
      beforeHistoryCount + 1,
    )

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().episode.elements).toHaveLength(beforeCount)
    expect(
      useEditorStore
        .getState()
        .episode.elements.some(({ id }) => id === created?.id),
    ).toBe(false)
    expect(useEditorStore.getState().selectedElementId).toBeNull()

    useEditorStore.getState().redo()
    expect(useEditorStore.getState().episode.elements.at(-1)?.id).toBe(
      'synthetic-shape-1',
    )
    expect(useEditorStore.getState().selectedElementId).toBe(
      'synthetic-shape-1',
    )
  })

  it('restores and removes a selected element across delete undo and redo', () => {
    const elementId = 'beat-01-stillness-background'

    useEditorStore.getState().selectElement(elementId)
    useEditorStore.getState().deleteElement(elementId)

    expect(
      useEditorStore
        .getState()
        .episode.elements.some(({ id }) => id === elementId),
    ).toBe(false)
    expect(useEditorStore.getState().selectedElementId).toBeNull()

    useEditorStore.getState().undo()
    expect(
      useEditorStore
        .getState()
        .episode.elements.some(({ id }) => id === elementId),
    ).toBe(true)
    expect(useEditorStore.getState().selectedElementId).toBe(elementId)
    expect(useEditorStore.getState().activeLayerPlaneId).toBe(
      BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
    )

    useEditorStore.getState().redo()
    expect(
      useEditorStore
        .getState()
        .episode.elements.some(({ id }) => id === elementId),
    ).toBe(false)
    expect(useEditorStore.getState().selectedElementId).toBeNull()
  })

  it('records one history entry per committed move and resize, excluding live previews', () => {
    const elementId = 'beat-01-stillness-accent-2'
    const original = useEditorStore
      .getState()
      .episode.elements.find(({ id }) => id === elementId)

    expect(original).toBeDefined()
    if (!original) {
      throw new Error('Missing move and resize fixture element')
    }

    useEditorStore.getState().selectElement(elementId)
    const initialHistoryCount = useEditorStore.getState().historyPast.length
    const movedBounds = { ...original.bounds, x: 500, y: 600 }

    useEditorStore
      .getState()
      .previewElementBounds(elementId, movedBounds)
    expect(useEditorStore.getState().historyPast).toHaveLength(
      initialHistoryCount,
    )

    useEditorStore.getState().moveElement(elementId, movedBounds)
    expect(useEditorStore.getState().historyPast).toHaveLength(
      initialHistoryCount + 1,
    )
    expect(useEditorStore.getState().liveElementBounds).toBeNull()

    useEditorStore.getState().undo()
    expect(
      useEditorStore
        .getState()
        .episode.elements.find(({ id }) => id === elementId)?.bounds,
    ).toEqual(original.bounds)
    useEditorStore.getState().redo()

    const moved = useEditorStore
      .getState()
      .episode.elements.find(({ id }) => id === elementId)
    expect(moved).toBeDefined()
    if (!moved) {
      throw new Error('Missing moved fixture element')
    }

    const beforeResizeHistoryCount = useEditorStore.getState().historyPast.length
    const resizedBounds = {
      ...moved.bounds,
      width: moved.bounds.width * 1.5,
      height: moved.bounds.height * 1.5,
    }

    useEditorStore
      .getState()
      .previewElementBounds(elementId, resizedBounds)
    expect(useEditorStore.getState().historyPast).toHaveLength(
      beforeResizeHistoryCount,
    )

    useEditorStore.getState().resizeElement(elementId, resizedBounds)
    expect(useEditorStore.getState().historyPast).toHaveLength(
      beforeResizeHistoryCount + 1,
    )
    expect(useEditorStore.getState().liveElementBounds).toBeNull()

    useEditorStore.getState().undo()
    expect(
      useEditorStore
        .getState()
        .episode.elements.find(({ id }) => id === elementId)?.bounds,
    ).toEqual(moved.bounds)
  })

  it('undoes and redoes plane creation and deletion with stable IDs, order, and active plane', () => {
    const originalPlaneIds = getLayerPlanesForGroup(
      useEditorStore.getState().episode,
      'content',
    ).map(({ id }) => id)

    useEditorStore.getState().createLayerPlane()
    expect(useEditorStore.getState().activeLayerPlaneId).toBe('content-plane-3')
    expect(
      getLayerPlanesForGroup(useEditorStore.getState().episode, 'content').map(
        ({ id }) => id,
      ),
    ).toEqual([...originalPlaneIds, 'content-plane-3'])

    useEditorStore.getState().undo()
    expect(
      getLayerPlanesForGroup(useEditorStore.getState().episode, 'content').map(
        ({ id }) => id,
      ),
    ).toEqual(originalPlaneIds)
    expect(useEditorStore.getState().activeLayerPlaneId).toBe(
      BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
    )

    useEditorStore.getState().redo()
    expect(useEditorStore.getState().activeLayerPlaneId).toBe('content-plane-3')

    useEditorStore.getState().deleteLayerPlane('content-plane-3')
    expect(
      getLayerPlanesForGroup(useEditorStore.getState().episode, 'content').map(
        ({ id }) => id,
      ),
    ).toEqual(originalPlaneIds)
    expect(useEditorStore.getState().activeLayerPlaneId).toBe(
      BUILD_WEEK_LAYER_PLANE_IDS.contentText,
    )

    useEditorStore.getState().undo()
    const restoredPlanes = getLayerPlanesForGroup(
      useEditorStore.getState().episode,
      'content',
    )
    expect(restoredPlanes.map(({ id }) => id)).toEqual([
      ...originalPlaneIds,
      'content-plane-3',
    ])
    expect(restoredPlanes.map(({ order }) => order)).toEqual([1, 2, 3])
    expect(useEditorStore.getState().activeLayerPlaneId).toBe('content-plane-3')

    useEditorStore.getState().redo()
    expect(
      getLayerPlanesForGroup(useEditorStore.getState().episode, 'content').map(
        ({ id }) => id,
      ),
    ).toEqual(originalPlaneIds)
    expect(useEditorStore.getState().activeLayerPlaneId).toBe(
      BUILD_WEEK_LAYER_PLANE_IDS.contentText,
    )
  })

  it('tracks element, plane, group, and base-color layer changes through history', () => {
    const elementId = 'beat-01-stillness-title'
    const planeId = BUILD_WEEK_LAYER_PLANE_IDS.contentText
    const originalBaseColor = getBackgroundBaseLayerPlane(
      useEditorStore.getState().episode,
    )?.baseColor

    useEditorStore.getState().setElementVisibility(elementId, false)
    useEditorStore.getState().setLayerPlaneVisibility(planeId, false)
    useEditorStore
      .getState()
      .setCompositionGroupVisibility('content', false)
    useEditorStore.getState().setBaseColor('#123456')

    expect(useEditorStore.getState().historyPast).toHaveLength(4)
    expect(
      getBackgroundBaseLayerPlane(useEditorStore.getState().episode)?.baseColor,
    ).toBe('#123456')

    useEditorStore.getState().undo()
    expect(
      getBackgroundBaseLayerPlane(useEditorStore.getState().episode)?.baseColor,
    ).toBe(originalBaseColor)
    useEditorStore.getState().undo()
    expect(
      useEditorStore.getState().episode.compositionGroupVisibility.content,
    ).toBe(true)
    useEditorStore.getState().undo()
    expect(
      getLayerPlaneById(useEditorStore.getState().episode, planeId)?.visible,
    ).toBe(true)
    useEditorStore.getState().undo()
    expect(
      useEditorStore
        .getState()
        .episode.elements.find(({ id }) => id === elementId)?.visible,
    ).toBe(true)

    useEditorStore.getState().redo()
    useEditorStore.getState().redo()
    useEditorStore.getState().redo()
    useEditorStore.getState().redo()
    expect(
      useEditorStore
        .getState()
        .episode.elements.find(({ id }) => id === elementId)?.visible,
    ).toBe(false)
    expect(getLayerPlaneById(useEditorStore.getState().episode, planeId)?.visible).toBe(
      false,
    )
    expect(
      useEditorStore.getState().episode.compositionGroupVisibility.content,
    ).toBe(false)
    expect(
      getBackgroundBaseLayerPlane(useEditorStore.getState().episode)?.baseColor,
    ).toBe('#123456')
  })

  it('does not record no-ops or clear redo until a real branch edit occurs', () => {
    useEditorStore.getState().setEpisodeName('First history branch')
    useEditorStore.getState().undo()

    const beforeNoOp = useEditorStore.getState()
    useEditorStore
      .getState()
      .setElementVisibility('beat-01-stillness-title', true)

    expect(useEditorStore.getState().historyPast).toHaveLength(
      beforeNoOp.historyPast.length,
    )
    expect(useEditorStore.getState().historyFuture).toHaveLength(
      beforeNoOp.historyFuture.length,
    )
    expect(useEditorStore.getState().canRedo).toBe(true)

    useEditorStore.getState().setEpisodeName('Second history branch')
    expect(useEditorStore.getState().historyFuture).toHaveLength(0)
    expect(useEditorStore.getState().canRedo).toBe(false)
    expect(useEditorStore.getState().episode.name).toBe('Second history branch')
  })

  it('bounds document history to the latest one hundred changes', () => {
    for (let index = 0; index < 105; index += 1) {
      useEditorStore.getState().setEpisodeName(`History change ${index}`)
    }

    expect(useEditorStore.getState().historyPast).toHaveLength(100)
    expect(useEditorStore.getState().canUndo).toBe(true)
  })

  it('coalesces a height drag into one undo entry and restores a cancelled drag', () => {
    const originalHeight = useEditorStore.getState().episode.logicalHeight
    const originalRevision = useEditorStore.getState().currentRevision

    useEditorStore.getState().beginEpisodeHeightResize()
    useEditorStore.getState().resizeEpisodeHeight(originalHeight + 100, true)
    useEditorStore.getState().resizeEpisodeHeight(originalHeight + 200, true)
    useEditorStore.getState().resizeEpisodeHeight(originalHeight + 300, true)

    expect(useEditorStore.getState().episode.logicalHeight).toBe(
      originalHeight + 300,
    )
    expect(useEditorStore.getState().historyPast).toHaveLength(0)
    expect(useEditorStore.getState().currentRevision).toBe(originalRevision)

    useEditorStore.getState().endEpisodeHeightResize()
    expect(useEditorStore.getState().historyPast).toHaveLength(1)
    expect(useEditorStore.getState().currentRevision).not.toBe(originalRevision)

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().episode.logicalHeight).toBe(originalHeight)
    useEditorStore.getState().redo()
    expect(useEditorStore.getState().episode.logicalHeight).toBe(
      originalHeight + 300,
    )

    const beforeCancel = useEditorStore.getState()
    useEditorStore.getState().beginEpisodeHeightResize()
    useEditorStore.getState().resizeEpisodeHeight(originalHeight + 700, true)
    useEditorStore.getState().cancelEpisodeHeightResize()

    expect(useEditorStore.getState().episode.logicalHeight).toBe(
      originalHeight + 300,
    )
    expect(useEditorStore.getState().historyPast).toHaveLength(
      beforeCancel.historyPast.length,
    )
    expect(useEditorStore.getState().currentRevision).toBe(
      beforeCancel.currentRevision,
    )
  })

  it('coalesces an opacity gesture into one undo entry and restores cancelled or no-op gestures', () => {
    const elementId = 'beat-01-stillness-accent-2'
    const originalOpacity = useEditorStore
      .getState()
      .episode.elements.find(({ id }) => id === elementId)?.opacity

    expect(originalOpacity).toBeDefined()
    useEditorStore.getState().selectElement(elementId)
    useEditorStore.getState().beginElementOpacityEdit(elementId)
    useEditorStore.getState().previewElementOpacity(elementId, 0.8)
    useEditorStore.getState().previewElementOpacity(elementId, 0.5)
    useEditorStore.getState().previewElementOpacity(elementId, 0.25)

    expect(useEditorStore.getState().historyPast).toHaveLength(0)
    expect(
      useEditorStore
        .getState()
        .episode.elements.find(({ id }) => id === elementId)?.opacity,
    ).toBe(0.25)

    useEditorStore.getState().endElementOpacityEdit()
    expect(useEditorStore.getState().historyPast).toHaveLength(1)
    expect(useEditorStore.getState().canUndo).toBe(true)

    useEditorStore.getState().undo()
    expect(
      useEditorStore
        .getState()
        .episode.elements.find(({ id }) => id === elementId)?.opacity,
    ).toBe(originalOpacity)

    useEditorStore.getState().redo()
    expect(
      useEditorStore
        .getState()
        .episode.elements.find(({ id }) => id === elementId)?.opacity,
    ).toBe(0.25)

    const historyCount = useEditorStore.getState().historyPast.length
    useEditorStore.getState().beginElementOpacityEdit(elementId)
    useEditorStore.getState().previewElementOpacity(elementId, 0.6)
    useEditorStore.getState().cancelElementOpacityEdit()
    expect(
      useEditorStore
        .getState()
        .episode.elements.find(({ id }) => id === elementId)?.opacity,
    ).toBe(0.25)
    expect(useEditorStore.getState().historyPast).toHaveLength(historyCount)

    useEditorStore.getState().beginElementOpacityEdit(elementId)
    useEditorStore.getState().previewElementOpacity(elementId, 0.6)
    useEditorStore.getState().previewElementOpacity(elementId, 0.25)
    useEditorStore.getState().endElementOpacityEdit()
    expect(useEditorStore.getState().historyPast).toHaveLength(historyCount)
  })

  it('routes blend, gradient, and tile changes through document history', () => {
    useEditorStore.getState().setActiveCompositionGroup('background')
    useEditorStore
      .getState()
      .setActiveLayerPlane(BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree)
    expect(
      useEditorStore.getState().createBackgroundColorRegion({
        fill: '#7050B8',
        startY: 400,
        height: 600,
      }),
    ).toBe(true)

    const regionId = useEditorStore.getState().selectedElementId
    expect(regionId).toBeTruthy()
    const beforeAppearanceHistory = useEditorStore.getState().historyPast.length

    useEditorStore.getState().setElementBlendMode(regionId!, 'multiply')
    useEditorStore.getState().setShapeFill(regionId!, {
      kind: 'vertical-gradient',
      top: { color: '#7050B8', opacity: 1 },
      bottom: { color: '#11131F', opacity: 0 },
    })

    const region = useEditorStore
      .getState()
      .episode.elements.find(({ id }) => id === regionId)
    expect(region?.blendMode).toBe('multiply')
    expect(region?.type === 'shape' ? region.fill : undefined).toEqual({
      kind: 'vertical-gradient',
      top: { color: '#7050B8', opacity: 1 },
      bottom: { color: '#11131F', opacity: 0 },
    })
    expect(useEditorStore.getState().historyPast).toHaveLength(
      beforeAppearanceHistory + 2,
    )

    useEditorStore.getState().setActiveCompositionGroup('content')
    useEditorStore
      .getState()
      .setActiveLayerPlane(BUILD_WEEK_LAYER_PLANE_IDS.contentPanels)
    expect(
      useEditorStore
        .getState()
        .placeBuiltInAsset('builtin-speech-balloon-oval-v1'),
    ).toBe(true)
    const imageId = useEditorStore.getState().selectedElementId
    expect(imageId).toBeTruthy()

    useEditorStore.getState().setImagePresentation(imageId!, 'tile')
    const image = useEditorStore
      .getState()
      .episode.elements.find(({ id }) => id === imageId)
    expect(image?.type === 'image' ? image.presentation : undefined).toBe(
      'tile',
    )

    useEditorStore.getState().resizeElement(imageId!, {
      x: 100,
      y: 120,
      width: 240,
      height: 240,
    })
    useEditorStore.getState().setImagePresentation(imageId!, 'single')
    const restoredSingle = useEditorStore
      .getState()
      .episode.elements.find(({ id }) => id === imageId)
    expect(
      restoredSingle?.type === 'image'
        ? restoredSingle.presentation
        : undefined,
    ).toBe('single')
    expect(restoredSingle?.bounds.width).toBeCloseTo(240)
    expect(restoredSingle?.bounds.height).toBeCloseTo(240 * (250 / 360))

    useEditorStore.getState().undo()
    const restoredTile = useEditorStore
      .getState()
      .episode.elements.find(({ id }) => id === imageId)
    expect(
      restoredTile?.type === 'image'
        ? restoredTile.presentation
        : undefined,
    ).toBe('tile')
  })

  it('coordinates plane naming and reordering through undoable history', () => {
    useEditorStore.getState().setActiveCompositionGroup('content')
    useEditorStore.getState().createLayerPlane()

    const createdPlaneId = useEditorStore.getState().activeLayerPlaneId
    expect(createdPlaneId).toBe('content-plane-3')

    useEditorStore.getState().setLayerPlaneName(createdPlaneId, 'Dialogue')
    useEditorStore.getState().reorderLayerPlane(createdPlaneId, 0)

    expect(
      getLayerPlanesForGroup(
        useEditorStore.getState().episode,
        'content',
      ).map(({ id, name }) => ({ id, name })),
    ).toEqual([
      { id: createdPlaneId, name: 'Dialogue' },
      { id: BUILD_WEEK_LAYER_PLANE_IDS.contentPanels, name: undefined },
      { id: BUILD_WEEK_LAYER_PLANE_IDS.contentText, name: undefined },
    ])

    useEditorStore.getState().undo()
    expect(
      getLayerPlanesForGroup(
        useEditorStore.getState().episode,
        'content',
      ).map(({ id }) => id),
    ).toEqual([
      BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
      BUILD_WEEK_LAYER_PLANE_IDS.contentText,
      createdPlaneId,
    ])
    useEditorStore.getState().redo()
    expect(
      getLayerPlanesForGroup(
        useEditorStore.getState().episode,
        'content',
      )[0]?.id,
    ).toBe(createdPlaneId)
  })

  it('moves selected content between ordinary planes and follows it', () => {
    const elementId = 'beat-01-stillness-title'
    useEditorStore.getState().selectElement(elementId)
    useEditorStore
      .getState()
      .moveElementToLayerPlane(
        elementId,
        BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
      )

    const movedState = useEditorStore.getState()
    expect(
      movedState.episode.elements.find(({ id }) => id === elementId)
        ?.layerPlaneId,
    ).toBe(BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree)
    expect(movedState.activeCompositionGroup).toBe('background')
    expect(movedState.activeLayerPlaneId).toBe(
      BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
    )
    expect(movedState.selectedElementId).toBe(elementId)

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().activeCompositionGroup).toBe('content')
    expect(
      useEditorStore
        .getState()
        .episode.elements.find(({ id }) => id === elementId)?.layerPlaneId,
    ).toBe(BUILD_WEEK_LAYER_PLANE_IDS.contentText)
  })

  it('creates and applies independent lettering as two undoable changes', () => {
    useEditorStore.getState().setActiveCompositionGroup('content')
    useEditorStore
      .getState()
      .setActiveLayerPlane(BUILD_WEEK_LAYER_PLANE_IDS.contentText)

    expect(useEditorStore.getState().createTextElement()).toBe(true)
    const elementId = useEditorStore.getState().selectedElementId
    expect(elementId).toBeTruthy()
    expect(
      useEditorStore
        .getState()
        .episode.elements.find(({ id }) => id === elementId),
    ).toMatchObject({ type: 'text', text: 'Your text' })

    useEditorStore.getState().updateTextElement(elementId!, {
      text: 'Keep the light close.',
      fill: '#102030',
      fontSize: 42,
      fontWeight: 700,
      align: 'right',
    })
    expect(
      useEditorStore
        .getState()
        .episode.elements.find(({ id }) => id === elementId),
    ).toMatchObject({
      text: 'Keep the light close.',
      fill: '#102030',
      fontSize: 42,
      fontWeight: 700,
      align: 'right',
    })

    useEditorStore.getState().undo()
    expect(
      useEditorStore
        .getState()
        .episode.elements.find(({ id }) => id === elementId),
    ).toMatchObject({ text: 'Your text', fontSize: 36 })
    useEditorStore.getState().undo()
    expect(
      useEditorStore
        .getState()
        .episode.elements.some(({ id }) => id === elementId),
    ).toBe(false)
  })

  it('treats New Episode and Reset demo as boundaries that clear history', () => {
    useEditorStore.getState().setEpisodeName('Before new episode')
    expect(useEditorStore.getState().canUndo).toBe(true)

    useEditorStore.getState().newEpisode()
    expect(useEditorStore.getState().episode.name).toBe('Untitled Episode')
    expect(useEditorStore.getState().episode.elements).toHaveLength(0)
    expect(useEditorStore.getState().historyPast).toHaveLength(0)
    expect(useEditorStore.getState().historyFuture).toHaveLength(0)
    expect(useEditorStore.getState().canUndo).toBe(false)
    expect(useEditorStore.getState().canRedo).toBe(false)
    expect(useEditorStore.getState().savedRevision).toBeNull()
    expect(useEditorStore.getState().hasUnsavedChanges).toBe(true)

    useEditorStore.getState().placeSyntheticAsset({
      name: 'New episode shape',
      fill: '#7050B8',
    })
    expect(useEditorStore.getState().canUndo).toBe(true)

    useEditorStore.getState().resetEpisode()
    expect(useEditorStore.getState().episode).toBe(buildWeekEpisode)
    expect(useEditorStore.getState().historyPast).toHaveLength(0)
    expect(useEditorStore.getState().historyFuture).toHaveLength(0)
    expect(useEditorStore.getState().canUndo).toBe(false)
    expect(useEditorStore.getState().canRedo).toBe(false)
    expect(useEditorStore.getState().savedRevision).toBeNull()
    expect(useEditorStore.getState().hasUnsavedChanges).toBe(true)
    expect(useEditorStore.getState().documentStatus).toBe(
      'Demo reset · unsaved changes',
    )

    useEditorStore.setState({
      hasSavedEpisode: true,
      savedRevision: 123,
    })
    useEditorStore.getState().resetEpisode()
    expect(useEditorStore.getState().hasSavedEpisode).toBe(true)
    expect(useEditorStore.getState().savedRevision).toBe(123)
    expect(useEditorStore.getState().hasUnsavedChanges).toBe(true)
  })

  it('saves, tracks dirty revisions, and reopens from lazy browser localStorage', () => {
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
    const values = new Map<string, string>()
    const localStorage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value)
      },
    }

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { localStorage },
    })

    try {
      const creatorAssetCategories = [
        {
          id: 'creator-category-persistent',
          name: 'Persistent assets',
          createdAt: '2026-07-15T17:00:00.000Z',
        },
      ] as const
      const importedImageAssets = useEditorStore.getState().importedImageAssets
      useEditorStore.setState({
        assetLibraryStatus: 'ready',
        creatorAssetCategories,
      })

      useEditorStore.getState().setEpisodeName('Saved history episode')
      expect(useEditorStore.getState().hasUnsavedChanges).toBe(true)

      useEditorStore.getState().saveEpisode()
      expect(values.size).toBe(1)
      expect(useEditorStore.getState().hasSavedEpisode).toBe(true)
      expect(useEditorStore.getState().hasUnsavedChanges).toBe(false)
      expect(useEditorStore.getState().documentStatus).toBe('Saved locally')

      useEditorStore.getState().setEpisodeName('Unsaved branch')
      expect(useEditorStore.getState().hasUnsavedChanges).toBe(true)
      useEditorStore.getState().undo()
      expect(useEditorStore.getState().episode.name).toBe(
        'Saved history episode',
      )
      expect(useEditorStore.getState().hasUnsavedChanges).toBe(false)
      useEditorStore.getState().redo()
      expect(useEditorStore.getState().hasUnsavedChanges).toBe(true)

      useEditorStore.getState().newEpisode()
      expect(useEditorStore.getState().historyPast).toHaveLength(0)
      expect(useEditorStore.getState().creatorAssetCategories).toBe(
        creatorAssetCategories,
      )
      expect(useEditorStore.getState().reopenEpisode()).toBe(true)

      const reopened = useEditorStore.getState()
      expect(reopened.episode.name).toBe('Saved history episode')
      expect(reopened.hasUnsavedChanges).toBe(false)
      expect(reopened.hasSavedEpisode).toBe(true)
      expect(reopened.historyPast).toHaveLength(0)
      expect(reopened.historyFuture).toHaveLength(0)
      expect(reopened.canUndo).toBe(false)
      expect(reopened.canRedo).toBe(false)
      expect(reopened.creatorAssetCategories).toBe(creatorAssetCategories)
      expect(reopened.importedImageAssets).toBe(importedImageAssets)
    } finally {
      if (originalWindow) {
        Object.defineProperty(globalThis, 'window', originalWindow)
      } else {
        Reflect.deleteProperty(globalThis, 'window')
      }

      useEditorStore.setState({ hasSavedEpisode: false })
    }
  })
})
