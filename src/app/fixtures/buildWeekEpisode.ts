import {
  EPISODE_FORMAT_VERSION,
  EPISODE_LOGICAL_WIDTH,
  type AssetReference,
  type ElementBounds,
  type EpisodeDocument,
  type EpisodeElement,
  type ShapeElement,
  type TextElement,
} from '../../core/episode'

const TOP_MARGIN = 120
const BOTTOM_MARGIN = 160
const BEAT_HEIGHT = 620
const BEAT_GAP = 120
const BEAT_X = 40
const BEAT_WIDTH = 720

interface FixtureShape {
  readonly shape: ShapeElement['shape']
  readonly bounds: ElementBounds
  readonly fill: string
  readonly opacity?: number
  readonly cornerRadius?: number
}

interface FixtureBeat {
  readonly id: string
  readonly title: string
  readonly caption: string
  readonly background: string
  readonly titleColor: string
  readonly captionColor: string
  readonly accents: readonly [FixtureShape, FixtureShape]
}

export const BUILD_WEEK_BEATS = [
  {
    id: 'beat-01-stillness',
    title: 'Stillness',
    caption: 'The city sleeps beneath a violet sky.',
    background: '#211934',
    titleColor: '#F7F1FF',
    captionColor: '#C8B9E1',
    accents: [
      {
        shape: 'ellipse',
        bounds: { x: 230, y: 160, width: 340, height: 300 },
        fill: '#7050B8',
        opacity: 0.24,
      },
      {
        shape: 'ellipse',
        bounds: { x: 364, y: 266, width: 72, height: 72 },
        fill: '#F6DB88',
      },
    ],
  },
  {
    id: 'beat-02-spark',
    title: 'Spark',
    caption: 'One small light answers the dark.',
    background: '#14273D',
    titleColor: '#EDF7FF',
    captionColor: '#B8D1E5',
    accents: [
      {
        shape: 'rectangle',
        bounds: { x: 148, y: 286, width: 504, height: 30 },
        fill: '#3A6D8E',
        cornerRadius: 15,
      },
      {
        shape: 'ellipse',
        bounds: { x: 330, y: 206, width: 140, height: 140 },
        fill: '#FFB45D',
      },
    ],
  },
  {
    id: 'beat-03-search',
    title: 'Search',
    caption: 'It follows a ribbon no map remembers.',
    background: '#143734',
    titleColor: '#ECFFFA',
    captionColor: '#B7DCD5',
    accents: [
      {
        shape: 'rectangle',
        bounds: { x: 118, y: 210, width: 242, height: 38 },
        fill: '#3D8E80',
        cornerRadius: 19,
      },
      {
        shape: 'rectangle',
        bounds: { x: 340, y: 318, width: 342, height: 38 },
        fill: '#8BE0C9',
        cornerRadius: 19,
      },
    ],
  },
  {
    id: 'beat-04-crossing',
    title: 'Crossing',
    caption: 'The gap becomes a bridge.',
    background: '#3B2430',
    titleColor: '#FFF2F7',
    captionColor: '#E3C0CC',
    accents: [
      {
        shape: 'rectangle',
        bounds: { x: 120, y: 258, width: 230, height: 130 },
        fill: '#8D5068',
        cornerRadius: 26,
      },
      {
        shape: 'rectangle',
        bounds: { x: 450, y: 258, width: 230, height: 130 },
        fill: '#D18BA4',
        cornerRadius: 26,
      },
    ],
  },
  {
    id: 'beat-05-chorus',
    title: 'Chorus',
    caption: 'Other lights wake and join the path.',
    background: '#352A13',
    titleColor: '#FFF9E8',
    captionColor: '#E4D2A0',
    accents: [
      {
        shape: 'ellipse',
        bounds: { x: 172, y: 206, width: 190, height: 190 },
        fill: '#D69335',
      },
      {
        shape: 'ellipse',
        bounds: { x: 438, y: 206, width: 190, height: 190 },
        fill: '#F5D46F',
      },
    ],
  },
  {
    id: 'beat-06-dawn',
    title: 'Dawn',
    caption: 'Together, they draw a new horizon.',
    background: '#362449',
    titleColor: '#FFF4FF',
    captionColor: '#DDC8E8',
    accents: [
      {
        shape: 'rectangle',
        bounds: { x: 94, y: 334, width: 612, height: 66 },
        fill: '#9B6BC0',
        cornerRadius: 33,
      },
      {
        shape: 'ellipse',
        bounds: { x: 278, y: 170, width: 244, height: 244 },
        fill: '#FFBE72',
      },
    ],
  },
] as const satisfies readonly FixtureBeat[]

const syntheticReference = {
  kind: 'synthetic',
  generatorId: 'scrollsplice-build-week-fixture-v1',
} as const satisfies AssetReference

function offsetBounds(bounds: ElementBounds, yOffset: number): ElementBounds {
  return {
    ...bounds,
    y: bounds.y + yOffset,
  }
}

function createBeatElements(
  beat: FixtureBeat,
  beatIndex: number,
): EpisodeElement[] {
  const yOffset = TOP_MARGIN + beatIndex * (BEAT_HEIGHT + BEAT_GAP)
  const baseZIndex = beatIndex * 5
  const layerPrefix = `Beat ${beatIndex + 1} · ${beat.title}`

  const background: ShapeElement = {
    id: `${beat.id}-background`,
    name: `${layerPrefix} · Background`,
    compositionGroup: 'background',
    type: 'shape',
    shape: 'rectangle',
    bounds: {
      x: BEAT_X,
      y: yOffset,
      width: BEAT_WIDTH,
      height: BEAT_HEIGHT,
    },
    fill: beat.background,
    stroke: '#FFFFFF',
    strokeWidth: 2,
    cornerRadius: 32,
    opacity: 1,
    visible: true,
    locked: false,
    zIndex: baseZIndex,
    assetReference: syntheticReference,
  }

  const accents: ShapeElement[] = beat.accents.map((accent, accentIndex) => ({
    id: `${beat.id}-accent-${accentIndex + 1}`,
    name: `${layerPrefix} · Accent ${accentIndex + 1}`,
    compositionGroup: 'foreground',
    type: 'shape',
    shape: accent.shape,
    bounds: offsetBounds(accent.bounds, yOffset),
    fill: accent.fill,
    opacity: accent.opacity ?? 1,
    cornerRadius: accent.cornerRadius,
    visible: true,
    locked: false,
    zIndex: baseZIndex + accentIndex + 1,
    assetReference: syntheticReference,
  }))

  const title: TextElement = {
    id: `${beat.id}-title`,
    name: `${layerPrefix} · Title`,
    compositionGroup: 'content',
    type: 'text',
    bounds: {
      x: 80,
      y: yOffset + 56,
      width: 640,
      height: 70,
    },
    text: beat.title,
    fill: beat.titleColor,
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    fontSize: 52,
    fontWeight: 700,
    lineHeight: 1.1,
    align: 'center',
    visible: true,
    locked: false,
    zIndex: baseZIndex + 3,
    assetReference: syntheticReference,
  }

  const caption: TextElement = {
    id: `${beat.id}-caption`,
    name: `${layerPrefix} · Caption`,
    compositionGroup: 'content',
    type: 'text',
    bounds: {
      x: 80,
      y: yOffset + 496,
      width: 640,
      height: 72,
    },
    text: beat.caption,
    fill: beat.captionColor,
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    fontSize: 24,
    fontWeight: 600,
    lineHeight: 1.35,
    align: 'center',
    visible: true,
    locked: false,
    zIndex: baseZIndex + 4,
    assetReference: syntheticReference,
  }

  return [background, ...accents, title, caption]
}

const logicalHeight =
  TOP_MARGIN +
  BUILD_WEEK_BEATS.length * BEAT_HEIGHT +
  (BUILD_WEEK_BEATS.length - 1) * BEAT_GAP +
  BOTTOM_MARGIN

export const buildWeekEpisode: EpisodeDocument = {
  id: 'episode-build-week-signal-in-the-fog',
  formatVersion: EPISODE_FORMAT_VERSION,
  name: 'Signal in the Fog',
  logicalWidth: EPISODE_LOGICAL_WIDTH,
  logicalHeight,
  compositionGroupVisibility: {
    background: true,
    content: true,
    foreground: true,
  },
  elements: BUILD_WEEK_BEATS.flatMap(createBeatElements),
}
