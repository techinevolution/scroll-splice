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
import { createEditorAdapter } from './editorAdapter'

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

describe('editor adapter', () => {
  beforeEach(() => {
    revokeRuntimeImportedImages(
      useEditorStore.getState().importedImageAssets,
    )
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
    revokeRuntimeImportedImages(
      useEditorStore.getState().importedImageAssets,
    )
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

  it('returns a normalized, serializable map of the live editor', () => {
    const snapshot = createEditorAdapter().inspect()

    expect(snapshot.apiVersion).toBe(2)
    expect(snapshot.editor.currentRevision).toBe(
      useEditorStore.getState().currentRevision,
    )
    expect(snapshot.episode.logicalWidth).toBe(800)
    expect(snapshot.planes.length).toBeGreaterThan(0)
    expect(snapshot.elements.length).toBeGreaterThan(0)
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot)
  })

  it('targets stable IDs and routes move and undo through normal history', () => {
    const adapter = createEditorAdapter()
    const target = adapter.inspect().elements.find(({ locked }) => !locked)

    expect(target).toBeDefined()
    if (!target) return

    const moved = adapter.execute({
      type: 'move-element',
      elementId: target.id,
      position: { x: target.bounds.x + 7, y: target.bounds.y + 11 },
    })

    expect(moved.ok).toBe(true)
    expect(moved.snapshot.elements.find(({ id }) => id === target.id)?.bounds).toMatchObject({
      x: target.bounds.x + 7,
      y: target.bounds.y + 11,
    })
    expect(moved.snapshot.editor.canUndo).toBe(true)

    const undone = adapter.execute({ type: 'undo' })
    expect(undone.ok).toBe(true)
    expect(undone.snapshot.elements.find(({ id }) => id === target.id)?.bounds).toEqual(target.bounds)
  })

  it('rejects guessed IDs without mutating the episode', () => {
    const adapter = createEditorAdapter()
    const before = adapter.inspect()
    const result = adapter.execute({
      type: 'move-element',
      elementId: 'not-a-real-element',
      position: { x: 10, y: 20 },
    })

    expect(result).toMatchObject({ ok: false, code: 'not-found' })
    expect(result.snapshot.episode).toEqual(before.episode)
    expect(result.snapshot.elements).toEqual(before.elements)
  })

  it('creates an element on an explicit ordinary plane and returns its ID', () => {
    const adapter = createEditorAdapter()
    const plane = adapter.inspect().planes.find(
      ({ group, kind }) => group === 'content' && kind === 'ordinary',
    )

    expect(plane).toBeDefined()
    if (!plane) return

    const result = adapter.execute({ type: 'create-text', planeId: plane.id })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.createdId).toBeTruthy()
    expect(result.snapshot.elements.find(({ id }) => id === result.createdId)).toMatchObject({
      type: 'text',
      planeId: plane.id,
    })
  })

  it('creates styled text at exact bounds in one adapter command', () => {
    const adapter = createEditorAdapter()
    const plane = adapter.inspect().planes.find(
      ({ group, kind }) => group === 'content' && kind === 'ordinary',
    )

    expect(plane).toBeDefined()
    if (!plane) return

    const result = adapter.execute({
      type: 'create-positioned-text',
      planeId: plane.id,
      bounds: { x: 120, y: 420, width: 260, height: 88 },
      input: {
        text: 'Hands off my strawberry!',
        fill: '#161616',
        fontSize: 30,
        fontWeight: 700,
        align: 'center',
      },
    })

    expect(result).toMatchObject({ ok: true, changed: true })
    if (!result.ok) return
    expect(result.snapshot.elements.find(({ id }) => id === result.createdId)).toMatchObject({
      type: 'text',
      planeId: plane.id,
      bounds: { x: 120, y: 420, width: 260, height: 88 },
      text: 'Hands off my strawberry!',
      properties: {
        text: 'Hands off my strawberry!',
        fill: '#161616',
        fontSize: 30,
        fontWeight: 700,
        align: 'center',
      },
    })
  })

  it('creates a positioned shape and exposes all of its editable styling', () => {
    const adapter = createEditorAdapter()
    const plane = adapter.inspect().planes.find(
      ({ group, kind }) => group === 'content' && kind === 'ordinary',
    )

    expect(plane).toBeDefined()
    if (!plane) return

    const result = adapter.execute({
      type: 'create-positioned-shape',
      planeId: plane.id,
      name: 'Panel frame',
      bounds: { x: 40, y: 80, width: 720, height: 360 },
      shape: 'rectangle',
      fill: '#ffffff',
      stroke: '#111111',
      strokeWidth: 6,
      cornerRadius: 18,
    })

    expect(result).toMatchObject({ ok: true, changed: true })
    if (!result.ok) return
    expect(result.snapshot.elements.find(({ id }) => id === result.createdId)).toMatchObject({
      name: 'Panel frame',
      type: 'shape',
      bounds: { x: 40, y: 80, width: 720, height: 360 },
      properties: {
        shape: 'rectangle',
        fill: { kind: 'solid', color: '#ffffff' },
        stroke: '#111111',
        strokeWidth: 6,
        cornerRadius: 18,
      },
    })
  })

  it('creates an editable balloon type on the requested plane', () => {
    const adapter = createEditorAdapter()
    const plane = adapter.inspect().planes.find(
      ({ group, kind }) => group === 'content' && kind === 'ordinary',
    )

    expect(plane).toBeDefined()
    if (!plane) return

    const result = adapter.execute({
      type: 'create-speech-balloon',
      planeId: plane.id,
      presetId: 'wavy',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(
      result.snapshot.elements.find(({ id }) => id === result.createdId),
    ).toMatchObject({
      type: 'speech-balloon',
      planeId: plane.id,
      assetReference: {
        kind: 'synthetic',
        generatorId: 'scrollsplice-editable-speech-balloon-v1:wavy',
      },
    })
  })

  it('targets an ordinary plane outside the currently active group', () => {
    const adapter = createEditorAdapter()
    const backgroundPlane = adapter.inspect().planes.find(
      ({ group, kind }) => group === 'background' && kind === 'ordinary',
    )

    expect(backgroundPlane).toBeDefined()
    if (!backgroundPlane) return

    const result = adapter.execute({
      type: 'create-text',
      planeId: backgroundPlane.id,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.snapshot.active).toEqual({
      group: 'background',
      planeId: backgroundPlane.id,
    })
    expect(
      result.snapshot.elements.find(({ id }) => id === result.createdId),
    ).toMatchObject({
      type: 'text',
      group: 'background',
      planeId: backgroundPlane.id,
    })
  })

  it('activates an explicit plane outside the currently active group', () => {
    const adapter = createEditorAdapter()
    const before = adapter.inspect()
    const targetPlane = before.planes.find(
      ({ group }) => group !== before.active.group,
    )

    expect(targetPlane).toBeDefined()
    if (!targetPlane) return

    const result = adapter.execute({
      type: 'set-active-plane',
      planeId: targetPlane.id,
    })

    expect(result.ok).toBe(true)
    expect(result.snapshot.active).toEqual({
      group: targetPlane.group,
      planeId: targetPlane.id,
    })
  })

  it('imports, inspects, places, and undoes a generated image', async () => {
    const repository = new MemoryAssetRepository()
    setAssetRepositoryForTesting(repository)
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 320, height: 180, close: vi.fn() })),
    )
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(
      'blob:scrollsplice-generated-test',
    )
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    expect(await useEditorStore.getState().initializeAssetLibrary()).toBe(true)

    const adapter = createEditorAdapter()
    const encoded = encodeBase64(createPngBytes())
    const imported = await adapter.executeAsync({
      type: 'import-generated-asset',
      source: {
        kind: 'data-url',
        dataUrl: `data:image/png;base64,${encoded}`,
      },
      metadata: {
        displayName: 'Moonlit garden panel.png',
        provider: 'OpenAI',
        model: 'image-model-test',
        prompt: 'A moonlit garden in a vertical comic panel.',
        generatedAt: '2026-07-20T21:00:00.000Z',
      },
    })

    expect(imported).toMatchObject({
      ok: true,
      command: 'import-generated-asset',
      changed: true,
    })
    if (!imported.ok || !imported.createdId) return
    expect(repository.snapshot?.importedImages[0]).toMatchObject({
      id: imported.createdId,
      displayName: 'Moonlit garden panel.png',
      generation: {
        provider: 'OpenAI',
        model: 'image-model-test',
        prompt: 'A moonlit garden in a vertical comic panel.',
      },
    })
    expect(
      adapter.inspect().assets.imported.find(
        ({ id }) => id === imported.createdId,
      ),
    ).toMatchObject({
      width: 320,
      height: 180,
      generation: { provider: 'OpenAI' },
    })

    const targetPlane = adapter
      .inspect()
      .planes.find(
        ({ group, kind }) => group === 'background' && kind === 'ordinary',
      )
    expect(targetPlane).toBeDefined()
    if (!targetPlane) return

    const requestedBounds = { x: 72, y: 1_640, width: 656, height: 420 }
    const placed = await adapter.executeAsync({
      type: 'place-generated-asset',
      assetId: imported.createdId,
      planeId: targetPlane.id,
      bounds: requestedBounds,
    })

    expect(placed).toMatchObject({
      ok: true,
      command: 'place-generated-asset',
      changed: true,
    })
    if (!placed.ok || !placed.createdId) return
    expect(
      placed.snapshot.elements.find(({ id }) => id === placed.createdId),
    ).toMatchObject({
      type: 'image',
      planeId: targetPlane.id,
      bounds: requestedBounds,
      assetReference: { kind: 'imported', assetId: imported.createdId },
    })

    const undone = adapter.execute({ type: 'undo' })
    expect(undone.ok).toBe(true)
    expect(
      undone.snapshot.elements.some(({ id }) => id === placed.createdId),
    ).toBe(false)
    expect(
      undone.snapshot.assets.imported.some(({ id }) => id === imported.createdId),
    ).toBe(true)
  })
})
