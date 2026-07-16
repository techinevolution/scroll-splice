import { describe, expect, it } from 'vitest'

import { buildWeekEpisode } from '../app/fixtures/buildWeekEpisode'
import { createBlankEpisode } from '../core/createBlankEpisode'
import type { EpisodeDocument } from '../core/episode'
import {
  RECOVERY_STORAGE_FORMAT_VERSION,
  RECOVERY_STORAGE_KEY,
  createDebouncedLocalStorageRecoveryRepository,
  type RecoveryStorageLike,
  type RecoveryTimerScheduler,
} from './recoveryRepository'

class MemoryRecoveryStorage implements RecoveryStorageLike {
  readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }
}

class ManualTimer implements RecoveryTimerScheduler {
  private nextId = 1
  private readonly callbacks = new Map<number, () => void>()

  set(callback: () => void): number {
    const id = this.nextId++
    this.callbacks.set(id, callback)
    return id
  }

  clear(handle: unknown): void {
    this.callbacks.delete(handle as number)
  }

  runLatest(): void {
    const entry = [...this.callbacks.entries()].at(-1)
    if (!entry) throw new Error('No recovery callback is pending.')
    this.callbacks.delete(entry[0])
    entry[1]()
  }

  get size(): number {
    return this.callbacks.size
  }
}

describe('debounced local recovery repository', () => {
  it('debounces edits into a distinct recovery slot and loads the latest episode', () => {
    const storage = new MemoryRecoveryStorage()
    const timer = new ManualTimer()
    const flushes: unknown[] = []
    const repository = createDebouncedLocalStorageRecoveryRepository(storage, {
      now: () => new Date('2026-07-16T12:30:00.000Z'),
      timer,
      onFlush: (result) => flushes.push(result),
    })

    expect(repository.save('project-one', buildWeekEpisode)).toEqual({
      ok: true,
      status: 'scheduled',
    })
    expect(
      repository.save(
        'project-one',
        { ...buildWeekEpisode, name: 'Recovered title' },
      ),
    ).toEqual({ ok: true, status: 'scheduled' })
    expect(timer.size).toBe(1)
    expect(storage.getItem(RECOVERY_STORAGE_KEY)).toBeNull()

    timer.runLatest()

    expect(flushes).toEqual([
      {
        ok: true,
        status: 'saved',
        recoveredAt: '2026-07-16T12:30:00.000Z',
      },
    ])
    expect(repository.load()).toMatchObject({
      ok: true,
      recovery: {
        projectId: 'project-one',
        recoveredAt: '2026-07-16T12:30:00.000Z',
        episode: { name: 'Recovered title' },
      },
    })
    expect(
      JSON.parse(storage.getItem(RECOVERY_STORAGE_KEY) ?? ''),
    ).toMatchObject({
      storageFormatVersion: RECOVERY_STORAGE_FORMAT_VERSION,
      projectId: 'project-one',
    })
  })

  it('can synchronously flush pending recovery for lifecycle boundaries', () => {
    const storage = new MemoryRecoveryStorage()
    const timer = new ManualTimer()
    const repository = createDebouncedLocalStorageRecoveryRepository(storage, {
      now: () => new Date('2026-07-16T13:00:00.000Z'),
      timer,
    })

    expect(repository.flush()).toEqual({
      ok: true,
      status: 'nothing-pending',
    })
    expect(repository.save(null, buildWeekEpisode).ok).toBe(true)
    expect(repository.flush()).toEqual({
      ok: true,
      status: 'saved',
      recoveredAt: '2026-07-16T13:00:00.000Z',
    })
    expect(timer.size).toBe(0)
  })

  it('clear cancels pending work and removes only the recovery slot', () => {
    const storage = new MemoryRecoveryStorage()
    const timer = new ManualTimer()
    storage.setItem('scrollsplice.projects.v1', 'keep-me')
    const repository = createDebouncedLocalStorageRecoveryRepository(storage, {
      timer,
    })

    expect(repository.save(null, buildWeekEpisode).ok).toBe(true)
    expect(timer.size).toBe(1)
    expect(repository.clear()).toEqual({ ok: true })
    expect(timer.size).toBe(0)
    expect(repository.flush()).toEqual({
      ok: true,
      status: 'nothing-pending',
    })
    expect(storage.getItem(RECOVERY_STORAGE_KEY)).toBeNull()
    expect(storage.getItem('scrollsplice.projects.v1')).toBe('keep-me')
  })

  it('rejects invalid project IDs and documents before scheduling', () => {
    const timer = new ManualTimer()
    const repository = createDebouncedLocalStorageRecoveryRepository(
      new MemoryRecoveryStorage(),
      { timer },
    )

    expect(repository.save('../unsafe', buildWeekEpisode)).toMatchObject({
      ok: false,
      reason: 'invalid-project-id',
    })
    expect(
      repository.save(null, {
        ...buildWeekEpisode,
        logicalWidth: 700,
      } as unknown as EpisodeDocument),
    ).toMatchObject({ ok: false, reason: 'invalid-document' })
    expect(timer.size).toBe(0)
  })

  it('distinguishes corrupt, unknown-version, missing, and unavailable recovery', () => {
    const storage = new MemoryRecoveryStorage()
    const repository = createDebouncedLocalStorageRecoveryRepository(storage)

    expect(repository.load()).toMatchObject({ ok: false, reason: 'not-found' })
    storage.setItem(RECOVERY_STORAGE_KEY, '{bad-json')
    expect(repository.load()).toMatchObject({ ok: false, reason: 'corrupt' })
    storage.setItem(
      RECOVERY_STORAGE_KEY,
      JSON.stringify({
        storageFormatVersion: 99,
        projectId: null,
        recoveredAt: '2026-07-16T13:00:00.000Z',
        episode: createBlankEpisode('episode-recovery'),
      }),
    )
    expect(repository.load()).toMatchObject({
      ok: false,
      reason: 'unsupported-version',
    })

    const unavailable = createDebouncedLocalStorageRecoveryRepository(undefined)
    expect(unavailable.load()).toMatchObject({
      ok: false,
      reason: 'storage-unavailable',
    })
    expect(unavailable.save(null, buildWeekEpisode)).toMatchObject({
      ok: false,
      reason: 'storage-unavailable',
    })
  })
})
