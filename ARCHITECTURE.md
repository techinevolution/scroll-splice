# ScrollSplice Architecture

## First principles

ScrollSplice edits one logical vertical episode. The episode document is durable product data; canvas, minimap, layers, future preview, and future export are replaceable views of it.

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
- A small application-edge `ProjectRepository` validates and stores one explicit format-v4 episode save in browser local storage, with one supported v3-to-v4 load upgrade; no durable data enters React or Konva objects.
- A separate application-edge `AssetRepository` stores creator categories and unchanged imported image `Blob`s in IndexedDB. Episode saves contain stable asset IDs only.
- A lightweight React/CSS/SVG minimap derives from the episode document; it is not a second Konva editor.
- Strict TypeScript defines the core contracts.
- Vite 8 serves the local app and produces a static deployment build.
- GitHub Pages is the preferred judge-access adapter; an unrestricted downloadable build is the fallback.
- Vitest verifies pure model, command, and coordinate behavior; Playwright verifies one complete editor story.

The required Build Week runtime has no backend, database, login, secrets, external asset upload, runtime OpenAI API dependency, or WEBTOON integration. Codex with GPT-5.6 is used to create and validate the project. The human editor must remain functional with all future OpenAI features absent or disconnected.

A single generate-and-place proof is permitted only as late stretch work under the explicit gate in `PLAN.md`. That gate does not change the locked stack by itself: any backend, OAuth flow, OpenAI SDK, secret storage, or other new runtime dependency still needs a separate recorded decision before implementation.

## Minimal module boundaries

Create a folder only when its active behavior exists. The intended ownership is:

- `src/core/episode.ts`: plain episode and element types.
- `src/core/createBlankEpisode.ts`: pure construction of the minimal 800 × 1,280 format-v4 episode used by **New Episode**.
- `src/core/coordinates.ts`: episode, viewport, screen, and minimap conversion plus clamping.
- `src/core/commands.ts`: pure document edits used by the Build Week MVP.
- `src/app/store.ts`: Zustand application coordination, bounded history, document status, and command dispatch.
- `src/app/fixtures/`: original public-safe Build Week sample data.
- `src/editor/`: Konva viewport rendering and element interaction.
- `src/minimap/`: simplified full-episode representation and navigation requests.
- `src/layers/`: ordered layer presentation and selection requests.
- `src/components/`: shell and small ordinary React controls.
- `src/assets/`: original built-in catalog, import validation, local asset snapshots, runtime source resolution, and the IndexedDB adapter.
- `src/persistence/projectRepository.ts`: one versioned local-browser episode-save adapter plus defensive format-v4 validation and the explicit v3 upgrade.
- `src/export/profiles.ts`: provisional versioned output-profile data and pure candidate-boundary math only; it does not render or write export files.

Do not create empty `services`, `adapters`, or `auth` trees merely to represent future ideas. Their boundaries are documented below and become files only when an approved slice needs them. The implemented `src/persistence/` tree exists only for the approved single-slot browser adapter; it is not a project library, file-system layer, cloud service, or account sync system. The small implemented `src/export/` seam exists only because the candidate-guide slice needs one versioned `ExportProfile`; it is not an exporter.

## Current Build Week document model

The implemented format-v4 document uses one shallow, explicit organization path: fixed composition group -> ordered layer plane -> flat element references by `layerPlaneId`. An element's group is derived from its plane rather than duplicated on the element. Version 4 adds a real `ImageElement` whose source is a stable built-in or imported asset ID; source bytes and browser object URLs never enter the episode document.

The sample document contains:

- a stable episode ID and format version
- an editable episode name
- a fixed logical width of `800` units and flexible logical height
- ordered `LayerPlane` records with stable IDs, group ownership, visibility, and base or ordinary kind
- an ordered flat collection of elements
- for each element: stable ID, readable name, plane reference, asset reference, logical `x`, `y`, `width`, `height`, visibility, and stacking order
- for image elements: a built-in or imported asset reference, with intrinsic/source data resolved at the application edge

The original fixture should contain six visually distinct beats rendered from code-defined shapes and text so that scrolling, minimap navigation, selection, and movement are easy to judge without separate artwork licensing. It may suggest a vertical comic but must not copy or expose private Root & Table work.

The `800`-unit width is a convenient logical coordinate choice that also maps directly to the 800 px maximum displayed by WEBTOON's authenticated Manage Episode form on July 13, 2026. It remains an editor coordinate choice, not a permanent platform rule. Platform requirements never belong in this core schema.

Selection, hover, active drag, two-dimensional viewport position, zoom, panel-collapse state, and reset state are editor state, not episode content. The implemented view uses the fitted episode width as 100%, then applies a transient 50–200% factor without changing document geometry.

Do not put React objects, Konva nodes, browser handles, user IDs, OAuth fields, provider tokens, WEBTOON metadata, or platform upload state in the episode document.

## Implemented layer-plane foundation

The approved organization model remains shallow and predictable rather than becoming an arbitrary nested tree:

- `CompositionGroup` has exactly three values: `background`, `content`, and `foreground`.
- Each group owns an ordered, open-ended list of numbered `LayerPlane` records with stable IDs, optional names, visibility, and ordinary or base kind.
- Exactly one plane is special: Background plane 1 is the pinned lowest plane, carries the editable full-scroll base RGB color, and automatically follows episode height. It may be recolored or hidden but cannot be reordered or deleted.
- Every other plane is an unrestricted creative surface. Examples such as “Fade,” “Characters,” or “Film” are optional names, never enforced content types.
- Every element references one `layerPlaneId`; its group is derived from that plane rather than duplicated as a second source of truth.
- Proposed checkpoint E would add element opacity and optional Background fades, but it has not started and is not automatic next work. The Asset Library slice made the first concrete schema transition: saved v3 shape/text documents are explicitly upgraded to v4 on load, while malformed v3 images and unknown versions fail safely. Do not add a broad migration framework before another concrete supported transition exists.
- Ordinary color regions are elements with normal logical `x`, `y`, `width`, and `height` bounds plus color. Creation starts them at `x = 0` and 800 units wide for convenience, but that is not an invariant: subsequent moves and eight-handle transforms freely edit both axes and dimensions. A later approved schema revision may add an optional color-region-only `verticalAlphaFade` with normalized `top` and `bottom` values; absence would mean no fade. General gradients remain later work.
- Effective visibility is `group visible AND plane visible AND element visible`. A hidden element is absent from the canvas and hit testing but may remain selected from the Layers panel.
- Render order is fixed group order, then plane order, then local element stacking. Within a group, plane 1 is lowest and each increasing plane number renders above the lower numbers. The right list presents elements by logical `y` from top to bottom and uses local stacking only to resolve equal or overlapping positions.
- `activeCompositionGroup` and `activeLayerPlaneId` are transient editor state. Canvas selection activates both so the matching row remains discoverable.

Commit `c5f83c5` bumped the unsaved fixture directly to format v3 without speculative migration machinery. The colored beat rectangles now live in a Content plane as comic panels, and pinned Background plane 1 owns the starting backdrop color used by both renderers; no hardcoded episode fill remains in the canvas or minimap.

### Layer-plane tab behavior

- The right panel shows compact numbered tabs below `Layers · Background`, `Layers · Content`, or `Layers · Foreground`.
- When Background plane 1 is active, the inspector and canvas each show a compact color control backed by the same `setBaseColor` command. Both are editor chrome. If the base plane is hidden, canvas and minimap show an editor-only checkerboard that is not episode content or export output.
- The implemented foundation provides stable identity, selection, creation, visibility, overflow arrows, and automatic active-tab reveal before any later plane-reordering slice.
- A later layer-management slice gives ordinary tabs a dedicated drag handle and dispatches a pure reorder command inside the active group. Background plane 1 remains pinned.
- Move Left/Right commands provide a keyboard and non-drag alternative in that same management slice. Small left and right overflow arrows scroll the tab strip without changing plane order, and the active tab scrolls into view from the foundation onward.
- A `+` creates another ordinary plane in the active group. Plane numbers reflect current order; stable IDs preserve identity when numbers change.
- An ordinary plane may be deleted only when it contains no elements. Hidden elements still count as contents, Background plane 1 is never deletable, and every group retains at least one plane. After deletion, application coordination activates the nearest remaining plane.
- Group, plane, and element eye states remain independent and preserve child settings.

An empty plane's centered action area pairs the implemented **Delete plane** control with a paperclip **Add asset** action. The same add action remains available when an ordinary plane is populated. It opens the overlay Asset Library and targets the currently active ordinary plane.

The fixed left rail is an application-shell concern with five destinations: **Uploads**, **Speech Balloons**, **Decorations**, **Splatters**, and **My Library**. Creator-named categories live inside My Library so an unbounded list cannot overwhelm the rail. Category selection and drawer state remain transient; creator categories and imported source images persist through `AssetRepository`. The starter catalog contains nine original transparent SVG assets—three in each built-in category. These are simple visual assets: placed instances support the existing select, move, resize, visibility, delete, and history behavior, but this slice adds no recolor, text-in-balloon, tail editing, crop, rotate, flip, or opacity controls.

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
- `resetEpisode()` restores the known fixture document through application coordination.

Navigation and selection do not change the document. They update application state.

Reordering, plane rename, moving elements between planes, drag-to-place, asset-source deletion, and editable balloon properties belong to later separately approved slices. Element opacity and a basic vertical Background alpha fade remain an unstarted post-review proposal. Do not add arbitrary nesting, folders, speculative migrations, blend-mode infrastructure, additional save slots, autosave, file-system access, or cloud storage without another approved slice.

If Katherine later approves checkpoint E, it would add pure `setElementOpacity(document, elementId, opacity)` and `setBackgroundRegionFade(document, elementId, fade)` commands. They would clamp normalized alpha to 0–1; the fade command would reject non-color-region elements and accept `undefined` to restore a uniform region. The current document is already format v4 with an explicit supported v3 upgrade, so any opacity/fade schema choice must start from v4 and remain an explicit bounded compatibility decision.

### Implemented episode-structure command extension

The Episode Setup and Expandable Scroll checkpoint uses fields that already existed in format v3, so it required no format bump or migration framework:

- `setEpisodeName(document, name)` trims the proposed name, rejects an empty result, and enforces the 60-character editor limit. The header's inline editor commits on Enter or blur, cancels on Escape, and prevents more than 60 input characters.
- `extendEpisodeHeight(document, amount)` increases `logicalHeight` by a positive logical-unit amount and never shrinks or moves existing content. The UI uses exported `DEFAULT_EPISODE_HEIGHT_INCREMENT = 1280` rather than scattering that value through components.
- `deleteEmptyLayerPlane(document, planeId)` accepts only an ordinary plane with no elements, rejects deletion of the final plane in a group, and always protects the pinned base. Hidden elements count as contents; after deletion, application coordination selects the nearest remaining plane.

Background plane 1 has no independent rectangle height. Its full-scroll coverage derives from `episode.logicalHeight`, so extending or trimming the episode automatically updates the base without duplicating data. The bottom-of-story **Add scroll space** control dispatches the centralized 1280-unit extension. The separate fine-tune button was replaced by a full-width hit area on the bottom canvas edge: its `ns-resize` cursor translates pointer drag into logical units and retains 10-unit arrow-key or 100-unit Shift+arrow adjustments for keyboard users. Both controls are editor chrome, not episode elements, minimap items, or export items. The minimap refits the complete logical episode whenever height changes, independently of main-editor zoom.

Zustand exposes the pure commands through `setEpisodeName`, `extendEpisodeHeight`, and `deleteLayerPlane` application actions. Deletion chooses the previous plane when available and otherwise the next, then clears element selection. Title and height changes preserve unrelated document arrays and transient viewport state. Reset restores the fixture title, original logical height, fixture planes, selection, and viewport.

### Implemented post-review command extensions

These extensions are implemented and validated locally in checkpoints A and B:

- `deleteElement(document, elementId)` removes one placed episode instance and nothing from a future source-asset repository. The trash control sits beside that element's eye in Layers.
- `createSyntheticShapeElement(document, input)` creates one code-defined demo rectangle only in an ordinary plane; application coordination detects and selects the appended stable element ID.
- `resizeEpisodeHeight(document, requestedHeight)` supports precise growth and shrink requests. It clamps to `MIN_EPISODE_LOGICAL_HEIGHT = 1280` and to the greatest logical bottom bound of all elements, including hidden elements and Background color regions, so it never clips or moves content. The existing `extendEpisodeHeight` remains the coarse 1280-unit shortcut.
- At historical checkpoint B, `createBackgroundColorRegion(document, input)` created a full-width solid element in an ordinary Background plane from a chosen start, length, and color and preserved `x = 0` during movement. The later free-transform correction supersedes that movement restriction while retaining full width as the creation default.

The bottom-edge resize hit area converts pointer movement through the shared coordinate module and requests logical height through `resizeEpisodeHeight`. Background plane 1 derives from the resulting document height and is excluded from the content-floor calculation because it has no independent bounds. Canvas viewport clamping and minimap fitting respond to the same committed height. Ordinary imported images can now be placed on Background planes; general gradients, background-specific fit/tile/crop controls, and blend modes remain deferred.

The title's existing validation does not change in checkpoint A. Ordinary title text remains the click target, and the input is created after activation with no permanent pencil control. The corrective checkpoint gives the fixed **EPISODE** label its own stable column and gives title text and input one clamped footprint, so activation replaces only the title and cannot shift the label or neighboring reset control.

### Implemented corrective editing extensions

The July 14 corrective checkpoint adds behavior without changing the format-v3 document shape:

- A Background color region starts full width, then behaves as freely editable bounded geometry. Its live drag node follows both axes; the same 8 CSS-pixel center rule applies when the magnet is enabled, while Magnet Off or Alt/Option bypasses snapping.
- `resizeElement(document, elementId, requestedBounds)` is a pure command over existing bounds. It rejects unknown, locked, or non-finite requests, clamps inside the episode, and enforces `MIN_ELEMENT_SIZE = 24`. Ordinary shapes/text preserve ratio and Text scales `fontSize` proportionally with a minimum of 8; Background regions accept independent width/height bounds. No schema bump is needed.
- Selected unlocked ordinary shapes/text attach four proportional corner anchors. Background regions attach eight anchors—four corners and four sides—with ratio locking disabled. Rotation, flipping, crop, perspective, and freeform distortion remain disabled.
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
- the current Asset Library drawer state
- local asset-library status, creator categories, and runtime imported-image source URLs
- default-on transient magnet and candidate-guide visibility
- up to 100 document-history checkpoints, redo state, and the current saved revision
- dirty/saved status and command dispatch
- reset and document lifecycle actions

Canvas, minimap, and layers subscribe to this shared state. They must not keep competing copies of comic content, selection, or viewport position.

## Local history, episode persistence, and the Asset Library

The approved July 14 creator-workflow slice added a deliberately small local episode boundary. The July 15 Asset Library slice adds one explicit compatible format transition and a separate source-media boundary:

- `ProjectRepository` owns one browser key, `scrollsplice.project.last.v1`. Its versioned envelope contains a save timestamp and one validated format-v4 `EpisodeDocument`. A valid v3 shape/text save upgrades to v4 on read; invalid or unknown data is rejected.
- `AssetRepository` owns the versioned IndexedDB database `scrollsplice-asset-library-v1`. It stores one validated asset-library snapshot containing creator categories, source metadata, and unchanged PNG/JPEG/WebP `Blob`s. Category creation and imports use one atomic IndexedDB read-transform-write transaction, so concurrent tabs merge against the latest saved snapshot instead of overwriting one another. The successful update returns that merged snapshot, and the initiating tab refreshes its categories and runtime sources from it.
- **Save** is explicit. It writes the current episode only; selection, viewport, zoom, open panels, live pointer bounds, history stacks, and provider/account data are never persisted.
- Import and creator-category creation persist immediately to the local Asset Library and do not create episode-history entries. Placing an asset creates a normal image element and one episode-history entry; it becomes durable only after **File > Save**.
- New Episode, Reopen, Reset, Undo, and Redo do not delete imported sources or creator categories. Clearing browser site data, changing profiles/origins, or losing one storage boundary can still leave a saved episode with a missing source; renderers show an honest selectable placeholder.
- On app startup, a valid last save opens automatically. Missing or unavailable storage falls back to the public-safe demo. Corrupt or unsupported records are reported and left untouched rather than being silently deleted or coerced.
- **Reopen** reads the last explicit save and resets selection, viewport, zoom, transient controls, and undo/redo. If the current document is dirty, the application asks before discarding it.
- **New Episode** creates an unsaved **Untitled Episode** with a stable ID, 800-unit width, 1,280-unit height, a pinned white Background base, one ordinary Background plane, one Content plane, one Foreground plane, and no elements. It does not delete the existing saved slot, so **Reopen** can still recover that last save.
- The in-app menu surface is intentionally limited to **File > New Episode / Save / Reopen** and **Edit > Undo / Redo**. It is browser UI, not a native macOS or Windows menu.
- Shortcuts are `Mod+S`, `Mod+Z`, `Mod+Shift+Z`, and `Ctrl+Y`. Undo/redo shortcuts do not replace native text-field history while an editable field has focus.

The Zustand coordinator keeps a maximum of 100 history checkpoints. Every successful episode-document mutation goes through one commit helper, clears redo after a new branch, and records the prior document plus enough selection/group/plane context to restore a coherent editor. This includes element and layer-plane creation/deletion, movement, resize, title, coarse extension, precise height, element/plane/group visibility, and base color. A bottom-edge pointer gesture may publish many live height previews, but its start and final height form one undo step. Navigation, zoom, selection-only changes, drawer state, magnet state, guide visibility, and live bounds are transient and not undoable document edits.

Undo and redo restore the episode document, clear stale live previews, clamp the viewport, preserve a still-valid selection, and otherwise choose a valid group/plane context. Save marks the current revision clean without deleting history. Reaching that saved revision again through undo/redo clears the dirty indicator; leaving it marks the document unsaved. Reopen and New Episode are lifecycle boundaries that clear both history stacks.

This is not autosave, crash recovery, a portable file picker/project package, a multi-project library, native desktop storage, cloud/account sync, source deletion, or a general migration framework. Those require separate product and storage decisions.

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

The current movement command clamps every element inside the 800-unit episode width. A later panel/frame slice must replace that blanket rule with explicit overflow behavior: irregular panels, effects, and breakout art may extend into an editor bleed area while final rendering clips to the episode output boundary. Optional snapping is a proximity aid and must never silently resize, crop, straighten, or force those elements back inside.

### Implemented adjustable zoom and two-dimensional viewport

Checkpoint C adds transient `zoomFactor`, `viewportX`, and `viewportY` state without changing the episode format. Visible controls expose **Fit Width** plus a 50–200% zoom range, and scroll progress is calculated over the navigable range so the episode end reads 100%. Changing zoom preserves the current logical viewport center where possible, then clamps both axes so no portion of the episode becomes permanently unreachable.

At adjustable zoom, logical viewport width and height are derived from the stage dimensions and `zoomFactor`. All episode-to-stage conversions, centering, panning, and clamping stay in the shared coordinate module. The minimap always scales the complete episode to its own frame independently of editor zoom and draws an accurate two-dimensional viewport box from the same logical bounds; its interaction hit target may be larger than a very small visible box without falsifying that visible geometry.

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
2. Magnet On applies the 8 CSS-pixel center snap; Magnet Off or Alt/Option bypasses it.
3. The store publishes transient live bounds to the status bar and minimap without mutating the document.
4. On drag end, the application dispatches one `moveElement` command and clears the preview.
5. Canvas, minimap, and layers derive their lasting view from the returned document.

The corrective checkpoint implements transient `magnetEnabled` state that defaults to `true`. Its intentionally small first rule snaps any movable element's horizontal center—including a Background color region—to the episode centerline when the distance is at most 8 CSS pixels at the current zoom. The canvas shows a temporary vertical center guide while snapped. Turning the magnet off or holding Alt/Option during that drag bypasses snapping; edge and nearby-element targets remain deferred. Toggling the magnet never mutates document geometry by itself.

### Bounded corner resize

1. Selection attaches four proportional corner handles to an unlocked ordinary shape/text or eight independent handles to a Background color region.
2. Konva supplies transient visual scale while keeping rotation and flipping disabled.
3. Each transform event publishes logical preview bounds to status `x/y/w/h` and the minimap.
4. On transform end, the editor converts scale into requested logical bounds, resets node scale, dispatches one pure `resizeElement` command, and clears the preview.
5. Canvas and minimap rerender from the same committed format-v4 bounds.

This interaction includes independent side-handle stretching for Background color regions but still excludes rotation, flipping, crop, perspective, and a general transform property panel.

### Asset-library and placement flow

1. App startup hydrates creator categories and imported source `Blob`s from `AssetRepository`, creating runtime-only object URLs for rendering.
2. Upload validates PNG/JPEG/WebP signature, byte size, and optional creator-category identity; it parses declared dimensions from PNG IHDR, JPEG SOF, or WebP VP8/VP8L/VP8X headers and rejects an over-40-megapixel source before full decode. The browser decoder still verifies the source and must confirm the header dimensions before the unchanged source is saved.
3. Clicking a built-in or imported asset requests one proportional, viewport-centered `ImageElement` in the active ordinary plane. Placement fits the source while keeping both axes at least the shared 24-logical-unit minimum; an extreme aspect ratio that cannot satisfy that minimum inside the episode is refused with a clear message rather than distorted.
4. The pure image command returns a format-v4 episode; normal document history selects the new instance.
5. Canvas, minimap, and Layers resolve the same stable reference. If a source is absent, all surfaces remain usable and show missing-source state instead of crashing.
6. **File > Save** persists layout and stable IDs only. IndexedDB persists reusable source media separately.

### Composition-group, plane, and visibility flow

1. A Background, Content, or Foreground control updates the transient active group.
2. The numbered tab strip chooses one plane in that group while the canvas continues to render every effectively visible group and plane.
3. The right element list shows the active plane's contents from top to bottom on the scroll.
4. Selecting a canvas element updates the selected ID, active group, and active plane.
5. A group, plane, or element eye dispatches its corresponding pure visibility command.
6. Canvas, minimap, and Layers panel derive effective visibility from the same episode document.

Hidden elements do not render and cannot capture canvas selection. They remain selectable from the Layers panel; hiding a selected element keeps the selection and removes only its canvas outline until it is shown again.

## Application-edge seams

The local forms of `ProjectRepository` and `AssetRepository` are implemented. The remaining contracts are future boundaries, not Build Week infrastructure to scaffold:

- `ProjectRepository`: currently saves and loads one local format-v4 episode and explicitly upgrades supported v3 saves; a future adapter may support a real project library or account-backed data without changing core commands.
- `AssetRepository`: currently imports, identifies, persists, and resolves local PNG/JPEG/WebP sources and creator categories without destructive edits; a future adapter may add portable or account-backed storage.
- `ExportService`: render masters and platform slices without editor chrome.
- `AuthSessionProvider`: expose a neutral ScrollSplice user/workspace session at the application edge.
- `ModelConnectionProvider`: expose an authorized, revocable OpenAI model connection without leaking provider credentials into UI or core modules.
- `ProjectContextReader`: produce bounded, serializable project and episode context for future model tools.
- `ImageGenerationGateway`: generate or edit image candidates behind a provider adapter.
- `EditorToolRegistry`: expose approved read and command operations to a model through schemas.
- `AgentRunCoordinator`: manage one autonomous run, progress, cancellation, cost limits, tool approvals, and provenance.

ScrollSplice account authentication and OpenAI model authorization are separate concerns. A future app login identifies a ScrollSplice user/workspace. A future model connection authorizes OpenAI requests. Neither authenticates to WEBTOON, and neither changes the episode document or command layer. Provider tokens and raw identity details stay inside their application-edge adapters; the editor receives only neutral session and connection state.

The desired user-authorized OpenAI connection may resemble the Sign in with ChatGPT experience used by coding clients, but support for that exact flow in a general ScrollSplice web application is not assumed. Verify an official supported path before choosing OAuth dependencies. Never ship a reusable OpenAI credential in browser JavaScript, persisted episode data, generated asset metadata, logs, or git.

Do not scrape WEBTOON, automate login, store WEBTOON credentials, or simulate direct publishing. Publishing remains a manual website workflow unless an official supported integration is later discovered and explicitly approved.

## Future OpenAI creation boundary

Autonomous creation follows the creator-ready human workflow. It is designed now as a boundary so the editor core remains usable, but it is not infrastructure to scaffold during the human MVP.

### OpenAI API shape

The likely orchestration boundary is the [Responses API with image generation](https://developers.openai.com/api/docs/guides/image-generation), because OpenAI documents it for conversational and multi-step image flows. A simple isolated generation or edit may instead use the Image API behind the same gateway. Model names and API details remain adapter configuration rather than episode-schema fields.

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

The only permitted Build Week proof is one synthetic generate-and-place loop after the complete human MVP and submission path pass. It may expose a minimal read-only snapshot and use one existing placement command. It must not require private art, broad filesystem access, an external connector, full agent autonomy, or judge credentials. If secure model authorization cannot be completed without weakening the static app or schedule, defer the proof without affecting MVP completion.

## Future export boundary

Production export is deferred, but its first-principles contract is clear:

1. Render a tall master from the episode document.
2. Load a versioned, data-driven `ExportProfile` describing platform limits.
3. Start from profile-derived maximum-height candidates, prefer earlier gutters where possible, and present the proposed cuts for creator review. Creator adjustments are accepted only while every span remains within the profile.
4. Produce zero-padded ordered image files deterministically from the approved plan.
5. Preflight format, dimensions, per-file bytes, total bytes, image count, and sequence after encoding or any adjustment.
6. Report violations without overwriting source assets.

WEBTOON limits can change. The exporter must not scatter fixed limits through the editor or claim compatibility until the current profile has been verified through the manual discovery process in `WEBTOON_REQUIREMENTS.md`. Matching a verified profile reduces avoidable platform transformations but cannot guarantee that WEBTOON will never recompress, resize, reformat, or otherwise optimize an upload.

Planning guides and deterministic file export are separate bounded checkpoints. The guide checkpoint may use a visibly `form-observed` profile without writing files. Self-slicing waits for the harmless unpublished upload verification, then uses `ExportService` at the application edge; it never adds slice records or platform state to the episode document.

## Public access and provenance

Katherine identified the seven original documents as July 12 planning work. They were first committed unchanged on July 13 at 11:28:56 AM PT in `e4db897` and tagged `pre-build-week-planning`. The owner-attested baseline contains no code; its Git timestamp records the preservation time. All judged implementation must appear in later dated commits. Do not rewrite that boundary.

The production build must be a static artifact suitable for GitHub Pages. Deployment configuration is an application-edge concern and must not leak repository paths, hosting assumptions, or network state into the editor core.

The public demo uses only original synthetic content or explicitly approved assets. Root & Table production artwork remains local and ignored.

## Validation

- Vitest: coordinate conversion, viewport clamping, off-screen centering, `moveElement`, center-snap thresholds at zoom, proportional ordinary-element resize, independent Background-region resize, transient bounds preview/reset, serializable model invariants, pinned Background plane 1, ordering/visibility, title/plane/element deletion, episode-height safety, profile candidates, zoom, and minimap geometry. Opacity bounds remain later work.
- Vitest for the current local slice: format-v4 save validation, supported v3-to-v4 opening, invalid image-reference rejection, atomic concurrent-tab asset-library updates, category/import merge behavior, extreme-ratio placement refusal, blank-document invariants, bounded history, lifecycle clearing, and dirty/saved revision behavior.
- Playwright: the complete editor story covers title, minimap, plane/element controls, synthetic placement, base color, episode height, Background-region transforms, snapping, live bounds, zoom, proportional resize, reset, File/Edit menus, and save/reload/reopen/New Episode. The focused Asset Library story adds original built-in placement, creator-category creation, reusable transparent PNG import, pixel sampling that proves transparent source pixels reveal the underlying canvas, uploaded-image resize through undo/redo, and preservation of that resized geometry and source through Save, reload, and Reopen.
- Static checks: ESLint, strict TypeScript, and the Vite production build.
- Visual inspection: workspace hierarchy, canvas/minimap agreement, selection clarity, long-episode navigation, and public deployment.

Corrective checkpoint D validation covers stable title anchors, default-on magnet state and bypass, profile-derived candidates, four proportional ordinary-element handles, eight independent Background-region handles, free two-axis Background movement, transient status/minimap bounds during move and resize, one final command commit, and reset. The original fixed-width validation remains historical and is superseded by this passing extension. Katherine accepted the superseding checkpoint with notes; minimap aspect distortion remains polish. The local history/save/menu slice adds 154 passing unit tests, static/build validation, and a second isolated Chromium story for save/reload/reopen/New Episode. If later approved, checkpoint E adds opacity and fade coverage. The separate export checkpoint adds deterministic boundary planning and encoded preflight.

The post-review build passes 94 unit tests, strict typecheck, ESLint, the production build, and one isolated Playwright Chromium walkthrough including element movement at 200% zoom. Its running UI was visually inspected at 1440 × 900, 1280 × 720, and 1024 × 768. That passing checkpoint and its documentation were published to `main` through `8a493a2` on July 14.

The historical fixed-width corrective checkpoint passed 120 unit tests. Its superseding free-transform build passed 123 unit tests before the newer history/save/menu work. The current local Asset Library build passes 214 unit tests across 11 files, strict typecheck, ESLint, production build, four Chromium stories, and visual inspection at 1440 × 900, 1280 × 720, and 1024 × 768. The earlier public-safe records remain labeled as historical evidence, and the Asset Library screenshot is indexed separately. Katherine's human retest passed checkpoint D with notes and her July 15 review passed the history/save/menu slice; publication remains authorized but not yet claimed.

## Non-negotiable invariants

- Comic content has one authoritative episode document.
- Selection and viewport each have one application-state owner.
- Document history and dirty/saved state each have one application-state owner; neither enters the episode document.
- Core model, coordinates, and commands import no React, Konva, Zustand, persistence, export, platform, or authentication code.
- Canvas, minimap, layers, future preview, and future export agree on geometry and ordering.
- Fixed composition-group rank, ordered layer planes, and local element stacking produce one deterministic stack; active-group or active-plane filtering never changes rendered visibility.
- Group, plane, and element visibility remain separate state, and hidden elements remain addressable from Layers.
- The live canvas is viewport-sized, not episode-sized.
- Source assets are never mutated by placed-element edits.
- Platform rules, account identity, provider tokens, and upload state never enter the episode document or editor commands.
- Local episode saving validates format v4, explicitly upgrades supported v3 shape/text saves, and persists only stable asset IDs rather than transient editor state or imported bytes. Imported source `Blob`s remain in the separate IndexedDB Asset Library.
- The complete human editor works when model services, OAuth, skills, and connectors are absent.
- Model context is explicit, bounded, serializable, and approved before private material leaves the app.
- Model write tools call the same tested commands available to humans and cannot mutate UI framework state directly.
- Generated assets retain provenance and remain ordinary editable assets after creation.
- A model run has visible progress, cancellation, and cost limits; it never publishes to WEBTOON.
