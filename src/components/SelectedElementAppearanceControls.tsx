import { useRef, type KeyboardEvent, type PointerEvent } from 'react'

import { useEditorStore } from '../app/store'
import { isBackgroundColorRegion } from '../core/commands'
import {
  ELEMENT_BLEND_MODES,
  type ElementBlendMode,
  type ImageMask,
  type NormalizedPoint,
  type ShapeFillStop,
} from '../core/episode'
import { SelectedTextControls } from './SelectedTextControls'
import { SelectedSpeechBalloonControls } from './SelectedSpeechBalloonControls'

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

const POLYGON_MASK_PRESETS = {
  'slant-left': [
    { x: 0.12, y: 0 },
    { x: 1, y: 0 },
    { x: 0.88, y: 1 },
    { x: 0, y: 1 },
  ],
  'slant-right': [
    { x: 0, y: 0 },
    { x: 0.88, y: 0 },
    { x: 1, y: 1 },
    { x: 0.12, y: 1 },
  ],
  diamond: [
    { x: 0.5, y: 0 },
    { x: 1, y: 0.5 },
    { x: 0.5, y: 1 },
    { x: 0, y: 0.5 },
  ],
} as const satisfies Readonly<
  Record<string, readonly NormalizedPoint[]>
>

type ImageMaskPreset =
  | 'rectangle'
  | 'rounded'
  | keyof typeof POLYGON_MASK_PRESETS

function pointsMatch(
  first: readonly NormalizedPoint[],
  second: readonly NormalizedPoint[],
): boolean {
  return (
    first.length === second.length &&
    first.every(
      (point, index) =>
        point.x === second[index]?.x && point.y === second[index]?.y,
    )
  )
}

function getImageMaskPreset(mask: ImageMask): ImageMaskPreset {
  if (mask.kind === 'rectangle') {
    return mask.cornerRadius > 0 ? 'rounded' : 'rectangle'
  }

  const match = Object.entries(POLYGON_MASK_PRESETS).find(
    ([, points]) => pointsMatch(mask.points, points),
  )

  return (match?.[0] as ImageMaskPreset | undefined) ?? 'slant-left'
}

interface CommittedNumberInputProps {
  readonly label: string
  readonly value: number
  readonly min: number
  readonly max: number
  readonly step?: number
  readonly disabled?: boolean
  readonly onCommit: (value: number) => void
}

function CommittedNumberInput({
  label,
  value,
  min,
  max,
  step = 1,
  disabled = false,
  onCommit,
}: CommittedNumberInputProps) {
  const commit = (input: HTMLInputElement) => {
    const parsed = Number(input.value)

    if (!Number.isFinite(parsed)) {
      input.value = String(value)
      return
    }

    const next = Math.min(Math.max(parsed, min), max)
    input.value = String(next)
    onCommit(next)
  }

  return (
    <input
      key={value}
      className="appearance-number-input"
      type="number"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      defaultValue={value}
      disabled={disabled}
      onBlur={(event) => commit(event.currentTarget)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          event.currentTarget.blur()
        } else if (event.key === 'Escape') {
          event.preventDefault()
          event.currentTarget.value = String(value)
          event.currentTarget.blur()
        }
      }}
    />
  )
}

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
  const setElementTransform = useEditorStore(
    (state) => state.setElementTransform,
  )
  const toggleElementFlip = useEditorStore(
    (state) => state.toggleElementFlip,
  )
  const setElementOverflow = useEditorStore(
    (state) => state.setElementOverflow,
  )
  const setShapeFill = useEditorStore((state) => state.setShapeFill)
  const updateShapeElementStyle = useEditorStore(
    (state) => state.updateShapeElementStyle,
  )
  const setImagePresentation = useEditorStore(
    (state) => state.setImagePresentation,
  )
  const setImageFrame = useEditorStore((state) => state.setImageFrame)
  const setImageCrop = useEditorStore((state) => state.setImageCrop)
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
  const updateSelectedShapeStyle = (
    changes: Partial<{
      shape: 'rectangle' | 'ellipse'
      stroke: string | null
      strokeWidth: number
      cornerRadius: number
    }>,
  ) => {
    if (selectedElement.type !== 'shape') return

    updateShapeElementStyle(selectedElement.id, {
      shape: changes.shape ?? selectedElement.shape,
      stroke:
        changes.stroke !== undefined
          ? changes.stroke
          : (selectedElement.stroke ?? null),
      strokeWidth:
        changes.strokeWidth ?? selectedElement.strokeWidth ?? 0,
      cornerRadius:
        changes.cornerRadius ?? selectedElement.cornerRadius ?? 0,
    })
  }

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

      <span className="appearance-control appearance-transform-control">
        <span>Rotate</span>
        <CommittedNumberInput
          label="Selected element rotation degrees"
          value={selectedElement.transform.rotationDegrees}
          min={-180}
          max={180}
          disabled={selectedElement.locked}
          onCommit={(rotationDegrees) =>
            setElementTransform(selectedElement.id, {
              ...selectedElement.transform,
              rotationDegrees,
            })
          }
        />
        <button
          type="button"
          className="appearance-action-button"
          disabled={selectedElement.locked}
          aria-label="Rotate selected element 90 degrees counterclockwise"
          onClick={() =>
            setElementTransform(selectedElement.id, {
              ...selectedElement.transform,
              rotationDegrees:
                selectedElement.transform.rotationDegrees - 90,
            })
          }
        >
          −90°
        </button>
        <button
          type="button"
          className="appearance-action-button"
          disabled={selectedElement.locked}
          aria-label="Rotate selected element 90 degrees clockwise"
          onClick={() =>
            setElementTransform(selectedElement.id, {
              ...selectedElement.transform,
              rotationDegrees:
                selectedElement.transform.rotationDegrees + 90,
            })
          }
        >
          +90°
        </button>
      </span>

      <span className="appearance-control appearance-flip-control">
        <span>Flip</span>
        <button
          type="button"
          className="appearance-action-button"
          aria-label="Flip selected element horizontally"
          aria-pressed={selectedElement.transform.flipX}
          disabled={selectedElement.locked}
          onClick={() => toggleElementFlip(selectedElement.id, 'horizontal')}
        >
          ↔
        </button>
        <button
          type="button"
          className="appearance-action-button"
          aria-label="Flip selected element vertically"
          aria-pressed={selectedElement.transform.flipY}
          disabled={selectedElement.locked}
          onClick={() => toggleElementFlip(selectedElement.id, 'vertical')}
        >
          ↕
        </button>
      </span>

      <label className="appearance-control">
        <span>Edges</span>
        <select
          aria-label="Selected element episode edge behavior"
          value={selectedElement.overflow}
          disabled={selectedElement.locked}
          onChange={(event) =>
            setElementOverflow(
              selectedElement.id,
              event.currentTarget.value === 'bleed'
                ? 'bleed'
                : 'constrained',
            )
          }
        >
          <option value="constrained">Keep inside</option>
          <option value="bleed">Allow bleed</option>
        </select>
      </label>

      {selectedElement.type === 'text' ? (
        <SelectedTextControls
          key={JSON.stringify([
            selectedElement.id,
            selectedElement.text,
            selectedElement.fill,
            selectedElement.fontSize,
            selectedElement.fontWeight,
            selectedElement.align,
          ])}
          element={selectedElement}
        />
      ) : null}

      {selectedElement.type === 'speech-balloon' ? (
        <SelectedSpeechBalloonControls
          key={JSON.stringify(selectedElement)}
          element={selectedElement}
        />
      ) : null}

      {selectedElement.type === 'shape' ? (
        <>
          {!isColorRegion ? (
            <label className="appearance-control">
              <span>Shape</span>
              <select
                aria-label="Selected shape type"
                value={selectedElement.shape}
                onChange={(event) =>
                  updateSelectedShapeStyle({
                    shape:
                      event.currentTarget.value === 'ellipse'
                        ? 'ellipse'
                        : 'rectangle',
                  })
                }
              >
                <option value="rectangle">Rectangle</option>
                <option value="ellipse">Ellipse</option>
              </select>
            </label>
          ) : (
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
          )}

          {selectedElement.fill.kind === 'solid' ? (
            <label className="appearance-control appearance-color-control">
              <span>Color</span>
              <input
                type="color"
                aria-label="Selected shape fill color"
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

          {!isColorRegion ? (
            <>
              <label className="appearance-control appearance-outline-toggle">
                <span>Outline</span>
                <input
                  type="checkbox"
                  aria-label="Show selected shape outline"
                  checked={Boolean(
                    selectedElement.stroke &&
                      (selectedElement.strokeWidth ?? 0) > 0,
                  )}
                  onChange={(event) =>
                    updateSelectedShapeStyle(
                      event.currentTarget.checked
                        ? {
                            stroke: selectedElement.stroke ?? '#211A2B',
                            strokeWidth: selectedElement.strokeWidth ?? 4,
                          }
                        : { stroke: null, strokeWidth: 0 },
                    )
                  }
                />
              </label>

              {selectedElement.stroke &&
              (selectedElement.strokeWidth ?? 0) > 0 ? (
                <>
                  <label className="appearance-control appearance-color-control">
                    <span>Line</span>
                    <input
                      type="color"
                      aria-label="Selected shape outline color"
                      value={selectedElement.stroke}
                      onChange={(event) =>
                        updateSelectedShapeStyle({
                          stroke: event.currentTarget.value,
                        })
                      }
                    />
                  </label>
                  <label className="appearance-control">
                    <span>Width</span>
                    <input
                      className="appearance-percentage-input"
                      type="number"
                      aria-label="Selected shape outline width"
                      min="1"
                      max="100"
                      value={selectedElement.strokeWidth ?? 1}
                      onChange={(event) =>
                        updateSelectedShapeStyle({
                          strokeWidth: Number(event.currentTarget.value),
                        })
                      }
                    />
                  </label>
                </>
              ) : null}

              {selectedElement.shape === 'rectangle' ? (
                <label className="appearance-control">
                  <span>Corners</span>
                  <input
                    className="appearance-percentage-input"
                    type="number"
                    aria-label="Selected shape corner radius"
                    min="0"
                    value={selectedElement.cornerRadius ?? 0}
                    onChange={(event) =>
                      updateSelectedShapeStyle({
                        cornerRadius: Number(event.currentTarget.value),
                      })
                    }
                  />
                </label>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}

      {selectedElement.type === 'image' ? (
        <>
          <label className="appearance-control">
            <span>Image</span>
            <select
              aria-label="Selected image presentation"
              value={selectedElement.presentation}
              onChange={(event) => {
                const presentation = event.currentTarget.value
                setImagePresentation(
                  selectedElement.id,
                  presentation === 'tile'
                    ? 'tile'
                    : presentation === 'cover'
                      ? 'cover'
                      : 'single',
                )
              }}
            >
              <option value="single">Stretch</option>
              <option value="cover">Cover / crop</option>
              <option value="tile">Tile texture</option>
            </select>
          </label>

          {selectedElement.presentation === 'cover' ? (
            <>
              <label className="appearance-control">
                <span>Focus X</span>
                <CommittedNumberInput
                  label="Image crop horizontal focus percent"
                  value={Math.round(selectedElement.frame.crop.focusX * 100)}
                  min={0}
                  max={100}
                  onCommit={(focusX) =>
                    setImageCrop(selectedElement.id, {
                      ...selectedElement.frame.crop,
                      focusX: focusX / 100,
                    })
                  }
                />
                <span aria-hidden="true">%</span>
              </label>
              <label className="appearance-control">
                <span>Focus Y</span>
                <CommittedNumberInput
                  label="Image crop vertical focus percent"
                  value={Math.round(selectedElement.frame.crop.focusY * 100)}
                  min={0}
                  max={100}
                  onCommit={(focusY) =>
                    setImageCrop(selectedElement.id, {
                      ...selectedElement.frame.crop,
                      focusY: focusY / 100,
                    })
                  }
                />
                <span aria-hidden="true">%</span>
              </label>
              <label className="appearance-control">
                <span>Crop zoom</span>
                <CommittedNumberInput
                  label="Image crop zoom"
                  value={selectedElement.frame.crop.zoom}
                  min={1}
                  max={4}
                  step={0.1}
                  onCommit={(zoom) =>
                    setImageCrop(selectedElement.id, {
                      ...selectedElement.frame.crop,
                      zoom,
                    })
                  }
                />
                <span aria-hidden="true">×</span>
              </label>
            </>
          ) : null}

          <label className="appearance-control">
            <span>Mask</span>
            <select
              aria-label="Selected image mask"
              value={getImageMaskPreset(selectedElement.frame.mask)}
              onChange={(event) => {
                const preset = event.currentTarget.value as ImageMaskPreset
                const mask: ImageMask =
                  preset === 'rectangle'
                    ? { kind: 'rectangle', cornerRadius: 0 }
                    : preset === 'rounded'
                      ? {
                          kind: 'rectangle',
                          cornerRadius: Math.round(
                            Math.min(
                              selectedElement.bounds.width,
                              selectedElement.bounds.height,
                            ) * 0.12,
                          ),
                        }
                      : {
                          kind: 'polygon',
                          points: POLYGON_MASK_PRESETS[preset],
                        }

                setImageFrame(selectedElement.id, {
                  ...selectedElement.frame,
                  mask,
                })
              }}
            >
              <option value="rectangle">Rectangle</option>
              <option value="rounded">Rounded rectangle</option>
              <option value="slant-left">Slant left</option>
              <option value="slant-right">Slant right</option>
              <option value="diamond">Diamond</option>
            </select>
          </label>

          {selectedElement.frame.mask.kind === 'rectangle' ? (
            <label className="appearance-control">
              <span>Corners</span>
              <CommittedNumberInput
                label="Image mask corner radius"
                value={selectedElement.frame.mask.cornerRadius}
                min={0}
                max={Math.floor(
                  Math.min(
                    selectedElement.bounds.width,
                    selectedElement.bounds.height,
                  ) / 2,
                )}
                onCommit={(cornerRadius) =>
                  setImageFrame(selectedElement.id, {
                    ...selectedElement.frame,
                    mask: { kind: 'rectangle', cornerRadius },
                  })
                }
              />
            </label>
          ) : null}

          <label className="appearance-control appearance-outline-toggle">
            <span>Frame</span>
            <input
              type="checkbox"
              aria-label="Show selected image frame border"
              checked={Boolean(
                selectedElement.frame.border &&
                  selectedElement.frame.border.width > 0,
              )}
              onChange={(event) =>
                setImageFrame(selectedElement.id, {
                  ...selectedElement.frame,
                  ...(event.currentTarget.checked
                    ? {
                        border: selectedElement.frame.border ?? {
                          color: '#211A2B',
                          width: 4,
                        },
                      }
                    : { border: undefined }),
                })
              }
            />
          </label>

          {selectedElement.frame.border &&
          selectedElement.frame.border.width > 0 ? (
            <>
              <label className="appearance-control appearance-color-control">
                <span>Frame color</span>
                <input
                  type="color"
                  aria-label="Selected image frame color"
                  value={selectedElement.frame.border.color}
                  onChange={(event) =>
                    setImageFrame(selectedElement.id, {
                      ...selectedElement.frame,
                      border: {
                        ...selectedElement.frame.border!,
                        color: event.currentTarget.value,
                      },
                    })
                  }
                />
              </label>
              <label className="appearance-control">
                <span>Frame width</span>
                <CommittedNumberInput
                  label="Selected image frame width"
                  value={selectedElement.frame.border.width}
                  min={1}
                  max={100}
                  onCommit={(width) =>
                    setImageFrame(selectedElement.id, {
                      ...selectedElement.frame,
                      border: {
                        ...selectedElement.frame.border!,
                        width,
                      },
                    })
                  }
                />
              </label>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
