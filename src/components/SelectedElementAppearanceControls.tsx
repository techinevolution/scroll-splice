import { useRef, type KeyboardEvent, type PointerEvent } from 'react'

import { useEditorStore } from '../app/store'
import { isBackgroundColorRegion } from '../core/commands'
import {
  ELEMENT_BLEND_MODES,
  type ElementBlendMode,
  type ShapeFillStop,
} from '../core/episode'

const BLEND_MODE_LABELS: Readonly<Record<ElementBlendMode, string>> = {
  normal: 'Normal',
  multiply: 'Multiply',
  screen: 'Screen',
  overlay: 'Overlay',
  'soft-light': 'Soft Light',
}

const OPACITY_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown',
])

function clampPercentage(value: number): number {
  return Math.min(Math.max(value, 0), 100)
}

function percentageToOpacity(value: string): number | undefined {
  if (value.trim() === '') return undefined

  const percentage = Number(value)
  return Number.isFinite(percentage)
    ? clampPercentage(percentage) / 100
    : undefined
}

interface GradientStopControlsProps {
  readonly label: string
  readonly stop: ShapeFillStop
  readonly onChange: (stop: ShapeFillStop) => void
}

function GradientStopControls({
  label,
  stop,
  onChange,
}: GradientStopControlsProps) {
  return (
    <span className="appearance-gradient-stop">
      <span>{label}</span>
      <input
        type="color"
        aria-label={`${label} gradient color`}
        value={stop.color}
        onChange={(event) =>
          onChange({ ...stop, color: event.currentTarget.value })
        }
      />
      <input
        className="appearance-percentage-input"
        type="number"
        aria-label={`${label} gradient opacity percent`}
        min="0"
        max="100"
        step="1"
        value={Math.round(stop.opacity * 100)}
        onChange={(event) => {
          const opacity = percentageToOpacity(event.currentTarget.value)
          if (opacity !== undefined) onChange({ ...stop, opacity })
        }}
      />
      <span aria-hidden="true">%</span>
    </span>
  )
}

export function SelectedElementAppearanceControls() {
  const selectedElement = useEditorStore((state) =>
    state.episode.elements.find(
      ({ id }) => id === state.selectedElementId,
    ),
  )
  const opacityEditStart = useEditorStore(
    (state) => state.elementOpacityEditStart,
  )
  const setElementOpacity = useEditorStore((state) => state.setElementOpacity)
  const beginElementOpacityEdit = useEditorStore(
    (state) => state.beginElementOpacityEdit,
  )
  const previewElementOpacity = useEditorStore(
    (state) => state.previewElementOpacity,
  )
  const endElementOpacityEdit = useEditorStore(
    (state) => state.endElementOpacityEdit,
  )
  const cancelElementOpacityEdit = useEditorStore(
    (state) => state.cancelElementOpacityEdit,
  )
  const setElementBlendMode = useEditorStore(
    (state) => state.setElementBlendMode,
  )
  const setShapeFill = useEditorStore((state) => state.setShapeFill)
  const setImagePresentation = useEditorStore(
    (state) => state.setImagePresentation,
  )
  const pointerIdRef = useRef<number | null>(null)

  if (!selectedElement) return null

  const opacityPercent = Math.round(selectedElement.opacity * 100)
  const isOpacityGestureActive =
    opacityEditStart?.elementId === selectedElement.id
  const isColorRegion = isBackgroundColorRegion(selectedElement)
  const gradientFill =
    selectedElement.type === 'shape' &&
    selectedElement.fill.kind === 'vertical-gradient'
      ? selectedElement.fill
      : undefined

  const updateOpacity = (value: string) => {
    const opacity = percentageToOpacity(value)
    if (opacity === undefined) return

    if (useEditorStore.getState().elementOpacityEditStart) {
      previewElementOpacity(selectedElement.id, opacity)
    } else {
      setElementOpacity(selectedElement.id, opacity)
    }
  }

  const finishOpacityGesture = () => {
    pointerIdRef.current = null
    endElementOpacityEdit()
  }

  const handleOpacityKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (OPACITY_KEYS.has(event.key) && !event.repeat) {
      beginElementOpacityEdit(selectedElement.id)
    }
  }

  const handleOpacityPointerDown = (event: PointerEvent<HTMLInputElement>) => {
    pointerIdRef.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)
    beginElementOpacityEdit(selectedElement.id)
  }

  return (
    <div
      className="selected-appearance-controls"
      aria-label={`${selectedElement.name} appearance`}
      data-testid="selected-appearance-controls"
    >
      <label className="appearance-control appearance-opacity-control">
        <span>Opacity</span>
        <input
          type="range"
          aria-label="Selected element opacity"
          min="0"
          max="100"
          step="1"
          value={opacityPercent}
          onPointerDown={handleOpacityPointerDown}
          onPointerUp={(event) => {
            updateOpacity(event.currentTarget.value)
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId)
            }
            finishOpacityGesture()
          }}
          onPointerCancel={() => {
            pointerIdRef.current = null
            cancelElementOpacityEdit()
          }}
          onLostPointerCapture={() => {
            if (pointerIdRef.current !== null) finishOpacityGesture()
          }}
          onKeyDown={handleOpacityKeyDown}
          onKeyUp={(event) => {
            if (OPACITY_KEYS.has(event.key)) endElementOpacityEdit()
          }}
          onBlur={() => {
            if (useEditorStore.getState().elementOpacityEditStart) {
              endElementOpacityEdit()
            }
          }}
          onChange={(event) => updateOpacity(event.currentTarget.value)}
        />
        <input
          className="appearance-percentage-input"
          type="number"
          aria-label="Selected element opacity percent"
          min="0"
          max="100"
          step="1"
          value={opacityPercent}
          disabled={isOpacityGestureActive}
          onChange={(event) => updateOpacity(event.currentTarget.value)}
        />
        <span aria-hidden="true">%</span>
      </label>

      <label className="appearance-control">
        <span>Blend</span>
        <select
          aria-label="Selected element blend mode"
          value={selectedElement.blendMode}
          onChange={(event) =>
            setElementBlendMode(
              selectedElement.id,
              event.currentTarget.value as ElementBlendMode,
            )
          }
        >
          {ELEMENT_BLEND_MODES.map((blendMode) => (
            <option key={blendMode} value={blendMode}>
              {BLEND_MODE_LABELS[blendMode]}
            </option>
          ))}
        </select>
      </label>

      {isColorRegion && selectedElement.type === 'shape' ? (
        <>
          <label className="appearance-control">
            <span>Fill</span>
            <select
              aria-label="Background region fill"
              value={selectedElement.fill.kind}
              onChange={(event) => {
                if (event.currentTarget.value === 'solid') {
                  setShapeFill(selectedElement.id, {
                    kind: 'solid',
                    color:
                      selectedElement.fill.kind === 'solid'
                        ? selectedElement.fill.color
                        : selectedElement.fill.top.color,
                  })
                } else {
                  const color =
                    selectedElement.fill.kind === 'solid'
                      ? selectedElement.fill.color
                      : selectedElement.fill.top.color
                  setShapeFill(selectedElement.id, {
                    kind: 'vertical-gradient',
                    top: { color, opacity: 1 },
                    bottom: { color, opacity: 0 },
                  })
                }
              }}
            >
              <option value="solid">Solid</option>
              <option value="vertical-gradient">Vertical fade</option>
            </select>
          </label>

          {selectedElement.fill.kind === 'solid' ? (
            <label className="appearance-control appearance-color-control">
              <span>Color</span>
              <input
                type="color"
                aria-label="Background region color"
                value={selectedElement.fill.color}
                onChange={(event) =>
                  setShapeFill(selectedElement.id, {
                    kind: 'solid',
                    color: event.currentTarget.value,
                  })
                }
              />
            </label>
          ) : null}

          {gradientFill ? (
            <>
              <GradientStopControls
                label="Top"
                stop={gradientFill.top}
                onChange={(top) =>
                  setShapeFill(selectedElement.id, {
                    ...gradientFill,
                    top,
                  })
                }
              />
              <GradientStopControls
                label="Bottom"
                stop={gradientFill.bottom}
                onChange={(bottom) =>
                  setShapeFill(selectedElement.id, {
                    ...gradientFill,
                    bottom,
                  })
                }
              />
            </>
          ) : null}
        </>
      ) : null}

      {selectedElement.type === 'image' ? (
        <label className="appearance-control">
          <span>Image</span>
          <select
            aria-label="Selected image presentation"
            value={selectedElement.presentation}
            onChange={(event) =>
              setImagePresentation(
                selectedElement.id,
                event.currentTarget.value === 'tile' ? 'tile' : 'single',
              )
            }
          >
            <option value="single">Single</option>
            <option value="tile">Tile texture</option>
          </select>
        </label>
      ) : null}
    </div>
  )
}
