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
- [x] Approve the next five-slice `/goal`: Asset Library drag-to-canvas placement, format-v5 opacity, vertical two-stop gradient/fade, tiled texture presentation, and five restrained blend modes. Existing real upload, source alpha, and ordinary Background-photo placement stay intact.
- [x] Approve the July 15 creator completion pass: plane organization/element stacking, basic independent text, and reader preview with a safe Reset Demo boundary.
- [x] Publish all three creator-completion slices and their full regression story to `main` in `cb1f28443f7b1045d139879a2bba7b03edf25856`.
- [x] Replace the three-slice stopping point with one authorized locally feasible human-editor completion goal; do not ask Katherine to select each remaining feature slice individually.
- [ ] Use [FEATURE_TEST_SHEET.md](FEATURE_TEST_SHEET.md) for the broad completion-pass hands-on review after Codex reports final regression and visual closeout.

## Katherine — before submission

- [x] Approve the separately scoped GitHub Pages deployment and clean-browser public-editor check on July 19.
- [ ] Paste the working editor URL into Devpost: <https://techinevolution.github.io/scroll-splice/>.
- [ ] Paste the recorded Codex Feedback Session ID into the Devpost submission form.

## Codex — after the relevant gate

- [x] Publish the validated adapter-plane and architecture-alignment reconciliation commits after Katherine explicitly approves a push to `main`.
- [x] Publish the human editor to GitHub Pages and pass the clean-browser walkthrough.

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
- [x] Merge the redundant My Library rail destination into Uploads; keep one personal-library drawer with **All**, **Unsorted**, and creator-named filters.
- [x] Implement and validate native Asset Library drag-to-canvas placement through the shared pan/zoom coordinate seam while preserving click-to-place as the accessible fallback.
- [x] Implement and validate the bounded v3/v4-to-v5 appearance transition plus universal element opacity, one-step slider history, zero-opacity Layers recovery, and multiplicative source alpha.
- [x] Implement and validate a Background color region's vertical two-stop color/alpha fill for both gradients and fades, with matching canvas and minimap output.
- [x] Implement and validate single/tile image presentation using unchanged imported sources, freeform texture-coverage bounds, and fixed automatic tile scale capped at a 160-logical-unit tile edge.
- [x] Implement and pixel-test exactly Normal, Multiply, Screen, Overlay, and Soft Light; carry all appearance data through undo/redo, Save, reload, Reopen, and reset.
- [x] After all five checkpoints pass: run 255 unit tests across 13 files, typecheck, lint, production build, focused drag/appearance Chromium coverage, and the full 6-of-6 Playwright Chromium suite; visually inspect and index the public-safe screenshot and update completion evidence.
- [x] Review the complete diff and private-file status, commit the coherent passing slice, and publish feature commit `7768daa0617b66c696f769d97dd531f9029272c8` to `main` under Katherine's active authorization.
- [x] Implement completion-pass slice 1 without a format bump: optional plane names, grip and Move Left/Right reordering, Bring Forward/Send Backward, and Move to Plane.
- [x] Implement completion-pass slice 2 without a format bump: create and edit independent text wording, color, size, weight, and alignment over existing balloon assets.
- [x] Implement completion-pass slice 3: chrome-free same-document Reader Preview and unsaved confirmation for Reset Demo while preserving the explicit saved slot.
- [x] Exercise the documented blank-episode-to-preview creator story, pass 270 unit tests across 13 files, typecheck, lint, production build, and all 7 Playwright stories, then visually inspect and index the public-safe July 16 editor screenshot and Reader Preview.
- [x] Publish creator-completion feature commit `cb1f28443f7b1045d139879a2bba7b03edf25856` to `main` and verify local/remote equality immediately after the push.
- [x] Complete visible polish: repair the Oval/Rounded balloon seams, correct minimap aspect presentation, and make the right inspector collapsible/overlay-based on constrained desktop widths.
- [x] Implement Finder/canvas/plane/Layers image drop plus creator-category and reusable-source rename/move/replace/delete safeguards.
- [x] Implement debounced crash recovery, multiple local projects, Save As/Open Local, and portable `.scrollsplice` project import/export with asset blobs.
- [x] Implement bounded format v6 with deterministic v3/v4/v5 defaults, transforms/lock, richer snapping, multi-selection/flat grouping, populated-plane paths, story-beat movement, image masks/crop/frame/bleed, and an atomic fitted editable speech balloon.
- [x] Implement tall-master and deterministic PNG/JPEG slice rendering with creator-reviewed cuts, observed-profile preflight, and explicit provisional/manual-upload labeling.
- [x] Create [FEATURE_TEST_SHEET.md](FEATURE_TEST_SHEET.md) as Katherine's coherent end-to-end review story.
- [x] Finish the big feature/UI closeout: 385 unit tests across 29 files, typecheck, lint, production build, and all 15 Playwright Chromium stories pass; index the editor, Reader Preview, provisional export, and matched dark/light release screenshots.
- [x] Include the previously local completion work, six-image demo, dual interface, layer grips, and editor adapter in one current release without rewriting the pre-event baseline.
- [x] After the corrective product checkpoint passes locally, give Katherine one reconciled list of implemented features and remaining requests from the documents and this task before proposing more product work.
- [x] Research professional comic and webtoon speech-balloon conventions and record the complete practical editable inventory, composable design rule, and phased implementation path in [SPEECH_BALLOON_CATALOG.md](SPEECH_BALLOON_CATALOG.md).

## Joint — only after the local human-editor completion goal and submission path are stable

- [ ] Decide whether to spend remaining Build Week time on the optional generate-and-place proof or submission polish.
- [ ] If choosing the proof, verify an officially supported OpenAI authorization path and approve the network, credential, privacy, synthetic-data, cost, and time limits before adding dependencies.
- [ ] Keep the judge-facing human editor usable without OpenAI login or credits; abandon the proof immediately if it threatens validation or submission evidence.

## Joint — later, not Build Week scope

- [x] Before the original speech-balloon asset slice: review current Clip Studio guidance and professional lettering conventions; use only a small neutral original set and treat meanings as conventions rather than rules. Text was deferred at that historical checkpoint; independent text and an atomic editable balloon now exist.
- [ ] After the current completion build and submission path are stable: approve a dedicated editable-balloon preset goal using [SPEECH_BALLOON_CATALOG.md](SPEECH_BALLOON_CATALOG.md), beginning with its bounded core preset foundation rather than attempting every relationship and lettering tool in one risky slice.
- [ ] Before production export: Katherine signs into WEBTOON and performs the harmless unpublished upload test; Codex prepares safe test files, records generalized results, and updates [WEBTOON Requirements](WEBTOON_REQUIREMENTS.md). Do not automate login or publishing.
- [ ] After that upload verification and a separate export-slice approval: implement creator-reviewed deterministic slicing and preflight against a verified `ExportProfile`; do not promise that WEBTOON will preserve accepted files without optimization.
- [ ] Before full autonomous creation: define approved project context, reference-image consent, generation budget, cancellation/recovery behavior, provenance fields, and which editor commands may run without per-action approval.

- [x] Implement the selected Bright Studio light mode and Graphite/Copper dark mode with persistent View controls, a View-toggleable Details Bar, compact Saved/Unsaved header status, and smaller inline-grip layer-plane tabs without removing editor features.
