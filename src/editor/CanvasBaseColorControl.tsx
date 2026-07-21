import { useEditorStore } from '../app/store'
import { getLayerPlaneById } from '../core/episode'

export function CanvasBaseColorControl() {
  const episode = useEditorStore((state) => state.episode)
  const activeLayerPlaneId = useEditorStore(
    (state) => state.activeLayerPlaneId,
  )
  const setBaseColor = useEditorStore((state) => state.setBaseColor)
  const activeLayerPlane = getLayerPlaneById(episode, activeLayerPlaneId)

  if (activeLayerPlane?.kind !== 'base') {
    return null
  }

  return (
    <label className="canvas-base-color-control">
      <span>
        <strong>Canvas Base</strong>
        <small>Full Episode</small>
      </span>
      <input
        type="color"
        aria-label="Canvas base color"
        value={activeLayerPlane.baseColor}
        onChange={(event) => setBaseColor(event.currentTarget.value)}
      />
    </label>
  )
}
