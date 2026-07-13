import { useEditorStore } from '../app/store'

const SYNTHETIC_SWATCHES = [
  { color: '#7050B8', style: { backgroundColor: '#7050B8' } },
  { color: '#FFB45D', style: { backgroundColor: '#FFB45D' } },
  { color: '#8BE0C9', style: { backgroundColor: '#8BE0C9' } },
] as const

export function AssetPanel() {
  const assetPanelOpen = useEditorStore((state) => state.assetPanelOpen)
  const toggleAssetPanel = useEditorStore((state) => state.toggleAssetPanel)

  return (
    <aside className={`asset-panel${assetPanelOpen ? ' is-open' : ''}`}>
      <button
        className="asset-toggle"
        type="button"
        aria-expanded={assetPanelOpen}
        aria-controls="asset-panel-content"
        onClick={toggleAssetPanel}
      >
        <span className="asset-toggle-icon" aria-hidden="true">
          ◫
        </span>
        <span>Assets</span>
      </button>

      {assetPanelOpen ? (
        <div id="asset-panel-content" className="asset-panel-content">
          <p className="panel-kicker">Build Week sample</p>
          <h2>Synthetic assets</h2>
          <p>
            The demo artwork is generated from code. Import and drag-in arrive
            after the core editor is proven.
          </p>
          <div className="asset-swatches" aria-label="Synthetic color samples">
            {SYNTHETIC_SWATCHES.map(({ color, style }) => (
              <span key={color} style={style} />
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  )
}
