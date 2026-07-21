import { type FormEvent } from 'react'

import { useEditorStore } from '../app/store'
import { MAX_TEXT_CONTENT_LENGTH } from '../core/commands'
import type {
  SpeechBalloonElement,
  SpeechBalloonTailSide,
} from '../core/episode'

interface SelectedSpeechBalloonControlsProps {
  readonly element: SpeechBalloonElement
}

function readNumber(formData: FormData, name: string): number {
  return Number(formData.get(name))
}

export function SelectedSpeechBalloonControls({
  element,
}: SelectedSpeechBalloonControlsProps) {
  const updateSpeechBalloonElement = useEditorStore(
    (state) => state.updateSpeechBalloonElement,
  )

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const text = formData.get('text')
    const fill = formData.get('fill')
    const stroke = formData.get('stroke')
    const textFill = formData.get('textFill')
    const fontFamily = formData.get('fontFamily')
    const align = formData.get('align')
    const tailSide = formData.get('tailSide')

    if (
      typeof text !== 'string' ||
      typeof fill !== 'string' ||
      typeof stroke !== 'string' ||
      typeof textFill !== 'string' ||
      typeof fontFamily !== 'string' ||
      (align !== 'left' && align !== 'center' && align !== 'right') ||
      (tailSide !== 'top' &&
        tailSide !== 'right' &&
        tailSide !== 'bottom' &&
        tailSide !== 'left')
    ) {
      return
    }

    updateSpeechBalloonElement(element.id, {
      text,
      fill,
      stroke,
      strokeWidth: readNumber(formData, 'strokeWidth'),
      cornerRadius: readNumber(formData, 'cornerRadius'),
      textFill,
      fontFamily,
      fontWeight: readNumber(formData, 'fontWeight') as 400 | 600 | 700,
      lineHeight: readNumber(formData, 'lineHeight'),
      align,
      padding: readNumber(formData, 'padding'),
      minFontSize: readNumber(formData, 'minFontSize'),
      maxFontSize: readNumber(formData, 'maxFontSize'),
      tail: {
        enabled: formData.get('tailEnabled') === 'on',
        side: tailSide as SpeechBalloonTailSide,
        anchor: readNumber(formData, 'tailAnchor'),
        width: readNumber(formData, 'tailWidth'),
        tip: {
          x: readNumber(formData, 'tailTipX'),
          y: readNumber(formData, 'tailTipY'),
        },
      },
    })
  }

  return (
    <form
      className="selected-balloon-controls"
      aria-label={`${element.name} editable balloon properties`}
      data-testid="selected-balloon-controls"
      onSubmit={handleSubmit}
    >
      <label className="text-control text-wording-control">
        <span>Wording</span>
        <textarea
          name="text"
          aria-label="Editable balloon wording"
          maxLength={MAX_TEXT_CONTENT_LENGTH}
          rows={2}
          defaultValue={element.text}
          required
        />
      </label>
      <label className="text-control text-color-control">
        <span>Balloon</span>
        <input
          name="fill"
          type="color"
          aria-label="Editable balloon fill color"
          defaultValue={element.fill}
        />
      </label>
      <label className="text-control text-color-control">
        <span>Outline</span>
        <input
          name="stroke"
          type="color"
          aria-label="Editable balloon outline color"
          defaultValue={element.stroke}
        />
      </label>
      <label className="text-control">
        <span>Line Width</span>
        <input
          name="strokeWidth"
          type="number"
          aria-label="Editable balloon outline width"
          min="0"
          max="100"
          step="1"
          defaultValue={element.strokeWidth}
        />
      </label>
      <label className="text-control">
        <span>Corners</span>
        <input
          name="cornerRadius"
          type="number"
          aria-label="Editable balloon corner radius"
          min="0"
          step="1"
          defaultValue={element.cornerRadius}
        />
      </label>
      <label className="text-control text-color-control">
        <span>Text</span>
        <input
          name="textFill"
          type="color"
          aria-label="Editable balloon text color"
          defaultValue={element.textFill}
        />
      </label>
      <label className="text-control">
        <span>Font</span>
        <input
          name="fontFamily"
          type="text"
          aria-label="Editable balloon font family"
          defaultValue={element.fontFamily}
          required
        />
      </label>
      <label className="text-control">
        <span>Min Size</span>
        <input
          name="minFontSize"
          type="number"
          aria-label="Editable balloon minimum font size"
          min="8"
          max="200"
          defaultValue={element.minFontSize}
        />
      </label>
      <label className="text-control">
        <span>Max Size</span>
        <input
          name="maxFontSize"
          type="number"
          aria-label="Editable balloon maximum font size"
          min="8"
          max="200"
          defaultValue={element.maxFontSize}
        />
      </label>
      <label className="text-control">
        <span>Weight</span>
        <select
          name="fontWeight"
          aria-label="Editable balloon font weight"
          defaultValue={element.fontWeight}
        >
          <option value="400">Regular</option>
          <option value="600">Semibold</option>
          <option value="700">Bold</option>
        </select>
      </label>
      <label className="text-control">
        <span>Align</span>
        <select
          name="align"
          aria-label="Editable balloon text alignment"
          defaultValue={element.align}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </label>
      <label className="text-control">
        <span>Line Height</span>
        <input
          name="lineHeight"
          type="number"
          aria-label="Editable balloon line height"
          min="0.8"
          max="2.5"
          step="0.05"
          defaultValue={element.lineHeight}
        />
      </label>
      <label className="text-control">
        <span>Padding</span>
        <input
          name="padding"
          type="number"
          aria-label="Editable balloon text padding"
          min="0"
          step="1"
          defaultValue={element.padding}
        />
      </label>
      <fieldset className="balloon-tail-controls">
        <legend>Tail</legend>
        <label>
          <input
            name="tailEnabled"
            type="checkbox"
            defaultChecked={element.tail.enabled}
          />
          Show tail
        </label>
        <label>
          <span>Side</span>
          <select
            name="tailSide"
            aria-label="Editable balloon tail side"
            defaultValue={element.tail.side}
          >
            <option value="top">Top</option>
            <option value="right">Right</option>
            <option value="bottom">Bottom</option>
            <option value="left">Left</option>
          </select>
        </label>
        <label>
          <span>Anchor</span>
          <input
            name="tailAnchor"
            type="number"
            aria-label="Editable balloon tail anchor"
            min="0.1"
            max="0.9"
            step="0.01"
            defaultValue={element.tail.anchor}
          />
        </label>
        <label>
          <span>Width</span>
          <input
            name="tailWidth"
            type="number"
            aria-label="Editable balloon tail width"
            min="0.04"
            max="0.5"
            step="0.01"
            defaultValue={element.tail.width}
          />
        </label>
        <label>
          <span>Tip X</span>
          <input
            name="tailTipX"
            type="number"
            aria-label="Editable balloon tail tip X"
            min="-1"
            max="2"
            step="0.01"
            defaultValue={element.tail.tip.x}
          />
        </label>
        <label>
          <span>Tip Y</span>
          <input
            name="tailTipY"
            type="number"
            aria-label="Editable balloon tail tip Y"
            min="-1"
            max="2"
            step="0.01"
            defaultValue={element.tail.tip.y}
          />
        </label>
      </fieldset>
      <button className="text-apply-button" type="submit">
        Apply balloon
      </button>
    </form>
  )
}
