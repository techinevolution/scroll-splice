import type { EpisodeDocument } from '../core/episode'
import { isSafeProjectId } from './projectLibraryRepository'
import {
  parseEpisodeDocument,
  type StorageLike,
} from './projectRepository'

export const RECOVERY_STORAGE_FORMAT_VERSION = 1 as const
export const RECOVERY_STORAGE_KEY = 'scrollsplice.project.recovery.v1'
export const DEFAULT_RECOVERY_DEBOUNCE_MS = 750

export interface RecoveryStorageLike extends StorageLike {
  removeItem(key: string): void
}

export interface RecoveredProject {
  readonly projectId: string | null
  readonly recoveredAt: string
  readonly episode: EpisodeDocument
}

export type RecoveryFailureReason =
  | 'storage-unavailable'
  | 'not-found'
  | 'invalid-project-id'
  | 'invalid-document'
  | 'unsupported-version'
  | 'corrupt'
  | 'read-failed'
  | 'serialization-failed'
  | 'write-failed'
  | 'clear-failed'
  | 'schedule-failed'

export interface RecoveryFailure {
  readonly ok: false
  readonly reason: RecoveryFailureReason
  readonly message: string
}

export type ScheduleRecoveryResult =
  | { readonly ok: true; readonly status: 'scheduled' }
  | RecoveryFailure

export type FlushRecoveryResult =
  | {
      readonly ok: true
      readonly status: 'saved'
      readonly recoveredAt: string
    }
  | { readonly ok: true; readonly status: 'nothing-pending' }
  | RecoveryFailure

export type LoadRecoveryResult =
  | { readonly ok: true; readonly recovery: RecoveredProject }
  | RecoveryFailure

export type ClearRecoveryResult =
  | { readonly ok: true }
  | RecoveryFailure

export interface DebouncedRecoveryRepository {
  /** Schedules recovery only. It is intentionally separate from explicit Save. */
  save(
    projectId: string | null,
    episode: EpisodeDocument,
  ): ScheduleRecoveryResult
  flush(): FlushRecoveryResult
  load(): LoadRecoveryResult
  clear(): ClearRecoveryResult
  dispose(): void
}

export interface RecoveryTimerScheduler {
  set(callback: () => void, delayMs: number): unknown
  clear(handle: unknown): void
}

export interface DebouncedRecoveryRepositoryOptions {
  readonly debounceMs?: number
  readonly now?: () => Date
  readonly timer?: RecoveryTimerScheduler
  readonly onFlush?: (result: FlushRecoveryResult) => void
}

interface StoredRecoveryEnvelopeV1 {
  readonly storageFormatVersion: typeof RECOVERY_STORAGE_FORMAT_VERSION
  readonly projectId: string | null
  readonly recoveredAt: string
  readonly episode: EpisodeDocument
}

interface PendingRecovery {
  readonly projectId: string | null
  readonly episode: EpisodeDocument
}

type RecordValue = Readonly<Record<string, unknown>>

export function createDebouncedLocalStorageRecoveryRepository(
  storage: RecoveryStorageLike | undefined,
  options: DebouncedRecoveryRepositoryOptions = {},
): DebouncedRecoveryRepository {
  const debounceMs = options.debounceMs ?? DEFAULT_RECOVERY_DEBOUNCE_MS
  const now = options.now ?? (() => new Date())
  const timer = options.timer ?? browserTimer
  let timerHandle: unknown
  let pending: PendingRecovery | undefined

  function cancelTimer(): void {
    if (timerHandle !== undefined) {
      timer.clear(timerHandle)
      timerHandle = undefined
    }
  }

  function save(
    projectId: string | null,
    episode: EpisodeDocument,
  ): ScheduleRecoveryResult {
    if (!storage) {
      return recoveryFailure(
        'storage-unavailable',
        'Local recovery storage is unavailable in this browser.',
      )
    }

    if (projectId !== null && !isSafeProjectId(projectId)) {
      return recoveryFailure(
        'invalid-project-id',
        'The recovery project ID is invalid.',
      )
    }

    const parsedEpisode = parseEpisodeDocument(episode)

    if (!parsedEpisode.ok) {
      return recoveryFailure(
        parsedEpisode.reason === 'unsupported-version'
          ? 'unsupported-version'
          : 'invalid-document',
        parsedEpisode.message,
      )
    }

    cancelTimer()
    pending = { projectId, episode: parsedEpisode.episode }

    try {
      timerHandle = timer.set(() => {
        timerHandle = undefined
        const result = flush()
        options.onFlush?.(result)
      }, Math.max(0, debounceMs))
    } catch {
      timerHandle = undefined
      return recoveryFailure(
        'schedule-failed',
        'The browser could not schedule local crash recovery.',
      )
    }

    return { ok: true, status: 'scheduled' }
  }

  function flush(): FlushRecoveryResult {
    cancelTimer()

    if (!pending) {
      return { ok: true, status: 'nothing-pending' }
    }

    if (!storage) {
      return recoveryFailure(
        'storage-unavailable',
        'Local recovery storage is unavailable in this browser.',
      )
    }

    let recoveredAt: string
    let serialized: string

    try {
      recoveredAt = now().toISOString()

      if (!isValidIsoDate(recoveredAt)) {
        return recoveryFailure(
          'serialization-failed',
          'The local recovery timestamp is invalid.',
        )
      }

      const envelope: StoredRecoveryEnvelopeV1 = {
        storageFormatVersion: RECOVERY_STORAGE_FORMAT_VERSION,
        projectId: pending.projectId,
        recoveredAt,
        episode: pending.episode,
      }
      serialized = JSON.stringify(envelope)
    } catch {
      return recoveryFailure(
        'serialization-failed',
        'The recovery snapshot could not be prepared for local storage.',
      )
    }

    try {
      storage.setItem(RECOVERY_STORAGE_KEY, serialized)
    } catch {
      return recoveryFailure(
        'write-failed',
        'The browser could not write the local recovery snapshot.',
      )
    }

    pending = undefined
    return { ok: true, status: 'saved', recoveredAt }
  }

  function load(): LoadRecoveryResult {
    if (!storage) {
      return recoveryFailure(
        'storage-unavailable',
        'Local recovery storage is unavailable in this browser.',
      )
    }

    let serialized: string | null

    try {
      serialized = storage.getItem(RECOVERY_STORAGE_KEY)
    } catch {
      return recoveryFailure(
        'read-failed',
        'The browser could not read the local recovery snapshot.',
      )
    }

    if (serialized === null) {
      return recoveryFailure('not-found', 'No local recovery snapshot was found.')
    }

    let value: unknown

    try {
      value = JSON.parse(serialized) as unknown
    } catch {
      return recoveryFailure(
        'corrupt',
        'The local recovery snapshot is not valid JSON.',
      )
    }

    return parseStoredRecovery(value)
  }

  function clear(): ClearRecoveryResult {
    cancelTimer()
    pending = undefined

    if (!storage) {
      return recoveryFailure(
        'storage-unavailable',
        'Local recovery storage is unavailable in this browser.',
      )
    }

    try {
      storage.removeItem(RECOVERY_STORAGE_KEY)
    } catch {
      return recoveryFailure(
        'clear-failed',
        'The browser could not clear the local recovery snapshot.',
      )
    }

    return { ok: true }
  }

  function dispose(): void {
    cancelTimer()
    pending = undefined
  }

  return { save, flush, load, clear, dispose }
}

function parseStoredRecovery(value: unknown): LoadRecoveryResult {
  if (!isRecord(value)) {
    return recoveryFailure('corrupt', 'The local recovery record is not an object.')
  }

  if (value.storageFormatVersion !== RECOVERY_STORAGE_FORMAT_VERSION) {
    return typeof value.storageFormatVersion === 'number'
      ? recoveryFailure(
          'unsupported-version',
          `Recovery format ${value.storageFormatVersion} is not supported by this build.`,
        )
      : recoveryFailure(
          'corrupt',
          'The local recovery record has no storage format version.',
        )
  }

  if (
    (value.projectId !== null && !isSafeProjectId(value.projectId)) ||
    !isValidIsoDate(value.recoveredAt)
  ) {
    return recoveryFailure('corrupt', 'The local recovery metadata is invalid.')
  }

  const parsedEpisode = parseEpisodeDocument(value.episode)

  return parsedEpisode.ok
    ? {
        ok: true,
        recovery: {
          projectId: value.projectId,
          recoveredAt: value.recoveredAt,
          episode: parsedEpisode.episode,
        },
      }
    : recoveryFailure(parsedEpisode.reason, parsedEpisode.message)
}

const browserTimer: RecoveryTimerScheduler = {
  set(callback, delayMs) {
    return globalThis.setTimeout(callback, delayMs)
  },
  clear(handle) {
    globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>)
  },
}

function isValidIsoDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    Number.isFinite(Date.parse(value))
  )
}

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function recoveryFailure(
  reason: RecoveryFailureReason,
  message: string,
): RecoveryFailure {
  return { ok: false, reason, message }
}
