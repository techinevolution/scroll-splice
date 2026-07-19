import { beforeEach, describe, expect, it } from 'vitest'

import { useEditorStore } from '../app/store'
import { createEditorAdapter } from './editorAdapter'

describe('editor adapter', () => {
  beforeEach(() => {
    useEditorStore.getState().resetEpisode()
    useEditorStore.getState().selectElement(null)
  })

  it('returns a normalized, serializable map of the live editor', () => {
    const snapshot = createEditorAdapter().inspect()

    expect(snapshot.apiVersion).toBe(1)
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
})
