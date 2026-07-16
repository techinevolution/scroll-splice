import { describe, expect, it } from 'vitest'

import { buildWeekEpisode } from '../app/fixtures/buildWeekEpisode'
import { createBlankEpisode } from '../core/createBlankEpisode'
import type { EpisodeDocument } from '../core/episode'
import {
  PROJECT_LIBRARY_STORAGE_FORMAT_VERSION,
  PROJECT_LIBRARY_STORAGE_KEY,
  createLocalStorageProjectLibraryRepository,
} from './projectLibraryRepository'
import {
  PROJECT_STORAGE_KEY,
  createLocalStorageProjectRepository,
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

function clock(...values: readonly string[]): () => Date {
  let index = 0
  return () => new Date(values[Math.min(index++, values.length - 1)]!)
}

function namedEpisode(id: string, name: string): EpisodeDocument {
  return { ...createBlankEpisode(id), name }
}

describe('local project-library repository', () => {
  it('creates, updates, lists, loads, and deletes independent local projects', () => {
    const storage = new MemoryStorage()
    const ids = ['project-first', 'project-second']
    const repository = createLocalStorageProjectLibraryRepository(storage, {
      now: clock(
        '2026-07-16T10:00:00.000Z',
        '2026-07-16T11:00:00.000Z',
        '2026-07-16T12:00:00.000Z',
      ),
      createProjectId: () => ids.shift() ?? 'project-fallback',
    })

    expect(repository.listRecent()).toEqual({ ok: true, projects: [] })
    expect(repository.saveAs(namedEpisode('episode-a', 'First'))).toEqual({
      ok: true,
      projectId: 'project-first',
      savedAt: '2026-07-16T10:00:00.000Z',
      created: true,
    })
    expect(repository.saveAs(namedEpisode('episode-b', 'Second'))).toEqual({
      ok: true,
      projectId: 'project-second',
      savedAt: '2026-07-16T11:00:00.000Z',
      created: true,
    })
    expect(
      repository.save(
        'project-first',
        namedEpisode('episode-a', 'First revised'),
      ),
    ).toEqual({
      ok: true,
      projectId: 'project-first',
      savedAt: '2026-07-16T12:00:00.000Z',
      created: false,
    })

    expect(repository.listRecent()).toEqual({
      ok: true,
      projects: [
        {
          projectId: 'project-first',
          episodeId: 'episode-a',
          name: 'First revised',
          createdAt: '2026-07-16T10:00:00.000Z',
          updatedAt: '2026-07-16T12:00:00.000Z',
        },
        {
          projectId: 'project-second',
          episodeId: 'episode-b',
          name: 'Second',
          createdAt: '2026-07-16T11:00:00.000Z',
          updatedAt: '2026-07-16T11:00:00.000Z',
        },
      ],
    })
    expect(repository.load('project-first')).toMatchObject({
      ok: true,
      project: {
        projectId: 'project-first',
        episode: { id: 'episode-a', name: 'First revised' },
      },
    })
    expect(repository.delete('project-second')).toEqual({
      ok: true,
      projectId: 'project-second',
    })
    expect(repository.load('project-second')).toMatchObject({
      ok: false,
      reason: 'not-found',
    })

    expect(
      JSON.parse(storage.getItem(PROJECT_LIBRARY_STORAGE_KEY) ?? ''),
    ).toMatchObject({
      storageFormatVersion: PROJECT_LIBRARY_STORAGE_FORMAT_VERSION,
      legacyImportCompleted: false,
      projects: [{ projectId: 'project-first' }],
    })
  })

  it('imports the old one-slot save at most once without deleting it', () => {
    const storage = new MemoryStorage()
    const legacy = createLocalStorageProjectRepository(
      storage,
      () => new Date('2026-07-14T19:00:00.000Z'),
    )
    expect(legacy.save(buildWeekEpisode).ok).toBe(true)

    const repository = createLocalStorageProjectLibraryRepository(storage, {
      createProjectId: () => 'project-imported',
    })

    expect(repository.importLegacyLast()).toEqual({
      ok: true,
      status: 'imported',
      projectId: 'project-imported',
      savedAt: '2026-07-14T19:00:00.000Z',
    })
    expect(repository.importLegacyLast()).toEqual({
      ok: true,
      status: 'already-completed',
    })
    expect(repository.listRecent()).toMatchObject({
      ok: true,
      projects: [{ projectId: 'project-imported' }],
    })
    expect(storage.getItem(PROJECT_STORAGE_KEY)).not.toBeNull()
  })

  it('records a bounded no-save legacy check', () => {
    const storage = new MemoryStorage()
    const repository = createLocalStorageProjectLibraryRepository(storage)

    expect(repository.importLegacyLast()).toEqual({
      ok: true,
      status: 'not-found',
    })
    expect(repository.importLegacyLast()).toEqual({
      ok: true,
      status: 'already-completed',
    })
  })

  it('does not overwrite corrupt storage or accept invalid IDs and documents', () => {
    const storage = new MemoryStorage()
    storage.setItem(PROJECT_LIBRARY_STORAGE_KEY, '{not-json')
    const repository = createLocalStorageProjectLibraryRepository(storage)

    expect(repository.listRecent()).toMatchObject({
      ok: false,
      reason: 'corrupt',
    })
    expect(repository.saveAs(buildWeekEpisode)).toMatchObject({
      ok: false,
      reason: 'corrupt',
    })
    expect(storage.getItem(PROJECT_LIBRARY_STORAGE_KEY)).toBe('{not-json')

    const clean = createLocalStorageProjectLibraryRepository(new MemoryStorage())
    expect(clean.load('../unsafe')).toMatchObject({
      ok: false,
      reason: 'invalid-project-id',
    })
    expect(clean.save('project-missing', buildWeekEpisode)).toMatchObject({
      ok: false,
      reason: 'not-found',
    })
    expect(
      clean.saveAs({
        ...buildWeekEpisode,
        logicalWidth: 900,
      } as unknown as EpisodeDocument),
    ).toMatchObject({ ok: false, reason: 'invalid-document' })
  })

  it('rejects unknown storage versions and repeated generated IDs', () => {
    const storage = new MemoryStorage()
    storage.setItem(
      PROJECT_LIBRARY_STORAGE_KEY,
      JSON.stringify({
        storageFormatVersion: 99,
        legacyImportCompleted: false,
        projects: [],
      }),
    )

    expect(
      createLocalStorageProjectLibraryRepository(storage).listRecent(),
    ).toMatchObject({ ok: false, reason: 'unsupported-version' })

    const cleanStorage = new MemoryStorage()
    const repository = createLocalStorageProjectLibraryRepository(cleanStorage, {
      createProjectId: () => 'project-same',
    })
    expect(repository.saveAs(buildWeekEpisode).ok).toBe(true)
    expect(repository.saveAs(buildWeekEpisode)).toMatchObject({
      ok: false,
      reason: 'id-generation-failed',
    })
  })
})
