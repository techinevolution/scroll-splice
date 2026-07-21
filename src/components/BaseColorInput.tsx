import { useEffect, useRef } from 'react'

import { useEditorStore } from '../app/store'

export function BaseColorInput({
  ariaLabel,
  value,
}: {
  readonly ariaLabel: string
  readonly value: string
}) {
  const setBaseColor = useEditorStore((state) => state.setBaseColor)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const input = inputRef.current

    if (
      input &&
      document.activeElement !== input &&
      input.value.toLowerCase() !== value.toLowerCase()
    ) {
      input.value = value
    }
  }, [value])

  return (
    <input
      ref={inputRef}
      type="color"
      aria-label={ariaLabel}
      defaultValue={value}
      onChange={(event) => setBaseColor(event.currentTarget.value)}
    />
  )
}
