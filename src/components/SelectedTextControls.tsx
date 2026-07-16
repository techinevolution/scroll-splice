import {
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'

import { useEditorStore } from '../app/store'
import { MAX_TEXT_CONTENT_LENGTH } from '../core/commands'
import type { TextElement } from '../core/episode'

interface SelectedTextControlsProps {
  readonly element: TextElement
}

interface TextDraft {
  readonly text: string
  readonly fill: string
  readonly fontSize: string
  readonly fontWeight: TextElement['fontWeight']
  readonly align: TextElement['align']
}

function createDraft(element: TextElement): TextDraft {
  return {
    text: element.text,
    fill: element.fill,
    fontSize: String(element.fontSize),
    fontWeight: element.fontWeight,
    align: element.align,
  }
}

function parseFontSize(value: string): number | undefined {
  if (value.trim() === '') return undefined

  const fontSize = Number(value)
  return Number.isFinite(fontSize) && fontSize >= 8 && fontSize <= 200
    ? fontSize
    : undefined
}

export function SelectedTextControls({
  element,
}: SelectedTextControlsProps) {
  const updateTextElement = useEditorStore(
    (state) => state.updateTextElement,
  )
  const [draft, setDraft] = useState<TextDraft>(() => createDraft(element))

  const fontSize = parseFontSize(draft.fontSize)
  const wordingIsBlank = draft.text.trim().length === 0
  const wordingIsTooLong = draft.text.trim().length > MAX_TEXT_CONTENT_LENGTH
  const draftIsValid =
    !wordingIsBlank && !wordingIsTooLong && fontSize !== undefined
  const hasDraftChanges =
    draft.text !== element.text ||
    draft.fill !== element.fill ||
    fontSize !== element.fontSize ||
    draft.fontWeight !== element.fontWeight ||
    draft.align !== element.align
  const canApply = draftIsValid && hasDraftChanges

  const applyDraft = () => {
    if (!canApply || fontSize === undefined) return

    updateTextElement(element.id, {
      text: draft.text,
      fill: draft.fill,
      fontSize,
      fontWeight: draft.fontWeight,
      align: draft.align,
    })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    applyDraft()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      applyDraft()
    }
  }

  return (
    <form
      className="selected-text-controls"
      aria-label={`${element.name} text properties`}
      data-testid="selected-text-controls"
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
    >
      <label className="text-control text-wording-control">
        <span>Wording</span>
        <textarea
          aria-label="Selected text wording"
          aria-invalid={wordingIsBlank || wordingIsTooLong}
          data-testid="selected-text-wording"
          maxLength={MAX_TEXT_CONTENT_LENGTH}
          rows={2}
          value={draft.text}
          onChange={(event) => {
            const text = event.currentTarget.value
            setDraft((current) => ({
              ...current,
              text,
            }))
          }}
        />
      </label>

      <label className="text-control text-color-control">
        <span>Color</span>
        <input
          type="color"
          aria-label="Selected text color"
          data-testid="selected-text-color"
          value={draft.fill}
          onChange={(event) => {
            const fill = event.currentTarget.value
            setDraft((current) => ({
              ...current,
              fill,
            }))
          }}
        />
      </label>

      <label className="text-control text-font-size-control">
        <span>Size</span>
        <input
          type="number"
          aria-label="Selected text font size"
          aria-invalid={fontSize === undefined}
          data-testid="selected-text-font-size"
          min="8"
          max="200"
          step="1"
          value={draft.fontSize}
          onChange={(event) => {
            const fontSize = event.currentTarget.value
            setDraft((current) => ({
              ...current,
              fontSize,
            }))
          }}
        />
      </label>

      <label className="text-control text-font-weight-control">
        <span>Weight</span>
        <select
          aria-label="Selected text font weight"
          data-testid="selected-text-font-weight"
          value={draft.fontWeight}
          onChange={(event) => {
            const fontWeight = Number(event.currentTarget.value) as
              | 400
              | 600
              | 700
            setDraft((current) => ({
              ...current,
              fontWeight,
            }))
          }}
        >
          <option value="400">Regular</option>
          <option value="600">Semibold</option>
          <option value="700">Bold</option>
        </select>
      </label>

      <label className="text-control text-alignment-control">
        <span>Align</span>
        <select
          aria-label="Selected text alignment"
          data-testid="selected-text-alignment"
          value={draft.align}
          onChange={(event) => {
            const align = event.currentTarget.value as TextElement['align']
            setDraft((current) => ({
              ...current,
              align,
            }))
          }}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </label>

      <button
        className="text-apply-button"
        type="submit"
        data-testid="selected-text-apply"
        disabled={!canApply}
      >
        Apply
      </button>
    </form>
  )
}
