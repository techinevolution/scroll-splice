import type { EpisodeDocument } from '../core/episode'
import {
  createLocalStorageProjectLibraryRepository,
} from '../persistence/projectLibraryRepository'
import {
  createLocalStorageProjectRepository,
  type StorageLike,
} from '../persistence/projectRepository'
import {
  createDebouncedLocalStorageRecoveryRepository,
  type RecoveryStorageLike,
} from '../persistence/recoveryRepository'

export interface AssetReferenceStorage extends StorageLike {
  removeItem(key: string): void
}

export type ImportedAssetDeletionSafety =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string }

export function episodeReferencesImportedAsset(
  episode: EpisodeDocument,
  assetId: string,
): boolean {
  return episode.elements.some(
    (element) =>
      element.type === 'image' &&
      element.assetReference.kind === 'imported' &&
      element.assetReference.assetId === assetId,
  )
}

/**
 * Proves that every browser-persisted episode known to this build no longer
 * references an imported source. Any unreadable store blocks deletion so a
 * damaged or newer record cannot be silently stranded.
 */
export function checkImportedAssetDeletionSafety(
  assetId: string,
  currentEpisode: EpisodeDocument,
  storage: AssetReferenceStorage | undefined,
): ImportedAssetDeletionSafety {
  if (episodeReferencesImportedAsset(currentEpisode, assetId)) {
    return blocked(
      'Remove every placed copy from the current episode before deleting this source.',
    )
  }

  if (!storage) {
    return blocked(
      'Local project storage is unavailable, so ScrollSplice cannot prove this source is unused.',
    )
  }

  const explicitSave = createLocalStorageProjectRepository(storage).loadLast()

  if (explicitSave.ok) {
    if (episodeReferencesImportedAsset(explicitSave.episode, assetId)) {
      return blocked(
        'The last explicit save still uses this source. Remove it there and save again first.',
      )
    }
  } else if (explicitSave.reason !== 'not-found') {
    return blocked(
      `The last explicit save could not be checked: ${explicitSave.message}`,
    )
  }

  const recoveryRepository = createDebouncedLocalStorageRecoveryRepository(
    storage as RecoveryStorageLike,
  )
  const recovery = recoveryRepository.load()
  recoveryRepository.dispose()

  if (recovery.ok) {
    if (episodeReferencesImportedAsset(recovery.recovery.episode, assetId)) {
      return blocked(
        'Crash recovery still uses this source. Reopen or replace that recovery state first.',
      )
    }
  } else if (recovery.reason !== 'not-found') {
    return blocked(
      `Crash recovery could not be checked: ${recovery.message}`,
    )
  }

  const projectLibrary = createLocalStorageProjectLibraryRepository(storage)
  const recentProjects = projectLibrary.listRecent()

  if (!recentProjects.ok) {
    return blocked(
      `The local project library could not be checked: ${recentProjects.message}`,
    )
  }

  for (const projectSummary of recentProjects.projects) {
    const loaded = projectLibrary.load(projectSummary.projectId)

    if (!loaded.ok) {
      return blocked(
        `Local project “${projectSummary.name}” could not be checked: ${loaded.message}`,
      )
    }

    if (episodeReferencesImportedAsset(loaded.project.episode, assetId)) {
      return blocked(
        `Local project “${loaded.project.name}” still uses this source. Remove it from that project first.`,
      )
    }
  }

  return { ok: true }
}

function blocked(message: string): ImportedAssetDeletionSafety {
  return { ok: false, message }
}
