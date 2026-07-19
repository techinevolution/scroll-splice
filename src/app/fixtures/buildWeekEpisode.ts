import {
  DEFAULT_ELEMENT_OVERFLOW,
  DEFAULT_IMAGE_FRAME,
  EPISODE_FORMAT_VERSION,
  EPISODE_LOGICAL_WIDTH,
  IDENTITY_ELEMENT_TRANSFORM,
  type AssetReference,
  type EpisodeDocument,
  type EpisodeElement,
  type ImageElement,
  type LayerPlane,
  type TextElement,
} from '../../core/episode'

const TOP_MARGIN = 160
const BOTTOM_MARGIN = 280
const PANEL_HEIGHT = 1080
const PANEL_GAP = 120
const PANEL_X = 40
const PANEL_WIDTH = 720
const CAPTION_X = 80
const CAPTION_WIDTH = 640
const CAPTION_HEIGHT = 72

interface FixtureBeat {
  readonly id: string
  readonly panelName: string
  readonly caption: string
  readonly imageAssetId: string
}

export const BUILD_WEEK_BEATS = [
  {
    id: 'beat-01-stillness',
    panelName: 'The falling star',
    caption:
      'Mara watched a turquoise star fall beyond the sleeping rooftops.',
    imageAssetId: 'demo-light-we-planted-panel-01',
  },
  {
    id: 'beat-02-spark',
    panelName: 'The light in the rain',
    caption: 'In the rain, she found its light still warm.',
    imageAssetId: 'demo-light-we-planted-panel-02',
  },
  {
    id: 'beat-03-search',
    panelName: 'The forgotten path',
    caption: 'It tugged her through streets that had forgotten the sun.',
    imageAssetId: 'demo-light-we-planted-panel-03',
  },
  {
    id: 'beat-04-crossing',
    panelName: 'The rooftop',
    caption: 'At the highest roof, Mara pressed the light into dry soil.',
    imageAssetId: 'demo-light-we-planted-panel-04',
  },
  {
    id: 'beat-05-chorus',
    panelName: 'The waking garden',
    caption: 'One green spark became a garden before her eyes.',
    imageAssetId: 'demo-light-we-planted-panel-05',
  },
  {
    id: 'beat-06-dawn',
    panelName: 'The city blooms',
    caption: 'By dawn, the whole city remembered how to bloom.',
    imageAssetId: 'demo-light-we-planted-panel-06',
  },
] as const satisfies readonly FixtureBeat[]

export const BUILD_WEEK_LAYER_PLANE_IDS = {
  backgroundBase: 'background-plane-1',
  backgroundFree: 'background-plane-2',
  contentPanels: 'content-plane-1',
  contentText: 'content-plane-2',
  foregroundAccents: 'foreground-plane-1',
} as const

const buildWeekLayerPlanes = [
  {
    id: BUILD_WEEK_LAYER_PLANE_IDS.backgroundBase,
    kind: 'base',
    compositionGroup: 'background',
    order: 1,
    visible: true,
    baseColor: '#F3F0EA',
  },
  {
    id: BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree,
    kind: 'ordinary',
    compositionGroup: 'background',
    order: 2,
    visible: true,
    name: 'Atmosphere',
  },
  {
    id: BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
    kind: 'ordinary',
    compositionGroup: 'content',
    order: 1,
    visible: true,
    name: 'Story Art',
  },
  {
    id: BUILD_WEEK_LAYER_PLANE_IDS.contentText,
    kind: 'ordinary',
    compositionGroup: 'content',
    order: 2,
    visible: true,
    name: 'Lettering',
  },
  {
    id: BUILD_WEEK_LAYER_PLANE_IDS.foregroundAccents,
    kind: 'ordinary',
    compositionGroup: 'foreground',
    order: 1,
    visible: true,
    name: 'Effects',
  },
] as const satisfies readonly LayerPlane[]

const syntheticReference = {
  kind: 'synthetic',
  generatorId: 'scrollsplice-build-week-fixture-v1',
} as const satisfies AssetReference

const defaultElementGeometry = {
  transform: IDENTITY_ELEMENT_TRANSFORM,
  overflow: DEFAULT_ELEMENT_OVERFLOW,
} as const

function createBeatElements(
  beat: FixtureBeat,
  beatIndex: number,
): EpisodeElement[] {
  const panelY = TOP_MARGIN + beatIndex * (PANEL_HEIGHT + PANEL_GAP)
  const storyPanel: ImageElement = {
    id: `${beat.id}-story-image`,
    name: `Panel ${beatIndex + 1} · ${beat.panelName}`,
    layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.contentPanels,
    type: 'image',
    bounds: {
      x: PANEL_X,
      y: panelY,
      width: PANEL_WIDTH,
      height: PANEL_HEIGHT,
    },
    presentation: 'single',
    frame: DEFAULT_IMAGE_FRAME,
    opacity: 1,
    blendMode: 'normal',
    ...defaultElementGeometry,
    visible: true,
    locked: false,
    zIndex: beatIndex,
    assetReference: {
      kind: 'built-in',
      assetId: beat.imageAssetId,
    },
  }

  const caption: TextElement = {
    id: `${beat.id}-caption`,
    name: `Narration ${beatIndex + 1}`,
    layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.contentText,
    type: 'text',
    bounds: {
      x: CAPTION_X,
      y: panelY + PANEL_HEIGHT + 12,
      width: CAPTION_WIDTH,
      height: CAPTION_HEIGHT,
    },
    text: beat.caption,
    fill: '#29232E',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    fontSize: 24,
    fontWeight: 600,
    lineHeight: 1.35,
    align: 'center',
    opacity: 1,
    blendMode: 'normal',
    ...defaultElementGeometry,
    visible: true,
    locked: false,
    zIndex: beatIndex + 1,
    assetReference: syntheticReference,
  }

  return beatIndex === 0
    ? [createEpisodeTitle(), storyPanel, caption]
    : [storyPanel, caption]
}

function createEpisodeTitle(): TextElement {
  return {
    id: 'beat-01-stillness-title',
    name: 'Episode title',
    layerPlaneId: BUILD_WEEK_LAYER_PLANE_IDS.contentText,
    type: 'text',
    bounds: {
      x: CAPTION_X,
      y: 48,
      width: CAPTION_WIDTH,
      height: 70,
    },
    text: 'THE LIGHT WE PLANTED',
    fill: '#29232E',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    fontSize: 44,
    fontWeight: 700,
    lineHeight: 1.1,
    align: 'center',
    opacity: 1,
    blendMode: 'normal',
    ...defaultElementGeometry,
    visible: true,
    locked: false,
    zIndex: 0,
    assetReference: syntheticReference,
  }
}

const logicalHeight =
  TOP_MARGIN +
  BUILD_WEEK_BEATS.length * PANEL_HEIGHT +
  (BUILD_WEEK_BEATS.length - 1) * PANEL_GAP +
  BOTTOM_MARGIN

export const buildWeekEpisode: EpisodeDocument = {
  id: 'episode-build-week-the-light-we-planted',
  formatVersion: EPISODE_FORMAT_VERSION,
  name: 'The Light We Planted',
  logicalWidth: EPISODE_LOGICAL_WIDTH,
  logicalHeight,
  compositionGroupVisibility: {
    background: true,
    content: true,
    foreground: true,
  },
  layerPlanes: buildWeekLayerPlanes,
  elements: BUILD_WEEK_BEATS.flatMap(createBeatElements),
  elementGroups: [],
}
