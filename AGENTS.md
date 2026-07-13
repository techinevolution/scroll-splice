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
- Use the Build Week flat element model, provisional `800`-unit logical width, and one fixed fit scale; do not add panel groups, nested layers, or zoom during the MVP.
- Keep the minimap a lightweight React/CSS/SVG representation, not a second Konva editor.
- Center and clamp the viewport when the layers list selects an off-screen element.
- Keep future persistence, asset, export, and authentication integrations behind application-edge interfaces.
- Keep future OpenAI model access, image generation, project context, editor tools, and run coordination behind the application-edge interfaces in `ARCHITECTURE.md`.
- Expose logical, serializable project context to a future model; never expose React components, Konva nodes, Zustand setters, raw filesystem handles, or credentials.
- Route every future model-driven document edit through the same implemented and tested command used by the human editor.
- Keep future platform limits in a versioned `ExportProfile`, never in the episode model or scattered UI constants.
- Prefer original code-rendered shapes and text for the Build Week sample. If a separate fixture asset is introduced, record its provenance and license.
- Create architectural folders only when the active slice needs them.

## Project Boundaries

- Work locally by default. The approved exceptions for Build Week are the public GitHub repository, an unrestricted static judge-access deployment, and the public submission video. Do not upload private assets to any of them.
- Never destructively modify imported source images.
- Do not commit Root & Table art or other personal creative material without Katherine's explicit approval.
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

Production export, import, persistence, undo, resize, ordering, desktop packaging, OAuth, accounts, cloud storage, autonomous creation, and direct publishing are not required for the submission. A single synthetic OpenAI generate-and-place proof is optional only after the complete human MVP, validation, public access, and submission evidence pass and Katherine approves its additional gate. The editor and judge walkthrough must work without model access. Static deployment is required only as the simplest judge-access path. Follow the dated schedule and fallback rules in `PLAN.md`.

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
- Verify the main canvas, minimap, and layers panel at representative desktop sizes; inspect the collapsed asset placeholder only if that approved placeholder exists.
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
- Katherine explicitly approved creating and populating `main` with the July 12 baseline and the July 13 documentation/compliance slice. That approval does not automatically authorize later implementation pushes.
- Never rewrite the baseline commit or tag, even during cleanup.

## Final Report

Explain in plain language:

- what changed
- what now works
- what was tested and visually inspected
- what remains deferred or blocked
- what decision, if any, Katherine needs to make next

Include files changed and the recommended next slice. Do not bury the outcome in raw technical detail.
