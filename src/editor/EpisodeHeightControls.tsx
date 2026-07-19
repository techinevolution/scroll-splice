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
  const beginEpisodeHeightResize = useEditorStore(
    (state) => state.beginEpisodeHeightResize,
  )
  const endEpisodeHeightResize = useEditorStore(
    (state) => state.endEpisodeHeightResize,
  )
  const cancelEpisodeHeightResize = useEditorStore(
    (state) => state.cancelEpisodeHeightResize,
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
    <>
      <button
        className="episode-height-edge"
        type="button"
        aria-label={`Resize episode from bottom edge, currently ${Math.round(episodeHeight).toLocaleString()} pixels`}
        title="Drag the bottom edge to resize. Arrow keys adjust 10px; Shift adjusts 100px."
        onKeyDown={handleResizeKeyDown}
        onPointerDown={(event) => {
          event.preventDefault()
          event.currentTarget.setPointerCapture(event.pointerId)
          beginEpisodeHeightResize()
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
          endEpisodeHeightResize()
        }}
        onPointerCancel={() => {
          resizeSession.current = null
          cancelEpisodeHeightResize()
        }}
        onLostPointerCapture={() => {
          if (resizeSession.current) {
            cancelEpisodeHeightResize()
          }
          resizeSession.current = null
        }}
      />

      <div className="episode-end-controls">
        <button
          className="extend-episode-button"
          type="button"
          aria-label={`Add scroll space (${DEFAULT_EPISODE_HEIGHT_INCREMENT.toLocaleString()} pixels)`}
          onClick={extendEpisodeHeight}
        >
          <span aria-hidden="true">+</span>
          <span>Add scroll space</span>
        </button>
      </div>
    </>
  )
}
