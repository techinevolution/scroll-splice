# ScrollSplice Agent Guide

## Project Documents

Before starting implementation, read these files in this order:

1. README.md
   Human-facing overview: what the project is, how to run it, and current status.

2. PROJECT_OUTLINE.md
   Product vision and intended end state: what the project should become.

3. PLAN.md
   Current execution path: current state, next slices, deferred work, validation path, and stop rules.

4. ARCHITECTURE.md, if present
   Technical map: repo structure, entry points, data flow, persistence, integrations, and invariants.

5. BUILD_WEEK_COMPLIANCE.md
   Official rule-to-evidence checklist, deadlines, submission requirements, and provenance safeguards.

6. WEBTOON_REQUIREMENTS.md
   Confirmed platform requirements, provisional limits, and required discovery before production export.

7. DECISIONS.md, if present
   Major product/architecture decisions and why they were made.

8. TODO.md, if present
   Small loose cleanup tasks only. Do not treat TODO.md as the roadmap.

Rules:
- If PROJECT_OUTLINE.md and PLAN.md disagree, stop and ask for clarification before implementing.
- If ARCHITECTURE.md disagrees with PROJECT_OUTLINE.md or PLAN.md, stop and ask for clarification before implementing.
- If PLAN.md is missing a current goal, next slice, deferred list, validation path, or stop rules, update/ask before implementing.
- If any implementation or submission plan conflicts with BUILD_WEEK_COMPLIANCE.md, stop and resolve the conflict against the current official rules.
- Do not let TODO.md override PLAN.md.
- Do not let technical evidence files replace generalist-readable summaries.

## Implementation Discipline

Start with the simplest efficient solution that satisfies the current goal while respecting the agreed architecture.

Do not add scaffolding, abstractions, validators, bridges, plugins, migrations, or automation unless they directly help the current slice work safely and clearly.

Code should be simple, but not sloppy:
- Follow the existing architecture and folder boundaries.
- Avoid spaghetti logic and hidden side effects.
- Prefer small readable functions over clever systems.
- Add tests when behavior could break, repeat, or affect important data.
- Add scaffolding only when it reduces real risk or repeated work.
- Stop before building future infrastructure that has not been requested or approved.

When unsure, choose the smallest clean implementation that can be understood, reviewed, and changed later.

## Locked Stack

- Node.js 22 and pnpm 10.
- React 19 with strict TypeScript and Vite 8.
- React-Konva/Konva for the viewport-sized interactive canvas.
- Zustand for shared document and editor state.
- Plain CSS for the application shell and panels.
- Native pointer and drag events during Build Week; do not add dnd-kit without a demonstrated need.
- Vitest for unit tests and Playwright for one editor smoke test.
- ESLint and `tsc --noEmit` for static validation.

Do not add Next.js, Tauri, a backend, database, cloud service, OAuth dependency, or OpenAI runtime dependency to the required human MVP. Resolve current stable package versions during scaffolding and commit `pnpm-lock.yaml`. The optional OpenAI stretch in `PLAN.md` requires a separate recorded stack/auth decision; its gate does not silently amend this stack.

## Commands

These command contracts were verified against the July 13 foundation scaffold. Keep them working as later slices evolve:

- Setup: `corepack pnpm install`
- Run: `corepack pnpm dev`
- Unit tests: `corepack pnpm test`
- Typecheck: `corepack pnpm typecheck`
- Lint: `corepack pnpm lint`
- Build: `corepack pnpm build`
- Editor smoke test: `corepack pnpm test:e2e`

## Coding Conventions

- Keep the episode document independent of UI components.
- Keep the core model and document commands free of React, Konva, Zustand, persistence, and authentication imports.
- Give every document entity actually introduced by an approved slice a stable ID; do not create deferred project, panel, or asset entities only to satisfy this rule.
- Route meaningful document edits through commands rather than scattered state mutations.
- Keep coordinate conversion and ordering logic small, centralized, and tested.
- Treat the Konva stage as a viewport into logical episode coordinates, never as one full-height episode canvas.
- Derive canvas, minimap, and layers from the same episode document.
- Treat the implemented format-v3 schema as the current Build Week model: fixed composition group -> ordered `LayerPlane` with a stable ID -> flat element references by `layerPlaneId`. Do not reintroduce a duplicated direct group field on elements.
- Keep exactly three fixed full-scroll composition groups: Background, Content, and Foreground. Only Background plane 1 is special: it is the pinned editable base color. Every other numbered plane is an unrestricted creator surface; optional names may guide but never enforce content roles.
- Treat the existing episode `name` and `logicalHeight` as document data. Title edits trim input, reject a blank name, and enforce the 60-character editor limit through `setEpisodeName`. The title text itself activates editing; do not keep a permanent pencil, input border, or cursor before activation. Keep the label and inline input on the same anchored footprint so edit mode does not shift the header.
- Background plane 1 always derives its full-scroll coverage from `episode.logicalHeight`. The bottom **Add scroll space** control and precise height handle are editor chrome, never episode elements, minimap items, or export items. Keep `DEFAULT_EPISODE_HEIGHT_INCREMENT = 1280` as the single source for the coarse increment. Route precise grow/shrink through a pure height command, and clamp shrinking before the logical bottom of every visible or hidden element; never move or clip content.
- Use fixed group rank, then plane order, then local element stacking for deterministic rendering. Within a group, plane 1 is lowest and higher numbered planes render above lower numbered planes. Show the active plane's element rows by logical `y` from top to bottom, using local stacking only as a tie-breaker.
- Keep group, plane, and element visibility independent. Effective canvas visibility is all three combined. Hidden elements do not render or capture canvas input, but they remain selectable from Layers so a creator can inspect or reveal them.
- Selecting a canvas element must activate its composition group and numbered plane so the filtered Layers panel can reveal the matching row.
- Preserve per-pixel source alpha and keep per-element opacity separate from eye visibility. Proposed checkpoint E has not started and is not automatic next work. If Katherine approves it after the corrective review, bump the unsaved fixture directly from format v3 to v4, default every existing and newly created element to `opacity = 1`, store an optional normalized `verticalAlphaFade` only on Background color regions, and have reset restore fixture opacity `1` with no fade. A zero-opacity element remains selectable in Layers and does not capture canvas input.
- Use **Add rail**, **Asset Library**, **library category**, **composition group**, **layer plane**, and **element** consistently. A numbered tab selects a plane; an asset, text item, shape, or color region placed within it is an element. Do not create real upload, asset-persistence, speech-balloon, or AI-generated categories merely to render the later library shell.
- When the later layer-management slice adds tab dragging, treat it as layer-plane reordering only. Use a dedicated grip, keep Background plane 1 pinned, reorder only within the active group, retain stable IDs while display numbers change, and provide visible Move Left/Right alternatives. Overflow arrows only navigate the tab strip and never change order.
- Delete a layer plane only through the pure `deleteEmptyLayerPlane` command. It may delete an ordinary plane only when no element references it; hidden elements still count as contents, Background plane 1 is protected, and a group's final plane cannot be deleted. The store activates the previous plane when available and otherwise the next.
- Delete a placed element only through the pure element-removal command. The trash beside its eye removes that episode instance, not a reusable source asset, plane, or library record.
- Keep the paperclip **Add asset** affordance at the bottom of every ordinary active plane's list, including populated planes. Pair it with empty-plane deletion when applicable. It may open the current Assets drawer and place only the original code-defined synthetic demo rectangles through `createSyntheticShapeElement`; never report that narrow path as real image import, upload, persistence, or production asset management.
- Keep Background plane 1 pinned and easy to edit from both its Layers color control and an approved direct canvas-side color control. Both must dispatch the same `setBaseColor` command; the canvas control is editor chrome.
- Create each solid Background color region full width in an ordinary Background plane, then treat its logical `x`, `y`, `width`, and `height` as freely editable. It moves on both axes, resizes width/height independently through eight handles, and participates in selection, visibility, deletion, minimap rendering, and safe-height calculations. Do not add gradients, blend modes, or imported backgrounds without a later approved slice.
- Treat alignment snapping as default-on editor state with a visible magnet toggle. Snap any movable element, including a Background color region, to the episode centerline when its horizontal center is within 8 CSS pixels at the current zoom; show a temporary vertical guide and bypass with Magnet Off or Alt/Option held during the drag. Defer edge and nearby-element targets.
- Keep checkpoint D's resize bounded: selected unlocked ordinary shapes/text get four proportional corner handles, while Background color regions get eight independent handles with ratio locking off. Route final bounds through pure `resizeElement`, clamp within the episode, enforce the 24-logical-unit minimum, and scale Text font size with proportional ordinary-element bounds. Do not add rotation, flipping, crop, perspective, or freeform distortion without a later approved slice. This uses existing format-v3 bounds.
- When cross-plane movement is approved later, expose **Move to plane** through both an element-row context menu and a visible keyboard-accessible action; never rely on right-click alone.
- Keep the minimap a lightweight React/CSS/SVG representation, not a second Konva editor. It always fits the complete episode to its own frame independently of editor zoom and must derive its viewport box from the shared logical bounds.
- During element move or resize, keep transient `liveElementBounds` in application state. The status bar and minimap must use those logical preview bounds before release, while the episode document changes only once through the pure command at gesture end; cancel/clear removes the preview.
- Preserve the implemented transient `zoomFactor`, `viewportX`, and `viewportY` model. **Fit Width** is the 100% reference, zoom is clamped to 50–200%, scroll progress uses the navigable range, zoom changes preserve the logical center where possible, both axes clamp safely, and the minimap reports the accurate two-dimensional viewport box. Do not put zoom in the episode document or alter document/export geometry when the view changes.
- Keep provisional WEBTOON slice guides profile-derived and editor-only: for `webtoon-canvas-2026-07-13-observed`, use dotted horizontal boundaries every 1,280 logical units across the 800-unit episode width, aligned through pan and zoom, but absent from the episode document, minimap content, rendered exports, and compatibility claims.
- Center and clamp the viewport when the layers list selects an off-screen element.
- Keep future persistence, asset, export, and authentication integrations behind application-edge interfaces.
- Keep future OpenAI model access, image generation, project context, editor tools, and run coordination behind the application-edge interfaces in `ARCHITECTURE.md`.
- Expose logical, serializable project context to a future model; never expose React components, Konva nodes, Zustand setters, raw filesystem handles, or credentials.
- Route every future model-driven document edit through the same implemented and tested command used by the human editor.
- Keep future platform limits in a versioned `ExportProfile`, never in the episode model or scattered UI constants. The provisional WEBTOON profile may retain the authenticated UI labels—800 × 1280 px, 2 MB per image, 50 MB and 100 images total, JPG/JPEG/PNG—until upload tests verify exact enforcement and byte units. A future exporter self-slices and preflights locally, but must never promise that WEBTOON will preserve accepted files without optimization, recompression, resizing, or reformatting.
- Prefer original code-rendered shapes and text for the Build Week sample. If a separate fixture asset is introduced, record its provenance and license.
- Create architectural folders only when the active slice needs them.

## Project Boundaries

- Work locally by default. The approved exceptions for Build Week are the public GitHub repository, an unrestricted static judge-access deployment, and the public submission video. Do not upload private assets to any of them.
- Never destructively modify imported source images.
- Do not commit Root & Table art or other personal creative material without Katherine's explicit approval.
- Treat third-party comic screenshots supplied for product explanation as uncommitted design references unless Katherine separately confirms the rights and explicitly approves their repository use.
- Do not add AI generation before the human MVP and submission path pass. Afterward, follow the explicit OpenAI stretch gate in `PLAN.md`; full autonomous creation remains a later milestone.
- Do not put provider tokens, OAuth identity, or user-account fields in the episode document or editor command layer.
- Do not automate WEBTOON login, upload, or publishing; do not store WEBTOON credentials.
- Do not make major framework or storage changes without checking the project documents and recording the decision.

## Build Week Boundary

The July 21 submission must prove reviewer understanding and UX clarity through:

- a recognizable vertical comic workspace
- one shared original synthetic sample episode model
- a large viewport-sized editing canvas
- a synchronized full-episode minimap
- a layers list synchronized with canvas selection
- one selected-element move command and a reliable reset action
- public judge access and all evidence required by BUILD_WEEK_COMPLIANCE.md

Production export, import, persistence, undo, a broader resize/transform system, tab/element reordering, desktop packaging, OAuth, accounts, cloud storage, autonomous creation, and direct publishing are not required for the submission. Checkpoint D's implemented four-corner proportional resize is a direct corrective addition, not a new submission requirement or permission for more transforms. A single synthetic OpenAI generate-and-place proof is optional only after the complete human MVP, validation, public access, and submission evidence pass and Katherine approves its additional gate. The editor and judge walkthrough must work without model access. Static deployment is required only as the simplest judge-access path. Follow the dated schedule and fallback rules in `PLAN.md`.

## Future OpenAI Autonomy Boundary

- Treat the human editor as the source of the tools an autonomous mode may use; do not create a second model-only mutation path.
- Keep ScrollSplice user/workspace authentication separate from OpenAI model authorization.
- Do not assume coding-harness Sign in with ChatGPT OAuth is supported for this web app; verify an official path before choosing dependencies.
- Treat internal editor operations as custom function tools. Treat OpenAI connectors or remote MCP as optional external-service integrations with separate authorization, scopes, privacy review, and approvals.
- Keep private comic assets local unless Katherine explicitly approves the exact material and context for an OpenAI request.
- Record generated-asset provenance and provide visible progress, cancellation, error, and cost-limit behavior before autonomous runs are considered safe.
- Never give a model WEBTOON credentials or automate WEBTOON login, upload, or publication.

## Build Week Provenance and Compliance

- Treat [the official OpenAI Build Week rules](https://openai.devpost.com/rules) as the authority; `BUILD_WEEK_COMPLIANCE.md` is the local checklist, not a replacement for the live rules.
- Preserve root commit `e4db897` and annotated tag `pre-build-week-planning` exactly. Katherine identified those seven documents as July 12 planning work; they were first committed on July 13 at 11:28:56 AM PT and contain no code. Do not imply that the Git timestamp independently proves the earlier creation date.
- Do not amend, squash, delete, retag, force-push over, or otherwise obscure the pre-event baseline.
- Put all judged implementation and evidence in later dated commits. Keep commit messages coherent enough to show what was completed during the submission period.
- Keep README status, verified commands, working-access URL, Codex collaboration evidence, and deferred scope current as slices complete.
- Run the main core-functionality implementation as one identifiable Codex task and use `/feedback` there for the required Session ID.
- Keep the submitted repository, working access, and public demo available without special permission through August 5, 2026 at 5:00 PM PT.
- Use only original synthetic, licensed, or explicitly approved content in the repository, screenshots, deployment, and video. The public video must be under three minutes and include audio.
- Do not claim a checklist item is complete without evidence. Record links, commit IDs, validation output, and inspection dates where BUILD_WEEK_COMPLIANCE.md requests them.

## UI Validation

- Run and visually inspect the application for any UI slice.
- Verify the main canvas, minimap, layers panel, and code-defined Assets-drawer placement at representative desktop sizes.
- When changing the implemented layer-plane foundation, regression-test group/plane filtering, group/plane/element eyes, canvas-driven group and plane switching, hidden-row selection, top-to-bottom row ordering, pinned-base behavior, overflow navigation, the full-height inspector, and the existing minimap interaction at 1440 × 900, 1280 × 720, and 1024 × 768.
- Regression-test title/reset, plane/element deletion, synthetic placement, episode-height safety, base coverage, minimap refitting, and repeated bottom-`+` use. Keep focused coverage for freely moving and independently resizing Background regions, center snap plus Magnet Off/Alt bypass, live status `x/y/w/h` and minimap previews, one final command commit, four-corner proportional ordinary resize, profile guides, zoom bounds, two-axis clamping, and representative desktop sizes.
- The local post-review build is evidenced by 94 unit tests, strict typecheck, ESLint, production build, one isolated Chromium walkthrough including element movement at 200% zoom, and visual inspection at 1440 × 900, 1280 × 720, and 1024 × 768.
- The now-historical fixed-width corrective checkpoint is evidenced separately by 120 unit tests, strict typecheck, ESLint, production build, one isolated expanded Chromium walkthrough, and visual inspection at the same three supported desktop sizes.
- Katherine's July 14 reviews led first to that fixed-width correction and then to the superseding free Background-region transform contract. The latest build passes 123 unit tests, strict typecheck, ESLint, production build, one expanded Chromium walkthrough, and supported-size visual inspection; do not report it as human-approved or pushed until those separate gates actually pass.
- Do not claim drag behavior, synchronization, or visual correctness from static checks alone.
- Use screenshots when they materially help Katherine review a layout or interaction.

## Validation Before Final Report

- Run the relevant verified test, typecheck, lint, and build commands.
- Exercise the user story covered by the slice in the running app.
- When deployment exists, repeat the defining user story through the public judge-access URL in a clean browser session.
- Confirm no real creative assets or private content were added to git.
- Confirm no secrets, credentials, generated reports, or local-only files were added to git.
- If the optional OpenAI proof exists, confirm the base editor works with it disabled, synthetic inputs are used, credentials are absent from the client bundle and git, generated-asset provenance is visible, and the run respects its cancellation and spend limit.
- Check `git diff` and report unrelated pre-existing changes separately.

## Git Behavior

- Work on the current branch unless Katherine says otherwise.
- Commit only a coherent, passing slice.
- The public remote is `https://github.com/techinevolution/scroll-splice`; verify it rather than assuming it has not changed.
- Never push to `main` without Katherine's explicit consent.
- On July 13, Katherine explicitly authorized Codex to commit and push the current unpushed work and each later coherent, passing Build Week slice directly to `main` through the first complete human-editor MVP that she can test. This includes the workspace, shared canvas/minimap/layers behavior, navigation, synchronized selection, movement, reset, tests, and status documentation.
- During that authorized goal, Codex owns routine commit and push mechanics. Push only after the relevant validation passes, never push secrets or private creative content, and report the pushed commit after each coherent checkpoint. Do not interrupt Katherine for routine Git permission while this authorization is active.
- The first testable-editor authorization completed in `05ac06b`, and Katherine separately authorized the composition checkpoint pushed in `f02776f`.
- Katherine's July 14 human test completed the A/B/C checkpoint. The validated Episode Setup and A/B/C checkpoints, tests/screenshots, and accompanying status and feedback documentation were published to `main` through `8a493a2`; the current remote head is `6d6437e`. Corrective checkpoint D is validated locally and remains pending Katherine's review; no push is implied. Opacity/fades, production export, import, persistence, deployment, OpenAI, OAuth, and external-service work remain unstarted or separately gated.
- Never rewrite the baseline commit or tag, even during cleanup.

## Final Report

Explain in plain language:

- what changed
- what now works
- what was tested and visually inspected
- what remains deferred or blocked
- what decision, if any, Katherine needs to make next

Include files changed and the recommended next action. For the current work, report checkpoint D's validation status and ask Katherine to retest it; do not name checkpoint E or any other product slice as automatically next. Production export remains separate. Do not bury the outcome in raw technical detail.
