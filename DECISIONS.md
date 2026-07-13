# ScrollForge Decisions

## 2026-07-12: Name the product ScrollForge

Decision: The vertical comic builder is named ScrollForge. Root & Table is its first story project and proving ground.

Reason: The tool should have a concise identity independent of a particular comic.

Consequences: Product documentation and UI should say ScrollForge; Root & Table examples should be presented as project content.

## 2026-07-12: Design around scroll-native editing

Decision: The primary document is one long vertical episode, not a set of conventional comic pages.

Reason: Pacing, gaps, reveals, and navigation in a scrolling comic are core creative controls rather than export-time formatting.

Consequences: Canvas geometry, minimap navigation, preview, and export all use the same vertical episode model.

## 2026-07-12: Use one shared episode document

Decision: The canvas, minimap, layers panel, reader preview, and export are views of one authoritative episode document.

Reason: Separate representations would create selection, ordering, and geometry inconsistencies.

Consequences: All saved edits pass through document commands; transient UI state stays separate.

## 2026-07-12: Make drag and drop the common interaction language

Decision: Assets, placed elements, layers, panel groups, and minimap navigation use direct dragging where appropriate.

Reason: The editor should feel tactile and reduce dependence on forms and menus.

Consequences: Drag types and valid drop targets must be explicit, visually previewed, and tested so similar gestures do not conflict.

## 2026-07-12: Preserve source assets

Decision: Placed elements reference imported source assets; transforms and edits are stored on the instance.

Reason: Creators must be able to reuse art and recover from editing mistakes without destructive file changes.

Consequences: The asset library and episode document have separate identities and storage responsibilities.

## 2026-07-12: Keep the MVP local-first

Decision: The MVP has no required accounts, cloud services, AI services, or publishing integrations.

Reason: The core editor interaction can be proven more safely and simply with local projects.

Consequences: The runtime choice must support a credible local save/open path, but that persistence can follow the initial interaction proof.

## 2026-07-12: Defer the application framework decision (superseded)

Decision: Select the framework at the start of the first implementation slice rather than in planning.

Reason: The repo is empty and the defining requirements can be expressed without prematurely committing to a stack.

Consequences: Setup, run, test, and build commands remain unverified until Slice 1 begins.

Superseded by the locked Build Week stack decision below.

## 2026-07-12: Lock the Build Week stack

Decision: Build the first ScrollForge prototype as a local browser app using Node.js 22, pnpm 10, React 19, strict TypeScript, Vite 8, React-Konva/Konva, Zustand, and plain CSS. Use native pointer and drag events for Build Week. Use Vitest for unit tests, Playwright for one editor smoke test, ESLint for linting, and `tsc --noEmit` for type checking.

Reason: This stack provides the editor, canvas, shared-state, and testing primitives needed to prove ScrollForge's defining interaction within the available Build Week hours without introducing a backend or desktop wrapper.

Consequences: Do not add Next.js, Tauri, dnd-kit, a backend, database, cloud service, or OAuth dependency during Build Week. Resolve current stable package versions when scaffolding on July 13 and commit the generated `pnpm-lock.yaml`. Adding another dependency requires evidence that the current stack cannot safely satisfy the active slice.

## 2026-07-12: Render a viewport, not one giant canvas

Decision: The Konva stage represents the visible editor viewport into a larger logical episode. It must not be sized to the episode's full height.

Reason: A very tall live canvas would increase rendering cost and couple editor performance to episode length.

Consequences: The episode model stores logical coordinates. Canvas and minimap convert through one tested coordinate module, and the editor renders only the visible area plus a small buffer.

## 2026-07-12: Keep future authentication provider-neutral

Decision: Future OAuth belongs behind a provider-neutral application boundary and does not enter the editor core, episode schema, or Build Week dependency set.

Reason: Authentication identifies who may access a workspace; it does not define comic content or editing behavior.

Consequences: Provider tokens and identity records must remain outside episode documents and document commands. Do not add user IDs, OAuth fields, provider SDKs, or cloud persistence until an account-enabled slice is explicitly approved.
