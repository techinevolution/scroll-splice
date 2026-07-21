import { useEditorStore } from '../app/store'
import { BaseColorInput } from '../components/BaseColorInput'
import { getLayerPlaneById } from '../core/episode'

export function CanvasBaseColorControl() {
  const episode = useEditorStore((state) => state.episode)
  const activeLayerPlaneId = useEditorStore(
    (state) => state.activeLayerPlaneId,
  )
  const activeLayerPlane = getLayerPlaneById(episode, activeLayerPlaneId)

  if (activeLayerPlane?.kind !== 'base') {
    return null
  }

  return (
    <div className="canvas-base-color-control">
      <span>
        <strong>Canvas Base</strong>
        <small>Full Episode</small>
      </span>
      <BaseColorInput
        ariaLabel="Canvas base color"
        value={activeLayerPlane.baseColor}
      />
    </div>
  )
}
