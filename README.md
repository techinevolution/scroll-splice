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

Katherine reviewed `c5f83c5` positively on July 13 and identified the next creator-facing needs. The resulting **Episode Setup and Expandable Scroll** slice is now implemented locally and validated: creators can safely delete a genuinely empty ordinary plane, edit the current episode title, add 1,280 logical units from the bottom of the story, and keep the full episode and viewport represented accurately in the refitted minimap. The matching paperclip **Attach asset** action is visibly disabled as a future placeholder. The `+` beside the numbered tabs still creates a plane; the separate **Add scroll space** control changes episode height. A public-safe view of this local checkpoint is preserved in the [progress record](docs/progress/2026-07-13-episode-setup-and-expandable-scroll.png).

## Product sequence

### Build Week MVP — due July 21

The contest submission is the smallest complete, coherent ScrollSplice editor experience:

- one original vertical-comic fixture rendered from code-defined shapes and text
- a viewport-sized editing canvas
- a synchronized full-episode minimap
- a layers list synchronized with canvas selection
- one meaningful edit: move the selected element, plus reset
- public judge access and the required submission evidence

Import, persistence, undo, resize, creator-controlled reordering, production export, accounts, OAuth, OpenAI model access, autonomous generation, and direct publishing are deliberately outside the required milestone. If the human editor and every submission dependency are already stable, a narrowly bounded OpenAI image-generation proof may be attempted as stretch work; the submitted editor must not depend on it.

### Creator-ready MVP — phased beyond the core

The full creator-ready milestone adds local asset import, saving and reopening, safe undo, creator-controlled reordering, reader preview, and a validated export pipeline. Most of that work remains after Build Week. The completed composition-groups and visibility foundation does not make the full creator-ready milestone a submission requirement. WEBTOON requirements are discovery inputs for the future exporter, not a reason to enlarge the one-week minimum.

Its workspace model uses three fixed full-scroll composition groups—**Background**, **Content**, and **Foreground**—above the story canvas. Inside each group, numbered **layer planes** provide open-ended creative surfaces; assets, text, shapes, color regions, and other placed items are **elements** inside one plane. Only Background plane 1 is pinned as the editable episode-wide base color. Every other plane remains flexible rather than forcing creators into predefined panel, character, or effect boxes.

The numbered-plane and editable-backdrop foundation and the local **Episode Setup and Expandable Scroll** slice are now implemented. Empty-plane deletion protects Background plane 1, populated planes, and the final plane in each group; title edits enforce the observed 60-character WEBTOON limit; extension leaves existing content and viewport position intact while the base and minimap follow the longer episode. **Attach asset** remains deliberately disabled until the Asset Library workflow exists.

The recommended next slice is **Canvas Zoom and 2D Viewport**, which is not approved or implemented. It would replace the passive fit readout with **Fit Width**, a 50–200% range, horizontal access when the enlarged episode is wider than the viewport, and an accurate two-dimensional minimap viewport. **Asset properties and opacity** remains third in the proposed sequence. Movable background color regions, tab drag reordering, the category-based **Add** rail, import, resize, persistence, export, deployment, and AI work all remain deferred. See [Project Outline](PROJECT_OUTLINE.md#creator-ready-mvp-components) and [Plan](PLAN.md).

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

Open the local URL printed by Vite in a desktop Chrome-class browser. The current local Episode Setup and Expandable Scroll checkpoint has been visually inspected at 1440 × 900, 1280 × 720, and 1024 × 768 and verified through isolated Playwright Chromium runs.

Suggested review walkthrough for the currently implemented checkpoint:

1. Switch among **Background**, **Content**, and **Foreground** and confirm the numbered plane tabs and element list follow the active group without changing the composed episode.
2. Select Background plane 1, change **Base color**, and confirm the canvas and minimap update together; hide the base to reveal the editor-only checkerboard.
3. Use the `+` beside the numbered tabs to create an ordinary plane. Confirm its empty state offers **Delete plane** and a visibly disabled **Attach asset** placeholder; the paperclip does not attach anything yet.
4. Delete that empty plane, then confirm Background plane 1, populated planes, and the last remaining plane in a group cannot be deleted.
5. Use the pencil beside the episode title. Confirm Enter or leaving the field saves, Escape cancels, and an empty edit restores the existing title.
6. Hide an element and confirm its row remains selectable even though it does not render or capture canvas clicks.
7. Scroll over the story canvas, then click the minimap or drag its cyan viewport frame to move through the episode.
8. Reach the current story bottom and choose **Add scroll space**. Confirm the episode grows by 1,280 units, existing content stays put, the base continues downward, and the minimap refits the full longer episode. This is separate from numbered-plane creation.
9. Select an element row from another beat and confirm the canvas centers it; select an element on the canvas and confirm its group, plane, and row synchronize.
10. Confirm the active plane's rows follow the story from top to bottom, then drag a selected element and choose **Reset demo** to restore the fixture title, height, visibility, planes, base color, selection, and viewport.
11. Open and close **Assets** to inspect the deliberately limited Build Week placeholder.

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
- used unit, static, production-build, browser, accessibility, and visual evidence to find and correct canvas-startup test timing, layer semantics, responsive layout, and reset-panel behavior

The current local July 13 validation passes 63 tests, strict typecheck, ESLint, the production build, and the expanded Playwright Chromium walkthrough. The Episode Setup and Expandable Scroll interface was visually inspected at 1440 × 900, 1280 × 720, and 1024 × 768. The build warning about a JavaScript chunk slightly above 500 kB is non-blocking and comes from the intentionally bundled React/Konva editor stack; code-splitting is not useful for this single-screen MVP.

OpenAI-powered image creation is an optional product stretch only after the human-operated editor, validation, public access, and submission evidence are secure. If it is not built during Build Week, the submission remains the human editor. If a proof is built, it must use synthetic inputs, preserve unrestricted judge access to the base editor, and be described only to the extent actually demonstrated.

Katherine completed `/feedback` after the hands-on walkthrough. The primary core-functionality Codex Feedback Session ID is **`019f5921-6190-7520-ba51-f5e0897c5af9`**. It is also recorded in the submission checklist and still needs to be entered in the Devpost form before submission.

Official event sources:

- [OpenAI Build Week overview](https://openai.devpost.com/)
- [OpenAI Build Week official rules](https://openai.devpost.com/rules)

## WEBTOON compatibility

Publishing to WEBTOON is manual through its website. ScrollSplice will not automate WEBTOON login, upload, or publishing. Katherine's July 13 authenticated Manage Episode observation, current displayed limits, older guidance, and the remaining harmless upload behavior tests are tracked in [WEBTOON Requirements](WEBTOON_REQUIREMENTS.md).

The Build Week MVP does not claim production-ready WEBTOON export. A future exporter will produce a tall master plus validated, ordered platform slices and will report dimension, file-size, and count problems before export.

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
