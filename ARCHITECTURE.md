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
- `src/core/coordinates.ts`: episode, viewport, screen, and minimap conversion plus clamping.
- `src/core/commands.ts`: pure document edits used by the Build Week MVP.
- `src/app/store.ts`: Zustand application coordination and command dispatch.
- `src/app/fixtures/`: original public-safe Build Week sample data.
- `src/editor/`: Konva viewport rendering and element interaction.
- `src/minimap/`: simplified full-episode representation and navigation requests.
- `src/layers/`: ordered layer presentation and selection requests.
- `src/components/`: shell and small ordinary React controls.

Do not create empty `services`, `adapters`, `auth`, `persistence`, or `export` trees merely to represent future ideas. Their boundaries are documented below and become files only when an approved slice needs them.

## Build Week document model

Use a flat element list. Panel groups, nested layers, reusable project records, and schema migration machinery are deferred.

The provisional sample document contains:

- a stable episode ID and format version
- a fixed logical width of `800` units and flexible logical height
- an ordered flat collection of elements
- for each element: stable ID, readable name, asset reference, logical `x`, `y`, `width`, `height`, visibility, and stacking order

The original fixture should contain six visually distinct beats rendered from code-defined shapes and text so that scrolling, minimap navigation, selection, and movement are easy to judge without separate artwork licensing. It may suggest a vertical comic but must not copy or expose private Root & Table work.

The `800`-unit width is a convenient logical coordinate choice that also maps directly to the 800 px maximum displayed by WEBTOON's authenticated Manage Episode form on July 13, 2026. It remains an editor coordinate choice, not a permanent platform rule. Platform requirements never belong in this core schema.

Selection, hover, active drag, viewport position, panel-collapse state, and reset state are editor state, not episode content. Zoom is deferred; the Build Week MVP uses one predictable fit scale derived from the available viewport width.

Do not put React objects, Konva nodes, browser handles, user IDs, OAuth fields, provider tokens, WEBTOON metadata, or platform upload state in the episode document.

## Commands and state ownership

The Build Week command surface is intentionally small:

- `moveElement(elementId, logicalPosition)` returns an updated document.
- `resetEpisode()` restores the known fixture document through application coordination.

Navigation and selection do not change the document. They update application state.

Zustand owns:

- the current episode document
- the selected element ID
- the logical vertical viewport
- active transient pointer state
- command dispatch and reset

Canvas, minimap, and layers subscribe to this shared state. They must not keep competing copies of comic content, selection, or viewport position.

## Viewport and coordinate model

The episode can be much taller than the screen, but the live Konva stage remains viewport-sized.

1. Elements are stored in logical episode coordinates.
2. The viewport stores logical `y` and logical height; horizontal positioning is fixed for the Build Week MVP.
3. A fit scale maps the fixed logical episode width into the available editor width.
4. Coordinate helpers translate between logical episode, stage screen, and minimap coordinates.
5. The editor renders intersecting elements plus a small buffer.
6. Every requested viewport position is clamped to the logical episode bounds.

Wheel/trackpad movement updates viewport `y`. The minimap derives its viewport box from the same conversion helpers. Minimap click or box drag requests a new logical `y`; it never mutates comic content.

Selecting an off-screen element from the layers list centers that element in the viewport, clamped to episode bounds. This rule removes an otherwise unclear selection state for reviewers.

Coordinate conversion and clamping live in one tested core module. Do not duplicate formulas in canvas and minimap components.

## Interaction flows

### Selection

1. Canvas or layers emits an element ID.
2. The store updates the single selected ID.
3. If a layer selected an off-screen element, the store computes a centered, clamped viewport.
4. Canvas, minimap, and layers render from the resulting state.

### Navigation

1. Canvas wheel/trackpad input or minimap interaction requests a logical viewport position.
2. The coordinate module clamps it.
3. The store applies it.
4. Canvas and minimap rerender from the same viewport.

### Movement

1. Konva supplies transient drag feedback in screen space.
2. On drag end, the editor converts the destination to logical episode coordinates.
3. The application dispatches `moveElement`.
4. The pure command returns the next document.
5. Canvas, minimap, and layers derive their next view from that document.

## Future application-edge seams

These are contracts to preserve, not Build Week infrastructure to implement:

- `ProjectRepository`: save and load local or account-backed project data.
- `AssetRepository`: import, identify, and resolve source assets without destructive edits.
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
- the serialized episode elements, logical dimensions, stacking order, and asset references
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
- `setLayerOrder(elementId, index)`
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
3. Plan boundary-aware slices, preferring gutters where possible.
4. Produce zero-padded ordered image files.
5. Preflight format, dimensions, per-file bytes, total bytes, and image count.
6. Report violations without overwriting source assets.

WEBTOON limits can change. The exporter must not scatter fixed limits through the editor or claim compatibility until the current profile has been verified through the manual discovery process in `WEBTOON_REQUIREMENTS.md`.

## Public access and provenance

Katherine identified the seven original documents as July 12 planning work. They were first committed unchanged on July 13 at 11:28:56 AM PT in `e4db897` and tagged `pre-build-week-planning`. The owner-attested baseline contains no code; its Git timestamp records the preservation time. All judged implementation must appear in later dated commits. Do not rewrite that boundary.

The production build must be a static artifact suitable for GitHub Pages. Deployment configuration is an application-edge concern and must not leak repository paths, hosting assumptions, or network state into the editor core.

The public demo uses only original synthetic content or explicitly approved assets. Root & Table production artwork remains local and ignored.

## Validation

- Vitest: coordinate conversion, viewport clamping, off-screen centering, `moveElement`, reset behavior, and serializable model invariants.
- Playwright: load the sample, navigate through the minimap, select from canvas and layers, move one element, and reset.
- Static checks: ESLint, strict TypeScript, and the Vite production build.
- Visual inspection: workspace hierarchy, canvas/minimap agreement, selection clarity, long-episode navigation, and public deployment.

## Non-negotiable invariants

- Comic content has one authoritative episode document.
- Selection and viewport each have one application-state owner.
- Core model, coordinates, and commands import no React, Konva, Zustand, persistence, export, platform, or authentication code.
- Canvas, minimap, layers, future preview, and future export agree on geometry and ordering.
- The live canvas is viewport-sized, not episode-sized.
- Source assets are never mutated by placed-element edits.
- Platform rules, account identity, provider tokens, and upload state never enter the episode document or editor commands.
- The complete human editor works when model services, OAuth, skills, and connectors are absent.
- Model context is explicit, bounded, serializable, and approved before private material leaves the app.
- Model write tools call the same tested commands available to humans and cannot mutate UI framework state directly.
- Generated assets retain provenance and remain ordinary editable assets after creation.
- A model run has visible progress, cancellation, and cost limits; it never publishes to WEBTOON.
