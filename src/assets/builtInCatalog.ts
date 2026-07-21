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

export const RESOLVABLE_BUILT_IN_ASSETS = [
  defineBuiltIn({
    id: 'builtin-speech-balloon-oval-v1',
    categoryId: 'speech-balloons',
    displayName: 'Oval balloon',
    intrinsicWidth: 360,
    intrinsicHeight: 250,
    body:
      '<path d="M180 21c87 0 158 38 158 84 0 34-37 63-90 76 18 15 34 32 48 52-32-10-61-25-85-43-10 1-20 1-31 1-87 0-158-39-158-86s71-84 158-84Z" fill="#fff" stroke="#211a2b" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>',
  }),
  defineBuiltIn({
    id: 'builtin-speech-balloon-rounded-v1',
    categoryId: 'speech-balloons',
    displayName: 'Rounded balloon',
    intrinsicWidth: 360,
    intrinsicHeight: 250,
    body:
      '<path d="M72 24h216c27 0 48 21 48 48v70c0 27-21 48-48 48H145c-20 22-47 37-81 45 19-17 33-32 42-45H72c-27 0-48-21-48-48V72c0-27 21-48 48-48Z" fill="#fff" stroke="#211a2b" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>',
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
    id: 'builtin-speech-balloon-whisper-v1',
    categoryId: 'speech-balloons',
    displayName: 'Whisper balloon',
    intrinsicWidth: 380,
    intrinsicHeight: 270,
    body:
      '<path d="M190 24c91 0 165 42 165 94 0 40-43 73-104 87 18 14 34 31 47 50-31-10-60-25-84-43-8 1-16 1-24 1-91 0-165-42-165-95s74-94 165-94Z" fill="#fff" stroke="#211a2b" stroke-width="8" stroke-dasharray="8 9" stroke-linecap="round" stroke-linejoin="round"/>',
  }),
  defineBuiltIn({
    id: 'builtin-speech-balloon-shout-v1',
    categoryId: 'speech-balloons',
    displayName: 'Shout balloon',
    intrinsicWidth: 390,
    intrinsicHeight: 290,
    body:
      '<path d="m195 16 20 35 34-27 5 43 45-14-13 42 48 2-30 34 43 20-42 19 29 35-48 1 13 43-45-15-5 43-34-27-20 35-20-35-34 27-5-43-45 15 13-43-48-1 29-35-42-19 43-20-30-34 48-2-13-42 45 14 5-43 34 27 20-35Z" fill="#fff" stroke="#211a2b" stroke-width="10" stroke-linejoin="round"/><path d="m245 224 58 49-25-66" fill="#fff" stroke="#211a2b" stroke-width="10" stroke-linejoin="round"/>',
  }),
  defineBuiltIn({
    id: 'builtin-speech-balloon-electric-v1',
    categoryId: 'speech-balloons',
    displayName: 'Electric balloon',
    intrinsicWidth: 390,
    intrinsicHeight: 290,
    body:
      '<path d="M45 72 72 51l19 13 24-28 25 19 28-31 27 26 29-26 24 31 30-19 19 30 31-14 9 34 33 1-12 33 31 15-25 26 24 25-32 14 11 34-34 1-10 33-30-14-20 29-26-20-27 27-25-30-30 18-17-31-32 12-7-35-34-3 14-32-30-17 26-25-22-28 32-12-8-35 34 2Z" fill="#fff" stroke="#211a2b" stroke-width="9" stroke-linejoin="round"/><path d="m250 217 16 57 19-27 24 22-13-58" fill="#fff" stroke="#211a2b" stroke-width="9" stroke-linejoin="round"/>',
  }),
  defineBuiltIn({
    id: 'builtin-speech-balloon-rough-v1',
    categoryId: 'speech-balloons',
    displayName: 'Rough balloon',
    intrinsicWidth: 380,
    intrinsicHeight: 280,
    body:
      '<path d="M49 76c18-32 51-51 91-47 27-21 66-17 88 5 38-9 75 7 91 36 32 14 45 46 31 73 11 35-13 68-50 76-18 27-55 38-88 24-34 15-76 9-99-17-38 1-70-21-73-52-26-26-21-66 9-88Z" fill="#fff" stroke="#211a2b" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><path d="M224 229c18 18 39 33 66 42-12-18-20-37-23-58" fill="#fff" stroke="#211a2b" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><path d="M51 83 35 69m65-31L91 19m78 9 2-17m70 29 11-17m58 55 19-8m18 66 19 4M61 203l-18 9m81 26-7 19" fill="none" stroke="#211a2b" stroke-width="5" stroke-linecap="round"/>',
  }),
  defineBuiltIn({
    id: 'builtin-speech-balloon-wavy-v1',
    categoryId: 'speech-balloons',
    displayName: 'Wavy balloon',
    intrinsicWidth: 380,
    intrinsicHeight: 280,
    body:
      '<path d="M38 121c7-27 24-27 29-54 5-25 25-29 47-20 18-24 39-22 58-4 22-21 45-20 65 1 22-17 45-12 58 12 27-5 44 10 43 36 24 13 27 34 8 53 16 23 5 43-22 49-2 25-23 37-46 26-15 24-38 26-60 8-22 18-46 16-62-6-23 13-44 4-50-21-27 5-44-11-40-37-24-10-28-29-8-47-17-20-8-40 20-50Z" fill="#fff" stroke="#211a2b" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M230 222c14 20 35 36 61 46-11-18-17-39-17-59" fill="#fff" stroke="#211a2b" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>',
  }),
  defineBuiltIn({
    id: 'builtin-speech-balloon-telepathic-v1',
    categoryId: 'speech-balloons',
    displayName: 'Telepathic balloon',
    intrinsicWidth: 390,
    intrinsicHeight: 280,
    body:
      '<path d="M195 31c87 0 157 40 157 90s-70 90-157 90S38 171 38 121s70-90 157-90Z" fill="#fff" stroke="#211a2b" stroke-width="9" stroke-linejoin="round"/><path d="M26 77c-17 12-17 33 0 45-17 12-17 33 0 45M364 77c17 12 17 33 0 45 17 12 17 33 0 45" fill="none" stroke="#211a2b" stroke-width="8" stroke-linecap="round"/><circle cx="118" cy="232" r="14" fill="#fff" stroke="#211a2b" stroke-width="7"/><circle cx="92" cy="258" r="8" fill="#fff" stroke="#211a2b" stroke-width="5"/>',
  }),
  defineBuiltIn({
    id: 'builtin-speech-balloon-double-outline-v1',
    categoryId: 'speech-balloons',
    displayName: 'Double Outline balloon',
    intrinsicWidth: 390,
    intrinsicHeight: 280,
    body:
      '<path d="M195 18c95 0 172 43 172 97 0 40-43 75-105 89 18 16 34 35 48 57-35-12-67-29-93-49-7 1-14 1-22 1-95 0-172-44-172-98s77-97 172-97Z" fill="#fff" stroke="#211a2b" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M195 36c82 0 149 35 149 79 0 34-42 64-101 74l-17 3 14 11c10 8 19 16 28 26-15-8-30-17-43-27l-7-5-9 1c-5 0-10 1-14 1-82 0-149-38-149-84s67-79 149-79Z" fill="none" stroke="#211a2b" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>',
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

// Speech balloons are now first-class editable elements. Keep the older fixed
// SVG definitions resolvable so saved v4/v5 projects reopen without missing
// artwork, but do not advertise them in the current Asset Library.
export const BUILT_IN_ASSETS: readonly BuiltInAssetDefinition[] =
  RESOLVABLE_BUILT_IN_ASSETS.filter(
    ({ categoryId }) => categoryId !== 'speech-balloons',
  )

export function getBuiltInAssetsByCategory(
  categoryId: (typeof BUILT_IN_ASSET_CATEGORY_IDS)[number],
): readonly BuiltInAssetDefinition[] {
  return BUILT_IN_ASSETS.filter(
    (asset) => asset.categoryId === categoryId,
  )
}
