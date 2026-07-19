# ScrollSplice Editor Adapter

The editor adapter is ScrollSplice's stable, versioned control surface for programmatic inspection and manipulation. It lets Codex use exact document IDs and logical coordinates instead of trying to drag pixels on the screen. A future authenticated model can use the same contract behind an approved tool boundary.

The adapter does not add OAuth, OpenAI, a backend, credentials, or autonomous behavior. The human editor remains fully independent. Binary file selection and downloads remain host-mediated browser actions because JSON commands should not receive raw files or filesystem handles.

## Development browser access

Run the development app, open the browser developer console, and inspect the current editor:

```js
const editor = window.scrollSpliceEditor
const snapshot = editor.inspect()
snapshot.episode
snapshot.planes
snapshot.elements
```

The browser bridge exists only in Vite development builds. Production model tools should import `createEditorAdapter` and place authorization, approval, run limits, and audit/provenance around it. They must not depend on a writable browser global.

## Safe manipulation loop

Always use this sequence:

1. Call `inspect()`.
2. Find the target by its returned stable ID. Never invent or infer an ID from visible text alone.
3. Issue one `execute(command)`.
4. Check `result.ok`, `result.changed`, and the returned snapshot.
5. Use `undo` if the result is valid but not what the creator wanted.

All positions and bounds use logical episode pixels. The episode is normally 800 px wide. Element coordinates are absolute within the full scroll; viewport coordinates only control what is currently visible.

## Common examples

Select and reveal an element:

```js
editor.execute({
  type: 'select-element',
  elementId: 'element-id-from-inspect',
  reveal: true,
})
```

Move and resize it:

```js
editor.execute({
  type: 'move-element',
  elementId: 'element-id-from-inspect',
  position: { x: 72, y: 1640 },
})

editor.execute({
  type: 'resize-element',
  elementId: 'element-id-from-inspect',
  bounds: { x: 72, y: 1640, width: 656, height: 420 },
})
```

Change opacity, layer plane, and stacking:

```js
editor.execute({
  type: 'set-element-opacity',
  elementId: 'element-id-from-inspect',
  opacity: 0.65,
})

editor.execute({
  type: 'move-element-to-plane',
  elementId: 'element-id-from-inspect',
  planeId: 'ordinary-plane-id-from-inspect',
})

editor.execute({
  type: 'move-element-in-stack',
  elementId: 'element-id-from-inspect',
  direction: 'forward',
})

editor.execute({
  type: 'reorder-element-in-stack',
  elementId: 'element-id-from-inspect',
  targetIndex: 0,
})
```

Create a content plane and then place text:

```js
const planeResult = editor.execute({ type: 'create-plane', group: 'content' })
const planeId = planeResult.ok ? planeResult.createdId : null

if (planeId) {
  editor.execute({ type: 'create-text', planeId })
}
```

Undo:

```js
editor.execute({ type: 'undo' })
```

## Snapshot contents

`inspect()` returns JSON-safe data only:

- episode ID, title, format, and logical dimensions
- viewport, zoom, active group/plane, selection, history, and dirty state
- all three composition groups and their visibility
- ordered layer planes with stable IDs and element counts
- every element's ID, type, plane, logical bounds, visibility, stacking, opacity, blend mode, transform, overflow, and stable asset reference
- built-in and imported asset metadata without blobs, object URLs, or filesystem handles

## Command families

- Navigation: `set-active-group`, `set-active-plane`, `set-viewport`, `pan-viewport`, `set-zoom`.
- Selection and organization: select/clear/select-all, group/ungroup, story-beat movement, alignment, one-step or direct-index stacking, and Move to Plane.
- Episode and planes: rename/extend/resize the episode; create/delete/rename/reorder/show/hide planes and groups; change the base color.
- Elements: create, select, rename, move, resize, duplicate, delete, show/hide, lock, opacity, blend, transforms, flips, and overflow.
- Type-specific editing: shape fill/style, text, editable balloons, image presentation/frame/crop, and Background color regions.
- Assets: place an existing built-in or imported asset by stable ID.
- Editor/project: magnet, slice guides, undo, redo, Save, Save As, Reopen, New Episode, and Reset Demo.

Use `editor.commandTypes` for the exact version-1 names. Type-specific update commands require the complete validated property object used by the corresponding human inspector.

## Errors and boundaries

`execute` never throws for an ordinary targeting or validation failure. It returns `ok: false` with one of:

- `not-found`: the supplied stable ID does not exist
- `wrong-type`: the command does not apply to that entity
- `invalid-command`: a supplied option is unsupported
- `rejected`: the normal editor command refused the operation

The adapter deliberately refuses raw Zustand setters, React/Konva objects, credentials, browser-storage access, WEBTOON automation, and binary file handles. Importing a new local file, exporting/downloading files, or generating a network asset needs a separate authorized host tool. After that host operation produces a stable asset ID, ordinary placement and editing continue through this adapter.

## Future authenticated model use

The OAuth/model layer should expose only an approved subset of these commands as function tools. It must inspect before acting, require creator approval where policy says so, enforce cancellation and cost limits, log generated-asset provenance, and keep provider credentials outside the browser bundle, episode document, adapter inputs, results, logs, and git.
