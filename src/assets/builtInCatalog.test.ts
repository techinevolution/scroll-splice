import { describe, expect, it } from 'vitest'

import {
  BUILT_IN_ASSETS,
  getBuiltInAssetsByCategory,
} from './builtInCatalog'
import { BUILT_IN_ASSET_CATEGORY_IDS } from './types'

function decodeSvgSource(source: string): string {
  const separatorIndex = source.indexOf(',')

  if (separatorIndex < 0) {
    throw new Error('The built-in SVG source has no data-URI separator.')
  }

  return decodeURIComponent(source.slice(separatorIndex + 1))
}

describe('built-in asset catalog', () => {
  it('keeps editable balloons out of the fixed image catalog', () => {
    expect(BUILT_IN_ASSET_CATEGORY_IDS).toEqual([
      'speech-balloons',
      'decorations',
      'splatters',
    ])
    expect(BUILT_IN_ASSETS).toHaveLength(6)
    expect(getBuiltInAssetsByCategory('speech-balloons')).toHaveLength(0)
    expect(getBuiltInAssetsByCategory('decorations')).toHaveLength(3)
    expect(getBuiltInAssetsByCategory('splatters')).toHaveLength(3)
  })

  it('uses stable unique IDs, names, dimensions, and sources', () => {
    const ids = new Set(BUILT_IN_ASSETS.map(({ id }) => id))
    const sources = new Set(BUILT_IN_ASSETS.map(({ source }) => source))

    expect(ids.size).toBe(BUILT_IN_ASSETS.length)
    expect(sources.size).toBe(BUILT_IN_ASSETS.length)

    for (const asset of BUILT_IN_ASSETS) {
      expect(asset.id).toMatch(/^builtin-[a-z0-9-]+-v1$/)
      expect(asset.displayName.trim()).toBe(asset.displayName)
      expect(asset.displayName.length).toBeGreaterThan(0)
      expect(asset.intrinsicWidth).toBeGreaterThan(0)
      expect(asset.intrinsicHeight).toBeGreaterThan(0)
      expect(asset.mediaType).toBe('image/svg+xml')
      expect(asset.source).toMatch(
        /^data:image\/svg\+xml;charset=utf-8,/,
      )
    }
  })

  it('keeps every inline SVG transparent and self-contained', () => {
    for (const asset of BUILT_IN_ASSETS) {
      const svg = decodeSvgSource(asset.source)

      expect(svg).toContain('data-scrollsplice-transparent="true"')
      expect(svg).toContain(
        `viewBox="0 0 ${asset.intrinsicWidth} ${asset.intrinsicHeight}"`,
      )
      expect(svg).toContain(`width="${asset.intrinsicWidth}"`)
      expect(svg).toContain(`height="${asset.intrinsicHeight}"`)
      expect(svg).not.toMatch(/<script|<foreignObject/i)
      expect(svg).not.toMatch(/\b(?:href|xlink:href)\s*=/i)
      expect(svg).not.toMatch(/\burl\s*\(/i)
      expect(svg).not.toMatch(/<rect[^>]+width="100%"[^>]+height="100%"/i)
    }
  })

})
