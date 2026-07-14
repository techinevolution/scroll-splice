import { useEditorStore } from '../app/store'
import { getLayerPlaneById } from '../core/episode'

const SYNTHETIC_SWATCHES = [
  { name: 'Violet demo shape', color: '#7050B8' },
  { name: 'Amber demo shape', color: '#FFB45D' },
  { name: 'Mint demo shape', color: '#8BE0C9' },
] as const

export function AssetPanel() {
  const assetPanelOpen = useEditorStore((state) => state.assetPanelOpen)
  const toggleAssetPanel = useEditorStore((state) => state.toggleAssetPanel)
  const episode = useEditorStore((state) => state.episode)
  const activeLayerPlaneId = useEditorStore(
    (state) => state.activeLayerPlaneId,
  )
  const placeSyntheticAsset = useEditorStore(
    (state) => state.placeSyntheticAsset,
  )
  const activeLayerPlane = getLayerPlaneById(episode, activeLayerPlaneId)
  const canPlaceAsset = activeLayerPlane?.kind === 'ordinary'

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
            Add a code-made sample to the active numbered plane. Local photo
            import and drag-in remain a later slice.
          </p>
          <div className="asset-swatches" aria-label="Synthetic color samples">
            {SYNTHETIC_SWATCHES.map(({ name, color }) => (
              <button
                key={color}
                type="button"
                aria-label={`Add ${name}`}
                title={
                  canPlaceAsset
                    ? `Add ${name} to the active plane`
                    : 'Select an ordinary numbered plane first'
                }
                disabled={!canPlaceAsset}
                style={{ backgroundColor: color }}
                onClick={() => placeSyntheticAsset({ name, fill: color })}
              />
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  )
}
