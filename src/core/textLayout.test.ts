import { describe, expect, it } from 'vitest'

import { layoutAutoFitText } from './textLayout'

const measureMonospace = (text: string, fontSize: number) =>
  text.length * fontSize * 0.5

describe('layoutAutoFitText', () => {
  it('chooses the largest fitting size and preserves explicit paragraphs', () => {
    const result = layoutAutoFitText(
      {
        text: 'A quiet table\nwaits here',
        width: 180,
        height: 100,
        padding: 10,
        minFontSize: 10,
        maxFontSize: 40,
        lineHeight: 1.2,
      },
      measureMonospace,
    )

    expect(result.fits).toBe(true)
    expect(result.fontSize).toBeGreaterThan(24)
    expect(result.lines).toEqual(['A quiet table', 'waits here'])
  })

  it('wraps words and splits a long unbroken sound effect safely', () => {
    const result = layoutAutoFitText(
      {
        text: 'A verylongunbrokensoundeffect arrives',
        width: 80,
        height: 300,
        padding: 5,
        minFontSize: 12,
        maxFontSize: 12,
        lineHeight: 1,
      },
      measureMonospace,
    )

    expect(result.fits).toBe(true)
    expect(result.lines.every((line) => measureMonospace(line, 12) <= 70)).toBe(
      true,
    )
    expect(result.lines.join('')).toContain('verylongunbrokensoundeffect')
  })

  it('reports when even the minimum size cannot fit', () => {
    const result = layoutAutoFitText(
      {
        text: 'one two three four five six',
        width: 40,
        height: 20,
        padding: 2,
        minFontSize: 12,
        maxFontSize: 28,
        lineHeight: 1.2,
      },
      measureMonospace,
    )

    expect(result.fontSize).toBe(12)
    expect(result.fits).toBe(false)
  })

  it('fails safely for invalid geometry', () => {
    expect(
      layoutAutoFitText(
        {
          text: 'Hello',
          width: 0,
          height: 100,
          padding: 10,
          minFontSize: 10,
          maxFontSize: 20,
          lineHeight: 1.2,
        },
        measureMonospace,
      ),
    ).toMatchObject({ fits: false })
  })
})
