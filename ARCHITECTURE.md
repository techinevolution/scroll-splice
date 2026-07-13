# ScrollForge Architecture

## First Principles

ScrollForge is an editor for one logical vertical episode. The episode document is the product's durable truth; the canvas, minimap, layers list, future preview, and future export are replaceable views of that truth.

The architecture follows four rules:

1. Comic content does not depend on a UI framework.
2. Every view derives from the same episode document and coordinate system.
3. Editing behavior enters through explicit document commands.
4. Storage, export, assets, and future authentication stay at the application edge.

This keeps the Build Week prototype small while allowing later persistence, desktop packaging, and OAuth work without rewriting the editor core.

## Locked Technical Shape

- React 19 and plain CSS own the application shell and panels.
- React-Konva/Konva renders the interactive canvas viewport.
- Zustand coordinates the active document, selection, viewport, and transient interaction state.
- Strict TypeScript defines the core model and boundaries.
- Vite 8 builds and serves the local browser app.
- Vitest verifies pure model and coordinate behavior; Playwright verifies one complete editor interaction.

Konva and Zustand are adapters around the core. Neither is the saved document format.

## Module Boundaries

Create modules only when the active slice needs them.

- `src/core/`: plain TypeScript episode types, coordinate math, invariants, and document commands. It imports no React, Konva, Zustand, persistence, or authentication code.
- `src/app/`: application composition, Zustand store, command dispatch, workspace layout, and service wiring.
- `src/editor/`: Konva viewport rendering, selection visuals, pan, zoom, and element interaction.
- `src/minimap/`: simplified full-episode representation and viewport navigation.
- `src/layers/`: layer presentation and selection synchronization.
- `src/assets/`: asset panel, local image intake, thumbnails, and placement requests.
- `src/adapters/`: future persistence, export, asset storage, and authentication implementations.
- `src/test/`: shared synthetic fixtures and cross-component tests when colocated tests are insufficient.

## Core Model

The episode document is plain serializable data with:

- a format version and stable episode ID
- fixed logical width and flexible logical height
- an ordered collection of elements or panel groups
- stable element and asset-reference IDs
- element position, size, visibility, stacking order, and asset reference

Selection, hover, active drag, viewport position, zoom, and panel-collapse state are editor state, not episode content.

Do not add user IDs, OAuth fields, provider tokens, framework objects, browser handles, or Konva node references to the episode document.

## Commands and State Ownership

Document-changing actions such as add, move, delete, reorder, and resize are pure commands over the episode document. This creates one mutation path and leaves room for later undo/redo.

Zustand owns application coordination:

- current episode document
- selected element ID
- viewport and zoom
- active interaction state
- command dispatch

Components subscribe only to the state they need. Canvas, minimap, and layers must never maintain competing copies of episode content or selection.

## Viewport Rendering

The episode can be much taller than the screen, but the live Konva stage remains viewport-sized.

1. Elements are stored in logical episode coordinates.
2. The viewport describes the visible logical rectangle.
3. Coordinate helpers translate between screen, viewport, episode, and minimap spaces.
4. The canvas renders visible elements plus a small buffer.
5. The minimap renders a simplified full-episode representation.

Do not create a Konva stage with the episode's full height. Canvas and minimap coordinate conversion must live in one tested core module.

## Interaction Data Flow

### Selection

1. Canvas or layers emits an element ID.
2. The application store updates the single selected ID.
3. Canvas and layers derive their selected appearance from that ID.

### Navigation

1. Canvas pan/scroll updates the shared viewport.
2. The minimap derives its viewport box from shared coordinate helpers.
3. Minimap click or drag requests a new logical viewport position.
4. The store clamps and applies that position without changing episode content.

### Document editing

1. A component interprets a pointer or control action.
2. It dispatches a document command with logical coordinates.
3. The command returns the updated episode document.
4. Every view rerenders from the updated document.

## Application-Edge Interfaces

Add these interfaces only when an approved slice needs an implementation:

- `ProjectRepository`: load and save project or episode data.
- `AssetRepository`: import and resolve source assets without destructive edits.
- `ExportService`: render or write final output without editor chrome.
- `AuthSessionProvider`: report the current session and initiate sign-in/sign-out.

The editor core receives data and commands; it does not know which storage system, export engine, account provider, or OAuth vendor supplies them.

## Future OAuth Boundary

OAuth is a future application-access concern, not an editing concern.

- `AuthSessionProvider` remains provider-neutral.
- Authentication is resolved before an account-backed repository is used.
- Provider tokens and raw identity payloads remain inside the auth adapter.
- The application may pass a neutral session/workspace context to a future repository.
- Episode documents and document commands remain identical for local and authenticated use.

Build Week adds no auth interface implementation, provider SDK, user schema, or cloud persistence. The boundary documents where future OAuth belongs without creating speculative infrastructure now.

## Persistence and Assets

Persistence is deferred beyond Build Week. When approved, it must preserve these rules:

- project data remains local by default unless Katherine approves account-backed storage
- imported source images are never destructively edited
- placed elements reference source assets and store transforms as metadata
- missing assets do not destroy the remaining episode document
- the stored format remains versioned and inspectable

Root & Table production art remains local and gitignored unless Katherine explicitly approves committing specific assets.

## Validation Shape

- Vitest: coordinate conversion, viewport clamping, commands, ordering, and serializable model behavior.
- Playwright: load the proof episode, navigate with the minimap, select from canvas, and select from layers.
- Static checks: ESLint, strict TypeScript, and production build.
- Visual inspection: workspace proportions, minimap accuracy, selection synchronization, and representative long-episode behavior.

## Important Invariants

- The episode document is the single source of truth for comic content.
- The selected element ID and viewport each have one application-state owner.
- Core model and commands stay framework- and provider-independent.
- Canvas, minimap, layers, future preview, and future export agree on geometry and ordering.
- The live canvas is viewport-sized, not episode-sized.
- Source assets are never mutated by placed-element edits.
- Authentication and provider tokens never enter the episode document or editor core.

## Known Constraints

- Very tall final exports may exceed browser or graphics-library limits and require tiled rendering in a later slice.
- Large images and long episodes may require thumbnails, reduced-detail minimap rendering, and viewport culling.
- Browser-native file access is not the Build Week persistence strategy.
