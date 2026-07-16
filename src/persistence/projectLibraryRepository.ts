import type { EpisodeDocument } from '../core/episode'
import {
  createLocalStorageProjectRepository,
  parseEpisodeDocument,
  type StorageLike,
} from './projectRepository'

export const PROJECT_LIBRARY_STORAGE_FORMAT_VERSION = 1 as const
export const PROJECT_LIBRARY_STORAGE_KEY = 'scrollsplice.projects.v1'
export const MAX_LOCAL_PROJECTS = 100

const MAX_PROJECT_ID_ATTEMPTS = 8
const SAFE_PROJECT_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,79}$/i

export interface LocalProjectSummary {
  readonly projectId: string
  readonly episodeId: string
  readonly name: string
  readonly createdAt: string
  readonly updatedAt: string
}

export interface LoadedLocalProject extends LocalProjectSummary {
  readonly episode: EpisodeDocument
}

export type ProjectLibraryFailureReason =
  | 'storage-unavailable'
  | 'not-found'
  | 'invalid-project-id'
  | 'invalid-document'
  | 'unsupported-version'
  | 'corrupt'
  | 'read-failed'
  | 'serialization-failed'
  | 'write-failed'
  | 'project-limit-reached'
  | 'id-generation-failed'

export interface ProjectLibraryFailure {
  readonly ok: false
  readonly reason: ProjectLibraryFailureReason
  readonly message: string
}

export type ListLocalProjectsResult =
  | { readonly ok: true; readonly projects: readonly LocalProjectSummary[] }
  | ProjectLibraryFailure

export type LoadLocalProjectResult =
  | { readonly ok: true; readonly project: LoadedLocalProject }
  | ProjectLibraryFailure

export type SaveLocalProjectResult =
  | {
      readonly ok: true
      readonly projectId: string
      readonly savedAt: string
      readonly created: boolean
    }
  | ProjectLibraryFailure

export type DeleteLocalProjectResult =
  | { readonly ok: true; readonly projectId: string }
  | ProjectLibraryFailure

export type ImportLegacyProjectResult =
  | {
      readonly ok: true
      readonly status: 'imported'
      readonly projectId: string
      readonly savedAt: string
    }
  | {
      readonly ok: true
      readonly status: 'already-completed' | 'not-found'
    }
  | ProjectLibraryFailure

export interface ProjectLibraryRepository {
  listRecent(): ListLocalProjectsResult
  load(projectId: string): LoadLocalProjectResult
  save(projectId: string, episode: EpisodeDocument): SaveLocalProjectResult
  saveAs(episode: EpisodeDocument): SaveLocalProjectResult
  delete(projectId: string): DeleteLocalProjectResult
  importLegacyLast(): ImportLegacyProjectResult
}

export interface ProjectLibraryRepositoryOptions {
  readonly now?: () => Date
  readonly createProjectId?: () => string
}

interface StoredLocalProjectV1 {
  readonly projectId: string
  readonly createdAt: string
  readonly updatedAt: string
  readonly episode: EpisodeDocument
}

interface StoredProjectLibraryV1 {
  readonly storageFormatVersion: typeof PROJECT_LIBRARY_STORAGE_FORMAT_VERSION
  readonly legacyImportCompleted: boolean
  readonly projects: readonly StoredLocalProjectV1[]
}

type ReadLibraryResult =
  | { readonly ok: true; readonly library: StoredProjectLibraryV1 }
  | ProjectLibraryFailure

type WriteLibraryResult =
  | { readonly ok: true }
  | ProjectLibraryFailure

type RecordValue = Readonly<Record<string, unknown>>

export function createLocalStorageProjectLibraryRepository(
  storage: StorageLike | undefined,
  options: ProjectLibraryRepositoryOptions = {},
): ProjectLibraryRepository {
  const now = options.now ?? (() => new Date())
  const createProjectId = options.createProjectId ?? createDefaultProjectId

  function listRecent(): ListLocalProjectsResult {
    const read = readLibrary(storage)

    if (!read.ok) {
      return read
    }

    return {
      ok: true,
      projects: read.library.projects
        .map(toProjectSummary)
        .sort(
          (first, second) =>
            Date.parse(second.updatedAt) - Date.parse(first.updatedAt) ||
            first.projectId.localeCompare(second.projectId),
        ),
    }
  }

  function load(projectId: string): LoadLocalProjectResult {
    if (!isSafeProjectId(projectId)) {
      return projectFailure(
        'invalid-project-id',
        'The local project ID is invalid.',
      )
    }

    const read = readLibrary(storage)

    if (!read.ok) {
      return read
    }

    const project = read.library.projects.find(
      (candidate) => candidate.projectId === projectId,
    )

    return project
      ? { ok: true, project: { ...toProjectSummary(project), episode: project.episode } }
      : projectFailure('not-found', 'The requested local project was not found.')
  }

  function save(
    projectId: string,
    episode: EpisodeDocument,
  ): SaveLocalProjectResult {
    if (!isSafeProjectId(projectId)) {
      return projectFailure(
        'invalid-project-id',
        'The local project ID is invalid.',
      )
    }

    const parsedEpisode = parseEpisodeForLibrary(episode)

    if (!parsedEpisode.ok) {
      return parsedEpisode
    }

    const read = readLibrary(storage)

    if (!read.ok) {
      return read
    }

    const projectIndex = read.library.projects.findIndex(
      (candidate) => candidate.projectId === projectId,
    )

    if (projectIndex < 0) {
      return projectFailure('not-found', 'The requested local project was not found.')
    }

    const savedAt = readCurrentIsoDate(now)

    if (!savedAt.ok) {
      return savedAt
    }

    const current = read.library.projects[projectIndex]

    if (!current) {
      return projectFailure('not-found', 'The requested local project was not found.')
    }

    const projects = [...read.library.projects]
    projects[projectIndex] = {
      ...current,
      updatedAt: savedAt.value,
      episode: parsedEpisode.episode,
    }

    const written = writeLibrary(storage, {
      ...read.library,
      projects,
    })

    return written.ok
      ? {
          ok: true,
          projectId,
          savedAt: savedAt.value,
          created: false,
        }
      : written
  }

  function saveAs(episode: EpisodeDocument): SaveLocalProjectResult {
    const parsedEpisode = parseEpisodeForLibrary(episode)

    if (!parsedEpisode.ok) {
      return parsedEpisode
    }

    const read = readLibrary(storage)

    if (!read.ok) {
      return read
    }

    if (read.library.projects.length >= MAX_LOCAL_PROJECTS) {
      return projectFailure(
        'project-limit-reached',
        `The local project library is limited to ${MAX_LOCAL_PROJECTS} projects.`,
      )
    }

    const projectId = createUniqueProjectId(
      read.library.projects,
      createProjectId,
    )

    if (!projectId) {
      return projectFailure(
        'id-generation-failed',
        'A unique local project ID could not be created.',
      )
    }

    const savedAt = readCurrentIsoDate(now)

    if (!savedAt.ok) {
      return savedAt
    }

    const written = writeLibrary(storage, {
      ...read.library,
      projects: [
        ...read.library.projects,
        {
          projectId,
          createdAt: savedAt.value,
          updatedAt: savedAt.value,
          episode: parsedEpisode.episode,
        },
      ],
    })

    return written.ok
      ? {
          ok: true,
          projectId,
          savedAt: savedAt.value,
          created: true,
        }
      : written
  }

  function deleteProject(projectId: string): DeleteLocalProjectResult {
    if (!isSafeProjectId(projectId)) {
      return projectFailure(
        'invalid-project-id',
        'The local project ID is invalid.',
      )
    }

    const read = readLibrary(storage)

    if (!read.ok) {
      return read
    }

    const projects = read.library.projects.filter(
      (candidate) => candidate.projectId !== projectId,
    )

    if (projects.length === read.library.projects.length) {
      return projectFailure('not-found', 'The requested local project was not found.')
    }

    const written = writeLibrary(storage, {
      ...read.library,
      projects,
    })

    return written.ok ? { ok: true, projectId } : written
  }

  function importLegacyLast(): ImportLegacyProjectResult {
    const read = readLibrary(storage)

    if (!read.ok) {
      return read
    }

    if (read.library.legacyImportCompleted) {
      return { ok: true, status: 'already-completed' }
    }

    const legacy = createLocalStorageProjectRepository(storage).loadLast()

    if (!legacy.ok) {
      if (legacy.reason !== 'not-found') {
        return projectFailure(legacy.reason, legacy.message)
      }

      const written = writeLibrary(storage, {
        ...read.library,
        legacyImportCompleted: true,
      })

      return written.ok ? { ok: true, status: 'not-found' } : written
    }

    if (read.library.projects.length >= MAX_LOCAL_PROJECTS) {
      return projectFailure(
        'project-limit-reached',
        `The local project library is limited to ${MAX_LOCAL_PROJECTS} projects.`,
      )
    }

    const projectId = createUniqueProjectId(
      read.library.projects,
      createProjectId,
    )

    if (!projectId) {
      return projectFailure(
        'id-generation-failed',
        'A unique local project ID could not be created.',
      )
    }

    const written = writeLibrary(storage, {
      ...read.library,
      legacyImportCompleted: true,
      projects: [
        ...read.library.projects,
        {
          projectId,
          createdAt: legacy.savedAt,
          updatedAt: legacy.savedAt,
          episode: legacy.episode,
        },
      ],
    })

    return written.ok
      ? {
          ok: true,
          status: 'imported',
          projectId,
          savedAt: legacy.savedAt,
        }
      : written
  }

  return {
    listRecent,
    load,
    save,
    saveAs,
    delete: deleteProject,
    importLegacyLast,
  }
}

function readLibrary(storage: StorageLike | undefined): ReadLibraryResult {
  if (!storage) {
    return projectFailure(
      'storage-unavailable',
      'Local project-library storage is unavailable in this browser.',
    )
  }

  let serialized: string | null

  try {
    serialized = storage.getItem(PROJECT_LIBRARY_STORAGE_KEY)
  } catch {
    return projectFailure(
      'read-failed',
      'The browser could not read the local project library.',
    )
  }

  if (serialized === null) {
    return {
      ok: true,
      library: {
        storageFormatVersion: PROJECT_LIBRARY_STORAGE_FORMAT_VERSION,
        legacyImportCompleted: false,
        projects: [],
      },
    }
  }

  let value: unknown

  try {
    value = JSON.parse(serialized) as unknown
  } catch {
    return projectFailure(
      'corrupt',
      'The local project library is not valid JSON.',
    )
  }

  return parseStoredProjectLibrary(value)
}

function parseStoredProjectLibrary(value: unknown): ReadLibraryResult {
  if (!isRecord(value)) {
    return projectFailure('corrupt', 'The local project library is not an object.')
  }

  if (value.storageFormatVersion !== PROJECT_LIBRARY_STORAGE_FORMAT_VERSION) {
    return typeof value.storageFormatVersion === 'number'
      ? projectFailure(
          'unsupported-version',
          `Project-library format ${value.storageFormatVersion} is not supported by this build.`,
        )
      : projectFailure(
          'corrupt',
          'The local project library has no storage format version.',
        )
  }

  if (
    typeof value.legacyImportCompleted !== 'boolean' ||
    !Array.isArray(value.projects) ||
    value.projects.length > MAX_LOCAL_PROJECTS
  ) {
    return projectFailure('corrupt', 'The local project-library header is invalid.')
  }

  const projects: StoredLocalProjectV1[] = []

  for (const candidate of value.projects) {
    const parsed = parseStoredLocalProject(candidate)

    if (!parsed.ok) {
      return parsed
    }

    projects.push(parsed.project)
  }

  if (new Set(projects.map(({ projectId }) => projectId)).size !== projects.length) {
    return projectFailure(
      'corrupt',
      'The local project library contains duplicate project IDs.',
    )
  }

  return {
    ok: true,
    library: {
      storageFormatVersion: PROJECT_LIBRARY_STORAGE_FORMAT_VERSION,
      legacyImportCompleted: value.legacyImportCompleted,
      projects,
    },
  }
}

function parseStoredLocalProject(
  value: unknown,
):
  | { readonly ok: true; readonly project: StoredLocalProjectV1 }
  | ProjectLibraryFailure {
  if (!isRecord(value)) {
    return projectFailure('corrupt', 'A local project record is not an object.')
  }

  const projectId = value.projectId
  const createdAt = value.createdAt
  const updatedAt = value.updatedAt

  if (
    !isSafeProjectId(projectId) ||
    !isValidIsoDate(createdAt) ||
    !isValidIsoDate(updatedAt) ||
    Date.parse(createdAt) > Date.parse(updatedAt)
  ) {
    return projectFailure('corrupt', 'A local project has invalid metadata.')
  }

  const parsedEpisode = parseEpisodeDocument(value.episode)

  if (!parsedEpisode.ok) {
    return projectFailure(parsedEpisode.reason, parsedEpisode.message)
  }

  return {
    ok: true,
    project: {
      projectId,
      createdAt,
      updatedAt,
      episode: parsedEpisode.episode,
    },
  }
}

function writeLibrary(
  storage: StorageLike | undefined,
  library: StoredProjectLibraryV1,
): WriteLibraryResult {
  if (!storage) {
    return projectFailure(
      'storage-unavailable',
      'Local project-library storage is unavailable in this browser.',
    )
  }

  let serialized: string

  try {
    serialized = JSON.stringify(library)
  } catch {
    return projectFailure(
      'serialization-failed',
      'The local project library could not be prepared for saving.',
    )
  }

  try {
    storage.setItem(PROJECT_LIBRARY_STORAGE_KEY, serialized)
  } catch {
    return projectFailure(
      'write-failed',
      'The browser could not write the local project library.',
    )
  }

  return { ok: true }
}

function parseEpisodeForLibrary(
  episode: EpisodeDocument,
):
  | { readonly ok: true; readonly episode: EpisodeDocument }
  | ProjectLibraryFailure {
  const parsed = parseEpisodeDocument(episode)

  return parsed.ok
    ? parsed
    : projectFailure(
        parsed.reason === 'unsupported-version'
          ? 'unsupported-version'
          : 'invalid-document',
        parsed.message,
      )
}

function toProjectSummary(project: StoredLocalProjectV1): LocalProjectSummary {
  return {
    projectId: project.projectId,
    episodeId: project.episode.id,
    name: project.episode.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  }
}

function createUniqueProjectId(
  projects: readonly StoredLocalProjectV1[],
  createProjectId: () => string,
): string | undefined {
  const existingIds = new Set(projects.map(({ projectId }) => projectId))

  for (let attempt = 0; attempt < MAX_PROJECT_ID_ATTEMPTS; attempt += 1) {
    let projectId: string

    try {
      projectId = createProjectId()
    } catch {
      continue
    }

    if (isSafeProjectId(projectId) && !existingIds.has(projectId)) {
      return projectId
    }
  }

  return undefined
}

function createDefaultProjectId(): string {
  const uuid = globalThis.crypto?.randomUUID?.()

  return uuid
    ? `project-${uuid}`
    : `project-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function readCurrentIsoDate(
  now: () => Date,
):
  | { readonly ok: true; readonly value: string }
  | ProjectLibraryFailure {
  try {
    const value = now().toISOString()

    return isValidIsoDate(value)
      ? { ok: true, value }
      : projectFailure(
          'serialization-failed',
          'The local project timestamp is invalid.',
        )
  } catch {
    return projectFailure(
      'serialization-failed',
      'The local project timestamp could not be created.',
    )
  }
}

export function isSafeProjectId(value: unknown): value is string {
  return typeof value === 'string' && SAFE_PROJECT_ID_PATTERN.test(value)
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

function projectFailure(
  reason: ProjectLibraryFailureReason,
  message: string,
): ProjectLibraryFailure {
  return { ok: false, reason, message }
}
