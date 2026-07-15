import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'

import { useEditorStore } from '../app/store'
import {
  MAX_CREATOR_CATEGORY_NAME_LENGTH,
  ASSET_DRAG_MIME_TYPE,
  getBuiltInAssetsByCategory,
  serializeAssetDragPayload,
  type AssetDragPayload,
  type BuiltInAssetCategoryId,
} from '../assets'
import { getLayerPlaneById } from '../core/episode'

type AssetLibraryCategoryId =
  | 'uploads'
  | BuiltInAssetCategoryId
  | 'my-library'

const ASSET_LIBRARY_CATEGORIES = [
  { id: 'uploads', label: 'Uploads', accessibleLabel: 'Uploads', icon: '⇧' },
  {
    id: 'speech-balloons',
    label: 'Speech Balloons',
    accessibleLabel: 'Speech Balloons',
    icon: '◯',
  },
  {
    id: 'decorations',
    label: 'Decor',
    accessibleLabel: 'Decorations',
    icon: '✦',
  },
  {
    id: 'splatters',
    label: 'Splatters',
    accessibleLabel: 'Splatters',
    icon: '✺',
  },
  {
    id: 'my-library',
    label: 'My Library',
    accessibleLabel: 'My Library',
    icon: '▦',
  },
] as const satisfies readonly {
  readonly id: AssetLibraryCategoryId
  readonly label: string
  readonly accessibleLabel: string
  readonly icon: string
}[]

const CATEGORY_COPY: Readonly<
  Record<AssetLibraryCategoryId, { readonly title: string; readonly note: string }>
> = {
  uploads: {
    title: 'Uploads',
    note: 'PNG, JPEG, or WebP source files stay in this browser for reuse.',
  },
  'speech-balloons': {
    title: 'Speech Balloons',
    note: 'Original ready-made balloons. Text and tail editing are later tools.',
  },
  decorations: {
    title: 'Decorations',
    note: 'Simple transparent accents for panels, pacing, and page edges.',
  },
  splatters: {
    title: 'Splatters',
    note: 'Transparent ink effects that can sit above or behind comic art.',
  },
  'my-library': {
    title: 'My Library',
    note: 'Create personal categories, then upload reusable images into them.',
  },
}

function getAssetDimensionsLabel(width: number, height: number): string {
  return `${width} × ${height}`
}

export function AssetPanel() {
  const assetPanelOpen = useEditorStore((state) => state.assetPanelOpen)
  const openAssetPanel = useEditorStore((state) => state.openAssetPanel)
  const closeAssetPanel = useEditorStore((state) => state.closeAssetPanel)
  const episode = useEditorStore((state) => state.episode)
  const activeLayerPlaneId = useEditorStore(
    (state) => state.activeLayerPlaneId,
  )
  const assetLibraryStatus = useEditorStore(
    (state) => state.assetLibraryStatus,
  )
  const assetLibraryBusy = useEditorStore((state) => state.assetLibraryBusy)
  const assetLibraryMessage = useEditorStore(
    (state) => state.assetLibraryMessage,
  )
  const assetLibraryMessageKind = useEditorStore(
    (state) => state.assetLibraryMessageKind,
  )
  const creatorCategories = useEditorStore(
    (state) => state.creatorAssetCategories,
  )
  const importedImages = useEditorStore((state) => state.importedImageAssets)
  const createCreatorCategory = useEditorStore(
    (state) => state.createCreatorAssetCategory,
  )
  const importImageAsset = useEditorStore((state) => state.importImageAsset)
  const placeBuiltInAsset = useEditorStore((state) => state.placeBuiltInAsset)
  const placeImportedAsset = useEditorStore((state) => state.placeImportedAsset)
  const [activeCategoryId, setActiveCategoryId] =
    useState<AssetLibraryCategoryId>('uploads')
  const [selectedCreatorCategoryId, setSelectedCreatorCategoryId] = useState<
    string | null
  >(null)
  const [categoryNameDraft, setCategoryNameDraft] = useState('')
  const uploadInputId = useId()
  const categoryNameInputId = useId()
  const suppressClickAfterDragRef = useRef(false)
  const dragClickResetTimerRef = useRef<number | null>(null)
  const activeLayerPlane = getLayerPlaneById(episode, activeLayerPlaneId)
  const canPlaceAsset = activeLayerPlane?.kind === 'ordinary'
  const isTargetHidden =
    canPlaceAsset &&
    (!episode.compositionGroupVisibility[activeLayerPlane.compositionGroup] ||
      !activeLayerPlane.visible)
  const activeCategory = CATEGORY_COPY[activeCategoryId]
  const builtInAssets = useMemo(
    () =>
      activeCategoryId === 'speech-balloons' ||
      activeCategoryId === 'decorations' ||
      activeCategoryId === 'splatters'
        ? getBuiltInAssetsByCategory(activeCategoryId)
        : [],
    [activeCategoryId],
  )
  const visibleImportedImages = useMemo(() => {
    if (activeCategoryId !== 'my-library' || selectedCreatorCategoryId === null) {
      return importedImages
    }

    return importedImages.filter(
      ({ creatorCategoryId }) =>
        creatorCategoryId === selectedCreatorCategoryId,
    )
  }, [activeCategoryId, importedImages, selectedCreatorCategoryId])

  useEffect(() => {
    if (!assetPanelOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAssetPanel()
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [assetPanelOpen, closeAssetPanel])

  useEffect(
    () => () => {
      if (dragClickResetTimerRef.current !== null) {
        window.clearTimeout(dragClickResetTimerRef.current)
      }
    },
    [],
  )

  const selectLibraryCategory = (categoryId: AssetLibraryCategoryId) => {
    if (assetPanelOpen && activeCategoryId === categoryId) {
      closeAssetPanel()
      return
    }

    setActiveCategoryId(categoryId)
    openAssetPanel()
  }

  const handleCreateCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const createdCategoryId = await createCreatorCategory(categoryNameDraft)

    if (createdCategoryId) {
      setCategoryNameDraft('')
      setSelectedCreatorCategoryId(createdCategoryId)
    }
  }

  const handleUpload = async (file: File | undefined) => {
    if (!file) return

    await importImageAsset(
      file,
      activeCategoryId === 'my-library' ? selectedCreatorCategoryId : null,
    )
  }

  const startAssetDrag = (
    event: ReactDragEvent<HTMLButtonElement>,
    payload: AssetDragPayload,
  ) => {
    const serialized = serializeAssetDragPayload(payload)

    if (!serialized) {
      event.preventDefault()
      return
    }

    if (dragClickResetTimerRef.current !== null) {
      window.clearTimeout(dragClickResetTimerRef.current)
      dragClickResetTimerRef.current = null
    }

    suppressClickAfterDragRef.current = true
    event.dataTransfer.clearData()
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData(ASSET_DRAG_MIME_TYPE, serialized)
  }

  const finishAssetDrag = () => {
    dragClickResetTimerRef.current = window.setTimeout(() => {
      suppressClickAfterDragRef.current = false
      dragClickResetTimerRef.current = null
    }, 0)
  }

  const activateAssetCard = (
    event: ReactMouseEvent<HTMLButtonElement>,
    action: () => void,
  ) => {
    if (event.detail > 0 && suppressClickAfterDragRef.current) {
      event.preventDefault()
      event.stopPropagation()
      suppressClickAfterDragRef.current = false
      return
    }

    action()
  }

  const targetLabel = activeLayerPlane
    ? `${activeLayerPlane.compositionGroup} plane ${activeLayerPlane.order}`
    : 'no active plane'

  return (
    <aside className={`asset-panel${assetPanelOpen ? ' is-open' : ''}`}>
      <nav className="asset-rail" aria-label="Asset Library categories">
        {ASSET_LIBRARY_CATEGORIES.map(
          ({ id, label, accessibleLabel, icon }) => (
            <button
              className="asset-category-button"
              type="button"
              key={id}
              aria-label={accessibleLabel}
              aria-controls="asset-panel-content"
              aria-expanded={assetPanelOpen && activeCategoryId === id}
              aria-pressed={assetPanelOpen && activeCategoryId === id}
              title={accessibleLabel}
              onClick={() => selectLibraryCategory(id)}
            >
              <span className="asset-category-icon" aria-hidden="true">
                {icon}
              </span>
              <span>{label}</span>
            </button>
          ),
        )}
      </nav>

      {assetPanelOpen ? (
        <section
          id="asset-panel-content"
          className="asset-panel-content"
          aria-labelledby="asset-library-heading"
        >
          <header className="asset-library-header">
            <div>
              <p className="panel-kicker">Asset Library</p>
              <h2 id="asset-library-heading">{activeCategory.title}</h2>
            </div>
            <button
              className="asset-library-close"
              type="button"
              aria-label="Close Asset Library"
              onClick={closeAssetPanel}
            >
              ×
            </button>
          </header>

          <p className="asset-library-note">{activeCategory.note}</p>
          <p
            className={`asset-library-target${!canPlaceAsset || isTargetHidden ? ' is-warning' : ''}`}
          >
            {canPlaceAsset
              ? `Placement target: ${targetLabel}${isTargetHidden ? ' (currently hidden)' : ''}`
              : 'Select a numbered plane before placing an asset.'}
          </p>

          {activeCategoryId === 'my-library' ? (
            <>
              <form
                className="creator-category-form"
                onSubmit={handleCreateCategory}
              >
                <label className="sr-only" htmlFor={categoryNameInputId}>
                  New category name
                </label>
                <input
                  id={categoryNameInputId}
                  type="text"
                  maxLength={MAX_CREATOR_CATEGORY_NAME_LENGTH}
                  placeholder="New category name"
                  value={categoryNameDraft}
                  disabled={assetLibraryBusy || assetLibraryStatus !== 'ready'}
                  onChange={(event) => setCategoryNameDraft(event.currentTarget.value)}
                />
                <button
                  type="submit"
                  disabled={
                    assetLibraryBusy ||
                    assetLibraryStatus !== 'ready' ||
                    categoryNameDraft.trim() === ''
                  }
                >
                  Create category
                </button>
              </form>

              <div
                className="creator-category-list"
                aria-label="Creator categories"
              >
                <button
                  className="creator-category-chip"
                  type="button"
                  aria-pressed={selectedCreatorCategoryId === null}
                  onClick={() => setSelectedCreatorCategoryId(null)}
                >
                  All
                </button>
                {creatorCategories.map((category) => (
                  <button
                    className="creator-category-chip"
                    type="button"
                    key={category.id}
                    aria-pressed={selectedCreatorCategoryId === category.id}
                    title={category.name}
                    onClick={() => setSelectedCreatorCategoryId(category.id)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {activeCategoryId === 'uploads' || activeCategoryId === 'my-library' ? (
            <label className="asset-upload-control" htmlFor={uploadInputId}>
              <strong>Upload image</strong>
              <span>
                {activeCategoryId === 'my-library' && selectedCreatorCategoryId
                  ? 'The source will be saved in the selected category.'
                  : 'The source will be saved in Uploads.'}
              </span>
              <input
                id={uploadInputId}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={assetLibraryBusy || assetLibraryStatus !== 'ready'}
                onChange={(event) => {
                  const input = event.currentTarget
                  void handleUpload(input.files?.[0]).finally(() => {
                    input.value = ''
                  })
                }}
              />
            </label>
          ) : null}

          {builtInAssets.length > 0 ? (
            <div className="asset-grid" aria-label={`${activeCategory.title} assets`}>
              {builtInAssets.map((asset) => (
                <button
                  className="asset-card"
                  type="button"
                  key={asset.id}
                  aria-label={`Add ${asset.displayName}`}
                  disabled={!canPlaceAsset}
                  draggable={canPlaceAsset}
                  onClick={(event) =>
                    activateAssetCard(event, () => placeBuiltInAsset(asset.id))
                  }
                  onDragStart={(event) =>
                    startAssetDrag(event, {
                      kind: 'built-in',
                      assetId: asset.id,
                    })
                  }
                  onDragEnd={finishAssetDrag}
                >
                  <span className="asset-card-preview">
                    <img src={asset.source} alt="" draggable={false} />
                  </span>
                  <strong>{asset.displayName}</strong>
                  <small>
                    {getAssetDimensionsLabel(
                      asset.intrinsicWidth,
                      asset.intrinsicHeight,
                    )}
                  </small>
                </button>
              ))}
            </div>
          ) : null}

          {(activeCategoryId === 'uploads' || activeCategoryId === 'my-library') &&
          visibleImportedImages.length > 0 ? (
            <div className="asset-grid" aria-label="Imported assets">
              {visibleImportedImages.map((asset) => (
                <button
                  className="asset-card"
                  type="button"
                  key={asset.id}
                  aria-label={`Add ${asset.displayName}`}
                  disabled={!canPlaceAsset}
                  draggable={canPlaceAsset}
                  onClick={(event) =>
                    activateAssetCard(event, () => placeImportedAsset(asset.id))
                  }
                  onDragStart={(event) =>
                    startAssetDrag(event, {
                      kind: 'imported',
                      assetId: asset.id,
                    })
                  }
                  onDragEnd={finishAssetDrag}
                >
                  <span className="asset-card-preview">
                    <img src={asset.sourceUrl} alt="" draggable={false} />
                  </span>
                  <strong>{asset.displayName}</strong>
                  <small>
                    {getAssetDimensionsLabel(
                      asset.intrinsicWidth,
                      asset.intrinsicHeight,
                    )}
                  </small>
                </button>
              ))}
            </div>
          ) : null}

          {(activeCategoryId === 'uploads' || activeCategoryId === 'my-library') &&
          visibleImportedImages.length === 0 ? (
            <p className="asset-empty-state">
              {activeCategoryId === 'my-library' && selectedCreatorCategoryId
                ? 'This category is empty. Upload its first reusable image.'
                : 'No uploaded images yet.'}
            </p>
          ) : null}

          {assetLibraryMessage ? (
            <p
              className={`asset-library-status${assetLibraryMessageKind === 'error' ? ' is-error' : ''}`}
              role={assetLibraryMessageKind === 'error' ? 'alert' : 'status'}
              aria-live="polite"
            >
              {assetLibraryMessage}
            </p>
          ) : null}
        </section>
      ) : null}
    </aside>
  )
}
