# ScrollSplice Architecture

## First principles

ScrollSplice edits one logical vertical episode. The episode document is durable product data; canvas, minimap, Layers, Reader Preview, and the local renderer are replaceable views of it.

The architecture follows seven rules:

1. Keep the episode model as plain serializable TypeScript.
2. Give comic content one source of truth and one logical coordinate system.
3. Keep document changes pure and explicit.
4. Treat the main canvas as a viewport into a taller episode.
5. Keep platform, storage, asset, export, and authentication details at the application edge.
6. Implement only what the current milestone needs.
7. Route future model-driven work through the same context and command contracts as human work.

This is modularity by separation of responsibility, not by speculative infrastructure.

## Build Week runtime

- React 19 and plain CSS own the static application shell and panels.
- React-Konva/Konva renders only the interactive editing viewport.
- Zustand coordinates the current document, selection, viewport, command dispatch, and transient UI state.
- Application-edge project repositories validate format-v6 episodes, normalize supported v3/v4/v5 documents into v6, keep explicit local saves separate from debounced crash recovery, and support multiple local projects plus portable project files. No durable data enters React or Konva objects.
- A separate application-edge `AssetRepository` stores creator categories and unchanged imported image `Blob`s in IndexedDB. Episode saves contain stable asset IDs only.
- A lightweight React/CSS/SVG minimap derives from the episode document; it is not a second Konva editor.
- Strict TypeScript defines the core contracts.
- Vite 8 serves the local app and produces a static deployment build.
- GitHub Pages is the preferred judge-access adapter; an unrestricted downloadable build is the fallback.
- An optional dependency-free Node companion may launch the installed official Codex App Server for local ChatGPT authorization and model turns. It is not part of the static deployment and has no access to the episode store except through addressed browser tool calls.
- Vitest verifies pure model, command, and coordinate behavior; Playwright verifies one complete editor story.

The required static Build Week runtime has no backend, database, login, secrets, external asset upload, runtime OpenAI dependency, or WEBTOON integration. The human editor remains functional when the optional companion is absent, disconnected, or stopped.

Katherine approved the late local generate-and-place stretch on July 20 after the human editor and public path were stable. `DECISIONS.md` records the narrow exception: use the official `codex app-server` through a localhost companion and an app-specific `CODEX_HOME`; do not add a cloud backend, OpenAI SDK/API key, browser OAuth implementation, database, or provider credentials to the web app.

## Minimal module boundaries

Create a folder only when its active behavior exists. The intended ownership is:

- `src/core/episode.ts`: plain episode and element types.
- `src/core/createBlankEpisode.ts`: pure construction of the minimal 800 × 1,280 format-v6 episode used by **New Episode**.
- `src/core/coordinates.ts`: episode, viewport, screen, and minimap conversion plus clamping.
- `src/core/commands.ts`: pure document edits used by the Build Week MVP.
- `src/app/store.ts`: Zustand application coordination, bounded history, document status, and command dispatch.
- `src/app/fixtures/`: original public-safe Build Week sample data.
- `src/editor/`: Konva viewport rendering and element interaction.
- `src/minimap/`: simplified full-episode representation and navigation requests.
- `src/layers/`: ordered layer presentation and selection requests.
- `src/components/`: shell and small ordinary React controls.
- `src/assets/`: original built-in catalog, import validation, local asset snapshots, shared browser-image loading, runtime source resolution, and the IndexedDB adapter.
- `src/persistence/projectRepository.ts`: defensive episode parsing and the legacy/current explicit-save boundary.
- `src/persistence/projectLibraryRepository.ts`: multiple browser-local project records and recent-project summaries.
- `src/persistence/recoveryRepository.ts`: debounced unsaved recovery snapshots kept visibly separate from explicit saves.
- `src/persistence/portableProject.ts` and `portableProjectMerge.ts`: validated `.scrollsplice` files containing one episode plus reusable asset blobs, with collision-safe ID remapping on import.
- `src/export/profiles.ts`: provisional versioned output-profile data and pure candidate-boundary/slice-plan math.
- `src/export/renderEpisode.ts`: browser-local tall-master and slice rendering plus encoded-file preflight; it does not upload or publish.
- `src/agent/`: browser-local conversation persistence, companion transport, run state, and strict dispatch from model tool requests into the versioned editor adapter.
- `companion/`: localhost-only Codex App Server lifecycle, official ChatGPT authorization, model discovery, bounded turn streaming, and short-lived generated-image staging. It never imports React, Zustand, Konva, browser persistence, or episode commands.
- `scripts/dev-local.mjs`: one-command development launcher that gives the Vite proxy a random per-launch companion capability and starts both local processes.

Do not create empty `services`, `adapters`, or `auth` trees merely to represent future ideas. Their boundaries are documented below and become files only when an approved slice needs them. The implemented persistence and export trees remain browser-local application-edge adapters; they are not a backend, cloud/account sync system, WEBTOON connector, or publishing service.

## Current validated document model

The implemented format-v6 document uses one shallow, explicit organization path: fixed composition group -> ordered layer plane -> flat element references by `layerPlaneId`. An element's group is derived from its plane rather than duplicated on the element. Version 4 introduced real image references, version 5 added shared appearance, and version 6 adds bounded transforms/protection/overflow, image frames/crop/masks, flat element-group membership, and one editable speech-balloon element. Source bytes and browser object URLs never enter the episode document.

The sample document contains:

- a stable episode ID and format version
- an editable episode name
- a fixed logical width of `800` units and flexible logical height
- ordered `LayerPlane` records with stable IDs, group ownership, visibility, optional creator-facing names, and base or ordinary kind
- an ordered flat collection of elements
- for each element: stable ID, readable name, plane reference, asset reference, logical bounds, visibility, lock state, stacking, opacity/blend, rotation/flip, and constrained-or-episode-edge-bleed behavior
- for image elements: a built-in or imported asset reference plus Stretch/Cover/Tile presentation, crop focus/zoom, rectangle or normalized-polygon mask, and optional frame border; source data resolves at the application edge
- for text elements: wording, color, font family, font size, weight, line height, and left/center/right alignment
- for speech balloons: a stable editable body type, optional normalized creator-shaped contour points, body/outline styling, and one editable tail side/anchor/width/tip; new balloons are empty and use independent text elements for lettering
- a flat collection of non-nested `ElementGroup` member-ID records used for selection and atomic movement

The format-v6 appearance shape remains plain data: every element has normalized opacity and one of Normal, Multiply, Screen, Overlay, or Soft Light; Background color regions may be solid or vertical two-stop color/alpha gradients; and images use Stretch, Cover, or Tile. Tile presentation uses a fixed automatic scale capped at a 160-logical-unit tile edge. Supported v3/v4/v5 documents normalize to deterministic v6 defaults without changing source assets.

Every browser load starts from `createBlankEpisode`: one unsaved 800 × 1,280 **Untitled Episode** with no elements, a pinned white Background base, one ordinary Background plane, one Content plane, and one Foreground plane. Existing saved projects remain listed locally but open only through explicit **Reopen Current** or **Open Local Project…** actions. The optional public **Reset Demo** fixture is **The Light We Planted**: six original generated story images plus separate title and narration elements. The optimized JPEGs live under `public/demo/the-light-we-planted/` and exercise real image loading, scrolling, minimap navigation, layer ordering, selection, and movement without private Root & Table work or third-party reference art. The earlier code-defined **Signal in the Fog** fixture remains historical provenance, not the current reset state.

The `800`-unit width is a convenient logical coordinate choice that also maps directly to the 800 px maximum displayed by WEBTOON's authenticated Manage Episode form on July 13, 2026. It remains an editor coordinate choice, not a permanent platform rule. Platform requirements never belong in this core schema.

Selection, hover, active drag, two-dimensional viewport position, zoom, panel-collapse state, and reset state are editor state, not episode content. The implemented view uses the fitted episode width as 100%, then applies a transient 50–200% factor without changing document geometry.

Do not put React objects, Konva nodes, browser handles, user IDs, OAuth fields, provider tokens, WEBTOON metadata, or platform upload state in the episode document.

## Implemented bounded format-v6 extension

Format v6 extends the existing shallow document rather than introducing a second scene graph. Common element fields carry rotation, horizontal/vertical flip, lock state, and constrained-or-episode-edge-bleed behavior. Image elements own explicit Cover crop focus/zoom, rectangle or normalized-polygon mask data, and an optional mask-following border. A mask always clips its image; bleed does not create a hole through that clipping boundary. First-class panel breakout would need a later explicit composition contract, while the current workaround uses a separate duplicated unmasked overlay. Flat `ElementGroup` records associate stable member IDs without owning duplicate geometry or allowing recursive groups. The speech balloon is one atomic element rather than a hidden group of loose text and shape children.

The v6 loader gives supported v3/v4/v5 documents deterministic defaults, preserves stable IDs and source references, and rejects unknown future versions. Core commands remain pure, and canvas, minimap, Layers, Reader Preview, persistence, portable files, recovery, and rendering consume the same normalized episode. Arbitrary mask-point editing, nested groups, a generic migration framework, plugins, and parallel panel/balloon documents remain deliberately absent.

## Implemented layer-plane foundation

The approved organization model remains shallow and predictable rather than becoming an arbitrary nested tree:

- `CompositionGroup` has exactly three values: `background`, `content`, and `foreground`.
- Each group owns an ordered, open-ended list of numbered `LayerPlane` records with stable IDs, optional names, visibility, and ordinary or base kind.
- Exactly one plane is special: Background plane 1 is the pinned lowest plane, carries the editable full-scroll base RGB color, and automatically follows episode height. It may be recolored or hidden but cannot be reordered or deleted.
- Every other plane is an unrestricted creative surface. Examples such as “Fade,” “Characters,” or “Film” are optional names, never enforced content types.
- Every element references one `layerPlaneId`; its group is derived from that plane rather than duplicated as a second source of truth.
- The Asset Library slice made the first concrete schema transition from v3 to v4. The implemented appearance transition remains similarly bounded: supported v3 and v4 documents normalize into v5 appearance defaults, while malformed or unknown versions fail safely. Do not build a broad migration framework or silently coerce unknown versions.
- Ordinary color regions are elements with normal logical `x`, `y`, `width`, and `height` bounds plus fill data. Creation starts them at `x = 0` and 800 units wide for convenience, but that is not an invariant: subsequent moves and eight-handle transforms freely edit both axes and dimensions. A fill is either solid or one vertical two-stop fill whose endpoints each carry color and alpha; that covers both a color gradient and a fade to transparency. Arbitrary angles, extra stops, and masks remain deferred.
- Effective visibility is `group visible AND plane visible AND element visible`. A hidden element is absent from the canvas and hit testing but may remain selected from the Layers panel.
- Render order is fixed group order, then plane order, then local element stacking. Within a group, plane 1 is lowest and each increasing plane number renders above the lower numbers. The right list presents the active plane in that same local stack order, making grip reordering visible and keeping the list and overlap contract aligned.
- `activeCompositionGroup` and `activeLayerPlaneId` are transient editor state. Canvas selection activates both so the matching row remains discoverable.

Commit `c5f83c5` bumped the unsaved fixture directly to format v3 without speculative migration machinery. The colored beat rectangles now live in a Content plane as comic panels, and pinned Background plane 1 owns the starting backdrop color used by both renderers; no hardcoded episode fill remains in the canvas or minimap.

### Layer-plane tab behavior

- The right panel shows compact numbered tabs below `Layers · Background`, `Layers · Content`, or `Layers · Foreground`.
- When Background plane 1 is active, the inspector and canvas each show a compact color control backed by the same `setBaseColor` command. Both are editor chrome. If the base plane is hidden, canvas and minimap show an editor-only checkerboard that is not episode content or export output.
- The implemented foundation provides stable identity, selection, creation, visibility, overflow arrows, automatic active-tab reveal, optional names, and same-group ordering without changing the document format.
- Ordinary tabs have a dedicated drag grip that dispatches a pure reorder command inside the active group. Background plane 1 remains pinned.
- Move Left/Right commands provide a keyboard and non-drag alternative. Small left and right overflow arrows scroll the tab strip without changing plane order, and the active tab continues to scroll into view.
- A `+` creates another ordinary plane in the active group. Plane numbers reflect current order; stable IDs preserve identity when numbers change.
- An ordinary plane may be deleted only when it contains no elements. Hidden elements still count as contents, Background plane 1 is never deletable, and every group retains at least one plane. After deletion, application coordination activates the nearest remaining plane.
- Group, plane, and element eye states remain independent and preserve child settings.

An empty plane's centered action area pairs the implemented **Delete plane** control with a paperclip **Add asset** action. The same add action remains available when an ordinary plane is populated. It opens the overlay Asset Library and targets the currently active ordinary plane.

The fixed left rail is an application-shell concern with four destinations: **Uploads**, **Speech Balloons**, **Decorations**, and **Splatters**. Uploads owns the personal library and exposes **All**, **Unsorted**, and creator-named category filters inside the drawer so an unbounded list cannot overwhelm the rail. Filter selection and drawer state remain transient; creator categories and imported source images persist through `AssetRepository`. The visible fixed-image catalog contains six original transparent SVG assets—three Decorations and three Splatters. Speech Balloons is a separate first-class element catalog with ten empty editable body types. Retired fixed-balloon definitions remain in a compatibility-only resolver so older v4/v5 projects keep their artwork, but those definitions are not advertised or placeable from the current library. The local build supports click and native drag image placement, select, move, resize, visibility, delete, history, opacity, the five recorded blend modes, Stretch/Cover/Tile image presentation, independent editable text, and atomic balloon bodies with type selection and tail editing. Automatic balloon/text coupling, perspective, freeform distortion, multi-tail relationships, and creator-saved balloon presets remain deferred.

## Commands and state ownership

The implemented Build Week command surface is intentionally small:

- `moveElement(elementId, logicalPosition)` returns an updated document.
- `resizeElement(elementId, logicalBounds)` resizes an unlocked element within episode bounds; ordinary shapes/text preserve ratio and Text font scale, while Background color regions accept independent width/height changes.
- `setElementVisibility(elementId, visible)` changes one element's eye state.
- `setCompositionGroupVisibility(group, visible)` changes only the group eye state and preserves every element's individual setting.
- `createLayerPlane(document, group)` appends an ordinary plane with a stable ID and order.
- `deleteEmptyLayerPlane(document, planeId)` removes one safe empty ordinary plane and compacts only that group's display order.
- `setLayerPlaneVisibility(document, planeId, visible)` changes only one plane's eye state.
- `setBaseColor(document, color)` changes the pinned episode backdrop.
- `setEpisodeName(document, name)` validates and changes the episode title.
- `extendEpisodeHeight(document, amount)` extends the logical scroll without moving existing content.
- `resizeEpisodeHeight(document, requestedHeight)` safely grows or trims the logical scroll while respecting the centralized 1,280-unit minimum and every element's bottom bound.
- `deleteElement(document, elementId)` removes one placed episode instance.
- `createImageElement(document, input)` places one built-in or imported image reference in an ordinary plane with stable geometry and stacking.
- `createSyntheticShapeElement(document, input)` places one code-defined demo rectangle in an ordinary plane.
- `createBackgroundColorRegion(document, input)` places one solid region at the full episode width as an editable starting geometry in an ordinary Background plane.
- `setLayerPlaneName(document, planeId, name)` writes or clears one ordinary plane's optional creator-facing name.
- `reorderLayerPlane(document, planeId, destinationOrder)` reorders an ordinary plane only inside its fixed group while retaining stable IDs.
- `moveElementInStack(document, elementId, direction)` performs one local Bring Forward or Send Backward step inside the current plane.
- `moveElementToLayerPlane(document, elementId, planeId)` moves one element to a valid ordinary destination without changing its stable identity or asset reference.
- `createTextElement(document, input)` creates one independent text element, and `updateTextElement(document, elementId, patch)` validates its supported wording and typography changes.
- `resetEpisode()` restores the known fixture document through application coordination.

Navigation and selection do not change the document. They update application state.

Plane naming/reordering, local stacking, Move to Plane, and independent text retain their original fields. Format v6 adds the implemented transform/lock/overflow, image-frame/crop/mask, flat-group, and atomic speech-balloon commands. Guarded source management, multiple/portable projects, and recovery stay in application-edge adapters rather than the episode model. The implementation still excludes arbitrary nesting, a generic folder/scene graph, cloud storage, speculative gradient/blend infrastructure, and a general migration framework.

The appearance slices add pure commands such as `setElementOpacity`, `setBackgroundRegionFill`, `setImagePresentation`, and `setElementBlendMode`. They validate supported targets and values, return the original document for a no-op or invalid request, and enter the same bounded history path as existing document edits. Opacity clamps to 0–1. A selected opacity slider publishes transient preview state, but one gesture commits once. Format v5 normalizes supported v3/v4 data to 100% opacity, Normal blending, solid fills, and single-image presentation while preserving existing v4 shape opacity.

### Implemented creator-completion command and view extensions

The three creator-completion slices extend existing seams rather than introducing a new model:

- Plane naming writes or clears the existing optional `LayerPlane.name`. Same-group plane reorder changes only ordinary-plane `order`, retains stable IDs, compacts visible numbering, and cannot move Background plane 1. A drag gesture and Move Left/Right dispatch the same pure operation and produce one history entry.
- Bring Forward and Send Backward adjust the selected element's local `zIndex` by one position inside its current plane. A left-side row grip can move an unlocked element directly to another stack position in one history entry. Because the visible list is low-to-high stack order, Arrow Up moves backward to the preceding visible row and Arrow Down moves forward to the following row. The Layers list renders that same resulting stack order.
- Move to Plane changes one selected element's `layerPlaneId` to an ordinary destination in any fixed group, normalizes local stacking at that destination, and preserves its stable ID, bounds, appearance, and asset reference. Application coordination activates the destination group and plane.
- Add Text creates one ordinary `TextElement` in the active ordinary plane. Text property commands update wording, fill color, font size, the existing `400 | 600 | 700` weight, or left/center/right alignment. The font family and line-height defaults remain fixed for this slice. Text remains independently movable, resizable, visible, composited, and selectable; no image asset or compound balloon record owns it.
- Reader preview is a read-only presentation over the current normalized document and resolved asset sources. It does not create a second episode representation and does not write document, history, dirty, selection, active-plane, zoom, or viewport state.
- Reset Demo confirmation belongs to application lifecycle coordination. When dirty, cancellation is a true no-op. Confirmation loads the fixture as an unsaved document, clears stale selection/history/live interaction state, and never deletes or overwrites the explicit saved slot or Asset Library.

These historical creator-completion changes used the existing format-v5 fields. They now pass unchanged through the format-v6 history and persistence paths.

### Implemented episode-structure command extension

The Episode Setup and Expandable Scroll checkpoint uses fields that already existed in format v3, so it required no format bump or migration framework:

- `setEpisodeName(document, name)` trims the proposed name, rejects an empty result, and enforces the 60-character editor limit. The header's inline editor commits on Enter or blur, cancels on Escape, and prevents more than 60 input characters.
- `extendEpisodeHeight(document, amount)` increases `logicalHeight` by a positive logical-unit amount and never shrinks or moves existing content. The UI uses exported `DEFAULT_EPISODE_HEIGHT_INCREMENT = 1280` rather than scattering that value through components.
- `deleteEmptyLayerPlane(document, planeId)` accepts only an ordinary plane with no elements, rejects deletion of the final plane in a group, and always protects the pinned base. Hidden elements count as contents; after deletion, application coordination selects the nearest remaining plane.

Background plane 1 has no independent rectangle height. Its full-scroll coverage derives from `episode.logicalHeight`, so extending or trimming the episode automatically updates the base without duplicating data. The bottom-of-story **Add scroll space** control dispatches the centralized 1280-unit extension. The separate fine-tune button was replaced by a full-width hit area on the bottom canvas edge: its `ns-resize` cursor translates pointer drag into logical units and retains 10-unit arrow-key or 100-unit Shift+arrow adjustments for keyboard users. Both controls are editor chrome, not episode elements, minimap items, or export items. Whenever height changes, the larger scrollable minimap recomputes its complete logical surface and keeps the active viewport frame in view independently of main-editor zoom.

Zustand exposes the pure commands through `setEpisodeName`, `extendEpisodeHeight`, and `deleteLayerPlane` application actions. Deletion chooses the previous plane when available and otherwise the next, then clears element selection. Title and height changes preserve unrelated document arrays and transient viewport state. Reset restores the fixture title, original logical height, fixture planes, selection, and viewport.

### Implemented post-review command extensions

These extensions are implemented and validated locally in checkpoints A and B:

- `deleteElement(document, elementId)` removes one placed episode instance and nothing from a future source-asset repository. The trash control sits beside that element's eye in Layers.
- `createSyntheticShapeElement(document, input)` creates one code-defined demo rectangle only in an ordinary plane; application coordination detects and selects the appended stable element ID.
- `resizeEpisodeHeight(document, requestedHeight)` supports precise growth and shrink requests. It clamps to `MIN_EPISODE_LOGICAL_HEIGHT = 1280` and to the greatest logical bottom bound of all elements, including hidden elements and Background color regions, so it never clips or moves content. The existing `extendEpisodeHeight` remains the coarse 1280-unit shortcut.
- At historical checkpoint B, `createBackgroundColorRegion(document, input)` created a full-width solid element in an ordinary Background plane from a chosen start, length, and color and preserved `x = 0` during movement. The later free-transform correction supersedes that movement restriction while retaining full width as the creation default.

The bottom-edge resize hit area converts pointer movement through the shared coordinate module and requests logical height through `resizeEpisodeHeight`. Background plane 1 derives from the resulting document height and is excluded from the content-floor calculation because it has no independent bounds. Canvas viewport clamping and the scrollable minimap surface respond to the same committed height. Real PNG/JPEG/WebP imports with source alpha can already be placed on ordinary Background planes 2 and later; Background plane 1 remains the pinned color-only base. The implemented appearance goal adds vertical two-stop fills, tiled presentation, and five blend modes, while background-specific texture-density controls remain deferred; ordinary image Cover/crop is implemented.

The title's existing validation does not change in checkpoint A. Ordinary title text remains the click target, and the input is created after activation with no permanent pencil control. The corrective checkpoint gives the fixed **EPISODE** label its own stable column and gives title text and input one clamped footprint, so activation replaces only the title and cannot shift the label or neighboring reset control.

### Implemented corrective editing extensions

The July 14 corrective checkpoint adds behavior without changing the format-v3 document shape:

- A Background color region starts full width, then behaves as freely editable bounded geometry. Its live drag node follows both axes; the same 8 CSS-pixel center rule applies when the magnet is enabled, while Magnet Off or Alt/Option bypasses snapping.
- `resizeElement(document, elementId, requestedBounds)` is a pure command over existing bounds. It rejects unknown, locked, or non-finite requests, clamps inside the episode, and enforces `MIN_ELEMENT_SIZE = 24`. Ordinary shapes/text preserve ratio and Text scales `fontSize` proportionally with a minimum of 8; Background regions accept independent width/height bounds. No schema bump is needed.
- Selected unlocked ordinary shapes/text attach four proportional corner anchors. Background regions attach eight anchors—four corners and four sides—with ratio locking disabled. Resize handles do not double as rotation, flip, or crop gestures: those implemented operations use explicit selected-element controls. Perspective and freeform distortion remain disabled.
- `liveElementBounds` is transient application state. During drag or transform, shared logical preview bounds update the canvas status `x/y/w/h` and the minimap without rewriting the episode document. One pure command commits at gesture end; clearing or canceling the gesture discards the preview.

Zustand owns:

- the current episode document
- the selected element ID
- the active composition group
- the active layer-plane ID
- the logical two-dimensional viewport dimensions and position
- the transient Fit Width-relative zoom factor
- active transient pointer state
- the selected element's transient live bounds preview
- the implemented appearance controls' transient opacity preview and one-commit gesture boundary
- the current Asset Library drawer state
- local asset-library status, creator categories, and runtime imported-image source URLs
- default-on transient magnet and candidate-guide visibility
- up to 100 document-history checkpoints, redo state, and the current saved revision
- dirty/saved status and command dispatch
- reset and document lifecycle actions

Canvas, minimap, and layers subscribe to this shared state. They must not keep competing copies of comic content, selection, or viewport position.

## Local history, project persistence, recovery, and the Asset Library

The browser-local storage boundary now separates explicit saves, recovery, reusable source media, and portable transfer:

- The bounded episode parser accepts supported v3/v4/v5 documents, normalizes them to validated format v6, and rejects corrupt or unknown versions.
- `ProjectLibraryRepository` owns multiple explicit browser-local project records and recent-project summaries. Save updates the current project; Save As creates a new project identity; Open Local and delete operate only on this library.
- `RecoveryRepository` stores a debounced unsaved snapshot separately from explicit saves. Startup offers Restore/Discard when that snapshot is newer/useful; lifecycle flushes improve crash/close coverage without turning explicit Save into invisible autosave.
- Portable `.scrollsplice` files contain a validated episode plus the complete reusable asset-library snapshot. Import collision-remaps category/source IDs and rewrites episode references before merging, so unrelated local records are not overwritten.
- Episode layout stores stable asset IDs only, while imported source `Blob`s remain in the separate IndexedDB Asset Library except when deliberately copied into a portable file.
- `AssetRepository` owns the versioned IndexedDB database `scrollsplice-asset-library-v1`. It stores one validated asset-library snapshot containing creator categories, source metadata, and unchanged PNG/JPEG/WebP `Blob`s. Category creation and imports use one atomic IndexedDB read-transform-write transaction, so concurrent tabs merge against the latest saved snapshot instead of overwriting one another. The successful update returns that merged snapshot, and the initiating tab refreshes its categories and runtime sources from it.
- **Save** remains explicit. It writes the current episode into the current local project; selection, viewport, zoom, open panels, live pointer bounds, history stacks, and provider/account data are never persisted.
- Import and creator-category creation persist immediately to the local Asset Library and do not create episode-history entries. Placing an asset creates a normal image element and one episode-history entry; it becomes durable only after **File > Save**.
- New Episode, Reopen, Reset Demo, Undo, and Redo do not delete imported sources or creator categories. Clearing browser site data, changing profiles/origins, or losing one storage boundary can still leave a saved episode with a missing source; renderers show an honest selectable placeholder.
- On app startup, a valid current/recent project opens automatically. Missing or unavailable storage falls back to the public-safe demo. Corrupt or unsupported records are reported and left untouched rather than silently deleted or coerced.
- **Reopen** reads the last explicit save and resets selection, viewport, zoom, transient controls, and undo/redo. If the current document is dirty, the application asks before discarding it.
- **New Episode** creates an unsaved **Untitled Episode** with a stable ID, 800-unit width, 1,280-unit height, a pinned white Background base, one ordinary Background plane, one Content plane, one Foreground plane, and no elements. It does not delete the existing saved slot, so **Reopen** can still recover that last save.
- The creator-completion pass gives **Reset Demo** the same dirty-document guard as the other destructive lifecycle actions. Cancel preserves the complete current editor state. Confirm loads the fixture as unsaved and keeps the last explicit save available to **Reopen**.
- The working in-app surface is **File > New Episode / Open Local Project / Save / Save As / Reopen Current / Import Project / Export Project File / Export Episode Images**, **Edit > Undo / Redo**, **View > Reader Preview**, **Window > Show/Hide Inspector**, and **Help > Shortcuts & About**. It is browser UI, not a native macOS or Windows menu.
- Shortcuts are `Mod+S`, `Mod+Shift+S`, `Mod+Z`, `Mod+Shift+Z`, `Ctrl+Y`, `Mod+D`, Delete/Backspace, and arrow-key nudging with Shift for 10 units. Editing fields retain native text behavior.

The Zustand coordinator keeps a maximum of 100 history checkpoints. Every successful episode-document mutation goes through one commit helper, clears redo after a new branch, and records the prior document plus enough selection/group/plane context to restore a coherent editor. This includes element and layer-plane creation/deletion, movement, resize, title, coarse extension, precise height, element/plane/group visibility, and base color. A bottom-edge pointer gesture may publish many live height previews, but its start and final height form one undo step. Navigation, zoom, selection-only changes, drawer state, magnet state, guide visibility, and live bounds are transient and not undoable document edits.

Undo and redo restore the episode document, clear stale live previews, clamp the viewport, preserve a still-valid selection, and otherwise choose a valid group/plane context. Save marks the current revision clean without deleting history. Reaching that saved revision again through undo/redo clears the dirty indicator; leaving it marks the document unsaved. Reopen and New Episode are lifecycle boundaries that clear both history stacks.

The source-management boundary also supports category rename/delete/reorder and source rename/category move/replace/delete. Deletion is reference-safe across the current episode, explicit saves, recovery, and every local project. Category deletion retains its sources by returning them to **Unsorted** inside Uploads. Native desktop storage, cloud/account sync, and a general migration framework remain outside the goal.

## Viewport and coordinate model

The episode can be much taller than the screen, but the live Konva stage remains viewport-sized.

1. Elements are stored in logical episode coordinates.
2. The viewport stores logical `x`, `y`, width, and height plus a transient zoom factor.
3. A fit scale maps the fixed logical episode width into the available editor width; the zoom factor scales relative to that fit from 50% through 200%.
4. Coordinate helpers translate between logical episode, stage screen, and minimap coordinates on both axes.
5. The editor renders intersecting elements plus a small buffer.
6. Every requested viewport position is clamped to the logical episode bounds.

Wheel/trackpad and arrow-key movement update the logical viewport position. Shift+wheel and horizontal trackpad input provide horizontal access when zoom creates horizontal overflow. The minimap derives its two-dimensional viewport box from the same conversion helpers. Minimap click or box drag requests a new logical position; it never mutates comic content.

Selecting an off-screen element from the layers list centers that element in the viewport, clamped to episode bounds. This rule removes an otherwise unclear selection state for reviewers.

Coordinate conversion and clamping live in one tested core module. Do not duplicate formulas in canvas and minimap components.

The format-v6 movement command uses explicit overflow behavior: **Keep inside** clamps to episode bounds, while **Allow bleed** permits episode-edge overflow and the final renderer clips to the 800-unit output boundary. Image masks remain their own clipping boundaries even when bleed is enabled; panel-mask breakout is not first-class and currently requires a separate unmasked overlay element. Optional snapping is a proximity aid and never silently resizes, crops, straightens, or forces a bleed-enabled element back inside.

### Implemented adjustable zoom and two-dimensional viewport

Checkpoint C adds transient `zoomFactor`, `viewportX`, and `viewportY` state without changing the episode format. Visible controls expose **Fit Width** plus a 50–200% zoom range, and scroll progress is calculated over the navigable range so the episode end reads 100%. Changing zoom preserves the current logical viewport center where possible, then clamps both axes so no portion of the episode becomes permanently unreachable.

At adjustable zoom, logical viewport width and height are derived from the stage dimensions and `zoomFactor`. All episode-to-stage conversions, centering, panning, and clamping stay in the shared coordinate module. The minimap renders the complete episode on one proportionate surface, but intentionally shows that surface through a larger vertically scrollable window rather than shrinking the entire episode into view at once. It keeps the active two-dimensional viewport frame visible as the editor moves. The frame extends 48 logical pixels beyond each horizontal viewport edge for easier reading, and pointer hit-testing uses that same expanded width so dragging any visible part of the frame cannot be mistaken for click-to-recenter navigation.

### Implemented provisional export-profile planning guides

The corrective editor checkpoint draws default-on gray dotted horizontal guides across the 800-unit episode at candidate slice boundaries derived from the selected versioned `ExportProfile`. For `webtoon-canvas-2026-07-13-observed`, mapping the 800-unit episode to an 800 px target yields interior guides at `y = 1280, 2560, ...` while the value is below `episode.logicalHeight`. The pure profile module calculates that interval from profile width and maximum slice height rather than introducing a second hardcoded platform limit.

Guide visibility and the selected preview profile are transient editor state. Guides move correctly with pan and zoom, can be toggled, and never enter the episode document, document commands, minimap, tall master, or exported files. They are layout aids rather than promises about final cut positions or platform processing.

## Interaction flows

### Selection

1. Canvas or layers emits an element ID.
2. The store updates the single selected ID.
3. Canvas selection is limited to effectively visible elements; Layers-panel selection may target hidden elements so creators can inspect or reveal them.
4. Selection activates the element's composition group and numbered plane.
5. If a Layers selection targets an off-screen element, the store computes a centered, clamped viewport.
6. Canvas, minimap, and layers render from the resulting state.

### Navigation

1. Canvas wheel/trackpad input or minimap interaction requests a logical viewport position.
2. The coordinate module clamps it.
3. The store applies it.
4. Canvas and minimap rerender from the same viewport.

### Movement

1. Konva supplies drag feedback, converted continuously into clamped logical bounds.
2. Magnet On evaluates episode centers/edges and nearby-element centers/edges within a zoom-aware CSS-pixel threshold; Magnet Off or Alt/Option bypasses it.
3. The store publishes transient live bounds to the status bar and minimap without mutating the document.
4. On drag end, the application dispatches one `moveElement` command and clears the preview.
5. Canvas, minimap, and layers derive their lasting view from the returned document.

The transient `magnetEnabled` state defaults to `true`. The shared coordinate module ranks episode-center/edge and nearby-element center/edge candidates within a zoom-aware threshold and returns temporary horizontal/vertical guides with the snapped logical position. Turning the magnet off or holding Alt/Option during a drag bypasses snapping. Toggling the magnet never mutates document geometry by itself.

### Bounded corner resize

1. Selection attaches four proportional corner handles to an unlocked ordinary shape/text or eight independent handles to a Background color region.
2. Konva supplies transient visual scale. Rotation and flip are separate explicit format-v6 appearance commands rather than accidental Transformer gestures.
3. Each transform event publishes logical preview bounds to status `x/y/w/h` and the minimap.
4. On transform end, the editor converts scale into requested logical bounds, resets node scale, dispatches one pure `resizeElement` command, and clears the preview.
5. Canvas and minimap rerender from the same committed format-v6 bounds and appearance data.

This interaction includes independent side-handle stretching for Background color regions. Rotation, flip, exact geometry, alignment, lock, image crop/masks/frame, and edge behavior are exposed through explicit controls. Perspective and freeform distortion remain excluded.

### Asset-library and placement flow

1. App startup hydrates creator categories and imported source `Blob`s from `AssetRepository`, creating runtime-only object URLs for rendering.
2. Upload validates PNG/JPEG/WebP signature, byte size, and optional creator-category identity; it parses declared dimensions from PNG IHDR, JPEG SOF, or WebP VP8/VP8L/VP8X headers and rejects an over-40-megapixel source before full decode. The browser decoder still verifies the source and must confirm the header dimensions before the unchanged source is saved.
3. Clicking a built-in or imported asset requests one proportional, viewport-centered `ImageElement` in the active ordinary plane. Native drag uses a strictly parsed stable-ID payload and the shared pan/zoom conversion to place that same source beneath the pointer. Placement fits the source while keeping both axes at least the shared 24-logical-unit minimum; an extreme aspect ratio that cannot satisfy that minimum inside the episode is refused with a clear message rather than distorted.
4. The pure image command returns a format-v6 episode; every placement path creates one normal history entry and selects the new instance without drag-plus-click duplication.
5. Canvas, minimap, and Layers resolve the same stable reference. If a source is absent, all surfaces remain usable and show missing-source state instead of crashing.
6. **File > Save** persists layout and stable IDs only. IndexedDB persists reusable source media separately.

An Asset Library card uses native drag events with an internal payload containing only source kind and stable ID. The canvas strictly parses that payload, maps the screen drop through current pan and zoom into logical coordinates, and dispatches the existing creation path once. Click-to-place remains the accessible fallback. Operating-system PNG/JPEG/WebP drop performs one atomic import-and-place action, while plane-tab and active-Layers-list drops place a validated internal asset on the explicit destination plane with feedback.

This same flow supports background photos: choose an ordinary Background plane—plane 2 or later—and place an imported image there above the full-scroll base. Background plane 1 is deliberately color-only. Stretch fills the selected bounds, Cover provides non-destructive focus/zoom, and Tile repeats the unchanged source with fixed automatic scaling capped at a 160-logical-unit tile edge.

### Composition-group, plane, and visibility flow

1. A Background, Content, or Foreground control updates the transient active group.
2. The numbered tab strip chooses one plane in that group while the canvas continues to render every effectively visible group and plane.
3. The right element list shows the active plane's contents from low to high local stack order; vertical canvas position does not reorder the rows.
4. Selecting a canvas element updates the selected ID, active group, and active plane.
5. A group, plane, or element eye dispatches its corresponding pure visibility command.
6. Canvas, minimap, and Layers panel derive effective visibility from the same episode document.

Hidden elements do not render and cannot capture canvas selection. They remain selectable from the Layers panel; hiding a selected element keeps the selection and removes only its canvas outline until it is shown again.

### Implemented plane-order and element-stack flow

1. A creator optionally names an ordinary plane or uses its dedicated grip to drag it within the active group; Move Left/Right requests the same adjacent reorder without requiring drag.
2. The pure command retains stable IDs, rejects cross-group movement and the pinned base, normalizes order, and returns one document revision.
3. The selected element's Bring Forward/Send Backward action changes only local overlap order inside its plane. Move to Plane changes one stable `layerPlaneId` to a valid ordinary destination and activates that context.
4. Canvas, minimap, and the Layers row list immediately use the same deterministic group/plane/local stack. Within the active plane, rows are shown from low to high stack order; logical vertical position does not secretly reorder them.

### Implemented independent-text flow

1. A visible Add Text action creates one default `TextElement` in the active ordinary plane and selects it.
2. Compact controls commit wording, color, size, weight, or alignment through pure commands; ordinary movement, proportional resize, opacity, blend, visibility, and deletion remain shared behavior.
3. A creator may position that text over a balloon image, but the two elements remain independent and may be selected, moved, reordered, or deleted separately.
4. Canvas, minimap, Layers, history, and persistence consume the same format-v6 text data.

### Implemented multi-selection, group, and story flow

1. `selectedElementIds` owns the current flat selection while `selectedElementId` identifies its primary member for geometry/appearance controls.
2. Shift selection toggles ordinary members. Selecting any member of an existing flat group selects that group; groups never contain other groups.
3. Grouped move, nudge, duplicate, delete, plane move, and 128-unit story-beat movement dispatch one pure command and produce one history entry while preserving relative geometry.
4. During a grouped pointer drag, only the primary member publishes live status/minimap bounds; follower members update at the atomic document commit on release.
5. Populated-plane deletion requires either an explicit same-group destination or a separate destructive confirmation; Background plane 1, the final plane, and locked contents remain protected.

### Implemented editable speech-balloon flow

1. Each of the ten library cards creates one empty `SpeechBalloonElement`, not an image or hidden collection of loose children.
2. The element owns a stable editable body-type identifier, optional normalized contour points, body fill/stroke/corners, and one tail with enabled state, side, anchor, width, and normalized tip. Selected balloons expose draggable contour handles; new library balloons carry no embedded wording, so creators add an independent Text element.
3. Older format-v6 balloons that already contain embedded wording retain their recorded typography and pure fitting behavior for backward compatibility; new library balloons deliberately start empty and use independent Text elements.
4. Canvas, minimap, Reader Preview, visual bounds/clamping, save/reopen, portable projects, history, adapter snapshots, and local output all consume the same balloon record.

### Implemented preset foundation and deferred expansion

The [Editable Speech-Balloon Catalog](SPEECH_BALLOON_CATALOG.md) records the broader product inventory. Its bounded core foundation is implemented as Standard, Rounded, Thought, Whisper, Shout, Electric, Rough, Wavy, Telepathic, and Double Outline starting types; every type remains editable after placement.

- Extend the same body element with explicit body, outline, fill, and tail/source-marker properties. Keep lettering independent unless a later versioned decision deliberately introduces a compound relationship; do not create one unrelated element type per visual convention.
- Built-in type geometry is an immutable renderer keyed by the stable synthetic generator ID stored in the episode. Creator-edited colors, outline, bounds, contour points, and tail values live directly on the element and do not mutate the preset catalog.
- Preserve flat document structure. Direct joins, connectors, multiple tails, and reading order use explicit flat associations and must be safely unlinkable; they do not introduce recursive groups or hidden duplicate geometry.
- Keep creator-saved presets in an application-edge repository and include them in portable packaging when approved. Provider, store, account, or credential details never enter the episode.
- Keep captions and sound effects as separate element kinds that may reuse typography and appearance primitives. They are related lettering tools, not special balloon flags.
- Treat optional normalized `bodyControlPoints` as the backward-compatible final format-v6 balloon extension: absence means the preset's deterministic contour. Any later non-optional or structurally incompatible field requires an explicit versioned document change with deterministic defaults.
- Require command, history, persistence, recovery, portable-project, canvas, minimap, Reader Preview, and output parity for every added primitive before calling a preset complete.

### Implemented reader-preview and reset flow

1. Entering preview records no document mutation. The application presents the same episode and resolved assets at the episode aspect ratio without editor chrome.
2. Preview scroll is local to that view. Exiting returns to the preserved editor selection, group, plane, zoom, and logical viewport with unchanged dirty/history state.
3. Reset Demo checks dirty state before replacement. Cancel changes nothing; confirm loads the fixture as unsaved, clears stale transient/history context, and preserves the explicit saved slot for Reopen.

## Application-edge seams

### Implemented editor adapter

`src/automation/editorAdapter.ts` implements the first version of `ProjectContextReader` plus the local editor-command side of `EditorToolRegistry`. It returns a bounded JSON-safe snapshot and dispatches ID-based operations through the existing Zustand coordinator, which in turn uses the same tested document commands as the human UI. It does not mutate React, Konva, storage, or core data directly.

The adapter now also owns a narrow asynchronous generated-image intake seam. An authorized host may provide a PNG/JPEG/WebP `Blob`, base64 data URL, or raw base64 payload plus non-secret provider/model/prompt/timestamp metadata. The adapter validates the same 20 MiB, 40-megapixel, header, media-type, and browser-decode rules as human imports, persists the unchanged Blob and provenance through `AssetRepository`, and returns its stable asset ID. A separate placement command creates one imported-image element on an explicit ordinary plane at requested logical bounds through one normal history checkpoint. Undo removes the instance while retaining the reusable source.

Vite development builds expose this adapter as `window.scrollSpliceEditor` for inspection, test automation, and precise local manipulation. That writable global is not included in production builds. The authenticated browser tool dispatcher imports the adapter directly, validates every network value, binds mutations to the inspected episode and revision, and returns a post-call snapshot. OAuth/provider credentials never enter this contract. Raw human file import/export remains host-mediated rather than crossing the serializable command boundary.

The browser-local project, recovery, asset, portable-file, renderer, conversation, and editor-tool adapters are implemented. The approved local companion implements only the model-authorization and run-coordination boundaries below:

- `ProjectRepository`/`ProjectLibraryRepository`: validate supported episode versions and own explicit current/multiple local saves without changing core commands.
- `RecoveryRepository`: owns debounced unsaved snapshots and Restore/Discard, never identity or cloud sync.
- `AssetRepository`: imports, identifies, persists, resolves, safely replaces, and reference-checks local PNG/JPEG/WebP sources and creator categories.
- Portable project codec/merge: transfers a validated episode plus unchanged asset blobs with collision-safe ID remapping.
- Local renderer: renders masters and profile slices without editor chrome, then preflights encoded local files. It does not upload.
- `ModelConnectionProvider`: the local companion owns the official App Server login and exposes only neutral connection/model state to the browser; it never returns reusable credentials.
- `ProjectContextReader`: the browser editor adapter produces bounded, serializable project and episode context with a current revision.
- `ImageGenerationGateway`: App Server image-generation results are held behind short-lived opaque references until the browser validates and imports them.
- `EditorToolRegistry`: exactly four model-visible tools inspect the editor, apply a validated reversible command, import the latest generated source, or place a generated source on explicit logical bounds.
- `AgentRunCoordinator`: the companion owns bounded threads/turns and cancellation; the browser owns project/session addressing and tool execution.
- `AgentConversationRepository`: persist local chat messages and tool summaries by stable project ID without placing conversation state in the episode document.

ScrollSplice still has no app account system. The optional OpenAI connection authorizes only the local Codex App Server; it does not identify a ScrollSplice workspace, authenticate to WEBTOON, or change the episode document or command layer. Provider tokens and raw identity details remain inside the app-specific Codex state directory or OS credential store; the browser receives only neutral connection state, allowed model IDs, and reasoning choices.

The agent UI is a fixed upper-right launcher plus an overlay panel above the canvas side of the workspace. The panel opens leftward below its header control, never resizes the canvas, and never covers the minimap or Layers inspector. Closing it preserves the current project conversation. The browser-local `AgentConversationRepository` stores validated version-1 user/final-assistant messages under the episode's stable ID and remains separate from episode data, history, saves, portable project files, assets, recovery, authorization, and Codex thread state. Without the companion the panel reports that the human editor still works. When disconnected it presents one explicit OpenAI-connect action; when connected it shows only the live allowed GPT-5.5/GPT-5.6 catalog, supported reasoning levels, streamed progress, and Stop. OAuth and run state remain transient application chrome.

The supported authorization path is the official Codex App Server's `account/login/start` ChatGPT flow, not a ScrollSplice-authored OAuth client. The companion starts disconnected and presents the returned authorization URL only after the creator asks to connect. Never ship a reusable OpenAI credential in browser JavaScript, persisted episode data, generated asset metadata, logs, screenshots, or git.

Do not scrape WEBTOON, automate login, store WEBTOON credentials, or simulate direct publishing. Publishing remains a manual website workflow unless an official supported integration is later discovered and explicitly approved.

## Local OpenAI creation boundary

Autonomous creation follows the creator-ready human workflow. The local companion is an optional late Build Week proof layered over the complete human editor; the editor core and static judge experience do not depend on it.

### Official App Server shape

The orchestration boundary is the official Codex App Server over JSONL stdio. The companion uses `account/*` for the creator-controlled ChatGPT connection, `model/list` for the signed-in account's live catalog, bounded `thread/start` and `turn/start` requests for chat, host-owned dynamic tools for editor actions, and the App Server's intentional image-generation item for candidates. Model names and protocol details remain application-edge configuration rather than episode-schema fields.

ScrollSplice's project-inspection and editor-action capabilities are application-owned function tools. OpenAI describes [function calling](https://developers.openai.com/api/docs/guides/function-calling) as the way a model connects to data and actions supplied by an application. These internal tools are not the same as OpenAI connectors.

[OpenAI connectors and remote MCP servers](https://developers.openai.com/api/docs/guides/tools-connectors-mcp) are optional future routes to external services such as creator-approved cloud storage. They are not required for a model to understand the current ScrollSplice document. Each external connector requires its own OAuth, scope, privacy, and approval review, and no WEBTOON connector or direct-publishing capability is assumed.

### Context exposed to the model

`ProjectContextReader` prepares only what an approved run needs:

- project and episode IDs plus safe descriptive metadata
- the serialized composition groups, ordered layer planes, episode elements, logical dimensions, opacity, stacking order, masks when supported, and asset references
- current viewport and selection
- asset names, dimensions, types, provenance, and approved thumbnails or references
- a deliberately rendered low-resolution preview of a requested canvas region or the full scroll when visual inspection is needed
- export-profile constraints when an export-readiness skill is active

The model does not inspect React components, Konva nodes, Zustand internals, raw filesystem handles, browser storage, or credentials. Coordinates are logical episode coordinates produced by the tested core module.

### Initial editor tool contracts

Read tools may include:

- `getProjectSummary()`
- `getEpisodeSnapshot()`
- `getViewportAndSelection()`
- `listAssets()`
- `inspectCanvasRegion(bounds)`
- `validateEpisode(profileId?)`

Write tools may later include:

- `addGeneratedAsset(candidateId, metadata)`
- `placeElement(assetId, logicalBounds)`
- `moveElement(elementId, logicalPosition)`
- `resizeElement(elementId, logicalBounds)`
- `reorderLayerPlane(layerPlaneId, index)`
- `reorderElement(elementId, index)`
- `removeElement(elementId)`

Every write tool validates its input and dispatches an ordinary document command. The tool registry may expose only commands implemented and tested by the human editor. It must never give the model a raw store setter or a direct canvas mutation escape hatch.

### Skills and autonomous run flow

Future versioned skills or instruction packs can guide story breakdown, visual continuity, panel composition, scroll pacing, asset naming, and export preflight. They are orchestration configuration; they do not own project data or bypass commands.

One autonomous run follows this path:

1. The creator selects a project, supplies a brief, and approves the exact references and project context that may be sent to OpenAI.
2. The coordinator establishes a cost ceiling, cancellation path, and allowed tool set.
3. The model reads normalized context and requests image generation or editing as needed.
4. Each result enters a generated-asset staging area with provider/model, prompt, timestamp, source references, and moderation/error status.
5. Approved autonomous tools add and place assets through the normal repository and command layers.
6. The model can inspect the resulting scroll and repeat within the run limits.
7. The creator reviews the same editable canvas, minimap, layers, and preview used for manual work and may continue manually at any time.

The intended end state may assemble a complete first-pass episode autonomously, but it remains observable, cancellable, and editable. Automatic WEBTOON upload or publication is never part of this run.

### Build Week stretch boundary

The generated-image intake, exact-bounds placement, official App Server authorization path, bounded chat/run UI, creator-visible progress/cancellation, and returned-byte handoff are implemented. The disconnected companion and synthetic protocol paths are validated without exposing credentials or account identity. The remaining complete network proof is Katherine's first official login, one live streamed response, and one native synthetic generate/import/place/undo run. It must not require private art, broad filesystem access, an external connector, full agent autonomy, or judge credentials. The static human editor remains the valid judge path even if that optional live proof fails.

## Implemented provisional export boundary

Upload-verified production export remains gated, but the implemented provisional local renderer follows this first-principles contract:

1. Render a tall master from the episode document.
2. Load a versioned, data-driven `ExportProfile` describing platform limits.
3. Start from profile-derived maximum-height candidates, prefer earlier gutters where possible, and present the proposed cuts for creator review. Creator adjustments are accepted only while every span remains within the profile.
4. Produce zero-padded ordered image files deterministically from the approved plan.
5. Preflight format, dimensions, per-file bytes, total bytes, image count, and sequence after encoding or any adjustment.
6. Report violations without overwriting source assets.

WEBTOON limits can change. The exporter must not scatter fixed limits through the editor. Before the manual discovery process in `WEBTOON_REQUIREMENTS.md` is complete, files created from the current `form-observed` profile must be labeled provisional and must not claim WEBTOON compatibility. Matching a later verified profile reduces avoidable platform transformations but cannot guarantee that WEBTOON will never recompress, resize, reformat, or otherwise optimize an upload.

Planning guides and deterministic file export remain separate concerns even though both are implemented. Both use the visibly `form-observed` profile, but only the exporter writes clearly provisional local files. Upload-verified compatibility still waits for the harmless unpublished upload verification. Neither path adds slice records or platform state to the episode document.

## Public access and provenance

Katherine identified the seven original documents as July 12 planning work. They were first committed unchanged on July 13 at 11:28:56 AM PT in `e4db897` and tagged `pre-build-week-planning`. The owner-attested baseline contains no code; its Git timestamp records the preservation time. All judged implementation must appear in later dated commits. Do not rewrite that boundary.

The production build must be a static artifact suitable for GitHub Pages. Deployment configuration is an application-edge concern and must not leak repository paths, hosting assumptions, or network state into the editor core.

The public demo uses only original synthetic content or explicitly approved assets. Root & Table production artwork remains local and ignored.

## Validation

The July 21 final release passes 417 Vitest cases across 34 files, 11 Node local-companion protocol/security checks, strict TypeScript, ESLint, the production build, and all 24 Playwright Chromium stories. Its added coverage verifies all ten stable editable type IDs, shared geometry, empty new bodies, direct normalized contour changes, preservation and export parity of preset-specific treatments after contour editing, persistence, hidden compatibility resolution for retired fixed balloons, blank startup, explicit demo loading, and the complete editor/export lifecycle. The production build retains Vite's non-blocking over-500 kB advisory.

Historical feature commit `a26927f` passed 377 Vitest cases across 28 files, strict TypeScript, ESLint, the production build, and all 13 Playwright Chromium stories. Its production build contained 137 modules; CSS was 40.26 kB and JavaScript was 769.96 kB minified / 222.48 kB gzip. That checkpoint added focused coverage for v3/v4/v5-to-v6 defaults, transforms and visual bounds, image crop/masks/frame parity, flat groups and populated-plane commands, fitted speech-balloon geometry and round trips, reference-safe source deletion, multiple/recovery/portable project behavior, provisional render/preflight behavior, and ExportDialog focus restoration/Tab containment.

- Vitest: coordinate conversion, viewport clamping, off-screen centering, `moveElement`, center-snap thresholds at zoom, proportional ordinary-element resize, independent Background-region resize, transient bounds preview/reset, serializable model invariants, pinned Background plane 1, ordering/visibility, title/plane/element deletion, episode-height safety, profile candidates, zoom, minimap geometry, drop-coordinate conversion, v3/v4-to-v5 normalization, opacity bounds/history coalescing, fill and presentation validation, and blend-mode command coverage.
- Vitest for the published appearance slice: format-v5 save validation, supported v3/v4 opening, invalid image-reference rejection, atomic concurrent-tab asset-library updates, category/import merge behavior, extreme-ratio placement refusal, blank-document invariants, bounded history, lifecycle clearing, dirty/saved revision behavior, and canvas/minimap appearance agreement.
- Playwright: the complete editor story covers title, minimap, plane/element controls, synthetic placement, base color, episode height, Background-region transforms, snapping, live bounds, zoom, proportional resize, reset, File/Edit/View menus, and save/reload/reopen/New Episode. Focused Asset Library and appearance stories cover built-in and imported drag placement, click fallback, creator-category creation, reusable transparent PNG import, source-alpha compositing, opacity gesture history, gradients/fades, tile presentation, blend modes, and appearance persistence.
- The creator-completion story covers stable plane rename/reorder through both drag and Move Left/Right, pinned-base rejection, local stacking and cross-group Move to Plane, independent text creation/property history and persistence, Reader Preview state restoration, and Reset Demo cancel/confirm plus saved-slot recovery.
- Static checks: ESLint, strict TypeScript, and the Vite production build.
- Visual inspection: workspace hierarchy, canvas/minimap agreement, selection clarity, long-episode navigation, and chrome-free Reader Preview. Public deployment is inspected separately when it exists.

Corrective checkpoint D validation covers stable title anchors, default-on magnet state and bypass, profile-derived candidates, four proportional ordinary-element handles, eight independent Background-region handles, free two-axis Background movement, transient status/minimap bounds during move and resize, one final command commit, and reset. The original fixed-width validation remains historical and is superseded by this passing extension. Katherine accepted the superseding checkpoint with notes; minimap aspect distortion remains polish. The local history/save/menu slice adds 154 passing unit tests, static/build validation, and a second isolated Chromium story for save/reload/reopen/New Episode. The five-slice direct-placement and appearance goal passes 255 unit tests across 13 files, strict typecheck, ESLint, production build, focused drag/appearance Chromium coverage, the full 6-of-6 Chromium suite, and public-safe visual inspection. It was published in `7768daa0617b66c696f769d97dd531f9029272c8`. The creator-completion pass extends that baseline with 270 passing unit tests across 13 files, strict typecheck, ESLint, production build, all 7 Playwright Chromium stories, and local visual inspection of both editor and Reader Preview. It was published in `cb1f28443f7b1045d139879a2bba7b03edf25856`, with local and remote `main` verified equal after the push. The production build emits a non-blocking Vite advisory for its 637.55 kB minified JavaScript chunk. The separate export checkpoint adds deterministic boundary planning and encoded preflight.

The post-review build passes 94 unit tests, strict typecheck, ESLint, the production build, and one isolated Playwright Chromium walkthrough including element movement at 200% zoom. Its running UI was visually inspected at 1440 × 900, 1280 × 720, and 1024 × 768. That passing checkpoint and its documentation were published to `main` through `8a493a2` on July 14.

The historical fixed-width corrective checkpoint passed 120 unit tests. Its superseding free-transform build passed 123 unit tests before the newer history/save/menu work. The historical Asset Library checkpoint passed 214 unit tests across 11 files, strict typecheck, ESLint, production build, four Chromium stories, and visual inspection at 1440 × 900, 1280 × 720, and 1024 × 768. The published appearance baseline supersedes that current-count claim with 255 unit tests across 13 files and the complete 6-of-6 Playwright suite. The earlier public-safe records remain labeled as historical evidence, and the Asset Library screenshot is indexed separately. Katherine's human retest passed checkpoint D with notes and her July 15 review passed the history/save/menu slice. The combined Asset Library stack was published to `main` in `fdd4ead37e7071bc7c69c9c4d8b49c557ddd95d7`, and local/remote equality was verified after the push.

## Non-negotiable invariants

- Comic content has one authoritative episode document.
- Selection and viewport each have one application-state owner.
- Document history and dirty/saved state each have one application-state owner; neither enters the episode document.
- Core model, coordinates, and commands import no React, Konva, Zustand, persistence, export, platform, or authentication code.
- Canvas, minimap, Layers, Reader Preview, and the local renderer agree on geometry and ordering.
- Fixed composition-group rank, ordered layer planes, and local element stacking produce one deterministic stack; active-group or active-plane filtering never changes rendered visibility.
- Group, plane, and element visibility remain separate state, and hidden elements remain addressable from Layers.
- The live canvas is viewport-sized, not episode-sized.
- Source assets are never mutated by placed-element edits.
- Platform rules, account identity, provider tokens, and upload state never enter the episode document or editor commands.
- Local episode saving validates format v6, explicitly normalizes supported v3/v4/v5 saves, and persists only stable asset IDs rather than transient editor state or imported bytes. Imported source `Blob`s remain in IndexedDB except when deliberately copied into a portable project file.
- The complete human editor works when model services, OAuth, skills, and connectors are absent.
- Model context is explicit, bounded, serializable, and approved before private material leaves the app.
- Model write tools call the same tested commands available to humans and cannot mutate UI framework state directly.
- Generated assets retain provenance and remain ordinary editable assets after creation.
- A model run has visible progress and cancellation and never publishes to WEBTOON. The current one-turn ChatGPT proof exposes no reliable spend telemetry and makes no spend-limit guarantee; any future multi-step or metered autonomy must add an explicit creator-approved time/budget policy before it is considered safe.


## Application appearance preferences

Light/dark appearance and Details Bar visibility are browser-local application-shell preferences. They are initialized and coordinated at the React application edge, use stable local-storage keys, and are passed down only where a canvas renderer needs a concrete accent color. CSS custom properties style normal React/CSS chrome, while the Konva selection transformer receives the resolved accent as a presentation prop. Neither preference belongs in Zustand document state, the episode schema, command history, crash recovery, portable projects, export profiles, or authentication/persistence adapters.

The compact header status separates visible chrome from the existing detailed document status: creators see Saved or Unsaved with explanatory hover text, and the complete message remains an assistive live region and test seam. The optional Details Bar retains coordinates and selected-element controls but omits the selected element's name, preventing long names from consuming horizontal control space.
