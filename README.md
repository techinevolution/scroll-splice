# ScrollSplice

ScrollSplice is a scroll-native vertical comic editor. Its defining workspace combines a large editing viewport, a full-episode minimap, a synchronized layers list, and direct manipulation of comic elements.

This repository is the public Build Week record for ScrollSplice: <https://github.com/techinevolution/scroll-splice>.

**Name screen:** ScrollSplice replaced the conflicted ScrollForge working name on July 13. A basic exact-name screen found no matching software brand in general web search, GitHub repositories, npm, or PyPI. This is practical risk reduction, not legal trademark clearance; see [Build Week Compliance](BUILD_WEEK_COMPLIANCE.md#name-screen-and-clearance).

## Status and Build Week provenance

Katherine identified the seven original planning documents as work completed on July 12, 2026, before the Build Week submission period opened. They were first committed unchanged on July 13 at 11:28:56 AM PT as root commit `e4db897`, then marked by the annotated tag `pre-build-week-planning`. That baseline contains seven Markdown planning files and no application code. The Git timestamp proves when the snapshot was preserved; the separate timestamped July 12 Codex-session evidence is recorded in [Build Week Compliance](BUILD_WEEK_COMPLIANCE.md#3-pre-existing-work-boundary).

All judged implementation work will be committed after the July 13, 2026 9:00 AM PT submission-period start. Do not amend, squash, or rewrite the baseline commit or tag. See [Build Week Compliance](BUILD_WEEK_COMPLIANCE.md) for the evidence and final submission checklist.

Post-start documentation/compliance work is recorded separately in commit `a567865` at 11:50:26 AM PT on July 13. It adds the rules checklist, scope corrections, WEBTOON discovery, license, and privacy ignores, but still contains no application code.

Implementation began later on July 13 with the locked application scaffold, framework-independent episode model, and original six-beat **Signal in the Fog** fixture. The fixture contains 30 named layers made entirely from code-defined shapes and text; no private comic art is included. Katherine then approved one primary `/goal` through the first complete human-editor MVP and authorized Codex to commit and push each coherent passing checkpoint to `main`.

That testable editor is now complete in commits `c33b491` and `05ac06b`. It includes the desktop workspace, viewport-sized Konva canvas, synchronized full-episode minimap, Photoshop-style layers list, wheel and minimap navigation, canvas/layer selection, off-screen layer reveal, selected-element movement, a collapsible synthetic-asset placeholder, and a full reset. Katherine's next checkpoint is hands-on product review and `/feedback`; public deployment and submission media have not begun.

## Product sequence

### Build Week MVP — due July 21

The contest submission is the smallest complete, coherent ScrollSplice editor experience:

- one original vertical-comic fixture rendered from code-defined shapes and text
- a viewport-sized editing canvas
- a synchronized full-episode minimap
- a layers list synchronized with canvas selection
- one meaningful edit: move the selected element, plus reset
- public judge access and the required submission evidence

Import, persistence, undo, resize, ordering, production export, accounts, OAuth, OpenAI model access, autonomous generation, and direct publishing are deliberately outside the required milestone. If the human editor and every submission dependency are already stable, a narrowly bounded OpenAI image-generation proof may be attempted as stretch work; the submitted editor must not depend on it.

### Creator-ready MVP — after Build Week

The longer product milestone adds local asset import, saving and reopening, safe undo, ordering, reader preview, and a validated export pipeline. WEBTOON requirements are discovery inputs for that future exporter, not a reason to enlarge the one-week MVP.

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

Open the local URL printed by Vite in a desktop Chrome-class browser. The editor has been inspected at 1440 × 900 and 1280 × 720 and verified through Playwright Chromium.

Suggested review walkthrough:

1. Scroll over the story canvas to move through the episode.
2. Click the minimap or drag its cyan viewport frame.
3. Select a layer from another beat and confirm the canvas centers it.
4. Select an element on the canvas and confirm its layer is selected.
5. Drag the selected element, then choose **Reset demo** and confirm the starting state returns.
6. Open and close **Assets** to inspect the deliberately limited Build Week placeholder.

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
- used unit, static, production-build, browser, accessibility, and visual evidence to find and correct canvas-startup test timing, layer semantics, responsive layout, and reset-panel behavior

The July 13 validation passed 15 unit tests across four files, strict typecheck, ESLint, the production build, and the complete Playwright Chromium walkthrough three consecutive times. The build warning about a JavaScript chunk slightly above 500 kB is non-blocking and comes from the intentionally bundled React/Konva editor stack; code-splitting is not useful for this single-screen MVP.

OpenAI-powered image creation is an optional product stretch only after the human-operated editor, validation, public access, and submission evidence are secure. If it is not built during Build Week, the submission remains the human editor. If a proof is built, it must use synthetic inputs, preserve unrestricted judge access to the base editor, and be described only to the extent actually demonstrated.

The final submission also requires the Codex Session ID produced by `/feedback` from this primary core-functionality task. Katherine should run `/feedback` after her hands-on walkthrough; the returned ID must then be recorded here and in the submission checklist.

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

## Privacy and licensing

Build Week fixtures, tests, screenshots, and the demo must use original synthetic content or content with documented permission. Root & Table production artwork and other private creative material must not be committed without Katherine's explicit approval.

The source code and documentation in this repository are licensed under the [MIT License](LICENSE). That license does not automatically grant rights to third-party artwork, trademarks, or separately identified creative assets.
