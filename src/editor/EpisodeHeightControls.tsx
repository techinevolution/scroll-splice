import { useRef, type KeyboardEvent, type PointerEvent } from 'react'

import { useEditorStore } from '../app/store'
import { DEFAULT_EPISODE_HEIGHT_INCREMENT } from '../core/commands'

interface EpisodeHeightControlsProps {
  readonly viewScale: number
}

interface ResizeSession {
  readonly pointerId: number
  readonly startClientY: number
  readonly startHeight: number
}

const FINE_HEIGHT_STEP = 10
const LARGE_HEIGHT_STEP = 100

function roundHeight(height: number): number {
  return Math.round(height / FINE_HEIGHT_STEP) * FINE_HEIGHT_STEP
}

export function EpisodeHeightControls({
  viewScale,
}: EpisodeHeightControlsProps) {
  const episodeHeight = useEditorStore((state) => state.episode.logicalHeight)
  const extendEpisodeHeight = useEditorStore(
    (state) => state.extendEpisodeHeight,
  )
  const resizeEpisodeHeight = useEditorStore(
    (state) => state.resizeEpisodeHeight,
  )
  const resizeSession = useRef<ResizeSession | null>(null)

  const resizeFromPointer = (event: PointerEvent<HTMLButtonElement>) => {
    const session = resizeSession.current

    if (!session || session.pointerId !== event.pointerId) {
      return
    }

    const logicalDelta =
      (event.clientY - session.startClientY) / Math.max(viewScale, 0.001)
    resizeEpisodeHeight(roundHeight(session.startHeight + logicalDelta), true)
  }

  const handleResizeKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
      return
    }

    event.preventDefault()
    const direction = event.key === 'ArrowDown' ? 1 : -1
    const step = event.shiftKey ? LARGE_HEIGHT_STEP : FINE_HEIGHT_STEP
    resizeEpisodeHeight(episodeHeight + direction * step, true)
  }

  return (
    <div className="episode-end-controls">
      <button
        className="extend-episode-button"
        type="button"
        onClick={extendEpisodeHeight}
      >
        <span aria-hidden="true">+</span>
        <span>Add scroll space</span>
        <small>{DEFAULT_EPISODE_HEIGHT_INCREMENT.toLocaleString()}u</small>
      </button>

      <button
        className="episode-height-handle"
        type="button"
        aria-label={`Fine tune episode height, currently ${Math.round(episodeHeight).toLocaleString()} units`}
        title="Drag to fine-tune height. Arrow keys adjust 10u; Shift adjusts 100u."
        onKeyDown={handleResizeKeyDown}
        onPointerDown={(event) => {
          event.preventDefault()
          event.currentTarget.setPointerCapture(event.pointerId)
          resizeSession.current = {
            pointerId: event.pointerId,
            startClientY: event.clientY,
            startHeight: episodeHeight,
          }
        }}
        onPointerMove={resizeFromPointer}
        onPointerUp={(event) => {
          resizeFromPointer(event)
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
          }
          resizeSession.current = null
        }}
        onPointerCancel={() => {
          resizeSession.current = null
        }}
        onLostPointerCapture={() => {
          resizeSession.current = null
        }}
      >
        <span aria-hidden="true">↕</span>
        <span>Drag to fine-tune</span>
        <small>{Math.round(episodeHeight).toLocaleString()}u</small>
      </button>
    </div>
  )
}
