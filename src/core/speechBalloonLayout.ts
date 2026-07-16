import type { SpeechBalloonElement } from './episode'
import { layoutAutoFitText, type AutoFitTextLayout } from './textLayout'

/**
 * Deterministic font-width seam shared by every balloon renderer. It is a
 * deliberately conservative approximation so editor, preview, and export wrap
 * the same words even when the operating system exposes different font metrics.
 */
export function measureSpeechBalloonTextWidth(
  text: string,
  fontSize: number,
  fontWeight: SpeechBalloonElement['fontWeight'],
): number {
  const weightFactor = fontWeight === 700 ? 0.57 : fontWeight === 600 ? 0.55 : 0.53
  return Array.from(text).reduce((width, character) => {
    if (character === ' ') return width + fontSize * 0.3
    if (/[,.'!|:;]/.test(character)) return width + fontSize * 0.28
    if (/[MW@#]/.test(character)) return width + fontSize * 0.78
    return width + fontSize * weightFactor
  }, 0)
}

export function getSpeechBalloonTextLayout(
  element: Pick<
    SpeechBalloonElement,
    | 'text'
    | 'bounds'
    | 'padding'
    | 'minFontSize'
    | 'maxFontSize'
    | 'lineHeight'
    | 'fontWeight'
  >,
): AutoFitTextLayout {
  return layoutAutoFitText(
    {
      text: element.text,
      width: element.bounds.width,
      height: element.bounds.height,
      padding: element.padding,
      minFontSize: element.minFontSize,
      maxFontSize: element.maxFontSize,
      lineHeight: element.lineHeight,
    },
    (text, fontSize) =>
      measureSpeechBalloonTextWidth(text, fontSize, element.fontWeight),
  )
}
