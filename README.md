# ScrollSplice

ScrollSplice is a scroll-native vertical comic editor. Its defining workspace combines a large editing viewport, a full-episode minimap, a synchronized layers list, and direct manipulation of comic elements.

This repository is the public Build Week record for ScrollSplice: <https://github.com/techinevolution/scroll-splice>.

**Name screen:** ScrollSplice replaced the conflicted ScrollForge working name on July 13. A basic exact-name screen found no matching software brand in general web search, GitHub repositories, npm, or PyPI. This is practical risk reduction, not legal trademark clearance; see [Build Week Compliance](BUILD_WEEK_COMPLIANCE.md#name-screen-and-clearance).

## Status and Build Week provenance

Katherine identified the seven original planning documents as work completed on July 12, 2026, before the Build Week submission period opened. They were first committed unchanged on July 13 at 11:28:56 AM PT as root commit `e4db897`, then marked by the annotated tag `pre-build-week-planning`. That baseline contains seven Markdown planning files and no application code. The Git timestamp proves when the snapshot was preserved; the separate timestamped July 12 Codex-session evidence is recorded in [Build Week Compliance](BUILD_WEEK_COMPLIANCE.md#3-pre-existing-work-boundary).

All judged implementation work will be committed after the July 13, 2026 9:00 AM PT submission-period start. Do not amend, squash, or rewrite the baseline commit or tag. See [Build Week Compliance](BUILD_WEEK_COMPLIANCE.md) for the evidence and final submission checklist.

Post-start documentation/compliance work is recorded separately in commit `a567865` at 11:50:26 AM PT on July 13. It adds the rules checklist, scope corrections, WEBTOON discovery, license, and privacy ignores, but still contains no application code.

Implementation began later on July 13 with the locked application scaffold, framework-independent episode model, and original six-beat **Signal in the Fog** fixture. The fixture contains 30 named elements made entirely from code-defined shapes and text; no private comic art is included. Katherine then approved one primary `/goal` through the first complete human-editor MVP and authorized Codex to commit and push each coherent passing checkpoint to `main`.

That testable editor is complete in commits `c33b491` and `05ac06b`. It includes the desktop workspace, viewport-sized Konva canvas, synchronized full-episode minimap, wheel and minimap navigation, canvas/element-row selection, off-screen element reveal, selected-element movement, a collapsible synthetic-asset placeholder, and a full reset. Katherine completed the hands-on product review on July 13 and confirmed that minimap navigation, canvas movement, and the collapsible asset panel work well.

The July 13 composition checkpoint in `f02776f` adds the approved **Background**, **Content**, and **Foreground** groups. The completed layer-plane checkpoint in `c5f83c5` then implements the clarified format-v3 model: each fixed group contains numbered editable layer planes, only Background plane 1 is a pinned editable base, colored beat rectangles are Content panels, and canvas/minimap backdrops derive from document data instead of a hardcoded fill. The right inspector now reaches the top of the workspace, hidden elements remain selectable from Layers, and each active plane lists its elements from top to bottom on the scroll. Public deployment remains scheduled for the July 19–21 submission runway. Dated, public-safe visual checkpoints are preserved in [Progress Screenshots](docs/progress/README.md), including the [completed layer-plane checkpoint](docs/progress/2026-07-13-layer-planes-and-editable-backdrop.png).

Katherine reviewed `c5f83c5` positively on July 13 and identified the next creator-facing needs. The resulting **Episode Setup and Expandable Scroll** slice was implemented and validated locally: creators could safely delete a genuinely empty ordinary plane, edit the current episode title, add 1,280 logical units from the bottom of the story, and keep the full episode and viewport represented accurately in the refitted minimap. At that historical checkpoint, the matching paperclip was still a disabled future placeholder; the later post-review controls below supersede that behavior. The `+` beside the numbered tabs still creates a plane; the separate **Add scroll space** control changes episode height. A public-safe view of that checkpoint is preserved in the [progress record](docs/progress/2026-07-13-episode-setup-and-expandable-scroll.png).

Katherine's follow-up test confirmed that plane deletion works and that the minimap remains accurate after expanding the episode. A second public-safe [post-review baseline screenshot](docs/progress/2026-07-13-post-review-expandable-scroll.png) records the populated-plane view before the next changes. She then authorized three separately testable follow-up checkpoints in one work request: direct title/base/element-row controls, safe height fine-tuning with solid movable Background color regions, and Canvas Zoom with a two-dimensional viewport.

All three checkpoints are implemented and validated. The title itself activates editing without a permanent pencil; Background plane 1 can be recolored from either Layers or the canvas; placed elements have instance-only trash actions; and an ordinary plane's bottom **Add asset** paperclip opens the Asset Library, whose code-defined swatches could place synthetic demo rectangles into empty or populated planes. At that historical A/B/C checkpoint, real image import remained deferred; the later format-v4 Asset Library below supersedes that limitation. Creators could also add a full-width solid color region to an ordinary Background plane by choosing its start, length, and color, then move it vertically, hide it, select it, or delete it. The later Background-region correction below supersedes that fixed-width behavior. Episode height keeps the fast 1,280-unit addition and adds pointer-drag and keyboard fine-tuning that cannot shrink below 1,280 units or clip visible or hidden content. **Fit Width** is the 100% reference for transient 50–200% zoom, horizontal and vertical access, and an accurate two-dimensional minimap viewport. A public-safe view is preserved in the [creator-controls, height, and zoom screenshot](docs/progress/2026-07-13-creator-controls-height-and-zoom.png).

Katherine tested that complete build on July 14. She confirmed that placed-element deletion, the bottom **Add asset** action, expanded-height minimap behavior, and ordinary canvas movement work. Her next manual review failed the proposed polish checkpoint because activating title editing still shifted the fixed **EPISODE** label, the promised 1,280-unit guides were not visible, and full-width Background color regions could drift sideways in the live canvas even though the shared document and minimap still held `x = 0`. Scrolling the region out of view and back remounted it at the document position. The visible magnet and corner resize handles were also missing.

The resulting corrective checkpoint gives the title a stable anchored footprint; introduces a provisional, clearly `form-observed` export-profile seam and default-on toggleable editor-only guides at scaled 1,280-unit candidates; and adds a visible default-on magnet with an 8 CSS-pixel episode-center snap, temporary center guide, and magnet-off or Alt/Option bypass. Its original fixed-width Background rule is now superseded: a region starts full width but thereafter has freely editable `x`, `y`, `width`, and `height`, uses eight handles for independent width/height resizing, and participates in center snapping. During move or resize, transient logical bounds update the status bar's `x/y/w/h` and minimap before release; one pure command commits the final bounds when the gesture ends. Other selected unlocked elements retain four proportional corner handles. None of this changes the document schema from format v3.

Katherine marked that superseding checkpoint **PASS WITH NOTES** on July 14 after confirming live coordinates, live minimap synchronization, all eight Background-region handles, magnet-off/Alt/Option snap override, and Option-drag. The minimap's visual aspect distortion is logged as later polish rather than a blocker. She then approved an optional creator-workflow slice for bounded undo/redo, one explicit local-browser save slot, reload/reopen, a blank new episode, and only the requested **File** and **Edit** menus. That slice passed 154 unit tests, static/build checks, two Chromium stories, supported-size visual inspection, the [local save and history screenshot](docs/progress/2026-07-14-local-save-and-history.png), and Katherine's July 15 hands-on review.

The implemented creator slice replaces the synthetic drawer with a persistent local Asset Library: the fixed rail exposes **Uploads**, **Speech Balloons**, **Decorations**, **Splatters**, and **My Library**; nine original transparent SVG built-ins and validated PNG/JPEG/WebP imports create real image elements; and creator-named categories and unchanged source `Blob`s persist in IndexedDB. Import preflight reads PNG/JPEG/WebP header dimensions and rejects an over-40-megapixel source before full browser decode, which still verifies the source and confirms its declared size. Atomic read-transform-write transactions merge category and import changes made from concurrent tabs, and the tab completing an update refreshes its categories and sources from the saved result. Placed images share the existing canvas/minimap/Layers selection, movement, visibility, deletion, history, save/reopen, and proportional four-corner resize behavior. Placement preserves aspect ratio and refuses an extreme source ratio clearly when both axes cannot fit inside the episode while remaining at least 24 logical units. Episode format v4 introduced stable asset IDs, and the completed appearance goal advances current documents to format v5 while explicitly preserving supported v3 and v4 saves. Compound balloon/text behavior, automatic text fitting, editable tails, recolor, crop, rotate, flip, source deletion, and advanced asset editing remain deferred.

Katherine's July 15 follow-up confirmed upload, placement, alpha rendering, and resize behavior. The resulting UI polish keeps **File** and **Edit** above an open Asset Library, shortens only the visible Decorations rail label to **Decor**, and lets a second click on the active category close the drawer. The white seam in the original Oval and Rounded balloon outlines is recorded as later built-in artwork polish rather than part of this correction. The passing correction was published in `3ec9bd095fab5ba2fb19f9d97cfeb79fcdbceae5` and verified on local and remote `main`.

Katherine then approved a five-slice `/goal`: precise Asset Library drag-to-canvas placement; a bounded format-v5 opacity foundation; vertical two-stop Background gradients/fades; repeated texture presentation for imported images; and Normal, Multiply, Screen, Overlay, and Soft Light blend modes. It is implemented, validated, and published in `7768daa0617b66c696f769d97dd531f9029272c8`. Built-in and imported assets support native drag placement while clicking remains the accessible viewport-centered fallback. Universal opacity commits one history entry per slider gesture; Background color regions support vertical two-stop color and alpha; images support single or tiled presentation with a fixed automatic tile scale capped at a 160-logical-unit tile edge; and all five blend modes flow through canvas, minimap, undo/redo, Save, reload, Reopen, and reset. Real PNG/JPEG/WebP upload, per-pixel alpha, and imported photos on ordinary Background planes 2 and later remain intact; the pinned Background plane 1 stays color-only.

Local validation passes 255 unit tests across 13 files, strict typecheck, ESLint, production build, focused drag/appearance Chromium coverage, and the complete 6-of-6 Playwright Chromium suite. The [drag and appearance controls screenshot](docs/progress/2026-07-15-drag-and-appearance-controls.png) is a visually inspected public-safe 1440 × 900 view using a synthetic blank episode and the built-in Radiance asset. The original Oval/Rounded balloon seams and minimap aspect distortion remain deferred polish.

## Creator completion pass — implemented and locally validated

On July 15 Katherine authorized exactly three more creator-facing slices, now implemented without changing format v5. Ordinary planes accept optional names and same-group reordering through a dedicated drag grip or Move Left/Right; selected elements have explicit Bring Forward, Send Backward, and Move to Plane actions. Creators can add an independent text element and edit its wording, color, size, weight, and alignment—for example, placing lettering over an existing balloon image without coupling the two. **View > Reader Preview** opens a chrome-free rendering of the same authoritative episode, and Reset Demo now asks before discarding unsaved work.

The locally validated creator story starts with a blank episode, names and reorders planes, places a balloon, adds and styles independent lettering, corrects local stacking, moves a misplaced element to another plane, previews the complete scroll without losing editor context, and carries representative plane/text changes through Save, reload, and Reopen. A separate reset branch proves that Cancel preserves dirty work, Confirm loads the fixture as unsaved, and Reopen can still recover the last explicit save. All 270 unit tests across 13 files, strict typecheck, ESLint, production build, and all 7 Playwright stories pass locally; the 1440 × 900 [creator completion screenshot](docs/progress/2026-07-16-creator-completion-pass.png) and Reader Preview were visually inspected. Feature commit `cb1f28443f7b1045d139879a2bba7b03edf25856` was published to `main` July 16, and local/remote equality was verified immediately after the push.

This pass does not include WEBTOON export, OpenAI or OAuth work, direct Finder file drop, autosave/recovery, source deletion, masks, crop, or rotation. Those remain separate decisions.

## Product sequence

### Build Week MVP — due July 21

The contest submission is the smallest complete, coherent ScrollSplice editor experience:

- one original vertical-comic fixture rendered from code-defined shapes and text
- a viewport-sized editing canvas
- a synchronized full-episode minimap
- a layers list synchronized with canvas selection
- one meaningful edit: move the selected element, plus reset
- public judge access and the required submission evidence

Import, persistence, undo, a broader transform system, creator-controlled reordering, production export, accounts, OAuth, OpenAI model access, autonomous generation, and direct publishing are deliberately outside the **required** milestone. The local corrective work, history/save/menu slice, and persistent Asset Library are optional creator-facing additions; they do not enlarge what ScrollSplice must demonstrate to qualify as a complete contest MVP. Rotation, flipping, crop, perspective, freeform distortion, and asset-specific property editing remain deferred. If the human editor and every submission dependency are already stable, a narrowly bounded OpenAI image-generation proof may be attempted as stretch work; the submitted editor must not depend on it.

### Creator-ready MVP — phased beyond the core

The full creator-ready milestone adds local asset import, saving and reopening, safe undo, creator-controlled reordering, reader preview, and a validated export pipeline. Import, explicit local save/history, reusable browser-local sources, plane reordering, independent text, and reader preview are implemented and locally validated. Recovery, portable project files, and production export remain later work. This creator-ready progress does not make the full milestone a submission requirement. WEBTOON requirements are discovery inputs for the future exporter, not a reason to enlarge the one-week minimum.

Its workspace model uses three fixed full-scroll composition groups—**Background**, **Content**, and **Foreground**—above the story canvas. Inside each group, numbered **layer planes** provide open-ended creative surfaces; assets, text, shapes, color regions, and other placed items are **elements** inside one plane. Only Background plane 1 is pinned as the editable episode-wide base color. Every other plane remains flexible rather than forcing creators into predefined panel, character, or effect boxes.

The numbered-plane and editable-backdrop foundation, **Episode Setup and Expandable Scroll**, and the three post-review checkpoints are implemented. Empty-plane deletion protects Background plane 1, populated planes, and the final plane in each group; title edits enforce the observed 60-character WEBTOON limit; height changes leave existing content intact while the base and minimap follow the episode. The paperclip opens the overlay Asset Library, whose original built-ins and locally imported images can be placed into any active ordinary plane.

Katherine's July 14 A/B/C human-test checkpoint and corrective checkpoint D are complete; D passed with the minimap aspect-ratio issue recorded as polish. The optional history/save/menu slice also passed her July 15 review. The Asset Library extends that foundation with local uploads, creator categories, source reuse, and image elements. Direct placement and the bounded format-v5 appearance system are published; plane naming/reordering, explicit local stacking and Move to Plane, independent basic text, Reader Preview, and safe Reset Demo are implemented and locally validated. Portable projects, autosave/recovery, deployment, production export, and AI work remain separate. See [Project Outline](PROJECT_OUTLINE.md#creator-ready-mvp-components) and [Plan](PLAN.md#published-goal-direct-placement-and-foundational-appearance).

### Autonomous creation — after the human workflow

The intended product later adds an OpenAI-powered creation mode that can understand a story brief, inspect a safe normalized view of the current project and episode layout, generate or edit comic images, add them to the asset library, and place them on the scroll through the same document commands used by a human.

This is a real product direction, not a Build Week requirement. The manual editor remains fully usable with AI turned off. A future model connection, editor tools, skills/instruction packs, generated-asset provenance, cost controls, and approval boundaries are described in [Architecture](ARCHITECTURE.md#future-openai-creation-boundary).

## Locked stack

- Node.js 22 and pnpm 10
- React 19 with strict TypeScript and Vite 8
- React-Konva/Konva for the viewport-sized interactive canvas
- Zustand for shared document and editor state
- Plain CSS for the application shell and panels
- Vitest, Playwright, ESLint, and `tsc --noEmit` for validation

The command contracts were verified on July 13 against the initial scaffold:

```bash
corepack pnpm install
corepack pnpm dev
corepack pnpm test
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
corepack pnpm test:e2e
```

## Run the editor

```bash
corepack pnpm install
corepack pnpm dev
```

Open the local URL printed by Vite in a desktop Chrome-class browser. The current local format-v5 build passes 270 unit tests across 13 files, strict typecheck, ESLint, production build, and all 7 Playwright Chromium stories. Coverage includes the editor, history/save lifecycle, reusable transparent image import, creator categories, direct placement and appearance, plane organization and stacking, independent text, Reader Preview, and safe reset/recovery. The upload and appearance stories include rendered-pixel checks for source alpha and blend behavior; the creator-completion story carries representative plane and text edits through explicit Save, reload, and Reopen. The running UI has been checked at representative desktop sizes. The latest public-safe feature view is the [creator completion screenshot](docs/progress/2026-07-16-creator-completion-pass.png); the [drag and appearance controls screenshot](docs/progress/2026-07-15-drag-and-appearance-controls.png) remains the preceding published checkpoint.

**Local-save boundary:** Save uses one episode slot tied to the current browser profile and site origin. The Asset Library separately stores imported sources and creator categories in IndexedDB; each library mutation reads, merges, validates, and writes one snapshot atomically so concurrent tabs do not silently overwrite one another. Clearing site data, changing browsers/profiles, or using a different origin loses both local stores. This is not autosave, crash recovery, cloud sync, or a portable project file.

Suggested review walkthrough for the currently implemented local build:

1. Switch among **Background**, **Content**, and **Foreground** and confirm the numbered plane tabs and element list follow the active group without changing the composed episode.
2. Select Background plane 1, confirm the **Canvas base** control is pinned inside the square canvas's upper-left corner, change **Base color** from Layers and from that canvas control, and confirm both controls, the canvas, and minimap stay synchronized; hide the base to reveal the editor-only checkerboard.
3. Use the `+` beside the numbered tabs to create an ordinary plane. Confirm its empty state offers **Delete plane** and a paperclip that opens the **Asset Library**. Visit all five fixed rail destinations; click and drag an original balloon, decoration, and splatter; create a My Library category; and upload a public-safe PNG, JPEG, or WebP. Confirm a drag lands beneath the pointer, a click still places at the viewport center, neither path duplicates an instance, and each image appears on the canvas, minimap, and active plane's Layers list with source transparency intact. Confirm ordinary images resize proportionally from four corner handles. Select Background plane 2 or create another ordinary Background plane and place an imported photo there; confirm Background plane 1 remains the separate color-only base.
4. Delete that empty plane, then confirm Background plane 1, populated planes, and the last remaining plane in a group cannot be deleted.
5. Click the episode title text itself. Confirm the input and cursor appear only after activation, the title box grows with its text up to a responsive desktop cap, Enter or leaving the field saves, Escape cancels, and an empty edit restores the existing title. Confirm the centered title, fixed **EPISODE** label, and reset control do not move when editing starts or ends.
6. Hide an element and confirm its row remains selectable even though it does not render or capture canvas clicks.
7. Scroll over the story canvas, then click the minimap or drag its cyan viewport frame to move through the episode.
8. Reach the current story bottom and choose **Add scroll space**. Confirm the episode grows by 1,280 units. Then hover the bottom canvas edge, confirm the cursor changes to vertical resize, and drag that edge to add or remove a smaller amount; confirm shrinking stops at the higher of 1,280 units and the lowest visible or hidden element. The separate **Drag to fine-tune** button is no longer present.
9. In an ordinary Background plane, add a solid color region with a chosen start, length, and color. Confirm it starts full width, then drag it freely on both axes. With **Magnet On**, move its center near the episode centerline and confirm it snaps; turn the magnet off or hold Alt/Option to bypass the snap. During the drag, confirm the status `x/y/w/h` and minimap update before release, then confirm the final document position matches that preview.
10. Use **Fit Width** and the 50–200% zoom control. Confirm zoomed content remains reachable on both axes and the minimap frame shows and controls the same visible rectangle.
11. Confirm **Magnet** and **Slice guides** start enabled. Move an ordinary element close to the episode center and confirm it snaps within 8 screen pixels while a temporary center guide appears; turn the magnet off or hold Alt/Option to bypass it. Hide and show the unlabeled dotted 1,280-unit candidate guides and confirm neither toggle changes document geometry or the minimap.
12. Select an unlocked ordinary shape or text element and resize it proportionally from its four corner handles. Then select a Background color region and use its four corners plus four side handles to change width and height independently. Confirm the live status `x/y/w/h` and minimap follow each resize before release, one final bounds change persists at gesture end, and no element can rotate or flip.
13. Select an element row from another beat and confirm the canvas reveals it; select an element on the canvas and confirm its group, plane, and row synchronize. Use the trash beside an element eye and confirm only that placed instance is removed.
14. Create two ordinary planes, give them optional names, and reorder them first with **Move Left/Right** and then with the dedicated drag grip. Confirm display numbers change while names and contents stay with their stable planes, overflow arrows only navigate, and Background plane 1 never moves.
15. Select overlapping elements and use **Bring Forward** / **Send Backward** to correct only their local visual stack. Use **Move to Plane** to send one element to an ordinary plane in another composition group; confirm the selected element, canvas, minimap, active group/plane, and Layers row all follow without duplication.
16. Choose **Add text** in an ordinary plane. Edit the selected text's wording, color, size, 400/600/700 weight, and left/center/right alignment; move, resize, and apply opacity/blend like any other independent element. Place it over a balloon image and confirm the two remain separately selectable.
17. Open **Edit** after creating, deleting, moving, resizing, renaming/reordering planes, changing local stack or destination plane, and editing text. Confirm **Undo** and **Redo** reverse and restore each committed document change; also confirm `Mod+Z`, `Mod+Shift+Z`, and `Ctrl+Y` follow the same history without capturing ordinary typing inside title or text fields.
18. Drag the bottom episode edge through several pointer updates and confirm one **Undo** restores the height from before the drag. Confirm title edits, the 1,280-unit **Add scroll space** action, base-color changes, plane creation/deletion, and group/plane/element eyes also enter the same bounded history.
19. Choose **File > Save** or press `Mod+S`, reload the page, and confirm the last explicitly saved format-v5 episode opens automatically and resolves its imported image through the separate local Asset Library. Make another unsaved edit, choose **File > Reopen**, accept the discard confirmation, and confirm the last save returns with its history cleared. Supported format-v3 and format-v4 fixtures should open with v5 appearance defaults.
20. Choose **File > New Episode**, accept the discard confirmation when needed, and confirm an unsaved **Untitled Episode** opens at 800 × 1,280 logical units with the pinned Background base plus one ordinary plane in each composition group and no elements. Reopen the earlier save to confirm creating a blank document did not delete the one local save slot.
21. Select representative shape, text, and image elements and confirm the bottom appearance strip controls 0–100% opacity and exactly Normal, Multiply, Screen, Overlay, and Soft Light. One continuous opacity slider gesture should require one Undo. Confirm a 0%-opacity element remains recoverable through Layers and no longer captures canvas clicks.
22. Select a Background color region and switch its fill between solid and vertical two-stop color/alpha modes; confirm canvas and minimap agree. Select an imported image and switch between **Single** and **Tile**; confirm tile coverage follows its freeform bounds while the source remains unchanged and the automatic tile edge does not exceed 160 logical units.
23. Choose **View > Reader Preview**. Confirm the complete current episode appears without editor menus, rail, canvas controls, minimap, Layers, guides, selections, or handles. Scroll, exit with its button or Escape, and confirm the prior selection, active plane, zoom, viewport, history, and dirty state are unchanged.
24. With a saved slot present, make an unsaved edit and choose **Reset demo**. Cancel and confirm nothing changes. Choose it again, confirm the warning, and verify the fixture loads as an unsaved lifecycle reset with cleared stale editor/history state; then choose **File > Reopen** to recover the last explicit save.

Run the available validation with:

```bash
corepack pnpm test
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
corepack pnpm test:e2e
```

## Build Week and model-use record

ScrollSplice is planned for the **Apps for Your Life** category. Codex with GPT-5.6 is the implementation collaborator; the local Codex configuration was verified as GPT-5.6 before implementation began.

Katherine made the controlling product decisions: prove the human editor before AI, preserve a shared scroll-native episode model, use only original synthetic demo content, keep export and OAuth out of the milestone, and wait for a genuinely testable product before requesting her product feedback. Within those boundaries, Codex with GPT-5.6:

- scaffolded and verified the locked React/Konva/Zustand stack in `bcb42dd`
- implemented and tested the framework-independent coordinate, command, and editor-state core in `c33b491`
- built the complete workspace and interaction story in `05ac06b`
- added fixed composition groups, independent group/element visibility, and the filtered Layers workflow in `f02776f`
- implemented format-v3 numbered planes, the editable episode backdrop, three-level visibility, hidden-row selection, top-to-bottom element organization, and the full-height inspector in `c5f83c5`
- implemented and validated the local Episode Setup and Expandable Scroll behavior: safe empty-plane deletion, direct episode-title editing, downward 1,280-unit extension, reset coverage, and automatic minimap refitting
- implemented the post-review controls: click-title activation, synchronized base-color controls, placed-element deletion, code-defined demo placement through the Asset Library, safe coarse and fine episode-height changes, movable solid Background color regions, and transient Fit Width-relative 50–200% two-dimensional zoom
- implemented the local corrective work after Katherine's failed manual review: anchored title editing, profile-derived editor guides, a visible center-snap magnet with bypass, proportional ordinary-element resize, free eight-handle Background-region transforms, and transient status/minimap bounds previews using the existing format-v3 bounds
- implemented the approved optional local creator-workflow foundation: a 100-checkpoint document history, one explicit versioned browser save slot, automatic loading of the last explicit save after reload, confirmed-discard Reopen/New Episode actions, and the minimal requested File/Edit menu and shortcuts
- implemented the persistent local Asset Library: five fixed rail destinations, nine original transparent built-ins, validated PNG/JPEG/WebP sources, creator categories, IndexedDB persistence, real image elements, stable source references, and explicit v3-to-v4 episode compatibility
- implemented the creator-completion organization tools without a format bump: optional plane names, same-group drag and Move Left/Right ordering, explicit Bring Forward/Send Backward, and Move to Plane
- implemented independent basic text creation and editing through the shared movement, resize, appearance, history, and persistence paths
- implemented **View > Reader Preview** as a chrome-free read-only view of the authoritative document and made Reset Demo protect dirty work while preserving the explicit saved slot
- used unit, static, production-build, browser, accessibility, and visual evidence to find and correct canvas-startup test timing, layer semantics, responsive layout, and reset-panel behavior

The historical Asset Library checkpoint passed 214 unit tests across 11 files, strict typecheck, ESLint, the production build, and four Playwright Chromium stories. The focused story proved original built-in placement, creator-category creation, a synthetic alpha-bearing PNG import, alpha compositing against sampled underlying pixels, source reuse through IndexedDB, uploaded-image resize through undo/redo, explicit Save, automatic restoration after reload, New Episode library retention, confirmed Reopen, and a responsive overlay at all three supported desktop sizes. Feature commit `fdd4ead37e7071bc7c69c9c4d8b49c557ddd95d7` was published July 15 and verified as both local and remote `main` immediately after the push; the later published format-v5 baseline is the 255-test/13-file, 6-of-6 state described above, and the creator-completion pass extends that baseline locally. The current production build's 637.55 kB minified JavaScript chunk triggers Vite's non-blocking 500 kB advisory; it is expected from the intentionally bundled React/Konva single-screen editor and does not indicate a failed build.

OpenAI-powered image creation is an optional product stretch only after the human-operated editor, validation, public access, and submission evidence are secure. If it is not built during Build Week, the submission remains the human editor. If a proof is built, it must use synthetic inputs, preserve unrestricted judge access to the base editor, and be described only to the extent actually demonstrated.

Katherine completed `/feedback` after the hands-on walkthrough. The primary core-functionality Codex Feedback Session ID is **`019f5921-6190-7520-ba51-f5e0897c5af9`**. It is also recorded in the submission checklist and still needs to be entered in the Devpost form before submission.

Official event sources:

- [OpenAI Build Week overview](https://openai.devpost.com/)
- [OpenAI Build Week official rules](https://openai.devpost.com/rules)

## WEBTOON compatibility

Publishing to WEBTOON is manual through its website. ScrollSplice will not automate WEBTOON login, upload, or publishing. Katherine's July 13 authenticated Manage Episode observation, current displayed limits, older guidance, and the remaining harmless upload behavior tests are tracked in [WEBTOON Requirements](WEBTOON_REQUIREMENTS.md).

The Build Week MVP does not claim production-ready WEBTOON export. The local corrective checkpoint implements an editor-only overlay with default-on, toggleable gray dotted candidate boundaries derived from the provisional `form-observed` export profile—every 1,280 logical units for the currently observed 800 × 1,280 WEBTOON mapping. Those guides are not document elements, do not appear in the minimap or output, and do not themselves create files.

A separate future exporter will let creators review cut positions, produce a tall master plus deterministic ordered slices, and preflight the current profile's dimensions, file-size threshold, package total, count, format, and order before manual upload. Staying within an observed or verified profile reduces known reasons for platform intervention; it cannot guarantee that WEBTOON will preserve uploaded bytes or avoid recompression, resizing, reformatting, or other optimization.

## Project documents

- [Project Outline](PROJECT_OUTLINE.md) — product vision and milestone boundaries
- [Plan](PLAN.md) — dated Build Week schedule and acceptance criteria
- [Architecture](ARCHITECTURE.md) — first-principles technical boundaries
- [Decisions](DECISIONS.md) — dated product and architecture decisions
- [Build Week Compliance](BUILD_WEEK_COMPLIANCE.md) — rule-to-evidence checklist
- [WEBTOON Requirements](WEBTOON_REQUIREMENTS.md) — publishing/export discovery
- [Agent Guide](AGENTS.md) — repository working rules
- [TODO](TODO.md) — small follow-up items only
- [Progress Screenshots](docs/progress/README.md) — dated public-safe visual checkpoints

## Privacy and licensing

Build Week fixtures, tests, screenshots, and the demo must use original synthetic content or content with documented permission. Root & Table production artwork and other private creative material must not be committed without Katherine's explicit approval. Third-party comic screenshots supplied to explain layout, masks, color transitions, or effects are design references only and are not repository or submission assets.

The source code and documentation in this repository are licensed under the [MIT License](LICENSE). That license does not automatically grant rights to third-party artwork, trademarks, or separately identified creative assets.
