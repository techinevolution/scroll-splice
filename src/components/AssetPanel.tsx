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
  MAX_ASSET_DISPLAY_NAME_LENGTH,
  MAX_CREATOR_CATEGORY_NAME_LENGTH,
  ASSET_DRAG_MIME_TYPE,
  getBuiltInAssetsByCategory,
  serializeAssetDragPayload,
  type AssetDragPayload,
  type BuiltInAssetCategoryId,
} from '../assets'
import { getLayerPlaneById } from '../core/episode'
import {
  DEFAULT_SPEECH_BALLOON_TAIL,
  getSpeechBalloonPath,
} from '../core/speechBalloonGeometry'
import { SPEECH_BALLOON_PRESETS } from '../core/speechBalloonPresets'

type AssetLibraryCategoryId = 'uploads' | BuiltInAssetCategoryId

type UploadFilter =
  | { readonly kind: 'all' }
  | { readonly kind: 'unsorted' }
  | { readonly kind: 'category'; readonly categoryId: string }

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
    note: 'Upload once, then organize reusable PNG, JPEG, or WebP images into your own categories.',
  },
  'speech-balloons': {
    title: 'Speech Balloons',
    note: 'Choose a starting type, then edit its text, colors, outline, size, and tail.',
  },
  decorations: {
    title: 'Decorations',
    note: 'Simple transparent accents for panels, pacing, and page edges.',
  },
  splatters: {
    title: 'Splatters',
    note: 'Transparent ink effects that can sit above or behind comic art.',
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
  const renameCreatorCategory = useEditorStore(
    (state) => state.renameCreatorAssetCategory,
  )
  const deleteCreatorCategory = useEditorStore(
    (state) => state.deleteCreatorAssetCategory,
  )
  const reorderCreatorCategory = useEditorStore(
    (state) => state.reorderCreatorAssetCategory,
  )
  const importImageAsset = useEditorStore((state) => state.importImageAsset)
  const renameImportedImageAsset = useEditorStore(
    (state) => state.renameImportedImageAsset,
  )
  const moveImportedImageAsset = useEditorStore(
    (state) => state.moveImportedImageAsset,
  )
  const replaceImportedImageAsset = useEditorStore(
    (state) => state.replaceImportedImageAsset,
  )
  const deleteImportedImageAsset = useEditorStore(
    (state) => state.deleteImportedImageAsset,
  )
  const placeBuiltInAsset = useEditorStore((state) => state.placeBuiltInAsset)
  const placeImportedAsset = useEditorStore((state) => state.placeImportedAsset)
  const createSpeechBalloonElement = useEditorStore(
    (state) => state.createSpeechBalloonElement,
  )
  const [activeCategoryId, setActiveCategoryId] =
    useState<AssetLibraryCategoryId>('uploads')
  const [uploadFilter, setUploadFilter] = useState<UploadFilter>({
    kind: 'all',
  })
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
  const selectedCreatorCategory =
    uploadFilter.kind === 'category'
      ? creatorCategories.find(({ id }) => id === uploadFilter.categoryId)
      : undefined
  const effectiveUploadFilter: UploadFilter =
    uploadFilter.kind === 'category' && !selectedCreatorCategory
      ? { kind: 'all' }
      : uploadFilter
  const visibleImportedImages =
    effectiveUploadFilter.kind === 'all'
      ? importedImages
      : importedImages.filter(({ creatorCategoryId }) =>
          effectiveUploadFilter.kind === 'unsorted'
            ? creatorCategoryId === null
            : creatorCategoryId === effectiveUploadFilter.categoryId,
        )
  const selectedCreatorCategoryIndex = selectedCreatorCategory
    ? creatorCategories.findIndex(({ id }) => id === selectedCreatorCategory.id)
    : -1

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
      setUploadFilter({ kind: 'category', categoryId: createdCategoryId })
    }
  }

  const handleUpload = async (file: File | undefined) => {
    if (!file) return

    await importImageAsset(
      file,
      effectiveUploadFilter.kind === 'category'
        ? effectiveUploadFilter.categoryId
        : null,
    )
  }

  const handleRenameCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedCreatorCategory) return

    const formData = new FormData(event.currentTarget)
    const requestedName = formData.get('categoryName')

    if (typeof requestedName !== 'string') return

    await renameCreatorCategory(
      selectedCreatorCategory.id,
      requestedName,
    )
  }

  const handleDeleteCategory = async () => {
    if (!selectedCreatorCategory) return

    const containedAssetCount = importedImages.filter(
      ({ creatorCategoryId }) =>
        creatorCategoryId === selectedCreatorCategory.id,
    ).length
    const confirmed = window.confirm(
      containedAssetCount > 0
        ? `Delete “${selectedCreatorCategory.name}”? Its ${containedAssetCount} reusable ${containedAssetCount === 1 ? 'asset' : 'assets'} will move to Uploads.`
        : `Delete empty category “${selectedCreatorCategory.name}”?`,
    )

    if (!confirmed) return

    const deleted = await deleteCreatorCategory(selectedCreatorCategory.id)
    if (deleted) setUploadFilter({ kind: 'unsorted' })
  }

  const handleRenameImportedSource = async (
    event: FormEvent<HTMLFormElement>,
    assetId: string,
  ) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const requestedName = formData.get('sourceName')

    if (typeof requestedName === 'string') {
      await renameImportedImageAsset(assetId, requestedName)
    }
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

          {activeCategoryId === 'uploads' ? (
            <>
              <form
                className="creator-category-form"
                onSubmit={handleCreateCategory}
              >
                <label className="sr-only" htmlFor={categoryNameInputId}>
                  New Category Name
                </label>
                <input
                  id={categoryNameInputId}
                  type="text"
                  maxLength={MAX_CREATOR_CATEGORY_NAME_LENGTH}
                  placeholder="New Category Name"
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
                  Create Category
                </button>
              </form>

              <div
                className="creator-category-list"
                aria-label="Creator categories"
              >
                <button
                  className="creator-category-chip"
                  type="button"
                  aria-pressed={effectiveUploadFilter.kind === 'all'}
                  onClick={() => setUploadFilter({ kind: 'all' })}
                >
                  All
                </button>
                <button
                  className="creator-category-chip"
                  type="button"
                  aria-pressed={effectiveUploadFilter.kind === 'unsorted'}
                  onClick={() => setUploadFilter({ kind: 'unsorted' })}
                >
                  Unsorted
                </button>
                {creatorCategories.map((category) => (
                  <button
                    className="creator-category-chip"
                    type="button"
                    key={category.id}
                    aria-pressed={
                      effectiveUploadFilter.kind === 'category' &&
                      effectiveUploadFilter.categoryId === category.id
                    }
                    title={category.name}
                    onClick={() =>
                      setUploadFilter({
                        kind: 'category',
                        categoryId: category.id,
                      })
                    }
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              {selectedCreatorCategory ? (
                <section
                  className="creator-category-management"
                  aria-label={`Manage ${selectedCreatorCategory.name}`}
                >
                  <form onSubmit={handleRenameCategory}>
                    <label>
                      <span>Category Name</span>
                      <input
                        key={`${selectedCreatorCategory.id}:${selectedCreatorCategory.name}`}
                        name="categoryName"
                        type="text"
                        maxLength={MAX_CREATOR_CATEGORY_NAME_LENGTH}
                        defaultValue={selectedCreatorCategory.name}
                        disabled={assetLibraryBusy}
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={assetLibraryBusy}
                    >
                      Rename
                    </button>
                  </form>
                  <div className="creator-category-management-actions">
                    <button
                      type="button"
                      disabled={
                        assetLibraryBusy || selectedCreatorCategoryIndex <= 0
                      }
                      onClick={() =>
                        void reorderCreatorCategory(
                          selectedCreatorCategory.id,
                          selectedCreatorCategoryIndex - 1,
                        )
                      }
                    >
                      Move left
                    </button>
                    <button
                      type="button"
                      disabled={
                        assetLibraryBusy ||
                        selectedCreatorCategoryIndex < 0 ||
                        selectedCreatorCategoryIndex >=
                          creatorCategories.length - 1
                      }
                      onClick={() =>
                        void reorderCreatorCategory(
                          selectedCreatorCategory.id,
                          selectedCreatorCategoryIndex + 1,
                        )
                      }
                    >
                      Move right
                    </button>
                    <button
                      className="creator-category-delete"
                      type="button"
                      disabled={assetLibraryBusy}
                      onClick={() => void handleDeleteCategory()}
                    >
                      Delete
                    </button>
                  </div>
                </section>
              ) : null}
            </>
          ) : null}

          {activeCategoryId === 'uploads' ? (
            <label className="asset-upload-control" htmlFor={uploadInputId}>
              <strong>Upload Image</strong>
              <span>
                {effectiveUploadFilter.kind === 'category'
                  ? 'The source will be saved in the selected category.'
                  : 'The source will be saved in Unsorted.'}
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

          {activeCategoryId === 'speech-balloons' || builtInAssets.length > 0 ? (
            <div className="asset-grid" aria-label={`${activeCategory.title} assets`}>
              {activeCategoryId === 'speech-balloons' ? (
                <>
                  {SPEECH_BALLOON_PRESETS.map((preset) => {
                    const preview = getSpeechBalloonPath(
                      { x: 34, y: 22, width: 292, height: 164 },
                      42,
                      DEFAULT_SPEECH_BALLOON_TAIL,
                      preset.id,
                    )
                    return (
                      <button
                        className="asset-card"
                        type="button"
                        key={preset.id}
                        aria-label={`Add ${preset.label} balloon`}
                        data-testid={
                          preset.id === 'standard'
                            ? 'add-editable-balloon'
                            : undefined
                        }
                        disabled={!canPlaceAsset}
                        onClick={() => createSpeechBalloonElement(preset.id)}
                      >
                        <span className="asset-card-preview">
                          <svg
                            viewBox="0 0 360 250"
                            role="img"
                            aria-label={`${preset.label} editable speech balloon preview`}
                          >
                            {preview?.tailPathData ? (
                              <path
                                d={preview.tailPathData}
                                fill="#fff"
                                stroke="#211a2b"
                                strokeWidth="8"
                                strokeDasharray={preview.strokeDash?.join(' ')}
                                strokeLinejoin="round"
                              />
                            ) : null}
                            {preview ? (
                              <path
                                d={preview.bodyPathData}
                                fill="#fff"
                                stroke="#211a2b"
                                strokeWidth="8"
                                strokeDasharray={preview.strokeDash?.join(' ')}
                                strokeLinejoin="round"
                              />
                            ) : null}
                            {preview?.decorationPathData.map((data, index) => (
                              <path
                                key={`${preset.id}-preview-decoration-${index}`}
                                d={data}
                                fill="none"
                                stroke="#211a2b"
                                strokeWidth="5"
                                strokeLinecap="round"
                              />
                            ))}
                          </svg>
                        </span>
                        <strong>{preset.label}</strong>
                        <small>{preset.description}</small>
                      </button>
                    )
                  })}
                </>
              ) : null}
              {activeCategoryId !== 'speech-balloons' ? builtInAssets.map((asset) => (
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
              )) : null}
            </div>
          ) : null}

          {activeCategoryId === 'uploads' && visibleImportedImages.length > 0 ? (
            <div className="asset-grid" aria-label="Imported assets">
              {visibleImportedImages.map((asset) => (
                <article
                  className="asset-card imported-asset-card"
                  key={asset.id}
                >
                  <button
                    className="imported-asset-place"
                    type="button"
                    aria-label={`Add ${asset.displayName}`}
                    disabled={!canPlaceAsset}
                    draggable={canPlaceAsset}
                    onClick={(event) =>
                      activateAssetCard(event, () =>
                        placeImportedAsset(asset.id),
                      )
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
                  <details className="imported-asset-management">
                    <summary>Manage Source</summary>
                    <form
                      className="imported-asset-rename"
                      onSubmit={(event) =>
                        void handleRenameImportedSource(event, asset.id)
                      }
                    >
                      <label>
                        <span>Name</span>
                        <input
                          key={`${asset.id}:${asset.displayName}`}
                          name="sourceName"
                          type="text"
                          maxLength={MAX_ASSET_DISPLAY_NAME_LENGTH}
                          defaultValue={asset.displayName}
                          disabled={assetLibraryBusy}
                        />
                      </label>
                      <button type="submit" disabled={assetLibraryBusy}>
                        Rename
                      </button>
                    </form>
                    <label className="imported-asset-destination">
                      <span>Category</span>
                      <select
                        value={asset.creatorCategoryId ?? ''}
                        disabled={assetLibraryBusy}
                        onChange={(event) =>
                          void moveImportedImageAsset(
                            asset.id,
                            event.currentTarget.value || null,
                          )
                        }
                      >
                        <option value="">Unsorted</option>
                        {creatorCategories.map((category) => (
                          <option value={category.id} key={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="imported-asset-replace">
                      <span>Replace Image</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        disabled={assetLibraryBusy}
                        onChange={(event) => {
                          const input = event.currentTarget
                          const file = input.files?.[0]

                          if (file) {
                            void replaceImportedImageAsset(
                              asset.id,
                              file,
                            ).finally(() => {
                              input.value = ''
                            })
                          }
                        }}
                      />
                    </label>
                    <button
                      className="imported-asset-delete"
                      type="button"
                      disabled={assetLibraryBusy}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete reusable source “${asset.displayName}”? Placed or saved references will block this action.`,
                          )
                        ) {
                          void deleteImportedImageAsset(asset.id)
                        }
                      }}
                    >
                      Delete source
                    </button>
                  </details>
                </article>
              ))}
            </div>
          ) : null}

          {activeCategoryId === 'uploads' && visibleImportedImages.length === 0 ? (
            <p className="asset-empty-state">
              {effectiveUploadFilter.kind === 'category'
                ? 'This category is empty. Upload its first reusable image.'
                : effectiveUploadFilter.kind === 'unsorted'
                  ? 'No unsorted images yet.'
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
