import { useEditorStore } from './app/store'
import { AssetPanel } from './components/AssetPanel'
import { EditorCanvas } from './editor/EditorCanvas'
import { LayersPanel } from './layers/LayersPanel'
import { EpisodeMinimap } from './minimap/EpisodeMinimap'

export function App() {
  const episodeName = useEditorStore((state) => state.episode.name)
  const selectedElement = useEditorStore((state) =>
    state.episode.elements.find(
      ({ id }) => id === state.selectedElementId,
    ),
  )
  const resetEpisode = useEditorStore((state) => state.resetEpisode)

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

        <div className="episode-heading" aria-label="Current episode">
          <span>Episode</span>
          <strong>{episodeName}</strong>
        </div>

        <button className="reset-button" type="button" onClick={resetEpisode}>
          Reset demo
        </button>
      </header>

      <div className="workspace">
        <AssetPanel />

        <section className="editor-workspace" aria-labelledby="canvas-heading">
          <header className="workspace-heading">
            <div>
              <p className="panel-kicker">Editing viewport</p>
              <h2 id="canvas-heading">Story canvas</h2>
            </div>
            <p>Scroll to travel · click to select · drag the selection to move</p>
          </header>
          <EditorCanvas />
        </section>

        <aside className="inspector" aria-label="Episode overview and layers">
          <EpisodeMinimap />
          <LayersPanel />
        </aside>
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
