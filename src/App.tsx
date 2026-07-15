import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

import { useEditorStore } from './app/store'
import { AppMenuBar } from './components/AppMenuBar'
import { AssetPanel } from './components/AssetPanel'
import { CompositionGroupControls } from './components/CompositionGroupControls'
import { MAX_EPISODE_NAME_LENGTH } from './core/commands'
import { EditorCanvas } from './editor/EditorCanvas'
import { LayersPanel } from './layers/LayersPanel'
import { EpisodeMinimap } from './minimap/EpisodeMinimap'

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
        ? `${selectedElement.name} · x ${Math.round(bounds.x)} · y ${Math.round(bounds.y)} · w ${Math.round(bounds.width)} · h ${Math.round(bounds.height)}`
        : 'Nothing selected'}
    </span>
  )
}

export function App() {
  const episodeName = useEditorStore((state) => state.episode.name)
  const canUndo = useEditorStore((state) => state.canUndo)
  const canRedo = useEditorStore((state) => state.canRedo)
  const canReopen = useEditorStore((state) => state.hasSavedEpisode)
  const hasUnsavedChanges = useEditorStore(
    (state) => state.hasUnsavedChanges,
  )
  const documentStatus = useEditorStore((state) => state.documentStatus)
  const initializeAssetLibrary = useEditorStore(
    (state) => state.initializeAssetLibrary,
  )
  const setEpisodeName = useEditorStore((state) => state.setEpisodeName)
  const undo = useEditorStore((state) => state.undo)
  const redo = useEditorStore((state) => state.redo)
  const reopenEpisode = useEditorStore((state) => state.reopenEpisode)
  const newEpisode = useEditorStore((state) => state.newEpisode)
  const resetEpisode = useEditorStore((state) => state.resetEpisode)
  const [isEditingEpisodeName, setIsEditingEpisodeName] = useState(false)
  const [episodeNameDraft, setEpisodeNameDraft] = useState(episodeName)
  const episodeNameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void initializeAssetLibrary()
  }, [initializeAssetLibrary])

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

  const saveFromUi = () => {
    if (isEditingEpisodeName) {
      commitEpisodeNameEdit()
    }

    useEditorStore.getState().saveEpisode()
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
    if (!confirmDiscard('Discard unsaved changes and reopen the last save?')) {
      return
    }

    cancelEpisodeNameEdit()
    reopenEpisode()
  }

  useEffect(() => {
    const handleApplicationShortcut = (event: globalThis.KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) {
        return
      }

      const target = event.target
      const isEditable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      const key = event.key.toLowerCase()

      if (key === 's') {
        event.preventDefault()
        saveFromUi()
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
      }
    }

    window.addEventListener('keydown', handleApplicationShortcut)
    return () => window.removeEventListener('keydown', handleApplicationShortcut)
  })

  return (
    <main className="app-shell">
      <header className="app-header">
        <AppMenuBar
          canUndo={canUndo}
          canRedo={canRedo}
          canReopen={canReopen}
          onNewEpisode={startNewEpisode}
          onSave={saveFromUi}
          onReopen={reopenSavedEpisode}
          onUndo={undo}
          onRedo={redo}
        />

        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <div>
            <p>Vertical comic editor</p>
            <h1>ScrollSplice</h1>
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

        <button
          className="reset-button"
          type="button"
          onClick={() => {
            cancelEpisodeNameEdit()
            resetEpisode()
          }}
        >
          Reset demo
        </button>
      </header>

      <aside className="inspector" aria-label="Episode overview and layers">
        <EpisodeMinimap />
        <LayersPanel />
      </aside>

      <div className="workspace">
        <AssetPanel />

        <section className="editor-workspace" aria-labelledby="canvas-heading">
          <header className="workspace-heading">
            <div className="workspace-title">
              <p className="panel-kicker">Editing viewport</p>
              <h2 id="canvas-heading">Story canvas</h2>
            </div>
            <CompositionGroupControls />
          </header>
          <EditorCanvas />
        </section>
      </div>

      <footer className="status-bar">
        <span
          className={hasUnsavedChanges ? 'status-unsaved' : 'status-ready'}
          data-testid="document-status"
          aria-live="polite"
        >
          {documentStatus}
        </span>
        <SelectionStatus />
        <span>800u fixed width · local browser project</span>
      </footer>
    </main>
  )
}
