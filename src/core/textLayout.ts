export interface AutoFitTextInput {
  readonly text: string
  readonly width: number
  readonly height: number
  readonly padding: number
  readonly minFontSize: number
  readonly maxFontSize: number
  readonly lineHeight: number
}

export interface AutoFitTextLayout {
  readonly fontSize: number
  readonly lines: readonly string[]
  readonly lineHeight: number
  readonly fits: boolean
}

export type MeasureTextWidth = (text: string, fontSize: number) => number

const SEARCH_PRECISION = 0.25
const MAX_SEARCH_STEPS = 24

/**
 * Framework-independent comic lettering layout. The caller supplies the font
 * measurement seam, so editor, reader preview, and export can share the same
 * wrapping and fitting rules without importing a renderer into the core.
 */
export function layoutAutoFitText(
  input: AutoFitTextInput,
  measureTextWidth: MeasureTextWidth,
): AutoFitTextLayout {
  const normalized = normalizeInput(input)

  if (!normalized) {
    return { fontSize: 1, lines: [''], lineHeight: 1, fits: false }
  }

  let lower = normalized.minFontSize
  let upper = normalized.maxFontSize
  let best = layoutAtSize(normalized, lower, measureTextWidth)

  for (
    let step = 0;
    step < MAX_SEARCH_STEPS && upper - lower > SEARCH_PRECISION;
    step += 1
  ) {
    const candidateSize = (lower + upper) / 2
    const candidate = layoutAtSize(
      normalized,
      candidateSize,
      measureTextWidth,
    )

    if (candidate.fits) {
      best = candidate
      lower = candidateSize
    } else {
      upper = candidateSize
    }
  }

  return best
}

function layoutAtSize(
  input: AutoFitTextInput,
  fontSize: number,
  measureTextWidth: MeasureTextWidth,
): AutoFitTextLayout {
  const maximumWidth = input.width - input.padding * 2
  const maximumHeight = input.height - input.padding * 2
  const lines = wrapText(input.text, maximumWidth, fontSize, measureTextWidth)
  const lineHeight = fontSize * input.lineHeight
  const textHeight = lines.length * lineHeight
  const fits =
    textHeight <= maximumHeight + Number.EPSILON &&
    lines.every(
      (line) => measureTextWidth(line, fontSize) <= maximumWidth + Number.EPSILON,
    )

  return { fontSize, lines, lineHeight, fits }
}

function wrapText(
  text: string,
  maximumWidth: number,
  fontSize: number,
  measureTextWidth: MeasureTextWidth,
): readonly string[] {
  const lines: string[] = []

  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (paragraph.trim() === '') {
      lines.push('')
      continue
    }

    const words = paragraph.trim().split(/\s+/)
    let currentLine = ''

    for (const word of words) {
      const pieces = splitOversizedWord(
        word,
        maximumWidth,
        fontSize,
        measureTextWidth,
      )

      for (const piece of pieces) {
        const candidate = currentLine ? `${currentLine} ${piece}` : piece

        if (measureTextWidth(candidate, fontSize) <= maximumWidth) {
          currentLine = candidate
        } else {
          if (currentLine) lines.push(currentLine)
          currentLine = piece
        }
      }
    }

    lines.push(currentLine)
  }

  return lines.length > 0 ? lines : ['']
}

function splitOversizedWord(
  word: string,
  maximumWidth: number,
  fontSize: number,
  measureTextWidth: MeasureTextWidth,
): readonly string[] {
  if (measureTextWidth(word, fontSize) <= maximumWidth) return [word]

  const pieces: string[] = []
  let piece = ''

  for (const character of Array.from(word)) {
    const candidate = `${piece}${character}`

    if (piece && measureTextWidth(candidate, fontSize) > maximumWidth) {
      pieces.push(piece)
      piece = character
    } else {
      piece = candidate
    }
  }

  if (piece) pieces.push(piece)
  return pieces.length > 0 ? pieces : ['']
}

function normalizeInput(input: AutoFitTextInput): AutoFitTextInput | undefined {
  if (
    !Number.isFinite(input.width) ||
    input.width <= 0 ||
    !Number.isFinite(input.height) ||
    input.height <= 0 ||
    !Number.isFinite(input.padding) ||
    input.padding < 0 ||
    input.padding * 2 >= input.width ||
    input.padding * 2 >= input.height ||
    !Number.isFinite(input.minFontSize) ||
    input.minFontSize <= 0 ||
    !Number.isFinite(input.maxFontSize) ||
    input.maxFontSize < input.minFontSize ||
    !Number.isFinite(input.lineHeight) ||
    input.lineHeight <= 0
  ) {
    return undefined
  }

  return {
    ...input,
    text: input.text || ' ',
  }
}
