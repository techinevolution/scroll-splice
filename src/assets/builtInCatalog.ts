import {
  BUILT_IN_ASSET_CATEGORY_IDS,
  type BuiltInAssetDefinition,
} from './types'

function createTransparentSvgSource(
  width: number,
  height: number,
  body: string,
): string {
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" data-scrollsplice-transparent="true">`,
    body,
    '</svg>',
  ].join('')

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function defineBuiltIn(
  definition: Omit<BuiltInAssetDefinition, 'mediaType' | 'source'> & {
    readonly body: string
  },
): BuiltInAssetDefinition {
  return {
    id: definition.id,
    categoryId: definition.categoryId,
    displayName: definition.displayName,
    mediaType: 'image/svg+xml',
    intrinsicWidth: definition.intrinsicWidth,
    intrinsicHeight: definition.intrinsicHeight,
    source: createTransparentSvgSource(
      definition.intrinsicWidth,
      definition.intrinsicHeight,
      definition.body,
    ),
  }
}

export const BUILT_IN_ASSETS = [
  defineBuiltIn({
    id: 'builtin-speech-balloon-oval-v1',
    categoryId: 'speech-balloons',
    displayName: 'Oval balloon',
    intrinsicWidth: 360,
    intrinsicHeight: 250,
    body:
      '<ellipse cx="180" cy="105" rx="158" ry="84" fill="#fff" stroke="#211a2b" stroke-width="10"/><path d="M232 177c22 17 40 34 53 55-31-11-57-27-77-48" fill="#fff" stroke="#211a2b" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M225 177c-5 4-11 7-17 9" stroke="#fff" stroke-width="12" stroke-linecap="round"/>',
  }),
  defineBuiltIn({
    id: 'builtin-speech-balloon-rounded-v1',
    categoryId: 'speech-balloons',
    displayName: 'Rounded balloon',
    intrinsicWidth: 360,
    intrinsicHeight: 250,
    body:
      '<rect x="24" y="24" width="312" height="166" rx="48" fill="#fff" stroke="#211a2b" stroke-width="10"/><path d="M104 183c-8 20-21 38-40 52 31-3 58-15 78-42" fill="#fff" stroke="#211a2b" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M106 183c10 5 22 9 36 10" stroke="#fff" stroke-width="12" stroke-linecap="round"/>',
  }),
  defineBuiltIn({
    id: 'builtin-speech-balloon-cloud-v1',
    categoryId: 'speech-balloons',
    displayName: 'Cloud balloon',
    intrinsicWidth: 380,
    intrinsicHeight: 270,
    body:
      '<path d="M85 190c-37 0-62-21-62-51 0-24 17-43 43-49-7-34 18-65 54-65 18 0 33 7 44 19 14-19 36-31 62-31 38 0 69 26 73 60 34 2 60 25 60 55 0 34-31 62-69 62H85Z" fill="#fff" stroke="#211a2b" stroke-width="10" stroke-linejoin="round"/><circle cx="98" cy="222" r="18" fill="#fff" stroke="#211a2b" stroke-width="8"/><circle cx="65" cy="250" r="10" fill="#fff" stroke="#211a2b" stroke-width="6"/>',
  }),
  defineBuiltIn({
    id: 'builtin-decoration-corner-flourish-v1',
    categoryId: 'decorations',
    displayName: 'Corner flourish',
    intrinsicWidth: 300,
    intrinsicHeight: 300,
    body:
      '<path d="M24 276C36 144 112 49 276 24" stroke="#211a2b" stroke-width="14" stroke-linecap="round"/><path d="M41 237c57-4 99-35 125-92M79 181c-4-48 16-88 61-120M142 116c45 3 80-15 104-54" stroke="#211a2b" stroke-width="9" stroke-linecap="round"/><circle cx="42" cy="239" r="11" fill="#211a2b"/><circle cx="141" cy="116" r="9" fill="#211a2b"/>',
  }),
  defineBuiltIn({
    id: 'builtin-decoration-divider-v1',
    categoryId: 'decorations',
    displayName: 'Ornamental divider',
    intrinsicWidth: 520,
    intrinsicHeight: 140,
    body:
      '<path d="M28 70h167c26 0 35-26 65-26s39 26 65 26h167" stroke="#211a2b" stroke-width="10" stroke-linecap="round"/><path d="M28 94h180c22 0 30 20 52 20s30-20 52-20h180" stroke="#211a2b" stroke-width="5" stroke-linecap="round"/><path d="m260 20 18 25-18 25-18-25 18-25Z" fill="#211a2b"/><circle cx="28" cy="70" r="10" fill="#211a2b"/><circle cx="492" cy="70" r="10" fill="#211a2b"/>',
  }),
  defineBuiltIn({
    id: 'builtin-decoration-radiance-v1',
    categoryId: 'decorations',
    displayName: 'Radiance accent',
    intrinsicWidth: 320,
    intrinsicHeight: 320,
    body:
      '<g stroke="#211a2b" stroke-linecap="round"><path d="M160 20v70M160 230v70M20 160h70M230 160h70" stroke-width="12"/><path d="m61 61 50 50M209 209l50 50M259 61l-50 50M111 209l-50 50" stroke-width="9"/><path d="m105 30 22 62M193 228l22 62M30 215l62-22M228 127l62-22" stroke-width="6"/></g><circle cx="160" cy="160" r="36" fill="none" stroke="#211a2b" stroke-width="10"/>',
  }),
  defineBuiltIn({
    id: 'builtin-splatter-round-v1',
    categoryId: 'splatters',
    displayName: 'Round ink splatter',
    intrinsicWidth: 360,
    intrinsicHeight: 300,
    body:
      '<path d="M84 166c-10-44 24-89 73-94 49-6 95 23 105 66 11 45-25 88-76 94-48 5-92-22-102-66Z" fill="#211a2b"/><circle cx="61" cy="85" r="24" fill="#211a2b"/><circle cx="292" cy="90" r="17" fill="#211a2b"/><circle cx="306" cy="215" r="28" fill="#211a2b"/><circle cx="44" cy="238" r="12" fill="#211a2b"/><circle cx="250" cy="268" r="9" fill="#211a2b"/>',
  }),
  defineBuiltIn({
    id: 'builtin-splatter-streak-v1',
    categoryId: 'splatters',
    displayName: 'Ink streak splatter',
    intrinsicWidth: 440,
    intrinsicHeight: 260,
    body:
      '<path d="M31 164c72-66 161-83 265-52 42 12 79 32 113 59-93-23-177-15-252 23-49 25-91 18-126-30Z" fill="#211a2b"/><path d="m86 124 42-92 13 100 58-111-25 126 95-112-65 136 138-88-110 120" stroke="#211a2b" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/><circle cx="383" cy="65" r="18" fill="#211a2b"/><circle cx="406" cy="222" r="11" fill="#211a2b"/><circle cx="50" cy="222" r="15" fill="#211a2b"/>',
  }),
  defineBuiltIn({
    id: 'builtin-splatter-drops-v1',
    categoryId: 'splatters',
    displayName: 'Scattered ink drops',
    intrinsicWidth: 360,
    intrinsicHeight: 320,
    body:
      '<path d="M164 27c20 35 43 60 43 88 0 29-20 49-47 49s-47-20-47-49c0-28 27-56 51-88Z" fill="#211a2b"/><path d="M277 123c15 25 31 44 31 65 0 22-15 37-35 37s-35-15-35-37c0-21 20-42 39-65Z" fill="#211a2b"/><path d="M79 164c12 21 26 37 26 55 0 19-13 31-30 31s-30-12-30-31c0-18 17-35 34-55Z" fill="#211a2b"/><circle cx="172" cy="245" r="31" fill="#211a2b"/><circle cx="290" cy="278" r="14" fill="#211a2b"/><circle cx="105" cy="292" r="9" fill="#211a2b"/>',
  }),
] as const satisfies readonly BuiltInAssetDefinition[]

export function getBuiltInAssetsByCategory(
  categoryId: (typeof BUILT_IN_ASSET_CATEGORY_IDS)[number],
): readonly BuiltInAssetDefinition[] {
  return BUILT_IN_ASSETS.filter(
    (asset) => asset.categoryId === categoryId,
  )
}
