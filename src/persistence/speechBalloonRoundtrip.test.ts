import { describe, expect, it } from 'vitest'

import { ASSET_LIBRARY_SNAPSHOT_FORMAT_VERSION } from '../assets'
import { createSpeechBalloonElement } from '../core/commands'
import {
  BLANK_EPISODE_LAYER_PLANE_IDS,
  createBlankEpisode,
} from '../core/createBlankEpisode'
import { getSpeechBalloonPresetId } from '../core/speechBalloonPresets'
import { serializePortableProject, parsePortableProject } from './portableProject'
import {
  createLocalStorageProjectRepository,
  parseEpisodeDocument,
  type StorageLike,
} from './projectRepository'

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>()
  getItem(key: string) {
    return this.values.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

function createEpisode() {
  return createSpeechBalloonElement(createBlankEpisode('balloon-roundtrip'), {
    layerPlaneId: BLANK_EPISODE_LAYER_PLANE_IDS.content,
    bounds: { x: 180, y: 200, width: 340, height: 176 },
    text: 'Portable dialogue',
    presetId: 'wavy',
  })
}

describe('editable balloon persistence', () => {
  it('parses and reopens the v6 atomic element without legacy conversion', () => {
    const episode = createEpisode()
    expect(parseEpisodeDocument(JSON.parse(JSON.stringify(episode)))).toEqual({
      ok: true,
      episode,
    })
    expect(
      getSpeechBalloonPresetId(
        episode.elements[0] as Extract<
          (typeof episode.elements)[number],
          { type: 'speech-balloon' }
        >,
      ),
    ).toBe('wavy')

    const storage = new MemoryStorage()
    const repository = createLocalStorageProjectRepository(
      storage,
      () => new Date('2026-07-16T20:00:00.000Z'),
    )
    expect(repository.save(episode)).toMatchObject({ ok: true })
    expect(repository.loadLast()).toMatchObject({
      ok: true,
      episode: { elements: [{ type: 'speech-balloon', text: 'Portable dialogue' }] },
    })

    const legacyLike = JSON.parse(JSON.stringify(episode)) as Record<string, unknown>
    legacyLike.formatVersion = 5
    delete legacyLike.elementGroups
    expect(parseEpisodeDocument(legacyLike)).toMatchObject({ ok: false })
  })

  it('round-trips through a portable project package', async () => {
    const episode = createEpisode()
    const serialized = await serializePortableProject(
      episode,
      {
        formatVersion: ASSET_LIBRARY_SNAPSHOT_FORMAT_VERSION,
        savedAt: '2026-07-16T20:00:00.000Z',
        creatorCategories: [],
        importedImages: [],
      },
      { now: () => new Date('2026-07-16T20:01:00.000Z') },
    )

    expect(serialized).toMatchObject({ ok: true })
    if (!serialized.ok) throw new Error(serialized.message)
    const parsed = await parsePortableProject(serialized.blob)
    expect(parsed).toMatchObject({
      ok: true,
      episode: {
        elements: [{ type: 'speech-balloon', text: 'Portable dialogue' }],
      },
    })
  })
})
