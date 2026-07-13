# ScrollSplice Plan

## Current state

ScrollSplice is a public planning repository at <https://github.com/techinevolution/scroll-splice>. Katherine identified seven documents as July 12 pre-event planning work under the earlier ScrollForge name. They were first committed unchanged on July 13 at 11:28:56 AM PT in commit `e4db897` and marked by annotated tag `pre-build-week-planning`. The owner-attested baseline contains no application code; the Git timestamp records preservation on July 13 rather than independently proving the July 12 creation date.

Post-start documentation/compliance work is recorded in commit `a567865` at 11:50:26 AM PT on July 13. Later on July 13, Katherine approved the scaffold and synthetic fixture, then approved one larger `/goal` through the first complete editor she can test. The locked scaffold, verified command contracts, flat episode and element types, original six-beat synthetic fixture, editor shell, and defining canvas/minimap/layers interaction are complete and pushed.

Available work time is roughly 26 hours: full workdays July 13–14, about two hours each evening July 15–19, a stabilization buffer July 20, and submission July 21. July 13 covered provenance, rules, discovery, repository setup, the foundation, and the interaction work originally scheduled through July 16. Katherine completed the hands-on review and `/feedback` that day. The review found no blocking defect in the defining editor interaction, so the newly requested creator features remain later work rather than expanding the Build Week target.

## Completed `/goal`: first Katherine-testable human editor

Completed in the July 13 commits `c33b491` and `05ac06b`:

1. Establish the small framework-independent viewport, coordinate, command, and editor-state modules.
2. Build the desktop workspace and render the shared synthetic episode in a viewport-sized Konva canvas, a lightweight full-episode minimap, and a layers list.
3. Add clamped wheel/trackpad navigation, minimap click navigation, an accurate viewport box, canvas/layer selection synchronization, and off-screen layer centering.
4. Add selected-element movement through a pure document command and a visible reset action.
5. Add focused unit tests and one complete smoke test, run every documented validation command, and visually inspect representative desktop sizes.
6. Keep README and compliance evidence accurate, push each coherent passing checkpoint to `main`, then stop for Katherine's hands-on review and `/feedback`.

Validation passed: 15 unit tests, strict typecheck, ESLint, production build, and the complete Playwright Chromium walkthrough repeated three times. The running editor was visually inspected at 1440 × 900 and 1280 × 720. Deployment, real asset import, persistence, export, OpenAI runtime access, OAuth, and submission-media production remain outside this completed goal.

## Completed checkpoint: Katherine product review

Katherine completed the documented walkthrough on July 13. She confirmed that the minimap viewport is easy to drag, placed elements are easy to move, and the sliding asset panel hides correctly. No reported issue prevents a judge from understanding or using the current Build Week interaction.

The associated Codex Feedback Session ID is **`019f5921-6190-7520-ba51-f5e0897c5af9`**.

## Creator-ready feedback recorded July 13

These requests refine the intended product but are not authorization to enlarge the contest MVP:

- combine a solid RGB base, an uploaded background image, and optional decorative edges in one independently editable background treatment
- let the episode and background extend downward as the story grows, with the final add-space interaction chosen during that slice
- preserve transparency in imported and placed images
- provide a researched starter library of resizable comic speech balloons while allowing creators to add their own reusable balloon and decorative assets
- make episode names editable and provide a **File > New Episode** command
- use a familiar File, Edit, View, Window, and Help command model, with native operating-system menus deferred until desktop packaging exists
- add optional center/edge/nearby-element snapping behind a magnet toggle
- resize images and text directly with corner handles
- use a compact left **Add** rail that opens a category-based **Asset Library** with Uploads, Speech Balloons, Decorations, Shapes & Frames, and eventually AI Generated
- use three fixed composition groups—**Background**, **Content**, and **Foreground**—above the story canvas while the right Layers panel shows only the active group's individual layers
- keep group selection separate from visibility, preserve individual eye settings when a whole group is hidden, and let constrained displays collapse or overlay the right inspector rather than crushing the canvas

## Next implementation slice: public judge access

**Status:** proposed for Katherine's implementation approval. Approval of this documentation and its push does not itself authorize deployment.

**Goal:** turn the current passing local editor into a judge-accessible baseline before another creator feature changes it.

Scope:

1. Configure the existing Vite build for the public `scroll-splice` repository path without changing local development commands.
2. Publish the static build through GitHub Pages using the smallest maintainable deployment configuration.
3. Verify the complete minimap, selection, movement, asset-drawer, and reset walkthrough while signed out in a clean browser.
4. Run typecheck, lint, unit tests, production build, and Playwright against the deployment-ready state.
5. Confirm no private artwork, secrets, local-only files, or unsupported future-feature claims are published.
6. Record the verified public URL and date in README and `BUILD_WEEK_COMPLIANCE.md`, then push the passing deployment checkpoint.

Acceptance:

- the editor opens from a public URL without login, payment, rebuilding, or special permission
- the local development workflow still works
- the defining walkthrough passes from the public path
- all validation commands pass and the public build is visually inspected at representative desktop sizes
- the public URL is documented and remains available through the judging period

Excluded: composition groups, visibility controls, Asset Library redesign, imports, speech balloons, production export, OAuth, and OpenAI runtime work.

### First creator-feature slice after judge access: composition groups and visibility

This is the first product slice to propose after the public baseline is secure because the Asset Library needs a dependable destination model before real assets are added.

- Add a flat `compositionGroup` value—Background, Content, or Foreground—to every episode element and assign the synthetic fixture intentionally.
- Keep fixed cross-group rendering order while preserving ordinary layer order within each group.
- Add the three group controls above the story canvas and filter the right Layers list to the active group.
- Selecting a canvas element activates its group so its layer row remains discoverable.
- Add separate group and individual-layer visibility commands; a group toggle preserves individual layer settings.
- Ensure hidden elements do not render or capture canvas selection.
- Keep the Layers list independently scrollable and verify usability at 1440 × 900, 1280 × 720, and 1024 × 768 without adding a panel-resize system.
- Add focused model, command, store, and browser coverage for filtering, selection synchronization, effective visibility, reset, and existing minimap behavior.

Excluded from that slice: the Add-rail redesign, real uploads, asset drag-in, layer reordering, moving layers between groups, keyboard shortcuts, speech-balloon assets, backgrounds, resizing, persistence, and AI.

The slice after composition groups is the **Add rail and Asset Library shell**: category buttons and responsive drawer behavior using only public-safe placeholders, before any real import or speech-balloon content.

## Current product goal

Submit a small, complete, reliable **human-operated** editor MVP in the **Apps for Your Life** category. A judge should immediately understand ScrollSplice's coherent user experience by using one public-safe sample episode to:

1. see a long episode through a viewport-sized editing canvas
2. understand the whole episode through a synchronized minimap
3. navigate from the canvas or minimap
4. select the same element from the canvas or layers list
5. move the selected element and reset the demo

That is the simplest MVP for Build Week. It proves the product's distinctive interaction without pretending that import, persistence, undo, production export, or autonomous creation is complete. The editor must work without an OpenAI connection.

## Build Week must-haves

### Working product

- A recognizable vertical-comic workspace at representative desktop sizes.
- One original six-beat sample episode made from code-rendered shapes and text, with clear named layers.
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

### July 13 — Provenance, compliance, and discovery

- Preserve the July 12 planning documents as the first commit and annotated tag.
- Create the public `scroll-forge` GitHub repository and publish that baseline; rename it `scroll-splice` after the final project-name decision without rewriting history.
- Add the MIT License, `.gitignore`, official-rules checklist, and WEBTOON discovery record in a separate July 13 commit.
- Separate the complete Build Week MVP from the later creator-ready MVP across all project documents.
- Record current confirmed WEBTOON requirements and the authenticated discovery test still needed before production export.
- Confirm the local Codex model is GPT-5.6 and reserve the primary implementation task for the eventual `/feedback` Session ID.
- Ask the hackathon manager to clarify the Stage One "required APIs/SDKs" wording; treat a response as useful risk reduction, not a blocker absent contrary official guidance.
- Record the exact-name conflicts found in the basic ScrollForge screen, then select **ScrollSplice** under Katherine's requirement that the final name retain “scroll.”
- Under a later narrow approval, scaffold the locked stack, verify the command contracts, define the flat episode model, and create the original six-beat synthetic fixture ahead of schedule.

End-of-day evidence: the owner-attested provenance and actual Git preservation time are explicit, the public repository is compliance-ready, no pre-event work is represented as judged implementation, and the first post-start product code is isolated in a dated scaffold-and-fixture slice.

### July 14 — Remaining foundation and defining interaction

The scaffold, command verification, core episode types, six-beat fixture, and initial fixture tests were completed early on July 13. Katherine approved accelerating the remaining interaction work into the now-completed testable-editor `/goal`:

- Build the desktop editor shell: main viewport, upper-right minimap, layers list, and a collapsed visual placeholder for future assets.
- Add the remaining viewport and selection types with stable IDs when their behavior is introduced.
- Render the shared episode in the viewport, lightweight minimap, and layers list.
- Implement vertical wheel/trackpad navigation, viewport clamping, minimap click-to-jump, an accurate viewport box, and synchronized selection.
- Add coordinate, clamping, and selection tests; inspect the running layout at representative desktop sizes.

End-of-day evidence: a reviewer can understand the long episode, navigate it in both directions, and select matching content from canvas or layers.

The formal navigation floor is reliable canvas scrolling plus minimap click-to-jump with an accurate synchronized viewport box. Add viewport-box dragging only if that floor is already stable.

### July 15 — Two-hour selection clarity pass

- Add a clear selected-element outline and selected layer treatment.
- When a layer is selected off-screen, center it in the viewport and update the minimap.
- Add focused selection and coordinate tests.
- Stop after the complete selection story is visually verified.

### July 16 — Two-hour editing pass

- Add selected-element movement.
- Commit the final position through a pure document command on drag end.
- Add a prominent reset action and movement/boundary tests.
- Do not begin resize, rotation, undo, or reorder.

### July 17 — Two-hour judge-access and smoke-test pass

- Add one Playwright smoke test covering load, minimap navigation, canvas/layer selection, movement, and reset.
- Publish the passing static build through GitHub Pages and verify it in a clean browser session.
- If Pages cannot be made reliable within the session, prepare an unrestricted downloadable test build and document exact launch steps.
- Record the access URL and keep it available through August 5 at 5:00 PM PT.

### July 18 — Two-hour reliability and design pass

- Test coordinate conversion, viewport clamping, synchronization, movement, and reset.
- Improve only the hierarchy, labels, contrast, empty/error states, and minimap readability needed for a coherent judge experience.
- Run typecheck, lint, unit tests, build, and the smoke test.
- Visually inspect representative desktop sizes.

### July 19 — Two-hour submission-material pass

- Perform the reviewer walkthrough from a clean start using the public access path.
- Update README commands and status from verified evidence.
- Document concrete examples of Codex/GPT-5.6 collaboration and key decisions from the actual implementation history.
- Confirm the already recorded `/feedback` Session ID appears in README, the compliance checklist, and the Devpost form.
- Draft the Devpost category, description, repository URL, access URL, and concise explanation of what was deliberately deferred.
- Record a scripted public YouTube demo under three minutes with audio; use only original or approved visual/audio material.

### July 20 — Stabilization buffer

- Make no feature additions.
- Use the buffer only for blocking defects, broken setup/access, failed validation, submission-evidence gaps, or essential visual cleanup.
- Verify from a clean clone or equivalent fresh checkout.
- Re-run the complete validation suite and public reviewer walkthrough.
- Confirm no secrets, private art, unlicensed media, or unintended files are tracked.

### July 21 — Submit

- Complete final checklist review and registration/account checks in the morning.
- Confirm the submission name has Katherine's approval after the documented exact-name conflict review.
- Use **12:00 PM PT as the internal submission target**, leaving five hours for Devpost or access problems.
- Confirm every required link opens without special permission.
- Submit before the official **5:00 PM PT** deadline.
- Tag the exact submitted commit as `build-week-submission` and record it in the compliance evidence table.
- Preserve the submitted repository, demo, video, and access path unchanged and available through the judging period ending August 5 at 5:00 PM PT.

## Stretch work

Attempt only after public judge access is stable and while enough schedule buffer remains to complete the submission evidence. Submission blockers always outrank stretch work:

1. The bounded composition-groups and visibility slice defined above.
2. The Add rail and Asset Library shell using public-safe placeholders.
3. A safe **Add to canvas** action.
4. Asset-to-canvas drag if the fallback is already reliable.
5. An isolated OpenAI generate-and-place proof using only synthetic content, but only after the additional gate below is satisfied.

Stop immediately if stretch work threatens validation, public access, the video, or the submission checklist.

### Additional gate for the OpenAI stretch

The image-generation proof is lower priority than the human interaction stretches above. It may begin only when:

- the complete human editor story, automated validation, public access, and required submission evidence are already passing
- Katherine separately approves the network, privacy, credential, and cost implications
- a supported model-access method and secret-handling boundary have been verified and recorded; never place an API key or reusable provider token in browser code or git
- the base editor remains usable by judges without login, credits, or model access
- the proof has a strict time and spend limit and uses only synthetic prompts and references

The smallest acceptable proof is one request that produces one image candidate, records its generation provenance, adds it through the asset boundary, and places it through the ordinary episode command path. Read-only project tools may expose a normalized episode snapshot, viewport, selection, asset metadata, and prepared canvas-region preview. Do not attempt full autonomous episode creation, private-asset upload, external-service connectors, or unrestricted agent writes during Build Week.

## Deferred work

- Real asset import and project-folder design.
- Composable background color, uploaded background imagery, optional edge decoration, and downward episode/background extension.
- Transparency-preserving image import and preview.
- A researched starter speech-balloon library plus creator-defined reusable balloon and decorative assets.
- Editable episode naming, new-episode creation, and the full File/Edit/View/Window/Help command model; native OS menus follow desktop packaging.
- Optional snapping/alignment guides and direct corner-handle resizing.
- Persistence, save/reopen, autosave, and recovery.
- Undo/redo, rotation, crop, masks, and advanced transforms.
- Layer reordering, moving layers between composition groups, and any user-created or nested group structure.
- Production tall-master and WEBTOON slice export.
- Authenticated WEBTOON upload verification and other platform profiles.
- Desktop packaging, mobile editing, accounts, OAuth, cloud storage, collaboration, and publishing integrations.
- Full autonomous episode creation, including planning, repeated generation, continuity passes, and unattended layout changes. This is an intended product track after the human workflow, not a required Build Week feature.
- External asset-source connectors and production model-account integration. A narrowly bounded OpenAI generate-and-place proof is permitted only through the stretch gate above.

## WEBTOON discovery track

The Build Week editor can proceed without production export. Katherine completed the authenticated form-observation portion on July 13: the current UI displays 800 × 1280 px before automatic optimization, a 2 MB image threshold, 50 MB and 100 images per episode, JPG/JPEG/PNG support, and a separate 202 × 142 episode thumbnail under 500 KB. Before an export slice is approved, complete the remaining harmless unpublished upload behavior tests in [WEBTOON_REQUIREMENTS.md](WEBTOON_REQUIREMENTS.md), including exact boundary enforcement, transformation behavior, ordering, transparency, filename behavior, previews, and draft reopening.

Keep platform constraints in a data-driven export profile so a changed limit can be updated without changing the episode model or editor commands.

## Open questions for autonomous creation

These questions do not block the human MVP:

- Which officially supported credential path will ScrollSplice use for model access: a future user-authorized OpenAI connection, an app-managed server credential, or another documented method?
- What project information and reference images may be sent to OpenAI, and how will the creator preview and approve that context?
- What cost ceiling, cancellation behavior, generation history, and retry policy should each run have?
- Which actions may eventually run autonomously, and which require review until undo, recovery, and provenance are mature?
- Should external connectors ever import creator assets from services such as Drive or Dropbox, or should local import remain the only source?

Do not treat an OpenAI/ChatGPT OAuth flow used by a coding harness as automatically approved for a general web application. Verify the supported product path before choosing dependencies or designing the login UI.

## Validation path

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
- private Root & Table art, secrets, required OAuth infrastructure, direct WEBTOON publishing, and production export remain outside the submission
- the human editor works without OpenAI access; any autonomous feature shown is clearly labeled as completed stretch rather than implied future behavior

## Stop rules

- The first-testable-editor `/goal` and Katherine's hands-on review are complete. The approved product design and documentation push do not silently authorize deployment or either proposed implementation slice.
- Never amend, squash, delete, or force-move the `e4db897` baseline commit or `pre-build-week-planning` tag.
- Do not expand the required submission target to import, persistence, undo, resize, ordering, production export, OAuth, or autonomous creation.
- Do not begin the optional OpenAI stretch until the complete human MVP and submission path pass and Katherine approves the additional gate. An organizer reply may affect compliance priority but is not the only reason for a real future image-generation feature.
- Do not add Next.js, Tauri, dnd-kit, a backend, database, cloud service, OAuth dependency, OpenAI SDK, or WEBTOON automation during Build Week without explicit approval and a recorded decision. The OpenAI stretch gate does not silently authorize those changes.
- Do not commit private Root & Table assets, secrets, or unlicensed content.
- Do not claim visual or public-access behavior works unless it was actually inspected.
- If the outline, plan, architecture, and compliance checklist disagree, resolve the documents before coding.
