import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'

import { useEditorStore } from './app/store'
import { AppMenuBar } from './components/AppMenuBar'
import { AgentChatPanel } from './components/AgentChatPanel'
import { AssetPanel } from './components/AssetPanel'
import { CompositionGroupControls } from './components/CompositionGroupControls'
import { ExportDialog } from './components/ExportDialog'
import { HelpDialog } from './components/HelpDialog'
import { ProjectManagerDialog } from './components/ProjectManagerDialog'
import { ReaderPreview } from './components/ReaderPreview'
import { RecoveryBanner } from './components/RecoveryBanner'
import { SelectedElementAppearanceControls } from './components/SelectedElementAppearanceControls'
import { MAX_EPISODE_NAME_LENGTH } from './core/commands'
import { EditorCanvas } from './editor/EditorCanvas'
import { LayersPanel } from './layers/LayersPanel'
import { EpisodeMinimap } from './minimap/EpisodeMinimap'

type AppTheme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'scrollsplice-ui-theme'
const DETAILS_BAR_STORAGE_KEY = 'scrollsplice-details-bar'

function getInitialTheme(): AppTheme {
  if (typeof window === 'undefined') return 'dark'

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
    return storedTheme === 'light' || storedTheme === 'dark'
      ? storedTheme
      : 'dark'
  } catch {
    return 'dark'
  }
}

function getInitialDetailsBarVisibility(): boolean {
  if (typeof window === 'undefined') return false

  try {
    return window.localStorage.getItem(DETAILS_BAR_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function constrainEpisodeNameDraft(value: string): string {
  const trimmedValue = value.trim()

  if (trimmedValue.length <= MAX_EPISODE_NAME_LENGTH) {
    return value
  }

  const leadingWhitespaceLength = value.length - value.trimStart().length
  const trailingWhitespaceLength = value.length - value.trimEnd().length
  const leadingWhitespace = value.slice(0, leadingWhitespaceLength)
  const trailingWhitespace = trailingWhitespaceLength
    ? value.slice(-trailingWhitespaceLength)
    : ''

  return `${leadingWhitespace}${trimmedValue.slice(0, MAX_EPISODE_NAME_LENGTH)}${trailingWhitespace}`
}

function SelectionStatus() {
  const selectedElementIds = useEditorStore((state) => state.selectedElementIds)
  const selectedElement = useEditorStore((state) =>
    state.episode.elements.find(
      ({ id }) => id === state.selectedElementId,
    ),
  )
  const liveElementBounds = useEditorStore((state) => state.liveElementBounds)
  const bounds =
    selectedElement && liveElementBounds?.elementId === selectedElement.id
      ? liveElementBounds.bounds
      : selectedElement?.bounds

  return (
    <span
      data-testid="selection-status"
      data-x={bounds?.x ?? ''}
      data-y={bounds?.y ?? ''}
      data-width={bounds?.width ?? ''}
      data-height={bounds?.height ?? ''}
    >
      {selectedElement && bounds
        ? `${selectedElementIds.length > 1 ? `${selectedElementIds.length} selected · ` : ''}x ${Math.round(bounds.x)} · y ${Math.round(bounds.y)} · w ${Math.round(bounds.width)} · h ${Math.round(bounds.height)}`
        : 'Nothing Selected'}
    </span>
  )
}

export function App() {
  const episodeName = useEditorStore((state) => state.episode.name)
  const episodeId = useEditorStore((state) => state.episode.id)
  const currentRevision = useEditorStore((state) => state.currentRevision)
  const canUndo = useEditorStore((state) => state.canUndo)
  const canRedo = useEditorStore((state) => state.canRedo)
  const canReopen = useEditorStore((state) => state.hasSavedEpisode)
  const hasUnsavedChanges = useEditorStore(
    (state) => state.hasUnsavedChanges,
  )
  const documentStatus = useEditorStore((state) => state.documentStatus)
  const currentProjectId = useEditorStore((state) => state.currentProjectId)
  const recentProjects = useEditorStore((state) => state.recentProjects)
  const projectLibraryBusy = useEditorStore(
    (state) => state.projectLibraryBusy,
  )
  const recoveryAvailable = useEditorStore(
    (state) => state.recoveryAvailable,
  )
  const recoveryMessage = useEditorStore((state) => state.recoveryMessage)
  const initializeAssetLibrary = useEditorStore(
    (state) => state.initializeAssetLibrary,
  )
  const setEpisodeName = useEditorStore((state) => state.setEpisodeName)
  const undo = useEditorStore((state) => state.undo)
  const redo = useEditorStore((state) => state.redo)
  const reopenEpisode = useEditorStore((state) => state.reopenEpisode)
  const openLocalProject = useEditorStore((state) => state.openLocalProject)
  const deleteLocalProject = useEditorStore(
    (state) => state.deleteLocalProject,
  )
  const refreshRecentProjects = useEditorStore(
    (state) => state.refreshRecentProjects,
  )
  const importPortableProject = useEditorStore(
    (state) => state.importPortableProject,
  )
  const restoreRecovery = useEditorStore((state) => state.restoreRecovery)
  const discardRecovery = useEditorStore((state) => state.discardRecovery)
  const flushRecovery = useEditorStore((state) => state.flushRecovery)
  const newEpisode = useEditorStore((state) => state.newEpisode)
  const resetEpisode = useEditorStore((state) => state.resetEpisode)
  const [isEditingEpisodeName, setIsEditingEpisodeName] = useState(false)
  const [episodeNameDraft, setEpisodeNameDraft] = useState(episodeName)
  const [readerPreviewOpen, setReaderPreviewOpen] = useState(false)
  const [theme, setTheme] = useState<AppTheme>(getInitialTheme)
  const [showDetailsBar, setShowDetailsBar] = useState(
    getInitialDetailsBarVisibility,
  )
  const [isInspectorOpen, setIsInspectorOpen] = useState(true)
  const [helpOpen, setHelpOpen] = useState(false)
  const [projectManagerOpen, setProjectManagerOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const episodeNameInputRef = useRef<HTMLInputElement>(null)
  const inspectorToggleRef = useRef<HTMLButtonElement>(null)
  const portableImportInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void initializeAssetLibrary()
  }, [initializeAssetLibrary])

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Appearance still works when browser storage is unavailable.
    }
  }, [theme])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        DETAILS_BAR_STORAGE_KEY,
        String(showDetailsBar),
      )
    } catch {
      // The View toggle remains usable for the current session.
    }
  }, [showDetailsBar])

  useEffect(() => {
    const handleLifecycleBoundary = () => flushRecovery()

    window.addEventListener('pagehide', handleLifecycleBoundary)
    window.addEventListener('beforeunload', handleLifecycleBoundary)
    return () => {
      window.removeEventListener('pagehide', handleLifecycleBoundary)
      window.removeEventListener('beforeunload', handleLifecycleBoundary)
    }
  }, [flushRecovery])

  useEffect(() => {
    if (isEditingEpisodeName) {
      episodeNameInputRef.current?.focus()
      episodeNameInputRef.current?.select()
    }
  }, [isEditingEpisodeName])

  const beginEpisodeNameEdit = () => {
    setEpisodeNameDraft(episodeName)
    setIsEditingEpisodeName(true)
  }

  const cancelEpisodeNameEdit = () => {
    setEpisodeNameDraft(episodeName)
    setIsEditingEpisodeName(false)
  }

  const commitEpisodeNameEdit = () => {
    const nextEpisodeName = episodeNameDraft.trim()

    if (nextEpisodeName) {
      setEpisodeName(nextEpisodeName)
    } else {
      setEpisodeNameDraft(episodeName)
    }

    setIsEditingEpisodeName(false)
  }

  const handleEpisodeNameKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.nativeEvent.isComposing) {
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      commitEpisodeNameEdit()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancelEpisodeNameEdit()
    }
  }

  const commitPendingDocumentEdits = () => {
    const activePlaneNameInput = document.querySelector<HTMLInputElement>(
      '[data-testid="active-layer-plane-name"]',
    )

    if (
      activePlaneNameInput &&
      document.activeElement === activePlaneNameInput
    ) {
      activePlaneNameInput.blur()
    }

    if (isEditingEpisodeName) {
      commitEpisodeNameEdit()
    }
  }

  const saveFromUi = () => {
    commitPendingDocumentEdits()
    useEditorStore.getState().saveEpisode()
  }

  const saveAsFromUi = () => {
    commitPendingDocumentEdits()
    useEditorStore.getState().saveEpisodeAs()
  }

  const confirmDiscard = (message: string) =>
    !useEditorStore.getState().hasUnsavedChanges || window.confirm(message)

  const startNewEpisode = () => {
    if (!confirmDiscard('Discard unsaved changes and start a new episode?')) {
      return
    }

    cancelEpisodeNameEdit()
    newEpisode()
  }

  const reopenSavedEpisode = () => {
    if (
      !confirmDiscard(
        'Discard unsaved changes and reopen the current saved project?',
      )
    ) {
      return
    }

    cancelEpisodeNameEdit()
    reopenEpisode()
  }

  const showLocalProjects = () => {
    refreshRecentProjects()
    setProjectManagerOpen(true)
  }

  const openSelectedProject = (projectId: string) => {
    if (
      !confirmDiscard(
        'Discard unsaved changes and open the selected local project?',
      )
    ) {
      return
    }

    cancelEpisodeNameEdit()
    if (openLocalProject(projectId)) setProjectManagerOpen(false)
  }

  const deleteSelectedProject = (projectId: string, name: string) => {
    if (
      !window.confirm(
        `Delete “${name}” from this browser? This cannot be undone.`,
      )
    ) {
      return
    }

    deleteLocalProject(projectId)
  }

  const choosePortableProject = () => {
    portableImportInputRef.current?.click()
  }

  const handlePortableProjectSelection = async () => {
    const input = portableImportInputRef.current
    const file = input?.files?.[0]

    if (!file || !input) return
    input.value = ''

    if (
      !confirmDiscard(
        'Discard unsaved changes and import the selected portable project?',
      )
    ) {
      return
    }

    cancelEpisodeNameEdit()
    await importPortableProject(file)
  }

  const downloadPortableProject = async () => {
    commitPendingDocumentEdits()
    const result = await useEditorStore.getState().exportPortableProject()

    if (!result) return

    const sourceUrl = URL.createObjectURL(result.blob)
    const anchor = document.createElement('a')
    anchor.href = sourceUrl
    anchor.download = result.fileName
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(sourceUrl), 1_000)
  }

  const restoreRecoveredWork = () => {
    if (
      !confirmDiscard(
        'Discard the currently open changes and restore the recovery snapshot?',
      )
    ) {
      return
    }

    cancelEpisodeNameEdit()
    restoreRecovery()
  }

  const discardRecoveredWork = () => {
    if (
      recoveryAvailable &&
      !window.confirm('Discard this crash-recovery snapshot permanently?')
    ) {
      return
    }

    discardRecovery()
  }

  const openReaderPreview = () => {
    if (isEditingEpisodeName) {
      commitEpisodeNameEdit()
    }

    setReaderPreviewOpen(true)
  }

  const closeReaderPreview = useCallback(() => {
    setReaderPreviewOpen(false)
  }, [])

  const closeProjectManager = useCallback(() => {
    setProjectManagerOpen(false)
  }, [])

  const closeExportDialog = useCallback(() => {
    setExportDialogOpen(false)
  }, [])

  const closeInspectorAndRestoreFocus = useCallback(() => {
    setIsInspectorOpen(false)
    window.requestAnimationFrame(() => inspectorToggleRef.current?.focus())
  }, [])

  const resetDemo = () => {
    if (!confirmDiscard('Discard unsaved changes and reset the demo?')) {
      return
    }

    cancelEpisodeNameEdit()
    resetEpisode()
  }

  useEffect(() => {
    const handleApplicationShortcut = (event: globalThis.KeyboardEvent) => {
      if (
        readerPreviewOpen ||
        projectManagerOpen ||
        exportDialogOpen ||
        helpOpen
      ) {
        return
      }

      const target = event.target
      const isEditable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      const key = event.key.toLowerCase()

      if (!isEditable && (key === 'delete' || key === 'backspace')) {
        const state = useEditorStore.getState()

        if (state.selectedElementId) {
          event.preventDefault()
          state.deleteElement(state.selectedElementId)
        }
        return
      }

      if (!(event.metaKey || event.ctrlKey) || event.altKey) {
        return
      }

      if (key === 's') {
        event.preventDefault()
        if (event.shiftKey) {
          saveAsFromUi()
        } else {
          saveFromUi()
        }
        return
      }

      if (isEditable) {
        return
      }

      if (key === 'z') {
        event.preventDefault()
        if (event.shiftKey) {
          redo()
        } else {
          undo()
        }
      } else if (key === 'y' && event.ctrlKey && !event.metaKey) {
        event.preventDefault()
        redo()
      } else if (key === 'd') {
        const state = useEditorStore.getState()

        if (state.selectedElementId) {
          event.preventDefault()
          state.duplicateElement(state.selectedElementId)
        }
      }
    }

    window.addEventListener('keydown', handleApplicationShortcut)
    return () => window.removeEventListener('keydown', handleApplicationShortcut)
  })

  useEffect(() => {
    if (!isInspectorOpen || readerPreviewOpen || helpOpen) {
      return
    }

    const handleInspectorEscape = (event: globalThis.KeyboardEvent) => {
      const target = event.target
      const isEditable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)

      if (
        event.key !== 'Escape' ||
        event.defaultPrevented ||
        isEditable ||
        !window.matchMedia('(width <= 1120px)').matches
      ) {
        return
      }

      event.preventDefault()
      closeInspectorAndRestoreFocus()
    }

    window.addEventListener('keydown', handleInspectorEscape)
    return () => window.removeEventListener('keydown', handleInspectorEscape)
  }, [closeInspectorAndRestoreFocus, helpOpen, isInspectorOpen, readerPreviewOpen])

  return (
    <main
      className={`app-shell theme-${theme}${isInspectorOpen ? '' : ' is-inspector-closed'}${showDetailsBar ? ' has-details-bar' : ''}`}
      data-theme={theme}
    >
      <header className="app-header">
        <AppMenuBar
          canUndo={canUndo}
          canRedo={canRedo}
          canReopen={canReopen}
          isInspectorOpen={isInspectorOpen}
          theme={theme}
          showDetailsBar={showDetailsBar}
          onNewEpisode={startNewEpisode}
          onOpenLocalProject={showLocalProjects}
          onSave={saveFromUi}
          onSaveAs={saveAsFromUi}
          onReopen={reopenSavedEpisode}
          onImportProject={choosePortableProject}
          onExportProject={() => void downloadPortableProject()}
          onExportEpisodeImages={() => setExportDialogOpen(true)}
          onResetDemo={resetDemo}
          onUndo={undo}
          onRedo={redo}
          onReaderPreview={openReaderPreview}
          onSetTheme={setTheme}
          onToggleDetailsBar={() =>
            setShowDetailsBar((isVisible) => !isVisible)
          }
          onToggleInspector={() => setIsInspectorOpen((isOpen) => !isOpen)}
          onOpenHelp={() => setHelpOpen(true)}
        />

        <div className="brand-lockup">
          <img
            className="brand-mark"
            src={`${import.meta.env.BASE_URL}brand/scrollsplice-mark.png?v=2`}
            alt=""
            aria-hidden="true"
            data-testid="brand-mark"
          />
          <div>
            <p>Vertical Comic Editor</p>
            <h1 aria-label="ScrollSplice">
              <span className="brand-name-scroll">Scroll</span>
              <span className="brand-name-splice">Splice</span>
            </h1>
          </div>
        </div>

        <div
          className="episode-heading"
          data-testid="episode-heading"
          data-dirty={hasUnsavedChanges ? 'true' : 'false'}
        >
          <span data-testid="episode-label">Episode</span>
          <div className="episode-title-slot">
            {isEditingEpisodeName ? (
              <>
                <span className="episode-title-anchor" aria-hidden="true">
                  {episodeName}
                </span>
                <input
                  ref={episodeNameInputRef}
                  className="episode-title-input"
                  type="text"
                  size={Math.min(
                    Math.max(episodeNameDraft.length, 1),
                    MAX_EPISODE_NAME_LENGTH,
                  )}
                  aria-label="Episode title"
                  value={episodeNameDraft}
                  onChange={(event) =>
                    setEpisodeNameDraft(
                      constrainEpisodeNameDraft(event.currentTarget.value),
                    )
                  }
                  onBlur={commitEpisodeNameEdit}
                  onKeyDown={handleEpisodeNameKeyDown}
                />
              </>
            ) : (
              <button
                className="episode-title-edit"
                type="button"
                aria-label={`Edit episode title: ${episodeName}`}
                title="Click the episode title to edit"
                onClick={beginEpisodeNameEdit}
              >
                {episodeName}
              </button>
            )}
          </div>
        </div>

        <div className="header-actions">
          <div className="header-history-actions" aria-label="History Actions">
            <button type="button" disabled={!canUndo} onClick={undo}>
              Undo
            </button>
            <button type="button" disabled={!canRedo} onClick={redo}>
              Redo
            </button>
          </div>
          <AgentChatPanel
            key={`episode:${episodeId}`}
            projectKey={`episode:${episodeId}`}
          />
          <button
            ref={inspectorToggleRef}
            className="inspector-toggle"
            type="button"
            aria-label={isInspectorOpen ? 'Hide inspector' : 'Show inspector'}
            aria-expanded={isInspectorOpen}
            aria-controls="episode-inspector"
            title={isInspectorOpen ? 'Hide inspector' : 'Show inspector'}
            onClick={() => setIsInspectorOpen((isOpen) => !isOpen)}
          >
            <span aria-hidden="true">▥</span>
          </button>
        </div>
      </header>

      <RecoveryBanner
        recovery={recoveryAvailable}
        message={recoveryMessage}
        onRestore={restoreRecoveredWork}
        onDiscard={discardRecoveredWork}
      />

      <input
        ref={portableImportInputRef}
        className="sr-only"
        type="file"
        tabIndex={-1}
        accept=".scrollsplice,application/vnd.scrollsplice.project+json"
        aria-label="Import portable ScrollSplice project"
        onChange={() => void handlePortableProjectSelection()}
      />

      {isInspectorOpen ? (
        <>
          <button
            className="inspector-scrim"
            type="button"
            aria-label="Dismiss inspector overlay"
            onClick={closeInspectorAndRestoreFocus}
          />
          <aside
            className="inspector"
            id="episode-inspector"
            aria-label="Episode overview and layers"
          >
            <button
              className="inspector-close"
              type="button"
              aria-label="Close inspector"
              onClick={closeInspectorAndRestoreFocus}
            >
              ×
            </button>
            <EpisodeMinimap />
            <LayersPanel />
          </aside>
        </>
      ) : null}

      <div className="workspace">
        <AssetPanel />

        <section className="editor-workspace" aria-labelledby="canvas-heading">
          <header className="workspace-heading">
            <div className="workspace-title">
              <p className="panel-kicker">Editing Viewport</p>
              <h2 id="canvas-heading">Story Canvas</h2>
            </div>
            <CompositionGroupControls />
          </header>
          <EditorCanvas
            accentColor={theme === 'light' ? '#16878A' : '#C58A5A'}
          />
          <div className="canvas-document-state">
            <span
              className={`document-state-indicator${hasUnsavedChanges ? ' is-unsaved' : ''}`}
              title={
                hasUnsavedChanges
                  ? `${documentStatus}. Use File > Save to keep these changes.`
                  : documentStatus
              }
              aria-label={
                hasUnsavedChanges
                  ? 'Unsaved changes. Use File, Save to keep them.'
                  : 'All changes saved locally.'
              }
            >
              {hasUnsavedChanges ? 'Unsaved Changes' : 'Saved'}
            </span>
            <span
              className="sr-only"
              data-testid="document-status"
              aria-live="polite"
            >
              {documentStatus}
            </span>
          </div>
        </section>
      </div>

      {showDetailsBar ? (
        <footer className="status-bar" data-testid="details-bar">
          <div className="status-selection-area">
            <SelectionStatus />
            <SelectedElementAppearanceControls />
          </div>
        </footer>
      ) : null}

      {readerPreviewOpen ? (
        <ReaderPreview onClose={closeReaderPreview} />
      ) : null}
      {helpOpen ? <HelpDialog onClose={() => setHelpOpen(false)} /> : null}
      {projectManagerOpen ? (
        <ProjectManagerDialog
          projects={recentProjects}
          currentProjectId={currentProjectId}
          busy={projectLibraryBusy}
          onOpen={openSelectedProject}
          onDelete={deleteSelectedProject}
          onClose={closeProjectManager}
        />
      ) : null}
      {exportDialogOpen ? (
        <ExportDialog
          key={`${episodeId}-${currentRevision}`}
          onClose={closeExportDialog}
        />
      ) : null}
    </main>
  )
}
