# ScrollForge Plan

## Current State

The repository contains planning documents only. The Build Week stack and submission target are approved, but no application scaffold or product code exists yet.

Available work time is approximately 26 hours: full days on July 13–14, two hours each evening July 15–19, a stabilization buffer on July 20, and submission on July 21.

## Current Product Goal

Deliver a clear, working ScrollForge editor experience using Root & Table as the proof episode. A reviewer must be able to understand the vertical episode, navigate it through a synchronized minimap, and select the same content from the canvas or layers list.

Export polish, hosted deployment, and production persistence are not part of the submission target.

## Current Architecture Shape

A local React browser app with a framework-independent episode model and command core. Zustand coordinates application state, React-Konva renders a viewport into logical episode coordinates, and normal React/CSS owns the workspace panels. See [ARCHITECTURE.md](ARCHITECTURE.md).

## Build Week Must-Haves

- Documented local setup and run commands.
- Large vertical-comic editing viewport.
- Shared episode model rendered by the canvas, minimap, and layers list.
- Full-episode minimap with an accurate viewport box.
- Canvas-to-minimap and minimap-to-canvas navigation.
- Canvas/layers selection synchronization.
- A readable Root & Table proof episode using approved local assets or safe placeholders.
- Passing typecheck, lint, unit tests, production build, and one Playwright smoke test.
- Visual inspection at representative desktop sizes.

## Dated Work Plan

### July 13 — Foundation and workspace

- Scaffold React 19, strict TypeScript, Vite 8, React-Konva/Konva, Zustand, Vitest, Playwright, and ESLint with pnpm.
- Add the approved `dev`, `test`, `typecheck`, `lint`, `build`, and `test:e2e` scripts.
- Establish the main canvas area, upper-right minimap, layers panel, and collapsed asset area.
- Define the episode, element, asset-reference, viewport, and selection types with stable IDs.
- Create a synthetic or locally supplied Root & Table proof episode without committing private art.
- Render the same episode model in the canvas, minimap, and layers list.
- Add initial model and coordinate tests.

End-of-day proof: the app runs, the editor layout is recognizable, and all three surfaces represent one shared episode.

### July 14 — Defining interaction

- Implement viewport-sized Konva rendering over logical episode coordinates.
- Add vertical pan/scroll and viewport clamping.
- Draw and synchronize the minimap viewport box.
- Support minimap click and viewport-box dragging to navigate.
- Select an element from either the canvas or layers list and synchronize selection.
- Visually inspect the complete interaction at representative desktop sizes.

End-of-day proof: a reviewer can understand the episode, navigate it through the minimap, and select matching content from canvas or layers.

### July 15 — Two-hour editing pass

- Add the selected-element outline and move behavior.
- Commit movement through a document command on drag end.
- Add movement and boundary tests.
- Do not begin resize, rotation, or undo unless movement is already stable.

### July 16 — Two-hour asset pass

- Add the collapsible asset panel with locally selected or synthetic thumbnails.
- Attempt asset-to-canvas drag with an accurate logical drop position.
- If drag-in is unstable by the end of the session, keep a clear **Add to canvas** fallback and stop debugging drag-in.

### July 17 — Two-hour Root & Table proof pass

- Compose a readable short episode using approved local assets or safe placeholders.
- Refine spacing, layer names, selection feedback, empty states, and minimap readability.
- Keep real Root & Table art gitignored unless Katherine separately approves committing it.

### July 18 — Two-hour reliability pass

- Test coordinate conversion, viewport clamping, selection synchronization, movement commands, and layer ordering.
- Add one Playwright smoke test covering load, minimap navigation, and canvas/layer selection.
- Run typecheck, lint, tests, and production build.

### July 19 — Two-hour submission preparation

- Perform the full reviewer walkthrough from a clean start.
- Fix only problems that interrupt understanding or the defining interaction.
- Update README run instructions and current-status text from verified commands.
- Prepare concise submission notes covering what works, what was deferred, and why ScrollForge is distinct from a general image editor.

### July 20 — Stabilization buffer

- Use only for blocking defects, broken setup, failed validation, or essential visual cleanup.
- Do not add features.
- Re-run the complete validation suite and reviewer walkthrough.

### July 21 — Submit

- Confirm the documented setup works from a clean start.
- Confirm private Root & Table source assets are not tracked unintentionally.
- Submit the passing Build Week state.

## Recommended Next Slice

Start **July 13 — Foundation and workspace**. The first checkpoint is not complete until the locked toolchain runs and the canvas, minimap, and layers list visibly derive from one shared episode model.

## Stretch Work

Attempt only after the must-haves for the current date are stable:

- basic element movement
- asset-to-canvas dragging
- a safe **Add to canvas** fallback
- additional Root & Table visual polish

## Deferred Work

- Persistence, save/reopen, and project-folder design.
- Undo/redo, resize, rotation, crop, masks, and advanced transforms.
- Layer and panel-group reordering.
- Tall-image export and WEBTOON/Tapas presets.
- Desktop packaging and mobile editing.
- AI assistance, voice control, accounts, OAuth, cloud storage, collaboration, and publishing integrations.

## Open Questions

None block Build Week. Export dimensions, durable persistence, desktop packaging, and OAuth provider choice belong to later approved slices.

## Validation Path

- Setup: `corepack pnpm install`
- Run: `corepack pnpm dev`
- Unit tests: `corepack pnpm test`
- Typecheck: `corepack pnpm typecheck`
- Lint: `corepack pnpm lint`
- Production build: `corepack pnpm build`
- Editor smoke test: `corepack pnpm test:e2e`
- Visually inspect the running app at representative desktop sizes.
- Walk through canvas navigation, minimap navigation, canvas selection, and layer selection using the proof episode.

The commands are approved contracts but remain unverified until the July 13 scaffold creates the package scripts.

## Submission Acceptance

- The local app starts from documented commands.
- A vertical Root & Table proof episode appears on the main canvas.
- The minimap represents the full episode and visible viewport accurately.
- Canvas movement updates the minimap, and minimap navigation moves the canvas correctly.
- Selecting an element on the canvas selects its layer, and selecting a layer selects its canvas element.
- Basic movement is included only if it does not destabilize navigation or selection.
- Typecheck, lint, unit tests, production build, and the Playwright smoke test pass.
- The running application has been visually inspected.
- Private assets, OAuth infrastructure, export, hosting, and desktop packaging remain outside the required submission.

## Stop Rules

- Do not implement product code until Katherine explicitly approves the first implementation slice; documentation approval alone does not authorize app construction.
- Do not expand the submission target to export, persistence, hosting, or desktop packaging.
- Do not add Next.js, Tauri, dnd-kit, a backend, database, cloud service, or OAuth dependency during Build Week without explicit approval.
- Stop a stretch task when it threatens the next dated must-have or the July 20 no-new-features boundary.
- Do not commit Root & Table or other personal creative assets without Katherine's explicit approval.
- Do not claim visual behavior works unless the running app was inspected.
- If the outline, plan, and architecture disagree, resolve the documents before coding.
