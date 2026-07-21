import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  setAssetRepositoryForTesting,
  useEditorStore,
} from '../app/store'
import {
  parseAssetLibrarySnapshot,
  revokeRuntimeImportedImages,
  type AssetLibrarySnapshot,
  type AssetLibrarySnapshotTransform,
  type AssetRepository,
  type LoadAssetLibraryResult,
  type SaveAssetLibraryResult,
  type UpdateAssetLibraryResult,
} from '../assets'
import { createEditorAdapter } from '../automation/editorAdapter'
import {
  createEditorToolDispatcher,
  EDITOR_TOOL_NUMERIC_LIMITS,
} from './editorToolDispatcher'

class MemoryAssetRepository implements AssetRepository {
  snapshot: AssetLibrarySnapshot | undefined

  async load(): Promise<LoadAssetLibraryResult> {
    return this.snapshot
      ? { ok: true, snapshot: this.snapshot }
      : {
          ok: false,
          reason: 'not-found',
          message: 'No locally saved asset library was found.',
        }
  }

  async save(value: unknown): Promise<SaveAssetLibraryResult> {
    const parsed = parseAssetLibrarySnapshot(value)
    if (!parsed.ok) {
      return {
        ok: false,
        reason: 'invalid-snapshot',
        message: parsed.message,
      }
    }
    this.snapshot = parsed.snapshot
    return { ok: true, savedAt: parsed.snapshot.savedAt }
  }

  async update(
    transform: AssetLibrarySnapshotTransform,
  ): Promise<UpdateAssetLibraryResult> {
    const parsed = parseAssetLibrarySnapshot(transform(this.snapshot))
    if (!parsed.ok) {
      return {
        ok: false,
        reason: 'invalid-snapshot',
        message: parsed.message,
      }
    }
    this.snapshot = parsed.snapshot
    return { ok: true, snapshot: parsed.snapshot }
  }
}

function createPngBytes(width = 320, height = 180): Uint8Array {
  const bytes = new Uint8Array(24)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10])
  bytes.set([0, 0, 0, 13, 73, 72, 68, 82], 8)
  new DataView(bytes.buffer).setUint32(16, width)
  new DataView(bytes.buffer).setUint32(20, height)
  return bytes
}

function encodeBase64(bytes: Uint8Array): string {
  return globalThis.btoa(
    Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''),
  )
}

describe('editor tool dispatcher', () => {
  beforeEach(() => {
    revokeRuntimeImportedImages(useEditorStore.getState().importedImageAssets)
    setAssetRepositoryForTesting(undefined)
    useEditorStore.setState({
      assetLibraryStatus: 'idle',
      assetLibraryBusy: false,
      assetLibraryMessage: null,
      assetLibraryMessageKind: 'info',
      creatorAssetCategories: [],
      importedImageAssets: [],
    })
    useEditorStore.getState().resetEpisode()
    useEditorStore.getState().selectElement(null)
  })

  afterEach(() => {
    revokeRuntimeImportedImages(useEditorStore.getState().importedImageAssets)
    useEditorStore.setState({
      assetLibraryStatus: 'idle',
      assetLibraryBusy: false,
      assetLibraryMessage: null,
      assetLibraryMessageKind: 'info',
      creatorAssetCategories: [],
      importedImageAssets: [],
    })
    setAssetRepositoryForTesting(undefined)
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('inspects through the direct adapter and reports the current revision', async () => {
    const dispatch = createEditorToolDispatcher(createEditorAdapter())
    const result = await dispatch({
      name: 'scrollsplice.inspect_editor',
      arguments: {},
    })

    expect(result).toMatchObject({
      ok: true,
      tool: 'scrollsplice.inspect_editor',
      snapshot: {
        apiVersion: 2,
        editor: { currentRevision: expect.any(Number) },
      },
    })
  })

  it('rejects a mutation after the inspected revision becomes stale', async () => {
    const adapter = createEditorAdapter()
    const dispatch = createEditorToolDispatcher(adapter)
    const before = adapter.inspect()
    useEditorStore.getState().setEpisodeName('Changed by the creator')

    const result = await dispatch({
      name: 'scrollsplice.apply_editor_command',
      arguments: {
        episodeId: before.episode.id,
        expectedRevision: before.editor.currentRevision,
        command: { type: 'set-episode-name', name: 'Stale agent edit' },
      },
    })

    expect(result).toMatchObject({ ok: false, code: 'stale-revision' })
    expect(result.snapshot.episode.name).toBe('Changed by the creator')
  })

  it('rejects selection and active-plane commands when transient editor context changed', async () => {
    const adapter = createEditorAdapter()
    const dispatch = createEditorToolDispatcher(adapter)
    const firstElement = adapter.inspect().elements[0]
    const secondElement = adapter.inspect().elements[1]
    expect(firstElement).toBeDefined()
    expect(secondElement).toBeDefined()
    if (!firstElement || !secondElement) return

    useEditorStore.getState().selectElement(firstElement.id)
    const selected = adapter.inspect()
    useEditorStore.getState().selectElement(secondElement.id)
    expect(adapter.inspect().editor.currentRevision).toBe(
      selected.editor.currentRevision,
    )

    await expect(
      dispatch({
        name: 'scrollsplice.apply_editor_command',
        arguments: {
          episodeId: selected.episode.id,
          expectedRevision: selected.editor.currentRevision,
          expectedSelection: selected.selection,
          command: { type: 'nudge-selection', delta: { x: 1, y: 0 } },
        },
      }),
    ).resolves.toMatchObject({ ok: false, code: 'stale-context' })

    const active = adapter.inspect()
    useEditorStore.getState().setActiveCompositionGroup(
      active.active.group === 'content' ? 'foreground' : 'content',
    )
    await expect(
      dispatch({
        name: 'scrollsplice.apply_editor_command',
        arguments: {
          episodeId: active.episode.id,
          expectedRevision: active.editor.currentRevision,
          expectedActive: active.active,
          command: { type: 'select-all-in-plane' },
        },
      }),
    ).resolves.toMatchObject({ ok: false, code: 'stale-context' })
  })

  it('rejects malformed, unknown, and project-lifecycle calls', async () => {
    const adapter = createEditorAdapter()
    const dispatch = createEditorToolDispatcher(adapter)
    const before = adapter.inspect()
    const binding = {
      episodeId: before.episode.id,
      expectedRevision: before.editor.currentRevision,
    }

    await expect(
      dispatch({ name: 'scrollsplice.unknown', arguments: {} }),
    ).resolves.toMatchObject({ ok: false, code: 'unknown-tool' })
    await expect(
      dispatch({
        name: 'scrollsplice.apply_editor_command',
        arguments: { ...binding, command: { type: 'move-element' } },
      }),
    ).resolves.toMatchObject({ ok: false, code: 'invalid-arguments' })
    await expect(
      dispatch({
        name: 'scrollsplice.apply_editor_command',
        arguments: { ...binding, command: { type: 'teleport-canvas' } },
      }),
    ).resolves.toMatchObject({ ok: false, code: 'invalid-arguments' })
    for (const type of [
      'save',
      'save-as',
      'reopen',
      'new-episode',
      'reset-demo',
    ]) {
      await expect(
        dispatch({
          name: 'scrollsplice.apply_editor_command',
          arguments: { ...binding, command: { type } },
        }),
      ).resolves.toMatchObject({ ok: false, code: 'forbidden-command' })
    }
  })

  it('rejects extreme finite numeric inputs before they can revise the document', async () => {
    const adapter = createEditorAdapter()
    const dispatch = createEditorToolDispatcher(adapter)
    const before = adapter.inspect()
    const binding = {
      episodeId: before.episode.id,
      expectedRevision: before.editor.currentRevision,
    }
    const id = before.elements[0]?.id ?? 'element-1'
    const planeId = before.planes.find(({ kind }) => kind === 'ordinary')?.id ??
      'content-plane-1'
    const extreme = 1e308
    const validCrop = { focusX: 0.5, focusY: 0.5, zoom: 1 }
    const validTail = {
      enabled: true,
      side: 'bottom',
      anchor: 0.5,
      width: 0.2,
      tip: { x: 0.5, y: 1.3 },
    }
    const validBalloonInput = {
      text: 'Safe dialogue',
      fill: '#ffffff',
      stroke: '#000000',
      strokeWidth: 4,
      cornerRadius: 24,
      textFill: '#000000',
      fontFamily: 'sans-serif',
      fontWeight: 600,
      lineHeight: 1.2,
      align: 'center',
      padding: 12,
      minFontSize: 12,
      maxFontSize: 44,
      tail: validTail,
    }
    const commands: readonly unknown[] = [
      { type: 'set-viewport', position: { x: extreme, y: 0 } },
      { type: 'pan-viewport', delta: { x: 0, y: extreme } },
      { type: 'set-zoom', zoomFactor: extreme },
      { type: 'resize-episode', logicalHeight: extreme },
      { type: 'reorder-plane', planeId, targetIndex: extreme },
      { type: 'duplicate-element', elementId: id, offset: { x: extreme, y: 0 } },
      { type: 'move-element', elementId: id, position: { x: extreme, y: 0 } },
      {
        type: 'resize-element',
        elementId: id,
        bounds: { x: 0, y: 0, width: extreme, height: 100 },
      },
      { type: 'nudge-selection', delta: { x: 0, y: extreme } },
      { type: 'reorder-element-in-stack', elementId: id, targetIndex: extreme },
      { type: 'set-element-opacity', elementId: id, opacity: extreme },
      {
        type: 'set-element-transform',
        elementId: id,
        transform: { rotationDegrees: extreme, flipX: false, flipY: false },
      },
      {
        type: 'create-background-region',
        planeId,
        fill: '#ffffff',
        startY: extreme,
        height: 100,
      },
      {
        type: 'create-background-region',
        planeId,
        fill: '#ffffff',
        startY: 0,
        height: extreme,
      },
      {
        type: 'set-shape-fill',
        elementId: id,
        fill: {
          kind: 'vertical-gradient',
          top: { color: '#ffffff', opacity: extreme },
          bottom: { color: '#000000', opacity: 1 },
        },
      },
      {
        type: 'update-shape-style',
        elementId: id,
        input: {
          shape: 'rectangle',
          stroke: '#000000',
          strokeWidth: extreme,
          cornerRadius: 0,
        },
      },
      {
        type: 'update-shape-style',
        elementId: id,
        input: {
          shape: 'rectangle',
          stroke: '#000000',
          strokeWidth: 1,
          cornerRadius: extreme,
        },
      },
      {
        type: 'update-text',
        elementId: id,
        input: {
          text: 'Safe text',
          fill: '#000000',
          fontSize: extreme,
          fontWeight: 600,
          align: 'center',
        },
      },
      ...([
        ['strokeWidth', extreme],
        ['cornerRadius', extreme],
        ['lineHeight', extreme],
        ['padding', extreme],
        ['minFontSize', extreme],
        ['maxFontSize', extreme],
      ] as const).map(([field, value]) => ({
        type: 'update-speech-balloon',
        elementId: id,
        input: { ...validBalloonInput, [field]: value },
      })),
      ...([
        ['anchor', extreme],
        ['width', extreme],
      ] as const).map(([field, value]) => ({
        type: 'update-speech-balloon',
        elementId: id,
        input: {
          ...validBalloonInput,
          tail: { ...validTail, [field]: value },
        },
      })),
      {
        type: 'update-speech-balloon',
        elementId: id,
        input: {
          ...validBalloonInput,
          tail: { ...validTail, tip: { x: extreme, y: 1.3 } },
        },
      },
      {
        type: 'set-image-frame',
        elementId: id,
        frame: {
          mask: { kind: 'rectangle', cornerRadius: extreme },
          crop: validCrop,
        },
      },
      {
        type: 'set-image-frame',
        elementId: id,
        frame: {
          mask: { kind: 'rectangle', cornerRadius: 0 },
          crop: validCrop,
          border: { color: '#000000', width: extreme },
        },
      },
      {
        type: 'set-image-frame',
        elementId: id,
        frame: {
          mask: {
            kind: 'polygon',
            points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: extreme, y: 1 }],
          },
          crop: validCrop,
        },
      },
      {
        type: 'set-image-crop',
        elementId: id,
        crop: { focusX: extreme, focusY: 0.5, zoom: 1 },
      },
      {
        type: 'set-image-crop',
        elementId: id,
        crop: { focusX: 0.5, focusY: 0.5, zoom: extreme },
      },
    ]

    for (const command of commands) {
      const result = await dispatch({
        name: 'scrollsplice.apply_editor_command',
        arguments: { ...binding, command },
      })
      expect(result, JSON.stringify(command)).toMatchObject({
        ok: false,
        code: 'invalid-arguments',
      })
      expect(adapter.inspect().editor.currentRevision).toBe(
        before.editor.currentRevision,
      )
    }

    const generatedPlacement = await dispatch({
      name: 'scrollsplice.place_generated_asset',
      arguments: {
        ...binding,
        assetId: 'generated-asset-1',
        planeId,
        bounds: { x: 0, y: 0, width: extreme, height: 100 },
      },
    })
    expect(generatedPlacement).toMatchObject({
      ok: false,
      code: 'invalid-arguments',
    })
    expect(adapter.inspect().editor.currentRevision).toBe(
      before.editor.currentRevision,
    )

    const unsafeRevision = await dispatch({
      name: 'scrollsplice.apply_editor_command',
      arguments: {
        episodeId: before.episode.id,
        expectedRevision: extreme,
        command: { type: 'set-magnet', enabled: true },
      },
    })
    expect(unsafeRevision).toMatchObject({
      ok: false,
      code: 'invalid-arguments',
    })
    expect(EDITOR_TOOL_NUMERIC_LIMITS.maxRevision).toBe(Number.MAX_SAFE_INTEGER)
    expect(adapter.inspect().editor.currentRevision).toBe(
      before.editor.currentRevision,
    )
  })

  it('creates content on the explicit plane outside the active group', async () => {
    const adapter = createEditorAdapter()
    const dispatch = createEditorToolDispatcher(adapter)
    const before = adapter.inspect()
    const targetPlane = before.planes.find(
      ({ group, kind }) => group === 'background' && kind === 'ordinary',
    )

    expect(targetPlane).toBeDefined()
    if (!targetPlane) return

    const result = await dispatch({
      name: 'scrollsplice.apply_editor_command',
      arguments: {
        episodeId: before.episode.id,
        expectedRevision: before.editor.currentRevision,
        command: { type: 'create-text', planeId: targetPlane.id },
      },
    })

    expect(result).toMatchObject({ ok: true, changed: true })
    if (!result.ok) return
    expect(result.snapshot.active).toEqual({
      group: 'background',
      planeId: targetPlane.id,
    })
    expect(
      result.snapshot.elements.find(({ id }) => id === result.createdId),
    ).toMatchObject({ type: 'text', planeId: targetPlane.id })
  })

  it('creates requested dialogue at exact bounds through one tool result', async () => {
    const adapter = createEditorAdapter()
    const dispatch = createEditorToolDispatcher(adapter)
    const before = adapter.inspect()
    const targetPlane = before.planes.find(
      ({ group, kind }) => group === 'content' && kind === 'ordinary',
    )

    expect(targetPlane).toBeDefined()
    if (!targetPlane) return

    const result = await dispatch({
      name: 'scrollsplice.apply_editor_command',
      arguments: {
        episodeId: before.episode.id,
        expectedRevision: before.editor.currentRevision,
        command: {
          type: 'create-positioned-text',
          planeId: targetPlane.id,
          bounds: { x: 410, y: 500, width: 280, height: 90 },
          text: 'SKREEEE!',
          style: {
            fontSize: 36,
            fontFamily: 'Arial',
            fontWeight: 700,
            color: '#111111',
            textAlign: 'center',
          },
        },
      },
    })

    expect(result).toMatchObject({ ok: true, changed: true })
    if (!result.ok) return
    expect(result.snapshot.elements.find(({ id }) => id === result.createdId)).toMatchObject({
      type: 'text',
      bounds: { x: 410, y: 500, width: 280, height: 90 },
      text: 'SKREEEE!',
    })
  })

  it('imports, places, and undoes the latest generated image', async () => {
    const repository = new MemoryAssetRepository()
    setAssetRepositoryForTesting(repository)
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 320, height: 180, close: vi.fn() })),
    )
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:tool-generated-test')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    expect(await useEditorStore.getState().initializeAssetLibrary()).toBe(true)

    const adapter = createEditorAdapter()
    const dispatch = createEditorToolDispatcher(adapter)
    const before = adapter.inspect()
    const imported = await dispatch({
      name: 'scrollsplice.import_latest_generated_asset',
      arguments: {
        episodeId: before.episode.id,
        expectedRevision: before.editor.currentRevision,
        source: {
          kind: 'base64',
          base64: encodeBase64(createPngBytes()),
          mediaType: 'image/png',
        },
        metadata: {
          displayName: 'Generated panel.png',
          provider: 'OpenAI',
          model: 'image-model-test',
          prompt: 'A quiet rooftop at night.',
          generatedAt: '2026-07-20T21:00:00.000Z',
        },
      },
    })

    expect(imported).toMatchObject({ ok: true, changed: true })
    if (!imported.ok || !imported.createdId) return
    expect(imported.snapshot.assets.imported).toContainEqual(
      expect.objectContaining({
        id: imported.createdId,
        generation: expect.objectContaining({ provider: 'OpenAI' }),
      }),
    )

    const targetPlane = imported.snapshot.planes.find(
      ({ group, kind }) => group === 'content' && kind === 'ordinary',
    )
    expect(targetPlane).toBeDefined()
    if (!targetPlane) return

    const placed = await dispatch({
      name: 'scrollsplice.place_generated_asset',
      arguments: {
        episodeId: imported.snapshot.episode.id,
        expectedRevision: imported.snapshot.editor.currentRevision,
        assetId: imported.createdId,
        planeId: targetPlane.id,
        bounds: { x: 80, y: 400, width: 640, height: 360 },
      },
    })

    expect(placed).toMatchObject({ ok: true, changed: true })
    if (!placed.ok || !placed.createdId) return
    expect(
      placed.snapshot.elements.find(({ id }) => id === placed.createdId),
    ).toMatchObject({
      planeId: targetPlane.id,
      assetReference: { kind: 'imported', assetId: imported.createdId },
    })

    const undone = await dispatch({
      name: 'scrollsplice.apply_editor_command',
      arguments: {
        episodeId: placed.snapshot.episode.id,
        expectedRevision: placed.snapshot.editor.currentRevision,
        command: { type: 'undo' },
      },
    })

    expect(undone.ok).toBe(true)
    expect(
      undone.snapshot.elements.some(({ id }) => id === placed.createdId),
    ).toBe(false)
    expect(
      undone.snapshot.assets.imported.some(({ id }) => id === imported.createdId),
    ).toBe(true)
  })
})
