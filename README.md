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

All three checkpoints are implemented and validated. The title itself activates editing without a permanent pencil; Background plane 1 can be recolored from either Layers or the canvas; placed elements have instance-only trash actions; and an ordinary plane's bottom **Add asset** paperclip opens the Asset Library, whose code-defined swatches can place synthetic demo rectangles into empty or populated planes. Real image import remains deferred. Creators can add a full-width solid color region to an ordinary Background plane by choosing its start, length, and color, then move, hide, select, or delete it like another placed element. Episode height keeps the fast 1,280-unit addition and adds pointer-drag and keyboard fine-tuning that cannot shrink below 1,280 units or clip visible or hidden content. **Fit Width** is the 100% reference for transient 50–200% zoom, horizontal and vertical access, and an accurate two-dimensional minimap viewport. A public-safe view is preserved in the [creator-controls, height, and zoom screenshot](docs/progress/2026-07-13-creator-controls-height-and-zoom.png).

Katherine tested that complete build on July 14. She confirmed that placed-element deletion, the bottom **Add asset** action, expanded-height minimap behavior, and ordinary canvas movement work. Her next manual review failed the proposed polish checkpoint because activating title editing still shifted the fixed **EPISODE** label, the promised 1,280-unit guides were not visible, and full-width Background color regions could drift sideways in the live canvas even though the shared document and minimap still held `x = 0`. Scrolling the region out of view and back remounted it at the document position. The visible magnet and corner resize handles were also missing.

The resulting corrective checkpoint is now implemented and validated locally and is awaiting Katherine's human retest before more product work begins. It gives the title a stable anchored footprint; introduces a provisional, clearly `form-observed` export-profile seam and default-on toggleable editor-only guides at scaled 1,280-unit candidates; adds a visible default-on magnet with an 8 CSS-pixel episode-center snap, temporary center guide, and magnet-off or Alt/Option bypass; constrains full-width Background regions live and structurally to `x = 0`; and adds four proportional corner handles to selected, unlocked ordinary elements. Corner resize has a 24-logical-unit minimum, excludes Background color regions, does not rotate or flip, scales text size with its bounds, and updates the minimap from the same committed element geometry. This directly requested corrective addition is not a general transform system and does not change the document schema from format v3. No push has occurred; remote `main` remains at `6d6437e`, which includes the earlier implementation published through `8a493a2`. A public-safe view is recorded in the [stable editing, guides, and resize screenshot](docs/progress/2026-07-14-stable-editing-guides-and-resize.png).

## Product sequence

### Build Week MVP — due July 21

The contest submission is the smallest complete, coherent ScrollSplice editor experience:

- one original vertical-comic fixture rendered from code-defined shapes and text
- a viewport-sized editing canvas
- a synchronized full-episode minimap
- a layers list synchronized with canvas selection
- one meaningful edit: move the selected element, plus reset
- public judge access and the required submission evidence

Import, persistence, undo, a broader transform system, creator-controlled reordering, production export, accounts, OAuth, OpenAI model access, autonomous generation, and direct publishing are deliberately outside the required milestone. The local corrective checkpoint includes only proportional corner resize for selected unlocked ordinary elements because Katherine requested it during the failed manual review; rotation, flipping, freeform distortion, and Background-region resize remain deferred. If the human editor and every submission dependency are already stable, a narrowly bounded OpenAI image-generation proof may be attempted as stretch work; the submitted editor must not depend on it.

### Creator-ready MVP — phased beyond the core

The full creator-ready milestone adds local asset import, saving and reopening, safe undo, creator-controlled reordering, reader preview, and a validated export pipeline. Most of that work remains after Build Week. The completed composition-groups and visibility foundation does not make the full creator-ready milestone a submission requirement. WEBTOON requirements are discovery inputs for the future exporter, not a reason to enlarge the one-week minimum.

Its workspace model uses three fixed full-scroll composition groups—**Background**, **Content**, and **Foreground**—above the story canvas. Inside each group, numbered **layer planes** provide open-ended creative surfaces; assets, text, shapes, color regions, and other placed items are **elements** inside one plane. Only Background plane 1 is pinned as the editable episode-wide base color. Every other plane remains flexible rather than forcing creators into predefined panel, character, or effect boxes.

The numbered-plane and editable-backdrop foundation, **Episode Setup and Expandable Scroll**, and the three post-review checkpoints are implemented and published on `main` through `8a493a2`. Empty-plane deletion protects Background plane 1, populated planes, and the final plane in each group; title edits enforce the observed 60-character WEBTOON limit; height changes leave existing content intact while the base and minimap follow the episode. The paperclip now opens the Asset Library and can place only the original code-defined demo swatches. It does not import, persist, or upload a real image.

Katherine's July 14 A/B/C human-test checkpoint is complete. The first proposed polish review then exposed the defects and missing interactions above. **Stable editing chrome, candidate guides, and bounded corner resize** is implemented locally as a corrective checkpoint and must pass validation plus Katherine's human retest before another slice is chosen. The previously proposed element-opacity and basic Background-fade checkpoint has not started and is not automatically next; it remains available for a new go/no-go decision after review. Production file export remains a separate later checkpoint because it writes and validates real output files. Real import, persistence, undo, tab reordering, deployment, and AI work remain deferred. See [Project Outline](PROJECT_OUTLINE.md#creator-ready-mvp-components) and [Plan](PLAN.md#current-corrective-checkpoint-stable-editing-guides-and-bounded-corner-resize).

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

Open the local URL printed by Vite in a desktop Chrome-class browser. The corrective checkpoint passes 120 unit tests, strict typecheck, ESLint, production build, and the isolated expanded Playwright Chromium walkthrough. Its running UI was visually inspected at 1440 × 900, 1280 × 720, and 1024 × 768, with proportional handle behavior also checked at 50%, 100%, and 200% zoom.

Suggested review walkthrough for the currently implemented local build:

1. Switch among **Background**, **Content**, and **Foreground** and confirm the numbered plane tabs and element list follow the active group without changing the composed episode.
2. Select Background plane 1, change **Base color** from Layers and from the canvas-side control, and confirm both controls, the canvas, and minimap stay synchronized; hide the base to reveal the editor-only checkerboard.
3. Use the `+` beside the numbered tabs to create an ordinary plane. Confirm its empty state offers **Delete plane** and a paperclip that opens the **Asset Library**. Choose a code-defined swatch and confirm it places a synthetic rectangle; repeat in a populated ordinary plane. This is demo placement, not real image import.
4. Delete that empty plane, then confirm Background plane 1, populated planes, and the last remaining plane in a group cannot be deleted.
5. Click the episode title text itself. Confirm the input and cursor appear only after activation, Enter or leaving the field saves, Escape cancels, and an empty edit restores the existing title. Confirm the fixed **EPISODE** label and reset control do not move when editing starts or ends.
6. Hide an element and confirm its row remains selectable even though it does not render or capture canvas clicks.
7. Scroll over the story canvas, then click the minimap or drag its cyan viewport frame to move through the episode.
8. Reach the current story bottom and choose **Add scroll space**. Confirm the episode grows by 1,280 units. Then use the bottom height handle with a pointer or its keyboard controls to add or remove a smaller amount; confirm shrinking stops at the higher of 1,280 units and the lowest visible or hidden element.
9. In an ordinary Background plane, add a solid color region with a chosen start, length, and color. Drag diagonally and confirm it follows only the pointer's vertical movement: it remains full width at `x = 0` during the live drag, after release, in the minimap, and after scrolling away and back.
10. Use **Fit Width** and the 50–200% zoom control. Confirm zoomed content remains reachable on both axes and the minimap frame shows and controls the same visible rectangle.
11. Confirm **Magnet** and **Slice guides** start enabled. Move an ordinary element close to the episode center and confirm it snaps within 8 screen pixels while a temporary center guide appears; turn the magnet off or hold Alt/Option to bypass it. Hide and show the dotted 1,280-unit candidate guides and confirm neither toggle changes document geometry or the minimap.
12. Select an unlocked ordinary shape or text element and resize it proportionally from each of its four corner handles. Confirm it cannot shrink below 24 logical units, cannot rotate or flip, and its minimap representation follows the same committed bounds. Full-width Background color regions intentionally do not show resize handles.
13. Select an element row from another beat and confirm the canvas reveals it; select an element on the canvas and confirm its group, plane, and row synchronize. Use the trash beside an element eye and confirm only that placed instance is removed.
14. Confirm the active plane's rows follow the story from top to bottom, then drag a selected element and choose **Reset demo** to restore the fixture title, height, visibility, planes, base color, selection, transient magnet/guide state, viewport, and zoom.

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
- implemented the local corrective checkpoint after Katherine's failed manual review: anchored title editing, live vertical-only Background-region movement, profile-derived editor guides, a visible center-snap magnet with bypass, and bounded proportional corner resize using the existing format-v3 bounds
- used unit, static, production-build, browser, accessibility, and visual evidence to find and correct canvas-startup test timing, layer semantics, responsive layout, and reset-panel behavior

The local post-review build passes 94 unit tests, strict typecheck, ESLint, the production build, and an isolated expanded Playwright Chromium walkthrough including element movement at 200% zoom. It was visually inspected at 1440 × 900, 1280 × 720, and 1024 × 768. The build warning about a JavaScript chunk slightly above 500 kB is non-blocking and comes from the intentionally bundled React/Konva editor stack; code-splitting is not useful for this single-screen MVP.

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
