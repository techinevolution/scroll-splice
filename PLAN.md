# ScrollSplice Plan

## Current state

ScrollSplice is a public planning repository at <https://github.com/techinevolution/scroll-splice>. Katherine identified seven documents as July 12 pre-event planning work under the earlier ScrollForge name. They were first committed unchanged on July 13 at 11:28:56 AM PT in commit `e4db897` and marked by annotated tag `pre-build-week-planning`. The owner-attested baseline contains no application code; the Git timestamp records preservation on July 13 rather than independently proving the July 12 creation date.

Post-start documentation/compliance work is recorded in commit `a567865` at 11:50:26 AM PT on July 13. Later on July 13, Katherine approved the scaffold and synthetic fixture, then approved one larger `/goal` through the first complete editor she could test. The locked scaffold, verified command contracts, original six-beat synthetic fixture, editor shell, and defining canvas/minimap/layers interaction are complete and pushed. After her product review, Katherine approved and Codex completed the bounded composition-groups and visibility checkpoint in `f02776f` and the numbered layer-plane and editable-backdrop checkpoint in `c5f83c5`.

Available work time is roughly 26 hours: full workdays July 13–14, about two hours each evening July 15–19, a stabilization buffer July 20, and submission July 21. July 13 covered provenance, rules, discovery, repository setup, the foundation, and the interaction work originally scheduled through July 16. Katherine completed the hands-on review and `/feedback` that day. The review found no blocking defect, leaving the remaining July 13–18 product window available for bounded creator-facing slices without changing the minimum submission contract.

Katherine approved **Episode Setup and Expandable Scroll**, and Codex completed and validated that checkpoint locally on July 13. **Canvas Zoom and 2D Viewport** is now the recommended next slice, followed by **Asset Properties and Opacity**; both remain separately gated and unapproved.

## Completed `/goal`: first Katherine-testable human editor

Completed in the July 13 commits `c33b491` and `05ac06b`:

1. Establish the small framework-independent viewport, coordinate, command, and editor-state modules.
2. Build the desktop workspace and render the shared synthetic episode in a viewport-sized Konva canvas, a lightweight full-episode minimap, and a layers list.
3. Add clamped wheel/trackpad navigation, minimap click navigation, an accurate viewport box, canvas/Layers-panel selection synchronization, and off-screen element centering.
4. Add selected-element movement through a pure document command and a visible reset action.
5. Add focused unit tests and one complete smoke test, run every documented validation command, and visually inspect representative desktop sizes.
6. Keep README and compliance evidence accurate, push each coherent passing checkpoint to `main`, then stop for Katherine's hands-on review and `/feedback`.

Validation passed: 15 unit tests, strict typecheck, ESLint, production build, and the complete Playwright Chromium walkthrough repeated three times. The running editor was visually inspected at 1440 × 900 and 1280 × 720. Deployment, real asset import, persistence, export, OpenAI runtime access, OAuth, and submission-media production remain outside this completed goal.

## Completed checkpoint: Katherine product review

Katherine completed the documented walkthrough on July 13. She confirmed that the minimap viewport is easy to drag, placed elements are easy to move, and the sliding asset panel hides correctly. No reported issue prevents a judge from understanding or using the current Build Week interaction.

The associated Codex Feedback Session ID is **`019f5921-6190-7520-ba51-f5e0897c5af9`**.

## Creator-ready feedback recorded July 13

These requests refine the intended product but are not authorization to enlarge the contest MVP:

- combine a solid RGB base, an uploaded background image, and optional decorative edges in one independently editable background treatment
- let the episode and background extend downward through an editor-only **+ Add scroll space** control at the logical bottom of the story canvas; each activation uses one centralized default increment of 1280 logical units
- preserve transparency in imported and placed images
- provide a researched starter library of resizable comic speech balloons while allowing creators to add their own reusable balloon and decorative assets
- make the current episode title editable in the header, with **File > New Episode** following later
- use a familiar File, Edit, View, Window, and Help command model, with native operating-system menus deferred until desktop packaging exists
- add optional center/edge/nearby-element snapping behind a magnet toggle
- resize images and text directly with corner handles
- use a compact left **Add** rail that opens a category-based **Asset Library** with Uploads, Speech Balloons, Decorations, Shapes & Frames, and eventually AI Generated
- use three fixed composition groups—**Background**, **Content**, and **Foreground**—above the story canvas while the right Layers panel follows the active group's numbered planes and elements
- keep group selection separate from visibility, preserve individual eye settings when a whole group is hidden, and let constrained displays collapse or overlay the right inspector rather than crushing the canvas
- extend the right inspector to the top of the window, align episode/reset controls over the canvas, center the three composition controls, and remove persistent instruction text from that bar
- treat the three composition groups as full-scroll containers holding numbered, creator-defined layer planes rather than forcing numbered roles or story sections
- pin only Background plane 1 as the editable full-scroll base RGB color; let every other plane be added, renamed, hidden, reordered, and populated freely
- let ordinary Background planes hold movable long color regions, fades, photos, textures, splatters, or edge decoration; adding a color region asks where on the scroll it begins
- preserve source alpha and give every element an independent 0–100% opacity control through a contextual bottom property strip and precise percentage input
- keep hidden elements selectable from the Layers panel even though they do not render or capture canvas clicks
- show an active plane's elements from top to bottom on the scroll instead of presenting later beats first solely because of stacking values
- support compact draggable numbered tabs with a dedicated handle, a non-drag reorder alternative, `+` creation, and left/right overflow navigation that does not change order
- let a creator remove an accidentally added empty ordinary plane through a centered, accessible action while keeping Background plane 1 and at least one plane per group
- replace the fixed fit-only view later with **Fit Width** plus 50–200% zoom, horizontal access above fit, center-preserving zoom changes, and an accurate two-dimensional minimap viewport box
- later provide **Move to plane** from an element-row context menu plus a visible keyboard-accessible action; right-click must not be the only route
- add Clip Studio-style rectangular and irregular panel masks later, with optional snapping that never prevents intentional asymmetry, bleed, or panel-breakout effects

## Completed implementation slice: composition groups and visibility

**Status:** implemented, validated, and reviewed July 13. Katherine confirmed that group and element eye controls work, then clarified the next layer-plane model and the hidden-selection, ordering, and workspace corrections below. Public deployment and submission work remain reserved for the July 19–21 submission runway.

**Goal:** establish the simple three-group destination and visibility model that the later Asset Library, backgrounds, and overlays all need.

- Add a flat `compositionGroup` value—Background, Content, or Foreground—to every episode element and assign the synthetic fixture intentionally.
- Keep fixed cross-group rendering order while preserving ordinary layer order within each group.
- Add the three group controls above the story canvas and filter the right Layers list to the active group.
- Selecting a canvas element activates its group so its layer row remains discoverable.
- Add separate group and individual-layer visibility commands; a group toggle preserves individual layer settings.
- Ensure hidden elements do not render or capture canvas selection.
- Keep the Layers list independently scrollable and verify usability at 1440 × 900, 1280 × 720, and 1024 × 768 without adding a panel-resize system.
- Add focused model, command, store, and browser coverage for filtering, selection synchronization, effective visibility, reset, and existing minimap behavior.

Acceptance:

- Background, Content, and Foreground controls fit above the story canvas at supported desktop sizes
- the right Layers list shows the active group's layers without hiding other visible groups from the canvas or minimap
- canvas selection activates the selected element's group and reveals its layer row
- group and individual eye controls work independently, preserve child visibility settings, and clear invisible selection safely
- existing navigation, movement, reset, and minimap behavior remain passing
- typecheck, lint, unit tests, production build, Playwright, and visual inspection pass

Excluded: the Add-rail redesign, real uploads, asset drag-in, layer reordering, moving layers between groups, keyboard shortcuts, speech-balloon assets, backgrounds, resizing, persistence, deployment, submission media, and AI.

Validation passed: 26 unit tests, strict typecheck, ESLint, production build, and the expanded Playwright Chromium walkthrough. The running interface was visually inspected at 1440 × 900, 1280 × 720, and 1024 × 768.

## Completed implementation slice: layer planes and episode backdrop

**Status:** approved, implemented, and validated July 13 in `c5f83c5`.

**Goal:** correct the composition foundation before the Add rail begins creating real destinations. Keep the fixed Background, Content, and Foreground controls, but add one ordered numbered-plane level inside each group and make the white episode backdrop real document data.

Must-have work:

- Introduce stable layer-plane records and make elements reference a plane; bump the fixture format directly without adding a migration framework because no saved user documents exist.
- Seed pinned Background plane 1 with the editable full-scroll base color, expose a compact **Base color** swatch using the browser's native color picker when that plane is active, show an editor-only checkerboard when the base is hidden, and remove the hardcoded white fill from canvas and minimap rendering.
- Remap the synthetic colored beat rectangles to a Content plane because they represent panels, not the episode backdrop.
- Add active-plane state and a compact numbered tab strip beneath the Layers heading with `+`, per-plane eye controls, overflow arrows, and automatic active-tab reveal. This foundation appends new planes in a stable order; drag reordering follows only after plane identity and selection are proven.
- Keep Background plane 1 pinned while allowing ordinary planes in every group to be created and hidden without prescribed content roles.
- Show the active plane's elements from top to bottom on the scroll; keep local stacking as the tie-breaker for overlap.
- Permit Layers-panel selection of hidden elements while keeping them absent from canvas rendering and hit testing.
- Extend the right inspector to the top of the window, align episode/reset controls over the canvas, center the group controls, and remove the instruction copy.
- Preserve canvas/minimap derivation, navigation, movement, reset, and the current visibility behavior with focused model, command, store, and browser coverage.

Acceptance:

- the white starting backdrop comes from pinned Background plane 1; its inspector swatch opens a native color picker, changing it updates both canvas and minimap, and hiding it reveals only an editor checkerboard
- each composition group can expose multiple numbered planes without forcing what creators place on them
- creating a plane appends and selects it without changing another plane's contents; Background plane 1 cannot leave the bottom
- overflow arrows reveal tabs without reordering them, and the active tab stays visible
- selecting an element activates its group and plane; hidden elements remain selectable from the right panel
- the active plane's element rows follow the scroll from top to bottom
- reset restores the known fixture, plane selection, plane visibility, and base color
- the revised header and full-height inspector remain usable at 1440 × 900, 1280 × 720, and 1024 × 768
- unit tests, typecheck, lint, production build, Playwright, and visual inspection pass

Excluded: tab drag reordering, Move Left/Right ordering commands, plane rename/delete, per-element opacity controls, real uploads, the Add rail redesign, movable color-region creation, gradients and blend modes, panel-mask tools, bleed behavior, snapping, resize handles, element moves between planes, undo, persistence, export, deployment, submission media, and AI.

Validation passed: 38 unit tests, strict typecheck, ESLint, production build, and three consecutive isolated Playwright Chromium walkthroughs on port `4174`. The running interface was visually inspected at 1440 × 900, 1280 × 720, and 1024 × 768. The public-safe final checkpoint is [preserved in the progress record](docs/progress/2026-07-13-layer-planes-and-editable-backdrop.png).

## Completed implementation slice: Episode Setup and Expandable Scroll

**Status:** approved, implemented, validated, and visually inspected locally July 13. Remote publication remains separately gated.

**Goal:** make the current episode easier to set up and extend without introducing persistence, arbitrary resizing, or a new document format.

Must-have work:

- Give an empty ordinary plane two centered, keyboard-accessible, same-size Layers actions: a working trash-can **Delete** action and a disabled paperclip **Attach asset** placeholder. The placeholder communicates the future destination without pretending that import exists.
- Permit deletion only for an ordinary plane with no referenced elements. Hidden elements still count as content, so hiding an element never makes its plane deletable.
- Never delete Background plane 1, never leave a composition group with zero planes, and select the nearest surviving plane after deletion, preferring the previous plane when both sides exist.
- Compact the surviving display order while preserving every surviving plane's stable ID.
- Make the episode title editable in the existing header. Enter or blur commits, Escape cancels, blank or whitespace-only text is rejected, and the input is capped at 60 characters for WEBTOON-compatible episode-title entry.
- Add an editor-only **+ Add scroll space** control at the logical bottom of the story canvas. It is workspace chrome, not episode content and not part of eventual export.
- Extend only downward by a centralized default of 1280 logical units per activation. Do not scatter that number through components, and do not add shrinking or arbitrary-height entry in this slice.
- Keep the current logical viewport position stable when space is added. The pinned base automatically follows the new document height, and the fixed-size minimap refits the entire episode while preserving accurate navigation and viewport proportions.
- Make reset restore the fixture title, original episode height, original planes, active plane, selection, visibility, base color, and viewport.

Acceptance:

- a newly added empty ordinary plane can be deleted from the centered action, while the base plane, a populated plane, and the final plane in a group cannot be deleted
- hidden elements prevent deletion just as visible elements do
- deletion leaves all surviving IDs and content intact, closes the numbering gap, and activates the nearest survivor
- the header title supports commit and cancel behavior, rejects blank text, enforces the 60-character cap, and reset restores the fixture title
- each add-space activation increases the logical height by exactly the centralized 1280-unit default without moving existing elements or jumping the viewport
- the base continues through the extended area and the minimap automatically refits the full new height with correct click, drag, and viewport-box behavior
- existing canvas navigation, selection, movement, visibility, plane overflow, and reset behavior remain passing
- focused unit/store coverage, typecheck, lint, production build, Playwright, and visual inspection at the supported desktop sizes pass

Excluded: episode shrinking, arbitrary extension amounts, drag-to-resize canvas height, **File > New Episode**, persistence, canvas zoom, horizontal viewport state, opacity, background color regions or fades, tab rename/reordering, Move Left/Right ordering commands, deletion of populated planes, undo, the Add rail, imports, resize handles, export, deployment, submission media, OAuth, and AI.

Validation passed: 63 unit tests, strict typecheck, ESLint, production build, and one isolated Playwright Chromium walkthrough. The running interface was visually inspected at 1440 × 900, 1280 × 720, and 1024 × 768. The public-safe checkpoint is [preserved in the progress record](docs/progress/2026-07-13-episode-setup-and-expandable-scroll.png).

## Recommended next slice: Canvas Zoom and 2D Viewport

**Status:** proposed for separate approval; no implementation is authorized yet.

**Goal:** make the story canvas adjustable without changing episode geometry or allowing zoomed content to become unreachable.

Must-have work:

- Keep **Fit Width** as the default and add explicit 50–200% view controls.
- Preserve the current logical center as closely as clamping permits when zoom changes.
- Add horizontal viewport state and input so the creator can reach the entire 800-unit episode whenever zoom makes it wider than the visible stage.
- Extend the centralized coordinate helpers and minimap viewport representation to both axes; the minimap box must accurately show the visible logical rectangle at every supported zoom.
- Keep zoom and viewport position as transient editor state. They must not alter episode dimensions, element coordinates, or eventual export geometry.
- Preserve selection, dragging, wheel/keyboard navigation, minimap click/drag navigation, extension, title editing, visibility, and reset behavior.

Acceptance:

- Fit Width restores the complete episode width and the default centered horizontal position
- 50%, 100%, and 200% views render predictably, preserve the logical center when possible, and never strand content outside available navigation
- element selection and movement remain accurate at non-default zoom values
- the minimap viewport box reports both horizontal and vertical visible bounds and remains a reliable navigation control
- reset restores the documented default fit and viewport
- focused coordinate/store coverage, typecheck, lint, production build, Playwright, and visual inspection at the supported desktop sizes pass

Excluded: opacity, element resize handles, snapping, canvas rotation, episode-height shrinking, background color regions or fades, plane renaming/reordering, imports, persistence, export, deployment, submission media, OAuth, and AI.

### Later bounded slices

After the separately approved Canvas Zoom and 2D Viewport checkpoint passes, continue one separately approved checkpoint at a time:

1. **Asset Properties and Opacity:** add one focused property strip for the currently selected element with a 0–100% opacity slider and exact percentage input. Opacity remains separate from eye visibility and source alpha, and zero-opacity elements remain selectable from Layers.
2. **Background color regions and fades:** create an ordinary movable color-region element on a Background plane, ask where its vertical span begins, default to the current viewport, and add a simple transparent two-stop fade only if the solid region is stable.
3. **Layer management:** add dedicated drag grips, a clear insertion marker, accessible Move Left/Right actions, and optional names. Reorder only inside the active group, renumber labels while retaining stable IDs, and never move or delete Background plane 1. Safe empty-plane deletion is complete; populated-plane deletion remains deferred until moving content and undo/recovery are designed.
4. **Add rail and Asset Library shell:** replace the single Assets control with the **Add** rail and category-based **Asset Library** shell using only public-safe placeholders. Its later Add-to-canvas action targets the active numbered plane; real import, speech-balloon artwork, and AI-generated content remain outside the shell-only slice.

### Submission runway: July 19–21

Public judge access, clean-browser verification, Devpost evidence, video production, final rules review, and submission are intentionally scheduled near the deadline. They remain mandatory, but they are not the July 13 next slice.

## Current product goal

Submit a small, complete, reliable **human-operated** editor MVP in the **Apps for Your Life** category. A judge should immediately understand ScrollSplice's coherent user experience by using one public-safe sample episode to:

1. see a long episode through a viewport-sized editing canvas
2. understand the whole episode through a synchronized minimap
3. navigate from the canvas or minimap
4. select the same element from the canvas or layers list
5. move the selected element and reset the demo

That is the simplest MVP for Build Week. It proves the product's distinctive interaction without pretending that import, persistence, undo, production export, or autonomous creation is complete. The editor must work without an OpenAI connection.

## Build Week must-haves

### Working product

- A recognizable vertical-comic workspace at representative desktop sizes.
- One original six-beat sample episode made from code-rendered shapes and text, with clear named elements.
- One shared episode model rendered by the canvas, minimap, and layers list.
- Accurate two-way canvas/minimap navigation and viewport clamping.
- Canvas/layers selection synchronization, including centering an off-screen layer selection.
- Selected-element movement committed through a pure document command.
- A visible reset action restoring the known demo state.
- Passing typecheck, lint, unit tests, production build, and one Playwright smoke test.
- Visual inspection of the running experience.

### Submission evidence

- Public GitHub repository with the MIT License and dated provenance intact.
- A working website, functioning demo, or unrestricted test build available to judges through August 5, 2026 at 5:00 PM PT.
- A public YouTube demonstration under three minutes with audio, showing the working project and explaining how Codex and GPT-5.6 were used.
- Devpost category, description, public repository URL, working-access URL, video URL, and required Codex `/feedback` Session ID.
- README evidence explaining concrete Codex collaboration, acceleration, decisions, and GPT-5.6 contributions.
- Only original, synthetic, licensed, or explicitly approved content in the repository and demo.

The rule-to-evidence checklist is in [BUILD_WEEK_COMPLIANCE.md](BUILD_WEEK_COMPLIANCE.md).

## Dated work plan

### July 13 — Foundation, testable editor, and product review

- Preserve and publish the pre-event planning boundary, compliance record, license, and WEBTOON discovery notes.
- Scaffold and verify the locked stack, core model, synthetic fixture, and command contracts.
- Complete the first testable editor with canvas, minimap, synchronized layers, movement, reset, validation, and visual inspection.
- Complete Katherine's hands-on review and `/feedback` evidence.
- Lock the three composition groups and category-based Asset Library direction in documentation.
- Complete and review the composition-groups and visibility slice.
- Clarify the numbered layer-plane, episode-backdrop, opacity, irregular-panel, snapping, and overlay model from Katherine's hands-on review and visual references.
- Complete and validate the numbered layer-plane and editable-backdrop checkpoint.
- Complete and validate Episode Setup and Expandable Scroll with safe empty-plane deletion, editable title, repeatable downward extension, minimap refitting, and reset coverage.

End-of-day target: the current editor, creator-facing layer organization, and episode-setup checkpoint remain passing, with Canvas Zoom held behind a separate approval.

### July 14 — Full product-building day

- Episode Setup and Expandable Scroll is already complete; if Katherine separately approves implementation, begin **Canvas Zoom and 2D Viewport**.
- After the zoom checkpoint passes, the next separately approved follow-up is **Asset Properties and Opacity**. Do not combine them into one large slice.
- Use remaining time only for one additional bounded creator-facing slice selected from the reviewed backlog; do not begin several partially connected features.
- Keep every coherent checkpoint tested and independently understandable.
- Do not spend the full product day on deployment, video, or Devpost assembly.

### July 15–18 — Two-hour product and reliability evenings

- Continue one approved, bounded human-editor slice at a time.
- Prioritize creator-facing foundations that later features depend on; avoid OAuth, autonomous generation, production export, and other infrastructure expansion.
- Preserve navigation, minimap, selection, movement, reset, and the shared episode model after every change.
- Use one evening for regression tests and visual refinement before the submission runway.
- Stop starting new product features after July 18.

### July 19 — Two-hour public-access pass

- Configure and publish the passing static build through GitHub Pages.
- Verify the complete editor walkthrough while signed out in a clean browser.
- If Pages cannot be made reliable within the session, prepare the documented unrestricted fallback build.
- Record the verified access URL in README and `BUILD_WEEK_COMPLIANCE.md` and keep it available through August 5 at 5:00 PM PT.

### July 20 — Stabilization and submission package

- Make no feature additions.
- Fix only blocking defects, broken setup/access, failed validation, submission-evidence gaps, or essential visual cleanup.
- Verify from a clean clone or equivalent fresh checkout and re-run the full public walkthrough.
- Finalize the Devpost description and testing instructions, confirm the `/feedback` ID, and record the under-three-minute public YouTube demonstration using only original or approved material.
- Re-read the live rules and confirm no secrets, private art, unlicensed media, or unintended files are published.

### July 21 — Submit

- Complete final checklist review and registration/account checks in the morning.
- Confirm the submission name has Katherine's approval after the documented exact-name conflict review.
- Use **12:00 PM PT as the internal submission target**, leaving five hours for Devpost or access problems.
- Confirm every required link opens without special permission.
- Submit before the official **5:00 PM PT** deadline.
- Tag the exact submitted commit as `build-week-submission` and record it in the compliance evidence table.
- Preserve the submitted repository, demo, video, and access path unchanged and available through the judging period ending August 5 at 5:00 PM PT.

## Optional Build Week product slices

Work through these only in order, with separate approval and a passing checkpoint after each. Stop starting product work after July 18 so July 19–21 remain available for access, evidence, stabilization, and submission:

1. The bounded composition-groups and visibility slice defined above. **Complete.**
2. The layer-planes and episode-backdrop foundation defined above. **Complete.**
3. Episode Setup and Expandable Scroll. **Complete.**
4. Canvas Zoom and 2D Viewport. **Recommended next; not yet approved.**
5. Asset Properties and Opacity. **Separate approval required after slice 4 passes.**
6. Background color regions and a basic fade.
7. Layer-tab naming and reordering.
8. The Add rail and Asset Library shell using public-safe placeholders.
9. A safe **Add to canvas** action targeting the active numbered plane.
10. Asset-to-canvas drag if the fallback is already reliable.
11. An isolated OpenAI generate-and-place proof using only synthetic content, but only after the additional gate below is satisfied.

Stop immediately if optional product work threatens validation, the scheduled submission runway, or the minimum editor experience.

### Additional gate for the OpenAI stretch

The image-generation proof is lower priority than the human interaction stretches above. It may begin only when:

- the complete human editor story, automated validation, public access, and required submission evidence are already passing
- Katherine separately approves the network, privacy, credential, and cost implications
- a supported model-access method and secret-handling boundary have been verified and recorded; never place an API key or reusable provider token in browser code or git
- the base editor remains usable by judges without login, credits, or model access
- the proof has a strict time and spend limit and uses only synthetic prompts and references

The smallest acceptable proof is one request that produces one image candidate, records its generation provenance, adds it through the asset boundary, and places it through the ordinary episode command path. Read-only project tools may expose a normalized episode snapshot, viewport, selection, asset metadata, and prepared canvas-region preview. Do not attempt full autonomous episode creation, private-asset upload, external-service connectors, or unrestricted agent writes during Build Week.

## Deferred work

- Real asset import and project-folder design.
- Movable full-width color regions, gradients, blend modes, uploaded background imagery, and optional edge decoration. Repeatable 1280-unit downward episode/background extension is complete; shrinking, arbitrary extension amounts, and drag-to-resize height remain deferred.
- Transparency-preserving image import and preview.
- A researched starter speech-balloon library plus creator-defined reusable balloon and decorative assets.
- New-episode creation and the full File/Edit/View/Window/Help command model; native OS menus follow desktop packaging. Editing the current episode title is complete.
- Canvas Zoom and 2D Viewport remains deferred until Katherine separately approves it; incomplete zoom that clips the episode without horizontal access is not acceptable.
- Asset Properties and Opacity follows the complete zoom checkpoint and requires its own approval.
- Clip Studio-style rectangular and irregular panel masks, intentional bleed/panel breakouts, optional snapping/alignment guides, and direct corner-handle resizing.
- Persistence, save/reopen, autosave, and recovery.
- Undo/redo, rotation, crop, masks, and advanced transforms.
- Moving elements between planes or groups, including the later element-row **Move to plane** context action and its visible keyboard-accessible alternative; arbitrary nested groups; and element-order editing beyond the numbered-plane foundation.
- Production tall-master and WEBTOON slice export.
- Authenticated WEBTOON upload verification and other platform profiles.
- Desktop packaging, mobile editing, accounts, OAuth, cloud storage, collaboration, and publishing integrations.
- Full autonomous episode creation, including planning, repeated generation, continuity passes, and unattended layout changes. This is an intended product track after the human workflow, not a required Build Week feature.
- External asset-source connectors and production model-account integration. A narrowly bounded OpenAI generate-and-place proof is permitted only through the stretch gate above.

## WEBTOON discovery track

The Build Week editor can proceed without production export. Katherine completed the authenticated form-observation portion on July 13: the current UI displays 800 × 1280 px before automatic optimization, a 2 MB image threshold, 50 MB and 100 images per episode, JPG/JPEG/PNG support, and a separate 202 × 142 episode thumbnail under 500 KB. Before an export slice is approved, complete the remaining harmless unpublished upload behavior tests in [WEBTOON_REQUIREMENTS.md](WEBTOON_REQUIREMENTS.md), including exact boundary enforcement, transformation behavior, ordering, transparency, filename behavior, previews, and draft reopening.

Keep platform constraints in a data-driven export profile so a changed limit can be updated without changing the episode model or editor commands.

## Open questions for autonomous creation

These questions do not block the human MVP:

- Which officially supported credential path will ScrollSplice use for model access: a future user-authorized OpenAI connection, an app-managed server credential, or another documented method?
- What project information and reference images may be sent to OpenAI, and how will the creator preview and approve that context?
- What cost ceiling, cancellation behavior, generation history, and retry policy should each run have?
- Which actions may eventually run autonomously, and which require review until undo, recovery, and provenance are mature?
- Should external connectors ever import creator assets from services such as Drive or Dropbox, or should local import remain the only source?

Do not treat an OpenAI/ChatGPT OAuth flow used by a coding harness as automatically approved for a general web application. Verify the supported product path before choosing dependencies or designing the login UI.

## Validation path

These command contracts were verified against the July 13 foundation scaffold and must remain passing as the editor evolves:

- Setup: `corepack pnpm install`
- Run: `corepack pnpm dev`
- Unit tests: `corepack pnpm test`
- Typecheck: `corepack pnpm typecheck`
- Lint: `corepack pnpm lint`
- Production build: `corepack pnpm build`
- Editor smoke test: `corepack pnpm test:e2e`

For each UI slice, also exercise the affected user story in the running app and visually inspect it. Before submission, repeat the walkthrough through the public judge-access path from a clean browser session.

## Acceptance criteria

The Build Week submission is complete only when:

- the official checklist in `BUILD_WEEK_COMPLIANCE.md` is satisfied or each remaining item is visibly assigned and not yet due
- the project starts from documented commands and its public access path works without special permission
- the sample episode, canvas, minimap, layers, selection, movement, and reset behave as described
- all automated checks pass and the application has been visually inspected
- the repository and README clearly distinguish July 12 planning from judged July 13–21 implementation
- the public video, repository URL, access URL, category, description, and `/feedback` Session ID are ready
- private Root & Table art, secrets, required OAuth infrastructure, direct WEBTOON publishing, and production export remain outside the submission
- the human editor works without OpenAI access; any autonomous feature shown is clearly labeled as completed stretch rather than implied future behavior

## Stop rules

- The first-testable-editor `/goal`, Katherine's hands-on review, the layer-plane checkpoint, and Episode Setup and Expandable Scroll are complete. Canvas Zoom and Asset Properties and Opacity remain documented recommendations only; they do not authorize implementation, deployment, or later slices.
- Never amend, squash, delete, or force-move the `e4db897` baseline commit or `pre-build-week-planning` tag.
- Do not expand the required submission target to import, persistence, undo, resize, ordering, production export, OAuth, or autonomous creation.
- Do not begin the optional OpenAI stretch until the complete human MVP and submission path pass and Katherine approves the additional gate. An organizer reply may affect compliance priority but is not the only reason for a real future image-generation feature.
- Do not add Next.js, Tauri, dnd-kit, a backend, database, cloud service, OAuth dependency, OpenAI SDK, or WEBTOON automation during Build Week without explicit approval and a recorded decision. The OpenAI stretch gate does not silently authorize those changes.
- Do not commit private Root & Table assets, secrets, or unlicensed content.
- Do not claim visual or public-access behavior works unless it was actually inspected.
- If the outline, plan, architecture, and compliance checklist disagree, resolve the documents before coding.
