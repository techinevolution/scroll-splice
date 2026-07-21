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

9. FEATURE_TEST_SHEET.md, when preparing or triaging Katherine's hands-on review
   One coherent creator story covering every implemented local human-editor surface and the explicitly gated exclusions.

10. SPEECH_BALLOON_CATALOG.md, when planning, implementing, testing, or documenting balloons and related lettering
    Research-backed preset inventory, terminology, composable controls, implementation order, and completion criteria.

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
- Vitest for pure/unit contracts and Playwright for the complete editor regression stories.
- ESLint and `tsc --noEmit` for static validation.

Do not add Next.js, Tauri, a cloud backend, database, cloud service, browser OAuth library, or OpenAI API-key dependency to the required human MVP. Resolve current stable package versions during scaffolding and commit `pnpm-lock.yaml`. Katherine approved the optional local OpenAI stretch on July 20 under the recorded `DECISIONS.md` boundary: it may use only the installed official Codex CLI/App Server through a dependency-free localhost companion, while the static human editor must remain complete without it.

## Human-Editor Completion Baseline

Katherine's July 16 instruction superseded the historical three-slice stop. The locally feasible implementation now exists: visible polish; complete local asset intake/management; recovery and portable/multiple local projects; bounded format-v6 transforms, snapping, organization, masks/crop/frame/bleed; ten empty editable speech-balloon body types with separate Text elements; and clearly provisional local rendering/slicing. That human-editor goal is complete. Current work is final validation, accurate submission evidence, and Devpost delivery—not speculative feature expansion.

Format v6 is the current working schema. Preserve deterministic v3/v4/v5 defaults and reject unknown formats. The approved optional companion is not a cloud backend and does not authorize cloud storage, external connectors, native desktop packaging, private-asset transfer, or automated WEBTOON login/upload/publishing. Local output based on the observed profile must stay labeled provisional, not upload-verified, and manual-upload only.

## Commands

These command contracts were verified against the July 13 foundation scaffold. Keep them working as later slices evolve:

- Setup: `corepack pnpm install`
- Run: `corepack pnpm dev`
- Run with the optional local OpenAI companion: `corepack pnpm dev:agent`
- Build and run the same-origin local companion: `corepack pnpm local`
- Unit tests: `corepack pnpm test`
- Companion tests: `corepack pnpm test:companion`
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
- Treat the implemented format-v6 schema as the current model: fixed composition group -> ordered stable-ID `LayerPlane` -> flat element references by `layerPlaneId`. Every element has bounded transform/lock/overflow data; images have stable source IDs plus explicit presentation/crop/mask/frame data; `ElementGroup` records are flat and non-nested; new `SpeechBalloonElement` records own an empty editable body, optional normalized contour points, and one tail, while lettering is an independent `TextElement`. The loader preserves supported older v6 balloon text for compatibility and normalizes supported v3/v4/v5 documents without a general migration framework. Do not reintroduce duplicated group fields, source bytes/browser URLs, recursive groups, or broad migration machinery.
- Keep exactly three fixed full-scroll composition groups: Background, Content, and Foreground. Only Background plane 1 is special: it is the pinned editable base color. Every other numbered plane is an unrestricted creator surface; optional names may guide but never enforce content roles.
- Treat the existing episode `name` and `logicalHeight` as document data. Title edits trim input, reject a blank name, and enforce the 60-character editor limit through `setEpisodeName`. The title text itself activates editing; do not keep a permanent pencil, input border, or cursor before activation. Keep the label and inline input on the same anchored footprint so edit mode does not shift the header.
- Background plane 1 always derives its full-scroll coverage from `episode.logicalHeight`. The bottom **Add scroll space** control and precise height handle are editor chrome, never episode elements, minimap items, or export items. Keep `DEFAULT_EPISODE_HEIGHT_INCREMENT = 1280` as the single source for the coarse increment. Route precise grow/shrink through a pure height command, and clamp shrinking before the logical bottom of every visible or hidden element; never move or clip content.
- Use fixed group rank, then plane order, then local element stacking for deterministic rendering. Within a group, plane 1 is lowest and higher numbered planes render above lower numbered planes. Show the active plane's element rows in local stack order so the left-side row grips visibly reorder the list and canvas overlap together.
- Keep group, plane, and element visibility independent. Effective canvas visibility is all three combined. Hidden elements do not render or capture canvas input, but they remain selectable from Layers so a creator can inspect or reveal them.
- Selecting a canvas element must activate its composition group and numbered plane so the filtered Layers panel can reveal the matching row.
- Preserve per-pixel source alpha and keep per-element opacity separate from eye visibility. Opacity uses a pure command and bottom property strip; one slider gesture must become one history entry. A zero-opacity element remains selectable in Layers and does not capture canvas input. The v6 loader normalizes supported v3/v4/v5 saves and rejects malformed or unknown versions; never silently rewrite unsupported data.
- Use **Add rail**, **Asset Library**, **library category**, **composition group**, **layer plane**, and **element** consistently. A numbered tab selects a plane; an asset, text item, shape, or color region placed within it is an element. Keep the fixed rail exact: Uploads, Speech Balloons, Decorations, and Splatters. The Decorations category uses the compact visible rail label **Decor** while retaining **Decorations** as its accessible name, drawer title, and stable category identity. Uploads contains **All**, **Unsorted**, and creator-named category filters; do not turn creator categories into unbounded rail buttons. Clicking the already open active category closes the drawer; clicking a different category switches the open drawer.
- In the implemented creator-completion pass, treat tab dragging as layer-plane reordering only. Use a dedicated grip, keep Background plane 1 pinned, reorder only within the active group, retain stable IDs while display numbers change, and provide visible Move Left/Right alternatives. Overflow arrows only navigate the tab strip and never change order. Optional plane names guide creators without changing a plane's unrestricted role.
- Delete a layer plane only through the pure `deleteEmptyLayerPlane` command. It may delete an ordinary plane only when no element references it; hidden elements still count as contents, Background plane 1 is protected, and a group's final plane cannot be deleted. The store activates the previous plane when available and otherwise the next.
- Delete a placed element only through the pure element-removal command. The trash beside its eye removes that episode instance, not a reusable source asset, plane, or library record.
- Keep the paperclip **Add asset** affordance at the bottom of every ordinary active plane's list, including populated planes. Pair it with empty-plane deletion when applicable. It opens the overlay Asset Library and targets the active ordinary plane. Clicking a built-in or imported source remains the accessible fallback and creates a normal viewport-centered `ImageElement`; source-library changes stay outside episode history, while placed-instance creation/move/resize/visibility/deletion use normal history. Preserve aspect ratio during default placement, and clearly refuse an extreme source ratio if both dimensions cannot fit inside the episode at the shared 24-logical-unit minimum.
- Use native browser drag events and a strictly parsed internal payload containing only source kind plus stable asset ID. Convert the drop point through the tested pan/zoom coordinate module, center the new element beneath it, clamp according to edge behavior, select it, and create one history entry. A completed drag must not also trigger click placement. Preserve click-to-place as the accessible fallback. Operating-system file drop must stay atomic import-plus-place; numbered-plane and active-Layers-list drops must target the explicit plane and report invalid targets clearly.
- Keep built-in assets original, local, transparent, neutrally named, and source-stable. The local build supports click/drag placement, selection, movement, eye/trash, undo/redo, minimap/Layers synchronization, proportional four-corner resize, universal opacity, the five recorded blend modes, vertical two-stop Background fills, and Stretch/Cover/Tile image presentation. General selected-image controls implement crop focus/zoom, rotation, and flip. Speech Balloons are not fixed image assets: ten cards create empty editable body/tail elements, and creators add independent Text lettering. Perspective, unrestricted freeform distortion, multiple tails, linked balloons, and creator-saved balloon presets remain deferred. Tile scale is automatic and capped at a 160-logical-unit tile edge.
- Keep imports restricted to validated PNG, JPEG, and WebP source files within the documented 20 MiB and 40-megapixel safety limits. Read declared PNG/JPEG/WebP dimensions from the file header and reject an over-limit source before full browser decode; still decode afterward to verify the image and confirm its dimensions. Persist unchanged source `Blob`s and creator categories through `AssetRepository`/IndexedDB; category and import mutations must use its atomic read-transform-write update so concurrent tabs merge rather than overwrite. Refresh the initiating tab's categories and runtime sources from the successful returned snapshot. Create object URLs only at runtime and revoke unused URLs. Preserve source alpha and render an honest selectable placeholder when a referenced source is missing.
- Keep Background plane 1 pinned and easy to edit from both its Layers color control and an approved direct canvas-side color control. Both must dispatch the same `setBaseColor` command; the canvas control is editor chrome.
- Create each solid Background color region full width in an ordinary Background plane, then treat its logical `x`, `y`, `width`, and `height` as freely editable. It moves on both axes, resizes width/height independently through eight handles, and participates in selection, visibility, deletion, minimap rendering, and safe-height calculations. Real PNG/JPEG/WebP imports with source alpha work, and imported photos may be placed on ordinary Background planes 2 and later; Background plane 1 remains the pinned color-only base. Format v5 added one vertical two-stop color/alpha fill, single/tile image presentation, and Normal/Multiply/Screen/Overlay/Soft Light. Format v6 adds bounded Stretch/Cover presentation with crop focus, zoom, preset masks, frame borders, and episode-edge bleed. Keep arbitrary gradient angles/stops, freeform mask points, texture-density controls, perspective distortion, and additional blend modes deferred.
- Treat alignment snapping as default-on editor state with a visible magnet toggle. Snap any movable element, including a Background color region, to the episode centerline when its horizontal center is within 8 CSS pixels at the current zoom; show a temporary vertical guide and bypass with Magnet Off or Alt/Option held during the drag. Defer edge and nearby-element targets.
- Keep direct resize bounded: selected unlocked ordinary shapes/text/images/balloons get four proportional corner handles, while Background color regions get eight independent handles. Route final bounds through pure `resizeElement`, enforce the 24-logical-unit minimum, and let explicit constrained/episode-edge-bleed behavior determine edge clamping. Masks always clip their image; panel-mask breakout is not first-class and requires a separate unmasked overlay. Rotation, flip, exact geometry/alignment, image crop/masks/frame, and lock are explicit format-v6 commands; perspective and freeform distortion remain absent.
- Expose the implemented **Move to Plane** operation through a visible keyboard-accessible action; a context menu may duplicate it but right-click must never be the only route. Target only ordinary planes, preserve the selected element's stable identity and asset reference, and activate its destination group and plane. Keep Layers rows in local stack order; left-side drag grips and keyboard arrows reorder one plane atomically, while Bring Forward/Send Backward remain explicit alternatives.
- Add basic text as an independent `TextElement` in the active ordinary plane. Its approved controls are wording, color, font size, `400 | 600 | 700` weight, and left/center/right alignment. Use existing movement, proportional resize, visibility, opacity, blend, history, and persistence paths. Keep font family/line height fixed and do not add automatic fitting, editable tails, or a compound balloon model.
- Build reader preview as chrome-free read-only presentation of the same authoritative document and resolved assets. It must preserve selection, active group/plane, zoom, viewport, history, and dirty state on exit. Give Reset Demo a dirty-work confirmation: cancel is a complete no-op; confirm loads the fixture as unsaved and preserves the explicit saved slot for Reopen.
- Keep the minimap a lightweight React/CSS/SVG representation, not a second Konva editor. It renders the complete episode on one proportionate surface inside a larger vertically scrollable window, follows the active viewport, and remains independent of editor zoom. Derive its viewport box from shared logical bounds, and keep the expanded visible frame and pointer hit target identical.
- During a single-element move or resize, keep transient `liveElementBounds` in application state so the status bar and minimap preview before release. For grouped pointer movement, only the primary publishes live bounds; follower members update when the atomic group command commits on release. The episode document changes only once at gesture end; cancel/clear removes the preview.
- Keep document history in application state, not the episode schema. Retain at most 100 checkpoints. Every committed episode mutation uses the same history path, including element and plane creation/deletion, move, resize, title, coarse or precise height, visibility, and base color. One bottom-edge pointer drag is one history step. Viewport, zoom, selection-only changes, panel state, live bounds, magnet state, and guide visibility are not history entries.
- Keep explicit saves and local-project switching behind the project repositories, crash recovery behind its separate debounced adapter, reusable asset blobs in IndexedDB, and portable transfer behind the validated `.scrollsplice` codec/merge. Save is still explicit; recovery must never be presented as a saved project. Reopen and New Episode clear document history/transient editing context but preserve the local Asset Library.
- Keep the working menu surface real: **File** owns New/Open Local/Save/Save As/Reopen/import/export actions; **Edit** owns Undo/Redo; **View** owns Reader Preview; **Window** owns inspector visibility; **Help** owns shortcuts/about. Do not add decorative commands or pretend browser menus are native OS menus. Menus must stack above every overlay and ordinary text inputs retain native undo/redo behavior.
- Preserve the implemented transient `zoomFactor`, `viewportX`, and `viewportY` model. **Fit Width** is the 100% reference, zoom is clamped to 50–200%, scroll progress uses the navigable range, zoom changes preserve the logical center where possible, both axes clamp safely, and the minimap reports the accurate two-dimensional viewport box. Do not put zoom in the episode document or alter document/export geometry when the view changes.
- Keep provisional WEBTOON slice guides profile-derived and editor-only: for `webtoon-canvas-2026-07-13-observed`, use dotted horizontal boundaries every 1,280 logical units across the 800-unit episode width, aligned through pan and zoom, but absent from the episode document, minimap content, rendered exports, and compatibility claims.
- Center and clamp the viewport when the layers list selects an off-screen element.
- Keep the implemented `ProjectRepository` and `AssetRepository` adapters and future export, account-backed persistence, and authentication integrations behind application-edge interfaces. Episode saves never contain source blobs, data URLs, or object URLs.
- Keep the implemented bounded local companion—and any future cloud model access, image generation, project context, editor tools, or run coordination—behind the application-edge interfaces in `ARCHITECTURE.md`.
- Expose only logical, serializable project context to the model; never expose React components, Konva nodes, Zustand setters, raw filesystem handles, or credentials.
- Route every model-driven document edit through the same implemented and tested command used by the human editor.
- For programmatic editor work, use the versioned adapter in `src/automation/editorAdapter.ts`: inspect first, target returned stable IDs in logical episode pixels, execute one command, verify its returned snapshot, and undo a valid but unwanted result. Do not manipulate the DOM, Konva nodes, or Zustand setters as an automation shortcut.
- Keep platform limits in a versioned `ExportProfile`, never in the episode model or scattered UI constants. The provisional WEBTOON profile may retain the authenticated UI labels—800 × 1280 px, 2 MB per image, 50 MB and 100 images total, JPG/JPEG/PNG—until upload tests verify exact enforcement and byte units. The active local renderer may self-slice and preflight only with visible provisional labeling; it must never promise that WEBTOON will preserve accepted files without optimization, recompression, resizing, or reformatting.
- Keep the committed six-image **The Light We Planted** Build Week sample original, synthetic, public-safe, and covered by recorded provenance and licensing. Any replacement fixture assets require the same documentation and must not contain private Root & Table art.
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

Production export, portable project files, desktop packaging, OAuth, accounts, cloud storage, autonomous creation, and direct publishing are not required for the submission. Checkpoint D's transforms, local history/save/menu work, the persistent Asset Library, and the implemented three-slice creator completion pass are optional creator-workflow additions, not new contest requirements. A single synthetic OpenAI generate-and-place proof is optional only after the complete human MVP, validation, public access, and submission evidence pass and Katherine approves its additional gate. The editor and judge walkthrough must work without model access. Static deployment is required only as the simplest judge-access path. Follow the dated schedule and fallback rules in `PLAN.md`.

## Optional Local OpenAI Autonomy Boundary

- Treat the human editor as the source of the tools an autonomous mode may use; do not create a second model-only mutation path.
- Keep ScrollSplice user/workspace authentication separate from OpenAI model authorization.
- Use only the official Codex App Server login flow from the isolated local companion. Do not copy another product's client identity, call private ChatGPT endpoints directly, or put provider credentials in browser JavaScript.
- Keep the companion bound to localhost, keep its Codex state outside the repository, and expose only the recorded ScrollSplice dynamic tools. Treat any shell, file, web, connector, browser-control, MCP, or approval request as a boundary failure.
- Treat internal editor operations as custom function tools. Treat OpenAI connectors or remote MCP as optional external-service integrations with separate authorization, scopes, privacy review, and approvals.
- Keep private comic assets local unless Katherine explicitly approves the exact material and context for an OpenAI request.
- Record generated-asset provenance and provide visible progress, cancellation, and errors. The current single-turn ChatGPT proof explicitly has no spend-meter guarantee; require a creator-approved time/budget control before any later multi-step or metered autonomous run is considered safe.
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
- Verify the main canvas, minimap, layers panel, and overlay Asset Library at representative desktop sizes.
- When changing the implemented layer-plane foundation, regression-test group/plane filtering, group/plane/element eyes, canvas-driven group and plane switching, hidden-row selection, low-to-high local stack ordering, pinned-base behavior, overflow navigation, the full-height inspector, and the existing minimap interaction at 1440 × 900, 1280 × 720, and 1024 × 768.
- Regression-test title/reset, plane/element deletion, asset placement, episode-height safety, base coverage, minimap surface resizing/scroll-following, and repeated bottom-`+` use. Keep focused coverage for freely moving and independently resizing Background regions, center snap plus Magnet Off/Alt bypass, live status `x/y/w/h` and minimap previews, one final command commit, four-corner proportional ordinary resize, profile guides, zoom bounds, two-axis clamping, and representative desktop sizes.
- The local post-review build is evidenced by 94 unit tests, strict typecheck, ESLint, production build, one isolated Chromium walkthrough including element movement at 200% zoom, and visual inspection at 1440 × 900, 1280 × 720, and 1024 × 768.
- The now-historical fixed-width corrective checkpoint is evidenced separately by 120 unit tests, strict typecheck, ESLint, production build, one isolated expanded Chromium walkthrough, and visual inspection at the same three supported desktop sizes.
- Katherine's July 14 reviews led first to that fixed-width correction and then to the superseding free Background-region transform contract. The 123-test corrective build passed strict typecheck, ESLint, production build, one expanded Chromium walkthrough, supported-size visual inspection, and Katherine's final review **with notes**: live coordinates, minimap sync, eight handles, snap override, and Option-drag passed; minimap aspect distortion remains polish. It was unpushed at that checkpoint and was later incorporated into the July 15 stack published in `fdd4ead`.
- For the history/save/menu foundation, regression-test every named undo category, redo invalidation after a new edit, the 100-checkpoint bound, one-step bottom-edge drag history, dirty/saved status, unsupported or corrupt local data, explicit save, blank startup after page reload, explicit Reopen, blank New Episode, shortcuts, menu keyboard behavior, and preservation of saved local projects.
- For the Asset Library slice, regression-test the exact five rail destinations, compact **Decor** label containment, active-category toggle-close, application-menu hit testing above the open drawer, all nine built-ins, category/import validation, atomic concurrent-tab IndexedDB updates, current-tab refresh from the returned snapshot, source reuse, active-plane placement, clear extreme-ratio refusal, four-corner proportional resize, history semantics, supported v3/v4 opening into v5, missing-source fallback, File Save plus reload/Reopen, New Episode library retention, and the overlay at 1440 × 900, 1280 × 720, and 1024 × 768. The Chromium upload story must sample underlying pixels to prove transparent-source compositing and carry uploaded-image resize through undo/redo, Save, reload, and Reopen.
- The current Asset Library stack is evidenced by 214 unit tests across 11 files, strict typecheck, ESLint, production build, four Chromium stories, supported-size visual inspection, and the indexed public-safe screenshot. Its feature commit `fdd4ead37e7071bc7c69c9c4d8b49c557ddd95d7` was verified as both local and remote `main` on July 15.
- Preserve the five passing direct-placement and appearance checkpoints. Test drag coordinates at representative zoom, horizontal pan, vertical scroll, and episode edges; prevent drag-plus-click duplication; preserve click fallback. Test bounded v3/v4-to-v5 normalization, opacity clamping and gesture-history coalescing, zero-opacity Layers recovery/no canvas capture, source-alpha multiplication, matching canvas/minimap two-stop gradients, fixed-scale tiled-texture coverage with a 160-logical-unit maximum tile edge, and exact overlap for Normal, Multiply, Screen, Overlay, and Soft Light. Carry the resulting appearance through undo/redo, Save, reload, Reopen, reset, and supported desktop sizes.
- The published direct-placement and appearance goal is evidenced by 255 unit tests across 13 files, strict typecheck, ESLint, production build, focused drag/appearance Chromium coverage, the complete 6-of-6 Playwright Chromium suite, and the indexed public-safe screenshot. Its feature commit `7768daa0617b66c696f769d97dd531f9029272c8` was pushed to `main` July 15.
- Preserve the published creator-completion baseline and the broader completion pass recorded in local feature commit `a26927f`. Regression-test plane naming/reorder, pinned-base/cross-group rejection, local stacking/Move to Plane, text and editable-balloon controls, format-v6 transforms/masks/groups, project/recovery/portable workflows, Reader Preview and renderer parity, and Reset Demo/reopen behavior. That commit passes 377 unit tests across 28 files, typecheck, lint, build, and all 13 Playwright Chromium stories; update these figures only from a later recorded run.
- Do not claim drag behavior, synchronization, or visual correctness from static checks alone.
- Use screenshots when they materially help Katherine review a layout or interaction.

## Validation Before Final Report

- Run the relevant verified test, typecheck, lint, and build commands.
- Exercise the user story covered by the slice in the running app.
- When deployment exists, repeat the defining user story through the public judge-access URL in a clean browser session.
- Confirm no real creative assets or private content were added to git.
- Confirm no secrets, credentials, generated reports, or local-only files were added to git.
- If the optional OpenAI proof exists, confirm the base editor works with it disabled, synthetic inputs are used, credentials are absent from the client bundle and git, generated-asset provenance is visible, and cancellation works. Do not claim spend enforcement for the ChatGPT subscription path; separately verify any future metered budget control before documenting it.
- Check `git diff` and report unrelated pre-existing changes separately.

## Git Behavior

- Work on the current branch unless Katherine says otherwise.
- Commit only a coherent, passing slice.
- The public remote is `https://github.com/techinevolution/scroll-splice`; verify it rather than assuming it has not changed.
- Never push to `main` without Katherine's explicit consent.
- On July 13, Katherine explicitly authorized Codex to commit and push the current unpushed work and each later coherent, passing Build Week slice directly to `main` through the first complete human-editor MVP that she can test. This includes the workspace, shared canvas/minimap/layers behavior, navigation, synchronized selection, movement, reset, tests, and status documentation.
- During that authorized goal, Codex owns routine commit and push mechanics. Push only after the relevant validation passes, never push secrets or private creative content, and report the pushed commit after each coherent checkpoint. Do not interrupt Katherine for routine Git permission while this authorization is active.
- The first testable-editor authorization completed in `05ac06b`, and Katherine separately authorized the composition checkpoint pushed in `f02776f`.
- Katherine's July 14 human test completed the A/B/C checkpoint. The validated Episode Setup and A/B/C checkpoints, tests/screenshots, and accompanying status and feedback documentation were published to `main` through `8a493a2`; remote `main` was `6d6437e` before the July 15 publication gate. Corrective checkpoint D is validated and human-reviewed **PASS WITH NOTES**. Katherine passed the local history/save/menu slice July 15, approved the persistent Asset Library slice, and explicitly authorized publishing the complete passing stack after its tests, screenshot, documentation, and private-file checks passed. That complete stack was published in `fdd4ead37e7071bc7c69c9c4d8b49c557ddd95d7`, with local and remote `main` verified equal immediately after the push. The five-slice direct-placement and foundational-appearance `/goal` was implemented, validated, and published in `7768daa0617b66c696f769d97dd531f9029272c8`. Provisional local rendering is part of the completed human-editor baseline; upload-verified WEBTOON compatibility and external connectors remain gated. Katherine separately approved the optional isolated local Codex App Server proof on July 20.
- Katherine authorized the three-slice creator completion pass on July 15: plane organization/element stacking, independent basic text, and reader preview/safe Reset Demo. All three slices are implemented, validated, and published in `cb1f28443f7b1045d139879a2bba7b03edf25856`, with local and remote `main` verified equal after the push and the public-safe screenshot indexed. WEBTOON export, OpenAI/OAuth, Finder drop, autosave/recovery, source deletion, masks, crop, and rotation remain outside it.
- Katherine's first Asset Library review passed upload, placement, alpha, and proportional resize, then requested menu layering, a compact Decorations label, and active-category toggle-close. That correction and its public-safe screenshot were published in `3ec9bd095fab5ba2fb19f9d97cfeb79fcdbceae5`, with local and remote `main` verified equal after the push.
- Never rewrite the baseline commit or tag, even during cleanup.

## Final Report

Explain in plain language:

- what changed
- what now works
- what was tested and visually inspected
- what remains deferred or blocked
- what decision, if any, Katherine needs to make next

Include files changed and the recommended next action. For the published appearance goal, report each of the five checkpoints honestly: drag placement, opacity/v5 compatibility, vertical gradient/fade, tiled texture, and restrained blend modes. For the creator-completion pass, report plane organization/stacking, independent text, Reader Preview, and safe Reset Demo as implemented only when current validation supports that statement. Distinguish the previously working import/alpha/Background-photo behavior from newer behavior, include persistence/history boundaries, and cite publication only from verified Git state. Production export remains separate. Do not bury the outcome in raw technical detail.
