# ScrollSplice TODO

Small loose actions only. Product direction and dated implementation work belong in [PLAN.md](PLAN.md); the full submission checklist belongs in [BUILD_WEEK_COMPLIANCE.md](BUILD_WEEK_COMPLIANCE.md).

## Katherine — completed

- [x] Park the optional organizer API/SDK clarification question; it does not block the current plan and can be revisited before submission if ambiguity remains.
- [x] Approve today's narrow implementation start: scaffold the locked stack and create the original six-beat synthetic fixture. This is not approval for the entire July 14 interaction slice.
- [x] Approve the first testable-editor `/goal` and authorize Codex to commit and push each coherent passing slice to `main` until that complete milestone is ready for product review.
- [x] Run the complete editor walkthrough and give product feedback on clarity, navigation, selection, movement, and reset.
- [x] Run `/feedback` in this primary core-functionality task; Session ID `019f5921-6190-7520-ba51-f5e0897c5af9` is recorded in README and `BUILD_WEEK_COMPLIANCE.md`.

## Katherine — next approval

- [x] Approve the composition-groups and visibility slice in `PLAN.md`.
- [x] Review the implemented composition groups and eye controls in the running app and clarify the numbered layer-plane model.
- [x] Approve the **layer planes and episode backdrop** foundation in `PLAN.md`.
- [x] Approve **Episode Setup and Expandable Scroll** in `PLAN.md`.
- [x] Test **Episode Setup and Expandable Scroll**; confirm empty-plane deletion and minimap behavior after expansion.
- [x] Approve the ordered A/B/C work request: **Direct Creator Controls**, **Safe Precise Height and Background Color Regions**, then **Canvas Zoom and 2D Viewport**.
- [x] Run the next **HUMAN TEST and direction checkpoint** on the completed A/B/C build; confirm placed-element deletion, the bottom **Add asset** action, minimap behavior, and ordinary movement; record the title-anchor and Background-region drag findings.
- [x] Approve **Export-aware polish and alpha controls** as the next implementation goal after the documentation/publication checkpoint.
- [x] Authorize publishing the already passing A/B/C implementation and matching documentation to `main` on July 14.
- [x] Re-test corrective checkpoint D and mark it **PASS WITH NOTES**: live coordinates, minimap sync, eight Background-region handles, snap override, and Option-drag pass; minimap aspect distortion remains polish.
- [x] Approve the optional local history/save/menu slice: bounded undo/redo, one explicit local save, reload/reopen, blank New Episode, and only the requested File/Edit commands.
- [x] Test the completed local history/save/menu slice: undo/redo representative edits, Save, page reload, later unsaved edit, confirmed Reopen, New Episode, and recovery of the retained save. Katherine reported July 15 that the tests completed and everything works well.

## Katherine — before submission

- [ ] On or around July 19, approve the separately scoped GitHub Pages deployment after the product-building window closes.
- [ ] Paste the recorded Codex Feedback Session ID into the Devpost submission form.

## Codex — after the relevant gate

- [x] After implementation approval: create the original six-beat fixture from code-rendered shapes and text as part of the foundation slice.
- [x] Build, validate, push, and prepare the complete human editor for Katherine's product review.
- [x] After Katherine runs `/feedback`: record the returned Session ID in README and `BUILD_WEEK_COMPLIANCE.md`.
- [x] Implement and validate the approved composition groups and visibility checkpoint.
- [x] Record Katherine's clarified base-background, unrestricted planes, opacity, movable color-region, tab-overflow, draggable-tab, and Clip Studio-style panel-mask direction in the project documents.
- [x] Implement and validate the approved numbered layer-plane and editable-backdrop foundation in `c5f83c5`.
- [x] Record Katherine's empty-plane deletion, editable-title, expandable-scroll, minimap-refit, and adjustable-view feedback and map it into separately gated slices.
- [x] Implement and validate **Episode Setup and Expandable Scroll**, including paired empty-plane actions, safe deletion, editable current-episode title, repeatable 1280-unit downward extension, minimap refitting, reset coverage, and regression validation.
- [x] Implement and validate checkpoint A: click-to-edit title without a pencil, synchronized Layers/canvas base controls, placed-element trash beside the eye, and a paperclip that opens the Assets drawer and places code-defined synthetic demo rectangles in empty or populated ordinary planes.
- [x] Implement and validate checkpoint B: safe precise pointer/keyboard height changes plus solid movable Background color regions with chosen start, length, and color, without clipping visible or hidden elements or shrinking below 1280 units.
- [x] Implement and validate checkpoint C: **Canvas Zoom and 2D Viewport** with Fit Width-relative 50–200%, horizontal access, accurate minimap geometry, and element movement at non-default zoom.
- [x] Record the local A/B/C evidence: 94 unit tests, strict typecheck, ESLint, production build, isolated Playwright Chromium walkthrough, and visual QA at 1440 × 900, 1280 × 720, and 1024 × 768.
- [x] Document the current creator-controls screenshot as the build Katherine tested on July 14, including what worked and the follow-up findings.
- [x] Publish the validated Episode Setup and A/B/C implementation stack, screenshot evidence, and export-aware planning documents to `main` through `8a493a2`.
- [x] Implement and validate the original corrective checkpoint D locally. Its fixed-width `x = 0`, vertical-only, no-Background-resize rule is preserved only as historical evidence and superseded by the next item.
- [x] Implement and browser-validate freely editable Background-region `x/y/width/height`, eight independent handles, center magnet/bypass, transient live status/minimap bounds, and one pure command commit at gesture end. Format remains v3.
- [x] Complete the corrective checkpoint's 123-test regression suite, static/build checks, expanded Chromium walkthrough, and supported-size visual inspection, then hand it to Katherine for the human test above. It was unpushed at that checkpoint and was later incorporated into the July 15 stack published in `fdd4ead`.
- [x] Implement and validate the optional local history/save/menu slice: 100-checkpoint document history, one-step height drag, one explicit versioned browser save, reload/Reopen/New Episode, minimal File/Edit menus, shortcuts, validation/error handling, and visible document status.
- [x] Record the slice's 154 unit tests, strict typecheck, ESLint, production build, two isolated Chromium tests, supported-size visual inspection, and public-safe screenshot. Katherine reviewed it and it was later published with the Asset Library stack in `fdd4ead`.
- [x] After Katherine tests the local history/save/menu slice, choose the simple persistent Asset Library as the next bounded slice and record the explicit v3-to-v4 compatibility decision.
- [x] Publish the implemented, validated, and screenshot-documented Asset Library stack—Uploads, original Speech Balloons, Decorations, Splatters, creator categories, image placement, proportional resize, atomic local source persistence, and v3-to-v4 opening—to `main` in `fdd4ead37e7071bc7c69c9c4d8b49c557ddd95d7`; local and remote heads matched after the July 15 push.
- [x] Implement and browser-test the July 15 review corrections: top-level menus above the Asset Library, compact visible **Decor** rail text, and active-category toggle-close.
- [x] Publish the validated review corrections and public-safe `2026-07-15-menu-and-asset-rail-polish.png` evidence to `main` in `3ec9bd095fab5ba2fb19f9d97cfeb79fcdbceae5`; local and remote heads matched after the push.
- [ ] Later built-in artwork polish: replace or repair the visible white seam in the original Oval and Rounded balloon outlines; do not block current creator work on it.
- [ ] Polish the minimap's visible aspect distortion without changing its shared logical geometry or blocking the current workflow.
- [x] After the corrective product checkpoint passes locally, give Katherine one reconciled list of implemented features and remaining requests from the documents and this task before proposing more product work.

## Joint — only if the human MVP finishes early

- [ ] Decide whether to spend remaining Build Week time on the optional generate-and-place proof or submission polish.
- [ ] If choosing the proof, verify an officially supported OpenAI authorization path and approve the network, credential, privacy, synthetic-data, cost, and time limits before adding dependencies.
- [ ] Keep the judge-facing human editor usable without OpenAI login or credits; abandon the proof immediately if it threatens validation or submission evidence.

## Joint — later, not Build Week scope

- [x] Before the speech-balloon asset slice: review current Clip Studio official balloon guidance and professional lettering conventions; use only a small neutral original set, treat meanings as conventions rather than rules, and keep readable names/controls while text editing remains deferred.
- [ ] Before production export: Katherine signs into WEBTOON and performs the harmless unpublished upload test; Codex prepares safe test files, records generalized results, and updates [WEBTOON Requirements](WEBTOON_REQUIREMENTS.md). Do not automate login or publishing.
- [ ] After that upload verification and a separate export-slice approval: implement creator-reviewed deterministic slicing and preflight against a verified `ExportProfile`; do not promise that WEBTOON will preserve accepted files without optimization.
- [ ] Before full autonomous creation: define approved project context, reference-image consent, generation budget, cancellation/recovery behavior, provenance fields, and which editor commands may run without per-action approval.
