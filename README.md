# ScrollForge

ScrollForge is a scroll-native vertical comic editor. Its defining workspace combines a large editing viewport, a full-episode minimap, a synchronized layers list, and direct manipulation of comic elements.

This repository is the public Build Week record for ScrollForge: <https://github.com/techinevolution/scroll-forge>.

**Working-name notice:** a July 13 public name screen found existing unrelated products using “ScrollForge,” including another creative-design application. The repository keeps Katherine's requested working name, but final submission branding requires the decision recorded in [Build Week Compliance](BUILD_WEEK_COMPLIANCE.md#name-screen-and-clearance).

## Status and Build Week provenance

Katherine identified the seven original planning documents as work completed on July 12, 2026, before the Build Week submission period opened. They were first committed unchanged on July 13 at 11:28:56 AM PT as root commit `e4db897`, then marked by the annotated tag `pre-build-week-planning`. That owner-attested baseline contains seven Markdown planning files and no application code. The Git timestamp proves when the snapshot was preserved; it does not independently prove the earlier creation date.

All judged implementation work will be committed after the July 13, 2026 9:00 AM PT submission-period start. Do not amend, squash, or rewrite the baseline commit or tag. See [Build Week Compliance](BUILD_WEEK_COMPLIANCE.md) for the evidence and final submission checklist.

No application scaffold or product code exists yet. The approved commands below therefore remain unverified until Katherine separately authorizes implementation.

## Two milestones

### Build Week MVP — due July 21

The contest submission is the smallest complete, coherent ScrollForge editor experience:

- one original vertical-comic fixture rendered from code-defined shapes and text
- a viewport-sized editing canvas
- a synchronized full-episode minimap
- a layers list synchronized with canvas selection
- one meaningful edit: move the selected element, plus reset
- public judge access and the required submission evidence

Import, persistence, undo, resize, ordering, production export, accounts, OAuth, and direct publishing are deliberately outside this milestone.

### Creator-ready MVP — after Build Week

The longer product milestone adds local asset import, saving and reopening, safe undo, ordering, reader preview, and a validated export pipeline. WEBTOON requirements are discovery inputs for that future exporter, not a reason to enlarge the one-week MVP.

## Locked stack

- Node.js 22 and pnpm 10
- React 19 with strict TypeScript and Vite 8
- React-Konva/Konva for the viewport-sized interactive canvas
- Zustand for shared document and editor state
- Plain CSS for the application shell and panels
- Vitest, Playwright, ESLint, and `tsc --noEmit` for validation

The intended command contracts are:

```bash
corepack pnpm install
corepack pnpm dev
corepack pnpm test
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
corepack pnpm test:e2e
```

## Build Week and model-use record

ScrollForge is planned for the **Apps for Your Life** category. Codex with GPT-5.6 is the implementation collaborator; the local Codex configuration was verified as GPT-5.6 before implementation began. Dated commits will show where Codex accelerated architecture, implementation, testing, and review. The README must be updated with concrete examples from the finished work rather than invented retrospective claims.

The final submission also requires the Codex Session ID produced by `/feedback` from the primary task that implements ScrollForge's core functionality. That ID does not exist yet and must be recorded here and in the submission checklist when generated.

Official event sources:

- [OpenAI Build Week overview](https://openai.devpost.com/)
- [OpenAI Build Week official rules](https://openai.devpost.com/rules)

## WEBTOON compatibility

Publishing to WEBTOON is manual through its website. ScrollForge will not automate WEBTOON login, upload, or publishing. Current confirmed requirements, older/provisional episode limits, and the required authenticated discovery test are tracked in [WEBTOON Requirements](WEBTOON_REQUIREMENTS.md).

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
