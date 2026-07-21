# ScrollSplice Plan

## Current state

ScrollSplice is a public Build Week repository and working local editor at <https://github.com/techinevolution/scroll-splice>. Katherine identified seven documents as July 12 pre-event planning work under the earlier ScrollForge name. They were first committed unchanged on July 13 at 11:28:56 AM PT in commit `e4db897` and marked by annotated tag `pre-build-week-planning`. The owner-attested baseline contains no application code; the Git timestamp records preservation on July 13 rather than independently proving the July 12 creation date.

Post-start documentation/compliance work is recorded in commit `a567865` at 11:50:26 AM PT on July 13. Later on July 13, Katherine approved the scaffold and synthetic fixture, then approved one larger `/goal` through the first complete editor she could test. The locked scaffold, verified command contracts, original six-beat synthetic fixture, editor shell, and defining canvas/minimap/layers interaction are complete and pushed. After her product review, Katherine approved and Codex completed the bounded composition-groups and visibility checkpoint in `f02776f` and the numbered layer-plane and editable-backdrop checkpoint in `c5f83c5`.

Available work time is roughly 26 hours: full workdays July 13–14, about two hours each evening July 15–19, a stabilization buffer July 20, and submission July 21. July 13 covered provenance, rules, discovery, repository setup, the foundation, and the interaction work originally scheduled through July 16. Katherine completed the first hands-on review and `/feedback` that day. That historical review found no blocking defect in the defining MVP interaction, leaving the remaining July 13–18 product window available for bounded creator-facing slices without changing the minimum submission contract.

Katherine approved **Episode Setup and Expandable Scroll**, and Codex completed and validated that checkpoint locally on July 13. In her follow-up test she confirmed that empty-plane deletion works and that the minimap remains dependable after repeated episode expansion. She then authorized one multi-slice work request, kept as three separately testable checkpoints: **Direct Creator Controls**, **Safe Precise Height and Background Color Regions**, and **Canvas Zoom and 2D Viewport**. All three were implemented and validated locally on July 13.

Katherine completed the required hands-on test of that combined build on July 14. She confirmed placed-element deletion, the bottom **Add asset** action, expanded-height minimap behavior, and ordinary canvas movement. She then failed the first proposed polish review because title editing still shifted the fixed **EPISODE** label, the 1,280-unit dotted guides were not present, full-width Background regions could drift sideways in the live Konva node while the document and minimap stayed at `x = 0`, no visible magnet existed, and selected assets had no corner resize handles.

Katherine completed the corrective checkpoint's human retest on July 14 and marked it **PASS WITH NOTES**. Live `x/y/w/h`, live minimap synchronization, eight Background-region handles, magnet-off/Alt/Option snap override, and Option-drag passed. The minimap's visual aspect distortion is recorded as non-blocking polish. She then approved the local history, explicit save/reopen, blank New Episode, and minimal File/Edit menu slice below. That slice passed its automated and browser checks, screenshot review, and Katherine's July 15 hands-on test. She then authorized the bounded Asset Library slice and publication of the resulting passing build to `main`. The complete stack was published and verified in `fdd4ead37e7071bc7c69c9c4d8b49c557ddd95d7`; the July 15 menu/rail correction was later published in `3ec9bd095fab5ba2fb19f9d97cfeb79fcdbceae5`. Katherine then selected the five-slice direct-placement and appearance `/goal` below. It was implemented, validated, and published in `7768daa0617b66c696f769d97dd531f9029272c8`. On July 15 she authorized the three-slice **creator completion pass** below: composition ordering, independent text, and Reader Preview with a safe Reset Demo boundary. All three slices were implemented, validated, and published in `cb1f28443f7b1045d139879a2bba7b03edf25856` on July 16, with local and remote `main` verified equal immediately after the push.

## Completed human-editor goal and current submission gate

On July 16 Katherine replaced the earlier three-slice stopping point with one broader instruction: continue through the documented human-editor backlog and make ScrollSplice as complete as practical before preparing the feature-by-feature test sheet. That locally feasible human-editor goal is now complete. Its original boundary did **not** authorize external services, private-data transfer, a new runtime stack, OAuth, or unvalidated claims. Katherine separately approved the isolated local Codex App Server companion on July 20 under the narrower credential, privacy, tool, and synthetic-data limits recorded below.

Implementation status in the current working build:

1. **Visible workspace polish — implemented:** repaired starter-balloon seams, proportional minimap presentation, a collapsible/overlay inspector, and useful Window/Help surfaces.
2. **Complete asset intake and library management — implemented:** operating-system image drop, canvas/plane/Layers targets, creator-category rename/delete/reorder, and guarded source rename/move/replace/delete across current and durable references.
3. **Recoverable and portable project state — implemented:** debounced crash recovery distinct from explicit Save, multiple local projects, Save As/Open Local, and portable `.scrollsplice` import/export containing unchanged reusable asset blobs.
4. **Editing transforms and organization — implemented:** edge/center/nearby-element snapping, rotation, flip, lock, exact geometry/alignment, multi-selection, flat non-nested grouping, populated-plane move/delete paths, and atomic 128-unit story-beat movement. During grouped pointer movement, only the primary member has live status/minimap preview; followers update together at the final atomic commit on release.
5. **Panels, crop, and intentional overflow — implemented as bounded presets:** rectangle/rounded/slant-left/slant-right/diamond image masks, Cover focus/zoom, optional mask-following frame border, and constrained or final-output-clipped **episode-edge** bleed. A masked image remains clipped to its frame. First-class panel breakout is not implemented; the current manual workaround is a separate duplicated unmasked overlay. Arbitrary point editing remains outside this build.
6. **Text and speech-balloon composition — implemented:** independent editable Text elements plus ten empty editable balloon body types with fill/outline, resize, tail controls, and draggable normalized contour points. Older saved format-v6 balloons with embedded text still render for compatibility. Multiple tails, linked balloons, and creator template saving remain outside this build.
7. **Local render/export proof — implemented provisionally:** tall master, creator-reviewed deterministic PNG/JPEG slices, observed-profile preflight, and explicit **not upload-verified / manual upload** labeling.
8. **Reliability and handoff — complete:** the July 21 release passes 419 Vitest cases across 34 files, 11 local-companion protocol/security checks, strict typecheck, ESLint, production build, and all 24 Playwright Chromium stories. The editor, Reader Preview, provisional export, matched dark/light release, and disconnected Agent screenshots are indexed, and [Feature Test Sheet](FEATURE_TEST_SHEET.md) records Katherine's review.

The completed human-editor goal still excludes production ScrollSplice accounts, cloud sync, external connectors, desktop packaging, automated WEBTOON login/upload/publishing, and any use of private Root & Table material. The separately approved local companion is the sole current exception for creator-controlled OpenAI authorization and bounded runtime model access; it does not authorize a cloud backend or broader autonomous infrastructure. Public deployment and Devpost evidence remain scheduled work rather than editor features.

### Implemented bounded format-v6 direction

The current build advances the episode document from format v5 to a bounded format v6 covering only:

- common transform and protection fields for rotation, horizontal/vertical flip, and lock
- richer but explicit appearance data needed by cover/crop and the approved local render path
- image-frame data with rectangular or normalized polygon masks plus separately controlled episode-edge overflow; masks themselves still clip their image content
- flat, non-nested element-group records that associate member element IDs for selection and movement
- one editable speech-balloon element containing body type/style, optional normalized contour points, and tail data; new balloons use independent Text lettering while older embedded text remains compatible

Existing v3/v4/v5 documents open with deterministic v6 defaults; unknown future formats fail safely. Format v6 does not create arbitrary nesting, a generic scene graph, a plugin schema, or a broad migration framework.

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

## Creator-ready feedback recorded July 13–14

These requests refine the intended product without enlarging the required contest MVP. July 13 items were product direction unless a later checkpoint explicitly approved them. The July 14 corrections are captured in reviewed checkpoint D and the local history/save/menu slice; the July 15 Asset Library, rail/menu polish, and bounded direct-placement and appearance goal are published. Export remains separately gated.

- combine a solid RGB base, an uploaded background image, and optional decorative edges in one independently editable background treatment
- let the episode and background extend downward through an editor-only **+ Add scroll space** control at the logical bottom of the story canvas; each activation uses one centralized default increment of 1280 logical units
- preserve transparency in imported and placed images
- provide a researched starter library of resizable comic speech balloons while allowing creators to add their own reusable balloon and decorative assets
- make the current episode title editable in the header, with **File > New Episode** following later
- use a familiar File, Edit, View, Window, and Help command model, with native operating-system menus deferred until desktop packaging exists
- add default-on center/edge/nearby-element snapping behind a visible magnet toggle, with an intentional off or temporary-bypass path
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
- let the creator remove a placed element from its Layers row through a trash action beside its eye; this removes only that episode instance, not its reusable source asset
- keep a clear add-element affordance available below the active plane's list whether the plane is empty or populated; the paperclip may open the Asset Library and place only code-defined synthetic demo swatches until real image import is separately approved
- make the episode title text itself the edit target, with no permanent pencil and no input border or cursor until the title is clicked
- keep Background plane 1 easy to find and editable from both its Layers inspector and a direct canvas-side color control backed by the same command
- retain the coarse 1280-unit **Add scroll space** action while adding a bottom drag handle for precise growth or safe removal of unused tail space; shrinking must stop before any visible or hidden element would be clipped
- replace the fixed fit-only view later with **Fit Width** plus 50–200% zoom, horizontal access above fit, center-preserving zoom changes, and an accurate two-dimensional minimap viewport box
- later provide **Move to plane** from an element-row context menu plus a visible keyboard-accessible action; right-click must not be the only route
- add Clip Studio-style rectangular and irregular panel masks later, with optional snapping that never prevents intentional asymmetry, bleed, or panel-breakout effects
- keep the fixed **EPISODE** label anchored when title editing activates; the input replaces only the title's visual footprint and must not shift the header
- show default-on, toggleable gray dotted candidate slice boundaries from the selected export profile; for the observed WEBTOON mapping, draw a horizontal guide every 1280 logical units across the 800-unit episode
- keep planning guides as editor chrome that follows pan and zoom but never enters the episode document, minimap, tall master, or exported images
- create Background color regions full width by default, then let creators freely edit `x`, `y`, `width`, and `height`; apply the default-on center magnet with the same off/Alt/Option bypass used for intentional asymmetry
- add deterministic creator-reviewed self-slicing later so ScrollSplice can control cut positions and preflight output before manual WEBTOON upload, while making no promise that WEBTOON will avoid recompression or optimization
- provide bounded undo/redo for every currently implemented episode-document mutation, one explicit local-browser save slot, page-reload restoration of the last explicit save, confirmed-discard Reopen and New Episode actions, and only the requested File/Edit commands and shortcuts

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

**Status:** approved, implemented, validated, and visually inspected locally July 13; published with the post-review stack on July 14 through `8a493a2`.

**Goal:** make the current episode easier to set up and extend without introducing persistence, arbitrary resizing, or a new document format.

Must-have work:

- Give an empty ordinary plane two centered, keyboard-accessible, same-size Layers actions: a working trash-can **Delete** action and a disabled paperclip **Attach asset** placeholder. The placeholder communicates the future destination without pretending that import exists.
- Permit deletion only for an ordinary plane with no referenced elements. Hidden elements still count as content, so hiding an element never makes its plane deletable.
- Never delete Background plane 1, never leave a composition group with zero planes, and select the nearest surviving plane after deletion, preferring the previous plane when both sides exist.
- Compact the surviving display order while preserving every surviving plane's stable ID.
- Make the episode title editable in the existing header. Enter or blur commits, Escape cancels, blank or whitespace-only text is rejected, and the input is capped at 60 characters for WEBTOON-compatible episode-title entry.
- Add an editor-only **+ Add scroll space** control at the logical bottom of the story canvas. It is workspace chrome, not episode content and not part of eventual export.
- Extend only downward by a centralized default of 1280 logical units per activation. Do not scatter that number through components, and do not add shrinking or arbitrary-height entry in this slice.
- Keep the current logical viewport position stable when space is added. At this historical checkpoint, the pinned base followed the new document height and the fixed-size minimap refit the entire episode; the later selected design supersedes that presentation with a larger scrollable minimap surface and followed viewport frame.
- Make reset restore the fixture title, original episode height, original planes, active plane, selection, visibility, base color, and viewport.

Acceptance:

- a newly added empty ordinary plane can be deleted from the centered action, while the base plane, a populated plane, and the final plane in a group cannot be deleted
- hidden elements prevent deletion just as visible elements do
- deletion leaves all surviving IDs and content intact, closes the numbering gap, and activates the nearest survivor
- the header title supports commit and cancel behavior, rejects blank text, enforces the 60-character cap, and reset restores the fixture title
- each add-space activation increases the logical height by exactly the centralized 1280-unit default without moving existing elements or jumping the viewport
- the base continues through the extended area and the minimap updates the full new height with correct click, drag, and viewport-box behavior; the current release presents that full surface through a larger scrollable window
- existing canvas navigation, selection, movement, visibility, plane overflow, and reset behavior remain passing
- focused unit/store coverage, typecheck, lint, production build, Playwright, and visual inspection at the supported desktop sizes pass

Excluded: episode shrinking, arbitrary extension amounts, drag-to-resize canvas height, **File > New Episode**, persistence, canvas zoom, horizontal viewport state, opacity, background color regions or fades, tab rename/reordering, Move Left/Right ordering commands, deletion of populated planes, undo, the Add rail, imports, resize handles, export, deployment, submission media, OAuth, and AI.

Validation passed: 63 unit tests, strict typecheck, ESLint, production build, and one isolated Playwright Chromium walkthrough. The running interface was visually inspected at 1440 × 900, 1280 × 720, and 1024 × 768. The public-safe checkpoint is [preserved in the progress record](docs/progress/2026-07-13-episode-setup-and-expandable-scroll.png).

## Completed local multi-slice work request: post-review creator controls

**Status:** authorized, implemented, and validated locally July 13 as three coherent checkpoints, then tested by Katherine on July 14. The combined build passes 94 unit tests, strict typecheck, ESLint, production build, and one isolated expanded Playwright Chromium walkthrough, including element movement at 200% zoom. It was visually inspected at 1440 × 900, 1280 × 720, and 1024 × 768. The public-safe result is [preserved in the progress record](docs/progress/2026-07-13-creator-controls-height-and-zoom.png). Katherine explicitly authorized publishing this passing stack and its documentation to `main` on July 14.

### Slice A — Direct Creator Controls

**Status:** complete locally July 13.

**Goal:** remove unnecessary indirection from the controls Katherine is already using and make the active plane useful whether it is empty or populated.

Must-have work:

- Make the displayed episode title itself the click target. Keep it ordinary text until clicked, then show the existing validated inline input. Remove the permanent pencil; retain Enter/blur commit, Escape cancel, blank rejection, and the 60-character limit.
- Keep Background plane 1 as a visible dedicated plane. Its existing Layers **Base color** control remains, and activating that base also exposes a compact direct canvas-side color control. Both dispatch the same `setBaseColor` command and are editor chrome rather than episode content.
- Add a small trash action beside each element eye in the active plane list. It removes only the placed episode element, never its reusable source asset or another plane's content.
- Keep the paperclip affordance available in every ordinary active plane, including populated planes. It opens the existing Asset Library, whose original code-defined swatches place a synthetic demo rectangle into the active ordinary plane. This proves the add path without claiming real file import, upload, persistence, or a reusable asset repository.
- Keep safe empty-plane deletion in the empty state and preserve all existing protection rules.

Acceptance:

- clicking the title enters edit mode without a persistent pencil, border, or text cursor before the click
- the Layers and canvas base-color controls remain synchronized and update both canvas and minimap
- deleting an element removes the correct placed instance and leaves its plane, unrelated elements, selection, ordering, and shared fixture data coherent
- the paperclip opens the Asset Library in empty and populated ordinary planes, and choosing a code-defined swatch places one synthetic demo rectangle in the active plane without claiming real image import
- existing plane deletion, title validation, navigation, selection, movement, extension, minimap, and reset behavior remain passing

Excluded: real image attachment/import, source-asset deletion, undo/redo, persistence, opacity, resize handles, tab reordering, export, deployment, OAuth, and AI.

### Slice B — Safe Precise Height and Background Color Regions

**Status:** complete locally July 13.

**Goal:** let a creator fine-tune unused scroll length and paint long movable sections of the episode backdrop without clipping story content or turning Background planes into fixed roles.

Must-have work:

- Retain **Add scroll space** as the fast 1280-unit action, and add a distinct bottom-edge drag handle for precise height adjustment.
- Convert the pointer drag through shared logical-coordinate helpers. Allow growth and shrinking of unused tail space, but clamp the minimum to the lowest content bound across every plane; hidden elements and color regions count. Never move, crop, or delete content to satisfy a shrink request.
- Keep the current viewport valid as height changes, let the pinned base follow the resulting document height, and update the complete minimap surface continuously or immediately after commit. The current larger preview is vertically scrollable and follows the active viewport rather than fitting the entire episode onscreen at once.
- At this historical checkpoint, introduce a solid full-width color-region element for ordinary Background planes. Creation accepts a color, vertical start, and length, defaults the start from the current viewport, remains vertically movable, and participates in normal selection, visibility, ordering, deletion, minimap, and height-safety rules. The later free-transform correction supersedes the fixed-width/vertical-only behavior without changing this checkpoint record.
- Keep each color region independent from pinned Background plane 1. The base remains a full-scroll fallback; ordinary regions provide local color changes above it and below Content.

Acceptance:

- dragging the bottom handle down adds only the requested amount, while dragging up removes only unused tail space
- a shrink request cannot pass the bottom of any visible or hidden element and never changes element coordinates
- repeated coarse additions and precise adjustments keep canvas, base, viewport, and minimap in agreement
- an ordinary Background plane can hold a long solid color region with a chosen vertical start, length, and color, then move it, hide it, select it from Layers, and delete the placed region
- fixed group and plane ordering keep the region above the base and below Content without a special hardcoded renderer path

Excluded: gradients, blend modes, opacity, uploaded background photos, source-asset import, arbitrary panel masks, undo, persistence, export, deployment, OAuth, and AI.

### Slice C — Canvas Zoom and 2D Viewport

**Status:** complete locally July 13.

**Goal:** make the story canvas adjustable without changing episode geometry or allowing zoomed content to become unreachable.

Must-have work:

- Keep **Fit Width** as the default and add explicit 50–200% view controls.
- Preserve the current logical center as closely as clamping permits when zoom changes.
- Add horizontal viewport state and input so the creator can reach the entire 800-unit episode whenever zoom makes it wider than the visible stage.
- Extend the centralized coordinate helpers and minimap viewport representation to both axes; the minimap box must accurately show the visible logical rectangle at every supported zoom.
- Keep zoom and viewport position as transient editor state. They must not alter episode dimensions, element coordinates, or eventual export geometry.
- Preserve selection, dragging, height adjustment, color regions, wheel/keyboard navigation, minimap click/drag navigation, title editing, visibility, and reset behavior.

Acceptance:

- Fit Width restores the complete episode width and the default centered horizontal position
- 50%, 100%, and 200% views render predictably, preserve the logical center when possible, and never strand content outside available navigation
- element selection and movement remain accurate at non-default zoom values
- the minimap viewport box reports both horizontal and vertical visible bounds and remains a reliable navigation control
- reset restores the documented default fit and viewport
- focused coordinate/store coverage, typecheck, lint, production build, Playwright, and visual inspection at the supported desktop sizes pass

Excluded: opacity, general element resize handles, snapping, canvas rotation, plane renaming/reordering, real imports, persistence, export, deployment, submission media, OAuth, and AI.

## Completed corrective checkpoint: stable editing, guides, and bounded corner resize

**Status:** the original fixed-width D checkpoint passed 120 unit tests, strict typecheck, ESLint, production build, one isolated expanded Playwright Chromium walkthrough, and visual inspection at 1440 × 900, 1280 × 720, and 1024 × 768. Katherine then superseded its Background-region contract. The free-transform extension passes 123 unit tests, strict typecheck, ESLint, production build, the expanded Chromium walkthrough, and supported-size visual inspection. Katherine's July 14 retest is **PASS WITH NOTES**: live coordinates, live minimap sync, eight handles, snap override, and Option-drag passed; minimap aspect distortion remains later polish. These were local-only at that checkpoint and were later incorporated into the July 15 stack published in `fdd4ead`.

This checkpoint repairs the failed manual-review findings without folding in the later alpha system:

### D. Stable editing chrome, candidate slice guides, and direct corrective resize

- Keep the fixed **EPISODE** label and surrounding header controls on stable anchors. When title editing activates, replace only the title text's footprint with a tightly sized input; do not move the label or reset control.
- Preserve full width only as the Background color region's creation default. Thereafter its `x`, `y`, `width`, and `height` are ordinary editable geometry: it moves freely on both axes and resizes width and height independently.
- Keep the clearly visible magnet control enabled by default. When any movable element, including a Background color region, comes within 8 CSS pixels of the episode centerline, snap its horizontal center and show the temporary vertical guide. **Magnet Off** or Alt/Option during that drag bypasses the snap. Edge-to-edge and nearby-element snapping remain later work.
- Add default-on, toggleable gray dotted horizontal candidate guides derived from the selected versioned export profile. For `webtoon-canvas-2026-07-13-observed`, map 800 logical units to 800 output pixels and place interior candidates at `y = 1280, 2560, ...` while the value remains below the episode height.
- Keep the guides aligned through pan, zoom, height changes, and reset. They are editor overlays only and must not appear in the episode document, Layers, minimap, tall master, or exported files.
- Keep four proportional corner handles for selected unlocked ordinary shapes/text. Give a Background color region eight handles—four corners and four sides—with `keepRatio` disabled so width and height change independently. Clamp valid bounds inside the episode, retain the 24-logical-unit minimum, and keep rotation/flipping disabled.
- During every move or resize, publish transient logical bounds so the status bar's `x/y/w/h` and minimap preview update before release. Do not rewrite the episode document on every pointer event; one pure `moveElement` or `resizeElement` command commits at gesture end, and clearing/canceling the gesture removes the preview.

Acceptance:

- activating, committing, canceling, or blurring title editing causes no header shift
- a newly created Background color region starts full width, then moves freely on both axes and resizes width/height independently from eight handles
- the magnet defaults on; browser coverage proves the 8-pixel center snap for an ordinary element and a Background region plus Magnet Off and Alt/Option bypass; toggling it never changes document geometry by itself
- candidate guides appear at the correct logical boundaries at every supported zoom and can be hidden without changing the document
- selected unlocked ordinary shapes/text retain four proportional corner handles, while Background color regions expose eight independent handles; both respect the 24-unit minimum and episode bounds
- status `x/y/w/h` and minimap geometry follow transient bounds during drag/resize, then agree with the one command committed at gesture end
- title, movement, deletion, height, zoom, minimap, selection, placement, visibility, and reset regressions remain passing

## Completed optional slice: local history, save, and minimal menus

**Status:** approved July 14, implemented and validated locally, then passed Katherine's hands-on review July 15 and was published with the Asset Library stack in `fdd4ead`. Evidence: 154 unit tests, strict typecheck, ESLint, production build, two isolated Playwright Chromium tests (the complete editor walkthrough plus save/reload/reopen/New Episode), visual inspection at 1440 × 900, 1280 × 720, and 1024 × 768, and one indexed public-safe screenshot. This is optional creator-workflow progress, not an expansion of the required contest MVP.

### Contract

- Keep one application-owned history of at most 100 checkpoints. Undo/redo covers every currently implemented episode-document mutation: element and plane creation/deletion, element move/resize, element/plane/group visibility, base color, title, coarse extension, and precise height changes. A bottom-edge pointer drag is one history step even though its live preview emits many updates.
- A new document edit after Undo clears Redo. Selection, viewport, zoom, drawer state, magnet/guide visibility, and live pointer previews do not create history entries.
- At the July 14 history/save checkpoint, Save wrote the validated format-v3 episode document to one versioned local-browser slot. **Save** remained explicit with no autosave, and startup opened a valid last save after reload. The Asset Library slice upgraded writes to format v4, and the published appearance goal advances current writes to format v5 while preserving supported v3/v4 opening. The slot remains tied to one browser profile and site origin; clearing site data or changing profile, browser, or origin loses access to it.
- **Reopen** restores the last explicit save and clears history/transient editing context. Ask before discarding unsaved changes.
- **New Episode** creates an unsaved **Untitled Episode** with a stable ID, 800 × 1,280 logical geometry, a pinned white Background base, one ordinary Background plane, one Content plane, one Foreground plane, and no elements. Ask before discarding unsaved changes, clear history, and retain the previous saved slot so Reopen can still recover it.
- Show only **File > New Episode / Save / Reopen** and **Edit > Undo / Redo**. These are accessible in-app browser menus, not native operating-system menus.
- Support `Mod+S`, `Mod+Z`, `Mod+Shift+Z`, and `Ctrl+Y`; title/input fields keep their native undo/redo behavior. Show clear dirty, saved, reopened, new-document, and storage-error status.
- Reject corrupt or unsupported saved data without crashing, deleting it, or silently coercing it. Fall back to the public-safe fixture when startup cannot open a valid save.

### Acceptance

- focused unit tests prove each required history category, the 100-checkpoint cap, redo invalidation, saved-revision dirty tracking, one-step height drag, blank-document invariants, save round-trip, and corrupt/unsupported/unavailable storage behavior
- the File and Edit menus expose exactly the requested commands, disabled states are accurate, keyboard and pointer navigation work, and destructive lifecycle actions ask only when unsaved work exists
- one isolated browser story saves a changed episode, reloads the page into that exact save, makes a later edit, reopens and restores the save, creates a blank episode, then reopens the retained save again
- existing canvas, minimap, layers, title, movement, resize, height, visibility, placement, snapping, guide, and reset regressions remain passing
- typecheck, lint, unit tests, production build, Playwright, a public-safe screenshot, and supported-size visual inspection are recorded before handoff

Explicitly excluded: autosave, crash recovery, file picker or downloadable project files, a multi-project library, imported binary-asset persistence, native macOS/Windows menus, cloud/account sync, migration infrastructure, production export, OAuth, OpenAI runtime work, and AI.

## Completed creator slice: simple persistent Asset Library

**Status:** implemented, validated, and published July 15 in `fdd4ead37e7071bc7c69c9c4d8b49c557ddd95d7`; local and remote `main` matched immediately after the push. Evidence: 214 unit tests across 11 files, strict typecheck, ESLint, production build, four Playwright Chromium stories, overlay checks at 1440 × 900, 1280 × 720, and 1024 × 768, plus the indexed public-safe Asset Library screenshot.

### Contract

- Replace the one-button synthetic drawer with a fixed Add rail for **Uploads**, **Speech Balloons**, **Decorations**, and **Splatters**. Keep **All**, **Unsorted**, and creator-named categories inside Uploads so an unbounded list cannot overwhelm the rail.
- Use an overlay drawer with an honest current-plane target, loading/error/empty states, a close action, and a compact thumbnail grid. Opening it must not permanently reduce the canvas width.
- Supply a small original starter set of neutral, transparent code-rendered SVG speech balloons, decorations, and splatters. At this historical Asset Library checkpoint the balloon set was visual artwork only; the later format-v6 completion pass adds a separate atomic editable balloon with fitted text/tail/style controls.
- Import PNG, JPEG, and WebP files into a local browser asset repository without modifying the source bytes. Preserve source alpha. Reject unsupported, malformed, or undecodable files clearly. Parse PNG/JPEG/WebP header dimensions, then decode and confirm the declaration without applying WEBTOON output limits to authoring sources. Category and import mutations use one atomic IndexedDB read-transform-write transaction so concurrent tabs merge against the latest snapshot; the initiating tab refreshes from the returned saved categories and sources. This current intake rule supersedes the historical Build Week 20 MiB/40-megapixel safety cap; WEBTOON constraints remain export-profile data.
- Let creators create named local categories and import an image into the selected category. Inside **Uploads**, **All** shows every stable source ID, **Unsorted** owns uncategorized sources, and creator categories filter without duplicating files.
- Add a real image element with a stable source reference. Clicking an asset places one proportional instance in the active ordinary plane, centered in the current viewport; the existing move, eye, trash, undo/redo, minimap, Layers selection, and proportional four-corner resize behavior applies. If an extreme source ratio cannot fit inside the episode while keeping both axes at least 24 logical units, refuse placement clearly instead of distorting it.
- At this completed Asset Library checkpoint, keep the source library in IndexedDB and the explicit episode-layout save in the existing localStorage slot. That checkpoint stored format-v4 episode data and stable asset IDs and added one explicit v3-to-v4 load upgrade. The later published appearance goal supersedes current writes with format v5 while preserving both supported older formats.
- Surface an honest missing-source placeholder instead of crashing if site data is partially cleared. Source deletion, category rename/delete/reorder, and drag-to-place remain outside this slice.

### Acceptance

- each built-in category can place an original asset into the active ordinary plane; the element appears in canvas, minimap, Layers, selection, movement, deletion, undo/redo, and proportional resize
- one synthetic transparent PNG upload preserves alpha, appears in Uploads and its creator category, can be placed more than once without duplicating source bytes, and survives page reload through IndexedDB; the browser story proves alpha by comparing rendered opaque and transparent halves against sampled underlying canvas pixels
- the uploaded image can be resized proportionally, undone and redone as separate creation/resize history steps, explicitly saved, and restored at the resized geometry after reload and Reopen
- concurrent category/import updates merge atomically, refresh the initiating tab from the returned saved snapshot, and do not discard a second tab's saved sources
- File Save plus reload/Reopen restores the placed image element and resolves its stable source; New Episode retains the reusable local library
- existing format-v3 local saves load as format v4, while corrupt/unknown versions still fail safely
- the open overlay remains usable at 1440 × 900, 1280 × 720, and 1024 × 768 without hiding the full-height inspector or permanently shrinking the canvas
- focused model, command, repository, store, and Chromium stories pass alongside typecheck, lint, the complete unit suite, production build, visual inspection, and a public-safe screenshot

Explicitly excluded: text inside balloons, balloon-tail editing, recoloring, opacity, crop, rotation, flip, asset-source deletion, category rename/delete/reorder, drag-to-canvas or Layers drop, Shapes & Frames, imported SVG/GIF/HEIC, autosave, portable project files, production export, cloud/account sync, OAuth, OpenAI runtime work, and AI-generated assets.

### July 15 post-review UI polish

**Status:** implemented, browser-validated, and published July 15 in `3ec9bd095fab5ba2fb19f9d97cfeb79fcdbceae5`; local and remote `main` matched after the push.

- Keep File, Edit, and future application menus above the Asset Library and all other workspace overlays.
- Render **Decor** in the narrow rail while preserving **Decorations** as the accessible name, drawer heading, and category identity.
- Clicking the currently open category again closes the drawer; clicking another category still switches it.
- Preserve Katherine's pass on real upload, placement, alpha, and proportional resize.
- Record the visible white seam in the original Oval and Rounded balloon outline artwork as later built-in replacement/polish; do not expand this correction into asset generation.

Acceptance: a Chromium story hit-tests and clicks **File > Save** over the open drawer, proves the **Decor** label remains within its 58-pixel button, and proves the active category toggles closed. A fresh public-safe 1440 × 900 screenshot shows the corrected layering and compact label without Katherine's uploaded art.

## Published `/goal`: direct placement and foundational appearance

**Status:** implemented, validated, and published July 15 in `7768daa0617b66c696f769d97dd531f9029272c8`. The complete validation is 255 unit tests across 13 files, strict typecheck, ESLint, production build, focused drag/appearance Chromium coverage, the full 6-of-6 Playwright Chromium suite, and visual inspection of the public-safe screenshot.

The existing Asset Library already imported real PNG, JPEG, and WebP files, preserved per-pixel source alpha, and let a creator place an imported image on any ordinary plane—including Background plane 2 or later. Background plane 1 remains the pinned full-episode RGB base and stays color-only. The completed goal preserved those paths rather than rebuilding them.

### Slice 1 — Asset Library drag-to-canvas placement

- Use native browser drag events and a strictly parsed internal payload containing only source kind and stable asset ID; do not add dnd-kit or expose object URLs/source bytes in drag data.
- Convert the drop point through the tested viewport pan/zoom geometry, place the source beneath that point in the active ordinary plane, clamp it to episode bounds, select it, and record one normal creation history entry.
- Keep clicking an asset as the accessible viewport-centered fallback. Defer operating-system file drops and precise Layers-panel drops.

### Slice 2 — Format-v5 appearance foundation and opacity

- Introduce one bounded v5 episode transition for shared element `opacity` and `blendMode` defaults, preserving supported v3 and v4 saves without a general migration framework. Existing v4 shape opacity is retained; every other older element defaults to 100% opacity and Normal blending.
- Add a focused bottom property strip with a 0–100% opacity slider and exact percentage input. Live slider feedback must become one history entry per gesture rather than one entry per pointer event.
- Keep element opacity independent from eye visibility and source-image alpha. A 0%-opacity element remains selectable from Layers and does not capture canvas input.

### Slice 3 — Vertical two-stop gradient and fade

- Let a Background color region switch between a solid fill and one vertical two-stop fill. Each endpoint has its own color and alpha, so the same small model supports both color gradients and fades to transparency.
- Keep canvas and minimap rendering consistent. Defer arbitrary angles, extra stops, masks, and a general-purpose gradient editor.

### Slice 4 — Tiled texture presentation

- Treat an uploaded image as the reusable source for either normal single-image presentation or a repeated tile texture; never modify or duplicate the source Blob.
- Let the texture element's bounds define coverage and use independent resize handles for that coverage. Keep ordinary single images on proportional four-corner resize.
- Defer cover/crop modes, texture-density or pattern-scale controls, source replacement, and destructive editing.

### Slice 5 — Restrained blend modes and integration

- Add exactly **Normal**, **Multiply**, **Screen**, **Overlay**, and **Soft Light** per element, applied in the existing deterministic group/plane/local stack.
- Keep selection chrome outside compositing and make the minimap consume the same normalized appearance data.
- Finish with full save/reload/Reopen, undo/redo, pixel-compositing, responsive-browser, and visual regression checks before documentation, screenshot, commit, or publication claims are updated.

### Goal acceptance

- built-in and imported assets drag to the intended logical point at representative zoom, pan, scroll, and edge positions; click-to-place still works and a completed drag never creates a second click-placement instance
- imported PNG/JPEG/WebP alpha remains intact, and element opacity multiplies that alpha rather than flattening it
- opacity clamps to 0–100%, slider gestures coalesce into one undo step, zero-opacity rows remain recoverable through Layers, and the value survives Save, reload, and Reopen
- a Background color region produces matching solid, two-color gradient, and alpha-fade results in canvas and minimap
- an imported source can render as a repeated texture over freely resized coverage without changing the reusable source
- all five blend modes produce deterministic overlap results in canvas render order and persist through history and local save/reopen
- current format-v3 and format-v4 compatibility fixtures open as normalized v5 documents, while corrupt and unknown versions still fail safely
- focused model, command, parser, store, renderer, and Chromium stories pass alongside the complete unit suite, strict typecheck, lint, production build, supported-size visual inspection, a public-safe screenshot, and private-file checks

All five functional checkpoints and the validation suite pass. Native drag works for built-in and imported sources while click remains the fallback. Format v5 carries universal opacity, one-history-entry slider gestures, vertical two-stop color/alpha fills, fixed automatic tile scaling capped at a 160-logical-unit tile edge, and exactly the five recorded blend modes through canvas, minimap, history, Save, reload, Reopen, and reset. The public-safe `docs/progress/2026-07-15-drag-and-appearance-controls.png` checkpoint uses a synthetic blank episode and the built-in Radiance asset. The complete slice was published in `7768daa0617b66c696f769d97dd531f9029272c8`. Balloon-outline seam repair and minimap aspect distortion remain non-blocking polish.

Explicitly deferred from this goal: operating-system file drop, Layers-panel drop destinations, arbitrary/multi-stop/angled gradients, image masks, crop/cover, texture-density controls, rotation, flipping, perspective, source deletion or editing, additional blend modes, plane/tab reordering, production export, deployment, OAuth, OpenAI runtime work, and AI-generated assets.

## Implemented `/goal`: creator completion pass

**Status:** Katherine authorized these three ordered, separately testable slices on July 15. They are implemented without a format bump and validated through 270 unit tests across 13 files, strict typecheck, ESLint, production build, all 7 Playwright Chromium stories, a public-safe 1440 × 900 screenshot, and visual inspection of both the editor and Reader Preview. Feature commit `cb1f28443f7b1045d139879a2bba7b03edf25856` was published to `main` July 16, and local/remote equality was verified immediately after the push.

### End-to-end creator story

A creator starts a blank episode, names it, chooses the base color, and imports transparent panels, a balloon image, and decorative effects. She creates and optionally names several numbered planes, reorders two planes, corrects one local overlap with **Bring Forward** or **Send Backward**, and moves a misplaced element to the right plane without recreating it. She adds an independent text element over the balloon, edits its wording and basic typography, and uses the existing movement, resize, opacity, and blend controls to compose the beat. After extending and refining the scroll, she enters a chrome-free reader preview that uses the exact same document, exits without losing her editor position, saves, reloads, and reopens the work. If she tries **Reset Demo** with unsaved changes, she may cancel without losing anything or confirm the reset and still recover the last explicit save through **Reopen**.

### Slice 1 — Plane organization and element stacking

- Let an ordinary plane keep an optional creator-facing name without changing its stable ID or unrestricted meaning.
- Reorder ordinary planes only within their fixed composition group through a dedicated tab drag grip, a clear insertion marker, and visible **Move Left** / **Move Right** actions. Overflow arrows remain navigation only. Background plane 1 stays pinned and cannot move.
- Keep the Layers element list in deterministic low-to-high local stack order so row movement and canvas overlap agree. Give the selected element explicit **Bring Forward** and **Send Backward** actions within its current plane; focused grip Arrow Up moves to the preceding visible row and Arrow Down to the following row.
- Add a visible, keyboard-accessible **Move to Plane** action that can move the selected element to an ordinary plane in any fixed group. Update the active group and plane to the destination, preserve the selected stable element and asset reference, and never duplicate it or target Background plane 1.
- Implement these operations as pure document commands over existing `LayerPlane.name`, plane `order`, element `layerPlaneId`, and element `zIndex`. They create one normal history entry, survive Save/reload/Reopen, and require no format bump.

### Slice 2 — Basic independent text

- Add one visible **Add Text** action targeting the active ordinary plane. It creates a normal, independently selectable and movable `TextElement`; it is not embedded in an image asset.
- For a selected text element, edit wording, color, font size, weight, and left/center/right alignment through compact controls. Keep the font choice fixed for this slice.
- Carry text creation and each committed property change through the existing canvas, minimap, Layers, resize, opacity, blend, undo/redo, Save, reload, Reopen, and reset paths.
- Use text as an independent element over the existing balloon image assets. Do not introduce a compound balloon/text entity, automatic text fitting, editable tails, or balloon style generation.
- The format-v5 `TextElement` already contains these fields, so this slice also requires no format bump.

### Slice 3 — Reader preview and safe Reset Demo

- Add a chrome-free reader preview that renders the current authoritative episode at its logical aspect ratio and complete height. It must use the same effective visibility, group/plane/element order, geometry, text, source alpha, opacity, gradients, tiles, and blend modes as the editor.
- Hide editor-only menus, rail, panels, minimap, guides, selections, handles, controls, and status while previewing. Scrolling is allowed; preview itself cannot mutate the document, history, dirty state, selection, active group/plane, zoom, or editor viewport.
- Exiting preview restores the same editor state and logical viewport the creator left.
- Give **Reset Demo** the same unsaved-work respect as New Episode and Reopen. If the document is dirty, cancel leaves the entire editor untouched; confirm loads the fixture as an unsaved document, clears stale history/transient editing state, and leaves the explicit saved slot available to **Reopen**. A clean document may reset without an unnecessary warning.

### Goal acceptance

- Stable IDs survive plane rename/reorder; plane numbers reflect order; Background plane 1 never moves; drag and Move Left/Right agree; overflow arrows never reorder.
- Bring Forward/Send Backward change only local stacking, and Move to Plane moves one selected element exactly once to a valid ordinary destination while canvas, minimap, active group/plane, and Layers agree.
- All organization commands are reversible and persist through Save, reload, and Reopen without a format change.
- A creator can add text over a balloon, edit all five approved text properties, move and resize it, change opacity/blend, undo/redo it, and recover the same result after Save/reload/Reopen.
- Reader preview matches the editor's durable document and appearance, contains no editor chrome, and returns without changing document or editor context.
- Reset Demo protects dirty work on cancel; a confirmed reset is visibly unsaved and the last explicit save remains recoverable.
- The existing published 255-test/13-file and 6-of-6 baseline remains covered. The current local completion pass has 270 passing unit tests across 13 files, strict typecheck, ESLint, production build, and all 7 Playwright Chromium stories, plus the indexed screenshot and Reader Preview inspection. The 637.55 kB minified JavaScript chunk produces a non-blocking Vite size advisory.

Explicitly deferred from this completion pass: deterministic WEBTOON export; OpenAI runtime work, AI generation, OAuth, and external connectors; operating-system/Finder file drop; autosave and crash recovery; source-asset deletion or advanced category management; panel masks, crop/cover, rotation, flipping, perspective, editable balloon tails, and a compound balloon/text model.

### Remaining bounded follow-ups

1. **Publish the validated reconciliation commits:** the adapter-plane and architecture-alignment fixes are complete locally; push them only after Katherine approves publication to `main`.
2. **Provide public judge access:** deploy the passing build, then verify it from a clean browser profile without local project or asset state.
3. **Complete submission evidence:** run Katherine's feature sheet, record the reviewer walkthrough and video, finish the Devpost fields, and perform the final rules/privacy check.
4. **Authenticated WEBTOON upload verification:** later use harmless unpublished files to establish actual boundary, alpha, order, filename, preview, and recompression behavior. Only then may the observed export profile become upload-verified.
5. **OAuth/model proof only after a separate gate:** verify an officially supported authorization path and approve its backend/secret boundary, consent, privacy, cancellation, provenance, command permissions, cost, and time limits before implementation.

### Submission runway: July 19–21

Public judge access, clean-browser verification, Devpost evidence, video production, final rules review, and submission are intentionally scheduled near the deadline. They remain mandatory, but they are not the current implementation goal.

## Current product goal

Submit a small, complete, reliable **human-operated** editor MVP in the **Apps for Your Life** category. A judge should immediately understand ScrollSplice's coherent user experience by using one public-safe sample episode to:

1. see a long episode through a viewport-sized editing canvas
2. understand the whole episode through a synchronized minimap
3. navigate from the canvas or minimap
4. select the same element from the canvas or layers list
5. move the selected element and reset the demo

That is the simplest required MVP for Build Week. The larger local completion pass strengthens the creator workflow without becoming a new contest requirement. The current build includes browser-local import, explicit save, crash recovery, multiple local projects, portable project files, advanced editing, clearly provisional image rendering, and an optional bounded local OpenAI generate-and-place proof. It does not claim upload-verified WEBTOON compatibility or full autonomous creation, and the public editor works without an OpenAI connection.

## Build Week must-haves

### Working product

- A recognizable vertical-comic workspace at representative desktop sizes.
- One bundled original six-image **The Light We Planted** Reset Demo with separate editable title and narration, committed with documented synthetic provenance; a clean browser starts from a blank **Untitled Episode**.
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
- Complete and validate Direct Creator Controls, Safe Precise Height and solid Background Color Regions, and Canvas Zoom/2D as separate local checkpoints.

End-of-day target achieved: the current editor and all three post-review checkpoints remained passing locally and stopped at a **HUMAN TEST and direction checkpoint** before any opacity work.

### July 14 — Full product-building day

- Complete Katherine's hands-on test of **Direct Creator Controls**, **Safe Precise Height and Background Color Regions**, and **Canvas Zoom and 2D Viewport**. **Complete.**
- Record her feedback, document the reviewed screenshot, and publish the already passing implementation/doc checkpoint to `main`. **Complete through `8a493a2`.**
- Repair the failed polish review as checkpoint D: stable title anchors, visible profile-derived candidate guides, default-on center magnet with bypass, proportional ordinary-element resize, and live status/minimap bounds. The first fixed-width Background implementation was superseded; free Background-region movement and eight-handle independent resize passed validation and Katherine's retest with minimap aspect distortion logged as polish. **Complete with notes.**
- Implement and validate the separately approved optional local history/save/menu slice, including explicit Save, reload/reopen, blank New Episode, bounded undo/redo, and the exact File/Edit surface. **Complete, passed Katherine's July 15 review, and published with the Asset Library stack in `fdd4ead`.**
- Keep upload-verified WEBTOON compatibility separate until the harmless authenticated upload verification; the current completion goal may build a clearly provisional local renderer and slicer from the observed profile.
- Keep every coherent checkpoint tested and independently understandable.
- Do not spend the full product day on deployment, video, or Devpost assembly.

### July 15–18 — Two-hour product and reliability evenings

- Preserve the completed locally feasible human-editor baseline in coherent, validated slices; prioritize submission access, evidence, and blocking corrections over new product depth.
- Follow the dependency order in the current goal: polish, asset workflows, recoverable/portable projects, transforms and organization, frames, balloon/text composition, then clearly provisional local render/export.
- Avoid OAuth, autonomous generation, cloud services, WEBTOON automation, and other externally gated infrastructure.
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

## Product-slice record and remaining completion queue

Items 1–16 preserve the historical slice record. On July 16 Katherine authorized the remaining locally feasible human-editor queue as one goal rather than requiring another feature choice after every three slices. The combined implementation began in commit `a26927f` and is included in the July 19 big feature and UI release; the full regression suite, public-safe visual record, and feature sheet are complete. Stop starting product work after July 18 so July 19–21 remain available for access, evidence, stabilization, and submission:

1. The bounded composition-groups and visibility slice defined above. **Complete.**
2. The layer-planes and episode-backdrop foundation defined above. **Complete.**
3. Episode Setup and Expandable Scroll. **Complete.**
4. Direct Creator Controls. **Complete and human-tested.**
5. Safe Precise Height and solid Background Color Regions. **Complete and human-tested.**
6. Canvas Zoom and 2D Viewport. **Complete and human-tested.**
7. Stable editing chrome, candidate slice guides, proportional ordinary-element resize, and free eight-handle Background-region transforms with live status/minimap preview. **Complete; human review pass with notes; later published in `fdd4ead`.**
8. Local history, one explicit save/reopen slot, blank New Episode, and minimal File/Edit menus. **Complete, validated, and human-tested.**
9. Direct placement and foundational appearance: drag-to-canvas, format-v5 opacity, vertical two-stop gradient/fade, tiled texture presentation, and five restrained blend modes. **Complete, validated, and published in `7768daa`.**
10. Local tall-master rendering, deterministic slice planning, and preflight. **Implemented provisionally in local feature commit `a26927f`; output is labeled not upload-verified and manual-upload only.**
11. Plane optional names/reordering plus explicit element stacking and Move to Plane. **Implemented, validated, and published in `cb1f284`.**
12. The simple persistent Asset Library above: Uploads, original built-ins, creator categories, safe click-to-place, image elements, and local source persistence. **Complete, validated, and published July 15 in `fdd4ead`.**
13. Asset-to-canvas drag. **Folded into current item 9; click-to-place remains the accessible fallback.**
14. An isolated OpenAI generate-and-place proof using only synthetic content. **Implemented and creator-tested July 20 through the local companion; it is not part of the completed human-editor baseline or required static judge path.**
15. Basic independent text creation and editing over existing balloon assets. **Implemented, validated, and published in `cb1f284`.**
16. Chrome-free reader preview plus safe unsaved confirmation for Reset Demo. **Implemented, validated, and published in `cb1f284`.**

Completion-pass additions across the historical items are implemented and validated: visible polish and responsive inspector; Finder/canvas/plane/Layers image drop; complete local category/source management; crash recovery; multiple and portable local projects; format-v6 transforms, image masks/crop/frame and episode-edge bleed, flat grouping, populated-plane handling, story-beat movement, ten empty editable balloon types with direct contour handles, provisional rendering, blank clean-profile startup plus the bundled six-image Reset Demo, dual light/dark appearances, compact element grips, the versioned editor adapter, and generated-image intake with exact-bounds placement. Grouped pointer moves preview only the primary member live, then commit all followers together on release. Masks remain clipping boundaries, so first-class panel breakout is still outside this build. The July 21 release passes 419 Vitest cases across 34 files, 11 local-companion checks, typecheck, lint, build, and all 24 Playwright stories. Katherine also completed the creator-controlled ChatGPT connection and one live synthetic response/generate/place proof. Generated-image handoff now uses an opaque reference plus an authenticated binary fetch, and editor intake retains native source bytes and dimensions while WEBTOON constraints remain export-only.

The locally feasible human-editor queue is complete. The provider-neutral generated-image intake seam is implemented: an authorized host can persist generated PNG/JPEG/WebP bytes with provenance and place them through one normal undoable image-element command. The upper-right Agent control supplies the bounded overlay shell and browser-local project transcript. On July 20 Katherine approved the network, credential, privacy, synthetic-data, and schedule boundary after review of the official Codex App Server path. The active slice connects that shell to an isolated localhost companion, keeps official ChatGPT authorization and Codex state outside the browser/repository, live-discovers only GPT-5.5/GPT-5.6 choices, and routes every editor change through the same inspected/revision-checked adapter used by the human workflow.

### Approved boundary for the OpenAI stretch

The image-generation proof remains lower priority than the human interaction stretches above. Its gate was satisfied and approved on July 20 with these controlling limits:

- the complete human editor story, automated validation, and public access are already passing; video, final Devpost fields, and submission assembly remain July 20–21 work
- Katherine separately approves the network, privacy, credential, and cost implications
- a supported model-access method and secret-handling boundary have been verified and recorded; never place an API key or reusable provider token in browser code or git
- the base editor remains usable by judges without login, credits, or model access
- the proof is one creator-started, creator-stoppable turn using only synthetic prompts and references; the ChatGPT subscription path exposes no reliable per-turn spend telemetry, so this build does not promise a spend meter or enforceable cost ceiling

The smallest acceptable proof was one creator-authorized request that produced one synthetic image candidate and passed its bytes into the implemented generated-asset import and explicit-plane placement path. Katherine completed the official connection, received a live response, and confirmed that the generated result finished and was placed. The commands record provenance, persist the source, return stable IDs, and use ordinary episode history; undo is covered by adapter/browser validation. The companion exposes progress/cancellation and only the four bounded ScrollSplice tools; it does not expose shell, files, web, connectors, browser control, MCP, private assets, unrestricted agent writes, or WEBTOON credentials.

## Deferred or gated work

The following human-editor items are implemented and locally validated and are no longer deferred: portable local project packaging, recovery, multiple local projects, operating-system file drop, category/source management, practical crop/cover, rotation/flip/lock, richer snapping, non-nested grouping, bounded panel-mask presets, empty editable balloon bodies with independent text, useful browser-app menus, and provisional local rendering. Publication remains separate from implementation proof.

Still deferred or gated:

- Native operating-system menus and desktop packaging. Browser-app File/Edit/View/Window/Help surfaces may be added only where they perform real local actions.
- A claim of upload-verified WEBTOON compatibility, exact production profile enforcement, or automatic publishing until the manual discovery in `WEBTOON_REQUIREMENTS.md` is complete. Provisional local files must say what was and was not verified.
- Cloud/account sync, collaboration, provider-backed storage, a ScrollSplice account system, and authenticated external connectors.
- Production cloud model infrastructure and unrestricted autonomous episode creation. The approved local App Server proof remains optional and bounded to the recorded companion/tool surface.
- A full Photoshop replacement: painting, unrestricted vector editing, arbitrary nested layers/groups, perspective/freeform distortion, animation, or destructive source editing.
- Additional import or export formats without a demonstrated creator or platform need.
- Canvas Zoom and 2D Viewport is complete and published in the earlier A/B/C stack; its state is transient and does not alter episode or export geometry.
- The direct-placement and foundational-appearance goal is implemented, validated, and published in `7768daa0617b66c696f769d97dd531f9029272c8` with its screenshot evidence and documentation.
- Authenticated WEBTOON upload verification and other platform profiles.
- Desktop packaging, mobile editing, accounts, OAuth, cloud storage, collaboration, and publishing integrations.
- Full autonomous episode creation, including planning, repeated generation, continuity passes, and unattended layout changes. This is an intended product track after the human workflow, not a required Build Week feature.
- External asset-source connectors and production model-account integration. A narrowly bounded OpenAI generate-and-place proof is permitted only through the stretch gate above.

## WEBTOON discovery track

The Build Week editor can proceed without upload-verified production export. Katherine completed the authenticated form-observation portion on July 13: the current UI displays 800 × 1280 px before automatic optimization, a 2 MB image threshold, 50 MB and 100 images per episode, JPG/JPEG/PNG support, and a separate 202 × 142 episode thumbnail under 500 KB. Checkpoint D uses that visibly `form-observed` profile for provisional candidate guides, and the current local renderer can create and preflight clearly provisional files from the same profile. The harmless unpublished upload behavior tests in [WEBTOON_REQUIREMENTS.md](WEBTOON_REQUIREMENTS.md) remain mandatory before any upload-verified compatibility claim. Those tests cover exact boundary enforcement, transformation behavior, ordering, transparency, filename behavior, previews, and draft reopening.

Keep platform constraints in a data-driven export profile so a changed limit can be updated without changing the episode model or editor commands. The later exporter should plan creator-reviewed cuts, produce files no larger than the selected verified profile allows, and preflight every encoded file and the whole package. That gives the creator control over seams and known limits; it cannot guarantee that WEBTOON will not recompress, resize, reformat, or otherwise optimize an accepted upload.

## Open questions for autonomous creation

The credential-path question is resolved for the optional local proof. The remaining questions do not block the human MVP:

- **Resolved for the local proof:** the official Codex App Server owns creator-controlled ChatGPT authorization inside an app-specific local state directory; ScrollSplice does not implement OAuth or hold provider credentials in the browser.
- What project information and reference images may be sent to OpenAI, and how will the creator preview and approve that context?
- What cost ceiling, cancellation behavior, generation history, and retry policy should each run have?
- Which actions may eventually run autonomously, and which require review until undo, recovery, and provenance are mature?
- Should external connectors ever import creator assets from services such as Drive or Dropbox, or should local import remain the only source?

Do not copy OAuth client identities or private ChatGPT endpoints from other coding harnesses. ScrollSplice uses only the official Codex App Server's documented ChatGPT login request from the isolated local companion.

## Validation path

### July 17 editor-adapter slice

- Implement a versioned, JSON-safe episode/editor snapshot.
- Route precise navigation and editing through stable IDs and existing human commands.
- Expose a development-only browser bridge for Codex and automated tests.
- Document the inspect-command-verify-undo workflow and the future OAuth authorization boundary.
- Validate snapshot serialization, move/undo, rejected guessed IDs, explicit-plane creation, typecheck, lint, unit tests, build, and a live browser command.

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
- private Root & Table art, secrets, required OAuth infrastructure, direct WEBTOON publishing, and any claim of upload-verified WEBTOON export remain outside the required submission; a provisional local render proof may be included only when labeled honestly
- the human editor works without OpenAI access; any autonomous feature shown is clearly labeled as completed stretch rather than implied future behavior

## Stop rules

- The first-testable-editor `/goal`, the layer-plane checkpoint, Episode Setup and Expandable Scroll, Direct Creator Controls, Safe Precise Height and solid Background Color Regions, and Canvas Zoom/2D are complete and published on `main` through `8a493a2`. Corrective checkpoint D passed Katherine's retest with notes, and the optional history/save/menu slice passed her July 15 review. The persistent Asset Library passes 214 unit tests across 11 files, static/build checks, four Chromium stories, supported-size visual inspection, and screenshot capture; the combined stack was published and verified in `fdd4ead37e7071bc7c69c9c4d8b49c557ddd95d7`. The direct-placement and foundational-appearance goal passes 255 unit tests across 13 files, strict typecheck, lint, production build, and all 6 Playwright Chromium stories and was published in `7768daa0617b66c696f769d97dd531f9029272c8`. The creator-completion pass passes the complete current regression suite, all seven Playwright stories, and indexed visual evidence and was published in `cb1f28443f7b1045d139879a2bba7b03edf25856`. The historical three-slice stop and the broader locally feasible human-editor goal are complete; restrict current work to submission access, evidence, stabilization, and narrowly scoped corrections. Upload-verified WEBTOON compatibility, OpenAI/OAuth, cloud services, and external connectors remain separately gated.
- Never amend, squash, delete, or force-move the `e4db897` baseline commit or `pre-build-week-planning` tag.
- Do not expand the required submission target to import, persistence, undo, resize, ordering, production export, OAuth, or autonomous creation.
- The optional OpenAI stretch was approved July 20 only through the recorded localhost Codex App Server companion. Do not broaden it to a cloud backend, browser OAuth client, private endpoint, API key, connector, or unrestricted tool runtime.
- Do not add Next.js, Tauri, dnd-kit, a cloud backend, database, cloud service, OpenAI SDK, or WEBTOON automation during Build Week without another explicit approval and recorded decision.
- Do not commit private Root & Table assets, secrets, or unlicensed content.
- Do not claim visual or public-access behavior works unless it was actually inspected.
- If the outline, plan, architecture, and compliance checklist disagree, resolve the documents before coding.
