import { describe, expect, it } from 'vitest'

import {
  BUILD_WEEK_LAYER_PLANE_IDS,
  buildWeekEpisode,
} from '../app/fixtures/buildWeekEpisode'
import { BACKGROUND_COLOR_REGION_GENERATOR_ID } from '../core/commands'
import { createBlankEpisode } from '../core/createBlankEpisode'
import {
  APPEARANCE_EPISODE_FORMAT_VERSION,
  DEFAULT_IMAGE_FRAME,
  EPISODE_FORMAT_VERSION,
  IDENTITY_ELEMENT_TRANSFORM,
  IMAGE_EPISODE_FORMAT_VERSION,
  LEGACY_EPISODE_FORMAT_VERSION,
  type EpisodeDocument,
} from '../core/episode'
import {
  PROJECT_STORAGE_FORMAT_VERSION,
  PROJECT_STORAGE_KEY,
  createLocalStorageProjectRepository,
  parseEpisodeDocument,
  type StorageLike,
} from './projectRepository'

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

type MutableRecord = Record<string, unknown>

function cloneEpisode(): MutableRecord {
  return JSON.parse(JSON.stringify(buildWeekEpisode)) as MutableRecord
}

function cloneVersion5Episode(): MutableRecord {
  const episode = cloneEpisode()
  episode.formatVersion = APPEARANCE_EPISODE_FORMAT_VERSION
  delete episode.elementGroups

  for (const element of readRecordArray(episode, 'elements')) {
    delete element.transform
    delete element.overflow

    if (element.type === 'image') {
      delete element.frame
    }
  }

  return episode
}

function cloneVersion4Episode(): MutableRecord {
  const episode = cloneVersion5Episode()
  episode.formatVersion = IMAGE_EPISODE_FORMAT_VERSION

  for (const element of readRecordArray(episode, 'elements')) {
    delete element.blendMode

    if (element.type === 'shape') {
      const fill = readRecord(element.fill)

      if (fill.kind !== 'solid' || typeof fill.color !== 'string') {
        throw new Error('Expected a solid v5 shape fixture.')
      }

      element.fill = fill.color
    } else {
      delete element.opacity
    }

    if (element.type === 'image') {
      delete element.presentation
    }
  }

  return episode
}

function cloneLegacyEpisode(): MutableRecord {
  const episode = cloneVersion4Episode()
  episode.formatVersion = LEGACY_EPISODE_FORMAT_VERSION
  return episode
}

function readRecord(value: unknown): MutableRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Expected a mutable record in the persistence fixture.')
  }

  return value as MutableRecord
}

function readRecordArray(
  record: MutableRecord,
  key: string,
): MutableRecord[] {
  const value = record[key]

  if (!Array.isArray(value)) {
    throw new Error(`Expected ${key} to be an array in the persistence fixture.`)
  }

  return value.map(readRecord)
}

function storedEnvelope(episode: unknown, storageFormatVersion = 1) {
  return JSON.stringify({
    storageFormatVersion,
    savedAt: '2026-07-14T19:00:00.000Z',
    episode,
  })
}

function appendImageElement(
  episode: MutableRecord,
  assetReference: MutableRecord,
): void {
  const ordinaryPlane = readRecordArray(episode, 'layerPlanes').find(
    (layerPlane) => layerPlane.kind === 'ordinary',
  )
  const elements = episode.elements

  if (!ordinaryPlane || typeof ordinaryPlane.id !== 'string') {
    throw new Error('Missing an ordinary plane in the persistence fixture.')
  }

  if (!Array.isArray(elements)) {
    throw new Error('Missing elements in the persistence fixture.')
  }

  episode.elements = [
    ...elements,
    {
      id: 'fixture-image-1',
      name: 'Fixture image',
      layerPlaneId: ordinaryPlane.id,
      type: 'image',
      bounds: { x: 40, y: 60, width: 200, height: 100 },
      visible: true,
      locked: false,
      zIndex: 100,
      assetReference,
      ...(episode.formatVersion === EPISODE_FORMAT_VERSION ||
      episode.formatVersion === APPEARANCE_EPISODE_FORMAT_VERSION
        ? {
            opacity: 1,
            blendMode: 'normal',
            presentation: 'single',
            ...(episode.formatVersion === EPISODE_FORMAT_VERSION
              ? {
                  transform: IDENTITY_ELEMENT_TRANSFORM,
                  overflow: 'constrained',
                  frame: DEFAULT_IMAGE_FRAME,
                }
              : {}),
          }
        : {}),
    },
  ]
}

describe('local project repository', () => {
  it('round-trips the current v6 episode through one versioned slot', () => {
    const storage = new MemoryStorage()
    const repository = createLocalStorageProjectRepository(
      storage,
      () => new Date('2026-07-14T19:00:00.000Z'),
    )

    expect(repository.save(buildWeekEpisode)).toEqual({
      ok: true,
      savedAt: '2026-07-14T19:00:00.000Z',
    })
    expect(JSON.parse(storage.values.get(PROJECT_STORAGE_KEY) ?? '')).toMatchObject(
      {
        storageFormatVersion: PROJECT_STORAGE_FORMAT_VERSION,
        savedAt: '2026-07-14T19:00:00.000Z',
        episode: {
          id: buildWeekEpisode.id,
          formatVersion: EPISODE_FORMAT_VERSION,
        },
      },
    )
    expect(repository.loadLast()).toEqual({
      ok: true,
      savedAt: '2026-07-14T19:00:00.000Z',
      episode: buildWeekEpisode,
    })
  })

  it('round-trips a newly created empty episode', () => {
    const storage = new MemoryStorage()
    const repository = createLocalStorageProjectRepository(storage)
    const blankEpisode = createBlankEpisode('episode-local-new')

    expect(repository.save(blankEpisode).ok).toBe(true)
    expect(repository.loadLast()).toMatchObject({
      ok: true,
      episode: blankEpisode,
    })
  })

  it('reports unavailable storage and a missing save without throwing', () => {
    const unavailable = createLocalStorageProjectRepository(undefined)
    const empty = createLocalStorageProjectRepository(new MemoryStorage())

    expect(unavailable.save(buildWeekEpisode)).toMatchObject({
      ok: false,
      reason: 'storage-unavailable',
    })
    expect(unavailable.loadLast()).toMatchObject({
      ok: false,
      reason: 'storage-unavailable',
    })
    expect(empty.loadLast()).toMatchObject({
      ok: false,
      reason: 'not-found',
    })
  })

  it('catches read, write, and serialization failures', () => {
    const readFailure: StorageLike = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => undefined,
    }
    const writeFailure: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota')
      },
    }

    expect(
      createLocalStorageProjectRepository(readFailure).loadLast(),
    ).toMatchObject({ ok: false, reason: 'read-failed' })
    expect(
      createLocalStorageProjectRepository(writeFailure).save(buildWeekEpisode),
    ).toMatchObject({ ok: false, reason: 'write-failed' })
    expect(
      createLocalStorageProjectRepository(new MemoryStorage(), () => {
        throw new Error('clock failed')
      }).save(buildWeekEpisode),
    ).toMatchObject({ ok: false, reason: 'serialization-failed' })
  })

  it('does not mutate or delete corrupt saved data', () => {
    const storage = new MemoryStorage()
    const corrupt = '{not json'
    storage.setItem(PROJECT_STORAGE_KEY, corrupt)

    expect(
      createLocalStorageProjectRepository(storage).loadLast(),
    ).toMatchObject({ ok: false, reason: 'corrupt' })
    expect(storage.getItem(PROJECT_STORAGE_KEY)).toBe(corrupt)
  })

  it('distinguishes unsupported storage and episode versions from corruption', () => {
    const storage = new MemoryStorage()
    storage.setItem(
      PROJECT_STORAGE_KEY,
      storedEnvelope(buildWeekEpisode, 2),
    )
    expect(
      createLocalStorageProjectRepository(storage).loadLast(),
    ).toMatchObject({ ok: false, reason: 'unsupported-version' })

    storage.setItem(
      PROJECT_STORAGE_KEY,
      storedEnvelope({ ...buildWeekEpisode, formatVersion: 99 }),
    )
    expect(
      createLocalStorageProjectRepository(storage).loadLast(),
    ).toMatchObject({ ok: false, reason: 'unsupported-version' })

    storage.setItem(
      PROJECT_STORAGE_KEY,
      JSON.stringify({ episode: buildWeekEpisode }),
    )
    expect(
      createLocalStorageProjectRepository(storage).loadLast(),
    ).toMatchObject({ ok: false, reason: 'corrupt' })
  })

  it('rejects an invalid document before overwriting an existing save', () => {
    const storage = new MemoryStorage()
    const repository = createLocalStorageProjectRepository(storage)
    expect(repository.save(buildWeekEpisode).ok).toBe(true)
    const previousSave = storage.getItem(PROJECT_STORAGE_KEY)

    const invalid = cloneEpisode()
    const firstElement = readRecordArray(invalid, 'elements')[0]
    if (!firstElement) throw new Error('Missing fixture element.')
    firstElement.layerPlaneId = 'missing-plane'

    expect(
      repository.save(invalid as unknown as EpisodeDocument),
    ).toMatchObject({
      ok: false,
      reason: 'invalid-document',
    })
    expect(storage.getItem(PROJECT_STORAGE_KEY)).toBe(previousSave)
  })

  it('upgrades a legacy v3 episode before writing it to storage', () => {
    const storage = new MemoryStorage()
    const repository = createLocalStorageProjectRepository(
      storage,
      () => new Date('2026-07-14T19:00:00.000Z'),
    )
    const legacyEpisode = cloneLegacyEpisode()

    expect(
      repository.save(legacyEpisode as unknown as EpisodeDocument),
    ).toMatchObject({ ok: true })

    const stored = readRecord(
      JSON.parse(storage.getItem(PROJECT_STORAGE_KEY) ?? '') as unknown,
    )
    const storedEpisode = readRecord(stored.episode)

    expect(storedEpisode.formatVersion).toBe(EPISODE_FORMAT_VERSION)
    expect(repository.loadLast()).toMatchObject({
      ok: true,
      episode: { formatVersion: EPISODE_FORMAT_VERSION },
    })
  })

  it('upgrades a v4 image-capable episode before writing it to storage', () => {
    const storage = new MemoryStorage()
    const repository = createLocalStorageProjectRepository(storage)
    const version4Episode = cloneVersion4Episode()

    appendImageElement(version4Episode, {
      kind: 'built-in',
      assetId: 'speech-bubble-rounded',
    })

    expect(
      repository.save(version4Episode as unknown as EpisodeDocument),
    ).toMatchObject({ ok: true })
    expect(repository.loadLast()).toMatchObject({
      ok: true,
      episode: {
        formatVersion: EPISODE_FORMAT_VERSION,
        elements: expect.arrayContaining([
          expect.objectContaining({
            id: 'fixture-image-1',
            opacity: 1,
            blendMode: 'normal',
            presentation: 'single',
          }),
        ]),
      },
    })
  })
})

describe('parseEpisodeDocument', () => {
  it('accepts known shapes, text, and asset-reference forms', () => {
    const episode = cloneEpisode()
    const firstElement = readRecordArray(episode, 'elements')[0]
    if (!firstElement) throw new Error('Missing fixture element.')
    firstElement.assetReference = {
      kind: 'imported',
      assetId: 'asset-local-1',
    }

    expect(parseEpisodeDocument(episode)).toMatchObject({
      ok: true,
      episode: { formatVersion: EPISODE_FORMAT_VERSION },
    })
  })

  it('accepts a legacy v3 shape-and-text document and upgrades it to v6', () => {
    const result = parseEpisodeDocument(cloneLegacyEpisode())

    expect(result).toMatchObject({
      ok: true,
      episode: { formatVersion: EPISODE_FORMAT_VERSION },
    })
  })

  it('preserves legacy shape opacity while defaulting other v3 appearances', () => {
    const episode = cloneLegacyEpisode()
    const shape = readRecordArray(episode, 'elements').find(
      (element) => element.type === 'shape',
    )
    const text = readRecordArray(episode, 'elements').find(
      (element) => element.type === 'text',
    )

    if (!shape || !text) {
      throw new Error('Missing legacy appearance fixtures.')
    }

    shape.opacity = 0.37
    const result = parseEpisodeDocument(episode)

    expect(result).toMatchObject({
      ok: true,
      episode: { formatVersion: EPISODE_FORMAT_VERSION },
    })

    if (!result.ok) {
      throw new Error('The legacy appearance fixture did not migrate.')
    }

    expect(
      result.episode.elements.find(({ id }) => id === shape.id),
    ).toMatchObject({
      fill: { kind: 'solid' },
      opacity: 0.37,
      blendMode: 'normal',
    })
    expect(
      result.episode.elements.find(({ id }) => id === text.id),
    ).toMatchObject({ opacity: 1, blendMode: 'normal' })
  })

  it('preserves v4 shape opacity while normalizing its appearance fields', () => {
    const episode = cloneVersion4Episode()
    const shape = readRecordArray(episode, 'elements').find(
      (element) => element.type === 'shape',
    )

    if (!shape) {
      throw new Error('Missing v4 shape fixture.')
    }

    shape.opacity = 0.42
    const result = parseEpisodeDocument(episode)

    if (!result.ok) {
      throw new Error('The v4 shape fixture did not migrate.')
    }

    expect(
      result.episode.elements.find(({ id }) => id === shape.id),
    ).toMatchObject({
      fill: { kind: 'solid' },
      opacity: 0.42,
      blendMode: 'normal',
    })
  })

  it('upgrades v5 appearance documents with deterministic v6 geometry defaults', () => {
    const episode = cloneVersion5Episode()
    appendImageElement(episode, {
      kind: 'imported',
      assetId: 'upload-v5',
    })

    const result = parseEpisodeDocument(episode)

    if (!result.ok) {
      throw new Error('The v5 geometry fixture did not migrate.')
    }

    expect(result.episode.formatVersion).toBe(EPISODE_FORMAT_VERSION)
    expect(result.episode.elementGroups).toEqual([])
    expect(result.episode.elements).not.toHaveLength(0)
    expect(
      result.episode.elements.every(
        (element) =>
          element.transform.rotationDegrees === 0 &&
          !element.transform.flipX &&
          !element.transform.flipY &&
          element.overflow === 'constrained',
      ),
    ).toBe(true)
    expect(result.episode.elements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          transform: IDENTITY_ELEMENT_TRANSFORM,
          overflow: 'constrained',
        }),
        expect.objectContaining({
          id: 'fixture-image-1',
          presentation: 'single',
          frame: DEFAULT_IMAGE_FRAME,
        }),
      ]),
    )
  })

  it('accepts and preserves a strict v5 vertical two-stop gradient', () => {
    const episode = cloneVersion5Episode()
    const shape = readRecordArray(episode, 'elements').find(
      (element) => element.type === 'shape',
    )

    if (!shape) {
      throw new Error('Missing v5 shape fixture.')
    }

    shape.fill = {
      kind: 'vertical-gradient',
      top: { color: '#102030', opacity: 0.2 },
      bottom: { color: '#A0B0C0', opacity: 0.8 },
    }
    shape.layerPlaneId = BUILD_WEEK_LAYER_PLANE_IDS.backgroundFree
    shape.assetReference = {
      kind: 'synthetic',
      generatorId: BACKGROUND_COLOR_REGION_GENERATOR_ID,
    }

    expect(parseEpisodeDocument(episode)).toMatchObject({
      ok: true,
      episode: {
        elements: expect.arrayContaining([
          expect.objectContaining({
            id: shape.id,
            fill: shape.fill,
          }),
        ]),
      },
    })
  })

  it('rejects a v5 gradient on an ordinary non-Background shape', () => {
    const episode = cloneVersion5Episode()
    const shape = readRecordArray(episode, 'elements').find(
      (element) => element.type === 'shape',
    )

    if (!shape) {
      throw new Error('Missing v5 shape fixture.')
    }

    shape.fill = {
      kind: 'vertical-gradient',
      top: { color: '#102030', opacity: 0.2 },
      bottom: { color: '#A0B0C0', opacity: 0.8 },
    }

    expect(parseEpisodeDocument(episode)).toMatchObject({
      ok: false,
      reason: 'corrupt',
    })
  })

  it.each([
    [{ kind: 'built-in', assetId: 'speech-bubble-rounded' }],
    [{ kind: 'imported', assetId: 'upload-1' }],
  ])('accepts a v4 image with a supported asset reference', (assetReference) => {
    const episode = cloneVersion4Episode()
    appendImageElement(episode, assetReference)

    expect(parseEpisodeDocument(episode)).toMatchObject({
      ok: true,
      episode: {
        formatVersion: EPISODE_FORMAT_VERSION,
        elements: expect.arrayContaining([
          expect.objectContaining({
            id: 'fixture-image-1',
            type: 'image',
            assetReference,
          }),
        ]),
      },
    })
  })

  it('rejects an image element tagged as a legacy v3 document', () => {
    const episode = cloneLegacyEpisode()
    appendImageElement(episode, {
      kind: 'imported',
      assetId: 'upload-1',
    })

    expect(parseEpisodeDocument(episode)).toMatchObject({
      ok: false,
      reason: 'corrupt',
    })
  })

  it.each([
    [{ kind: 'synthetic', generatorId: 'fixture-image' }],
    [{ kind: 'built-in', assetId: '   ' }],
    [{ kind: 'unknown', assetId: 'fixture-image' }],
  ])('rejects a v4 image with an unsupported asset reference', (assetReference) => {
    const episode = cloneVersion4Episode()
    appendImageElement(episode, assetReference)

    expect(parseEpisodeDocument(episode)).toMatchObject({
      ok: false,
      reason: 'corrupt',
    })
  })

  it.each([
    ['duplicate plane IDs', (episode: MutableRecord) => {
      const planes = readRecordArray(episode, 'layerPlanes')
      if (!planes[0] || !planes[1]) throw new Error('Missing fixture planes.')
      planes[1].id = planes[0].id
    }],
    ['noncontiguous plane order', (episode: MutableRecord) => {
      const plane = readRecordArray(episode, 'layerPlanes')[1]
      if (!plane) throw new Error('Missing fixture plane.')
      plane.order = 7
    }],
    ['duplicate element IDs', (episode: MutableRecord) => {
      const elements = readRecordArray(episode, 'elements')
      if (!elements[0] || !elements[1]) throw new Error('Missing fixture elements.')
      elements[1].id = elements[0].id
    }],
    ['missing plane reference', (episode: MutableRecord) => {
      const element = readRecordArray(episode, 'elements')[0]
      if (!element) throw new Error('Missing fixture element.')
      element.layerPlaneId = 'missing-plane'
    }],
    ['element assigned to base plane', (episode: MutableRecord) => {
      const element = readRecordArray(episode, 'elements')[0]
      if (!element) throw new Error('Missing fixture element.')
      element.layerPlaneId = 'background-plane-1'
    }],
    ['out-of-bounds geometry', (episode: MutableRecord) => {
      const element = readRecordArray(episode, 'elements')[0]
      if (!element) throw new Error('Missing fixture element.')
      readRecord(element.bounds).x = 799
    }],
    ['unknown shape type', (episode: MutableRecord) => {
      const element = readRecordArray(episode, 'elements')[0]
      if (!element) throw new Error('Missing fixture element.')
      element.shape = 'triangle'
    }],
    ['invalid text alignment', (episode: MutableRecord) => {
      const text = readRecordArray(episode, 'elements').find(
        (element) => element.type === 'text',
      )
      if (!text) throw new Error('Missing fixture text element.')
      text.align = 'middle'
    }],
    ['invalid asset reference', (episode: MutableRecord) => {
      const element = readRecordArray(episode, 'elements')[0]
      if (!element) throw new Error('Missing fixture element.')
      element.assetReference = {
        kind: 'synthetic',
        generatorId: '',
      }
    }],
    ['missing current opacity', (episode: MutableRecord) => {
      const element = readRecordArray(episode, 'elements')[0]
      if (!element) throw new Error('Missing fixture element.')
      delete element.opacity
    }],
    ['out-of-range current opacity', (episode: MutableRecord) => {
      const element = readRecordArray(episode, 'elements')[0]
      if (!element) throw new Error('Missing fixture element.')
      element.opacity = 1.1
    }],
    ['invalid current blend mode', (episode: MutableRecord) => {
      const element = readRecordArray(episode, 'elements')[0]
      if (!element) throw new Error('Missing fixture element.')
      element.blendMode = 'difference'
    }],
    ['legacy string fill in the current format', (episode: MutableRecord) => {
      const shape = readRecordArray(episode, 'elements').find(
        (element) => element.type === 'shape',
      )
      if (!shape) throw new Error('Missing fixture shape.')
      shape.fill = '#123456'
    }],
    ['invalid current gradient stop opacity', (episode: MutableRecord) => {
      const shape = readRecordArray(episode, 'elements').find(
        (element) => element.type === 'shape',
      )
      if (!shape) throw new Error('Missing fixture shape.')
      shape.fill = {
        kind: 'vertical-gradient',
        top: { color: '#000000', opacity: Number.NaN },
        bottom: { color: '#FFFFFF', opacity: 1 },
      }
    }],
  ])('rejects %s', (_description, mutate) => {
    const episode = cloneEpisode()
    mutate(episode)

    expect(parseEpisodeDocument(episode)).toMatchObject({
      ok: false,
      reason: 'corrupt',
    })
  })

  it('rejects a v5 image without a valid presentation', () => {
    const episode = cloneVersion5Episode()
    appendImageElement(episode, {
      kind: 'imported',
      assetId: 'upload-1',
    })
    const image = readRecordArray(episode, 'elements').at(-1)

    if (!image) {
      throw new Error('Missing v5 image fixture.')
    }

    delete image.presentation

    expect(parseEpisodeDocument(episode)).toMatchObject({
      ok: false,
      reason: 'corrupt',
    })
  })

  it('accepts a tiled v5 image with strict appearance fields', () => {
    const episode = cloneVersion5Episode()
    appendImageElement(episode, {
      kind: 'imported',
      assetId: 'upload-1',
    })
    const image = readRecordArray(episode, 'elements').at(-1)

    if (!image) {
      throw new Error('Missing tiled v5 image fixture.')
    }

    image.presentation = 'tile'
    image.opacity = 0.6
    image.blendMode = 'multiply'

    expect(parseEpisodeDocument(episode)).toMatchObject({
      ok: true,
      episode: {
        elements: expect.arrayContaining([
          expect.objectContaining({
            id: 'fixture-image-1',
            presentation: 'tile',
            opacity: 0.6,
            blendMode: 'multiply',
          }),
        ]),
      },
    })
  })

  it('accepts v6 cover, polygon frame, transform, bleed, and flat groups', () => {
    const episode = cloneEpisode()
    appendImageElement(episode, {
      kind: 'imported',
      assetId: 'upload-v6',
    })
    const image = readRecordArray(episode, 'elements').at(-1)
    const groupedElements = readRecordArray(episode, 'elements').slice(0, 2)

    if (!image || !groupedElements[0] || !groupedElements[1]) {
      throw new Error('Missing v6 fixtures.')
    }

    image.presentation = 'cover'
    image.transform = { rotationDegrees: 15, flipX: true, flipY: false }
    image.overflow = 'bleed'
    image.frame = {
      mask: {
        kind: 'polygon',
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 0.2 },
          { x: 0.8, y: 1 },
          { x: 0.1, y: 0.8 },
        ],
      },
      crop: { focusX: 0.2, focusY: 0.8, zoom: 2 },
      border: { color: '#FFFFFF', width: 3 },
    }
    episode.elementGroups = [
      {
        id: 'group-1',
        memberElementIds: [groupedElements[0].id, groupedElements[1].id],
      },
    ]

    expect(parseEpisodeDocument(episode)).toMatchObject({
      ok: true,
      episode: {
        formatVersion: EPISODE_FORMAT_VERSION,
        elementGroups: episode.elementGroups,
        elements: expect.arrayContaining([
          expect.objectContaining({
            id: 'fixture-image-1',
            presentation: 'cover',
            transform: image.transform,
            overflow: 'bleed',
            frame: image.frame,
          }),
        ]),
      },
    })
  })

  it('accepts a v6 bleed element with bounds outside the output that still intersects', () => {
    const episode = cloneEpisode()
    const element = readRecordArray(episode, 'elements')[0]

    if (!element) throw new Error('Missing v6 bleed fixture.')
    readRecord(element.bounds).x = -100
    element.overflow = 'bleed'

    expect(parseEpisodeDocument(episode)).toMatchObject({ ok: true })
  })

  it.each([
    ['missing transform', (episode: MutableRecord) => {
      const element = readRecordArray(episode, 'elements')[0]
      if (!element) throw new Error('Missing v6 element.')
      delete element.transform
    }],
    ['non-normalized rotation', (episode: MutableRecord) => {
      const element = readRecordArray(episode, 'elements')[0]
      if (!element) throw new Error('Missing v6 element.')
      readRecord(element.transform).rotationDegrees = 180
    }],
    ['invalid overflow', (episode: MutableRecord) => {
      const element = readRecordArray(episode, 'elements')[0]
      if (!element) throw new Error('Missing v6 element.')
      element.overflow = 'anywhere'
    }],
    ['missing element groups', (episode: MutableRecord) => {
      delete episode.elementGroups
    }],
    ['group with a missing element', (episode: MutableRecord) => {
      const element = readRecordArray(episode, 'elements')[0]
      if (!element) throw new Error('Missing v6 group fixture.')
      episode.elementGroups = [
        {
          id: 'bad-group',
          memberElementIds: [element.id, 'missing-element'],
        },
      ]
    }],
    ['cover image without a valid frame', (episode: MutableRecord) => {
      appendImageElement(episode, {
        kind: 'imported',
        assetId: 'upload-invalid-frame',
      })
      const image = readRecordArray(episode, 'elements').at(-1)
      if (!image) throw new Error('Missing v6 image fixture.')
      image.presentation = 'cover'
      image.frame = {
        mask: {
          kind: 'polygon',
          points: [
            { x: 0, y: 0 },
            { x: 0.5, y: 0.5 },
            { x: 1, y: 1 },
          ],
        },
        crop: { focusX: 0.5, focusY: 0.5, zoom: 1 },
      }
    }],
  ])('rejects v6 %s', (_description, mutate) => {
    const episode = cloneEpisode()
    mutate(episode)

    expect(parseEpisodeDocument(episode)).toMatchObject({
      ok: false,
      reason: 'corrupt',
    })
  })
})
