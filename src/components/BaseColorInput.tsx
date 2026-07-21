import { useEditorStore } from '../app/store'

interface EyeDropperResult {
  readonly sRGBHex: string
}

interface EyeDropperInstance {
  open(): Promise<EyeDropperResult>
}

type EyeDropperConstructor = new () => EyeDropperInstance

function PipetteIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="m19.4 4.6-1-1a2 2 0 0 0-2.8 0l-2.1 2.1-1.2-1.2-1.4 1.4 1.2 1.2-7.8 7.8a2 2 0 0 0-.5.9l-.8 3.2 3.2-.8a2 2 0 0 0 .9-.5l7.8-7.8 1.2 1.2 1.4-1.4-1.2-1.2 2.1-2.1a2 2 0 0 0 0-2.8Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

export function BaseColorInput({
  ariaLabel,
  value,
}: {
  readonly ariaLabel: string
  readonly value: string
}) {
  const setBaseColor = useEditorStore((state) => state.setBaseColor)
  const samplerActive = useEditorStore(
    (state) => state.baseColorSamplerActive,
  )
  const setSamplerActive = useEditorStore(
    (state) => state.setBaseColorSamplerActive,
  )

  const pickColor = async () => {
    if (samplerActive) {
      setSamplerActive(false)
      return
    }

    const EyeDropper = (
      window as typeof window & {
        readonly EyeDropper?: EyeDropperConstructor
      }
    ).EyeDropper

    if (!EyeDropper) {
      setSamplerActive(true)
      return
    }

    try {
      const result = await new EyeDropper().open()
      setBaseColor(result.sRGBHex)
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setSamplerActive(true)
      }
    }
  }

  return (
    <div className="base-color-input">
      <input
        type="color"
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => setBaseColor(event.currentTarget.value)}
      />
      <button
        type="button"
        className="base-color-eyedropper"
        aria-label={
          samplerActive
            ? 'Cancel canvas color sampling'
            : 'Pick base color from canvas'
        }
        aria-pressed={samplerActive}
        title={
          samplerActive
            ? 'Cancel color sampling'
            : 'Pick a color from the screen or canvas'
        }
        onClick={() => void pickColor()}
      >
        <PipetteIcon />
      </button>
    </div>
  )
}
