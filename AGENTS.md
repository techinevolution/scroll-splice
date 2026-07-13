# ScrollForge Agent Guide

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

5. DECISIONS.md, if present
   Major product/architecture decisions and why they were made.

6. TODO.md, if present
   Small loose cleanup tasks only. Do not treat TODO.md as the roadmap.

Rules:
- If PROJECT_OUTLINE.md and PLAN.md disagree, stop and ask for clarification before implementing.
- If ARCHITECTURE.md disagrees with PROJECT_OUTLINE.md or PLAN.md, stop and ask for clarification before implementing.
- If PLAN.md is missing a current goal, next slice, deferred list, validation path, or stop rules, update/ask before implementing.
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

Do not add Next.js, Tauri, a backend, database, cloud service, or OAuth dependency during Build Week. Resolve current stable package versions during scaffolding and commit `pnpm-lock.yaml`.

## Commands

These are the approved command contracts. They become verified after the July 13 scaffold creates the corresponding package scripts:

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
- Give projects, episodes, panels, assets, and elements stable IDs.
- Route meaningful document edits through commands rather than scattered state mutations.
- Keep coordinate conversion and ordering logic small, centralized, and tested.
- Treat the Konva stage as a viewport into logical episode coordinates, never as one full-height episode canvas.
- Derive canvas, minimap, and layers from the same episode document.
- Keep future persistence, asset, export, and authentication integrations behind application-edge interfaces.
- Use synthetic assets for tests, fixtures, screenshots, and reports.
- Create architectural folders only when the active slice needs them.

## Project Boundaries

- Work locally by default. Do not add network services or upload assets without approval.
- Never destructively modify imported source images.
- Do not commit Root & Table art or other personal creative material without Katherine's explicit approval.
- Do not add AI generation, accounts, collaboration, direct publishing, or advanced art tools unless the plan is explicitly broadened.
- Do not put provider tokens, OAuth identity, or user-account fields in the episode document or editor command layer.
- Do not make major framework or storage changes without checking the project documents and recording the decision.

## Build Week Boundary

The July 21 submission must prove reviewer understanding and UX clarity through:

- a recognizable vertical comic workspace
- one shared Root & Table proof episode model
- a large viewport-sized editing canvas
- a synchronized full-episode minimap
- a layers list synchronized with canvas selection
- basic element movement only if it does not destabilize navigation or selection

Export, deployment, persistence, desktop packaging, OAuth, accounts, and cloud storage are not required for the submission. Follow the dated schedule and fallback rules in `PLAN.md`.

## UI Validation

- Run and visually inspect the application for any UI slice.
- Verify the main canvas, minimap, layers panel, and asset panel at representative desktop sizes.
- Do not claim drag behavior, synchronization, or visual correctness from static checks alone.
- Use screenshots when they materially help Katherine review a layout or interaction.

## Validation Before Final Report

- Run the relevant verified test, typecheck, lint, and build commands.
- Exercise the user story covered by the slice in the running app.
- Confirm no real creative assets or private content were added to git.
- Check `git diff` and report unrelated pre-existing changes separately.

## Git Behavior

- Work on the current branch unless Katherine says otherwise.
- Commit only a coherent, passing slice.
- Check `git remote -v` before offering to push; this repo may be local-only.
- Never push to `main` without Katherine's explicit consent.

## Final Report

Explain in plain language:

- what changed
- what now works
- what was tested and visually inspected
- what remains deferred or blocked
- what decision, if any, Katherine needs to make next

Include files changed and the recommended next slice. Do not bury the outcome in raw technical detail.
