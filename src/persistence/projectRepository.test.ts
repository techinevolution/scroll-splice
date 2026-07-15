import { describe, expect, it } from 'vitest'

import { buildWeekEpisode } from '../app/fixtures/buildWeekEpisode'
import { createBlankEpisode } from '../core/createBlankEpisode'
import type { EpisodeDocument } from '../core/episode'
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

describe('local project repository', () => {
  it('round-trips the current v3 episode through one versioned slot', () => {
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
        episode: { id: buildWeekEpisode.id, formatVersion: 3 },
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
      episode: { formatVersion: 3 },
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
  ])('rejects %s', (_description, mutate) => {
    const episode = cloneEpisode()
    mutate(episode)

    expect(parseEpisodeDocument(episode)).toMatchObject({
      ok: false,
      reason: 'corrupt',
    })
  })
})
