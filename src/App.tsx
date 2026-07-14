import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

import { useEditorStore } from './app/store'
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

export function App() {
  const episodeName = useEditorStore((state) => state.episode.name)
  const setEpisodeName = useEditorStore((state) => state.setEpisodeName)
  const selectedElement = useEditorStore((state) =>
    state.episode.elements.find(
      ({ id }) => id === state.selectedElementId,
    ),
  )
  const resetEpisode = useEditorStore((state) => state.resetEpisode)
  const [isEditingEpisodeName, setIsEditingEpisodeName] = useState(false)
  const [episodeNameDraft, setEpisodeNameDraft] = useState(episodeName)
  const episodeNameInputRef = useRef<HTMLInputElement>(null)

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

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <div>
            <p>Vertical comic editor</p>
            <h1>ScrollSplice</h1>
          </div>
        </div>

        <div className="episode-heading">
          <span>Episode</span>
          {isEditingEpisodeName ? (
            <input
              ref={episodeNameInputRef}
              className="episode-title-input"
              type="text"
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
        <span className="status-ready">Editor ready</span>
        <span data-testid="selection-status">
          {selectedElement
            ? `${selectedElement.name} · x ${Math.round(selectedElement.bounds.x)} · y ${Math.round(selectedElement.bounds.y)}`
            : 'Nothing selected'}
        </span>
        <span>800u fixed width · local demo</span>
      </footer>
    </main>
  )
}
