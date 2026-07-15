# ScrollSplice Decisions

## 2026-07-12: Name the product ScrollForge (superseded)

Decision: The vertical comic builder is named ScrollForge. Root & Table is its first story project and proving ground.

Reason: The tool should have a concise identity independent of a particular comic.

Consequences: Product documentation and UI should say ScrollForge; Root & Table examples should be presented as project content.

Superseded by the July 13 ScrollSplice decision below.

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

Consequences: The runtime choice must support a credible local save/open path, but that persistence can follow the initial editor milestone.

## 2026-07-12: Defer the application framework decision (superseded)

Decision: Select the framework at the start of the first implementation slice rather than in planning.

Reason: The repo is empty and the defining requirements can be expressed without prematurely committing to a stack.

Consequences: Setup, run, test, and build commands remain unverified until Slice 1 begins.

Superseded by the locked Build Week stack decision below.

## 2026-07-12: Lock the Build Week stack

Decision: Build the first ScrollSplice editor MVP as a local browser app using Node.js 22, pnpm 10, React 19, strict TypeScript, Vite 8, React-Konva/Konva, Zustand, and plain CSS. Use native pointer and drag events for Build Week. Use Vitest for unit tests, Playwright for one editor smoke test, ESLint for linting, and `tsc --noEmit` for type checking.

Reason: This stack provides the editor, canvas, shared-state, and testing primitives needed to prove ScrollSplice's defining interaction within the available Build Week hours without introducing a backend or desktop wrapper.

Consequences: Do not add Next.js, Tauri, dnd-kit, a backend, database, cloud service, or OAuth dependency during Build Week. Resolve current stable package versions when the approved scaffold begins and commit the generated `pnpm-lock.yaml`. Adding another dependency requires evidence that the current stack cannot safely satisfy the active slice.

## 2026-07-12: Render a viewport, not one giant canvas

Decision: The Konva stage represents the visible editor viewport into a larger logical episode. It must not be sized to the episode's full height.

Reason: A very tall live canvas would increase rendering cost and couple editor performance to episode length.

Consequences: The episode model stores logical coordinates. Canvas and minimap convert through one tested coordinate module, and the editor renders only the visible area plus a small buffer.

## 2026-07-12: Keep future authentication provider-neutral

Decision: Future OAuth belongs behind a provider-neutral application boundary and does not enter the editor core, episode schema, or Build Week dependency set.

Reason: Authentication identifies who may access a workspace; it does not define comic content or editing behavior.

Consequences: Provider tokens and identity records must remain outside episode documents and document commands. Do not add user IDs, OAuth fields, provider SDKs, or cloud persistence until an account-enabled slice is explicitly approved.

## 2026-07-13: Separate the Build Week MVP from the creator-ready MVP

Decision: Treat the July 21 submission as the smallest complete editor MVP and the larger import-save-edit-export workflow as the creator-ready MVP.

Reason: The shared canvas, minimap, layers, movement, and reset story is ScrollSplice's clearest product insight and can be a coherent end-to-end experience within the available week. Calling every future creator workflow a contest must-have would hide that complete story behind unfinished breadth.

Consequences: Build Week requires navigation, synchronized selection, one move command, reset, tests, public access, and submission evidence. Import, persistence, undo, resize, ordering, production export, and accounts are explicitly deferred.

## 2026-07-13: Preserve a public pre-event baseline

Decision: Record Katherine's identification of the seven original documents as July 12 planning work, first commit them unchanged on July 13 at 11:28:56 AM PT as root commit `e4db897`, and mark them with annotated tag `pre-build-week-planning` in the public `techinevolution/scroll-forge` repository. License repository source and documentation under MIT.

Reason: The event permits meaningful extensions to pre-existing work but judges only work completed after the submission period begins. An immutable no-code snapshot makes the boundary inspectable, while explicit wording avoids claiming that its July 13 Git timestamp independently proves July 12 creation.

Consequences: Never amend, squash, delete, or force-move the baseline commit or tag. All judged code and Build Week evidence must appear in later dated commits. MIT does not automatically license private, third-party, or separately identified creative assets.

## 2026-07-13: Submit in Apps for Your Life with public static access

Decision: Target the **Apps for Your Life** category and publish the passing static build through GitHub Pages. Use an unrestricted downloadable test build only if Pages cannot be made reliable in the allotted session.

Reason: ScrollSplice is a focused creator tool for an individual's real creative workflow. Public static access is the simplest way to let judges use it without accounts, backend availability, or special permissions.

Consequences: The build must be usable from the public access path, and the submitted repository, demo, video, and access path must remain available through August 5, 2026 at 5:00 PM PT. Deployment does not justify adding a backend or account system.

## 2026-07-13: Use a flat sample model and one defining edit

Decision: Use a provisional `800`-unit fixed logical width, flexible height, a flat ordered element collection, a fixed fit scale, and one document edit: moving a selected element. Provide reset. Defer zoom, panel groups, nested layers, resize, reorder, import, and undo.

Reason: This is the smallest model that demonstrates long-scroll navigation and shared selection while leaving geometry and command boundaries clean.

Consequences: The Build Week fixture contains six original story beats made from code-rendered shapes and text, with stable IDs and readable layer names. Selecting an off-screen layer centers it. The minimap is a lightweight React/CSS/SVG view rather than a second editable canvas.

## 2026-07-13: Keep sample content public-safe

Decision: Use original code-rendered shapes and text for the repository, automated tests, screenshots, public deployment, and demo video unless a specific separate asset has documented permission.

Reason: The repository and video are public submission artifacts, while Root & Table artwork is private creative material and unnecessary to prove the editor interaction.

Consequences: Root & Table remains the real product proving ground after Build Week, but its production art must not be committed or displayed publicly without Katherine's explicit approval. Do not use unlicensed music, trademarks, or copied comic material in the demo.

## 2026-07-13: Treat WEBTOON as a manual export target

Decision: ScrollSplice will prepare files for manual WEBTOON website publishing. It will not automate WEBTOON login, upload, or publishing.

Reason: Public WEBTOON guidance confirms a website publishing workflow but does not provide an approved direct-publishing integration for this project. Current public episode limits are not complete enough to hardcode with confidence.

Consequences: A later exporter uses a versioned `ExportProfile`, creates a tall master plus ordered slices, and preflights limits. Before implementing the WEBTOON profile, perform a harmless authenticated unpublished upload test and record the live constraints. Platform data stays outside the episode model and commands.

## 2026-07-13: Use Codex with GPT-5.6 as the Build Week AI contribution

Decision: Use Codex with GPT-5.6 to implement and validate ScrollSplice, and record that collaboration through dated commits, README evidence, the demo explanation, and a `/feedback` Session ID from the primary core-functionality task. Do not add a token runtime AI feature merely to imply eligibility; first obtain organizer clarification on the Stage One "required APIs/SDKs" wording.

Reason: The official event brief asks builders to create projects with Codex and GPT-5.6 and requires the submission to explain that use. ScrollSplice's product value is the editor interaction; a speculative embedded AI feature would enlarge the scope without strengthening it.

Consequences: Concrete README claims must be written from completed work, not predicted in advance. Requesting clarification is a risk-reduction action, not a submission blocker if the organizer does not reply. If the organizer says an in-product OpenAI feature is required, pause and revise the scope before implementation continues. The later autonomous-creation decision clarifies that runtime OpenAI is also a genuine future product direction, while remaining optional for Build Week.

## 2026-07-13: Keep the requested repository name but treat final branding as uncleared (superseded)

Decision: Keep the requested project name **ScrollForge** and repository slug `scroll-forge` for this documentation slice, while recording that final submission-name clearance is unresolved.

Reason: A basic public screen found multiple exact-name uses, including the active **RipSaw ScrollForge** creative-design application, a Scroll Forge browser extension, a ScrollForge PDF converter, and a `scrollforge` programming package. A public search is not legal clearance, and the creative-software overlap is meaningful enough that the submission warranty must not be assumed.

Consequences: Do not state that ScrollForge is trademark-cleared. Katherine must decide before the public video and Devpost submission whether to retain the working name after appropriate review or select a more distinctive brand. A rename would change branding and the repository slug/links, not the framework-independent editor model or architecture.

Superseded by the ScrollSplice decision below.

## 2026-07-13: Rename the product to ScrollSplice

Decision: Rename the vertical comic editor to **ScrollSplice** and rename the repository slug and local project folder to `scroll-splice` and `ScrollSplice` respectively.

Reason: Katherine delegated the replacement name with one requirement: retain “scroll.” ScrollSplice describes joining panels, assets, and story beats into one continuous episode. A July 13 basic exact-name screen found no matching software brand in general web search, GitHub repository names, npm, or PyPI.

Consequences: Current product documentation and future UI use ScrollSplice. ScrollForge remains only in historical provenance and conflict evidence. The GitHub repository becomes `techinevolution/scroll-splice`, and the Mac folder becomes `/Users/katherinephillips/Documents/ScrollSplice`. The basic name screen reduces obvious collision risk but is not legal trademark clearance.

## 2026-07-13: Build the human editor before autonomous creation

Decision: Keep the human-operated editor as the required Build Week product. After the human workflow is dependable, add an OpenAI-powered creation mode that can inspect bounded project and episode context, generate or edit comic images, add them as assets, and compose the scroll through the same document commands used by a human. A single synthetic generate-and-place proof may be attempted during Build Week only after every human MVP and submission dependency passes.

Reason: Autonomous creation is a real ScrollSplice product goal, but it depends on reliable document geometry, asset handling, placement commands, validation, recovery, and clear creative controls. Building those human-facing primitives first gives the future model safe, testable tools and prevents AI integration from obscuring the defining editor experience.

Consequences: The manual editor must work without OpenAI access. Full episode generation, repeated continuity passes, and unattended layout work follow the creator-ready human workflow. The optional Build Week proof requires Katherine's separate approval of network, privacy, credential, cost, and dependency changes and must never threaten public access or submission evidence.

## 2026-07-13: Separate model access, editor tools, and external connectors

Decision: Treat ScrollSplice account authentication, OpenAI model authorization, application-owned editor tools, and external service connectors as four separate boundaries. Use custom function tools to expose normalized project context and tested document commands to the model. Reserve connectors or remote MCP for optional external services, not for reading ScrollSplice's own episode state.

Reason: These mechanisms carry different permissions and risks. A model needs explicit editor data and actions to understand canvas layout; it does not need direct React, Konva, Zustand, filesystem, or browser access. External connectors introduce separate OAuth scopes and privacy concerns. Coding-harness Sign in with ChatGPT behavior does not by itself prove that the same OAuth flow is supported for a general web application.

Consequences: Add no OAuth or OpenAI dependency until an official supported model-access path is verified and a secure credential boundary is approved. Provider credentials never enter browser bundles, episode data, commands, logs, or git. Every future model write goes through an implemented and tested human command; generated assets carry provenance; and WEBTOON publishing remains manual.

## 2026-07-13: Push passing slices through the first testable editor

Decision: Katherine authorizes Codex to commit and push the current unpushed work and every later coherent, validated slice directly to `main` until the complete human-editor MVP is available for her hands-on product review.

Reason: Katherine is the project manager and creative director rather than the implementation reviewer. Requiring her approval for routine Git operations before a meaningful product exists creates checkpoints where she has little useful product feedback to give.

Consequences: Codex owns routine commit and push mechanics during this goal and reports each pushed checkpoint. Every pushed slice must be understandable, validated in proportion to its behavior, and free of secrets and private creative content. The authorization ends when the testable editor—workspace, canvas, minimap, layers, navigation, synchronized selection, movement, and reset—is pushed and handed to Katherine. Deployment, OpenAI integration, OAuth, external services, and work after her review remain outside this authorization unless separately approved.

## 2026-07-13: Keep the 800-unit editor width after WEBTOON form discovery

Decision: Retain ScrollSplice's fixed `800`-unit logical episode width. In the first future WEBTOON export profile, map that logical width directly to 800 output pixels and slice the flexible episode height according to the separately versioned platform profile.

Reason: Katherine's authenticated Manage Episode form observation displays automatic slicing or reduction above 800 × 1280 px, a 2 MB image threshold, 50 MB and 100 images per episode, and a separate 202 × 142 episode thumbnail. The current editor width therefore aligns cleanly without making platform pixels part of the document model.

Consequences: No Build Week canvas or interaction change is required. Import may later accept source images at other resolutions, while deterministic WEBTOON export targets gutter-aware slices no larger than the observed profile and preflights encoded bytes and count. Treat the July 13 profile as `form-observed`, not `upload-verified`, until harmless unpublished boundary tests confirm actual transformations and enforcement.

## 2026-07-13: Preserve the contest MVP after the first hands-on review

Decision: Treat Katherine's first hands-on review as validation of the defining Build Week interaction and record its additional creator features for later slices rather than adding them to the required contest build.

Reason: Minimap dragging, direct element movement, and the collapsible asset panel all worked well in the reviewed build, and no reported issue blocked the reviewer story. Background composition, transparent imports, speech balloons, episode management, snapping, and resizing are valuable product work but would widen a stable submission target before public access and evidence are complete.

Consequences: The Build Week must-haves remain unchanged, and any later approved product slice remains optional, bounded, and unable to block submission. The original public-access-first sequencing from this review was superseded later on July 13 by the product-window decision below.

## 2026-07-13: Use three fixed composition groups and a category-based Asset Library

Decision: Organize placed elements under three fixed composition groups—**Background**, **Content**, and **Foreground**—selected from controls above the story canvas. The first checkpoint lets the right Layers panel show the active group's element rows. Replace the single-purpose left Assets control with a compact **Add** rail that opens an **Asset Library** organized into Uploads, Speech Balloons, Decorations, Shapes & Frames, and eventually AI Generated.

Reason: Three broad groups use the canvas header's available horizontal space and avoid an arbitrary collection of creator-defined top-level groups. They give imported and built-in assets a predictable broad destination without introducing a complex nested tree. A category-based library accurately describes both creator uploads and free built-in elements.

Consequences: Background always renders below Content, and Foreground always renders above it. Activating a group filters organization but does not change canvas visibility. Group and individual eye controls are separate, and hiding a group preserves child eye state. Selecting an element activates its group. The Layers list scrolls independently and may collapse or overlay the canvas on narrow displays. Exact keyboard shortcuts, cross-group moves, user-created groups, actual imports, and AI-generated assets remain later decisions or slices. The direct group-to-element organization used by the first checkpoint is clarified and extended by the numbered layer-plane decision below.

## 2026-07-13: Use numbered layer planes inside fixed composition groups

Decision: Each fixed Background, Content, or Foreground group contains an ordered, open-ended sequence of numbered layer planes. A plane is an unrestricted compositing surface containing elements; it is not a prescribed story section or content type. Only Background plane 1 is special: it is pinned lowest, follows the full episode height, and supplies the editable base RGB color. Every other plane may contain any creator-chosen combination of images, text, shapes, effects, or movable color regions.

Reason: Katherine's hands-on review and comic references showed that creators need both predictable broad stacking and freedom inside it. Fixed groups keep the overall render order understandable, while numbered planes provide the flexible Photoshop/Clip Studio-style surfaces needed for background changes, characters, panels, effects, and full-scroll overlays without forcing the creator into named boxes.

Consequences: The normalized creator model is composition group -> layer plane -> element, with stable plane IDs and deterministic group, plane, then local-element order. Plane 1 is lowest inside its group, and increasing plane numbers render above lower numbers. Commit `c5f83c5` implements this as format v3 and directly updates the unsaved fixture because no user project persistence exists. Background plane 1 may be recolored or hidden but cannot be reordered or deleted. Other planes may later be renamed, deleted, and reordered within their group. Dragging ordinary numbered tabs is the intended ordering interaction, using a dedicated grip, insertion marker, stable IDs, and a visible Move Left/Right alternative; overflow arrows scroll the tab strip and never reorder it. Plane creation and selection are implemented before drag reordering so the foundation remains testable.

Each group, plane, and element has an independent eye state. Hidden elements remain selectable from Layers but do not render or capture canvas input. Every element eventually receives a separate 0–100% opacity control while preserving source alpha. Background planes after the base may hold movable long color regions; creation asks where the region begins and defaults to the current viewport. A later **Move to plane** action is available from an element-row context menu and an equivalent visible keyboard-accessible control. Irregular panel masks, breakout/bleed behavior, and optional non-constraining snapping follow after the layer, import, resize, and geometry foundations are stable.

## 2026-07-13: Use the early Build Week days for product work

Decision: Keep July 13–18 focused on bounded human-editor product slices. Reserve July 19 for public judge access, July 20 for stabilization and submission materials, and July 21 for final checks and submission.

Reason: July 13 is the first submission-period day, the testable editor was completed ahead of its original schedule, and the deadline is July 21. Moving immediately into deployment and submission assembly would waste the two full product-building days and the scheduled evening work while there is still time to improve the editor safely.

Consequences at the time: The composition-groups and visibility checkpoint and the numbered layer-plane and editable episode-backdrop foundation were completed July 13. Asset properties and opacity was then the next recommended slice, but it remained unapproved; background-region, layer-management, Add-rail, import, resize, persistence, export, deployment, and AI work remained separately gated. Stop starting new product features after July 18. Public access and submission evidence remain mandatory but must not displace the earlier product window.

The next-slice ordering in this consequence is superseded by the episode-structure and adjustable-zoom decision below. The July 13–18 product window and submission runway remain unchanged.

## 2026-07-13: Implement Episode Setup and Expandable Scroll before adjustable zoom and opacity

Decision: Complete Episode Setup and Expandable Scroll first, then keep adjustable zoom ahead of asset opacity as the next proposed creator-facing order. The implemented checkpoint makes the existing episode name editable, lets the creator extend the episode from a bottom **Add scroll space** control, keeps the minimap fitted to the complete episode, and permits safe deletion of an empty ordinary layer plane. The following zoom checkpoint would replace fixed Fit-only viewing with **Fit Width** and 50–200% zoom while preserving access to the complete canvas.

Reason: Katherine's review showed that accidental empty planes need a safe cleanup path and that creators must be able to name and lengthen the actual episode before refining individual asset appearance. Adjustable zoom is also necessary, but it changes viewport geometry and therefore follows the smaller document-structure checkpoint instead of being treated as a cosmetic percentage control. Opacity remains important after those episode and navigation foundations are dependable.

Consequences at that historical checkpoint: The implementation reused format-v3 `name` and `logicalHeight`; no format bump was needed. `setEpisodeName` accepted a trimmed, nonblank name up to 60 characters, while the inline header editor committed on Enter or blur and canceled on Escape. `extendEpisodeHeight(amount)` remained extend-only, and **Add scroll space** dispatched one centralized `1280`-unit default without moving content or the viewport. Background plane 1 derived its coverage from episode height, while the minimap independently refitted the full episode. `deleteEmptyLayerPlane` deleted only an ordinary plane with no elements—hidden elements still counted—protected the base, rejected a group's final plane, compacted that group's order, and left the nearest remaining plane active. At that point the empty-state paperclip was deliberately disabled and the editor remained fixed-fit. The following approved and completed decision supersedes those two limitations; the historical Episode Setup checkpoint and its evidence remain accurate.

The separate approval referenced above was granted in the following decision.

## 2026-07-13: Approve direct controls, safe precise height, Background color regions, and 2D zoom

Decision: Continue from the tested Episode Setup checkpoint through three separately testable local checkpoints: **A. Direct Creator Controls**, **B. Safe Precise Height and Background Color Regions**, and **C. Canvas Zoom and 2D Viewport**. Keep the coarse 1280-unit extension, add safe bottom-edge drag growth and shrinking, prioritize solid movable color regions in ordinary Background planes, and retain the pinned base as an obvious plane editable from both Layers and the canvas.

Reason: Katherine verified that empty-plane deletion works and that the minimap stays reliable after expansion, then identified the remaining friction in the actual editing flow. A permanent title pencil is unnecessary when the title itself can be clicked. Creators need to remove individual placed elements, retain a visible add path in populated planes, fine-tune excess tail space without clipping art, and layer long local background colors above the full-scroll base. Zoom remains necessary for detailed work, but it must preserve full two-axis access rather than becoming a cosmetic percentage.

Consequences: Title editing activates from the title text without permanent edit chrome. Element-row trash actions remove only placed instances. The paperclip remains available in empty and populated ordinary planes and opens the Assets drawer, where only the original code-defined swatches can place synthetic demo rectangles; this does not claim real image import, upload, or persistence. `setBaseColor` owns both Layers and canvas controls. Precise pointer and keyboard height changes clamp at a centralized 1280-unit minimum and the lowest bound of every visible or hidden element, while Background plane 1 continues to derive from episode height. Solid color regions are ordinary full-width Background elements with chosen start, length, color, selection, visibility, movement, and deletion. Checkpoint C adds transient Fit Width-relative 50–200% zoom and two-dimensional viewport geometry. This decision authorizes implementation but does not authorize a `main` push. Real uploads, asset persistence, undo, gradients, opacity, production export, deployment, OAuth, and AI remain deferred.

## 2026-07-13: Complete the local post-review checkpoints and stop for human testing

Decision: Treat Direct Creator Controls, Safe Precise Height and Background Color Regions, and Canvas Zoom and 2D Viewport as complete local checkpoints after their combined regression suite passes. Stop before Asset Properties and Opacity so Katherine can test the complete interaction set and choose the next bounded slice.

Reason: These changes now work together as one creator story: direct title and base editing, placed-element removal and synthetic demo placement, coarse and fine episode-height control, local Background color regions, and detailed two-axis viewing. Moving directly into opacity would skip the product-owner checkpoint required to confirm that the new controls feel right in the running editor.

Consequences: The local build passes 94 unit tests, strict typecheck, ESLint, production build, and an isolated Playwright Chromium walkthrough including element movement at 200% zoom. It was visually inspected at 1440 × 900, 1280 × 720, and 1024 × 768, and its public-safe state is recorded in `docs/progress/2026-07-13-creator-controls-height-and-zoom.png`. Zoom and viewport remain transient editor state; the episode model stays format v3. No `main` push, deployment, opacity, real import, persistence, export, OAuth, or AI work is authorized by this completion record.

## 2026-07-14: Show export-profile boundaries without confusing them with export

Decision: Add default-on, toggleable gray dotted candidate guides as transient editor chrome. The selected versioned `ExportProfile` supplies the geometry; the currently observed WEBTOON profile maps the 800-unit episode to 800 output pixels and therefore suggests a horizontal boundary every 1280 logical units. The guides never enter the episode document, Layers, minimap, tall master, or output files.

Reason: Creators should be able to see where ScrollSplice's provisional maximum-height plan would place a candidate cut under the observed WEBTOON dimensions and keep important lettering or art away from that seam. WEBTOON's exact automatic-slicing algorithm is unverified. A guide is useful before production export exists, but it is not a slice, an upload test, or a compatibility guarantee.

Consequences: The guide checkpoint may use the clearly labeled `form-observed` profile. Actual deterministic self-slicing remains a separate later checkpoint after harmless unpublished upload verification. That exporter will present creator-reviewed cuts, encode and preflight ordered files within the selected verified profile, and keep publishing manual. Matching known dimensions, displayed byte thresholds, formats, and counts reduces avoidable platform intervention; it cannot guarantee that WEBTOON will not recompress, resize, reformat, or otherwise optimize an accepted file.

## 2026-07-14: Approve export-aware polish and alpha controls after the second human test

Decision: Treat Katherine's second hands-on checkpoint as complete and make **Export-aware polish and alpha controls** the next implementation goal. First stabilize the title editor, full-width Background-region movement, default-on magnet behavior, and profile-derived candidate guides. Then add the two previously proposed alpha features: selected-element opacity and a basic vertical two-stop alpha fade for solid Background color regions.

Reason: Katherine confirmed that placed-element deletion, the bottom **Add asset** action, minimap behavior after expansion, and ordinary canvas movement work. She found that the title input shifts the fixed **EPISODE** label and that horizontal pointer movement makes a structurally full-width Background color region feel janky. Opacity and a restrained fade share one small compositing/property foundation and are the next useful visual controls once those interaction defects are fixed.

Consequences: The title input replaces only the title text's anchored footprint. Full-width Background color regions remain structurally `x = 0`, 800 units wide, and vertically movable; the magnet is default-on but remains visible and bypassable for ordinary alignment, not for violating that full-width invariant. General gradients, arbitrary fade angles, blend modes, masks, production export, real import, persistence, undo, deployment, OAuth, and AI remain outside this goal. After the goal passes, stop and reconcile implemented features against every remaining project-document and task request before choosing more work.

## 2026-07-14: Publish the validated post-review checkpoints

Decision: Publish the already passing Episode Setup and post-review A/B/C implementation stack, its public-safe progress evidence, and the matching documentation to the current `main` branch.

Reason: Katherine completed the required review and explicitly requested that this documented checkpoint be pushed to `main`.

Consequences: This supersedes only the earlier statements that the A/B/C stack lacked push authorization. It does not authorize deployment, production export, or pushing a future implementation checkpoint without its own applicable authorization. Do not rewrite the pre-event baseline commit or tag.

## 2026-07-14: Repair the failed polish review before opacity and bound resize to four corners

Decision: Treat Katherine's failed manual review as a corrective stop point. Complete the stable-title, live full-width Background-region constraint, visible magnet, and profile-derived candidate-guide work first, and include only the proportional four-corner resize she directly requested for selected unlocked ordinary elements. Keep the episode at format v3 and stop for her human retest before choosing whether to begin opacity and Background fades.

Reason: The reviewed build still moved the fixed **EPISODE** label, did not display the promised 1,280-unit guides or a magnet control, and let a Konva Background-region node drift horizontally during the live drag even though the document and minimap correctly retained `x = 0`. Remounting hid rather than solved that disagreement. Selected assets also lacked the expected direct corner interaction. These are visible editing-contract failures and should be repaired before adding another property system.

Consequences: The local corrective checkpoint gives title text and input one anchored footprint; derives editor-only candidate guides from a provisional `form-observed` `ExportProfile`; starts the visible center magnet enabled with an 8 CSS-pixel threshold, a temporary guide, and magnet-off or Alt/Option bypass; and constrains full-width Background regions during the live drag as well as in the document. A pure resize command updates existing bounds proportionally with a 24-logical-unit minimum, scales Text font size, rejects Background regions, rotation, and flipping, and lets the minimap follow the same committed geometry. This is not a general transform system and requires no schema bump. The checkpoint passed its local automated and visual validation; Katherine's human review remains the gate that supersedes the earlier automatic D-then-E sequence. Element opacity and Background fades remain unstarted, and remote `main` remains at `6d6437e` until a later push is separately authorized.

## 2026-07-14: Make Background color regions freely transformable with live shared previews

Decision: Supersede the structural `x = 0`, fixed 800-unit width, vertical-only movement, and no-resize rules for Background color regions. A new region still starts full width, but thereafter its `x`, `y`, `width`, and `height` are freely editable. It uses eight independent handles, participates in the default-on center magnet, and supports Magnet Off or Alt/Option bypass. During drag or resize, transient logical bounds drive the status `x/y/w/h` and minimap; one pure command commits at gesture end.

Reason: Full width is a useful starting convenience, not a creative restriction. Katherine wants Background planes to remain unrestricted surfaces, and a canvas-only transform is misleading when the numeric status and minimap do not preview the same result before release.

Consequences: Ordinary shapes/text retain four proportional corner handles, while Background regions use four corners plus four sides with ratio locking off. The episode remains format v3 because bounds already exist. Transient `liveElementBounds` stays application state rather than durable document data; clearing or canceling a gesture discards it. The earlier fixed-width decisions and their validation evidence remain accurate historical checkpoint records but are superseded for current behavior. Rotation, flipping, crop, perspective, opacity/fades, export, and persistence remain outside this correction. The latest build passes 123 unit tests, strict typecheck, ESLint, production build, the expanded Chromium walkthrough, and supported-size visual inspection; Katherine review and any push remain separate gates.

## 2026-07-14: Accept corrective checkpoint D with notes and add bounded local history/save/menu foundations

Decision: Mark the superseding free-transform corrective checkpoint **PASS WITH NOTES** after Katherine confirmed live coordinates, minimap synchronization, eight Background-region handles, snap override, and Option-drag. Treat the minimap's visible aspect distortion as later polish. Next, implement one optional creator-workflow slice: a 100-checkpoint application history, one explicit versioned local-browser save slot, automatic opening of the last explicit save after reload, confirmed-discard Reopen, a blank 800 × 1,280 format-v3 New Episode, and only **File > New Episode / Save / Reopen** plus **Edit > Undo / Redo**. Support `Mod+S`, `Mod+Z`, `Mod+Shift+Z`, and `Ctrl+Y` without taking native undo from text fields.

Reason: The corrective editing contract is now dependable enough to protect meaningful creator work. Undo/redo and one clear save/reopen path reduce the largest remaining risk in testing longer workflows, while a deliberately narrow menu surface avoids pretending that a full desktop project system exists. Keeping this optional preserves the already complete contest MVP and leaves the later file, asset, cloud, account, and export decisions separate.

Consequences: Every implemented episode-document mutation uses one bounded history path: element and layer-plane creation/deletion, movement, resize, title, coarse and precise height, element/plane/group visibility, and base color. A bottom-edge pointer drag is one history step; selection, viewport, zoom, open panels, magnet/guides, and live previews are transient. Save persists only a validated format-v3 episode in `scrollsplice.project.last.v1`; it does not autosave or include history, editor state, or binary assets. Reopen and New Episode clear history/transient context, and New Episode keeps the prior saved slot available. Corrupt or unsupported data is reported rather than rewritten. The slice explicitly excludes autosave, recovery, file pickers, a multi-project library, imported binary persistence, native OS menus, cloud/account sync, and a migration framework. It passes 154 unit tests, strict typecheck, ESLint, production build, two Playwright Chromium tests, supported-size visual inspection, and the public-safe `docs/progress/2026-07-14-local-save-and-history.png` capture. Katherine's hands-on review and any push remain separate gates.
